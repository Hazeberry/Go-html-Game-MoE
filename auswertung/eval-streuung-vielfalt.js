// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Vielfaltsmessung (docs/eval-streuung-vielfalt-vorabfestlegung.md).

   Zwei Arme, jeder gegen sich selbst: V1 mit evalStreuung 1 auf beiden Seiten, V0 mit 0.
   Je zehn gepaarte Seed-Blöcke zu 30 Partien.

   PRIMÄRER ENDPUNKT (§4): die Kollisionsrate des ersten Zugs je Block,

       q = Σ_k C(m_k, 2) / C(n, 2)

   mit m_k der Häufigkeit des Feldes k unter den n ersten Zügen eines Blocks — die
   Wahrscheinlichkeit, dass zwei zufällig gezogene Partien des Blocks auf demselben Punkt
   eröffnen. Verglichen werden die gepaarten Differenzen d_i = q(V0, Seed i) − q(V1, Seed i)
   mit dem exakten zweiseitigen Vorzeichentest, alpha 0,05.

   GLEICHSTÄNDE (§4.1), vorab festgelegt und deshalb hier und nicht beim Ablesen:
     - d_i = 0 fällt aus dem Test; die Zahl der übrigen heißt n_eff und steht immer im Bericht.
     - n_eff < 6  ->  primärer Endpunkt KEIN URTEIL, Grund genannt. Bei weniger ist alpha 0,05
       strukturell unerreichbar, und ein p über 0,05 wäre eine Eigenschaft des Umfangs.
     - alle d_i = 0  ->  Bericht sagt genau das; sind beide Arme überall bei q = 0, steht dort
       "in beiden Armen trat in keinem Block eine Wiederholung des ersten Zugs auf". Das ist ein
       Befund über die Messbarkeit, keiner über Gleichheit.

   SEKUNDÄR, beschreibend, ohne p-Wert und ohne Intervall: verschiedene erste Züge, Anteil des
   häufigsten ersten Zugs, verschiedene Präfixe über 5, 10 und 30 Züge, verschiedene
   final_board_hash, Median des Zugs der ersten Abweichung über alle Partienpaare, Partielänge,
   Aufgaben, Anomalien.

   DIE SIEGRATE IST KEIN AUSSCHLUSSGRUND (§6), nur Diagnose: beide Seiten eines Arms sind
   identisch, die Zuordnung zu A und B willkürlich. Verworfen wird erst bei nachgewiesenem
   Aufbaufehler, und der fällt dann unter Grund 2 oder 3.

   DIE ARMZUORDNUNG KOMMT AUS DEN DATEN, nicht aus der Reihenfolge der Aufrufe: der Artefaktname
   unterscheidet die Arme nicht (LABEL ist 30p-seed<N>-run<M> für beide gleich geformt). Gelesen
   wird evalStreuung aus konfig.A und konfig.B des Teillaufs.

   Aufruf:
     node auswertung/eval-streuung-vielfalt.js --partien-je-block 30 \
          --seeds 20261201,...,20261210 --streuung-v1 1 --streuung-v0 0 \
          --teil t.json,t.jsonl,t.log  --teil ...  [--markdown] [--html index.html] */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const {vorzeichenP} = require('./messung-zusatz.js');

const ALPHA = 0.05;
const N_EFF_MIN = 6;              /* darunter ist alpha 0,05 unerreichbar (§4.1 Nr. 3) */
const BLOCKSUMMEN = {
  'shared-go-logic': '54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66',
  'worker-ai':       '3523535bb70bc29e2fbb07081b2b1535a6aa4da56881ed9259c312f288bf7cb9',
  'policy-net':      '14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190'
};
const PRAEFIXE = [5, 10, 30];

const zahl = (v, s = 1) => Number.isFinite(v) ? v.toFixed(s).replace('.', ',') : '—';
const proz = (v, s = 1) => Number.isFinite(v) ? zahl(100 * v, s) + ' %' : '—';
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : zahl(p, 5);
const paare = n => n * (n - 1) / 2;

