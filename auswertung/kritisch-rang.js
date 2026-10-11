/* Sieht die KI den Rettungspunkt ihrer kritischen Gruppe? Gehört zu
   docs/punktverlust.md.

   Nimmt die Ereignisse von kritisch.js (eigene Gruppe der KI vor ihrem Zug
   kritisch, mindestens --min-steine Steine) und stellt an diesen Stellungen
   die Zugwahl mit den heutigen Defaults nach (getAIMove, 120 Simulationen,
   ohne Baumwiederverwendung), wie zugwahl-grund.js. Festgehalten wird für
   GNU Gos Rettungspunkt r:

     rang      Platz in der Kandidatenliste nach evaluateMove und allen
               Filtern (1 = bester; die Suche sieht die ersten
               mctsRootChildren); 0 = nicht in der Liste
     krise     Krisengewicht des Punkts (Wert dann zum Teil aus evalTsumego)
     wert      evaluateMove von r, dazu der Wert des besten Kandidaten
     freiheiten  Freiheiten der kritischen Gruppe aus Sicht der Engine
     gruppeKrise  höchstes Krisengewicht an den Freiheiten der Gruppe (0 =
               die Krisenkarte der Engine kennt die Gefahr nicht)
     rettungIstFreiheit  der Rettungspunkt ist eine Freiheit der Gruppe
     gewaehlt  der Zug, den die nachgestellte Zugwahl spielt; rettet = r

   Aufruf:
     node auswertung/kritisch-rang.js --kritisch kritisch.jsonl [...] --dumps dump.jsonl [...]
          [--min-steine 3] [--aus rang.jsonl]
     node auswertung/kritisch-rang.js --bericht rang.jsonl [...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));

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

/* Sicht des taktischen Lesers (wie leseRettung): Ist die Kette auf ecke
   fangbar (ab 2 Steinen, bis 3 Freiheiten), rettbar, und rettet GNU Gos
   Rettungspunkt r sie nach dem Leser? */
function leser(b, ecke, r, f) {
  if (ecke < 0 || !b[ecke]) return {leserFangbar: null};
  const ff = E.floodFill(b, ecke);
  const fangbar = ff.group.length >= 2 && ff.liberties.length <= 3 && E.leseAngriff(b, ecke).ja;
  if (!fangbar) return {leserFangbar: false};
  let rRettet = false;
  if (r >= 0 && !b[r]) {
    const nb = new Uint8Array(b); nb[r] = f; E.removeDeadGroups(nb, 3 - f, r);
    rRettet = !!nb[ecke] && E.floodFill(nb, r).liberties.length > 0 && !E.leseAngriff(nb, ecke).ja;
  }
  return {leserFangbar: true, leserRettbar: E.leseVerteidigung(b, ecke).ja, leserRettungStimmt: rRettet};
}

