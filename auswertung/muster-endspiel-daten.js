// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Muster, erster Schritt: Kandidatenlisten mit Merkmalen aus den
   Lehrdaten ziehen. Gehört zu docs/muster-endspiel.md.

   Liest Lehrdaten von muster-daten.js (je Stellung GNU Gos Zug auf Stufe 10)
   und stellt jede Stellung ab Zug --ab nach. Für jede legt es die echte
   Kandidatenliste der KI an: genau die Liste, die getAIMove vor der Suche
   an mctsPUCT gibt (Benson-Filter, Augenschutz und Lese-Verzicht
   eingerechnet; Zufall auf 0; die Pass-Schwellen sind abgeschaltet, damit
   auch Stellungen kurz vor dem Passen eine Liste haben). Je Kandidat:

     e      Bewertung ohne die Muster (Wurzelwert minus musterGewicht ×
            musterWert), also was die Muster ergänzen
     w0     musterWert der Tabelle in index.html (heute im Spiel)
     f[g]   ein Merkmalswert je Gruppe g, als Nummer in einem Wörterbuch:

     m  3×3-Muster                        (wie index.html)
     l  Abstand zum letzten Gegnerzug     (wie index.html)
     z  Linie 1–5+                        (wie index.html)
     y  Bouzy-Zone des Punkts (eigen, umstritten, fremd) und wie viele der
        acht Nachbarn zu eigener und zu fremder Zone gehören
     r  Steine im äußeren Ring des 5×5-Felds: eigene und fremde, je 0–3+
     d  Abstand zum nächsten eigenen und zum nächsten fremden Stein (1–6+)
     g  Größe der leeren Region, in der der Punkt liegt
     p  Linie × Spielabschnitt (Zug 81–120, 121–160, 161–200, ab 201)
     n  umstrittene (Bouzy-Wert 0) leere Punkte im 5×5-Feld um den Punkt
     b  Stärke der Bouzy-Zone am Punkt, in eigener Sicht
     q  Linie 1–4 × Abstand zur nächsten Ecke
     e  Linie 1–4 × Abstand zum nächsten eigenen × zum nächsten fremden Stein
     x  Linie 1–5 × Abstand zum letzten Gegnerzug
     u  die acht Punkte im Abstand 2 (Achsen und Diagonalen), auf Drehung und
        Spiegelung normiert
     k  die acht Springerpunkte (1, 2), ebenso normiert

   Je Stellung merkt es sich auch den Stand der Bouzy-Karte in eigener Sicht
   (Felder der eigenen Zone minus Felder der fremden Zone; positiv = die Seite
   am Zug liegt vorn).

   Ausgabe (Präfix P): P.json (Kopf, Stellungen, Wörterbuch), P.idx (Punkt
   je Kandidat, Uint16), P.e und P.w0 (Float64), P.f (Int32, 15 je Kandidat).

   Aufruf:
     node auswertung/muster-endspiel-daten.js <lehr.jsonl> [...] --aus P [--ab 80] [--bis 400] */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const {execFileSync} = require('child_process');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

/* Lehrdaten dürfen als .jsonl oder .jsonl.gz vorliegen */
const liesText = d => d.endsWith('.gz') ? zlib.gunzipSync(fs.readFileSync(d)).toString('utf8') : fs.readFileSync(d, 'utf8');
const GRUPPEN = ['m', 'l', 'z', 'y', 'r', 'd', 'g', 'p', 'n', 'b', 'q', 'e', 'x', 'u', 'k'];
const K = GRUPPEN.length;
const N = 361, G = 19;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const linieVon = i => { const x = i % G, y = (i / G) | 0; return Math.min(x, y, G - 1 - x, G - 1 - y) + 1; };
const abstand = (a, b) => a < 0 || b < 0 ? 99 : Math.max(Math.abs(a % G - b % G), Math.abs(((a / G) | 0) - ((b / G) | 0)));
const eimerL = d => d >= 99 ? 'keiner' : d <= 3 ? String(d) : d <= 6 ? '4-6' : 'weit';

