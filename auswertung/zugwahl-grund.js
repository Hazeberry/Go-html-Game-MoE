/* Warum spielt die KI verschenkte Züge? Gehört zu docs/verschenkt-warum.md.

   Spielt Partien eines Rohdumps von gnugo-duell.js nach und stellt an jeder
   eigenen Stellung ab --ab die Zugwahl mit den heutigen Defaults nach
   (getAIMove, 120 Simulationen, ohne Baumwiederverwendung). Festgehalten
   werden für den gespielten Zug m und für GNU Gos Vorschlag g (aus einer
   Verlaufsdatei von endspiel-verlauf.js):

     rang     Platz in der Kandidatenliste nach evaluateMove und allen
              Filtern (1 = bester); 0 = nicht in der Liste (gefiltert)
     krise    Krisengewicht des Punkts (1 = Wert ganz aus evalTsumego)
     tsumego  evalTsumego des Zugs
     gebiet   Anteil von gebietZug am Wert (Wert mit minus ohne gebietZug)
     wert     evaluateMove
     dBrett   evaluateBoard nach minus vor dem Zug (Blattbewertung der Suche)
     zone     Einflusszone vor dem Zug: 1 eigene, 0 neutral, −1 gegnerische
     freiheiten, kette  Freiheiten und Größe der Kette des neuen Steins
     verschenkt  Stein später geschlagen oder am Ende tot (verschenkt.js)

   Aufruf:
     node auswertung/zugwahl-grund.js <dump.jsonl> --verlauf <verlauf.jsonl>
          [--ab 100] [--aus grund.jsonl]
     node auswertung/zugwahl-grund.js --bericht grund.jsonl [...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const {analysiere: verschenktAnalyse} = require('./verschenkt.js');

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));

/* mctsPUCT abfangen: die Kandidatenliste, die getAIMove der Suche gibt. */
let letzteListe = null;
const echteSuche = globalThis.mctsPUCT;
globalThis.mctsPUCT = function (board, color, caps, rootScored, ko) {
  letzteListe = rootScored.map(s => ({idx: s.m.idx, score: s.score}));
  return echteSuche(board, color, caps, rootScored, ko);
};

