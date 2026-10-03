/* Wie zufällig ist die Kandidatenliste an der Wurzel — und warum?
   Gehört zu docs/wurzel-gleichstand.md.

   MCTS bekommt an der Wurzel die besten PARAMS.mctsRootChildren Züge nach
   evaluateMove. evaluateMove rauscht: jeder der vier Phasen-Experten addiert
   Math.random() mal 3, 4, 0,5 oder 3. Zwei Erklärungen sind möglich, warum
   zwei Ziehungen auf demselben Brett verschiedene Listen liefern:

     a) das Rauschen sortiert Züge mit VERSCHIEDENEN Werten um, oder
     b) an der Grenze zur Liste stehen viele Züge mit GLEICHEM Wert, und das
        Rauschen lost aus, welche hineinkommen.

   Getrennt wird das, indem Math.random skaliert wird. Bei Faktor 1e-6 ist
   das Rauschen höchstens 4e-6 — kleiner als jeder Abstand zwischen zwei
   verschiedenen rauschfreien Werten (gemessen: mindestens 0,5), bricht aber
   weiterhin jeden Gleichstand zufällig. Bleibt die Überlappung dann gleich,
   ist (b) die Ursache. Math.random kommt in evaluateMove und den Experten
   nur in diesen Rauschtermen vor (und in −10000 + Math.random() für
   Selbstmord ohne Schlag); die Skalierung trifft also genau sie.

   Die Stellungen stammen aus einem Rohdump (echte Partien der Engine gegen
   sich selbst). Die Vorbereitung folgt getAIMove: Benson-Zugfilter,
   emptyFields = Zahl der Kandidaten nach dem Filter, buildCrisisMap,
   primeAreaCache, bei endTieBreak > 0 primeEndTieBreak. Abweichung: kein Superko-Verlauf (der Dump trägt keinen);
   der einfache Ko-Punkt wird aus dem letzten Einzelschlag rekonstruiert.

   Aufruf:
     node auswertung/wurzel-gleichstand.js <dump.jsonl> [--partien N] [--abstand K]
                                           [--A k=v,... --B k=v,...]
   Mit --A/--B wird jede Stellung mit den Parametern des Arms bewertet, der
   dort am Zug war, und das Ergebnis zusätzlich je Arm berichtet. */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const K = E.PARAMS.mctsRootChildren;

function mulberry32(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Kandidaten und Zugwerte wie in getAIMove; `zufall` ersetzt Math.random
   nur für die Dauer der Bewertung. */
function bewerte(board, farbe, mc, ko, zufall) {
  let legal = E.getLegalMoves(board, farbe, new Set(), ko);
  if (!legal.length) return null;
  if (E.PARAMS.bensonMoveFilter >= 1) {
    const ep = E.bensonClassify(board);
    const born = E._bnBornDead[farbe];
    legal = legal.filter(m => born[m.idx] !== ep);
    if (!legal.length) return null;
  }
  const empty = legal.length;
  E.buildCrisisMap(board, farbe);
  E.primeAreaCache(board, farbe);
  if (E.PARAMS.endTieBreak > 0) E.primeEndTieBreak(board);
  const echt = Math.random;
  Math.random = zufall;
  try {
    const sc = legal.map(m => ({i: m.idx, s: E.evaluateMove(board, m.idx, farbe, mc, empty)}));
    sc.sort((a, b) => b.s - a.s);   /* stabil, wie in getAIMove */
    return sc;
  } finally { Math.random = echt; }
}
const spitze = sc => new Set(sc.slice(0, K).map(x => x.i));
const ueberlappung = (a, b) => { let o = 0; for (const x of a) if (b.has(x)) o++; return o / Math.min(K, a.size); };

/* PARAMS für die Dauer von fn setzen und exakt zurückgeben. */
function mitParams(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = E.PARAMS[k]; E.PARAMS[k] = werte[k]; }
  try { return fn(); } finally { for (const k of Object.keys(alt)) E.PARAMS[k] = alt[k]; }
}

/* armParams = {A: {...}, B: {...}}: jede Stellung wird mit den Parametern
   des Arms bewertet, der dort am Zug ist — so, wie er sie im Lauf sah. */
