// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht von Stufe A der Komponentenmessung (docs/komponenten.md §4). Er
   urteilt nicht, er nennt Intervalle. Je Gegner (g: GNU Go, f: Fuego):

     1. jeder Arm gegen D, Endstand nach GNU Gos Zählung, gepaart nach
        Partienummer: Differenz, SD der Differenzen, Intervall mit
        alpha 0,05/5 (99 %), standardisiert durch die SD des Endstands von D,
        Siege; für N0 dazu, in wie vielen Paaren die ersten 80 Züge gleich
        denen von D sind (das Netz wirkt erst ab Zug 80: alle).
     2. Phasenprofil: dieselbe Differenz für GNU Gos Schätzung nach Zug 40,
        80, 120 und 200, mit demselben alpha.
     3. Wechselwirkung von Netz und Muster: je Partienummer
        I = NM0 − N0 − M0 + D (= Δ_NM0 − Δ_N0 − Δ_M0), Intervall mit
        alpha 0,05/2 (97,5 %), weil sie für beide Gegner gerechnet wird.

   Dazu, wenn beide Gegner da sind, je Arm der Unterschied der Gegner
   Δ_f − Δ_g (Welch, alpha 0,05/5) und der Unterschied der standardisierten
   Wirkungen. Kontrollen: Partien eines zweiten Laufs gegen eine frühere
   Datei, gleich, wenn die Züge gleich sind.

   Abgebrochene Partien und Partien ohne Endstand (Zuglimit) fallen samt
   Partner heraus.

   Aufruf:
     node auswertung/komponenten/bericht.js --arm g:D=a.jsonl,b.jsonl --arm g:N0=... --arm f:D=... ...
          [--kontrolle g=neu.jsonl,alt.jsonl.gz] [--kontrolle f=...]
   Die Ausgabe ist Markdown. */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const {pZweiseitig} = require('../endspiel-pilot-bericht.js');
const {kontrolle} = require('../fuego/pruefstand-bericht.js');

const VERGLEICHE = ['B', 'N0', 'M0', 'NM0', 'R0'];
const ALPHA = 0.05 / VERGLEICHE.length, ALPHA_I = 0.05 / 2;
const MARKEN = [40, 80, 120, 200];
const NETZ_AB = 80;
const GEGNER = {g: 'GNU Go Stufe 1', f: 'Fuego, 100 Spiele'};

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;
const sdVon = a => { const m = mittel(a); return Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)); };
/* t-Wert, bei dem das zweiseitige p gleich alpha ist (Bisektion) */
function tKrit(df, alpha) {
  let lo = 0, hi = 200;
  for (let i = 0; i < 100; i++) { const m = (lo + hi) / 2; if (pZweiseitig(m, df) > alpha) lo = m; else hi = m; }
  return (lo + hi) / 2;
}
/* Mittel, SD, Intervall einer Liste von Werten (Differenzen) */
function stat(werte, alpha) {
  const n = werte.length;
  if (n < 3) return null;
  const m = mittel(werte), sd = sdVon(werte), se = sd / Math.sqrt(n), tk = tKrit(n - 1, alpha);
  return {n, m, sd, se, lo: m - tk * se, hi: m + tk * se};
}
const fertig = r => r && !r.abgebrochen && Number.isFinite(r.endstand);

/* Arm X gegen D bei einem Gegner */
function vergleich(D, X, arm) {
  const nrs = [...X.keys()].filter(nr => fertig(X.get(nr)) && fertig(D.get(nr))).sort((a, b) => a - b);
  const g = stat(nrs.map(nr => X.get(nr).endstand - D.get(nr).endstand), ALPHA);
  const sdD = sdVon(nrs.map(nr => D.get(nr).endstand));
  const phasen = {};
  for (const z of MARKEN) {
    const w = nrs.filter(nr => Number.isFinite((X.get(nr).schaetzung || {})[z]) && Number.isFinite((D.get(nr).schaetzung || {})[z]))
      .map(nr => X.get(nr).schaetzung[z] - D.get(nr).schaetzung[z]);
    phasen[z] = stat(w, ALPHA);
  }
  phasen.ende = g;
  const anfang = arm === 'N0' ? {n: nrs.length, gleich: nrs.filter(nr => JSON.stringify(X.get(nr).zuege.slice(0, NETZ_AB)) === JSON.stringify(D.get(nr).zuege.slice(0, NETZ_AB))).length} : null;
  return {arm, g, std: g && sdD > 0 ? g.m / sdD : NaN, sdD, phasen, anfang,
          siegeX: nrs.filter(nr => X.get(nr).gewonnen).length, siegeD: nrs.filter(nr => D.get(nr).gewonnen).length};
}

