// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Kosten der Vorarbeit vor der Suche (docs/zeitbudget.md): spielt eine SGF-Partie
   bis zu gegebenen Zügen nach und misst, wie lange getAIMove ohne Suche braucht
   (mctsFixedSims = 1), einmal mit und einmal ohne Endspiel-Netz
   (PARAMS.endspielNetz 0,8 gegen 0). Ein einzelner Zug pro Stellung, wenige
   Sekunden Rechenzeit; die Zahlen gelten für diese Maschine, nicht fürs Handy.

   Aufruf:  node auswertung/endspiel/netz-kosten.js datei.sgf [zug,zug,…] [--ki weiss|schwarz] */
'use strict';
const fs = require('fs');
const {ladeKI} = require('../../tests/rahmen');
const {parseSgf, nachspielen} = require('./territory-fuellen');

function messen(KI, zuege, zugliste, kiFarbe = 2, wiederholungen = 3) {
  const saved = {fest: KI.PARAMS.mctsFixedSims, netz: KI.PARAMS.endspielNetz}, aus = [];
  KI.PARAMS.mctsFixedSims = 1;
  try {
    for (const n of zugliste) {
      const zeile = {zug: n};
      for (const lam of [0.8, 0]) {
        KI.PARAMS.endspielNetz = lam;
        let best = Infinity;
        nachspielen(KI, zuege, 7.5, (k, b, c) => {
          if (k !== n - 1) return;
          for (let i = 0; i < wiederholungen; i++) {
            const t0 = process.hrtime.bigint();
            KI.getAIMove(Uint8Array.from(b), kiFarbe, [], {1: c[1], 2: c[2]}, n - 1, 'hard', 1, null, null);
            best = Math.min(best, Number(process.hrtime.bigint() - t0) / 1e6);
          }
        });
        zeile[lam > 0 ? 'mitNetzMs' : 'ohneNetzMs'] = Math.round(best);
      }
      zeile.netzMs = zeile.mitNetzMs - zeile.ohneNetzMs;
      aus.push(zeile);
    }
  } finally { KI.PARAMS.mctsFixedSims = saved.fest; KI.PARAMS.endspielNetz = saved.netz; }
  return aus;
}

module.exports = {messen};

if (require.main === module) {
  const a = process.argv.slice(2), datei = a.find(x => !x.startsWith('--'));
  if (!datei) { console.error('Aufruf: node netz-kosten.js datei.sgf [zug,zug,…]'); process.exit(2); }
  const liste = (a.filter(x => !x.startsWith('--'))[1] || '60,70,78,80,82,84,100,200,300').split(',').map(Number);
  const KI = ladeKI({mitNetz: false});
  const r = messen(KI, parseSgf(fs.readFileSync(datei, 'utf8')), liste);
  console.log('Zug  mit Netz   ohne Netz   Netz (ms, günstigster von 3 Läufen, ohne Suche)');
  for (const x of r) console.log(`${String(x.zug).padStart(3)}  ${String(x.mitNetzMs).padStart(8)}  ${String(x.ohneNetzMs).padStart(9)}  ${String(x.netzMs).padStart(6)}`);
}
