/* ==========================================
   HABIT PRO - SERVICE WORKER PWA CACHE ENGINE
   Provides 0ms instant offline asset loading
   ========================================== */

const CACHE_NAME = 'habit-pro-cache-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './main.html',
  './analys.html',
  './habit.html',
  './styles/main.css',
  './styles/animations.css',
  './styles/responsive.css',
  './styles/hero.css',
  './js/main.js',
  './js/auth.js',
  './js/habits.js',
  './js/charts.js',
  './js/ai-analyzer.js',
  './js/firebase-config.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter(name => name !== CACHE_NAME).map(name => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => cachedResponse);

      return cachedResponse || fetchPromise;
    })
  );
});