function argumente(argv) {
  const a = {teile: [], seeds: null, partienJeBlock: 30, streuungV1: 1, streuungV0: 0,
             markdown: false, html: 'index.html'};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    switch (k) {
      case '--teil': a.teile.push(String(v).split(',').map(s => s.trim())); i++; break;
      case '--seeds': a.seeds = String(v).split(',').map(s => parseInt(s.trim(), 10)); i++; break;
      case '--partien-je-block': a.partienJeBlock = parseInt(v, 10); i++; break;
      case '--streuung-v1': a.streuungV1 = Number(v); i++; break;
      case '--streuung-v0': a.streuungV0 = Number(v); i++; break;
      case '--html': a.html = v; i++; break;
      case '--markdown': a.markdown = true; break;
      case '--help': console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]
        .replace(/^\/\*+[^\n]*\n/, '')); process.exit(0);
      default: console.error(`Unbekannte Option: ${k} (--help)`); process.exit(2);
    }
  }
  return a;
}

const spec = s => {
  const o = {};
  for (const t of String(s || '').split(',')) {
    const [k, v] = t.split('=').map(x => (x || '').trim());
    if (k) o[k] = Number(v);
  }
  return o;
};

function blocksummen(htmlPfad) {
  const h = fs.readFileSync(htmlPfad, 'utf8');
  const re = /<script id="([^"]+)">([\s\S]*?)<\/script>/g;
  const out = {}; let m;
  while ((m = re.exec(h))) out[m[1]] = crypto.createHash('sha256').update(m[2]).digest('hex');
  return out;
}

/* Der Harness schreibt die Zeile nur, wenn es Anomalien gab (ab-harness.js Z. 1744):
   keine Zeile heißt null, nur eine fehlende Datei heißt unbekannt. */
function anomalienAusLog(pfad) {
  const m = fs.readFileSync(pfad, 'utf8').match(/⚠\s*(\d+)\s+illegale KI-Züge/);
  return m ? parseInt(m[1], 10) : 0;
}

/* Die Zugfolge einer Partie als Feldindizes, nach Zugnummer sortiert. */
const zugfolge = g => (g.ereignisse || []).slice()
  .sort((x, y) => x.zug - y.zug).map(e => (e && e.idx !== undefined && e.idx !== null) ? e.idx : 'p');

const schluessel = (folge, len) => folge.slice(0, len).join('.');

/* q = Σ C(m_k,2) / C(n,2): Wahrscheinlichkeit, dass zwei Partien denselben Wert teilen. */
function kollisionsrate(werte) {
  const n = werte.length;
  if (n < 2) return NaN;
  const h = new Map();
  for (const w of werte) h.set(w, (h.get(w) || 0) + 1);
  let t = 0;
  for (const m of h.values()) t += paare(m);
  return t / paare(n);
}

/* Zug, an dem zwei Partien zuerst abweichen (1-basiert); endet eine früher, zählt deren Länge+1. */
function ersteAbweichung(a, b) {
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return i + 1;
  return (a.length === b.length) ? Infinity : n + 1;
}
const median = a => {
  if (!a.length) return NaN;
  const s = a.slice().sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

function liesTeile(a) {
  return a.teile.map(([jsonPfad, rohPfad, logPfad]) => ({
    name: path.basename(jsonPfad), jsonPfad, rohPfad, logPfad,
    daten: JSON.parse(fs.readFileSync(jsonPfad, 'utf8')),
    roh: rohPfad ? fs.readFileSync(rohPfad, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)) : null,
    anomalien: logPfad ? anomalienAusLog(logPfad) : null
  }));
}

