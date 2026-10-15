/* ChronoBeats — sustituye los emojis por las imágenes de img/ (sin tocar el código del juego).
 *
 * Cómo funciona: vigila el DOM y, en cada texto que aparece en pantalla, cambia cada emoji
 * por <img class="cb-ico" src="img/xxx.webp">. Solo cambia lo que se VE: los valores que
 * viajan entre móvil y tablet (sendReaction('😂'), EMOJI_WILDCARD, etc.) no se tocan.
 *
 * - Si un emoji apunta a una imagen que aún no existe (hojas pendientes), el icono se quita
 *   sin dejar hueco; cuando generes la imagen aparecerá sola.
 * - Emojis sin entrada en MAPA: se eliminan del texto visible.
 * - En <option>, título de la pestaña y alert/confirm nativos no caben imágenes: se quitan.
 * Para cambiar qué imagen sale para cada emoji, edita MAPA.
 */
(function () {
    'use strict';
    var DIR = 'img/';
    var MAPA = {
        // fichas, comodines, sabotajes
        '🔵': 'ico_ficha', '🔘': 'ico_ficha', '🃏': 'ico_comodin', '🎴': 'ico_comodin',
        '💀': 're_calavera', '☠': 'es_eliminado', '🛡': 'ico_escudo',
        '🔫': 'sb_duelo', '🤠': 'sb_duelo', '⚔': 'sb_duelo', '🗡': 'sb_duelo',
        '🔇': 'sb_mute', '⏰': 'sb_panico', '🌫': 'sb_niebla', '🎰': 'sb_ruleta', '⏭': 'sb_salto',
        '🚫': 'sb_veto', '🌌': 'sb_agujero_negro', '🕳': 'sb_agujero_negro',
        '💸': 'sb_robar_ficha', '🥷': 'sb_robar_ficha', '💣': 'sb_bomba',
        // mercado / ayudas
        '🔄': 'ico_cambiar_cancion', '♻': 'sy_remezclar', '💳': 'ico_comprar_carta',
        '📅': 'ico_pista_decada', '🗓': 'ico_pista_decada', '👑': 'ico_rey',
        '🏆': 'ico_trofeo', '🎖': 'ico_trofeo_estrella', '👍': 'ico_conmigo',
        // interfaz
        '🛒': 'ui_tab_mercado', '💰': 'ui_tab_mercado', '🎸': 'ui_tab_juego', '📖': 'ui_reglas',
        '🏠': 'ui_hub', '▶': 'ui_play', '⏸': 'ui_pause', '🎤': 'ui_micro',
        '🎵': 'st_vinilo', '💿': 'es_vida',
        // sistema
        '✅': 'sy_correcto', '❌': 'sy_incorrecto', '⏳': 'sy_esperando', '⚠': 'sy_alerta',
        '🚨': 'sy_alerta', '👁': 'sy_revelar', '👀': 'sy_revelar', '⭐': 'sy_bonus', '🎁': 'sy_bonus',
        '🗳': 'sy_votar', '🔗': 'sy_enlace', '🔌': 'sy_reconectado', '👤': 'sy_sin_avatar',
        '🔊': 'sy_volumen', '🔈': 'sy_volumen',
        // reacciones
        '😂': 're_risa', '🔥': 're_fuego', '🎉': 're_fiesta', '😤': 're_resoplido',
        '👏': 're_aplauso', '🎯': 're_diana', '😱': 're_grito',
        // frases picantes
        '📋': 'fr_empadronado', '🎧': 'fr_condolencias', '🦻': 'fr_sordo', '🏛': 'fr_patrimonio',
        '🏫': 'fr_cole_abuelo', '🔔': 'fr_portal', '🖼': 'fr_museo', '🔍': 'fr_auditoria',
        // --- pendientes de generar: se ocultan hasta que exista la imagen ---
        '⚡': 'es_relampago', '🎲': 'ap_doble_nada', '📺': 'vr_mando_tv', '💬': 'vr_frase',
        '🪄': 'vr_selfie', '📷': 'vr_selfie', '😈': 'rk_diablillo', '🥇': 'rk_oro',
        '🥈': 'rk_plata', '🥉': 'rk_bronce', '🕹': 'rk_joystick', '💥': 'rk_explosion',
        '🎬': 'ct_pelis', '⛩': 'ct_anime', '🎮': 'ct_gamer', '👥': 'md_equipos',
        '🔴': 'es_equipo_rojo', '☮': 'pr_pacifista', '🦕': 'pr_paleontologo'
    };
    // flechas emoji -> flecha de texto normal
    var TEXTO = { '⬇': '↓', '⬆': '↑', '⬅': '←', '➡': '→' };

    // cualquier emoji (con o sin selector de variación). Flechas ←↑→↓, ✓ y ✕ quedan como texto.
    var EMOJI = /(?:[\u{1F000}-\u{1FAFF}]|[\u2600-\u2712\u2714\u2716-\u27BF]|[\u2B00-\u2BFF]|[\u23E9-\u23FA]|\u25B6)\uFE0F?|\uFE0F/gu;
    var SALTAR = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, INPUT: 1, OPTION: 1, SELECT: 1, TITLE: 1, svg: 1, SVG: 1, NOSCRIPT: 1 };

    function limpio(ch) { return ch.replace(/️/g, ''); }

    function quitar(t) {
        return t.replace(EMOJI, function (m) { var k = limpio(m); return TEXTO[k] || ''; })
                .replace(/ {2,}/g, ' ');
    }

    function icono(nombre) {
        var img = document.createElement('img');
        img.className = 'cb-ico';
        img.alt = '';
        img.draggable = false;
        img.src = DIR + nombre + '.webp';
        img.onerror = function () { console.warn('[cb_iconos] no se encuentra ' + img.src); if (img.parentNode) img.parentNode.removeChild(img); };
        return img;
    }

    function procesarTexto(nodo) {
        var t = nodo.nodeValue;
        if (!t) return;
        EMOJI.lastIndex = 0;
        if (!EMOJI.test(t)) return;
        EMOJI.lastIndex = 0;
        var frag = document.createDocumentFragment();
        var ultimo = 0, m;
        while ((m = EMOJI.exec(t)) !== null) {
            if (m.index > ultimo) frag.appendChild(document.createTextNode(t.slice(ultimo, m.index)));
            var k = limpio(m[0]);
            if (MAPA[k]) frag.appendChild(icono(MAPA[k]));
            else if (TEXTO[k]) frag.appendChild(document.createTextNode(TEXTO[k]));
            ultimo = m.index + m[0].length;
        }
        if (ultimo < t.length) frag.appendChild(document.createTextNode(t.slice(ultimo)));
        if (nodo.parentNode) nodo.parentNode.replaceChild(frag, nodo);
    }

    function procesar(raiz) {
        if (!raiz) return;
        if (raiz.nodeType === 3) {
            var p = raiz.parentNode;
            if (p && SALTAR[p.nodeName]) { if (p.nodeName === 'OPTION' || p.nodeName === 'TITLE') raiz.nodeValue = quitar(raiz.nodeValue); return; }
            procesarTexto(raiz);
            return;
        }
        if (raiz.nodeType !== 1 || SALTAR[raiz.nodeName]) {
            if (raiz.nodeName === 'OPTION' || raiz.nodeName === 'SELECT') {
                var ops = raiz.nodeName === 'OPTION' ? [raiz] : raiz.querySelectorAll('option');
                for (var j = 0; j < ops.length; j++) { var q = quitar(ops[j].text); if (q !== ops[j].text) ops[j].text = q; }
            }
            return;
        }
        var w = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, null), n, lista = [];
        while ((n = w.nextNode())) {
            var pa = n.parentNode;
            if (pa && SALTAR[pa.nodeName]) { if (pa.nodeName === 'OPTION') { var q2 = quitar(n.nodeValue); if (q2 !== n.nodeValue) n.nodeValue = q2; } continue; }
            if (pa && pa.closest && pa.closest('svg')) continue;
            lista.push(n);
        }
        for (var i = 0; i < lista.length; i++) procesarTexto(lista[i]);
        // atributos visibles
        var conAttr = raiz.querySelectorAll('[placeholder],[title]');
        for (var a = 0; a < conAttr.length; a++) {
            ['placeholder', 'title'].forEach(function (at) {
                var v = conAttr[a].getAttribute(at);
                if (v) { var q3 = quitar(v); if (q3 !== v) conAttr[a].setAttribute(at, q3); }
            });
        }
    }

    function estilos() {
        var s = document.createElement('style');
        s.textContent = '.cb-ico{height:1.25em;width:auto;vertical-align:-0.28em;display:inline-block;margin:0 .06em;pointer-events:none;user-select:none}';
        document.head.appendChild(s);
    }

    // título de la pestaña
    function vigilarTitulo() {
        var fijar = function () { var q = quitar(document.title); if (q !== document.title) document.title = q; };
        fijar();
        var tt = document.querySelector('title');
        if (tt) new MutationObserver(fijar).observe(tt, { childList: true, characterData: true, subtree: true });
    }

    // alert / confirm / prompt nativos
    ['alert', 'confirm', 'prompt'].forEach(function (fn) {
        var orig = window[fn];
        if (typeof orig !== 'function') return;
        window[fn] = function (msg) {
            var args = Array.prototype.slice.call(arguments);
            if (typeof msg === 'string') args[0] = quitar(msg);
            return orig.apply(window, args);
        };
    });

    function iniciar() {
        estilos();
        procesar(document.body);
        vigilarTitulo();
        new MutationObserver(function (muts) {
            for (var i = 0; i < muts.length; i++) {
                var m = muts[i];
                if (m.type === 'characterData') procesar(m.target);
                else for (var j = 0; j < m.addedNodes.length; j++) procesar(m.addedNodes[j]);
            }
        }).observe(document.body, { childList: true, subtree: true, characterData: true });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar);
    else iniciar();
})();
