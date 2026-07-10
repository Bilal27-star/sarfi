// Avatar upload/remove server actions: MIME + decoded-content validation
// (never trust file.type or the extension alone), size limits, ownership
// (userId always comes from the session, never the request), and the
// store-then-point-then-cleanup ordering that keeps DB/storage consistent.
import sharp from 'sharp'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const requireUserMock = vi.fn()
vi.mock('@/server/auth/session', () => ({ requireUser: (...args: unknown[]) => requireUserMock(...args) }))

const dbUpdateMock = vi.fn().mockResolvedValue({})
vi.mock('@/server/db', () => ({ db: { user: { update: (...args: unknown[]) => dbUpdateMock(...args) } } }))

const storeAvatarMock = vi.fn().mockResolvedValue('https://blob.example/avatars/new.webp')
const deleteAvatarMock = vi.fn().mockResolvedValue(undefined)
vi.mock('@/server/services/avatar-storage', async () => {
  const actual = await vi.importActual<typeof import('@/server/services/avatar-storage')>('@/server/services/avatar-storage')
  return {
    AvatarStorageNotConfiguredError: actual.AvatarStorageNotConfiguredError,
    storeAvatar: (...args: unknown[]) => storeAvatarMock(...args),
    deleteAvatar: (...args: unknown[]) => deleteAvatarMock(...args),
  }
})

vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { uploadAvatar, removeAvatar } from '@/server/services/avatar-actions'
import { AvatarStorageNotConfiguredError } from '@/server/services/avatar-storage'

async function validPngBuffer(): Promise<ArrayBuffer> {
  const buffer = await sharp({ create: { width: 20, height: 20, channels: 3, background: { r: 200, g: 40, b: 40 } } }).png().toBuffer()
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

function formDataWith(file: File): FormData {
  const fd = new FormData()
  fd.set('avatar', file)
  return fd
}

describe('uploadAvatar', () => {
  beforeEach(() => {
    requireUserMock.mockReset().mockResolvedValue({ id: 'user-1', avatarUrl: null })
    dbUpdateMock.mockClear()
    storeAvatarMock.mockClear().mockResolvedValue('https://blob.example/avatars/new.webp')
    deleteAvatarMock.mockClear()
  })

  it('rejects a declared MIME type outside the allow-list before ever touching storage', async () => {
    const file = new File([await validPngBuffer()], 'a.gif', { type: 'image/gif' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: false, errorCode: 'avatar_invalid_type' })
    expect(storeAvatarMock).not.toHaveBeenCalled()
    expect(dbUpdateMock).not.toHaveBeenCalled()
  })

  it('rejects an SVG even if mislabeled with an image/* type some clients might send', async () => {
    const svg = Buffer.from('<svg onload="alert(1)"><script>alert(1)</script></svg>')
    const file = new File([svg], 'a.svg', { type: 'image/svg+xml' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: false, errorCode: 'avatar_invalid_type' })
  })

  it('rejects a file whose declared type is allowed but whose bytes are not a real image (extension/MIME spoofing)', async () => {
    const notAnImage = Buffer.from('#!/bin/sh\necho pwned\n')
    const file = new File([notAnImage], 'a.png', { type: 'image/png' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: false, errorCode: 'avatar_invalid_type' })
    expect(storeAvatarMock).not.toHaveBeenCalled()
  })

  it('rejects an oversized file without decoding it', async () => {
    const big = Buffer.alloc(9 * 1024 * 1024, 1)
    const file = new File([big], 'a.png', { type: 'image/png' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: false, errorCode: 'avatar_too_large' })
  })

  it('rejects an empty file', async () => {
    const file = new File([], 'a.png', { type: 'image/png' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: false, errorCode: 'avatar_too_large' })
  })

  it('accepts a genuine PNG, stores the re-encoded result, and updates the session user only', async () => {
    const file = new File([await validPngBuffer()], 'a.png', { type: 'image/png' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: true })
    expect(storeAvatarMock).toHaveBeenCalledTimes(1)
    const [key, buffer, contentType] = storeAvatarMock.mock.calls[0]
    expect(key).toMatch(/^avatars\/user-1-[0-9a-f]{16}\.webp$/)
    expect(contentType).toBe('image/webp')
    // re-encoded output must itself be a valid, decodable image
    const meta = await sharp(buffer as Buffer).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(512)
    expect(meta.height).toBe(512)
    expect(dbUpdateMock).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { avatarUrl: 'https://blob.example/avatars/new.webp' } })
  })

  it('derives the owner from the session, never from the request — there is no path to write another user’s avatar', async () => {
    requireUserMock.mockResolvedValue({ id: 'the-real-signed-in-user', avatarUrl: null })
    const file = new File([await validPngBuffer()], 'a.png', { type: 'image/png' })
    await uploadAvatar(formDataWith(file))
    expect(dbUpdateMock).toHaveBeenCalledWith({ where: { id: 'the-real-signed-in-user' }, data: { avatarUrl: expect.any(String) } })
  })

  it('deletes the previous avatar only after the DB points at the new one', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1', avatarUrl: 'https://blob.example/avatars/old.webp' })
    const callOrder: string[] = []
    dbUpdateMock.mockImplementation(async () => callOrder.push('db-update'))
    deleteAvatarMock.mockImplementation(async () => callOrder.push('delete-old'))
    const file = new File([await validPngBuffer()], 'a.png', { type: 'image/png' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: true })
    expect(callOrder).toEqual(['db-update', 'delete-old'])
    expect(deleteAvatarMock).toHaveBeenCalledWith('https://blob.example/avatars/old.webp')
  })

  it('does not delete anything when there was no previous avatar', async () => {
    const file = new File([await validPngBuffer()], 'a.png', { type: 'image/png' })
    await uploadAvatar(formDataWith(file))
    expect(deleteAvatarMock).not.toHaveBeenCalled()
  })

  it('surfaces a dedicated error when storage is not configured, without touching the DB', async () => {
    storeAvatarMock.mockRejectedValue(new AvatarStorageNotConfiguredError())
    const file = new File([await validPngBuffer()], 'a.png', { type: 'image/png' })
    const result = await uploadAvatar(formDataWith(file))
    expect(result).toEqual({ ok: false, errorCode: 'avatar_storage_unavailable' })
    expect(dbUpdateMock).not.toHaveBeenCalled()
  })
})

describe('removeAvatar', () => {
  beforeEach(() => {
    requireUserMock.mockReset()
    dbUpdateMock.mockClear()
    deleteAvatarMock.mockClear()
  })

  it('clears avatarUrl and deletes the stored file', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1', avatarUrl: 'https://blob.example/avatars/mine.webp' })
    const result = await removeAvatar()
    expect(result).toEqual({ ok: true })
    expect(dbUpdateMock).toHaveBeenCalledWith({ where: { id: 'user-1' }, data: { avatarUrl: null } })
    expect(deleteAvatarMock).toHaveBeenCalledWith('https://blob.example/avatars/mine.webp')
  })

  it('is a safe no-op when there is nothing to remove', async () => {
    requireUserMock.mockResolvedValue({ id: 'user-1', avatarUrl: null })
    const result = await removeAvatar()
    expect(result).toEqual({ ok: true })
    expect(dbUpdateMock).not.toHaveBeenCalled()
    expect(deleteAvatarMock).not.toHaveBeenCalled()
  })
})
