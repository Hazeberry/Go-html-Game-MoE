// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Auswertungsskript der Rauschterm-Messung (auswertung/eval-streuung-bericht.js).

   Das Skript entscheidet, ob ein Messlauf ein Urteil trägt. Ein stiller Fehler darin
   erzeugt keine Fehlermeldung, sondern eine falsche Zahl im Dokument — deshalb wird jede
   der fünf Gültigkeitsregeln aus docs/eval-streuung-vorabfestlegung.md §6 einzeln daran
   vorbeigeführt und muss anschlagen.

   Geprüft wird:
     1. Ein sauberer Lauf ist gültig und liefert die vorab festgelegten Endpunkte.
     2. Jede der fünf Regeln schlägt an, wenn sie verletzt ist — und nur dann.
     3. Die Statistik stimmt an von Hand nachrechenbaren Werten (exakter Binomialtest,
        Clopper-Pearson gegen den Lehrbuchwert, Elo).
     4. Die Nebenendpunkte zählen das, was sie behaupten: verschiedene Endstellungen über
        den ganzen Lauf, Partielänge, Aufgaben, Anomalien.
     5. Die Lesart aus §6 wird wörtlich angewandt, in allen drei Richtungen.

   Aufruf:  node tests/eval-streuung-bericht.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const W = require('../auswertung/eval-streuung-bericht.js');

const SPEC_A = 'mctsFixedSims=120,resignEnabled=0,evalStreuung=1';
const SPEC_B = 'mctsFixedSims=120,resignEnabled=0,evalStreuung=0';
const SEEDS = [20261123, 20261124, 20261125, 20261126];

let TMP;
function tmpdir() {
  if (!TMP) TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'eval-streuung-'));
  return TMP;
}

/* Ein Teillauf wie ab-harness.js ihn schreibt: bSiege Siege für B unter n Partien,
   Farben abwechselnd wie im Standardmodus. */
function teil(nr, seed, n, bSiege, opt = {}) {
  const partien = [];
  for (let i = 0; i < n; i++) {
    const bGewinnt = i < bSiege;
    partien.push({
      partie: i + 1,
      aIst: i % 2 === 0 ? 'Schwarz' : 'Weiß',
      sieger: bGewinnt ? 'B' : 'A',
      siegerFarbe: 'S',
      aufgabe: opt.aufgaben && i < opt.aufgaben ? 'S' : null,
      zuege: 300 + i
    });
  }
  const json = {
    partien,
    konfig: {A: opt.specA || SPEC_A, B: opt.specB || SPEC_B, komi: 7.5, seed,
             modus: 'standard', dauerMin: 60, abgeschlossen: opt.abgeschlossen !== false}
  };
  const d = tmpdir();
  const jsonPfad = path.join(d, `t${nr}.json`);
  const rohPfad = path.join(d, `t${nr}.jsonl`);
  const logPfad = path.join(d, `t${nr}.log`);
  fs.writeFileSync(jsonPfad, JSON.stringify(json));
  /* Rohdump: eigener Hash je Partie, ausser den ersten `gleicheHashes` */
  const zeilen = partien.map((p, i) => JSON.stringify({
    nr: i + 1,
    armSchwarz: p.aIst === 'Schwarz' ? 'A' : 'B',
    armWeiss: p.aIst === 'Schwarz' ? 'B' : 'A',
    final_board_hash: (opt.gleicheHashes && i < opt.gleicheHashes) ? 'gleich' : `h${nr}-${i}`,
    sieger: 'S', zuege: p.zuege, aufgabe: p.aufgabe
  }));
  fs.writeFileSync(rohPfad, zeilen.join('\n') + '\n');
  fs.writeFileSync(logPfad, opt.anomalien
    ? `Partien fertig\n⚠ ${opt.anomalien} illegale KI-Züge abgefangen (als Pass gewertet) — bitte melden!\n`
    : 'Partien fertig, nichts Auffaelliges\n');
  return [jsonPfad, rohPfad, logPfad];
}

