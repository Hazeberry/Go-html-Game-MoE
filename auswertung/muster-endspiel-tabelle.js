// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Muster, zweiter Schritt: die Tabelle für den Schalter
   musterEndspiel in index.html erzeugen. Gehört zu
   docs/muster-endspiel-spiel.md.

   Lernt mit dem Verfahren aus docs/muster-endspiel.md §5 (gemeinsames
   Bradley-Terry-Modell, MM-Verfahren, 25 Durchläufe, Merkmalswerte erst ab
   fünf möglichen Fällen) die Gruppen m, l, z, d, u, k aus den Stellungen mit
   der KI am Zug, bringt die Werte auf den Maßstab der Tabelle im Spiel
   (gleiche mittlere Streuung der Musterwerte je Stellung wie MUSTER_TABELLE,
   also gilt musterEndspiel 200 wie „Dosis 200“ in der Studie) und schreibt
   sie als Zeile `const MUSTER_ENDSPIEL = {...};` in index.html.

   Aufruf:
     node auswertung/muster-endspiel-tabelle.js --lehr zw/entw-b,zw/pruef
         [--gruppen mlzduk] [--iter 25] [--min 5] [--skala auto|0.6]
         [--aus tabelle.json] [--index index.html]
   Die Zwischenspeicher (zw/…) erzeugt muster-endspiel-daten.js aus den
   Lehrdaten in docs/daten (siehe docs/muster-endspiel.md §8). */
'use strict';
const fs = require('fs');
const path = require('path');
const ME = require('./muster-endspiel.js');

const a = process.argv.slice(2), opt = {lehr: [], gruppen: 'mlzduk', iter: 25, min: 5, skala: 'auto', aus: null, index: null};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--lehr') opt.lehr = a[++i].split(',');
  else if (a[i] === '--gruppen') opt.gruppen = a[++i];
  else if (a[i] === '--iter') opt.iter = +a[++i];
  else if (a[i] === '--min') opt.min = +a[++i];
  else if (a[i] === '--skala') opt.skala = a[++i];
  else if (a[i] === '--aus') opt.aus = a[++i];
  else if (a[i] === '--index') opt.index = a[++i];
}
if (!opt.lehr.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }

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
const schluessel = Object.keys(tabelle).sort();
const zeile = 'const MUSTER_ENDSPIEL = {' + schluessel.map(k => JSON.stringify(k) + ':' + tabelle[k]).join(',') + '};';
console.error(`${schluessel.length} Einträge: ` + gruppen.map(g => `${g} ${proGruppe[g] || 0}`).join(', ') + `; ${(zeile.length / 1024).toFixed(0)} KB`);
if (opt.aus) fs.writeFileSync(opt.aus, JSON.stringify({gruppen, iter: opt.iter, min: opt.min, skala: faktor, sigma0, sigma, lernstellungen: train.length, tabelle}, null, 0) + '\n');
if (opt.index) {
  const pfad = path.resolve(opt.index);
  const html = fs.readFileSync(pfad, 'utf8');
  const re = /^const MUSTER_ENDSPIEL = .*;$/m;
  if (!re.test(html)) throw new Error('index.html enthält keine Zeile „const MUSTER_ENDSPIEL = …;“');
  fs.writeFileSync(pfad, html.replace(re, () => zeile));
  console.error(`${opt.index}: Tabelle eingesetzt`);
} else if (!opt.aus) process.stdout.write(zeile + '\n');
