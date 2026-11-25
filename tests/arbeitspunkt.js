// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Arbeitspunkt-Werkzeug der Skalierungsmessung (auswertung/arbeitspunkt.js,
   docs/skalierung-heute-vorabfestlegung.md §4 und §7.1).

   Geprüft wird:
     1. Die Regel aus §7.1 (Fassung nach §15) an den Grenzen: N = S auf volle Hundert
        gerundet, x50 aufwärts; K3 = N gegen 2N; unter N = 100 entfällt Stufe 2. Grenztest
        aus der Entscheidung: S = 2749 → 2700 → 5400, S = 2750 → 2800 → 5600.
     2. Median und Perzentil wie im Kopf des Skripts beschrieben.
     3. Die Suchzeit kommt aus zeiten.sucheMs, nicht aus Simulationen × msProSim.
     4. Jede der fünf Regeln aus §4.2 schlägt an, wenn sie verletzt ist; Regel 4 auch bei einem
        KI-Steinzug ohne Simulationszahl (§13.4), der vorher still aus S herausfiel.
     5. Ende zu Ende über die Befehlszeile.

   Aufruf:  node tests/arbeitspunkt.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const W = require('../auswertung/arbeitspunkt.js');
const {BLOCKSUMMEN} = require('../auswertung/skalierung-bericht.js');
const {blocksummen} = require('../auswertung/eval-streuung-bericht.js');

const HTML = path.join(__dirname, '..', 'index.html');
const SKRIPT = path.join(__dirname, '..', 'auswertung', 'arbeitspunkt.js');
const SEIT = '2026-11-26T08:00:00Z';
const ERSTELLT = '2026-11-26T10:00:00Z';

/* Standardwerte ohne Engine-Ladung: eine kleine feste Tafel reicht für die Regel. */
const DEFAULTS = {mctsFixedSims: 0, resignEnabled: 1, evalStreuung: 1, aiTimeBudget: 1800};
const OK = {defaults: DEFAULTS, htmlSummen: BLOCKSUMMEN, seit: SEIT,
            bereitstellungen: [{sha: 'a'.repeat(40), zeit: '2026-11-26T08:01:00Z', bloecke: BLOCKSUMMEN}]};

/* Ein Fehlerbericht: n KI-Steinzüge (Züge 2, 4, …), Simulationen aus sims(i), Suchzeit
   sucheMs(i). msProSim ist absichtlich NICHT sucheMs / sims, damit sichtbar wird, woraus
   gerechnet wird. */
function bericht(opt = {}) {
  const n = opt.n === undefined ? 180 : opt.n;
  const sims = opt.sims || (i => 1000 + 10 * i), suche = opt.sucheMs || (i => 1500 + i);
  const kiDiagnose = [{zug: 1, typ: 'pass', info: 'Pass', dauerMs: 5, zeiten: null}];
  for (let i = 0; i < n; i++) {
    const s = sims(i), su = suche(i);
    const zug = opt.zug ? opt.zug(i) : 2 * (i + 1);
    kiDiagnose.push({zug, typ: 'stone', info: `MCTS ${s} Sims · 41% D4 · Q 0.52`,
      dauerMs: su + 200, budgetMs: 1800, msProSim: 9.99,
      zeiten: opt.ohneSuche && opt.ohneSuche(i) ? {netzMs: 0} : {gesamtMs: su + 150, vorMs: 100, netzMs: zug > 80 ? 106 : 0, sucheMs: su, nachMs: 50},
      nachrichtMs: 30, anwendenMs: 20});
  }
  return {meta: {erstellt: ERSTELLT, userAgent: 'Test', kiStufe: 'hard', workerNeustarts: 0, workerDead: false, ...(opt.meta || {})},
          reproduktion: {params: {...DEFAULTS, ...(opt.params || {})}}, kiDiagnose};
}
const gruende = (b, o = {}) => W.pruefe(b, {...OK, ...o});
const regel = (g, n) => g.filter(x => x.startsWith(`Regel ${n}:`));

