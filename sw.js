/**
 * ScanEan Service Worker v4
 * Cache versioning automatico + strategia Network First per asset dinamici
 */

// ==== CAMBIA QUESTO NUMERO AD OGNI DEPLOY ====
// Esempi validi: '1.0', '1.1', '2.0', '3', 'v2.1'
const APP_VERSION = '1.0';
// =============================================

const CACHE_NAME = 'scanean-v' + APP_VERSION;
const STATIC_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './style.css',
  './app.js',
  './storage.js',
  './openfoodfacts.js',
  './recipes-api.js',
  './camera.js',
  './barcode-scanner.js',
  './manifest.json',
  './icons/icon-72x72.png',
  './icons/icon-96x96.png',
  './icons/icon-128x128.png',
  './icons/icon-144x144.png',
  './icons/icon-152x152.png',
  './icons/icon-192x192.png',
  './icons/icon-384x384.png',
  './icons/icon-512x512.png'
];

// File che devono sempre essere aggiornati dal network (mai cache stale)
const NETWORK_FIRST_PATTERNS = [
  /\.html$/,
  /\.js$/,
  /\.css$/,
  /manifest\.json$/
];

function isNetworkFirst(url) {
  for (var i = 0; i < NETWORK_FIRST_PATTERNS.length; i++) {
    if (NETWORK_FIRST_PATTERNS[i].test(url.pathname)) {
      return true;
    }
  }
  return false;
}

// Installazione: cache degli asset statici
self.addEventListener('install', function(event) {
  console.log('[SW] Installazione v' + APP_VERSION + '...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        console.log('[SW] Caching asset statici v' + APP_VERSION);
        return cache.addAll(STATIC_ASSETS);
      })
      .then(function() {
        return self.skipWaiting();
      })
      .catch(function(err) {
        console.error('[SW] Errore caching:', err);
      })
  );
});

// Attivazione: pulizia cache vecchie + claim clients + notifica aggiornamento
self.addEventListener('activate', function(event) {
  console.log('[SW] Attivazione v' + APP_VERSION + '...');
  event.waitUntil(
    caches.keys()
      .then(function(cacheNames) {
        return Promise.all(
          cacheNames.map(function(cacheName) {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Rimozione cache vecchia:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(function() {
        return self.clients.claim();
      })
      .then(function() {
        // Notifica a TUTTI i client che c'e un aggiornamento
        return self.clients.matchAll({ type: 'window' });
      })
      .then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({
            type: 'SW_UPDATED',
            version: APP_VERSION
          });
        });
      })
  );
});

// Fetch: strategia intelligente
self.addEventListener('fetch', function(event) {
  var request = event.request;
  var url = new URL(request.url);

  // Ignora richieste non GET
  if (request.method !== 'GET') {
    return;
  }

  // Ignora protocolli non http(s)
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Per risorse esterne (CDN, API): Network First con fallback cache
  if (url.hostname !== self.location.hostname) {
    if (isExternalAPI(url)) {
      event.respondWith(networkFirst(request));
    }
    return;
  }

  // Per asset locali: Network First se e HTML/JS/CSS, altrimenti Cache First
  if (isNetworkFirst(url)) {
    event.respondWith(networkFirst(request));
  } else {
    event.respondWith(cacheFirst(request));
  }
});

function isExternalAPI(url) {
  var host = url.hostname;
  return host.indexOf('openfoodfacts.org') !== -1 ||
         host.indexOf('themealdb.com') !== -1 ||
         host.indexOf('unpkg.com') !== -1 ||
         host.indexOf('jsdelivr.net') !== -1 ||
         host.indexOf('tesseract.js') !== -1;
}

function cacheFirst(request) {
  return caches.match(request)
    .then(function(cachedResponse) {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then(function(networkResponse) {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }

          var responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME)
            .then(function(cache) {
              cache.put(request, responseToCache);
            });

          return networkResponse;
        })
        .catch(function() {
          if (request.mode === 'navigate' || request.headers.get('accept').indexOf('text/html') !== -1) {
            return caches.match('./offline.html');
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    });
}

function networkFirst(request) {
  return fetch(request)
    .then(function(networkResponse) {
      if (networkResponse && networkResponse.status === 200) {
        var responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME)
          .then(function(cache) {
            cache.put(request, responseToCache);
          });
      }
      return networkResponse;
    })
    .catch(function() {
      return caches.match(request)
        .then(function(cachedResponse) {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (request.mode === 'navigate' || request.headers.get('accept').indexOf('text/html') !== -1) {
            return caches.match('./offline.html');
          }
          return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain' }
          });
        });
    });
}

// Gestione messaggi dal client (es. skip waiting)
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Gestione push notification
self.addEventListener('push', function(event) {
  if (event.data) {
    var data = event.data.json();
    event.waitUntil(
      self.registration.showNotification(data.title || 'ScanEan', {
        body: data.body || 'Hai prodotti in scadenza!',
        icon: './icons/icon-192x192.png',
        badge: './icons/icon-72x72.png',
        tag: data.tag || 'scanean-reminder',
        requireInteraction: true
      })
    );
  }
});

// Clic su notifica
self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.openWindow('./index.html')
  );
});
