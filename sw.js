/* Be Well Fit — service worker
   Bump CACHE here and the ?v= numbers in index.html whenever the app shell
   changes, so installed phones fetch the new files instead of old cached ones. */
const CACHE = "bewellfit-v8";
const SHELL = [
  "./",
  "./index.html",
  "./styles.css?v=8",
  "./app.js?v=8",
  "./data.js?v=8",
  "./manifest.webmanifest?v=8",
  "./fonts/montserrat-latin.woff2",
  "./fonts/nunito-latin.woff2",
  "./icons/bee.png",
  "./icons/favicon-32.png",
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./img/hero.webp"
];

async function precache() {
  const cache = await caches.open(CACHE);
  await Promise.all(SHELL.map(async (url) => {
    const response = await fetch(new Request(url, { cache: "reload" }));
    if (!response || !response.ok) throw new Error("Could not cache " + url);
    await cache.put(url, response);
  }));
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    precache().then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request, { cache: "no-cache" });
    if (response && response.ok) {
      try {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      } catch (err) {
        /* a full cache must not break the page */
      }
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (request.mode === "navigate") {
      const fallback = await caches.match("./index.html");
      if (fallback) return fallback;
    }
    return Response.error();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) {
    /* Show the cached copy now, refresh it quietly for next time. */
    fetch(request).then(async (response) => {
      if (response && response.ok) {
        try {
          const cache = await caches.open(CACHE);
          await cache.put(request, response);
        } catch (err) {
          /* ignore cache write errors */
        }
      }
    }).catch(() => {});
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response && response.ok) {
      try {
        const cache = await caches.open(CACHE);
        await cache.put(request, response.clone());
      } catch (err) {
        /* ignore cache write errors */
      }
    }
    return response;
  } catch (err) {
    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  const alwaysFresh = request.mode === "navigate" ||
    ["script", "style", "manifest"].indexOf(request.destination) !== -1;

  event.respondWith(alwaysFresh ? networkFirst(request) : cacheFirst(request));
});
