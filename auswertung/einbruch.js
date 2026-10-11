/* Einbrüche ins Gebiet: Wie antwortet die Seite, in deren Gebiet gespielt
   wird, und lebt der eingesetzte Stein? Gehört zu docs/punktverlust.md.

   Liest die Karten von besitz-verlauf.js --karten (Marken alle 10 Züge)
   und die Rohdumps. Ein Einbruch ist ein Zug auf einen Punkt, der an der
   letzten Marke davor Gebiet des Gegners war (Code G oder g). Festgehalten:

     antwort   Abstand (Chebyshev) des nächsten Zugs der anderen Seite zum
               Einbruch; lokal heißt höchstens 2
     schicksal Code des Punkts an der Marke 20 Züge später (oder an der
               letzten): lebt (eigener lebender Stein), tot (eigener toter
               Stein) oder weg (der Stein steht nicht mehr)
     tiefe     Abstand (Chebyshev) zum nächsten eigenen lebenden Stein an
               der Marke davor: 2 flach (Reduktion vom Rand), ab 3 tief
               (Invasion). An eigene Steine grenzen kann ein Gebietspunkt
               des Gegners nicht.
     fangbar   der taktische Leser der Engine fängt die Kette des
               eingesetzten Steins, wenn die andere Seite am Zug ist
               (leseAngriff, bis drei Freiheiten)

   Ausgewertet für Einbrüche von GNU Go ins Gebiet der KI und, als
   Kontrolle, von der KI ins Gebiet von GNU Go.

   Aufruf:
     node auswertung/einbruch.js --besitz besitz.jsonl [...] --dumps dump.jsonl [...] [--bis 180] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const E = ladeKI({mitNetz: false});

const L = 'ABCDEFGHJKLMNOPQRST';
/* Index in der Karte: Zeile 19 zuerst, Spalten A–T ohne I */
const index = s => { s = s.toUpperCase(); if (s === 'PASS') return -1; return (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const abstand = (a, b) => Math.max(Math.abs(a % 19 - b % 19), Math.abs(Math.floor(a / 19) - Math.floor(b / 19)));

function analysiere(p, r, bis) {
  const marken = r.marken;
  const zuerst = p.beginnt === 'S' ? 'B' : 'W', ki = p.wirFarbe === 'S' ? 'B' : 'W';
  const seiteVon = mc => (mc % 2 === 1 ? zuerst : (zuerst === 'B' ? 'W' : 'B')) === ki ? 'ki' : 'gegner';
  const aus = [];
  /* Brett der Engine mitführen (Index wie die Karte: Zeile 19 = y 0). */
  const b = new Uint8Array(361), farbeVon = mc => mc % 2 === 1 ? zuerst : (zuerst === 'B' ? 'W' : 'B');
  for (const s of p.vorgabeSteine) b[index(s)] = 1;
  const setze = (i, f) => { b[i] = f; E.removeDeadGroups(b, 3 - f, i); };
  for (let k = 0; k < p.zuege.length; k++) {
    const mc = k + 1, i = index(p.zuege[k]);
    if (i >= 0) setze(i, farbeVon(mc) === 'B' ? 1 : 2);
    if (i < 0 || mc <= marken[0] || mc > bis) continue;
    const t = Math.max(...marken.filter(m => m < mc));
    const seite = seiteVon(mc);
    const fremdGebiet = seite === 'gegner' ? 'G' : 'g';
    if (r.karten[t][i] !== fremdGebiet) continue;
    let antwort = null;
    for (let j = k + 1; j < p.zuege.length; j++) {
      if (seiteVon(j + 1) === seite) continue;
      const a = index(p.zuege[j]);
      antwort = a < 0 ? 99 : abstand(a, i);
      break;
    }
    const spaeter = Math.min(...marken.filter(m => m >= mc + 20).concat([marken[marken.length - 1]]));
    const c = r.karten[spaeter][i];
    const lebt = seite === 'gegner' ? 's' : 'S', totCode = seite === 'gegner' ? 't' : 'T';
    const eigenLebt = seite === 'gegner' ? 's' : 'S';
    let tiefe = 99;
    for (let n = 0; n < 361; n++) if (r.karten[t][n] === eigenLebt) tiefe = Math.min(tiefe, abstand(n, i));
    const fangbar = !!b[i] && E.floodFill(b, i).liberties.length <= 3 && E.leseAngriff(b, i).ja;
    aus.push({seed: p.seed, mc, seite, antwort, tiefe, fangbar,
              schicksal: c === lebt ? 'lebt' : c === totCode ? 'tot' : 'weg'});
  }
  return aus;
}

function bericht(z, partien) {
  const pz = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %` : '–';
  for (const [name, seite] of [['GNU Go spielt ins Gebiet der KI', 'gegner'], ['KI spielt ins Gebiet von GNU Go', 'ki']]) {
    const a = z.filter(x => x.seite === seite);
    console.log(`${name}: ${a.length} Züge (${(a.length / partien).toFixed(1)} je Partie)`);
    console.log(`  Antwort lokal (Abstand ≤ 2): ${pz(a, x => x.antwort !== null && x.antwort <= 2)}; Stein lebt 20 Züge später: ${pz(a, x => x.schicksal === 'lebt')},`
      + ` tot ${pz(a, x => x.schicksal === 'tot')}, weg ${pz(a, x => x.schicksal === 'weg')}`);
    const lokal = a.filter(x => x.antwort !== null && x.antwort <= 2), fern = a.filter(x => x.antwort !== null && x.antwort > 2);
    console.log(`  nach lokaler Antwort lebt ${pz(lokal, x => x.schicksal === 'lebt')} (${lokal.length}); nach Antwort woanders lebt ${pz(fern, x => x.schicksal === 'lebt')} (${fern.length})`);
    for (const [teil, f] of [['flach, Abstand 2 (Reduktion)', x => x.tiefe <= 2], ['tief, Abstand ≥ 3 (Invasion)', x => x.tiefe >= 3]]) {
      const b = a.filter(f);
      console.log(`  ${teil}: ${(b.length / partien).toFixed(1)} je Partie, Antwort lokal ${pz(b, x => x.antwort !== null && x.antwort <= 2)},`
        + ` lebt ${pz(b, x => x.schicksal === 'lebt')}; vom Leser fangbar ${pz(b, x => x.fangbar)}, davon lebt ${pz(b.filter(x => x.fangbar), x => x.schicksal === 'lebt')}`);
    }
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const besitz = [], dumps = [];
  let liste = null, bis = 180;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--besitz') liste = besitz;
    else if (a[k] === '--dumps') liste = dumps;
    else if (a[k] === '--bis') bis = +a[++k];
    else if (liste) liste.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  const partien = new Map(dumps.flatMap(lies).map(p => [p.seed, p]));
  const rs = besitz.flatMap(lies).filter(r => r.karten);
  const z = [];
  for (const r of rs) { const p = partien.get(r.seed); if (p) z.push(...analysiere(p, r, bis)); }
  console.log(`${rs.length} Partien, Züge ${rs[0] ? rs[0].marken[0] + 1 : '?'}–${bis}`);
  bericht(z, rs.length);
}

module.exports = {analysiere, bericht};
