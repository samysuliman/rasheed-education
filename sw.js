const CACHE_NAME = "rasheed-platform-v3";
const STATIC_FILES = [
  "./index.html",
  "./academy.html",
  "./manifest.webmanifest",
  "./assets/rasheed-academy-logo.png",
  "./assets/logos/rasheed-platform-mark.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_FILES)));
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML pages are always loaded from the network first and are never stored
  // in the application cache. This prevents an old blank registration page.
  if (event.request.mode === "navigate" || url.pathname.endsWith(".html")) {
    event.respondWith(fetch(event.request));
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cached =>
      cached || fetch(event.request)
    )
  );
});
