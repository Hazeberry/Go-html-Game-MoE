// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Messung zum Rauschterm der Bewertung (docs/eval-streuung-vorabfestlegung.md).

   Fasst die vier Teilläufe eines Vergleichs (S1 oder S2) aus ab-harness.js zusammen und
   liefert die in §6 vorab festgelegten Endpunkte:

     primär      Siegrate von B über alle Partien, zweiseitig gegen 50 %, alpha 0,05,
                 exakter Binomialtest, Clopper-Pearson-Intervall, dazu
                 Elo = 400 * log10(p / (1 - p)) mit Intervall aus den Intervallgrenzen.
     sekundär    Zahl verschiedener final_board_hash, Partielänge, Aufgaben, Anomalien.

   Nichts davon wird gerechnet, solange die Gültigkeitsregel aus §6 nicht hält. Sie kennt
   zwei Zustände: GÜLTIG oder KEIN URTEIL mit Grund. Bei KEIN URTEIL endet das Skript mit
   Status 1, damit ein Lauf in Actions rot wird.

   WAS DIESES SKRIPT NICHT KANN, und warum (§10.8):
   Drei Größen hat §6 "je Arm" verlangt, die der Harness nicht je Arm hergibt.
     - Verschiedene Partien: Im Selbstspiel A gegen B spielen BEIDE Arme jede Partie, einer
       Schwarz, einer Weiß (armSchwarz/armWeiss im Rohdump). Eine Partie gehört keinem Arm.
       Ausgewiesen wird deshalb die Zahl über den ganzen Lauf; eine Aufteilung bräuchte
       getrennte Läufe A gegen A und B gegen B.
     - Anomalien: ab-harness.js zählt sie nur global (agg.anomalies, Z. 1518) und schreibt
       eine Warnzeile nach stdout. Je Partie stehen sie weder in --json noch in --roh.
       Geprüft wird daher die Laufsumme; ohne --log ist die Regel ungeprüft und das
       Ergebnis lautet KEIN URTEIL.
     - Aufgaben: mit resignEnabled=0 sind sie 0. Die Zahl wird ausgewiesen, nicht
       gestrichen (§10.3), damit sichtbar bleibt, dass sie gefordert war.

   Der Engine-Vergleich (Gültigkeitsregel Nr. 1) lässt sich aus diesen Daten nicht prüfen.
   Er wird mit --engine-vergleich <Lauf-ID> als erklärte Voraussetzung übergeben und als
   solche ausgewiesen, nicht als gerechnetes Ergebnis.

   Aufruf:
     node auswertung/eval-streuung-bericht.js --name S1 --partien 360 \
          --seeds 20261123,20261124,20261125,20261126 \
          --streuung-a 1 --streuung-b 0 \
          --engine-vergleich 45286526826 \
          --teil t1.json,t1.jsonl,t1.log  --teil t2.json,t2.jsonl,t2.log  ... \
          [--markdown] */
'use strict';
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const {vorzeichenP} = require('./messung-zusatz.js');
const {clopperPearson} = require('./kandidaten-orakel/haupt-bericht.js');

const ALPHA = 0.05;
/* SHA-256 der drei Engine-Blöcke nach der Umsetzung von evalStreuung
   (docs/korrektur-d1-w1-vorabfestlegung.md §1, Nachtrag 23.11.2026). */
const BLOCKSUMMEN = {
  'shared-go-logic': '54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66',
  'worker-ai':       '3523535bb70bc29e2fbb07081b2b1535a6aa4da56881ed9259c312f288bf7cb9',
  'policy-net':      '14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190'
};

const zahl = (v, s = 1) => v.toFixed(s).replace('.', ',');
const proz = v => zahl(100 * v, 1) + ' %';
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : zahl(p, 4);
const elo = p => (p <= 0 || p >= 1) ? (p <= 0 ? -Infinity : Infinity) : 400 * Math.log10(p / (1 - p));

