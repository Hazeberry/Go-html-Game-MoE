// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Hypothese bei B, Stufe 1 (docs/endspiel-b-vorabfestlegung.md): In welchem Abschnitt der Partie
   verliert B (5200 Simulationen) gegenüber A (2600) Punkte? Rechnet nur auf den archivierten Einzelwerten
   von K3, spielt keine Partie.

   Eingabe: docs/daten/skalierung-heute/stufe-2-20261126/k3-partien.csv (Endstand, Züge, Farbe von A) und
   docs/daten/skalierung-heute/aufbaupruefung-20261127/k3-diagnose-partien.csv (GNU Gos estimate_score nach
   Zug 100, 200, 300 aus Sicht von Schwarz, Komi 7,5, und welcher Arm welche Farbe spielt).

   Zerlegung je Partie, alles aus Sicht von B (σ = +1, wenn B Schwarz spielt, sonst −1):
     Y100 = σ · s100                  Lage nach Zug 100
     D1   = σ · (s200 − s100)         Veränderung in den Zügen 101–200
     D2   = σ · (s300 − s200)         Veränderung in den Zügen 201–300
     D3   = σ · (Endmarge − s300)     Veränderung ab Zug 301 bis zum Ende   (primär)
     T    = σ · Endmarge              Endstand, Summe der vier
   Die Endmarge ist „B x − W y“ aus dem Endstand der Messung (Weiß mit Komi 7,5), gleiche Skala wie die Schätzung.
   Negativ heißt: B verliert in diesem Abschnitt Punkte gegenüber A. Das Spiel ist ein Nullsummenspiel, ein
   Verlust von B ist der Gewinn von A; die Zerlegung zeigt, wo sich der Endstand verschiebt, nicht warum.

   Je Abschnitt: n, Mittel, Standardabweichung, 95-%-Intervall (t), Zahl der Partien zu Ungunsten und zu Gunsten
   von B und ohne Veränderung, exakter zweiseitiger Vorzeichentest (Nullen ausgenommen), Clopper-Pearson für
   den Anteil zu Ungunsten, dazu getrennt nach der Farbe von B. Urteil nur für D3, nach dem Vorzeichentest bei
   α = 0,05; der Mittelwert muss in dieselbe Richtung zeigen.

   Gültigkeit, zwei Zustände. Ungültig heißt „KEIN URTEIL“ mit Grund, Exit 1: Dateien nicht lesbar oder nicht
   vollständig (1230 Partien, 123 Seeds zu je 10 Partien), Schlüssel nicht in beiden Dateien, Farbe von A und
   Arme nicht stimmig, Endstand unlesbar oder nicht zum Verlierer passend, Zugzahl nicht gleich oder außerhalb
   von 1 bis 600, Messpunkt vorhanden obwohl die Partie kürzer ist oder fehlend obwohl sie lang genug ist.

   Aufruf:
     node auswertung/endspiel-zerlegung.js --partien k3-partien.csv --diagnose k3-diagnose-partien.csv
   Ausgang: 0 gültig · 1 KEIN URTEIL · 2 Bedienfehler */
'use strict';
const fs = require('fs');
const {vorzeichenP} = require('./messung-zusatz.js');
const {clopperPearson, gepaart} = require('./kandidaten-orakel/haupt-bericht.js');

const ALPHA = 0.05;
const MESSPUNKTE = [100, 200, 300];
const PARTIEN = 1230, SEEDS = 123, JE_SEED = 10, ZUGLIMIT = 600;
const SEED0 = 11260001;
const KOPF_P = ['seed', 'lauf_id', 'partie', 'aIst', 'sieger', 'siegerFarbe', 'stand', 'zuege', 'simsA', 'simsB', 'dauerMin', 'final_board_hash'];
const KOPF_D = ['seed', 'partie', 'zuege', 'armSchwarz', 'armWeiss', 'verliererArm', 'verliererFarbe',
  's_gnugo100', 'w_oben100', 'w_unten100', 's_gnugo200', 'w_oben200', 'w_unten200', 's_gnugo300', 'w_oben300', 'w_unten300',
  'kipppunkt', 'kipppunkt_streng'];
const FENSTER = [
  {id: 'Y100', name: 'Lage nach Zug 100', ab: 100},
  {id: 'D1', name: 'Veränderung 101–200', ab: 200},
  {id: 'D2', name: 'Veränderung 201–300', ab: 300},
  {id: 'D3', name: 'Veränderung ab Zug 301 (primär)', ab: 300}
];

class Bedienfehler extends Error {}