/* ── Merkmale, die nur von der Stellung abhängen ─────────────────────── */
function karten(E, b, c) {
  const zo = new Int32Array(N), s = c === 1 ? 1 : -1;
  const Z = E.bouzyKarte(b, new Int32Array(N), new Int32Array(N));
  let stand = 0;
  for (let i = 0; i < N; i++) { zo[i] = s * Z[i]; stand += zo[i] > 0 ? 1 : zo[i] < 0 ? -1 : 0; }
  const dEig = new Uint8Array(N).fill(6), dFr = new Uint8Array(N).fill(6);
  for (let i = 0; i < N; i++) {
    if (!b[i]) continue;
    const feld = b[i] === c ? dEig : dFr, x0 = i % G, y0 = (i / G) | 0;
    for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
      const x = x0 + dx, y = y0 + dy;
      if (x < 0 || y < 0 || x >= G || y >= G) continue;
      const d = Math.max(Math.abs(dx), Math.abs(dy)), j = y * G + x;
      if (d < feld[j]) feld[j] = d;
    }
  }
  const reg = new Int32Array(N).fill(-1), groesse = [];
  for (let i = 0; i < N; i++) {
    if (b[i] || reg[i] >= 0) continue;
    const id = groesse.length, q = [i]; reg[i] = id;
    for (let k = 0; k < q.length; k++) for (const n of E.NEIGHBORS[q[k]]) if (!b[n] && reg[n] < 0) { reg[n] = id; q.push(n); }
    groesse.push(q.length);
  }
  return {zo, dEig, dFr, reg, groesse, stand};
}
const eimer4 = k => k === 0 ? '0' : k <= 2 ? '1' : k <= 5 ? '2' : '3';
const eimerG = n => n <= 2 ? String(n) : n <= 4 ? '3-4' : n <= 8 ? '5-8' : n <= 16 ? '9-16' : n <= 32 ? '17-32' : n <= 64 ? '33-64' : '65+';
const abschnitt = k => k <= 120 ? 'a' : k <= 160 ? 'b' : k <= 200 ? 'c' : 'd';
const eimerN = n => n === 0 ? '0' : n <= 2 ? '1' : n <= 5 ? '2' : n <= 10 ? '3' : '4';
const eimerB = v => v <= -11 ? 'a' : v <= -4 ? 'b' : v <= -1 ? 'c' : v === 0 ? 'd' : v <= 3 ? 'e' : v <= 10 ? 'f' : 'g';

/* Punkte in festem Abstand als Schlüssel, kleinste Lesart über die acht
   Drehungen und Spiegelungen (wie musterSchluessel) */
const SYM8 = [(x, y) => [x, y], (x, y) => [-x, y], (x, y) => [x, -y], (x, y) => [-x, -y],
              (x, y) => [y, x], (x, y) => [-y, x], (x, y) => [y, -x], (x, y) => [-y, -x]];
const PUNKTE_U = [[-2, -2], [0, -2], [2, -2], [-2, 0], [2, 0], [-2, 2], [0, 2], [2, 2]];
const PUNKTE_K = [[-1, -2], [1, -2], [-2, -1], [2, -1], [-2, 1], [2, 1], [-1, 2], [1, 2]];
function ringSchluessel(b, c, x0, y0, punkte) {
  const roh = new Map();
  for (const [dx, dy] of punkte) {
    const x = x0 + dx, y = y0 + dy;
    roh.set(dx + ',' + dy, x < 0 || y < 0 || x >= G || y >= G ? '#' : !b[y * G + x] ? '.' : b[y * G + x] === c ? 'o' : 'x');
  }
  let best = null;
  for (const t of SYM8) {
    const str = punkte.map(([dx, dy]) => { const [u, v] = t(dx, dy); return roh.get(u + ',' + v); }).join('');
    if (best === null || str < best) best = str;
  }
  return best;
}