/* Wechselwirkung von Netz und Muster je Partienummer */
function wechselwirkung(arme) {
  const {D, N0, M0, NM0} = arme;
  if (!D || !N0 || !M0 || !NM0) return null;
  const nrs = [...NM0.keys()].filter(nr => [D, N0, M0, NM0].every(a => fertig(a.get(nr))));
  return stat(nrs.map(nr => NM0.get(nr).endstand - N0.get(nr).endstand - M0.get(nr).endstand + D.get(nr).endstand), ALPHA_I);
}

/* Unterschied der Gegner Δ_f − Δ_g (unabhängige Partien, Welch) */
function gegnerUnterschied(vg, vf) {
  if (!vg.g || !vf.g) return null;
  const v = vg.g.se ** 2 + vf.g.se ** 2, df = v ** 2 / (vg.g.se ** 4 / (vg.g.n - 1) + vf.g.se ** 4 / (vf.g.n - 1));
  const m = vf.g.m - vg.g.m, tk = tKrit(df, ALPHA);
  return {m, lo: m - tk * Math.sqrt(v), hi: m + tk * Math.sqrt(v), df, std: vf.std - vg.std};
}

/* Kennzahlen je Arm, ohne Paarung */
function beschreibung(name, A) {
  const l = [...A.values()];
  const ok = l.filter(fertig);
  return {arm: name, n: l.length, abgebrochen: l.filter(r => r.abgebrochen).length, zuglimit: l.filter(r => !r.abgebrochen && !Number.isFinite(r.endstand)).length,
          siege: ok.filter(r => r.gewonnen).length, fertig: ok.length, endstand: ok.length ? mittel(ok.map(r => r.endstand)) : NaN};
}

function auswertung(daten) {
  const aus = {};
  for (const [o, arme] of Object.entries(daten)) {
    if (!arme.D) { aus[o] = {fehlt: 'Arm D fehlt'}; continue; }
    aus[o] = {
      arme: Object.keys(arme).map(a => beschreibung(a, arme[a])),
      vergleiche: VERGLEICHE.filter(a => arme[a]).map(a => vergleich(arme.D, arme[a], a)),
      wechselwirkung: wechselwirkung(arme)
    };
  }
  const unterschied = [];
  if (aus.g && aus.f && aus.g.vergleiche && aus.f.vergleiche) {
    for (const vg of aus.g.vergleiche) {
      const vf = aus.f.vergleiche.find(v => v.arm === vg.arm);
      if (vf) unterschied.push({arm: vg.arm, ...gegnerUnterschied(vg, vf)});
    }
  }
  return {gegner: aus, unterschied};
}

const z1 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') : '–';
const z2 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') : '–';
const iv = s => s ? `[${z1(s.lo)}; ${z1(s.hi)}]` : '–';
const pz = (k, n) => n ? `${k} (${Math.round(100 * k / n)} %)` : '–';

