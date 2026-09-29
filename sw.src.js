// ============================================================================
// sw.src.js — SOURCE for the service worker. `build_pwa.sh` copies this to sw.js
// with __BUILD_ID__ replaced by a content hash of the built app. NEVER edit sw.js.
//
// ---------------------------------------------------------------------------
// WHY NETWORK-FIRST FOR THE DOCUMENT (shell_todo.md:92-94)
// ---------------------------------------------------------------------------
// The stated reason PWA-ing was deferred: "a PWA near-freezes the code". A naive
// cache-first service worker does exactly that — an installed child's device keeps
// serving the cached HTML forever, so a fix never reaches them and the localStorage
// migration machinery never gets to run.
//
// This worker inverts it for the one file that IS the app:
//   * NAVIGATIONS  -> network-first with a short timeout, cache as the fallback.
//     Online: the device always launches the newest build (so a rebuild reaches it
//     on next launch, and SHELL_MIGRATIONS runs against preserved localStorage).
//     Offline / slow: the cached copy loads, so the game still works on a plane.
//   * EVERYTHING ELSE (icons, manifest) -> cache-first. Tiny, and hash-named caches
//     mean a rebuild retires the old one wholesale.
// The cache name carries the build hash, so every rebuild is a clean cache
// generation; install skipWaiting()s and activate claim()s, so there is no
// "close every tab to get the update" step for a non-technical adult.
// ============================================================================
'use strict';

const BUILD = '__BUILD_ID__';
const CACHE = 'onb-' + BUILD;
const NET_TIMEOUT_MS = 3500;

// './' and './index.html' are the same bytes but distinct cache keys — a navigation
// to the directory root hits the first, a direct link the second. Both are wanted.
const PRECACHE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png',
  './icons/apple-touch-icon-180.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k.startsWith('onb-') && k !== CACHE).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Network, but give up after NET_TIMEOUT_MS so a flaky school wifi does not leave a
// child staring at a blank screen when a perfectly good copy is already on the device.
function fetchWithTimeout(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NET_TIMEOUT_MS);
    fetch(request).then(
      (res) => { clearTimeout(timer); resolve(res); },
      (err) => { clearTimeout(timer); reject(err); }
    );
  });
}

async function networkFirst(request) {
  try {
    const res = await fetchWithTimeout(request);
    if (res && res.ok) {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
    }
    return res;
  } catch (e) {
    const hit = await caches.match(request, { ignoreSearch: true });
    if (hit) return hit;
    const index = await caches.match('./index.html');
    if (index) return index;
    throw e;
  }
}

async function cacheFirst(request) {
  const hit = await caches.match(request, { ignoreSearch: true });
  if (hit) return hit;
  const res = await fetch(request);
  if (res && res.ok) {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
  }
  return res;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;                                  // never cache writes
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;                   // leave cross-origin alone
  if (req.mode === 'navigate' || url.pathname.endsWith('/index.html')) {
    event.respondWith(networkFirst(req));
  } else {
    event.respondWith(cacheFirst(req));
  }
});

// Escape hatch for a future in-page "update now" button.
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