function mulberry32(a) {
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function bestandteile(b, i, f, mc, leer, caps) {
  if (i < 0 || b[i]) return null;
  E.buildCrisisMap(b, f); E.primeAreaCache(b, f); E.primeEndTieBreak(b);
  const krise = E.getCrisisWeight(i);
  const tsumego = krise > 0 ? E.evalTsumego(b, i, f, mc) : 0;
  const wert = E.evaluateMove(b, i, f, mc, leer);
  const gz = E.PARAMS.gebietZug; E.PARAMS.gebietZug = 0;
  const ohne = E.evaluateMove(b, i, f, mc, leer);
  E.PARAMS.gebietZug = gz;
  const nb = new Uint8Array(b); nb[i] = f;
  const cap = E.removeDeadGroups(nb, 3 - f, i);
  const c2 = {1: caps[1], 2: caps[2]}; c2[f] += cap;
  const dBrett = E.evaluateBoard(nb, f, c2) - E.evaluateBoard(b, f, caps);
  E.primeInfluenceCache(b);
  const zone = Math.sign(E.influenceZone(i, f));
  const ff = E.floodFill(nb, i);
  return {krise: +krise.toFixed(2), tsumego: +tsumego.toFixed(1), gebiet: +(wert - ohne).toFixed(1),
          wert: +wert.toFixed(1), dBrett: +dBrett.toFixed(1), zone, freiheiten: ff.liberties.length,
          kette: ff.group.length, schlag: cap};
}

function analysiere(p, verlauf, ab) {
  const best = new Map((verlauf ? verlauf.zuege : []).map(z => [z.mc, vonGtp(z.best)]));
  const weg = new Map(verschenktAnalyse(p, ab, '/usr/games/gnugo').filter(z => z.wir).map(z => [z.mc, z.weg]));
  const b = new Uint8Array(N), caps = {1: 0, 2: 0};
  for (const s of p.vorgabeSteine) b[vonGtp(s)] = 1;
  const hist = new Set([E.computeZobrist(new Uint8Array(N)), E.computeZobrist(b)]);
  const wir = p.wirFarbe === 'S' ? 1 : 2, zuerst = p.beginnt === 'S' ? 1 : 2;
  let ko = null, last = null;
  const aus = [];
  for (let k = 0; k < p.zuege.length; k++) {
    const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
    if (f === wir && mc >= ab && i >= 0) {
      Object.assign(E.PARAMS, DEFAULT, {mctsFixedSims: 120, resignEnabled: 0, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0});
      Math.random = mulberry32(p.seed * 1000 + mc);
      letzteListe = null;
      const r = E.getAIMove(new Uint8Array(b), f, Array.from(hist), {...caps}, mc - 1, 'hard', 1, ko, last);
      const liste = letzteListe || [];
      const rang = idx => { const n = liste.findIndex(s => s.idx === idx); return n < 0 ? 0 : n + 1; };
      const g = best.has(mc) ? best.get(mc) : -1;
      const leer = liste.length;
      aus.push({nr: p.nr, mc, zug: p.zuege[k], verschenkt: weg.get(mc),
                kandidaten: leer, neuGewaehlt: r.type === 'stone' ? r.y * 19 + r.x : -1,
                m: {idx: i, rang: rang(i), ...bestandteile(b, i, f, mc - 1, leer, caps)},
                g: g >= 0 ? {idx: g, rang: rang(g), ...bestandteile(b, g, f, mc - 1, leer, caps)} : null});
    }
    if (i < 0) { ko = null; continue; }
    b[i] = f;
    const cap = E.removeDeadGroups(b, 3 - f, i);
    caps[f] += cap;
    ko = null;
    if (cap === 1) { const ff = E.floodFill(b, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
    last = i;
    hist.add(E.computeZobrist(b));
  }
  return aus;
}

function bericht(z) {
  const anteil = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %` : '–';
  const mittel = (a, f) => a.length ? (a.reduce((s, x) => s + f(x), 0) / a.length).toFixed(1) : '–';
  const median = (a, f) => { const v = a.map(f).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : '–'; };
  for (const [name, gruppe] of [['verschenkt', z.filter(x => x.verschenkt)], ['nicht verschenkt', z.filter(x => x.verschenkt === false)]]) {
    console.log(`${name}: ${gruppe.length} Züge`);
    const m = gruppe.map(x => x.m).filter(Boolean);
    console.log(`  gespielter Zug: Rang 1 ${anteil(m, x => x.rang === 1)}, 2–3 ${anteil(m, x => x.rang >= 2 && x.rang <= 3)},`
      + ` 4–16 ${anteil(m, x => x.rang >= 4 && x.rang <= 16)}, > 16 ${anteil(m, x => x.rang > 16)}, gefiltert ${anteil(m, x => x.rang === 0)}`);
    console.log(`    Krisengewicht 1 (Wert ganz aus evalTsumego) ${anteil(m, x => x.krise >= 1)}, > 0 ${anteil(m, x => x.krise > 0)};`
      + ` Gebietsanteil Ø ${mittel(m, x => x.gebiet)}, Median ${median(m, x => x.gebiet)}; ΔevaluateBoard Ø ${mittel(m, x => x.dBrett)}`);
    const g = gruppe.map(x => x.g).filter(x => x && x.wert !== undefined);
    console.log(`  GNU Gos Vorschlag (${g.length}): Rang 1 ${anteil(g, x => x.rang === 1)}, 2–16 ${anteil(g, x => x.rang >= 2 && x.rang <= 16)},`
      + ` > 16 ${anteil(g, x => x.rang > 16)}, gefiltert ${anteil(g, x => x.rang === 0)}; Rang Median ${median(g, x => x.rang || 999)}`);
    console.log(`    Krisengewicht > 0 ${anteil(g, x => x.krise > 0)}; Gebietsanteil Ø ${mittel(g, x => x.gebiet)}, Median ${median(g, x => x.gebiet)};`
      + ` ΔevaluateBoard Ø ${mittel(g, x => x.dBrett)}`);
    const beide = gruppe.filter(x => x.m && x.g && x.g.wert !== undefined && x.m.idx !== x.g.idx);
    console.log(`  m vor g in der Liste: ${anteil(beide, x => x.m.rang && (x.g.rang === 0 || x.m.rang < x.g.rang))};`
      + ` evaluateBoard bevorzugt m: ${anteil(beide, x => x.m.dBrett > x.g.dBrett)}`);
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  let ab = 100, aus = null, verlaufDatei = null, berichtModus = false;
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--ab') ab = +a[++k];
    else if (a[k] === '--aus') aus = a[++k];
    else if (a[k] === '--verlauf') verlaufDatei = a[++k];
    else if (a[k] === '--bericht') berichtModus = true;
    else dateien.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (berichtModus) { bericht(dateien.flatMap(lies)); return; }
  const verlauf = new Map((verlaufDatei ? lies(verlaufDatei) : []).map(v => [v.nr, v]));
  for (const p of dateien.flatMap(lies)) {
    if (p.abgebrochen || !p.zuege) continue;
    const t0 = Date.now();
    const z = analysiere(p, verlauf.get(p.nr), ab);
    if (aus) fs.appendFileSync(aus, z.map(x => JSON.stringify(x)).join('\n') + (z.length ? '\n' : ''));
    console.log(`Partie ${p.nr}: ${z.length} Stellungen · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
}
