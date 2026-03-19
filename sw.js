const CACHE_NAME = 'cb-digital-v83';
const ASSETS = [
  './',
  './index.html',
  './indexchrono.html',
  './indexchronoanime.html',
  './indexchronomovies.html',
  './indexchronomix.html',
  './player_digital.html',
  './host_digital.html',
  './player_digital_anime.html',
  './host_digital_anime.html',
  './player_digital_peliculas.html',
  './host_digital_peliculas.html',
  './player_digital_mix.html',
  './host_digital_mix.html',
  './lista_final.txt',
  './lista_final_anime.txt',
  './lista_final_pelis.txt',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request);
    })
  );
});
