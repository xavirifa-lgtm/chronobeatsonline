/* ChronoBeats — gráficos (fondos, reversos de carta, escenas de evento, avatares, cartel y pantalla de ganador).
 *
 * Se carga después del juego y se engancha a sus funciones (applyTheme, addEvent, notifyVictim,
 * showSabotageReceived) sin cambiar su lógica: cada envoltorio llama siempre a la función original.
 * Si una imagen todavía no existe (hojas pendientes), simplemente no se muestra.
 */
(function () {
    'use strict';
    var DIR = 'img/';
    var ES_HOST = !!document.getElementById('winner-screen');
    var ES_PLAYER = !!document.getElementById('login-screen');

    // ---------- utilidades ----------
    var cacheOk = {};
    function existe(nombre, cb) {
        if (nombre in cacheOk) { cb(cacheOk[nombre]); return; }
        var im = new Image();
        im.onload = function () { cacheOk[nombre] = true; cb(true); };
        im.onerror = function () { cacheOk[nombre] = false; cb(false); };
        im.src = DIR + nombre + '.webp';
    }
    function primeraQueExista(nombres, cb) {
        var i = 0;
        (function sig() {
            if (i >= nombres.length) { cb(null); return; }
            var n = nombres[i++];
            existe(n, function (ok) { if (ok) cb(n); else sig(); });
        })();
    }
    function envolver(nombreFn, despues) {
        var orig = window[nombreFn];
        if (typeof orig !== 'function') return false;
        window[nombreFn] = function () {
            var r = orig.apply(this, arguments);
            try { despues.apply(this, arguments); } catch (e) { console.warn('[cb_graficos]', nombreFn, e); }
            return r;
        };
        return true;
    }
    function css(texto) {
        var s = document.createElement('style');
        s.textContent = texto;
        document.head.appendChild(s);
    }
    var TIPOS = { orig: 'original', anime: 'anime', movies: 'pelis', videojuegos: 'videojuegos', mix: 'mix' };

    // ---------- fondo de pantalla (tablet y móvil) ----------
    css(
        'body::before{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;' +
        'background:linear-gradient(rgba(5,5,14,.55),rgba(5,5,14,.85)),var(--cb-fondo,none) center/cover no-repeat;' +
        'opacity:var(--cb-fondo-op,.0);transition:opacity .8s ease}'
    );
    var fondoActual = null;
    function ponerFondo(tipo) {
        var ed = TIPOS[tipo] || 'mix';
        var lista = ES_HOST
            ? ['fondo_host_' + ed, 'fondo_host_original']
            : ['fondo_movil_' + ed, 'fondo_movil_mix', 'fondo_host_' + ed, 'fondo_host_original'];
        primeraQueExista(lista, function (n) {
            if (!n || n === fondoActual) return;
            fondoActual = n;
            var root = document.documentElement.style;
            root.setProperty('--cb-fondo', 'url(' + DIR + n + '.webp)');
            root.setProperty('--cb-fondo-op', ES_HOST ? '.55' : '.35');
        });
    }

    // ---------- escenas de evento ----------
    // [texto que aparece en el juego (regex), imagen]
    var ESCENAS = [
        [/rebot[oó] el sabotaje|ESCUDO .*REBOT/i, 'ev_escudo'],
        [/RESISTI[OÓ] el robo/i, 'ev_resistencia'],
        [/rob[oó] la racha/i, 'ev_racha_robada'],
        [/rob[oó] carta|ROBO INTELIGENTE/i, 'ev_robo_inteligente'],
        [/robar turno|ROB[OÓ] EL TURNO|ROBAR TURNO/i, 'ev_robo_turno'],
        [/AGUJERO NEGRO/i, 'ev_agujero_negro'],
        [/MUTE|MUTEAR/i, 'ev_mute'],
        [/P[AÁ]NICO/i, 'ev_panico'],
        [/NIEBLA|ocult[oó] la cronolog/i, 'ev_niebla'],
        [/RULETA/i, 'ev_ruleta'],
        [/retó a|DUELO A MUERTE/i, 'ev_duelo'],
        [/CAMBIAR LA CANCI[OÓ]N|SALT[OÓ] TU CANCI|FORZAR SALTO/i, 'ev_salto'],
        [/TIEMPO AGOTADO/i, 'ev_tiempo'],
        [/llega a 10|DESAF[IÍ]O DEL REY/i, 'ev_rey'],
        [/EXPLOT[OÓ] LA BOMBA|CARTA BOMBA/i, 'ev_carta_bomba'],
        [/Rel[aá]mpago activado/i, 'ev_relampago'],
        [/ELIMINADO/i, 'ev_eliminado'],
        [/activa DOBLE O NADA/i, 'ev_doble_nada'],
        [/FAROLEA\b/i, 'ev_farolero'],
        [/CAMINO DEL GUERRERO/i, 'ev_guerrero'],
        [/maldici[oó]n silenciosa|JINX COLECTIVO/i, 'ev_maldicion'],
        [/¡TODOS JUEGAN!.*EL PRIMERO/i, 'ev_todos_juegan']
    ];
    function escenaPara(texto) {
        for (var i = 0; i < ESCENAS.length; i++) if (ESCENAS[i][0].test(texto)) return ESCENAS[i][1];
        return null;
    }
    css(
        '#cb-escena{position:fixed;left:50%;top:50%;z-index:9500;pointer-events:none;opacity:0;' +
        'transform:translate(-50%,-50%) scale(.85);transition:opacity .35s ease,transform .35s ease}' +
        '#cb-escena.on{opacity:1;transform:translate(-50%,-50%) scale(1)}' +
        '#cb-escena img{display:block;width:min(62vw,620px);max-height:62vh;object-fit:contain;' +
        'border-radius:22px;box-shadow:0 0 0 4px var(--neon,#00f2ff),0 20px 60px rgba(0,0,0,.8)}' +
        '@media (max-width:600px){#cb-escena img{width:86vw}}'
    );
    var ultimaEscena = {}, colaTimer = null;
    function mostrarEscena(nombre, ms) {
        if (!nombre) return;
        var ahora = Date.now();
        if (ultimaEscena[nombre] && ahora - ultimaEscena[nombre] < 5000) return; // no repetir la misma seguida
        var ws = document.getElementById('winner-screen');
        if (ws && ws.style.display && ws.style.display !== 'none') return;
        existe(nombre, function (ok) {
            if (!ok) return;
            ultimaEscena[nombre] = Date.now();
            var box = document.getElementById('cb-escena');
            if (!box) { box = document.createElement('div'); box.id = 'cb-escena'; box.innerHTML = '<img alt="">'; document.body.appendChild(box); }
            box.firstChild.src = DIR + nombre + '.webp';
            box.classList.add('on');
            clearTimeout(colaTimer);
            colaTimer = setTimeout(function () { box.classList.remove('on'); }, ms || 2600);
        });
    }
    function textoPlano(html) { var d = document.createElement('div'); d.innerHTML = html; return d.textContent || ''; }

    // ---------- HOST ----------
    function iniciarHost() {
        ponerFondo('mix');
        envolver('applyTheme', function (type) { ponerFondo(type); });
        envolver('addEvent', function (html) { mostrarEscena(escenaPara(textoPlano(String(html || '')))); });
        envolver('notifyVictim', function (victimId, atacante, sabotaje) { mostrarEscena(escenaPara(String(sabotaje || ''))); });
        var ws = document.getElementById('winner-screen');
        if (ws) new MutationObserver(function () {
            if (ws.style.display && ws.style.display !== 'none') { var b = document.getElementById('cb-escena'); if (b) b.classList.remove('on'); }
        }).observe(ws, { attributes: true, attributeFilter: ['style'] });
        var hi = document.getElementById('host-instructions');
        if (hi) new MutationObserver(function () {
            var t = hi.textContent || '';
            if (/TIEMPO AGOTADO|DUELO A MUERTE|CAMBIAR LA CANCI/i.test(t)) mostrarEscena(escenaPara(t));
        }).observe(hi, { childList: true, subtree: true, characterData: true });

        css(
            // cartel SE BUSCA del líder
            '.wanted-poster{background:url(' + DIR + 'x_wanted.webp) center/100% 100% no-repeat !important;' +
            'border:none !important;box-shadow:none !important;filter:drop-shadow(2px 3px 4px rgba(0,0,0,.6))}' +
            '.wanted-poster::after{display:none}' +
            '.wanted-img-placeholder{border:2px solid #5d4037}' +
            // pantalla de ganador
            '#winner-screen{background:linear-gradient(rgba(5,5,16,.80),rgba(5,5,16,.93)),url(' + DIR + 'ev_victoria.webp) center/cover no-repeat !important}' +
            // reversos en las mini-cartas del host (si las hay)
            '.cb-ico{filter:drop-shadow(0 1px 1px rgba(0,0,0,.5))}'
        );
    }

    // ---------- PLAYER ----------
    var AVATARES = ['av_rockero', 'av_diva', 'av_metalero', 'av_abuela_walkman', 'av_rapero', 'av_punki',
        'av_ochentero', 'av_dj', 'av_otaku', 'av_gamer', 'av_cinefilo', 'av_flamenca', 'av_reggaetonero',
        'av_clasico', 'av_tito_karaoke', 'av_indie'];

    function ponerReverso(tipo) {
        var ed = TIPOS[tipo] || 'mix';
        primeraQueExista(['rv_' + ed, 'rv_mix'], function (n) {
            if (n) document.documentElement.style.setProperty('--cb-reverso', 'url(' + DIR + n + '.webp)');
        });
    }

    function elegirAvatar(nombre) {
        var url = new URL(DIR + nombre + '.webp', location.href).href;
        window.playerAvatarDataUrl = url;
        try { localStorage.setItem('cb_player_avatar', url); } catch (e) {}
        var pv = document.getElementById('avatar-preview'), ph = document.getElementById('avatar-placeholder');
        if (pv) { pv.src = url; pv.style.display = 'block'; }
        if (ph) ph.style.display = 'none';
        var sel = document.querySelectorAll('#cb-avatares img');
        for (var i = 0; i < sel.length; i++) sel[i].classList.toggle('sel', sel[i].getAttribute('data-av') === nombre);
        try {
            var c = window.conn;
            if (c && c.open) c.send({ type: 'AVATAR_UPDATE', name: window.playerName, avatar: url });
        } catch (e) {}
    }

    function selectorAvatares() {
        var cont = document.getElementById('avatar-container');
        if (!cont || document.getElementById('cb-avatares')) return;
        var caja = document.createElement('div');
        caja.id = 'cb-avatares-caja';
        caja.innerHTML = '<div class="cb-av-tit">O ELIGE UN PERSONAJE</div><div id="cb-avatares"></div>';
        cont.parentNode.insertBefore(caja, cont.nextSibling);
        var grid = caja.querySelector('#cb-avatares');
        var guardado = '';
        try { guardado = localStorage.getItem('cb_player_avatar') || ''; } catch (e) {}
        AVATARES.forEach(function (n) {
            existe(n, function (ok) {
                if (!ok) return;
                var im = document.createElement('img');
                im.src = DIR + n + '.webp';
                im.alt = '';
                im.setAttribute('data-av', n);
                if (guardado.indexOf('/' + n + '.webp') !== -1) im.className = 'sel';
                im.onclick = function () { elegirAvatar(n); };
                grid.appendChild(im);
            });
        });
    }

    function iniciarPlayer() {
        ponerFondo('mix');
        ponerReverso('mix');
        envolver('applyTheme', function (type) { ponerFondo(type); ponerReverso(type); });
        envolver('showSabotageReceived', function (atacante, sabotaje) { mostrarEscena(escenaPara(String(sabotaje || '')), 2200); });
        selectorAvatares();
        css(
            // reverso de la carta central
            '.card-front{background:#111 var(--cb-reverso,none) center/cover no-repeat !important;' +
            'justify-content:flex-end !important;padding-bottom:12px !important}' +
            '.card-front > div:first-child{display:none !important}' +
            '#card-mode-label{opacity:1 !important;color:#fff !important;text-shadow:0 0 6px #000,0 0 10px var(--neon)}' +
            // selector de avatares
            '#cb-avatares-caja{width:100%;max-width:300px;margin:-4px auto 14px}' +
            '.cb-av-tit{font-family:Bungee,sans-serif;font-size:.62em;color:var(--neon);text-align:center;margin-bottom:6px;letter-spacing:1px}' +
            '#cb-avatares{display:flex;gap:8px;overflow-x:auto;padding:4px 2px 8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}' +
            '#cb-avatares img{width:56px;height:56px;flex:0 0 56px;border-radius:50%;cursor:pointer;scroll-snap-align:start;' +
            'border:2px solid transparent;transition:transform .15s,border-color .15s}' +
            '#cb-avatares img.sel{border-color:var(--neon);transform:scale(1.08);box-shadow:0 0 12px var(--neon)}' +
            // iconos más grandes donde son protagonistas
            '.tab-btn .cb-ico{height:1.9em;vertical-align:middle}' +
            '.reaction-btn .cb-ico,.emoji-wildcard-btn .cb-ico{height:1.7em}' +
            '#distraction-overlay .cb-ico{height:1.1em}'
        );
    }

    function iniciar() {
        if (ES_HOST) iniciarHost();
        else if (ES_PLAYER) iniciarPlayer();
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
