// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Schätzung von k für die Komi-Messung (docs/komi-bewusstsein.md §3):
   Wie viele Einheiten von evaluateBoard entsprechen einem Punkt Flächenstand?

   Aus archivierten Partien ohne Vorgabe (Komi 7,5, Datensätze von
   gnugo-duell.js) wird die Stellung nach Zug 200, 240 und 280 nachgespielt,
   evaluateBoard(Brett, Schwarz, Gefangene) mit den Default-Parametern der
   Datei berechnet und gegen den späteren komifreien Flächenstand
   d = Fläche Schwarz − Fläche Weiß (GNU Go zählt, `unsereZaehlung`) gerückt.

   Je Zugzahl zwei Geraden: d auf E (Steigung s_dE, Punkte je Einheit) und E auf
   d (Steigung s_Ed, Einheiten je Punkt). Beide sind verzerrt (Verdünnung durch
   Messfehler in der jeweils erklärenden Größe), in entgegengesetzte
   Richtungen. Vorab festgelegt (§3): u = Einheiten je Punkt wird als
   geometrisches Mittel der beiden Schätzungen 1/s_dE und s_Ed genommen, das
   ist u = SD(E) / SD(d) (je Zugzahl), und k = Komi 7,5 × u; eingefroren wird der Wert bei Zug 240, gerundet auf
   eine ganze Zahl, wenn die Werte bei 200 und 280 höchstens 25 % abweichen.
   Der Komi-Arm ist nur dann tragfähig, wenn zusätzlich R² bei allen drei
   Zugzahlen mindestens 0,25 beträgt und das 95-%-Intervall von u (Bootstrap
   über Partien, 2000 Ziehungen) bei allen drei Zugzahlen über 0 liegt. Sonst
   meldet das Programm „trägt nicht“ und endet mit Exit-Code 1: Ein
   erfolgloser Kalibrierungsversuch ist ein brauchbares Ergebnis. Geprüft
   wird außerdem das Nachspielen selbst: Die geschlagenen Steine am Ende des
   Nachspielens müssen mit `gefangen` des Datensatzes übereinstimmen (sonst
   Exit-Code 3).

   Explorative Gegenproben (docs/komi-bewusstsein.md §6, ändern das Urteil
   aus §5 nicht): `--quelle gnugo` nimmt für d den Endstand aus GNU Gos
   final_score (Feld `endstand`) statt der eigenen Zählung `unsereZaehlung`
   (Standard `eigene`, wie in der Vorabfestlegung gerechnet); `--gleiche-partien`
   wertet an allen Zugzahlen nur die Partien aus, die die längste Zugzahl
   erreichen.

   Aufruf:  node auswertung/komi/k-schaetzung.js [--html index.html] [--komi 7.5] [--quelle eigene|gnugo] [--gleiche-partien] partien.jsonl[.gz] ... */
'use strict';
const fs = require('fs'), zlib = require('zlib'), path = require('path');

const ZUGZAHLEN = [200, 240, 280];
const FREEZE_BEI = 240, TOLERANZ = 0.25, MIN_R2 = 0.25, BOOT = 2000;

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

/* Vorabfestlegung §3: k bei Zug 240, wenn 200 und 280 höchstens 25 % abweichen */
function einfrieren(erg, komi) {
  const k = {};
  for (const z of ZUGZAHLEN) k[z] = erg[z] ? komi * erg[z].u : NaN;
  const mitte = k[FREEZE_BEI];
  const abw = ZUGZAHLEN.filter(z => z !== FREEZE_BEI).map(z => Math.abs(k[z] - mitte) / Math.abs(mitte));
  const belastbar = Number.isFinite(mitte) && mitte > 0 && abw.every(a => a <= TOLERANZ);
  return {k, belastbar, abweichung: abw, wert: belastbar ? Math.round(mitte) : null};
}

/* Bootstrap über Partien (fester Zufall, mulberry32): 95-%-Intervall von u je Zugzahl */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function bootstrapU(punkte, ziehungen = BOOT, seed = 1) {
  const n = punkte.length, zufall = mulberry32(seed), us = [];
  if (n < 3) return null;
  for (let b = 0; b < ziehungen; b++) {
    const probe = Array.from({length: n}, () => punkte[Math.floor(zufall() * n)]);
    const r = regression(probe);
    if (r) us.push(r.u);
  }
  if (us.length < ziehungen / 2) return null;
  us.sort((a, c) => a - c);
  return [us[Math.floor(0.025 * us.length)], us[Math.min(us.length - 1, Math.floor(0.975 * us.length))]];
}

