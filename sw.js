const CACHE_NAME = 'allosvrs-v11';
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
    './locales/fr.json',
    './locales/en.json',
    './locales/ar.json',
    './assets/fonts/Tangerine.otf',
    './assets/logos/Pastille black.png',
    './assets/logos/Pastille white.png',
    './assets/logos/Logo purple.png',
    './assets/logos/Logo black.png',
    './assets/logos/Logo white.png',
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
