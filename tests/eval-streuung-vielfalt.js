// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Auswertungswerkzeug der Vielfaltsmessung (auswertung/eval-streuung-vielfalt.js).

   Das Skript entscheidet, ob ein Lauf ein Urteil trägt und wie es lautet. Ein stiller Fehler
   darin erzeugt keine Fehlermeldung, sondern eine falsche Zahl im Dokument. Geprüft wird:

     1. Die Kernrechnungen an von Hand nachrechenbaren Werten: Kollisionsrate, erste Abweichung,
        Median, Zugfolge und Präfixschlüssel.
     2. Die Armzuordnung kommt aus den DATEN (konfig.A/konfig.B) und nicht aus der Reihenfolge —
        der Artefaktname unterscheidet die Arme nicht.
     3. Jeder der sieben Gründe aus §6 schlägt an, wenn er verletzt ist.
     4. Die Siegrate ist KEIN Ausschlussgrund: ein Block mit extremer Rate bleibt gültig.
     5. Die Gleichstandsregeln aus §4.1: n_eff wird ausgewiesen, n_eff < 6 heißt kein Urteil,
        und der Fall "alle Differenzen null" ist eigens behandelt.
     6. Die drei Urteile aus §5, wörtlich.
     7. Der Bericht nennt bei KEIN URTEIL jeden Grund und rechnet nichts.

   Aufruf:  node tests/eval-streuung-vielfalt.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const W = require('../auswertung/eval-streuung-vielfalt.js');

const SEEDS = [20261201, 20261202, 20261203, 20261204, 20261205,
               20261206, 20261207, 20261208, 20261209, 20261210];
const N = 30;
const BASIS = 'mctsFixedSims=120,resignEnabled=0';
const specV = v => `${BASIS},evalStreuung=${v}`;

let TMP;
const tmpdir = () => TMP || (TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'vielfalt-')));

/* Ein Block: n Partien, deren erste Züge aus `ersteZuege` kommen (zyklisch), Rest eindeutig.
   gleicheErste = k heisst: die ersten k Partien eroeffnen alle auf Feld 100. */
function block(seed, streuung, opt = {}) {
  const n = opt.n === undefined ? N : opt.n;
  const partien = [], roh = [];
  for (let i = 0; i < n; i++) {
    const zuege = opt.zuege || (300 + i);
    partien.push({partie: i + 1, aIst: i % 2 === 0 ? 'Schwarz' : 'Weiß',
      sieger: (opt.bSiege !== undefined ? i < opt.bSiege : i % 2 === 0) ? 'B' : 'A',
      aufgabe: null, zuege});
    const erster = (opt.gleicheErste && i < opt.gleicheErste) ? 100 : 200 + i;
    const ereignisse = [];
    const anzahl = opt.ereignisseFehlen ? zuege - 1 : zuege;
    for (let z = 1; z <= anzahl; z++)
      ereignisse.push({zug: z, farbe: z % 2 ? 'S' : 'W', idx: z === 1 ? erster : (z * 7 + i) % 361});
    roh.push({nr: i + 1, armSchwarz: 'A', armWeiss: 'B',
      final_board_hash: `h${seed}-${i}`, sieger: 'S', zuege, aufgabe: null, ereignisse});
  }
  const sA = opt.specA || specV(streuung);
  const sB = opt.specB || specV(streuung);
  return {name: `ab-${N}p-seed${seed}.json`, jsonPfad: `x/${seed}.json`, rohPfad: 'x', logPfad: 'x',
          daten: {partien, konfig: {A: sA, B: sB, komi: 7.5, seed, modus: 'standard',
                                    dauerMin: 15, abgeschlossen: opt.abgeschlossen !== false}},
          roh, anomalien: opt.anomalien === undefined ? 0 : opt.anomalien};
}

const argumente = (opt = {}) => ({
  teile: [], seeds: opt.seeds === undefined ? SEEDS : opt.seeds,
  partienJeBlock: opt.partienJeBlock === undefined ? N : opt.partienJeBlock,
  streuungV1: 1, streuungV0: 0, markdown: false, html: opt.html || 'index.html'
});

