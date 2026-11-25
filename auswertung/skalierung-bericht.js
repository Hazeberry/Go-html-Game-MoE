// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Skalierungsmessung (docs/skalierung-heute-vorabfestlegung.md, §5 und §7).

   Stufe 1: K1 (120 gegen 240) und K2 (240 gegen 480), je 15 Teilläufe zu 82 Partien.
     F1, je Vergleich: Siegrate von B (immer die doppelte Suche), exakter zweiseitiger
         Binomialtest gegen 50 %, Clopper-Pearson 95 %, Elo = 400 · log10(p / (1 − p)) mit
         Intervall aus den Grenzen der Siegrate.
     F2: D = Elo(K1) − Elo(K2). Test: exakter zweiseitiger Fisher-Test auf die Vierfeldertafel
         der Siege und Niederlagen von B in K1 und K2 — Elo ist streng monoton in der
         Siegrate, „gleicher Gewinn“ heißt also genau „gleiche Siegrate“. Das Intervall für D
         ist genähert (Delta-Methode) und nur Beschreibung.
     Dazu die Laufzeit je Partie und daraus die Kostenschätzung für Stufe 2 (§7.3), für eine
     feste Reihe von N und, mit --n, zusätzlich für das N aus Stufe G.
   Stufe 2: ein Vergleich K3 = N gegen 2N (§7.1, Fassung nach §15: N ist S auf volle Hundert
     gerundet), F1 wie oben; die Differenz zu K2 nur beschreibend, ohne Test (§7.4).

   Gültigkeit nach §5.5, zwei Zustände. Bei KEIN URTEIL endet das Skript mit Status 1.

   Zwei Stellen prüft das Werkzeug nur so weit, wie der Harness es hergibt (§13 der Festlegung):
     - Anomalien zählt ab-harness.js nur je Teillauf, nicht je Arm. Regel 5 wird konservativ
       geprüft: Summe beider Arme höchstens 2 % der Partien des Vergleichs. Was das besteht,
       besteht die Regel je Arm sicher.
     - Das Zuglimit steht nicht im JSON, nur in der Kopfzeile des Logs („max N Züge“).

   Aufruf:
     node auswertung/skalierung-bericht.js --stufe 1 --commit <sha> --html stand.html \
          --teil t.json,t.jsonl,t.log  [--teil …]  [--n 2700]  [--markdown]
     node auswertung/skalierung-bericht.js --stufe 2 --n 2700 --partien-je-teil 10 \
          --commit <sha> --html stand.html [--k2 <SiegeB>:<Partien>] --teil …  [--markdown]
   --n ist ein Vielfaches von 100, mindestens 100 (arbeitspunkt.js nennt es). */
'use strict';
const fs = require('fs');
const path = require('path');
const {vorzeichenP} = require('./messung-zusatz.js');
const {clopperPearson} = require('./kandidaten-orakel/haupt-bericht.js');
const {spec, blocksummen, anomalienAusLog} = require('./eval-streuung-bericht.js');

const ALPHA = 0.05;
const PARTIEN = 1230;
const ZUGLIMIT = 600;
const KOMI = 7.5;
const SCHLUESSEL = ['mctsFixedSims', 'resignEnabled'];
/* Gerade Teiler von 1230: so bleiben die Farben je Teillauf ausgeglichen (§7.2). */
const TEILER = [2, 6, 10, 30, 82, 246, 410, 1230];
/* §6: SHA-256 des Inhalts der drei Engine-Blöcke, am Stand 591e70e nachgerechnet. */
const BLOCKSUMMEN = {
  'shared-go-logic': '54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66',
  'worker-ai':       '3523535bb70bc29e2fbb07081b2b1535a6aa4da56881ed9259c312f288bf7cb9',
  'policy-net':      '14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190'
};

