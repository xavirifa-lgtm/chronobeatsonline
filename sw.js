// ── ChronoBeats Online — Service Worker v3 ──
const CACHE_NAME = 'chronobeats-v8';

// Recursos propios a pre-cachear en la instalación (pequeños, sin riesgo)
const PRECACHE_URLS = [
    './',
    './index.html',
    './manifest.json',
    './logo_cyberpunk.png',
    './icon-192.png',
    './icon-512.png'
];

// Librerías CDN a cachear en el primer uso (versiones fijas = seguras de cachear)
const CDN_LIBS = [
    'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js',
    'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.js',
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://unpkg.com/peerjs@1.5.2/dist/peerjs.min.js'
];

// Dominios que NUNCA se cachean (streaming de vídeo y señalización WebRTC)
const NEVER_CACHE = [
    'youtube.com',
    'youtu.be',
    'googlevideo.com',
    'peerjs.com',       // servidor de señalización PeerJS
    'metered.ca',       // servidores TURN
    'iframe_api'        // API de YouTube (dinámica)
];

// ── INSTALACIÓN ──
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // Pre-cachear recursos propios uno a uno (errores individuales no bloquean)
            return Promise.all(
                PRECACHE_URLS.map(url =>
                    cache.add(url).catch(err =>
                        console.warn('[SW] No se pudo pre-cachear:', url, err)
                    )
                )
            );
        })
    );
});

// ── ACTIVACIÓN: borrar cachés antiguas ──
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME)
                    .map(key => {
                        console.log('[SW] Eliminando caché antigua:', key);
                        return caches.delete(key);
                    })
            ))
            .then(() => self.clients.claim())
    );
});

// ── FETCH ──
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;

    const url = event.request.url;

    // Nunca interceptar streaming de vídeo ni señalización
    if (NEVER_CACHE.some(pattern => url.includes(pattern))) return;

    // Librerías CDN con versión fija → cache-first
    // (si están en caché, servir directamente sin tocar la red)
    if (CDN_LIBS.some(lib => url === lib) ||
        url.includes('cdn.jsdelivr.net') ||
        url.includes('unpkg.com')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                // Primera visita: descargar y guardar
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(event.request, response.clone())
                        );
                    }
                    return response;
                }).catch(() => cached); // sin red y sin caché: nada
            })
        );
        return;
    }

    // Google Fonts → cache-first
    if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        event.respondWith(
            caches.match(event.request).then(cached => {
                if (cached) return cached;
                return fetch(event.request).then(response => {
                    if (response && response.status === 200) {
                        caches.open(CACHE_NAME).then(cache =>
                            cache.put(event.request, response.clone())
                        );
                    }
                    return response;
                }).catch(() => cached);
            })
        );
        return;
    }

    // Recursos propios (HTML, imágenes, etc.) → network-first con fallback a caché
    // Así siempre se sirve la versión más reciente si hay red
    event.respondWith(
        fetch(event.request)
            .then(response => {
                if (response && response.status === 200) {
                    caches.open(CACHE_NAME).then(cache =>
                        cache.put(event.request, response.clone())
                    );
                }
                return response;
            })
            .catch(() =>
                caches.match(event.request).then(cached =>
                    cached || caches.match('./index.html')
                )
            )
    );
});
