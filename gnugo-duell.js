#!/usr/bin/env node
/* Unsere Hard-KI gegen GNU Go — ein Gegner, der nicht wir selbst sind.

   Alle A/B-Läufe in ab-harness.js sind Selbstspiel: Sie zeigen, ob eine
   Änderung besser ist als vorher, nicht wie stark die KI ist, und sie können
   Verbesserungen vortäuschen, die nur gegen die eigene Spielweise wirken.
   GNU Go (3.8, feste Stufen 1–10) ist ein unabhängiger, reproduzierbarer
   Maßstab. Gesprochen wird GTP über stdin/stdout.

   Ablauf je Partie: GNU Go frisch starten (eigener Seed), Farben wechseln
   je Partie (gerade Nummer: wir Schwarz). Unsere Züge kommen aus getAIMove
   mit den Parametern aus --ki, GNU Gos aus genmove. Ende bei zwei Pässen,
   Aufgabe oder --maxzuege. Gezählt wird von GNU Go (final_score,
   chinesische Regeln, Komi 7,5) — GNU Go erkennt tote Steine besser als
   unsere eigene Auszählung; unsere Zählung (Benson-tote entfernt, Fläche)
   steht zum Vergleich daneben. Nach jeder Partie werden die Bretter beider
   Programme verglichen (list_stones); weicht eins ab, bricht der Lauf ab,
   denn dann haben die beiden verschiedene Partien gespielt.

   Reproduzierbar mit mctsFixedSims: Unser Zufall ist je Partie geseedet,
   GNU Go bekommt --seed. Mit Zeitbudget nicht.

   Voraussetzung: GNU Go, z. B. `apt-get install gnugo` (liegt dann unter
   /usr/games/gnugo).

   Aufruf:
     node gnugo-duell.js --partien N --seed S [--stufe 1-10] [--ki k=v,...]
                         [--roh aus.jsonl] [--gnugo pfad] [--maxzuege 400]
                         [--von K]   (erst ab Partie K, für Teilläufe)
                         [--vorgabe N] (wir bekommen N Vorgabesteine)
                         [--schaetzung 60,120] (GNU Gos estimate_score nach
                          diesen Zugzahlen, aus unserer Sicht: + = wir vorn;
                          endet die Partie am Zuglimit, wird nicht ausgezählt)
   Jede Partie bekommt zusätzlich `endstand`: GNU Gos final_score der
   Schlussstellung aus unserer Sicht, auch bei Aufgabe und Zuglimit.
   GTP_DEBUG=1 in der Umgebung zeigt jeden GTP-Befehl und jede Antwort.

   Vorgabe (--vorgabe N ≥ 2): Wir spielen in jeder Partie Schwarz mit N
   Steinen auf den Standardpunkten (GTP fixed_handicap), GNU Go Weiß, Komi
   0,5, Weiß zieht zuerst. Ohne Vorgabe wechseln die Farben je Partie, Komi
   7,5. Für getAIMove zählt die Zugnummer ab dem ersten gespielten Zug.
*/
'use strict';
const fs = require('fs');
const path = require('path');
const {spawn} = require('child_process');

/* ── Optionen ─────────────────────────────────────────────────────── */
const a = process.argv.slice(2);
const opt = {partien: 10, seed: 1, stufe: 10, ki: {}, roh: null, gnugo: '/usr/games/gnugo',
             maxZuege: 400, von: 1, vorgabe: 0, schaetzung: []};
for (let i = 0; i < a.length; i++) {
  const v = a[i + 1];
  switch (a[i]) {
    case '--partien': opt.partien = +v; i++; break;
    case '--seed': opt.seed = +v; i++; break;
    case '--stufe': opt.stufe = +v; i++; break;
    case '--roh': opt.roh = v; i++; break;
    case '--gnugo': opt.gnugo = v; i++; break;
    case '--maxzuege': opt.maxZuege = +v; i++; break;
    case '--von': opt.von = +v; i++; break;
    case '--vorgabe': opt.vorgabe = +v; i++; break;
    case '--schaetzung': opt.schaetzung = v.split(',').map(Number); i++; break;
    case '--ki': for (const kv of v.split(',')) { const [k, w] = kv.split('='); opt.ki[k] = +w; } i++; break;
    default: console.error('Unbekannte Option ' + a[i]); process.exit(2);
  }
}

/* ── Engine laden, wie weiterspielen.js; dazu ein Setzer für die
      Modulzustände, die über Partien hinweg nicht weiterleben dürfen. ── */