/* Je Teillauf ein Block: Armzuordnung aus den Daten, Maße aus dem Rohdump. */
function blockMasse(t) {
  const k = t.daten.konfig || {};
  const A = spec(k.A), B = spec(k.B);
  const b = {name: t.name, seed: k.seed, specA: k.A, specB: k.B,
             streuungA: A.evalStreuung, streuungB: B.evalStreuung,
             gleicheSeiten: k.A === k.B, abgeschlossen: !!k.abgeschlossen,
             partien: Array.isArray(t.daten.partien) ? t.daten.partien.length : 0,
             anomalien: t.anomalien, rohDa: !!t.roh, zugfehler: []};
  /* Siegrate nur als Diagnose (§6). */
  let bSiege = 0;
  for (const p of (t.daten.partien || [])) if (p.sieger === 'B') bSiege++;
  b.bSiege = bSiege;
  b.siegrateP = t.daten.partien ? vorzeichenP(bSiege, b.partien - bSiege) : NaN;

  if (!t.roh) return b;
  const folgen = [], hashes = [], laengen = [];
  for (const g of t.roh) {
    const f = zugfolge(g);
    if (!f.length || (Number.isFinite(g.zuege) && f.length !== g.zuege))
      b.zugfehler.push({nr: g.nr, zuege: g.zuege, ereignisse: f.length});
    folgen.push(f);
    hashes.push(g.final_board_hash);
    if (Number.isFinite(g.zuege)) laengen.push(g.zuege);
    if (g.aufgabe) b.aufgaben = (b.aufgaben || 0) + 1;
  }
  b.aufgaben = b.aufgaben || 0;
  b.rohPartien = folgen.length;

  const ersteZuege = folgen.map(f => f[0]);
  b.q = kollisionsrate(ersteZuege);
  b.verschiedeneErste = new Set(ersteZuege).size;
  const h = new Map();
  for (const z of ersteZuege) h.set(z, (h.get(z) || 0) + 1);
  b.haeufigsterErsterAnteil = ersteZuege.length ? Math.max(...h.values()) / ersteZuege.length : NaN;

  b.praefixe = {};
  for (const L of PRAEFIXE) b.praefixe[L] = new Set(folgen.map(f => schluessel(f, L))).size;
  b.verschiedeneEndstellungen = new Set(hashes).size;

  const abw = [];
  for (let i = 0; i < folgen.length; i++)
    for (let j = i + 1; j < folgen.length; j++) {
      const d = ersteAbweichung(folgen[i], folgen[j]);
      abw.push(Number.isFinite(d) ? d : folgen[i].length + 1);
    }
  b.medianAbweichung = median(abw);
  b.zuegeMittel = laengen.length ? laengen.reduce((x, y) => x + y, 0) / laengen.length : NaN;
  b.zuegeMin = laengen.length ? Math.min(...laengen) : NaN;
  b.zuegeMax = laengen.length ? Math.max(...laengen) : NaN;
  return b;
}

