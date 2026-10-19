// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Muster, erster Schritt: Sagt eine Tabelle, die nur aus
   Endspiel-Stellungen gelernt ist, GNU Gos Zug besser voraus als die
   Tabelle im Spiel? Gehört zu docs/muster-endspiel.md.

   Liest die Zwischenspeicher von muster-endspiel-daten.js (je Stellung die
   Kandidatenliste der KI mit Merkmalen und GNU Gos Zug) und lernt Tabellen:

     heute      die Tabelle in index.html (Merkmale m, l, z; aus allen
                Spielphasen einzeln gezählt)
     naiv-mlz   dieselben Merkmale, wie heute einzeln gezählt, aber nur
                aus Stellungen ab Zug 81
     mm-…       gemeinsam gelernt (verallgemeinertes Bradley-Terry-Modell,
                MM-Verfahren nach Coulom 2007, wie muster.js --verfahren mm)
                mit einer Auswahl von Merkmalsgruppen:
                  mm-mlz    m, l, z
                  mm-voll   alle fünfzehn Gruppen (m l z y r d g p n b q e x u k)
                  mm-voll-X alle außer X          mm-mlz+X  m, l, z und X

   Gemessen wird, wo GNU Gos Zug in der Kandidatenliste der KI landet:
     statisch    nur nach dem Musterwert
     kombiniert  Bewertung ohne Muster + Dosis × Musterwert, wie getAIMove
                 an der Wurzel (heute: Dosis 200)
   Damit eine neue Tabelle mit derselben Dosis vergleichbar ist, wird ihr
   Maßstab auf die mittlere Streuung der Musterwerte je Stellung von
   „heute“ gebracht. Ränge bei gleichem Wert zählen mit der Wahrscheinlichkeit,
   die bei zufälliger Wahl unter den Gleichen herauskäme.

   Unsicherheit: Bootstrap über Partien (1000 Ziehungen, 95 %), die
   Unterschiede zu „heute“ gepaart.

   Aufruf:
     node auswertung/muster-endspiel.js --lehr P1,P2 --test P3 [--varianten a,b] [--iter 30]
     node auswertung/muster-endspiel.js --lehr P1,P2 --kreuz 4 [--test-quelle B]
   --zeige  Teilmengen der Ausgabe: alle, linie12, linie3+, KI-am-Zug, GNU-Go-am-Zug,
            zug81-120, zug121-160, zug161-200, ab-zug201, Partie-gewonnen, Partie-verloren
            (Standard: alle,linie12,linie3+)
   --modi   stat, k100, k200, k400 (Standard: alle vier)
   --dosen  Dosen der kombinierten Wertung (Standard 100,200,400)
   --var n=gruppen,...  eigene gemeinsam gelernte Varianten (Gruppenbuchstaben
            hintereinander, etwa mlzd); dann nur diese und „heute“
   --ergebnis d1,d2  Ausgang der Partien (endstand der KI) für die Teilmengen
            Partie-gewonnen / Partie-verloren: Rohdumps von gnugo-duell.js
            (.jsonl) oder eine Datei {"seed#nr": endstand} (.json)
   --tor V  wendet die vier Tore aus docs/muster-endspiel.md §8 auf die Variante V
            an (Dosis 200) und gibt bestanden oder nicht bestanden aus
   --lern-farbe S   nur Stellungen mit Schwarz (der KI bei Vorgabe) am Zug lernen
   --test-farbe S   nur an Stellungen mit Schwarz am Zug prüfen
   --lehr  Präfixe der Zwischenspeicher zum Lernen
   --test  Präfix(e) des Zwischenspeichers zum Prüfen (sonst Kreuzprüfung über
           die Partien der --lehr-Daten, nur an Quellen, die --test-quelle
           enthalten; die anderen Partien lernen immer mit) */
'use strict';
const fs = require('fs');

const GRUPPEN = ['m', 'l', 'z', 'y', 'r', 'd', 'g', 'p', 'n', 'b', 'q', 'e', 'x', 'u', 'k'];
const ERWEITERT = ['y', 'r', 'd', 'g', 'p', 'n', 'b', 'q', 'e', 'x', 'u', 'k'];
let DOSEN = [100, 200, 400];

