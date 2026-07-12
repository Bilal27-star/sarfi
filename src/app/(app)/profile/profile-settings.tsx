'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Bell,
  CalendarDays,
  ChevronRight,
  CircleDollarSign,
  Download,
  Languages,
  LockKeyhole,
  LogOut,
  Palette,
  Pencil,
  Repeat,
  Shapes,
  ShieldCheck,
  Vibrate,
  Volume2,
  Wallet,
  type LucideIcon,
} from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { updateSettings } from '@/server/services/settings-actions'
import { signOut } from '@/server/auth/actions'
import { useT } from '@/i18n/provider'
import { resolveActionError } from '@/i18n/action-error'
import { LOCALE_LABELS, type Locale } from '@/i18n/config'
import { dbLangFromLocale } from '@/i18n/config'
import { useFeedbackSettings } from '@/lib/feedback/use-feedback-settings'
import { cn } from '@/lib/utils'

const ICONS: Record<string, LucideIcon> = {
  languages: Languages,
  dollar: CircleDollarSign,
  calendar: CalendarDays,
  shapes: Shapes,
  wallet: Wallet,
  repeat: Repeat,
  bell: Bell,
  palette: Palette,
  download: Download,
  shield: ShieldCheck,
  lock: LockKeyhole,
  pencil: Pencil,
  sound: Volume2,
  haptics: Vibrate,
}

/** Quiet settings row — plain icon (no circular chip), hairline divider from
 * the parent list, no per-row container. "Soon" is a muted label, not a badge. */
export function SettingsRow({
  icon,
  label,
  value,
  soon,
  href,
  onClick,
}: {
  icon: string
  label: string
  value?: string
  soon?: boolean
  href?: string
  onClick?: () => void
}) {
  const t = useT()
  const Icon = ICONS[icon] ?? Shapes
  const content = (
    <>
      <Icon className="size-4.5 shrink-0 text-text-muted" aria-hidden />
      <span className="flex-1 text-start text-title-card">{label}</span>
      {value && <span className="max-w-[40%] truncate text-sm font-medium text-text-muted">{value}</span>}
      {soon ? (
        <span className="text-caption text-text-muted">{t('common.soon')}</span>
      ) : (
        <ChevronRight className="size-4 text-text-muted rtl:rotate-180" aria-hidden />
      )}
    </>
  )
  if (soon) {
    return <div className="flex min-h-13 items-center gap-3 py-3 opacity-60">{content}</div>
  }
  if (href) {
    return (
      <Link href={href} className="flex min-h-13 w-full items-center gap-3 py-3 text-start">
        {content}
      </Link>
    )
  }
  return (
    <button type="button" onClick={onClick} className="flex min-h-13 w-full items-center gap-3 py-3 text-start">
      {content}
    </button>
  )
}

/** Same row shape as SettingsRow but ends in a Switch instead of a
 * chevron/value — used for the Feedback preferences (sound/haptics). */
export function SettingsToggleRow({
  icon,
  label,
  helper,
  checked,
  onChange,
}: {
  icon: string
  label: string
  /** Optional one-line context under the label — the sound/haptics rows
   * don't need it (self-explanatory), preference toggles like notifications
   * usually do. */
  helper?: string
  checked: boolean
  onChange: (next: boolean) => void
}) {
  const Icon = ICONS[icon] ?? Shapes
  return (
    <div className="flex min-h-13 items-center gap-3 py-3">
      <Icon className="size-4.5 shrink-0 text-text-muted" aria-hidden />
      <span className="flex-1 text-start">
        <span className="block text-title-card">{label}</span>
        {helper && <span className="block text-caption text-text-muted">{helper}</span>}
      </span>
      <Switch checked={checked} onChange={onChange} label={label} />
    </div>
  )
}

export function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1 text-caption text-text-muted">{title}</h2>
      <div className="divide-y divide-border-subtle">{children}</div>
    </section>
  )
}

type Props = {
  name: string
  language: Locale
  monthlyBudget: string
  financialMonthStartDay: number
  currencyLabel: string
  budgetDisplay: string
}

type EditTarget = 'name' | 'language' | 'budget' | 'month-start' | null

