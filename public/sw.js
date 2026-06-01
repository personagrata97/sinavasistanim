const CACHE_NAME = 'sinav-asistanim-v4';
const STATIC_CACHE = 'static-v4';
const FONT_CACHE = 'fonts-v4';
const IMAGE_CACHE = 'images-v4';

const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/offline.html',
];

const NEVER_CACHE = [
  '/api/',
  '/login',
  '/admin',
];

// Install: precache static assets + offline page
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: clean old caches
self.addEventListener('activate', (event) => {
  const validCaches = [CACHE_NAME, STATIC_CACHE, FONT_CACHE, IMAGE_CACHE];
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((names) =>
        Promise.all(names.map((n) => (!validCaches.includes(n) ? caches.delete(n) : undefined)))
      ),
    ])
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // API istekleri — network-only
  if (NEVER_CACHE.some((p) => url.pathname.startsWith(p))) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Navigasyon — network-first, offline fallback
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Başarılı navigasyonu cache'le (stale-while-revalidate için)
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          return response;
        })
        .catch(() => {
          // Offline: önce cache'den dene, yoksa offline.html, o da yoksa basit hata
          return caches.match(event.request).then((cached) => {
            if (cached) return cached;
            return caches.match('/offline.html').then((offline) => {
              return offline || new Response('Çevrimdışı', { status: 503, statusText: 'Service Unavailable' });
            });
          });
        })
    );
    return;
  }

  // Google Fonts — cache-first (değişmez)
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.status === 200) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Görseller — cache-first, 30 gün
  if (url.pathname.match(/\.(png|jpg|jpeg|svg|webp|ico|gif)$/)) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.status === 200) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // Next.js static assets (_next/static) — cache-first (hash'li, immutable)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.open(STATIC_CACHE).then((cache) =>
        cache.match(event.request).then((cached) => {
          if (cached) return cached;
          return fetch(event.request).then((response) => {
            if (response.status === 200) cache.put(event.request, response.clone());
            return response;
          });
        })
      )
    );
    return;
  }

  // _next/data (page data) — stale-while-revalidate
  if (url.pathname.startsWith('/_next/data/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(event.request).then((cached) => {
          const fetched = fetch(event.request).then((response) => {
            if (response.status === 200) cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetched;
        })
      )
    );
    return;
  }

  // Diğer — network-first
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((r) => r || new Response('Çevrimdışı', { status: 503 })))
  );
});
