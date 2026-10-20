// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Die Gewichte des Endspiel-Netzes (docs/endspiel-netz.md) in index.html
   schreiben: die Zeile `const ENDSPIEL_NETZ = …;` im worker-ai-Block. Alle
   Gewichte als Float32, in der Reihenfolge der Schichten (Gewichte, dann
   Schwellen), als Base64. Float32, damit die Engine dasselbe Netz rechnet
   wie die Offline-Prüfung (docs/endspiel-lerner.md), nicht eine gerundete
   Fassung davon.

   Aufruf: node auswertung/lerner-einbetten.js docs/daten/endspiel-lerner/netz.json.gz [index.html] */
'use strict';
const fs = require('fs');
const zlib = require('zlib');

const ZEILE = /^const ENDSPIEL_NETZ = .*;$/m;

function packe(json) {
  const teile = [json.ein.w, json.ein.b];
  for (const s of json.mitte) teile.push(s.w, s.b);
  teile.push(json.aus.w, json.aus.b);
  const q = Float32Array.from(teile.flatMap(t => [t].flat(Infinity)));
  return {ebenen: json.ebenen, kanaele: json.kanaele, schichten: json.schichten,
          daten: Buffer.from(q.buffer, q.byteOffset, q.byteLength).toString('base64')};
}

function setzeEin(html, json) {
  if (!ZEILE.test(html)) throw new Error('index.html ohne die Zeile const ENDSPIEL_NETZ = …;');
  return html.replace(ZEILE, 'const ENDSPIEL_NETZ = ' + JSON.stringify(packe(json)) + ';');
}

if (require.main === module) {
  const quelle = process.argv[2], ziel = process.argv[3] || 'index.html';
  if (!quelle) { console.error('Aufruf: node auswertung/lerner-einbetten.js netz.json.gz [index.html]'); process.exit(1); }
  const roh = fs.readFileSync(quelle);
  const json = JSON.parse((quelle.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8'));
  fs.writeFileSync(ziel, setzeEin(fs.readFileSync(ziel, 'utf8'), json));
  console.log(`Gewichte in ${ziel}`);
}

module.exports = {packe, setzeEin, ZEILE};
