/* Verschenkte Züge gegen GNU Go: Welche Steine werden später geschlagen
   oder sind am Ende tot? Gehört zu docs/endspiel-verlust.md.

   Für jede Partie eines Rohdumps von gnugo-duell.js (Feld zuege) wird die
   Partie mit der Engine nachgespielt. Jeder Zug ab --ab gilt als
   verschenkt, wenn sein Stein später geschlagen wird oder am Ende noch auf
   dem Brett steht und GNU Go ihn für tot hält (final_status_list dead, ein
   GNU-Go-Aufruf je Partie).

   Ausgabe je Phase (bis Zug 200, danach), getrennt für die KI und für GNU
   Go, und für die KI zusätzlich nach Art des Zugs und nach dem Urteil des
   taktischen Lesers: Kann der Gegner die Kette des neuen Steins sofort
   fangen (leseAngriff, bis drei Freiheiten)? Bei Rettungen aus dem Atari
   auch: Hält der Leser die Kette vor dem Zug für rettbar
   (leseVerteidigung)?

   Aufruf:
     node auswertung/verschenkt.js <dump.jsonl> [...] [--ab 100] [--gnugo pfad] */
'use strict';
const fs = require('fs');
const path = require('path');
const {spawnSync} = require('child_process');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const linie = i => { const x = i % 19, y = Math.floor(i / 19); return Math.min(x, y, 18 - x, 18 - y) + 1; };

function art(b, i, f) {
  const opp = 3 - f;
  let rettung = false, schlag = false, atari = false, schwach = false;
  for (const n of E.NEIGHBORS[i]) {
    if (b[n] === opp) { const l = E.floodFill(b, n).liberties.length; if (l === 1) schlag = true; else if (l === 2) atari = true; }
    if (b[n] === f) { const l = E.floodFill(b, n).liberties.length; if (l === 1) rettung = true; else if (l <= 3) schwach = true; }
  }
  if (schlag) return 'Schlag';
  if (rettung) return 'Rettung aus dem Atari';
  if (atari) return 'Atari geben';
  if (schwach) return 'an eigene Kette mit 2–3 Freiheiten';
  if (linie(i) === 1) return 'erste Linie, ruhig';
  return 'sonstiger ruhiger Zug';
}

function toteSteine(p, gnugo) {
  const zuerst = p.beginnt === 'S' ? 'B' : 'W';
  const befehle = ['boardsize 19', 'clear_board', 'set_free_handicap ' + p.vorgabeSteine.join(' ')];
  p.zuege.forEach((z, k) => befehle.push(`play ${k % 2 === 0 ? zuerst : (zuerst === 'B' ? 'W' : 'B')} ${z}`));
  befehle.push('final_status_list dead', 'quit');
  const r = spawnSync(gnugo, ['--mode', 'gtp', '--level', '1', '--chinese-rules', '--komi', String(p.komi)],
                      {input: befehle.join('\n') + '\n', encoding: 'utf8', maxBuffer: 1e8});
  const antworten = r.stdout.split('\n\n').filter(s => s.startsWith('='));
  return new Set(antworten[antworten.length - 2].slice(1).trim().split(/\s+/).filter(Boolean).map(vonGtp));
}

/* Je Partie: Liste der Züge ab `ab` mit {wir, mc, art, fangbar, weg}. */
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
    if (mc >= ab) {
      eintrag = {wir: f === wir, mc, weg: false};
      if (f === wir) {
        eintrag.art = art(b, i, f);
        if (eintrag.art === 'Rettung aus dem Atari') {
          const n = E.NEIGHBORS[i].find(q => b[q] === f && E.floodFill(b, q).liberties.length === 1);
          eintrag.rettbar = E.leseVerteidigung(b, n).ja;
        }
        const nb = new Uint8Array(b); nb[i] = f; E.removeDeadGroups(nb, 3 - f, i);
        eintrag.fangbar = E.floodFill(nb, i).liberties.length <= 3 && E.leseAngriff(nb, i).ja;
      }
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
    console.log(`  ${name}: ${liste.length} Züge, verschenkt ${w} (${liste.length ? (100 * w / liste.length).toFixed(0) : 0} %), je Partie ${(w / partien).toFixed(1)}`);
  };
  for (const [titel, von, bis] of [['bis Zug 200', 0, 200], ['nach Zug 200', 200, 1e9]]) {
    const ph = alle.filter(z => z.mc > von && z.mc <= bis);
    console.log(`${titel}:`);
    zeile('KI, alle', ph.filter(z => z.wir));
    zeile('GNU Go, alle', ph.filter(z => !z.wir));
    for (const a of [...new Set(ph.filter(z => z.wir).map(z => z.art))].sort())
      zeile('KI, ' + a, ph.filter(z => z.wir && z.art === a));
  }
  console.log('KI nach Urteil des Lesers:');
  zeile('Kette danach fangbar', alle.filter(z => z.wir && z.fangbar));
  zeile('Kette danach nicht fangbar', alle.filter(z => z.wir && !z.fangbar));
  zeile('Rettung aus dem Atari, Leser: rettbar', alle.filter(z => z.wir && z.rettbar === true));
  zeile('Rettung aus dem Atari, Leser: nicht rettbar', alle.filter(z => z.wir && z.rettbar === false));
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

module.exports = {analysiere, art};
