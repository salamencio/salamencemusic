// Salamence music: permite usar la app sin conexión una vez instalada.
// Primero intenta la red (para recibir actualizaciones) y, si no hay, usa la copia guardada.
const CACHE = "salamence-music-v8";
const SHELL = ["./", "index.html", "app.js", "styles.css", "manifest.webmanifest", "assets/salamence.png", "assets/icon-192.png", "assets/icon-512.png", "assets/icon-maskable-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req, { cache: "no-cache" }).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then((r) => r || caches.match("index.html")))
  );
});
