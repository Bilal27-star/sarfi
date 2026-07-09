/**
 * SARFI service worker — honest offline foundation.
 *
 * Strategy:
 * - Static assets (/_next/static, fonts, icons): cache-first (immutable).
 * - Navigations: network-first with an offline fallback page.
 * - API/data requests are NOT cached — financial data must never be stale
 *   silently. Offline expense drafts + a sync queue are the documented next
 *   step (see README) and will build on this worker.
 */
// v2: new brand mark — bumping evicts the old logo cached under /icons/
const VERSION = 'sarfi-v2'
const STATIC_CACHE = `${VERSION}-static`
const OFFLINE_URL = '/offline'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll([OFFLINE_URL, '/icons/icon.svg'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Immutable build assets: cache-first
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  // Page navigations: network-first, offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE_URL)))
  }
})