/* ── Laden und zusammenführen ─────────────────────────────────────────── */
function lies(datei, Typ) {
  const b = fs.readFileSync(datei);
  const kopie = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength);
  return new Typ(kopie);
}
function lade(praefixe) {
  const ids = new Map(), namen = [], gruppeVon = [];
  const teile = [];
  let nKand = 0;
  for (const pf of praefixe) {
    const kopf = JSON.parse(fs.readFileSync(pf + '.json', 'utf8'));
    if (kopf.K !== GRUPPEN.length) throw new Error(`${pf}: ${kopf.K} Gruppen, erwartet ${GRUPPEN.length}`);
    const f = lies(pf + '.f', Int32Array), karte = new Int32Array(kopf.namen.length);
    kopf.namen.forEach((n, i) => {
      let j = ids.get(n);
      if (j === undefined) { j = namen.length; ids.set(n, j); namen.push(n); gruppeVon.push(n[0]); }
      karte[i] = j;
    });
    for (let i = 0; i < f.length; i++) f[i] = karte[f[i]];
    teile.push({kopf, f, e: lies(pf + '.e', Float64Array), w0: lies(pf + '.w0', Float64Array), idx: lies(pf + '.idx', Uint16Array)});
    nKand += teile[teile.length - 1].e.length;
  }
  const K = GRUPPEN.length;
  const f = new Int32Array(nKand * K), e = new Float64Array(nKand), w0 = new Float64Array(nKand), idx = new Uint16Array(nKand);
  const pos = [], spiele = new Map();
  let o = 0;
  for (const t of teile) {
    f.set(t.f, o * K); e.set(t.e, o); w0.set(t.w0, o); idx.set(t.idx, o);
    for (const p of t.kopf.positionen) {
      const sk = `${p.q}#${p.seed}#${p.nr}`;
      if (!spiele.has(sk)) spiele.set(sk, {nr: spiele.size, q: p.q});
      let lz = 0;
      if (p.ziel >= 0) { const m = t.idx[p.off + p.ziel], x = m % 19, y = (m / 19) | 0; lz = Math.min(x, y, 18 - x, 18 - y) + 1; }
      pos.push({q: p.q, spiel: spiele.get(sk).nr, seedNr: `${p.seed}#${p.nr}`, k: p.k, c: p.c, off: p.off + o, n: p.n, ziel: p.ziel, lz, verloren: null});
    }
    o += t.e.length;
  }
  return {K, namen, gruppeVon, f, e, w0, idx, pos, spiele: [...spiele.values()]};
}

/* ── Lernen ───────────────────────────────────────────────────────────── */
function gruppenSpalten(gruppen) { return gruppen.map(g => GRUPPEN.indexOf(g)); }

/* einzeln gezählt, wie muster.js lerne(): log((gewählt+1)/(möglich+1/Grundrate)/Grundrate) */
function lerneNaiv(D, train, spalten, minM) {
  const F = D.namen.length, moeglich = new Float64Array(F), gewaehlt = new Float64Array(F);
  let nM = 0, nG = 0;
  for (const p of train) {
    if (p.ziel < 0) continue;
    for (let j = 0; j < p.n; j++) for (const g of spalten) moeglich[D.f[(p.off + j) * D.K + g]]++;
    nM += p.n; nG++;
    for (const g of spalten) gewaehlt[D.f[(p.off + p.ziel) * D.K + g]]++;
  }
  const grund = nG / nM, tab = new Float64Array(F);
  for (let i = 0; i < F; i++) if (moeglich[i] >= minM) tab[i] = Math.log((gewaehlt[i] + 1) / (moeglich[i] + 1 / grund) / grund);
  return tab;
}

/* gemeinsam gelernt, wie muster.js lerneMM(); die Stärke jedes Kandidaten
   (Produkt seiner Merkmalsstärken) wird nach jeder Gruppe nachgeführt statt
   neu gerechnet, am Anfang jeder Runde exakt neu gebildet. */
