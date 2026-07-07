'use client'

import { CircleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useT } from '@/i18n/provider'

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useT()
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-6 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-danger-soft">
        <CircleAlert className="size-8 text-danger" aria-hidden />
      </div>
      <h1 className="text-xl font-extrabold">{t('common.errorTitle')}</h1>
      <p className="mt-2 max-w-xs text-text-secondary">{t('common.errorBody')}</p>
      <Button className="mt-6" onClick={reset}>
        {t('common.tryAgain')}
      </Button>
    </div>
  )
}
