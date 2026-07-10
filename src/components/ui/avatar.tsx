import { cn } from '@/lib/utils'

const SIZES = {
  md: 'size-11 text-base',
  lg: 'size-14 text-xl',
} as const

/** Real photo when set, polished initials chip otherwise — the one
 * fallback rule every avatar surface in the app follows. `avatarUrl` is
 * always an already-processed square (see avatar-actions.ts), so a plain
 * <img> with explicit dimensions is enough to avoid layout shift; no
 * next/image remote-pattern config needed for a URL whose host varies by
 * Blob store. */
export function Avatar({ name, avatarUrl, size = 'md', className }: { name: string; avatarUrl?: string | null; size?: keyof typeof SIZES; className?: string }) {
  const base = cn('inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-ink-900 font-extrabold text-white', SIZES[size], className)
  if (avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external Blob URL, no next/image remote pattern needed for a small fixed-size avatar
      <img src={avatarUrl} alt="" className={cn(base, 'object-cover')} width={64} height={64} loading="lazy" />
    )
  }
  return (
    <span className={base} aria-hidden>
      {name.charAt(0).toUpperCase()}
    </span>
  )
}