function lerneMM(D, train, spalten, iter, minM) {
  const F = D.namen.length, K = D.K, nS = spalten.length;
  const ps = train.filter(p => p.ziel >= 0);
  let nK = 0; for (const p of ps) nK += p.n;
  const fl = new Int32Array(nK * nS), start = new Int32Array(ps.length + 1), gewinner = new Int32Array(ps.length);
  let c = 0;
  ps.forEach((p, q) => {
    start[q] = c; gewinner[q] = c + p.ziel;
    for (let j = 0; j < p.n; j++, c++) { const o = (p.off + j) * K; for (let si = 0; si < nS; si++) fl[c * nS + si] = D.f[o + spalten[si]]; }
  });
  start[ps.length] = c;
  const W = new Float64Array(F), moeglich = new Float64Array(F);
  for (let q = 0; q < nK * nS; q++) moeglich[fl[q]]++;
  for (const g of gewinner) for (let si = 0; si < nS; si++) W[fl[g * nS + si]]++;
  const gamma = new Float64Array(F).fill(1), staerke = new Float64Array(nK), Dn = new Float64Array(F);
  for (let it = 0; it < iter; it++) {
    for (let k = 0; k < nK; k++) { let s = 1; for (let si = 0; si < nS; si++) s *= gamma[fl[k * nS + si]]; staerke[k] = s; }
    for (let si = 0; si < nS; si++) {
      Dn.fill(0);
      for (let q = 0; q < ps.length; q++) {
        let E = 0;
        for (let k = start[q]; k < start[q + 1]; k++) E += staerke[k];
        for (let k = start[q]; k < start[q + 1]; k++) { const i = fl[k * nS + si]; Dn[i] += staerke[k] / gamma[i] / E; }
      }
      const alt = gamma.slice();
      for (let i = 0; i < F; i++) { if (!Dn[i]) continue; gamma[i] = (W[i] + 1) / (Dn[i] + 2 / (gamma[i] + 1)); }
      for (let k = 0; k < nK; k++) { const i = fl[k * nS + si]; staerke[k] *= gamma[i] / alt[i]; }
    }
  }
  const tab = new Float64Array(F);
  for (let i = 0; i < F; i++) if (moeglich[i] >= minM) tab[i] = Math.log(gamma[i]);
  return tab;
}

/* ── Varianten ────────────────────────────────────────────────────────── */
function alleVarianten() {
  const v = [{name: 'heute', art: 'heute'}, {name: 'naiv-mlz', art: 'naiv', gruppen: ['m', 'l', 'z']},
             {name: 'mm-mlz', art: 'mm', gruppen: ['m', 'l', 'z']}, {name: 'mm-voll', art: 'mm', gruppen: GRUPPEN}];
  for (const g of GRUPPEN) v.push({name: `mm-voll-${g}`, art: 'mm', gruppen: GRUPPEN.filter(x => x !== g)});
  for (const g of ERWEITERT) v.push({name: `mm-mlz+${g}`, art: 'mm', gruppen: ['m', 'l', 'z', g]});
  return v;
}

/* ── Messen ───────────────────────────────────────────────────────────── */
function rangWahrscheinlichkeit(wert, n, t) {
  let groesser = 0, gleich = 0; const v = wert[t];
  for (let j = 0; j < n; j++) { if (wert[j] > v) groesser++; else if (wert[j] === v) gleich++; }
  return {p1: groesser === 0 ? 1 / gleich : 0, p16: Math.min(1, Math.max(0, (16 - groesser) / gleich))};
}

class Sammler {
  constructor(nSpiele) { this.nSpiele = nSpiele; this.m = new Map(); }
  add(key, spiel, n, p1, p16, ll) {
    let a = this.m.get(key);
    if (!a) { a = new Float64Array(this.nSpiele * 4); this.m.set(key, a); }
    const o = spiel * 4; a[o] += n; a[o + 1] += p1; a[o + 2] += p16; a[o + 3] += ll;
  }
}

