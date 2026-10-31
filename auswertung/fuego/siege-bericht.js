// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Messung der Siege gegen Fuego ohne Vorgabe (docs/muster-fuego-siege.md §4):
   D, M0 und M50, gepaart nach Partienummer. Endpunkt ist die Siegquote:
   exakter McNemar-Test, zweiseitig, alpha 0,05/2 = 0,025 (Urteil aus
   siege-gepaart.js). Beschreibend: Quote von D mit Clopper-Pearson-Intervall,
   Quote je Farbe der KI, Endstand Arm − D gepaart (97,5 %, Normalnäherung,
   bei rund 960 Paaren ausreichend). Partien ohne Sieger fallen samt Partner heraus.

   Aufruf: node auswertung/fuego/siege-bericht.js D=a.jsonl M0=b.jsonl M50=c.jsonl */
'use strict';
const fs = require('fs'), zlib = require('zlib');
const {siege, urteil} = require('../komponenten/siege-gepaart.js');
const {intervall} = require('./pruefstand-bericht.js');

const ALPHA = 0.025, Z = 2.2414; // zweiseitig 97,5 %
const lies = d => { const r = fs.readFileSync(d); return new Map((d.endsWith('.gz') ? zlib.gunzipSync(r) : r).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)).map(x => [x.nr, x])); };
const ok = r => r && !r.abgebrochen && (r.gewonnen === true || r.gewonnen === false);
const pz = x => Number.isFinite(x) ? (100 * x).toFixed(1).replace('.', ',') + ' %' : '–';
const z1 = v => Number.isFinite(v) ? (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',') : '–';

function quote(P) {
  const l = [...P.values()].filter(ok), s = l.filter(r => r.gewonnen).length;
  const farbe = f => { const k = l.filter(r => r.wirFarbe === f); return k.length ? k.filter(r => r.gewonnen).length / k.length : NaN; };
  return {n: l.length, siege: s, rate: l.length ? s / l.length : NaN, ki: intervall(s, l.length), S: farbe('S'), W: farbe('W')};
}

function endstand(D, X) {
  const d = [];
  for (const [nr, a] of D) { const x = X.get(nr); if (ok(a) && ok(x) && Number.isFinite(a.endstand) && Number.isFinite(x.endstand)) d.push(x.endstand - a.endstand); }
  const n = d.length; if (n < 2) return null;
  const m = d.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1)), h = Z * sd / Math.sqrt(n);
  return {n, m, lo: m - h, hi: m + h};
}

function auswertung(arme) {
  const D = arme.D; if (!D) throw new Error('Arm D fehlt');
  const zeilen = [];
  for (const arm of ['M0', 'M50']) if (arme[arm]) { const s = siege(D, arme[arm]); zeilen.push({arm, ...s, urteil: urteil(s, ALPHA), endstand: endstand(D, arme[arm])}); }
  const q = {}; for (const [a, P] of Object.entries(arme)) q[a] = quote(P);
  const m50 = zeilen.find(z => z.arm === 'M50'), m0 = zeilen.find(z => z.arm === 'M0');
  const folge = m50 && m50.urteil === 'Arm gewinnt öfter' ? 'Default `musterOhneVorgabe` wird 0,5'
    : (m0 && m0.urteil === 'Arm gewinnt öfter') ? 'Default bleibt 1; M0 gewinnt öfter, untersuchen' : 'Default bleibt 1';
  return {zeilen, q, folge};
}

function text(a) {
  const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',') : p.toFixed(4).replace('.', ',');
  const o = ['| Arm | gewertet | Siege | Quote | 95 % | KI Schwarz | KI Weiß |', '|---|---:|---:|---:|---|---:|---:|'];
  for (const [arm, q] of Object.entries(a.q)) o.push(`| ${arm} | ${q.n} | ${q.siege} | ${pz(q.rate)} | ${pz(q.ki[0])} bis ${pz(q.ki[1])} | ${pz(q.S)} | ${pz(q.W)} |`);
  o.push('', 'Gepaart gegen D (alpha 0,025, exakter McNemar-Test):', '',
    '| Arm | Paare | nur Arm | nur D | Differenz (Prozentpunkte) | p | Urteil | Endstand Arm − D (97,5 %) |', '|---|---:|---:|---:|---:|---:|---|---|');
  for (const z of a.zeilen) o.push(`| ${z.arm} | ${z.n} | ${z.b} | ${z.c} | ${z1(100 * z.diff)} | ${fp(z.p)} | **${z.urteil}** | ${z.endstand ? `${z1(z.endstand.m)} (${z1(z.endstand.lo)} bis ${z1(z.endstand.hi)})` : '–'} |`);
  o.push('', `**Folge:** ${a.folge}.`);
  return o.join('\n') + '\n';
}

module.exports = {auswertung, text, quote};

if (require.main === module) {
  const arme = {};
  for (const x of process.argv.slice(2)) {
    const m = /^(D|M0|M50)=(.+)$/.exec(x);
    if (!m) { console.error('Angabe ARM=datei erwartet (D, M0, M50): ' + x); process.exit(2); }
    arme[m[1]] = new Map(m[2].split(',').flatMap(d => [...lies(d)]));
  }
  if (!arme.D) { console.error('Aufruf: node auswertung/fuego/siege-bericht.js D=a.jsonl M0=b.jsonl M50=c.jsonl'); process.exit(2); }
  process.stdout.write(text(auswertung(arme)));
}