function argumente(argv) {
  const a = {teile: [], name: null, partien: null, seeds: null, streuungA: null, streuungB: null,
             engineVergleich: null, markdown: false, html: 'index.html'};
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    switch (k) {
      case '--teil': a.teile.push(String(v).split(',').map(s => s.trim())); i++; break;
      case '--name': a.name = v; i++; break;
      case '--partien': a.partien = parseInt(v, 10); i++; break;
      case '--seeds': a.seeds = String(v).split(',').map(s => parseInt(s.trim(), 10)); i++; break;
      case '--streuung-a': a.streuungA = Number(v); i++; break;
      case '--streuung-b': a.streuungB = Number(v); i++; break;
      case '--engine-vergleich': a.engineVergleich = v; i++; break;
      case '--html': a.html = v; i++; break;
      case '--markdown': a.markdown = true; break;
      case '--help': console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]
        .replace(/^\/\*+[^\n]*\n/, '')); process.exit(0);
      default: console.error(`Unbekannte Option: ${k} (--help)`); process.exit(2);
    }
  }
  return a;
}

/* Die PARAMS-Angabe eines Arms in ein Objekt, damit sich zwei Arme Schlüssel für
   Schlüssel vergleichen lassen statt als Zeichenkette. */
function spec(s) {
  const o = {};
  for (const teil of String(s || '').split(',')) {
    const [k, v] = teil.split('=').map(t => (t || '').trim());
    if (k) o[k] = Number(v);
  }
  return o;
}

function blocksummen(htmlPfad) {
  const h = fs.readFileSync(htmlPfad, 'utf8');
  const re = /<script id="([^"]+)">([\s\S]*?)<\/script>/g;
  const out = {};
  let m;
  while ((m = re.exec(h))) out[m[1]] = crypto.createHash('sha256').update(m[2]).digest('hex');
  return out;
}

/* Anomalien aus der Konsolenausgabe eines Laufs. Der Harness schreibt die Zeile nur, wenn
   es welche gab (ab-harness.js Z. 1744) — keine Zeile heißt also null, nicht unbekannt.
   Unbekannt ist nur der Fall, dass gar kein Log vorliegt. */
function anomalienAusLog(pfad) {
  const t = fs.readFileSync(pfad, 'utf8');
  const m = t.match(/⚠\s*(\d+)\s+illegale KI-Züge/);
  return m ? parseInt(m[1], 10) : 0;
}

function lies(a) {
  const teile = [];
  for (const [jsonPfad, rohPfad, logPfad] of a.teile) {
    const daten = JSON.parse(fs.readFileSync(jsonPfad, 'utf8'));
    const roh = rohPfad
      ? fs.readFileSync(rohPfad, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z))
      : null;
    teile.push({
      json: path.basename(jsonPfad), jsonPfad, rohPfad, logPfad, daten, roh,
      anomalien: logPfad ? anomalienAusLog(logPfad) : null
    });
  }
  return teile;
}

/* Die fünf Gültigkeitsregeln aus §6, in der Reihenfolge des Dokuments.
   Rückgabe: Liste der Gründe. Leer heißt gültig. */
