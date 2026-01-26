#!/bin/bash
mkdir -p frontend/public/icons

# Create manifest.json
cat > frontend/public/manifest.json <<EOF
{
  "name": "World Class Aviation Inventory",
  "short_name": "WCA Inventory",
  "start_url": "/",
  "display": "standalone",
  "orientation": "any",
  "background_color": "#F8FAFC",
  "theme_color": "#3B82F6",
  "description": "Industrial Professional Hangar Management System",
  "icons": [
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-maskable-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "maskable"
    }
  ]
}
EOF

# Create Service Worker (sw.js)
cat > frontend/public/sw.js <<EOF
const CACHE_NAME = 'wca-inventory-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/index.css',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API Strategy: Network First
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Ideally we could cache API responses for offline reading here if needed
          return response;
        })
        .catch(() => {
          // Offline Fallback for API? 
          // For now, return a custom JSON or let it fail naturally.
          // Returning a custom offline JSON might be good.
          return new Response(JSON.stringify({ error: 'Offline mode' }), {
            headers: { 'Content-Type': 'application/json' }
          });
        })
    );
    return;
  }

  // Static Assets Strategy: Cache First, Network Fallback
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).catch(() => {
        // Offline Page Fallback for navigation requests
        if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
        }
      });
    })
  );
});
EOF
