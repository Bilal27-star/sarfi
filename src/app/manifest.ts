import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'SARFI — Know where your money goes',
    short_name: 'SARFI',
    description:
      'Track daily expenses in seconds, understand where your money goes, and build better financial habits.',
    id: '/',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7f8f3',
    theme_color: '#f7f8f3',
    orientation: 'portrait',
    lang: 'en',
    dir: 'auto',
    categories: ['finance', 'productivity'],
    icons: [
      { src: '/icons/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/icons/icon-maskable.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'maskable' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}