function pruefeGueltigkeit(a, teile) {
  const gruende = [];

  /* Nr. 1 — Engine-Vergleich. Nicht aus diesen Daten prüfbar; verlangt wird die Lauf-ID
     als erklärte Voraussetzung. */
  if (!a.engineVergleich)
    gruende.push('Regel 1: Der Engine-Vergleich ist nicht benannt (--engine-vergleich fehlt). '
      + 'Ohne ihn ist die Bitgleichheit bei evalStreuung 1 nicht belegt.');

  /* Nr. 2 — die Arme dürfen sich nur in evalStreuung unterscheiden. */
  for (const t of teile) {
    const A = spec(t.daten.konfig && t.daten.konfig.A), B = spec(t.daten.konfig && t.daten.konfig.B);
    const schluessel = [...new Set([...Object.keys(A), ...Object.keys(B)])].sort();
    const anders = schluessel.filter(k => !(Object.is(A[k], B[k])));
    if (anders.length !== 1 || anders[0] !== 'evalStreuung')
      gruende.push(`Regel 2: ${t.json} — die Arme unterscheiden sich in [${anders.join(', ') || 'nichts'}], `
        + 'erwartet war genau evalStreuung.');
    if (a.streuungA !== null && !Object.is(A.evalStreuung, a.streuungA))
      gruende.push(`Regel 2: ${t.json} — Arm A hat evalStreuung ${A.evalStreuung}, erwartet ${a.streuungA}.`);
    if (a.streuungB !== null && !Object.is(B.evalStreuung, a.streuungB))
      gruende.push(`Regel 2: ${t.json} — Arm B hat evalStreuung ${B.evalStreuung}, erwartet ${a.streuungB}.`);
  }
  /* Alle Teile müssen dieselben Konfigurationen haben, sonst sind sie nicht zusammenzählbar. */
  const k0 = teile.length ? teile[0].daten.konfig || {} : {};
  for (const t of teile.slice(1)) {
    const k = t.daten.konfig || {};
    if (k.A !== k0.A || k.B !== k0.B)
      gruende.push(`Regel 2: ${t.json} hat andere Armkonfigurationen als ${teile[0].json}.`);
    if (k.komi !== k0.komi || k.modus !== k0.modus)
      gruende.push(`Regel 2: ${t.json} weicht in Komi oder Modus von ${teile[0].json} ab.`);
  }

  /* Nr. 3 — jeder Teil abgeschlossen, Seeds wie festgelegt, Partienzahl erreicht. */
  const gesehen = new Map();
  let n = 0;
  for (const t of teile) {
    const k = t.daten.konfig || {};
    if (!k.abgeschlossen) gruende.push(`Regel 3: ${t.json} ist nicht abgeschlossen.`);
    if (!Array.isArray(t.daten.partien)) { gruende.push(`Regel 3: ${t.json} hat keine Partienliste.`); continue; }
    n += t.daten.partien.length;
    if (gesehen.has(k.seed)) gruende.push(`Regel 3: Seed ${k.seed} kommt zweimal vor (${gesehen.get(k.seed)} und ${t.json}).`);
    gesehen.set(k.seed, t.json);
    if (t.roh && t.roh.length !== t.daten.partien.length)
      gruende.push(`Regel 3: ${t.json} zählt ${t.daten.partien.length} Partien, der Rohdump ${t.roh.length}.`);
  }
  if (a.seeds) {
    for (const s of a.seeds) if (!gesehen.has(s)) gruende.push(`Regel 3: Seed ${s} ist vorab festgelegt, kommt aber nicht vor.`);
    for (const s of gesehen.keys()) if (!a.seeds.includes(s)) gruende.push(`Regel 3: Seed ${s} kommt vor, war aber nicht festgelegt.`);
  }
  if (a.partien !== null && n !== a.partien)
    gruende.push(`Regel 3: ${n} Partien insgesamt, festgelegt waren ${a.partien}.`);

  /* Nr. 4 — PARAMS_DEFAULT unverändert außer dem neuen Eintrag. Geprüft über die
     Prüfsummen der drei Engine-Blöcke: ändert jemand PARAMS_DEFAULT, ändert sich
     worker-ai. */
  try {
    const ist = blocksummen(a.html);
    for (const [block, soll] of Object.entries(BLOCKSUMMEN))
      if (ist[block] !== soll)
        gruende.push(`Regel 4: Block ${block} hat SHA-256 ${(ist[block] || 'fehlt').slice(0, 16)}…, `
          + `erwartet ${soll.slice(0, 16)}… — der gemessene Stand ist nicht der dokumentierte.`);
  } catch (e) {
    gruende.push(`Regel 4: Die Blockprüfsummen von ${a.html} sind nicht lesbar (${e.message}).`);
  }

  /* Nr. 5 — Anomalien höchstens 2 % der Partien. Nur auf Laufebene prüfbar (§10.8). */
  const ohneLog = teile.filter(t => t.anomalien === null);
  if (ohneLog.length)
    gruende.push(`Regel 5: Für ${ohneLog.map(t => t.json).join(', ')} liegt kein Log vor; `
      + 'die Anomaliezahl ist damit ungeprüft.');
  else {
    const summe = teile.reduce((s, t) => s + t.anomalien, 0);
    if (n > 0 && summe > 0.02 * n)
      gruende.push(`Regel 5: ${summe} Anomalien bei ${n} Partien (${proz(summe / n)}), erlaubt sind 2 %.`);
  }
  return gruende;
}