function messe(D, testPos, tabellen, skalen, sammler) {
  const K = D.K, namen = Object.keys(tabellen);
  const wert = {}, komb = new Float64Array(2000);
  for (const nm of namen) wert[nm] = new Float64Array(2000);
  for (const p of testPos) {
    if (p.ziel < 0) {   /* GNU Gos Zug nicht in der Liste: zählt als Fehlschlag */
      const keys = untermengen(p);
      for (const nm of namen) for (const modus of ['stat', ...DOSEN.map(d => 'k' + d)]) for (const u of keys) sammler.add(`${nm}|${modus}|${u}`, p.spiel, 1, 0, 0, 0);
      continue;
    }
    const keys = untermengen(p);
    for (const nm of namen) {
      const t = tabellen[nm], w = wert[nm];
      if (nm === 'heute') for (let j = 0; j < p.n; j++) w[j] = D.w0[p.off + j];
      else {
        const sp = t.spalten, tab = t.tab;
        for (let j = 0; j < p.n; j++) { let s = 0; const o = (p.off + j) * K; for (const g of sp) s += tab[D.f[o + g]]; w[j] = s; }
      }
      /* Wahrscheinlichkeitsmaß für gemeinsam gelernte Tabellen: log P(GNU Gos Zug) */
      let ll = 0;
      if (nm !== 'heute' && tabellen[nm].art === 'mm') {
        let mx = -Infinity; for (let j = 0; j < p.n; j++) if (w[j] > mx) mx = w[j];
        let z = 0; for (let j = 0; j < p.n; j++) z += Math.exp(w[j] - mx);
        ll = w[p.ziel] - mx - Math.log(z);
      }
      const r = rangWahrscheinlichkeit(w, p.n, p.ziel);
      for (const u of keys) sammler.add(`${nm}|stat|${u}`, p.spiel, 1, r.p1, r.p16, ll);
      for (const d of DOSEN) {
        const g = d * skalen[nm];
        for (let j = 0; j < p.n; j++) komb[j] = D.e[p.off + j] + g * w[j];
        const rk = rangWahrscheinlichkeit(komb, p.n, p.ziel);
        for (const u of keys) sammler.add(`${nm}|k${d}|${u}`, p.spiel, 1, rk.p1, rk.p16, 0);
      }
    }
  }
}
function untermengen(p) {
  const u = ['alle', p.lz <= 2 ? 'linie12' : 'linie3+', p.c === 1 ? 'KI-am-Zug' : 'GNU-Go-am-Zug'];
  if (p.verloren !== null) u.push(p.verloren ? 'Partie-verloren' : 'Partie-gewonnen');
  u.push(p.k <= 120 ? 'zug81-120' : p.k <= 160 ? 'zug121-160' : p.k <= 200 ? 'zug161-200' : 'ab-zug201');
  return u;
}

/* mittlere Streuung (Standardabweichung über die Kandidaten) je Stellung */
function streuung(D, pos, w) {
  let s = 0, n = 0;
  for (const p of pos) {
    if (p.ziel < 0) continue;
    let m = 0; for (let j = 0; j < p.n; j++) m += w(p, j); m /= p.n;
    let q = 0; for (let j = 0; j < p.n; j++) { const d = w(p, j) - m; q += d * d; }
    s += Math.sqrt(q / p.n); n++;
  }
  return s / n;
}

