// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Berichtswerkzeug der Skalierungsmessung (auswertung/skalierung-bericht.js,
   docs/skalierung-heute-vorabfestlegung.md §5, §7, §13).

   Das Skript entscheidet, ob ein Lauf ein Urteil trägt und wie es lautet. Geprüft wird:
     1. Fisher-Test an drei bekannten Werten, Binomialtest, Clopper-Pearson und Elo gegen die
        vorhandenen Funktionen.
     2. Die Zuordnung zu K1 und K2 kommt aus konfig.A/konfig.B, nicht aus der Reihenfolge.
     3. Jede der fünf Regeln aus §5.5 schlägt an, wenn sie verletzt ist; Regel 5 konservativ.
        Dazu jede Partie einzeln (§13.4): Jeder Fehler in aIst, sieger, siegerFarbe, aufgabe,
        Stand oder zuege ergibt KEIN URTEIL, auch wenn Partienzahl und Farbsumme stimmen.
     4. Eine extreme Siegrate in einem Teillauf ist KEIN Gültigkeitsgrund.
     5. Die Urteilssätze aus §5.3, wörtlich.
     6. Stufe 2: Seeds und Vergleich K3 = N gegen 2N aus N und Partien je Teillauf; N muss ein
        Vielfaches von 100 und mindestens 100 sein; Bedienfehler sind Exit 2. Die Lage von K3
        zu K2 im beschreibenden Teil.
     7. Die Kostenschätzung aus §7.3, mit fester Reihe und dem N aus Stufe G.
     8. Ende zu Ende über die Befehlszeile, gültig und ungültig.

   Aufruf:  node tests/skalierung-bericht.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const W = require('../auswertung/skalierung-bericht.js');
const {vorzeichenP} = require('../auswertung/messung-zusatz.js');
const {clopperPearson} = require('../auswertung/kandidaten-orakel/haupt-bericht.js');
const {blocksummen} = require('../auswertung/eval-streuung-bericht.js');

const COMMIT = 'c0ffee'.padEnd(40, '0');
const HTML = path.join(__dirname, '..', 'index.html');
const SKRIPT = path.join(__dirname, '..', 'auswertung', 'skalierung-bericht.js');
const engineWieFestgelegt = () => {
  const ist = blocksummen(HTML);
  return Object.entries(W.BLOCKSUMMEN).every(([b, s]) => ist[b] === s);
};

let TMP;
const tmpdir = () => TMP || (TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'skalierung-')));

/* Ein Teillauf: g Partien, die ersten `siegeB` gewinnt B, Farben abwechselnd wie im Harness.
   siegerFarbe, aufgabe und Stand passen dazu wie beim Harness; opt.partie(x, i) darf eine
   Partie danach verändern. */