export function ProfileSettings(props: Props) {
  const router = useRouter()
  const t = useT()
  const [target, setTarget] = useState<EditTarget>(null)
  const [name, setName] = useState(props.name)
  const [language, setLanguage] = useState<Locale>(props.language)
  const [budget, setBudget] = useState(props.monthlyBudget)
  const [monthStart, setMonthStart] = useState(props.financialMonthStartDay)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const { settings: feedbackSettings, setSetting: setFeedbackSetting } = useFeedbackSettings()

  function save(payload: Parameters<typeof updateSettings>[0]) {
    setError(null)
    startTransition(async () => {
      const result = await updateSettings(payload)
      if (!result.ok) {
        setError(resolveActionError(t, result.errorCode))
        return
      }
      setTarget(null)
      router.refresh()
    })
  }

  return (
    <>
      <SettingsSection title={t('profile.sectionFinances')}>
        <SettingsRow icon="languages" label={t('profile.language')} value={LOCALE_LABELS[props.language].native} onClick={() => setTarget('language')} />
        <SettingsRow icon="dollar" label={t('profile.currency')} value={props.currencyLabel} soon />
        <SettingsRow icon="dollar" label={t('profile.monthlyBudget')} value={props.budgetDisplay} onClick={() => setTarget('budget')} />
        <SettingsRow
          icon="calendar"
          label={t('profile.monthStartsOn')}
          value={t('profile.dayOf', { day: props.financialMonthStartDay })}
          onClick={() => setTarget('month-start')}
        />
      </SettingsSection>

      <SettingsSection title={t('profile.sectionFeedback')}>
        <SettingsToggleRow
          icon="sound"
          label={t('profile.soundEffects')}
          checked={feedbackSettings.sound}
          onChange={(v) => setFeedbackSetting('sound', v)}
        />
        <SettingsToggleRow
          icon="haptics"
          label={t('profile.hapticFeedback')}
          checked={feedbackSettings.haptics}
          onChange={(v) => setFeedbackSetting('haptics', v)}
        />
      </SettingsSection>

      {/* Name */}
      <Sheet open={target === 'name'} onClose={() => setTarget(null)} title={t('profile.name')}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={t('profile.name')}
          maxLength={80}
          className="h-12 w-full rounded-md border border-border-strong bg-surface px-4 font-semibold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
        />
        <p className="mt-2 text-xs font-medium text-text-muted">{t('profile.nameHelper')}</p>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
        <Button full size="lg" className="mt-4" loading={pending} disabled={name.trim().length < 2} onClick={() => save({ name: name.trim() })}>
          {t('common.save')}
        </Button>
      </Sheet>

      {/* Language */}
      <Sheet open={target === 'language'} onClose={() => setTarget(null)} title={t('profile.language')}>
        <div className="space-y-2.5">
          {(['ar', 'fr', 'en'] as Locale[]).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setLanguage(loc)}
              aria-pressed={language === loc}
              className={cn(
                'flex w-full items-center justify-between rounded-md border-2 p-3.5 text-start transition',
                language === loc ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface',
              )}
            >
              <span className="text-title-card">{LOCALE_LABELS[loc].native}</span>
              <span className="text-sm text-text-muted">{LOCALE_LABELS[loc].english}</span>
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs font-medium text-text-muted">{t('profile.languageHelper')}</p>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
        <Button full size="lg" className="mt-4" loading={pending} onClick={() => save({ language: dbLangFromLocale(language) })}>
          {t('common.save')}
        </Button>
      </Sheet>

      {/* Budget */}
      <Sheet open={target === 'budget'} onClose={() => setTarget(null)} title={t('profile.monthlyBudget')}>
        <div className="relative">
          <input
            value={budget}
            onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
            inputMode="numeric"
            placeholder="0"
            aria-label={t('profile.monthlyBudget')}
            className="tnum h-14 w-full rounded-md border border-border-strong bg-surface px-4 pe-16 text-2xl font-extrabold focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
          <span className="absolute inset-y-0 end-4 flex items-center font-bold text-text-muted">DZD</span>
        </div>
        <p className="mt-2 text-xs font-medium text-text-muted">{t('profile.budgetHelper')}</p>
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
        <Button full size="lg" className="mt-4" loading={pending} onClick={() => save({ monthlyBudget: budget })}>
          {t('common.save')}
        </Button>
      </Sheet>

      {/* Month start */}
      <Sheet open={target === 'month-start'} onClose={() => setTarget(null)} title={t('profile.monthStartsOn')}>
        <div className="grid grid-cols-7 gap-1.5">
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
        {error && <p role="alert" className="mt-2 text-sm font-semibold text-danger">{error}</p>}
        <Button full size="lg" className="mt-4" loading={pending} onClick={() => save({ financialMonthStartDay: monthStart })}>
          {t('common.save')}
        </Button>
      </Sheet>
    </>
  )
}

export function SignOutButton() {
  const t = useT()
  return (
    <form action={signOut}>
      <Button variant="secondary" full type="submit" className="text-danger">
        <LogOut className="size-4.5" aria-hidden />
        {t('profile.signOut')}
      </Button>
    </form>
  )
}
