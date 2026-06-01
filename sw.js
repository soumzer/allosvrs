const CACHE_NAME = 'allosvrs-v28';
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
    './locales/ur.json',
    './locales/hi.json',
    './locales/ru.json',
    './assets/fonts/Tangerine.otf',
    './assets/logos/logo-symbol-purple.png',
    './assets/logos/icon-purple.png',
    './assets/qr-guest.png',
    './manifest.json'
];

// Cache-first for binary/static assets (fonts, images, icons).
// Network-first for everything else (HTML/JS/CSS/JSON/manifest) so devs
// always get fresh code on reload without having to reinstall the PWA.
const STATIC_EXT = /\.(otf|woff2?|ttf|eot|png|jpe?g|gif|webp|svg|ico|mp4|webm)(\?.*)?$/i;

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
    if (e.request.method !== 'GET') return;

    const url = e.request.url;
    const isStatic = STATIC_EXT.test(url);

    if (isStatic) {
        // Cache-first: serve cached if available, else fetch + cache
        e.respondWith(
            caches.match(e.request).then(cached => {
                if (cached) return cached;
                return fetch(e.request).then(resp => {
                    if (resp && resp.status === 200 && resp.type === 'basic') {
                        const copy = resp.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                    }
                    return resp;
                });
            })
        );
    } else {
        // Network-first: try network, update cache; fallback to cache if offline
        e.respondWith(
            fetch(e.request).then(resp => {
                if (resp && resp.status === 200 && resp.type === 'basic') {
                    const copy = resp.clone();
                    caches.open(CACHE_NAME).then(cache => cache.put(e.request, copy));
                }
                return resp;
            }).catch(() => caches.match(e.request))
        );
    }
});