/* Beide Arme, je zehn Blöcke. gleicheErsteV0/V1: wie viele Partien je Block gleich eröffnen. */
function lauf(opt = {}) {
  const bloecke = [];
  for (const s of SEEDS) {
    bloecke.push(W.blockMasse(block(s, 1, {...opt, gleicheErste: opt.gleicheErsteV1 || 0})));
    bloecke.push(W.blockMasse(block(s, 0, {...opt, gleicheErste: opt.gleicheErsteV0 || 0})));
  }
  if (opt.mischen) bloecke.reverse();
  const a = argumente(opt);
  const {gruende, arme} = W.pruefeGueltigkeit(a, bloecke);
  return {a, bloecke, gruende, arme, pr: gruende.length ? null : W.primaer(a, arme)};
}

test('Kernrechnungen an nachrechenbaren Werten', () => {
  pruefeGleich(W.kollisionsrate([1, 2, 3]), 0, 'alle verschieden');
  pruefeGleich(W.kollisionsrate([7, 7, 7]), 1, 'alle gleich');
  pruefeNah(W.kollisionsrate([5, 5, 9]), 1 / 3, 1e-12, '2+1 von 3');
  /* 4 Werte, zweimal doppelt: 2 kollidierende Paare von 6 */
  pruefeNah(W.kollisionsrate([1, 1, 2, 2]), 2 / 6, 1e-12, '2+2 von 4');
  pruefe(!Number.isFinite(W.kollisionsrate([1])), 'eine Partie gibt keine Rate');
  pruefeGleich(W.ersteAbweichung([1, 2, 3], [1, 9, 3]), 2, 'erste Abweichung');
  pruefeGleich(W.ersteAbweichung([4, 2], [9, 2]), 1, 'Abweichung im ersten Zug');
  pruefeGleich(W.ersteAbweichung([1, 2], [1, 2]), Infinity, 'identisch');
  pruefeGleich(W.ersteAbweichung([1, 2], [1, 2, 3]), 3, 'eine Partie endet früher');
  pruefeGleich(W.median([1, 3, 5, 7]), 4, 'Median gerade');
  pruefeGleich(W.median([1, 3, 5]), 3, 'Median ungerade');
  /* Zugfolge wird nach Zugnummer sortiert, auch wenn die Ereignisse unsortiert kommen */
  const f = W.zugfolge({ereignisse: [{zug: 2, idx: 20}, {zug: 1, idx: 10}, {zug: 3, idx: 30}]});
  pruefeGleich(f.join('.'), '10.20.30', 'Zugfolge sortiert');
  pruefeGleich(W.schluessel([10, 20, 30, 40], 2), '10.20', 'Präfixschlüssel');
  /* Ein Pass ohne Feldindex faellt nicht aus der Folge heraus */
  pruefeGleich(W.zugfolge({ereignisse: [{zug: 1, idx: 5}, {zug: 2, idx: null}]}).join('.'), '5.p', 'Pass');
});

test('Armzuordnung kommt aus den Daten, nicht aus der Reihenfolge', () => {
  const normal = lauf({gleicheErsteV0: 10});
  pruefeGleich(normal.gruende.length, 0, 'gültig: ' + normal.gruende.join(' | '));
  const gemischt = lauf({gleicheErsteV0: 10, mischen: true});
  pruefeGleich(gemischt.gruende.length, 0, 'auch in umgekehrter Reihenfolge gültig');
  pruefeGleich(gemischt.arme.get(1).length, 10, 'zehn Blöcke im Arm V1');
  pruefeGleich(gemischt.arme.get(0).length, 10, 'zehn Blöcke im Arm V0');
  /* dasselbe Urteil, obwohl die Reihenfolge anders ist */
  pruefeGleich(gemischt.pr.urteil.art, normal.pr.urteil.art, 'Urteil reihenfolgeunabhängig');
  pruefeGleich(gemischt.pr.nEff, normal.pr.nEff, 'n_eff reihenfolgeunabhängig');
});

test('Regel 1: Partienzahl und abgeschlossen', () => {
  const kurz = lauf({n: 25, gleicheErsteV0: 10});
  pruefe(kurz.gruende.some(g => g.startsWith('Regel 1') && g.includes('25 Partien')),
    'zu wenige Partien: ' + kurz.gruende.join(' | '));
  const offen = lauf({abgeschlossen: false, gleicheErsteV0: 10});
  pruefe(offen.gruende.some(g => g.includes('nicht abgeschlossen')), 'offener Teil');
});