function teil(seed, a, b, opt = {}) {
  const g = opt.g === undefined ? 82 : opt.g, siegeB = opt.siegeB === undefined ? 50 : opt.siegeB;
  const armA = opt.armA || `mctsFixedSims=${a},resignEnabled=0`;
  const armB = opt.armB || `mctsFixedSims=${b},resignEnabled=0`;
  const partien = Array.from({length: g}, (_, i) => {
    const aIst = opt.aIst ? opt.aIst(i) : (i % 2 === 0 ? 'Schwarz' : 'Weiß');
    const sieger = i < siegeB ? 'B' : 'A';
    const aIstSchwarz = aIst === 'Schwarz';
    const siegerFarbe = (sieger === 'A') === aIstSchwarz ? 'S' : 'W';
    const x = {partie: i + 1, aIst, sieger, siegerFarbe, aufgabe: null,
               stand: siegerFarbe === 'S' ? 'B 190 : W 177.5' : 'B 175 : W 192.5',
               zuege: opt.zuege ? opt.zuege(i) : 370,
               simsA: a, simsB: b, dauerMin: opt.minJePartie === undefined ? 0.5 : opt.minJePartie};
    if (opt.partie) opt.partie(x, i);
    return x;
  });
  return {
    name: `ab-${seed}.json`,
    daten: {konfig: {A: armA, B: armB, komi: opt.komi === undefined ? 7.5 : opt.komi,
                     modus: opt.modus || 'standard', seed, commit: opt.commit || COMMIT,
                     dauerMin: 41, abgeschlossen: opt.abgeschlossen === undefined ? true : opt.abgeschlossen},
            partien},
    roh: opt.roh === null ? null : Array.from({length: opt.rohN === undefined ? g : opt.rohN}, () => '{}'),
    anomalien: opt.anomalien === undefined ? 0 : opt.anomalien,
    zuglimit: opt.zuglimit === undefined ? 600 : opt.zuglimit
  };
}
/* Stufe 1 vollständig: K1 mit siege1 Siegen von B je Teil, K2 mit siege2. */
function stufe1(siege1 = 50, siege2 = 47, opt = {}) {
  return [
    ...W.STUFE1[0].seeds.map(s => teil(s, 120, 240, {siegeB: siege1, minJePartie: opt.min1, ...opt})),
    ...W.STUFE1[1].seeds.map(s => teil(s, 240, 480, {siegeB: siege2, minJePartie: opt.min2, ...opt}))
  ];
}
const A1 = {stufe: 1, commit: COMMIT, html: null};
/* Gründe einer bestimmten Regel; Regel 4 hängt am übergebenen Stand und wird eigens geprüft. */
const regel = (gruende, n) => gruende.filter(g => g.startsWith(`Regel ${n}:`));
const ohneRegel4 = gruende => gruende.filter(g => !g.startsWith('Regel 4:'));

test('Fisher-Test: drei bekannte Werte und Symmetrie', () => {
  pruefeNah(W.fisherZweiseitig(218, 142, 208, 152), 0.4950, 0.0005, 'Messung vom 03.10.');
  pruefeNah(W.fisherZweiseitig(3, 1, 1, 3), 0.4857, 0.0001, 'Lehrbuch 3:1 gegen 1:3');
  pruefeNah(W.fisherZweiseitig(4, 0, 0, 4), 0.0286, 0.0001, 'Teetrinkerin 4:0 gegen 0:4');
  pruefeNah(W.fisherZweiseitig(208, 152, 218, 142), W.fisherZweiseitig(218, 142, 208, 152), 1e-12, 'Zeilen getauscht');
  pruefeNah(W.fisherZweiseitig(500, 500, 500, 500), 1, 1e-9, 'identische Zeilen geben p = 1');
});

test('F1: Binomialtest, Clopper-Pearson und Elo wie die vorhandenen Funktionen', () => {
  const t = W.STUFE1[0].seeds.map(s => teil(s, 120, 240, {siegeB: 50}));
  const r = W.rechne(W.STUFE1[0], t);
  pruefeGleich(r.n, 1230, 'Partien'); pruefeGleich(r.siege, 750, 'Siege von B');
  pruefeNah(r.p, vorzeichenP(750, 480), 1e-15, 'p wie vorzeichenP');
  const ci = clopperPearson(750, 1230, 0.05);
  pruefeNah(r.ci[0], ci[0], 1e-15, 'untere Grenze'); pruefeNah(r.ci[1], ci[1], 1e-15, 'obere Grenze');
  pruefeNah(r.elo, 400 * Math.log10((750 / 1230) / (480 / 1230)), 1e-9, 'Elo');
  pruefeNah(r.eloCi[0], W.elo(ci[0]), 1e-9, 'Elo untere Grenze aus der Siegrate');
  pruefeGleich(r.bSchwarz.n + r.bWeiss.n, 1230, 'Farben vollständig');
});

