// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zeit-Zerlegung (docs/zeitbudget.md): zerlegt die Dauer jedes KI-Steinzugs aus
   der Diagnose („kiDiagnose“ im Fehlerbericht) in
     Suche = Simulationen × msProSim   (die Suchzeit, die mctsPUCT selbst misst)
     Rest  = dauerMs − Suche            (alles außerhalb der Suche: Vorarbeit
                                         vor der Suche, Nachbearbeitung, Nachrichten
                                         zwischen Worker und Hauptthread)
   und stellt den Rest dem Zeitbudget gegenüber. Reine Rechnung auf einer
   Archivdatei, es wird nichts gespielt.

   Aufruf:  node auswertung/endspiel/zeit-zerlegung.js diagnose.json [--json] */
'use strict';
const fs = require('fs');

function median(a) { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; }

function zerlegen(diagnose) {
  const zeilen = [];
  for (const x of diagnose.kiDiagnose || []) {
    const m = /(\d+)[^\d]*Sims/.exec(x.info || '');
    if (x.typ !== 'stone' || !m || typeof x.msProSim !== 'number' || typeof x.dauerMs !== 'number') continue;
    const sims = +m[1], suche = sims * x.msProSim;
    const z = x.zeiten || null;
    zeilen.push({zug: x.zug, dauerMs: x.dauerMs, budgetMs: x.budgetMs, sims, sucheMs: Math.round(suche), restMs: Math.round(x.dauerMs - suche),
      /* Messpunkte (seit der Diagnose mit `zeiten`): fehlen in älteren Berichten */
      vorMs: z ? z.vorMs : null, netzMs: z ? z.netzMs : null, nachMs: z ? z.nachMs : null,
      nachrichtMs: typeof x.nachrichtMs === 'number' ? x.nachrichtMs : null, anwendenMs: typeof x.anwendenMs === 'number' ? x.anwendenMs : null});
  }
  return zeilen;
}

function auswerten(diagnose, grenze = 80) {
  const z = zerlegen(diagnose);
  const vor = z.filter(r => r.zug <= grenze), nach = z.filter(r => r.zug > grenze);
  /* Sprungstelle: erster Zug, ab dem der Rest dauerhaft über 1000 ms liegt (drei Züge in Folge) */
  let sprung = null;
  for (let i = 0; i + 2 < z.length; i++) if (z[i].restMs > 1000 && z[i + 1].restMs > 1000 && z[i + 2].restMs > 1000) { sprung = z[i].zug; break; }
  const med = (a, f) => { const m = median(a.map(f)); return m === null ? null : Math.round(m); };
  return {
    zuege: z.length, grenze, sprungBeiZug: sprung,
    vor: {n: vor.length, restMedian: med(vor, r => r.restMs), sucheMedian: med(vor, r => r.sucheMs), dauerMedian: med(vor, r => r.dauerMs)},
    nach: {n: nach.length, restMedian: med(nach, r => r.restMs), restMin: nach.length ? Math.min(...nach.map(r => r.restMs)) : null,
           restMax: nach.length ? Math.max(...nach.map(r => r.restMs)) : null,
           sucheMedian: med(nach, r => r.sucheMs), dauerMedian: med(nach, r => r.dauerMs)},
    messpunkte: messpunkte(z, grenze),
    sucheUeberBudget: z.filter(r => r.sucheMs > r.budgetMs * 1.1).length,
    dauerUeberBudget15: z.filter(r => r.dauerMs > r.budgetMs * 1.5).length,
    maxDauer: z.length ? Math.max(...z.map(r => r.dauerMs)) : null,
    zeilen: z,
  };
}

/* Median der Messpunkte je Teil, vor und nach der Grenze; null, wenn der Bericht sie nicht enthält */
function messpunkte(z, grenze) {
  const mit = z.filter(r => r.vorMs !== null);
  if (!mit.length) return null;
  const teil = (a, f) => { const v = a.map(f).filter(x => typeof x === 'number'); const m = median(v); return m === null ? null : Math.round(m); };
  const gruppe = a => ({n: a.length, vorMs: teil(a, r => r.vorMs), netzMs: teil(a, r => r.netzMs), sucheMs: teil(a, r => r.sucheMs),
                        nachMs: teil(a, r => r.nachMs), nachrichtMs: teil(a, r => r.nachrichtMs), anwendenMs: teil(a, r => r.anwendenMs), restMs: teil(a, r => r.restMs)});
  return {vor: gruppe(mit.filter(r => r.zug <= grenze)), nach: gruppe(mit.filter(r => r.zug > grenze))};
}

function text(r) {
  return [
    `${r.zuege} Steinzüge mit Simulationszahl und ms/Sim`,
    `bis Zug ${r.grenze}: ${r.vor.n} Züge, Dauer ${r.vor.dauerMedian} ms (Median), davon Suche ${r.vor.sucheMedian}, Rest ${r.vor.restMedian}`,
    `ab Zug ${r.grenze + 1}: ${r.nach.n} Züge, Dauer ${r.nach.dauerMedian} ms (Median), davon Suche ${r.nach.sucheMedian}, Rest ${r.nach.restMedian} (${r.nach.restMin} bis ${r.nach.restMax})`,
    ...(r.messpunkte ? ['Messpunkte (Median, ms) vor | nach Zug ' + r.grenze + ':',
      ...['vorMs', 'netzMs', 'sucheMs', 'nachMs', 'nachrichtMs', 'anwendenMs', 'restMs'].map(k => `  ${k.padEnd(12)} ${String(r.messpunkte.vor[k]).padStart(6)} | ${String(r.messpunkte.nach[k]).padStart(6)}`)] : ['(keine Messpunkte im Bericht: ältere Diagnose ohne `zeiten`)']),
    r.sprungBeiZug === null ? 'kein dauerhafter Sprung des Rests über 1000 ms' : `erster dauerhafter Sprung des Rests über 1000 ms bei Zug ${r.sprungBeiZug}`,
    `Suche länger als 1,1 × Budget: ${r.sucheUeberBudget} Züge; Dauer länger als 1,5 × Budget: ${r.dauerUeberBudget15} Züge; längster Zug ${r.maxDauer} ms`,
  ].join('\n');
}

module.exports = {zerlegen, auswerten, text};

if (require.main === module) {
  const a = process.argv.slice(2), datei = a.find(x => !x.startsWith('--'));
  if (!datei) { console.error('Aufruf: node zeit-zerlegung.js diagnose.json [--json]'); process.exit(2); }
  const r = auswerten(JSON.parse(fs.readFileSync(datei, 'utf8')));
  console.log(a.includes('--json') ? JSON.stringify(r, null, 1) : text(r));
}
