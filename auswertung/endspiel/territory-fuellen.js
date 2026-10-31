// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Territory-Auffüllen (docs/endspiel-abraeumen.md, Nachtrag Territory):
   Spielt eine Partie aus einem SGF nach und rechnet in der Territory-Wertung
   der App (Gefangene + umschlossene freie Punkte, tote Steine nach
   toteSteineAmEnde als Gefangene) den Stand nach jedem Zug aus. Beantwortet:
   was kostet es, wenn die KI nach dem ersten Pass des Gegners eigene Gebiete
   auffüllt? Reine Rechnung auf Archivdaten, keine Partie wird gespielt.

   Aufruf:  node auswertung/endspiel/territory-fuellen.js datei.sgf [--komi 7.5] [--json] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI} = require('../../tests/rahmen');

function parseSgf(txt) {
  const re = /;([BW])\[([a-s]{0,2})\]/g, zuege = []; let m;
  while ((m = re.exec(txt))) zuege.push({f: m[1] === 'B' ? 1 : 2, p: m[2]});
  return zuege;
}

/* Territory-Stand wie finalTerritoryScore, nach Entfernung der toten Steine
   (toteSteineAmEnde) und mit deren Gefangenen-Gutschrift. */
function territoryStand(KI, board, caps, komi) {
  const N = KI.BOARD_SIZE, NB = KI.NEIGHBORS;
  const b = Uint8Array.from(board), c = {1: caps[1], 2: caps[2]};
  const tot = KI.toteSteineAmEnde(b);
  let nTot = 0;
  for (let i = 0; i < N; i++) if (tot[i]) { c[b[i] === 1 ? 2 : 1]++; b[i] = 0; nTot++; }
  const t = {1: c[1], 2: c[2]}, v = new Uint8Array(N), gebiet = {1: 0, 2: 0};
  for (let i = 0; i < N; i++) {
    if (b[i] || v[i]) continue;
    const q = [i], rand = new Set(); v[i] = 1;
    for (let k = 0; k < q.length; k++) for (const n of NB[q[k]]) {
      if (!b[n]) { if (!v[n]) { v[n] = 1; q.push(n); } } else rand.add(b[n]);
    }
    if (rand.size === 1) { const f = [...rand][0]; t[f] += q.length; gebiet[f] += q.length; }
  }
  const sb = t[1], sw = t[2] + komi;
  return {schwarz: sb, weiss: sw, stand: sb - sw, gebietSchwarz: gebiet[1], gebietWeiss: gebiet[2],
          gefangenSchwarz: c[1], gefangenWeiss: c[2], tote: nTot};
}

function nachspielen(KI, zuege, komi, hook) {
  const N = KI.BOARD_SIZE, board = new Uint8Array(N), caps = {1: 0, 2: 0};
  zuege.forEach((z, k) => {
    if (z.p) {
      const i = (z.p.charCodeAt(1) - 97) * 19 + (z.p.charCodeAt(0) - 97);
      board[i] = z.f; caps[z.f] += KI.removeDeadGroups(board, 3 - z.f, i);
    }
    hook(k + 1, board, caps);
  });
  return {board, caps};
}

function auswerten(KI, zuege, komi = 7.5) {
  /* erster Pass des Gegners (Mensch = Farbe, die zuerst passt) */
  const ersterPass = zuege.findIndex(z => !z.p);
  if (ersterPass < 0) throw new Error('kein Pass in der Partie');
  const passFarbe = zuege[ersterPass].f, kiFarbe = 3 - passFarbe;
  const vor = ersterPass;                       /* Zug vor dem ersten Pass */
  const reihe = [];
  nachspielen(KI, zuege, komi, (n, board, caps) => {
    if (n === vor || n === zuege.length || (n > vor && (n - vor) % 20 === 0))
      reihe.push({zug: n, ...territoryStand(KI, board, caps, komi)});
  });
  const vorStand = reihe.find(r => r.zug === vor), ende = reihe[reihe.length - 1];
  const kiSteineDanach = zuege.slice(vor).filter(z => z.f === kiFarbe && z.p).length;
  const passDanach = zuege.slice(vor).filter(z => z.f === passFarbe && !z.p).length;
  const kiPassDanach = zuege.slice(vor).filter(z => z.f === kiFarbe && !z.p).length;
  const sicht = f => f === 1 ? 1 : -1;          /* stand ist aus Schwarz-Sicht */
  return {
    komi, passFarbe, kiFarbe, ersterPassNach: vor, zuege: zuege.length,
    kiSteineNachErstemPass: kiSteineDanach, passesDesGegnersDanach: passDanach, kiPassesDanach: kiPassDanach,
    standVorPass: vorStand, standEnde: ende,
    verlustKiPunkte: (vorStand && ende) ? sicht(kiFarbe) * (ende.stand - vorStand.stand) : null,
    reihe,
  };
}

function text(r) {
  const k = f => f === 1 ? 'Schwarz' : 'Weiß';
  const s = x => x.stand >= 0 ? `Schwarz +${x.stand.toFixed(1)}` : `Weiß +${(-x.stand).toFixed(1)}`;
  const zeilen = [
    `Territory-Stand (Komi ${r.komi}), erster Pass von ${k(r.passFarbe)} nach Zug ${r.ersterPassNach}; KI = ${k(r.kiFarbe)}`,
    `Zug  ${'Stand'.padEnd(14)} Gebiet S/W   Gefangene S/W  tote`,
  ];
  for (const x of r.reihe)
    zeilen.push(`${String(x.zug).padStart(3)}  ${s(x).padEnd(14)} ${String(x.gebietSchwarz).padStart(3)}/${String(x.gebietWeiss).padEnd(3)}     ${String(x.gefangenSchwarz).padStart(3)}/${String(x.gefangenWeiss).padEnd(3)}        ${x.tote}`);
  zeilen.push(`KI-Steine nach dem ersten Pass: ${r.kiSteineNachErstemPass}, Pässe des Gegners danach: ${r.passesDesGegnersDanach}, KI-Pässe: ${r.kiPassesDanach}`);
  zeilen.push(`Veränderung des KI-Standes vom ersten Pass bis Ende: ${r.verlustKiPunkte >= 0 ? '+' : ''}${r.verlustKiPunkte.toFixed(1)} Punkte`);
  return zeilen.join('\n');
}

module.exports = {parseSgf, territoryStand, nachspielen, auswerten, text};

if (require.main === module) {
  const a = process.argv.slice(2), datei = a.find(x => !x.startsWith('--'));
  if (!datei) { console.error('Aufruf: node territory-fuellen.js datei.sgf [--komi 7.5] [--json]'); process.exit(2); }
  const ki = a.indexOf('--komi'), komi = ki >= 0 ? parseFloat(a[ki + 1]) : 7.5;
  const KI = ladeKI({mitNetz: false});
  const r = auswerten(KI, parseSgf(fs.readFileSync(datei, 'utf8')), komi);
  console.log(a.includes('--json') ? JSON.stringify(r, null, 1) : text(r));
}