test('F2: Differenz, genähertes Intervall und Fisher-Test', () => {
  const r1 = W.rechne(W.STUFE1[0], W.STUFE1[0].seeds.map(s => teil(s, 120, 240, {siegeB: 50})));
  const r2 = W.rechne(W.STUFE1[1], W.STUFE1[1].seeds.map(s => teil(s, 240, 480, {siegeB: 47})));
  const f = W.abflachung(r1, r2);
  pruefeNah(f.D, r1.elo - r2.elo, 1e-12, 'D = Elo(K1) − Elo(K2)');
  const se = Math.hypot(W.seElo(r1.rate, 1230), W.seElo(r2.rate, 1230));
  pruefeNah(f.ci[1] - f.D, 1.959964 * se, 1e-9, 'Halbbreite 1,96 · Standardfehler');
  pruefeNah(f.p, W.fisherZweiseitig(750, 480, 705, 525), 1e-15, 'Fisher auf die Siege von B');
  pruefeNah(1.959964 * Math.SQRT2 * W.seElo(0.59, 1230), 27.9, 0.2, 'Bemessung §5.2: rund ±28 Elo');
});

test('Urteilssätze aus §5.3, wörtlich', () => {
  const r = {a: 120, b: 240, rate: 0.6, p: 0.001, elo: 70.4, eloCi: [50.1, 91.2]};
  pruefeGleich(W.urteilF1(r), 'Eine Verdopplung von 120 auf 240 Simulationen bringt dem heutigen Default nachweisbar Stärke: +70,4 Elo [+50,1; +91,2].', 'F1 gewinnt');
  pruefeGleich(W.urteilF1({...r, p: 0.2, eloCi: [-5, 30]}),
    'Ein Gewinn durch die Verdopplung von 120 auf 240 ist nicht nachgewiesen. Das Intervall [−5,0; +30,0] sagt, wie groß er sein könnte.', 'F1 kein Nachweis');
  pruefeGleich(W.urteilF1({...r, rate: 0.4}), 'Die doppelte Suche verliert nachweisbar.', 'F1 verliert');
  const f = {D: 31.2, ci: [5.1, 57.3], p: 0.02};
  pruefeGleich(W.urteilF2(f), 'Der Gewinn je Verdopplung ist bei 240 → 480 nachweisbar kleiner als bei 120 → 240: +31,2 Elo [+5,1; +57,3].', 'F2 kleiner');
  pruefeGleich(W.urteilF2({D: -31.2, ci: [-57.3, -5.1], p: 0.02}),
    'Der Gewinn je Verdopplung ist bei 240 → 480 nachweisbar größer als bei 120 → 240: −31,2 Elo [−57,3; −5,1].', 'F2 größer');
  pruefeGleich(W.urteilF2({D: 12, ci: [-16, 40], p: 0.4}),
    'Ein Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen (+12,0 Elo [−16,0; +40,0]). '
    + 'Die Messung war so bemessen, dass sie eine Abflachung von 40 Elo mit rund 80 % erkannt hätte.', 'F2 kein Nachweis');
});

test('Zuordnung aus konfig, nicht aus der Reihenfolge', () => {
  const t = stufe1(); const gemischt = [...t].reverse();
  const a = W.pruefe(A1, W.STUFE1, t), b = W.pruefe(A1, W.STUFE1, gemischt);
  pruefeGleich(ohneRegel4(a.gruende).length, 0, 'gültig in der Reihenfolge');
  pruefeGleich(ohneRegel4(b.gruende).length, 0, 'gültig umgekehrt');
  pruefeGleich(b.jeVergleich.get('K1').length, 15, 'K1 hat 15 Teile'); pruefeGleich(b.jeVergleich.get('K2').length, 15, 'K2 hat 15 Teile');
  pruefe(b.jeVergleich.get('K1').every(x => x.daten.konfig.A.startsWith('mctsFixedSims=120')), 'K1 nur aus 120 gegen 240');
});

