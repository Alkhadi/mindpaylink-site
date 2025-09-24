// M Share • Pro SW (2025) — cache shell + offline-first
const VERSION = 'mshare-v7-2025-09-23-techfix';
const CORE = [
  './',
  './index.html', './style.css', './app.js',
  './bank.html', './box-breathing.html', './4-7-8-breathing.html', './coherent-5-5.html',
  './pdf.html', './scan.html', './storage.html',
  './assets/default_profile.json', './assets/hero-salon.jpg', './assets/avatar-sample.jpg',
  './assets/m_share_profile.pdf', './assets/alkhadi.png', './assets/amz.jpg',
  './manifest.webmanifest'
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE).catch(()=>{})));
});
self.addEventListener('activate', (e) => {
  e.waitUntil((async ()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k!==VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // only handle same-origin
  e.respondWith((async ()=>{
    const cache = await caches.open(VERSION);
    const cached = await cache.match(e.request);
    const fetchAndPut = fetch(e.request).then(r => { if(r.ok) cache.put(e.request, r.clone()); return r; }).catch(()=>cached);
    return cached || fetchAndPut;
  })());
});
