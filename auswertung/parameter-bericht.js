// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bericht der Parameter-Reihe (docs/parameter-reihe.md §4): jeder Arm gegen den
   Referenzarm A, Endstand nach GNU Gos Zählung, gepaart nach Partienummer
   (Differenz, 95-%-Intervall, zweiseitiger t-Test, Hälften, Siege), dazu das
   Urteil nach der vorab festgelegten Regel:

     besser,    p < alpha          Kandidat
     schlechter, p < alpha         schlechter
     sonst, p < 0,05               Hinweis (besser oder schlechter)
     sonst, Obergrenze des 95-%-Intervalls unter +10     verworfen
     sonst                         nicht belegt

   alpha ist die Schwelle je Vergleich nach Bonferroni (0,05 durch die Zahl der
   Vergleiche). Arme in --gleich sind Negativkontrollen: Sie werden nicht
   verglichen, sondern daraufhin geprüft, ob sie Zug für Zug dieselben Partien
   spielen wie der Referenzarm. Mit --kontrolle <datei> (jsonl, auch .gz) wird
   der Referenzarm gegen eine frühere Messung desselben Seeds geprüft: gleicher
   Endstand und gleiche Zugzahl je Partienummer.

   Mit --siege statt der Endstand-Tabellen die Siege gepaart: wie oft gewinnt
   nur der Arm, wie oft nur der Referenzarm, wie oft beide oder keiner, dazu der
   exakte McNemar-Test (der Vorzeichentest auf den Paaren, in denen die Sieger
   wechseln). Sekundär, nicht der Endpunkt.

   Mit --anfang N zusätzlich je Arm: in wie vielen Paaren die ersten N Züge
   gleich denen des Referenzarms sind. Die Probe für einen Arm, der erst ab
   Zug N umschaltet (docs/prior-nachmessung.md §3): Dort müssen es alle sein.

   Aufruf:
     node auswertung/parameter-bericht.js --ref A --arm A=a.jsonl --arm R30=r.jsonl ...
          [--text R30=raveK=30 ...] [--gleich N] [--alpha 0.005] [--kontrolle frueher.jsonl.gz] [--siege] [--anfang 120] [--markdown] */
'use strict';
const B = require('./endspiel-pilot-bericht.js');
const O = require('./orakel-bericht.js');
const Z = require('./messung-zusatz.js');

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;
const f1 = v => (v >= 0 ? '+' : '−') + Math.abs(v).toFixed(1).replace('.', ',');
const z1 = v => v.toFixed(1).replace('.', ',');
const fp = p => p < 1e-4 ? p.toExponential(1).replace('.', ',').replace('e-', ' · 10⁻') : p.toFixed(4).replace('.', ',');
const fa = a => String(a).replace('.', ',');

/* Lesart aus docs/parameter-reihe.md §4 */
function urteil(g, alpha) {
  if (!g) return 'zu wenige Paare';
  if (g.p < alpha) return g.diff > 0 ? 'besser: Kandidat' : 'schlechter';
  if (g.p < 0.05) return g.diff > 0 ? 'Hinweis: besser' : 'Hinweis: schlechter';
  return g.hi < 10 ? 'verworfen: kein Gewinn von 10' : 'nicht belegt';
}

/* Spielt ein Arm Zug für Zug dieselben Partien wie der Referenzarm? */
function gleiche(ref, arm) {
  let n = 0, gleich = 0;
  for (const [nr, r] of arm) {
    const a = ref.get(nr); if (!a) continue;
    n++;
    if (a.endstand === r.endstand && a.zuegeAnzahl === r.zuegeAnzahl && JSON.stringify(a.zuege) === JSON.stringify(r.zuege)) gleich++;
  }
  return {n, gleich};
}

/* In wie vielen Paaren sind die ersten n Züge gleich? Abgebrochene Partien fallen samt Partner heraus. */
function gleicherAnfang(ref, arm, n) {
  let paare = 0, gleich = 0;
  for (const [nr, r] of arm) {
    const a = ref.get(nr); if (!a || a.abgebrochen || r.abgebrochen) continue;
    paare++;
    if (JSON.stringify((a.zuege || []).slice(0, n)) === JSON.stringify((r.zuege || []).slice(0, n))) gleich++;
  }
  return {n: paare, gleich};
}