const bereich = (start, n) => Array.from({length: n}, (_, i) => start + i);
/* §5.1: die beiden Vergleiche von Stufe 1, wörtlich. */
const STUFE1 = [
  {name: 'K1', a: 120, b: 240, seeds: bereich(11250001, 15), partienJeTeil: 82},
  {name: 'K2', a: 240, b: 480, seeds: bereich(11250016, 15), partienJeTeil: 82}
];
/* §7.1 und §7.2: der Vergleich von Stufe 2, K3 = N gegen 2N. */
function stufe2(n, g) {
  return [{name: 'K3', a: n, b: 2 * n, seeds: bereich(11260001, PARTIEN / g), partienJeTeil: g}];
}
/* §7.1: N ist S auf volle Hundert gerundet, also ein Vielfaches von 100; unter 100 entfällt
   Stufe 2. */
const gueltigesN = n => Number.isInteger(n) && n >= 100 && n % 100 === 0;
/* §7.3: feste Reihe für die Kostenschätzung, um den erwarteten Arbeitspunkt herum. */
const KOSTEN_N = [1000, 1500, 2000, 2500, 3000, 3500, 4000];

const zahl = (v, s = 1) => v.toFixed(s).replace('.', ',');
const mitVz = (v, s = 1) => (v > 0 ? '+' : v < 0 ? '−' : '±') + zahl(Math.abs(v), s);
const proz = v => zahl(100 * v, 1) + ' %';
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : zahl(p, 4);
const elo = p => (p <= 0 || p >= 1) ? (p <= 0 ? -Infinity : Infinity) : 400 * Math.log10(p / (1 - p));
const seElo = (p, n) => (400 / Math.LN10) / Math.sqrt(n * p * (1 - p));
const mittel = a => a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN;
function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/* Exakter zweiseitiger Fisher-Test auf die Tafel [[a, b], [c, d]]: Summe der
   Wahrscheinlichkeiten aller Tafeln mit festen Rändern, die höchstens so wahrscheinlich sind
   wie die beobachtete (Toleranz 1e-7 relativ, gegen Rundung im Logarithmus). */
function fisherZweiseitig(a, b, c, d) {
  const n = a + b + c + d, r1 = a + b, c1 = a + c;
  const lf = [0];
  for (let i = 1; i <= n; i++) lf[i] = lf[i - 1] + Math.log(i);
  const lp = x => lf[r1] + lf[n - r1] + lf[c1] + lf[n - c1] - lf[n]
    - lf[x] - lf[r1 - x] - lf[c1 - x] - lf[n - r1 - c1 + x];
  const lo = Math.max(0, c1 - (n - r1)), hi = Math.min(r1, c1);
  const l0 = lp(a);
  let s = 0;
  for (let x = lo; x <= hi; x++) { const l = lp(x); if (l <= l0 + 1e-7) s += Math.exp(l); }
  return Math.min(1, s);
}

function argumente(argv) {
  const a = {stufe: null, n: null, partienJeTeil: null, commit: null, html: null, k2: null,
             teile: [], markdown: false};
  for (let i = 2; i < argv.length; i++) {
    const s = argv[i], v = argv[i + 1];
    switch (s) {
      case '--stufe': a.stufe = parseInt(v, 10); i++; break;
      case '--n': a.n = /^\d+$/.test(String(v)) ? Number(v) : NaN; i++; break;
      case '--partien-je-teil': a.partienJeTeil = parseInt(v, 10); i++; break;
      case '--commit': a.commit = String(v); i++; break;
      case '--html': a.html = v; i++; break;
      case '--k2': {
        const m = /^(\d+):(\d+)$/.exec(String(v));
        if (!m) { console.error(`--k2 erwartet SiegeB:Partien, bekommen ${v}`); process.exit(2); }
        a.k2 = {siege: +m[1], n: +m[2]}; i++; break;
      }
      case '--teil': a.teile.push(String(v).split(',').map(t => t.trim())); i++; break;
      case '--markdown': a.markdown = true; break;
      case '--help': console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]
        .replace(/^[\s\S]*?\/\*\s*/, '')); process.exit(0);
      default: console.error(`Unbekannte Option: ${s} (--help)`); process.exit(2);
    }
  }
  return a;
}

/* Die erwarteten Vergleiche aus der Stufe. Ein Bedienfehler ist kein Urteil über die Messung:
   dafür Exit 2, nicht Exit 1. */
