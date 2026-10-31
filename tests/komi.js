// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Schätzung von k für die Komi-Messung (docs/komi-bewusstsein.md §3):
   Regression, Einfrieren nach der vorab festgelegten Regel, Bootstrap,
   Tragfähigkeit, Nachspielen (Schlagen, Gefangene), Auswahl brauchbarer
   Partien, Workflow.

   Aufruf:  node tests/komi.js */
'use strict';
const fs = require('fs'), path = require('path');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const K = require('../auswertung/komi/k-schaetzung.js');
const wurzel = path.join(__dirname, '..');

const nah = (a, b, tol, text) => pruefe(Math.abs(a - b) <= tol, `${text}: ${a} statt ${b}`);

test('Regression: genaue Gerade, u = SD(E)/SD(d), Vorzeichen', () => {
  const p = Array.from({length: 50}, (_, i) => ({d: i - 25, E: 4 * (i - 25) + 3}));
  const r = K.regression(p);
  nah(r.sDE, 0.25, 1e-9, 'Punkte je Einheit'); nah(r.sEd, 4, 1e-9, 'Einheiten je Punkt'); nah(r.u, 4, 1e-9, 'u'); nah(r.r2, 1, 1e-9, 'R²');
  const neg = K.regression(p.map(q => ({d: q.d, E: -q.E})));
  pruefe(neg.u < 0, 'fallende Gerade gibt negatives u');
  pruefeGleich(K.regression(p.slice(0, 2)), null, 'zu wenige Punkte');
  pruefeGleich(K.regression(p.map(q => ({d: 1, E: q.E}))), null, 'ohne Streuung in d');
});

test('Verdünnung: Rauschen in E macht 1/s_dE zu groß und s_Ed zu klein, u liegt dazwischen', () => {
  let s = 7; const z = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const p = Array.from({length: 4000}, () => { const d = 80 * z(); return {d, E: 5 * d + 120 * z()}; });
  const r = K.regression(p);
  pruefe(1 / r.sDE > r.u && r.u > r.sEd, `u zwischen den Schätzungen (${r.sEd.toFixed(2)} < ${r.u.toFixed(2)} < ${(1 / r.sDE).toFixed(2)})`);
});

test('Einfrieren: bei Zug 240, nur wenn 200 und 280 höchstens 25 % abweichen', () => {
  const e = (u200, u240, u280) => ({200: {u: u200}, 240: {u: u240}, 280: {u: u280}});
  let f = K.einfrieren(e(4, 4.5, 5), 7.5);
  pruefeGleich(`${f.belastbar} ${f.wert}`, 'true 34', '30 und 37,5 gegen 33,75: Abweichung 11 % und 11 %');
  f = K.einfrieren(e(3, 4.5, 5), 7.5);
  pruefeGleich(f.belastbar, false, '22,5 gegen 33,75 sind 33 % weg');
  f = K.einfrieren(e(4.5, 4.5, 4.5), 7.5);
  pruefeGleich(f.wert, 34, 'gerundet auf eine ganze Zahl');
  pruefeGleich(K.einfrieren({200: null, 240: null, 280: null}, 7.5).belastbar, false, 'ohne Regression nicht belastbar');
  pruefeGleich(K.einfrieren(e(-4, -4.5, -5), 7.5).belastbar, false, 'nicht positiv: nicht belastbar');
});

test('Bootstrap: wiederholbar, Intervall um u; Tragfähigkeit: R², Intervall und k müssen stimmen', () => {
  let s = 11; const z = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  const p = Array.from({length: 300}, () => { const d = 60 * z(); return {d, E: 5 * d + 20 * z()}; });
  const a = K.bootstrapU(p, 300, 1), b = K.bootstrapU(p, 300, 1);
  pruefeGleich(JSON.stringify(a), JSON.stringify(b), 'gleicher Seed, gleiches Intervall');
  const u = K.regression(p).u;
  pruefe(a[0] < u && u < a[1], 'u im Intervall');
  const gut = z0 => ({u: 6, r2: 0.4, ki: [5, 7], n: 100});
  const erg = {200: gut(), 240: gut(), 280: gut()};
  pruefe(K.tragfaehig(erg, K.einfrieren(erg, 7.5)).traegt, 'alles gut: trägt');
  const schlecht = {...erg, 240: {u: 6, r2: 0.1, ki: [5, 7], n: 100}};
  const t = K.tragfaehig(schlecht, K.einfrieren(schlecht, 7.5));
  pruefe(!t.traegt && t.gruende.some(g => /Zug 240: R² 0,100/.test(g)), 'R² zu klein: trägt nicht, mit Grund');
  const nullnah = {...erg, 200: {u: 6, r2: 0.4, ki: [-1, 7], n: 100}};
  pruefe(!K.tragfaehig(nullnah, K.einfrieren(nullnah, 7.5)).traegt, 'Intervall bis unter 0: trägt nicht');
});

