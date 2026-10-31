// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagnose „Abräumen am Partieende“ (docs/endspiel-abraeumen.md): Spielt die
   KI nach dem Pass des Gegners unnötig weiter, oder passt sie schon und der
   Gegner spielt weiter?

   Je Partie wird die Zugfolge nachgespielt und die Endphase vermessen:

     letzter Gegnerstein   der letzte Zug des Gegners, der kein Pass war
     Endphase              alle Züge danach; der Gegner passt nur noch
     KI-Züge in der Endphase   Steine, die die KI dort noch setzt
       davon schlagend     Züge, die dabei Steine nehmen (Abräumen)
       davon ohne Schlag   Züge ohne Schlag (Auffüllen, Grenze, Neutral)
     Gegnerpässe vor dem Ende   Pässe des Gegners ab dem letzten Gegnerstein
     Ende                  2× Pass | Zuglimit/Abbruch (getrennt ausgewiesen)

   Unterschieden wird so „KI spielt unnötig weiter“ (viele KI-Züge in der
   Endphase, Gegner passt) von „KI passt bereits, der Gegner spielt weiter“
   (Endphase ohne KI-Züge, Gegnerzüge nach dem ersten KI-Pass).

   Eingaben: Datensätze von gnugo-duell.js (.jsonl, .jsonl.gz; KI = wirFarbe,
   Schwarz beginnt bei `beginnt` S) mit `--name`, oder SGF-Partien mit
   `--sgf datei:KI-Farbe` (B oder W; Passe als `[]` oder `[tt]`). Es wird
   nur gelesen und gezählt, nichts gespielt.

   Aufruf:  node auswertung/endspiel/abraeumen-diagnose.js
              [--gruppe name=datei[,datei...]] [--sgf datei:W ...] */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');
const K = require('../komi/k-schaetzung.js');

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { const x = SPALTEN.indexOf(s[0]), r = +s.slice(1); if (x < 0 || !(r >= 1 && r <= 19)) throw new Error('Koordinate unlesbar: ' + s); return (19 - r) * 19 + x; };

/* SGF-Hauptlinie: [{farbe: 1|2, punkt: Index | -1 (Pass)}] */
function sgfZuege(text) {
  const z = [];
  const re = /;\s*([BW])\[([a-z]{0,2})\]/g;
  let m;
  while ((m = re.exec(text))) {
    const k = m[2];
    const farbe = m[1] === 'B' ? 1 : 2;
    if (k === '' || k === 'tt') z.push({farbe, punkt: -1});
    else z.push({farbe, punkt: (k.charCodeAt(1) - 97) * 19 + (k.charCodeAt(0) - 97)});
  }
  return z;
}

/* Zugfolge eines Datensatzes von gnugo-duell.js */
function recordZuege(r) {
  const erste = r.beginnt === 'S' ? 1 : 2;
  return r.zuege.map((m, i) => ({farbe: i % 2 === 0 ? erste : 3 - erste, punkt: m === 'pass' ? -1 : vonGtp(m)}));
}

/* Vermessen: zuege = [{farbe, punkt}], kiFarbe = 1|2, vorgabe = Steine (Indizes) für Schwarz */
function messen(E, zuege, kiFarbe, vorgabe = []) {
  const board = new Uint8Array(E.BOARD_SIZE);
  for (const p of vorgabe) board[p] = 1;
  const schlag = [];
  for (const z of zuege) {
    if (z.punkt < 0) { schlag.push(0); continue; }
    board[z.punkt] = z.farbe;
    schlag.push(E.removeDeadGroups(board, 3 - z.farbe, z.punkt));
  }
  const gegner = 3 - kiFarbe;
  let letzter = -1;
  zuege.forEach((z, i) => { if (z.farbe === gegner && z.punkt >= 0) letzter = i; });
  const n = zuege.length;
  let kiZuege = 0, kiSchlag = 0, gegnerPaesse = 0, kiPaesse = 0;
  for (let i = letzter + 1; i < n; i++) {
    const z = zuege[i];
    if (z.farbe === kiFarbe) { if (z.punkt >= 0) { kiZuege++; if (schlag[i] > 0) kiSchlag++; } else kiPaesse++; }
    else gegnerPaesse++;
  }
  /* Gegner spielt nach dem ersten KI-Pass noch Steine? */
  let ersterKiPass = -1;
  zuege.forEach((z, i) => { if (ersterKiPass < 0 && z.farbe === kiFarbe && z.punkt < 0) ersterKiPass = i; });
  const gegnerNachKiPass = ersterKiPass >= 0 ? zuege.slice(ersterKiPass + 1).filter(z => z.farbe === gegner && z.punkt >= 0).length : 0;
  const endetMitZweiPaessen = n >= 2 && zuege[n - 1].punkt < 0 && zuege[n - 2].punkt < 0;
  return {zuege: n, endphaseZuege: n - 1 - letzter, kiZuege, kiSchlag, kiOhneSchlag: kiZuege - kiSchlag, gegnerPaesse, kiPaesse,
          gegnerNachKiPass, ende: endetMitZweiPaessen ? 'zwei Pässe' : 'ohne zwei Pässe'};
}

