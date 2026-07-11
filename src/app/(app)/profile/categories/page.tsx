import type { Metadata } from 'next'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import { getCurrentUser } from '@/server/auth/session'
import { getCategoriesForManagement } from '@/server/services/categories'
import { getServerTranslator } from '@/i18n/locale-server'
import { CategoriesManager } from './categories-manager'

export const metadata: Metadata = { title: 'Categories' }

export default async function CategoriesPage() {
  const user = (await getCurrentUser())!
  const [categories, { t }] = await Promise.all([
    getCategoriesForManagement(user.id),
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
        <h1 className="text-title-screen">{t('profile.categories')}</h1>
      </div>
      <CategoriesManager initialCategories={categories} />
    </div>
  )
}
