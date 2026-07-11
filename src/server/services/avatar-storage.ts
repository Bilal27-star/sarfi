import 'server-only'
import { del, put } from '@vercel/blob'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Object storage decision (Phase B audit): Vercel Blob over Supabase
 * Storage. This app's auth is a custom cookie-session model, not Supabase
 * Auth — Supabase Storage's main advantage (RLS policies keyed on
 * auth.uid()) isn't usable here, so ownership would be enforced in
 * application code either way, same as with Blob. The Supabase project
 * backing Postgres is already flagged at its free-tier project cap and
 * subject to pause-on-inactivity (see SARFI_HANDOFF.md §8); Blob is a
 * separate quota on the platform already hosting this deployment, with
 * zero extra account/credential setup — provisioning it in the Vercel
 * dashboard auto-injects BLOB_READ_WRITE_TOKEN, vs. Supabase Storage
 * requiring a manually copy-pasted service-role key (the exact kind of
 * manual env var step that caused a prior incident here). Avatars aren't
 * sensitive financial data, so public blob URLs with unguessable random
 * keys are sufficient — no signed-URL refresh machinery needed.
 *
 * Local dev fallback: when BLOB_READ_WRITE_TOKEN isn't set AND this isn't
 * actually running on Vercel, avatars are written to public/uploads/avatars
 * (gitignored) so the full upload/replace/remove flow is genuinely
 * testable without provisioning cloud storage first. This fallback is
 * hard-disabled on Vercel (checked via the VERCEL env var Vercel always
 * sets) — a deploy without the token fails loudly instead of attempting a
 * write to Vercel's read-only function filesystem.
 */

const usingVercelBlob = !!process.env.BLOB_READ_WRITE_TOKEN
// Anchored to this file's real location, not process.cwd() — this repo's
// local dev server is spawned via a parent-shell wrapper (see
// SARFI_HANDOFF.md §1) whose cwd is a directory above the actual Next.js
// project, so process.cwd() would silently write outside the folder Next
// actually serves /public from.
const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const LOCAL_DIR = path.join(PROJECT_ROOT, 'public', 'uploads', 'avatars')
const LOCAL_URL_PREFIX = '/uploads/avatars/'

export class AvatarStorageNotConfiguredError extends Error {
  constructor() {
    super('AVATAR_STORAGE_NOT_CONFIGURED')
  }
}

export async function storeAvatar(key: string, buffer: Buffer, contentType: string): Promise<string> {
  if (usingVercelBlob) {
    // Node Buffers under Buffer.poolSize (small ones — sharp's webp output
    // for a 512x512 avatar always qualifies) are views into a shared
    // internal ArrayBuffer pool. @vercel/blob's fetch-based upload rejects
    // that ("SharedArrayBuffer is not allowed") because the body's
    // .buffer isn't sized to just this chunk. copyBytesFrom forces a
    // fresh, exactly-sized ArrayBuffer, sidestepping Node's pool entirely.
    const body = Buffer.copyBytesFrom(buffer)
    const blob = await put(key, body, { access: 'public', contentType, addRandomSuffix: false })
    return blob.url
  }
  if (process.env.VERCEL) {
    // Never attempt a filesystem write on Vercel — the function filesystem
    // is read-only outside /tmp, and this must fail loudly, not silently
    // pretend to succeed.
    throw new AvatarStorageNotConfiguredError()
  }
  await mkdir(LOCAL_DIR, { recursive: true })
  const filename = path.basename(key)
  await writeFile(path.join(LOCAL_DIR, filename), buffer)
  return `${LOCAL_URL_PREFIX}${filename}`
}

export async function deleteAvatar(url: string): Promise<void> {
  try {
    if (url.startsWith(LOCAL_URL_PREFIX)) {
      await unlink(path.join(LOCAL_DIR, path.basename(url))).catch(() => {})
      return
    }
    if (usingVercelBlob) {
      await del(url)
    }
  } catch {
    // best-effort cleanup only — an orphaned blob is an acceptable
    // degradation; it must never fail the request that's replacing/
    // removing the avatar in the database
  }
}
