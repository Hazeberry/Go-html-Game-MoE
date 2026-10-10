/* Verschenkte Atari-Züge gegen GNU Go: Welche Ataris der KI sind
   verschenkt, und wusste der Leser vorher, dass die Kette entkommt? Gehört
   zu docs/atari-verschenkt.md.

   Für jeden Zug ab --ab, der eine gegnerische Kette ins Atari setzt, ohne
   zu schlagen und ohne eine eigene Kette aus dem Atari zu retten (Klasse
   „Atari geben“ in verschenkt.js), getrennt für die KI und GNU Go:
   - verschenkt wie in verschenkt.js: Der Stein wird später geschlagen oder
     steht am Ende und GNU Go hält ihn für tot.
   - Ziel entkommt: Kann der Gegner am Zug die Kette im Atari retten
     (leseVerteidigung)? Zwei Ziele zugleich zählen als Doppel-Atari.
   - Krisengewicht des Punkts wie in buildCrisisMap: 1 neben einer Kette im
     Atari, 0,8 neben einer großen Kette mit zwei Freiheiten, 0,5 neben
     einem Drachen mit drei, sonst 0. Bei Gewicht > 0 kommt der Wert des
     Zugs zum größten Teil aus evalTsumego (+500 für das Atari).
   - Freiheiten der eigenen neuen Kette und ob der Leser sie danach fängt.

   Aufruf:
     node auswertung/atari-verschenkt.js <dump.jsonl> [...] [--ab 100] [--gnugo pfad] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const {art, toteSteine} = require('./verschenkt.js');

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };

function krisenGewicht(b, i) {
  const P = E.PARAMS;
  let w = 0;
  for (const n of E.NEIGHBORS[i]) {
    if (!b[n]) continue;
    const {group, liberties} = E.floodFill(b, n);
    const l = liberties.length, s = group.length;
    if (l === 1) w = Math.max(w, P.crisisAtari);
    else if (l === 2 && s >= P.crisisLargeSize) w = Math.max(w, P.crisisLarge2Lib);
    else if (l === 3 && s >= P.crisisDragonSize) w = Math.max(w, P.crisisDragon3Lib);
  }
  return w / 100;
}

function analysiere(p, ab, gnugo) {
  const tot = toteSteine(p, gnugo);
  const b = new Uint8Array(N);
  for (const s of p.vorgabeSteine) b[vonGtp(s)] = 1;
  const wir = p.wirFarbe === 'S' ? 1 : 2, zuerst = p.beginnt === 'S' ? 1 : 2;
  const zuege = [], stein = new Int32Array(N).fill(-1);
  for (let k = 0; k < p.zuege.length; k++) {
    const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
    if (i < 0) continue;
    let eintrag = null;
    if (mc >= ab && art(b, i, f) === 'Atari geben') {
      const nb = new Uint8Array(b); nb[i] = f; E.removeDeadGroups(nb, 3 - f, i);
      const ziele = [], ges = new Set();
      for (const n of E.NEIGHBORS[i]) {
        if (nb[n] !== 3 - f || ges.has(n)) continue;
        const k2 = E.floodFill(nb, n);
        for (const x of k2.group) ges.add(x);
        if (k2.liberties.length === 1) ziele.push({a: n, groesse: k2.group.length});
      }
      const eigen = E.floodFill(nb, i).liberties.length;
      eintrag = {wir: f === wir, mc, weg: false,
                 ziel: ziele.length >= 2 ? 'Doppel-Atari'
                     : ziele.length && E.leseVerteidigung(nb, ziele[0].a).ja ? 'entkommt' : 'gefangen',
                 groesse: ziele.length ? Math.max(...ziele.map(z => z.groesse)) : 0,
                 krise: krisenGewicht(b, i), eigen,
                 fangbar: eigen <= 3 && E.leseAngriff(nb, i).ja};
    }
    const vorher = new Uint8Array(b);
    b[i] = f; E.removeDeadGroups(b, 3 - f, i);
    for (let q = 0; q < N; q++) if (vorher[q] && !b[q] && stein[q] >= 0) { zuege[stein[q]].weg = true; stein[q] = -1; }
    if (eintrag) { stein[i] = zuege.length; eintrag.i = i; zuege.push(eintrag); }
  }
  for (const z of zuege) if (!z.weg && b[z.i] && tot.has(z.i)) z.weg = true;
  return zuege;
}

function bericht(alle, partien) {
  const zeile = (name, liste) => {
    const w = liste.filter(z => z.weg).length;
    console.log(`  ${name}: ${liste.length} Züge (${(liste.length / partien).toFixed(1)} je Partie), verschenkt ${w}`
      + ` (${liste.length ? (100 * w / liste.length).toFixed(0) : 0} %, ${(w / partien).toFixed(1)} je Partie)`);
  };
  for (const [wer, sel] of [['KI', z => z.wir], ['GNU Go', z => !z.wir]]) {
    const A = alle.filter(sel);
    console.log(`${wer}, Atari geben:`);
    zeile('alle', A);
    for (const [titel, von, bis] of [['bis Zug 200', 0, 200], ['nach Zug 200', 200, 1e9]])
      zeile(titel, A.filter(z => z.mc > von && z.mc <= bis));
    for (const t of ['gefangen', 'entkommt', 'Doppel-Atari']) zeile('Ziel ' + t, A.filter(z => z.ziel === t));
    for (const [titel, f] of [['Krisengewicht 0', z => z.krise === 0], ['Krisengewicht 0,5', z => z.krise === 0.5],
                              ['Krisengewicht 0,8', z => z.krise === 0.8], ['Krisengewicht 1', z => z.krise === 1]])
      zeile(titel, A.filter(f));
    for (const [titel, f] of [['eigene Kette 1 Freiheit', z => z.eigen === 1], ['eigene Kette 2 Freiheiten', z => z.eigen === 2],
                              ['eigene Kette 3 Freiheiten', z => z.eigen === 3], ['eigene Kette 4 und mehr', z => z.eigen >= 4]])
      zeile(titel, A.filter(f));
    zeile('eigene Kette danach fangbar', A.filter(z => z.fangbar));
    zeile('Ziel entkommt und eigene Kette fangbar', A.filter(z => z.ziel === 'entkommt' && z.fangbar));
    zeile('Ziel entkommt, Krisengewicht > 0', A.filter(z => z.ziel === 'entkommt' && z.krise > 0));
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  let ab = 100, gnugo = '/usr/games/gnugo';
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--ab') ab = +a[++k];
    else if (a[k] === '--gnugo') gnugo = a[++k];
    else dateien.push(a[k]);
  }
  const partien = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)))
    .filter(p => !p.abgebrochen && p.zuege);
  const alle = partien.flatMap(p => analysiere(p, ab, gnugo));
  console.log(`${partien.length} Partien, Züge ab ${ab}`);
  bericht(alle, partien.length);
}

module.exports = {analysiere};
