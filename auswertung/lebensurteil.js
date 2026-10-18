// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Lebensurteil aus GNU Gos GTP-Antworten, im Format von setzeLebensurteil
   (index.html, PARAMS.gebietSicher). Gehört zu gnugo-duell.js --orakel und
   docs/gebiet-sicher.md.

   dragon_status ohne Argument: eine Zeile je Drache,
     "D16: alive", "A2: dead", "D3: critical D4 E3" (Angriff, Verteidigung)
   dragon_stones ohne Argument: eine Zeile je Drache mit allen Steinen.
   Der Drache einer Statuszeile ist die Steinzeile, die ihren Punkt enthält.
   "unknown" und alles außer dead und critical zählt als lebend.

   urteilAusGtp(status, steine, board, vonGtp) → {tot, toteSteine, krit} */
'use strict';

function urteilAusGtp(status, steine, board, vonGtp) {
  const N = board.length;
  const drachen = steine.split('\n').map(z => z.trim().split(/\s+/).filter(Boolean).map(vonGtp))
    .filter(d => d.length);
  const von = new Map();
  for (const d of drachen) for (const s of d) von.set(s, d);
  const tot = new Uint8Array(N), toteSteine = [], krit = [];
  for (const zeile of status.split('\n')) {
    const m = /^\s*([A-T]\d+):\s*(\w+)\s*(\S+)?\s*(\S+)?/i.exec(zeile);
    if (!m) continue;
    const ursprung = vonGtp(m[1]), art = m[2].toLowerCase();
    if (art !== 'dead' && art !== 'critical') continue;
    const d = von.get(ursprung), farbe = board[ursprung];
    if (!d || !farbe) throw new Error(`Lebensurteil: kein Drache an ${m[1]}`);
    if (art === 'dead') { for (const s of d) if (board[s] === farbe && !tot[s]) { tot[s] = farbe; toteSteine.push(s); } }
    else krit.push({farbe, steine: d.filter(s => board[s] === farbe),
                    angriff: m[3] ? vonGtp(m[3]) : -1, verteidigung: m[4] ? vonGtp(m[4]) : -1});
  }
  return {tot, toteSteine, krit};
}

module.exports = {urteilAusGtp};