function schluessel(E, b, c, k, letzt, m, kt) {
  const x0 = m % G, y0 = (m / G) | 0;
  /* y: Zone des Punkts und Nachbarn je Zone */
  const zs = kt.zo[m] > 0 ? 'o' : kt.zo[m] < 0 ? 'x' : 'n';
  let no = 0, nx = 0;
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
    if (!dx && !dy) continue;
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= G || y >= G) continue;
    const v = kt.zo[y * G + x];
    if (v > 0) no++; else if (v < 0) nx++;
  }
  /* r: Steine im Ring zwischen 3×3 und 5×5; n: umstrittene leere Punkte im 5×5 */
  let re = 0, rf = 0, nn = 0;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
    if (!dx && !dy) continue;
    const x = x0 + dx, y = y0 + dy;
    if (x < 0 || y < 0 || x >= G || y >= G) continue;
    const j = y * G + x, v = b[j];
    if (!v && kt.zo[j] === 0) nn++;
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== 2) continue;
    if (v === c) re++; else if (v) rf++;
  }
  /* q: Linie und Abstand zur nächsten Ecke (Abstand des weiter innen liegenden Koordinatenpaars) */
  const ecke = Math.min(Math.min(x0, G - 1 - x0) + Math.min(y0, G - 1 - y0), 99);
  const lin = Math.min(linieVon(m), 5);
  return [
    'm:' + E.musterSchluessel(b, m, c),
    'l:' + eimerL(abstand(m, letzt)),
    'z:' + lin,
    'y:' + zs + eimer4(no) + eimer4(nx),
    'r:' + Math.min(re, 3) + Math.min(rf, 3),
    'd:' + kt.dEig[m] + '-' + kt.dFr[m],
    'g:' + eimerG(kt.groesse[kt.reg[m]]),
    'p:' + lin + abschnitt(k),
    'n:' + eimerN(nn),
    'b:' + eimerB(kt.zo[m]),
    'q:' + Math.min(linieVon(m), 4) + '-' + (ecke <= 5 ? 'e' : ecke <= 11 ? 'm' : 'f'),
    'e:' + Math.min(linieVon(m), 4) + '|' + kt.dEig[m] + '-' + kt.dFr[m],
    'x:' + lin + '|' + eimerL(abstand(m, letzt)),
    'u:' + ringSchluessel(b, c, x0, y0, PUNKTE_U),
    'k:' + ringSchluessel(b, c, x0, y0, PUNKTE_K),
  ];
}

/* ── Die Kandidatenliste der KI vor der Suche ────────────────────────── */
/* Feste Simulationen, keine Baumwiederverwendung, keine Aufgabe; die
   Pass-Schwellen aus, damit auch Stellungen kurz vor dem Passen eine Liste
   haben. */
function stelleEin(E) {
  Object.assign(E.PARAMS, {mctsFixedSims: 120, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, resignEnabled: 0,
    passMinMc40: -1e9, passMinMc80: -1e9, passMinMc120: -1e9, passMinMc150: -1e9});
}
function kandidatenListe(E, b, c, k, letzt) {
  const STOPP = {};
  const echt = globalThis.mctsPUCT;
  let wurzel = null;
  globalThis.mctsPUCT = function (board, color, caps, rootScored) { wurzel = rootScored; throw STOPP; };
  const zufall = Math.random; Math.random = () => 0;
  try { E.getAIMove(new Uint8Array(b), c, [], {1: 0, 2: 0}, k, 'hard', 1, null, letzt >= 0 ? letzt : null); }
  catch (e) { if (e !== STOPP) throw e; }
  finally { Math.random = zufall; globalThis.mctsPUCT = echt; }
  return wurzel;
}

class Wachs {
  constructor(Typ) { this.Typ = Typ; this.a = new Typ(1 << 16); this.n = 0; }
  schiebe(v) { if (this.n === this.a.length) { const neu = new this.Typ(this.a.length * 2); neu.set(this.a); this.a = neu; } this.a[this.n++] = v; }
  fertig() { return this.a.subarray(0, this.n); }
}

