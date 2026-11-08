// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Nachtrag zu docs/zaehlung-mechanismus.md (§12): Einzelanalyse der Gegenprobe „keine Verbandsbildung über gemeinsame Freiheiten“
   je V-Stellung, nur aus der GESPEICHERTEN Ausgabe (docs/daten/zaehlung-mechanismus/gegenprobe-freiheitsverband.json). Keine Engine,
   keine Rohdaten der Stufe C, kein GNU Go, kein Browser; es wird nichts neu gerechnet außer Summen und Differenzen der Steine.
   Je V-Stellung: Steine „nur GNU tot“ plus „nur App tot“ im Original und in der Variante, Klasse gleich/besser/schlechter/gemischt
   (gleich = gleiche Ketten, besser/schlechter nach der Summe der Steine), die vier Restfälle im Einzelnen, die in der Variante
   veränderten oder neuen Ketten, und die Nettozunahme außerhalb von V aus den gespeicherten Summen (kein Zählen neuer Fehlklassifikationen).
   Aufruf: node freiheitsverband-je-stellung.js <gegenprobe-freiheitsverband.json> */
'use strict';
const G = require('./gemeinsam.js');
const d = JSON.parse(G.fs.readFileSync(process.argv[2], 'utf8')), e = d.vStellungenEinzeln, k = d.kennzahlen;
const st = l => l.reduce((s, x) => s + x.steine, 0), sig = l => l.map(x => x.punkte.join(' ')).sort().join('|');
const kurz = s => s.split('|').slice(1).join('|');
console.log(`Variante ${d.variante}; index.html SHA-256 ${d.htmlSha256}; V-Stellungen ${e.length}`);
console.log('Gespeicherte Summen V      :', JSON.stringify(k.vOriginal), '->', JSON.stringify(k.vVariante));
console.log('Gespeicherte Summen alle   :', JSON.stringify(k.alleOriginal), '->', JSON.stringify(k.alleVariante));
const kl = {gleich: 0, besser: 0, schlechter: 0, gemischt: 0};
console.log('\nJe V-Stellung (Steine nur GNU tot + nur App tot; Klasse nach Ketten und Summe):');
for (const x of e) {
  const oG = x.original.nurGnuTot, oA = x.original.nurAppTot, vG = x.variante.nurGnuTot, vA = x.variante.nurAppTot;
  const dO = st(oG) + st(oA), dV = st(vG) + st(vA), gleich = sig(oG) === sig(vG) && sig(oA) === sig(vA);
  const c = gleich ? 'gleich' : dV < dO ? 'besser' : dV > dO ? 'schlechter' : 'gemischt'; kl[c]++;
  console.log(`${kurz(x.schluessel).padEnd(18)} Abweichung ${String(dO).padStart(3)} -> ${String(dV).padStart(3)} | nur GNU tot ${String(st(oG)).padStart(3)} -> ${String(st(vG)).padStart(3)} | nur App tot ${String(st(oA)).padStart(3)} -> ${String(st(vA)).padStart(3)} | ${c}`);
}
console.log('Klassen:', JSON.stringify(kl));
const liste = l => `${l.length} Ketten, ${st(l)} Steine: ${l.map(x => x.farbe + ' ' + x.steine).join(', ')}`;
console.log('\nRestfälle der Diagonalauge-Gegenprobe im Einzelnen (Freiheitsverband-Variante):');
for (const x of e.filter(x => /\|(523\|354|889\|372|622\|307|212\|337)$/.test(x.schluessel))) {
  console.log(kurz(x.schluessel));
  for (const w of ['original', 'variante']) for (const a of ['nurGnuTot', 'nurAppTot']) console.log(`    ${w.padEnd(8)} ${a.padEnd(9)} ${liste(x[w][a])}`);
}
console.log('\nVeränderte oder neue Ketten in der Variante:');
for (const x of e) {
  const o = new Set(x.original.nurGnuTot.map(c => c.punkte.join(' '))), v = new Set(x.variante.nurGnuTot.map(c => c.punkte.join(' ')));
  const weg = x.original.nurGnuTot.filter(c => !v.has(c.punkte.join(' '))), oA = new Set(x.original.nurAppTot.map(c => c.punkte.join(' ')));
  const neu = x.variante.nurAppTot.filter(c => !oA.has(c.punkte.join(' ')));
  const ng = x.variante.nurGnuTot.filter(c => !o.has(c.punkte.join(' ')));
  if (!weg.length && !neu.length && !ng.length) continue;
  console.log(kurz(x.schluessel));
  for (const c of weg) console.log(`    nicht mehr „nur GNU tot“: ${c.farbe} ${c.steine} Steine [${c.punkte.join(',')}]`);
  for (const c of ng) console.log(`    neu „nur GNU tot“: ${c.farbe} ${c.steine} Steine [${c.punkte.slice(0, 6).join(',')}${c.punkte.length > 6 ? ',…' : ''}]`);
  for (const c of neu) console.log(`    neu „nur App tot“: ${c.farbe} ${c.steine} Steine [${c.punkte.slice(0, 6).join(',')}${c.punkte.length > 6 ? ',…' : ''}]`);
}
const nA = (k.alleVariante.steineNurAppTot - k.alleOriginal.steineNurAppTot) - (k.vVariante.steineNurAppTot - k.vOriginal.steineNurAppTot);
const nG = (k.alleVariante.steineNurGnuTot - k.alleOriginal.steineNurGnuTot) - (k.vVariante.steineNurGnuTot - k.vOriginal.steineNurGnuTot);
console.log('\nAußerhalb von V (aus den gespeicherten Summen, Nettoänderung der Steine, nicht je Stellung gesehen):');
console.log(`  nur App tot: (${k.alleVariante.steineNurAppTot} − ${k.alleOriginal.steineNurAppTot}) − (${k.vVariante.steineNurAppTot} − ${k.vOriginal.steineNurAppTot}) = ${nA}`);
console.log(`  nur GNU tot: (${k.alleVariante.steineNurGnuTot} − ${k.alleOriginal.steineNurGnuTot}) − (${k.vVariante.steineNurGnuTot} − ${k.vOriginal.steineNurGnuTot}) = ${nG}`);
console.log('  Das ist die Nettozunahme beziehungsweise -abnahme, nicht zwingend die Zahl neu entstandener Fehlklassifikationen (Steine können in beide Richtungen wechseln).');
