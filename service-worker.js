const CACHE_NAME = 'bauleiter-v7';
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
  './modules/einstellungen.js',
  './modules/wiki.js',
  './modules/tools.js'
];

self.addEventListener('install', event => {
  self.skipWaiting();
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
    Promise.all([
      caches.keys().then(cacheNames =>
        Promise.all(cacheNames.map(c => c !== CACHE_NAME ? caches.delete(c) : null))
      ),
      self.clients.claim()
    ])
  );
});