test('Regel 2: beide Seiten eines Arms müssen identisch sein', () => {
  const bloecke = [];
  for (const s of SEEDS) {
    bloecke.push(W.blockMasse(block(s, 1, {})));
    bloecke.push(W.blockMasse(block(s, 0, s === SEEDS[3] ? {specA: specV(0), specB: specV(1)} : {})));
  }
  const {gruende} = W.pruefeGueltigkeit(argumente(), bloecke);
  pruefe(gruende.some(g => g.startsWith('Regel 2')), 'Regel 2 schlägt an: ' + gruende.join(' | '));
});

test('Regel 3: Unterschied ausserhalb von evalStreuung, und fremder Armwert', () => {
  const bloecke = [];
  for (const s of SEEDS) {
    const extra = s === SEEDS[2] ? {specA: 'mctsFixedSims=240,resignEnabled=0,evalStreuung=1',
                                    specB: 'mctsFixedSims=240,resignEnabled=0,evalStreuung=1'} : {};
    bloecke.push(W.blockMasse(block(s, 1, extra)));
    bloecke.push(W.blockMasse(block(s, 0, {})));
  }
  const {gruende} = W.pruefeGueltigkeit(argumente(), bloecke);
  pruefe(gruende.some(g => g.startsWith('Regel 3')), 'Regel 3 bei zweitem Unterschied: ' + gruende.join(' | '));

  const fremd = [];
  for (const s of SEEDS) {
    fremd.push(W.blockMasse(block(s, 1, {})));
    fremd.push(W.blockMasse(block(s, s === SEEDS[0] ? 0.5 : 0, {})));
  }
  const g2 = W.pruefeGueltigkeit(argumente(), fremd).gruende;
  pruefe(g2.some(g => g.startsWith('Regel 3') && g.includes('0.5')), 'fremder Armwert: ' + g2.join(' | '));
});

test('Regel 4: Seeds je Arm genau einmal', () => {
  const doppelt = [];
  for (let i = 0; i < 10; i++) {
    const s = SEEDS[Math.min(i, 8)];
    doppelt.push(W.blockMasse(block(s, 1, {})));
    doppelt.push(W.blockMasse(block(SEEDS[i], 0, {})));
  }
  const g = W.pruefeGueltigkeit(argumente(), doppelt).gruende;
  pruefe(g.some(x => x.includes('zweimal vor')), 'doppelter Seed: ' + g.join(' | '));
  pruefe(g.some(x => x.includes('fehlt im Arm')), 'fehlender Seed');
});

test('Regel 5: Zugereignisse müssen zur Zugzahl passen', () => {
  const fehlend = lauf({ereignisseFehlen: true, gleicheErsteV0: 10});
  pruefe(fehlend.gruende.some(g => g.startsWith('Regel 5') && g.includes('Zugereignisse')),
    'Regel 5 schlägt an: ' + fehlend.gruende.join(' | '));
});

test('Regel 6: geänderter Engine-Block', () => {
  const d = tmpdir(), p = path.join(d, 'index-geaendert.html');
  const h = fs.readFileSync('index.html', 'utf8');
  const anker = 'evalStreuung:    1.00,';
  pruefe(h.includes(anker), 'Anker gefunden');
  fs.writeFileSync(p, h.replace(anker, 'evalStreuung:    1.01,'));
  const g = lauf({html: p, gleicheErsteV0: 10}).gruende;
  pruefe(g.some(x => x.startsWith('Regel 6') && x.includes('worker-ai')), 'Regel 6: ' + g.join(' | '));
  const ist = W.blocksummen('index.html');
  for (const [b, soll] of Object.entries(W.BLOCKSUMMEN)) pruefeGleich(ist[b], soll, 'Blocksumme ' + b);
});

test('Regel 7: Anomalien über 2 Prozent, und fehlendes Log', () => {
  /* 2 % von 30 sind 0,6 — eine Anomalie ist schon zu viel */
  const viele = lauf({anomalien: 1, gleicheErsteV0: 10});
  pruefe(viele.gruende.some(g => g.startsWith('Regel 7') && g.includes('Anomalien')),
    'eine Anomalie bei 30 Partien kippt: ' + viele.gruende.join(' | '));
  const ohneLog = lauf({anomalien: null, gleicheErsteV0: 10});
  pruefe(ohneLog.gruende.some(g => g.includes('kein Log')), 'fehlendes Log');
  pruefeGleich(lauf({anomalien: 0, gleicheErsteV0: 10}).gruende.length, 0, 'null Anomalien sind in Ordnung');
});

