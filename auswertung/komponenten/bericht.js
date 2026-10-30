// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Komponentenmessung, Stufe A (docs/komponenten.md §4) und
   Stufe B (docs/komponenten-b.md §4), und der Muster-Eröffnung
   (--stufe M, docs/muster-eroeffnung.md §4) und der Baum-Übernahme
   (--stufe T bei 120, --stufe T6 bei 600 Simulationen,
   docs/baum-uebernahme.md §4) und der Messung auf dem leeren Brett (--stufe L,
   docs/leeres-brett.md §4) und der Muster ohne Vorgabe (--stufe O,
   docs/muster-ohne-vorgabe.md §4). Stufe A und B urteilen nicht, sie nennen
   Intervalle; M nennt dazu das vorab festgelegte Urteil über M1 (besser
   gegen beide Gegner, schlechter gegen einen, sonst nicht belegt); T und T6
   prüfen Nichtunterlegenheit: Untergrenze des 95-%-Intervalls gegen beide
   Gegner über der Grenze (T −10; T6 −20 und dazu der Mittelwert über −5).
   Je Gegner (g: GNU Go, f: Fuego):

     1. jeder Arm gegen D, Endstand nach GNU Gos Zählung, gepaart nach
        Partienummer: Differenz, SD der Differenzen, Intervall mit
        alpha 0,05/k (k Vergleiche der Stufe: A 5, also 99 %; B 8),
        standardisiert durch die SD des Endstands von D, Siege, und ab
        welchem Zug die Partien von D abweichen (Median der ersten
        Abweichung); in Stufe A für N0 dazu, in wie vielen Paaren die ersten
        80 Züge gleich denen von D sind (das Netz wirkt erst ab Zug 80: alle).
     2. Phasenprofil: dieselbe Differenz für GNU Gos Schätzung nach Zug 40,
        80, 120 und 200, mit demselben alpha.
     3. Wechselwirkung: je Partienummer I = X − Σ A_i + (n − 1)·D, also
        Δ_X − Σ Δ_i für einen Arm X, der die Teile A_1 … A_n zusammen
        abschaltet (A: NM0 aus N0 und M0; B: O7 aus den sieben Einzelnen),
        Intervall mit alpha 0,05/2 (97,5 %), weil sie für beide Gegner
        gerechnet wird.

   In M zusätzlich die Probe: A40 und A80 spielen die ersten 40 bzw. 80 Züge
   wie M0 (Muster aus) aus Stufe A.

   In L ist g GNU Go ohne Vorgabe, v dieselben Arme mit sechs Vorgabesteinen
   aus früheren Läufen (Stufe A, Muster-Eröffnung). Dazu je Bedingung die
   Verteilung des Endstands je Arm (Quantile) und die Steine, die die KI
   verliert (Feld gefangen), statt des Unterschieds der Gegner der
   Unterschied der Bedingungen Δ_g − Δ_v (Welch) und das vorab festgelegte
   Urteil je Arm ohne Vorgabe: M0 und N0 „trägt ohne Vorgabe“, wenn die
   Obergrenze unter 0 liegt, „Abschalten hilft“, wenn die Untergrenze über 0
   liegt, sonst „kein Beitrag belegt“; A80 „Schaden auch gegen GNU Go“, wenn
   die Obergrenze unter 0 liegt, „kein Schaden in der Größe des
   Selbstspiels“, wenn die Untergrenze über −16,7 liegt, sonst „offen“.

   In O wie in M das Urteil über die externen Gegner, aber nur für M0 und
   M50 (MW0 ist erkundend), dazu wie in L die Verteilung des Endstands und
   für jeden Arm die Differenz zu D getrennt nach der Farbe der KI.

   Dazu, wenn beide Gegner da sind, je Arm der Unterschied der Gegner
   Δ_f − Δ_g (Welch, alpha 0,05/k) und der Unterschied der standardisierten
   Wirkungen. Kontrollen: Partien eines zweiten Laufs gegen eine frühere
   Datei, gleich, wenn die Züge gleich sind.

   Abgebrochene Partien und Partien am Zuglimit fallen samt Partner heraus.
   Eine Partie am Zuglimit erkennt man an gewonnen === null: gnugo-duell.js
   rechnet dort trotzdem einen Endstand (GNU Gos final_score der Stellung)
   und setzt nur den Sieger auf null. Früher galt nur ein fehlender Endstand
   als Zuglimit, die Spalte „Zuglimit“ zeigte deshalb immer 0 und die
   Partien gingen mit ihrem Endstand in die Paare ein (docs/zuglimit-zaehlung.md).

   Aufruf:
     node auswertung/komponenten/bericht.js [--stufe A|B|M|T|T6|L|O] --arm g:D=a.jsonl,b.jsonl --arm g:N0=... --arm f:D=... ...
          [--kontrolle g=neu.jsonl,alt.jsonl.gz] [--kontrolle f=...]
   Die Ausgabe ist Markdown. */