function text(a, kontrollen = {}) {
  const aus = [];
  for (const [o, e] of Object.entries(a.gegner)) {
    aus.push(`## ${GEGNER[o] || o}`, '');
    if (e.fehlt) { aus.push(e.fehlt, ''); continue; }
    aus.push('| Arm | Partien | abgebr. | Zuglimit | Siege | Endstand Ø |', '|---|---:|---:|---:|---:|---:|');
    for (const b of e.arme) aus.push(`| ${b.arm} | ${b.n} | ${b.abgebrochen} | ${b.zuglimit} | ${pz(b.siege, b.fertig)} | ${z1(b.endstand)} |`);
    aus.push('', `Gegen D, gepaart, Intervall mit alpha 0,05/5 (99 %):`, '',
      '| Arm − D | Paare | Differenz | 99 % | SD der Differenzen | standardisiert | Siege Arm / D |', '|---|---:|---:|---|---:|---:|---|');
    for (const v of e.vergleiche) aus.push(`| ${v.arm} | ${v.g ? v.g.n : 0} | ${z1(v.g && v.g.m)} | ${iv(v.g)} | ${v.g ? v.g.sd.toFixed(1).replace('.', ',') : '–'} | ${z2(v.std)} | ${v.siegeX} / ${v.siegeD} |`);
    const n0 = e.vergleiche.find(v => v.anfang);
    if (n0) aus.push('', `N0: in ${n0.anfang.gleich} von ${n0.anfang.n} Paaren sind die ersten ${NETZ_AB} Züge gleich denen von D${n0.anfang.gleich === n0.anfang.n ? '' : ' (NICHT alle: Fehler suchen)'}.`);
    aus.push('', 'Phasenprofil, Arm − D nach GNU Gos Schätzung (99 %):', '',
      `| Arm − D | ${MARKEN.map(z => `Zug ${z}`).join(' | ')} | Ende |`, `|---|${MARKEN.map(() => '---').join('|')}|---|`);
    for (const v of e.vergleiche) aus.push(`| ${v.arm} | ${[...MARKEN, 'ende'].map(z => v.phasen[z] ? `${z1(v.phasen[z].m)} ${iv(v.phasen[z])}` : '–').join(' | ')} |`);
    const w = e.wechselwirkung;
    aus.push('', `Wechselwirkung I = Δ_NM0 − Δ_N0 − Δ_M0: ${w ? `${z1(w.m)} ${iv(w)} (97,5 %, ${w.n} Partienummern)` : '–'}`);
    if (kontrollen[o]) aus.push('', `Kontrolle: ${kontrollen[o].gleich} von ${kontrollen[o].erwartet} Partien gleich wie in der früheren Messung (${kontrollen[o].ok ? 'bestanden' : 'NICHT bestanden'})`);
    aus.push('');
  }
  if (a.unterschied.length) {
    aus.push('## Unterschied der Gegner', '', 'Δ_Fuego − Δ_GNU Go je Arm (Welch, 99 %); positiv: das Abschalten kostet gegen Fuego weniger.', '',
      '| Arm | Δ_f − Δ_g | 99 % | standardisiert f − g |', '|---|---:|---|---:|');
    for (const u of a.unterschied) aus.push(`| ${u.arm} | ${z1(u.m)} | ${Number.isFinite(u.lo) ? `[${z1(u.lo)}; ${z1(u.hi)}]` : '–'} | ${z2(u.std)} |`);
  }
  return aus.join('\n');
}

const lies = d => {
  const roh = fs.readFileSync(d);
  return (d.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
};

function main() {
  const arg = process.argv.slice(2), daten = {}, kontrollen = {};
  let fehler = false;
  for (let i = 0; i < arg.length; i++) {
    const m = arg[i] === '--arm' && /^([gf]):([A-Z0-9]+)=(.+)$/.exec(arg[i + 1] || '');
    const k = arg[i] === '--kontrolle' && /^([gf])=([^,]+),([^,]+)$/.exec(arg[i + 1] || '');
    if (m) {
      const [, o, arm, dateien] = m;
      const map = new Map();
      for (const r of dateien.split(',').flatMap(lies)) map.set(r.nr, r);
      (daten[o] = daten[o] || {})[arm] = map;
      i++;
    } else if (k) {
      kontrollen[k[1]] = kontrolle(lies(k[2]), lies(k[3]));
      i++;
    } else { fehler = true; break; }
  }
  if (fehler || !Object.keys(daten).length) {
    console.error('Aufruf: node auswertung/komponenten/bericht.js --arm g:D=a.jsonl,... --arm g:N0=... [--kontrolle g=neu.jsonl,alt.jsonl.gz]');
    process.exit(2);
  }
  console.log(text(auswertung(daten), kontrollen));
}

if (require.main === module) main();
module.exports = {auswertung, text, vergleich, wechselwirkung, gegnerUnterschied, stat, tKrit, ALPHA, ALPHA_I, NETZ_AB};
