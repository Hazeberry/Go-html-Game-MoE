/* Tote Steine am Partieende (toteSteineAmEnde; docs/zaehlung.md).

     1. Partie vom 12.10. (stellungen/zaehlung-358.sgf, ausgespielt): tot
        sind genau die acht schwarzen Steine oben rechts (R19 … S16), die
        weißen Randsteine H19 und A13 leben. Gezählt nach Fläche: W+102,5,
        wie GNU Gos final_score. Die alte Regel je Kette ergab W+70,5.
     2. Kleine Bretter: ein Eindringling im fremden Gebiet stirbt, eine
        Gruppe mit zwei Augen lebt, eine eingeschlossene Gruppe mit einem
        Zwei-Punkte-Auge stirbt, ein großes Auge allein reicht.
     3. Unfertige Stellungen bleiben fast unberührt: nach 60 Zügen von
        laufkampf-211.sgf kein toter Stein; die aufgegebene Partie
        stellungen/aufgabe-151.sgf zählt nicht absurd (GNU Go: B+51,5).
     4. Form eines einzelnen Auges (augeTeilbar): Partie vom 13.10.
        (stellungen/auge-479.sgf), in der Schwarz nach den Pässen der KI
        fast alle eigenen Augen zugefüllt hat. Die große schwarze Gruppe
        behält ein T-förmiges Fünf-Punkte-Auge und lebt: B+93,5 wie GNU
        Go, vorher W+304,5. Dazu die Nakade-Formen auf kleinen Brettern.

   Aufruf:  node tests/zaehlung.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, NEIGHBORS, removeDeadGroups, toteSteineAmEnde} = KI;
const N = BOARD_SIZE, L = 'ABCDEFGHJKLMNOPQRST';
const punkt = v => (19 - +v.slice(1)) * 19 + L.indexOf(v[0]);
const name = i => L[i % 19] + (19 - Math.floor(i / 19));

function sgf(datei, bis = Infinity) {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', datei), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g, b = new Uint8Array(N); let m, k = 0;
  while ((m = re.exec(txt)) && k++ < bis) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; removeDeadGroups(b, 3 - f, i);
  }
  return b;
}
/* Fläche nach chinesischen Regeln, Komi 7,5; > 0 = Schwarz vorn */
function stand(board, tot) {
  const b = new Uint8Array(N); for (let i = 0; i < N; i++) b[i] = tot[i] ? 0 : board[i];
  const f = {1: 0, 2: 0}, v = new Uint8Array(N);
  for (let i = 0; i < N; i++) if (b[i]) f[b[i]]++;
  for (let i = 0; i < N; i++) {
    if (b[i] || v[i]) continue;
    const q = [i]; v[i] = 1; let r = 0;
    for (let k = 0; k < q.length; k++) for (const n of NEIGHBORS[q[k]]) {
      if (!b[n]) { if (!v[n]) { v[n] = 1; q.push(n); } } else r |= b[n];
    }
    if (r === 1 || r === 2) f[r] += q.length;
  }
  return f[1] - f[2] - 7.5;
}
/* Brett aus Zeilen: x Schwarz, o Weiß, . leer; oben links = A19 */
function zeichne(zeilen) {
  const b = new Uint8Array(N);
  zeilen.forEach((z, y) => [...z].forEach((c, x) => { b[y * 19 + x] = c === 'x' ? 1 : c === 'o' ? 2 : 0; }));
  return b;
}
const toteListe = tot => [...tot].map((t, i) => t ? i : -1).filter(i => i >= 0);

test('Partie vom 12.10.: genau die acht schwarzen Steine oben rechts tot, W+102,5 wie GNU Go', () => {
  const b = sgf('zaehlung-358.sgf'), tot = toteSteineAmEnde(b);
  const erwartet = ['R19', 'Q18', 'R18', 'S18', 'T18', 'S17', 'T17', 'S16'].map(punkt).sort((x, y) => x - y);
  pruefeGleich(toteListe(tot).map(name).join(' '), erwartet.map(name).join(' '), 'tote Steine');
  pruefe(!tot[punkt('H19')] && !tot[punkt('A13')], 'H19 und A13 leben');
  pruefeGleich(stand(b, tot), -102.5, 'Stand (Schwarz − Weiß − Komi)');
});

