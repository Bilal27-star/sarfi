import type { Metadata } from 'next'
import { getCurrentUser } from '@/server/auth/session'
import { getExpenses, getSystemAndUserCategories, getWallets } from '@/server/services/expenses'
import { TransactionsExplorer } from './transactions-explorer'

export const metadata: Metadata = { title: 'Transactions' }

type Search = {
  q?: string
  category?: string
  wallet?: string
  from?: string
  to?: string
  min?: string
  max?: string
}

export default async function TransactionsPage(props: { searchParams: Promise<Search> }) {
  const user = (await getCurrentUser())!
  const params = await props.searchParams

  const [expenses, categories, wallets] = await Promise.all([
    getExpenses(user.id, {
      search: params.q,
      categoryId: params.category,
      walletId: params.wallet,
      from: params.from ? new Date(params.from) : undefined,
      to: params.to ? new Date(params.to) : undefined,
      minAmount: params.min && /^\d+$/.test(params.min) ? params.min : undefined,
      maxAmount: params.max && /^\d+$/.test(params.max) ? params.max : undefined,
    }),
    getSystemAndUserCategories(user.id),
    getWallets(user.id),
  ])

  return (
    <TransactionsExplorer
      expenses={expenses}
      categories={categories.map((c) => ({ id: c.id, slug: c.slug, name: c.name }))}
      wallets={wallets.map((w) => ({ id: w.id, name: w.name }))}
    />
  )
}