/* Die sieben Gründe aus §6. Die Siegrate ist ausdrücklich nicht dabei. */
function pruefeGueltigkeit(a, bloecke) {
  const g = [];
  for (const b of bloecke) {
    if (!b.abgeschlossen) g.push(`Regel 1: ${b.name} ist nicht abgeschlossen.`);
    if (b.partien !== a.partienJeBlock)
      g.push(`Regel 1: ${b.name} zählt ${b.partien} Partien, festgelegt waren ${a.partienJeBlock}.`);
    if (!b.gleicheSeiten)
      g.push(`Regel 2: ${b.name} — die beiden Seiten sind nicht identisch (A "${b.specA}", B "${b.specB}").`);
    if (!b.rohDa) g.push(`Regel 5: ${b.name} — kein Rohdump; ohne die Züge gibt es den primären Endpunkt nicht.`);
    else if (b.rohPartien !== b.partien)
      g.push(`Regel 1: ${b.name} — Rohdump ${b.rohPartien} Partien, Teil ${b.partien}.`);
    if (b.zugfehler.length)
      g.push(`Regel 5: ${b.name} — ${b.zugfehler.length} Partien ohne passende Zugereignisse `
        + `(zuerst Nr. ${b.zugfehler[0].nr}: zuege ${b.zugfehler[0].zuege}, Ereignisse ${b.zugfehler[0].ereignisse}).`);
    if (b.anomalien === null) g.push(`Regel 7: ${b.name} — kein Log; die Anomaliezahl ist ungeprüft.`);
    else if (b.partien > 0 && b.anomalien > 0.02 * b.partien)
      g.push(`Regel 7: ${b.name} — ${b.anomalien} Anomalien bei ${b.partien} Partien, erlaubt sind 2 %.`);
  }
  /* Arme aus den Daten bilden, nicht aus der Reihenfolge. */
  const arme = new Map();
  for (const b of bloecke) {
    if (!b.gleicheSeiten) continue;
    const s = b.streuungA;
    if (!arme.has(s)) arme.set(s, []);
    arme.get(s).push(b);
  }
  const erwartet = [a.streuungV1, a.streuungV0];
  for (const s of arme.keys())
    if (!erwartet.some(e => Object.is(e, s)))
      g.push(`Regel 3: ein Block hat evalStreuung ${s}; erwartet waren nur ${erwartet.join(' und ')}.`);
  for (const e of erwartet) {
    const arm = arme.get(e) || [];
    if (!arm.length) { g.push(`Regel 3: kein Block mit evalStreuung ${e}.`); continue; }
    /* andere PARAMS müssen über die Arme hinweg gleich sein */
    const ohneStreuung = o => { const c = {...spec(o)}; delete c.evalStreuung; return JSON.stringify(Object.entries(c).sort()); };
    const ref = ohneStreuung(arm[0].specA);
    for (const b of arm) if (ohneStreuung(b.specA) !== ref)
      g.push(`Regel 3: ${b.name} weicht ausserhalb von evalStreuung ab ("${b.specA}").`);
    if (a.seeds) {
      const gesehen = new Map();
      for (const b of arm) {
        if (gesehen.has(b.seed)) g.push(`Regel 4: Seed ${b.seed} kommt im Arm evalStreuung ${e} zweimal vor.`);
        gesehen.set(b.seed, b.name);
      }
      for (const s of a.seeds) if (!gesehen.has(s))
        g.push(`Regel 4: Seed ${s} fehlt im Arm evalStreuung ${e}.`);
      for (const s of gesehen.keys()) if (!a.seeds.includes(s))
        g.push(`Regel 4: Seed ${s} im Arm evalStreuung ${e} war nicht festgelegt.`);
    }
  }
  /* Arme untereinander: ausserhalb von evalStreuung gleich */
  if (arme.size === 2) {
    const [x, y] = [...arme.values()];
    const ohne = o => { const c = {...spec(o)}; delete c.evalStreuung; return JSON.stringify(Object.entries(c).sort()); };
    if (ohne(x[0].specA) !== ohne(y[0].specA))
      g.push('Regel 3: die beiden Arme unterscheiden sich ausserhalb von evalStreuung.');
  }
  try {
    const ist = blocksummen(a.html);
    for (const [blk, soll] of Object.entries(BLOCKSUMMEN))
      if (ist[blk] !== soll)
        g.push(`Regel 6: Block ${blk} hat SHA-256 ${(ist[blk] || 'fehlt').slice(0, 16)}…, erwartet ${soll.slice(0, 16)}….`);
  } catch (e) { g.push(`Regel 6: Blockprüfsummen von ${a.html} nicht lesbar (${e.message}).`); }
  return {gruende: g, arme};
}

/* Primärer Endpunkt: gepaarte Differenzen, Vorzeichentest, Gleichstände nach §4.1. */
function primaer(a, arme) {
  const v1 = new Map((arme.get(a.streuungV1) || []).map(b => [b.seed, b]));
  const v0 = new Map((arme.get(a.streuungV0) || []).map(b => [b.seed, b]));
  const seeds = (a.seeds || [...v1.keys()]).filter(s => v1.has(s) && v0.has(s)).sort((x, y) => x - y);
  const zeilen = seeds.map(s => {
    const q1 = v1.get(s).q, q0 = v0.get(s).q;
    return {seed: s, q1, q0, d: q0 - q1};
  });
  const nonNull = zeilen.filter(z => Number.isFinite(z.d) && z.d !== 0);
  const nEff = nonNull.length;
  const hoeher = nonNull.filter(z => z.d > 0).length;
  const p = nEff ? vorzeichenP(hoeher, nEff - hoeher) : NaN;
  const alleNull = zeilen.length > 0 && zeilen.every(z => z.d === 0);
  const beideNullRate = zeilen.length > 0 && zeilen.every(z => z.q1 === 0 && z.q0 === 0);
  let urteil;
  if (nEff < N_EFF_MIN)
    urteil = {art: 'kein-urteil',
      grund: `zu wenige von Null verschiedene Blockdifferenzen (n_eff = ${nEff}, nötig ${N_EFF_MIN}); `
        + `bei weniger ist alpha ${zahl(ALPHA, 2)} strukturell unerreichbar`};
  else if (!(p < ALPHA)) urteil = {art: 'kein-unterschied'};
  else urteil = {art: hoeher > nEff - hoeher ? 'v0-konzentrierter' : 'v0-gestreuter'};
  return {zeilen, nEff, hoeher, niedriger: nEff - hoeher, p, alleNull, beideNullRate, urteil,
          medianD: median(zeilen.map(z => z.d).filter(Number.isFinite))};
}