test('Nachspielen: Schlagen zählt Gefangene, passende Stellungen, Pass', () => {
  const E = K.motor(path.join(wurzel, 'index.html'));
  const z = ['A1', 'A2', 'K10', 'B1', 'pass', 'T19'];
  const r = K.nachspielen(E, z, [4, 6]);
  pruefeGleich(`${r.gefangen[1]} ${r.gefangen[2]}`, '0 1', 'Weiß schlägt A1 (1 Stein)');
  pruefeGleich(Object.keys(r.stellungen).join(','), '4,6', 'Stellungen nach Zug 4 und 6');
  pruefe(Object.values(r.stellungen).every(Number.isFinite), 'Bewertungen endlich');
  let fehler = false; try { K.nachspielen(E, ['Z9'], []); } catch (e) { fehler = true; }
  pruefe(fehler, 'unlesbare Koordinate wird abgelehnt');
});

test('Auswahl brauchbarer Partien und Gesamtlauf mit künstlichen Partien', () => {
  const p = (extra = {}) => ({abgebrochen: null, gewonnen: true, unsereZaehlung: {b: 190, w: 178.5}, komi: 7.5, beginnt: 'S', vorgabe: 0, zuege: ['D4'], ...extra});
  pruefe(K.brauchbar(p(), 7.5), 'normale Partie');
  for (const [name, extra] of [['abgebrochen', {abgebrochen: 'x'}], ['kein Sieger', {gewonnen: null}], ['Vorgabe', {vorgabe: 6}], ['Komi 0,5', {komi: 0.5}], ['Weiß beginnt', {beginnt: 'W'}], ['ohne Zählung', {unsereZaehlung: null}]])
    pruefe(!K.brauchbar(p(extra), 7.5), name + ' wird nicht gewertet');
  /* 30 Partien mit 300 Zügen: wenige Züge zufällig, Gefangene stimmen (0) → Prüfung 30 von 30; Partien unter 200 Zügen zählen als zu kurz */
  const E = K.motor(path.join(wurzel, 'index.html'));
  const SP = 'ABCDEFGHJKLMNOPQRST';
  const partie = (nr, laenge) => {
    const zuege = Array.from({length: laenge}, (_, i) => i < 2 * 18 ? SP[Math.floor(i / 2)] + (i % 2 ? 2 : 1) : 'pass');
    return {nr, abgebrochen: null, gewonnen: true, wirFarbe: 'S', gefangen: {wir: 0, gegner: 0}, unsereZaehlung: {b: 180 + nr, w: 170 + (nr % 5)}, komi: 7.5, beginnt: 'S', vorgabe: 0, zuege};
  };
  const partien = [...Array.from({length: 30}, (_, i) => partie(i + 1, 300)), partie(99, 150)];
  const res = K.auswerten(E, partien, 7.5);
  pruefeGleich(`${res.genutzt} ${res.geprueft} ${res.falsch} ${res.zuKurz[200]}`, '30 31 0 1', 'genutzt, geprüft, falsch, zu kurz');
  const falsch = K.auswerten(E, [{...partie(1, 300), gefangen: {wir: 5, gegner: 0}}], 7.5);
  pruefeGleich(falsch.falsch, 1, 'falsche Gefangenenzahl wird gemeldet');
  pruefe(/FEHLER im Nachspielen/.test(K.text(falsch, 7.5)), 'Bericht nennt den Fehler');
  pruefe(/keinen Komi-Arm/.test(K.text(res, 7.5)), 'Bericht nennt das Ergebnis');
});

