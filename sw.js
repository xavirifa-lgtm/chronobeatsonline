/* Chronobeats Luxe Service Worker v157 */
const CACHE_NAME = 'chronobeats-luxe-v157';
const ASSETS = [
  './',
  './index.html',
  './host_digital.html',
  './host_digital_mix.html',
  './player_digital.html',
  './player_digital_mix.html',
  './player_digital_anime.html',
  './player_digital_pelis.html',
  './player_digital_videojuegos.html',
  './style.css',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(
    keys.map((k) => { if (k !== CACHE_NAME) return caches.delete(k); })
  )));
});

self.addEventListener('fetch', (e) => {
  e.respondWith(caches.match(e.request).then((res) => res || fetch(e.request)));
});