const quantil = (a, q) => { if (!a.length) return NaN; const s = [...a].sort((x, y) => x - y); const i = (s.length - 1) * q, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); };
const f1 = v => Number.isFinite(v) ? v.toFixed(1).replace('.', ',') : '–';

/* Zusammenfassung einer Gruppe von Messungen */
function zusammen(ms) {
  const ok = ms.filter(m => m.ende === 'zwei Pässe');
  const col = k => ok.map(m => m[k]);
  const mit = pred => ok.filter(pred).length;
  return {
    partien: ms.length, zweiPaesse: ok.length, ohneZweiPaesse: ms.length - ok.length,
    kiZuegeMittel: ok.length ? col('kiZuege').reduce((a, b) => a + b, 0) / ok.length : NaN,
    kiZuegeMedian: quantil(col('kiZuege'), 0.5), kiZuegeP90: quantil(col('kiZuege'), 0.9), kiZuegeMax: ok.length ? Math.max(...col('kiZuege')) : NaN,
    schlagMittel: ok.length ? col('kiSchlag').reduce((a, b) => a + b, 0) / ok.length : NaN,
    ohneSchlagMittel: ok.length ? col('kiOhneSchlag').reduce((a, b) => a + b, 0) / ok.length : NaN,
    anteilMitKiZuegen: ok.length ? mit(m => m.kiZuege > 0) / ok.length : NaN,
    anteilGegnerNachKiPass: ok.length ? mit(m => m.gegnerNachKiPass > 0) / ok.length : NaN,
    anteilUeber10: ok.length ? mit(m => m.kiZuege > 10) / ok.length : NaN,
  };
}

function text(gruppen) {
  const o = ['| Gruppe | Partien | zwei Pässe | ohne (Limit/Abbruch) | KI-Züge Ø | Median | 90 % | Max | davon schlagend Ø | ohne Schlag Ø | Anteil mit KI-Zügen | über 10 | Gegner spielt nach KI-Pass |',
    '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const [name, ms] of Object.entries(gruppen)) {
    const s = zusammen(ms), pz = v => Number.isFinite(v) ? (100 * v).toFixed(1).replace('.', ',') + ' %' : '–';
    o.push(`| ${name} | ${s.partien} | ${s.zweiPaesse} | ${s.ohneZweiPaesse} | ${f1(s.kiZuegeMittel)} | ${f1(s.kiZuegeMedian)} | ${f1(s.kiZuegeP90)} | ${f1(s.kiZuegeMax)} | ${f1(s.schlagMittel)} | ${f1(s.ohneSchlagMittel)} | ${pz(s.anteilMitKiZuegen)} | ${pz(s.anteilUeber10)} | ${pz(s.anteilGegnerNachKiPass)} |`);
  }
  return o.join('\n') + '\n';
}

function leseRecords(datei) {
  const r = fs.readFileSync(datei);
  return (datei.endsWith('.gz') ? zlib.gunzipSync(r) : r).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x));
}

module.exports = {sgfZuege, recordZuege, messen, zusammen, text, quantil};

if (require.main === module) {
  const a = process.argv.slice(2), gruppen = {}, ausgewaehlt = [];
  let E = null;
  const motor = () => E || (E = K.motor(path.join(__dirname, '..', '..', 'index.html')));
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--gruppe') {
      const m = /^([^=]+)=(.+)$/.exec(a[++i] || '');
      if (!m) { console.error('--gruppe name=datei[,datei...] erwartet'); process.exit(2); }
      const ms = [];
      for (const d of m[2].split(',')) for (const r of leseRecords(d)) {
        if (r.abgebrochen || !Array.isArray(r.zuege) || !r.wirFarbe) continue;
        const ki = r.wirFarbe === 'S' ? 1 : 2;
        const vor = (r.vorgabeSteine || []).map(vonGtp);
        ms.push(messen(motor(), recordZuege(r), ki, vor));
      }
      gruppen[m[1]] = ms;
    } else if (a[i] === '--sgf') {
      const m = /^(.+):([BW])$/.exec(a[++i] || '');
      if (!m) { console.error('--sgf datei:B|W erwartet'); process.exit(2); }
      const zuege = sgfZuege(fs.readFileSync(m[1], 'utf8'));
      const mes = messen(motor(), zuege, m[2] === 'B' ? 1 : 2);
      (gruppen['Mensch (SGF)'] = gruppen['Mensch (SGF)'] || []).push(mes);
      ausgewaehlt.push(`${path.basename(m[1])}: ${mes.zuege} Züge, Endphase ${mes.endphaseZuege} Züge, KI-Züge ${mes.kiZuege} (schlagend ${mes.kiSchlag}), Gegnerpässe ${mes.gegnerPaesse}, Ende: ${mes.ende}`);
    } else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
  }
  if (!Object.keys(gruppen).length) { console.error('Aufruf: node auswertung/endspiel/abraeumen-diagnose.js [--gruppe name=datei,...] [--sgf datei:B|W ...]'); process.exit(2); }
  process.stdout.write(text(gruppen));
  if (ausgewaehlt.length) process.stdout.write('\nEinzelne SGF-Partien:\n\n' + ausgewaehlt.map(x => '- ' + x).join('\n') + '\n');
}
