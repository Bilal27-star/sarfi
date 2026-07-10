// Storage adapter selection: Vercel Blob when a token is present, a local
// filesystem fallback for dev otherwise — hard-disabled on Vercel itself so
// a missing token fails loudly instead of attempting a read-only-FS write.
import { existsSync } from 'node:fs'
import { readFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const LOCAL_DIR = path.join(process.cwd(), 'public', 'uploads', 'avatars')

async function freshModule() {
  vi.resetModules()
  return import('@/server/services/avatar-storage')
}

describe('avatar storage — local dev fallback', () => {
  const originalToken = process.env.BLOB_READ_WRITE_TOKEN
  const originalVercel = process.env.VERCEL

  beforeEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN
    delete process.env.VERCEL
  })
  afterEach(async () => {
    if (originalToken === undefined) delete process.env.BLOB_READ_WRITE_TOKEN
    else process.env.BLOB_READ_WRITE_TOKEN = originalToken
    if (originalVercel === undefined) delete process.env.VERCEL
    else process.env.VERCEL = originalVercel
    await rm(LOCAL_DIR, { recursive: true, force: true })
  })

  it('writes to public/uploads/avatars and returns a local URL when no token and not on Vercel', async () => {
    const { storeAvatar } = await freshModule()
    const url = await storeAvatar('avatars/test-key.webp', Buffer.from('fake-image-bytes'), 'image/webp')
    expect(url).toBe('/uploads/avatars/test-key.webp')
    const written = await readFile(path.join(LOCAL_DIR, 'test-key.webp'))
    expect(written.toString()).toBe('fake-image-bytes')
  })

  it('deletes a local file by its returned URL', async () => {
    const { storeAvatar, deleteAvatar } = await freshModule()
    const url = await storeAvatar('avatars/to-delete.webp', Buffer.from('x'), 'image/webp')
    expect(existsSync(path.join(LOCAL_DIR, 'to-delete.webp'))).toBe(true)
    await deleteAvatar(url)
    expect(existsSync(path.join(LOCAL_DIR, 'to-delete.webp'))).toBe(false)
  })

  it('never throws when deleting a URL that does not correspond to a real local file', async () => {
    const { deleteAvatar } = await freshModule()
    await expect(deleteAvatar('/uploads/avatars/never-existed.webp')).resolves.toBeUndefined()
  })

  it('refuses to write to disk when running on Vercel without a token — fails loudly, never silently', async () => {
    process.env.VERCEL = '1'
    const { storeAvatar, AvatarStorageNotConfiguredError } = await freshModule()
    await expect(storeAvatar('avatars/x.webp', Buffer.from('x'), 'image/webp')).rejects.toBeInstanceOf(AvatarStorageNotConfiguredError)
    expect(existsSync(LOCAL_DIR)).toBe(false)
  })
})