const html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
const ex = id => new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html)[1];
globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
globalThis.document = {getElementById: () => null};
(0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai')
  + ';globalThis.__D={PARAMS,getAIMove,computeZobrist,removeDeadGroups,floodFill,'
  + 'bensonClassify,_bnDead,BOARD_SIZE,NEIGHBORS,setzeKrisenDauer,'
  + 'neuePartie(){_mctsSavedRoot=null;_hopelessStreak=0;_allDeadStreak=0;_lastMsPerSim=null;}};');
const E = globalThis.__D;
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));
const N = E.BOARD_SIZE;
const KOMI = opt.vorgabe >= 2 ? 0.5 : 7.5;

function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

/* ── Koordinaten: GTP-Spalten ohne I, Zeile 1 unten; bei uns y = 0 oben ── */
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));
function vonGtp(s) {
  const t = s.trim().toUpperCase();
  if (t === 'PASS') return -1;
  if (t === 'RESIGN') return -2;
  const x = SPALTEN.indexOf(t[0]), r = +t.slice(1);
  if (x < 0 || !(r >= 1 && r <= 19)) throw new Error('GTP-Koordinate unlesbar: ' + s);
  return (19 - r) * 19 + x;
}

/* ── GTP: eine Anfrage, eine Antwort (endet mit Leerzeile) ──────────── */
function gnugoStarten(seed) {
  const p = spawn(opt.gnugo, ['--mode', 'gtp', '--level', String(opt.stufe), '--chinese-rules',
                              '--komi', String(KOMI), '--seed', String(seed)], {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = '', warte = [], stderr = '';
  p.stderr.on('data', d => { stderr += d.toString(); });
  /* Stirbt GNU Go, darf keine Anfrage ewig warten. */
  p.on('exit', (code, sig) => {
    for (const w of warte.splice(0)) w(`? GNU Go beendet (code ${code}, signal ${sig}) ${stderr.slice(-300)}`);
  });
  p.stdout.on('data', d => {
    puffer += d.toString();
    let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) {
      const antwort = puffer.slice(0, k); puffer = puffer.slice(k + 2);
      const w = warte.shift(); if (w) w(antwort);
    }
  });
  const frage = befehl => new Promise((ok, fehler) => {
    warte.push(antwort => {
      if (process.env.GTP_DEBUG) console.error('<< ' + antwort);
      if (antwort.startsWith('=')) ok(antwort.slice(1).trim());
      else fehler(new Error(`GNU Go: ${befehl} → ${antwort}`));
    });
    if (process.env.GTP_DEBUG) console.error('>> ' + befehl);
    p.stdin.write(befehl + '\n');
  });
  return {frage, ende: () => { try { p.stdin.write('quit\n'); } catch (e) {} p.kill(); }};
}

/* ── Unsere Zählung, wie im Harness: Benson-tote Ketten weg, Fläche ── */
function unsereZaehlung(board) {
  const b = new Uint8Array(board);
  const ep = E.bensonClassify(b);
  for (let i = 0; i < N; i++) if (b[i] && E._bnDead[i] === ep) b[i] = 0;
  const f = {1: 0, 2: 0}, ges = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (b[i]) f[b[i]]++;
  for (let i = 0; i < N; i++) {
    if (b[i] || ges[i]) continue;
    const q = [i]; ges[i] = 1; let rand = 0;
    for (let k = 0; k < q.length; k++) for (const n of E.NEIGHBORS[q[k]]) {
      if (!b[n]) { if (!ges[n]) { ges[n] = 1; q.push(n); } } else rand |= b[n];
    }
    if (rand === 1 || rand === 2) f[rand] += q.length;
  }
  return {b: f[1], w: f[2] + KOMI};
}

function setze(board, i, f) {
  board[i] = f;
  const cap = E.removeDeadGroups(board, 3 - f, i);
  let ko = null;
  if (cap === 1) { const ff = E.floodFill(board, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
  return {cap, ko};
}

/* GNU Go 3.8 (Debian-Paket) stürzt an manchen Stellungen ab
   (Speicherzugriffsfehler). Geprüft an einer langen diagonalen Treppe: auf
   allen Stufen, mit jedem Seed, ohne Zugfolge (Steine direkt gesetzt), mit
   reg_genmove, ohne Fuseki-/Joseki-Datenbank, mit größerem Stack — die
   Stellung selbst löst es aus. Ein Neustart (nächster Seed, Züge
   nachgespielt) bleibt als Gegenprobe; stürzt es wieder ab, wird die
   Partie als abgebrochen gezählt und nicht gewertet. */
const MAX_NEUSTARTS = 1;
function gnugoMitNeustart(seed) {
  const verlauf = [];
  let g = null, versuch = 0, neustarts = 0;
  async function starte() {
    if (g) g.ende();
    g = gnugoStarten(seed + 7919 * versuch);
    await g.frage('boardsize 19'); await g.frage('clear_board'); await g.frage('komi ' + KOMI);
    for (const z of verlauf) await g.frage(z);
  }
  async function frage(befehl) {
    for (;;) {
      try {
        const antwort = await g.frage(befehl);
        if (befehl.startsWith('play ')) verlauf.push(befehl);
        return antwort;
      } catch (e) {
        if (!/GNU Go beendet/.test(e.message) || versuch >= MAX_NEUSTARTS) throw e;
        versuch++; neustarts++;
        if (process.env.GTP_DEBUG) console.error(`Neustart ${versuch}: ${e.message.slice(0, 80)}`);
        await starte();
      }
    }
  }
  return {starte, frage, merke: z => verlauf.push(z), neustarts: () => neustarts, ende: () => g && g.ende()};
}

async function partie(nr) {
  try { return await partieSpielen(nr); }
  catch (e) {
    if (!/GNU Go beendet/.test(e.message)) throw e;
    return {nr, stufe: opt.stufe, ki: opt.ki, abgebrochen: e.message.slice(0, 120)};
  }
}

async function partieSpielen(nr) {
  /* Ohne Vorgabe: gerade Nummer wir Schwarz. Mit Vorgabe immer Schwarz. */
  const wir = opt.vorgabe >= 2 || nr % 2 === 0 ? 1 : 2;
  const seed = opt.seed * 100000 + nr;
  const g = gnugoMitNeustart(seed);
  await g.starte();
  Math.random = mulberry32(seed);
  E.neuePartie(); E.setzeKrisenDauer(null);
  const board = new Uint8Array(N), caps = {1: 0, 2: 0};
  const hist = new Set([E.computeZobrist(board)]);
  let ko = null, last = null, mc = 0, paesse = 0, aufgabe = null;
  const zuege = [], sims = [], schaetzung = {};
  let vorgabeSteine = [];
  if (opt.vorgabe >= 2) {
    const befehl = `fixed_handicap ${opt.vorgabe}`;
    vorgabeSteine = (await g.frage(befehl)).split(/\s+/).filter(Boolean);
    g.merke(befehl);   /* für einen Neustart mit nachzuspielen */
    for (const v of vorgabeSteine) board[vonGtp(v)] = 1;
    hist.add(E.computeZobrist(board));
  }
  const zuerst = opt.vorgabe >= 2 ? 2 : 1;
  try {
    while (mc < opt.maxZuege && paesse < 2 && !aufgabe) {
      const f = mc % 2 === 0 ? zuerst : 3 - zuerst, farbe = f === 1 ? 'B' : 'W';
      let i;
      if (f === wir) {
        Object.assign(E.PARAMS, DEFAULT, {adaptiveBudgetEnabled: 0}, opt.ki);
        const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last);
        if (r.type === 'resign') { aufgabe = f; break; }
        i = r.type === 'stone' ? r.y * 19 + r.x : -1;
        const m = /MCTS (\d+) Sims/.exec(r.info || ''); if (m) sims.push(+m[1]);
        await g.frage(`play ${farbe} ${i < 0 ? 'pass' : zuGtp(i)}`);
      } else {
        i = vonGtp(await g.frage(`genmove ${farbe}`));
        if (i === -2) { aufgabe = f; break; }
        /* genmove legt den Zug bei GNU Go selbst; für einen Neustart muss er
           als play im Verlauf stehen. */
        g.merke(`play ${farbe} ${i < 0 ? 'pass' : zuGtp(i)}`);
      }
      if (i < 0) { paesse++; ko = null; zuege.push('pass'); }
      else {
        if (board[i]) throw new Error(`Zug ${mc + 1} auf besetztes Feld ${zuGtp(i)}`);
        const s = setze(board, i, f);
        caps[f] += s.cap; ko = s.ko; last = i; paesse = 0;
        hist.add(E.computeZobrist(board));
        zuege.push(zuGtp(i));
      }
      mc++;
      if (opt.schaetzung.includes(mc)) {
        const a = await g.frage('estimate_score');          /* "W+145.1 (upper …)" */
        const m = /^([BW])\+([\d.]+)/.exec(a);
        if (m) schaetzung[mc] = (m[1] === (wir === 1 ? 'B' : 'W') ? 1 : -1) * +m[2];
      }
    }
    /* Bretter vergleichen: haben beide dieselbe Partie gespielt? */
    for (const [farbe, f] of [['black', 1], ['white', 2]]) {
      const bei = new Set((await g.frage(`list_stones ${farbe}`)).split(/\s+/).filter(Boolean).map(vonGtp));
      for (let k = 0; k < N; k++)
        if ((board[k] === f) !== bei.has(k)) throw new Error(`Partie ${nr}: Bretter weichen ab an ${zuGtp(k)}`);
    }
    let gnugoStand = null, sieger;
    /* Endstand: GNU Gos Auszählung der Schlussstellung, aus unserer Sicht,
       wie immer die Partie endete (zwei Pässe, Aufgabe, Zuglimit). Bei
       Aufgabe und Zuglimit ist das die Stellung, wie sie stehen blieb. */
    const fsAntwort = await g.frage('final_score');
    const fsM = /^([BW])\+([\d.]+)/.exec(fsAntwort);
    const endstand = fsM ? (fsM[1] === (wir === 1 ? 'B' : 'W') ? 1 : -1) * +fsM[2] : 0;   /* "0" = Gleichstand */
    if (aufgabe) sieger = 3 - aufgabe;
    else if (mc >= opt.maxZuege && opt.schaetzung.length) sieger = null;   /* nur Schätzung */
    else {
      gnugoStand = fsAntwort;                                /* z. B. "W+12.5" */
      sieger = gnugoStand.startsWith('B') ? 1 : 2;
    }
    return {nr, stufe: opt.stufe, ki: opt.ki, seed, wirFarbe: wir === 1 ? 'S' : 'W',
            gewonnen: sieger === null ? null : sieger === wir,
            sieger: sieger === null ? null : sieger === 1 ? 'S' : 'W',
            vorgabe: opt.vorgabe, komi: KOMI, vorgabeSteine, beginnt: zuerst === 1 ? 'S' : 'W',
            aufgabe: aufgabe ? (aufgabe === 1 ? 'S' : 'W') : null,
            gnugoStand, endstand, unsereZaehlung: unsereZaehlung(board), zuegeAnzahl: mc,
            simsMittel: sims.length ? Math.round(sims.reduce((x, y) => x + y, 0) / sims.length) : null,
            neustarts: g.neustarts(), schaetzung,
            zuege};
  } finally { g.ende(); }
}

(async () => {
  if (!fs.existsSync(opt.gnugo)) { console.error(`GNU Go nicht gefunden: ${opt.gnugo}`); process.exit(2); }
  let siege = 0, n = 0;
  for (let nr = opt.von; nr < opt.von + opt.partien; nr++) {
    const t0 = Date.now();
    const r = await partie(nr);
    n++; if (r.gewonnen) siege++;
    if (opt.roh) fs.appendFileSync(opt.roh, JSON.stringify(r) + '\n');
    if (r.abgebrochen) { n--; console.log(`Partie ${nr}: abgebrochen (${r.abgebrochen})`); continue; }
    const sch = Object.entries(r.schaetzung).map(([z, v]) => `nach ${z}: ${v > 0 ? '+' : ''}${v}`).join(', ');
    console.log(`Partie ${nr}: wir ${r.wirFarbe} → ${r.gewonnen === null ? 'nicht ausgezählt' : r.gewonnen ? 'gewonnen' : 'verloren'}`
      + ` (${r.aufgabe ? 'Aufgabe ' + r.aufgabe : r.gnugoStand || 'Zuglimit'}; unsere Zählung S ${r.unsereZaehlung.b} : W ${r.unsereZaehlung.w})`
      + (sch ? ` · Schätzung ${sch}` : '')
      + ` · ${r.zuegeAnzahl} Züge${r.neustarts ? ` · ${r.neustarts} Neustart(s) von GNU Go` : ''}`
      + ` · ${((Date.now() - t0) / 60000).toFixed(1)} min · Stand ${siege}/${n}`);
  }
})().catch(e => { console.error(e.stack || e.message); process.exit(1); });
