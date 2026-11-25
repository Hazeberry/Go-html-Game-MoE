// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bezugszahl zu §11.2 von docs/eval-streuung-vielfalt-vorabfestlegung.md:
   Wie streut die Kollisionsrate q des ersten Zugs, wenn 30 Partien ihren
   ersten Zug unabhängig und gleichverteilt auf vier Punkte legen?

   Das ist eine Seitenrechnung zur Einordnung des Werts 0,25, KEIN Test der
   Messung. Das Modell (vier gleich wahrscheinliche Punkte, unabhängige
   Partien) ist für die Engine nicht geprüft; der primäre Endpunkt bleibt der
   gepaarte Vorzeichentest aus §4.

   sfc32 mit festem Startwert, damit die Zahlen reproduzierbar sind. Ein
   einfacher LCG taugt hier nicht: mit dem glibc-Multiplikator kam E[q] als
   0,24925 heraus, rund 50 Standardfehler unter dem exakten Wert 0,25.

   Aufruf:  node docs/daten/eval-streuung-vielfalt/q-streuung.js   (~20 s) */
'use strict';

function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (a + b | 0) + d | 0;
    d = d + 1 | 0;
    a = b ^ b >>> 9;
    b = c + (c << 3) | 0;
    c = c << 21 | c >>> 11;
    c = c + t | 0;
    return (t >>> 0) / 4294967296;
  };
}

const K = 4;            // wirksamer Eröffnungsraum, siehe §11.2
const N_PARTIEN = 30;   // Partien je Block, §6
const N_BLOECKE = 10;   // Blöcke je Arm, §4
const ZIEHUNGEN = 4e6;
const PAARE = N_PARTIEN * (N_PARTIEN - 1) / 2;

const rnd = sfc32(0x9e3779b9, 0x243f6a88, 0xb7e15162, 0xdeadbeef);
for (let i = 0; i < 20; i++) rnd();   // warmlaufen

let summe = 0, summeQuadrat = 0, unter = 0;
const haeufigkeit = new Map();        // Kollisionszahl -> Anzahl Ziehungen

for (let i = 0; i < ZIEHUNGEN; i++) {
  const zaehl = new Array(K).fill(0);
  for (let j = 0; j < N_PARTIEN; j++) zaehl[Math.floor(rnd() * K)]++;
  let kollisionen = 0;
  for (const m of zaehl) kollisionen += m * (m - 1) / 2;
  const q = kollisionen / PAARE;
  summe += q; summeQuadrat += q * q;
  if (q < 0.25) unter++;
  haeufigkeit.set(kollisionen, (haeufigkeit.get(kollisionen) || 0) + 1);
}

const mittel = summe / ZIEHUNGEN;
const sd = Math.sqrt(summeQuadrat / ZIEHUNGEN - mittel * mittel);
const sdMittel = sd / Math.sqrt(N_BLOECKE);
const schluessel = [...haeufigkeit.keys()].sort((a, b) => a - b);
const quantil = (f) => {
  let kumuliert = 0;
  for (const k of schluessel) {
    kumuliert += haeufigkeit.get(k);
    if (kumuliert >= f * ZIEHUNGEN) return k / PAARE;
  }
  return NaN;
};
const kommas = (x, n) => x.toFixed(n).replace('.', ',');

console.log(`Modell: ${N_PARTIEN} unabhängige gleichverteilte Züge auf ${K} Punkten, ${ZIEHUNGEN / 1e6} Mio. Ziehungen`);
console.log(`E[q]                       ${kommas(mittel, 5)}   (exakt 1/${K} = 0,25; Standardfehler ${kommas(sd / Math.sqrt(ZIEHUNGEN), 5)})`);
console.log(`SD[q] je Block             ${kommas(sd, 5)}`);
console.log(`2,5 % / Median / 97,5 %    ${kommas(quantil(0.025), 4)} / ${kommas(quantil(0.5), 4)} / ${kommas(quantil(0.975), 4)}`);
console.log(`Anteil Blöcke unter 0,25   ${kommas(unter / ZIEHUNGEN * 100, 1)} %`);
console.log(`SD des Mittels aus ${N_BLOECKE}      ${kommas(sdMittel, 5)}`);
for (const [name, wert] of [['V1', 0.2444], ['V0', 0.2924]]) {
  console.log(`${name} ${kommas(wert, 4)} liegt ${kommas((wert - 0.25) / sdMittel, 2)} SD des Mittels vom Erwartungswert`);
}
