const CACHE_NAME = 'cb-digital-v96';
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

// Instalar: precachear todos los assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activar inmediatamente sin esperar
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Activar: borrar cachés antiguas y reclamar clientes
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      clients.claim(), // Tomar control de todas las pestañas abiertas
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Borrando caché antigua:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    ])
  );
  // Avisar a todas las páginas para que se recarguen
  self.clients.matchAll({ includeUncontrolled: true }).then((clientList) => {
    clientList.forEach((client) => {
      client.postMessage({ type: 'SW_UPDATED' });
    });
  });
});

// Fetch: Network-first → si falla, servir desde caché
self.addEventListener('fetch', (event) => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardar copia fresca en caché
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Sin red: servir desde caché
        return caches.match(event.request);
      })
  );
});
