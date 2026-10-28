// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht des kurzen Laufs gegen Fuego (docs/fuego.md §9). Beschreibt nur,
   entscheidet nichts außer der vorab festgelegten Frage, ob der Lauf
   „zusammenläuft“: höchstens eine von 15 Partien abgebrochen.

   Je Partie gelesen: abgebrochen (mit Grund), Sieg, Endstand (GNU Gos
   Zählung aus Sicht der KI), Schätzung nach Zug 60, 120 und 200, Züge, und
   wie oft Fuego passt und wann zum ersten Mal. Dazu, falls angegeben, die
   Minuten je Teil (Dateien mit „<teil> <sekunden> <partien>“ je Zeile).

   Aufruf: node auswertung/fuego/kurz-bericht.js roh.jsonl [--zeit zeit.txt ...] [--markdown] */
'use strict';
const fs = require('fs');

const komma = (x, n = 1) => Number.isFinite(x) ? x.toFixed(n).replace('.', ',').replace(/^(\d)/, '+$1').replace(/^\+-/, '−').replace(/^-/, '−') : '–';
const mittel = l => l.length ? l.reduce((a, b) => a + b, 0) / l.length : NaN;
const sd = l => { if (l.length < 2) return NaN; const m = mittel(l); return Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / (l.length - 1)); };

/* Farbe des k-ten Zugs (0-basiert): erst `beginnt`, dann im Wechsel */
const farbeVon = (r, k) => (k % 2 === 0) === (r.beginnt === 'S') ? 'S' : 'W';

function auswertung(partien, zeiten = []) {
  const fertig = partien.filter(r => !r.abgebrochen), ab = partien.filter(r => r.abgebrochen);
  const fuegoPaesse = [], erster = [];
  for (const r of fertig) {
    const fuego = r.wirFarbe === 'S' ? 'W' : 'S';
    let n = 0, e = null;
    r.zuege.forEach((z, k) => { if (z === 'pass' && farbeVon(r, k) === fuego) { n++; if (e === null) e = k + 1; } });
    fuegoPaesse.push(n); if (e !== null) erster.push(e);
  }
  const sek = zeiten.reduce((a, z) => a + z.sekunden, 0), nZeit = zeiten.reduce((a, z) => a + z.partien, 0);
  const sch = z => fertig.map(r => r.schaetzung && r.schaetzung[z]).filter(Number.isFinite);
  return {
    n: partien.length, fertig: fertig.length, abgebrochen: ab.length, gruende: ab.map(r => `Partie ${r.nr}: ${r.abgebrochen}`),
    laeuft: ab.length <= 1 && partien.length > 0,
    siege: fertig.filter(r => r.gewonnen).length,
    zuglimit: fertig.filter(r => r.gewonnen === null).length,
    endstand: mittel(fertig.map(r => r.endstand)), endstandSd: sd(fertig.map(r => r.endstand)),
    nach60: mittel(sch(60)), nach120: mittel(sch(120)), nach200: mittel(sch(200)),
    zuege: mittel(fertig.map(r => r.zuegeAnzahl)),
    fuegoPaesse: mittel(fuegoPaesse), ersterPass: erster.length ? Math.min(...erster) : null,
    ersterPassMedian: erster.length ? erster.slice().sort((a, b) => a - b)[Math.floor(erster.length / 2)] : null,
    minutenJePartie: nZeit ? sek / nZeit / 60 : NaN,
    gegner: (fertig[0] || partien[0] || {}).gegner || null
  };
}

function text(a, md) {
  const z = [
    ['Partien', `${a.n} (${a.fertig} fertig, ${a.abgebrochen} abgebrochen)`],
    ['läuft zusammen (höchstens 1 abgebrochen)', a.laeuft ? '**ja**' : '**nein**'],
    ['Siege der KI', `${a.siege} von ${a.fertig}${a.zuglimit ? ` (${a.zuglimit} am Zuglimit, nicht ausgezählt)` : ''}`],
    ['Endstand Ø (SD)', `${komma(a.endstand)} (${Number.isFinite(a.endstandSd) ? a.endstandSd.toFixed(1).replace('.', ',') : '–'})`],
    ['Schätzung nach Zug 60 / 120 / 200', `${komma(a.nach60)} / ${komma(a.nach120)} / ${komma(a.nach200)}`],
    ['Züge Ø', Number.isFinite(a.zuege) ? a.zuege.toFixed(1).replace('.', ',') : '–'],
    ['Pässe von Fuego je Partie Ø', Number.isFinite(a.fuegoPaesse) ? a.fuegoPaesse.toFixed(1).replace('.', ',') : '–'],
    ['erster Pass von Fuego (frühester / Median), Zug', a.ersterPass === null ? '–' : `${a.ersterPass} / ${a.ersterPassMedian}`],
    ['Minuten je Partie', Number.isFinite(a.minutenJePartie) ? a.minutenJePartie.toFixed(1).replace('.', ',') : '–']
  ];
  const kopf = a.gegner ? `Gegner ${a.gegner.name}, ${a.gegner.spiele} Spiele je Zug, Schiedsrichter GNU Go Stufe ${a.gegner.schiedsrichterStufe}` : '';
  if (!md) return [kopf, ...z.map(([k, v]) => `${k}: ${v.replace(/\*\*/g, '')}`), ...a.gruende].filter(Boolean).join('\n');
  return [kopf, '', '| | |', '|---|---|', ...z.map(([k, v]) => `| ${k} | ${v} |`),
    ...(a.gruende.length ? ['', 'Abgebrochen:', '', ...a.gruende.map(g => `- ${g}`)] : [])].join('\n');
}

function main() {
  const arg = process.argv.slice(2), dateien = [], zeitDateien = []; let md = false;
  for (let i = 0; i < arg.length; i++) {
    if (arg[i] === '--markdown') md = true;
    else if (arg[i] === '--zeit') zeitDateien.push(arg[++i]);
    else dateien.push(arg[i]);
  }
  if (!dateien.length) { console.error('Aufruf: node auswertung/fuego/kurz-bericht.js roh.jsonl [--zeit zeit.txt ...] [--markdown]'); process.exit(2); }
  const partien = dateien.flatMap(d => fs.readFileSync(d, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)));
  const zeiten = zeitDateien.flatMap(d => fs.readFileSync(d, 'utf8').split('\n').filter(Boolean).map(z => {
    const [teil, sekunden, n] = z.trim().split(/\s+/).map(Number); return {teil, sekunden, partien: n};
  }));
  console.log(text(auswertung(partien, zeiten), md));
}

if (require.main === module) main();
module.exports = {auswertung, text, farbeVon};