test('Workflow komi-k.yml und Dokument: Zugzahlen, Daten, Regel', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'komi-k.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'komi-bewusstsein.md'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t) && !/inputs:/.test(t), 'nur manuell, keine Eingaben');
  pruefe(/runs-on: ubuntu-24\.04/.test(t) && !/ubuntu-latest/.test(t), 'Ubuntu 24.04');
  for (const d of ['muster-ohne-vorgabe/lauf1/f-D.jsonl.gz', 'muster-ohne-vorgabe/lauf1/g-D.jsonl.gz', 'leeres-brett/lauf1/g-D.jsonl.gz', 'fuego-siege/lauf1/D.jsonl.gz'])
    pruefe(t.includes(d) && fs.existsSync(path.join(wurzel, 'docs', 'daten', d)), 'Datei ' + d);
  pruefeGleich(K.ZUGZAHLEN.join(','), '200,240,280', 'Zugzahlen');
  pruefe(/Zug 200, 240 und\s+280/.test(doc) && /R² bei allen drei\s+Zugzahlen mindestens 0,25/.test(doc) && /höchstens 25 %/.test(doc), 'Regel im Dokument');
  pruefe(/-ne 0 \] && \[ "\$status" -ne 1 \]/.test(t), 'rot nur bei Fehlern (2, 3), nicht bei „trägt nicht“');
  pruefe(/status=0\n\s+node auswertung\/komi\/k-schaetzung\.js[\s\S]*ergebnisse\/bericht\.md \|\| status=\$\?/.test(t), 'Exit-Code 1 wird mit || abgefangen (GitHub startet bash -e)');
  pruefe(!t.includes('${{'), 'keine Ausdrücke im Workflow');
});

test('Quelle von d: eigene Zählung gegen GNU Gos final_score, gleiche Partien', () => {
  /* Partie 1 aus den Daten: KI Weiß, GNU Go B+9,5 (endstand −9,5), eigene Zählung b 180, w 182,5 (mit Komi) */
  const r = {wirFarbe: 'W', endstand: -9.5, unsereZaehlung: {b: 180, w: 182.5}};
  pruefeGleich(K.stand(r, 7.5, 'eigene'), 5, 'eigene Zählung: 180 − (182,5 − 7,5)');
  pruefeGleich(K.stand(r, 7.5, 'gnugo'), 17, 'GNU Go: Rand B+9,5 plus Komi 7,5');
  pruefeGleich(K.stand({...r, wirFarbe: 'S', endstand: 4}, 7.5, 'gnugo'), 11.5, 'KI Schwarz mit 4 vorn: 4 + 7,5');
  pruefe(Number.isNaN(K.stand({wirFarbe: 'W'}, 7.5, 'gnugo')), 'ohne endstand: NaN');
  const p = {abgebrochen: null, gewonnen: true, unsereZaehlung: {b: 190, w: 178.5}, komi: 7.5, beginnt: 'S', vorgabe: 0, zuege: ['D4'], wirFarbe: 'S'};
  pruefe(K.brauchbar(p, 7.5, 'eigene') && !K.brauchbar(p, 7.5, 'gnugo'), 'gnugo verlangt endstand');
  const E = K.motor(path.join(wurzel, 'index.html'));
  const SP = 'ABCDEFGHJKLMNOPQRST';
  const partie = (nr, laenge, endstand) => ({nr, abgebrochen: null, gewonnen: true, wirFarbe: 'S', gefangen: {wir: 0, gegner: 0}, endstand, unsereZaehlung: {b: 180 + nr, w: 170 + (nr % 5)}, komi: 7.5, beginnt: 'S', vorgabe: 0,
    zuege: Array.from({length: laenge}, (_, i) => i < 10 + (nr % 24) ? SP[Math.floor(i / 2)] + (i % 2 ? 2 : 1) : 'pass')});
  const partien = [...Array.from({length: 20}, (_, i) => partie(i + 1, 300, i - 10)), partie(98, 250, 1), partie(99, 150, 2)];
  const alle = K.auswerten(E, partien, 7.5);
  const gleich = K.auswerten(E, partien, 7.5, {gleiche: true});
  pruefeGleich(`${alle.erg[200].n} ${alle.erg[240].n} ${alle.erg[280].n}`, '21 21 20', 'alle: 21 Partien erreichen 200 und 240, 20 erreichen 280');
  pruefeGleich(`${gleich.erg[200].n} ${gleich.erg[240].n} ${gleich.erg[280].n}`, '20 20 20', 'gleiche Partien: überall dieselben 20');
  const gn = K.auswerten(E, partien, 7.5, {quelle: 'gnugo'});
  pruefe(/GNU Gos final_score/.test(K.text(gn, 7.5)) && /nur die, die alle drei Zugzahlen erreichen/.test(K.text(gleich, 7.5)), 'Bericht nennt Quelle und Auswahl');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'komi-bewusstsein.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'komi-k.yml'), 'utf8');
  pruefe(/## 6\. /.test(doc) && /unsereZaehlung/.test(doc) && /explorativ/i.test(doc), 'Nachtrag §6 im Dokument');
  pruefe(/--quelle gnugo/.test(t) && /--gleiche-partien/.test(t), 'Workflow rechnet die Gegenproben');
});

laufeTests('Komi k-Schätzung').then(ok => process.exit(ok ? 0 : 1));
