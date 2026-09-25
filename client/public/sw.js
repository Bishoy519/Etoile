/* Étoile portal service worker — offline-first READ for public + cached portal data.
 * - App shell (navigations): network-first, fallback to cached shell.
 * - Cacheable GET APIs (portal content, courses, sessions, blog): stale-while-revalidate.
 * - Authenticated / mutation requests: network-only, never cached.
 * Versioned cache; old caches purged on activate.
 */
const VERSION = 'etoile-v2';
const SHELL = `${VERSION}-shell`;
const API = `${VERSION}-api`;

const API_ALLOW = [
  '/api/portal-content',
  '/api/courses',
  '/api/blog',
];

function isApiAllowed(url) {
  try {
    const u = new URL(url);
    if (u.origin !== self.location.origin) return false;
    return API_ALLOW.some((p) => u.pathname === p || u.pathname.startsWith(p + '/') || u.pathname.startsWith(p + '?') || u.pathname === p);
  } catch {
    return false;
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll(['/', '/index.html', '/manifest.webmanifest'])).then(() => self.skipWaiting()).catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== API).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = request.url;

  // Navigations: network-first, shell fallback offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(SHELL).then((c) => c.put('/index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/index.html').then((r) => r || caches.match('/'))),
    );
    return;
  }

  // Allow-listed public APIs: stale-while-revalidate.
  if (isApiAllowed(url) && !request.headers.has('authorization')) {
    event.respondWith(
      caches.open(API).then((cache) =>
        cache.match(request).then((hit) => {
          const net = fetch(request)
            .then((res) => {
              if (res.ok) cache.put(request, res.clone()).catch(() => {});
              return res;
            })
            .catch(() => hit);
          return hit || net;
        }),
      ),
    );
  }
});

// Web-Push receipts: show even when the portal is closed.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // ignore malformed payloads
  }
  const title = data.title || 'Étoile Ballet Academy';
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      dir: 'auto',
      tag: data.tag || 'etoile',
      renotify: true,
      data: { url: data.url || '/' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) {
          try {
            w.navigate(url);
          } catch {
            // cross-origin or closed — fall through to openWindow
          }
          return w.focus();
        }
      }
      return self.clients.openWindow(url);
    }),
  );
});
