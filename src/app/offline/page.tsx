import type { Metadata } from 'next'
import { WifiOff } from 'lucide-react'
import { getServerTranslator } from '@/i18n/locale-server'

export const metadata: Metadata = { title: 'Offline' }

export default async function OfflinePage() {
  const { t } = await getServerTranslator()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center pt-safe pb-safe">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-sunken">
        <WifiOff className="size-8 text-text-muted" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold">{t('common.offlineTitle')}</h1>
      <p className="mt-2 max-w-xs text-text-secondary">{t('common.offlineBody')}</p>
    </div>
  )
}
