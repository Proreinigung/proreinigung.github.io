/* ============================================================
   Proreinigung — Service Worker (PWA)
   ============================================================ */
const CACHE = 'proreinigung-v1';

const STATIC = [
  '/team/dashboard.html',
  '/team/orders.html',
  '/team/chat.html',
  '/team/nachrichten.html',
  '/team/profil.html',
  '/css/style.css',
  '/css/team.css',
  '/js/auth.js',
  '/js/db.js',
  '/js/realtime.js',
  '/supabase.js',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css',
  'https://cdn.jsdelivr.net/npm/chart.js',
];

/* Install */
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(STATIC).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* Activate */
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Fetch — Network first, fallback to cache */
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('supabase.co')) return; // Never cache Supabase API

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request).then(r => r || caches.match('/team/dashboard.html')))
  );
});

/* Push Notifications */
self.addEventListener('push', e => {
  let data = { title: 'Proreinigung', body: 'Neue Benachrichtigung', icon: '/assets/images/icon-192.png' };
  try { data = { ...data, ...e.data.json() }; } catch {}
  e.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/assets/images/icon-192.png',
      badge: '/assets/images/icon-192.png',
      vibrate: [200, 100, 200],
      tag: 'proreinigung-notif',
      renotify: true,
      data: { url: data.url || '/team/dashboard.html' }
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data?.url || '/team/dashboard.html';
  e.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(ws => {
      const w = ws.find(w => w.url.includes('proreinigung'));
      if (w) { w.focus(); w.navigate(url); }
      else clients.openWindow(url);
    })
  );
});
