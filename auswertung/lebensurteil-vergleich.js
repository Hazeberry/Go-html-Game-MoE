/* Eigenes Lebensurteil gegen GNU Gos Urteil (docs/gebiet-sicher.md, Stufe 2).

   Liest die Stellungen von lebensurteil-daten.js, stellt sie aus den
   Partien nach und vergleicht zwei Dinge:

   1. Steine: Welche Steine hält GNU Go für kritisch, welche das eigene
      Urteil? (Trefferquote und Genauigkeit, nach Steinen gezählt)
   2. Zugwahl: der beste Kandidat an der Wurzel von getAIMove (vor der
      Suche, Zufall auf 0) ohne Urteil, mit GNU Gos Urteil und mit dem
      eigenen, jeweils mit gebietSicher 2. Gezählt wird, wie oft GNU Gos
      Urteil den Zug ändert, wie oft das eigene dieselbe Änderung trifft
      und wie oft es den Zug ändert, wo GNU Gos Urteil das nicht tut.

   3. Warum: Für jeden GNU-kritischen Drachen, ob er eine Kette mit höchstens
      drei Freiheiten hat, ob der Leser eine davon fängt und ob er sie dann
      für rettbar hält (= vom eigenen Urteil erkannt).

   Eigenes Urteil „taktisch“: Eine Kette mit höchstens drei Freiheiten ist
   kritisch, wenn der taktische Leser sagt: Der Angreifer am Zug fängt sie
   (leseAngriff), der Verteidiger am Zug rettet sie (leseVerteidigung).
   Angriffspunkt ist der erste Zug des Angreifers, nach dem die Kette nicht
   mehr zu retten ist, Verteidigungspunkt der erste Zug des Verteidigers,
   nach dem sie nicht mehr zu fangen ist. Kandidaten wie im Leser:
   Freiheiten, bei zwei Freiheiten deren leere Nachbarn; für die
   Verteidigung zusätzlich die Freiheiten angrenzender fremder Ketten mit
   höchstens zwei Freiheiten.

   Aufruf:
     node auswertung/lebensurteil-vergleich.js urteil.jsonl [...] --partien verz
                                               [--jede 1] [--min 1] [--json aus.json] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const {urteilAusGtp} = require('./lebensurteil.js');

const a = process.argv.slice(2), dateien = [];
const opt = {partien: null, jede: 1, min: 1, json: null};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--partien') opt.partien = a[++i];
  else if (a[i] === '--jede') opt.jede = +a[++i];
  else if (a[i] === '--min') opt.min = +a[++i];
  else if (a[i] === '--json') opt.json = a[++i];
  else dateien.push(a[i]);
}

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE, NB = E.NEIGHBORS;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };

/* ── Eigenes Urteil ──────────────────────────────────────────────── */
function setze(b, m, f) {
  if (b[m]) return null;
  const nb = new Uint8Array(b); nb[m] = f;
  E.removeDeadGroups(nb, 3 - f, m);
  return E.countLiberties(nb, m, 1) === 0 ? null : nb;
}
function urteilTaktisch(b, minGroesse = 1) {
  const ges = new Uint8Array(N), krit = [], tot = new Uint8Array(N), toteSteine = [];
  for (let s = 0; s < N; s++) {
    if (!b[s] || ges[s]) continue;
    const ff = E.floodFill(b, s), f = b[s];
    for (const q of ff.group) ges[q] = 1;
    if (ff.liberties.length > 3 || ff.group.length < minGroesse) continue;
    if (!E.leseAngriff(b, s).ja) continue;
    if (!E.leseVerteidigung(b, s).ja) continue;      /* tot: bei gebietSicher 2 ohne Wirkung */
    const Lb = ff.liberties;
    const angKand = new Set(Lb);
    if (Lb.length === 2) for (const l of Lb) for (const n of NB[l]) if (!b[n]) angKand.add(n);
    const vertKand = new Set(Lb), gs = new Set();
    for (const g of ff.group) for (const n of NB[g]) {
      if (b[n] !== 3 - f || gs.has(n)) continue;
      const k = E.floodFill(b, n); for (const x of k.group) gs.add(x);
      if (k.liberties.length <= 2) for (const l of k.liberties) vertKand.add(l);
    }
    let angriff = -1, verteidigung = -1;
    for (const m of angKand) {
      const nb = setze(b, m, 3 - f);
      if (nb && (!nb[s] || !E.leseVerteidigung(nb, s).ja)) { angriff = m; break; }
    }
    for (const m of vertKand) {
      const nb = setze(b, m, f);
      if (nb && nb[s] && !E.leseAngriff(nb, s).ja) { verteidigung = m; break; }
    }
    krit.push({farbe: f, steine: ff.group.slice(), angriff, verteidigung});
  }
  return {tot, toteSteine, krit};
}

