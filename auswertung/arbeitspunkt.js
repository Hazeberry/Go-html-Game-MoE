// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Arbeitspunkt des Zielgeräts aus einem Fehlerbericht (docs/skalierung-heute-vorabfestlegung.md,
   §4 und §7.1). Reine Rechnung auf einer Datei, es wird nichts gespielt.

   Gültigkeit nach §4.2, zwei Zustände:
     1. meta.kiStufe ist „hard“.
     2. reproduktion.params gleicht PARAMS_DEFAULT des festgelegten Stands, Schlüssel für Schlüssel.
     3. Jede Pages-Bereitstellung zwischen --seit und meta.erstellt trägt die Prüfsummen aus §6
        (Liste aus --bereitstellungen, siehe unten). Ohne Liste ist die Regel ungeprüft.
     4. Kein Neustart des Workers, Worker nicht tot.
     5. Mindestens 120 KI-Steinzüge mit Simulationszahl und zeiten.sucheMs, davon 40 nach Zug 80.
   Bei KEIN URTEIL endet das Skript mit Status 1.

   Die Suchzeit kommt aus zeiten.sucheMs, wie die Engine sie misst — nicht als
   Simulationen × msProSim wie in zeit-zerlegung.js: msProSim steht im Bericht auf zwei
   Nachkommastellen gerundet (§4.3).

   Perzentile: Rangverfahren (kleinster Wert, unter dem mindestens q der Werte liegen).
   Median: Mittel der beiden mittleren Werte bei gerader Zahl, wie in zeit-zerlegung.js.

   Aufruf:
     node auswertung/arbeitspunkt.js bericht.json --html stand.html \
          --seit <ISO-Zeit des Merge des Werkzeug-PR> --bereitstellungen liste.json [--markdown]
   liste.json: [{"sha": "…", "zeit": "<ISO>", "bloecke": {"shared-go-logic": "…", "worker-ai": "…",
                 "policy-net": "…"}}, …] — die Läufe „pages build and deployment“ mit ihrem Commit
   und den Prüfsummen von index.html an diesem Commit. */
'use strict';
const fs = require('fs');
const {blocksummen} = require('./eval-streuung-bericht.js');
const {BLOCKSUMMEN} = require('./skalierung-bericht.js');

const GRENZE = 80;          // bis/ab Zug 80, wie zeit-zerlegung.js
const MIN_ZUEGE = 120;
const MIN_NACH_GRENZE = 40;

const zahl = (v, s = 0) => v.toFixed(s).replace('.', ',');
function median(a) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y), m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function perzentil(a, q) {
  if (!a.length) return NaN;
  const s = [...a].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(q * s.length) - 1))];
}

/* KI-Steinzüge mit Simulationszahl (aus info, wie zeit-zerlegung.js) und gemessener Suchzeit. */
function steinzuege(bericht) {
  const alle = [], ohneSuche = [];
  for (const x of bericht.kiDiagnose || []) {
    if (x.typ !== 'stone') continue;
    const m = /(\d+)[^\d]*Sims/.exec(x.info || '');
    if (!m) continue;
    const z = x.zeiten || {};
    const zeile = {zug: x.zug, sims: +m[1], dauerMs: x.dauerMs,
                   sucheMs: typeof z.sucheMs === 'number' ? z.sucheMs : null,
                   netzMs: typeof z.netzMs === 'number' ? z.netzMs : null};
    (zeile.sucheMs === null || typeof zeile.dauerMs !== 'number' ? ohneSuche : alle).push(zeile);
  }
  return {alle, ohneSuche};
}

/* §7.1: Verdopplung AB dem Arbeitspunkt. k kaufmännisch gerundet (x,5 aufwärts). */
function stufeAusS(S) {
  const k = Math.floor(Math.log2(S / 120) + 0.5);
  if (k < 0) return {k, vergleich: null, text: 'keine passende Messung; Stufe 2 entfällt'};
  if (k === 0) return {k, vergleich: 'K1', von: 120, bis: 240, text: 'K1 aus Stufe 1; Stufe 2 entfällt'};
  if (k === 1) return {k, vergleich: 'K2', von: 240, bis: 480, text: 'K2 aus Stufe 1; Stufe 2 entfällt'};
  const von = 120 * 2 ** k;
  return {k, vergleich: 'K3', von, bis: 2 * von, text: `eigener Vergleich K3 in Stufe 2: ${von} → ${2 * von}`};
}

