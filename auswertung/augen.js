/* Wie oft füllt ein Arm ein eigenes echtes Auge? Gehört zu
   docs/endspiel-augen.md. Gezählt wird nach fuelltEigenesAuge aus
   index.html, also mit derselben Definition, die augenSchutz benutzt.

   Rohdumps von ab-harness.js (Felder ereignisse, armSchwarz, armWeiss):
   je Arm gespielte Züge, Augenfüllungen und Partien mit mindestens einer.
   Rohdumps von gnugo-duell.js (Felder zuege, vorgabeSteine, wirFarbe):
   dasselbe für unsere Seite, je Datei ein Arm.

   Aufruf:
     node auswertung/augen.js <dump.jsonl> [weitere.jsonl ...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const L = 'ABCDEFGHJKLMNOPQRST';
const ix = s => (19 - +s.slice(1)) * 19 + L.indexOf(s[0]);

function zaehle(dateien) {
  const arm = {};
  const neu = k => arm[k] || (arm[k] = {zuege: 0, augen: 0, partien: 0, mit: 0});
  for (const d of dateien) for (const z of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) {
    const p = JSON.parse(z);
    if (p.abgebrochen) continue;
    const b = new Uint8Array(E.BOARD_SIZE);
    const hat = {};
    let zuege;
    if (p.ereignisse) {
      zuege = p.ereignisse.map(e => ({f: e.farbe === 'S' ? 1 : 2, i: e.idx,
                                      arm: e.farbe === 'S' ? p.armSchwarz : p.armWeiss}));
    } else {
      for (const v of p.vorgabeSteine || []) b[ix(v)] = 1;
      const zuerst = p.beginnt === 'W' ? 2 : 1, wir = p.wirFarbe === 'S' ? 1 : 2;
      zuege = p.zuege.map((s, t) => {
        const f = t % 2 === 0 ? zuerst : 3 - zuerst;
        return {f, i: s === 'pass' ? -1 : ix(s), arm: f === wir ? path.basename(d) : null};
      });
    }
    for (const {f, i, arm: a} of zuege) {
      if (i < 0) continue;
      if (a) {
        const z = neu(a); z.zuege++;
        if (E.fuelltEigenesAuge(b, i, f)) { z.augen++; hat[a] = 1; }
      }
      b[i] = f; E.removeDeadGroups(b, 3 - f, i);
    }
    for (const a of new Set(zuege.map(z => z.arm).filter(Boolean))) { neu(a).partien++; neu(a).mit += hat[a] || 0; }
  }
  return arm;
}

if (require.main === module) {
  const dateien = process.argv.slice(2);
  if (!dateien.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(2); }
  for (const [k, z] of Object.entries(zaehle(dateien)))
    console.log(`${k}: ${z.augen} Augenfüllungen in ${z.zuege} Zügen · in ${z.mit} von ${z.partien} Partien`);
}

module.exports = {zaehle};
