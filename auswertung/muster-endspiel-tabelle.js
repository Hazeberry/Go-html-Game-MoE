// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Muster: die Tabelle für den Schalter musterEndspiel erzeugen,
   auslesen und in eine index.html einsetzen. Gehört zu
   docs/muster-endspiel-spiel.md und docs/muster-endspiel-dagger.md.

   Der Schalter ist nicht in index.html auf main; er steht im Commit 63f727b
   (Zeile `const MUSTER_ENDSPIEL = {...};`). Dort setzt --index ein, und von
   dort liest --auslesen.

   Lernen (--lehr): mit dem Verfahren aus docs/muster-endspiel.md §5
   (gemeinsames Bradley-Terry-Modell, MM-Verfahren, 25 Durchläufe,
   Merkmalswerte erst ab fünf möglichen Fällen) die Gruppen m, l, z, d, u, k
   aus den Stellungen mit der KI am Zug, die Werte auf den Maßstab der Tabelle
   im Spiel gebracht (gleiche mittlere Streuung der Musterwerte je Stellung
   wie MUSTER_TABELLE, also gilt musterEndspiel 200 wie „Dosis 200“ in der
   Studie). Mit --index wird die Zeile in index.html ersetzt, mit --aus
   schreibt es die Tabelle als JSON.

   Aufruf:
     node auswertung/muster-endspiel-tabelle.js --lehr zw/entw-b,zw/pruef
         [--gruppen mlzduk] [--iter 25] [--min 5] [--skala auto|0.6]
         [--aus tabelle.json] [--index index.html]
     node auswertung/muster-endspiel-tabelle.js --auslesen index.html --aus tabelle.json
     node auswertung/muster-endspiel-tabelle.js --einsetzen tabelle.json --index index.html
   Die Zwischenspeicher (zw/…) erzeugt muster-endspiel-daten.js aus den
   Lehrdaten in docs/daten (siehe docs/muster-endspiel.md §8). */
'use strict';
const fs = require('fs');
const path = require('path');

const ZEILE = /^const MUSTER_ENDSPIEL = (.*);$/m;
const zeileAus = tabelle => 'const MUSTER_ENDSPIEL = {' + Object.keys(tabelle).sort().map(k => JSON.stringify(k) + ':' + tabelle[k]).join(',') + '};';

/* Tabelle aus index.html lesen */
function liesTabelle(indexPfad) {
  const m = ZEILE.exec(fs.readFileSync(path.resolve(indexPfad), 'utf8'));
  if (!m) throw new Error(`${indexPfad} enthält keine Zeile „const MUSTER_ENDSPIEL = …;“`);
  return JSON.parse(m[1]);
}
/* Tabelle in index.html einsetzen (ersetzt die Zeile) */
function setzeEin(indexPfad, tabelle) {
  const pfad = path.resolve(indexPfad), html = fs.readFileSync(pfad, 'utf8');
  if (!ZEILE.test(html)) throw new Error(`${indexPfad} enthält keine Zeile „const MUSTER_ENDSPIEL = …;“`);
  fs.writeFileSync(pfad, html.replace(ZEILE, () => zeileAus(tabelle)));
}

function lerne(opt) {
  const ME = require('./muster-endspiel.js');
  const D = ME.lade(opt.lehr);
  const train = D.pos.filter(p => p.c === 1);   /* nur Stellungen mit der KI (Schwarz) am Zug */
  const gruppen = opt.gruppen.split(''), sp = ME.gruppenSpalten(gruppen);
  console.error(`${train.length} Lernstellungen aus ${new Set(train.map(p => p.spiel)).size} Partien, Gruppen ${gruppen.join('')}`);
  const tab = ME.lerneMM(D, train, sp, opt.iter, opt.min);
  /* Maßstab: mittlere Streuung der Musterwerte je Stellung wie bei MUSTER_TABELLE (w0) */
  const K = D.K;
  const sigma0 = ME.streuung(D, train, (p, j) => D.w0[p.off + j]);
  const sigma = ME.streuung(D, train, (p, j) => { let s = 0; const o = (p.off + j) * K; for (const g of sp) s += tab[D.f[o + g]]; return s; });
  const skala = opt.skala === 'auto' ? sigma0 / sigma : +opt.skala;
  console.error(`Streuung heute ${sigma0.toFixed(4)}, neu ${sigma.toFixed(4)}, Maßstab ${skala.toFixed(4)} (verwendet: ${(+skala.toFixed(2)).toFixed(2)})`);
  const faktor = +skala.toFixed(2);
  const tabelle = {}, proGruppe = {};
  for (let i = 0; i < D.namen.length; i++) {
    const g = D.namen[i][0];
    if (!gruppen.includes(g) || !tab[i]) continue;
    const v = Math.round(tab[i] * faktor * 1000) / 1000;
    if (v === 0) continue;
    tabelle[D.namen[i]] = v;
    proGruppe[g] = (proGruppe[g] || 0) + 1;
  }
  console.error(`${Object.keys(tabelle).length} Einträge: ` + gruppen.map(g => `${g} ${proGruppe[g] || 0}`).join(', ') + `; ${(zeileAus(tabelle).length / 1024).toFixed(0)} KB`);
  return {gruppen, iter: opt.iter, min: opt.min, skala: faktor, sigma0, sigma, lernstellungen: train.length, quellen: opt.lehr, tabelle};
}

function main() {
  const a = process.argv.slice(2), opt = {lehr: [], gruppen: 'mlzduk', iter: 25, min: 5, skala: 'auto', aus: null, index: null, auslesen: null, einsetzen: null};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--lehr') opt.lehr = a[++i].split(',');
    else if (a[i] === '--gruppen') opt.gruppen = a[++i];
    else if (a[i] === '--iter') opt.iter = +a[++i];
    else if (a[i] === '--min') opt.min = +a[++i];
    else if (a[i] === '--skala') opt.skala = a[++i];
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--index') opt.index = a[++i];
    else if (a[i] === '--auslesen') opt.auslesen = a[++i];
    else if (a[i] === '--einsetzen') opt.einsetzen = a[++i];
  }
  let ergebnis;
  if (opt.auslesen) ergebnis = {quelle: opt.auslesen, tabelle: liesTabelle(opt.auslesen)};
  else if (opt.einsetzen) {
    if (!opt.index) { console.error('--einsetzen braucht --index'); process.exit(1); }
    ergebnis = JSON.parse(fs.readFileSync(opt.einsetzen, 'utf8'));
  } else if (opt.lehr.length) ergebnis = lerne(opt);
  else { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }
  if (opt.aus) fs.writeFileSync(opt.aus, JSON.stringify(ergebnis) + '\n');
  if (opt.index) { setzeEin(opt.index, ergebnis.tabelle); console.error(`${opt.index}: Tabelle eingesetzt (${Object.keys(ergebnis.tabelle).length} Einträge)`); }
  else if (!opt.aus) process.stdout.write(zeileAus(ergebnis.tabelle) + '\n');
}

if (require.main === module) main();
module.exports = {zeileAus, liesTabelle, setzeEin};
