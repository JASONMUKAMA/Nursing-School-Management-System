/**
 * Kill-switch for legacy PWA/workbox service workers.
 * No fetch handler — network requests are not intercepted.
 */
self.addEventListener('install', function () {
  self.skipWaiting();
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    (async function () {
      var keys = await caches.keys();
      await Promise.all(keys.map(function (key) {
        return caches.delete(key);
      }));
      await self.clients.claim();
      var clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      await Promise.all(
        clients.map(function (client) {
          return client.navigate(client.url);
        }),
      );
      await self.registration.unregister();
    })(),
  );
});
