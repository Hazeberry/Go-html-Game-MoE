/* Auswertung eines Rohdumps (ab-harness.js --roh) nach
   docs/pilot-benson-defense.md, §10–12 und §14.

   Warum diese Datei im Repo liegt: die Skripte, mit denen §12 gerechnet
   wurde, lagen in einem flüchtigen Arbeitsverzeichnis und sind mit ihm
   verschwunden. §13 versprach, alle Größen seien aus dem Rohformat
   berechenbar — das stimmt nur, solange jemand den Rechenweg hat. Hier ist
   er, zusammengeführt aus den damaligen Skripten (reihe.js, konfund.js,
   rate.js) ohne inhaltliche Änderung. Geprüft wird das daran, dass ein
   Wiederholungslauf mit Seed 20260923 die Zahlen aus §12 Ziffer für Ziffer
   wieder ergibt (§14.1).

   Jede Stellung wird aus den Zugindizes des Dumps mit removeDeadGroups und
   bensonClassify aus index.html nachgespielt — derselbe Code, der zieht.

   Aufruf:
     node auswertung/benson-reihe.js <dump.jsonl> [--namen A,B] [--json aus.json]

   Größen je Partie und Farbe:
     v2          V2-Ereignisse (Definition §10.1)
     gruppen     verschiedene benson-tote eigene Gruppen über die Partie
     steine      deren Steine zusammen
     verlustMax  größter erlittener Einzelschlag
     d1          Züge, die diese Farbe unter eigenem totem Bestand zieht */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});

function gruppe(b, i) {
  const c = b[i]; if (!c) return null;
  const st = [i], ges = new Set([i]), frei = new Set();
  while (st.length) {
    const g = st.pop();
    for (const n of E.NEIGHBORS[g]) {
      if (b[n] === 0) frei.add(n);
      else if (b[n] === c && !ges.has(n)) { ges.add(n); st.push(n); }
    }
  }
  return {steine: ges, frei: frei.size};
}

/* Alle Größen einer Partie in einem Durchlauf. */
function groessen(p) {
  /* S[t] = Stellung VOR Ereignis t, S[n] = Endstellung. */
  const S = [];
  {
    const b = new Uint8Array(E.BOARD_SIZE);
    for (const e of p.ereignisse) {
      S.push(new Uint8Array(b));
      if (e.idx >= 0) {
        const f = e.farbe === 'S' ? 1 : 2;
        b[e.idx] = f; E.removeDeadGroups(b, f === 1 ? 2 : 1, e.idx);
      }
    }
    S.push(new Uint8Array(b));
  }
  const totSet = S.map(b => {
    const ep = E.bensonClassify(b); const s = new Set();
    for (let i = 0; i < E.BOARD_SIZE; i++) if (b[i] && E._bnDead[i] === ep) s.add(i);
    return s;
  });
  const leer = () => ({v2: 0, gruppen: 0, steine: 0, verlustMax: 0, d1: 0});
  const out = {S: leer(), W: leer()};
  const gesehen = {S: new Set(), W: new Set()};

  p.ereignisse.forEach((e, t) => {
    const gegen = e.farbe === 'S' ? 'W' : 'S';
    if (e.geschlagen > out[gegen].verlustMax) out[gegen].verlustMax = e.geschlagen;
    if (e.totEigen > 0) out[e.farbe].d1++;

    /* Tote Gruppen auf der Stellung NACH dem Ereignis; eine Gruppe zählt
       einmal, Schlüssel ist kleinster Index und Größe (wie in §12.3). */
    {
      const b = S[t + 1];
      for (const [f, c] of [['S', 1], ['W', 2]]) {
        const gsn = new Uint8Array(E.BOARD_SIZE);
        for (let i = 0; i < E.BOARD_SIZE; i++) {
          if (b[i] !== c || gsn[i] || !totSet[t + 1].has(i)) continue;
          const st = [i], grp = [i]; gsn[i] = 1;
          while (st.length) {
            const g = st.pop();
            for (const n of E.NEIGHBORS[g])
              if (b[n] === c && !gsn[n]) { gsn[n] = 1; st.push(n); grp.push(n); }
          }
          const k = Math.min(...grp) + ':' + grp.length;
          if (!gesehen[f].has(k)) { gesehen[f].add(k); out[f].gruppen++; out[f].steine += grp.length; }
        }
      }
    }

    /* V2 nach §10.1. */
    if (e.idx < 0) return;
    const farbe = e.farbe === 'S' ? 1 : 2;
    const vor = S[t], nach = S[t + 1];
    if (nach[e.idx] !== farbe) return;
    const gN = gruppe(nach, e.idx);
    let mx = 0, warTot = false, hat = false; const ges = new Set();
    for (const n of E.NEIGHBORS[e.idx]) {
      if (vor[n] !== farbe || ges.has(n)) continue;
      const g = gruppe(vor, n); for (const s of g.steine) ges.add(s);
      hat = true; if (g.frei > mx) mx = g.frei;
      if (totSet[t].has(n)) warTot = true;
    }
    if (!hat || gN.frei <= mx || warTot) return;
    const steine = [...gN.steine];
    for (let u = t + 1; u < S.length; u++) {
      const b = S[u];
      if (steine.some(s => b[s] !== farbe)) break;
      if (steine.some(s => totSet[u].has(s))) { out[e.farbe].v2++; break; }
    }
  });
  return out;
}