function messen(datei, {partien = 40, abstand = 20, armParams = null} = {}) {
  const P = fs.readFileSync(datei, 'utf8').trim().split('\n').slice(0, partien).map(z => JSON.parse(z));
  const zeilen = [];
  let seed = 1;
  for (const p of P) {
    const b = new Uint8Array(E.BOARD_SIZE);
    let ko = null;
    p.ereignisse.forEach((e, t) => {
      const farbe = e.farbe === 'S' ? 1 : 2;
      const arm = farbe === 1 ? p.armSchwarz : p.armWeiss;
      if (t > 0 && t % abstand === 0) mitParams(armParams ? armParams[arm] || {} : {}, () => {
        const roh = bewerte(b, farbe, t, ko, () => 0);
        if (roh && roh.length > K) {
          const s1 = seed++, s2 = seed++;
          const voll1 = bewerte(b, farbe, t, ko, mulberry32(s1));
          const voll2 = bewerte(b, farbe, t, ko, mulberry32(s2));
          const r1 = mulberry32(s1), r2 = mulberry32(s2);
          const fein1 = bewerte(b, farbe, t, ko, () => 1e-6 * r1());
          const fein2 = bewerte(b, farbe, t, ko, () => 1e-6 * r2());
          const v = roh[K - 1].s;
          const ueber = roh.filter(x => x.s > v).length;
          const gleich = roh.filter(x => x.s === v).length;
          let minAbstand = Infinity;
          for (let k = 1; k < roh.length; k++) {
            const d = roh[k - 1].s - roh[k].s;
            if (d > 0 && d < minAbstand && roh[k].s > -5000) minAbstand = d;
          }
          /* Der tatsächlich gespielte Zug, eingeordnet nach seinem
             rauschfreien Wert: über der Grenze (sicher in der Liste), in der
             Gleichstandsgruppe (nur per Los in der Liste) oder darunter. */
          let gespielt = 'pass';
          if (e.idx >= 0) {
            const w = roh.find(x => x.i === e.idx);
            gespielt = !w ? 'gefiltert' : w.s > v ? 'sicher' : w.s === v ? 'los' : 'darunter';
          }
          /* Nach Phasengewicht einordnen, nicht nach Zugnummer (README,
             Warnung zur Methode): welcher Experte bewertet hier? */
          const pw = E.phaseWeights(t, roh.length);
          const experte = pw.wEnd >= pw.wMid && pw.wEnd >= pw.wOpen ? 'Endspiel'
                        : pw.wMid >= pw.wOpen ? 'Mittelspiel' : 'Eröffnung';
          zeilen.push({partie: p.nr, zug: t, kandidaten: roh.length, wert: v, ueber, gleich, experte,
                       minAbstand, gespielt, arm,
                       voll: ueberlappung(spitze(voll1), spitze(voll2)),
                       fein: ueberlappung(spitze(fein1), spitze(fein2))});
        }
      });
      if (e.idx >= 0) {
        b[e.idx] = farbe;
        const cap = E.removeDeadGroups(b, farbe === 1 ? 2 : 1, e.idx);
        ko = null;
        if (cap === 1) {
          const ff = E.floodFill(b, e.idx);
          if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0];
        }
      } else ko = null;
    });
  }
  return zeilen;
}

