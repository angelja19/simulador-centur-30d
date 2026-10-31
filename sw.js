// Service worker: guarda la app completa para usarla sin internet.
const CACHE = 'centur30d-mvvwwc1v';
const FILES = ["./","./assets/export-CKQbfF4p.js","./assets/html2canvas-fMrU3NQZ.js","./assets/ibm-plex-mono-latin-400-normal-DMJ8VG8y.woff2","./assets/ibm-plex-mono-latin-600-normal-BgSNZQsw.woff2","./assets/ibm-plex-mono-latin-ext-400-normal-BmRBH3aV.woff2","./assets/ibm-plex-mono-latin-ext-600-normal-D38SheWl.woff2","./assets/index-CF4vRIr9.css","./assets/index-DHj2pcLn.js","./assets/index.es-DBz9nBCx.js","./assets/jspdf.es.min-BoFRnfT3.js","./assets/purify.es-CmFH7t8M.js","./assets/rolldown-runtime-XKyaHtl9.js","./assets/saira-condensed-latin-500-normal-DIdKjHXc.woff2","./assets/saira-condensed-latin-700-normal-BpDqMSKw.woff2","./assets/saira-condensed-latin-ext-500-normal-CIzImMjU.woff2","./assets/saira-condensed-latin-ext-700-normal-rfs_OqX7.woff2","./assets/sim3d-BtS-DkJL.js","./assets/STLExporter-b41iSzaK.js","./assets/three.module-BkOa2bWp.js","./assets/vt323-latin-400-normal-wDgJuOC9.woff2","./assets/vt323-latin-ext-400-normal-iUdYUaX4.woff2","./icons/icon-192.png","./icons/icon-512.png","./icons/icon.ico","./icons/maskable-512.png","./index.html","./manifest.webmanifest"];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then(r => r || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match('./index.html'))));
});