/* Gepaarter t-Test; zweiseitiger p-Wert über die Normalapproximation wie in
   §12 (bei n um 350 weicht er von der t-Verteilung erst in der vierten
   Stelle ab). */
function tTest(d) {
  const n = d.length, m = d.reduce((a, b) => a + b, 0) / n;
  const sd = Math.sqrt(d.reduce((a, b) => a + (b - m) ** 2, 0) / (n - 1));
  const se = sd / Math.sqrt(n), t = se ? m / se : 0;
  const z = Math.abs(t);
  const a1 = .254829592, a2 = -.284496736, a3 = 1.421413741, a4 = -1.453152027,
        a5 = 1.061405429, pp = .3275911;
  const tt = 1 / (1 + pp * z / Math.SQRT2);
  const p = (((((a5 * tt + a4) * tt) + a3) * tt + a2) * tt + a1) * tt * Math.exp(-z * z / 2);
  return {n, m, sd, se, t, p, ki: [m - 1.96 * se, m + 1.96 * se]};
}
const mit = a => a.reduce((x, y) => x + y, 0) / a.length;
const f = (x, k = 3) => x.toFixed(k);
const pS = p => p < 0.0001 ? '< 0,0001' : f(p, 4);

/* ── Hauptteil ──────────────────────────────────────────────────────── */
function auswerten(datei, {namen = ['A', 'B']} = {}) {
  const P = fs.readFileSync(datei, 'utf8').trim().split('\n').map(z => JSON.parse(z));
  const zeilen = [];
  for (const p of P) {
    const g = groessen(p);
    const farbeVon = {[p.armSchwarz]: 'S', [p.armWeiss]: 'W'};
    zeilen.push({nr: p.nr, sieger: p.sieger, aufgabe: p.aufgabe, zuege: p.zuege,
                 armSchwarz: p.armSchwarz, A: g[farbeVon.A], B: g[farbeVon.B],
                 S: g.S, W: g.W, siegerArm: p.sieger === 'S' ? p.armSchwarz : p.armWeiss,
                 aufgabeArm: p.aufgabe ? (p.aufgabe === 'S' ? p.armSchwarz : p.armWeiss) : null});
  }
  const [nA, nB] = namen;
  const L = [];
  const log = s => L.push(s);
  log(`${datei}`);
  log(`${nA} gegen ${nB}   ${P.length} Partien`);
  log(`params_hash einheitlich: ${new Set(P.map(p => p.params_hash)).size === 1 ? 'ja' : 'NEIN'}`
    + `   verschiedene Endstellungen: ${new Set(P.map(p => p.final_board_hash)).size}`);

  const diff = k => zeilen.map(z => z.B[k] - z.A[k]);
  const arm = (a, k) => mit(zeilen.map(z => z[a][k]));

  log('\nV2 absolut (Primär in §11, gepaart)');
  const r = tTest(diff('v2'));
  log(`  ${nA} Ø ${f(arm('A', 'v2'))}   ${nB} Ø ${f(arm('B', 'v2'))}   Differenz ${f(r.m)}`
    + `   t = ${f(r.t)}   p = ${pS(r.p)}   95%-KI [${f(r.ki[0])}, ${f(r.ki[1])}]`);

  log('\nV2 je toter Gruppe (Primär in §14)');
  const sum = (a, k) => zeilen.reduce((s, z) => s + z[a][k], 0);
  log(`  gepoolt: ${nA} ${sum('A', 'v2')}/${sum('A', 'gruppen')} = ${f(sum('A', 'v2') / sum('A', 'gruppen'))}`
    + `   ${nB} ${sum('B', 'v2')}/${sum('B', 'gruppen')} = ${f(sum('B', 'v2') / sum('B', 'gruppen'))}`);
  const rate = zeilen.filter(z => z.A.gruppen > 0 && z.B.gruppen > 0)
                     .map(z => z.B.v2 / z.B.gruppen - z.A.v2 / z.A.gruppen);
  const rr = tTest(rate);
  log(`  gepaart über ${rr.n} Partien:  Differenz ${f(rr.m, 4)}   t = ${f(rr.t)}   p = ${pS(rr.p)}`
    + `   95%-KI [${f(rr.ki[0], 4)}, ${f(rr.ki[1], 4)}]`);

  log('\nGelegenheiten und Sekundäres');
  for (const [k, nm] of [['gruppen', 'tote Gruppen'], ['steine', 'tote Steine'],
                         ['verlustMax', 'verlustMax'], ['d1', 'D1']]) {
    const s = tTest(diff(k));
    log(`  ${nm.padEnd(13)} ${nA} Ø ${f(arm('A', k), 2).padStart(6)}   ${nB} Ø ${f(arm('B', k), 2).padStart(6)}`
      + `   Diff ${f(s.m).padStart(7)}   t = ${f(s.t, 2).padStart(6)}   p = ${pS(s.p)}`);
  }
  const sB = zeilen.filter(z => z.siegerArm === 'B').length;
  log(`  Siegrate ${nB}: ${sB} von ${zeilen.length} = ${f(100 * sB / zeilen.length, 1)} %`
    + `   (±${f(196 * Math.sqrt(0.25 / zeilen.length), 1)} pp)`);
  log(`  Aufgaben: ${nA} ${zeilen.filter(z => z.aufgabeArm === 'A').length}`
    + `   ${nB} ${zeilen.filter(z => z.aufgabeArm === 'B').length}`
    + `   |   Partielänge Ø ${f(mit(zeilen.map(z => z.zuege)), 0)} Züge`);

  /* Zusammenhang mit dem Ausgang (§14.3): je Partie Verlierer minus
     Gewinner. Positiv heißt: wer verliert, hat mehr davon. */
  log('\nZusammenhang mit dem Partieausgang (Verlierer − Gewinner, je Partie)');
  const sv = z => { const w = z.sieger, l = w === 'S' ? 'W' : 'S'; return [z[l], z[w]]; };
  for (const [k, nm] of [['v2', 'V2 absolut'], ['gruppen', 'tote Gruppen'], ['verlustMax', 'verlustMax']]) {
    const s = tTest(zeilen.map(z => { const [l, w] = sv(z); return l[k] - w[k]; }));
    log(`  ${nm.padEnd(13)} Diff ${f(s.m).padStart(7)}   t = ${f(s.t, 2).padStart(6)}   p = ${pS(s.p)}   n = ${s.n}`);
  }
  {
    const d = zeilen.map(sv).filter(([l, w]) => l.gruppen > 0 && w.gruppen > 0)
                    .map(([l, w]) => l.v2 / l.gruppen - w.v2 / w.gruppen);
    const s = tTest(d);
    log(`  ${'V2 je Gruppe'.padEnd(13)} Diff ${f(s.m).padStart(7)}   t = ${f(s.t, 2).padStart(6)}   p = ${pS(s.p)}   n = ${s.n}`
      + `   95%-KI [${f(s.ki[0], 4)}, ${f(s.ki[1], 4)}]`);
  }
  log(`\n  nach Farbe: V2 Schwarz Ø ${f(mit(zeilen.map(z => z.S.v2)), 2)}   Weiß Ø ${f(mit(zeilen.map(z => z.W.v2)), 2)}`
    + `   |   Schwarz gewinnt ${zeilen.filter(z => z.sieger === 'S').length} von ${zeilen.length}`);
  return {text: L.join('\n'), zeilen};
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (!a[0]) { console.error('Aufruf: node auswertung/benson-reihe.js <dump.jsonl> [--namen A,B] [--json aus.json]'); process.exit(2); }
  const opt = {};
  for (let i = 1; i < a.length; i++) {
    if (a[i] === '--namen') opt.namen = a[++i].split(',');
    else if (a[i] === '--json') opt.json = a[++i];
  }
  const {text, zeilen} = auswerten(a[0], opt);
  console.log(text);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(zeilen));
}

module.exports = {auswerten, groessen, tTest};
