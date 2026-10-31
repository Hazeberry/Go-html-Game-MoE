// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Schätzung von k für die Komi-Messung (docs/komi-bewusstsein.md §3):
   Wie viele Einheiten von evaluateBoard entsprechen einem Punkt Flächenstand?

   Aus archivierten Partien ohne Vorgabe (Komi 7,5, Datensätze von
   gnugo-duell.js) wird die Stellung nach Zug 120, 160 und 200 nachgespielt,
   evaluateBoard(Brett, Schwarz, Gefangene) mit den Default-Parametern der
   Datei berechnet und gegen den späteren komifreien Flächenstand
   d = Fläche Schwarz − Fläche Weiß (GNU Go zählt, `unsereZaehlung`) gerückt.

   Je Zugzahl zwei Geraden: d auf E (Steigung s_dE, Punkte je Einheit) und E auf
   d (Steigung s_Ed, Einheiten je Punkt). Beide sind verzerrt (Verdünnung durch
   Messfehler in der jeweils erklärenden Größe), in entgegengesetzte
   Richtungen. Vorab festgelegt (§3): u = Einheiten je Punkt wird als
   geometrisches Mittel der beiden Schätzungen 1/s_dE und s_Ed genommen, das
   ist u = SD(E) / SD(d) (je Zugzahl), und k = Komi 7,5 × u; eingefroren wird der Wert bei Zug 160, gerundet auf
   eine ganze Zahl, wenn die Werte bei 120 und 200 höchstens 25 % abweichen
   (sonst gilt die Schätzung als nicht belastbar, das Programm meldet es und
   endet mit Exit-Code 1).

   Aufruf:  node auswertung/komi/k-schaetzung.js [--html index.html] [--komi 7.5] partien.jsonl[.gz] ... */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');

const ZUGZAHLEN = [120, 160, 200];
const FREEZE_BEI = 160, TOLERANZ = 0.25;

/* ---------- Regression ---------- */
function regression(punkte) {
  const n = punkte.length;
  if (n < 3) return null;
  const mx = punkte.reduce((a, p) => a + p.E, 0) / n, md = punkte.reduce((a, p) => a + p.d, 0) / n;
  let sxx = 0, sdd = 0, sxd = 0;
  for (const p of punkte) { sxx += (p.E - mx) ** 2; sdd += (p.d - md) ** 2; sxd += (p.E - mx) * (p.d - md); }
  if (!(sxx > 0) || !(sdd > 0) || sxd === 0) return null;
  const sDE = sxd / sxx;          // Punkte je Einheit (d auf E)
  const sEd = sxd / sdd;          // Einheiten je Punkt (E auf d)
  const r2 = (sxd * sxd) / (sxx * sdd);
  /* geometrisches Mittel aus 1/sDE (zu groß) und sEd (zu klein) = sd(E)/sd(d) */
  const u = Math.sqrt(sxx / sdd) * Math.sign(sxd);
  const se = Math.sqrt((sdd - sDE * sxd) / Math.max(1, n - 2) / sxx);
  return {n, sDE, sEd, r2, u, seSteigung: se};
}

/* Vorabfestlegung §3: k bei Zug 160, wenn 120 und 200 höchstens 25 % abweichen */
function einfrieren(erg, komi) {
  const k = {};
  for (const z of ZUGZAHLEN) k[z] = erg[z] ? komi * erg[z].u : NaN;
  const mitte = k[FREEZE_BEI];
  const abw = ZUGZAHLEN.filter(z => z !== FREEZE_BEI).map(z => Math.abs(k[z] - mitte) / Math.abs(mitte));
  const belastbar = Number.isFinite(mitte) && mitte > 0 && abw.every(a => a <= TOLERANZ);
  return {k, belastbar, abweichung: abw, wert: belastbar ? Math.round(mitte) : null};
}

/* ---------- Nachspielen ---------- */
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => {
  const t = String(s || '').trim().toUpperCase();
  const x = SPALTEN.indexOf(t[0]), r = +t.slice(1);
  if (x < 0 || !(r >= 1 && r <= 19)) throw new Error('Koordinate unlesbar: ' + s);
  return (19 - r) * 19 + x;
};

function motor(htmlPfad) {
  const html = fs.readFileSync(htmlPfad, 'utf8');
  const ex = id => {
    const m = new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);
    if (!m) throw new Error(`<script id="${id}"> fehlt in ${htmlPfad}`);
    return m[1];
  };
  globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
  globalThis.document = {getElementById: () => null};
  (0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai') + ';globalThis.__KS={PARAMS,evaluateBoard,removeDeadGroups,BOARD_SIZE};');
  return globalThis.__KS;
}

