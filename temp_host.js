
        var peer, roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        var players = [], connections = {}, songs = [], currentSongIdx = -1, activePlayerIdx = 0, isRevealed = false, isLeapOfFaithWindow = false, leapOfFaithVictor = null;
        var currentBets = {};
        var hasShield = {};
        var hasBomb = {}; // playerId -> boolean
        var hasBomb = {}; // playerId -> boolean
        var hasShield = {};
        var hasBomb = {}; // playerId -> boolean
        var hasBomb = {}; // playerId -> boolean
        var activeGuess = null; // slotIndex del jugador activo
        var bettingAgainst = []; // IDs de los jugadores que han apostado contra el jugador activo

        // Variables de estado del Modo Rey
        var gameMode = 'normal';
        var turnPhase = 'NORMAL'; // 'NORMAL', 'KING_SELECTION', 'KING_GUESS', 'KING_GUESS_RESULT'
        var kingOptions = []; // Array de opciones para los retadores
        var cheatsEnabled = true;

        // Seguimiento de tiempo para skips manuales
        var segundosAcumulados = 0;
        var momentoDeInicio = 0;
        var isPlaying = false;
        var isMuted = false;
        var muteTimeRemaining = 0;
        var muteIntervalTimer = null;
        var panicTimer = 0;
        var panicActive = false;
        var panicInterval = null;
        var joputismoLevel = 0; // 0: LOSER, 1: HE-MAN, 2: SUPERMAN
        var isFogActive = false;

        document.getElementById('join-code').innerText = roomCode;

        // Eliminadas funciones de YT API

        function initPeer() {
            peer = new Peer("CB-HOST-" + roomCode, {
                config: {
                                                            'iceServers': [
                        { urls: 'stun:stun.l.google.com:19302' },
                        { urls: 'stun:stun1.l.google.com:19302' },
                        { urls: 'stun:global.stun.twilio.com:3478' },
                        { urls: 'stun:stun.cloudflare.com:3478' },
                        { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
                        { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
                        { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' }
                    ]
                }
            });
            peer.on('open', function (id) {
                console.log("Host Peer Abierto:", id);
                document.getElementById('live-room-code').innerText = roomCode;
                document.getElementById('live-room-code').style.display = 'block';
            });
            peer.on('connection', function (conn) {
                console.log("Nueva conexión entrante:", conn.peer);
                conn.on('open', function () {
                    console.log("Conexión con el player abierta");
                });
                conn.on('data', function (data) {
                    console.log("Comando recibido en host:", data);
                    if (data.type === 'JOIN') {
                        // PROTECCIÓN DUPLICADOS: Buscar si el nombre ya existe
                        var existing = players.find(function (p) { return p.name.toLowerCase() === data.name.toLowerCase(); });
                        if (existing) {
                            console.log("Reconexión de jugador:", data.name);
                            delete connections[existing.id];
                            existing.id = conn.peer;
                            existing.avatar = data.avatar || existing.avatar; // Actualizar avatar si cambió
                            connections[conn.peer] = conn;
                            syncState(); // Force state sync to reconnecting player
                        } else {
                            players.push({ id: conn.peer, name: data.name, avatar: data.avatar || null, score: 1, cards: [], tokens: 2, canReload: true });
                            connections[conn.peer] = conn;
                        }
                        updateLobby();
                    } else if (data.type === 'AVATAR_UPDATE') {
                        var existing = players.find(function (p) { return p.name.toLowerCase() === data.name.toLowerCase(); });
                        if (existing) {
                            existing.avatar = data.avatar;
                            updateLobby();
                        }
                    } else if (data.type === 'COMMAND') {
                        handlePlayerCommand(conn.peer, data.action, data.value);
                    }
                });
                conn.on('error', function (err) {
                    console.error("Error en conexión:", err);
                });
            });
            peer.on('error', function (err) {
                if (err.type === 'unavailable-id') {
                    alert("El ID de sala ya existe o hay un error. Probando uno nuevo...");
                    window.location.reload();
                } else {
                    alert("Error PeerJS Host: " + err.type);
                }
            });
        }
        initPeer();

        fetch('lista_final.txt?v=' + new Date().getTime()).then(function (r) { return r.text() }).then(function (t) {
            var lines = t.replace(/\r/g, '').split('\n');
            var uniqueIds = new Set();
            var playedIds = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]');
            songs = lines.map(function (l, index) {
                var p = l.split('|');
                var m = p[3] ? p[3].match(/[?&]v=([^&#]+)|youtu\.be\/([^?&#]+)/) : null;
                return {
                    artist: p[0],
                    song: p[1],
                    year: p[2],
                    id: m ? (m[1] || m[2]) : null,
                    line: index + 1 // Guardar número de fila original
                };
            }).filter(function (s) {
                if (!s.id || uniqueIds.has(s.id) || playedIds.includes(s.id)) return false;
                uniqueIds.add(s.id);
                return true;
            }).sort(function () { return Math.random() - 0.5; });
        });

        function updateLobby() {
            var h = "";
            for (var i = 0; i < players.length; i++) {
                var avatarHtml = '';
                if (players[i].avatar) {
                    avatarHtml = '<img src="' + players[i].avatar + '" style="width:30px; height:30px; border-radius:50%; vertical-align:middle; margin-right:8px; border:2px solid var(--neon);">';
                } else {
                    var initial = players[i].name.charAt(0).toUpperCase();
                    avatarHtml = '<div style="width:30px; height:30px; border-radius:50%; background:#222; border:2px solid var(--neon); color:var(--neon); display:inline-flex; align-items:center; justify-content:center; font-family:\'Bungee\'; vertical-align:middle; margin-right:8px;">' + initial + '</div>';
                }
                h += '<div class="player-tag" style="display:flex; align-items:center;">' + avatarHtml + players[i].name + '</div>';
            }
            document.getElementById('lobby-players').innerHTML = h;
            if (players.length >= 1) document.getElementById('start-btn').style.display = 'inline-block';
        }

        var joputismoAudioTimeout = null;

        function setJoputismo(level) {
            joputismoLevel = parseInt(level);
            var selectLobby = document.getElementById('joputismo-select-lobby');
            if (selectLobby) selectLobby.value = joputismoLevel;
            var selectGame = document.getElementById('joputismo-select-game');
            if (selectGame) selectGame.value = joputismoLevel;

            var themeContainer = document.getElementById('joputismo-audio-player');
            if (themeContainer) {
                if (joputismoAudioTimeout) {
                    clearTimeout(joputismoAudioTimeout);
                    joputismoAudioTimeout = null;
                }

                if (document.getElementById('lobby').style.display !== 'none') {
                    if (joputismoLevel === 1) {
                        // Trololo meme
                        themeContainer.innerHTML = '<iframe width="1" height="1" src="https://www.youtube-nocookie.com/embed/oavMtUWDBTM?autoplay=1&start=16" allow="autoplay" style="display:none;"></iframe>';
                    } else if (joputismoLevel === 2) {
                        // Superman theme - desde el principio
                        themeContainer.innerHTML = '<iframe width="1" height="1" src="https://www.youtube-nocookie.com/embed/e9vrfEoc8_g?autoplay=1" allow="autoplay" style="display:none;"></iframe>';
                    } else {
                        themeContainer.innerHTML = '';
                    }
                } else {
                    themeContainer.innerHTML = '';
                }
            }
            syncState();
        }

        function startGame() {
            var tc = document.getElementById('joputismo-audio-player');
            if (tc) tc.innerHTML = '';

            gameMode = document.getElementById('game-mode-select').value;

            // MECÁNICA INICIAL: Repartir una carta a cada jugador
            players.forEach(function (p) {
                currentSongIdx++; if(songs[currentSongIdx] && songs[currentSongIdx].id) { var _pl = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]'); if(!_pl.includes(songs[currentSongIdx].id)){ _pl.push(songs[currentSongIdx].id); localStorage.setItem('CB_PlayedSongs', JSON.stringify(_pl)); } }
                var s = songs[currentSongIdx];
                if (s) p.cards.push(s.year);
            });

            document.getElementById('lobby').style.display = 'none';
            document.getElementById('dashboard').style.display = 'grid';
            nextTurn();
        }

        function nextTurn() {
            currentSongIdx++; if(songs[currentSongIdx] && songs[currentSongIdx].id) { var _pl = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]'); if(!_pl.includes(songs[currentSongIdx].id)){ _pl.push(songs[currentSongIdx].id); localStorage.setItem('CB_PlayedSongs', JSON.stringify(_pl)); } } isRevealed = false;
            segundosAcumulados = 0;
            momentoDeInicio = 0;
            isPlaying = false;
            currentBets = {}; var rb=document.getElementById('btn-report-error'); if(rb) rb.style.display='block'; // al cambiar de turno
            activeGuess = null; // Limpiar adivinanza
            bettingAgainst = []; // Limpiar apuestas de "ni de coña"

            isMuted = false;
            muteTimeRemaining = 0;
            if (muteIntervalTimer) { clearInterval(muteIntervalTimer); muteIntervalTimer = null; }

            panicActive = false;
            panicTimer = 0;
            if (panicInterval) { clearInterval(panicInterval); panicInterval = null; }

                        isFogActive = false;

            // --- CHECK DUELO ---
            activeDuel = null;
            if (queuedDuel) {
                activeDuel = queuedDuel;
                queuedDuel = null;
                // Reproducir musica de duelo: 5U9ilW1d_M (The Good the Bad and the Ugly whistle) o similar
                // Ponemos esto en los players con un aviso gigante.
                try {
                    Object.keys(connections).forEach(id => {
                        if(connections[id] && connections[id].open) {
                            connections[id].send({ type: 'BET_RESULT', msg: "\u00A1DUELO A MUERTE! " + activeDuel.p1Name.toUpperCase() + " vs " + activeDuel.p2Name.toUpperCase() + "!" });
                        }
                    });
                } catch(e) {}
            }

            // --- INICIO MODO REY CHECK ---
            if (gameMode === 'rey' && players[activePlayerIdx] && players[activePlayerIdx].score >= 10) {
                turnPhase = 'KING_SELECTION';
                kingOptions = [];
                // Calcular un número de cartas igual a (players.length - 1)
                var numOptions = Math.max(1, players.length - 1);
                for (var i = 0; i < numOptions; i++) {
                    currentSongIdx++; if(songs[currentSongIdx] && songs[currentSongIdx].id) { var _pl = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]'); if(!_pl.includes(songs[currentSongIdx].id)){ _pl.push(songs[currentSongIdx].id); localStorage.setItem('CB_PlayedSongs', JSON.stringify(_pl)); } }
                    kingOptions.push(songs[currentSongIdx]);
                }

                document.getElementById('ui-card-artist').innerText = "ELIGIENDO CARTA...";
                document.getElementById('ui-card-song').innerText = "ESPERANDO RIVALES";
                document.getElementById('ui-card-year').innerText = "----";
                document.getElementById('btn-reveal-host').style.display = 'none';
                document.getElementById('val-card-ui').style.display = 'block';
                document.getElementById('validation-buttons').style.display = 'none';
                document.getElementById('challenger-validation').style.display = 'none';
                document.getElementById('ui-current-player').innerText = players[activePlayerIdx].name + " (REY)";
                document.getElementById('host-instructions').innerText = "ESPERANDO A QUE LOS JUGADORES ELIJAN QUÉ CARTA TE TOCA...";
                document.getElementById('player-container').innerHTML = '';
                syncState();
                return;
            } else {
                turnPhase = 'NORMAL';
            }
            // --- FIN MODO REY CHECK ---

            var s = songs[currentSongIdx];
            document.getElementById('ui-card-artist').innerText = "????";
            document.getElementById('ui-card-song').innerText = "????";
            document.getElementById('ui-card-year').innerText = "????";
            document.getElementById('btn-reveal-host').style.display = 'block';
            document.getElementById('val-card-ui').style.display = 'block';
            document.getElementById('validation-buttons').style.display = 'none';
            document.getElementById('challenger-validation').style.display = 'none';
            document.getElementById('ui-current-player').innerText = players[activePlayerIdx].name;
            document.getElementById('host-instructions').innerText = "ESPERANDO ACCIÓN...";
            document.getElementById('player-container').innerHTML = '<div id="youtube-player"></div>';
            syncState();
        }

        function playBuzzerWebAudio() {
            try {
                var ctx = new (window.AudioContext || window.webkitAudioContext)();
                var osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, ctx.currentTime);
                osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 2);
                var gain = ctx.createGain();
                gain.gain.setValueAtTime(0, ctx.currentTime);
                gain.gain.linearRampToValueAtTime(1, ctx.currentTime + 0.1);
                gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 3);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start();
                osc.stop(ctx.currentTime + 3);
            } catch (e) {
                console.error("Audio API error:", e);
            }
        }

        function handlePlayerCommand(peerId, action, value) {
            var activeP = players[activePlayerIdx];
            var s = songs[currentSongIdx];
            var container = document.getElementById('player-container');

            switch (action) {
                case 'PLAY':
                    if (peerId !== activeP.id) return;
                    if (!isPlaying) {
                        momentoDeInicio = Date.now();
                        isPlaying = true;
                        container.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + s.id + '?autoplay=1&start=' + segundosAcumulados + (isMuted ? '&mute=1' : '') + '" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen style="width:100%; height:100%; border:none;"></iframe>';
                        document.getElementById('host-instructions').innerText = "REPRODUCIENDO" + (isMuted ? " (MUTE)" : "");
                        syncState();
                    }
                    break;
                case 'PAUSE':
                    if (peerId !== activeP.id) return;
                    if (isPlaying) {
                        var tiempoTranscurrido = Math.floor((Date.now() - momentoDeInicio) / 1000);
                        segundosAcumulados += tiempoTranscurrido;
                        container.innerHTML = '';
                        isPlaying = false;
                        document.getElementById('host-instructions').innerText = "PAUSADO";
                        syncState();
                    }
                    break;
                case 'STOP':
                    if (peerId !== activeP.id) return;
                    isPlaying = false;
                    container.innerHTML = '';
                    document.getElementById('host-instructions').innerText = "¿ACERTÓ?";
                    revealData();
                    syncState();
                    break;
                case 'SABOTAGE_MUTE':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.tokens >= 1 && p.id !== players[activePlayerIdx].id && isPlaying) {
                        p.tokens--;
                        muteTimeRemaining += 15000;

                        if (!isMuted) {
                            isMuted = true;
                            var tiempoTranscurrido = Math.floor((Date.now() - momentoDeInicio) / 1000);
                            segundosAcumulados += tiempoTranscurrido;
                            momentoDeInicio = Date.now();
                            container.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + s.id + '?autoplay=1&start=' + segundosAcumulados + '&mute=1" allow="autoplay"></iframe>';
                            document.getElementById('host-instructions').innerText = "REPRODUCIENDO (MUTE)";

                            muteIntervalTimer = setInterval(function () {
                                if (isPlaying) muteTimeRemaining -= 1000;
                                if (muteTimeRemaining <= 0) {
                                    clearInterval(muteIntervalTimer);
                                    muteIntervalTimer = null;
                                    muteTimeRemaining = 0;
                                    if (isMuted && isPlaying) {
                                        isMuted = false;
                                        var t2 = Math.floor((Date.now() - momentoDeInicio) / 1000);
                                        segundosAcumulados += t2;
                                        momentoDeInicio = Date.now();
                                        container.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + s.id + '?autoplay=1&start=' + segundosAcumulados + '" allow="autoplay"></iframe>';
                                        document.getElementById('host-instructions').innerText = "REPRODUCIENDO";
                                        syncState();
                                    }
                                }
                            }, 1000);
                        }
                        syncState();
                    }
                    break;
                case 'TOGGLE_CHEAT':
                    cheatsEnabled = !cheatsEnabled;
                    syncState();
                    break;
                case 'SKIP':
                    if (peerId !== activeP.id) return;
                    if (isPlaying) {
                        var tiempoTranscurrido = Math.floor((Date.now() - momentoDeInicio) / 1000);
                        segundosAcumulados += tiempoTranscurrido + value;
                    } else {
                        segundosAcumulados += value;
                    }
                    if (segundosAcumulados < 0) segundosAcumulados = 0;
                    momentoDeInicio = Date.now();
                    if (isPlaying) {
                        container.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + s.id + '?autoplay=1&start=' + segundosAcumulados + (isMuted ? '&mute=1' : '') + '" allow="autoplay"></iframe>';
                        document.getElementById('host-instructions').innerText = "REPRODUCIENDO" + (isMuted ? " (MUTE)" : "");
                        syncState();
                    }
                    break;
                case 'RELOAD_SONG':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.tokens >= 1 && p.canReload) {
                        p.tokens--;
                        p.canReload = false; // Solo uno por turno
                        isPlaying = false;
                        container.innerHTML = '<div id="youtube-player"></div>'; // Parar música de verdad
                        currentSongIdx++; if(songs[currentSongIdx] && songs[currentSongIdx].id) { var _pl = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]'); if(!_pl.includes(songs[currentSongIdx].id)){ _pl.push(songs[currentSongIdx].id); localStorage.setItem('CB_PlayedSongs', JSON.stringify(_pl)); } } // Descartar y pasar a la siguiente
                        segundosAcumulados = 0;
                        momentoDeInicio = 0;
                        isRevealed = false; // Resetear revelado
                        document.getElementById('ui-card-artist').innerText = "????";
                        document.getElementById('ui-card-song').innerText = "????";
                        document.getElementById('ui-card-year').innerText = "????";
                        document.getElementById('btn-reveal-host').style.display = 'block';
                        document.getElementById('val-card-ui').style.display = 'block';
                        document.getElementById('validation-buttons').style.display = 'none';
                        document.getElementById('host-instructions').innerText = "CANCIÓN CAMBIADA (DALE A PLAY)";
                        syncState();
                    }
                    break;
                case 'SYSTEM_ERROR_TRACK':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && isPlaying) {
                        isPlaying = false;
                        container.innerHTML = '<div id="youtube-player"></div>';
                        currentSongIdx++; if(songs[currentSongIdx] && songs[currentSongIdx].id) { var _pl = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]'); if(!_pl.includes(songs[currentSongIdx].id)){ _pl.push(songs[currentSongIdx].id); localStorage.setItem('CB_PlayedSongs', JSON.stringify(_pl)); } }
                        segundosAcumulados = 0;
                        momentoDeInicio = 0;
                        isRevealed = false;
                        document.getElementById('ui-card-artist').innerText = "????";
                        document.getElementById('ui-card-song').innerText = "????";
                        document.getElementById('ui-card-year').innerText = "????";
                        document.getElementById('btn-reveal-host').style.display = 'block';
                        document.getElementById('val-card-ui').style.display = 'block';
                        document.getElementById('validation-buttons').style.display = 'none';
                        document.getElementById('host-instructions').innerText = "VÍDEO ROTO. CANCIÓN CAMBIADA.";
                        syncState();
                    }
                    break;
                case 'AUTO_WIN':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.tokens >= 3) {
                        p.tokens -= 3;
                        validateResult(true, false);
                    }
                    break;
                case 'BET':
                    console.log("[BET] de", peerId, "en slot", value);
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    var valNum = parseInt(value);
                    if (isNaN(valNum)) break;

                    var slotOccupied = (activeGuess == valNum);
                    for (var pid in currentBets) { if (currentBets[pid] == valNum) slotOccupied = true; }

                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 2 && currentBets[peerId] === undefined && !slotOccupied && activeGuess !== null) {
                        console.log("[OK] Apuesta (Duelo) aceptada para", p.name);
                        p.tokens -= 2;
                        currentBets[peerId] = valNum;
                        syncState();
                        console.log("[FAIL] Apuesta rechazada. p:", !!p, "Tokens:", p ? p.tokens : 0, "Ya apostó?", p ? currentBets[peerId] !== undefined : false, "Slot ocupado?", slotOccupied, "Guess es", activeGuess);
                    }
                    break;
                case 'BET_AGAINST_ACTIVE':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 1 && !bettingAgainst.includes(peerId) && isPlaying && !isRevealed && (!turnPhase || turnPhase === 'NORMAL')) {
                        p.tokens--;
                        bettingAgainst.push(peerId);

                        // Mostrar mensaje flotante en el host
                        var oldText = document.getElementById('host-instructions').innerText;
                        document.getElementById('host-instructions').innerHTML = "<span style='color:#ff0055; font-size:1.2em;'>¡" + p.name + " DUDA DE QUE LO SEPA!</span>";
                        setTimeout(function () {
                            if (!isRevealed) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                        }, 3000);

                        syncState();
                    }
                    break;
                case 'SABOTAGE_PANIC':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 2 && !panicActive && isPlaying && !isRevealed && (!turnPhase || turnPhase === 'NORMAL')) {
                        p.tokens -= 2;
                        panicActive = true;
                        panicTimer = 10;

                        var oldText = document.getElementById('host-instructions').innerText;
                        document.getElementById('host-instructions').innerHTML = "<span style='color:#ff0000; font-size:1.5em; font-family:Bungee;'>¡" + p.name + " HA LANZADO UN ATAQUE DE PÁNICO!</span>";
                        setTimeout(function () {
                            if (!isRevealed && panicActive) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                        }, 3000);

                        panicInterval = setInterval(function () {
                            panicTimer--;
                            if (panicTimer <= 0) {
                                clearInterval(panicInterval);
                                panicInterval = null;
                                panicTimer = 0;
                                panicActive = false;

                                // Forzar fallo
                                isRevealed = true;
                                isPlaying = false;
                                document.getElementById('player-container').innerHTML = '';
                                document.getElementById('host-instructions').innerHTML = "<span style='color:#ff4444; font-size:1.5em;'>¡TIEMPO AGOTADO! ❌</span><br>Turno perdido por pánico.";
                                document.getElementById('btn-reveal-host').style.display = 'none';
                                document.getElementById('val-card-ui').style.display = 'block';
                                document.getElementById('validation-buttons').style.display = 'none';
                                syncState();
                                setTimeout(function () {
                                    activePlayerIdx = (activePlayerIdx + 1) % players.length;
                                    players[activePlayerIdx].canReload = true;
                                    nextTurn();
                                }, 4000);
                            } else {
                                syncState();
                            }
                        }, 1000);
                        syncState();
                    }
                    break;
                case 'SABOTAGE_BUZZER':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 1 && isPlaying && !isRevealed && (!turnPhase || turnPhase === 'NORMAL')) {
                        p.tokens -= 1;
                        playBuzzerWebAudio();
                        syncState();
                    }
                    break;
                case 'SABOTAGE_FOG':
                                        if (hasShield[players[activePlayerIdx].id]) {
                        var p = players.find(function(pl) { return pl.id === peerId; });
                        if(p) {
                            try { if(connections[p.id]) connections[p.id].send({ type: 'BET_RESULT', msg: "\u00A1ZASCA! El Escudo de " + players[activePlayerIdx].name + " ha rebotado tu sabotaje y lo has perdido todo jajaja" }); } catch(e){}
                        }
                        hasShield[players[activePlayerIdx].id] = false;
                        syncState();
                        break;
                    }
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 2 && !isFogActive && (!turnPhase || turnPhase === 'NORMAL')) {
                        p.tokens -= 2;
                        isFogActive = true;

                        var activeP = players[activePlayerIdx];
                        var fogPhrases = [
                            "Alguien acaba de soltar una bomba de humo. \u00A1Buena suerte viendo tu carta!",
                            "Parece que Londres ha llegado a tu mesa. \u00A1A ciegas se adivina mejor!",
                            "Esa niebla huele a miedo de tus rivales. B\u00E1jala como puedas.",
                            "\u00A1Cegado! A ver c\u00F3mo apuntas tu ficha sin ver.",
                            "Mucha suerte apostando contra la niebla de guerra..."
                        ];
                        var randomFogPhrase = fogPhrases[Math.floor(Math.random() * fogPhrases.length)];
                        try {
                            if (connections[activeP.id] && connections[activeP.id].open) {
                                connections[activeP.id].send({ type: 'SABOTAGE_MESSAGE', message: randomFogPhrase });
                            }
                        } catch(e) {}

                        document.getElementById('host-instructions').innerHTML = "<span style='color:#aaaaaa; font-size:1.5em; font-family:Bungee;'>¡JAJAJA! ¡" + p.name + " HA LANZADO NIEBLA TEMPORAL!</span>";
                        setTimeout(function () {
                            if (!isRevealed && !panicActive) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                        }, 3000);

                        syncState();
                    }
                    break;
                                                case 'SABOTAGE_BOMB':
                    var p = players.find(function(pl) { return pl.id === peerId; });
                    var target = players.find(function(pl) { return pl.id === value; });
                    if(p && target && p.tokens >= 3) {
                        // Check if p is just passing the bomb for free (cost 0 if passing)
                        var isPassing = hasBomb[p.id];
                        if (!isPassing) {
                            p.tokens -= 3;
                        } else {
                            hasBomb[p.id] = false; // Te la quitas de encima
                        }
                        
                        hasBomb[target.id] = true;
                        
                        try {
                            // Alerta a todos
                            Object.keys(connections).forEach(id => {
                                if(connections[id] && connections[id].open) {
                                    connections[id].send({ type: 'BET_RESULT', msg: "\u00A1" + target.name.toUpperCase() + " TIENE LA BOMBA LAPA PEGADA!" });
                                }
                            });
                        } catch(e) {}
                        syncState();
                    }
                    else if (p && target && hasBomb[p.id]) {
                        // Pasando la bomba sin coste de fichas
                        hasBomb[p.id] = false;
                        hasBomb[target.id] = true;
                        try {
                            Object.keys(connections).forEach(id => {
                                if(connections[id] && connections[id].open) {
                                    connections[id].send({ type: 'BET_RESULT', msg: "\u00A1" + target.name.toUpperCase() + " TIENE LA BOMBA LAPA PEGADA!" });
                                }
                            });
                        } catch(e) {}
                        syncState();
                    }
                    break;
                case 'SABOTAGE_DUEL':
                    var p = players.find(function(pl) { return pl.id === peerId; });
                    var target = players.find(function(pl) { return pl.id === value; });
                    if(p && target && p.tokens >= 2) {
                        p.tokens -= 2;
                        queuedDuel = { p1: p.id, p2: target.id, p1Name: p.name, p2Name: target.name };
                        try {
                            // Alert everyone it was queued
                            Object.keys(connections).forEach(id => {
                                if(connections[id] && connections[id].open) {
                                    connections[id].send({ type: 'BET_RESULT', msg: "\u00A1" + p.name.toUpperCase() + " HA RETADO A DUELO A " + target.name.toUpperCase() + "!" });
                                }
                            });
                        } catch(e) {}
                        syncState();
                    }
                    break;
                case 'SABOTAGE_FORCE_SKIP':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 2 && activeGuess === null && isPlaying && !isRevealed && (!turnPhase || turnPhase === 'NORMAL')) {
                        p.tokens -= 2;

                        var activeP = players[activePlayerIdx];
                        var phrases = [
                            "Alguien ha pensado que esta no era para ti jajaja",
                            "Se te ve\u00EDa muy confiado con esta. \u00A1Saltada por la cara!",
                            "Uy, parece que a alguien no le gusta esa canci\u00F3n para ti...",
                            "\u00A1ZASCA! Te acaban de volatilizar la canci\u00F3n.",
                            "Demasiado f\u00E1cil para ti, a ver la siguiente si tienes lo que hay que tener."
                        ];
                        var randomPhrase = phrases[Math.floor(Math.random() * phrases.length)];
                        try {
                            if (connections[activeP.id] && connections[activeP.id].open) {
                                connections[activeP.id].send({ type: 'SABOTAGE_MESSAGE', message: randomPhrase });
                            }
                        } catch(e) {}
                        isPlaying = false;
                        container.innerHTML = '<div id="youtube-player"></div>';
                        currentSongIdx++; if(songs[currentSongIdx] && songs[currentSongIdx].id) { var _pl = JSON.parse(localStorage.getItem('CB_PlayedSongs') || '[]'); if(!_pl.includes(songs[currentSongIdx].id)){ _pl.push(songs[currentSongIdx].id); localStorage.setItem('CB_PlayedSongs', JSON.stringify(_pl)); } }
                        segundosAcumulados = 0;
                        momentoDeInicio = 0;
                        isRevealed = false;
                        document.getElementById('ui-card-artist').innerText = "????";
                        document.getElementById('ui-card-song').innerText = "????";
                        document.getElementById('ui-card-year').innerText = "????";
                        document.getElementById('btn-reveal-host').style.display = 'block';
                        document.getElementById('val-card-ui').style.display = 'block';
                        document.getElementById('validation-buttons').style.display = 'none';

                        document.getElementById('host-instructions').innerHTML = "<span style='color:#ff00ff; font-size:1.5em; font-family:Bungee;'>¡" + p.name + " HA OBLIGADO A CAMBIAR LA CANCIÓN!</span>";
                        setTimeout(function () {
                            if (!isRevealed && !panicActive) document.getElementById('host-instructions').innerText = "CANCIÓN CAMBIADA (DALE A PLAY)";
                        }, 4000);

                        syncState();
                    }
                    break;
                case 'SABOTAGE_VETO':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 1 && players[activePlayerIdx].canReload && (!turnPhase || turnPhase === 'NORMAL')) {
                        p.tokens -= 1;
                        players[activePlayerIdx].canReload = false;

                        document.getElementById('host-instructions').innerHTML = "<span style='color:#ff8800; font-size:1.5em; font-family:Bungee;'>¡" + p.name + " HA VETADO LA RECARGA!</span>";
                        setTimeout(function () {
                            if (!isRevealed && !panicActive) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                        }, 3000);

                        syncState();
                    }
                    break;
                case 'SABOTAGE_STEAL_TURN':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 4 && isPlaying && !isRevealed) {
                        p.tokens -= 4;
                        var oldActive = players[activePlayerIdx];
                        activePlayerIdx = players.indexOf(p);

                        // Clear bets and guesses because turn changes
                        currentBets = {};
                        activeGuess = null;
                        bettingAgainst = [];

                        document.getElementById('host-instructions').innerHTML = "<span style='color:#00f2fe; font-size:1.5em; font-family:Bungee;'>¡" + p.name + " HA ROBADO EL TURNO A " + oldActive.name + "!</span>";
                        setTimeout(function () {
                            if (!isRevealed && !panicActive) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                        }, 4000);

                        syncState();
                    }
                    break;
                case 'SABOTAGE_BLACKHOLE':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 5 && (!turnPhase || turnPhase === 'NORMAL')) {
                        var validTargets = players.filter(function (t) { return t.id !== p.id && t.score > 1; });
                        if (validTargets.length > 0) {
                            p.tokens -= 5;
                            var target = validTargets[Math.floor(Math.random() * validTargets.length)];
                            target.score -= 1;
                            var cardIdx = Math.floor(Math.random() * target.cards.length);
                            target.cards.splice(cardIdx, 1);

                            document.getElementById('host-instructions').innerHTML = "<span style='color:#9900ff; font-size:1.5em; font-family:Bungee;'>¡" + p.name + " CREÓ UN AGUJERO NEGRO Y DESTRUYÓ UNA CARTA DE " + target.name + "!</span>";
                            setTimeout(function () {
                                if (!isRevealed && !panicActive) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                            }, 4000);
                            syncState();
                        }
                    }
                    break;
                case 'SABOTAGE_STEAL_TOKEN':
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    if (p && p.tokens >= 4) {
                        var possibleTargets = players.filter(function (pt) { return pt.id !== peerId && pt.tokens > 0; });
                        if (possibleTargets.length > 0) {
                            p.tokens -= 4; // Pay the cost
                            var target = possibleTargets[Math.floor(Math.random() * possibleTargets.length)];
                            target.tokens -= 1;
                            p.tokens += 1;

                            // Send target an alert
                            var tConn = connections[target.id];
                            if (tConn) {
                                tConn.send({
                                    type: 'BET_RESULT',
                                    msg: "¡" + p.name + " TE HA ROBADO 1 FICHA! 🥷"
                                });
                            }

                            document.getElementById('host-instructions').innerHTML = "<span style='color:#ffff00; font-size:1.2em;'>¡" + p.name + " HA ROBADO A " + target.name + "!</span>";
                            setTimeout(function () {
                                if (!isRevealed && !panicActive) document.getElementById('host-instructions').innerText = (isMuted ? "REPRODUCIENDO (MUTE)" : "REPRODUCIENDO");
                            }, 3000);

                            syncState();
                        }
                    }
                    break;
                                case 'LEAP_OF_FAITH':
                    if (isLeapOfFaithWindow && !leapOfFaithVictor) {
                        var p = players.find(function (pl) { return pl.id === peerId; });
                        if (p && p.id !== players[activePlayerIdx].id && p.tokens >= 1) {
                            p.tokens -= 1;
                            leapOfFaithVictor = p.id;
                            
                            // Re-assign active player manually for this exact turn
                            activePlayerIdx = players.indexOf(p);
                            
                            // Broadcast an alert saying "X player has stolen the turn blindly!"
                            try {
                                Object.keys(connections).forEach(id => {
                                    if(connections[id] && connections[id].open) {
                                        connections[id].send({ type: 'BET_RESULT', msg: "\u00A1" + p.name.toUpperCase() + " SE HA TIRADO A CIEGAS (" + (isFogActive?"CON":"SIN") + " NIEBLA)!" });
                                    }
                                });
                            } catch(e) {}
                            
                            syncState();
                        }
                    }
                    break;
                                                                case 'MARKET_WILDCARD':
                    var p = players.find(function(pl) { return pl.id === peerId; });
                    if(p && p.id === players[activePlayerIdx].id && p.tokens >= 1 && currentSongIdx < songs.length) {
                        p.tokens -= 1;
                        var songObj = songs[currentSongIdx];
                        try {
                            if(connections[p.id]) connections[p.id].send({ type: 'BET_RESULT', msg: "COMODlN: 50% REVELADO EN PANTALLA." });
                        } catch(e) {}
                        
                        document.getElementById('ui-card-artist').innerText = songObj.artist;
                        document.getElementById('ui-card-artist').style.color = "var(--gold)";
                        syncState();
                    }
                    break;
                case 'MARKET_DECADE':
                    var p = players.find(function(pl) { return pl.id === peerId; });
                    if(p && p.id === players[activePlayerIdx].id && p.tokens >= 1 && currentSongIdx < songs.length) {
                        p.tokens -= 1;
                        var sYear = parseInt(songs[currentSongIdx].year);
                        var decadeStr = "Desconocida";
                        if (!isNaN(sYear)) {
                            decadeStr = Math.floor(sYear / 10) * 10 + "s";
                        }
                        try {
                            if(connections[p.id]) connections[p.id].send({ type: 'BET_RESULT', msg: "PISTA! A\u00F1os " + decadeStr });
                        } catch(e) {}
                        syncState();
                    }
                    break;
                case 'MARKET_SHIELD':
                    var p = players.find(function(pl) { return pl.id === peerId; });
                    if(p && p.tokens >= 3 && !hasShield[p.id]) {
                        p.tokens -= 3;
                        hasShield[p.id] = true;
                        try {
                            if(connections[p.id]) connections[p.id].send({ type: 'BET_RESULT', msg: "ESCUDO ACTIVADO! Tu proximo sabotaje enemigo ser\u00E1 neutralizado." });
                        } catch(e) {}
                        syncState();
                    }
                    break;
                case 'GUESS':
                    console.log("[GUESS] de", peerId, "en slot", value);
                    // Check Duel Block
                    if(activeDuel && peerId !== activeDuel.p1 && peerId !== activeDuel.p2) {
                        return; // Espectadores no apuestan
                    }
                    // Check Duel Block
                    if(activeDuel && peerId !== activeDuel.p1 && peerId !== activeDuel.p2) {
                        return; // Espectadores no apuestan
                    }
                    var p = players.find(function (pl) { return pl.id === peerId; });
                    var valNum = parseInt(value);
                    if (isNaN(valNum)) break;

                    var slotOccupiedByBet = false;
                    for (var pid in currentBets) { if (currentBets[pid] == valNum) slotOccupiedByBet = true; }

                    if (p && p.id === players[activePlayerIdx].id && !slotOccupiedByBet && activeGuess === null && !isRevealed) {
                        console.log("[OK] Marca del activo fijada en", valNum);
                        activeGuess = valNum;
                        syncState();
                    } else {
                        console.log("[FAIL] Guess rechazado. ¿Ya hay marca?", activeGuess !== null);
                    }
                    break;
                case 'KING_SELECT_CARD':
                    if (turnPhase !== 'KING_SELECTION') return;
                    if (peerId === players[activePlayerIdx].id) return; // Rey no puede elegir

                    var indexElegido = parseInt(value);
                    if (indexElegido >= 0 && indexElegido < kingOptions.length) {
                        var cartaElegida = kingOptions[indexElegido];
                        songs[currentSongIdx] = cartaElegida;

                        turnPhase = 'KING_GUESS';
                        document.getElementById('ui-card-artist').innerText = "????";
                        document.getElementById('ui-card-song').innerText = "????";
                        document.getElementById('ui-card-year').innerText = "????";
                        document.getElementById('host-instructions').innerHTML = "CARTA ELEGIDA.<br>ESPERANDO A QUE EL REY INTRODUZCA EL AÑO...";
                        document.getElementById('player-container').innerHTML = '<div id="youtube-player"></div>';
                        syncState();
                    }
                    break;
                case 'KING_GUESS':
                    if (turnPhase !== 'KING_GUESS') return;
                    if (peerId !== players[activePlayerIdx].id) return; // Solo Rey

                    var guessedYear = parseInt(value);
                    if (!isNaN(guessedYear)) {
                        var s = songs[currentSongIdx];
                        var actualYear = parseInt(s.year);

                        document.getElementById('ui-card-artist').innerText = s.artist;
                        document.getElementById('ui-card-song').innerText = s.song;
                        document.getElementById('ui-card-year').innerText = actualYear;

                        var won = Math.abs(guessedYear - actualYear) <= 2;

                        var resultHtml = "";
                        if (won) {
                            resultHtml = "<span style='color:#00ff00; font-size:1.5em;'>¡EL REY ACERTÓ!</span><br>Dijo " + guessedYear + ". (El año era " + actualYear + ").";
                        } else {
                            resultHtml = "<span style='color:#ff4444; font-size:1.5em;'>¡FALLÓ!</span><br>Dijo " + guessedYear + ". (El año era " + actualYear + ").";
                        }
                        resultHtml += "<br><br><button class='btn' style='background:var(--neon); color:#000; padding:15px; font-size:1.2em; pointer-events:auto; position:relative; z-index:9999;' onclick='resolveKingMode(" + won + ")'>ACEPTAR RESULTADO</button>";

                        document.getElementById('host-instructions').innerHTML = resultHtml;
                        document.getElementById('host-instructions').style.pointerEvents = 'auto'; // Permitir click en el div global si está bloqueado

                        turnPhase = 'KING_GUESS_RESULT';
                        syncState();
                    }
                    break;
                case 'REMOTE_START_GAME':
                    startGame();
                    break;
                case 'REMOTE_REVEAL':
                    revealData();
                    break;
                case 'REMOTE_CORRECT':
                    validateResult(true, false);
                    break;
                case 'REMOTE_CORRECT_TOKEN':
                    validateResult(true, true);
                    break;
                case 'REMOTE_INCORRECT':
                    validateResult(false, false);
                    break;
                case 'REMOTE_INCORRECT_TOKEN':
                    validateResult(false, true);
                    break;
                case 'REMOTE_SYSTEM_ERROR':
                    reportSystemError();
                    break;
                case 'REMOTE_JOPUTISMO':
                    if (turnPhase === 'LOBBY' || players.length === 0) {
                        setJoputismo(parseInt(value));
                    }
                    break;
            }
            // Eliminamos el syncState duplicado que podría causar problemas de carrera
        }

        function isSlotCorrect(slotIdx, songYear, timeline) {
            if (timeline.length === 0) return true;
            if (slotIdx === 0) return songYear <= timeline[0];
            if (slotIdx === timeline.length) return songYear >= timeline[timeline.length - 1];
            // En medio
            return (songYear >= timeline[slotIdx - 1] && songYear <= timeline[slotIdx]);
        }

        function resolveKingMode(won) {
            document.getElementById('host-instructions').innerHTML = "CARGANDO SIGUIENTE FASE...";
            if (won && activePlayerIdx < players.length) {
                showWinner(players[activePlayerIdx].name);
            } else {
                activePlayerIdx = (activePlayerIdx + 1) % players.length;
                players[activePlayerIdx].canReload = true;
                nextTurn();
            }
        }

        function reportSystemError() {
            var s = songs[currentSongIdx];
            var newYear = prompt("ERROR EN DATOS: " + s.artist + " - " + s.song + "\nIntroduce el AÑO CORRECTO para registro:");
            if (newYear) {
                var recipient = "xavi.rifa@gmail.com";
                var subject = "CORRECCION CHRONOBEATS: Fila " + s.line;
                var body = "DETECTADO ERROR EN LISTA\n\n" +
                    "Fila: " + s.line + "\n" +
                    "Artista: " + s.artist + "\n" +
                    "Canción: " + s.song + "\n" +
                    "Año en TXT: " + s.year + "\n" +
                    "Año Correcto: " + newYear + "\n\n" +
                    "Instrucciones: Abrir lista_final.txt en la fila " + s.line + " y corregir el año.";

                var mailtoUrl = "mailto:" + recipient + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);

                console.log("!!! ERROR DE SISTEMA DETECTADO !!!");
                console.log("Referencia: " + s.artist + " - " + s.song + " (Fila " + s.line + ")");
                console.log("Corrección: " + s.year + " -> " + newYear);

                window.location.href = mailtoUrl;
                alert("¡Error registrado! Se ha preparado un email para " + recipient + ".\nSe descarta esta canción y repites el turno.");
            }
            nextTurn();
        }

        function revealData() {
            isRevealed = true;
            var s = songs[currentSongIdx];
            document.getElementById('ui-card-artist').innerText = s.artist;
            document.getElementById('ui-card-song').innerText = s.song;
            document.getElementById('ui-card-year').innerText = s.year;
            document.getElementById('btn-reveal-host').style.display = 'none';

            // Validación automática
            var activeP = players[activePlayerIdx];
            var isCorrect = false;
            if (activeGuess !== null) {
                isCorrect = isSlotCorrect(activeGuess, s.year, activeP.cards);
            }

            document.getElementById('validation-buttons').style.display = 'flex';
            if (isCorrect) {
                document.getElementById('host-instructions').innerHTML = "<span style='color:#00ff00; font-size:1.5em;'>¡POSICIÓN CORRECTA! ✅</span><br>¿Detalles?";
                document.getElementById('validation-buttons').innerHTML = `
                    <button class="btn-val btn-ok" onclick="validateResult(true, false)">SÍ</button>
                    <button class="btn-val btn-ok" style="background:#ffd700; color:#000;" onclick="validateResult(true, true)">SÍ (+ 🔵 FICHA)</button>
                    <button class="btn-val btn-fail" style="background:#555;" onclick="reportSystemError()">ERROR SISTEMA</button>
                 `;
            } else {
                document.getElementById('host-instructions').innerHTML = "<span style='color:#ff4444; font-size:1.5em;'>POSICIÓN INCORRECTA ❌</span><br>¿Pero acertó Algo?";
                document.getElementById('validation-buttons').innerHTML = `
                    <button class="btn-val btn-fail" onclick="validateResult(false, false)">NO</button>
                    <button class="btn-val btn-ok" style="background:#00f2fe; color:#000;" onclick="validateResult(false, true)">SÍ (+ 🔵 FICHA)</button>
                    <button class="btn-val btn-fail" style="background:#00f2fe; color:#000; font-size: 0.6em;" onclick="reportSystemError()">ERROR SISTEMA (REPETIR)</button>
                 `;
            }
            syncState();
        }

        function validateResult(isCardOk, isTokenOk) {
            if (isTokenOk && players[activePlayerIdx].tokens < 5) {
                players[activePlayerIdx].tokens++;
            }

            // RESOLVER APUESTAS "NI DE COÑA"
            if (bettingAgainst && bettingAgainst.length > 0) {
                if (isCardOk) {
                    // El jugador activo ACIERTA: los que apostaron pierden.
                    var losesPhrases = [
                        "Has dudado de un puto experto... y has perdido.",
                        "¿Ni de coña? Ni de coña vas a recuperar esa ficha, pringao.",
                        "Para la próxima te callas. El maestro sabe lo que hace.",
                        "A llorar a la llorería. Esa ficha es historia.",
                        "Has apostado contra Dios y te has quemado.",
                        "¿Te creías muy listo, eh? Pues toma zasca en toda la boca.",
                        "Poca fe para tanta ignorancia. Ficha perdida.",
                        "Silencio en la sala. Ha hablado el puto amo del tiempo.",
                        "Tu envidia alimenta su victoria. Menos 1 ficha para ti.",
                        "¿En serio pensabas que iba a fallar? Qué pardillo.",
                        "Nunca apuestes contra el jefe, novato.",
                        "Te has comido el amago entero. Despídete de la ficha.",
                        "Mucha boquita pero poca ficha te queda.",
                        "Con esa intuición de mierda normal que pierdas fichas.",
                        "Vaya patinazo. Esa masterclass te ha costado una ficha.",
                        "Has ido a por lana y has salido trasquilado.",
                        "Te ha retratado. Sigue mirando y aprende.",
                        "Ni de coña tienes tú tanto nivel. Ficha al pozo.",
                        "Acaso pensabas que dudar del amo del juego te iba a salir gratis?",
                        "Te pones chulito y te quedas sin blanca. Clásico.",
                        "Esa ficha era tuya, ahora es solo un mal recuerdo.",
                        "¿Querías sangre? Toma dos tazas de humillación.",
                        "Le has tirado un órdago y te ha sacado la chorra.",
                        "El rey no se mancha las manos con plebeyos como tú.",
                        "Has tropezado con la piedra de su sabiduría.",
                        "Ficha denegada por listillo. A tu cueva.",
                        "Te la ha clavado por la escuadra. A pastar.",
                        "Tu intento de sabotaje da más pena que otra cosa.",
                        "Otra fichita pal bote. Gracias por la donación, pringao.",
                        "Te iba a devolver la ficha por pena, pero mejor me la quedo.",
                        "Cárgate de paciencia, porque de fichas vas justito.",
                        "El oráculo musical ataca de nuevo. Tú agacha la cabeza.",
                        "Ni con un DeLorean aciertas tú tantas veces. Asúmelo.",
                        "Ojo al dato: acabas de perder una ficha contra el mejor.",
                        "Sigue apostando en contra, a ver si así te arruinas antes.",
                        "Dudar de un dios solo trae castigos divinos en forma de fichas.",
                        "¿Te sobra el dinero? Porque las fichas azules parece que las regalas.",
                        "Has intentado hacerle el lío al máster y has cobrado tú.",
                        "Por favor, un aplauso para el que acaba de perder otra ficha absurda.",
                        "El rey manda, tú pagas la entrada al espectáculo.",
                        "La próxima vez guarda la ficha, que igual te hace falta para no dar pena.",
                        "Que ponga la música y tú pones las fichas perdidas. Trato justo."
                    ];
                    bettingAgainst.forEach(function (pid) {
                        if (connections[pid]) {
                            var msg = losesPhrases[Math.floor(Math.random() * losesPhrases.length)];
                            connections[pid].send({ type: 'BET_RESULT', msg: "JAJAJAJA...\n\n" + msg });
                        }
                    });
                } else {
                    // El jugador activo FALLA: los que apostaron ganan +3 fichas.
                    bettingAgainst.forEach(function (pid) {
                        var p = players.find(x => x.id === pid);
                        if (p) {
                            p.tokens += 3;
                            if (p.tokens > 5) p.tokens = 5; // Limite de 5 fichas
                            if (connections[pid]) {
                                connections[pid].send({ type: 'BET_RESULT', msg: "¡SABÍAS QUE IBA A FALLAR Y HAS GANADO!\n\nRecompensa: +3 FICHAS AZULES." });
                            }
                        }
                    });
                }
            }

            if (isCardOk) {
                players[activePlayerIdx].score++;
                players[activePlayerIdx].cards.push(songs[currentSongIdx].year);
                players[activePlayerIdx].cards.sort();
                if (players[activePlayerIdx].score >= 10 && gameMode === 'normal') {
                    showWinner(players[activePlayerIdx].name);
                    return;
                }
                activePlayerIdx = (activePlayerIdx + 1) % players.length;
                players[activePlayerIdx].canReload = true;
                nextTurn();
            } else {
                // Si no hay carta para el activo, ver si hay robos
                var challengersExist = Object.keys(currentBets).length > 0;
                var anyChallengerCorrect = false;
                for (var pid in currentBets) {
                    if (isSlotCorrect(currentBets[pid], songs[currentSongIdx].year, players[activePlayerIdx].cards)) anyChallengerCorrect = true;
                }

                if (challengersExist && anyChallengerCorrect) {
                    document.getElementById('host-instructions').innerText = "VAMOS A LAS APUESTAS...";
                    document.getElementById('validation-buttons').style.display = 'none';
                    document.getElementById('challenger-validation').style.display = 'block';
                    var h = "";
                    for (var pid in currentBets) {
                        var p = players.find(x => x.id === pid);
                        var s = songs[currentSongIdx];
                        var slotCorrect = isSlotCorrect(currentBets[pid], s.year, players[activePlayerIdx].cards);

                        if (p && slotCorrect) {
                            h += '<button class="btn-val" style="background:var(--gold); color:#000; border: 2px solid #00ff00;" onclick="awardToChallenger(\'' + pid + '\')">' + p.name + ' GANÓ LA APUESTA (✅)</button>';
                        } else if (p) {
                            h += '<button class="btn-val" style="background:#555; color:#888; cursor:not-allowed;" disabled>' + p.name + ' FALLÓ (❌)</button>';
                        }
                    }
                    document.getElementById('challenger-buttons').innerHTML = h;
                } else {
                    activePlayerIdx = (activePlayerIdx + 1) % players.length;
                    players[activePlayerIdx].canReload = true; // Resetear permiso de recarga
                    nextTurn();
                }
            }
        }

        function awardToChallenger(pid) {
            var p = players.find(x => x.id === pid);
            if (p) {
                p.score++;
                p.cards.push(songs[currentSongIdx].year);
                p.cards.sort();
                if (p.score >= 10 && gameMode === 'normal') {
                    showWinner(p.name);
                    return;
                }
            }
            activePlayerIdx = (activePlayerIdx + 1) % players.length;
            players[activePlayerIdx].canReload = true;
            nextTurn();
        }

        function showWinner(name) {
            console.log("Celebrando victoria de:", name);
            document.getElementById('winner-name').innerText = name;

            // Mostrar avatar del ganador
            var winner = players.find(p => p.name === name);
            var avatarHtml = '';
            if (winner && winner.avatar) {
                avatarHtml = '<img src="' + winner.avatar + '" style="width:200px; height:200px; border-radius:50%; border: 5px solid var(--neon); box-shadow: 0 0 30px var(--neon); object-fit: cover;">';
            } else {
                var initial = name.charAt(0).toUpperCase();
                avatarHtml = '<div style="width:150px; height:150px; border-radius:50%; background:#222; border:5px solid var(--neon); color:var(--neon); display:inline-flex; align-items:center; justify-content:center; font-family:\'Bungee\'; font-size:4em; box-shadow: 0 0 30px var(--neon);">' + initial + '</div>';
            }
            document.getElementById('winner-avatar-img').innerHTML = avatarHtml;

            document.getElementById('winner-screen').style.display = 'flex';

            // Limpiar confeti previo si existe
            if (window.victoryInterval) clearInterval(window.victoryInterval);

            // V26.3: Integración de IDs Verificados por el Usuario
            var isXavi = name.toLowerCase().includes('xavi');
            var songId = "";
            var songTitle = "";

            if (isXavi) {
                songId = '04854XqcfCY'; // Queen - We Are The Champions
                songTitle = "Queen - We Are The Champions";
            } else {
                // El "Pool de la Frikada" (V26.3 - IDs proporcionados por el usuario)
                var frikiPool = [
                    { id: 'wfeCIvOxXBo', t: "Rodolfo Chikilicuatre - Chiki Chiki" },
                    { id: '5mKKc2F0GbQ', t: "El Koala - Opá" },
                    { id: '62Z8vUIk9s8', t: "Zapato Veloz - Tractor Amarillo" },
                    { id: 'lTxGto9ADx0', t: "Georgie Dann - La Barbacoa" },
                    { id: 'arZZw8NyPq8', t: "Las Ketchup - Aserejé" },
                    { id: 'd21lBEXv6RE', t: "Leonardo Dantés - Pañuelo" },
                    { id: 'WCQuf90qf9U', t: "King África - La Bomba" },
                    { id: 'tUHtrE533X4', t: "Mandangastyle" },
                    { id: 'YMlDlM7lvO0', t: "Paco Pil - Viva la Fiesta" }
                ];
                var picked = frikiPool[Math.floor(Math.random() * frikiPool.length)];
                songId = picked.id;
                songTitle = picked.t;
            }

            console.log("Ganador:", name, "| Sonando:", songTitle);

            // Usar el contenedor de video para sonar (oculto)
            var container = document.getElementById('player-container');
            container.innerHTML = '<iframe src="https://www.youtube.com/embed/' + songId + '?autoplay=1&mute=0&enablejsapi=1&playsinline=1" allow="autoplay; encrypted-media" style="width:300px;height:200px;border:none;"></iframe>';

            // Confeti (Efectos V26)
            if (isXavi) {
                // V26: Confeti INFINITO para Xavi
                var defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 2000 };
                function randomInRange(min, max) { return Math.random() * (max - min) + min; }

                window.victoryInterval = setInterval(function () {
                    confetti(Object.assign({}, defaults, { particleCount: 40, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
                    confetti(Object.assign({}, defaults, { particleCount: 40, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
                }, 300);
            }
        }

        function syncState() {
            var leaderName = "---";
            var leaderScore = 0;
            if (players.length > 0) {
                var leader = players.reduce(function (prev, current) {
                    return (prev.score > current.score) ? prev : current;
                });
                leaderName = leader.name;
                leaderScore = leader.score;
            }

            var currentJudgeId = 'ALL';
            if (document.getElementById('lobby').style.display === 'none' && players.length > 0) {
                var judgeIdx = (activePlayerIdx + 1) % players.length;
                currentJudgeId = players[judgeIdx].id;
            }

            for (var id in connections) {
                var p = players.find(p => p.id === id);
                var state = {
                    type: 'STATE_UPDATE',
                    activePlayer: { id: players[activePlayerIdx] ? players[activePlayerIdx].id : null, name: players[activePlayerIdx] ? players[activePlayerIdx].name : null },
                    judgeId: currentJudgeId,
                    leader: { name: leaderName, score: leaderScore },
                    currentTrack: songs[currentSongIdx],
                    revealed: isRevealed,
                    isPlaying: isPlaying,
                    isMuted: isMuted,
                    muteTimeRemaining: muteTimeRemaining,
                    panicActive: panicActive,
                    panicTimer: panicTimer,
                    isFogActive: isFogActive,
                    joputismoLevel: joputismoLevel,
                    bettingAgainst: bettingAgainst,
                    myCards: p ? p.cards : [],
                    myTokens: p ? p.tokens : 0,
                    canReload: p ? p.canReload : false,
                    activeTimeline: players[activePlayerIdx] ? players[activePlayerIdx].cards : [],
                    currentBets: currentBets,
                    activeGuess: activeGuess,
                    kingOptions: kingOptions,
                    cheatsEnabled: cheatsEnabled,
                    turnPhase: turnPhase
                };
                try {
                    if (connections[id] && connections[id].open) {
                        connections[id].send(state);
                    }
                } catch (e) {
                    console.warn("No se pudo enviar estado a", id, e);
                }
            }
            updateUI();
        }

        function updateUI() {
            var h = ""; players.slice().sort(function (a, b) { return b.score - a.score }).forEach(function (p) {
                var chipsHtml = ""; for (var i = 0; i < p.tokens; i++) chipsHtml += '<span class="neon-chip"></span>';

                var avatarHtml = '';
                if (p.avatar) {
                    avatarHtml = '<img src="' + p.avatar + '" style="width:25px; height:25px; border-radius:50%; vertical-align:middle; margin-right:8px; border:1px solid ' + (p.id === players[activePlayerIdx].id ? 'var(--neon)' : '#555') + ';">';
                }

                h += '<div class="leader-item ' + (p.id === players[activePlayerIdx].id ? 'active' : '') + '" style="align-items:center;"><span>' + avatarHtml + p.name + ' (' + chipsHtml + ')</span><span class="score">' + p.score + ' p</span></div>';
            });
            document.getElementById('leaderboard-list').innerHTML = h;

            // Mostrar cartas del jugador actual en el centro
            var currentCardsHtml = "";
            players[activePlayerIdx].cards.forEach(function (year) {
                currentCardsHtml += '<div class="mini-card">' + (isFogActive ? '????' : year) + '</div>';
            });
            document.getElementById('active-player-inventory').innerHTML = currentCardsHtml;

            var timelinesHtml = ""; players.forEach(function (p) {
                timelinesHtml += '<div class="player-row"><div style="font-size:0.6em;color:#888;">' + p.name + '</div><div class="slots">';
                for (var k = 0; k < 10; k++) timelinesHtml += '<div class="slot ' + (p.cards[k] ? 'filled' : '') + '">' + (p.cards[k] ? (isFogActive ? '????' : p.cards[k]) : '') + '</div>';
                timelinesHtml += '</div></div>';
            });
            document.getElementById('global-timelines').innerHTML = timelinesHtml;
        }    
        function reportBrokenLink() {
            var s = songs[currentSongIdx];
            if (!s || !s.id) return;
            var url = 'https://www.youtube.com/watch?v=' + s.id;
            var listType = s.type ? s.type : 'General';
            
            fetch('reporte_error.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: url, tipo: listType })
            }).then(function(r){ return r.json()}).then(function(data){
                alert('URL reportada como rota. Gasta un Token de Recarga si tienes para saltarla.');
                var btn = document.getElementById('btn-report-error');
                if(btn) btn.style.display = 'none';
            }).catch(function(e){
                console.error(e);
                alert('Aviso guardado.');
            });
        }
    

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('Service Worker registrado', reg))
                    .catch(err => console.log('Error registrando SW', err));
            });
        }
    

