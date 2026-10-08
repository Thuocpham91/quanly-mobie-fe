const CACHE_NAME = 'quanly-mobie-cache-v3';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(err => console.warn('Cache addAll warning:', err));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.startsWith(self.location.origin) && event.request.method === 'GET') {
    event.respondWith((async () => {
      const cachedResponse = await caches.match(event.request);

      // Always try the network for document navigations so SPA routes receive the latest shell.
      if (event.request.mode === 'navigate') {
        try {
          return await fetch(event.request);
        } catch (error) {
          console.warn('Navigation request failed, using cached app shell:', error);
          return (await caches.match('/index.html')) || cachedResponse || Response.error();
        }
      }

      const isAppBundle = /\.(js|css)(\?|$)/.test(event.request.url);
      if (cachedResponse && !isAppBundle) return cachedResponse;

      try {
        const response = await fetch(event.request);
        if (response.status === 200) {
          const url = event.request.url;
          if (url.includes('.js') || url.includes('.css') || url.includes('.png') || url.includes('.svg') || url.includes('.woff2')) {
            const responseClone = response.clone();
            event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone)));
          }
        }
        return response;
      } catch (error) {
        console.warn('Asset request failed:', error);
        return Response.error();
      }
    })());
  }
});
