/// <reference lib="webworker" />
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'
import { appWindow } from './swHelpers'

declare const self: ServiceWorkerGlobalScope

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
// Offline launches: every navigation inside the scope gets the cached app shell
// (generateSW did this for us; injectManifest does not).
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// The page asks the waiting worker to take over when the user taps "Update".
self.addEventListener('message', (event) => {
  if ((event.data as { type?: string } | undefined)?.type === 'SKIP_WAITING') void self.skipWaiting()
})

interface PushPayload {
  title?: string
  body?: string
  tag?: string
  url?: string
}

self.addEventListener('push', (event) => {
  const data = (event.data?.json() ?? {}) as PushPayload
  event.waitUntil(
    self.registration.showNotification(data.title ?? 'Pocket Gains', {
      body: data.body,
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      tag: data.tag ?? 'reminder',
      data: { url: data.url ?? self.registration.scope },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      const win = appWindow(windows, self.registration.scope)
      if (win) {
        await win.focus()
        return
      }
      await self.clients.openWindow((event.notification.data as { url: string }).url)
    })(),
  )
})