'use strict';
const fs = require('fs');
const zlib = require('zlib');
const {pZweiseitig} = require('../endspiel-pilot-bericht.js');
const {kontrolle} = require('../fuego/pruefstand-bericht.js');

const SIEBEN = ['R0', 'T0', 'W0', 'E0', 'P0', 'BE0', 'BF0'];
const STUFEN = {
  A: {vergleiche: ['B', 'N0', 'M0', 'NM0', 'R0'], wechsel: ['NM0', ['N0', 'M0']], probe: 'N0'},
  B: {vergleiche: [...SIEBEN, 'O7'], wechsel: ['O7', SIEBEN], probe: null},
  M: {vergleiche: ['A40', 'A80'], wechsel: null, probe: null, proben: [['A40', 'M0', 40], ['A80', 'M0', 80]], urteil: true},
  T: {vergleiche: ['T0'], wechsel: null, probe: null, ni: {grenze: -10}},
  T6: {vergleiche: ['T0'], wechsel: null, probe: null, ni: {grenze: -20, punkt: -5}},
  L: {vergleiche: ['M0', 'N0', 'A80'], wechsel: null, probe: 'N0', proben: [['A80', 'M0', 80]], verteilung: true,
      paar: ['v', 'g'], leer: {selbstspiel: -16.7},
      namen: {g: 'GNU Go Stufe 1, ohne Vorgabe', v: 'GNU Go Stufe 1, sechs Vorgabesteine (Stufe A und Muster-Eröffnung, Seed 220)'}},
  O: {vergleiche: ['M0', 'M50', 'MW0'], wechsel: null, probe: null, urteil: true, urteilArme: ['M0', 'M50'], verteilung: true, farbe: true,
      kontrolleText: {g: 'im Lauf „Leeres Brett“ (Seed 222)', f: 'in den Partien von D dieses Laufs'},
      namen: {g: 'GNU Go Stufe 1, ohne Vorgabe', f: 'Fuego, 100 Spiele, ohne Vorgabe'}}
};
for (const s of Object.values(STUFEN)) s.alpha = 0.05 / s.vergleiche.length;
const ALPHA = STUFEN.A.alpha, ALPHA_I = 0.05 / 2;
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
/* Zuglimit: gnugo-duell.js lässt den Sieger null, rechnet aber einen Endstand */
const amZuglimit = r => !r.abgebrochen && r.gewonnen === null;
const fertig = r => r && !r.abgebrochen && !amZuglimit(r) && Number.isFinite(r.endstand);

/* Index des ersten Zugs, in dem zwei Partien sich unterscheiden */
function ersteAbweichung(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i + 1;
  return a.length === b.length ? null : n + 1;
}

