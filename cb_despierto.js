/* ChronoBeats — mantiene la pantalla encendida mientras el juego esté abierto
 * (index, tablet y móvil, en cualquier pantalla: lobby, partida, ganador...).
 * Usa la Screen Wake Lock API y la vuelve a pedir si el sistema la suelta
 * (al volver de segundo plano, al girar la pantalla, etc.) y con cada toque.
 * Requiere HTTPS (GitHub Pages lo es). En navegadores sin soporte no hace nada.
 */
(function () {
    'use strict';
    if (!('wakeLock' in navigator)) { console.warn('[cb_despierto] Wake Lock no soportado en este navegador'); return; }
    var lock = null, pidiendo = false;
    function pedir() {
        if (lock || pidiendo || document.visibilityState !== 'visible') return;
        pidiendo = true;
        navigator.wakeLock.request('screen').then(function (l) {
            lock = l; pidiendo = false;
            l.addEventListener('release', function () { lock = null; setTimeout(pedir, 500); });
        }).catch(function (e) { pidiendo = false; console.warn('[cb_despierto]', e.name, e.message); });
    }
    document.addEventListener('visibilitychange', pedir);
    ['pointerdown', 'touchstart', 'keydown', 'click'].forEach(function (ev) { document.addEventListener(ev, pedir, { passive: true, capture: true }); });
    window.addEventListener('focus', pedir);
    setInterval(pedir, 20000);
    pedir();
})();
