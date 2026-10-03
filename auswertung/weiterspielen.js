/* Aufgegebene Partien weiterspielen: War die Aufgabe richtig?

   Nimmt jede Partie eines Rohdumps (ab-harness.js --roh), die durch Aufgabe
   endete, baut die Stellung bei der Aufgabe nach und spielt sie Engine
   gegen Engine zu Ende — beide Arme mit ihren Parametern, Aufgabe aus.
   Gewinnt der Aufgebende dann doch, war die Aufgabe falsch. Gezählt wird wie
   im Harness (finalScore): Benson-tote Ketten entfernen, Fläche, Komi 7,5.

   Grenzen, bewusst: eine Fortsetzung je Partie (Zufall der Suche), ohne
   Tree-Reuse und ohne den Zustand der Aufgabe-Serie — eine Schätzung, ob
   die Stellung noch zu gewinnen war, kein Nachspielen des Laufs.
   Hintergrund und Ergebnis: docs/aufgaben.md.

   Aufruf:
     node auswertung/weiterspielen.js <dump.jsonl> --A k=v,... --B k=v,...
         [--von N] [--bis M] [--aus datei.jsonl]
     node auswertung/weiterspielen.js <dump.jsonl> --auswerten <datei.jsonl> [...]

   Die Armparameter müssen die des Laufs sein, z. B.
     --A mctsFixedSims=120 --B mctsFixedSims=120,influenceInvade=150,influenceOwn=150 */
'use strict';
const fs = require('fs');
const path = require('path');

const a = process.argv.slice(2);
const opt = {von: 0, bis: Infinity, aus: null, auswerten: [], A: {}, B: {}};
for (let i = 1; i < a.length; i++) {
  if (a[i] === '--A' || a[i] === '--B') {
    for (const kv of a[++i].split(',')) { const [k, v] = kv.split('='); opt[a[i - 1].slice(2)][k] = +v; }
  } else if (a[i] === '--von') opt.von = +a[++i];
  else if (a[i] === '--bis') opt.bis = +a[++i];
  else if (a[i] === '--aus') opt.aus = a[++i];
  else if (a[i] === '--auswerten') { while (a[i + 1] && !a[i + 1].startsWith('--')) opt.auswerten.push(a[++i]); }
}
if (!a[0]) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(2); }
const partien = fs.readFileSync(a[0], 'utf8').trim().split('\n').map(z => JSON.parse(z));

/* ── Auswertung vorhandener Ergebnisse ─────────────────────────────── */
if (opt.auswerten.length) {
  const R = opt.auswerten.flatMap(f => fs.readFileSync(f, 'utf8').trim().split('\n')
    .filter(Boolean).map(z => JSON.parse(z)));
  const g = {A: [0, 0], B: [0, 0]};
  for (const r of R) { g[r.aufgArm][0]++; if (r.gewinntDochNoch) g[r.aufgArm][1]++; }
  let siegeB = 0;
  for (const p of partien) if ((p.sieger === 'S' ? p.armSchwarz : p.armWeiss) === 'B') siegeB++;
  let bereinigt = siegeB;
  for (const r of R) if (r.gewinntDochNoch) bereinigt += r.aufgArm === 'B' ? 1 : -1;
  const aufg = partien.filter(p => p.aufgabe).length;
  console.log(`${R.length} von ${aufg} Aufgaben weitergespielt`);
  for (const arm of ['A', 'B'])
    console.log(`  ${arm} gab ${g[arm][0]}× auf, weitergespielt gewonnen ${g[arm][1]}× `
      + `(${(100 * g[arm][1] / (g[arm][0] || 1)).toFixed(1)} %)`);
  console.log(`  Siegrate B gemessen ${(100 * siegeB / partien.length).toFixed(1)} %`
    + ` → ohne falsche Aufgaben ${(100 * bereinigt / partien.length).toFixed(1)} %`);
  process.exit(0);
}

