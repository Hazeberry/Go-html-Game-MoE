// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Prüfung des Endspiel-Lerners (docs/endspiel-lerner.md §4): die
   Ergebnisse von lerner-pruefung.js zusammen, Trefferquote der gespielten Züge
   ohne und mit Lerner, gepaart (McNemar, exakt), und das Tor:

     bestanden   mit − ohne ≥ +4,0 Prozentpunkte und p < 0,05
     sonst       nicht bestanden

   Dazu, ohne Anspruch: dieselben Zahlen für Zug 81–160 und ab 161, die
   Trefferquote des besten Netzzugs und der Zug der KI in der Partie.

   Aufruf: node auswertung/lerner-bericht.js ergebnis-1.jsonl [...] [--markdown] */
'use strict';
const fs = require('fs');
const {zusammenfassung} = require('./lerner-pruefung.js');

const pz = v => (100 * v).toFixed(1).replace('.', ',') + ' %';
const pp = v => (v >= 0 ? '+' : '−') + Math.abs(100 * v).toFixed(1).replace('.', ',');
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');

function tor(z) { return z.diff >= 0.04 && z.p < 0.05 && z.nurMit > z.nurOhne ? 'bestanden' : 'nicht bestanden'; }

function bericht(ergebnisse, opt = {}) {
  const teile = [['alle Stellungen', ergebnisse], ['Zug 81–160', ergebnisse.filter(e => e.k < 160)], ['ab Zug 161', ergebnisse.filter(e => e.k >= 160)]];
  const aus = [];
  if (opt.markdown) aus.push('| Stellungen | n | ohne Lerner | mit Lerner | Differenz | nur mit / nur ohne | McNemar p | geändert | bester Netzzug | Zug in der Partie |',
                             '|---|---:|---:|---:|---:|---|---:|---:|---:|---:|');
  for (const [name, e] of teile) {
    if (!e.length) continue;
    const z = zusammenfassung(e);
    if (opt.markdown) aus.push(`| ${name} | ${z.n} | ${pz(z.ohne)} | ${pz(z.mit)} | **${pp(z.diff)}** | ${z.nurMit} / ${z.nurOhne} | ${fp(z.p)} | ${pz(z.geaendert)} | ${pz(z.netz)} | ${pz(z.partie)} |`);
    else aus.push(`${name}: ${z.n} Stellungen · trifft GNU Go ohne Lerner ${pz(z.ohne)}, mit ${pz(z.mit)} · Differenz ${pp(z.diff)} Prozentpunkte · nur mit ${z.nurMit}, nur ohne ${z.nurOhne}, McNemar p = ${fp(z.p)} · geändert ${pz(z.geaendert)} · bester Netzzug ${pz(z.netz)} · Zug in der Partie ${pz(z.partie)}`);
  }
  const z = zusammenfassung(ergebnisse);
  aus.push('', `${opt.markdown ? '**Tor** (≥ +4,0 Prozentpunkte und p < 0,05): ' : 'Tor (≥ +4,0 Prozentpunkte und p < 0,05): '}${tor(z)}`);
  return aus.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2), opt = {markdown: a.includes('--markdown')};
  const dateien = a.filter(x => x !== '--markdown');
  if (!dateien.length) { console.error('Aufruf: node auswertung/lerner-bericht.js ergebnis.jsonl [...] [--markdown]'); process.exit(1); }
  const e = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)));
  console.log(bericht(e, opt));
}

module.exports = {bericht, tor};
