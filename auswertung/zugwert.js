/* Wie viel kostet jeder Zug nach GNU Gos eigener Zugbewertung? Gehört zu
   docs/punktverlust-muster.md.

   Vor jedem Zug beider Seiten fragt das Werkzeug GNU Go (--stufe, Standard
   10) nach den zehn besten Zügen der ziehenden Seite und ihren Werten in
   Punkten (top_moves_black/white).
     best     höchster Wert und sein Zug
     wert     Wert des gespielten Zugs; steht er nicht unter den zehn
              besten, der Wert des zehnten (bei weniger genannten 0) --
              der Verlust ist dann eine untere Grenze
     verlust  best − wert
   all_move_values würde alle Züge bewerten, rechnet aber in manchen
   Stellungen minutenlang.
   Anders als punktverlust.js braucht das keine Schätzung nach dem Zug: GNU
   Gos Zugwerte rechnen Folgen und Vorhand schon ein. Sie sind GNU Gos
   Urteil, keine Wahrheit; deshalb werden die Züge von GNU Go Stufe 1 gleich
   mitbewertet (Kontrolle).

   Ausgabe je Partie: {nr, ki, zuege: [[mc, seite, zug, wert, best, bestZug, nichtInTop10?], ...]}
   seite: 'K' = KI, 'G' = GNU Go.

   Aufruf:
     node auswertung/zugwert.js partien.jsonl [...] --aus zugwert.jsonl [--stufe 10] [--ab 81]
       --ab   erst ab diesem Zug bewerten (davor nur nachspielen)
       --zeitgrenze  Sekunden je GTP-Befehl (Standard 60), danach wird die Partie übersprungen
     node auswertung/zugwert.js --bericht zugwert.jsonl [...] */
'use strict';
const fs = require('fs');
const {gtp} = require('./endspiel-verlauf.js');

const L = 'ABCDEFGHJKLMNOPQRST';
const linie = v => { if (!v || v === 'PASS') return 0; const x = L.indexOf(v[0]), y = +v.slice(1) - 1; return Math.min(x, y, 18 - x, 18 - y) + 1; };
const abstand = (u, v) => Math.max(Math.abs(L.indexOf(u[0]) - L.indexOf(v[0])), Math.abs(+u.slice(1) - +v.slice(1)));

async function analysiere(p, opt) {
  const ki = p.wirFarbe === 'S' ? 'B' : 'W';
  const g = gtp(opt.gnugo, opt.stufe, p.komi);
  /* Zeitgrenze je Befehl: GNU Go rechnet in manchen Stellungen minutenlang
     an einem Zugwert. Dann wird die Partie übersprungen. */
  const frage = g.frage;
  g.frage = b => Promise.race([frage(b), new Promise((_, nein) =>
    setTimeout(() => nein(new Error(`Zeitgrenze bei ${b.slice(0, 20)}`)), opt.zeitgrenze * 1000).unref())]);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    if (p.vorgabeSteine && p.vorgabeSteine.length) await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    const zuerst = p.beginnt === 'S' ? 'B' : 'W', zuege = [];
    for (let k = 0; k < p.zuege.length; k++) {
      const f = k % 2 === 0 ? zuerst : (zuerst === 'B' ? 'W' : 'B'), zug = p.zuege[k].toUpperCase();
      if (zug !== 'PASS' && k + 1 >= opt.ab) {
        const top = (await g.frage('top_moves_' + (f === 'B' ? 'black' : 'white'))).split(/\s+/).filter(Boolean);
        const werte = new Map();
        for (let j = 0; j + 1 < top.length; j += 2) werte.set(top[j].toUpperCase(), +top[j + 1]);
        const bestZug = top.length ? top[0].toUpperCase() : 'PASS', best = top.length ? +top[1] : 0;
        /* Nicht unter den zehn besten: Wert höchstens der des zehnten (bei
           weniger als zehn genannten: 0). Der Verlust ist dann eine untere
           Grenze; markiert durch das siebte Feld. */
        const unten = werte.size >= 10 ? +top[top.length - 1] : 0;
        zuege.push(werte.has(zug) ? [k + 1, f === ki ? 'K' : 'G', zug, werte.get(zug), best, bestZug]
                                  : [k + 1, f === ki ? 'K' : 'G', zug, unten, best, bestZug, 1]);
      }
      await g.frage(`play ${f} ${zug}`);
      if (process.env.ZW_DEBUG && k % 10 === 0) console.error(`Partie ${p.nr}: Zug ${k + 1}`);
    }
    return {nr: p.nr, ki, zuege};
  } finally { g.ende(); }
}