/* Arm X gegen D bei einem Gegner */
function vergleich(D, X, arm, alpha = ALPHA, probe = 'N0', farbe = false) {
  const nrs = [...X.keys()].filter(nr => fertig(X.get(nr)) && fertig(D.get(nr))).sort((a, b) => a - b);
  const g = stat(nrs.map(nr => X.get(nr).endstand - D.get(nr).endstand), alpha);
  const jeFarbe = farbe ? Object.fromEntries(['S', 'W'].map(f => [f, stat(nrs.filter(nr => D.get(nr).wirFarbe === f).map(nr => X.get(nr).endstand - D.get(nr).endstand), alpha)])) : null;
  const sdD = sdVon(nrs.map(nr => D.get(nr).endstand));
  const phasen = {};
  for (const z of MARKEN) {
    const w = nrs.filter(nr => Number.isFinite((X.get(nr).schaetzung || {})[z]) && Number.isFinite((D.get(nr).schaetzung || {})[z]))
      .map(nr => X.get(nr).schaetzung[z] - D.get(nr).schaetzung[z]);
    phasen[z] = stat(w, alpha);
  }
  phasen.ende = g;
  const ab = nrs.map(nr => ersteAbweichung(X.get(nr).zuege || [], D.get(nr).zuege || [])).filter(x => x !== null).sort((a, b) => a - b);
  const anfang = arm === probe ? {n: nrs.length, gleich: nrs.filter(nr => JSON.stringify(X.get(nr).zuege.slice(0, NETZ_AB)) === JSON.stringify(D.get(nr).zuege.slice(0, NETZ_AB))).length} : null;
  return {arm, g, jeFarbe, std: g && sdD > 0 ? g.m / sdD : NaN, sdD, phasen, anfang, gleich: nrs.length - ab.length,
          abweichung: ab.length ? ab[Math.floor((ab.length - 1) / 2)] : null,
          siegeX: nrs.filter(nr => X.get(nr).gewonnen).length, siegeD: nrs.filter(nr => D.get(nr).gewonnen).length};
}

/* Wechselwirkung je Partienummer: I = X − Σ A_i + (n − 1)·D = Δ_X − Σ Δ_i */
function wechselwirkung(arme, wechsel = STUFEN.A.wechsel) {
  if (!wechsel) return null;
  const [ziel, teile] = wechsel;
  const X = arme[ziel], D = arme.D, A = teile.map(t => arme[t]);
  if (!D || !X || A.some(a => !a)) return null;
  const nrs = [...X.keys()].filter(nr => [D, X, ...A].every(a => fertig(a.get(nr))));
  const w = stat(nrs.map(nr => X.get(nr).endstand - A.reduce((s, a) => s + a.get(nr).endstand, 0) + (A.length - 1) * D.get(nr).endstand), ALPHA_I);
  return w && {...w, ziel, teile};
}

/* Spielt Arm X in jedem Paar die ersten n Züge wie Arm R? */
function probe(arme, x, r, n) {
  const X = arme[x], R = arme[r];
  if (!X || !R) return null;
  const nrs = [...X.keys()].filter(nr => fertig(X.get(nr)) && fertig(R.get(nr)));
  const gleich = nrs.filter(nr => JSON.stringify((X.get(nr).zuege || []).slice(0, n)) === JSON.stringify((R.get(nr).zuege || []).slice(0, n))).length;
  return {arm: x, ref: r, zuege: n, n: nrs.length, gleich};
}

/* Urteil über M1 (docs/muster-eroeffnung.md §4): besser heißt, die Untergrenze
   des Intervalls liegt gegen beide Gegner über 0 */
function urteilM(gegner, arm) {
  const v = ['g', 'f'].map(o => gegner[o] && gegner[o].vergleiche && gegner[o].vergleiche.find(x => x.arm === arm));
  if (v.some(x => !x || !x.g)) return 'unvollständig';
  if (v.some(x => x.g.hi < 0)) return 'schlechter';
  if (v.every(x => x.g.lo > 0)) return 'besser gegen beide Gegner';
  return 'nicht belegt';
}

/* Nichtunterlegenheit (docs/baum-uebernahme.md §4): gegen beide Gegner liegt
   die Untergrenze über der Grenze und, falls verlangt, der Mittelwert über
   der Punktgrenze */
function urteilNI(gegner, arm, ni) {
  const v = ['g', 'f'].map(o => gegner[o] && gegner[o].vergleiche && gegner[o].vergleiche.find(x => x.arm === arm));
  if (v.some(x => !x || !x.g)) return 'unvollständig';
  const ok = v.every(x => x.g.lo > ni.grenze && (ni.punkt === undefined || x.g.m > ni.punkt));
  return ok ? 'nicht unterlegen gegen beide Gegner' : 'Nichtunterlegenheit nicht gezeigt';
}

/* Urteil ohne Vorgabe (docs/leeres-brett.md §4), nur gegen GNU Go ohne
   Vorgabe (g) */
