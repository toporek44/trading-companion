// Deliberately does NOT cache or intercept anything — registering a service
// worker is what most browsers require for "installable" PWA criteria
// (add-to-home-screen, standalone window), but this app's whole value is
// live data (60s auto-refreshing scanner, Telegram alerts) that must never
// be served stale from a cache. A future offline-shell feature could add
// real caching here, but only for genuinely static assets (styles.css,
// icon.svg) — never for /api/* responses.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
