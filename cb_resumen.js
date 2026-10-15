/* ChronoBeats — imagen-resumen de la partida para compartir (tablet, pantalla de ganador).
 * Añade el botón "COMPARTIR RESUMEN" en la pantalla de ganador. Genera una imagen
 * 1080x1350 con el ganador, la clasificación, los premios y la canción más difícil, y la
 * comparte (WhatsApp, etc.) con el menú del sistema; si el navegador no puede compartir
 * archivos, la descarga.
 */
(function () {
    'use strict';
    var DIR = 'img/';
    var W = 1080, H = 1350;

    function cargar(src) {
        return new Promise(function (ok) {
            if (!src) return ok(null);
            var im = new Image();
            im.onload = function () { ok(im); };
            im.onerror = function () { ok(null); };
            im.src = src;
        });
    }
    function norm(t) { return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim(); }
    function limpio(t) { return (t || '').replace(/[\u{1F000}-\u{1FAFF}☀-➿️]/gu, '').replace(/\s+/g, ' ').trim(); }

    function cubrir(ctx, im, x, y, w, h) {
        var r = Math.max(w / im.width, h / im.height), iw = im.width * r, ih = im.height * r;
        ctx.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
    }
    function caja(ctx, x, y, w, h, r, relleno, borde) {
        ctx.beginPath();
        ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
        ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
        if (relleno) { ctx.fillStyle = relleno; ctx.fill(); }
        if (borde) { ctx.strokeStyle = borde; ctx.lineWidth = 4; ctx.stroke(); }
    }
    function texto(ctx, t, x, y, tam, color, alinear, fuente, max) {
        ctx.font = tam + 'px ' + (fuente || 'Bungee, Impact, sans-serif');
        ctx.textAlign = alinear || 'center'; ctx.textBaseline = 'middle';
        if (max) { while (ctx.measureText(t).width > max && tam > 14) { tam -= 2; ctx.font = tam + 'px ' + (fuente || 'Bungee, Impact, sans-serif'); } }
        ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(4, tam / 7); ctx.strokeStyle = 'rgba(10,4,30,.9)';
        ctx.strokeText(t, x, y); ctx.fillStyle = color; ctx.fillText(t, x, y);
    }

    function datos() {
        var ps = (window.players || []).slice().sort(function (a, b) { return (b.score || 0) - (a.score || 0); });
        var ganador = (document.getElementById('winner-name') || {}).textContent || '';
        var g = ps.find(function (p) { return p.name === ganador; });
        if (g) { ps = ps.filter(function (p) { return p !== g; }); ps.unshift(g); }
        var premios = [];
        document.querySelectorAll('#winner-screen .award-card').forEach(function (c) {
            var t = c.querySelector('.award-title'), v = c.querySelector('.award-val');
            if (t && v && premios.length < 4) premios.push({ titulo: limpio(t.textContent), quien: limpio(v.textContent) });
        });
        var st = window.stats || {};
        var min = st.startTime ? Math.round((Date.now() - st.startTime) / 60000) : null;
        return { ganador: ganador, ganadorObj: g, jugadores: ps, premios: premios, dificil: st.hardestSong, minutos: min, modo: window.modoLight ? 'LIGHT' : String(window.gameMode || '').toUpperCase() };
    }

    var MEDALLA = { 'CANCION MAS DIFICIL': 'es_eliminado', 'MAS SABOTEADOR': 'pr_terrorista', 'MAS SABOTEADO': 'pr_objetivo', 'MEJOR RACHA': 'pr_racha',
        'MEJOR APOSTADOR': 'pr_tahur', 'EL OIDO DE PALO': 'x_carta_perdida', 'EL GRAN TURISTA': 'rk_bronce', 'EL PALEONTOLOGO': 'pr_paleontologo',
        'EL MONJE SHAOLIN': 'pr_pacifista', 'EL INTOCABLE': 'pr_intocable', 'EL TERRORISTA': 'pr_terrorista', 'EL FAROLERO': 'pr_farolero',
        'LA RACHA': 'pr_racha', 'EL OBJETIVO': 'pr_objetivo', 'EL PACIFISTA': 'pr_pacifista', 'EL TAHUR': 'pr_tahur', 'EL RAYO': 'pr_rayo' };

    async function dibujar() {
        var d = datos();
        try { await Promise.all([document.fonts.load('60px Bungee'), document.fonts.load('30px Montserrat')]); } catch (e) {}
        var nombresImg = ['fondo_host_mix', 'logo', 'rk_oro', 'rk_plata', 'rk_bronce'].concat(d.premios.map(function (p) { return MEDALLA[norm(p.titulo)] || 'ico_trofeo'; }));
        var imgs = await Promise.all(nombresImg.map(function (n) { return cargar(DIR + n + '.webp'); }));
        var fondo = imgs[0], logo = imgs[1], medallas = imgs.slice(2, 5), imgPremios = imgs.slice(5);
        var avatar = await cargar(d.ganadorObj && d.ganadorObj.avatar);

        var cv = document.createElement('canvas'); cv.width = W; cv.height = H;
        var ctx = cv.getContext('2d');
        ctx.fillStyle = '#1a0f2e'; ctx.fillRect(0, 0, W, H);
        if (fondo) cubrir(ctx, fondo, 0, 0, W, H);
        var gr = ctx.createLinearGradient(0, 0, 0, H);
        gr.addColorStop(0, 'rgba(20,8,45,.55)'); gr.addColorStop(1, 'rgba(20,8,45,.92)');
        ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);

        if (logo) ctx.drawImage(logo, W / 2 - 110, 30, 220, 220);
        texto(ctx, 'CHRONOBEATS', W / 2, 280, 56, '#ffffff');
        texto(ctx, '¡GANADOR!', W / 2, 360, 50, '#FFD54A');

        // avatar
        var ay = 470, ar = 82;
        ctx.save(); ctx.beginPath(); ctx.arc(W / 2, ay, ar, 0, Math.PI * 2); ctx.closePath();
        ctx.fillStyle = '#2a1a5e'; ctx.fill(); ctx.clip();
        if (avatar) cubrir(ctx, avatar, W / 2 - ar, ay - ar, ar * 2, ar * 2);
        else texto(ctx, (d.ganador || '?').charAt(0).toUpperCase(), W / 2, ay + 6, 90, '#00f2ff');
        ctx.restore();
        ctx.beginPath(); ctx.arc(W / 2, ay, ar, 0, Math.PI * 2); ctx.lineWidth = 8; ctx.strokeStyle = '#FFD54A'; ctx.stroke();
        texto(ctx, d.ganador || '---', W / 2, 610, 74, '#ffffff', 'center', null, W - 120);

        // clasificación
        var y = 690;
        caja(ctx, 70, y, W - 140, 60 + Math.min(d.jugadores.length, 6) * 56, 26, 'rgba(42,26,94,.85)', '#7c5cff');
        d.jugadores.slice(0, 6).forEach(function (p, i) {
            var yy = y + 50 + i * 56;
            if (medallas[i]) ctx.drawImage(medallas[i], 100, yy - 24, 48, 48);
            else texto(ctx, (i + 1) + 'º', 124, yy, 30, '#cccccc');
            texto(ctx, p.name, 170, yy, 34, i === 0 ? '#FFD54A' : '#ffffff', 'left', null, 560);
            texto(ctx, (p.score || 0) + ((p.score === 1) ? ' carta' : ' cartas'), W - 100, yy, 30, '#00f2ff', 'right');
        });
        y += 60 + Math.min(d.jugadores.length, 6) * 56 + 26;

        // premios (2 columnas)
        d.premios.forEach(function (pr, i) {
            var col = i % 2, fila = Math.floor(i / 2);
            var x = 70 + col * ((W - 140) / 2 + 10), w = (W - 140) / 2 - 10, yy = y + fila * 120;
            if (yy + 110 > H - 120) return;
            caja(ctx, x, yy, w, 108, 22, 'rgba(26,15,46,.85)', '#FFD54A');
            if (imgPremios[i]) ctx.drawImage(imgPremios[i], x + 14, yy + 14, 80, 80);
            texto(ctx, pr.titulo, x + 108, yy + 38, 24, '#FFD54A', 'left', null, w - 124);
            texto(ctx, pr.quien, x + 108, yy + 74, 26, '#ffffff', 'left', 'Montserrat, Arial, sans-serif', w - 124);
        });

        // pie
        var pie = [];
        if (d.dificil && d.dificil.song) pie.push('Más difícil: ' + d.dificil.artist + ' - ' + d.dificil.song + ' (' + d.dificil.year + ')');
        var linea2 = [d.modo, d.minutos ? d.minutos + ' min' : '', new Date().toLocaleDateString('es-ES')].filter(Boolean).join(' · ');
        pie.push(linea2);
        pie.forEach(function (t, i) { texto(ctx, t, W / 2, H - 80 + i * 40, 26, '#d9ccff', 'center', 'Montserrat, Arial, sans-serif', W - 100); });
        return cv;
    }

    async function compartir(btn) {
        var antes = btn.textContent;
        btn.disabled = true; btn.textContent = 'PREPARANDO...';
        try {
            var cv = await dibujar();
            var blob = await new Promise(function (ok) { cv.toBlob(ok, 'image/png'); });
            var nombre = 'chronobeats_' + new Date().toISOString().slice(0, 10) + '.png';
            var file = new File([blob], nombre, { type: 'image/png' });
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({ files: [file], title: 'ChronoBeats', text: '¡Resultado de la partida de ChronoBeats!' });
            } else {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob); a.download = nombre;
                document.body.appendChild(a); a.click(); a.remove();
                setTimeout(function () { URL.revokeObjectURL(a.href); }, 5000);
            }
        } catch (e) {
            if (!e || e.name !== 'AbortError') console.warn('[cb_resumen]', e);
        }
        btn.disabled = false; btn.textContent = antes;
    }
    window.cbResumenPartida = dibujar;   // para pruebas

    function poner() {
        var ws = document.getElementById('winner-screen');
        var nombre = document.getElementById('winner-name');
        if (!ws || !nombre || document.getElementById('cb-btn-resumen')) return;
        var b = document.createElement('button');
        b.id = 'cb-btn-resumen';
        b.textContent = 'COMPARTIR RESUMEN';
        b.style.cssText = 'display:block;margin:6px auto 14px;font-family:Bungee,sans-serif;font-size:1em;padding:12px 26px;border-radius:14px;border:2px solid #1a0f2e;background:linear-gradient(90deg,#ff5fa2,#ff9a3c);color:#fff;cursor:pointer;box-shadow:0 5px 0 #1a0f2e;';
        b.onclick = function () { compartir(b); };
        nombre.parentNode.insertBefore(b, nombre.nextSibling);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poner); else poner();
})();