test('kleine Bretter: Eindringling, zwei Augen, Zwei-Punkte-Auge, großes Auge', () => {
  /* Weiß hält die Ecke oben links mit einer Mauer; Schwarz den Rest.
     Ein schwarzer Stein in der weißen Ecke ist tot. */
  const mauer = [
    '..o..x',
    '.x.o.x',
    '...o.x',
    'oooo.x',
    'xxxxxx',
  ];
  let b = zeichne(mauer), tot = toteSteineAmEnde(b);
  pruefe(tot[punkt('B18')], 'Eindringling B18 tot');
  pruefe(toteListe(tot).length === 1, `nur der Eindringling (${toteListe(tot).map(name)})`);
  /* Eine weiße Gruppe mit zwei getrennten Augen, eingeschlossen von Schwarz */
  b = zeichne([
    'o.o.ox',
    'ooooox',
    'xxxxxx',
  ]);
  tot = toteSteineAmEnde(b);
  pruefe(toteListe(tot).length === 0, `zwei Augen: lebt (${toteListe(tot).map(name)})`);
  /* Dieselbe Gruppe mit nur einem Zwei-Punkte-Auge: tot */
  b = zeichne([
    'o..oox',
    'ooooox',
    'xxxxxx',
  ]);
  tot = toteSteineAmEnde(b);
  pruefe(tot[punkt('A19')] && tot[punkt('A18')], 'Zwei-Punkte-Auge: tot');
  /* Ein Auge mit sechs Punkten reicht */
  b = zeichne([
    '......ox',
    'ooooooox',
    'xxxxxxxx',
  ]);
  tot = toteSteineAmEnde(b);
  pruefe(toteListe(tot).length === 0, `großes Auge: lebt (${toteListe(tot).map(name)})`);
});

test('unfertige Stellungen: nach 60 Zügen nichts tot, aufgegebene Partie nicht absurd', () => {
  pruefeGleich(toteListe(toteSteineAmEnde(sgf('laufkampf-211.sgf', 60))).length, 0, 'tote Steine nach 60 Zügen');
  const b = sgf('aufgabe-151.sgf'), s = stand(b, toteSteineAmEnde(b));
  /* GNU Go zählt die Stellung als B+51,5; ohne Sperre für offene
     Regionen ergab die neue Regel B+353,5. */
  pruefe(s > 20 && s < 80, `Stand ${s}`);
});

test('Partie vom 13.10.: T-förmiges Fünf-Punkte-Auge lebt, B+93,5 wie GNU Go', () => {
  const b = sgf('auge-479.sgf'), tot = toteSteineAmEnde(b);
  pruefeGleich(toteListe(tot).length, 0, 'keine toten Steine (GNU Go: keine)');
  pruefeGleich(stand(b, tot), 93.5, 'Stand (Schwarz − Weiß − Komi)');
});

test('Form eines einzelnen Auges: 4 und 5 Punkte leben, Nakade-Formen sterben', () => {
  /* Weiße Gruppe aus einer Kette mit genau einem Auge, rundum Schwarz */
  const lebt = (zeilen, text) => {
    const tot = toteSteineAmEnde(zeichne(zeilen));
    pruefe(toteListe(tot).length === 0, `${text}: lebt (${toteListe(tot).map(name)})`);
  };
  const stirbt = (zeilen, text) => {
    const b = zeichne(zeilen), tot = toteSteineAmEnde(b);
    const weiss = [...b].filter(v => v === 2).length;
    pruefe(toteListe(tot).length === weiss, `${text}: tot (${toteListe(tot).length} von ${weiss})`);
  };
  lebt(['....ox', 'ooooox', 'xxxxxx'], 'gerade Vier');
  lebt(['...ox', 'o.oox', 'o.oox', 'oooox', 'xxxxx'], 'T-förmige Fünf');
  stirbt(['...ox', 'o.oox', 'oooox', 'xxxxx'], 'Pyramide (4)');
  stirbt(['..ox', '..ox', 'ooox', 'xxxx'], 'Quadrat (4)');
  stirbt(['...ox', '..oox', 'oooox', 'xxxxx'], 'bauchige Fünf');
  stirbt(['ooooox', 'oo.oox', 'o...ox', 'oo.oox', 'ooooox', 'xxxxxx'], 'Kreuz (5)');
  /* Das Auge grenzt an zwei Ketten (E19 hängt nur schräg an D18): Die
     Form zählt nicht, Schwarz schneidet bei E18. */
  stirbt(['....ox', 'oooo.x', 'xxxxxx'], 'gerade Vier an zwei Ketten');
});

laufeTests('Tote Steine am Partieende (toteSteineAmEnde)').then(ok => process.exit(ok ? 0 : 1));
