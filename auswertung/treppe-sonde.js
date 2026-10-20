// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Treppen-Sonde (docs/benson-lebend-treppe.md §1): Wie oft trifft die
   Sterbe-Treppe in evaluateBoard eine Kette, die bensonClassify als
   pass-alive kennt?

   Die Sonde spielt ganze Partien gegen GNU Go (Bedingungen der Messungen:
   Stufe 1, neun Vorgabesteine, 120 Simulationen, Seed 206) mit einer Kopie
   von index.html, die in evaluateBoard zählt: Aufrufe, Aufrufe mit
   Benson-Analyse (höchstens bensonEvalMaxEmpty freie Felder), Treffer der
   Treppe (libs < 4 und size >= deathDiscountSize), davon auf lebenden Ketten,
   eigene und fremde, und die Abzüge (deathTransfer × Rampe × Größe ×
   captureWeight) insgesamt und auf lebenden Ketten. Die Kopie ändert nichts am
   Spiel; index.html im Repo bleibt unberührt.

   Mit --ki bensonAliveExempt=1 müssen die Treffer auf lebenden Ketten 0 sein:
   das ist die Probe, dass die Ausnahme greift.

   Aufruf:
     node auswertung/treppe-sonde.js [--partien 4] [--von 1] [--seed 206] [--ki bensonAliveExempt=1] [--gnugo /usr/games/gnugo]
   Braucht GNU Go; vier Partien parallel dauern rund eine Minute. */
'use strict';
const {ersetzeEinmal, sondeSpielen, optionen} = require('./sonde-lauf.js');

const ANKER_KOPF = "function evaluateBoard(board, color, captures) {\n  const opp = color === 1 ? 2 : 1;\n";
const ANKER_BENSON = "    if (empt <= PARAMS.bensonEvalMaxEmpty) bEpoch = bensonClassify(board);\n  }\n  const seenEpoch";
const ANKER_TREPPE = "    if (libs < STERBE_RAMPE.length && size >= PARAMS.deathDiscountSize && !lebend) {\n      const anteil = STERBE_RAMPE[libs];\n";
const ANKER_ENDE = "  return s;\n}\n\nconst _emptyHashes = new Set();";

/* index.html mit den Zählern; jede der vier Stellen muss genau einmal vorkommen */
function gepatcht(html) {
  /* Die Treppe fragt `lebend` ab; die Sonde zählt dort mit, wo ein Treffer die Treppe betritt. Läuft
     die Ausnahme (bensonAliveExempt 1), betritt eine lebende Kette sie nicht, und der Zähler bleibt 0. */
  let h = ersetzeEinmal(html, ANKER_KOPF, ANKER_KOPF
    + "  if (!globalThis.__z) { globalThis.__z = {calls: 0, mitBenson: 0, treppe: 0, alive: 0, dtAlle: 0, dtAlive: 0, aufrufeMitAlive: 0, eigen: 0, fremd: 0, groessen: {}};\n"
    + "    process.on('exit', () => console.error('ZAEHLER ' + JSON.stringify(globalThis.__z))); }\n"
    + "  globalThis.__z.calls++; let __aliveHier = false;\n", 'Kopf von evaluateBoard');
  h = ersetzeEinmal(h, ANKER_BENSON, "    if (empt <= PARAMS.bensonEvalMaxEmpty) bEpoch = bensonClassify(board);\n  }\n"
    + "  if (bEpoch >= 0) globalThis.__z.mitBenson++;\n  const seenEpoch", 'Benson-Analyse in evaluateBoard');
  h = ersetzeEinmal(h, ANKER_TREPPE, ANKER_TREPPE
    + "      { const z = globalThis.__z, dt0 = PARAMS.deathTransfer * anteil * size * PARAMS.captureWeight; z.treppe++; z.dtAlle += dt0;\n"
    + "        if (bEpoch >= 0 && _bnAlive[i] === bEpoch) { z.alive++; z.dtAlive += dt0; __aliveHier = true; if (c === color) z.eigen++; else z.fremd++;\n"
    + "          const k = size + 'S' + libs + 'F'; z.groessen[k] = (z.groessen[k] || 0) + 1; } }\n", 'Sterbe-Treppe in evaluateBoard');
  return ersetzeEinmal(h, ANKER_ENDE, "  if (__aliveHier) globalThis.__z.aufrufeMitAlive++;\n" + ANKER_ENDE, 'Ende von evaluateBoard');
}

/* Der letzte Zähler-Satz aus der Fehlerausgabe einer Partie, null ohne */
function zaehler(err) {
  const zeile = err.split('\n').reverse().find(l => l.startsWith('ZAEHLER '));
  return zeile ? JSON.parse(zeile.slice(8)) : null;
}

/* Summe über mehrere Partien */
function summe(liste) {
  const s = {calls: 0, mitBenson: 0, treppe: 0, alive: 0, dtAlle: 0, dtAlive: 0, aufrufeMitAlive: 0, eigen: 0, fremd: 0};
  for (const z of liste) for (const k of Object.keys(s)) s[k] += z[k] || 0;
  return s;
}

const p1 = (a, b) => b > 0 ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '–';
function zeile(name, z) {
  return `${name}: Aufrufe ${z.calls} · mit Benson-Analyse ${z.mitBenson} · davon mit lebender Treppen-Kette ${z.aufrufeMitAlive} (${p1(z.aufrufeMitAlive, z.mitBenson)})`
    + ` · Treffer der Treppe ${z.treppe}, auf lebenden Ketten ${z.alive} (eigene ${z.eigen}, fremde ${z.fremd}) · Anteil am Abzug ${p1(z.dtAlive, z.dtAlle)}`;
}

async function main() {
  const opt = optionen(process.argv.slice(2));
  const {nummern, fehler} = await sondeSpielen({...opt, patch: gepatcht});
  const z = fehler.map(zaehler);
  z.forEach((x, i) => console.log(x ? zeile(`Partie ${nummern[i]}`, x) : `Partie ${nummern[i]}: keine Zähler`));
  const alle = z.filter(Boolean);
  if (alle.length) console.log('\n' + zeile('Zusammen', summe(alle)));
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = {gepatcht, zaehler, summe, zeile};
