/* Waren die Aufgaben berechtigt? GNU Go urteilt. Gehört zu
   docs/aufgabe-deckel.md.

   Jede Partie eines Rohdumps von ab-harness.js, die mit einer Aufgabe
   endet, wird bis zur Aufgabestellung nachgespielt. GNU Go schätzt dort mit
   estimate_score (chinesische Regeln, Komi wie im Harness). Liegt der
   Aufgebende laut GNU Go vorn (Schätzung > 0 aus seiner Sicht), war die
   Aufgabe falsch.

   Je Arm: Aufgaben, davon falsch, und Fishers exakter Test (zweiseitig)
   auf die Zahl falscher Aufgaben je gespielter Partie, A gegen B.

   Voraussetzung: GNU Go 3.8 (/usr/games/gnugo oder --gnugo pfad).

   Aufruf:
     node auswertung/aufgabe-gnugo.js <dump.jsonl> [weitere.jsonl ...]
          [--komi 7.5] [--gnugo pfad] [--json aus.json] */
'use strict';
const fs = require('fs');
const {spawnSync} = require('child_process');

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));

/* GNU Gos Schätzung nach den Zügen, aus Sicht von Schwarz. */
function schaetzung(zuege, komi, gnugo) {
  const befehle = ['boardsize 19', 'clear_board', `komi ${komi}`];
  for (const {farbe, idx} of zuege) befehle.push(`play ${farbe} ${idx < 0 ? 'pass' : zuGtp(idx)}`);
  befehle.push('estimate_score', 'quit');
  const r = spawnSync(gnugo, ['--mode', 'gtp', '--chinese-rules'], {input: befehle.join('\n') + '\n', encoding: 'utf8'});
  const antworten = (r.stdout || '').split('\n').filter(z => z.startsWith('=') || z.startsWith('?'));
  if (antworten.some(z => z.startsWith('?'))) throw new Error('GNU Go lehnt einen Befehl ab');
  const m = /^=\s*([BW])\+([\d.]+)/.exec(antworten[antworten.length - 2] || '');
  if (!m) return null;                       /* Absturz oder unlesbar */
  return (m[1] === 'B' ? 1 : -1) * +m[2];
}

/* Fishers exakter Test, zweiseitig, für [[a, b], [c, d]]. */
function fisher(a, b, c, d) {
  const lf = n => { let s = 0; for (let k = 2; k <= n; k++) s += Math.log(k); return s; };
  const r1 = a + b, r2 = c + d, c1 = a + c, n = r1 + r2;
  const p = x => Math.exp(lf(r1) + lf(r2) + lf(c1) + lf(n - c1) - lf(n) - lf(x) - lf(r1 - x) - lf(c1 - x) - lf(r2 - c1 + x));
  const p0 = p(a);
  let s = 0;
  for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) { const q = p(x); if (q <= p0 * (1 + 1e-9)) s += q; }
  return Math.min(1, s);
}

function auswerten(partien, {komi = 7.5, gnugo = '/usr/games/gnugo'} = {}) {
  const arm = {A: {partien: 0, aufgaben: 0, falsch: 0, ohneUrteil: 0}, B: {partien: 0, aufgaben: 0, falsch: 0, ohneUrteil: 0}};
  const einzeln = [];
  for (const p of partien) {
    arm[p.armSchwarz].partien++; arm[p.armWeiss].partien++;
    if (!p.aufgabe) continue;
    const wer = p.aufgabe === 'S' ? p.armSchwarz : p.armWeiss;
    /* Das letzte Ereignis ist die Aufgabe selbst (idx -1, ohne Zug). */
    const zuege = p.ereignisse.slice(0, -1).map(e => ({farbe: e.farbe === 'S' ? 'B' : 'W', idx: e.idx}));
    const s = schaetzung(zuege, komi, gnugo);
    arm[wer].aufgaben++;
    if (s === null) { arm[wer].ohneUrteil++; continue; }
    const sicht = p.aufgabe === 'S' ? s : -s;     /* > 0: Aufgebender laut GNU Go vorn */
    if (sicht > 0) arm[wer].falsch++;
    einzeln.push({seed: p.seed, nr: p.nr, arm: wer, farbe: p.aufgabe, zug: p.zuege, gnugo: sicht});
  }
  const pFisher = fisher(arm.A.falsch, arm.A.partien - arm.A.falsch, arm.B.falsch, arm.B.partien - arm.B.falsch);
  return {arm, pFisher, einzeln};
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {komi: 7.5, gnugo: '/usr/games/gnugo', json: null};
  const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--komi') opt.komi = +a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--json') opt.json = a[++i];
    else dateien.push(a[i]);
  }
  if (!dateien.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(2); }
  if (!fs.existsSync(opt.gnugo)) { console.error(`GNU Go nicht gefunden: ${opt.gnugo}`); process.exit(2); }
  const P = dateien.flatMap(d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z)));
  const r = auswerten(P, opt);
  console.log(`${P.length} Partien`);
  for (const k of ['A', 'B']) {
    const x = r.arm[k];
    console.log(`  ${k}: ${x.aufgaben} Aufgaben in ${x.partien} Partien, davon falsch ${x.falsch}`
      + (x.ohneUrteil ? `, ohne Urteil ${x.ohneUrteil}` : ''));
  }
  console.log(`  Fisher (falsche Aufgaben je Partie, A gegen B, zweiseitig): p = ${r.pFisher.toPrecision(3)}`);
  if (opt.json) fs.writeFileSync(opt.json, JSON.stringify(r, null, 1) + '\n');
}

module.exports = {auswerten, fisher, schaetzung};
