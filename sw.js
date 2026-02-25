const CACHE_NAME = 'chronobeats-v3';
const ASSETS = [
  './',
  './index.html',
  './player_digital.html',
  './host_digital.html',
  './player_digital_anime.html',
  './host_digital_anime.html',
  './player_digital_peliculas.html',
  './host_digital_peliculas.html',
  './lista_final_anime.txt',
  './lista_final_pelis.txt',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (event) => {
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
