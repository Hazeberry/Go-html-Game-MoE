// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* bensonAliveExempt — Benson-lebende Ketten von der Sterbe-Treppe ausnehmen
   (docs/benson-lebend-treppe.md).

   Befund: bensonClassify liefert _bnAlive und _bnDead, evaluateBoard fragt
   nur _bnDead. Die Treppe (libs < 4 und size >= deathDiscountSize) belastet
   deshalb auch eine bewiesen lebende Kette: Zwei Einzelaugen heißen zwei
   Freiheiten, STERBE_RAMPE gibt 0,5, und deathTransfer (Default 1,0) zieht
   0,5 × Größe × captureWeight ab.

   Geprüft wird
     1. an einer nachgebauten Stellung, dass der Defekt da ist (Schalter 0),
        dass die Ausnahme ihn aufhebt (Schalter 1) und dass sie eine Kette mit
        zwei Freiheiten, die nicht lebt, nicht anfasst;
     2. an zwei Endstellungen echter Partien gegen GNU Go (Arm A der Messung
        M1, docs/daten/endspiel-messung/lauf1/), dass die Ausnahme den Wert
        um genau die Abzüge der lebenden Ketten ändert, unabhängig neu
        gerechnet, und nur dort, wo die Benson-Analyse läuft (höchstens
        bensonEvalMaxEmpty freie Felder);
     3. dass bei Schalter 0 oder ohne den Schlüssel alles beim Alten bleibt:
        dieselben Werte wie vor der Änderung (die Referenzwerte stammen aus
        tests/benson-transfer.js). */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen.js');

const api = ladeKI({mitNetz: false});
const {PARAMS, BOARD_SIZE, idx, evaluateBoard, removeDeadGroups, bensonClassify, _bnAlive, _bnDead, floodFill} = api;

/* PARAMS für einen Aufruf setzen und danach exakt zurückgeben (auch einen
   fehlenden Schlüssel). Ein Test, der den Zustand liegen lässt, vergiftet die
   folgenden. */