test('Die Siegrate ist KEIN Ausschlussgrund (§6)', () => {
  /* Ein Block, in dem B alle 30 Partien gewinnt: extrem auffällig, aber kein Grund. */
  const bloecke = [];
  for (const s of SEEDS) {
    bloecke.push(W.blockMasse(block(s, 1, s === SEEDS[0] ? {bSiege: 30} : {})));
    bloecke.push(W.blockMasse(block(s, 0, {gleicheErste: 10})));
  }
  const {gruende, arme} = W.pruefeGueltigkeit(argumente(), bloecke);
  pruefeGleich(gruende.length, 0, 'trotz 30:0 gültig: ' + gruende.join(' | '));
  const auff = bloecke.find(b => b.bSiege === 30);
  pruefe(auff.siegrateP < 0.05, 'die Rate ist rechnerisch auffällig (p = ' + auff.siegrateP + ')');
  const t = W.bericht(argumente(), bloecke, W.primaer(argumente(), arme), [], true);
  pruefe(t.includes('KEIN Ausschlussgrund'), 'der Bericht sagt, dass sie kein Grund ist');
  pruefe(t.includes('Auffällig'), 'und weist den auffälligen Block aus');
});

test('§4.1: n_eff, Gleichstände und die Schwelle 6', () => {
  /* V0 hat in allen zehn Blöcken 10 gleiche Eröffnungen, V1 keine -> 10:0 */
  const klar = lauf({gleicheErsteV0: 10});
  pruefeGleich(klar.pr.nEff, 10, 'n_eff bei zehn echten Differenzen');
  pruefeGleich(klar.pr.hoeher, 10, 'alle Differenzen in dieselbe Richtung');
  pruefeNah(klar.pr.p, 2 / 1024, 1e-12, 'p bei 10:0');
  pruefeGleich(klar.pr.urteil.art, 'v0-konzentrierter', 'Urteil');

  /* Beide Arme ohne Wiederholung -> alle Differenzen null -> kein Urteil */
  const leer = lauf({});
  pruefeGleich(leer.pr.nEff, 0, 'n_eff null');
  pruefe(leer.pr.alleNull, 'alle Differenzen null');
  pruefe(leer.pr.beideNullRate, 'beide Arme bei Rate null');
  pruefeGleich(leer.pr.urteil.art, 'kein-urteil', 'kein Urteil');
  pruefe(leer.pr.urteil.grund.includes('n_eff = 0'), 'Grund nennt n_eff');
  const t = W.bericht(leer.a, leer.bloecke, leer.pr, [], true);
  pruefe(t.includes('in keinem Block eine Wiederholung des ersten Zugs'), 'der Satz aus §4.1 Nr. 4 steht da');
  pruefe(t.includes('kein Befund über Gleichheit'), 'und die Einordnung dazu');
});

test('§4.1: fünf echte Differenzen reichen nicht, sechs reichen', () => {
  /* nur in k Blöcken hat V0 Wiederholungen -> n_eff = k */
  function mitK(k) {
    const bloecke = [];
    SEEDS.forEach((s, i) => {
      bloecke.push(W.blockMasse(block(s, 1, {})));
      bloecke.push(W.blockMasse(block(s, 0, {gleicheErste: i < k ? 10 : 0})));
    });
    const a = argumente();
    return W.primaer(a, W.pruefeGueltigkeit(a, bloecke).arme);
  }
  const fuenf = mitK(5);
  pruefeGleich(fuenf.nEff, 5, 'n_eff 5');
  pruefeGleich(fuenf.urteil.art, 'kein-urteil', 'fünf reichen nicht');
  pruefe(fuenf.urteil.grund.includes('n_eff = 5'), 'Grund nennt n_eff 5');
  const sechs = mitK(6);
  pruefeGleich(sechs.nEff, 6, 'n_eff 6');
  pruefeNah(sechs.p, 2 / 64, 1e-12, 'p bei 6:0');
  pruefeGleich(sechs.urteil.art, 'v0-konzentrierter', 'sechs reichen');
  pruefeGleich(W.N_EFF_MIN, 6, 'die Schwelle steht als Konstante');
});