function rechne(teile) {
  let n = 0, bSiege = 0, bAlsSchwarz = 0, nBSchwarz = 0, zuegeSumme = 0, aufgaben = 0;
  const laengen = [];
  for (const t of teile) {
    for (const p of t.daten.partien) {
      n++;
      const bGewinnt = p.sieger === 'B', bIstSchwarz = p.aIst === 'Weiß';
      if (bGewinnt) bSiege++;
      if (bIstSchwarz) { nBSchwarz++; if (bGewinnt) bAlsSchwarz++; }
      if (Number.isFinite(p.zuege)) { zuegeSumme += p.zuege; laengen.push(p.zuege); }
      if (p.aufgabe) aufgaben++;
    }
  }
  laengen.sort((x, y) => x - y);
  const rate = n ? bSiege / n : NaN;
  const ci = clopperPearson(bSiege, n, ALPHA);
  const alleHashes = [], hashesJeFarbe = {A: [], B: []};
  let rohDa = true;
  for (const t of teile) {
    if (!t.roh) { rohDa = false; continue; }
    for (const g of t.roh) {
      alleHashes.push(g.final_board_hash);
      if (g.armSchwarz === 'A' || g.armSchwarz === 'B') hashesJeFarbe[g.armSchwarz].push(g.final_board_hash);
    }
  }
  return {
    n, bSiege, aSiege: n - bSiege, rate, p: vorzeichenP(bSiege, n - bSiege), ci,
    elo: elo(rate), eloCi: [elo(ci[0]), elo(ci[1])],
    bAlsSchwarz, nBSchwarz, bAlsWeiss: bSiege - bAlsSchwarz, nBWeiss: n - nBSchwarz,
    zuegeMittel: laengen.length ? zuegeSumme / laengen.length : NaN,
    zuegeMedian: laengen.length ? laengen[Math.floor(laengen.length / 2)] : NaN,
    zuegeMin: laengen[0], zuegeMax: laengen[laengen.length - 1],
    aufgaben, rohDa,
    verschieden: rohDa ? new Set(alleHashes).size : null,
    verschiedenJeFarbe: rohDa
      ? {A: new Set(hashesJeFarbe.A).size, nA: hashesJeFarbe.A.length,
         B: new Set(hashesJeFarbe.B).size, nB: hashesJeFarbe.B.length}
      : null,
    anomalien: teile.every(t => t.anomalien !== null) ? teile.reduce((s, t) => s + t.anomalien, 0) : null
  };
}

/* Lesart aus §6, wörtlich und ohne Spielraum. */
function urteil(r) {
  if (!(r.p < ALPHA)) return 'KEIN NACHWEISBARER UNTERSCHIED';
  return r.rate > 0.5 ? 'B GEWINNT (weniger Rauschen ist stärker)' : 'A GEWINNT (das Rauschen hilft)';
}