function vergleiche(a) {
  if (a.n !== null && a.n !== undefined && !gueltigesN(a.n))
    throw new Error(`--n muss ein Vielfaches von 100 und mindestens 100 sein (§7.1), bekommen ${a.n}.`);
  if (a.stufe === 1) return STUFE1;
  if (a.stufe === 2) {
    if (!gueltigesN(a.n)) throw new Error('Stufe 2 braucht --n: S auf volle Hundert gerundet, mindestens 100 (§7.1).');
    if (!TEILER.includes(a.partienJeTeil))
      throw new Error(`--partien-je-teil muss ein gerader Teiler von 1230 sein (${TEILER.join(', ')}), §7.2.`);
    return stufe2(a.n, a.partienJeTeil);
  }
  throw new Error('--stufe muss 1 oder 2 sein.');
}

function zuglimitAusLog(text) {
  const m = text.match(/max (\d+) Züge/);
  return m ? parseInt(m[1], 10) : null;
}

function lies(a) {
  return a.teile.map(([jsonPfad, rohPfad, logPfad]) => {
    const log = logPfad ? fs.readFileSync(logPfad, 'utf8') : null;
    return {
      name: path.basename(jsonPfad),
      daten: JSON.parse(fs.readFileSync(jsonPfad, 'utf8')),
      roh: rohPfad ? fs.readFileSync(rohPfad, 'utf8').split('\n').filter(z => z.trim()) : null,
      anomalien: logPfad ? anomalienAusLog(logPfad) : null,
      zuglimit: log === null ? null : zuglimitAusLog(log)
    };
  });
}

/* Die fünf Regeln aus §5.5, in der Reihenfolge des Dokuments. Gibt die Gründe zurück und
   ordnet jeden Teil seinem Vergleich zu — aus konfig.A und konfig.B, nicht aus der Reihenfolge. */
