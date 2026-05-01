// ═══════════════════════════════════════════════
// Radha Naam Jap — Service Worker
// Update CACHE version when index.html changes
// ═══════════════════════════════════════════════
const CACHE = 'radha-jap-v53';  // v53: Force cache bust — new sections now visible in PWA

const PRECACHE = [
  './index.html',
  './style.css',
  './stotrams.js',
  './app.js',
  './guru.jpg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Hind+Siliguri:wght@400;600;700&family=Cinzel+Decorative:wght@400;700&family=EB+Garamond:wght@400;600&family=Inter:wght@300;400;500;600&display=swap',
  'https://accounts.google.com/gsi/client',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
  'https://apis.google.com/js/api.js'
];

// Firebase & Google auth must pass through — their SDKs handle offline internally
const BYPASS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebase.googleapis.com',
  'firebaseio.com',
  'oauth2.googleapis.com',
  'accounts.google.com'
];

// ── Install: pre-cache critical assets ──
self.addEventListener('install', e => {
  self.skipWaiting(); // Activate immediately — don't wait for old SW to die
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      )
    )
  );
});

// ── Activate: delete ALL old caches, then force reload all open clients ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE).map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
        )
      )
      .then(() => self.clients.claim())
      .then(() => {
        // Force all open PWA windows to reload so they get the new index.html
        return self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      })
      .then(clients => {
        clients.forEach(client => {
          console.log('[SW] Reloading client for new cache:', client.url);
          client.postMessage({ type: 'SW_UPDATED', version: CACHE });
        });
      })
  );
});

// ── Fetch: network-first for HTML (always fresh), cache-first for assets ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Let Firebase & Google auth requests pass through untouched
  if (BYPASS.some(h => url.href.includes(h))) return;

  // ── index.html: ALWAYS network-first so new versions load immediately ──
  if (url.pathname.endsWith('index.html') || url.pathname.endsWith('/') || e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // ── app.js and style.css: network-first so JS/CSS updates always apply ──
  if (url.pathname.endsWith('app.js') || url.pathname.endsWith('style.css') || url.pathname.endsWith('stotrams.js')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-cache' })
        .then(resp => {
          if (resp && resp.status === 200) {
            const clone = resp.clone();
            caches.open(CACHE).then(c => c.put(e.request, clone));
          }
          return resp;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // ── Everything else: stale-while-revalidate ──
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'error') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => null);

      if (cached) return cached;

      return networkFetch.then(resp => {
        if (resp) return resp;
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ── Handle messages from the page ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    e.waitUntil(
      self.registration.showNotification(e.data.title, {
        body: e.data.body,
        tag: e.data.tag,
        renotify: true,
        vibrate: [200, 100, 200]
      })
    );
  }
  // Page can request a cache bypass reload
  if (e.data && e.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ── Handle notification tap — bring app to focus ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

const PRECACHE = [
  './index.html',
  './style.css',
  './stotrams.js',
  './app.js',
  './guru.jpg',
  './icon-192.png',
  './icon-512.png',
  './manifest.json',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js',
  'https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Hind+Siliguri:wght@400;600;700&family=Cinzel+Decorative:wght@400;700&family=EB+Garamond:wght@400;600&family=Inter:wght@300;400;500;600&display=swap',
  'https://accounts.google.com/gsi/client',
  'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js',
  'https://apis.google.com/js/api.js'
];

// Firebase & Google auth must pass through — their SDKs handle offline internally
const BYPASS = [
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebaseinstallations.googleapis.com',
  'firebase.googleapis.com',
  'firebaseio.com',
  'oauth2.googleapis.com',
  'accounts.google.com'
];

// ── Install: pre-cache critical assets ──
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      )
    )
  );
});

// ── Activate: delete old caches ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys =>
        Promise.all(
          keys.filter(k => k !== CACHE).map(k => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch: stale-while-revalidate strategy ──
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Let Firebase & Google auth requests pass through untouched
  if (BYPASS.some(h => url.href.includes(h))) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request).then(resp => {
        if (resp && resp.status === 200 && resp.type !== 'error') {
          const clone = resp.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => null);

      if (cached) return cached;

      return networkFetch.then(resp => {
        if (resp) return resp;
        if (e.request.mode === 'navigate') return caches.match('./index.html');
        return new Response('Offline', { status: 503 });
      });
    })
  );
});

// ── Handle notification requests from the page ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SHOW_NOTIFICATION') {
    e.waitUntil(
      self.registration.showNotification(e.data.title, {
        body: e.data.body,
        tag: e.data.tag,
        renotify: true,
        vibrate: [200, 100, 200]
      })
    );
  }
});

// ── Handle notification tap — bring app to focus ──
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({ type: 'window' }).then(list => {
      for (const client of list) {
        if ('focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow('/');
    })
  );
});
