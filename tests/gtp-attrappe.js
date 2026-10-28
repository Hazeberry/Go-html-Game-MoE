// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Attrappe für GNU Go und Fuego: ein kleiner GTP-Spieler für die Tests von
   gnugo-duell.js (tests/fuego-gegner.js). Er braucht weder GNU Go noch
   Fuego und nutzt die Regeln aus index.html (Schlagen, Selbstmord).

   Er versteht die Befehle, die das Duell-Skript schickt, und beantwortet die
   Fuego-eigenen (uct_param_player, deterministic_mode, set_random_seed) mit
   einer leeren Antwort. Gezogen wird zufällig, aber nach Seed:
   `--seed N` (wie GNU Go) oder `--srand N` (wie Fuego); set_random_seed
   überschreibt ihn. Andere Optionen ignoriert sie; dass das Duell-Skript
   Fuego mit zwei Strichen startet, prüft der Test an --srand.

   Protokoll: Mit der Umgebungsvariable ATTRAPPE_LOG schreibt sie jeden
   Befehl in die Datei <ATTRAPPE_LOG>.fuego (wenn mit --srand gestartet) oder
   <ATTRAPPE_LOG>.gnugo, je Zeile `<Start-Nr> <Befehl>`.
   ATTRAPPE_SCHLECHT=N lässt den N-ten genmove einen besetzten Punkt nennen. */
'use strict';
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const logik = new RegExp('<script id="shared-go-logic">([\\s\\S]*?)</script>').exec(html)[1];
(0, eval)(logik + ';globalThis.__L={removeDeadGroups,floodFill,BOARD_SIZE};');
const L = globalThis.__L;
const N = L.BOARD_SIZE;   /* Zahl der Felder (361), nicht die Kantenlänge */

const argv = process.argv.slice(2);
const istFuego = argv.includes('--srand');
const flag = istFuego ? '--srand' : '--seed';
let seed = +(argv[argv.indexOf(flag) + 1] || 1);
const logDatei = process.env.ATTRAPPE_LOG ? `${process.env.ATTRAPPE_LOG}.${istFuego ? 'fuego' : 'gnugo'}` : null;
const startNr = process.pid;
const schlecht = +(process.env.ATTRAPPE_SCHLECHT || 0);

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));
function vonGtp(s) {
  const t = s.trim().toUpperCase();
  if (t === 'PASS') return -1;
  const x = SPALTEN.indexOf(t[0]), r = +t.slice(1);
  if (x < 0 || !(r >= 1 && r <= 19)) throw new Error('Koordinate unlesbar: ' + s);
  return (19 - r) * 19 + x;
}
const STERNE = {2: ['D4', 'Q16'], 6: ['D4', 'Q16', 'Q4', 'D16', 'D10', 'Q10']};

let board = new Uint8Array(N), genmoves = 0;
let zufall = seed;
const wuerfel = () => { zufall = (Math.imul(zufall, 1103515245) + 12345) >>> 0; return zufall / 4294967296; };

/* Stein setzen mit Schlagen; Selbstmord wird abgelehnt (false). */
function setze(i, f) {
  if (board[i]) return false;
  const kopie = board.slice();
  board[i] = f;
  L.removeDeadGroups(board, 3 - f, i);
  if (L.floodFill(board, i).liberties.length === 0) { board = kopie; return false; }
  return true;
}
function waehle(f) {
  const frei = [];
  for (let i = 0; i < N; i++) if (!board[i]) frei.push(i);
  for (let versuch = 0; versuch < 400 && frei.length; versuch++) {
    const i = frei[Math.floor(wuerfel() * frei.length)];
    if (setze(i, f)) return i;
  }
  return -1;
}
const farbe = c => (/^b/i.test(c) ? 1 : 2);
const liste = f => { const l = []; for (let i = 0; i < N; i++) if (board[i] === f) l.push(zuGtp(i)); return l.join(' '); };
const stand = () => {
  let b = 0, w = 0;
  for (let i = 0; i < N; i++) { if (board[i] === 1) b++; else if (board[i] === 2) w++; }
  return b >= w ? `B+${(b - w).toFixed(1)}` : `W+${(w - b).toFixed(1)}`;
};

const rl = readline.createInterface({input: process.stdin});
const antwort = (ok, text = '') => process.stdout.write(`${ok ? '=' : '?'} ${text}\n\n`);
rl.on('line', zeile => {
  const t = zeile.trim();
  if (!t) return;
  if (logDatei) fs.appendFileSync(logDatei, `${startNr} ${t}\n`);
  const [c, ...a] = t.split(/\s+/);
  switch (c) {
    case 'boardsize': case 'komi': case 'uct_param_player': case 'uct_param_search': case 'deterministic_mode':
      return antwort(true);
    case 'set_random_seed': seed = +a[0]; zufall = seed; return antwort(true);
    case 'clear_board': board = new Uint8Array(N); return antwort(true);
    case 'fixed_handicap': {
      const pt = STERNE[+a[0]];
      if (!pt) return antwort(false, 'invalid number of stones');
      for (const p of pt) board[vonGtp(p)] = 1;
      return antwort(true, pt.join(' '));
    }
    case 'set_free_handicap':
      for (const p of a) board[vonGtp(p)] = 1;
      return antwort(true);
    case 'play': {
      const i = vonGtp(a[1]);
      if (i < 0) return antwort(true);
      return setze(i, farbe(a[0])) ? antwort(true) : antwort(false, 'illegal move');
    }
    case 'genmove': {
      genmoves++;
      if (schlecht && genmoves === schlecht) {
        const besetzt = board.findIndex(x => x);
        return antwort(true, zuGtp(besetzt));
      }
      const i = waehle(farbe(a[0]));
      return antwort(true, i < 0 ? 'pass' : zuGtp(i));
    }
    case 'list_stones': return antwort(true, liste(/^b/i.test(a[0]) ? 1 : 2));
    case 'final_score': case 'estimate_score': return antwort(true, stand());
    case 'quit': antwort(true); return process.exit(0);
    default: return antwort(false, 'unknown command');
  }
});
