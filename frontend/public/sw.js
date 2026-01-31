const CACHE_NAME = 'wca-pro-v3-industrial';
const ASSETS_CACHE = 'wca-assets-v3';

// Core assets to cache immediately
const PRECACHE_URLS = [
    '/',
    '/index.html',
    '/index.css',
    '/manifest.json',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
    // Force activation meant for immediate takeover
    self.skipWaiting();
    event.waitUntil(
        caches.open(ASSETS_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(
            keys.map((key) => {
                if (key !== CACHE_NAME && key !== ASSETS_CACHE) {
                    console.log('[SW] Purgando caché antiguo:', key);
                    return caches.delete(key);
                }
            })
        ))
    );
    // Claim clients immediately so the first load is controlled
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // 1. API: Network Only (Critico para tiempo real)
    // EXCEPTION: Archives List (Offline Access)
    if (url.pathname.includes('/api/reports/v2/archives')) {
        event.respondWith(
            fetch(event.request)
                .then((response) => {
                    const clone = response.clone();
                    caches.open('wca-archives-v1').then((cache) => cache.put(event.request, clone));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    if (url.pathname.startsWith('/api/')) {
        return;
    }

    // 2. Navigation (HTML): Network First => Cache
    // Ensures fresh content on reload, fallback to offline cache
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .catch(() => {
                    return caches.match('/index.html') || caches.match(event.request);
                })
        );
        return;
    }

    // 3. Assets: Stale-While-Revalidate
    // Return cache instantly, update in background
    event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
            const fetchPromise = fetch(event.request).then((networkResponse) => {
                // Update cache if valid response
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseClone = networkResponse.clone();
                    caches.open(ASSETS_CACHE).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Network failed? No problem, we returned cache.
                // If no cache and no network, it fails (but handled by offline fallback if needed)
            });

            return cachedResponse || fetchPromise;
        })
    );
});
