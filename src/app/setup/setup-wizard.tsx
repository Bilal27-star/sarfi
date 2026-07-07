'use client'

import { useActionState, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronLeft } from 'lucide-react'
import { completeSetup } from '@/server/auth/actions'
import { Button } from '@/components/ui/button'
import { useLocale, useT } from '@/i18n/provider'
import { resolveAuthError } from '@/i18n/auth-error'
import { LOCALE_LABELS, LOCALES, dbLangFromLocale, type Locale } from '@/i18n/config'
import { cn } from '@/lib/utils'

const STEPS = ['currency', 'budget', 'month-start', 'language'] as const
type StepKey = (typeof STEPS)[number]

const BUDGET_PRESETS = ['30000', '45000', '60000', '80000']

export function SetupWizard() {
  const t = useT()
  const currentLocale = useLocale()
  const [stepIndex, setStepIndex] = useState(0)
  const [budget, setBudget] = useState('')
  const [monthStart, setMonthStart] = useState(1)
  const [language, setLanguage] = useState<Locale>(currentLocale)
  const [state, formAction, pending] = useActionState(completeSetup, {})

  const step: StepKey = STEPS[stepIndex]
  const isLast = stepIndex === STEPS.length - 1

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pt-safe pb-safe">
      <header className="flex items-center gap-3 py-4">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={() => setStepIndex(stepIndex - 1)}
            aria-label={t('setup.back')}
            className="flex size-11 items-center justify-center rounded-full bg-surface-sunken"
          >
            <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
          </button>
        ) : (
          <div className="size-11" aria-hidden />
        )}
        <div className="flex flex-1 gap-1.5" aria-hidden>
          {STEPS.map((s, i) => (
            <div
              key={s}
              className={cn('h-1.5 flex-1 rounded-full transition-colors', i <= stepIndex ? 'bg-primary' : 'bg-surface-sunken')}
            />
          ))}
        </div>
        <div className="size-11" aria-hidden />
      </header>

      <form action={formAction} className="flex flex-1 flex-col">
        {/* Persist choices across steps */}
        <input type="hidden" name="currency" value="DZD" />
        <input type="hidden" name="monthlyBudget" value={budget} />
        <input type="hidden" name="financialMonthStartDay" value={monthStart} />
        <input type="hidden" name="language" value={dbLangFromLocale(language)} />

        <div className="flex flex-1 flex-col justify-center py-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {step === 'currency' && (
                <>
                  <h1 className="text-title-screen text-2xl">{t('setup.currencyTitle')}</h1>
                  <p className="mt-1 text-text-secondary">{t('setup.currencySubtitle')}</p>
                  <div className="mt-6 flex items-center gap-4 rounded-lg border-2 border-primary bg-primary-soft p-4">
                    <span className="flex size-12 items-center justify-center rounded-full bg-primary text-lg font-extrabold text-text-on-primary">
                      دج
                    </span>
                    <div className="flex-1">
                      <p className="text-title-card">DZD — {t('setup.dzdLabel')}</p>
                      <p className="text-sm text-text-secondary">دينار جزائري</p>
                    </div>
                    <Check className="size-6 text-success" aria-hidden />
                  </div>
                </>
              )}

              {step === 'budget' && (
                <>
                  <h1 className="text-title-screen text-2xl">{t('setup.budgetTitle')}</h1>
                  <p className="mt-1 text-text-secondary">{t('setup.budgetSubtitle')}</p>
                  <div className="mt-6">
                    <div className="relative">
                      <input
                        value={budget}
                        onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                        inputMode="numeric"
                        placeholder="0"
                        aria-label={t('home.budget')}
                        className="tnum h-16 w-full rounded-lg border border-border-strong bg-surface px-5 pe-16 text-3xl font-extrabold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      <span className="absolute inset-y-0 end-5 flex items-center text-lg font-bold text-text-muted">DZD</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {BUDGET_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setBudget(preset)}
                          className={cn(
                            'tnum rounded-full border px-4 py-2 text-sm font-bold transition active:scale-95',
                            budget === preset ? 'border-primary bg-primary-soft text-success' : 'border-border-subtle bg-surface text-text-secondary',
                          )}
                        >
                          {Number(preset).toLocaleString('en')}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {step === 'month-start' && (
                <>
                  <h1 className="text-title-screen text-2xl">{t('setup.monthStartTitle')}</h1>
                  <p className="mt-1 text-text-secondary">{t('setup.monthStartSubtitle')}</p>
                  <div className="mt-6 grid grid-cols-7 gap-1.5">
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
                      <button
                        key={day}
                        type="button"
                        onClick={() => setMonthStart(day)}
                        aria-pressed={day === monthStart}
                        className={cn(
                          'tnum flex h-11 items-center justify-center rounded-sm text-sm font-bold transition active:scale-90',
                          day === monthStart ? 'bg-primary text-text-on-primary' : 'bg-surface border border-border-subtle text-text-secondary',
                        )}
                      >
                        {day}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {step === 'language' && (
                <>
                  <h1 className="text-title-screen text-2xl">{t('setup.languageTitle')}</h1>
                  <p className="mt-1 text-text-secondary">{t('setup.languageSubtitle')}</p>
                  <div className="mt-6 space-y-2.5">
                    {LOCALES.map((loc) => (
                      <button
                        key={loc}
                        type="button"
                        onClick={() => setLanguage(loc)}
                        aria-pressed={language === loc}
                        className={cn(
                          'flex w-full items-center justify-between rounded-md border-2 p-4 text-start transition active:scale-[0.99]',
                          language === loc ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface',
                        )}
                      >
                        <div>
                          <p className="text-lg font-extrabold">{LOCALE_LABELS[loc].native}</p>
                          <p className="text-sm text-text-muted">{LOCALE_LABELS[loc].english}</p>
                        </div>
                        {language === loc && <Check className="size-5 text-success" aria-hidden />}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {state.errorCode && (
          <p role="alert" className="mb-3 rounded-sm bg-danger-soft px-3 py-2.5 text-sm font-semibold text-danger">
            {resolveAuthError(t, state.errorCode)}
          </p>
        )}

        <div className="pb-4">
          {isLast ? (
            <Button full size="lg" type="submit" loading={pending}>
              {t('setup.finish')}
            </Button>
          ) : (
            <Button full size="lg" type="button" onClick={() => setStepIndex(stepIndex + 1)}>
              {t('setup.continueLabel')}
            </Button>
          )}
          {step === 'budget' && (
            <button
              type="button"
              onClick={() => {
                setBudget('')
                setStepIndex(stepIndex + 1)
              }}
              className="mt-3 w-full py-2 text-center text-sm font-bold text-text-muted"
            >
              {t('setup.skipForNow')}
            </button>
          )}
        </div>
      </form>
    </div>
  )
}