function analysiere(p, ereignisse) {
  const proMc = new Map();
  for (const e of ereignisse) { if (!proMc.has(e.mc)) proMc.set(e.mc, []); proMc.get(e.mc).push(e); }
  const b = new Uint8Array(N), caps = {1: 0, 2: 0};
  for (const s of p.vorgabeSteine) b[vonGtp(s)] = 1;
  const hist = new Set([E.computeZobrist(new Uint8Array(N)), E.computeZobrist(b)]);
  const wir = p.wirFarbe === 'S' ? 1 : 2, zuerst = p.beginnt === 'S' ? 1 : 2;
  let ko = null, last = null;
  const aus = [];
  for (let k = 0; k < p.zuege.length; k++) {
    const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
    if (f === wir && proMc.has(mc)) {
      Object.assign(E.PARAMS, DEFAULT, {mctsFixedSims: 120, resignEnabled: 0, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0});
      Math.random = mulberry32(p.seed * 1000 + mc);
      letzteListe = null;
      const r = E.getAIMove(new Uint8Array(b), f, Array.from(hist), {...caps}, mc - 1, 'hard', 1, ko, last);
      const liste = letzteListe || [];
      const gewaehlt = r.type === 'stone' ? r.y * 19 + r.x : -1;
      E.buildCrisisMap(b, f); E.primeAreaCache(b, f); E.primeEndTieBreak(b);
      for (const e of proMc.get(mc)) {
        const ri = vonGtp(e.rettung), ecke = vonGtp(e.ecke);
        const n = liste.findIndex(s => s.idx === ri);
        const ff = ecke >= 0 && b[ecke] ? E.floodFill(b, ecke) : null;
        aus.push({nr: p.nr, seed: p.seed, mc, steine: e.steine, nachher: e.nachher, spaeter: e.spaeter,
                  gespielt: e.gespielt, rettung: e.rettung, zug: p.zuege[k],
                  rang: n < 0 ? 0 : n + 1, kandidaten: liste.length,
                  krise: ri >= 0 && !b[ri] ? +E.getCrisisWeight(ri).toFixed(2) : null,
                  wert: n < 0 ? null : +liste[n].score.toFixed(1), bester: liste.length ? +liste[0].score.toFixed(1) : null,
                  freiheiten: ff ? ff.liberties.length : null,
                  gruppeKrise: ff ? +Math.max(0, ...ff.liberties.map(l => E.getCrisisWeight(l))).toFixed(2) : null,
                  rettungIstFreiheit: ff ? ff.liberties.includes(ri) : null,
                  ...leser(b, ecke, ri, f),
                  gewaehltRettet: gewaehlt === ri});
      }
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
  const pz = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %` : '–';
  const median = (a, f) => { const v = a.map(f).filter(x => x !== null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : '–'; };
  const R = E.PARAMS.mctsRootChildren;
  for (const [name, g] of [['nicht gerettet', z.filter(x => x.nachher !== 'alive')], ['gerettet', z.filter(x => x.nachher === 'alive')]]) {
    const mitR = g.filter(x => x.rettung);
    console.log(`${name}: ${g.length} Fälle, Rettungspunkt bekannt ${mitR.length}`);
    console.log(`  Rang des Rettungspunkts: 1 ${pz(mitR, x => x.rang === 1)}, 2–${R} ${pz(mitR, x => x.rang >= 2 && x.rang <= R)},`
      + ` > ${R} ${pz(mitR, x => x.rang > R)}, nicht in der Liste ${pz(mitR, x => x.rang === 0)}; Median ${median(mitR, x => x.rang || null)}`);
    console.log(`  Krisengewicht am Rettungspunkt > 0: ${pz(mitR.filter(x => x.krise !== null), x => x.krise > 0)};`
      + ` Freiheiten der Gruppe: Median ${median(g, x => x.freiheiten)}, ≥ 4: ${pz(g.filter(x => x.freiheiten !== null), x => x.freiheiten >= 4)}`);
    console.log(`  Gruppe in der Krisenkarte (Gewicht > 0 an einer Freiheit): ${pz(g.filter(x => x.gruppeKrise !== null), x => x.gruppeKrise > 0)};`
      + ` Rettungspunkt ist eine Freiheit der Gruppe: ${pz(mitR.filter(x => x.rettungIstFreiheit !== null), x => x.rettungIstFreiheit)}`);
    const lf = g.filter(x => x.leserFangbar !== null && x.leserFangbar !== undefined);
    console.log(`  Leser: Kette fangbar (ab 2 Steinen) ${pz(lf, x => x.leserFangbar)}; davon rettbar ${pz(lf.filter(x => x.leserFangbar), x => x.leserRettbar)},`
      + ` GNU Gos Rettungspunkt rettet auch laut Leser ${pz(lf.filter(x => x.leserFangbar), x => x.leserRettungStimmt)}`);
    console.log(`  nachgestellte Zugwahl spielt den Rettungspunkt: ${pz(mitR, x => x.gewaehltRettet)};`
      + ` Wert Rettungspunkt / bester Kandidat (Median): ${median(mitR, x => x.wert)} / ${median(mitR, x => x.bester)}`);
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const kritisch = [], dumps = [], berichte = [];
  let aus = null, liste = null, minSteine = 3;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--kritisch') liste = kritisch;
    else if (a[k] === '--dumps') liste = dumps;
    else if (a[k] === '--bericht') liste = berichte;
    else if (a[k] === '--aus') aus = a[++k];
    else if (a[k] === '--min-steine') minSteine = +a[++k];
    else if (liste) liste.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (berichte.length) { bericht(berichte.flatMap(lies)); return; }
  const partien = new Map(dumps.flatMap(lies).map(p => [p.seed, p]));
  const alle = [];
  for (const r of kritisch.flatMap(lies)) {
    const p = partien.get(r.seed);
    const ev = r.ereignisse.filter(e => e.seite === 'ki' && e.eigene && e.steine >= minSteine);
    if (!p || !ev.length) continue;
    const z = analysiere(p, ev);
    alle.push(...z);
    if (aus) fs.appendFileSync(aus, z.map(x => JSON.stringify(x)).join('\n') + (z.length ? '\n' : ''));
  }
  bericht(alle);
}

module.exports = {analysiere, bericht};
