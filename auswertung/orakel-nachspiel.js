// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Orakel-Test, Zusatz (nicht vorab festgelegt, docs/muster-endspiel-orakel.md §8):
   Hängt der Gewinn des Orakels daran, dass es früher passt? Die KI spielt ohne
   Orakel nach dem ersten Pass der Partie im Mittel noch rund 29 Züge weiter
   (GNU Go Stufe 1 passt, die KI nicht). Hier wird gezählt, was das ändert.

   Die aufgezeichneten Partien (jsonl, auch .gz) werden in GNU Go nachgespielt
   (Stufe 1, Chinese rules, Komi und Vorgabe aus der Aufzeichnung: wie im Duell
   `gnugo-duell.js`). GNU Gos final_score zählt die Stellung unmittelbar nach dem
   ersten Pass und die Schlussstellung. Der Unterschied ist das, was die Züge
   nach dem ersten Pass am Endstand ändern; aus Sicht der KI, positiv = die KI
   gewinnt durch das Weiterspielen. Die Schlussstellung muss den aufgezeichneten
   Endstand ergeben (Kontrolle des Nachspielens).

   Aufruf:
     node auswertung/orakel-nachspiel.js [--gnugo /usr/games/gnugo] [--partien N] datei.jsonl[.gz] ...
   Ausgabe: je Datei eine Zeile. Braucht GNU Go; ein final_score dauert rund 1,5 s,
   ein Arm mit 120 Partien also rund vier Minuten. */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const {spawn} = require('child_process');

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - mittel(a)) ** 2, 0) / (a.length - 1)) : 0;
const f1 = v => v.toFixed(1).replace('.', ',');
const fv = (v, n) => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(n).replace('.', ',');

/* Index des ersten Passes in der Zugfolge, -1 ohne Pass */
function ersterPass(zuege) { return zuege.indexOf('pass'); }

/* GNU Gos Antwort auf final_score ("B+12.5", "W+3.5", "0") aus Sicht der KI */
function ausSicht(antwort, kiSchwarz) {
  const m = /^([BW])\+([\d.]+)/.exec(antwort.trim());
  if (!m) return 0;
  return ((m[1] === 'B') === kiSchwarz ? 1 : -1) * +m[2];
}

/* Zusammenfassung über die nachgerechneten Partien:
   {ende, erster, nach, schluss}: Endstand, Stand nach dem ersten Pass (nur mit Pass),
   Züge nach dem ersten Pass, aufgezeichneter Endstand */
function auswerten(zeilen) {
  const mit = zeilen.filter(z => z.erster >= 0);
  const diff = mit.map(z => z.ende - z.nach);
  return {
    partien: zeilen.length,
    gleich: zeilen.filter(z => z.ende === z.aufgezeichnet).length,
    endeMittel: mittel(zeilen.map(z => z.ende)),
    nachMittel: mit.length ? mittel(mit.map(z => z.nach)) : null,
    diffMittel: diff.length ? mittel(diff) : null,
    diffSd: sd(diff),
    diffSe: diff.length > 1 ? sd(diff) / Math.sqrt(diff.length) : null,
    geaendert: diff.filter(d => d !== 0).length,
    zuegeDanach: mit.length ? mittel(mit.map(z => z.laenge - z.erster)) : null,
    ohnePass: zeilen.length - mit.length,
  };
}

function text(name, a) {
  return `${name}: ${a.partien} Partien · Nachrechnung gleich der Aufzeichnung: ${a.gleich} von ${a.partien}`
    + ` · Endstand Ø ${f1(a.endeMittel)} · nach dem ersten Pass Ø ${a.nachMittel === null ? '–' : f1(a.nachMittel)}`
    + (a.diffMittel === null ? '' : ` · Ende − nach erstem Pass Ø ${fv(a.diffMittel, 2)} (SD ${f1(a.diffSd)}, SE ${a.diffSe === null ? '–' : a.diffSe.toFixed(2).replace('.', ',')}), ${a.geaendert} Partien mit Änderung`)
    + (a.zuegeDanach === null ? '' : ` · Züge nach dem ersten Pass Ø ${f1(a.zuegeDanach)}`)
    + (a.ohnePass ? ` · ${a.ohnePass} Partien ohne Pass` : '');
}

function liesJsonl(datei) {
  let b = fs.readFileSync(datei);
  if (datei.endsWith('.gz')) b = zlib.gunzipSync(b);
  return b.toString().split('\n').filter(Boolean).map(l => JSON.parse(l));
}

/* Ein GNU Go im GTP-Modus, Befehle nacheinander */
function gtp(gnugo, komi) {
  const p = spawn(gnugo, ['--mode', 'gtp', '--level', '1', '--chinese-rules', '--komi', String(komi), '--never-resign'],
    {stdio: ['pipe', 'pipe', 'ignore']});
  let puffer = '', wartend = null;
  const fertig = e => { const w = wartend; wartend = null; if (w) w.fehler(e); };
  p.on('exit', () => fertig(new Error('GNU Go beendet')));
  p.stdout.on('data', d => {
    puffer += d;
    let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) {
      const antwort = puffer.slice(0, k); puffer = puffer.slice(k + 2);
      const w = wartend; wartend = null;
      if (w) antwort.startsWith('=') ? w.ok(antwort.slice(1).trim()) : w.fehler(new Error(antwort));
    }
  });
  return {
    frage: b => new Promise((ok, fehler) => { wartend = {ok, fehler}; p.stdin.write(b + '\n'); }),
    ende: () => p.kill(),
  };
}

async function nachrechnen(partien, gnugo) {
  const aus = [];
  const g = gtp(gnugo, partien[0].komi);
  for (const q of partien) {
    if (q.abgebrochen) continue;
    await g.frage('boardsize 19'); await g.frage('clear_board'); await g.frage('komi ' + q.komi);
    if (q.vorgabe >= 2) await g.frage('fixed_handicap ' + q.vorgabe);
    const kiSchwarz = q.wirFarbe === 'S';
    let farbe = q.beginnt === 'S' ? 'B' : 'W', erster = -1, nach = null;
    for (let i = 0; i < q.zuege.length; i++) {
      await g.frage(`play ${farbe} ${q.zuege[i]}`);
      farbe = farbe === 'B' ? 'W' : 'B';
      if (q.zuege[i] === 'pass' && erster < 0) { erster = i; nach = ausSicht(await g.frage('final_score'), kiSchwarz); }
    }
    aus.push({nr: q.nr, erster, laenge: q.zuege.length, nach, ende: ausSicht(await g.frage('final_score'), kiSchwarz), aufgezeichnet: q.endstand});
  }
  g.ende();
  return aus;
}

async function main() {
  const a = process.argv.slice(2), dateien = [];
  let gnugo = '/usr/games/gnugo', nur = Infinity;
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--gnugo') gnugo = a[++i];
    else if (a[i] === '--partien') nur = +a[++i];
    else dateien.push(a[i]);
  }
  if (!dateien.length) { console.error('Aufruf: node auswertung/orakel-nachspiel.js [--gnugo PFAD] [--partien N] datei.jsonl[.gz] ...'); process.exit(1); }
  for (const d of dateien) {
    const partien = liesJsonl(d).filter(p => !p.abgebrochen).slice(0, nur);
    console.log(text(path.basename(d).replace(/\.jsonl(\.gz)?$/, ''), auswerten(await nachrechnen(partien, gnugo))));
  }
}

if (require.main === module) main().catch(e => { console.error(e.message); process.exit(1); });
module.exports = {ersterPass, ausSicht, auswerten, text, liesJsonl, nachrechnen};
