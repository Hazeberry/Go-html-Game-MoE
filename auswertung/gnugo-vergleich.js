/* Zwei Läufe von gnugo-duell.js gepaart vergleichen (gleiche --seed, gleiche
   Partienummern): mittlere Differenz B − A der GNU-Go-Schätzung nach einer
   Zugzahl, gepaarter t-Test, zweiseitig. Abgebrochene Partien fallen samt
   ihrem Partner heraus.

   Aufruf:
     node auswertung/gnugo-vergleich.js --A a.jsonl[,a2.jsonl] --B b.jsonl[,...] [--zug 120] */
'use strict';
const fs = require('fs');

const a = process.argv.slice(2);
const opt = {A: [], B: [], zuege: [60, 120]};
for (let i = 0; i < a.length; i++) {
  if (a[i] === '--A' || a[i] === '--B') opt[a[i].slice(2)] = a[++i].split(',');
  else if (a[i] === '--zug') opt.zuege = a[++i].split(',').map(Number);
}
const lies = dateien => {
  const m = new Map();
  for (const d of dateien) for (const z of fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean)) {
    const r = JSON.parse(z); m.set(r.nr, r);
  }
  return m;
};

/* Zweiseitiges p der t-Verteilung, über die regularisierte unvollständige
   Beta-Funktion (Kettenbruch, Numerical Recipes). */
function betacf(x, a, b) {
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; c = 1 + aa / c; d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return h;
}
function lgamma(z) {
  const g = [76.18009172947146, -86.50532032941677, 24.01409824083091,
             -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z, y = z, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const c of g) s += c / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function ibeta(x, a, b) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(x, a, b) / a : 1 - bt * betacf(1 - x, b, a) / b;
}
const pZweiseitig = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);

const A = lies(opt.A), B = lies(opt.B);
for (const zug of opt.zuege) {
  const d = [];
  let ab = 0;
  for (const [nr, ra] of A) {
    const rb = B.get(nr);
    if (!rb) continue;
    if (ra.abgebrochen || rb.abgebrochen || ra.schaetzung[zug] === undefined || rb.schaetzung[zug] === undefined) { ab++; continue; }
    d.push({a: ra.schaetzung[zug], b: rb.schaetzung[zug]});
  }
  const n = d.length, diffs = d.map(x => x.b - x.a);
  const mw = arr => arr.reduce((x, y) => x + y, 0) / arr.length;
  const md = mw(diffs), sd = Math.sqrt(diffs.reduce((s, x) => s + (x - md) ** 2, 0) / (n - 1));
  const t = md / (sd / Math.sqrt(n)), p = pZweiseitig(t, n - 1);
  console.log(`nach Zug ${zug}: ${n} Paare (${ab} ohne Partner/abgebrochen) · A Ø ${mw(d.map(x => x.a)).toFixed(1)}`
    + ` · B Ø ${mw(d.map(x => x.b)).toFixed(1)} · Differenz B − A ${md.toFixed(1)} (SD ${sd.toFixed(1)})`
    + ` · t = ${t.toFixed(2)}, p = ${p < 1e-4 ? p.toExponential(1) : p.toFixed(4)}`);
}