function bericht(zeilen, proArm = false) {
  const L = [], log = s => L.push(s);
  const mit = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const proz = x => (100 * x).toFixed(1) + ' %';
  const quer = z => z.ueber < K && z.ueber + z.gleich > K;
  const lospl = z => quer(z) ? K - z.ueber : 0;
  /* Erwartete Überlappung, wenn NUR der Gleichstand gelost wird: die
     sicheren Plätze immer, von s Losplätzen aus g Zügen im Mittel s²/g. */
  const erwartet = z => quer(z) ? (z.ueber + lospl(z) ** 2 / z.gleich) / K : 1;

  log(`Stellungen: ${zeilen.length} (Wurzelliste: ${K} Plätze)`);
  log(`kleinster Abstand zwischen zwei verschiedenen rauschfreien Werten: `
    + `${Math.min(...zeilen.map(z => z.minAbstand))}`);
  log('');
  log(`Top-${K}-Überlappung zweier Ziehungen`);
  log(`  volles Rauschen                    Ø ${proz(mit(zeilen.map(z => z.voll)))}`);
  log(`  Rauschen × 1e-6 (nur Gleichstände)  Ø ${proz(mit(zeilen.map(z => z.fein)))}`);
  log(`  erwartet, wenn nur gelost wird      Ø ${proz(mit(zeilen.map(erwartet)))}`);
  log('');
  const q = zeilen.filter(quer);
  log(`Gleichstand über Platz ${K} hinweg: ${q.length} von ${zeilen.length} Stellungen (${proz(q.length / zeilen.length)})`);
  if (q.length) {
    const g = q.map(z => z.gleich).sort((a, b) => a - b);
    const u = q.map(z => z.ueber).sort((a, b) => a - b);
    log(`  Größe der Gleichstandsgruppe: Median ${g[g.length >> 1]}, Spanne ${g[0]}–${g[g.length - 1]}`);
    log(`  sicher in der Liste (Wert darüber): Median ${u[u.length >> 1]} Züge`);
    log(`  per Los vergebene Plätze: Ø ${mit(zeilen.map(lospl)).toFixed(1)} von ${K} über alle Stellungen`);
    const werte = {};
    for (const z of q) werte[z.wert] = (werte[z.wert] || 0) + 1;
    log(`  Wert der Gleichstandsgruppe: ` + Object.entries(werte).sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([w, n]) => `${w} (${n}×)`).join(', '));
  }
  log('');
  const zaehl = k => zeilen.filter(z => z.gespielt === k).length;
  const qz = zeilen.filter(quer);
  const losQ = qz.filter(z => z.gespielt === 'los').length;
  log(`gespielter Zug, nach seinem rauschfreien Wert`);
  log(`  sicher in der Liste ${zaehl('sicher')}   aus der Gleichstandsgruppe ${zaehl('los')}`
    + `   darunter ${zaehl('darunter')}   Pass ${zaehl('pass')}   vom Filter entfernt ${zaehl('gefiltert')}`);
  if (qz.length)
    log(`  in Stellungen mit Gleichstand über Platz ${K}: ${losQ} von ${qz.length} gespielten Zügen`
      + ` (${proz(losQ / qz.length)}) stammen aus der gelosten Gruppe`);
  log('');
  log('nach dominierendem Experten');
  for (const nm of ['Eröffnung', 'Mittelspiel', 'Endspiel']) {
    const t = zeilen.filter(z => z.experte === nm);
    if (!t.length) continue;
    const zz = t.map(z => z.zug).sort((a, b) => a - b);
    log(`  ${nm.padEnd(11)} Zug ${zz[0]}–${zz[zz.length - 1]}`.padEnd(26)
      + ` ${String(t.length).padStart(4)} Stellungen   Gleichstand ${proz(t.filter(quer).length / t.length).padStart(7)}`
      + `   Losplätze Ø ${mit(t.map(lospl)).toFixed(1).padStart(4)}   Überlappung voll ${proz(mit(t.map(z => z.voll))).padStart(7)}`
      + `   nur Gleichstand ${proz(mit(t.map(z => z.fein))).padStart(7)}`
      + `   gespielt aus Los ${proz(t.filter(z => z.gespielt === 'los').length / t.length).padStart(7)}`);
  }
  if (proArm) {
    log('');
    log('nach Arm (jede Stellung mit den Parametern des Arms bewertet, der am Zug war)');
    for (const a of ['A', 'B']) {
      const t = zeilen.filter(z => z.arm === a);
      if (!t.length) continue;
      const e = t.filter(z => z.experte === 'Endspiel');
      log(`  ${a}: ${String(t.length).padStart(5)} Stellungen   Endspiel-Experte ${proz(e.length / t.length).padStart(7)}`
        + `   Losplätze Ø ${mit(t.map(lospl)).toFixed(1).padStart(4)}`
        + `   gespielt aus Los ${proz(t.filter(z => z.gespielt === 'los').length / t.length).padStart(7)}`);
    }
  }
  return L.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (!a[0]) {
    console.error('Aufruf: node auswertung/wurzel-gleichstand.js <dump.jsonl> [--partien N] [--abstand K]');
    process.exit(2);
  }
  const opt = {};
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--partien') opt.partien = +a[++i];
    else if (a[i] === '--abstand') opt.abstand = +a[++i];
    else if (a[i] === '--A' || a[i] === '--B') {
      opt.armParams = opt.armParams || {A: {}, B: {}};
      for (const kv of a[++i].split(',')) { const [k, v] = kv.split('='); opt.armParams[a[i - 1].slice(2)][k] = +v; }
    }
  }
  console.log(bericht(messen(a[0], opt), !!opt.armParams));
}

module.exports = {messen, bericht, bewerte, PARAMS: E.PARAMS};