function extrahiere(dateien, opt) {
  const E = ladeKI({mitNetz: false});
  stelleEin(E);
  const mg = E.PARAMS.musterGewicht;
  const ids = new Map(), namen = [], gruppeVon = [];
  const id = s => { let j = ids.get(s); if (j === undefined) { j = namen.length; ids.set(s, j); namen.push(s); gruppeVon.push(s[0]); } return j; };
  const idx = new Wachs(Uint16Array), e = new Wachs(Float64Array), w0 = new Wachs(Float64Array), f = new Wachs(Int32Array);
  const positionen = [];
  let fehlend = 0;
  for (const datei of dateien) {
    const quelle = path.basename(datei).replace(/\.jsonl(\.gz)?$/, '');
    for (const z of liesText(datei).split('\n')) {
      if (!z.trim()) continue;
      const p = JSON.parse(z);
      if (p.abgebrochen || !p.zuege) continue;
      const b = new Uint8Array(N), zuerst = p.beginnt === 'S' ? 1 : 2;
      for (const s of p.vorgabeSteine || []) b[vonGtp(s)] = 1;
      const ziel = new Map(p.ziele.map(t => [t.k, t.gnugo]));
      const letztesZiel = Math.max(...p.ziele.map(t => t.k));
      let letzt = -1;
      for (let k = 0; k < p.zuege.length && k <= letztesZiel; k++) {
        const c = k % 2 === 0 ? zuerst : 3 - zuerst;
        const gz = ziel.get(k), gi = vonGtp(gz);
        if (gz !== undefined && k >= opt.ab && k < opt.bis && gi >= 0 && !b[gi]) {
          const liste = kandidatenListe(E, b, c, k, letzt);
          if (!liste) fehlend++;
          else {
            const kt = karten(E, b, c), off = idx.n;
            let zielIdx = -1;
            liste.forEach((s, j) => {
              const m = s.m.idx, w = E.musterWert(b, m, c);
              idx.schiebe(m); w0.schiebe(w); e.schiebe(s.score - mg * w);
              for (const t of schluessel(E, b, c, k, letzt, m, kt)) f.schiebe(id(t));
              if (m === gi) zielIdx = j;
            });
            positionen.push({q: quelle, seed: p.seed, nr: p.nr, k, c, off, n: liste.length, ziel: zielIdx, gnugo: gz, letzt, stand: kt.stand});
          }
        }
        const i = vonGtp(p.zuege[k]);
        if (i < 0) { letzt = -1; continue; }
        b[i] = c; E.removeDeadGroups(b, 3 - c, i); letzt = i;
      }
      process.stderr.write(`${quelle} Partie ${p.nr}: ${positionen.length} Stellungen bisher\n`);
    }
  }
  let commit = null;
  try { commit = execFileSync('git', ['rev-parse', 'HEAD'], {cwd: path.join(__dirname, '..'), encoding: 'utf8'}).trim(); } catch (_) { /* kein git */ }
  const kopf = {version: 1, gruppen: GRUPPEN, K, musterGewicht: mg, ab: opt.ab, bis: opt.bis, commit, quellen: dateien.map(d => path.basename(d)),
                fehlend, namen, gruppeVon, positionen};
  fs.writeFileSync(opt.aus + '.json', JSON.stringify(kopf));
  for (const [ext, w] of [['idx', idx], ['e', e], ['w0', w0], ['f', f]]) {
    const a = w.fertig();
    fs.writeFileSync(`${opt.aus}.${ext}`, Buffer.from(a.buffer, a.byteOffset, a.byteLength));
  }
  console.error(`${positionen.length} Stellungen, ${idx.n} Kandidaten, ${namen.length} Merkmalswerte, ohne Liste: ${fehlend}`);
}

if (require.main === module) {
  const a = process.argv.slice(2), dateien = [], opt = {ab: 80, bis: 400, aus: null};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--bis') opt.bis = +a[++i];
    else dateien.push(a[i]);
  }
  if (!opt.aus || !dateien.length) { console.error('Aufruf: muster-endspiel-daten.js <lehr.jsonl> [...] --aus P [--ab 80] [--bis 400]'); process.exit(1); }
  extrahiere(dateien, opt);
}

module.exports = {GRUPPEN, K, karten, schluessel, kandidatenListe, stelleEin};