function pruefe(a, vgl, teile) {
  const gruende = [];
  const jeVergleich = new Map(vgl.map(v => [v.name, []]));

  /* Regel 1: Zuordnung und Seeds. */
  for (const t of teile) {
    const k = t.daten.konfig || {};
    const A = spec(k.A), B = spec(k.B);
    const v = vgl.find(x => A.mctsFixedSims === x.a && B.mctsFixedSims === x.b);
    if (!v) {
      gruende.push(`Regel 1: ${t.name} — A ${A.mctsFixedSims}, B ${B.mctsFixedSims} Simulationen passen zu keinem `
        + `Vergleich dieser Stufe (${vgl.map(x => `${x.name} ${x.a} → ${x.b}`).join(', ')}).`);
      continue;
    }
    t.vergleich = v.name;
    jeVergleich.get(v.name).push(t);
  }
  for (const v of vgl) {
    const gesehen = new Map();
    for (const t of jeVergleich.get(v.name)) {
      const s = (t.daten.konfig || {}).seed;
      if (gesehen.has(s)) gruende.push(`Regel 1: ${v.name} — Seed ${s} kommt doppelt vor (${gesehen.get(s)}, ${t.name}).`);
      else gesehen.set(s, t.name);
      if (!v.seeds.includes(s)) gruende.push(`Regel 1: ${v.name} — Seed ${s} (${t.name}) steht nicht in der Liste aus der Festlegung.`);
    }
    const fehlend = v.seeds.filter(s => !gesehen.has(s));
    if (fehlend.length)
      gruende.push(`Regel 1: ${v.name} — ${fehlend.length} festgelegte Teilläufe fehlen (Seeds ${fehlend.join(', ')}).`);
  }

  /* Regel 2: genau G Partien je Teillauf, G/2 je Farbe, abgeschlossen, Rohdump gleich lang. */
  for (const t of teile) {
    const v = vgl.find(x => x.name === t.vergleich);
    if (!v) continue;
    const g = v.partienJeTeil, p = Array.isArray(t.daten.partien) ? t.daten.partien : [];
    if (!(t.daten.konfig || {}).abgeschlossen) gruende.push(`Regel 2: ${t.name} ist nicht abgeschlossen.`);
    if (p.length !== g) gruende.push(`Regel 2: ${t.name} hat ${p.length} Partien, festgelegt sind ${g}.`);
    const aSchwarz = p.filter(x => x.aIst === 'Schwarz').length;
    if (p.length === g && aSchwarz !== g / 2)
      gruende.push(`Regel 2: ${t.name} — A spielt ${aSchwarz}-mal Schwarz und ${g - aSchwarz}-mal Weiß, verlangt sind je ${g / 2}.`);
    if (t.roh === null) gruende.push(`Regel 2: ${t.name} — kein Rohdump übergeben; der Lauf muss mit roh=1 laufen (§5.1).`);
    else if (t.roh.length !== p.length)
      gruende.push(`Regel 2: ${t.name} zählt ${p.length} Partien, der Rohdump ${t.roh.length}.`);
  }

  /* Regel 3: Arme nur in mctsFixedSims verschieden, resignEnabled 0, Komi, Modus, Zuglimit. */
  for (const t of teile) {
    const k = t.daten.konfig || {};
    const A = spec(k.A), B = spec(k.B);
    for (const [arm, x] of [['A', A], ['B', B]]) {
      const keys = Object.keys(x).sort();
      if (keys.join(',') !== [...SCHLUESSEL].sort().join(','))
        gruende.push(`Regel 3: ${t.name} — Arm ${arm} setzt [${keys.join(', ')}], festgelegt sind genau `
          + `[${SCHLUESSEL.join(', ')}] (§5.1).`);
      if (x.resignEnabled !== 0) gruende.push(`Regel 3: ${t.name} — Arm ${arm} hat resignEnabled ${x.resignEnabled}, verlangt ist 0.`);
    }
    if (k.komi !== KOMI) gruende.push(`Regel 3: ${t.name} — Komi ${k.komi}, festgelegt ist ${zahl(KOMI)}.`);
    if (k.modus !== 'standard') gruende.push(`Regel 3: ${t.name} — Modus ${k.modus}, festgelegt ist der Standardmodus.`);
    if (t.zuglimit === null)
      gruende.push(`Regel 3: ${t.name} — das Zuglimit ist nicht belegt (kein Log oder keine Kopfzeile „max N Züge“).`);
    else if (t.zuglimit !== ZUGLIMIT)
      gruende.push(`Regel 3: ${t.name} — Zuglimit ${t.zuglimit}, festgelegt ist ${ZUGLIMIT}.`);
  }

  /* Regel 4: Commit und Engine-Blöcke. */
  if (!a.commit) gruende.push('Regel 4: Der festgelegte Commit ist nicht angegeben (--commit).');
  for (const t of teile) {
    const c = (t.daten.konfig || {}).commit;
    if (a.commit && c !== a.commit)
      gruende.push(`Regel 4: ${t.name} lief auf ${c ? c.slice(0, 12) : 'unbekanntem Commit'}, festgelegt ist ${a.commit.slice(0, 12)}.`);
  }
  if (!a.html) gruende.push('Regel 4: Kein Stand des festgelegten Commits übergeben (--html).');
  else {
    try {
      const ist = blocksummen(a.html);
      for (const [block, soll] of Object.entries(BLOCKSUMMEN))
        if (ist[block] !== soll)
          gruende.push(`Regel 4: Block ${block} hat SHA-256 ${(ist[block] || 'fehlt').slice(0, 16)}…, `
            + `festgelegt ist ${soll.slice(0, 16)}… (§6).`);
    } catch (e) {
      gruende.push(`Regel 4: Die Blockprüfsummen von ${a.html} sind nicht lesbar (${e.message}).`);
    }
  }

  /* Regel 5: Anomalien, konservativ als Summe beider Arme je Vergleich (§13). */
  for (const v of vgl) {
    const ts = jeVergleich.get(v.name);
    const ohne = ts.filter(t => t.anomalien === null);
    if (ohne.length) {
      gruende.push(`Regel 5: ${v.name} — für ${ohne.map(t => t.name).join(', ')} liegt kein Log vor; die Anomalien sind ungeprüft.`);
      continue;
    }
    const n = ts.reduce((s, t) => s + (Array.isArray(t.daten.partien) ? t.daten.partien.length : 0), 0);
    const summe = ts.reduce((s, t) => s + t.anomalien, 0);
    if (n > 0 && summe > 0.02 * n)
      gruende.push(`Regel 5: ${v.name} — ${summe} Anomalien bei ${n} Partien (${proz(summe / n)}); erlaubt sind 2 %, `
        + 'geprüft als Summe beider Arme (§13).');
  }
  return {gruende, jeVergleich};
}

