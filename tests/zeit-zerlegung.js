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

test('Messpunkte: Median je Teil vor und nach Zug 80; ältere Berichte ohne `zeiten` bleiben auswertbar', () => {
  const k = [];
  const mit = (zug, rest, netz) => ({...eintrag(zug, 400, 4.5, 1800 + rest), zeiten: {gesamtMs: 1800 + rest - 100, vorMs: rest - 100 - 10, netzMs: netz, sucheMs: 1800, nachMs: 10}, nachrichtMs: 100, anwendenMs: 3});
  for (let z = 2; z <= 80; z += 2) k.push(mit(z, 200, 0));
  for (let z = 82; z <= 100; z += 2) k.push(mit(z, 2000, 1500));
  const r = Z.auswerten({kiDiagnose: k});
  pruefeGleich(r.messpunkte.vor.netzMs, 0, 'vor Zug 80 kein Netz');
  pruefeGleich(r.messpunkte.nach.netzMs, 1500, 'danach Netz 1500 ms');
  pruefeGleich(r.messpunkte.nach.nachrichtMs, 100, 'Nachrichtenweg');
  pruefe(/netzMs\s+0 \|\s+1500/.test(Z.text(r)), 'Textausgabe zeigt Netz vor | nach');
  const alt = Z.auswerten({kiDiagnose: [eintrag(2, 400, 4.5, 2000)]});
  pruefeGleich(alt.messpunkte, null, 'ältere Berichte: keine Messpunkte');
  pruefe(/keine Messpunkte/.test(Z.text(alt)), 'Text sagt es');
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

test('Handy-Bericht vom 31.10. (140 Steinzüge mit Messpunkten): das Netz kostet ab Zug 81 rund 1,6 s je Zug', () => {
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'handy-bericht-280zuege.json'), 'utf8'));
  const r = Z.auswerten(d);
  pruefeGleich(r.zuege, 140, '140 Steinzüge');
  pruefeGleich(r.messpunkte.nach.netzMs, 1627, 'Netz im Median 1627 ms');
  pruefeGleich(r.messpunkte.vor.netzMs, 0, 'vor Zug 80 kein Netz');
  pruefe(r.messpunkte.nach.nachrichtMs <= 5, `Nachrichtenweg ${r.messpunkte.nach.nachrichtMs} ms`);
  const netz = r.zeilen.filter(x => x.zug > 80).map(x => x.netzMs);
  pruefe(Math.min(...netz) >= 1500 && Math.max(...netz) <= 1800, `Netz in jedem Zug 1,5 bis 1,8 s (${Math.min(...netz)} bis ${Math.max(...netz)})`);
});

test('Galaxy A20s (146 Steinzüge mit Messpunkten): Netz im Median 520 ms, Nachrichtenweg und Einsetzen vernachlässigbar; kein Sprung-Text „Zug null“', () => {
  const d = JSON.parse(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'handy-bericht-a20s-292zuege.json'), 'utf8'));
  const r = Z.auswerten(d);
  pruefeGleich(r.zuege, 146, '146 Steinzüge');
  pruefeGleich(r.messpunkte.nach.netzMs, 520, 'Netz im Median 520 ms');
  pruefe(r.messpunkte.nach.nachrichtMs <= 5 && r.messpunkte.nach.anwendenMs <= 15, 'Nachrichtenweg und Einsetzen klein');
  pruefe(!/Zug null/.test(Z.text(r)), 'Text sagt nie „Zug null“');
  pruefe(/kein dauerhafter Sprung/.test(Z.text(r)), 'ohne Sprung wird das gesagt');
});

test('A17: Chrome mit V8-Optimierer schnell wie Firefox, Chrome davor langsam (gleiche Parameter in allen Berichten)', () => {
  const T = path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory');
  const lade = n => JSON.parse(fs.readFileSync(path.join(T, `handy-bericht-${n}.json`), 'utf8'));
  const langsam = lade('a17-chrome2-356zuege'), firefox = lade('a17-firefox-354zuege'), v8 = lade('a17-chrome-v8-358zuege');
  const sims2 = d => +/(\d+) Sims/.exec(d.kiDiagnose.find(x => x.zug === 2).info)[1];
  pruefe(sims2(langsam) < 600, `Chrome vorher: ${sims2(langsam)} Simulationen in 1,8 s`);
  pruefe(sims2(firefox) > 1800 && sims2(v8) > 1800, `Firefox ${sims2(firefox)} und Chrome mit V8-Optimierer ${sims2(v8)}`);
  const rv = Z.auswerten(v8), rl = Z.auswerten(langsam);
  pruefe(rv.messpunkte.nach.netzMs < 200 && rl.messpunkte.nach.netzMs > 1400, `Netz ${rv.messpunkte.nach.netzMs} gegen ${rl.messpunkte.nach.netzMs} ms`);
  pruefeGleich(rv.dauerUeberBudget15, 0, 'mit V8-Optimierer kein Zug über 1,5 × Budget');
  const p = JSON.stringify(Object.entries(langsam.reproduktion.params).sort());
  pruefeGleich(JSON.stringify(Object.entries(firefox.reproduktion.params).sort()), p, 'Firefox: gleiche Parameter');
  pruefeGleich(JSON.stringify(Object.entries(v8.reproduktion.params).sort()), p, 'Chrome mit V8: gleiche Parameter');
});

test('Endspiel-Netz: eingeschaltet ab Zug 80 (Deutung der Doku setzt das voraus)', () => {
  const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  pruefe(/endspielNetz:\s+0\.8,/.test(html), 'endspielNetz 0,8');
  pruefe(/endspielNetzAb:\s+80,/.test(html), 'endspielNetzAb 80');
  pruefe(/mc < PARAMS\.endspielNetzAb/.test(html), 'Netz läuft erst ab endspielNetzAb');
});

test('Dokument und Archivdaten vorhanden', () => {
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'zeitbudget.md'), 'utf8');
  pruefe(/Ergebnis vom Handy/.test(doc) && /1627/.test(doc) && /Galaxy A20s/.test(doc), 'Doc nennt beide Handy-Ergebnisse');
  pruefe(/V8-Optimierer/.test(doc) && /Auflösung/.test(doc), 'Doc nennt die Auflösung');
  pruefe(/Zerlegung auf dem Handy/.test(doc) && /nachrichtMs/.test(doc), 'Doc beschreibt die Messpunkte');
  for (const f of ['zeit-zerlegung.txt', 'netz-kosten.txt', 'browser-zeit-cpu1.txt', 'browser-zeit-cpu10.txt', 'handy-bericht-280zuege.json', 'handy-zeit-zerlegung.txt', 'handy-bericht-a20s-292zuege.json', 'handy-a20s-zeit-zerlegung.txt', 'handy-bericht-a17-chrome2-356zuege.json', 'handy-bericht-a17-firefox-354zuege.json', 'handy-bericht-a17-pwa-340zuege.json', 'handy-bericht-a17-chrome-v8-358zuege.json', 'handy-zeit-zerlegung-a17-chrome-v8-358zuege.txt', 'chromium-referenz/README.md', 'chromium-referenz/bericht.md', 'chromium-referenz/metadaten.json', 'chromium-referenz/messungen.jsonl']) pruefe(fs.existsSync(path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', f)), f);
});

laufeTests('Zeit-Zerlegung').then(ok => process.exit(ok ? 0 : 1));
