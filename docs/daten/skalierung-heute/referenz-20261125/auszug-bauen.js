// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Baut aus diagnose.csv und params.json den Berichtsauszug, den auswertung/arbeitspunkt.js liest.
   Die Werte stammen aus dem Fehlerbericht der Referenzpartie vom 25.11.2026 (README.md).
   Aufruf (in diesem Ordner):  node auszug-bauen.js  →  bericht-auszug.json */
'use strict';
const fs = require('fs');
const z = fs.readFileSync(require('path').join(__dirname, 'diagnose.csv'), 'utf8').trim().split('\n').slice(1).map(l => l.split(','));
const kiDiagnose = z.map(([zug, sims, anteil, feld, q, dauer, budget, msps, ges, vor, netz, suche, nach, nachricht, anwenden]) => ({
  zug: +zug, typ: 'stone', info: `MCTS ${sims} Sims · ${anteil}% ${feld} · Q ${q}`,
  dauerMs: +dauer, budgetMs: +budget, msProSim: +msps,
  zeiten: {gesamtMs: +ges, vorMs: +vor, netzMs: +netz, sucheMs: +suche, nachMs: +nach},
  nachrichtMs: +nachricht, anwendenMs: +anwenden}));
kiDiagnose.push({zug: 578, typ: 'pass', info: 'Pass — der Gegnerzug ist nicht abwendbar', dauerMs: 350, budgetMs: 2880,
  msProSim: 0.56, zeiten: {gesamtMs: 10, vorMs: null, netzMs: 0, sucheMs: null, nachMs: null}, nachrichtMs: 2, anwendenMs: 337});
const bericht = {
  meta: {erstellt: '2026-11-25T13:16:46.125Z',
         userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/158.0.0.0 Mobile Safari/537.36',
         zug: 578, amZug: 'Weiß', kiFarbe: 'Weiß', kiStufe: 'hard', kiDenkt: false, workerDeadReason: null,
         workerNeustarts: 0, spielVorbei: true, koPoint: null, gefangene: {1: 17, 2: 229}, msProSim: 0.56},
  kiDiagnose,
  reproduktion: {aiColor: 2, mc: 577, reqId: 289, koPoint: null, lastMove: 319,
                 extra: {gegnerPasste: true, wertung: 'territory', komi: 7.5},
                 params: JSON.parse(fs.readFileSync(require('path').join(__dirname, 'params.json'), 'utf8')), netBlend: 0, lastMsPerSim: 0.5590212422694273},
  _auszug: 'Auszug aus dem Fehlerbericht vom 25.11.2026: meta, kiDiagnose, reproduktion ohne board/histHashes/captures; brett und zugprotokoll fehlen.'
};
/* weitere Plausibilitäten: vorMs enthält netzMs; die Zugdauer umfasst die Worker-Zeit */
let netz = 0, dauer = 0;
for (const x of kiDiagnose.filter(e => e.typ === 'stone')) {
  if (x.zeiten.netzMs > x.zeiten.vorMs) netz++;
  if (x.dauerMs < x.zeiten.gesamtMs) dauer++;
}
console.log(`netzMs > vorMs: ${netz} · dauerMs < gesamtMs: ${dauer} · Parameter: ${Object.keys(bericht.reproduktion.params).length}`);
fs.writeFileSync(require('path').join(__dirname, 'bericht-auszug.json'), JSON.stringify(bericht, null, 1));
