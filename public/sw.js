// Service worker: permite abrir el juego sin internet.
// - La página (index.html) se pide primero a la red, para recibir las versiones nuevas.
// - El resto (JS, CSS, iconos) se sirve desde la caché y se guarda la primera vez que se pide.
const CACHE = 'cafetal-v95';

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
  // El APK de Android (8 MB) se descarga de la red, sin guardarlo en la caché del juego.
  if (new URL(req.url).pathname.endsWith('.apk')) return;
  // La música se pide por trozos (Range): eso no se puede guardar en la caché, que lo sirva la red.
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