/* F1 und die Nebenmaße eines Vergleichs. */
function rechne(v, teile) {
  const p = teile.flatMap(t => t.daten.partien);
  const n = p.length, siege = p.filter(x => x.sieger === 'B').length;
  const rate = siege / n, ci = clopperPearson(siege, n, ALPHA);
  const bSchwarz = p.filter(x => x.aIst === 'Weiß'), bWeiss = p.filter(x => x.aIst === 'Schwarz');
  const zuege = p.map(x => x.zuege).filter(Number.isFinite);
  return {
    name: v.name, a: v.a, b: v.b, n, siege, niederlagen: n - siege, rate,
    p: vorzeichenP(siege, n - siege), ci, elo: elo(rate), eloCi: [elo(ci[0]), elo(ci[1])],
    bSchwarz: {n: bSchwarz.length, siege: bSchwarz.filter(x => x.sieger === 'B').length},
    bWeiss: {n: bWeiss.length, siege: bWeiss.filter(x => x.sieger === 'B').length},
    zuegeMittel: mittel(zuege), zuegeMedian: median(zuege),
    amLimit: zuege.filter(z => z >= ZUGLIMIT).length,
    anomalien: teile.reduce((s, t) => s + t.anomalien, 0),
    simsA: mittel(p.map(x => x.simsA).filter(Number.isFinite)),
    simsB: mittel(p.map(x => x.simsB).filter(Number.isFinite)),
    minJePartie: mittel(p.map(x => x.dauerMin).filter(Number.isFinite)),
    teilMin: teile.map(t => (t.daten.konfig || {}).dauerMin).filter(Number.isFinite)
  };
}

/* §5.2, F2: Differenz der Gewinne, Fisher-Test, genähertes Intervall. */
function abflachung(r1, r2) {
  const D = r1.elo - r2.elo;
  const se = Math.hypot(seElo(r1.rate, r1.n), seElo(r2.rate, r2.n));
  return {D, ci: [D - 1.959964 * se, D + 1.959964 * se],
          p: fisherZweiseitig(r1.siege, r1.niederlagen, r2.siege, r2.niederlagen)};
}

/* Die Urteilssätze aus §5.3, wörtlich. */
function urteilF1(r) {
  const E = mitVz(r.elo), u = mitVz(r.eloCi[0]), o = mitVz(r.eloCi[1]);
  if (r.p < ALPHA && r.rate > 0.5)
    return `Eine Verdopplung von ${r.a} auf ${r.b} Simulationen bringt dem heutigen Default nachweisbar Stärke: ${E} Elo [${u}; ${o}].`;
  if (r.p < ALPHA && r.rate < 0.5)
    return 'Die doppelte Suche verliert nachweisbar.';
  return `Ein Gewinn durch die Verdopplung von ${r.a} auf ${r.b} ist nicht nachgewiesen. Das Intervall [${u}; ${o}] sagt, wie groß er sein könnte.`;
}
function urteilF2(f) {
  const D = mitVz(f.D), u = mitVz(f.ci[0]), o = mitVz(f.ci[1]);
  if (f.p < ALPHA && f.D > 0)
    return `Der Gewinn je Verdopplung ist bei 240 → 480 nachweisbar kleiner als bei 120 → 240: ${D} Elo [${u}; ${o}].`;
  if (f.p < ALPHA && f.D < 0)
    return `Der Gewinn je Verdopplung ist bei 240 → 480 nachweisbar größer als bei 120 → 240: ${D} Elo [${u}; ${o}].`;
  return `Ein Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen (${D} Elo [${u}; ${o}]). `
    + 'Die Messung war so bemessen, dass sie eine Abflachung von 40 Elo mit rund 80 % erkannt hätte.';
}

