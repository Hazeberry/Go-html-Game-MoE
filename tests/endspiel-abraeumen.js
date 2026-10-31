// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagnose „Abräumen am Partieende“ (docs/endspiel-abraeumen.md):
   SGF und Datensätze lesen, Endphase vermessen (KI-Züge nach dem letzten
   Gegnerstein, schlagende Züge, Pässe, Ende), Zusammenfassung, Workflow.

   Aufruf:  node tests/endspiel-abraeumen.js */
'use strict';
const fs = require('fs'), path = require('path');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const D = require('../auswertung/endspiel/abraeumen-diagnose.js');
const K = require('../auswertung/komi/k-schaetzung.js');
const wurzel = path.join(__dirname, '..');
const E = K.motor(path.join(wurzel, 'index.html'));
const idx = s => { const x = 'ABCDEFGHJKLMNOPQRST'.indexOf(s[0]); return (19 - +s.slice(1)) * 19 + x; };
const z = (farbe, s) => ({farbe, punkt: s === 'pass' ? -1 : idx(s)});

test('SGF lesen: Farben, Koordinaten, Pässe ([] und [tt])', () => {
  const l = D.sgfZuege('(;GM[1]SZ[19];B[aa];W[ss];B[];W[tt];B[sa])');
  pruefeGleich(JSON.stringify(l.map(x => [x.farbe, x.punkt])), JSON.stringify([[1, 0], [2, 360], [1, -1], [2, -1], [1, 18]]), 'Züge');
  const echt = D.sgfZuege(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'mensch-412zuege.sgf'), 'utf8'));
  pruefeGleich(echt.length, 412, '412 Züge in der echten Partie');
});

test('Endphase: KI-Züge nach dem letzten Gegnerstein, schlagende Züge, Pässe, Ende', () => {
  /* KI = Weiß. Schwarz A1, Weiß A2, Schwarz K10 (letzter Stein), Weiß B1 schlägt A1, Schwarz passt, Weiß passt */
  const m = D.messen(E, [z(1, 'A1'), z(2, 'A2'), z(1, 'K10'), z(2, 'B1'), z(1, 'pass'), z(2, 'pass')], 2);
  pruefeGleich(`${m.endphaseZuege} ${m.kiZuege} ${m.kiSchlag} ${m.kiOhneSchlag} ${m.gegnerPaesse} ${m.kiPaesse} ${m.ende}`, '3 1 1 0 1 1 zwei Pässe', 'Zählung');
  const o = D.messen(E, [z(2, 'D4'), z(1, 'K10'), z(2, 'pass'), z(1, 'pass'), z(2, 'pass')], 2);
  pruefeGleich(`${o.kiZuege} ${o.kiPaesse} ${o.gegnerPaesse}`, '0 2 1', 'KI passt schon, keine KI-Züge in der Endphase');
  /* Gegner spielt nach dem ersten KI-Pass noch einen Stein */
  const g = D.messen(E, [z(1, 'K10'), z(2, 'pass'), z(1, 'D4'), z(2, 'pass'), z(1, 'pass'), z(2, 'pass')], 2);
  pruefeGleich(g.gegnerNachKiPass, 1, 'Gegner spielt nach dem KI-Pass');
  const l = D.messen(E, [z(1, 'K10'), z(2, 'D4'), z(1, 'pass'), z(2, 'Q16')], 2);
  pruefeGleich(l.ende, 'ohne zwei Pässe', 'Zuglimit/Abbruch getrennt');
  const v = D.messen(E, [z(2, 'D4'), z(1, 'pass')], 1, [idx('K10')]);
  pruefe(v.zuege === 2, 'Vorgabestein wird gesetzt, kein Fehler');
});

test('Datensatz: Farbe der KI, Beginn, Zusammenfassung ohne Limit-Partien', () => {
  const r = {beginnt: 'W', zuege: ['D4', 'pass', 'Q16', 'pass']};
  pruefeGleich(JSON.stringify(D.recordZuege(r).map(x => x.farbe)), JSON.stringify([2, 1, 2, 1]), 'Weiß beginnt (Vorgabe)');
  const ms = [{ende: 'zwei Pässe', kiZuege: 0, kiSchlag: 0, kiOhneSchlag: 0, gegnerNachKiPass: 0}, {ende: 'zwei Pässe', kiZuege: 12, kiSchlag: 4, kiOhneSchlag: 8, gegnerNachKiPass: 1}, {ende: 'ohne zwei Pässe', kiZuege: 99}];
  const s = D.zusammen(ms);
  pruefeGleich(`${s.partien} ${s.zweiPaesse} ${s.ohneZweiPaesse} ${s.kiZuegeMittel} ${s.kiZuegeMax} ${s.anteilUeber10}`, '3 2 1 6 12 0.5', 'Limit-Partien werden getrennt ausgewiesen, nicht gemittelt');
  pruefeGleich(D.quantil([1, 2, 3, 4, 5], 0.5), 3, 'Median');
  pruefe(/ohne \(Limit\/Abbruch\)/.test(D.text({a: ms})), 'Tabelle weist Limit/Abbruch aus');
});

test('Workflow endspiel-abraeumen.yml und Dokument', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-abraeumen.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'endspiel-abraeumen.md'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t) && !/inputs:/.test(t) && !t.includes('${{'), 'nur manuell, keine Eingaben');
  pruefe(/runs-on: ubuntu-24\.04/.test(t), 'Ubuntu 24.04');
  for (const d of ['pwa-vergleich/lauf1/m1.jsonl.gz', 'leeres-brett/lauf1/g-D.jsonl.gz', 'muster-ohne-vorgabe/lauf1/f-D.jsonl.gz', 'fuego-siege/lauf1/D.jsonl.gz', 'endspiel-abraeumen/mensch-412zuege.sgf', 'endspiel-abraeumen/mensch-427zuege.sgf'])
    pruefe(t.includes(d) && fs.existsSync(path.join(wurzel, 'docs', 'daten', d)), 'Datei ' + d);
  pruefe(/Seki/.test(doc) && /Zählphase/.test(doc) && /kein neuer Lauf|nur Diagnose/i.test(doc), 'Dokument: Seki-Vorbehalt, Zählphase, nur Diagnose');
});

laufeTests('Endspiel-Abräumen, Diagnose').then(ok => process.exit(ok ? 0 : 1));
