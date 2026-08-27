// Service Worker for Estrategista Eleitoral PWA
const CACHE_NAME = 'estrategista-pwa-v1'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Periodic background sync simulation / cache strategy
self.addEventListener('fetch', (event) => {
  // Let network handle by default, fallback to cache if offline
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})