function liesCsv(text, kopf, name) {
  const z = String(text).replace(/\r/g, '').split('\n').filter(Boolean);
  if (!z.length || z[0] !== kopf.join(',')) throw new Error(`${name}: Kopfzeile weicht ab`);
  return z.slice(1).map((l, i) => {
    const t = l.split(',');
    if (t.length !== kopf.length) throw new Error(`${name}: Zeile ${i + 2} hat ${t.length} statt ${kopf.length} Spalten`);
    const o = {};
    kopf.forEach((k, j) => { o[k] = t[j]; });
    return o;
  });
}

const zahl = s => (s !== '' && s !== undefined && Number.isFinite(Number(s))) ? Number(s) : null;

/* Prüfung der Eingabe, ohne Zerlegung. Rückgabe {kein: [Gründe]} oder {kein: [], zeilen}. */
function pruefeEingabe(P, D) {
  const kein = [];
  const melde = t => { if (kein.length < 200) kein.push(t); };
  if (P.length !== PARTIEN) melde(`k3-partien.csv hat ${P.length} Partien, festgelegt sind ${PARTIEN}.`);
  if (D.length !== PARTIEN) melde(`k3-diagnose-partien.csv hat ${D.length} Partien, festgelegt sind ${PARTIEN}.`);
  const schluessel = x => `${x.seed}/${x.partie}`;
  const jeP = new Map(), jeD = new Map();
  for (const x of P) { if (jeP.has(schluessel(x))) melde(`k3-partien.csv: ${schluessel(x)} doppelt.`); jeP.set(schluessel(x), x); }
  for (const x of D) { if (jeD.has(schluessel(x))) melde(`k3-diagnose-partien.csv: ${schluessel(x)} doppelt.`); jeD.set(schluessel(x), x); }
  for (let s = 0; s < SEEDS; s++) for (let n = 1; n <= JE_SEED; n++) {
    const k = `${SEED0 + s}/${n}`;
    if (!jeP.has(k)) melde(`k3-partien.csv: ${k} fehlt.`);
    if (!jeD.has(k)) melde(`k3-diagnose-partien.csv: ${k} fehlt.`);
  }
  for (const k of jeP.keys()) if (!jeD.has(k)) melde(`${k} steht nur in k3-partien.csv.`);
  for (const k of jeD.keys()) if (!jeP.has(k)) melde(`${k} steht nur in k3-diagnose-partien.csv.`);

  const zeilen = [];
  for (const [k, p] of jeP) {
    const d = jeD.get(k);
    if (!d) continue;
    const fehler = [];
    if (!['Schwarz', 'Weiß'].includes(p.aIst)) fehler.push(`aIst „${p.aIst}“`);
    if (!['A', 'B'].includes(d.armSchwarz) || !['A', 'B'].includes(d.armWeiss) || d.armSchwarz === d.armWeiss)
      fehler.push(`armSchwarz „${d.armSchwarz}“, armWeiss „${d.armWeiss}“`);
    else if ((d.armSchwarz === 'A') !== (p.aIst === 'Schwarz')) fehler.push('Farbe von A in den beiden Dateien verschieden');
    const zp = Number(p.zuege), zd = Number(d.zuege);
    if (!Number.isInteger(zp) || zp < 1 || zp > ZUGLIMIT) fehler.push(`zuege ${p.zuege}`);
    if (zp !== zd) fehler.push(`zuege ${p.zuege} gegen ${d.zuege}`);
    const m = /^B (\d+(?:\.\d+)?) : W (\d+(?:\.\d+)?)$/.exec(p.stand);
    let marge = null;
    if (!m) fehler.push(`stand „${p.stand}“`);
    else {
      marge = Number(m[1]) - Number(m[2]);
      if (marge === 0) fehler.push('Endstand unentschieden');
      else if (!['S', 'W'].includes(d.verliererFarbe) || d.verliererFarbe !== (marge > 0 ? 'W' : 'S'))
        fehler.push(`verliererFarbe „${d.verliererFarbe}“ passt nicht zum Endstand ${p.stand}`);
      else if (d.verliererArm !== (d.verliererFarbe === 'S' ? d.armSchwarz : d.armWeiss)) fehler.push('verliererArm passt nicht zur Farbe');
    }
    const s = {};
    for (const mp of MESSPUNKTE) {
      const feld = [`s_gnugo${mp}`, `w_oben${mp}`, `w_unten${mp}`].map(f => d[f]);
      if (zd >= mp) {
        if (feld.some(v => zahl(v) === null)) fehler.push(`Messpunkt ${mp} fehlt, obwohl die Partie ${zd} Züge hat`);
        else s[mp] = Number(feld[0]);
      } else if (feld.some(v => v !== '')) fehler.push(`Messpunkt ${mp} vorhanden, obwohl die Partie nur ${zd} Züge hat`);
    }
    if (fehler.length) { melde(`${k}: ${fehler.join('; ')}.`); continue; }
    const sg = d.armSchwarz === 'B' ? 1 : -1;
    zeilen.push({schluessel: k, farbeB: sg === 1 ? 'S' : 'W', marge, s, sg});
  }
  return kein.length ? {kein} : {kein, zeilen};
}

