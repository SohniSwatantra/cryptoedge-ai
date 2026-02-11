const CACHE_NAME = 'cryptoedge-v2';
const STATIC_ASSETS = [
    '/',
    '/dashboard',
    '/favicon.svg',
    '/favicon-192x192.png',
    '/favicon-512x512.png',
    '/site.webmanifest'
];

// Install: cache static shell
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch: network-first for API, cache-first for static assets
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Skip non-GET and WebSocket
    if (e.request.method !== 'GET' || url.pathname.startsWith('/ws')) return;

    // API calls: network only (real-time data must be fresh)
    if (url.pathname.startsWith('/api/')) return;

    // Static assets: network first, fallback to cache
    e.respondWith(
        fetch(e.request)
            .then(res => {
                const clone = res.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
                return res;
            })
            .catch(() => caches.match(e.request))
    );
});
