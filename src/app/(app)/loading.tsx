import { getServerTranslator } from '@/i18n/locale-server'

/** Route-level skeleton for app screens — mirrors the Home layout shape. */
export default async function AppLoading() {
  const { t } = await getServerTranslator()
  return (
    <div className="space-y-5 py-5" aria-busy="true" aria-label={t('common.loading')}>
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-5 w-40 animate-pulse rounded-sm bg-surface-sunken" />
          <div className="h-3.5 w-28 animate-pulse rounded-sm bg-surface-sunken" />
        </div>
        <div className="size-11 animate-pulse rounded-full bg-surface-sunken" />
      </div>
      <div className="h-40 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-28 animate-pulse rounded-lg bg-surface-sunken" />
      <div className="h-56 animate-pulse rounded-lg bg-surface-sunken" />
    </div>
  )
}
