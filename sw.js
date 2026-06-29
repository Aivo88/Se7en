// SE7EN Service Worker — caches the app for full offline use
const CACHE = 'se7en-v30';
// Relative paths + the directory root so it works in a GitHub Pages subfolder
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './logo.png'
];

// Install: build the new cache fully before taking over.
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(cache) {
      return Promise.all(ASSETS.map(function(url) {
        return fetch(url, { cache: 'no-cache' })
          .then(function(resp) { if (resp && resp.ok) return cache.put(url, resp); })
          .catch(function() { return null; });
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

// Activate: remove old caches AFTER the new one is ready
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k){ return k !== CACHE; })
                             .map(function(k){ return caches.delete(k); }));
    }).then(function() { return self.clients.claim(); })
  );
});

// Helper: return the cached app shell, trying several keys
function appShell() {
  return caches.match('./index.html').then(function(idx) {
    if (idx) return idx;
    return caches.match('./');
  });
}

// Fetch: cache-first. For page navigations always fall back to the app shell.
self.addEventListener('fetch', function(e) {
  const req = e.request;
  if (req.method !== 'GET') return;

  // Navigation requests (opening the app) → serve cached shell, even offline
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match(req, { ignoreSearch: true }).then(function(hit) {
        if (hit) return hit;
        return appShell().then(function(shell) {
          return shell || fetch(req);
        });
      }).catch(function() {
        return appShell();
      })
    );
    return;
  }

  // Everything else → cache first, then network (and cache the result)
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function(hit) {
      if (hit) return hit;
      return fetch(req).then(function(resp) {
        if (resp && resp.ok && resp.type === 'basic') {
          const copy = resp.clone();
          caches.open(CACHE).then(function(c){ c.put(req, copy); });
        }
        return resp;
      });
    }).catch(function() { return undefined; })
  );
});
