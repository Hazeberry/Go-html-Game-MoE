// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gemeinsame Hilfen der Diagnose in diesem Verzeichnis (docs/zaehlung-mechanismus.md).
   Reine Lesearbeit auf Rohdaten der Stufe C; kein GNU Go, keine Partie, keine Änderung am Spiel. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const WURZEL = path.resolve(__dirname, '..', '..');
const {ladeKI} = require(path.join(WURZEL, 'tests', 'rahmen.js'));
const L = require(path.join(WURZEL, 'auswertung', 'endspiel', 'passregel-lib.js'));
const N = 361;
const brettAus = t => Uint8Array.from(String(t), c => (c === 'X' ? 1 : c === 'O' ? 2 : 0));
const sha256 = inhalt => crypto.createHash('sha256').update(inhalt).digest('hex');
/* Ergebniszeilen aus <verz>/teile/teil-*.jsonl in Dateireihenfolge (teil-1, teil-10, teil-11, ...) wie im Artefakt */
function ladeZeilen(verz) {
  const zeilen = [];
  for (const f of fs.readdirSync(path.join(verz, 'teile')).filter(x => /^teil-\d+\.jsonl$/.test(x)))
    for (const z of fs.readFileSync(path.join(verz, 'teile', f), 'utf8').split('\n').filter(Boolean)) zeilen.push(JSON.parse(z));
  return zeilen;
}
/* Optionen der Form --name wert */
function optionen(argv, erlaubt) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const n = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !erlaubt.includes(n) || argv[i + 1] === undefined) throw new Error('Unbekannte oder unvollständige Option: ' + argv[i]);
    o[n] = argv[++i];
  }
  for (const n of erlaubt) if (o[n] === undefined) throw new Error('Option fehlt: --' + n);
  return o;
}
/* V (Fläche): Referenzstand (GNU Gos final_score, KI-Sicht) < 0, wie docs/passregel-vorsprung.md */
const istV = r => r.diagnose.anfang.flaecheFinalScore * (r.kiFarbe === 1 ? 1 : -1) < 0;
module.exports = {fs, path, WURZEL, ladeKI, L, N, brettAus, sha256, ladeZeilen, optionen, istV};
