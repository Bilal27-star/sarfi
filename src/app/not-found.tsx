import Link from 'next/link'
import { Compass } from 'lucide-react'
import { getServerTranslator } from '@/i18n/locale-server'

export default async function NotFound() {
  const { t } = await getServerTranslator()
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center pt-safe pb-safe">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-sunken">
        <Compass className="size-8 text-text-muted" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold">{t('common.notFoundTitle')}</h1>
      <p className="mt-2 max-w-xs text-text-secondary">{t('common.notFoundBody')}</p>
      <Link
        href="/home"
        className="btn-tactile mt-6 flex h-12 items-center justify-center rounded-md bg-primary px-6 font-bold text-text-on-primary [--btn-shadow-color:var(--color-primary-pressed)]"
      >
        {t('common.backToHome')}
      </Link>
    </div>
  )
}
