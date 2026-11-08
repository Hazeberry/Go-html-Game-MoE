// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil D (docs/zaehlung-mechanismus.md): Welche von GNU Go als tot geführten Ketten behält toteSteineAmEnde, und
   welcher Schutzgrund (Benson, zwei Augen, großes Auge, offene Grenze) hält den Verband am Leben?
   Dazu wird in einer TEST-KOPIE von index.html (im Verzeichnis --tmp, nicht im Repo) an genau einer Stelle
   mitgeschrieben, welche Verbände am Ende übrig bleiben (nur Lesezugriff auf Zwischenwerte). Kontrolle:
   die Tot-Menge der Test-Kopie muss in jeder Stellung gleich der des Originals sein.
   Aufruf: node mechanismus.js --html index.html --daten <entpacktes-Artefakt> --tmp <Verzeichnis> --aus mech.json */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['html', 'daten', 'tmp', 'aus']);
const orig = G.fs.readFileSync(o.html, 'utf8');
const sha = G.sha256(orig);
const einmal = (s, a) => { if (s.split(a).length !== 2) throw new Error('Anker nicht genau einmal: ' + a); };
const a1 = 'V.augen++; if (r.groesse >= augeGross', a2 = 'if (!schwach) break;';
einmal(orig, a1); einmal(orig, a2);
const patch = orig.replace(a1, 'V.augen++; (V.ag = V.ag || []).push(r.groesse); if (r.groesse >= augeGross')
  .replace(a2, 'if (!schwach) { globalThis.__verb = [...verb.values()].map(V => ({benson: V.benson, augen: V.augen, gross: V.gross, offen: V.offen, frei: V.frei.size, ag: V.ag || [], steine: V.steine, punkte: V.ketten.flatMap(k => ketten[k].steine)})); break; }');
G.fs.mkdirSync(o.tmp, {recursive: true});
const kopie = G.path.join(o.tmp, 'index-mechanismus-testkopie.html');
G.fs.writeFileSync(kopie, patch);
const zeilen = G.ladeZeilen(o.daten);
/* Original zuerst laden und Ergebnisse sichern; danach die Test-Kopie (zwei Stände nie gleichzeitig benutzen) */
const E0 = G.ladeKI({htmlPfad: o.html, mitNetz: false});
const ref = zeilen.map(r => Array.from(E0.toteSteineAmEnde(G.brettAus(r.diagnose.anfang.brett))));
const E1 = G.ladeKI({htmlPfad: kopie, mitNetz: false});
const NB = E1.NEIGHBORS, out = [];
let gleich = 0;
zeilen.forEach((r, ix) => {
  const board = G.brettAus(r.diagnose.anfang.brett);
  globalThis.__verb = null;
  const tot = Array.from(E1.toteSteineAmEnde(board));
  if (JSON.stringify(tot) === JSON.stringify(ref[ix])) gleich++;
  const verb = globalThis.__verb || [];
  const gnuTot = new Uint8Array(G.N);
  for (const c of r.diagnose.anfang.tote) gnuTot[G.L.vonGtp(c)] = 1;
  const kette = new Int32Array(G.N).fill(-1), ketten = [];
  for (let i = 0; i < G.N; i++) {
    if (!board[i] || kette[i] >= 0) continue;
    const g = [i]; kette[i] = ketten.length;
    for (let k = 0; k < g.length; k++) for (const n of NB[g[k]]) if (board[n] === board[i] && kette[n] < 0) { kette[n] = ketten.length; g.push(n); }
    ketten.push(g);
  }
  const verbVon = new Map();
  verb.forEach((V, vi) => { for (const p of V.punkte) verbVon.set(p, vi); });
  const befund = {A: [], B: []};   /* A: GNU tot, App lebend (Kette ganz); B: GNU lebend, App tot (Kette ganz); gemischt: Kette teils/teils */
  for (const g of ketten) {
    const gt = g.filter(p => gnuTot[p]).length, at = g.filter(p => tot[p]).length;
    if (gt === g.length && at === 0) {
      const V = verb[verbVon.get(g[0])];
      befund.A.push({farbe: board[g[0]], steine: g.length, ecke: g[0], schutz: V ? {ag: V.ag, benson: V.benson, augen: V.augen, gross: V.gross, offen: V.offen, frei: V.frei, verbandSteine: V.steine} : null});
    } else if (gt === 0 && at === g.length) befund.B.push({farbe: board[g[0]], steine: g.length, ecke: g[0]});
    else if (gt !== at && (gt === g.length || at === g.length || (gt > 0 && at > 0))) befund.A.push({gemischt: true, farbe: board[g[0]], steine: g.length, gnuTot: gt, appTot: at});
  }
  out.push({schluessel: r.schluessel, gruppe: r.gruppe, kiFarbe: r.kiFarbe, V: G.istV(r), A: befund.A, B: befund.B});
});
G.fs.writeFileSync(o.aus, JSON.stringify({htmlSha256: sha, zeilen: zeilen.length, testkopieGleichOriginal: gleich, out}, null, 1));
console.log('index.html SHA-256', sha);
console.log('Zeilen', zeilen.length, '| Test-Kopie == Original (Tot-Menge) bei', gleich, 'von', zeilen.length);
if (gleich !== zeilen.length) { console.log('KONTROLLE FEHLGESCHLAGEN: kein Urteil'); process.exit(1); }