function argumente(teile, opt = {}) {
  return {
    teile, name: 'T', partien: opt.partien === undefined ? 360 : opt.partien,
    seeds: opt.seeds === undefined ? SEEDS : opt.seeds,
    streuungA: opt.streuungA === undefined ? 1 : opt.streuungA,
    streuungB: opt.streuungB === undefined ? 0 : opt.streuungB,
    engineVergleich: opt.engineVergleich === undefined ? '45286526826' : opt.engineVergleich,
    markdown: false, html: opt.html || 'index.html'
  };
}
/* Derselbe Weg wie im Skript: lesen, prüfen, rechnen. */
function lauf(teile, opt = {}) {
  const a = argumente(teile, opt);
  const gelesen = teile.map(([j, r, l]) => ({
    json: path.basename(j), jsonPfad: j, rohPfad: r, logPfad: l,
    daten: JSON.parse(fs.readFileSync(j, 'utf8')),
    roh: r ? fs.readFileSync(r, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)) : null,
    anomalien: l ? W.anomalienAusLog(l) : null
  }));
  const gruende = W.pruefeGueltigkeit(a, gelesen);
  return {a, teile: gelesen, gruende, r: gruende.length ? null : W.rechne(gelesen)};
}
/* Vier saubere Teile zu je 90 Partien, zusammen 360, mit bSiege Siegen fuer B. */
function sauber(bSiege, opt = {}) {
  const je = [0, 0, 0, 0];
  let rest = bSiege;
  for (let i = 0; i < 4; i++) { je[i] = Math.min(90, rest); rest -= je[i]; }
  return SEEDS.map((s, i) => teil(i + 1, s, 90, je[i], opt));
}

test('Ein sauberer Lauf ist gültig und zählt richtig zusammen', () => {
  const {gruende, r} = lauf(sauber(200));
  pruefeGleich(gruende.length, 0, 'keine Gründe: ' + gruende.join(' | '));
  pruefeGleich(r.n, 360, 'Partien');
  pruefeGleich(r.bSiege, 200, 'Siege B');
  pruefeGleich(r.aSiege, 160, 'Siege A');
  pruefeNah(r.rate, 200 / 360, 1e-12, 'Siegrate');
});

test('Statistik: exakter Test, Clopper-Pearson und Elo an nachrechenbaren Werten', () => {
  /* 200:160 ist die Grenze, an der p unter 0,05 rutscht — von Hand nachgerechnet 0,0397 */
  const {r} = lauf(sauber(200));
  pruefeNah(r.p, 0.0397, 5e-4, 'p bei 200:160');
  pruefe(r.p < 0.05, 'p bei 200:160 ist signifikant');
  /* Gleichstand: p muss genau 1 sein */
  pruefeGleich(lauf(sauber(180)).r.p, 1, 'p bei 180:180');
  /* Elo: 400*log10(1) = 0 bei Gleichstand, und 400*log10(3) = 190,849 bei 75 % */
  pruefeNah(lauf(sauber(180)).r.elo, 0, 1e-9, 'Elo bei 180:180');
  pruefeNah(W.elo(0.75), 190.8485, 1e-3, 'Elo bei 75 %');
  /* Clopper-Pearson, Lehrbuchwert fuer 2 von 20: [0,0123; 0,3170] */
  const {clopperPearson} = require('../auswertung/kandidaten-orakel/haupt-bericht.js');
  const ci = clopperPearson(2, 20, 0.05);
  pruefeNah(ci[0], 0.0123, 5e-4, 'Clopper-Pearson unten');
  pruefeNah(ci[1], 0.3170, 5e-4, 'Clopper-Pearson oben');
  /* Das Intervall muss die Rate einschliessen und das Elo-Intervall die Elo-Zahl */
  pruefe(r.ci[0] < r.rate && r.rate < r.ci[1], 'Intervall schliesst die Rate ein');
  pruefe(r.eloCi[0] < r.elo && r.elo < r.eloCi[1], 'Elo-Intervall schliesst Elo ein');
});

test('Lesart aus §6, alle drei Richtungen', () => {
  pruefeGleich(W.urteil(lauf(sauber(180)).r), 'KEIN NACHWEISBARER UNTERSCHIED', 'Gleichstand');
  pruefeGleich(W.urteil(lauf(sauber(220)).r), 'B GEWINNT (weniger Rauschen ist stärker)', 'B vorn');
  pruefeGleich(W.urteil(lauf(sauber(140)).r), 'A GEWINNT (das Rauschen hilft)', 'A vorn');
});

test('Regel 1: ohne benannten Engine-Vergleich kein Urteil', () => {
  const {gruende} = lauf(sauber(200), {engineVergleich: null});
  pruefe(gruende.some(g => g.startsWith('Regel 1')), 'Regel 1 schlägt an: ' + gruende.join(' | '));
});

test('Regel 2: ein zweiter Unterschied zwischen den Armen kippt den Lauf', () => {
  /* B bekommt zusätzlich ein anderes mctsFixedSims — genau der Fall, den die Regel meint */
  const teile = SEEDS.map((s, i) => teil(i + 1, s, 90, 50,
    {specB: 'mctsFixedSims=240,resignEnabled=0,evalStreuung=0'}));
  const {gruende} = lauf(teile);
  pruefe(gruende.some(g => g.startsWith('Regel 2') && g.includes('mctsFixedSims')),
    'Regel 2 nennt den zweiten Unterschied: ' + gruende.join(' | '));
});

