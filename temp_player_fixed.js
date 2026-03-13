
        function toggleRules() {
            var el = document.getElementById('rules-overlay');
            el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'flex' : 'none';
        }
        function toggleRemote() {
            var el = document.getElementById('remote-overlay');
            el.style.display = (el.style.display === 'none' || el.style.display === '') ? 'flex' : 'none';
        }
    

        var peer, conn, myId, playerName;
        var lastState = null;
        var playerAvatarDataUrl = null;

        // Cargar datos guardados al iniciar
        window.addEventListener('load', function () {
            var savedName = localStorage.getItem('cb_player_name');
            if (savedName) {
                document.getElementById('player-name').value = savedName;
            }
            var savedAvatar = localStorage.getItem('cb_player_avatar');
            if (savedAvatar) {
                playerAvatarDataUrl = savedAvatar;
                document.getElementById('avatar-preview').src = savedAvatar;
                document.getElementById('avatar-preview').style.display = 'block';
                document.getElementById('avatar-placeholder').style.display = 'none';
            }
        });

        function handleAvatarSelect(event) {
            var file = event.target.files[0];
            if (!file) return;

            var reader = new FileReader();
            reader.onload = function (e) {
                var img = new Image();
                img.onload = function () {
                    // Comprimir la imagen usando canvas
                    var canvas = document.createElement('canvas');
                    var MAX_SIZE = 150;
                    var width = img.width;
                    var height = img.height;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    var ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);

                    // Convertir a base64 calidad 0.7
                    playerAvatarDataUrl = canvas.toDataURL('image/jpeg', 0.7);

                    document.getElementById('avatar-preview').src = playerAvatarDataUrl;
                    document.getElementById('avatar-preview').style.display = 'block';
                    document.getElementById('avatar-placeholder').style.display = 'none';

                    // Guardar en localStorage
                    localStorage.setItem('cb_player_avatar', playerAvatarDataUrl);

                    // Transformar a Toon automáticamente
                    toonifyAvatar();
                };
                img.src = e.target.result;
            };
            reader.readAsDataURL(file);
        }

        async function toonifyAvatar() {
            if (!playerAvatarDataUrl) return;

            const overlay = document.getElementById('ai-loading-overlay');
            overlay.style.display = 'flex';

            try {
                // Escalar imagen a 512px para Pollinations (optimizar subida)
                const scaledDataUrl = await new Promise(resolve => {
                    const img = new Image();
                    img.onload = function () {
                        const MAX = 512;
                        const scale = Math.min(MAX / img.width, MAX / img.height, 1);
                        const canvas = document.createElement('canvas');
                        canvas.width = Math.round(img.width * scale);
                        canvas.height = Math.round(img.height * scale);
                        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
                        resolve(canvas.toDataURL('image/jpeg', 0.85));
                    };
                    img.src = playerAvatarDataUrl;
                });

                // --- FILTRO DE COLOR NEÓN DEL TEMA NORMAL (AZUL/CYAN) ---

                const img = new Image();
                img.src = playerAvatarDataUrl;
                await new Promise(r => {
                    img.onload = r;
                    img.onerror = r;
                });

                const canvas = document.createElement('canvas');
                const MAX_SIZE = 400;
                let cWidth = img.width;
                let cHeight = img.height;
                if (cWidth > cHeight && cWidth > MAX_SIZE) {
                    cHeight *= MAX_SIZE / cWidth;
                    cWidth = MAX_SIZE;
                } else if (cHeight > MAX_SIZE) {
                    cWidth *= MAX_SIZE / cHeight;
                    cHeight = MAX_SIZE;
                }

                canvas.width = cWidth;
                canvas.height = cHeight;
                const ctx = canvas.getContext('2d');

                // 1. Dibujar en escala de grises y alto contraste
                ctx.filter = 'grayscale(100%) contrast(1.4) brightness(1.2)';
                ctx.drawImage(img, 0, 0, cWidth, cHeight);
                ctx.filter = 'none';

                // 2. Teñir con el color Azul Cyan del tema Normal
                ctx.globalCompositeOperation = 'color';
                ctx.fillStyle = 'rgba(0, 200, 255, 0.8)';
                ctx.fillRect(0, 0, cWidth, cHeight);

                // Mezclar un poco de luz (Tono neón vibrante)
                ctx.globalCompositeOperation = 'overlay';
                ctx.fillStyle = 'rgba(0, 200, 255, 0.3)';
                ctx.fillRect(0, 0, cWidth, cHeight);

                // 3. Viñeta oscura
                ctx.globalCompositeOperation = 'multiply';
                const grd = ctx.createRadialGradient(cWidth / 2, cHeight / 2, cWidth * 0.3, cWidth / 2, cHeight / 2, cWidth * 0.9);
                grd.addColorStop(0, "white");
                grd.addColorStop(1, "rgba(10, 10, 10, 0.9)");
                ctx.fillStyle = grd;
                ctx.fillRect(0, 0, cWidth, cHeight);

                playerAvatarDataUrl = canvas.toDataURL('image/jpeg', 0.9);
                document.getElementById('avatar-preview').src = playerAvatarDataUrl;
                localStorage.setItem('cb_player_avatar', playerAvatarDataUrl);

                // Notify host immediately if already connected
                if (window.conn && window.conn.open) {
                    window.conn.send({ type: 'AVATAR_UPDATE', name: playerName, avatar: playerAvatarDataUrl });
                }

                await new Promise(r => setTimeout(r, 400));

            } catch (err) {
                console.error('Pollinations toon error:', err);
                alert("Error creando versión cómic: " + err.message);
            } finally {
                overlay.style.display = 'none';
            }
        } function showCustomAlert(msg) {
            document.getElementById('custom-alert-msg').innerText = msg;
            document.getElementById('custom-alert').style.display = 'flex';
        }

        function showCustomConfirm(msg, callback) {
            document.getElementById('custom-confirm-msg').innerText = msg;
            var confirmDialog = document.getElementById('custom-confirm');
            var btnYes = document.getElementById('custom-confirm-yes');
            var btnNo = document.getElementById('custom-confirm-no');

            // Remove previous event listeners
            var newBtnYes = btnYes.cloneNode(true);
            var newBtnNo = btnNo.cloneNode(true);
            btnYes.parentNode.replaceChild(newBtnYes, btnYes);
            btnNo.parentNode.replaceChild(newBtnNo, btnNo);

            newBtnYes.addEventListener('click', function () {
                confirmDialog.style.display = 'none';
                callback(true);
            });

            newBtnNo.addEventListener('click', function () {
                confirmDialog.style.display = 'none';
                callback(false);
            });

            confirmDialog.style.display = 'flex';
        }

        function conectar() {
            var hostId = document.getElementById('host-id').value.toUpperCase().trim();
            hostId = hostId.replace('CB-HOST-', '').replace('CB-ANIME-HOST-', '').replace('CB-MOVIES-HOST-', '');
            playerName = document.getElementById('player-name').value.trim();
            if (!hostId || !playerName) return showCustomAlert("Rellena los datos para continuar.");

            // Si no tiene avatar, preguntarle una vez
            if (!playerAvatarDataUrl) {
                showCustomConfirm("¿Quieres hacerte un selfie para tu avatar antes de entrar?", function (confirmed) {
                    if (confirmed) {
                        document.getElementById('avatar-input').click();
                    } else {
                        realizarConexion(hostId);
                    }
                });
            } else {
                realizarConexion(hostId);
            }
        }

        function realizarConexion(hostId) {
            // Guardar nombre en localStorage
            localStorage.setItem('cb_player_name', playerName);

            var btn = document.getElementById('join-btn');
            btn.disabled = true;
            btn.innerText = "CONECTANDO...";

            peer = new Peer({
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
                myId = id;
                console.log("Conectando con ID Peer:", id);
                conn = peer.connect("CB-HOST-" + hostId);

                conn.on('open', function () {
                    console.log("¡Conectado!");
                    conn.send({ type: 'JOIN', name: playerName, avatar: playerAvatarDataUrl });
                    document.getElementById('login-screen').style.display = 'none';
                    document.getElementById('game-screen').style.display = 'flex';
                    initCheatSystem();
                });

                conn.on('data', handle);

                conn.on('close', function () {
                    showCustomAlert("Conexión cerrada. El Host se ha desconectado.");
                    setTimeout(() => location.reload(), 3000);
                });
            });

            peer.on('error', function (err) {
                console.error("Error PeerJS:", err);
                showCustomAlert("Error de conexión: " + err.type);
                btn.disabled = false;
                btn.innerText = "ENTRAR";
            });
        }

        function send(action, value) {
            if (conn && conn.open) {
                conn.send({ type: 'COMMAND', action: action, value: value });
            } else {
                showCustomAlert("Conexión perdida. Recarga la página.");
            }
        }

        function handle(data) {
            console.log("Evento:", data.type, data);

            if (data.type === 'BET_RESULT') {
                showCustomAlert(data.msg);
                return;
            }

            // Retroalimentación de trucos para Xavi
            if (data.type === 'STATE_UPDATE' && lastState && playerName.toLowerCase() === 'xavi') {
                if (data.cheatsEnabled !== lastState.cheatsEnabled) {
                    const indicator = document.getElementById('cheat-indicator');
                    indicator.innerText = data.cheatsEnabled ? "TRUCOS ON" : "TRUCOS OFF";
                    indicator.style.background = data.cheatsEnabled ? "var(--neon)" : "var(--accent)";
                    indicator.style.display = "block";
                    setTimeout(() => { indicator.style.display = "none"; }, 2000);
                }
            }

            lastState = data;
            if (data.type === 'SABOTAGE_MESSAGE') {
                showCustomAlert(data.message);
                return;
            }

            if (data.type === 'STATE_UPDATE') {
                // Populate Duel List
                if (data.players) {
                    var duelListHtml = "";
                    data.players.forEach(function (p) {
                        if (p.id !== myId) {
                            duelListHtml += '<button class="btn" style="background:#222; border:1px solid var(--neon);" onclick="send(\'SABOTAGE_DUEL\', \'' + p.id + '\'); document.getElementById(\'duel-player-select\').style.display=\'none\';">Duelo vs ' + p.name + '</button>';
                        }
                    });
                    var listContainer = document.getElementById('duel-player-list');
                    if (listContainer) listContainer.innerHTML = duelListHtml;
                    var bombListHtml = "";
                    data.players.forEach(function (p) {
                        if (p.id !== myId) {
                            bombListHtml += '<button class="btn" style="background:#550000; border:1px solid #ff3333;" onclick="send(\'SABOTAGE_BOMB\', \'' + p.id + '\'); document.getElementById(\'bomb-player-select\').style.display=\'none\';">Pasar a ' + p.name + '</button>';
                        }
                    });
                    var bombContainer = document.getElementById('bomb-player-list');
                    if (bombContainer) bombContainer.innerHTML = bombListHtml;
                }
                const leapBtn = document.getElementById('leap-container');
                if (leapBtn) {
                    var amIActive = false;
                    try {
                        var myNameBlock = document.getElementById('player-name').innerText;
                        var pData = data.players || [];
                        var activeP = pData[data.activePlayerIdx] || pData[0];
                        if (activeP && activeP.name && myNameBlock.includes(activeP.name)) {
                            amIActive = true;
                        }
                    } catch (e) { }

                    var tokensBlock = document.getElementById('token-container').innerText;
                    var hasTokens = tokensBlock.includes("1") || tokensBlock.includes("2") || tokensBlock.includes("3") || tokensBlock.includes("4") || tokensBlock.includes("5") || tokensBlock.includes("6") || tokensBlock.includes("7") || tokensBlock.includes("8") || tokensBlock.includes("9");

                    if (data.isLeapOfFaithWindow && !amIActive && hasTokens) {
                        leapBtn.style.display = 'block';
                    } else {
                        leapBtn.style.display = 'none';
                    }
                }
                document.getElementById('login-screen').style.display = 'none';
                document.getElementById('game-screen').style.display = 'flex';
                document.getElementById('cur-player').innerText = data.activePlayer && data.activePlayer.name ? data.activePlayer.name : "---";

                // LOGICA DEL MANDO HOST
                var fab = document.getElementById('fab-remote');
                var rContainer = document.getElementById('remote-controls-container');
                if (data.judgeId === 'ALL' || data.judgeId === myId) {
                    fab.style.display = 'flex';
                    fab.style.filter = 'none';
                    fab.style.opacity = '1';
                    fab.style.pointerEvents = 'auto';
                    fab.style.borderColor = 'var(--neon)';
                    fab.style.boxShadow = '0 0 15px var(--neon)';

                    // Render Contextual Buttons
                    if (data.judgeId === 'ALL') {
                        var currJop = data.joputismoLevel || 0;
                        var jstr = "";
                        jstr += "<h4 style='color:var(--neon); font-family:Bungee; font-size:1em; margin-bottom:5px; margin-top:0'>NIVEL JOPUTISMO:</h4>";
                        jstr += "<div style='display:flex; gap:5px; margin-bottom: 20px; justify-content:center;'>";
                        jstr += "<button class='btn' style='padding:10px; font-size:0.8em; flex:1; " + (currJop === 0 ? "background:var(--neon);color:#000;" : "background:#222;color:#888") + "' onclick=\"send('REMOTE_JOPUTISMO', 0)\">LOSER</button>";
                        jstr += "<button class='btn' style='padding:10px; font-size:0.8em; flex:1; " + (currJop === 1 ? "background:var(--neon);color:#000;" : "background:#222;color:#888") + "' onclick=\"send('REMOTE_JOPUTISMO', 1)\">TROLL</button>";
                        jstr += "<button class='btn' style='padding:10px; font-size:0.8em; flex:1; " + (currJop === 2 ? "background:var(--neon);color:#000;" : "background:#222;color:#888") + "' onclick=\"send('REMOTE_JOPUTISMO', 2)\">SUPERMAN</button>";
                        jstr += "</div>";

                        rContainer.innerHTML = jstr + `<button class="btn" style="background:#ff00ff; color:white; border-color:#ff00ff; padding:20px; font-size:1.2em;" onclick="send('REMOTE_START_GAME'); toggleRemote();">▶ INICIAR PARTIDA</button>`;
                    } else if (data.turnPhase && data.turnPhase !== 'NORMAL') {
                        rContainer.innerHTML = `<p style="color:#888;">Controles no disponibles durante evento especial.</p>`;
                    } else {
                        if (!data.revealed) {
                            rContainer.innerHTML = `<button class="btn" style="background:var(--neon); color:#000; padding:20px; font-size:1.2em;" onclick="send('REMOTE_REVEAL'); toggleRemote();">👀 REVELAR CARTA</button>
                            <button class="btn" style="background:#555; color:white; border-color:#555; margin-top:20px;" onclick="send('REMOTE_SYSTEM_ERROR'); toggleRemote();">ERROR DE SISTEMA (REPETIR)</button>`;
                        } else {
                            rContainer.innerHTML = `
                                <button class="btn" style="background:#00ff00; color:#000; padding:15px; margin-bottom:10px;" onclick="send('REMOTE_CORRECT'); toggleRemote();">✅ SÍ (Acertó y gana carta)</button>
                                <button class="btn" style="background:#ffd700; color:#000; padding:15px; margin-bottom:10px;" onclick="send('REMOTE_CORRECT_TOKEN'); toggleRemote();">🔵 SÍ (+ Ficha Azul)</button>
                                <button class="btn" style="background:#ff4444; color:#fff; padding:15px; margin-bottom:10px;" onclick="send('REMOTE_INCORRECT'); toggleRemote();">❌ NO (Falló todo)</button>
                                <button class="btn" style="background:#00f2fe; color:#000; padding:15px; margin-bottom:10px;" onclick="send('REMOTE_INCORRECT_TOKEN'); toggleRemote();">🔵 NO (+ Ficha Consolación)</button>
                                <button class="btn" style="background:#555; color:white; border-color:#555; margin-top:20px;" onclick="send('REMOTE_SYSTEM_ERROR'); toggleRemote();">ERROR SISTEMA</button>
                            `;
                        }
                    }
                } else {
                    fab.style.display = 'flex';
                    fab.style.filter = 'grayscale(100%)';
                    fab.style.opacity = '0.3';
                    fab.style.pointerEvents = 'none';
                    fab.style.borderColor = '#555';
                    fab.style.boxShadow = 'none';
                    document.getElementById('remote-overlay').style.display = 'none';
                }

                if (data.leader) {
                    document.getElementById('lb-leader-name').innerText = data.leader.name;
                    document.getElementById('lb-leader-cards').innerText = data.leader.score;
                }
                if (data.myCards) {
                    document.getElementById('lb-me-cards').innerText = data.myCards.length;
                }

                // Identificar si es mi turno usando el ID de PeerJS
                var isMyTurn = (data.activePlayer.id === myId);
                console.log("¿Es mi turno?", isMyTurn, "Mi ID:", myId, "ID Activo:", data.activePlayer.id);

                var isKingMode = (data.turnPhase && data.turnPhase !== 'NORMAL');
                var normalCardContainer = document.getElementById('normal-card-container');
                var normalCollection = document.getElementById('normal-collection');
                var kingModeUi = document.getElementById('king-mode-ui');

                if (isKingMode) {
                    normalCardContainer.style.display = 'none';
                    normalCollection.style.display = 'none';
                    kingModeUi.style.display = 'flex';

                    if (data.turnPhase === 'KING_SELECTION') {
                        if (isMyTurn) {
                            kingModeUi.innerHTML = "<h3 style='color:var(--gold);font-family:Bungee;'>ERES EL REY</h3><p>EL RESTO DE JUGADORES ESTÁ ELIGIENDO TU CARTA...</p>";
                        } else {
                            var html = "<h3 style='color:var(--neon);font-family:Bungee;'>¡ELIGE LA CARTA MÁS DIFÍCIL!</h3>";
                            if (data.kingOptions) {
                                data.kingOptions.forEach(function (opt, idx) {
                                    html += "<div style='background:#111; border:1px solid var(--neon); border-radius:10px; padding:10px; margin-bottom:10px; text-align:left;'>";
                                    html += "<span style='color:#00f2fe; font-family:Bungee; font-size:1.2em; margin-right:10px;'>#" + (idx + 1) + "</span>";
                                    html += "<span style='font-size:0.8em; color:#aaa;'>" + opt.artist + "</span><br>";
                                    html += "<strong style='font-family:Bungee;'>" + opt.song + "</strong><br>";
                                    html += "<span style='color:var(--accent); font-family:Bungee; font-size:1.2em;'>" + opt.year + "</span>";
                                    html += "<button class='btn' style='margin-top:10px; padding:10px; font-size:1em;' onclick=\"send('KING_SELECT_CARD', " + idx + ")\">¡ELEGIR ESTA!</button>";
                                    html += "</div>";
                                });
                            }
                            kingModeUi.innerHTML = html;
                        }
                    } else if (data.turnPhase === 'KING_GUESS') {
                        if (isMyTurn) {
                            var html = "<h3 style='color:var(--gold);font-family:Bungee;'>¡ADIVINA EL AÑO!</h3>";
                            html += "<p style='font-size:0.8em; color:var(--neon); margin-bottom:15px;'>(Escucha la canción. Margen de error: +/- 2 años)</p>";
                            html += "<input type='number' id='king-guess-input' placeholder='AÑO' style='font-size:1.5em; text-align:center;'>";
                            html += "<button class='btn' style='margin-top:10px;' onclick=\"var y = document.getElementById('king-guess-input').value; if(y) send('KING_GUESS', y);\">CONFIRMAR AÑO</button>";
                            kingModeUi.innerHTML = html;
                        } else {
                            kingModeUi.innerHTML = "<h3 style='color:var(--neon);font-family:Bungee;'>CARTA ENVIADA</h3><p>EL REY ESTÁ ADIVINANDO EL AÑO...</p>";
                        }
                    } else if (data.turnPhase === 'KING_GUESS_RESULT') {
                        var html = "<h3 style='color:var(--gold);font-family:Bungee;'>RESULTADO</h3>";
                        html += "<p style='font-size:0.8em;color:#aaa;'>" + data.currentTrack.artist + "</p>";
                        html += "<p style='font-family:Bungee;font-size:1.2em; border-bottom:1px solid #333; padding-bottom:10px;'>" + data.currentTrack.song + "</p>";
                        html += "<p style='font-family:Bungee;font-size:2em; color:var(--neon); margin-bottom:15px;'>" + data.currentTrack.year + "</p>";
                        kingModeUi.innerHTML = html;
                    }
                } else {
                    normalCardContainer.style.display = 'flex';
                    normalCollection.style.display = 'block';
                    kingModeUi.style.display = 'none';
                    kingModeUi.innerHTML = '';
                }

                // Control de visibilidad de bloques de mando
                var showMusic = isMyTurn;
                if (data.turnPhase === 'KING_SELECTION') showMusic = false; // Nadie tiene música en este punto

                document.getElementById('m-ctrl').style.display = showMusic ? 'grid' : 'none';
                document.getElementById('s-ctrl').style.display = showMusic ? 'grid' : 'none';

                // Botones Especiales (Solo mi turno y si no está revelada Y no en modo rey)
                var specialCtrl = document.getElementById('special-ctrl');
                var sabotageCtrl = document.getElementById('sabotage-ctrl');
                if (isMyTurn && !data.revealed && (!data.turnPhase || data.turnPhase === 'NORMAL')) {
                    specialCtrl.style.display = 'flex';
                    sabotageCtrl.style.display = 'none';
                    // COMPRAR (Solo si NO está sonando)
                    document.getElementById('btn-autowin').style.display = (!data.isPlaying) ? 'block' : 'none';
                    // ERROR VIDEO (Solo si SI está sonando)
                    document.getElementById('btn-error-track').style.display = (data.isPlaying) ? 'block' : 'none';
                    // CAMBIAR (Solo si SÍ está sonando y NO ha cambiado ya)
                    document.getElementById('btn-reload').style.display = (data.isPlaying && data.canReload) ? 'block' : 'none';
                } else {
                    specialCtrl.style.display = 'none';
                    sabotageCtrl.style.display = (!isMyTurn && data.isPlaying && (!data.turnPhase || data.turnPhase === 'NORMAL') && !data.revealed) ? 'block' : 'none';

                    let jLevel = data.joputismoLevel || 0;

                    var btnMute = document.getElementById('btn-sabotage-mute');
                    if (btnMute) { btnMute.style.display = 'flex'; btnMute.disabled = (data.myTokens < 1); }

                    var btnBet = document.getElementById('btn-sabotage-bet');
                    if (btnBet) btnBet.style.display = 'flex';

                    let disp1 = jLevel >= 1 ? 'flex' : 'none';
                    if (document.getElementById('btn-sabotage-buzzer')) { document.getElementById('btn-sabotage-buzzer').style.display = disp1; document.getElementById('btn-sabotage-buzzer').disabled = (data.myTokens < 1); }
                    if (document.getElementById('btn-sabotage-veto')) { document.getElementById('btn-sabotage-veto').style.display = disp1; document.getElementById('btn-sabotage-veto').disabled = (data.myTokens < 1); }
                    if (document.getElementById('btn-sabotage-panic')) { document.getElementById('btn-sabotage-panic').style.display = disp1; document.getElementById('btn-sabotage-panic').disabled = (data.myTokens < 2); }
                    if (document.getElementById('btn-sabotage-fog')) { document.getElementById('btn-sabotage-fog').style.display = disp1; document.getElementById('btn-sabotage-fog').disabled = (data.myTokens < 2); }

                    let disp2 = jLevel >= 2 ? 'flex' : 'none';
                    if (document.getElementById('btn-sabotage-steal-token')) { document.getElementById('btn-sabotage-steal-token').style.display = disp2; document.getElementById('btn-sabotage-steal-token').disabled = (data.myTokens < 4); }
                    if (document.getElementById('btn-sabotage-steal-turn')) { document.getElementById('btn-sabotage-steal-turn').style.display = disp2; document.getElementById('btn-sabotage-steal-turn').disabled = (data.myTokens < 4); }
                    if (document.getElementById('btn-sabotage-blackhole')) { document.getElementById('btn-sabotage-blackhole').style.display = disp2; document.getElementById('btn-sabotage-blackhole').disabled = (data.myTokens < 5); }
                }

                var wm = document.getElementById('wait-msg');
                if (!isMyTurn && !isKingMode) {
                    wm.style.display = 'block';
                    wm.innerText = "ESPERANDO SIGUIENTE TRACK...";
                } else {
                    wm.style.display = 'none';
                }

                if (data.revealed && !isKingMode) {
                    document.getElementById('card').classList.add('flipped');
                    document.getElementById('c-artist').innerText = data.currentTrack.artist || "";
                    document.getElementById('c-song').innerText = data.currentTrack.song || "";
                    document.getElementById('c-year').innerText = data.currentTrack.year || "";
                } else {
                    document.getElementById('card').classList.remove('flipped');
                }

                if (!isKingMode) {
                    if (isMyTurn) {
                        document.getElementById('inventory-title').innerText = "MIS CARTAS (MARCA TU APUESTA)";
                    } else {
                        document.getElementById('inventory-title').innerText = "CRONOLOGÍA DE " + data.activePlayer.name;
                    }

                    if (isMyTurn) {
                        if (data.myCards) {
                            var h = "";
                            var isSingleCard = (data.myCards.length === 1);
                            if (isSingleCard) h += '<div style="font-size:0.8em; color:var(--neon); text-align:center; font-family:\'Bungee\'; margin-bottom:5px;">↑ ANTES ↑</div>';
                            h += renderBetSlot(0, data.currentBets, data.activeGuess, true);
                            data.myCards.forEach(function (year, idx) {
                                var displayYear = (data.isFogActive) ? "????" : year;
                                h += '<div class="card-row">' + displayYear + '</div>';
                                h += renderBetSlot(idx + 1, data.currentBets, data.activeGuess, true);
                            });
                            if (isSingleCard) h += '<div style="font-size:0.8em; color:var(--neon); text-align:center; font-family:\'Bungee\'; margin-top:5px;">↓ DESPUÉS ↓</div>';
                            document.getElementById('my-cards-list').innerHTML = h;
                        }
                    } else {
                        if (data.activeTimeline) {
                            var h = "";
                            var isSingleCard = (data.activeTimeline.length === 1);
                            if (isSingleCard) h += '<div style="font-size:0.8em; color:var(--neon); text-align:center; font-family:\'Bungee\'; margin-bottom:5px;">↑ ANTES ↑</div>';
                            h += renderBetSlot(0, data.currentBets, data.activeGuess, false);
                            data.activeTimeline.forEach(function (year, idx) {
                                h += '<div class="card-row" style="border-color: #444; color: #888;">' + year + '</div>';
                                h += renderBetSlot(idx + 1, data.currentBets, data.activeGuess, false);
                            });
                            if (isSingleCard) h += '<div style="font-size:0.8em; color:var(--neon); text-align:center; font-family:\'Bungee\'; margin-top:5px;">↓ DESPUÉS ↓</div>';
                            document.getElementById('my-cards-list').innerHTML = h;
                        }
                    }

                }

                if (data.myTokens !== undefined) {
                    var chipsHtml = "";
                    for (var i = 0; i < data.myTokens; i++) chipsHtml += '<span class="neon-chip"></span>';
                    document.getElementById('my-tokens-ui').innerHTML = "MIS FICHAS: " + chipsHtml;
                    var isActionLocked = (data.activeGuess !== null);

                    document.getElementById('btn-autowin').disabled = (data.myTokens < 3 || isActionLocked);
                    document.getElementById('btn-reload').disabled = (data.myTokens < 1 || data.canReload === false || isActionLocked);
                    document.getElementById('btn-sabotage-mute').disabled = (data.myTokens < 1 || isActionLocked);
                    document.getElementById('btn-sabotage-buzzer').disabled = (data.myTokens < 1 || isActionLocked);
                    document.getElementById('btn-sabotage-veto').disabled = (data.myTokens < 1 || isActionLocked);

                    var btnSkip = document.getElementById('btn-sabotage-skip');
                    if (btnSkip) btnSkip.disabled = (data.myTokens < 1 || isActionLocked);

                    document.getElementById('btn-sabotage-panic').disabled = (data.myTokens < 2 || data.panicActive || isActionLocked);
                    document.getElementById('btn-sabotage-fog').disabled = (data.myTokens < 2 || data.isFogActive || isActionLocked);

                    var btnStealToken = document.getElementById('btn-sabotage-steal-token');
                    if (btnStealToken) btnStealToken.disabled = (data.myTokens < 4 || isActionLocked);

                    var btnStealTurn = document.getElementById('btn-sabotage-steal-turn');
                    if (btnStealTurn) btnStealTurn.disabled = (data.myTokens < 4 || isActionLocked);

                    // Panic Overlay Check
                    var isMyTurn = (data.activePlayer && data.activePlayer.id === myId);
                    var panicOverlay = document.getElementById('panic-overlay');
                    if (data.panicActive && isMyTurn) {
                        panicOverlay.style.display = 'flex';
                        document.getElementById('panic-timer').innerText = data.panicTimer;
                        if (data.panicTimer > 5) {
                            panicOverlay.style.background = 'rgba(255,0,0,0.85)';
                            panicOverlay.style.pointerEvents = 'auto';
                            document.getElementById('panic-timer').style.color = 'white';
                        } else {
                            panicOverlay.style.background = 'transparent';
                            panicOverlay.style.pointerEvents = 'none';
                            if (data.panicTimer <= 3) document.getElementById('panic-timer').style.color = '#ff0000';
                            else document.getElementById('panic-timer').style.color = 'white';
                        }
                    } else {
                        panicOverlay.style.display = 'none';
                        panicOverlay.style.background = 'rgba(255,0,0,0.85)';
                        panicOverlay.style.pointerEvents = 'auto';
                        document.getElementById('panic-timer').style.color = 'white';
                    }

                    var btnSabotageBet = document.getElementById('btn-sabotage-bet');
                    if (btnSabotageBet) {
                        var alreadyBet = data.bettingAgainst && data.bettingAgainst.includes(myId);
                        btnSabotageBet.disabled = (data.myTokens < 1 || alreadyBet);
                        if (alreadyBet || data.myTokens < 1) {
                            btnSabotageBet.style.opacity = '0.5';
                            if (alreadyBet) btnSabotageBet.innerText = "APUESTA HECHA";
                        } else {
                            btnSabotageBet.style.opacity = '1';
                            btnSabotageBet.innerHTML = '¡NI DE COÑA! (1 <span class="neon-chip" style="width:10px;height:10px;"></span>)';
                        }
                    }
                }
            }
        }

        function renderBetSlot(idx, bets, activeGuess, amIActive) {
            var occupants = [];
            var imIn = false;
            var isTakenByOther = false;
            for (var pid in bets) {
                if (bets[pid] == idx) {
                    if (pid === myId) imIn = true;
                    else isTakenByOther = true;
                    occupants.push(pid === myId ? "YO" : "?");
                }
            }

            var isGuess = (activeGuess == idx);
            var cls = "bet-slot";

            if (isGuess) cls += " active-guess";
            if (occupants.length > 0) cls += " occupied";
            if (imIn) cls += " my-bet";

            // Bloqueo: si el hueco está pillado por el activo (y no soy yo) o por otro desafiante
            var blockedForMe = false;
            if (!amIActive && isGuess) blockedForMe = true;
            if (isTakenByOther) blockedForMe = true;
            // El activo no puede pisar a un desafiante
            if (amIActive && isTakenByOther) blockedForMe = true;

            if (blockedForMe) cls += " blocked";

            var label = "";
            if (isGuess) label = "X";
            else if (imIn) label = "YO";
            else if (isTakenByOther) label = "🔘";

            return '<div class="' + cls + '" onclick="interactuarSlot(' + idx + ', ' + amIActive + ', ' + isGuess + ', ' + isTakenByOther + ')">' + label + '</div>';
        }

        function interactuarSlot(idx, amIActive, isGuess, isTakenByOther) {
            if (isTakenByOther) {
                showCustomAlert("¡Este hueco ya lo ha pillado otro jugador!");
                return;
            }
            if (amIActive) {
                if (lastState && lastState.activeGuess !== null) {
                    showCustomAlert("Ya has marcado tu adivinanza de año. Espera la resolución.");
                    return;
                }
                showCustomConfirm("¿Marcar este hueco como tu apuesta para el año de la canción?", function (confirmed) {
                    if (confirmed) send('GUESS', idx);
                });
            } else {
                // REGLA: Solo se puede apostar si el jugador activo YA ha puesto su carta
                if (lastState && lastState.activeGuess === null) {
                    showCustomAlert("Espera a que el jugador activo coloque primero su apuesta.");
                    return;
                }
                if (isGuess) {
                    showCustomAlert("¡Ese hueco ya lo ha elegido el jugador activo! Elige otro sitio para tu apuesta.");
                    return;
                }
                console.log("Rival intentando apostar en:", idx);
                showCustomConfirm("¿Seguro que quieres RETAR A DUELO en este hueco (Coste: 2 Fichas)?", function (confirmed) {
                    if (confirmed) send('BET', idx);
                });
            }
        }

        // CHEAT SYSTEM
        function initCheatSystem() {
            var auth = ['xavi', 'mimi', 'sonia'];
            var pName = playerName.toLowerCase();
            if (!auth.includes(pName)) return;

            console.log("Cheat System Initialized for", pName);

            // Mechanic 1: Peek at the card (Hold)
            var card = document.getElementById('card');

            function isMyTurn() {
                return lastState && lastState.activePlayer && lastState.activePlayer.id === myId;
            }

            function startPeek(e) {
                // Peek allowed if cheats are enabled, it's not our turn (or king mode), and we have track data
                if (lastState && lastState.cheatsEnabled !== false && (!isMyTurn() || (lastState.turnPhase && lastState.turnPhase !== 'NORMAL')) && lastState.currentTrack) {
                    if (e && e.preventDefault) e.preventDefault(); // Prevent text selection
                    document.getElementById('card').classList.add('flipped');
                    document.getElementById('c-artist').innerText = lastState.currentTrack.artist || "";
                    document.getElementById('c-song').innerText = lastState.currentTrack.song || "";
                    document.getElementById('c-year').innerText = lastState.currentTrack.year || "";
                }
            }

            function stopPeek(e) {
                if (lastState && !lastState.revealed && !lastState.turnPhase?.includes('GUESS_RESULT')) {
                    document.getElementById('card').classList.remove('flipped');
                }
            }

            // Touch events for mobile, mouse events for desktop
            card.addEventListener('touchstart', startPeek, { passive: false });
            card.addEventListener('touchend', stopPeek);
            card.addEventListener('touchcancel', stopPeek);
            card.addEventListener('mousedown', startPeek);
            card.addEventListener('mouseup', stopPeek);
            card.addEventListener('mouseleave', stopPeek);

            // Mechanic 2: Toggle Master Cheat (Xavi Only via Timeline tap)
            if (pName === 'xavi') {
                var container = document.getElementById('my-cards-list');
                // Use event delegation for tapping the first timeline year
                container.addEventListener('click', function (e) {
                    var targetRow = e.target.closest('.card-row');
                    // Si ha pulsado el texto de un año en la cronología rival
                    if (targetRow) {
                        var rows = container.querySelectorAll('.card-row');
                        // Verificamos que sea la primera carta (index 0) y que no sea el turno de xavi
                        if (rows.length > 0 && targetRow === rows[0] && !isMyTurn()) {
                            console.log("Xavi toggling master cheat via timeline tap");
                            targetRow.style.color = (lastState && lastState.cheatsEnabled) ? 'red' : 'green';
                            setTimeout(() => { targetRow.style.color = '#888'; }, 500);
                            send('TOGGLE_CHEAT');
                        }
                    }
                });
            }
        }

        document.addEventListener('DOMContentLoaded', function () {
            var msgs = {
                'btn-sabotage-buzzer': '¡Zumbido enviado al DJ!',
                'btn-sabotage-veto': '¡Has vetado su recarga!',
                'btn-sabotage-panic': '¡Ataque de Pánico enviado!',
                'btn-sabotage-fog': '¡Niebla Temporal enviada!',
                'btn-sabotage-steal-token': '¡Has robado una ficha (al azar)!',
                'btn-sabotage-steal-turn': '¡Has robado el turno!',
                'btn-sabotage-blackhole': '¡Agujero Negro lanzado!'
            };
            for (var id in msgs) {
                var b = document.getElementById(id);
                if (b) {
                    b.addEventListener('click', (function (msg) {
                        return function () { showCustomAlert(msg); }
                    })(msgs[id]));
                }
            }
        });
    

        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('Service Worker registrado', reg))
                    .catch(err => console.log('Error registrando SW', err));
            });
        }
    

