// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gepaarter Vergleich der Siege, explorativ und nachträglich
   (docs/muster-ohne-vorgabe.md §10): je Gegner und Arm gegen D die Siege
   beider, die Paare, in denen nur der Arm bzw. nur D gewinnt, die
   Differenz der Siegraten und der exakte McNemar-Test (der Vorzeichentest
   auf den Paaren mit wechselndem Sieger). Paare mit abgebrochener Partie
   oder ohne Sieger fallen heraus.

   Aufruf:  node auswertung/komponenten/siege-gepaart.js g:D=a.jsonl.gz g:M0=... f:D=... ... */
'use strict';
const fs = require('fs'), zlib = require('zlib');
const {vorzeichenP} = require('../messung-zusatz.js');

const lies = d => {
  const roh = fs.readFileSync(d);
  return new Map((d.endsWith('.gz') ? zlib.gunzipSync(roh) : roh).toString('utf8').split('\n').filter(Boolean)
    .map(z => JSON.parse(z)).map(r => [r.nr, r]));
};
const ok = r => r && !r.abgebrochen && (r.gewonnen === true || r.gewonnen === false);

function siege(D, X) {
  let b = 0, c = 0, beide = 0, keiner = 0;
  for (const [nr, d] of D) {
    const x = X.get(nr);
    if (!ok(d) || !ok(x)) continue;
    if (x.gewonnen && !d.gewonnen) b++; else if (!x.gewonnen && d.gewonnen) c++; else if (x.gewonnen) beide++; else keiner++;
  }
  const n = b + c + beide + keiner;
  return {n, b, c, beide, keiner, siegeArm: b + beide, siegeD: c + beide, diff: n ? (b - c) / n : NaN, p: vorzeichenP(b, c)};
}

const pz = v => (100 * v).toFixed(1).replace('.', ',') + ' %';
const pp = v => (v >= 0 ? '+' : '−') + Math.abs(100 * v).toFixed(1).replace('.', ',');
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');

function text(zeilen) {
  const z = ['| Gegner | Arm | Paare | Siege Arm | Siege D | nur Arm | nur D | Differenz (Prozentpunkte) | McNemar p |', '|---|---|---:|---:|---:|---:|---:|---:|---:|'];
  for (const r of zeilen) z.push(`| ${r.gegner} | ${r.arm} | ${r.n} | ${r.siegeArm} (${pz(r.siegeArm / r.n)}) | ${r.siegeD} (${pz(r.siegeD / r.n)}) | ${r.b} | ${r.c} | ${pp(r.diff)} | ${fp(r.p)} |`);
  return z.join('\n') + '\n';
}

/* Urteil über die Siege (docs/muster-fuego-siege.md §4): bei p < alpha
   gewinnt der Arm öfter (nur Arm > nur D) oder D öfter, sonst kein
   Unterschied belegt */
function urteil(r, alpha) {
  if (!r || !r.n) return 'unvollständig';
  if (r.p < alpha && r.b > r.c) return 'Arm gewinnt öfter';
  if (r.p < alpha && r.c > r.b) return 'D gewinnt öfter';
  return 'kein Unterschied belegt';
}

module.exports = {siege, text, urteil};

if (require.main === module) {
  const daten = {};
  for (const a of process.argv.slice(2)) {
    const m = /^([^:]+):([A-Z0-9]+)=(.+)$/.exec(a);
    if (!m) { console.error('Angabe gegner:ARM=datei erwartet: ' + a); process.exit(2); }
    (daten[m[1]] = daten[m[1]] || {})[m[2]] = lies(m[3]);
  }
  const zeilen = [];
  for (const [gegner, arme] of Object.entries(daten)) {
    if (!arme.D) { console.error(`${gegner}: Arm D fehlt`); process.exit(2); }
    for (const [arm, X] of Object.entries(arme)) if (arm !== 'D') zeilen.push({gegner, arm, ...siege(arme.D, X)});
  }
  process.stdout.write(text(zeilen));
}