test('Regel aus §7.1: N = S auf volle Hundert, K3 = N gegen 2N, an den Grenzen', () => {
  /* Grenztest aus der Entscheidung (§15): 2749 und 2750. Dazu die halben Werte, die ein Median
     ganzer Zahlen annehmen kann, die Referenzpartie (§14) und die untere Grenze. */
  const fall = [[2749, 2700], [2750, 2800], [2749.5, 2700], [2750.5, 2800], [2726, 2700], [2590, 2600],
                [2662, 2700], [2650, 2700], [2649.5, 2600], [1895, 1900], [149.5, 100], [150, 200],
                [50, 100], [49.5, 0], [0, 0]];
  for (const [S, N] of fall) pruefeGleich(W.stufeAusS(S).N, N, `N bei S = ${S}`);
  const a = W.stufeAusS(2749), b = W.stufeAusS(2750);
  pruefe(a.vergleich === 'K3' && a.von === 2700 && a.bis === 5400, 'S = 2749 → 2700 → 5400');
  pruefe(b.vergleich === 'K3' && b.von === 2800 && b.bis === 5600, 'S = 2750 → 2800 → 5600');
  pruefe(/2700 → 5400/.test(a.text) && /2800 → 5600/.test(b.text), 'Text nennt den Vergleich');
  pruefeGleich(W.stufeAusS(50).bis, 200, 'S = 50: kleinster Vergleich 100 → 200');
  for (const S of [49.5, 0]) {
    const r = W.stufeAusS(S);
    pruefe(r.vergleich === null && /entfällt/.test(r.text), `S = ${S}: Stufe 2 entfällt`);
  }
  /* Jeder Wert zwischen 2650 und 2749,5 in Halbschritten ergibt dieselbe Stufe: kein Sprung
     um eine ganze Verdopplung innerhalb eines Hunderters. */
  for (let S = 2650; S < 2750; S += 0.5) if (W.stufeAusS(S).N !== 2700) pruefe(false, `S = ${S} nicht bei 2700`);
});

test('Median und Perzentil', () => {
  const a = [10, 1, 9, 2, 8, 3, 7, 4, 6, 5];
  pruefeGleich(W.median(a), 5.5, 'Median bei gerader Zahl'); pruefeGleich(W.median([3, 1, 2]), 2, 'bei ungerader');
  pruefeGleich(W.perzentil(a, 0.10), 1, 'P10'); pruefeGleich(W.perzentil(a, 0.90), 9, 'P90');
  pruefeGleich(W.perzentil([7], 0.9), 7, 'ein Wert');
});

test('Suchzeit aus zeiten.sucheMs, nicht aus Simulationen × msProSim', () => {
  const r = W.auswerten(bericht());
  pruefeGleich(r.gesamt.n, 180, 'Steinzüge, ohne den Pass');
  pruefeNah(r.zeitkostenMs, W.median(Array.from({length: 180}, (_, i) => 1500 + i)), 1e-9, 'Median von sucheMs');
  pruefe(r.zeitkostenMs < 2000, 'nicht 9,99 ms × Simulationen (das wären über 10 000 ms)');
  pruefeNah(r.gesamt.restMedian, 200, 1e-9, 'Rest = dauerMs − sucheMs');
  pruefeGleich(r.ab.netzMedian, 106, 'Netz ab Zug 81');
  pruefeNah(r.S, W.median(Array.from({length: 180}, (_, i) => 1000 + 10 * i)), 1e-9, 'S = Median der Simulationen');
  pruefe(r.stufe.vergleich === 'K3' && r.stufe.N === 1900, 'S = 1895 → N = 1900 → K3');
  pruefeGleich(r.bis.n + r.ab.n, 180, 'bis und ab Zug 80 vollständig');
});

test('Gültig ohne Gründe', () => {
  pruefeGleich(gruende(bericht()).length, 0, 'keine Gründe');
});

test('Regel 1: nur Schwer', () => {
  pruefe(regel(gruende(bericht({meta: {kiStufe: 'medium'}})), 1).length === 1, 'Mittel ist ungültig');
});