test('Regel 2: gleicher evalStreuung in beiden Armen kippt den Lauf ebenfalls', () => {
  const teile = SEEDS.map((s, i) => teil(i + 1, s, 90, 50, {specB: SPEC_A}));
  const {gruende} = lauf(teile);
  pruefe(gruende.some(g => g.startsWith('Regel 2')), 'Regel 2 schlägt an: ' + gruende.join(' | '));
});

test('Regel 2: ein Teil mit anderer Armkonfiguration als die übrigen', () => {
  const teile = sauber(200);
  const abweichend = teil(9, SEEDS[3], 90, 50, {specA: 'mctsFixedSims=120,resignEnabled=0,evalStreuung=1.0'});
  teile[3] = abweichend;
  const {gruende} = lauf(teile);
  pruefe(gruende.some(g => g.startsWith('Regel 2')), 'Regel 2 schlägt an: ' + gruende.join(' | '));
});

test('Regel 3: zu wenige Partien, nicht abgeschlossen, doppelter und fremder Seed', () => {
  const kurz = lauf(SEEDS.map((s, i) => teil(i + 1, s, 80, 40)));
  pruefe(kurz.gruende.some(g => g.includes('320 Partien insgesamt')), 'Partienzahl: ' + kurz.gruende.join(' | '));

  const offen = lauf(SEEDS.map((s, i) => teil(i + 1, s, 90, 45, {abgeschlossen: i !== 2})));
  pruefe(offen.gruende.some(g => g.includes('nicht abgeschlossen')), 'abgeschlossen: ' + offen.gruende.join(' | '));

  const doppelt = lauf([0, 1, 2, 3].map(i => teil(i + 1, SEEDS[Math.min(i, 2)], 90, 45)));
  pruefe(doppelt.gruende.some(g => g.includes('kommt zweimal vor')), 'doppelter Seed: ' + doppelt.gruende.join(' | '));

  const fremd = lauf([...sauber(200).slice(0, 3), teil(8, 999, 90, 45)]);
  pruefe(fremd.gruende.some(g => g.includes('Seed 999 kommt vor')), 'fremder Seed: ' + fremd.gruende.join(' | '));
  pruefe(fremd.gruende.some(g => g.includes(`Seed ${SEEDS[3]} ist vorab festgelegt`)), 'fehlender Seed');
});

test('Regel 3: Rohdump und Teil müssen gleich viele Partien haben', () => {
  const teile = sauber(200);
  const [j, r, l] = teile[0];
  const zeilen = fs.readFileSync(r, 'utf8').trim().split('\n');
  fs.writeFileSync(r, zeilen.slice(0, 50).join('\n') + '\n');
  const {gruende} = lauf([[j, r, l], ...teile.slice(1)]);
  pruefe(gruende.some(g => g.includes('der Rohdump')), 'Regel 3 vergleicht Rohdump: ' + gruende.join(' | '));
});

test('Regel 4: ein geänderter Engine-Block kippt den Lauf', () => {
  const d = tmpdir();
  const gefaelscht = path.join(d, 'index-geaendert.html');
  const h = fs.readFileSync('index.html', 'utf8');
  /* Eine einzige Ziffer im Engine-Block aendern: der Block ist dann nicht mehr der
     dokumentierte Stand, und genau das soll Regel 4 bemerken. */
  const vorher = 'evalStreuung:    1.00,';
  pruefe(h.includes(vorher), 'Anker in index.html gefunden');
  fs.writeFileSync(gefaelscht, h.replace(vorher, 'evalStreuung:    1.01,'));
  const {gruende} = lauf(sauber(200), {html: gefaelscht});
  pruefe(gruende.some(g => g.startsWith('Regel 4') && g.includes('worker-ai')),
    'Regel 4 nennt worker-ai: ' + gruende.join(' | '));
  /* Und das echte index.html muss die dokumentierten Summen tragen */
  const ist = W.blocksummen('index.html');
  for (const [block, soll] of Object.entries(W.BLOCKSUMMEN))
    pruefeGleich(ist[block], soll, 'Blocksumme ' + block);
});

test('Regel 5: Anomalien über 2 Prozent kippen den Lauf, darunter nicht', () => {
  /* 2 % von 360 sind 7,2 — acht Anomalien sind zu viel, sieben nicht */
  const viele = lauf(SEEDS.map((s, i) => teil(i + 1, s, 90, 45, {anomalien: i === 0 ? 8 : 0})));
  pruefe(viele.gruende.some(g => g.startsWith('Regel 5')), 'acht Anomalien kippen: ' + viele.gruende.join(' | '));
  const wenige = lauf(SEEDS.map((s, i) => teil(i + 1, s, 90, 45, {anomalien: i === 0 ? 7 : 0})));
  pruefeGleich(wenige.gruende.length, 0, 'sieben Anomalien kippen nicht: ' + wenige.gruende.join(' | '));
  pruefeGleich(wenige.r.anomalien, 7, 'Anomalien werden ausgewiesen');
});