/* ── Wurzelkandidat von getAIMove, ohne Suche ────────────────────── */
const STOPP = {};
let _wurzel = null;
const echt = globalThis.mctsPUCT;
globalThis.mctsPUCT = function (board, color, caps, rootScored) { _wurzel = rootScored; throw STOPP; };
function besterZug(b, f, mc, last, urteil) {
  Object.assign(E.PARAMS, {gebietSicher: urteil ? 2 : 0, mctsFixedSims: 120, adaptiveBudgetEnabled: 0, mctsTreeReuse: 0, resignEnabled: 0});
  E.setzeLebensurteil(urteil);
  const zr = Math.random; Math.random = () => 0;
  _wurzel = null;
  try { E.getAIMove(new Uint8Array(b), f, [], {1: 0, 2: 0}, mc, 'hard', 1, null, last); }
  catch (e) { if (e !== STOPP) throw e; }
  finally { Math.random = zr; E.setzeLebensurteil(null); }
  return _wurzel && _wurzel.length ? _wurzel[0].m.idx : null;
}

/* ── Partien und Stellungen ─────────────────────────────────────── */
const partien = new Map();
function partie(quelle, nr) {
  if (!partien.has(quelle)) {
    const m = new Map();
    for (const z of fs.readFileSync(path.join(opt.partien, quelle), 'utf8').split('\n'))
      if (z.trim()) { const p = JSON.parse(z); m.set(p.nr, p); }
    partien.set(quelle, m);
  }
  return partien.get(quelle).get(nr);
}
function brett(p, bis) {
  const b = new Uint8Array(N);
  for (const v of p.vorgabeSteine || []) b[vonGtp(v)] = 1;
  const zuerst = p.beginnt === 'S' ? 1 : 2;
  let last = null;
  for (let k = 0; k < bis; k++) {
    const i = vonGtp(p.zuege[k]); if (i < 0) { last = null; continue; }
    const f = k % 2 === 0 ? zuerst : 3 - zuerst;
    b[i] = f; E.removeDeadGroups(b, 3 - f, i); last = i;
  }
  return {b, last};
}

const st = {stellungen: 0, gKrit: 0, eKrit: 0, beide: 0, gGruppen: 0, eGruppen: 0,
            gAendert: 0, eTrifft: 0, eAnders: 0, eFehlalarm: 0, eAendert: 0, msEigen: 0,
            gTaktisch: 0, grund: {keinPunkt: 0, nichtErkannt: 0, andererPunkt: 0, gleicherPunkt: 0},
            eKritOhnePunkt: 0, eKritGnuLebt: 0, eKritGnuTot: 0, eKritGnuKrit: 0,
            warum: {drachen: 0, einStein: 0, ohneKurzeKette: 0, nichtFangbar: 0, fangbarAberTot: 0, erkannt: 0}};
