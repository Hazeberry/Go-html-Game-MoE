// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Passregel-Vergleich, Pflichtprüfung §9 Nr. 4 „Nachspiel-Kontrolle am Archiv“.

   WAS SIE BESTÄTIGT: (a) Die archivierten Züge sind in GNU Go regelkonform einspielbar (jedes `play` wird
   angenommen), und (b) GNU Gos final_score der Schlussstellung gleich dem archivierten Endstand: der Schiedsrichter
   und die Aufzeichnung stimmen überein.
   WAS SIE NICHT BESTÄTIGT: dass die heutige Engine dieselben Züge wählen würde (die Archive stammen von älteren
   Ständen; das wäre eine eigene, hier nicht verlangte Prüfung), und Brett und Gefangene der Engine (das prüft die
   Fortsetzung je Einheit gegen `list_stones` und `captures`). Das eine gilt nicht als Nachweis für das andere.

   Verfahren:
   Je Gruppe werden die ersten N Partien (Standard 10) vollständig in GNU Go (Stufe 1, chinesische
   Regeln, Komi aus der Aufzeichnung) eingespielt. GNU Gos final_score der Schlussstellung muss den
   aufgezeichneten Endstand ergeben. Verfahren und Zählung wie `orakel-nachspiel.js`.
   Braucht GNU Go, läuft in GitHub Actions (CLAUDE.md), nichts am Spielcode.

   Aufruf:
     node auswertung/endspiel/passregel-nachspiel-kontrolle.js --aus datei.json [--je 10] [--gnugo /usr/games/gnugo]
        --gruppe "name=datei[,datei...]" ...
   Code 1, wenn eine Gruppe weniger als N Partien hat oder eine Nachrechnung abweicht. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./passregel-lib.js');
const {nachrechnen} = require('../orakel-nachspiel.js');

async function kontrolle(gruppen, je, gnugo) {
  const aus = [];
  for (const g of gruppen) {
    const partien = g.dateien.flatMap(d => L.leseJsonl(d)).filter(p => !p.abgebrochen && Array.isArray(p.zuege)).slice(0, je);
    const z = partien.length ? await nachrechnen(partien, gnugo) : [];
    const abweichend = z.filter(x => x.ende !== x.aufgezeichnet).map(x => ({nr: x.nr, ende: x.ende, aufgezeichnet: x.aufgezeichnet}));
    aus.push({name: g.name, verlangt: je, geprueft: z.length, gleich: z.length - abweichend.length, abweichend});
  }
  return {ok: aus.every(g => g.geprueft >= je && g.abweichend.length === 0), je, gruppen: aus,
          bestaetigt: 'Archivzugfolge in GNU Go regelkonform einspielbar; GNU Gos final_score der Schlussstellung gleich dem archivierten Endstand',
          nichtBestaetigt: 'Dass die heutige Engine dieselben Züge wählen würde; Brett und Gefangene der Engine (prüft die Fortsetzung je Einheit)'};
}

async function main() {
  const a = process.argv.slice(2), opt = {aus: null, je: 10, gnugo: '/usr/games/gnugo', gruppen: []};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    if (a[i] === '--aus') { opt.aus = v; i++; }
    else if (a[i] === '--je') { opt.je = +v; i++; }
    else if (a[i] === '--gnugo') { opt.gnugo = v; i++; }
    else if (a[i] === '--gruppe') { const k = v.indexOf('='); opt.gruppen.push({name: v.slice(0, k), dateien: v.slice(k + 1).split(',')}); i++; }
    else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
  }
  if (!opt.aus || !opt.gruppen.length || !(opt.je >= 1)) { console.error('Aufruf: --aus datei.json --gruppe name=datei[,datei] ... [--je 10] [--gnugo pfad]'); process.exit(2); }
  if (!fs.existsSync(opt.gnugo)) { console.error('GNU Go nicht gefunden: ' + opt.gnugo); process.exit(2); }
  const r = await kontrolle(opt.gruppen, opt.je, opt.gnugo);
  fs.mkdirSync(path.dirname(path.resolve(opt.aus)), {recursive: true});
  fs.writeFileSync(opt.aus, JSON.stringify(r, null, 1));
  for (const g of r.gruppen) console.log(`${g.name}: ${g.gleich} von ${g.geprueft} gleich (verlangt ${g.verlangt})${g.abweichend.length ? ' ABWEICHUNG ' + JSON.stringify(g.abweichend) : ''}`);
  console.log(r.ok ? 'Nachspiel-Kontrolle bestanden.' : 'Nachspiel-Kontrolle NICHT bestanden.');
  process.exit(r.ok ? 0 : 1);
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
module.exports = {kontrolle};