function urteilL(gegner, arm, leer = STUFEN.L.leer) {
  const v = gegner.g && gegner.g.vergleiche && gegner.g.vergleiche.find(x => x.arm === arm);
  if (!v || !v.g) return 'unvollständig';
  if (arm === 'A80') {
    if (v.g.hi < 0) return 'Schaden auch gegen GNU Go ohne Vorgabe';
    return v.g.lo > leer.selbstspiel ? 'kein Schaden in der Größe des Selbstspiels' : 'offen';
  }
  if (v.g.hi < 0) return 'trägt ohne Vorgabe';
  return v.g.lo > 0 ? 'Abschalten hilft ohne Vorgabe' : 'kein Beitrag belegt';
}

/* Quantil (linear zwischen den Rangplätzen) einer sortierten Liste */
function quantil(s, q) {
  const h = (s.length - 1) * q, i = Math.floor(h);
  return i + 1 < s.length ? s[i] + (h - i) * (s[i + 1] - s[i]) : s[i];
}

/* Verteilung des Endstands eines Arms und die Steine, die die KI verliert */
function verteilung(name, A) {
  const ok = [...A.values()].filter(fertig);
  const s = ok.map(r => r.endstand).sort((a, b) => a - b);
  const g = ok.filter(r => r.gefangen && Number.isFinite(r.gefangen.gegner));
  return {arm: name, n: s.length, sd: s.length > 1 ? sdVon(s) : NaN,
          q: s.length ? [0, 0.1, 0.25, 0.5, 0.75, 0.9, 1].map(q => quantil(s, q)) : [],
          verloren: g.length ? mittel(g.map(r => r.gefangen.gegner)) : NaN, geschlagen: g.length ? mittel(g.map(r => r.gefangen.wir)) : NaN};
}

/* Unterschied der Gegner Δ_f − Δ_g (unabhängige Partien, Welch) */
function gegnerUnterschied(vg, vf, alpha = ALPHA) {
  if (!vg.g || !vf.g) return null;
  const v = vg.g.se ** 2 + vf.g.se ** 2, df = v ** 2 / (vg.g.se ** 4 / (vg.g.n - 1) + vf.g.se ** 4 / (vf.g.n - 1));
  const m = vf.g.m - vg.g.m, tk = tKrit(df, alpha);
  return {m, lo: m - tk * Math.sqrt(v), hi: m + tk * Math.sqrt(v), df, std: vf.std - vg.std};
}

/* Kennzahlen je Arm, ohne Paarung */
function beschreibung(name, A) {
  const l = [...A.values()];
  const ok = l.filter(fertig);
  return {arm: name, n: l.length, abgebrochen: l.filter(r => r.abgebrochen).length, zuglimit: l.filter(amZuglimit).length,
          siege: ok.filter(r => r.gewonnen).length, fertig: ok.length, endstand: ok.length ? mittel(ok.map(r => r.endstand)) : NaN};
}

function auswertung(daten, stufe = 'A') {
  const st = STUFEN[stufe];
  const aus = {};
  for (const [o, arme] of Object.entries(daten)) {
    if (!arme.D) { aus[o] = {fehlt: 'Arm D fehlt'}; continue; }
    aus[o] = {
      arme: Object.keys(arme).map(a => beschreibung(a, arme[a])),
      vergleiche: st.vergleiche.filter(a => arme[a]).map(a => vergleich(arme.D, arme[a], a, st.alpha, st.probe, st.farbe)),
      wechselwirkung: wechselwirkung(arme, st.wechsel),
      proben: (st.proben || []).map(([x, r, n]) => probe(arme, x, r, n)).filter(Boolean),
      verteilung: st.verteilung ? Object.keys(arme).map(a => verteilung(a, arme[a])) : null
    };
  }
  const unterschied = [], [p0, p1] = st.paar || ['g', 'f'];
  if (aus[p0] && aus[p1] && aus[p0].vergleiche && aus[p1].vergleiche) {
    for (const vg of aus[p0].vergleiche) {
      const vf = aus[p1].vergleiche.find(v => v.arm === vg.arm);
      if (vf) unterschied.push({arm: vg.arm, ...gegnerUnterschied(vg, vf, st.alpha)});
    }
  }
  const urteile = st.urteil ? (st.urteilArme || st.vergleiche).map(a => ({arm: a, urteil: urteilM(aus, a)}))
    : st.ni ? st.vergleiche.map(a => ({arm: a, urteil: urteilNI(aus, a, st.ni)}))
    : st.leer ? st.vergleiche.map(a => ({arm: a, urteil: urteilL(aus, a, st.leer)})) : [];
  return {stufe, alpha: st.alpha, gegner: aus, unterschied, urteile};
}

