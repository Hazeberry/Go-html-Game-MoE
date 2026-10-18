// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Sieht die Zugbewertung der KI GNU Gos besten Zug? Gehört zu
   docs/punktverlust-muster.md.

   Liest die Ausgabe von zugwert.js, stellt jede Stellung vor einem Zug der
   KI nach und bestimmt den Rang von GNU Gos bestem Zug in der sortierten
   Kandidatenliste von getAIMove (vor der Suche, Zufall auf 0; dieselbe
   Liste, aus der die Suche ihre Kandidaten nimmt). Getrennt nach Lage des
   besten Zugs (Linie 1–2 oder weiter innen) und danach, ob die KI ihn
   gespielt hat.

   Dazu für die Stellungen, in denen die KI GNU Gos besten Zug nicht
   gespielt hat: der Wert ihres Favoriten (Rang 1 der Liste) und der von GNU
   Gos bestem Zug, zerlegt in die Terme (Beitrag = Wert mit minus Wert ohne
   den Term): die des Endspiel-Experten, gebietZug, die Krisenkarte und die
   Muster (musterGewicht × musterWert, an der Wurzel addiert). Ausgegeben
   wird der mittlere Vorsprung des Favoriten je Term und wie oft der Term
   allein den Ausschlag gibt (ohne ihn läge GNU Gos Zug vorn).

   Aufruf:
     node auswertung/zugwert-rang.js zugwert.jsonl --partien a.jsonl,b.jsonl,... [--jede 2] [--abstand 0.5] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const a = process.argv.slice(2), dateien = [];
const opt = {partien: [], jede: 1, abstand: 1};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--partien') opt.partien = a[++i].split(',');
  else if (a[i] === '--jede') opt.jede = +a[++i];
  else if (a[i] === '--abstand') opt.abstand = +a[++i];
  else dateien.push(a[i]);
}
const E = ladeKI({mitNetz: false});
/* --abstand f: das Merkmal „Abstand zum letzten Gegnerzug“ der Muster mit f
   gewichten (Probe, nur hier; die Tabelle in index.html bleibt). */
if (opt.abstand !== 1) for (const k of Object.keys(E.MUSTER_TABELLE)) if (k.startsWith('l:')) E.MUSTER_TABELLE[k] *= opt.abstand;
const N = E.BOARD_SIZE, L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const linie = v => { if (!v || v === 'PASS') return 0; const x = L.indexOf(v[0]), y = +v.slice(1) - 1; return Math.min(x, y, 18 - x, 18 - y) + 1; };

const partien = new Map();
for (const d of opt.partien) for (const z of fs.readFileSync(d, 'utf8').split('\n')) if (z.trim()) { const p = JSON.parse(z); partien.set(p.nr, p); }

const STOPP = {};
let _wurzel = null;
const echt = globalThis.mctsPUCT;
globalThis.mctsPUCT = function (board, color, caps, rootScored) { _wurzel = rootScored; throw STOPP; };
function kandidaten(b, f, mc, last) {
  Object.assign(E.PARAMS, {mctsFixedSims: 120, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, resignEnabled: 0});
  const zr = Math.random; Math.random = () => 0; _wurzel = null;
  try { E.getAIMove(new Uint8Array(b), f, [], {1: 0, 2: 0}, mc, 'hard', 1, null, last); }
  catch (e) { if (e !== STOPP) throw e; }
  finally { Math.random = zr; }
  return _wurzel ? _wurzel.map(s => s.m.idx) : null;
}

const TERME = ['endAreaGain', 'endCapBonus', 'endAtariPenalty', 'endLibPressure', 'endOppAtari', 'endTieBreak', 'gebietZug'];
const KRISE = ['crisisAtari', 'crisisLarge2Lib', 'crisisDragon3Lib'];
function bestandteile(b, m, c, mc) {
  const P = E.PARAMS, zufall = Math.random, leer = b.reduce((s, x) => s + (x ? 0 : 1), 0);
  Math.random = () => 0;
  const prime = () => { E.buildCrisisMap(b, c); E.primeAreaCache(b, c); E.primeEndTieBreak(b); };
  prime();
  const wert = () => E.evaluateMove(b, m, c, mc, leer);
  const r = {gesamt: wert()};
  for (const t of TERME) { const alt = P[t]; P[t] = 0; r[t] = r.gesamt - wert(); P[t] = alt; }
  const alt = KRISE.map(t => P[t]);
  for (const t of KRISE) P[t] = 0;
  prime(); r.krise = r.gesamt - wert();
  KRISE.forEach((t, k) => { P[t] = alt[k]; });
  Math.random = zufall;
  r.muster = P.musterGewicht * E.musterWert(b, m, c);
  r.gesamt += r.muster;
  return r;
}
/* Die Muster in ihre drei Merkmale zerlegt, wie musterWert in index.html:
   3×3-Muster, Abstand zum letzten Gegnerzug, Linie. */
function musterTeile(b, m, c, last) {
  const T = E.MUSTER_TABELLE, x0 = m % 19, y0 = Math.floor(m / 19);
  const d = last === null || last < 0 ? 99 : Math.max(Math.abs(x0 - last % 19), Math.abs(y0 - Math.floor(last / 19)));
  const e = d >= 99 ? 'keiner' : d <= 3 ? String(d) : d <= 6 ? '4-6' : 'weit';
  const lin = Math.min(x0, y0, 18 - x0, 18 - y0) + 1, g = E.PARAMS.musterGewicht;
  return {'muster:3x3': g * (T['m:' + E.musterSchluessel(b, m, c)] || 0), 'muster:abstand': g * (T['l:' + e] || 0),
          'muster:linie': g * (T['z:' + Math.min(lin, 5)] || 0)};
}
const TEILE = ['muster:3x3', 'muster:abstand', 'muster:linie'];
const zerlegt = {n: 0, summe: {}, ausschlag: {}, lokalFav: 0, lokalRef: 0};

