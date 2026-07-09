'use client'

import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { MARK_VIEWBOX, MARK_S_PATH, MARK_STROKE_WIDTH, MARK_DOT } from '@/components/layout/logo'

/**
 * One-time brand reveal on real app launch (cold load / hard refresh), never
 * on client-side navigation — it lives in the root layout outside `children`,
 * so the App Router never remounts it between routes.
 *
 * The sequence is built from the mark's own geometry: the S path draws on
 * from its entry terminal, through the central balance point, to the exit —
 * money movement becoming organized financial control — then the dinar dot
 * (the ف dot of صرفي) springs in, a light sweep passes, and the mark settles.
 * ~2.4s total; reduced motion gets a plain fade at a fraction of that.
 */

const EXIT_AT_MS = 2000
const EXIT_MS = 420

const drawEase = [0.65, 0, 0.35, 1] as const
const exitEase = [0.22, 1, 0.36, 1] as const

export function SplashScreen({ label }: { label: string }) {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<'playing' | 'exiting' | 'done'>('playing')

  useEffect(() => {
    const exitAt = reducedMotion ? 500 : EXIT_AT_MS
    const exitFor = reducedMotion ? 220 : EXIT_MS
    const exitTimer = setTimeout(() => setPhase('exiting'), exitAt)
    const doneTimer = setTimeout(() => setPhase('done'), exitAt + exitFor)
    return () => {
      clearTimeout(exitTimer)
      clearTimeout(doneTimer)
    }
  }, [reducedMotion])

  if (phase === 'done') return null

  return (
    <motion.div
      aria-hidden
      aria-busy={phase === 'playing'}
      aria-label={label}
      initial={{ opacity: 1 }}
      animate={{ opacity: phase === 'exiting' ? 0 : 1 }}
      transition={{ duration: (reducedMotion ? 220 : EXIT_MS) / 1000, ease: exitEase }}
      className="fixed inset-0 z-[999] flex items-center justify-center bg-background"
      style={{ pointerEvents: phase === 'exiting' ? 'none' : 'auto' }}
    >
      {reducedMotion ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="size-20 sm:size-24"
        >
          <svg viewBox={MARK_VIEWBOX} className="size-full">
            <rect x="1" y="1" width="46" height="46" rx="14" fill="var(--color-ink-900)" />
            <path
              d={MARK_S_PATH}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={MARK_STROKE_WIDTH}
              strokeLinecap="round"
            />
            <circle cx={MARK_DOT.cx} cy={MARK_DOT.cy} r={MARK_DOT.r} fill="var(--color-primary)" />
          </svg>
        </motion.div>
      ) : (
        <motion.div
          animate={{ scale: [1, 1.015, 1] }}
          transition={{ duration: 0.4, ease: exitEase, delay: 1.3 }}
          className="relative size-20 sm:size-24"
        >
          <svg viewBox={MARK_VIEWBOX} className="size-full">
            {/* Tile grounds the mark first */}
            <motion.rect
              x="1"
              y="1"
              width="46"
              height="46"
              rx="14"
              fill="var(--color-ink-900)"
              initial={{ opacity: 0, scale: 0.94, filter: 'blur(3px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              transition={{ duration: 0.32, ease: exitEase }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
            {/* The flow draws the S from entry, through balance, to exit */}
            <motion.path
              d={MARK_S_PATH}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth={MARK_STROKE_WIDTH}
              strokeLinecap="round"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: { delay: 0.18, duration: 0.9, ease: drawEase },
                opacity: { delay: 0.18, duration: 0.15 },
              }}
            />
            {/* The dinar dot — the ف dot — arrives once the path resolves */}
            <motion.circle
              cx={MARK_DOT.cx}
              cy={MARK_DOT.cy}
              r={MARK_DOT.r}
              fill="var(--color-primary)"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 1.08, type: 'spring', stiffness: 420, damping: 18 }}
              style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            />
          </svg>
          {/* Restrained light sweep across the tile after the mark completes */}
          <motion.div
            initial={{ x: '-120%', opacity: 0 }}
            animate={{ x: '120%', opacity: [0, 0.45, 0] }}
            transition={{ delay: 1.3, duration: 0.6, ease: exitEase }}
            className="pointer-events-none absolute inset-[2%] overflow-hidden rounded-[29%]"
          >
            <div
              className="absolute inset-y-0 left-1/2 w-1/3 -translate-x-1/2"
              style={{
                background: 'linear-gradient(100deg, transparent, rgba(255,255,255,0.5), transparent)',
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </motion.div>
  )
}