/* Siege gepaart nach Partienummer; abgebrochene Partien fallen samt Partner heraus.
   b: nur der Arm gewinnt, c: nur der Referenzarm, McNemar exakt = Vorzeichentest auf b und c */
function siege(ref, arm) {
  let b = 0, c = 0, beide = 0, keiner = 0;
  for (const [nr, a] of ref) {
    const x = arm.get(nr); if (!x || a.abgebrochen || x.abgebrochen) continue;
    if (x.gewonnen && !a.gewonnen) b++; else if (!x.gewonnen && a.gewonnen) c++; else if (x.gewonnen) beide++; else keiner++;
  }
  return {b, c, beide, keiner, siegeArm: b + beide, siegeRef: c + beide, p: Z.vorzeichenP(b, c)};
}

function siegeText(arme, ref, gleichArme, opt) {
  const aus = [];
  const namen = Object.keys(arme).filter(n => n !== ref && !gleichArme.includes(n));
  if (opt.markdown) aus.push(`| Arm | Siege | Siege ${ref} | nur Arm | nur ${ref} | beide | keiner | McNemar p |`, '|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const n of namen) {
    const s = siege(arme[ref], arme[n]);
    if (opt.markdown) aus.push(`| **${n}** | ${s.siegeArm} | ${s.siegeRef} | ${s.b} | ${s.c} | ${s.beide} | ${s.keiner} | ${fp(s.p)} |`);
    else aus.push(`${n} gegen ${ref}: Siege ${s.siegeArm} gegen ${s.siegeRef} · nur ${n} gewinnt ${s.b}, nur ${ref} gewinnt ${s.c}, beide ${s.beide}, keiner ${s.keiner} · McNemar (exakt) p = ${fp(s.p)}`);
  }
  return aus.join('\n');
}

function auswertung(arme, ref, gleichArme, alpha) {
  const varianten = Object.keys(arme).filter(n => n !== ref && !gleichArme.includes(n));
  const zeilen = varianten.map(n => {
    const v = B.vergleiche(arme, n, ref), g = v.gesamt;
    return {name: n, v, g, gleich: gleiche(arme[ref], arme[n]), urteil: urteil(g, alpha)};
  });
  const proben = gleichArme.filter(n => arme[n]).map(n => ({name: n, ...gleiche(arme[ref], arme[n])}));
  const partien = Object.entries(arme).map(([name, m]) => {
    const r = [...m.values()], ok = r.filter(p => !p.abgebrochen);
    return {name, partien: r.length, abgebrochen: r.length - ok.length,
            endstand: ok.length ? mittel(ok.map(p => p.endstand)) : NaN, siege: ok.filter(p => p.gewonnen).length,
            zuege: ok.length ? mittel(ok.map(p => p.zuegeAnzahl)) : NaN};
  });
  return {ref, alpha, zeilen, proben, partien};
}

