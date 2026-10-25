// Offline support: the app's own files are cached on first visit, so interviews work without Wi-Fi.
// Fonts and the PDF library come from CDNs and are cached the first time they load.
// Bump VERSION whenever you change a file, so phones pick up the new copy.
const VERSION = 'heirloom-v1';
const APP_FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'js/content.js', 'js/family.js', 'js/risk.js', 'js/layout.js', 'js/extract.js', 'js/auth.js', 'js/app.js',
  'icons/icon.svg', 'icons/icon-192.png', 'icons/icon-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates show up), falling back to the cache when offline.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || caches.match('index.html')))
  );
});