/* Stellungen einer Partie nach den Zügen in `zahlen`; liefert {zahl: {E, ...}} */
function stellungen(E, zuege, zahlen) {
  const board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0}, aus = {};
  const max = Math.max(...zahlen);
  for (let i = 0; i < Math.min(zuege.length, max); i++) {
    const f = i % 2 === 0 ? 1 : 2;         // Schwarz beginnt (ohne Vorgabe)
    if (zuege[i] !== 'pass') {
      const p = vonGtp(zuege[i]);
      board[p] = f;
      caps[f] += E.removeDeadGroups(board, 3 - f, p);
    }
    if (zahlen.includes(i + 1)) aus[i + 1] = E.evaluateBoard(board, 1, {...caps});
  }
  return aus;
}

/* Gültige Partie: ohne Vorgabe, Schwarz beginnt, nicht abgebrochen, Sieger bekannt, Zählung vorhanden */
function brauchbar(r, komi) {
  return r && !r.abgebrochen && (r.gewonnen === true || r.gewonnen === false) && r.unsereZaehlung
    && Number.isFinite(r.unsereZaehlung.b) && Number.isFinite(r.unsereZaehlung.w)
    && r.komi === komi && r.beginnt === 'S' && (!r.vorgabe || r.vorgabe === 0) && Array.isArray(r.zuege);
}

function auswerten(E, partien, komi) {
  const punkte = Object.fromEntries(ZUGZAHLEN.map(z => [z, []]));
  let genutzt = 0;
  for (const r of partien) {
    if (!brauchbar(r, komi)) continue;
    const d = r.unsereZaehlung.b - (r.unsereZaehlung.w - komi);   // komifreier Flächenstand für Schwarz
    const st = stellungen(E, r.zuege, ZUGZAHLEN.filter(z => z < r.zuege.length));
    let eine = false;
    for (const z of Object.keys(st)) { punkte[z].push({E: st[z], d}); eine = true; }
    if (eine) genutzt++;
  }
  const erg = {};
  for (const z of ZUGZAHLEN) erg[z] = regression(punkte[z]);
  return {genutzt, erg, frei: einfrieren(erg, komi)};
}

const z1 = v => Number.isFinite(v) ? v.toFixed(3).replace('.', ',') : '–';
function text(res, komi) {
  const o = [`Partien genutzt: ${res.genutzt}. Komifreier Flächenstand d = Fläche Schwarz − Fläche Weiß; E = evaluateBoard(Schwarz).`, '',
    '| Zug | Stellungen | Punkte je Einheit (d auf E) | Einheiten je Punkt (E auf d) | R² | u (geometr. Mittel) | k = Komi · u |', '|---:|---:|---:|---:|---:|---:|---:|'];
  for (const z of ZUGZAHLEN) {
    const e = res.erg[z];
    o.push(e ? `| ${z} | ${e.n} | ${z1(e.sDE)} | ${z1(e.sEd)} | ${z1(e.r2)} | ${z1(e.u)} | ${z1(komi * e.u)} |` : `| ${z} | 0 | – | – | – | – | – |`);
  }
  o.push('', res.frei.belastbar
    ? `**Eingefroren: k = ${res.frei.wert}** (Komi ${String(komi).replace('.', ',')} ≙ ${res.frei.wert} Einheiten von evaluateBoard; Wert bei Zug ${FREEZE_BEI}, Abweichung der Werte bei 120 und 200: ${res.frei.abweichung.map(a => (100 * a).toFixed(1).replace('.', ',') + ' %').join(' und ')}, erlaubt ${100 * TOLERANZ} %).`
    : `**Kein k eingefroren:** Schätzung nicht belastbar (Abweichung der Werte bei 120 und 200 vom Wert bei ${FREEZE_BEI}: ${res.frei.abweichung.map(a => Number.isFinite(a) ? (100 * a).toFixed(1).replace('.', ',') + ' %' : '–').join(' und ')}, erlaubt ${100 * TOLERANZ} %, oder Steigung nicht positiv).`);
  return o.join('\n') + '\n';
}

module.exports = {regression, einfrieren, stellungen, auswerten, brauchbar, text, motor, ZUGZAHLEN};

if (require.main === module) {
  const a = process.argv.slice(2);
  let html = path.join(__dirname, '..', '..', 'index.html'), komi = 7.5; const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--html') html = a[++i];
    else if (a[i] === '--komi') komi = +a[++i];
    else if (a[i].startsWith('--')) { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
    else dateien.push(a[i]);
  }
  if (!dateien.length) { console.error('Aufruf: node auswertung/komi/k-schaetzung.js [--html index.html] [--komi 7.5] partien.jsonl[.gz] ...'); process.exit(2); }
  const partien = dateien.flatMap(d => { const r = fs.readFileSync(d); return (d.endsWith('.gz') ? zlib.gunzipSync(r) : r).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)); });
  const res = auswerten(motor(html), partien, komi);
  process.stdout.write(text(res, komi));
  process.exit(res.frei.belastbar ? 0 : 1);
}
