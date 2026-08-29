// Service Worker for Estrategista Eleitoral PWA & Real Web Push Notifications
const CACHE_NAME = 'estrategista-pwa-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

// Web Push Notification Event Handler
self.addEventListener('push', (event) => {
  let data = {}

  if (event.data) {
    try {
      data = event.data.json()
    } catch (e) {
      data = {
        title: 'Alerta Estrategista Eleitoral',
        body: event.data.text(),
      }
    }
  } else {
    data = {
      title: 'Alerta Crítico de Campanha',
      body: 'Uma nova alteração de liderança ou oscilação de pesquisa foi detectada!',
    }
  }

  const title = data.title || 'Alerta Estrategista Eleitoral'
  const options = {
    body: data.body || 'Alerta de virada de pesquisa ou ação prioritária.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    image: data.image || undefined,
    vibrate: [200, 100, 200, 100, 300],
    tag: data.tag || 'estrategista-push-alert',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || (data.data && data.data.url) || '/polls',
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      { action: 'open_app', title: 'Abrir App' },
      { action: 'dismiss', title: 'Fechar' },
    ],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

// Notification Click Handler (opens/focuses the app on the target URL)
self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  if (event.action === 'dismiss') {
    return
  }

  const targetUrl = (event.notification.data && event.notification.data.url) || '/polls'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          if ('navigate' in client) {
            client.navigate(targetUrl)
          }
          return client.focus()
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl)
      }
    }),
  )
})

// Periodic background sync simulation / cache strategy
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)))
})
