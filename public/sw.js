/*
 * Service worker Lokerku.
 * - Aset /_next/static/* (namanya berisi hash, tidak pernah berubah): cache dulu.
 * - Halaman: jaringan dulu, cache hanya cadangan saat offline. Data loker sendiri ada di IndexedDB, jadi tabel tetap terbuka.
 * - /api/* dan permintaan ke domain lain tidak disentuh.
 */
const CACHE = "lokerku-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
            return res;
          }),
      ),
    );
    return;
  }

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Simpan versi tanpa query (/app?url=… disimpan sebagai /app) untuk cadangan offline.
          if (res.ok) caches.open(CACHE).then((c) => c.put(url.pathname, res.clone()));
          return res;
        })
        .catch(async () => (await caches.match(url.pathname)) || (await caches.match("/app")) || Response.error()),
    );
  }
});
