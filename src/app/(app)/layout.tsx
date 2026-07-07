import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { getSystemAndUserCategories, getWallets } from '@/server/services/expenses'
import { AppShell } from '@/components/layout/app-shell'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (!user) redirect('/signin')
  if (!user.preferences?.setupCompleted) redirect('/setup')

  const [categories, wallets] = await Promise.all([
    getSystemAndUserCategories(user.id),
    getWallets(user.id),
  ])

  return (
    <AppShell
      addExpenseData={{
        categories: categories.map((c) => ({
          id: c.id,
          name: c.name,
          slug: c.slug,
          icon: c.icon,
          color: c.color,
          children: c.children.map((child) => ({
            id: child.id,
            name: child.name,
            slug: child.slug,
            icon: child.icon,
            color: child.color,
          })),
        })),
        wallets: wallets.map((w) => ({ id: w.id, name: w.name, icon: w.icon })),
        currency: user.preferredCurrency,
      }}
    >
      {children}
    </AppShell>
  )
}