test('Regel 1: fehlender, doppelter und fremder Seed, unbekannte Stufe', () => {
  const t = stufe1();
  pruefe(regel(W.pruefe(A1, W.STUFE1, t.slice(1)).gruende, 1).some(g => /fehlen.*11250001/.test(g)), 'fehlender Teil');
  const doppelt = [...t, teil(11250003, 120, 240)];
  pruefe(regel(W.pruefe(A1, W.STUFE1, doppelt).gruende, 1).some(g => /doppelt/.test(g)), 'doppelter Seed');
  const fremd = [...t.slice(1), teil(99, 120, 240)];
  pruefe(regel(W.pruefe(A1, W.STUFE1, fremd).gruende, 1).some(g => /Seed 99/.test(g)), 'fremder Seed');
  const falsch = [...t, teil(11250040, 120, 480)];
  pruefe(regel(W.pruefe(A1, W.STUFE1, falsch).gruende, 1).some(g => /passen zu keinem Vergleich/.test(g)), '120 gegen 480 gibt es nicht');
  const k2ImK1 = t.map(x => x.daten.konfig.seed === 11250016 ? teil(11250016, 120, 240) : x);
  pruefe(regel(W.pruefe(A1, W.STUFE1, k2ImK1).gruende, 1).length >= 2, 'K2-Seed unter K1 fällt in beiden Vergleichen auf');
});

test('Regel 2: Partienzahl, Farben, Abschluss, Rohdump', () => {
  const mit = (seed, opt) => stufe1().map(x => x.daten.konfig.seed === seed ? teil(seed, 120, 240, opt) : x);
  const g = o => regel(W.pruefe(A1, W.STUFE1, mit(11250002, o)).gruende, 2);
  pruefe(g({g: 80}).some(x => /80 Partien/.test(x)), 'zu wenige Partien');
  pruefe(g({aIst: () => 'Schwarz'}).some(x => /82-mal Schwarz/.test(x)), 'Farben nicht ausgeglichen');
  pruefe(g({abgeschlossen: false}).some(x => /nicht abgeschlossen/.test(x)), 'nicht abgeschlossen');
  pruefe(g({roh: null}).some(x => /kein Rohdump/.test(x)), 'Rohdump fehlt');
  pruefe(g({rohN: 81}).some(x => /Rohdump 81/.test(x)), 'Rohdump kürzer');
  pruefeGleich(g({}).length, 0, 'unverändert gültig');
});

test('Jede Partie einzeln (§13.4): jeder Fehler ergibt KEIN URTEIL', () => {
  /* Partie 1 (Index 0) spielt A als Schwarz und gewinnt B (siegeB 50): sieger B, siegerFarbe W. */
  const keinUrteil = (aendern, muster, name, index = 0) => {
    const t = stufe1().map(x => x.daten.konfig.seed === 11250003
      ? teil(11250003, 120, 240, {partie: (p, i) => { if (i === index) aendern(p); }}) : x);
    const gr = ohneRegel4(W.pruefe(A1, W.STUFE1, t).gruende);
    pruefe(gr.length > 0 && regel(gr, 2).some(x => muster.test(x)), `${name}: ${gr.join(' | ') || 'kein Grund'}`);
    pruefe(/KEIN URTEIL/.test(W.bericht(A1, W.STUFE1, null, gr)), `${name}: Bericht sagt KEIN URTEIL`);
  };
  /* Die beiden gemeldeten Fälle. Vorher zählte ein fehlender Sieger als Niederlage von B, und
     eine unbekannte Farbe ging in der Farbprüfung als Weiß durch (41 Schwarz, 41 „nicht Schwarz“). */
  keinUrteil(p => { delete p.sieger; }, /Partie 1: sieger fehlt/, 'sieger fehlt');
  keinUrteil(p => { p.sieger = 'remis'; }, /sieger "remis"/, 'sieger unbekannt');
  keinUrteil(p => { p.aIst = 'schwarz'; }, /Partie 1: aIst "schwarz"/, 'aIst unbekannt');
  keinUrteil(p => { delete p.aIst; }, /aIst fehlt/, 'aIst fehlt');
  /* Genau der gemeldete Fall: Partie 2 spielt A als Weiß; ihr Wert wird unbekannt. Die alte
     Prüfung zählte nur „Schwarz“ und sah weiter 41 : 41. */
  keinUrteil(p => { p.aIst = 'X'; }, /Partie 2: aIst "X"/, 'aIst unbekannt statt Weiß', 1);
  /* Darüber hinaus: ein erlaubter, aber falscher Wert und die Kette Stand → Farbe → Arm. */
  keinUrteil(p => { p.sieger = 'A'; }, /sieger A passt nicht zu siegerFarbe W bei A als Schwarz \(dann gewinnt B\)/, 'sieger vertauscht');
  keinUrteil(p => { delete p.siegerFarbe; }, /siegerFarbe fehlt/, 'siegerFarbe fehlt');
  keinUrteil(p => { p.aufgabe = 'S'; }, /aufgabe "S"/, 'Aufgabe trotz Aufgabe aus');
  keinUrteil(p => { delete p.aufgabe; }, /aufgabe fehlt/, 'aufgabe fehlt');
  keinUrteil(p => { p.stand = 'B NaN : W NaN'; }, /keine zwei endlichen Zahlen/, 'Stand NaN (der Harness bucht ihn als Sieg von Weiß)');
  keinUrteil(p => { p.stand = 'B 190 : W 177.5'; }, /ergibt nicht siegerFarbe W/, 'Stand widerspricht der Farbe');
  keinUrteil(p => { p.zuege = 601; }, /zuege 601/, 'mehr Züge als das Zuglimit');
  keinUrteil(p => { delete p.zuege; }, /zuege fehlt/, 'zuege fehlt');
  /* Viele fehlerhafte Partien: drei Beispiele und die Zahl der übrigen. */
  const t = stufe1().map(x => x.daten.konfig.seed === 11250004
    ? teil(11250004, 120, 240, {partie: p => { delete p.sieger; }}) : x);
  const gr = regel(W.pruefe(A1, W.STUFE1, t).gruende, 2);
  pruefe(gr.some(x => /82 Partien sind nicht auswertbar/.test(x) && /und 79 weitere/.test(x)), 'Zusammenfassung');
  pruefeGleich(W.partieFehler(teil(11250001, 120, 240).daten.partien[5]), null, 'eine saubere Partie hat keinen Fehler');
});