function mit(werte, fn) {
  const alt = {}, hatte = {};
  for (const k of Object.keys(werte)) { hatte[k] = k in PARAMS; alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  try { return fn(); } finally { for (const k of Object.keys(alt)) { if (hatte[k]) PARAMS[k] = alt[k]; else delete PARAMS[k]; } }
}
const KEINE = {1: 0, 2: 0};

/* STERBE_RAMPE aus index.html lesen, damit der Test die Rampe nicht doppelt führt */
const RAMPE = JSON.parse((/const STERBE_RAMPE = (\[[^\]]*\])/.exec(fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8')) || [])[1]);

/* ── nachgebaute Stellungen ───────────────────────────────────────────── */

/* Schwarz: Reihe y=1, x=0..5, dazu y=0 mit Lücken bei x=1 und x=4 (die beiden
   Einzelaugen): zehn Steine, genau zwei Freiheiten, pass-alive. Weiß
   umschließt von oben und rechts. */
function lebendeKette() {
  const b = new Uint8Array(BOARD_SIZE);
  for (let x = 0; x <= 5; x++) b[idx(x, 1)] = 1;
  for (const x of [0, 2, 3, 5]) b[idx(x, 0)] = 1;
  for (let x = 0; x <= 5; x++) b[idx(x, 2)] = 2;
  b[idx(6, 0)] = 2; b[idx(6, 1)] = 2;
  return b;
}

/* Schwarz: sechs Steine auf der ersten Linie mit den Freiheiten (4,1) und
   (6,0), Weiß darüber: zwei Freiheiten, aber kein Auge, nicht pass-alive. */
function sterbendeKette() {
  const b = new Uint8Array(BOARD_SIZE);
  for (let x = 0; x <= 5; x++) b[idx(x, 0)] = 1;
  for (const x of [0, 1, 2, 3, 5]) b[idx(x, 1)] = 2;
  return b;
}

/* ── echte Partien: Arm A der Messung M1 ──────────────────────────────── */
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { const t = s.toUpperCase(); return t === 'PASS' ? -1 : (19 - +t.slice(1)) * 19 + SPALTEN.indexOf(t[0]); };
const PARTIEN = path.join(__dirname, '..', 'docs', 'daten', 'endspiel-messung', 'lauf1', 'A.jsonl.gz');

/* Die Stellung nach den ersten `bis` Zügen; Weiß (GNU Go) beginnt, Schwarz ist die KI */
function stellung(q, bis = q.zuege.length) {
  const board = new Uint8Array(BOARD_SIZE), caps = {1: 0, 2: 0};
  for (const v of q.vorgabeSteine) board[vonGtp(v)] = 1;
  for (let t = 0; t < Math.min(bis, q.zuege.length); t++) {
    const i = vonGtp(q.zuege[t]); if (i < 0) continue;
    const farbe = t % 2 === 0 ? 2 : 1;
    board[i] = farbe; caps[farbe] += removeDeadGroups(board, farbe === 1 ? 2 : 1, i);
  }
  return {board, caps};
}
function partie(nr) {
  const zeilen = zlib.gunzipSync(fs.readFileSync(PARTIEN)).toString().split('\n').filter(Boolean).map(l => JSON.parse(l));
  return zeilen.find(p => p.nr === nr);
}

/* Der Abzug, den die Treppe auf bewiesen lebenden Ketten bucht, unabhängig
   neu gerechnet, aus Sicht von `color` (eigene Kette: Wert sinkt, fremde:
   steigt). Bei deathDiscount 0 ist das der ganze Unterschied zwischen
   Schalter 0 und 1. Die Analyse läuft wie in evaluateBoard nur bei höchstens
   bensonEvalMaxEmpty freien Feldern. */
function erwarteterGewinn(board, color) {
  let leer = 0; for (let i = 0; i < BOARD_SIZE; i++) if (!board[i]) leer++;
  if (leer > PARAMS.bensonEvalMaxEmpty) return {delta: 0, ketten: []};
  const ep = bensonClassify(board), gesehen = new Uint8Array(BOARD_SIZE), ketten = [];
  let delta = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const c = board[i]; if (!c || gesehen[i]) continue;
    const ff = floodFill(board, i);
    for (const g of ff.group) gesehen[g] = 1;
    const libs = ff.liberties.length, size = ff.group.length;
    if (_bnAlive[i] !== ep || libs >= RAMPE.length || size < PARAMS.deathDiscountSize) continue;
    const dt = PARAMS.deathTransfer * RAMPE[libs] * size * PARAMS.captureWeight;
    delta += c === color ? dt : -dt;
    ketten.push(`${c === 1 ? 'S' : 'W'}${size}/${libs}`);
  }
  return {delta, ketten};
}

/* ── Tests ────────────────────────────────────────────────────────────── */

test('Nachgebaute Stellung: zehn Steine, zwei Einzelaugen, pass-alive', () => {
  const b = lebendeKette();
  mit({bensonEvalMaxEmpty: 400}, () => {
    const ep = bensonClassify(b), ff = floodFill(b, idx(0, 1));
    pruefeGleich(ff.group.length, 10, 'zehn Steine');
    pruefeGleich(ff.liberties.length, 2, 'genau die beiden Augen als Freiheiten');
    pruefe(ff.group.every(i => _bnAlive[i] === ep), 'bensonClassify: pass-alive');
    pruefe(!ff.group.some(i => _bnDead[i] === ep), 'nicht beweisbar tot');
  });
});

test('Schalter 0: Die Treppe belastet die lebende Kette (der Defekt)', () => {
  const b = lebendeKette();
  mit({bensonEvalMaxEmpty: 400, deathDiscount: 0, bensonAliveExempt: 0}, () => {
    const ohne = mit({deathTransfer: 0}, () => evaluateBoard(b, 1, KEINE));
    const mitT = evaluateBoard(b, 1, KEINE);
    /* 10 Steine, 2 Freiheiten: 5·10 + 3·2 = 56 → Abzug 1,0 × 0,5 × 10 × 20 = 100 */
    pruefeGleich(ohne, -14, 'Wert ohne Übertragung (Schwarz 56, Weiß 51 + 19)');
    pruefeGleich(mitT - ohne, -100, 'deathTransfer 1,0 zieht 100 von der lebenden Kette ab');
    pruefeGleich(RAMPE[2], 0.5, 'Rampe bei zwei Freiheiten');
    /* Weiß am Zug der Bewertung: dieselbe Kette gehört dem Gegner, der Wert steigt */
    const wOhne = mit({deathTransfer: 0}, () => evaluateBoard(b, 2, KEINE));
    pruefeGleich(evaluateBoard(b, 2, KEINE) - wOhne, 100, 'aus Sicht von Weiß steigt der Wert um 100');
    /* der reine Abschlag halbiert den Wert der Kette */
    const dd = mit({deathTransfer: 0, deathDiscount: 1}, () => evaluateBoard(b, 1, KEINE));
    pruefeGleich(dd - ohne, -28, 'deathDiscount 1,0 nimmt der Kette 56 × 0,5 = 28');
  });
});

test('Schalter 1: Die lebende Kette bleibt unbelastet', () => {
  const b = lebendeKette();
  mit({bensonEvalMaxEmpty: 400, deathDiscount: 0, bensonAliveExempt: 1}, () => {
    const ohne = mit({deathTransfer: 0}, () => evaluateBoard(b, 1, KEINE));
    pruefeGleich(evaluateBoard(b, 1, KEINE), ohne, 'mit deathTransfer 1,0 derselbe Wert wie ohne Übertragung');
    pruefeGleich(evaluateBoard(b, 2, KEINE), mit({deathTransfer: 0}, () => evaluateBoard(b, 2, KEINE)), 'aus Sicht von Weiß ebenso');
    pruefeGleich(mit({deathTransfer: 0, deathDiscount: 1}, () => evaluateBoard(b, 1, KEINE)), ohne, 'auch der Abschlag lässt sie aus');
    pruefeGleich(mit({deathTransfer: 1.5}, () => evaluateBoard(b, 1, KEINE)), ohne, 'jede Dosis');
  });
});

test('Schalter 1: Eine Kette mit zwei Freiheiten, die nicht lebt, bekommt die Treppe weiterhin', () => {
  const b = sterbendeKette();
  mit({bensonEvalMaxEmpty: 400, deathDiscount: 0}, () => {
    const ep = bensonClassify(b), ff = floodFill(b, idx(0, 0));
    pruefeGleich(ff.group.length, 6, 'sechs Steine'); pruefeGleich(ff.liberties.length, 2, 'zwei Freiheiten');
    pruefe(!ff.group.some(i => _bnAlive[i] === ep), 'nicht pass-alive');
    const ohneT = mit({deathTransfer: 0, bensonAliveExempt: 0}, () => evaluateBoard(b, 1, KEINE));
    const aus = mit({bensonAliveExempt: 0}, () => evaluateBoard(b, 1, KEINE));
    const an = mit({bensonAliveExempt: 1}, () => evaluateBoard(b, 1, KEINE));
    pruefeGleich(aus - ohneT, -60, 'Abzug 1,0 × 0,5 × 6 × 20 = 60');
    pruefeGleich(an, aus, 'die Ausnahme ändert hier nichts');
  });
});

test('Zwei Endstellungen echter Partien: Die Ausnahme ändert den Wert um genau die Abzüge der lebenden Ketten', () => {
  pruefe(fs.existsSync(PARTIEN), 'die eingecheckten Partien der Messung M1 liegen vor');
  /* Partie 2 und 3 (Seed 206): am Ende zählt GNU Gos Weiß zwei bewiesen lebende
     Ketten mit zwei Freiheiten, die die Treppe belastete (9 + 9 und 12 + 7 Steine) */
  for (const [nr, erwartet] of [[2, -180], [3, -190]]) {
    const {board, caps} = stellung(partie(nr));
    const soll = erwarteterGewinn(board, 1);
    pruefeGleich(soll.delta, erwartet, `Partie ${nr}: unabhängig gerechneter Abzug (${soll.ketten.join(', ')})`);
    const aus = mit({bensonAliveExempt: 0}, () => evaluateBoard(board, 1, caps));
    const an = mit({bensonAliveExempt: 1}, () => evaluateBoard(board, 1, caps));
    pruefeGleich(an - aus, soll.delta, `Partie ${nr}: Schalter 1 minus Schalter 0`);
    /* aus Sicht von Weiß dasselbe mit umgekehrtem Vorzeichen */
    const wAus = mit({bensonAliveExempt: 0}, () => evaluateBoard(board, 2, caps));
    const wAn = mit({bensonAliveExempt: 1}, () => evaluateBoard(board, 2, caps));
    pruefeGleich(wAn - wAus, -soll.delta, `Partie ${nr}: aus Sicht von Weiß umgekehrt`);
  }
});

test('Die Ausnahme wirkt nur, wo die Benson-Analyse läuft (höchstens bensonEvalMaxEmpty freie Felder)', () => {
  /* Partie 3 vierzig Züge vor dem Ende: dieselben Ketten sind schon pass-alive, aber
     es sind mehr als 160 Felder frei, evaluateBoard analysiert noch nicht */
  const {board, caps} = stellung(partie(3), partie(3).zuege.length - 40);
  let leer = 0; for (let i = 0; i < BOARD_SIZE; i++) if (!board[i]) leer++;
  pruefe(leer > PARAMS.bensonEvalMaxEmpty, `${leer} freie Felder, Grenze ${PARAMS.bensonEvalMaxEmpty}`);
  const aus = mit({bensonAliveExempt: 0}, () => evaluateBoard(board, 1, caps));
  const an = mit({bensonAliveExempt: 1}, () => evaluateBoard(board, 1, caps));
  pruefeGleich(an, aus, 'ohne Analyse keine Ausnahme');
  /* mit großzügiger Grenze wird die Kette erkannt und ausgenommen */
  mit({bensonEvalMaxEmpty: 400}, () => {
    const a2 = mit({bensonAliveExempt: 0}, () => evaluateBoard(board, 1, caps));
    const b2 = mit({bensonAliveExempt: 1}, () => evaluateBoard(board, 1, caps));
    pruefe(b2 < a2, `mit Analyse: ${a2} → ${b2}`);
  });
});

test('Schalter 0 und fehlender Schlüssel: dieselben Werte wie vor der Änderung', () => {
  /* Referenzwerte der Partie vom 22.09. (tests/benson-transfer.js, Stand vor bensonDeathTransfer) */
  const SGF = path.join(__dirname, 'stellungen', 'laufkampf-211.sgf');
  const txt = fs.readFileSync(SGF, 'utf8'), zs = []; const re = /;([BW])\[([a-s]{0,2})\]/g; let m;
  while ((m = re.exec(txt))) zs.push(m[2] ? {farbe: m[1] === 'B' ? 1 : 2, i: idx(m[2].charCodeAt(0) - 97, m[2].charCodeAt(1) - 97)} : {farbe: m[1] === 'B' ? 1 : 2, i: -1});
  const VORHER = {184: 153, 185: 55, 191: -188, 194: -199};
  for (const [bis, soll] of Object.entries(VORHER)) {
    const board = new Uint8Array(BOARD_SIZE), caps = {1: 0, 2: 0};
    for (let t = 0; t < +bis; t++) { const z = zs[t]; if (z.i < 0) continue; board[z.i] = z.farbe; caps[z.farbe] += removeDeadGroups(board, z.farbe === 1 ? 2 : 1, z.i); }
    const aus = mit({bensonAliveExempt: 0}, () => evaluateBoard(board, 2, caps));
    pruefeGleich(aus, soll, `Zug ${bis}: Schalter 0 gibt den alten Wert`);
    const ohneSchluessel = (() => { const alt = PARAMS.bensonAliveExempt; delete PARAMS.bensonAliveExempt; try { return evaluateBoard(board, 2, caps); } finally { PARAMS.bensonAliveExempt = alt; } })();
    pruefeGleich(ohneSchluessel, soll, `Zug ${bis}: ohne den Schlüssel derselbe Wert`);
    pruefeGleich(mit({bensonAliveExempt: 1}, () => evaluateBoard(board, 2, caps)), soll, `Zug ${bis}: in dieser Partie ändert die Ausnahme nichts`);
  }
  pruefeGleich(PARAMS.bensonAliveExempt, 0, 'Default 0');
});

laufeTests('bensonAliveExempt — Benson-lebende Ketten ohne Sterbe-Treppe').then(ok => process.exit(ok ? 0 : 1));
