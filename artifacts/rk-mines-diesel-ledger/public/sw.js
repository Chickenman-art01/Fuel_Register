const CACHE_NAME = 'rk-mines-ledger-v1';
const APP_SHELL = ['/', '/index.html', '/logo.png', '/pwa-192.png', '/pwa-512.png', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  if (event.request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return;
  }

  if (requestUrl.pathname.startsWith('/api/') || requestUrl.pathname.includes('/functions/')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseCopy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseCopy));
        return response;
      })
      .catch(() => caches.match(event.request).then((response) => response || caches.match('/index.html'))),
  );
});
