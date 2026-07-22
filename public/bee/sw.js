// Busy Bee service worker — offline-first app shell so the gym's dead zone doesn't matter.
//
// Strategy: stale-while-revalidate. We serve the cached copy immediately (so the
// app opens instantly and works with zero signal), but we ALSO re-fetch every
// asset in the background and refresh the cache when the network gives us a good
// response. This keeps offline use intact while letting the app self-heal: a
// stale or accidentally-cached-broken asset gets replaced on the next online open
// instead of being pinned forever (the old cache-first handler had no way to
// recover a bad cached copy). We never cache a non-OK or cross-origin response.
const CACHE = "busy-bee-v2";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./style.css",
  "./app.js",
  "./icon-192.png",
  "./icon-512.png",
  "./apple-touch-icon.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Only same-origin GETs that returned a real 200-ish body are safe to cache.
function isCacheable(res) {
  return res && res.ok && res.type === "basic";
}

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;

  e.respondWith(
    caches.open(CACHE).then((cache) =>
      cache.match(e.request, { ignoreSearch: true }).then((hit) => {
        const network = fetch(e.request)
          .then((res) => {
            if (isCacheable(res)) cache.put(e.request, res.clone());
            return res;
          })
          .catch(() => hit); // offline: fall back to whatever we have cached

        // Serve cache instantly when we have it; otherwise wait for the network.
        return hit || network;
      })
    )
  );
});
