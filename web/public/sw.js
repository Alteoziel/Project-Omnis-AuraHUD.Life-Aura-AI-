/* AuraHUD service worker — static shell, no boot-loop replace. */
const VERSION = "s0-v1";
const STATIC_CACHE = `aura-static-${VERSION}`;
const PAGE_CACHE = `aura-pages-${VERSION}`;

const PRECACHE = [
  "/offline.html",
  "/manifest.webmanifest",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter(
            (key) =>
              (key.startsWith("aura-") || key.startsWith("alte-")) &&
              key !== STATIC_CACHE &&
              key !== PAGE_CACHE,
          )
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

function isSameOrigin(url) {
  return url.origin === self.location.origin;
}

function isStaticAsset(url) {
  const path = url.pathname;
  return (
    path.startsWith("/_next/static/") ||
    path.startsWith("/icons/") ||
    path === "/sw.js" ||
    path === "/offline.html"
  );
}

async function networkFirstPage(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offline = await caches.match("/offline.html");
    return (
      offline ||
      new Response("Offline", {
        status: 503,
        headers: { "Content-Type": "text/plain" },
      })
    );
  }
}

async function cacheFirstStatic(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response && response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (!isSameOrigin(url)) return;
  if (url.pathname === "/sw.js") {
    event.respondWith(fetch(request));
    return;
  }
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStatic(request));
    return;
  }
  if (request.mode === "navigate") {
    event.respondWith(networkFirstPage(request));
  }
});
