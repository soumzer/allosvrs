const CACHE_NAME = 'allosvrs-v26';
const ASSETS = [
    './',
    './index.html',
    './css/main.css',
    './css/themes.css',
    './js/app.js',
    './js/camera.js',
    './js/storage.js',
    './js/i18n.js',
    './js/admin.js',
    './js/jszip.min.js',
    './locales/fr.json',
    './locales/en.json',
    './locales/ar.json',
    './assets/fonts/Tangerine.otf',
    './assets/logos/logo-symbol-purple.png',
    './assets/logos/icon-purple.png',
    './manifest.json'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