test('Regel 5: ohne Log ist die Regel ungeprüft, also kein Urteil', () => {
  const teile = sauber(200).map(([j, r]) => [j, r]);   /* Log weglassen */
  const {gruende} = lauf(teile);
  pruefe(gruende.some(g => g.startsWith('Regel 5') && g.includes('kein Log')),
    'fehlendes Log ist ein Grund: ' + gruende.join(' | '));
});

test('Keine Zeile ohne Warnung heißt null Anomalien, nicht unbekannt', () => {
  const [, , log] = teil(7, SEEDS[0], 1, 0);
  pruefeGleich(W.anomalienAusLog(log), 0, 'Log ohne Warnzeile');
  const [, , log2] = teil(7, SEEDS[0], 1, 0, {anomalien: 3});
  pruefeGleich(W.anomalienAusLog(log2), 3, 'Log mit Warnzeile');
});

test('Nebenendpunkte: verschiedene Endstellungen, Länge, Aufgaben', () => {
  /* In jedem der vier Teile tragen die ersten 10 Partien denselben Hash: aus 360
     Partien werden damit 4*80 eigene plus 4 gemeinsame, also 324. */
  const {r} = lauf(SEEDS.map((s, i) => teil(i + 1, s, 90, 45, {gleicheHashes: 10})));
  pruefeGleich(r.n, 360, 'Partien');
  pruefeGleich(r.verschieden, 4 * 80 + 1, 'verschiedene Endstellungen (der Hash "gleich" zählt einmal)');
  pruefeGleich(r.zuegeMin, 300, 'kürzeste Partie');
  pruefeGleich(r.zuegeMax, 389, 'längste Partie');
  pruefeNah(r.zuegeMittel, 344.5, 0.01, 'mittlere Länge');
  /* Aufgaben werden gezählt und ausgewiesen, auch wenn sie null sind */
  pruefeGleich(r.aufgaben, 0, 'Aufgaben bei resignEnabled=0');
  const mitAufgaben = lauf(SEEDS.map((s, i) => teil(i + 1, s, 90, 45, {aufgaben: 2})));
  pruefeGleich(mitAufgaben.r.aufgaben, 8, 'Aufgaben werden gezählt, wenn es welche gibt');
});

test('Farbtrennung: B spielt in der Hälfte der Partien Schwarz', () => {
  const {r} = lauf(sauber(200));
  pruefeGleich(r.nBSchwarz + r.nBWeiss, 360, 'alle Partien einer Farbe zugeordnet');
  pruefeGleich(r.nBSchwarz, 180, 'B als Schwarz in der Hälfte');
  pruefeGleich(r.bAlsSchwarz + r.bAlsWeiss, r.bSiege, 'Siege je Farbe summieren auf');
});

test('Der Bericht nennt bei KEIN URTEIL jeden Grund und rechnet nichts', () => {
  const {a, teile, gruende} = lauf(sauber(200), {engineVergleich: null});
  const t = W.bericht(a, teile, null, gruende, true);
  pruefe(t.includes('KEIN URTEIL'), 'Urteilszeile');
  for (const g of gruende) pruefe(t.includes(g), 'Grund steht im Bericht: ' + g);
  pruefe(!t.includes('Siegrate'), 'keine Zahlen bei KEIN URTEIL');
});

test('Der Bericht nennt bei GÜLTIG alle vorab festgelegten Endpunkte', () => {
  const {a, teile, gruende, r} = lauf(sauber(200));
  pruefeGleich(gruende.length, 0, 'gültig');
  const t = W.bericht(a, teile, r, gruende, true);
  for (const s of ['Siegrate von B', 'Clopper-Pearson', 'Elo-Differenz', 'Urteil nach der Lesart in §6',
                   'Partielänge', 'Aufgaben', 'Anomalien', 'Verschiedene Endstellungen', 'Seeds'])
    pruefe(t.includes(s), 'Bericht nennt: ' + s);
  /* Der Vorbehalt aus §10.8 muss dabeistehen, nicht nur im Quelltext */
  pruefe(t.includes('nicht je Arm'), 'Bericht nennt den Vorbehalt zur Aufteilung je Arm');
});

laufeTests('Bericht der Rauschterm-Messung (eval-streuung-bericht.js)').then(ok => {
  if (TMP) try { fs.rmSync(TMP, {recursive: true, force: true}); } catch (e) { /* Aufräumen ist Kür */ }
  process.exit(ok ? 0 : 1);
});
