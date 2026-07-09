import type { Metadata, Viewport } from 'next'
import { Manrope, Space_Grotesk, Almarai } from 'next/font/google'
import { RegisterServiceWorker } from '@/components/pwa/register-sw'
import { SplashScreen } from '@/components/layout/splash-screen'
import { getServerLocale, getServerTranslator } from '@/i18n/locale-server'
import { dir } from '@/i18n/config'
import { I18nProvider } from '@/i18n/provider'
import './globals.css'

const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
})

const spaceGrotesk = Space_Grotesk({
  variable: '--font-space-grotesk',
  subsets: ['latin'],
  weight: ['500', '600', '700'],
})

const almarai = Almarai({
  variable: '--font-almarai',
  subsets: ['arabic'],
  weight: ['400', '700', '800'],
})

export const metadata: Metadata = {
  title: { default: 'SARFI — Know where your money goes', template: '%s · SARFI' },
  description:
    'SARFI (صرفي) helps you track daily expenses in seconds, understand where your money goes, and build better financial habits.',
  applicationName: 'SARFI',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'SARFI' },
}

export const viewport: Viewport = {
  themeColor: '#f7f8f3',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale()
  const { t } = await getServerTranslator()

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${almarai.variable}`}
    >
      <body>
        <I18nProvider locale={locale}>{children}</I18nProvider>
        <SplashScreen label={t('common.loading')} />
        <RegisterServiceWorker />
      </body>
    </html>
  )
}
