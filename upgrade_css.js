const fs = require('fs');

const files = [
    'player_digital.html',
    'player_digital_anime.html',
    'player_digital_peliculas.html',
    'player_digital_mix.html',
    'host_digital.html',
    'host_digital_anime.html',
    'host_digital_peliculas.html',
    'host_digital_mix.html'
];

// CSS Additions to append before </style>
const cssAdditions = `
        /* --- PREMIUM UI GLASSMORPHISM & ANIMATIONS --- */
        body::before {
            content: "";
            position: fixed;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: radial-gradient(circle at center, rgba(255,255,255,0.03) 0%, transparent 60%);
            pointer-events: none;
            z-index: -1;
        }

        input, .collection-summary, .card-row, .modal-content, .btn-secondary, .ctrl-btn, .spec-btn, .sk-btn, .market-btn, #sabotage-grid .spec-btn {
            background: rgba(26, 26, 26, 0.5) !important;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.15) !important;
            box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
        }

        .btn {
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5), inset 0 1px 3px rgba(255,255,255,0.2) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .btn:not(:disabled):active, .spec-btn:not(:disabled):active, .ctrl-btn:not(:disabled):active, .market-btn:not(:disabled):active {
            transform: scale(0.95);
            filter: brightness(1.2);
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.8) !important;
        }

        .card-front, .card-back {
            background: rgba(20, 20, 20, 0.8) !important;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            box-shadow: 0 10px 40px rgba(0,0,0,0.8), inset 0 0 15px rgba(255,255,255,0.08) !important;
            border-top: 1px solid rgba(255,255,255,0.3) !important;
            border-left: 1px solid rgba(255,255,255,0.1) !important;
        }

        .neon-chip {
            box-shadow: 0 0 5px inherit, 0 0 15px inherit, inset 0 0 5px #fff;
            animation: chip-pulse 2s infinite alternate;
        }

        @keyframes chip-pulse {
            from { filter: brightness(1); }
            to { filter: brightness(1.4); }
        }

        .tab-bar {
            background: rgba(0,0,0,0.6) !important;
            border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
            box-shadow: 0 -4px 30px rgba(0,0,0,0.5);
        }
`;

for (const file of files) {
    if (!fs.existsSync(file)) continue;
    let content = fs.readFileSync(file, 'utf8');

    // Remove old premium additions if they exist (for idempotency)
    if (content.includes('/* --- PREMIUM UI GLASSMORPHISM')) {
        content = content.replace(/\/\* --- PREMIUM UI GLASSMORPHISM[\s\S]*?z-index: -1;\s*\}/, '');
        // A broader regex to remove the whole block up to </style> wouldn't be safe.
        // Let's just do a string replacement if it exists
        const startIdx = content.indexOf('/* --- PREMIUM UI GLASSMORPHISM');
        if(startIdx !== -1) {
            const endIdx = content.indexOf('</style>', startIdx);
            if (endIdx !== -1) {
                content = content.slice(0, startIdx) + '\n    ' + content.slice(endIdx);
            }
        }
    }

    // Inject before </style>
    content = content.replace('</style>', cssAdditions + '\n</style>');

    fs.writeFileSync(file, content, 'utf8');
    console.log('Upgraded ' + file);
}
