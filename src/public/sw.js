// Minimal service worker: installs and activates but does not cache resources.
self.addEventListener('install', (event) => {
    // Make service worker take control as soon as possible
    self.skipWaiting();
    console.log('[sw] installed');
});

self.addEventListener('activate', (event) => {
    event.waitUntil((async () => {
        // Claim clients so the SW is active immediately
        await self.clients.claim();
        console.log('[sw] activated');
    })());
});

// Intentionally do not implement any caching strategy — just pass through.
self.addEventListener('fetch', (event) => {
    // We could inspect requests here, but we won't intercept them to avoid caching.
});