/* §7.3: Laufzeit = a + b · mittlere Simulationen je Zug, aus K1 und K2; daraus je N die
   Partien je Teillauf (größter gerader Teiler von 1230 mit höchstens 200 Minuten je Teillauf),
   Rechenstunden und Wanduhrzeit bei 20 gleichzeitigen Jobs. Mit n kommt das N aus Stufe G
   als eigene, markierte Zeile dazu. */
function kosten(r1, r2, n = null) {
  const m1 = (r1.a + r1.b) / 2, m2 = (r2.a + r2.b) / 2;
  const b = (r2.minJePartie - r1.minJePartie) / (m2 - m1), a0 = r1.minJePartie - b * m1;
  const liste = [...new Set([...KOSTEN_N, ...(n === null ? [] : [n])])].sort((x, y) => x - y);
  const zeilen = liste.map(von => {
    const m = (von + 2 * von) / 2, jePartie = a0 + b * m;
    const g = [...TEILER].reverse().find(x => x * jePartie <= 200) || null;
    const teile = g ? PARTIEN / g : null;
    return {von, bis: 2 * von, ausStufeG: von === n, jePartie, g, teile,
            rechenStunden: PARTIEN * jePartie / 60,
            wanduhrStunden: g ? Math.ceil(teile / 20) * g * jePartie / 60 : null};
  });
  return {a: a0, b, belastbar: b > 0, zeilen};
}

/* §7.4: wie K3 (N → 2N) zu K2 (240 → 480) liegt, für den beschreibenden Abstand. */
function lageZuK2(n) {
  const vd = x => { const s = zahl(x, 2).replace(/,00$/, ''); return s === '1' ? '1 Verdopplung' : `${s} Verdopplungen`; };
  if (n === 480) return 'K3 schließt unmittelbar an K2 an.';
  if (n > 480) return `Zwischen K2 (endet bei 480) und K3 (beginnt bei ${n}) bleibt ein Abstand von ${vd(Math.log2(n / 480))} ungemessen.`;
  if (2 * n > 240) return 'K3 überschneidet sich mit K2 (240 → 480).';
  if (2 * n === 240) return 'K3 endet dort, wo K2 beginnt.';
  return `Zwischen K3 (endet bei ${2 * n}) und K2 (beginnt bei 240) bleibt ein Abstand von ${vd(Math.log2(240 / (2 * n)))} ungemessen.`;
}