/* ── Weiterspielen ─────────────────────────────────────────────────── */
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const ex = id => new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html)[1];
globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
globalThis.document = {getElementById: () => null};
(0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai') + '\n' + ex('policy-net')
  + ';globalThis.__W={PARAMS,getAIMove,computeZobrist,removeDeadGroups,floodFill,'
  + 'bensonClassify,_bnDead,BOARD_SIZE,NEIGHBORS,setzeKrisenDauer};');
const E = globalThis.__W;
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* Wie finalScore im Harness. */
function endstand(board, komi) {
  const b = new Uint8Array(board);
  const ep = E.bensonClassify(b);
  for (let i = 0; i < E.BOARD_SIZE; i++) if (b[i] && E._bnDead[i] === ep) b[i] = 0;
  const flaeche = {1: 0, 2: 0}, gesehen = new Uint8Array(E.BOARD_SIZE);
  for (let i = 0; i < E.BOARD_SIZE; i++) if (b[i]) flaeche[b[i]]++;
  for (let i = 0; i < E.BOARD_SIZE; i++) {
    if (b[i] || gesehen[i]) continue;
    const q = [i]; gesehen[i] = 1; let kopf = 0, rand = 0;
    while (kopf < q.length) {
      const c = q[kopf++];
      for (const n of E.NEIGHBORS[c]) {
        if (!b[n]) { if (!gesehen[n]) { gesehen[n] = 1; q.push(n); } } else rand |= b[n];
      }
    }
    if (rand === 1 || rand === 2) flaeche[rand] += q.length;
  }
  return {b: flaeche[1], w: flaeche[2] + komi};
}

function setzeKo(board, idx, cap) {
  if (cap !== 1) return null;
  const ff = E.floodFill(board, idx);
  return ff.group.length === 1 && ff.liberties.length === 1 ? ff.liberties[0] : null;
}

const aufgegeben = partien.filter(p => p.aufgabe).slice(opt.von, opt.bis);
const raus = s => opt.aus ? fs.appendFileSync(opt.aus, s + '\n') : console.log(s);
if (opt.aus) fs.writeFileSync(opt.aus, '');
for (const p of aufgegeben) {
  const board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0};
  const hist = new Set([E.computeZobrist(board)]);
  let ko = null, last = null, mc = 0;
  for (const e of p.ereignisse) {
    if (e.idx >= 0) {
      const f = e.farbe === 'S' ? 1 : 2;
      board[e.idx] = f;
      const cap = E.removeDeadGroups(board, f === 1 ? 2 : 1, e.idx);
      caps[f] += cap; ko = setzeKo(board, e.idx, cap); last = e.idx;
      hist.add(E.computeZobrist(board));
    } else ko = null;
    mc++;
  }
  Math.random = mulberry32(1000 + p.nr);
  let passes = 0;
  while (mc < 400 && passes < 2) {
    const farbe = mc % 2 === 0 ? 1 : 2;
    const arm = farbe === 1 ? p.armSchwarz : p.armWeiss;
    Object.assign(E.PARAMS, DEFAULT, {aiTimeBudget: 250, adaptiveBudgetEnabled: 0,
      resignEnabled: 0, mctsTreeReuse: 0}, opt[arm]);
    E.setzeKrisenDauer(null);
    const r = E.getAIMove(board, farbe, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last);
    const i = r.type === 'stone' ? r.y * 19 + r.x : -1;
    if (i < 0 || board[i]) { passes++; ko = null; mc++; continue; }
    board[i] = farbe;
    const cap = E.removeDeadGroups(board, farbe === 1 ? 2 : 1, i);
    caps[farbe] += cap; ko = setzeKo(board, i, cap);
    hist.add(E.computeZobrist(board)); last = i; passes = 0; mc++;
  }
  const s = endstand(board, 7.5);
  raus(JSON.stringify({nr: p.nr, aufgabe: p.aufgabe,
    aufgArm: p.aufgabe === 'S' ? p.armSchwarz : p.armWeiss,
    gewinntDochNoch: (s.b > s.w ? 'S' : 'W') === p.aufgabe,
    zugBeiAufgabe: p.ereignisse.length, ende: mc, endstand: s}));
}
