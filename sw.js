const CACHE_NAME = "boussole-cache-v1";
const APP_SHELL = [
  "/",
  "index.html",
  "about.html",
  "partage.html",
  "style.css",
  "script.js",
  "partage.js",
  "manifest.json",
  "favicon.png",
  "icon-192.png",
  "icon-512.png",
  "ProjetsOh.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((noms) =>
      Promise.all(noms.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Les données en direct (Google Sheets via OpenSheet, formulaires
  // Google, polices) ne passent jamais par le cache — toujours le
  // réseau, sinon un utilisateur verrait des spectacles périmés.
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // Squelette du site : réseau en priorité (toujours la version la
  // plus récente en ligne), retombe sur le cache seulement hors ligne.
  event.respondWith(
    fetch(event.request)
      .then((reponse) => {
        const copie = reponse.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copie));
        return reponse;
      })
      .catch(() => caches.match(event.request))
  );
});
