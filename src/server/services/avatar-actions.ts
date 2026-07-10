'use server'

import { randomBytes } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import sharp from 'sharp'
import { db } from '@/server/db'
import { requireUser } from '@/server/auth/session'
import { AvatarStorageNotConfiguredError, deleteAvatar, storeAvatar } from './avatar-storage'
import type { ActionResult } from './expense-actions'

// The client already cropped/exported a square image before uploading —
// this is a generous ceiling against abuse, not the expected size.
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024
const AVATAR_SIZE = 512
const ALLOWED_INPUT_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp'])
const ALLOWED_DECODED_FORMATS = new Set(['jpeg', 'png', 'webp'])

export async function uploadAvatar(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requireUser()
    const file = formData.get('avatar')
    if (!(file instanceof File)) return { ok: false, errorCode: 'invalid_input' }
    // Never trust file.type/name alone — this is a first-pass rejection for
    // obviously-wrong uploads; the real check is the decode below.
    if (!ALLOWED_INPUT_TYPES.has(file.type)) return { ok: false, errorCode: 'avatar_invalid_type' }
    if (file.size === 0 || file.size > MAX_UPLOAD_BYTES) return { ok: false, errorCode: 'avatar_too_large' }

    const inputBuffer = Buffer.from(await file.arrayBuffer())

    // Fully decode (not sniff) the actual bytes. This rejects SVGs, other
    // non-raster formats, corrupt files, and polyglot files (a valid
    // magic-byte header followed by an embedded payload) — sharp has to
    // successfully parse real pixel data, a byte-signature check alone
    // would not catch a crafted polyglot.
    let format: string | undefined
    try {
      format = (await sharp(inputBuffer).metadata()).format
    } catch {
      return { ok: false, errorCode: 'avatar_invalid_type' }
    }
    if (!format || !ALLOWED_DECODED_FORMATS.has(format)) {
      return { ok: false, errorCode: 'avatar_invalid_type' }
    }

    // Full re-encode, not a passthrough: strips any embedded metadata,
    // applies (then discards) EXIF orientation, and guarantees a bounded,
    // consistent output regardless of what the client actually sent.
    const outputBuffer = await sharp(inputBuffer)
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover' })
      .webp({ quality: 88 })
      .toBuffer()

    const key = `avatars/${user.id}-${randomBytes(8).toString('hex')}.webp`
    let url: string
    try {
      url = await storeAvatar(key, outputBuffer, 'image/webp')
    } catch (e) {
      if (e instanceof AvatarStorageNotConfiguredError) return { ok: false, errorCode: 'avatar_storage_unavailable' }
      throw e
    }

    // DB is only ever pointed at a URL that has already been durably
    // stored — never the reverse — so a mid-flight failure can't leave
    // avatarUrl referencing something that doesn't exist.
    const previousUrl = user.avatarUrl
    await db.user.update({ where: { id: user.id }, data: { avatarUrl: url } })
    if (previousUrl) await deleteAvatar(previousUrl)

    revalidatePath('/', 'layout')
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'save_failed' }
  }
}

export async function removeAvatar(): Promise<ActionResult> {
  try {
    const user = await requireUser()
    if (!user.avatarUrl) return { ok: true }
    const previousUrl = user.avatarUrl
    await db.user.update({ where: { id: user.id }, data: { avatarUrl: null } })
    await deleteAvatar(previousUrl)
    revalidatePath('/', 'layout')
    return { ok: true }
  } catch {
    return { ok: false, errorCode: 'delete_failed' }
  }
}
