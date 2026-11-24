/* ChronoBeats — cb_pantalla.js
 * Centro de control a pantalla completa (tele / tablet en horizontal).
 * En horizontal y con la partida en marcha:
 *   - 3 columnas que ocupan toda la pantalla: marcador | canción | cronologías
 *   - sin scroll: si una columna no cabe, se reduce de escala (zoom) hasta caber
 * En vertical se mantiene la disposición de siempre.
 * Se activa/desactiva solo; no toca la lógica del juego.
 */
(function () {
    'use strict';

    var CABECERA = 46; // alto reservado para el logo
    // tamaño de referencia: la disposición se diseña para 1280×720 y se escala a la pantalla real
    var BASE_W = 1280, BASE_H = 720;

    var css = [
        'body.cb-tv{padding:0 !important;height:100vh;overflow:hidden !important}',
        'body.cb-tv .logo{font-size:1.45em !important;margin:0 !important;height:' + CABECERA + 'px;line-height:' + CABECERA + 'px}',
        'body.cb-tv .btn-hub{top:6px !important;left:8px !important;width:36px !important;height:36px !important;font-size:.8em !important}',
        '#cb-pantalla-completa{display:none;position:fixed;top:6px;left:52px;z-index:10000;width:36px;height:36px;border-radius:50%;' +
            'background:rgba(42,26,94,.85);color:#fff;border:2px solid var(--neon,#00f2ff);line-height:0;cursor:pointer;padding:0}',
        'body.cb-tv #cb-pantalla-completa{display:block}',
        'body.cb-tv #live-room-code{top:5px !important;right:8px !important;padding:5px 10px !important;font-size:1em !important}',

        // rejilla de 3 columnas a pantalla completa
        'body.cb-tv #dashboard{max-width:none !important;margin:0 !important;box-sizing:border-box;' +
            'padding:0 10px 10px;' +
            'grid-template-columns:22% minmax(0,1fr) 30% !important;gap:10px !important;align-items:stretch}',
        'body.cb-tv #dashboard > *{min-height:0;min-width:0;box-sizing:border-box}',

        // columna 1: turno + marcador; el historial se lleva el hueco que sobre
        'body.cb-tv .sidebar{max-height:none !important;overflow:hidden !important;display:flex;flex-direction:column;padding:10px !important}',
        'body.cb-tv .sidebar > div[style*="text-align:center"]{margin-bottom:6px !important}',
        'body.cb-tv #event-log{flex:1 1 auto;max-height:none !important;min-height:30px;margin-top:6px !important}',
        'body.cb-tv #leaderboard-list.two-cols{display:block !important}',
        'body.cb-tv .leader-wrap{margin-bottom:5px}',
        'body.cb-tv .leader-item{margin-bottom:0 !important;padding:5px 8px !important}',
        'body.cb-tv .leader-item > div:first-child{margin-right:8px !important}',
        'body.cb-tv .leader-item > div:first-child > img,' +
            'body.cb-tv .leader-item > div:first-child > div:not(.wanted-poster){width:38px !important;height:38px !important;font-size:1.1em !important}',
        'body.cb-tv .leader-item .wanted-poster{display:none !important}',
        'body.cb-tv .leader-item .neon-chip{width:8px !important;height:8px !important;margin-right:2px}',
        'body.cb-tv .progress-bar-wrap{margin:2px 0 0 !important}',

        // columna 2: canción; el contador de tiempo va arriba a la derecha de la tarjeta
        'body.cb-tv .main-content{overflow:hidden;display:flex;flex-direction:column}',
        'body.cb-tv .validation-area{position:relative;flex:1 1 auto;padding:10px !important;gap:8px !important;justify-content:flex-start}',
        'body.cb-tv #countdown-ring{position:absolute !important;top:22px;right:22px;margin:0 !important;z-index:5}',
        'body.cb-tv .val-card{padding:12px !important}',
        'body.cb-tv #host-instructions{margin:0 !important}',

        // columna 3: cronologías de todos, compactas
        'body.cb-tv #global-timelines{margin:0 !important;overflow:hidden;align-content:start;gap:6px !important}',
        'body.cb-tv #global-timelines .player-row{padding:6px 10px !important}',
        'body.cb-tv #global-timelines .slots{flex-wrap:wrap;overflow:visible;gap:4px}',
        'body.cb-tv #global-timelines .slot{min-width:42px}',
        'body.cb-tv #global-timelines .slot:not(.filled){min-width:10px;width:10px;padding:0 !important;opacity:.6}',
        'body.cb-tv #global-timelines .slot .cb-repes{top:-7px;right:-7px;font-size:.75em;padding:2px 4px}'
    ].join('\n');

    var st = document.createElement('style');
    st.id = 'cb-pantalla-css';
    st.textContent = css;
    document.head.appendChild(st);

    function el(id) { return document.getElementById(id); }

    function enPartida() {
        var d = el('dashboard');
        return !!d && d.style.display === 'grid';
    }
    function horizontal() {
        return window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
    }

    // Las cronologías pasan a ser la 3ª columna en horizontal y vuelven debajo en vertical
    function colocarCronologias(tv) {
        var d = el('dashboard'), g = el('global-timelines');
        if (!d || !g) return;
        if (tv && g.parentNode !== d) d.appendChild(g);
        else if (!tv && g.parentNode === d) d.parentNode.insertBefore(g, d.nextSibling);
    }

    // Reduce la escala de una columna lo justo para que quepa sin scroll
    function encajar(col) {
        if (!col) return;
        var antes = col.style.zoom;
        col.style.zoom = '';
        var cabe = col.clientHeight, necesita = col.scrollHeight;
        var z = '';
        if (cabe > 0 && necesita > cabe + 1) z = String(Math.max(0.45, Math.floor(cabe / necesita * 1000) / 1000));
        col.style.zoom = z;
        if (z !== antes) col.setAttribute('data-cb-zoom', z || '1');
    }

    var activo = false;
    function ajustar() {
        var tv = enPartida() && horizontal();
        if (tv !== activo) {
            activo = tv;
            document.body.classList.toggle('cb-tv', tv);
            colocarCronologias(tv);
            if (!tv) {
                ['.sidebar', '.main-content', '#global-timelines'].forEach(function (s) {
                    var c = document.querySelector(s); if (c) c.style.zoom = '';
                });
                var d0 = el('dashboard');
                if (d0) { d0.style.zoom = ''; d0.style.height = ''; }
            }
        }
        if (!tv) return;
        // escala general según el tamaño de la pantalla (más grande en una tele de 1080p/4K)
        var d = el('dashboard');
        var s = Math.min(window.innerWidth / BASE_W, (window.innerHeight - CABECERA) / (BASE_H - CABECERA));
        s = Math.max(0.6, Math.min(3, Math.floor(s * 100) / 100));
        var zs = s === 1 ? '' : String(s), hs = Math.floor((window.innerHeight - CABECERA) / s) + 'px';
        // escribir solo si cambia: el observador del panel vigila su atributo style
        if (d.style.zoom !== zs) d.style.zoom = zs;
        if (d.style.height !== hs) d.style.height = hs;
        encajar(document.querySelector('#dashboard .sidebar'));
        encajar(document.querySelector('#dashboard .main-content'));
        encajar(el('global-timelines'));
    }

    var pendiente = null;
    function pronto() {
        if (pendiente) return;
        pendiente = setTimeout(function () { pendiente = null; ajustar(); }, 120);
    }

    window.addEventListener('resize', pronto);
    window.addEventListener('orientationchange', pronto);

    // botón de pantalla completa (los navegadores de las teles suelen tener barras que restan alto)
    function botonPantallaCompleta() {
        var de = document.documentElement;
        var pedir = de.requestFullscreen || de.webkitRequestFullscreen;
        if (!pedir || document.getElementById('cb-pantalla-completa')) return;
        var b = document.createElement('button');
        b.id = 'cb-pantalla-completa';
        b.type = 'button';
        b.title = 'Pantalla completa';
        b.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" style="display:block;margin:auto">' +
            '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
        b.addEventListener('click', function () {
            var dentro = document.fullscreenElement || document.webkitFullscreenElement;
            try {
                if (dentro) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
                else pedir.call(de);
            } catch (e) {}
        });
        document.body.appendChild(b);
    }

    function iniciar() {
        botonPantallaCompleta();
        var d = el('dashboard');
        if (d && window.MutationObserver) {
            // cambios de contenido (jugadores, cartas, botones que aparecen) y el display del panel
            new MutationObserver(pronto).observe(d, { childList: true, subtree: true, characterData: true });
            new MutationObserver(pronto).observe(d, { attributes: true, attributeFilter: ['style'] });
            var vc = el('val-card-ui');
            if (vc) new MutationObserver(pronto).observe(vc, { attributes: true, subtree: true, attributeFilter: ['style', 'class'] });
        }
        // red de seguridad por si algo cambia de tamaño sin tocar el DOM (fuentes, imágenes)
        setInterval(ajustar, 1500);
        ajustar();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();

    window.cbAjustarPantalla = ajustar;
})();