function pruefe(bericht, opt) {
  const gruende = [];
  const meta = bericht.meta || {};

  if (meta.kiStufe !== 'hard') gruende.push(`Regel 1: Stufe „${meta.kiStufe}“, verlangt ist Schwer (hard).`);

  const ist = (bericht.reproduktion || {}).params;
  const soll = opt.defaults;
  if (!ist || typeof ist !== 'object') gruende.push('Regel 2: Der Bericht enthält keinen Parameter-Schnappschuss (reproduktion.params).');
  else if (!soll) gruende.push('Regel 2: PARAMS_DEFAULT des festgelegten Stands ist nicht geladen.');
  else {
    const fehlt = Object.keys(soll).filter(k => !(k in ist));
    const extra = Object.keys(ist).filter(k => !(k in soll));
    const anders = Object.keys(soll).filter(k => k in ist && JSON.stringify(ist[k]) !== JSON.stringify(soll[k]));
    if (fehlt.length || extra.length || anders.length)
      gruende.push('Regel 2: Die Parameter weichen vom Standard ab — '
        + [fehlt.length && `fehlen: ${fehlt.join(', ')}`, extra.length && `zusätzlich: ${extra.join(', ')}`,
           anders.length && `anders: ${anders.map(k => `${k} ${JSON.stringify(ist[k])} statt ${JSON.stringify(soll[k])}`).join(', ')}`]
          .filter(Boolean).join('; ') + '.');
  }

  if (opt.htmlSummen) {
    for (const [b, s] of Object.entries(BLOCKSUMMEN))
      if (opt.htmlSummen[b] !== s)
        gruende.push(`Regel 2: Der übergebene Stand (--html) hat in ${b} nicht die Prüfsumme aus §6; `
          + 'PARAMS_DEFAULT käme also von einem anderen Stand.');
  }

  if (!opt.bereitstellungen || !opt.seit)
    gruende.push('Regel 3: Ungeprüft — die Liste der Pages-Bereitstellungen oder die Zeit des Merge (--seit) fehlt.');
  else {
    const t0 = Date.parse(opt.seit), t1 = Date.parse(meta.erstellt);
    if (!Number.isFinite(t1)) gruende.push('Regel 3: meta.erstellt ist keine Zeit.');
    else if (t1 <= t0) gruende.push(`Regel 3: Die Partie wurde vor dem festgelegten Stand exportiert (${meta.erstellt} ≤ ${opt.seit}).`);
    else {
      const imFenster = opt.bereitstellungen.filter(b => { const t = Date.parse(b.zeit); return t >= t0 && t <= t1; });
      if (!imFenster.length) gruende.push('Regel 3: Zwischen dem Merge und dem Export liegt keine Pages-Bereitstellung.');
      for (const b of imFenster)
        for (const [blk, s] of Object.entries(BLOCKSUMMEN))
          if (!b.bloecke || b.bloecke[blk] !== s)
            gruende.push(`Regel 3: Bereitstellung ${String(b.sha).slice(0, 12)} (${b.zeit}) trägt in ${blk} nicht die Prüfsumme aus §6.`);
    }
  }

  if ((meta.workerNeustarts || 0) > 0 || meta.workerDead)
    gruende.push(`Regel 4: Der Worker wurde neu gestartet (${meta.workerNeustarts || 0}) oder ist tot (${!!meta.workerDead}); `
      + 'dann rechnete zeitweise der Hauptthread.');

  const {alle, ohneSuche} = steinzuege(bericht);
  const nach = alle.filter(z => z.zug > GRENZE).length;
  if (alle.length < MIN_ZUEGE || nach < MIN_NACH_GRENZE)
    gruende.push(`Regel 5: ${alle.length} KI-Steinzüge mit Simulationszahl und zeiten.sucheMs, davon ${nach} nach Zug ${GRENZE}; `
      + `verlangt sind ${MIN_ZUEGE} und ${MIN_NACH_GRENZE}`
      + (ohneSuche.length ? ` (${ohneSuche.length} weitere ohne gemessene Suchzeit nicht gezählt).` : '.'));
  return gruende;
}

function kennzahlen(zeilen) {
  const s = zeilen.map(z => z.sims);
  return {
    n: zeilen.length,
    simsMedian: median(s), sims10: perzentil(s, 0.10), sims90: perzentil(s, 0.90),
    dauerMedian: median(zeilen.map(z => z.dauerMs)),
    sucheMedian: median(zeilen.map(z => z.sucheMs)),
    restMedian: median(zeilen.map(z => z.dauerMs - z.sucheMs)),
    netzMedian: median(zeilen.map(z => z.netzMs).filter(v => v !== null))
  };
}

function auswerten(bericht) {
  const {alle} = steinzuege(bericht);
  const gesamt = kennzahlen(alle);
  return {
    gesamt,
    bis: kennzahlen(alle.filter(z => z.zug <= GRENZE)),
    ab: kennzahlen(alle.filter(z => z.zug > GRENZE)),
    S: gesamt.simsMedian,
    stufe: stufeAusS(gesamt.simsMedian),
    zeitkostenMs: gesamt.sucheMedian
  };
}

