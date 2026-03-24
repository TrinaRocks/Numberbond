// Number Bonds Games — Service Worker
// Bump the cache version here whenever you redeploy updated files
const CACHE = 'numberbonds-v1';

const FILES = [
  '/index.html',
  '/ocean_number_bonds.html',
  '/potion_shop.html',
  '/weighing_scales.html',
  '/bond_engine.js',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png'
];

// Install: cache everything up front
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(FILES))
      .then(() => self.skipWaiting())
  );
});

// Activate: delete any old caches from previous versions
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
