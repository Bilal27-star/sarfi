'use client'

import { useState } from 'react'
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react'
import { Sheet } from '@/components/ui/sheet'
import { SettingsRow } from './profile-settings'
import { useTheme } from '@/components/theme/theme-provider'
import { useT } from '@/i18n/provider'
import type { ThemePreference } from '@/lib/theme/config'
import { cn } from '@/lib/utils'

const OPTIONS: { value: ThemePreference; icon: LucideIcon; labelKey: 'profile.appearanceLight' | 'profile.appearanceDark' | 'profile.appearanceSystem' }[] = [
  { value: 'light', icon: Sun, labelKey: 'profile.appearanceLight' },
  { value: 'dark', icon: Moon, labelKey: 'profile.appearanceDark' },
  { value: 'system', icon: Monitor, labelKey: 'profile.appearanceSystem' },
]

/** Appearance row + selector sheet. Applies instantly on tap (no save
 * button, no server round-trip to wait on) — ThemeProvider.setPreference
 * flips the DOM synchronously; persistence happens in the background. */
export function AppearanceRow() {
  const t = useT()
  const { preference, setPreference } = useTheme()
  const [open, setOpen] = useState(false)
  const current = OPTIONS.find((o) => o.value === preference) ?? OPTIONS[2]

  return (
    <>
      <SettingsRow icon="palette" label={t('profile.appearance')} value={t(current.labelKey)} onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={t('profile.appearance')}>
        <div className="space-y-2.5">
          {OPTIONS.map(({ value, icon: Icon, labelKey }) => {
            const active = value === preference
            return (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setPreference(value)
                  setOpen(false)
                }}
                aria-pressed={active}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md border-2 p-3.5 text-start transition',
                  active ? 'border-primary bg-primary-soft' : 'border-border-subtle bg-surface',
                )}
              >
                <Icon className={cn('size-5 shrink-0', active ? 'text-success' : 'text-text-muted')} aria-hidden />
                <span className="text-title-card">{t(labelKey)}</span>
              </button>
            )
          })}
        </div>
        <p className="mt-3 text-xs font-medium text-text-muted">{t('profile.appearanceHelper')}</p>
      </Sheet>
    </>
  )
}
