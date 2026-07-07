import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/server/auth/session'
import { LogoMark, LogoWord } from '@/components/layout/logo'
import { LocaleSwitcher } from '@/components/i18n/locale-switcher'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  if (user) redirect('/home')
  return (
    <div className="relative flex min-h-dvh flex-col px-5 pt-safe pb-safe sm:items-center sm:justify-center">
      <div className="w-full sm:max-w-md">
        <div className="mb-8 mt-6 flex items-center justify-between sm:justify-center sm:gap-4">
          <Link href="/welcome" className="flex items-center gap-2.5">
            <LogoMark />
            <LogoWord className="text-xl" />
          </Link>
          <LocaleSwitcher className="sm:absolute sm:end-5 sm:top-5" />
        </div>
        {children}
      </div>
    </div>
  )
}