test('Regel 2: Parameter gleich dem Standard, Stand mit den Prüfsummen aus §6', () => {
  pruefe(regel(gruende(bericht({params: {evalStreuung: 0.5}})), 2).some(g => /evalStreuung 0.5 statt 1/.test(g)), 'anderer Wert');
  const ohne = bericht(); delete ohne.reproduktion.params.aiTimeBudget;
  pruefe(regel(gruende(ohne), 2).some(g => /fehlen: aiTimeBudget/.test(g)), 'fehlender Schlüssel');
  pruefe(regel(gruende(bericht({params: {neu: 1}})), 2).some(g => /zusätzlich: neu/.test(g)), 'zusätzlicher Schlüssel');
  const kein = bericht(); delete kein.reproduktion;
  pruefe(regel(gruende(kein), 2).some(g => /keinen Parameter-Schnappschuss/.test(g)), 'Schnappschuss fehlt');
  pruefe(regel(gruende(bericht(), {htmlSummen: {...BLOCKSUMMEN, 'worker-ai': 'x'}}), 2).some(g => /worker-ai/.test(g)), 'anderer Stand');
});

test('Regel 3: Pages-Bereitstellungen im Fenster', () => {
  const b = bericht();
  pruefe(regel(gruende(b, {bereitstellungen: null}), 3).some(g => /Ungeprüft/.test(g)), 'ohne Liste ungeprüft');
  const schlecht = {sha: 'b'.repeat(40), zeit: '2026-11-26T09:00:00Z', bloecke: {...BLOCKSUMMEN, 'shared-go-logic': 'x'}};
  pruefe(regel(gruende(b, {bereitstellungen: [...OK.bereitstellungen, schlecht]}), 3).some(g => /shared-go-logic/.test(g)), 'falscher Stand im Fenster');
  const davor = {...schlecht, zeit: '2026-11-25T09:00:00Z'};
  pruefeGleich(regel(gruende(b, {bereitstellungen: [...OK.bereitstellungen, davor]}), 3).length, 0, 'vor dem Merge zählt nicht');
  pruefe(regel(gruende(b, {bereitstellungen: []}), 3).some(g => /keine Pages-Bereitstellung/.test(g)), 'keine Bereitstellung im Fenster');
  pruefe(regel(gruende(bericht({meta: {erstellt: '2026-11-26T07:00:00Z'}})), 3).some(g => /vor dem festgelegten Stand/.test(g)), 'Export vor dem Merge');
});

test('Regel 4: Worker und Steinzüge ohne Simulationszahl', () => {
  pruefe(regel(gruende(bericht({meta: {workerNeustarts: 1}})), 4).length === 1, 'Neustart');
  pruefe(regel(gruende(bericht({meta: {workerDead: true}})), 4).length === 1, 'tot');
  /* Ein Notzug nach einem KI-Fehler: typ stone, info null (index.html, applyAIResult). */
  const not = bericht(); not.kiDiagnose[10].info = null;
  const g = gruende(not);
  pruefe(regel(g, 4).some(x => /1 KI-Steinzug ohne Simulationszahl \(Zug 20\)/.test(x)), `Notzug: ${g.join(' | ')}`);
  pruefe(/KEIN URTEIL/.test(W.bericht(not.meta, null, g, true)), 'Bericht sagt KEIN URTEIL');
  pruefeGleich(regel(g, 5).length, 0, 'Regel 5 bleibt erfüllt; der Grund ist allein der Notzug');
  const anders = bericht(); anders.kiDiagnose[3].info = 'Eröffnung'; anders.kiDiagnose[7].info = undefined;
  pruefe(regel(gruende(anders), 4).some(x => /2 KI-Steinzüge ohne Simulationszahl \(Zug 6, 14\)/.test(x)), 'zwei Züge');
  pruefeGleich(regel(gruende(bericht()), 4).length, 0, 'sauber ohne Grund');
});