/* Prüfung und Zerlegung. Rückgabe {kein: [Gründe]} oder {kein: [], zeilen, fenster: {...}}. */
function auswerten(P, D) {
  const e = pruefeEingabe(P, D);
  if (e.kein.length) return e;
  const zeilen = e.zeilen;
  const werte = {Y100: [], D1: [], D2: [], D3: [], T: []};
  const jeFarbe = {S: {Y100: [], D1: [], D2: [], D3: [], T: []}, W: {Y100: [], D1: [], D2: [], D3: [], T: []}};
  const voll = [];
  for (const z of zeilen) {
    const {s, sg, marge} = z, f = z.farbeB;
    const eintrag = (id, v) => { werte[id].push(v); jeFarbe[f][id].push(v); };
    eintrag('T', sg * marge);
    if (s[100] !== undefined) eintrag('Y100', sg * s[100]);
    if (s[100] !== undefined && s[200] !== undefined) eintrag('D1', sg * (s[200] - s[100]));
    if (s[200] !== undefined && s[300] !== undefined) eintrag('D2', sg * (s[300] - s[200]));
    if (s[300] !== undefined) eintrag('D3', sg * (marge - s[300]));
    if (s[300] !== undefined) voll.push(sg * s[100] + sg * (s[200] - s[100]) + sg * (s[300] - s[200]) + sg * (marge - s[300]) - sg * marge);
  }
  /* Die vier Abschnitte müssen sich zum Endstand addieren; sonst steckt ein Fehler in der Zerlegung. */
  const luecke = voll.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
  if (luecke > 1e-6) return {kein: [`Interne Kontrolle: Y100 + D1 + D2 + D3 weicht um bis zu ${luecke} vom Endstand ab.`]};

  const stat = a => {
    const n = a.length;
    const neg = a.filter(v => v < 0).length, pos = a.filter(v => v > 0).length, null0 = n - neg - pos;
    const g = gepaart(a, ALPHA);
    return {n, mittel: g.mittel, sd: g.sd, lo: g.lo, hi: g.hi, neg, pos, null: null0,
            p: vorzeichenP(pos, neg), cp: clopperPearson(neg, neg + pos, ALPHA)};
  };
  const fenster = {};
  for (const id of Object.keys(werte)) {
    fenster[id] = stat(werte[id]);
    fenster[id].farbe = {S: stat(jeFarbe.S[id]), W: stat(jeFarbe.W[id])};
  }
  return {kein: [], zeilen, fenster};
}

const fz = (v, s = 1) => v === null || v === undefined || !Number.isFinite(v) ? '–' : (v < 0 ? '−' : v > 0 ? '+' : '±') + Math.abs(v).toFixed(s).replace('.', ',');
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');
const proz = (a, b) => b ? (100 * a / b).toFixed(1).replace('.', ',') + ' %' : '–';

/* Urteil für den primären Abschnitt D3 (§ Urteilssätze der Festlegung). */
function urteil(s) {
  const m = fz(s.mittel, 2), iv = `[${fz(s.lo, 2)}; ${fz(s.hi, 2)}]`;
  if (s.p < ALPHA) {
    if (s.neg > s.pos && s.mittel < 0)
      return `**Ab Zug 301 verliert B gegenüber A nachweisbar Punkte: ${m} Punkte ${iv} (95 %), in ${s.neg} von ${s.neg + s.pos} Partien mit Veränderung.**`;
    if (s.pos > s.neg && s.mittel > 0)
      return `**Ab Zug 301 gewinnt B gegenüber A nachweisbar Punkte: ${m} Punkte ${iv} (95 %), in ${s.pos} von ${s.neg + s.pos} Partien mit Veränderung.**`;
    return `**Vorzeichentest (p = ${fp(s.p)}) und Mittelwert (${m} Punkte ${iv}) zeigen in verschiedene Richtungen: kein einheitliches Urteil.**`;
  }
  return `**Ein Punktverlust von B ab Zug 301 gegenüber A ist nicht nachgewiesen. Das Intervall ${iv} sagt, wie groß er sein könnte.**`;
}

