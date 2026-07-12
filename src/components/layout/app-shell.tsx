'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { Home, ReceiptText, ChartPie, UserRound, Plus } from 'lucide-react'
import { LogoMark, LogoWord } from '@/components/layout/logo'
import { AddExpenseSheet, type AddExpenseData } from '@/components/expenses/add-expense-sheet'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { useT } from '@/i18n/provider'
import { cn } from '@/lib/utils'

const AddExpenseContext = createContext<() => void>(() => {})
export const useOpenAddExpense = () => useContext(AddExpenseContext)

const NAV_ITEMS = [
  { href: '/home', navKey: 'home' as const, icon: Home },
  { href: '/transactions', navKey: 'transactions' as const, icon: ReceiptText },
  { href: '/insights', navKey: 'insights' as const, icon: ChartPie },
  { href: '/profile', navKey: 'profile' as const, icon: UserRound },
]

type Props = {
  children: ReactNode
  addExpenseData: AddExpenseData
  unreadNotifications: number
}

export function AppShell({ children, addExpenseData, unreadNotifications }: Props) {
  const pathname = usePathname()
  const t = useT()
  const [addOpen, setAddOpen] = useState(false)
  const openAdd = useCallback(() => setAddOpen(true), [])

  return (
    <AddExpenseContext.Provider value={openAdd}>
      <div className="min-h-dvh md:flex">
        {/* Desktop / tablet side navigation */}
        <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col gap-1 border-e border-border-subtle bg-surface px-4 py-6 sticky top-0 h-dvh">
          <div className="mb-6 flex items-center justify-between gap-2 px-2">
            <Link href="/home" className="flex min-w-0 items-center gap-3">
              <LogoMark />
              <LogoWord className="text-xl" />
            </Link>
            <NotificationBell initialUnread={unreadNotifications} />
          </div>
          {NAV_ITEMS.map(({ href, navKey, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 font-semibold transition-colors',
                  active
                    ? 'bg-primary-soft text-success'
                    : 'text-text-secondary hover:bg-surface-sunken hover:text-text-primary',
                )}
              >
                <Icon className="size-5" aria-hidden />
                {t(`navigation.${navKey}`)}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={openAdd}
            className="btn-tactile mt-4 flex h-12 items-center justify-center gap-2 rounded-md bg-primary font-bold text-text-on-primary [--btn-shadow-color:var(--color-primary-pressed)]"
          >
            <Plus className="size-5" aria-hidden />
            {t('navigation.addExpense')}
          </button>
        </aside>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <main className="mx-auto w-full max-w-2xl px-4 sm:px-6 pt-safe pb-safe-nav md:pb-10">
            {children}
          </main>
        </div>

        {/* Mobile bottom navigation — quiet by default, a small pill marks the active tab */}
        <nav
          aria-label={t('navigation.primaryAria')}
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface/95 backdrop-blur pb-safe md:hidden"
        >
          <div className="mx-auto grid h-14 max-w-lg grid-cols-5 items-center px-1">
            {NAV_ITEMS.slice(0, 2).map((item) => (
              <NavItem key={item.href} {...item} label={t(`navigation.${item.navKey}`)} active={pathname.startsWith(item.href)} />
            ))}
            <div className="relative flex justify-center">
              <button
                type="button"
                onClick={openAdd}
                aria-label={t('navigation.addExpense')}
                className="btn-tactile absolute -top-5 flex size-12 items-center justify-center rounded-full bg-primary text-text-on-primary [--btn-shadow-color:var(--color-primary-pressed)]"
              >
                <Plus className="size-6" strokeWidth={2.5} aria-hidden />
              </button>
            </div>
            {NAV_ITEMS.slice(2).map((item) => (
              <NavItem key={item.href} {...item} label={t(`navigation.${item.navKey}`)} active={pathname.startsWith(item.href)} />
            ))}
          </div>
        </nav>

        <AddExpenseSheet open={addOpen} onClose={() => setAddOpen(false)} data={addExpenseData} />
      </div>
    </AddExpenseContext.Provider>
  )
}

function NavItem({ href, icon: Icon, active, label }: { href: string; icon: typeof Home; active: boolean; label: string }) {
  const reduced = useReducedMotion()
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className="relative flex min-h-11 flex-col items-center justify-center gap-0.5"
    >
      <Icon
        className={cn('size-5 transition-colors', active ? 'text-success' : 'text-text-muted')}
        aria-hidden
        strokeWidth={active ? 2.4 : 2}
      />
      {active ? (
        <motion.span
          layoutId="nav-active-label"
          className="text-[10px] font-bold text-success"
          transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 35 }}
        >
          {label}
        </motion.span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
    </Link>
  )
}