let n = 0;
for (const datei of dateien) for (const z of fs.readFileSync(datei, 'utf8').split('\n')) {
  if (!z.trim()) continue;
  const r = JSON.parse(z);
  if (r.abbruch || n++ % opt.jede) continue;
  const p = partie(r.quelle, r.nr);
  const {b, last} = brett(p, r.zug);
  const g = urteilAusGtp(r.status, r.steine, b, vonGtp);
  const t0 = process.hrtime.bigint();
  const e = urteilTaktisch(b, opt.min);
  st.msEigen += Number(process.hrtime.bigint() - t0) / 1e6;
  const gS = new Set(), eS = new Set();
  for (const k of g.krit) for (const s of k.steine) gS.add(s);
  for (const k of e.krit) for (const s of k.steine) eS.add(s);
  st.gKrit += gS.size; st.eKrit += eS.size; st.gGruppen += g.krit.length; st.eGruppen += e.krit.length;
  for (const s of gS) if (eS.has(s)) st.beide++;
  /* Wie viele GNU-kritische Drachen haben eine Kette mit ≤ 3 Freiheiten? */
  for (const k of g.krit) {
    if (k.steine.some(s => E.countLiberties(b, s, 4) <= 3)) st.gTaktisch++;
    const w = st.warum; w.drachen++; if (k.steine.length === 1) w.einStein++;
    const ges = new Set(), kurz = [];
    for (const s of k.steine) { if (ges.has(s)) continue; const ff = E.floodFill(b, s); for (const q of ff.group) ges.add(q); if (ff.liberties.length <= 3) kurz.push(s); }
    if (!kurz.length) { w.ohneKurzeKette++; continue; }
    let fang = false, erk = false;
    for (const s of kurz) if (E.leseAngriff(b, s).ja) { fang = true; if (E.leseVerteidigung(b, s).ja) { erk = true; break; } }
    if (!fang) w.nichtFangbar++; else if (!erk) w.fangbarAberTot++; else w.erkannt++;
  }
  const mc = r.zug;
  const m0 = besterZug(b, r.farbe, mc, last, null);
  const mG = g.krit.length ? besterZug(b, r.farbe, mc, last, g) : m0;
  const mE = e.krit.length ? besterZug(b, r.farbe, mc, last, e) : m0;
  st.stellungen++;
  if (mG !== m0) {
    st.gAendert++; if (mE === mG) st.eTrifft++; else if (mE !== m0) st.eAnders++;
    /* Woran liegt es? Die GNU-kritische Gruppe, deren Punkt mG ist */
    const k = g.krit.find(k => mG === (k.farbe === r.farbe ? k.verteidigung : k.angriff));
    if (mE !== mG) {
      if (!k) st.grund.keinPunkt++;
      else {
        const ek = e.krit.find(x => x.farbe === k.farbe && x.steine.some(q => k.steine.includes(q)));
        if (!ek) st.grund.nichtErkannt++;
        else if ((ek.farbe === r.farbe ? ek.verteidigung : ek.angriff) !== mG) st.grund.andererPunkt++;
        else st.grund.gleicherPunkt++;
      }
    }
  } else if (mE !== m0) st.eFehlalarm++;
  /* Was hält GNU Go von den Steinen, die das eigene Urteil kritisch nennt? */
  for (const k of e.krit) {
    if ((k.farbe === r.farbe ? k.verteidigung : k.angriff) < 0) st.eKritOhnePunkt++;
    const q = k.steine[0];
    if (g.tot[q]) st.eKritGnuTot++; else if (gS.has(q)) st.eKritGnuKrit++; else st.eKritGnuLebt++;
  }
  if (mE !== m0) st.eAendert++;
  if (st.stellungen % 500 === 0) process.stderr.write(`${st.stellungen} Stellungen\n`);
}
globalThis.mctsPUCT = echt;

const pz = (x, y) => y ? (100 * x / y).toFixed(1) + ' %' : '–';
console.log(`Stellungen: ${st.stellungen} (eigenes Urteil Ø ${(st.msEigen / st.stellungen).toFixed(1)} ms)`);
console.log(`Kritische Gruppen je Stellung: GNU Go ${(st.gGruppen / st.stellungen).toFixed(2)}, eigen ${(st.eGruppen / st.stellungen).toFixed(2)}`);
console.log(`  GNU-kritische Drachen mit einer Kette ≤ 3 Freiheiten: ${pz(st.gTaktisch, st.gGruppen)}`);
const w = st.warum;
console.log(`  davon ein Stein: ${pz(w.einStein, w.drachen)}; ohne Kette ≤ 3 Freiheiten ${w.ohneKurzeKette}, Leser fängt keine ${w.nichtFangbar}, fängt, hält für tot ${w.fangbarAberTot}, erkannt ${w.erkannt} (${pz(w.erkannt, w.drachen)})`);
console.log(`Steine: GNU kritisch ${st.gKrit}, eigen kritisch ${st.eKrit}, beide ${st.beide}`);
console.log(`  Trefferquote ${pz(st.beide, st.gKrit)}, Genauigkeit ${pz(st.beide, st.eKrit)}`);
console.log(`Zugwahl: GNU Gos Urteil ändert den Zug in ${st.gAendert} Stellungen (${pz(st.gAendert, st.stellungen)})`);
console.log(`  eigenes Urteil trifft dieselbe Änderung: ${st.eTrifft} (${pz(st.eTrifft, st.gAendert)}), ändert anders: ${st.eAnders}`);
console.log(`  eigenes ändert, wo GNU Go nicht ändert (Fehlalarm): ${st.eFehlalarm} (${pz(st.eFehlalarm, st.stellungen)} der Stellungen)`);
console.log(`  verfehlt: ohne GNU-Punkt ${st.grund.keinPunkt}, Gruppe nicht erkannt ${st.grund.nichtErkannt}, anderer Punkt ${st.grund.andererPunkt}, gleicher Punkt, anders bewertet ${st.grund.gleicherPunkt}`);
console.log(`Eigene kritische Gruppen: bei GNU Go lebend ${st.eKritGnuLebt}, kritisch ${st.eKritGnuKrit}, tot ${st.eKritGnuTot}; ohne Punkt für den Ziehenden ${st.eKritOhnePunkt}`);
console.log(`  eigenes ändert insgesamt: ${st.eAendert} (${pz(st.eAendert, st.stellungen)})`);
if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(st, null, 1));
