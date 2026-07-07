'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { LogoMark } from '@/components/layout/logo'
import { Button } from '@/components/ui/button'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'
import { springSoft } from '@/components/motion/presets'
import { useT } from '@/i18n/provider'
import { cn } from '@/lib/utils'

const STEP_KEYS = [
  { titleKey: 'step1Title', bodyKey: 'step1Body', art: TokenFlowArt } as const,
  { titleKey: 'step2Title', bodyKey: 'step2Body', art: RankedBarsArt } as const,
  { titleKey: 'step3Title', bodyKey: 'step3Body', art: StreakRingArt } as const,
]

export function Onboarding() {
  const router = useRouter()
  const t = useT()
  const [step, setStep] = useState(0)
  const isLast = step === STEP_KEYS.length - 1
  const { titleKey, bodyKey, art: Art } = STEP_KEYS[step]

  return (
    <div className="flex min-h-dvh flex-col px-6 pt-safe pb-safe">
      <header className="flex items-center justify-between py-4">
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={springSoft}
          className="flex items-center gap-2.5"
        >
          <LogoMark className="size-10" />
          <div className="leading-tight">
            <p className="text-title-card">SARFI</p>
            <p className="text-xs font-semibold text-text-muted">صرفي</p>
          </div>
        </motion.div>
        <div className="flex items-center gap-2">
          <LocaleSwitcher />
          <button
            type="button"
            onClick={() => router.push('/signup')}
            className="min-h-11 rounded-sm px-3 text-sm font-bold text-text-muted hover:text-text-primary"
          >
            {t('onboarding.skip')}
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="flex w-full max-w-sm flex-col items-center"
          >
            <Art />
            <h1 className="mt-8 text-title-screen text-[clamp(1.6rem,6vw,2rem)]">{t(`onboarding.${titleKey}`)}</h1>
            <p className="mt-3 text-base leading-relaxed text-text-secondary">{t(`onboarding.${bodyKey}`)}</p>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="mx-auto w-full max-w-sm space-y-5 pb-4">
        <div className="flex justify-center gap-2" role="tablist" aria-label={t('onboarding.progress', { current: step + 1, total: STEP_KEYS.length })}>
          {STEP_KEYS.map((_, i) => (
            <button
              key={i}
              role="tab"
              aria-selected={i === step}
              aria-label={t('onboarding.progress', { current: i + 1, total: STEP_KEYS.length })}
              onClick={() => setStep(i)}
              className={cn(
                'h-2.5 rounded-full transition-all duration-300',
                i === step ? 'w-7 bg-primary' : 'w-2.5 bg-border-strong',
              )}
            />
          ))}
        </div>
        <Button full size="lg" onClick={() => (isLast ? router.push('/signup') : setStep(step + 1))}>
          {isLast ? t('onboarding.start') : t('onboarding.continueLabel')}
        </Button>
        <p className="text-center text-sm font-medium text-text-muted">
          {t('onboarding.alreadyHaveAccount')}{' '}
          <Link href="/signin" className="font-bold text-info hover:underline">
            {t('onboarding.signIn')}
          </Link>
        </p>
      </footer>
    </div>
  )
}

/*
 * Original spot illustrations sharing SARFI's real visual language — the
 * token-into-timeline, ranked bars, and ring gauge each preview an actual
 * product moment (Add Expense, Insights, Home) rather than a generic
 * floating-coin or stock-chart mascot.
 */

function TokenFlowArt() {
  const reduced = useReducedMotion()
  const tokens = [
    { color: 'var(--color-accent-coral)', x: 40 },
    { color: 'var(--color-sky-400)', x: 84 },
    { color: 'var(--color-primary)', x: 128 },
  ]
  return (
    <svg viewBox="0 0 200 140" className="h-32 w-auto sm:h-40" aria-hidden>
      <line x1="24" y1="112" x2="176" y2="112" stroke="var(--color-border-strong)" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
      {tokens.map((token, i) => (
        <motion.rect
          key={token.x}
          x={token.x - 14}
          y="90"
          width="28"
          height="28"
          rx="9"
          fill={token.color}
          initial={reduced ? false : { y: 24, opacity: 0 }}
          animate={{ y: 90, opacity: 1 }}
          transition={{ delay: 0.15 * i, type: 'spring', stiffness: 260, damping: 16 }}
        />
      ))}
      <motion.text
        x="100"
        y="46"
        textAnchor="middle"
        fontSize="30"
        fontWeight="700"
        fill="var(--color-ink-900)"
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.55, duration: 0.3 }}
      >
        1,450 دج
      </motion.text>
    </svg>
  )
}

function RankedBarsArt() {
  const reduced = useReducedMotion()
  const bars = [
    { w: 132, color: 'var(--color-accent-coral)' },
    { w: 96, color: 'var(--color-sky-400)' },
    { w: 68, color: 'var(--color-sun-400)' },
    { w: 40, color: 'var(--color-plum-400)' },
  ]
  return (
    <svg viewBox="0 0 200 140" className="h-32 w-auto sm:h-40" aria-hidden>
      {bars.map((bar, i) => (
        <g key={i}>
          <rect x="16" y={16 + i * 30} width="168" height="16" rx="8" fill="var(--color-surface-sunken)" />
          <motion.rect
            x="16"
            y={16 + i * 30}
            height="16"
            rx="8"
            fill={bar.color}
            initial={reduced ? false : { width: 0 }}
            animate={{ width: bar.w }}
            transition={{ delay: 0.1 * i, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </g>
      ))}
    </svg>
  )
}

function StreakRingArt() {
  const reduced = useReducedMotion()
  const r = 46
  const c = 2 * Math.PI * r
  const fraction = 0.8
  return (
    <svg viewBox="0 0 200 140" className="h-32 w-auto sm:h-40" aria-hidden>
      <g transform="translate(100 70) rotate(-90)">
        <circle r={r} fill="none" stroke="var(--color-surface-sunken)" strokeWidth="12" />
        <motion.circle
          r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={reduced ? false : { strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - fraction * c }}
          transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        />
      </g>
      <motion.path
        d="M82 70 l13 13 l23 -26"
        fill="none"
        stroke="var(--color-ink-900)"
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reduced ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.4 }}
      />
    </svg>
  )
}