const z1 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') : '–';
const z2 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(2).replace('.', ',') : '–';
const iv = s => s ? `[${z1(s.lo)}; ${z1(s.hi)}]` : '–';
const pz = (k, n) => n ? `${k} (${Math.round(100 * k / n)} %)` : '–';
/* Niveau eines Intervalls: 99 % für alpha 0,01, 99,4 % für 0,05/8 */
const niveau = alpha => `${String(+(100 * (1 - alpha)).toFixed(1)).replace('.', ',')} %`;
const bruch = alpha => `0,05/${Math.round(0.05 / alpha)}`;

function text(a, kontrollen = {}) {
  const aus = [], alpha = a.alpha || ALPHA, nv = niveau(alpha), st = STUFEN[a.stufe || 'A'], namen = st.namen || GEGNER;
  for (const [o, e] of Object.entries(a.gegner)) {
    aus.push(`## ${namen[o] || o}`, '');
    if (e.fehlt) { aus.push(e.fehlt, ''); continue; }
    aus.push('| Arm | Partien | abgebr. | Zuglimit | Siege | Endstand Ø |', '|---|---:|---:|---:|---:|---:|');
    for (const b of e.arme) aus.push(`| ${b.arm} | ${b.n} | ${b.abgebrochen} | ${b.zuglimit} | ${pz(b.siege, b.fertig)} | ${z1(b.endstand)} |`);
    aus.push('', `Gegen D, gepaart, Intervall mit alpha ${bruch(alpha)} (${nv}):`, '',
      `| Arm − D | Paare | Differenz | ${nv} | SD der Differenzen | standardisiert | Siege Arm / D | erste Abweichung (Median) |`, '|---|---:|---:|---|---:|---:|---|---:|');
    for (const v of e.vergleiche) aus.push(`| ${v.arm} | ${v.g ? v.g.n : 0} | ${z1(v.g && v.g.m)} | ${iv(v.g)} | ${v.g ? v.g.sd.toFixed(1).replace('.', ',') : '–'} | ${z2(v.std)} | ${v.siegeX} / ${v.siegeD} | ${v.abweichung === null ? '–' : `Zug ${v.abweichung}`}${v.gleich ? ` (${v.gleich} gleich)` : ''} |`);
    const n0 = e.vergleiche.find(v => v.anfang);
    if (n0) aus.push('', `N0: in ${n0.anfang.gleich} von ${n0.anfang.n} Paaren sind die ersten ${NETZ_AB} Züge gleich denen von D${n0.anfang.gleich === n0.anfang.n ? '' : ' (NICHT alle: Fehler suchen)'}.`);
    aus.push('', `Phasenprofil, Arm − D nach GNU Gos Schätzung (${nv}):`, '',
      `| Arm − D | ${MARKEN.map(z => `Zug ${z}`).join(' | ')} | Ende |`, `|---|${MARKEN.map(() => '---').join('|')}|---|`);
    for (const v of e.vergleiche) aus.push(`| ${v.arm} | ${[...MARKEN, 'ende'].map(z => v.phasen[z] ? `${z1(v.phasen[z].m)} ${iv(v.phasen[z])}` : '–').join(' | ')} |`);
    for (const p of e.proben || []) aus.push('', `${p.arm}: in ${p.gleich} von ${p.n} Paaren sind die ersten ${p.zuege} Züge gleich denen von ${p.ref}${p.gleich === p.n ? '' : ' (NICHT alle: Fehler suchen)'}.`);
    if (STUFEN[a.stufe || 'A'].farbe) {
      aus.push('', `Arm − D je Farbe der KI (${nv}):`, '', '| Arm − D | KI Schwarz | KI Weiß |', '|---|---|---|');
      for (const v of e.vergleiche) aus.push(`| ${v.arm} | ${['S', 'W'].map(f => { const s = v.jeFarbe && v.jeFarbe[f]; return s ? `${z1(s.m)} ${iv(s)} (${s.n})` : '–'; }).join(' | ')} |`);
    }
    if (e.verteilung) {
      aus.push('', 'Verteilung des Endstands je Arm (aus Sicht der KI) und Steine, die die KI im Mittel verliert bzw. schlägt:', '',
        '| Arm | Partien | Min | 10 % | 25 % | Median | 75 % | 90 % | Max | SD | verloren Ø | geschlagen Ø |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
      const f1 = v => Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '–';
      for (const d of e.verteilung) aus.push(`| ${d.arm} | ${d.n} | ${d.q.length ? d.q.map(z1).join(' | ') : '– | – | – | – | – | – | –'} | ${f1(d.sd)} | ${f1(d.verloren)} | ${f1(d.geschlagen)} |`);
    }
    const w = e.wechselwirkung;
    if (w || STUFEN[a.stufe || 'A'].wechsel) aus.push('', `Wechselwirkung I = Δ_${w ? w.ziel : '…'} − ${w ? w.teile.map(t => `Δ_${t}`).join(' − ') : '…'}: ${w ? `${z1(w.m)} ${iv(w)} (97,5 %, ${w.n} Partienummern)` : '–'}`);
    if (kontrollen[o]) aus.push('', `Kontrolle: ${kontrollen[o].gleich} von ${kontrollen[o].erwartet} Partien gleich wie ${(st.kontrolleText || {})[o] || (st.paar ? 'in den Partien von D dieses Laufs' : 'in der früheren Messung')} (${kontrollen[o].ok ? 'bestanden' : 'NICHT bestanden'})`);
    aus.push('');
  }
  if (a.unterschied.length) {
    if (st.paar) aus.push('## Unterschied der Bedingungen', '', `Δ_ohne Vorgabe − Δ_sechs Steine je Arm (Welch, ${nv}); positiv: ohne Vorgabe kostet das Abschalten weniger.`, '',
      `| Arm | Δ_${st.paar[1]} − Δ_${st.paar[0]} | ${nv} | standardisiert ${st.paar[1]} − ${st.paar[0]} |`, '|---|---:|---|---:|');
    else aus.push('## Unterschied der Gegner', '', `Δ_Fuego − Δ_GNU Go je Arm (Welch, ${nv}); positiv: das Abschalten kostet gegen Fuego weniger.`, '',
      `| Arm | Δ_f − Δ_g | ${nv} | standardisiert f − g |`, '|---|---:|---|---:|');
    for (const u of a.unterschied) aus.push(`| ${u.arm} | ${z1(u.m)} | ${Number.isFinite(u.lo) ? `[${z1(u.lo)}; ${z1(u.hi)}]` : '–'} | ${z2(u.std)} |`);
  }
  if (a.urteile && a.urteile.length) {
    const ni = STUFEN[a.stufe].ni;
    aus.push('', ni ? `## Urteil: Nichtunterlegenheit (Grenze ${z1(ni.grenze)}${ni.punkt !== undefined ? `, Mittelwert über ${z1(ni.punkt)}` : ''}; vorab festgelegt)`
      : st.leer ? '## Urteil ohne Vorgabe (vorab festgelegt)' : a.stufe === 'O' ? '## Urteil gegen die externen Gegner (vorab festgelegt; MW0 erkundend, ohne Urteil)' : '## Urteil über M1 (vorab festgelegt)', '');
    for (const u of a.urteile) aus.push(`- ${u.arm}: **${u.urteil}**`);
  }
  return aus.join('\n');
}

const lies = d => {
  const roh = fs.readFileSync(d);
  return (d.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
};

function main() {
  const arg = process.argv.slice(2), daten = {}, kontrollen = {};
  let fehler = false, stufe = 'A';
  for (let i = 0; i < arg.length; i++) {
    if (arg[i] === '--stufe' && STUFEN[arg[i + 1]]) { stufe = arg[++i]; continue; }
    const m = arg[i] === '--arm' && /^([gfv]):([A-Z0-9]+)=(.+)$/.exec(arg[i + 1] || '');
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
    console.error('Aufruf: node auswertung/komponenten/bericht.js [--stufe A|B|M|T|T6|L|O] --arm g:D=a.jsonl,... --arm g:N0=... [--kontrolle g=neu.jsonl,alt.jsonl.gz]');
    process.exit(2);
  }
  console.log(text(auswertung(daten, stufe), kontrollen));
}

if (require.main === module) main();
module.exports = {auswertung, text, vergleich, wechselwirkung, gegnerUnterschied, ersteAbweichung, probe, urteilM, urteilNI, urteilL, verteilung, quantil, stat, tKrit, STUFEN, ALPHA, ALPHA_I, NETZ_AB};