function bericht(a, vgl, ergebnis, gruende) {
  const L = [], md = a.markdown;
  const h = (t, s) => L.push(md ? '#'.repeat(s) + ' ' + t : '\n' + t.toUpperCase());
  h(`Skalierung auf dem heutigen Default — Stufe ${a.stufe}`, 1);
  L.push('');
  if (gruende.length) {
    L.push(md ? '**KEIN URTEIL.**' : 'KEIN URTEIL.');
    L.push('');
    for (const g of gruende) L.push('- ' + g);
    L.push('');
    L.push('Die Gültigkeitsregel aus §5.5 kennt zwei Zustände. Es wird nichts weiter gerechnet.');
    return L.join('\n');
  }
  L.push(md ? '**GÜLTIG.**' : 'GÜLTIG.');
  L.push(`Commit ${a.commit} · Engine-Blöcke wie in §6 · Zuglimit ${ZUGLIMIT} · Komi ${zahl(KOMI)} · Aufgabe aus.`);
  L.push('');
  h('F1: Gewinn je Verdopplung', 2);
  L.push('');
  if (md) { L.push('| Vergleich | Siege B : A | Siegrate B (95 %) | p | Elo (95 %) |'); L.push('|---|---:|---|---:|---|'); }
  for (const r of ergebnis.f1)
    L.push(md
      ? `| ${r.name} ${r.a} → ${r.b} | ${r.siege} : ${r.niederlagen} | ${proz(r.rate)} [${proz(r.ci[0])}; ${proz(r.ci[1])}] | ${fp(r.p)} | **${mitVz(r.elo)}** [${mitVz(r.eloCi[0])}; ${mitVz(r.eloCi[1])}] |`
      : `  ${r.name} ${r.a} → ${r.b}: ${r.siege} : ${r.niederlagen}, ${proz(r.rate)}, p = ${fp(r.p)}, Elo ${mitVz(r.elo)} [${mitVz(r.eloCi[0])}; ${mitVz(r.eloCi[1])}]`);
  L.push('');
  for (const r of ergebnis.f1) L.push(`- ${r.name}: ${md ? '**' : ''}${urteilF1(r)}${md ? '**' : ''}`);
  if (ergebnis.f1.some(r => r.p < ALPHA && r.rate < 0.5))
    L.push('', 'Hinweis aus §5.3: Das ist zuerst ein Verdacht auf einen Aufbaufehler; vor jeder Deutung werden Armzuordnung und Parameter geprüft.');
  L.push('');
  if (ergebnis.f2) {
    const f = ergebnis.f2;
    h('F2: Abflachung', 2);
    L.push('');
    L.push(`D = Elo(K1) − Elo(K2) = ${mitVz(f.D)} Elo, 95 % genähert [${mitVz(f.ci[0])}; ${mitVz(f.ci[1])}]`);
    L.push(`Exakter zweiseitiger Fisher-Test auf die Siege von B in K1 und K2: p = ${fp(f.p)} (alpha ${zahl(ALPHA, 2)})`);
    L.push('');
    L.push(md ? `**${urteilF2(f)}**` : urteilF2(f));
    L.push('');
  }
  if (ergebnis.k2) {
    const d = ergebnis.k2;
    h('Beschreibend: Abstand zu K2, ohne Test (§7.4)', 2);
    L.push('');
    L.push(`Elo(K2) − Elo(K3) = ${mitVz(d.D)} Elo, 95 % genähert [${mitVz(d.ci[0])}; ${mitVz(d.ci[1])}]. `
      + lageZuK2(a.n));
    L.push('');
  }
  h('Nebenmaße, beschreibend (§5.4)', 2);
  L.push('');
  for (const r of ergebnis.f1) {
    L.push(`- ${r.name}: B als Schwarz ${r.bSchwarz.siege}/${r.bSchwarz.n}, als Weiß ${r.bWeiss.siege}/${r.bWeiss.n} · `
      + `Partielänge Mittel ${zahl(r.zuegeMittel)}, Median ${zahl(r.zuegeMedian)} · am Zuglimit ${r.amLimit} (${proz(r.amLimit / r.n)}) · `
      + `Anomalien ${r.anomalien} · Simulationen je Zug im Mittel A ${zahl(r.simsA)}, B ${zahl(r.simsB)} · `
      + `${zahl(r.minJePartie, 2)} min je Partie`);
    if (r.amLimit / r.n > 0.05) {
      const ohne = ergebnis.ohneLimit[r.name];
      L.push(`  Über 5 % am Zuglimit, deshalb zusätzlich ohne diese Partien (beschreibend): ${ohne.siege} : ${ohne.n - ohne.siege}, `
        + `${proz(ohne.siege / ohne.n)}, Elo ${mitVz(elo(ohne.siege / ohne.n))}.`);
    }
  }
  L.push('');
  if (ergebnis.kosten) {
    const k = ergebnis.kosten;
    h('Kostenschätzung für Stufe 2 (§7.3)', 2);
    L.push('');
    L.push(`Laufzeit je Partie ≈ ${zahl(k.a, 3)} + ${zahl(k.b * 1000, 3)} · 10⁻³ · mittlere Simulationen je Zug (Minuten).`
      + (k.belastbar ? '' : ' **Nicht belastbar: Die Steigung ist nicht positiv.**'));
    if (md) { L.push('', '| K3 = N → 2N | min je Partie | Partien je Teillauf | Teilläufe | Rechenstunden | Wanduhr bei 20 Jobs |'); L.push('|---|---:|---:|---:|---:|---:|'); }
    for (const z of k.zeilen) {
      const name = `${z.von} → ${z.bis}${z.ausStufeG ? ' (N aus Stufe G)' : ''}`;
      L.push(md
        ? `| ${z.ausStufeG ? '**' + name + '**' : name} | ${zahl(z.jePartie, 2)} | ${z.g || '—'} | ${z.teile || '—'} | ${zahl(z.rechenStunden)} | ${z.wanduhrStunden === null ? '—' : zahl(z.wanduhrStunden) + ' h'} |`
        : `  ${name}: ${zahl(z.jePartie, 2)} min je Partie, ${z.g || '—'} je Teillauf, ${z.teile || '—'} Teilläufe, `
          + `${zahl(z.rechenStunden)} Rechenstunden, Wanduhr ${z.wanduhrStunden === null ? '—' : zahl(z.wanduhrStunden) + ' h'}`);
    }
    L.push('', 'Eine Schätzung, kein Messwert (§7.3). Ist sie zu teuer, wird Stufe 2 neu festgelegt, nicht verkleinert.');
    L.push('');
  }
  h('Teilläufe', 2);
  L.push('');
  for (const v of vgl)
    L.push(`- ${v.name}: ${ergebnis.jeVergleich.get(v.name).map(t => `${(t.daten.konfig || {}).seed} (${zahl((t.daten.konfig || {}).dauerMin || 0)} min)`).join(', ')}`);
  return L.join('\n');
}

