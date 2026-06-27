// SE7EN Service Worker — caches the app for full offline use
const CACHE = 'se7en-v19';
// Use relative paths + the directory root so it works in a GitHub Pages subfolder
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// Install: cache files individually so one failure doesn't break everything
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(ASSETS.map(function(url) {
        return cache.add(url).catch(function(err) {
          // Ignore individual failures (e.g. a missing optional asset)
          return null;
        });
      }));
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE; }).map(function(k){ return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

// Fetch: serve from cache first, fall back to network
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;
      return fetch(e.request).then(function(resp) {
        return resp;
      }).catch(function() {
        // Offline and not cached — for any navigation, serve the cached app shell
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html').then(function(idx) {
            return idx || caches.match('./');
          });
        }
        return undefined;
      });
    })
  );
});