function bericht(a, teile, r, gruende, markdown) {
  const L = [];
  const h = (t, s) => L.push(markdown ? '#'.repeat(s) + ' ' + t : '\n' + t.toUpperCase());
  h(`Rauschterm der Bewertung — ${a.name || 'Vergleich'}`, 1);
  L.push('');
  if (gruende.length) {
    L.push(markdown ? '**KEIN URTEIL.**' : 'KEIN URTEIL.');
    L.push('');
    for (const g of gruende) L.push('- ' + g);
    L.push('');
    L.push('Die Gültigkeitsregel aus §6 kennt zwei Zustände. Es wird nichts weiter gerechnet.');
    return L.join('\n');
  }
  L.push(markdown ? '**GÜLTIG.**' : 'GÜLTIG.');
  L.push(`Engine-Vergleich (Regel 1, erklärte Voraussetzung): Lauf ${a.engineVergleich}.`);
  L.push(`Arme: A evalStreuung ${a.streuungA}, B evalStreuung ${a.streuungB}; sonst identisch.`);
  L.push(`Seeds: ${a.seeds ? a.seeds.join(', ') : 'nicht vorgegeben'} · ${r.n} Partien.`);
  L.push('');
  h('Primärer Endpunkt', 2);
  L.push('');
  L.push(`Siegrate von B: ${r.bSiege} : ${r.aSiege} = ${proz(r.rate)}`);
  L.push(`Exakter zweiseitiger Binomialtest gegen 50 %: p = ${fp(r.p)} (alpha ${zahl(ALPHA, 2)})`);
  L.push(`Clopper-Pearson 95 %: [${proz(r.ci[0])}; ${proz(r.ci[1])}]`);
  L.push(`Elo-Differenz: ${zahl(r.elo, 1)} [${zahl(r.eloCi[0], 1)}; ${zahl(r.eloCi[1], 1)}]`);
  L.push('');
  L.push(markdown ? `**Urteil nach der Lesart in §6: ${urteil(r)}**` : `Urteil nach §6: ${urteil(r)}`);
  L.push('');
  h('Sekundär, ohne statistischen Anspruch', 2);
  L.push('');
  L.push(`Siege von B als Schwarz: ${r.bAlsSchwarz} / ${r.nBSchwarz} · als Weiß: ${r.bAlsWeiss} / ${r.nBWeiss}`);
  L.push(`Partielänge: Mittel ${zahl(r.zuegeMittel, 1)} · Median ${r.zuegeMedian} · Spanne ${r.zuegeMin} bis ${r.zuegeMax} Züge`);
  L.push(`Aufgaben: ${r.aufgaben} (mit resignEnabled=0 erwartet 0 — ausgewiesen, nicht gestrichen, §10.3)`);
  L.push(`Anomalien im ganzen Lauf: ${r.anomalien === null ? 'kein Log' : r.anomalien}`);
  if (r.verschieden !== null) {
    L.push(`Verschiedene Endstellungen: ${r.verschieden} von ${r.n} Partien (${proz(r.verschieden / r.n)})`);
    L.push(`  davon mit A als Schwarz: ${r.verschiedenJeFarbe.A} von ${r.verschiedenJeFarbe.nA}`
      + ` · mit B als Schwarz: ${r.verschiedenJeFarbe.B} von ${r.verschiedenJeFarbe.nB}`);
    L.push('  Die Zahl gilt für den ganzen Lauf, nicht je Arm: im Selbstspiel A gegen B spielen beide');
    L.push('  Arme jede Partie (§10.8). Eine Aufteilung bräuchte getrennte Läufe A gegen A und B gegen B.');
  } else {
    L.push('Verschiedene Endstellungen: nicht gerechnet (kein Rohdump übergeben).');
  }
  L.push('');
  h('Teile', 2);
  L.push('');
  if (markdown) { L.push('| Teil | Seed | Partien | Dauer | Anomalien |'); L.push('|---|---:|---:|---:|---:|'); }
  for (const t of teile) {
    const k = t.daten.konfig || {};
    L.push(markdown
      ? `| \`${t.json}\` | ${k.seed} | ${t.daten.partien.length} | ${zahl(k.dauerMin || 0, 1)} min | ${t.anomalien === null ? '—' : t.anomalien} |`
      : `  ${t.json}: Seed ${k.seed}, ${t.daten.partien.length} Partien, ${zahl(k.dauerMin || 0, 1)} min, `
        + `Anomalien ${t.anomalien === null ? 'kein Log' : t.anomalien}`);
  }
  return L.join('\n');
}

function main() {
  const a = argumente(process.argv);
  if (!a.teile.length) { console.error('Kein --teil angegeben (--help)'); process.exit(2); }
  const teile = lies(a);
  const gruende = pruefeGueltigkeit(a, teile);
  const r = gruende.length ? null : rechne(teile);
  console.log(bericht(a, teile, r, gruende, a.markdown));
  process.exit(gruende.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = {spec, blocksummen, anomalienAusLog, pruefeGueltigkeit, rechne, urteil, bericht, elo, BLOCKSUMMEN};
