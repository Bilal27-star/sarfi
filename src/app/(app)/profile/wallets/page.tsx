import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { getArchivedWallets, getWalletsForManagement } from '@/server/services/wallets'
import { getServerTranslator } from '@/i18n/locale-server'
import { WalletsManager } from './wallets-manager'

export const metadata: Metadata = { title: 'Wallets' }

export default async function WalletsPage() {
  const user = (await getCurrentUser())!
  const [wallets, archivedWallets, { t }] = await Promise.all([
    getWalletsForManagement(user.id),
    getArchivedWallets(user.id),
    getServerTranslator(),
  ])

  return (
    <div className="space-y-5 py-5">
      <div className="flex items-center gap-2">
        <Link
          href="/profile"
          aria-label={t('transactions.backAria')}
          className="flex size-11 items-center justify-center rounded-full bg-surface-sunken"
        >
          <ChevronLeft className="size-5 rtl:rotate-180" aria-hidden />
        </Link>
        <h1 className="text-title-screen">{t('profile.wallets')}</h1>
      </div>
      <WalletsManager initialWallets={wallets} initialArchivedWallets={archivedWallets} />
    </div>
  )
}