function text(a, texte, opt) {
  const par = n => texte[n] || (n === a.ref ? 'Default' : '');
  const aus = [];
  if (opt.markdown) {
    aus.push('| Arm | Parameter | Partien | abgebrochen | Endstand Ø | Siege | Züge Ø |', '|---|---|---:|---:|---:|---:|---:|');
    for (const p of a.partien) aus.push(`| ${p.name} | ${par(p.name) ? '`' + par(p.name) + '`' : ''} | ${p.partien} | ${p.abgebrochen} | ${Number.isFinite(p.endstand) ? f1(p.endstand) : '–'} | ${p.siege} | ${Number.isFinite(p.zuege) ? z1(p.zuege) : '–'} |`);
    aus.push('', `| Arm | Paare | Differenz zu ${a.ref} | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 | Zug für Zug gleich ${a.ref} | Urteil (alpha ${fa(a.alpha)}) |`, '|---|---:|---:|---|---:|---|---|---:|---:|---|');
    for (const z of a.zeilen) {
      const g = z.g; if (!g) { aus.push(`| **${z.name}** | zu wenige Paare |||||||||`); continue; }
      aus.push(`| **${z.name}** | ${g.n} | **${f1(g.diff)}** | [${f1(g.lo)}; ${f1(g.hi)}] | ${fp(g.p)} | ${z.v.h1 ? f1(z.v.h1.diff) : '–'} / ${z.v.h2 ? f1(z.v.h2.diff) : '–'} | ${z.v.siegeX} gegen ${z.v.siegeY} | ${z.v.z120 ? f1(z.v.z120.diff) : '–'} | ${z.gleich.gleich} von ${z.gleich.n} | ${z.urteil} |`);
    }
  } else {
    for (const p of a.partien) aus.push(`Arm ${p.name}${par(p.name) ? ' (' + par(p.name) + ')' : ''}: ${p.partien} Partien, ${p.abgebrochen} abgebrochen, Endstand Ø ${Number.isFinite(p.endstand) ? f1(p.endstand) : '–'}, Siege ${p.siege}, Züge Ø ${Number.isFinite(p.zuege) ? z1(p.zuege) : '–'}`);
    aus.push('');
    for (const z of a.zeilen) {
      const g = z.g; if (!g) { aus.push(`${z.name} − ${a.ref}: zu wenige Paare`); continue; }
      aus.push(`${z.name} − ${a.ref}: ${g.n} Paare · Differenz ${f1(g.diff)} (SD ${z1(g.sd)}), 95 %: [${f1(g.lo)}; ${f1(g.hi)}], p = ${fp(g.p)}`
        + ` · Hälften ${z.v.h1 ? f1(z.v.h1.diff) : '–'} / ${z.v.h2 ? f1(z.v.h2.diff) : '–'} · Siege ${z.v.siegeX} gegen ${z.v.siegeY}`
        + (z.v.z120 ? ` · nach Zug 120: ${f1(z.v.z120.diff)} (p = ${fp(z.v.z120.p)})` : '')
        + ` · Zug für Zug gleich ${a.ref}: ${z.gleich.gleich} von ${z.gleich.n} → ${z.urteil}`);
    }
  }
  for (const k of a.proben) aus.push('', `${opt.markdown ? '- ' : ''}Negativkontrolle ${k.name}: ${k.gleich} von ${k.n} Partien Zug für Zug gleich Arm ${a.ref}`);
  return aus.join('\n');
}

function main() {
  const a = process.argv.slice(2), opt = {arme: {}, texte: {}, ref: 'A', gleich: [], alpha: 0.005, kontrolle: null, markdown: false, siege: false, anfang: 0};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--arm') { const [n, f] = a[++i].split('='); opt.arme[n] = B.liesArm(f.split(',')); }
    else if (a[i] === '--text') { const s = a[++i], k = s.indexOf('='); opt.texte[s.slice(0, k)] = s.slice(k + 1); }
    else if (a[i] === '--ref') opt.ref = a[++i];
    else if (a[i] === '--gleich') opt.gleich = a[++i].split(',').filter(Boolean);
    else if (a[i] === '--alpha') opt.alpha = +a[++i];
    else if (a[i] === '--kontrolle') opt.kontrolle = a[++i];
    else if (a[i] === '--markdown') opt.markdown = true;
    else if (a[i] === '--siege') opt.siege = true;
    else if (a[i] === '--anfang') opt.anfang = +a[++i];
  }
  if (!opt.arme[opt.ref] || !(opt.alpha > 0 && opt.alpha <= 0.05)) {
    console.error('Aufruf: node auswertung/parameter-bericht.js --ref A --arm A=a.jsonl --arm R30=r.jsonl ... [--alpha 0.005]'); process.exit(1);
  }
  if (opt.siege) { console.log(siegeText(opt.arme, opt.ref, opt.gleich, opt)); return; }
  console.log(text(auswertung(opt.arme, opt.ref, opt.gleich, opt.alpha), opt.texte, opt));
  if (opt.kontrolle) {
    const k = O.kontrolle(opt.arme[opt.ref], opt.kontrolle);
    console.log('', `${opt.markdown ? '- ' : ''}Kontrolle gegen ${opt.kontrolle}, Arm ${opt.ref}: ${k.gleich} von ${k.n} Partien mit gleichem Endstand und gleicher Zugzahl`);
  }
  if (opt.anfang > 0) {
    console.log('');
    for (const n of Object.keys(opt.arme).filter(x => x !== opt.ref && !opt.gleich.includes(x))) {
      const g = gleicherAnfang(opt.arme[opt.ref], opt.arme[n], opt.anfang);
      console.log(`${opt.markdown ? '- ' : ''}${n}: in ${g.gleich} von ${g.n} Paaren die ersten ${opt.anfang} Züge gleich ${opt.ref}`);
    }
  }
}

if (require.main === module) main();
module.exports = {urteil, gleiche, gleicherAnfang, siege, siegeText, auswertung, text};
