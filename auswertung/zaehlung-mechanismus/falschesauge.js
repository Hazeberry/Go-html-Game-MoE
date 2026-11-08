// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil D, beschreibend: Ein-Punkt-Augen der Ketten, die GNU Go als tot führt und die Zählvorschau behält (Typ A, V-Stellungen
   der Fläche aus mechanismus.js). Falsch nach der Diagonalregel der App (_diagIsTrueEye): Mittelpunkt mindestens 2 von 4
   Diagonalen mit Gegnerstein, Rand/Ecke mindestens 1 der vorhandenen Diagonalen. Gegnersteine, die GNU Go selbst als tot führt,
   zählen nicht als Gegner (zweiter Zähllauf gegenüber der ungefilterten Zählung).
   Nur Ein-Punkt-Augen direkt an der Kette; größere Regionen sind hier nicht beurteilt.
   Aufruf: node falschesauge.js --daten <entpacktes-Artefakt> --mech mech.json */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['daten', 'mech']);
const mech = JSON.parse(G.fs.readFileSync(o.mech, 'utf8')).out;
const rows = new Map(G.ladeZeilen(o.daten).map(r => [r.schluessel, r]));
const nb = (x, y) => [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]].filter(([a, b]) => a >= 0 && a < 19 && b >= 0 && b < 19);
function lauf(ohneGnuTote) {
  let n1g = 0, nfg = 0; const zeilen = [];
  for (const x of mech.filter(m => m.V)) {
    const r = rows.get(x.schluessel), board = G.brettAus(r.diagnose.anfang.brett), tot = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
    for (const a of x.A) {
      if (!a.steine || a.gemischt) continue;
      const c = a.farbe, kette = [a.ecke], seen = new Set(kette);
      for (let k = 0; k < kette.length; k++) { const p = kette[k], px = p % 19, py = (p - px) / 19; for (const [qx, qy] of nb(px, py)) { const q = qy * 19 + qx; if (board[q] === c && !seen.has(q)) { seen.add(q); kette.push(q); } } }
      const augen = new Set();
      for (const p of kette) { const px = p % 19, py = (p - px) / 19; for (const [qx, qy] of nb(px, py)) { const q = qy * 19 + qx; if (board[q]) continue; if (nb(qx, qy).every(([a2, b2]) => board[b2 * 19 + a2] === c)) augen.add(q); } }
      let n1 = 0, nf = 0;
      for (const q of augen) {
        n1++; const qx = q % 19, qy = (q - qx) / 19;
        const diag = [[qx - 1, qy - 1], [qx + 1, qy - 1], [qx - 1, qy + 1], [qx + 1, qy + 1]].filter(([a2, b2]) => a2 >= 0 && a2 < 19 && b2 >= 0 && b2 < 19);
        const gegner = diag.filter(([a2, b2]) => board[b2 * 19 + a2] === 3 - c && !(ohneGnuTote && tot.has(b2 * 19 + a2))).length;
        if (diag.length < 4 ? gegner >= 1 : gegner >= 2) nf++;
      }
      n1g += n1; nfg += nf; zeilen.push({n1, nf});
    }
  }
  return {ketten: zeilen.length, einpunktAugen: n1g, falsch: nfg, kettenMitFalschem: zeilen.filter(z => z.nf > 0).length, kettenMitZweiEchten: zeilen.filter(z => z.n1 - z.nf >= 2).length};
}
console.log('alle Gegnersteine zählen   :', JSON.stringify(lauf(false)));
console.log('GNU-tote Gegnersteine aus  :', JSON.stringify(lauf(true)));