function bericht(rs) {
  const n = rs.length;
  const PH = [[1, 40], [41, 80], [81, 120], [121, 160], [161, 200], [201, 999]];
  console.log(`${n} Partien. Verlust = GNU Gos Wert des besten Zugs − Wert des gespielten (Punkte).`);
  console.log('Züge außerhalb der zehn besten zählen mit dem Abstand zum zehnten (untere Grenze).');
  console.log('Phase      | KI: Züge  Verlust/Partie  je Zug  >2 P.  >5 P.  nicht Top 10 | GNU Go St. 1: Verlust/Partie  je Zug  nicht Top 10');
  for (const [a, b] of PH) {
    const z = s => rs.flatMap(r => r.zuege.filter(x => x[1] === s && x[0] >= a && x[0] <= b));
    const k = z('K'), gg = z('G'), v = x => Math.max(0, x[4] - x[3]);
    const sk = k.reduce((s, x) => s + v(x), 0), sg = gg.reduce((s, x) => s + v(x), 0);
    if (!k.length && !gg.length) continue;
    const aus = arr => `${(100 * arr.filter(x => x[6]).length / Math.max(1, arr.length)).toFixed(0).padStart(5)} %`;
    console.log(`${String(a).padStart(3)}–${String(b === 999 ? 'Ende' : b).padEnd(4)}   |   ${(k.length / n).toFixed(1).padStart(5)}   ${(sk / n).toFixed(1).padStart(6)}        ${(sk / Math.max(1, k.length)).toFixed(2)}   ${(100 * k.filter(x => v(x) > 2).length / Math.max(1, k.length)).toFixed(0).padStart(3)} %  ${(100 * k.filter(x => v(x) > 5).length / Math.max(1, k.length)).toFixed(0).padStart(3)} %  ${aus(k)}   |   ${(sg / n).toFixed(1).padStart(6)}        ${(sg / Math.max(1, gg.length)).toFixed(2)}  ${aus(gg)}`);
  }
  /* Verluste der KI nach Art: wo lag GNU Gos bester Zug, wo der gespielte? */
  const k = rs.flatMap(r => r.zuege.map((x, i) => ({x, vor: i > 0 ? r.zuege[i - 1] : null})).filter(o => o.x[1] === 'K'));
  const v = x => Math.max(0, x[4] - x[3]);
  const sum = arr => arr.reduce((s, o) => s + v(o.x), 0) / n;
  console.log('\nVerlust der KI je Partie, aufgeteilt:');
  const teile = [
    ['bester Zug auf Linie 1–2', o => linie(o.x[5]) <= 2 && linie(o.x[5]) > 0],
    ['bester Zug auf Linie 3+', o => linie(o.x[5]) >= 3],
    ['gespielt auf Linie 1–2', o => linie(o.x[2]) <= 2],
    ['bester Zug nah am letzten Gegnerzug (≤ 2)', o => o.vor && o.vor[1] === 'G' && o.x[5] !== 'PASS' && abstand(o.x[5], o.vor[2]) <= 2],
    ['bester Zug weiter weg', o => !(o.vor && o.vor[1] === 'G' && o.x[5] !== 'PASS' && abstand(o.x[5], o.vor[2]) <= 2)],
    ['gespielt nah am letzten Gegnerzug (≤ 2)', o => o.vor && o.vor[1] === 'G' && abstand(o.x[2], o.vor[2]) <= 2],
    ['gespielt nicht unter GNU Gos zehn besten', o => o.x[6] === 1],
  ];
  for (const [name, f] of teile) console.log(`  ${name.padEnd(46)} ${sum(k.filter(f)).toFixed(1).padStart(6)}   (${(k.filter(f).length / n).toFixed(1)} Züge)`);
  /* Antwort auf einen Gegnerzug, der selbst viel wert war (> 5): lokal geantwortet? */
  const grosse = k.filter(o => o.vor && o.vor[1] === 'G' && o.vor[3] > 5);
  const lokal = grosse.filter(o => abstand(o.x[2], o.vor[2]) <= 2);
  console.log(`\nNach einem Gegnerzug mit Wert > 5 (${(grosse.length / n).toFixed(1)} je Partie): KI antwortet lokal ${(100 * lokal.length / Math.max(1, grosse.length)).toFixed(0)} %,`
    + ` GNU Gos bester Zug lokal ${(100 * grosse.filter(o => o.x[5] !== 'PASS' && abstand(o.x[5], o.vor[2]) <= 2).length / Math.max(1, grosse.length)).toFixed(0)} %, Verlust dort ${sum(grosse).toFixed(1)} je Partie`);
}

if (require.main === module) {
  const a = process.argv.slice(2), dateien = [];
  const opt = {stufe: 10, ab: 1, zeitgrenze: 60, aus: null, gnugo: '/usr/games/gnugo', bericht: false};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--stufe') opt.stufe = +a[++i];
    else if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--zeitgrenze') opt.zeitgrenze = +a[++i];
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = true;
    else dateien.push(a[i]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(dateien.flatMap(lies)); return; }
  (async () => {
    /* Fortsetzbar: Partien, die schon in --aus stehen, werden übersprungen. */
    const fertig = new Set(opt.aus && fs.existsSync(opt.aus) ? lies(opt.aus).map(r => r.nr) : []);
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege || fertig.has(p.nr)) continue;
      let r;
      try { r = await analysiere(p, opt); }
      catch (e) { console.error(`Partie ${p.nr}: ${e.message.slice(0, 100)}`); continue; }   /* GNU Go stürzt selten ab */
      if (opt.aus) fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n'); else console.log(JSON.stringify(r).slice(0, 200));
    }
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere, bericht};
