'use client'

import { useEffect, useRef, type ReactNode } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { X } from 'lucide-react'
import { backdropVariants, sheetVariants } from '@/components/motion/presets'
import { useT } from '@/i18n/provider'
import { cn } from '@/lib/utils'

type Props = {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Bottom sheet on phones; centered dialog from md up. */
  className?: string
}

export function Sheet({ open, onClose, title, children, className }: Props) {
  const t = useT()
  const reduced = useReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)

  // Basic focus + escape handling
  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement as HTMLElement | null
    panelRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
      previouslyFocused?.focus?.()
    }
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:items-center md:p-6">
          <motion.button
            aria-label={t('common.close')}
            className="absolute inset-0 bg-[var(--color-overlay-backdrop)]"
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            drag={reduced ? false : 'y'}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose()
            }}
            variants={reduced ? backdropVariants : sheetVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'relative w-full max-w-lg bg-surface-elevated shadow-sheet outline-none',
              'rounded-t-xl md:rounded-xl',
              'max-h-[92dvh] md:max-h-[85dvh] flex flex-col',
              className,
            )}
          >
            <div className="flex items-center justify-between px-5 pt-3 pb-1 md:pt-5">
              <div className="md:hidden absolute left-1/2 top-2 h-1.5 w-10 -translate-x-1/2 rounded-full bg-border-strong" aria-hidden />
              <h2 className="mt-3 md:mt-0 text-lg font-extrabold">{title}</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label={t('common.close')}
                className="mt-3 md:mt-0 flex size-9 items-center justify-center rounded-full bg-surface-sunken text-text-secondary hover:text-text-primary"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="overflow-y-auto overscroll-contain px-5 pb-safe pb-5 grow">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