test('Regel 5: genug Steinzüge, davon genug nach Zug 80', () => {
  pruefe(regel(gruende(bericht({n: 119})), 5).length === 1, '119 sind zu wenig');
  pruefeGleich(regel(gruende(bericht({n: 120})), 5).length, 0, '120 genügen');
  /* 130 Züge, 20 davon (Züge 82 bis 120) ohne gemessene Suchzeit: bleiben 110, zu wenig. */
  const luecke = bericht({n: 130, ohneSuche: i => 2 * (i + 1) > 80 && 2 * (i + 1) <= 120});
  pruefe(regel(gruende(luecke), 5).some(g => /110 KI-Steinzüge/.test(g) && /20 weitere ohne gemessene Suchzeit/.test(g)),
    'Züge ohne sucheMs zählen nicht und werden genannt');
  /* Die Teilbedingung „40 nach Zug 80“ eigens, mit gesetzten Zugnummern: 100 bis Zug 80, 30 danach.
     In einer echten Partie hat die KI bis Zug 80 höchstens 40 Steinzüge; dort folgt sie aus den 120. */
  const frueh = bericht({n: 130, zug: i => (i < 100 ? 10 : 100)});
  pruefe(regel(gruende(frueh), 5).some(g => /davon 30 nach Zug 80/.test(g)), '30 nach Zug 80 sind zu wenig');
  pruefeGleich(regel(gruende(bericht({n: 140, zug: i => (i < 100 ? 10 : 100)})), 5).length, 0, '40 nach Zug 80 genügen');
});

test('Bericht: KEIN URTEIL nennt Gründe, GÜLTIG nennt den Arbeitspunkt', () => {
  const b = bericht();
  const gut = W.bericht(b.meta, W.auswerten(b), [], true);
  pruefe(/\*\*GÜLTIG\.\*\*/.test(gut) && /Arbeitspunkt S = 1895 Simulationen · N = 1900 → Vergleich K3 in Stufe 2: 1900 → 3800/.test(gut), 'gültiger Bericht');
  /* Ein halber Median an der Grenze wird nicht zur ganzen Zahl gerundet angezeigt: S = 2749,5
     darf nicht als „2750“ neben N = 2700 stehen. */
  const halb = bericht({sims: i => (i < 90 ? 2749 : 2750)});
  pruefe(W.bericht(halb.meta, W.auswerten(halb), [], true).includes('S = 2749,5 Simulationen · N = 2700 → Vergleich K3 in Stufe 2: 2700 → 5400'),
         'S = 2749,5 bleibt sichtbar unter der Grenze');
  pruefe(/\| alle \| 180 \| 2749,5 \[/.test(W.bericht(halb.meta, W.auswerten(halb), [], true)), 'auch die Tabelle zeigt 2749,5, nicht 2750');
  const schlecht = W.bericht(b.meta, null, ['Regel 1: x'], true);
  pruefe(/KEIN URTEIL/.test(schlecht) && !/Arbeitspunkt S/.test(schlecht), 'ungültiger Bericht rechnet nichts');
});

test('Ende zu Ende über die Befehlszeile', () => {
  const ist = blocksummen(HTML);
  if (!Object.entries(BLOCKSUMMEN).every(([b, s]) => ist[b] === s)) return 'skip';
  const {ladeKI} = require('./rahmen');
  const defaults = ladeKI({mitNetz: false}).PARAMS_DEFAULT;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'arbeitspunkt-'));
  const b = bericht(); b.reproduktion.params = {...defaults};
  const datei = path.join(dir, 'bericht.json'), liste = path.join(dir, 'liste.json');
  fs.writeFileSync(datei, JSON.stringify(b)); fs.writeFileSync(liste, JSON.stringify(OK.bereitstellungen));
  const r = spawnSync(process.execPath, [SKRIPT, datei, '--html', HTML, '--seit', SEIT, '--bereitstellungen', liste, '--markdown'], {encoding: 'utf8'});
  pruefeGleich(r.status, 0, `Exit 0 (${(r.stdout || '').split('\n').filter(z => z.startsWith('- ')).join(' | ')})`);
  const ohneListe = spawnSync(process.execPath, [SKRIPT, datei, '--html', HTML], {encoding: 'utf8'});
  pruefeGleich(ohneListe.status, 1, 'ohne Bereitstellungen: Exit 1');
  fs.rmSync(dir, {recursive: true, force: true});
});

laufeTests('Arbeitspunkt').then(ok => process.exit(ok ? 0 : 1));
