// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Was für ein Zug ist GNU Gos Antwort auf eine Annäherung, und was spielt
   die KI stattdessen? Gehört zu docs/annaeherung.md.

   Liest die Ereignisse von annaeherung.js und die Rohdumps und stellt die
   Stellung nach dem Annäherungszug a nach (nur das Brett der Engine). Für
   einen Antwortzug m der angegriffenen Seite:

     kontakt     m grenzt an die Kette von a
     aufFreiheit m nimmt der Kette von a eine Freiheit (gleichbedeutend mit
                 kontakt, solange m leer ist; getrennt gezählt, falls nicht)
     atari       nach m hat eine angrenzende gegnerische Kette 1 Freiheit
     schlaegt    m schlägt Steine
     verbindet   m grenzt an zwei oder mehr verschiedene eigene Ketten
     schneidet   m grenzt an zwei oder mehr verschiedene gegnerische Ketten
     eigeneFrei  Freiheiten der eigenen Kette von m nach dem Zug
     verstaerkt  die schwächste eigene Kette neben m hat danach mehr
                 Freiheiten als vorher (nur wenn m an eigene Ketten grenzt)
     linie       Linie von m (1 = Rand)

   Dazu für Annäherungen an die KI, bei denen die Referenz lokal ist und die
   KI anders spielte: evaluateMove von Referenz und KI-Zug, zerlegt in die
   Beiträge der Terme des Endspiel-Experten (ab Zug 81 bewertet er allein),
   gebietZug und der Krisenkarte (Beitrag = Wert mit minus Wert ohne den
   Term). Und der abgebaute Freiheitsdruck beider Züge (entlastung): Wie oft
   brächte ein Term Gewicht × Entlastung die Referenz vor den Zug der KI?

   Ausgewertet, wenn GNU Gos Referenz lokal ist (Abstand ≤ 2 zu a), für:
   die Referenz bei Annäherungen an die KI, den Zug der KI, wenn er lokal
   ist und von der Referenz abweicht, und zum Vergleich die Referenz und den
   Zug von GNU Go bei Annäherungen der KI.

   Aufruf:
     node auswertung/annaeherung-merkmale.js --ereignisse annaeherung.jsonl [...] --dumps dump.jsonl [...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = (s || '').toUpperCase(); return !s || s === 'PASS' || s === 'RESIGN' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const abstand = (a, b) => a < 0 || b < 0 ? 99 : Math.max(Math.abs(a % 19 - b % 19), Math.abs(Math.floor(a / 19) - Math.floor(b / 19)));
const linie = i => { const x = i % 19, y = Math.floor(i / 19); return Math.min(x, y, 18 - x, 18 - y) + 1; };

function merkmale(b, m, c, a) {
  if (m < 0 || b[m]) return null;
  const o = 3 - c;
  const kettenVon = f => { const s = new Set(); for (const n of E.NEIGHBORS[m]) if (b[n] === f) s.add(Math.min(...E.floodFill(b, n).group)); return s; };
  const eigene = kettenVon(c), fremde = kettenVon(o);
  const ak = b[a] === o ? E.floodFill(b, a) : null;
  const vorMin = eigene.size ? Math.min(...[...eigene].map(k => E.floodFill(b, k).liberties.length)) : null;
  const nb = new Uint8Array(b); nb[m] = c;
  const geschlagen = E.removeDeadGroups(nb, o, m);
  let atari = false;
  for (const n of E.NEIGHBORS[m]) if (nb[n] === o && E.floodFill(nb, n).liberties.length === 1) atari = true;
  const eigeneFrei = E.floodFill(nb, m).liberties.length;
  return {kontakt: !!ak && ak.group.some(s => E.NEIGHBORS[m].includes(s)), aufFreiheit: !!ak && ak.liberties.includes(m),
          atari, schlaegt: geschlagen > 0, verbindet: eigene.size >= 2, schneidet: fremde.size >= 2,
          eigeneFrei, verstaerkt: vorMin !== null && eigeneFrei > vorMin, linie: linie(m)};
}

/* Bestandteile von evaluateMove für Zug m der Farbe c: Beitrag eines Terms =
   Wert mit minus Wert ohne ihn (Gewicht 0). Zufall auf 0 gesetzt. */
const TERME = ['endAreaGain', 'endCapBonus', 'endAtariPenalty', 'endLibPressure', 'endOppAtari', 'endTieBreak', 'gebietZug'];
const KRISE = ['crisisAtari', 'crisisLarge2Lib', 'crisisDragon3Lib'];
function bestandteile(b, m, c, mc, leer) {
  if (m < 0 || b[m]) return null;
  const P = E.PARAMS, zufall = Math.random;
  Math.random = () => 0;
  const prime = () => { E.buildCrisisMap(b, c); E.primeAreaCache(b, c); E.primeEndTieBreak(b); };
  prime();
  const wert = () => E.evaluateMove(b, m, c, mc, leer);
  const r = {gesamt: wert()};
  for (const t of TERME) { const alt = P[t]; P[t] = 0; r[t] = r.gesamt - wert(); P[t] = alt; }
  const alt = KRISE.map(t => P[t]);
  for (const t of KRISE) P[t] = 0;
  prime(); r.krise = r.gesamt - wert();
  KRISE.forEach((t, k) => { P[t] = alt[k]; });
  prime();
  Math.random = zufall;
  return r;
}

/* Abgebauter Freiheitsdruck: Druck wie endLibPressure (Größe / Freiheiten
   bei 2–3 Freiheiten, sonst 0), Summe über die eigenen Ketten neben m vor
   dem Zug minus Druck der Kette von m danach. Nur, wenn m an eine eigene
   Kette grenzt; sonst 0 (den Druck einer neuen Kette straft endLibPressure
   schon). */
function entlastung(b, m, c) {
  if (m < 0 || b[m]) return null;
  const druck = (n, l) => l >= 2 && l <= 3 ? n / l : 0;
  const gesehen = new Set();
  let vor = 0;
  for (const n of E.NEIGHBORS[m]) if (b[n] === c) {
    const ff = E.floodFill(b, n), k = Math.min(...ff.group);
    if (gesehen.has(k)) continue;
    gesehen.add(k); vor += druck(ff.group.length, ff.liberties.length);
  }
  if (!gesehen.size) return 0;
  const nb = new Uint8Array(b); nb[m] = c; E.removeDeadGroups(nb, 3 - c, m);
  const ff = E.floodFill(nb, m);
  return vor - druck(ff.group.length, ff.liberties.length);
}

function analysiere(p, ereignisse) {
  const proMc = new Map();
  for (const e of ereignisse) { if (!proMc.has(e.mc)) proMc.set(e.mc, []); proMc.get(e.mc).push(e); }
  const b = new Uint8Array(N);
  for (const s of p.vorgabeSteine || []) b[vonGtp(s)] = 1;
  const zuerst = p.beginnt === 'S' ? 1 : 2, aus = [];
  for (let k = 0; k < p.zuege.length; k++) {
    const mc = k + 1, f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
    if (i >= 0) { b[i] = f; E.removeDeadGroups(b, 3 - f, i); }
    if (!proMc.has(mc)) continue;
    /* Je Zug ein Ereignis reicht: Referenz und Antwort hängen nicht von der Gruppe ab. */
    const e = proMc.get(mc)[0], c = 3 - f;
    const ref = vonGtp(e.referenz), ant = vonGtp(e.antwort);
    let leer = 0;
    for (let q = 0; q < N; q++) if (!b[q]) leer++;
    const wertung = e.seite === 'ki' && e.abstandReferenz <= 2 && ref !== ant;
    aus.push({seed: p.seed, mc, seite: e.seite, statusNach: e.statusNach,
              refLokal: e.abstandReferenz <= 2, antLokal: e.abstandAntwort <= 2, gleich: ref === ant,
              ref: merkmale(b, ref, c, i), ant: merkmale(b, ant, c, i),
              refWert: wertung ? bestandteile(b, ref, c, mc, leer) : null, antWert: wertung ? bestandteile(b, ant, c, mc, leer) : null,
              refEnt: wertung ? entlastung(b, ref, c) : null, antEnt: wertung ? entlastung(b, ant, c) : null});
  }
  return aus;
}

function bericht(z) {
  const pz = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %`.padStart(5) : '    –';
  const spalten = [
    ['Referenz für die KI', z.filter(x => x.seite === 'ki' && x.refLokal && x.ref).map(x => x.ref)],
    ['KI, lokal, nicht die Referenz', z.filter(x => x.seite === 'ki' && x.refLokal && x.antLokal && !x.gleich && x.ant).map(x => x.ant)],
    ['Referenz für GNU Go', z.filter(x => x.seite === 'gegner' && x.refLokal && x.ref).map(x => x.ref)],
    ['GNU Go, lokal, nicht die Referenz', z.filter(x => x.seite === 'gegner' && x.refLokal && x.antLokal && !x.gleich && x.ant).map(x => x.ant)],
  ];
  console.log(`Annäherungszüge mit lokaler Referenz; Merkmale des Antwortzugs (je Annäherungszug, nicht je Gruppe)`);
  console.log(''.padEnd(34) + spalten.map(([t, a]) => `${t} (${a.length})`.padStart(36)).join(''));
  for (const [t, f] of [['grenzt an den Annäherungsstein', x => x.kontakt], ['Atari', x => x.atari], ['schlägt', x => x.schlaegt],
                        ['verbindet zwei eigene Ketten', x => x.verbindet], ['schneidet zwei fremde Ketten', x => x.schneidet],
                        ['verstärkt eine eigene Kette', x => x.verstaerkt], ['eigene Kette danach ≤ 2 Freiheiten', x => x.eigeneFrei <= 2],
                        ['Linie 1–2', x => x.linie <= 2], ['Linie 3–4', x => x.linie >= 3 && x.linie <= 4], ['Linie 5+', x => x.linie >= 5]])
    console.log(`  ${t.padEnd(32)}` + spalten.map(([, a]) => pz(a, f).padStart(36)).join(''));
  /* Warum bewertet die KI ihren Zug höher als die Referenz? */
  const mw = (a, f) => a.length ? a.reduce((s, x) => s + f(x), 0) / a.length : 0;
  for (const [t, a] of [['KI lokal, nicht die Referenz', z.filter(x => x.refWert && x.antWert && x.antLokal)],
                        ['KI woanders', z.filter(x => x.refWert && x.antWert && !x.antLokal)]]) {
    console.log(`\nevaluateMove, Referenz lokal, ${t} (${a.length} Züge): Bewertung der KI höher als die der Referenz in ${pz(a, x => x.antWert.gesamt > x.refWert.gesamt).trim()}`);
    console.log(`  ${'Term'.padEnd(18)}${'Referenz'.padStart(10)}${'KI-Zug'.padStart(10)}${'KI − Ref.'.padStart(11)}   Term wirkt (≠ 0) bei Referenz / KI-Zug`);
    for (const k of ['gesamt', ...TERME, 'krise'])
      console.log(`  ${k.padEnd(18)}${mw(a, x => x.refWert[k]).toFixed(1).padStart(10)}${mw(a, x => x.antWert[k]).toFixed(1).padStart(10)}`
        + `${mw(a, x => x.antWert[k] - x.refWert[k]).toFixed(1).padStart(11)}   ${pz(a, x => Math.abs(x.refWert[k]) > 0.01)} / ${pz(a, x => Math.abs(x.antWert[k]) > 0.01)}`);
  }
  /* Brächte ein Term für abgebauten Freiheitsdruck die Referenz nach vorn? */
  const a = z.filter(x => x.refWert && x.antWert && x.refEnt !== null && x.antEnt !== null);
  console.log(`\nAbgebauter Freiheitsdruck (Referenz lokal, KI spielte anders, ${a.length} Züge): > 0 bei der Referenz ${pz(a, x => x.refEnt > 0).trim()},`
    + ` beim KI-Zug ${pz(a, x => x.antEnt > 0).trim()}; Ø ${mw(a, x => x.refEnt).toFixed(2)} gegen ${mw(a, x => x.antEnt).toFixed(2)}`);
  console.log('  Referenz rückt vor den KI-Zug bei Gewicht ' + [40, 100, 200, 400].map(w =>
    `${w}: ${pz(a, x => w * (x.refEnt - x.antEnt) > x.antWert.gesamt - x.refWert.gesamt).trim()}`).join(', '));
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const ereignisse = [], dumps = [];
  let liste = null;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--ereignisse') liste = ereignisse;
    else if (a[k] === '--dumps') liste = dumps;
    else if (liste) liste.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  const proPartie = new Map();
  for (const e of ereignisse.flatMap(lies)) { if (!proPartie.has(e.seed)) proPartie.set(e.seed, []); proPartie.get(e.seed).push(e); }
  const z = [];
  for (const p of dumps.flatMap(lies)) if (proPartie.has(p.seed)) z.push(...analysiere(p, proPartie.get(p.seed)));
  bericht(z);
}

module.exports = {analysiere, bericht, merkmale, bestandteile, entlastung};