const URTEILSSATZ = {
  'kein-unterschied': 'Über die Seed-Blöcke ließ sich kein konsistenter Unterschied in der Konzentration '
    + 'des ersten Zugs nachweisen.',
  'v0-konzentrierter': 'Ohne Rauschen eröffnet die Engine konzentrierter: das Rauschen kauft Streuung.',
  'v0-gestreuter': 'Unerwartet: ohne Rauschen eröffnet die Engine GESTREUTER. Für diese Richtung liegt '
    + 'keine Erklärung vor; berichtet wird, wie gemessen.'
};

function bericht(a, bloecke, pr, gruende, md) {
  const L = [], h = (t, n) => L.push(md ? '#'.repeat(n) + ' ' + t : '\n' + t.toUpperCase());
  h('Vielfalt des Rauschterms', 1);
  L.push('');
  if (gruende.length) {
    L.push(md ? '**KEIN URTEIL.**' : 'KEIN URTEIL.');
    L.push('');
    for (const g of gruende) L.push('- ' + g);
    L.push('');
    L.push('Die Gültigkeitsregel aus §6 kennt zwei Zustände. Es wird nichts weiter gerechnet.');
    return L.join('\n');
  }
  L.push(md ? '**GÜLTIG.**' : 'GÜLTIG.');
  L.push(`Arme: V1 evalStreuung ${a.streuungV1}, V0 evalStreuung ${a.streuungV0}, beide Seiten je Arm identisch.`);
  L.push(`${pr.zeilen.length} gepaarte Blöcke, je ${a.partienJeBlock} Partien.`);
  L.push('');
  h('Primärer Endpunkt: Kollisionsrate des ersten Zugs', 2);
  L.push('');
  if (md) { L.push('| Seed | q (V1) | q (V0) | Differenz |'); L.push('|---:|---:|---:|---:|'); }
  for (const z of pr.zeilen)
    L.push(md ? `| ${z.seed} | ${zahl(z.q1, 4)} | ${zahl(z.q0, 4)} | ${z.d === 0 ? '0 (Gleichstand)' : zahl(z.d, 4)} |`
               : `  ${z.seed}: q(V1) ${zahl(z.q1, 4)}  q(V0) ${zahl(z.q0, 4)}  d ${zahl(z.d, 4)}`);
  L.push('');
  L.push(`n_eff = ${pr.nEff} von ${pr.zeilen.length} (Gleichstände fallen heraus, §4.1)`);
  L.push(`Richtung: ${pr.hoeher} Blöcke mit höherer Rate in V0, ${pr.niedriger} mit niedrigerer`);
  L.push(`Median der Differenzen: ${zahl(pr.medianD, 4)}`);
  L.push(`Exakter zweiseitiger Vorzeichentest: ${Number.isFinite(pr.p) ? 'p = ' + fp(pr.p) : 'nicht berechenbar'}`);
  L.push('');
  if (pr.urteil.art === 'kein-urteil') {
    L.push(md ? `**Primärer Endpunkt: KEIN URTEIL** — ${pr.urteil.grund}.`
              : `Primärer Endpunkt: KEIN URTEIL — ${pr.urteil.grund}.`);
    if (pr.beideNullRate)
      L.push('In beiden Armen trat in keinem Block eine Wiederholung des ersten Zugs auf. '
        + 'Das ist ein Befund über die Messbarkeit, kein Befund über Gleichheit (§8).');
    else if (pr.alleNull)
      L.push('Alle Blockdifferenzen sind null: in jedem Block haben beide Arme dieselbe Kollisionsrate.');
  } else {
    L.push(md ? `**Urteil nach §5: ${URTEILSSATZ[pr.urteil.art]}**` : `Urteil nach §5: ${URTEILSSATZ[pr.urteil.art]}`);
    if (pr.urteil.art === 'kein-unterschied')
      L.push('Daraus folgt nicht, woher die übrige Streuung kommt, und nicht, dass Abschalten '
        + 'gleichwertig wäre (§5, §8).');
  }
  L.push('');
  h('Sekundär, beschreibend — ohne p-Wert und ohne Intervall', 2);
  L.push('');
  for (const [wert, arm] of [[a.streuungV1, 'V1'], [a.streuungV0, 'V0']]) {
    const bs = bloecke.filter(b => Object.is(b.streuungA, wert)).sort((x, y) => x.seed - y.seed);
    const n = bs.length || 1;
    const mw = f => bs.reduce((s, b) => s + (Number.isFinite(f(b)) ? f(b) : 0), 0) / n;
    L.push(md ? `### Arm ${arm} (evalStreuung ${wert})` : `  Arm ${arm} (evalStreuung ${wert})`);
    L.push('');
    if (md) {
      L.push('| Seed | q | verschiedene erste Züge | Anteil häufigster | Präfix 5 | Präfix 10 | Präfix 30 | Endstellungen | Median erste Abweichung | Züge Ø | Aufgaben | Anomalien |');
      L.push('|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
    }
    for (const b of bs)
      L.push(md ? `| ${b.seed} | ${zahl(b.q, 4)} | ${b.verschiedeneErste} / ${b.rohPartien} | ${proz(b.haeufigsterErsterAnteil)} | ${b.praefixe[5]} | ${b.praefixe[10]} | ${b.praefixe[30]} | ${b.verschiedeneEndstellungen} | ${zahl(b.medianAbweichung)} | ${zahl(b.zuegeMittel)} | ${b.aufgaben} | ${b.anomalien} |`
                 : `    ${b.seed}: q ${zahl(b.q, 4)}  erste ${b.verschiedeneErste}/${b.rohPartien}  P10 ${b.praefixe[10]}  Median-Abw ${zahl(b.medianAbweichung)}`);
    L.push('');
    L.push(`Mittel über die Blöcke: q ${zahl(mw(b => b.q), 4)} · verschiedene erste Züge `
      + `${zahl(mw(b => b.verschiedeneErste))} von ${a.partienJeBlock} · Anteil häufigster `
      + `${proz(mw(b => b.haeufigsterErsterAnteil))} · Präfix 10 ${zahl(mw(b => b.praefixe[10]))} · `
      + `Endstellungen ${zahl(mw(b => b.verschiedeneEndstellungen))} · Median erste Abweichung `
      + `${zahl(mw(b => b.medianAbweichung))} · Partielänge ${zahl(mw(b => b.zuegeMittel))}`);
    L.push('');
  }
  h('Diagnose: Siegrate je Block — KEIN Ausschlussgrund (§6)', 2);
  L.push('');
  L.push('Beide Seiten eines Arms sind identisch, die Zuordnung zu A und B ist willkürlich. Eine auffällige');
  L.push('Rate kommt bei korrektem Aufbau mit der üblichen Häufigkeit vor und macht den Lauf nicht ungültig.');
  L.push('');
  const auff = bloecke.filter(b => Number.isFinite(b.siegrateP) && b.siegrateP < ALPHA);
  L.push(auff.length
    ? `Auffällig (p < ${zahl(ALPHA, 2)}): ` + auff.map(b => `${b.name} ${b.bSiege}:${b.partien - b.bSiege} (p = ${fp(b.siegrateP)})`).join(', ')
      + '. Zu prüfen sind Farbwechsel, Armzuordnung und Parameter; verworfen wird erst bei nachgewiesenem Fehler.'
    : `Keine auffällige Siegrate (alle p ≥ ${zahl(ALPHA, 2)}).`);
  return L.join('\n');
}

function main() {
  const a = argumente(process.argv);
  if (!a.teile.length) { console.error('Kein --teil angegeben (--help)'); process.exit(2); }
  const bloecke = liesTeile(a).map(blockMasse);
  const {gruende, arme} = pruefeGueltigkeit(a, bloecke);
  const pr = gruende.length ? null : primaer(a, arme);
  console.log(bericht(a, bloecke, pr, gruende, a.markdown));
  process.exit(gruende.length || (pr && pr.urteil.art === 'kein-urteil') ? 1 : 0);
}

if (require.main === module) main();
module.exports = {kollisionsrate, ersteAbweichung, median, zugfolge, schluessel, spec, blocksummen,
                  anomalienAusLog, blockMasse, pruefeGueltigkeit, primaer, bericht, liesTeile,
                  URTEILSSATZ, N_EFF_MIN, BLOCKSUMMEN, PRAEFIXE};
