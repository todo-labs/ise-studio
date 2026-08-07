const CACHE_NAME = "ise-studio-shell-v3";
const APP_SHELL = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/manifest.webmanifest",
  "/static/wasm/openscad.js",
  "/static/wasm/openscad.wasm",
  "/static/openscad-libs/BOSL-master.zip",
  "/static/openscad-libs/BOSL2-master.zip",
  "/static/openscad-libs/MCAD-master.zip",
  "/static/openscad-libs/NopSCADlib-master.zip",
  "/static/openscad-libs/funcutils-master.zip",
  "/static/openscad-libs/openscad-master.zip",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(event.request).then(
      (cached) =>
        cached ||
        fetch(event.request)
          .then((response) => {
            if (
              response.ok &&
              (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/static/"))
            ) {
              const copy = response.clone();
              void caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
            }
            return response;
          })
          .catch(() => caches.match("/index.html")),
    ),
  );
});