test('Die drei Urteile aus §5, wörtlich', () => {
  pruefeGleich(W.URTEILSSATZ['kein-unterschied'],
    'Über die Seed-Blöcke ließ sich kein konsistenter Unterschied in der Konzentration des ersten Zugs nachweisen.',
    'Nullurteil wörtlich wie in §5');
  pruefe(W.URTEILSSATZ['v0-konzentrierter'].includes('kauft Streuung'), 'V0 konzentrierter');
  pruefe(W.URTEILSSATZ['v0-gestreuter'].includes('keine Erklärung'), 'unerwartete Richtung');
  /* Umgekehrte Richtung: V1 hat die Wiederholungen */
  const umgekehrt = lauf({gleicheErsteV1: 10});
  pruefeGleich(umgekehrt.pr.urteil.art, 'v0-gestreuter', 'Richtung erkannt');
  /* Keine Richtung: fünf hoch, fünf runter -> p = 1 */
  const bloecke = [];
  SEEDS.forEach((s, i) => {
    bloecke.push(W.blockMasse(block(s, 1, {gleicheErste: i < 5 ? 10 : 0})));
    bloecke.push(W.blockMasse(block(s, 0, {gleicheErste: i < 5 ? 0 : 10})));
  });
  const a = argumente(), pr = W.primaer(a, W.pruefeGueltigkeit(a, bloecke).arme);
  pruefeGleich(pr.nEff, 10, 'zehn echte Differenzen');
  pruefeGleich(pr.hoeher, 5, 'fünf in jede Richtung');
  pruefeGleich(pr.p, 1, 'p = 1');
  pruefeGleich(pr.urteil.art, 'kein-unterschied', 'kein Unterschied');
  const t = W.bericht(a, bloecke, pr, [], true);
  pruefe(t.includes(W.URTEILSSATZ['kein-unterschied']), 'der Urteilssatz steht im Bericht');
  pruefe(t.includes('nicht, woher die übrige Streuung kommt'), 'und was daraus nicht folgt');
});

test('Sekundärmaße zählen, was sie behaupten — und ohne p-Wert', () => {
  const b = W.blockMasse(block(20261201, 0, {gleicheErste: 10}));
  pruefeGleich(b.verschiedeneErste, 21, '10 gleiche plus 20 eigene ergeben 21 verschiedene');
  pruefeNah(b.haeufigsterErsterAnteil, 10 / 30, 1e-12, 'Anteil des häufigsten');
  pruefeNah(b.q, 45 / 435, 1e-12, 'q = C(10,2)/C(30,2)');
  pruefeGleich(b.verschiedeneEndstellungen, 30, 'Endstellungen alle verschieden');
  pruefeGleich(b.aufgaben, 0, 'keine Aufgaben');
  pruefe(b.zuegeMin === 300 && b.zuegeMax === 329, 'Partielänge');
  const t = W.bericht(argumente(), lauf({gleicheErsteV0: 10}).bloecke,
                      lauf({gleicheErsteV0: 10}).pr, [], true);
  for (const s of ['Kollisionsrate des ersten Zugs', 'n_eff', 'Vorzeichentest', 'verschiedene erste Züge',
                   'Präfix 10', 'Median erste Abweichung', 'ohne p-Wert und ohne Intervall'])
    pruefe(t.includes(s), 'Bericht nennt: ' + s);
});

test('Der Bericht nennt bei KEIN URTEIL jeden Grund und rechnet nichts', () => {
  const l = lauf({n: 25, gleicheErsteV0: 10});
  pruefe(l.gruende.length > 0, 'es gibt Gründe');
  const t = W.bericht(l.a, l.bloecke, null, l.gruende, true);
  pruefe(t.includes('KEIN URTEIL'), 'Urteilszeile');
  for (const g of l.gruende) pruefe(t.includes(g), 'Grund steht im Bericht');
  pruefe(!t.includes('Vorzeichentest'), 'keine Zahlen bei KEIN URTEIL');
});

test('Log ohne Warnzeile heisst null Anomalien', () => {
  const d = tmpdir();
  const a = path.join(d, 'ohne.log'), b = path.join(d, 'mit.log');
  fs.writeFileSync(a, 'Lauf fertig\n');
  fs.writeFileSync(b, 'Lauf fertig\n⚠ 4 illegale KI-Züge abgefangen (als Pass gewertet)\n');
  pruefeGleich(W.anomalienAusLog(a), 0, 'ohne Zeile');
  pruefeGleich(W.anomalienAusLog(b), 4, 'mit Zeile');
});

laufeTests('Bericht der Vielfaltsmessung (eval-streuung-vielfalt.js)').then(ok => {
  if (TMP) try { fs.rmSync(TMP, {recursive: true, force: true}); } catch (e) { /* Kür */ }
  process.exit(ok ? 0 : 1);
});
