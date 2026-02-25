const CACHE_NAME = 'chronobeats-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/play.html',
  '/digital/player_digital.html',
  '/digital/host_digital.html',
  '/digital/lista_final_anime.txt',
  '/digital/lista_final_pelis.txt'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
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