/* Die Rechnung nach bestandener Prüfung. Eigene Funktion, damit Tests sie ohne Regel 4
   aufrufen können; auswerten() ruft sie nur, wenn kein Grund vorliegt. */
function ergebnisse(a, vgl, jeVergleich) {
  const f1 = vgl.map(v => rechne(v, jeVergleich.get(v.name)));
  const ohneLimit = {};
  for (const v of vgl) {
    const p = jeVergleich.get(v.name).flatMap(t => t.daten.partien).filter(x => !(x.zuege >= ZUGLIMIT));
    ohneLimit[v.name] = {n: p.length, siege: p.filter(x => x.sieger === 'B').length};
  }
  const ergebnis = {f1, jeVergleich, ohneLimit, f2: null, kosten: null, k2: null};
  if (a.stufe === 1) { ergebnis.f2 = abflachung(f1[0], f1[1]); ergebnis.kosten = kosten(f1[0], f1[1], a.n ?? null); }
  if (a.stufe === 2 && a.k2) {
    const r2 = {elo: elo(a.k2.siege / a.k2.n), rate: a.k2.siege / a.k2.n, n: a.k2.n};
    const D = r2.elo - f1[0].elo, se = Math.hypot(seElo(r2.rate, r2.n), seElo(f1[0].rate, f1[0].n));
    ergebnis.k2 = {D, ci: [D - 1.959964 * se, D + 1.959964 * se]};
  }
  return ergebnis;
}

function auswerten(a, teile) {
  const vgl = vergleiche(a);
  const {gruende, jeVergleich} = pruefe(a, vgl, teile);
  if (gruende.length) return {vgl, gruende, ergebnis: null};
  return {vgl, gruende, ergebnis: ergebnisse(a, vgl, jeVergleich)};
}

function main() {
  const a = argumente(process.argv);
  if (!a.teile.length) { console.error('Kein --teil angegeben (--help).'); process.exit(2); }
  let aus;
  try { aus = auswerten(a, lies(a)); }
  catch (e) { console.error(e.message); process.exit(2); }
  console.log(bericht(a, aus.vgl, aus.ergebnis, aus.gruende));
  process.exit(aus.gruende.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = {STUFE1, stufe2, gueltigesN, KOSTEN_N, TEILER, BLOCKSUMMEN, PARTIEN, ZUGLIMIT, KOMI,
                  fisherZweiseitig, elo, seElo, zuglimitAusLog, vergleiche, pruefe, rechne, abflachung, urteilF1,
                  urteilF2, kosten, lageZuK2, ergebnisse, auswerten, bericht, lies};
