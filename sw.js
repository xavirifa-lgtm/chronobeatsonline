// ── ChronoBeats Online — Service Worker v3 ──
// Actualizado para archivos más grandes. Estrategia: network-first con fallback a caché.

const CACHE_NAME = 'chronobeats-v3';

// Archivos a cachear en la instalación
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png',
    './logo_cyberpunk.png'
    // Los HTML del juego (host/player) se cachean dinámicamente en el primer acceso,
    // no en la instalación, para evitar fallos por archivos grandes.
];

// ── INSTALACIÓN: cachear assets esenciales ──
self.addEventListener('install', event => {
    self.skipWaiting(); // activar inmediatamente sin esperar a que se cierren pestañas

    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Cachear uno a uno con manejo de errores individual
            return Promise.all(
                PRECACHE_URLS.map(url =>
                    cache.add(url).catch(err => {
                        console.warn('[SW] No se pudo cachear:', url, err);
                    })
                )
            );
        })
    );
});

// ── ACTIVACIÓN: limpiar cachés antiguas ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Limpiando caché antigua:', key);
                        return caches.delete(key);
                    })
            )
        ).then(() => self.clients.claim()) // tomar control de todas las pestañas abiertas
    );
});

// ── FETCH: network-first con fallback a caché ──
self.addEventListener('fetch', event => {
    // Solo interceptar peticiones GET del mismo origen
    if (event.request.method !== 'GET') return;

    const url = new URL(event.request.url);

    // No interceptar peticiones a YouTube, PeerJS, Google Fonts ni APIs externas
    const externalHosts = ['youtube.com', 'youtu.be', 'peerjs.com', 'fonts.googleapis.com',
                           'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'metered.ca'];
    if (externalHosts.some(h => url.hostname.includes(h))) return;

    event.respondWith(
        // Intentar red primero
        fetch(event.request)
            .then(response => {
                // Si la respuesta es válida, guardarla en caché
                if (response && response.status === 200) {
                    const clone = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, clone);
                    });
                }
                return response;
            })
            .catch(() => {
                // Sin red → usar caché
                return caches.match(event.request).then(cached => {
                    if (cached) return cached;
                    // Sin caché → devolver index.html como fallback
                    return caches.match('./index.html');
                });
            })
    );
});