/* Tragfähigkeit (§3): k belastbar, R² >= 0,25 bei allen Zugzahlen, untere Grenze von u über 0 */
function tragfaehig(erg, frei) {
  const gruende = [];
  if (!frei.belastbar) gruende.push(`k nicht belastbar (Abweichung ${frei.abweichung.map(a => Number.isFinite(a) ? (100 * a).toFixed(1).replace('.', ',') + ' %' : '–').join(' und ')}, erlaubt ${100 * TOLERANZ} %, oder Steigung nicht positiv)`);
  for (const z of ZUGZAHLEN) {
    const e = erg[z];
    if (!e) { gruende.push(`Zug ${z}: keine Regression`); continue; }
    if (!(e.r2 >= MIN_R2)) gruende.push(`Zug ${z}: R² ${e.r2.toFixed(3).replace('.', ',')} unter ${String(MIN_R2).replace('.', ',')}`);
    if (!e.ki || !(e.ki[0] > 0)) gruende.push(`Zug ${z}: Intervall von u reicht bis 0 oder darunter`);
  }
  return {traegt: gruende.length === 0, gruende};
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

/* Eine Partie nachspielen: Stellungen nach den Zügen in `zahlen` (evaluateBoard
   aus Sicht von Schwarz) und die geschlagenen Steine je Farbe nach ALLEN Zügen */
function nachspielen(E, zuege, zahlen) {
  const board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0}, aus = {};
  for (let i = 0; i < zuege.length; i++) {
    const f = i % 2 === 0 ? 1 : 2;         // Schwarz beginnt (ohne Vorgabe)
    if (zuege[i] !== 'pass') {
      const p = vonGtp(zuege[i]);
      board[p] = f;
      caps[f] += E.removeDeadGroups(board, 3 - f, p);
    }
    if (zahlen.includes(i + 1)) aus[i + 1] = E.evaluateBoard(board, 1, {...caps});
  }
  return {stellungen: aus, gefangen: caps};
}

/* Komifreier Flächenstand für Schwarz, d = Fläche Schwarz − Fläche Weiß.
   eigene: aus `unsereZaehlung` (Zählung von gnugo-duell.js, w enthält das Komi).
   gnugo:  aus `endstand` = GNU Gos final_score aus Sicht der KI, mit Komi;
           Rand für Schwarz = ±endstand, d = Rand + Komi. */
function stand(r, komi, quelle = 'eigene') {
  if (quelle === 'gnugo') {
    if (!Number.isFinite(r.endstand) || (r.wirFarbe !== 'S' && r.wirFarbe !== 'W')) return NaN;
    return (r.wirFarbe === 'S' ? r.endstand : -r.endstand) + komi;
  }
  return r.unsereZaehlung.b - (r.unsereZaehlung.w - komi);
}

/* Gültige Partie: ohne Vorgabe, Schwarz beginnt, nicht abgebrochen, Sieger bekannt, Zählung vorhanden */
function brauchbar(r, komi, quelle = 'eigene') {
  return r && !r.abgebrochen && (r.gewonnen === true || r.gewonnen === false) && r.unsereZaehlung
    && Number.isFinite(r.unsereZaehlung.b) && Number.isFinite(r.unsereZaehlung.w)
    && r.komi === komi && r.beginnt === 'S' && (!r.vorgabe || r.vorgabe === 0) && Array.isArray(r.zuege)
    && Number.isFinite(stand(r, komi, quelle));
}

function auswerten(E, partien, komi, opt = {}) {
  const quelle = opt.quelle || 'eigene', gleiche = !!opt.gleiche;
  const punkte = Object.fromEntries(ZUGZAHLEN.map(z => [z, []]));
  let genutzt = 0, geprueft = 0, falsch = 0, uebersprungen = 0;
  const zuKurz = Object.fromEntries(ZUGZAHLEN.map(z => [z, 0]));
  for (const r of partien) {
    if (!brauchbar(r, komi, quelle)) { uebersprungen++; continue; }
    const d = stand(r, komi, quelle);   // komifreier Flächenstand für Schwarz
    const n = r.zuege.length;
    if (gleiche && n < Math.max(...ZUGZAHLEN)) { uebersprungen++; continue; }
    const na = nachspielen(E, r.zuege, ZUGZAHLEN.filter(z => z <= n));
    if (r.gefangen && Number.isFinite(r.gefangen.wir)) {   // Probe auf das Nachspielen selbst
      geprueft++;
      const wir = r.wirFarbe === 'S' ? 1 : 2;
      if (na.gefangen[wir] !== r.gefangen.wir || na.gefangen[3 - wir] !== r.gefangen.gegner) falsch++;
    }
    let eine = false;
    for (const z of ZUGZAHLEN) { if (z in na.stellungen) { punkte[z].push({E: na.stellungen[z], d}); eine = true; } else zuKurz[z]++; }
    if (eine) genutzt++;
  }
  const erg = {};
  for (const z of ZUGZAHLEN) {
    erg[z] = regression(punkte[z]);
    if (erg[z]) erg[z].ki = bootstrapU(punkte[z]);
  }
  const frei = einfrieren(erg, komi);
  return {genutzt, uebersprungen, geprueft, falsch, zuKurz, erg, frei, trag: tragfaehig(erg, frei), quelle, gleiche};
}

