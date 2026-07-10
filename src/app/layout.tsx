import type { Metadata, Viewport } from 'next'
import { Manrope, Space_Grotesk, Almarai } from 'next/font/google'
import { RegisterServiceWorker } from '@/components/pwa/register-sw'
import { SplashScreen } from '@/components/layout/splash-screen'
import { getServerLocale, getServerTranslator } from '@/i18n/locale-server'
import { dir } from '@/i18n/config'
import { I18nProvider } from '@/i18n/provider'
import { getServerThemePreference } from '@/lib/theme/server'
import { ThemeProvider } from '@/components/theme/theme-provider'
import './globals.css'

/**
 * Runs before hydration, before first paint. The server already resolved
 * the user's stored preference (system/light/dark — see
 * getServerThemePreference); this only does the one thing that can't be
 * known server-side, which is resolving 'system' against the browser's
 * actual prefers-color-scheme. Keeping this a plain inline script (not
 * next/script) is what makes it blocking — a deferred/async script would
 * paint the wrong theme first and flash.
 */
function themeBootScript(preference: string): string {
  return `(function(){try{
    var p=${JSON.stringify(preference)};
    var d=p==='dark'||(p==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme',d?'dark':'light');
    var m=document.querySelector('meta[name="theme-color"]');
    if(m)m.setAttribute('content',d?'#10140e':'#f7f8f3');
  }catch(e){}})();`
}

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
  const themePreference = await getServerThemePreference()
  // Best-effort server-rendered guess for the explicit-choice case (no flash
  // at all); 'system' defaults to light here and the boot script corrects
  // it before paint if the OS is actually dark.
  const serverGuessTheme = themePreference === 'dark' ? 'dark' : 'light'

  return (
    <html
      lang={locale}
      dir={dir(locale)}
      data-theme={serverGuessTheme}
      data-scroll-behavior="smooth"
      className={`${manrope.variable} ${spaceGrotesk.variable} ${almarai.variable}`}
      // data-theme is finalized by the inline boot script below (it may
      // flip 'light' -> 'dark' for prefers-color-scheme users before React
      // ever hydrates) — that's an intentional, expected mismatch.
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript(themePreference) }} />
      </head>
      <body>
        <ThemeProvider initialPreference={themePreference}>
          <I18nProvider locale={locale}>{children}</I18nProvider>
          <SplashScreen label={t('common.loading')} />
          <RegisterServiceWorker />
        </ThemeProvider>
      </body>
    </html>
  )
}
