#!/usr/bin/env node
// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Die KI einer beliebigen index.html als GTP-Programm, damit
   gnugo-duell.js sie als Gegner spielen lassen kann (--gegner ki,
   docs/pwa-vergleich.md). Geladen werden die Blöcke shared-go-logic und
   worker-ai wie in gnugo-duell.js; gezogen wird mit getAIMove auf der Stufe
   'hard', mit dem Default der Datei, ohne adaptives Zeitbudget und mit den
   Änderungen aus --ki. Kennt die Datei vorgabeSteine, bekommt sie die Zahl
   der Steine aus set_free_handicap (sonst 0).

   Befehle: protocol_version, name, version, list_commands, known_command,
   boardsize 19, clear_board, komi, set_random_seed, play, genmove,
   set_free_handicap, list_stones, quit. Jedem Befehl darf eine Nummer
   vorangehen; die Antwort traegt sie dann ebenfalls (GTP-3). Der Zufall ist
   je Partie geseedet: set_random_seed N setzt Math.random neu (mulberry32
   wie in gnugo-duell.js); ohne den Befehl gilt Seed 1.

   play lehnt regelwidrige Zuege ab -- Ko, positionelle Wiederholung und
   Selbstmord (GTP-1); bei einer Ablehnung bleibt der Zustand unveraendert.
   genmove reicht extra an getAIMove weiter, damit die Versuchsregel
   'Pass nach Gegnerpass' ueberhaupt ausloesen kann (GTP-2).
   Alles nach docs/korrektur-gtp-vorabfestlegung.md.

   Aufruf:  node gtp-ki.js --html pfad/index.html [--ki k=v,...] */
'use strict';
const fs = require('fs');

const a = process.argv.slice(2);
const opt = {html: null, ki: {}};
for (let i = 0; i < a.length; i++) {
  const v = a[i + 1];
  if (a[i] === '--html') { opt.html = v; i++; }
  else if (a[i] === '--ki') {
    for (const kv of String(v || '').split(',').filter(Boolean)) {
      const [k, w] = kv.split('=');
      if (!/^[A-Za-z]\w*$/.test(k || '') || w === undefined || w === '' || !Number.isFinite(+w)) {
        console.error(`--ki: ungültige Angabe ${kv} (erwartet name=zahl)`); process.exit(2);
      }
      opt.ki[k] = +w;
    }
    i++;
  } else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
}
if (!opt.html) { console.error('Aufruf: node gtp-ki.js --html pfad/index.html [--ki k=v,...]'); process.exit(2); }

const html = fs.readFileSync(opt.html, 'utf8');
const ex = id => {
  const m = new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);
  if (!m) { console.error(`<script id="${id}"> fehlt in ${opt.html}`); process.exit(2); }
  return m[1];
};
globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
globalThis.document = {getElementById: () => null};
(0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai')
  + ';globalThis.__K={PARAMS,getAIMove,computeZobrist,removeDeadGroups,floodFill,BOARD_SIZE,'
  + 'neuePartie(){_mctsSavedRoot=null;_hopelessStreak=0;_allDeadStreak=0;_lastMsPerSim=null;'
  + 'if(typeof setzeKrisenDauer==="function")setzeKrisenDauer(null);'
  + 'if(typeof setzeLebensurteil==="function")setzeLebensurteil(null);}};');
const E = globalThis.__K;
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));
for (const k of Object.keys(opt.ki)) if (!(k in DEFAULT)) { console.error(`--ki: ${k} ist kein Parameter von ${opt.html}`); process.exit(2); }

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));
function vonGtp(s) {
  const t = String(s || '').trim().toUpperCase();
  if (t === 'PASS') return -1;
  const x = SPALTEN.indexOf(t[0]), r = +t.slice(1);
  if (x < 0 || !(r >= 1 && r <= 19) || t.length < 2) throw new Error('Koordinate unlesbar: ' + s);
  return (19 - r) * 19 + x;
}
const farbeVon = s => { const t = String(s || '').toLowerCase(); if (t === 'b' || t === 'black') return 1; if (t === 'w' || t === 'white') return 2; throw new Error('Farbe unlesbar: ' + s); };

let board, caps, hist, ko, last, mc, vorgabe, letzterPass, komi;
function neu() {
  board = new Uint8Array(E.BOARD_SIZE); caps = {1: 0, 2: 0}; hist = new Set([E.computeZobrist(board)]);
  ko = null; last = null; mc = 0; vorgabe = 0; letzterPass = null; komi = 7.5; E.neuePartie();
}
neu();
Math.random = mulberry32(1);

