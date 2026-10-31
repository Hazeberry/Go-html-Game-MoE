// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zeit-Zerlegung (docs/zeitbudget.md): Dauer eines KI-Zugs = Suche (Sims × ms/Sim)
   + Rest. Geprüft:
     1. Zerlegung und Sprungstelle an einer gebauten Diagnose.
     2. Zugfremde Einträge (Pass, ohne Simulationszahl) werden übergangen.
     3. Die echte Diagnose vom 31.10. (Android-Handy, 494 Züge): Rest vor Zug 80
        rund 190 ms, danach rund 1760 ms; Sprung bei Zug 82; 238 Züge länger als
        das 1,5-Fache des Budgets.
     4. Das Endspiel-Netz ist ab endspielNetzAb eingeschaltet (Voraussetzung der
        Deutung in der Doku) und ändert vor diesem Zug nichts am Aufwand.

   Aufruf:  node tests/zeit-zerlegung.js */
'use strict';
const fs = require('fs'), path = require('path');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const Z = require('../auswertung/endspiel/zeit-zerlegung.js');
const wurzel = path.join(__dirname, '..');

const eintrag = (zug, sims, msProSim, dauerMs, budgetMs = 1800) =>
  ({zug, typ: 'stone', info: `MCTS ${sims} Sims · 40% A1 · Q 0.00`, dauerMs, budgetMs, msProSim});

test('Zerlegung: Suche = Sims × ms/Sim, Rest = Dauer − Suche, Sprung bei Zug 82', () => {
  const k = [];
  for (let z = 2; z <= 80; z += 2) k.push(eintrag(z, 400, 4.5, 2000));          /* Suche 1800, Rest 200 */
  for (let z = 82; z <= 100; z += 2) k.push(eintrag(z, 400, 4.5, 3800));        /* Rest 2000 */
  k.push({zug: 102, typ: 'pass', info: 'Pass', dauerMs: 5, budgetMs: 1800});
  const r = Z.auswerten({kiDiagnose: k});
  pruefeGleich(r.zuege, 50, 'Pass-Eintrag übergangen');
  pruefeGleich(r.vor.restMedian, 200, 'Rest vor Zug 80');
  pruefeGleich(r.nach.restMedian, 2000, 'Rest nach Zug 80');
  pruefeGleich(r.sprungBeiZug, 82, 'Sprungstelle');
  pruefeGleich(r.dauerUeberBudget15, 10, 'zehn Züge über 1,5 × Budget');
  pruefeGleich(r.sucheUeberBudget, 0, 'Suche selbst hält das Budget');
});

test('Einträge ohne Simulationszahl oder ms/Sim werden nicht gezählt; leere Diagnose ist kein Fehler', () => {
  const r = Z.auswerten({kiDiagnose: [{zug: 2, typ: 'stone', info: 'ohne Zahl', dauerMs: 100, budgetMs: 1800, msProSim: 1}, {zug: 4, typ: 'stone', info: 'MCTS 10 Sims', dauerMs: 100, budgetMs: 1800, msProSim: null}]});
  pruefeGleich(r.zuege, 0, 'nichts auswertbar');
  pruefeGleich(r.sprungBeiZug, null, 'kein Sprung');
  pruefeGleich(Z.auswerten({}).zuege, 0, 'fehlendes Feld');
});

test('Diagnose vom 31.10. (Handy): Rest springt bei Zug 82 von ~190 auf ~1760 ms', () => {
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'mensch-494zuege-diagnose.json'), 'utf8'));
  const r = Z.auswerten(d);
  pruefeGleich(r.zuege, 281, '281 Steinzüge');
  pruefeGleich(r.sprungBeiZug, 82, 'Sprung bei Zug 82');
  pruefe(r.vor.restMedian >= 150 && r.vor.restMedian <= 250, `Rest vor Zug 80 ${r.vor.restMedian}`);
  pruefe(r.nach.restMin >= 1500 && r.nach.restMax <= 2200, `Rest danach ${r.nach.restMin} bis ${r.nach.restMax}`);
  pruefeGleich(r.dauerUeberBudget15, 238, '238 Züge über 1,5 × Budget');
  pruefeGleich(r.maxDauer, 5743, 'längster Zug 5743 ms');
});

test('Endspiel-Netz: eingeschaltet ab Zug 80 (Deutung der Doku setzt das voraus)', () => {
  const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  pruefe(/endspielNetz:\s+0\.8,/.test(html), 'endspielNetz 0,8');
  pruefe(/endspielNetzAb:\s+80,/.test(html), 'endspielNetzAb 80');
  pruefe(/mc < PARAMS\.endspielNetzAb/.test(html), 'Netz läuft erst ab endspielNetzAb');
});

test('Dokument und Archivdaten vorhanden', () => {
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'zeitbudget.md'), 'utf8');
  pruefe(/Vermutung|Hypothese/.test(doc) && /nicht bewiesen|nicht belegt/.test(doc), 'Doc kennzeichnet die Ursache als nicht bewiesen');
  for (const f of ['zeit-zerlegung.txt', 'netz-kosten.txt']) pruefe(fs.existsSync(path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', f)), f);
});

laufeTests('Zeit-Zerlegung').then(ok => process.exit(ok ? 0 : 1));
