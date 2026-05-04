const CACHE_NAME = 'bauleiter-v3';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './modules/shared.js',
  './modules/dashboard.js',
  './modules/projekte.js',
  './modules/aufgaben.js',
  './modules/bautagebuch.js',
  './modules/kontakte.js',
  './modules/reporting.js',
  './modules/kostenschaetzung.js',
  './modules/pruefungen.js',
  './modules/einstellungen.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    fetch(event.request)
      .then(response => {
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