/* Einen Zug anwenden wie gnugo-duell.js: schlagen, Ko-Punkt, Superko-Historie */
function setze(i, f) {
  if (i < 0) { ko = null; letzterPass = f; mc++; return; }
  if (board[i]) throw new Error('Feld besetzt: ' + zuGtp(i));
  board[i] = f;
  const cap = E.removeDeadGroups(board, 3 - f, i);
  ko = null;
  if (cap === 1) { const ff = E.floodFill(board, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
  caps[f] += cap; last = i; letzterPass = null; mc++;
  hist.add(E.computeZobrist(board));
}

/* GTP-1: Eingangsvalidierung fuer play. Nur hier, nicht in setze -- die Zuege
   der eigenen Engine kommen aus getLegalMoves und sind schon geprueft; eine
   Pruefung in setze koennte einen Messlauf mitten in der Partie abbrechen.
   Wirft diese Funktion, hat noch nichts am Zustand gedreht: sie arbeitet auf
   einer Kopie, liest hist nur mit has, und setze laeuft danach gar nicht.
   Die Wiederholungsregel ist positional, wie die der Engine ueber histHashes. */
function pruefeRegeln(i, f) {
  if (i < 0) return;
  if (ko !== null && i === ko) throw new Error('Ko verboten: ' + zuGtp(i));
  if (board[i]) return;                        /* setze meldet das selbst */
  const probe = Uint8Array.from(board);
  probe[i] = f;
  E.removeDeadGroups(probe, 3 - f, i);
  if (E.floodFill(probe, i).liberties.length === 0) throw new Error('Selbstmord verboten: ' + zuGtp(i));
  if (hist.has(E.computeZobrist(probe))) throw new Error('Stellungswiederholung verboten: ' + zuGtp(i));
}

const BEFEHLE = ['protocol_version', 'name', 'version', 'list_commands', 'known_command', 'boardsize', 'clear_board',
  'komi', 'set_random_seed', 'play', 'genmove', 'set_free_handicap', 'list_stones', 'quit'];
/* GTP-3: Die optionale Nummer vor dem Befehl. Sie wird hier abgespalten und
   gemerkt; die drei Ausgabestellen unten schreiben sie mit, im Erfolgs- wie im
   Fehlerfall. Eine Zeile aus nur einer Zahl laesst befehl undefined und faellt
   damit in default: '?17 unbekannter Befehl'. Sie stumm zu ueberspringen
   wuerde einen Client haengen lassen, der auf eine Antwort wartet. */
let kennung = '';
function antworte(zeile) {
  const worte = zeile.trim().split(/\s+/);
  kennung = /^\d+$/.test(worte[0]) ? worte.shift() : '';
  const [befehl, ...rest] = worte;
  switch (befehl) {
    case 'protocol_version': return '2';
    case 'name': return 'gtp-ki';
    case 'version': return '1';
    case 'list_commands': return BEFEHLE.join('\n');
    case 'known_command': return String(BEFEHLE.includes(rest[0]));
    case 'boardsize': if (rest[0] !== '19') throw new Error('nur 19×19'); return '';
    case 'clear_board': neu(); return '';
    case 'komi': if (!Number.isFinite(+rest[0])) throw new Error('Komi unlesbar'); komi = +rest[0]; return '';
    case 'set_random_seed': {
      if (!/^\d+$/.test(rest[0] || '')) throw new Error('Seed unlesbar');
      Math.random = mulberry32(+rest[0]); return '';
    }
    case 'play': { const pi = vonGtp(rest[1]), pf = farbeVon(rest[0]); pruefeRegeln(pi, pf); setze(pi, pf); return ''; }
    case 'set_free_handicap': for (const s of rest) { board[vonGtp(s)] = 1; } vorgabe = rest.length; hist.add(E.computeZobrist(board)); return '';
    case 'list_stones': { const f = farbeVon(rest[0]); const z = []; for (let i = 0; i < E.BOARD_SIZE; i++) if (board[i] === f) z.push(zuGtp(i)); return z.join(' '); }
    case 'genmove': {
      const f = farbeVon(rest[0]);
      Object.assign(E.PARAMS, DEFAULT, {adaptiveBudgetEnabled: 0}, 'vorgabeSteine' in DEFAULT ? {vorgabeSteine: vorgabe} : {}, opt.ki);
      const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last,
        {gegnerPasste: letzterPass === 3 - f, wertung: 'flaeche', komi});
      if (r.type === 'resign') return 'resign';
      const i = r.type === 'stone' ? r.y * 19 + r.x : -1;
      setze(i, f);
      return i < 0 ? 'pass' : zuGtp(i);
    }
    case 'quit': return null;
    default: throw new Error('unbekannter Befehl');
  }
}

let puffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => {
  puffer += d;
  let k;
  while ((k = puffer.indexOf('\n')) >= 0) {
    const zeile = puffer.slice(0, k).replace(/#.*/, ''); puffer = puffer.slice(k + 1);
    if (!zeile.trim()) continue;
    let aus;
    try {
      aus = antworte(zeile);
      if (aus === null) { process.stdout.write('=' + kennung + '\n\n'); process.exit(0); }
      process.stdout.write('=' + kennung + ' ' + aus + '\n\n');
    } catch (e) { process.stdout.write('?' + kennung + ' ' + e.message + '\n\n'); }
  }
});
process.stdin.on('end', () => process.exit(0));