test('Regel 3: Parameter, Aufgabe, Komi, Modus, Zuglimit', () => {
  const mit = opt => stufe1().map(x => x.daten.konfig.seed === 11250020 ? teil(11250020, 240, 480, opt) : x);
  const g = o => regel(W.pruefe(A1, W.STUFE1, mit(o)).gruende, 3);
  pruefe(g({armA: 'mctsFixedSims=240,resignEnabled=0,evalStreuung=1', armB: 'mctsFixedSims=480,resignEnabled=0,evalStreuung=1'})
    .some(x => /setzt \[evalStreuung/.test(x)), 'zusätzlicher Schlüssel in beiden Armen');
  pruefe(g({armA: 'mctsFixedSims=240,resignEnabled=1'}).some(x => /resignEnabled 1/.test(x)), 'Aufgabe an');
  pruefe(g({komi: 6.5}).some(x => /Komi 6.5/.test(x)), 'Komi');
  pruefe(g({modus: 'paired'}).some(x => /Modus paired/.test(x)), 'Paarmodus');
  pruefe(g({zuglimit: 400}).some(x => /Zuglimit 400/.test(x)), 'Zuglimit 400');
  pruefe(g({zuglimit: null}).some(x => /nicht belegt/.test(x)), 'Zuglimit fehlt im Log');
  pruefeGleich(W.zuglimitAusLog('Budget: 250 ms/Zug (fest) · Komi 7.5 · max 600 Züge · Seed 11250001'), 600, 'Kopfzeile des Harness');
  pruefeGleich(W.zuglimitAusLog('keine Kopfzeile'), null, 'ohne Kopfzeile null, nicht 0');
});

test('Regel 4: Commit und Engine-Blöcke', () => {
  const t = stufe1();
  pruefeGleich(regel(W.pruefe({...A1, commit: 'f'.repeat(40)}, W.STUFE1, t).gruende, 4).filter(g => /lief auf/.test(g)).length,
    30, 'jeder Teil auf falschem Commit');
  pruefe(regel(W.pruefe({...A1, commit: null}, W.STUFE1, t).gruende, 4).some(g => /nicht angegeben/.test(g)), 'Commit fehlt');
  const falsch = path.join(tmpdir(), 'falsch.html');
  fs.writeFileSync(falsch, '<script id="shared-go-logic">x</script><script id="worker-ai">y</script><script id="policy-net">z</script>');
  pruefeGleich(regel(W.pruefe({...A1, html: falsch}, W.STUFE1, t).gruende, 4).length, 3, 'alle drei Blöcke falsch');
  pruefe(regel(W.pruefe({...A1, html: null}, W.STUFE1, t).gruende, 4).some(g => /Kein Stand/.test(g)), 'Stand fehlt');
});

test('Regel 5: Anomalien konservativ als Summe beider Arme', () => {
  const mit = n => stufe1().map(x => x.daten.konfig.seed === 11250005 ? teil(11250005, 120, 240, {anomalien: n}) : x);
  pruefeGleich(regel(W.pruefe(A1, W.STUFE1, mit(24)).gruende, 5).length, 0, '24 von 1230 (1,95 %) erlaubt');
  pruefe(regel(W.pruefe(A1, W.STUFE1, mit(25)).gruende, 5).some(g => /25 Anomalien/.test(g)), '25 von 1230 (2,03 %) nicht');
  pruefe(regel(W.pruefe(A1, W.STUFE1, mit(null)).gruende, 5).some(g => /kein Log/.test(g)), 'ohne Log ungeprüft');
});

test('Eine extreme Siegrate je Teillauf ist kein Gültigkeitsgrund', () => {
  const t = stufe1().map(x => x.daten.konfig.seed === 11250007 ? teil(11250007, 120, 240, {siegeB: 82}) : x);
  pruefeGleich(ohneRegel4(W.pruefe(A1, W.STUFE1, t).gruende).length, 0, '82 : 0 in einem Teillauf bleibt gültig');
});

test('Stufe 2: K3 = N gegen 2N, Seeds aus §7.2, Bedienfehler werfen', () => {
  const v = W.vergleiche({stufe: 2, n: 2700, partienJeTeil: 10})[0];
  pruefeGleich(v.name, 'K3', 'Name'); pruefeGleich(v.a, 2700, 'A = N'); pruefeGleich(v.b, 5400, 'B = 2N');
  pruefeGleich(v.seeds.length, 123, '1230 / 10 Teilläufe'); pruefeGleich(v.seeds[0], 11260001, 'erster Seed'); pruefeGleich(v.seeds[122], 11260123, 'letzter Seed');
  const w = W.vergleiche({stufe: 2, n: 2800, partienJeTeil: 10})[0];
  pruefe(w.a === 2800 && w.b === 5600, 'Grenztest aus §15: N = 2800 → 2800 → 5600');
  pruefeGleich(W.vergleiche({stufe: 2, n: 100, partienJeTeil: 1230})[0].b, 200, 'kleinstes N');
  pruefeGleich(W.vergleiche({stufe: 1, n: 2700}), W.STUFE1, 'Stufe 1 nimmt N nur für die Kosten');
  let geworfen = 0;
  const falsch = [{stufe: 2, n: 2750, partienJeTeil: 10}, {stufe: 2, n: 0, partienJeTeil: 10},
                  {stufe: 2, n: NaN, partienJeTeil: 10}, {stufe: 2, partienJeTeil: 10}, {stufe: 2, n: 2700.5, partienJeTeil: 10},
                  {stufe: 2, n: 2700, partienJeTeil: 12}, {stufe: 1, n: 150}, {stufe: 3}];
  for (const x of falsch) try { W.vergleiche(x); } catch (e) { geworfen++; }
  pruefeGleich(geworfen, falsch.length, 'kein Vielfaches von 100, unter 100, fehlend, ungerader Teiler, Stufe 3');
  const t = v.seeds.map(s => teil(s, 2700, 5400, {g: 10, siegeB: 6}));
  const a = {stufe: 2, n: 2700, commit: COMMIT, html: null, markdown: true, k2: {siege: 700, n: 1230}};
  const p = W.pruefe(a, [v], t);
  pruefeGleich(ohneRegel4(p.gruende).length, 0, 'vollständige Stufe 2 gültig');
  const erg = W.ergebnisse(a, [v], p.jeVergleich);
  pruefe(erg.k2 && Number.isFinite(erg.k2.D) && erg.kosten === null && erg.f2 === null, 'Stufe 2: Abstand zu K2, kein F2, keine Kosten');
  const text = W.bericht(a, [v], erg, []);
  pruefe(text.includes('K3 2700 → 5400') && text.includes('2,49 Verdopplungen ungemessen'), 'Bericht nennt K3 und die Lücke zu K2');
});

test('Stufe 2: Lage von K3 zu K2 (§7.4)', () => {
  pruefeGleich(W.lageZuK2(480), 'K3 schließt unmittelbar an K2 an.', 'N = 480');
  pruefe(W.lageZuK2(960).includes('ein Abstand von 1 Verdopplung ungemessen'), 'N = 960: eine Verdopplung, Einzahl');
  pruefe(W.lageZuK2(2700).includes('2,49 Verdopplungen'), 'N = 2700: log2(2700 / 480)');
  pruefeGleich(W.lageZuK2(300), 'K3 überschneidet sich mit K2 (240 → 480).', 'N = 300');
  pruefeGleich(W.lageZuK2(120), 'K3 endet dort, wo K2 beginnt.', 'N = 120');
  pruefe(W.lageZuK2(100).includes('0,26 Verdopplungen'), 'N = 100: unterhalb von K2');
});

test('Kostenschätzung aus §7.3', () => {
  const r1 = {a: 120, b: 240, minJePartie: 0.69}, r2 = {a: 240, b: 480, minJePartie: 1.37};
  const k = W.kosten(r1, r2);
  pruefeNah(k.b, 0.68 / 180, 1e-12, 'Steigung je Simulation');
  pruefe(k.belastbar, 'Steigung positiv');
  pruefeGleich(k.zeilen.map(z => z.von).join(), W.KOSTEN_N.join(), 'feste Reihe ohne N');
  pruefe(k.zeilen.every(z => z.bis === 2 * z.von && !z.ausStufeG), 'K3 = N → 2N, keine Zeile markiert');
  const mitN = W.kosten(r1, r2, 2700);
  pruefeGleich(mitN.zeilen.map(z => z.von).join(), '1000,1500,2000,2500,2700,3000,3500,4000', 'N aus Stufe G einsortiert');
  pruefeGleich(mitN.zeilen.filter(z => z.ausStufeG).map(z => z.von).join(), '2700', 'genau diese Zeile markiert');
  pruefeGleich(W.kosten(r1, r2, 3000).zeilen.length, W.KOSTEN_N.length, 'N aus der Reihe: keine doppelte Zeile');
  const z = mitN.zeilen.find(x => x.von === 2700);
  pruefeNah(z.jePartie, k.a + k.b * 4050, 1e-12, 'Minuten je Partie bei 2700 → 5400');
  pruefeGleich(z.g, 10, 'größter gerader Teiler mit höchstens 200 Minuten');
  pruefeGleich(z.teile, 123, 'Teilläufe');
  pruefeNah(z.rechenStunden, 1230 * z.jePartie / 60, 1e-9, 'Rechenstunden');
  pruefeNah(z.wanduhrStunden, 7 * 10 * z.jePartie / 60, 1e-9, 'sieben Wellen zu 20 Jobs');
  const z1 = mitN.zeilen.find(x => x.von === 1000);
  pruefeGleich(z1.g, 30, 'bei 1000 → 2000 passen 30 Partien in 200 Minuten');
  pruefe(!W.kosten({...r1, minJePartie: 2}, r2).belastbar, 'fallende Laufzeit ist nicht belastbar');
});

test('Bericht: über 5 % am Zuglimit zusätzlich ohne diese Partien', () => {
  const t = stufe1(50, 47, {zuege: i => (i < 6 ? 600 : 370)});
  const a = {...A1, markdown: true};
  const p = W.pruefe(a, W.STUFE1, t);
  pruefeGleich(ohneRegel4(p.gruende).length, 0, 'sonst gültig');
  const erg = W.ergebnisse(a, W.STUFE1, p.jeVergleich);
  pruefeGleich(erg.f1[0].amLimit, 90, '6 je Teil · 15 Teile am Zuglimit');
  const text = W.bericht(a, W.STUFE1, erg, []);
  pruefe(/ohne diese Partien/.test(text), 'Zusatzzeile erscheint');
  pruefeGleich(erg.ohneLimit.K1.n, 1140, 'ohne die 90 Partien am Limit');
});

function schreibeTeile(t, dir) {
  return t.map(x => {
    const j = path.join(dir, x.name), r = j.replace('.json', '.jsonl'), l = j.replace('.json', '.log');
    fs.writeFileSync(j, JSON.stringify(x.daten));
    fs.writeFileSync(r, x.roh.join('\n') + '\n');
    fs.writeFileSync(l, `Budget: 250 ms/Zug (fest) · Komi 7.5 · max ${x.zuglimit} Züge · Seed ${x.daten.konfig.seed}\n`);
    return ['--teil', `${j},${r},${l}`];
  }).flat();
}

test('Ende zu Ende: gültiger Lauf über die Befehlszeile', () => {
  if (!engineWieFestgelegt()) return {skip: 'Engine-Blöcke nicht mehr wie in §6 der Skalierungsfestlegung'};   /* Regel 4 lässt sich nur am Stand aus §6 positiv prüfen */
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'gut-'));
  const args = schreibeTeile(stufe1(50, 47, {min1: 0.69, min2: 1.37}), dir);
  const r = spawnSync(process.execPath, [SKRIPT, '--stufe', '1', '--commit', COMMIT, '--html', HTML, '--markdown', '--n', '2700', ...args], {encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Exit 0');
  pruefe(r.stdout.includes('**2700 → 5400 (N aus Stufe G)**'), 'Kostenzeile für das N aus Stufe G');
  pruefe(/\*\*GÜLTIG\.\*\*/.test(r.stdout), 'GÜLTIG');
  pruefe(r.stdout.includes('Eine Verdopplung von 120 auf 240 Simulationen bringt dem heutigen Default nachweisbar Stärke'), 'F1-Satz für K1');
  pruefe(r.stdout.includes('Ein Unterschied zwischen den beiden Gewinnen ist nicht nachgewiesen'), 'F2-Satz');
  pruefe(r.stdout.includes('Kostenschätzung für Stufe 2'), 'Kostenschätzung');
});

test('Ende zu Ende: ungültiger Lauf endet mit Exit 1 und rechnet nichts', () => {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'schlecht-'));
  const args = schreibeTeile(stufe1().slice(1), dir);
  const r = spawnSync(process.execPath, [SKRIPT, '--stufe', '1', '--commit', COMMIT, '--html', HTML, ...args], {encoding: 'utf8'});
  pruefeGleich(r.status, 1, 'Exit 1');
  pruefe(/KEIN URTEIL/.test(r.stdout) && /Regel 1/.test(r.stdout), 'KEIN URTEIL mit Regel 1');
  pruefe(!/F2: Abflachung/i.test(r.stdout), 'keine Rechnung');
  for (const n of ['2750', '50', '2700.5', '']) {
    const bedien = spawnSync(process.execPath, [SKRIPT, '--stufe', '2', '--n', n, '--partien-je-teil', '10', ...args], {encoding: 'utf8'});
    pruefeGleich(bedien.status, 2, `Bedienfehler --n '${n}': Exit 2`);
  }
  const alt = spawnSync(process.execPath, [SKRIPT, '--stufe', '2', '--k', '4', '--partien-je-teil', '10', ...args], {encoding: 'utf8'});
  pruefeGleich(alt.status, 2, 'die alte Option --k gibt es nicht mehr: Exit 2');
});

laufeTests('Skalierungsbericht').then(ok => {
  if (TMP) fs.rmSync(TMP, {recursive: true, force: true});
  process.exit(ok ? 0 : 1);
});
