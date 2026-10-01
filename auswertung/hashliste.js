/* Hash-Liste eines Laufs: kleiner Fingerabdruck statt Rohdump.

   Die Rohdumps eines 360-Partien-Laufs sind einige Megabyte groß und lassen
   sich mit mctsFixedSims jederzeit neu erzeugen. Aufgehoben wird deshalb nur,
   woran man eine Wiederholung Partie für Partie prüfen kann: params_hash,
   final_board_hash und Sieger je Partie (docs/pilot-benson-defense.md, §14.4).

   Aufruf:
     node auswertung/hashliste.js <dump.jsonl> --lauf <name> [--befehl "<...>"]
         schreibt die Liste als JSON auf stdout
     node auswertung/hashliste.js <dump.jsonl> --pruefe <liste.json>
         prüft einen neuen Dump gegen eine gespeicherte Liste; Exit 1 bei
         jeder Abweichung */
'use strict';
const fs = require('fs');

function lies(datei) {
  return fs.readFileSync(datei, 'utf8').trim().split('\n').map(z => JSON.parse(z));
}

function liste(P, lauf, befehl) {
  const ph = [...new Set(P.map(p => p.params_hash))];
  return {
    lauf, befehl: befehl || null,
    seed: P[0] ? P[0].seed : null,
    partien: P.length,
    params_hash: ph.length === 1 ? ph[0] : ph,
    sieger: P.map(p => p.sieger).join(''),
    final_board_hash: P.map(p => p.final_board_hash)
  };
}

function pruefe(P, L) {
  const fehler = [];
  const ph = [...new Set(P.map(p => p.params_hash))];
  if (ph.length !== 1 || ph[0] !== L.params_hash)
    fehler.push(`params_hash: ${ph.join(',')} statt ${L.params_hash}`);
  if (P.length !== L.partien) fehler.push(`Partien: ${P.length} statt ${L.partien}`);
  const n = Math.min(P.length, L.partien);
  for (let i = 0; i < n; i++) {
    if (P[i].final_board_hash !== L.final_board_hash[i])
      fehler.push(`Partie ${i + 1}: final_board_hash weicht ab`);
    if (P[i].sieger !== L.sieger[i]) fehler.push(`Partie ${i + 1}: Sieger ${P[i].sieger} statt ${L.sieger[i]}`);
  }
  return fehler;
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {};
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--lauf') opt.lauf = a[++i];
    else if (a[i] === '--befehl') opt.befehl = a[++i];
    else if (a[i] === '--pruefe') opt.pruefe = a[++i];
  }
  if (!a[0] || (!opt.lauf && !opt.pruefe)) {
    console.error('Aufruf: node auswertung/hashliste.js <dump.jsonl> (--lauf <name> [--befehl "..."] | --pruefe <liste.json>)');
    process.exit(2);
  }
  const P = lies(a[0]);
  if (opt.pruefe) {
    const f = pruefe(P, JSON.parse(fs.readFileSync(opt.pruefe, 'utf8')));
    if (f.length) { console.log(f.slice(0, 20).join('\n')); console.log(`${f.length} Abweichungen`); process.exit(1); }
    console.log(`${P.length} Partien, alle identisch mit ${opt.pruefe}`);
  } else {
    process.stdout.write(JSON.stringify(liste(P, opt.lauf, opt.befehl), null, 1) + '\n');
  }
}

module.exports = {liste, pruefe};
