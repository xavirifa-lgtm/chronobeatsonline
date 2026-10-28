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


    // ---------- colores por edición (tema cartoon) ----------
    // acento = color vivo para fondos/rellenos; neon = versión oscura para texto y bordes sobre papel
    var COLORES = {
        orig: ['#3BB4E5', '#0369A1'], anime: ['#FF5FA2', '#BE185D'], movies: ['#FFB020', '#B45309'],
        videojuegos: ['#A78BFA', '#6D28D9'], mix: ['#4ADE80', '#15803D']
    };
    function ponerColores(tipo) {
        var c = COLORES[tipo] || COLORES.mix, r = document.documentElement.style;
        r.setProperty('--cb-acento', c[0]);
        // solo el tema claro (cb_tema.css) necesita el color oscurecido; el retro usa el neón original
        if (document.querySelector('link[href*="cb_tema.css"]')) r.setProperty('--neon', c[1], 'important');
    }
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
            document.body.classList.toggle('cb-fondo-movil', n.indexOf('fondo_movil') === 0);
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


    // ---------- vinilo que gira mientras suena ----------
    function vinilo(dentroDe, antesDe) {
        if (!dentroDe || dentroDe.querySelector('.cb-vinilo')) return;
        var v = document.createElement('img');
        v.className = 'cb-vinilo'; v.alt = ''; v.src = DIR + 'st_vinilo.webp';
        if (antesDe) dentroDe.insertBefore(v, antesDe); else dentroDe.appendChild(v);
    }
    function marcarSonando(on) { document.body.classList.toggle('cb-sonando', !!on); }

    // ================== MEJORAS "SALA RETRO" (tablet) ==================
    // 1) tocadiscos central con el año en la etiqueta
    function montarTocadiscos() {
        var card = document.getElementById('val-card-ui');
        var anio = document.getElementById('ui-card-year');
        if (!card || !anio || document.getElementById('cb-tocadiscos')) return;
        var td = document.createElement('div');
        td.id = 'cb-tocadiscos';
        td.innerHTML = '<div class="cb-td-plato"><img class="cb-td-disco" src="' + DIR + 'st_vinilo.webp" alt="">' +
            '<div class="cb-td-etiqueta"><span id="cb-td-anio">?</span></div></div><div class="cb-td-brazo"></div>';
        anio.parentNode.insertBefore(td, anio);
        var copia = function () {
            var t = (anio.textContent || '').trim();
            var el = document.getElementById('cb-td-anio');
            var revelado = /^\d{3,4}$/.test(t);
            el.textContent = revelado ? t : (t.indexOf('?') !== -1 || !t ? '?' : t);
            td.classList.toggle('revelado', revelado);
            el.classList.toggle('largo', !revelado && t.length > 4);
        };
        copia();
        new MutationObserver(copia).observe(anio, { childList: true, characterData: true, subtree: true });
    }

    // 2) el año vuela hasta la fila del jugador
    function filaDe(nombre) {
        var filas = document.querySelectorAll('#global-timelines .player-row');
        for (var i = 0; i < filas.length; i++) {
            var t = filas[i].firstElementChild ? filas[i].firstElementChild.textContent.trim() : '';
            if (t === nombre) return filas[i];
        }
        return null;
    }
    function volarCasete(anio, nombre) {
        var origen = document.getElementById('cb-tocadiscos') || document.getElementById('val-card-ui');
        var fila = filaDe(nombre);
        if (!origen || !fila || !origen.getBoundingClientRect) return;
        var destino = fila.querySelector('.slot:not(.filled)') || fila;
        var a = origen.getBoundingClientRect(), b = destino.getBoundingClientRect();
        var c = document.createElement('div');
        c.className = 'cb-casete-vuela';
        c.textContent = anio;
        document.body.appendChild(c);
        var x0 = a.left + a.width / 2, y0 = a.top + a.height / 2, x1 = b.left + b.width / 2, y1 = b.top + b.height / 2;
        c.style.left = x0 + 'px'; c.style.top = y0 + 'px';
        var anim = c.animate([
            { transform: 'translate(-50%,-50%) scale(2.2) rotate(0deg)', opacity: 0 },
            { transform: 'translate(-50%,-50%) scale(2.4) rotate(-6deg)', opacity: 1, offset: .18 },
            { transform: 'translate(calc(-50% + ' + (x1 - x0) * .5 + 'px), calc(-50% + ' + ((y1 - y0) * .5 - 120) + 'px)) scale(1.6) rotate(8deg)', opacity: 1, offset: .55 },
            { transform: 'translate(calc(-50% + ' + (x1 - x0) + 'px), calc(-50% + ' + (y1 - y0) + 'px)) scale(1) rotate(0deg)', opacity: 1 }
        ], { duration: 1300, easing: 'cubic-bezier(.45,.05,.35,1)', fill: 'forwards' });
        anim.onfinish = function () {
            c.remove();
            fila.classList.add('cb-recibe');
            setTimeout(function () { fila.classList.remove('cb-recibe'); }, 700);
        };
    }

    // 3) ecualizador
    function montarEcualizador() {
        if (document.getElementById('cb-eq')) return;
        var eq = document.createElement('div');
        eq.id = 'cb-eq';
        var n = 36, html = '';
        for (var i = 0; i < n; i++) {
            var d = (Math.random() * .9).toFixed(2), v = (0.55 + Math.random() * .7).toFixed(2);
            html += '<i style="animation-delay:-' + d + 's;animation-duration:' + v + 's"></i>';
        }
        eq.innerHTML = html;
        document.body.appendChild(eq);
    }

    // 4) luces que reaccionan al acierto / fallo
    var luzTimer = null;
    function destello(clase) {
        document.body.classList.remove('cb-acierto', 'cb-fallo');
        void document.body.offsetWidth;
        document.body.classList.add(clase);
        clearTimeout(luzTimer);
        luzTimer = setTimeout(function () { document.body.classList.remove(clase); }, 1600);
    }

    // 5) avatares grandes con color propio; cartel solo para líder único
    var COLORES_JUG = ['#FF5FA2', '#3BB4E5', '#FFC93C', '#4ADE80', '#A78BFA', '#FF8C42', '#22D3EE', '#F472B6'];
    function retocarMarcador() {
        var lista = document.getElementById('leaderboard-list');
        if (!lista) return;
        var carteles = lista.querySelectorAll('.wanted-poster');
        if (carteles.length > 1) for (var i = 0; i < carteles.length; i++) carteles[i].remove();
        var items = lista.querySelectorAll('.leader-item');
        for (var j = 0; j < items.length; j++) {
            var pid = items[j].getAttribute('data-pid') || '';
            var idx = (window.players || []).findIndex(function (p) { return p.id === pid; });
            items[j].style.setProperty('--cb-jug', COLORES_JUG[(idx < 0 ? j : idx) % COLORES_JUG.length]);
        }
    }

    // 6) lobby con vida: los que entran aparecen con rebote; la jukebox se enciende al empezar
    var vistos = {};
    function animarLobby() {
        var tags = document.querySelectorAll('#lobby-players .player-tag');
        for (var i = 0; i < tags.length; i++) {
            var nombre = (tags[i].textContent || '').trim();
            tags[i].style.setProperty('--cb-i', i);
            if (!vistos[nombre]) { vistos[nombre] = 1; tags[i].classList.add('cb-nuevo'); }
        }
    }

    // ---------- iconos en botones que no tienen emoji (PLAY, saltos, sabotajes, mercado...) ----------
    // [trozo del onclick, imágenes en orden de preferencia]
    var BOTONES = [
        ["send('PLAY')", ['ui_play']], ["send('PAUSE')", ['ui_pause']], ["send('STOP')", ['ui_stop']],
        ["SKIP',-", ['ui_atras']], ["SKIP',", ['ui_adelante']],
        ['SABOTAGE_MUTE', ['sb_mute']], ['SABOTAGE_BUZZER', ['sb_zumbido']], ['SABOTAGE_VETO', ['sb_veto']],
        ['SABOTAGE_FORCE_SKIP', ['sb_salto']], ['SABOTAGE_PANIC', ['sb_panico']], ['SABOTAGE_FOG', ['sb_niebla']],
        ['SABOTAGE_STEAL_TURN', ['sb_robar_turno']], ['SABOTAGE_BLACKHOLE', ['sb_agujero_negro']],
        ['SABOTAGE_RUSSIAN_ROULETTE', ['sb_ruleta']], ['SABOTAGE_DUEL', ['sb_duelo']],
        ['openSmartSteal', ['ap_robo_inteligente', 'sb_robar_ficha']], ['stealStreak', ['ap_robar_racha', 're_fuego']],
        ["MARKET_WILDCARD', 'artist'", ['ico_pista_artista']], ["MARKET_WILDCARD', 'song'", ['ap_comodin_cancion', 'ico_comodin']],
        ['MARKET_DECADE', ['ico_pista_decada']], ['MARKET_SHIELD', ['ico_escudo']],
        ['AUTO_WIN', ['ico_comprar_carta']], ['RELOAD_SONG', ['ico_cambiar_cancion']], ['SYSTEM_ERROR_TRACK', ['ico_video_roto']],
        ['BET_AGAINST_ACTIVE', ['ico_ni_de_cona']], ['BET_FOR_ACTIVE', ['ico_conmigo']],
        ['activateDoubleOrNothing', ['ap_doble_nada']], ['activateFailSafe', ['ap_seguro', 'ico_escudo']],
        ['activateBrag', ['ap_farolero', 'ico_comodin']], ['RESIST_STEAL', ['ap_resistir_robo', 'ico_escudo']]
    ];
    var TIENE_EMOJI = /[\u{1F000}-\u{1FAFF}☀-➿]/u;
    var EMOJI_TXT = /(?:[\u{1F000}-\u{1FAFF}]|[\u2600-\u27BF])\uFE0F?/gu;
    function decorarBoton(b) {
        if (!b || b.nodeType !== 1 || b.tagName !== 'BUTTON' || b.querySelector('.cb-bi')) return;
        var oc = b.getAttribute('onclick') || '';
        var regla = null;
        for (var i = 0; i < BOTONES.length; i++) if (oc.indexOf(BOTONES[i][0]) !== -1) { regla = BOTONES[i]; break; }
        if (!regla) return;
        primeraQueExista(regla[1], function (n) {
            if (!n || b.querySelector('.cb-bi')) return;
            // fuera los emojis del texto (y los iconos pequeños que cb_iconos ya hubiera puesto),
            // salvo la ficha del precio: la imagen grande ya dice qué es el botón
            b.querySelectorAll('.cb-ico').forEach(function (im) { if (!/ico_ficha|ico_comodin/.test(im.src)) im.remove(); });
            var w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, null), t, lista = [];
            while ((t = w.nextNode())) lista.push(t);
            lista.forEach(function (t) { var q = t.nodeValue.replace(EMOJI_TXT, function (m) { return /\uD83C\uDCCF|\u{1F0CF}/u.test(m) ? m : ''; }); if (q !== t.nodeValue) t.nodeValue = q; });
            // un 🃏 al principio del texto es decoración, no precio: fuera
            var pri = lista.filter(function (t) { return t.nodeValue.trim(); })[0];
            if (pri) pri.nodeValue = pri.nodeValue.replace(/^\s*\u{1F0CF}\uFE0F?\s*/u, '');
            var ico0 = b.querySelector('.cb-ico');
            if (ico0 && !(ico0.previousSibling && (ico0.previousSibling.textContent || '').trim())) ico0.remove();
            // texto (con su ficha de precio) en un solo bloque, debajo de la imagen
            var et = document.createElement('span'); et.className = 'cb-bt';
            while (b.firstChild) et.appendChild(b.firstChild);
            et.innerHTML = et.innerHTML.replace(/\s{2,}/g, ' ').trim();
            if (!b.title) b.title = (et.textContent || '').trim();
            var im = document.createElement('img');
            im.className = 'cb-bi'; im.alt = ''; im.src = DIR + n + '.webp';
            b.appendChild(im); b.appendChild(et);
            b.classList.add('cb-con-icono');
        });
    }
    function decorarTodo(raiz) {
        if (!raiz || !raiz.querySelectorAll) return;
        if (raiz.tagName === 'BUTTON') decorarBoton(raiz);
        raiz.querySelectorAll('button[onclick]').forEach(decorarBoton);
    }
    function vigilarBotones() {
        decorarTodo(document.body);
        new MutationObserver(function (muts) {
            muts.forEach(function (m) {
                if (m.type === 'childList') {
                    m.addedNodes.forEach(function (n) { if (n.nodeType === 1) decorarTodo(n); });
                    if (m.target && m.target.tagName === 'BUTTON') decorarBoton(m.target);
                }
            });
        }).observe(document.body, { childList: true, subtree: true });
    }

    // ---------- tocadiscos ilustrado (si existen td_base / td_vinilo / td_brazo) ----------
    function tocadiscosIlustrado() {
        ['td_base', 'td_vinilo', 'td_brazo'].forEach(function (n) {
            existe(n, function (ok) {
                if (!ok) return;
                document.documentElement.style.setProperty('--cb-' + n.replace('_', '-'), 'url(' + DIR + n + '.webp)');
                document.body.classList.add('con-' + n.replace('_', '-'));
                if (n === 'td_vinilo') { var d = document.querySelector('.cb-td-disco'); if (d) d.src = DIR + 'td_vinilo.webp'; }
            });
        });
    }

    // ---------- vidas de Supervivencia: vinilo con corazón ----------
    function vidasIlustradas() {
        var f = function (active) { return '<img class="cb-vida' + (active ? '' : ' perdida') + '" src="' + DIR + 'es_vida.webp" alt="">'; };
        existe('es_vida', function (ok) {
            if (!ok) return;
            if (typeof window.vinylSVG === 'function') window.vinylSVG = f;
            if (typeof window.vinylSVGSmall === 'function') window.vinylSVGSmall = f;
        });
    }

    // ---------- medallas de la pantalla de ganador ----------
    var PREMIOS = {
        'CANCION MAS DIFICIL': 'es_eliminado', 'MAS SABOTEADOR': 'pr_terrorista', 'MAS SABOTEADO': 'pr_objetivo',
        'MEJOR RACHA': 'pr_racha', 'MEJOR APOSTADOR': 'pr_tahur', 'EL OIDO DE PALO': 'x_carta_perdida',
        'EL GRAN TURISTA': 'rk_bronce', 'EL PALEONTOLOGO': 'pr_paleontologo', 'EL MONJE SHAOLIN': 'pr_pacifista',
        'EL INTOCABLE': 'pr_intocable', 'EL TERRORISTA': 'pr_terrorista', 'EL FAROLERO': 'pr_farolero',
        'LA RACHA': 'pr_racha', 'EL OBJETIVO': 'pr_objetivo', 'EL PACIFISTA': 'pr_pacifista',
        'EL TAHUR': 'pr_tahur', 'EL RAYO': 'pr_rayo'
    };
    function norm(t) { return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
    function medallasPremios() {
        document.querySelectorAll('.award-card').forEach(function (c) {
            if (c.classList.contains('cb-pr')) return;
            var t = c.querySelector('.award-title'), ic = c.querySelector('.award-icon');
            var n = t && PREMIOS[norm(t.textContent)];
            if (!n || !ic) return;
            c.classList.add('cb-pr');
            existe(n, function (ok) { if (ok) ic.innerHTML = '<img class="cb-medalla" src="' + DIR + n + '.webp" alt="">'; });
        });
    }

    // ---------- lobby: tarjetas de modo y de época ----------
    var MODOS = [['normal', 'md_clasico', 'CLÁSICO'], ['light', 'ap_robar_hueco', 'LIGHT'], ['rey', 'md_rey', 'REY'], ['supervivencia', 'md_supervivencia', 'SUPERVIVENCIA'], ['equipos', 'md_equipos', 'EQUIPOS']];
    var EPOCAS = [['all', null, 'TODAS'], ['pre80s', 'ep_pre80', '<80s'], ['80s', 'ep_80s', '80s'], ['90s', 'ep_90s', '90s'],
        ['2000s', 'ep_2000s', '2000s'], ['2010s', 'ep_2010s', '2010s'], ['2020s', 'ep_2020s', '2020s']];
    function tarjetas(sel, lista, clase) {
        if (!sel || document.querySelector('.' + clase)) return;
        var caja = document.createElement('div');
        caja.className = 'cb-tarjetas ' + clase;
        lista.forEach(function (m) {
            var b = document.createElement('button');
            b.type = 'button'; b.setAttribute('data-v', m[0]);
            b.innerHTML = (m[1] ? '<img src="' + DIR + m[1] + '.webp" alt="">' : '<span class="cb-todas">∞</span>') + '<span>' + m[2] + '</span>';
            b.onclick = function () {
                sel.value = m[0];
                sel.dispatchEvent(new Event('change', { bubbles: true }));
                marcar();
            };
            caja.appendChild(b);
        });
        sel.parentNode.insertBefore(caja, sel);
        function marcar() {
            caja.querySelectorAll('button[data-v]').forEach(function (b) { b.classList.toggle('sel', b.getAttribute('data-v') === sel.value); });
        }
        marcar();
        sel.addEventListener('change', marcar);
        setInterval(marcar, 700); // por si el modo se cambia desde el mando del móvil
    }
    function tarjetaCompetitivo() {
        var chk = document.getElementById('competitive-mode-check');
        if (!chk || document.getElementById('cb-competitivo')) return;
        var b = document.createElement('button');
        b.type = 'button'; b.id = 'cb-competitivo';
        b.innerHTML = '<img src="' + DIR + 'md_competitivo.webp" alt=""><span>COMPETITIVO</span>';
        b.onclick = function () { chk.checked = !chk.checked; chk.dispatchEvent(new Event('change', { bubbles: true })); pinta(); };
        function pinta() { b.classList.toggle('sel', chk.checked); }
        setInterval(pinta, 700);
        var cajaModos = document.querySelector('.cb-modos');
        if (cajaModos) cajaModos.appendChild(b);
        chk.addEventListener('change', pinta); pinta();
    }
    // ---------- HOST ----------
    function iniciarHost() {
        ponerFondo('mix'); ponerColores('mix');
        envolver('applyTheme', function (type) { ponerFondo(type); ponerColores(type); });
        envolver('addEvent', function (html) { mostrarEscena(escenaPara(textoPlano(String(html || '')))); });
        envolver('notifyVictim', function (victimId, atacante, sabotaje) { mostrarEscena(escenaPara(String(sabotaje || ''))); });
        var ws = document.getElementById('winner-screen');
        if (ws) new MutationObserver(function () {
            if (ws.style.display && ws.style.display !== 'none') { var b = document.getElementById('cb-escena'); if (b) b.classList.remove('on'); }
        }).observe(ws, { attributes: true, attributeFilter: ['style'] });

        // mejoras sala retro
        montarTocadiscos();
        vidasIlustradas();
        tarjetas(document.getElementById('game-mode-select'), MODOS, 'cb-modos');
        tarjetaCompetitivo();
        tarjetas(document.getElementById('decade-filter-select'), EPOCAS, 'cb-epocas');
        ['winner-awards-left', 'winner-awards-right'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el) new MutationObserver(medallasPremios).observe(el, { childList: true, subtree: true });
        });
        tocadiscosIlustrado();
        montarEcualizador();
        envolver('flyCard', function (anio, nombre) { volarCasete(anio, nombre); });
        envolver('validateResult', function (ok) { destello(ok ? 'cb-acierto' : 'cb-fallo'); });
        envolver('awardToChallenger', function () { destello('cb-acierto'); });
        envolver('updateUI', retocarMarcador);
        envolver('updateLobby', animarLobby);
        envolver('startGame', function () {
            document.body.classList.add('cb-empieza');
            setTimeout(function () { document.body.classList.remove('cb-empieza'); }, 2500);
        });
        setInterval(function () { marcarSonando(window.isPlaying); }, 400);
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
        'av_clasico', 'av_tito_karaoke', 'av_indie',
        'av_mascara_hockey', 'av_superheroe', 'av_fontanero', 'av_astronauta', 'av_rolero', 'av_agente', 'av_orejitas', 'av_exploradora',
        'av_mago', 'av_elfo', 'av_motero', 'av_payasa', 'av_minera', 'av_pistolero', 'av_aventurero', 'av_dragona',
        'av_espartano', 'av_velocista', 'av_luchadora', 'av_espadachin', 'av_entrenadora', 'av_cubos', 'av_gata', 'av_soldado',
        'av_saiyan', 'av_colegiala', 'av_ninja', 'av_piloto', 'av_heroe', 'av_kimono', 'av_entrenador', 'av_pirata'];

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
        // se crean en orden y se quita el que no cargue (antes salían en el orden en que cargaban)
        AVATARES.forEach(function (n) {
            var im = document.createElement('img');
            im.alt = '';
            im.loading = 'lazy';
            im.setAttribute('data-av', n);
            if (guardado.indexOf('/' + n + '.webp') !== -1) im.className = 'sel';
            im.onerror = function () { im.remove(); };
            im.onclick = function () { elegirAvatar(n); };
            im.src = DIR + n + '.webp';
            grid.appendChild(im);
        });
        var sel = grid.querySelector('img.sel');
        if (sel) setTimeout(function () {
            var r = sel.getBoundingClientRect(), g = grid.getBoundingClientRect();
            grid.scrollLeft += (r.left - g.left) - (g.width - r.width) / 2;
        }, 300);
    }

    function iniciarPlayer() {
        ponerFondo('mix'); ponerColores('mix');
        ponerReverso('mix');
        envolver('applyTheme', function (type) { ponerFondo(type); ponerReverso(type); ponerColores(type); });
        envolver('showSabotageReceived', function (atacante, sabotaje) { mostrarEscena(escenaPara(String(sabotaje || '')), 2200); });
        selectorAvatares();
        document.body.classList.add('cb-movil');
        vigilarBotones();
        vidasIlustradas();
        envolver('handle', function (d) { if (d && d.type === 'STATE_UPDATE') marcarSonando(d.isPlaying); });
        css(
            // reverso de la carta central
            '.card-front{background:#111 var(--cb-reverso,none) center/cover no-repeat !important;' +
            'justify-content:flex-end !important;padding-bottom:12px !important}' +
            '.card-front > div:first-child{display:none !important}' +
            '#card-mode-label{opacity:1 !important;color:#fff !important;text-shadow:0 0 6px #000,0 0 10px var(--neon)}' +
            // selector de avatares
            '#cb-avatares-caja{width:100%;max-width:300px;margin:-4px auto 14px}' +
            '.cb-av-tit{font-family:Bungee,sans-serif;font-size:.62em;color:var(--neon);text-align:center;margin-bottom:6px;letter-spacing:1px}' +
            // 2 filas con desplazamiento horizontal: con 48 personajes una sola fila era eterna
            '#cb-avatares{display:grid;grid-template-rows:repeat(2,56px);grid-auto-flow:column;grid-auto-columns:56px;gap:8px;' +
            'overflow-x:auto;padding:4px 2px 8px;scroll-snap-type:x mandatory;-webkit-overflow-scrolling:touch}' +
            '#cb-avatares img{width:56px;height:56px;border-radius:50%;cursor:pointer;scroll-snap-align:start;object-fit:contain;' +
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
