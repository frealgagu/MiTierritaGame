// Service worker: allows opening the game offline.
// - The page (index.html) is fetched from the network first so new versions arrive immediately.
// - Everything else (JS, CSS, icons) is served from cache and cached on first request.
const CACHE = 'mitierrita-v177';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  // Android APK and AAB (8 MB) are downloaded from the network without storing them in the game cache; same
  // for downloadable music and sound effects (v3.71, ./musica/).
  if (new URL(req.url).pathname.match(/\.(apk|aab|mp3|mid|zip)$/)) return;
  // Audio files use byte-range requests (Range), which cannot be cached cleanly, so let the network serve them.
  if (req.headers.has('range')) return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit ?? caches.match('./'))),
    );
    return;
  }

  event.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ??
        fetch(req).then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});
