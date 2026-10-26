// Offline support: the app's own files are cached on first visit, so interviews work without Wi-Fi.
// Fonts and the PDF library come from CDNs and are cached the first time they load.
// Bump VERSION whenever you change a file, so phones pick up the new copy.
const VERSION = 'heirloom-v10';
const APP_FILES = [
  './', 'index.html', 'manifest.webmanifest',
  'js/config.js', 'js/content.js', 'js/languages.js', 'js/family.js', 'js/risk.js', 'js/layout.js', 'js/extract.js',
  'js/legal.js', 'js/auth.js', 'js/media.js', 'js/elder.js', 'js/share.js', 'js/handoff.js', 'js/stt.js', 'js/stt-worker.js',
  'js/feedback.js', 'js/tour.js', 'js/app.js', 'vendor/jspdf.umd.min.js', 'vendor/qrcode.js',
  'icons/icon.svg', 'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Network first (so updates show up), falling back to the cache when offline. Only this app's files, fonts and
// the speech engine are handled here. Speech models (already cached by the speech library) and server replies
// go straight to the network, so an offline failure is reported as one instead of returning the app page.
const CDNS = ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const host = new URL(e.request.url).host;
  if (host !== location.host && !CDNS.includes(host)) return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); }
        return res;
      })
      .catch(() => caches.match(e.request).then(hit => hit || (e.request.mode === 'navigate' ? caches.match('index.html') : Response.error())))
  );
});