function bericht(r) {
  const L = ['# Endspiel-Hypothese bei B, Stufe 1: Zerlegung des Endstands', ''];
  if (r.kein.length) {
    L.push('**KEIN URTEIL.**', '', '## Gründe', '');
    for (const g of r.kein.slice(0, 40)) L.push(`- ${g}`);
    if (r.kein.length > 40) L.push(`- und ${r.kein.length - 40} weitere`);
    return L.join('\n') + '\n';
  }
  L.push('**Gültig.** Festlegung: docs/endspiel-b-vorabfestlegung.md · ' + `${r.zeilen.length} Partien`, '');
  L.push('## Urteil (primär: Abschnitt ab Zug 301)', '', urteil(r.fenster.D3), '');
  L.push('## Zerlegung aus Sicht von B', '');
  L.push('Punkte aus Sicht von B, GNU Go `estimate_score` (chinesische Regeln, Komi 7,5). Negativ: B verliert Punkte gegenüber A. '
    + 'Y100 + D1 + D2 + D3 = Endstand. Ergänzende p-Werte begründen kein weiteres Urteil.', '');
  L.push('| Abschnitt | n | Mittel | SD | 95 % (t) | zu Ungunsten / zu Gunsten / ohne | Anteil zu Ungunsten [CP 95 %] | Vorzeichentest p |');
  L.push('|---|---:|---:|---:|---|---|---|---:|');
  const zeile = (name, s) => `| ${name} | ${s.n} | ${fz(s.mittel, 2)} | ${fz(s.sd, 1).replace(/^[+±]/, '')} | [${fz(s.lo, 2)}; ${fz(s.hi, 2)}] | ${s.neg} / ${s.pos} / ${s.null} | `
    + `${proz(s.neg, s.neg + s.pos)} [${proz(Math.round(s.cp[0] * 1e6), 1e6)}; ${proz(Math.round(s.cp[1] * 1e6), 1e6)}] | ${fp(s.p)} |`;
  for (const f of FENSTER) L.push(zeile(f.name, r.fenster[f.id]));
  L.push(zeile('**Endstand (Summe)**', r.fenster.T), '');
  L.push('## Getrennt nach der Farbe von B (beschreibend)', '');
  L.push('| Abschnitt | B als Schwarz: n · Mittel | B als Weiß: n · Mittel |', '|---|---|---|');
  for (const f of [...FENSTER, {id: 'T', name: 'Endstand (Summe)'}])
    L.push(`| ${f.name} | ${r.fenster[f.id].farbe.S.n} · ${fz(r.fenster[f.id].farbe.S.mittel, 2)} | ${r.fenster[f.id].farbe.W.n} · ${fz(r.fenster[f.id].farbe.W.mittel, 2)} |`);
  L.push('', '## Grenzen', '');
  L.push('- Gemessen wird gegen GNU Gos Schätzung, die vor Zug 300 grob ist; die Streuung der Abschnitte D1 und D2 enthält diesen Fehler. '
    + 'Er wirkt auf beide Arme gleich, weil jeder Arm in 615 von 1230 Partien Schwarz spielt.');
  L.push('- Die Zerlegung zeigt, in welchem Abschnitt sich der Endstand zu Ungunsten von B verschiebt. Sie zeigt nicht, warum, '
    + 'und nicht, ob B oder A in diesem Abschnitt anders spielt als bei gleicher Stellung. Das wäre Stufe 2 mit neuen Partien.');
  return L.join('\n') + '\n';
}

function argumente(argv) {
  const a = {partien: null, diagnose: null};
  for (let i = 0; i < argv.length; i += 2) {
    const k = argv[i], v = argv[i + 1];
    if (v === undefined) throw new Bedienfehler(`${k} braucht einen Wert`);
    if (k === '--partien') a.partien = v;
    else if (k === '--diagnose') a.diagnose = v;
    else throw new Bedienfehler(`unbekannte Option ${k}`);
  }
  if (!a.partien) throw new Bedienfehler('--partien fehlt');
  if (!a.diagnose) throw new Bedienfehler('--diagnose fehlt');
  return a;
}

function main() {
  let a;
  try { a = argumente(process.argv.slice(2)); }
  catch (err) {
    if (err instanceof Bedienfehler) { console.error(`Bedienfehler: ${err.message}`); process.exit(2); }
    throw err;
  }
  let r;
  try {
    const P = liesCsv(fs.readFileSync(a.partien, 'utf8'), KOPF_P, a.partien);
    const D = liesCsv(fs.readFileSync(a.diagnose, 'utf8'), KOPF_D, a.diagnose);
    r = auswerten(P, D);
  } catch (err) { r = {kein: [`Eingabe nicht lesbar: ${err.message}`]}; }
  console.log(bericht(r));
  process.exit(r.kein.length ? 1 : 0);
}

if (require.main === module) main();
module.exports = {ALPHA, MESSPUNKTE, KOPF_P, KOPF_D, FENSTER, Bedienfehler, liesCsv, pruefeEingabe, auswerten, urteil, bericht, argumente};