const gruppen = {};
const buche = (name, rang) => {
  const g = gruppen[name] || (gruppen[name] = {n: 0, r1: 0, r16: 0, raus: 0, fehlt: 0, raenge: []});
  g.n++;
  if (rang < 0) { g.fehlt++; return; }
  g.raenge.push(rang);
  if (rang === 1) g.r1++; if (rang <= 16) g.r16++; else g.raus++;
};
let zaehler = 0;
for (const d of dateien) for (const z of fs.readFileSync(d, 'utf8').split('\n')) {
  if (!z.trim()) continue;
  const r = JSON.parse(z), p = partien.get(r.nr);
  if (!p) continue;
  const b = new Uint8Array(N);
  for (const v of p.vorgabeSteine || []) b[vonGtp(v)] = 1;
  const zuerst = p.beginnt === 'S' ? 1 : 2, wir = p.wirFarbe === 'S' ? 1 : 2;
  const kiZuege = new Map(r.zuege.filter(x => x[1] === 'K').map(x => [x[0], x]));
  let last = null;
  for (let k = 0; k < p.zuege.length; k++) {
    const mc = k + 1, x = kiZuege.get(mc);
    if (x && x[5] !== 'PASS' && zaehler++ % opt.jede === 0) {
      const liste = kandidaten(b, wir, k, last);
      if (liste) {
        const rang = liste.indexOf(vonGtp(x[5])) + 1 || -1;
        const lage = linie(x[5]) <= 2 ? 'bester Zug auf Linie 1–2' : 'bester Zug auf Linie 3+';
        const gespielt = x[2] === x[5] ? 'gespielt' : 'nicht gespielt';
        buche(`${lage}, ${gespielt}`, rang);
        buche('alle', rang);
        const g = vonGtp(x[5]);
        if (x[2] !== x[5] && rang > 1 && !b[g]) {
          const fav = bestandteile(b, liste[0], wir, k), ref = bestandteile(b, g, wir, k);
          Object.assign(fav, musterTeile(b, liste[0], wir, last)); Object.assign(ref, musterTeile(b, g, wir, last));
          const nah = m => last !== null && last >= 0 && Math.max(Math.abs(m % 19 - last % 19), Math.abs(Math.floor(m / 19) - Math.floor(last / 19))) <= 2;
          if (nah(liste[0])) zerlegt.lokalFav++; if (nah(g)) zerlegt.lokalRef++;
          zerlegt.n++;
          const vorsprung = fav.gesamt - ref.gesamt;
          for (const t of [...TERME, 'krise', 'muster', ...TEILE]) {
            const d = fav[t] - ref[t];
            zerlegt.summe[t] = (zerlegt.summe[t] || 0) + d;
            if (vorsprung - d < 0) zerlegt.ausschlag[t] = (zerlegt.ausschlag[t] || 0) + 1;
          }
          zerlegt.summe.gesamt = (zerlegt.summe.gesamt || 0) + vorsprung;
        }
      }
    }
    const i = vonGtp(p.zuege[k]); if (i < 0) { last = null; continue; }
    const f = k % 2 === 0 ? zuerst : 3 - zuerst;
    b[i] = f; E.removeDeadGroups(b, 3 - f, i); last = i;
  }
}
globalThis.mctsPUCT = echt;
console.log('Rang von GNU Gos bestem Zug in der Kandidatenliste der KI (vor der Suche):');
console.log('Gruppe                                         Stellungen  Rang 1  Rang ≤ 16  Rang > 16  nicht legal/gefiltert  Median');
for (const [name, g] of Object.entries(gruppen).sort()) {
  const r = g.raenge.slice().sort((x, y) => x - y);
  const pz = x => `${(100 * x / g.n).toFixed(0)} %`.padStart(8);
  console.log(`${name.padEnd(46)} ${String(g.n).padStart(8)}  ${pz(g.r1)}  ${pz(g.r16)}  ${pz(g.raus)}  ${pz(g.fehlt)}  ${String(r[r.length >> 1] || '–').padStart(6)}`);
}
console.log(`\nVorsprung des Favoriten der KI vor GNU Gos bestem Zug, zerlegt (${zerlegt.n} Stellungen, Ø je Stellung):`);
for (const t of [...TERME, 'krise', 'muster', ...TEILE]) console.log(`  ${t.padEnd(16)} ${(zerlegt.summe[t] / zerlegt.n).toFixed(1).padStart(8)}   allein ausschlaggebend: ${(100 * (zerlegt.ausschlag[t] || 0) / zerlegt.n).toFixed(0)} %`);
console.log(`  ${'gesamt'.padEnd(16)} ${(zerlegt.summe.gesamt / zerlegt.n).toFixed(1).padStart(8)}`);
console.log(`Favorit der KI nah am letzten Gegnerzug (≤ 2): ${(100 * zerlegt.lokalFav / zerlegt.n).toFixed(0)} %, GNU Gos bester Zug: ${(100 * zerlegt.lokalRef / zerlegt.n).toFixed(0)} %`);