const z3 = v => Number.isFinite(v) ? v.toFixed(3).replace('.', ',') : '–';
function text(res, komi) {
  const o = [`Quelle von d: ${res.quelle === 'gnugo' ? 'GNU Gos final_score (`endstand`)' : 'eigene Zählung (`unsereZaehlung`)'}; Partien: ${res.gleiche ? 'nur die, die alle drei Zugzahlen erreichen' : 'alle brauchbaren'}.`, '',
    `Partien genutzt: ${res.genutzt} (nicht brauchbar übersprungen: ${res.uebersprungen}). Komifreier Flächenstand d = Fläche Schwarz − Fläche Weiß; E = evaluateBoard(Schwarz).`,
    `Probe des Nachspielens: ${res.geprueft - res.falsch} von ${res.geprueft} Partien mit gleichen Gefangenenzahlen wie im Datensatz${res.falsch ? ' — **FEHLER im Nachspielen**' : ''}.`, '',
    '| Zug | Stellungen | zu kurz | Punkte je Einheit (d auf E) | Einheiten je Punkt (E auf d) | R² | u (geometr. Mittel) | 95 % von u | k = Komi · u |', '|---:|---:|---:|---:|---:|---:|---:|---|---:|'];
  for (const z of ZUGZAHLEN) {
    const e = res.erg[z];
    o.push(e ? `| ${z} | ${e.n} | ${res.zuKurz[z]} | ${z3(e.sDE)} | ${z3(e.sEd)} | ${z3(e.r2)} | ${z3(e.u)} | ${e.ki ? `${z3(e.ki[0])} bis ${z3(e.ki[1])}` : '–'} | ${z3(komi * e.u)} |` : `| ${z} | 0 | ${res.zuKurz[z]} | – | – | – | – | – | – |`);
  }
  o.push('', res.frei.belastbar
    ? `k bei Zug ${FREEZE_BEI}: ${res.frei.wert} (Abweichung der Werte bei 200 und 280: ${res.frei.abweichung.map(a => (100 * a).toFixed(1).replace('.', ',') + ' %').join(' und ')}, erlaubt ${100 * TOLERANZ} %).`
    : 'Kein k einzufrieren.');
  o.push('', res.trag.traegt
    ? `**Die Daten tragen einen Komi-Arm: k = ${res.frei.wert}** (Komi ${String(komi).replace('.', ',')} ≙ ${res.frei.wert} Einheiten von evaluateBoard).`
    : `**Die Daten tragen keinen Komi-Arm** (Kalibrierung erfolglos, ein brauchbares Ergebnis):\n\n${res.trag.gruende.map(g => '- ' + g).join('\n')}`);
  return o.join('\n') + '\n';
}

module.exports = {stand, regression, einfrieren, bootstrapU, tragfaehig, nachspielen, auswerten, brauchbar, text, motor, ZUGZAHLEN};

if (require.main === module) {
  const a = process.argv.slice(2);
  let html = path.join(__dirname, '..', '..', 'index.html'), komi = 7.5, quelle = 'eigene', gleiche = false; const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--html') html = a[++i];
    else if (a[i] === '--komi') komi = +a[++i];
    else if (a[i] === '--quelle') { quelle = a[++i]; if (quelle !== 'eigene' && quelle !== 'gnugo') { console.error('--quelle: eigene oder gnugo'); process.exit(2); } }
    else if (a[i] === '--gleiche-partien') gleiche = true;
    else if (a[i].startsWith('--')) { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
    else dateien.push(a[i]);
  }
  if (!dateien.length) { console.error('Aufruf: node auswertung/komi/k-schaetzung.js [--html index.html] [--komi 7.5] partien.jsonl[.gz] ...'); process.exit(2); }
  const partien = dateien.flatMap(d => { const r = fs.readFileSync(d); return (d.endsWith('.gz') ? zlib.gunzipSync(r) : r).toString('utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)); });
  const res = auswerten(motor(html), partien, komi, {quelle, gleiche});
  process.stdout.write(text(res, komi));
  process.exit(res.falsch ? 3 : res.trag.traegt ? 0 : 1);
}