function bericht(meta, r, gruende, md) {
  const L = [];
  const h = (t, s) => L.push(md ? '#'.repeat(s) + ' ' + t : '\n' + t.toUpperCase());
  h('Arbeitspunkt des Zielgeräts (Stufe G)', 1);
  L.push('');
  L.push(`Bericht erstellt ${meta.erstellt || '?'} · ${meta.userAgent || 'ohne userAgent'}`);
  L.push('');
  if (gruende.length) {
    L.push(md ? '**KEIN URTEIL.**' : 'KEIN URTEIL.', '');
    for (const g of gruende) L.push('- ' + g);
    L.push('', 'Die Gültigkeitsregel aus §4.2 kennt zwei Zustände. Es wird nichts weiter gerechnet.');
    return L.join('\n');
  }
  L.push(md ? '**GÜLTIG.**' : 'GÜLTIG.', '');
  if (md) { L.push('| KI-Steinzüge | n | Sims Median [P10; P90] | Dauer | Suche (`zeiten.sucheMs`) | Rest | Netz |'); L.push('|---|---:|---|---:|---:|---:|---:|'); }
  for (const [name, k] of [['alle', r.gesamt], ['bis Zug 80', r.bis], ['ab Zug 81', r.ab]])
    L.push(md
      ? `| ${name} | ${k.n} | ${zahl(k.simsMedian)} [${zahl(k.sims10)}; ${zahl(k.sims90)}] | ${zahl(k.dauerMedian)} ms | ${zahl(k.sucheMedian)} ms | ${zahl(k.restMedian)} ms | ${Number.isFinite(k.netzMedian) ? zahl(k.netzMedian) + ' ms' : '—'} |`
      : `  ${name}: n ${k.n}, Sims ${zahl(k.simsMedian)} [${zahl(k.sims10)}; ${zahl(k.sims90)}], Dauer ${zahl(k.dauerMedian)} ms, `
        + `Suche ${zahl(k.sucheMedian)} ms, Rest ${zahl(k.restMedian)} ms, Netz ${Number.isFinite(k.netzMedian) ? zahl(k.netzMedian) + ' ms' : '—'}`);
  L.push('');
  L.push(`${md ? '**' : ''}Arbeitspunkt S = ${zahl(r.S)} Simulationen · k = ${r.stufe.k} → ${r.stufe.text}.${md ? '**' : ''}`);
  L.push(`Zeitkosten einer Verdopplung, gerechnet aus der gemessenen Suchzeit: rund ${zahl(r.zeitkostenMs)} ms je Zug `
    + '(bei gleicher Zeit je Simulation verdoppelt sich die Suchzeit).');
  return L.join('\n');
}

function argumente(argv) {
  const a = {datei: null, html: null, seit: null, bereitstellungen: null, markdown: false};
  for (let i = 2; i < argv.length; i++) {
    const s = argv[i], v = argv[i + 1];
    switch (s) {
      case '--html': a.html = v; i++; break;
      case '--seit': a.seit = v; i++; break;
      case '--bereitstellungen': a.bereitstellungen = v; i++; break;
      case '--markdown': a.markdown = true; break;
      case '--help': console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]
        .replace(/^[\s\S]*?\/\*\s*/, '')); process.exit(0);
      default:
        if (s.startsWith('--')) { console.error(`Unbekannte Option: ${s} (--help)`); process.exit(2); }
        a.datei = s;
    }
  }
  return a;
}

function main() {
  const a = argumente(process.argv);
  if (!a.datei || !a.html) { console.error('Aufruf: arbeitspunkt.js bericht.json --html stand.html … (--help)'); process.exit(2); }
  const ber = JSON.parse(fs.readFileSync(a.datei, 'utf8'));
  const {ladeKI} = require('../tests/rahmen.js');
  const ki = ladeKI({htmlPfad: a.html, mitNetz: false});
  const opt = {defaults: ki.PARAMS_DEFAULT, htmlSummen: blocksummen(a.html), seit: a.seit,
               bereitstellungen: a.bereitstellungen ? JSON.parse(fs.readFileSync(a.bereitstellungen, 'utf8')) : null};
  const gruende = pruefe(ber, opt);
  const r = gruende.length ? null : auswerten(ber);
  console.log(bericht(ber.meta || {}, r, gruende, a.markdown));
  process.exit(gruende.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = {GRENZE, MIN_ZUEGE, MIN_NACH_GRENZE, median, perzentil, steinzuege, stufeAusS, pruefe, kennzahlen,
                  auswerten, bericht};