/* ── Bootstrap über Partien ───────────────────────────────────────────── */
function mulberry32(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function bootstrapZiehungen(spiele, B, seed) {
  const r = mulberry32(seed), z = [];
  for (let b = 0; b < B; b++) { const d = new Int32Array(spiele.length); for (let i = 0; i < d.length; i++) d[i] = spiele[(r() * spiele.length) | 0]; z.push(d); }
  return z;
}
function summe(a, ziehung) {
  let n = 0, p1 = 0, p16 = 0, ll = 0;
  if (!ziehung) { for (let g = 0; g < a.length; g += 4) { n += a[g]; p1 += a[g + 1]; p16 += a[g + 2]; ll += a[g + 3]; } }
  else for (const g of ziehung) { const o = g * 4; n += a[o]; p1 += a[o + 1]; p16 += a[o + 2]; ll += a[o + 3]; }
  return {n, p1, p16, ll};
}
const GROESSEN = {r1: s => 100 * s.p1 / s.n, r16: s => 100 * s.p16 / s.n, ll: s => s.ll / s.n};
function schaetze(sammler, ziehungen, keyA, keyB, groesse) {
  const f = GROESSEN[groesse], a = sammler.m.get(keyA), b = keyB ? sammler.m.get(keyB) : null;
  if (!a || (keyB && !b)) return null;
  const wert = b ? f(summe(a)) - f(summe(b)) : f(summe(a));
  const reps = ziehungen.map(z => b ? f(summe(a, z)) - f(summe(b, z)) : f(summe(a, z))).sort((x, y) => x - y);
  return {wert, lo: reps[Math.floor(0.025 * reps.length)], hi: reps[Math.floor(0.975 * reps.length)], n: summe(a).n};
}
const fmt = (x, d = 1) => (x >= 0 ? '+' : '') + x.toFixed(d);
const zeigeCI = (s, diff, d = 1) => s ? `${diff ? fmt(s.wert, d) : s.wert.toFixed(d)} [${diff ? fmt(s.lo, d) : s.lo.toFixed(d)}; ${diff ? fmt(s.hi, d) : s.hi.toFixed(d)}]` : '–';

/* ── Hauptprogramm ────────────────────────────────────────────────────── */
function main() {
  const a = process.argv.slice(2), opt = {lehr: [], test: [], kreuz: 0, testQuelle: null, iter: 30, minM: 5, varianten: null, json: null, boot: 1000, var: null, ergebnis: [], tor: null, lernFarbe: 'beide', testFarbe: 'beide',
               zeige: ['alle', 'linie12', 'linie3+'], modi: ['stat', 'k100', 'k200', 'k400']};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--lehr') opt.lehr = a[++i].split(',');
    else if (a[i] === '--test') opt.test = a[++i].split(',');
    else if (a[i] === '--kreuz') opt.kreuz = +a[++i];
    else if (a[i] === '--test-quelle') opt.testQuelle = a[++i];
    else if (a[i] === '--iter') opt.iter = +a[++i];
    else if (a[i] === '--min') opt.minM = +a[++i];
    else if (a[i] === '--varianten') opt.varianten = a[++i].split(',');
    else if (a[i] === '--json') opt.json = a[++i];
    else if (a[i] === '--boot') opt.boot = +a[++i];
    else if (a[i] === '--zeige') opt.zeige = a[++i].split(',');
    else if (a[i] === '--var') opt.var = a[++i].split(',').map(x => { const [n, g] = x.split('='); return {name: n, art: 'mm', gruppen: g.split('')}; });
    else if (a[i] === '--ergebnis') opt.ergebnis = a[++i].split(',');
    else if (a[i] === '--tor') opt.tor = a[++i];
    else if (a[i] === '--lern-farbe') opt.lernFarbe = a[++i];
    else if (a[i] === '--test-farbe') opt.testFarbe = a[++i];
    else if (a[i] === '--modi') opt.modi = a[++i].split(',');
    else if (a[i] === '--dosen') { DOSEN = a[++i].split(',').map(Number); opt.modi = ['stat', ...DOSEN.map(d => 'k' + d)]; }
  }
  if (!opt.lehr.length || (!opt.test.length && !opt.kreuz)) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(1); }
  const D = lade([...opt.lehr, ...opt.test]);
  if (opt.ergebnis.length) {
    const ausgang = new Map();
    for (const d of opt.ergebnis) {
      if (d.endsWith('.json')) { for (const [k, v] of Object.entries(JSON.parse(fs.readFileSync(d, 'utf8')))) ausgang.set(k, v); continue; }
      for (const z of fs.readFileSync(d, 'utf8').split('\n')) {
        if (!z.trim()) continue;
        const g = JSON.parse(z);
        if (g.seed !== undefined && g.endstand !== undefined) ausgang.set(`${g.seed}#${g.nr}`, g.endstand);
      }
    }
    for (const p of D.pos) { const e = ausgang.get(p.seedNr); p.verloren = e === undefined ? null : e < 0; }
  }
  const lehrQ = new Set(), testQ = new Set();
  /* Quellen der Präfixe: die Namen stehen in den Stellungen (q) */
  const kopfQ = pf => new Set(JSON.parse(fs.readFileSync(pf + '.json', 'utf8')).positionen.map(p => p.q));
  for (const pf of opt.lehr) for (const q of kopfQ(pf)) lehrQ.add(q);
  for (const pf of opt.test) for (const q of kopfQ(pf)) testQ.add(q);
  const benannt = alleVarianten().filter(v => v.name === 'heute' || (opt.varianten ? opt.varianten.includes(v.name) : !opt.var));
  const varianten = [...benannt, ...(opt.var || [])];
  const nSpiele = D.spiele.length;
  const sammler = new Sammler(nSpiele), skalenLog = {}, tabLog = {};
  const spieleVon = q => D.spiele.map((s, i) => [s, i]).filter(([s]) => s.q === q).map(([, i]) => i);

  /* Farbe der Lern- und Prüfstellungen einschränken */
  const lernOk = p => opt.lernFarbe !== 'S' || p.c === 1, testOk = p => opt.testFarbe !== 'S' || p.c === 1;
  /* Aufteilungen: je Aufteilung Lernpartien und Prüfpartien */
  const aufteilungen = [];
  if (opt.test.length) {
    aufteilungen.push({train: D.pos.filter(p => lehrQ.has(p.q) && !testQ.has(p.q)), test: D.pos.filter(p => testQ.has(p.q))});
  } else {
    /* nur Partien, die überhaupt Prüfstellungen haben, bekommen eine Falte */
    const kandidaten = D.pos.filter(p => (!opt.testQuelle || p.q.includes(opt.testQuelle)) && testOk(p));
    const spielIds = [...new Set(kandidaten.map(p => p.spiel))].sort((x, y) => x - y);
    const falte = new Map(spielIds.map((s, i) => [s, i % opt.kreuz]));
    for (let f = 0; f < opt.kreuz; f++) {
      aufteilungen.push({train: D.pos.filter(p => falte.get(p.spiel) !== f), test: D.pos.filter(p => falte.get(p.spiel) === f)});
    }
  }
  for (const af of aufteilungen) { af.train = af.train.filter(lernOk); af.test = af.test.filter(testOk); }
  console.log(`Daten: ${D.pos.length} Stellungen aus ${nSpiele} Partien, ${D.namen.length} Merkmalswerte; ${aufteilungen.length} Aufteilung(en)`);
  const t0 = Date.now();
  aufteilungen.forEach((af, fi) => {
    const tabellen = {}, skalen = {};
    const sigma0 = streuung(D, af.test, (p, j) => D.w0[p.off + j]);
    for (const v of varianten) {
      if (v.art === 'heute') { tabellen.heute = {art: 'heute'}; skalen.heute = 1; continue; }
      const sp = gruppenSpalten(v.gruppen);
      const tab = v.art === 'naiv' ? lerneNaiv(D, af.train, sp, opt.minM) : lerneMM(D, af.train, sp, opt.iter, opt.minM);
      tabellen[v.name] = {art: v.art, spalten: sp, tab};
      const K = D.K;
      const sg = streuung(D, af.test, (p, j) => { let s = 0; const o = (p.off + j) * K; for (const g of sp) s += tab[D.f[o + g]]; return s; });
      skalen[v.name] = sigma0 / sg;
      (skalenLog[v.name] = skalenLog[v.name] || []).push(skalen[v.name]);
    }
    messe(D, af.test, tabellen, skalen, sammler);
    console.error(`Aufteilung ${fi + 1}/${aufteilungen.length}: ${af.train.length} Lern-, ${af.test.length} Prüfstellungen · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  });

  /* Auswertung */
  /* Bootstrap nur über Partien, die Prüfstellungen haben */
  const testSpiele = [...new Set(aufteilungen.flatMap(af => af.test.map(p => p.spiel)))];
  const ziehTest = bootstrapZiehungen(testSpiele, opt.boot, 12345);
  const namen = varianten.map(v => v.name);
  const mittel = x => x.reduce((s, y) => s + y, 0) / x.length;
  console.log('\nMaßstab der Muster-Streuung gegenüber „heute“ (neu × Faktor ≙ gleiche Dosis):');
  console.log('  ' + namen.filter(n => n !== 'heute').map(n => `${n} ${mittel(skalenLog[n]).toFixed(2)}`).join(' · '));
  const bericht = {optionen: opt, daten: {stellungen: D.pos.length, partien: nSpiele}, skalen: Object.fromEntries(Object.entries(skalenLog).map(([k, v]) => [k, mittel(v)])), ergebnis: {}};
  const modi = ['stat', ...DOSEN.map(d => 'k' + d)];
  const mname = new Proxy({stat: 'statisch (nur Muster)'}, {get: (o, k) => o[k] || (k === 'k200' ? 'kombiniert, Dosis 200 (heute)' : `kombiniert, Dosis ${String(k).slice(1)}`)});
  for (const u of opt.zeige) {
    if (!sammler.m.has(`heute|stat|${u}`)) continue;
    const n = summe(sammler.m.get(`heute|stat|${u}`)).n;
    console.log(`\n=== Teilmenge „${u}“ (${n} Stellungen) ===`);
    for (const modus of modi.filter(m => opt.modi.includes(m))) {
      console.log(`\n${mname[modus]}: Rang 1 und Rang ≤ 16 von GNU Gos Zug in der Kandidatenliste, in % (Unterschied zu heute, 95 %-Intervall über Partien)`);
      console.log('  Variante          Rang 1                       Δ Rang 1                     Rang ≤ 16        Δ Rang ≤ 16' + (modus === 'stat' ? '          log P (Zug)' : ''));
      for (const nm of namen) {
        const k = `${nm}|${modus}|${u}`;
        const r1 = schaetze(sammler, ziehTest, k, null, 'r1'), r16 = schaetze(sammler, ziehTest, k, null, 'r16');
        const d1 = nm === 'heute' ? null : schaetze(sammler, ziehTest, k, `heute|${modus}|${u}`, 'r1');
        const d16 = nm === 'heute' ? null : schaetze(sammler, ziehTest, k, `heute|${modus}|${u}`, 'r16');
        const ll = modus === 'stat' && nm !== 'heute' && nm !== 'naiv-mlz' ? schaetze(sammler, ziehTest, k, null, 'll') : null;
        console.log(`  ${nm.padEnd(16)} ${zeigeCI(r1, false).padEnd(28)} ${(d1 ? zeigeCI(d1, true) : '').padEnd(28)} ${r16.wert.toFixed(1).padStart(5)}   ${(d16 ? fmt(d16.wert) + ' [' + fmt(d16.lo) + '; ' + fmt(d16.hi) + ']' : '').padEnd(24)}${ll ? ll.wert.toFixed(3) : ''}`);
        (bericht.ergebnis[u] = bericht.ergebnis[u] || {})[`${nm}|${modus}`] = {r1: r1 && r1.wert, r1lo: r1 && r1.lo, r1hi: r1 && r1.hi, r16: r16 && r16.wert, d1: d1 && d1.wert, d1lo: d1 && d1.lo, d1hi: d1 && d1.hi, d16: d16 && d16.wert, d16lo: d16 && d16.lo, d16hi: d16 && d16.hi, ll: ll && ll.wert};
      }
    }
  }
  if (opt.tor) bericht.tor = pruefeTor(sammler, ziehTest, opt.tor);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(bericht));
}

/* Die vier Tore aus docs/muster-endspiel.md §8, an der Dosis 200 mit dem
   Maßstab von „heute“ (Modus k200). Alles muss stimmen. */
function pruefeTor(sammler, ziehungen, v) {
  const d = (u, groesse) => schaetze(sammler, ziehungen, `${v}|k200|${u}`, `heute|k200|${u}`, groesse);
  const g1 = d('alle', 'r1'), g2 = d('alle', 'r16'), g3 = d('linie12', 'r1'), g4 = d('Partie-verloren', 'r1');
  const zeile = (name, soll, s, ok) => console.log(`  ${name} ${soll.padEnd(58)} ${zeigeCI(s, true).padEnd(26)} ${s ? (ok ? 'bestanden' : 'NICHT bestanden') : 'nicht messbar'}`);
  const ok1 = g1 && g1.wert >= 5 && g1.lo > 0, ok2 = g2 && g2.wert >= 5 && g2.lo > 0, ok3 = g3 && g3.lo > 0, ok4 = g4 && g4.wert >= -3;
  console.log(`\nTor für „${v}“ (Dosis 200, gleicher Maßstab wie „heute“; Unterschied in Prozentpunkten, 95 %-Intervall):`);
  zeile('G1', 'Rang 1, alle Stellungen: ≥ +5,0 und untere Grenze > 0', g1, ok1);
  zeile('G2', 'Rang ≤ 16, alle Stellungen: ≥ +5,0 und untere Grenze > 0', g2, ok2);
  zeile('G3', 'Rang 1, GNU Gos Zug auf Linie 1–2: untere Grenze > 0', g3, ok3);
  zeile('G4', 'Rang 1, Stellungen aus verlorenen Partien: ≥ −3,0', g4, ok4);
  const ok = !!(ok1 && ok2 && ok3 && ok4);
  console.log(`  Ergebnis: ${ok ? 'TOR BESTANDEN, Schritt 2 folgt' : 'TOR NICHT BESTANDEN, kein Schritt 2'}`);
  return {g1, g2, g3, g4, bestanden: ok};
}

if (require.main === module) main();
module.exports = {lade, lerneMM, lerneNaiv, rangWahrscheinlichkeit};
