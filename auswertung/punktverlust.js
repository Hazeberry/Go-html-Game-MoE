/* Welche Züge kosten die Punkte? Zug für Zug gegen GNU Gos Vorschlag, beide
   Varianten erst nach der Antwort des Gegners bewertet. Gehört zu
   docs/punktverlust.md.

   endspiel-verlauf.js vergleicht die Schätzung direkt nach unserem Zug mit
   der direkt nach GNU Gos Vorschlag. Das taugt für Ataris nicht: Die
   Schätzung bewertet die Drohung, bevor der Gegner antwortet
   (docs/endspiel-verlust.md §2). Hier bekommt jede Variante zuerst die
   Antwort des Gegners (reg_genmove), dann wird geschätzt:

     best    reg_genmove der ziehenden Seite (GNU Go auf --stufe)
     ist     estimate_score nach dem gespielten Zug und der Antwort
     soll    estimate_score nach best und der Antwort
     verlust soll − ist, aus Sicht der ziehenden Seite; 0, wenn best gespielt

   Beide Schätzungen gelten für dieselbe Seite am Zug, sie sind vergleichbar.
   Danach geht die Partie mit dem gespielten Zug weiter. Bewertet werden die
   Züge der KI im Fenster --ab bis --bis, mit --gegner auch die von GNU Go
   (Kontrolle: Wie viel verliert GNU Go Stufe 1 gegen GNU Go --stufe?).
   Pässe werden gespielt, nicht bewertet. Dazu alle 10 Züge im Fenster die
   Schätzung der echten Stellung (verlaufSchaetzung, aus Sicht der KI).

   Aufruf:
     node auswertung/punktverlust.js <dump.jsonl> [...] [--ab 100] [--bis 200]
          [--stufe 10] [--gegner] [--aus verlust.jsonl] [--gnugo pfad]
     node auswertung/punktverlust.js --bericht verlust.jsonl [...]

   Die Ausgabe trägt je Partie `zuege` (KI) im selben Format wie
   endspiel-verlauf.js (mc, zug, best). */
'use strict';
const fs = require('fs');
const path = require('path');
const {wert, gtp} = require('./endspiel-verlauf.js');

async function analysiere(p, opt) {
  const ki = p.wirFarbe === 'S' ? 'B' : 'W';
  const andere = f => f === 'B' ? 'W' : 'B';
  const g = gtp(opt.gnugo, opt.stufe, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    if (p.vorgabeSteine && p.vorgabeSteine.length) await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    const zuerst = p.beginnt === 'S' ? 'B' : 'W';
    /* Zug z von Seite f, Antwort des Gegners, Schätzung aus Sicht von f,
       beides zurücknehmen. */
    const mitAntwort = async (f, z) => {
      await g.frage(`play ${f} ${z}`);
      let antwort = (await g.frage('reg_genmove ' + andere(f))).toUpperCase();
      if (antwort === 'RESIGN') antwort = 'PASS';
      if (antwort !== 'PASS') await g.frage(`play ${andere(f)} ${antwort}`);
      const s = wert(await g.frage('estimate_score'), f);
      if (antwort !== 'PASS') await g.frage('undo');
      await g.frage('undo');
      return {s, antwort};
    };
    const zuege = [], gegner = [], verlaufSchaetzung = {};
    for (let k = 0; k < p.zuege.length && k < opt.bis; k++) {
      const mc = k + 1, f = k % 2 === 0 ? zuerst : andere(zuerst), zug = p.zuege[k].toUpperCase();
      if (mc >= opt.ab && zug !== 'PASS' && (f === ki || opt.gegner)) {
        let best = (await g.frage('reg_genmove ' + f)).toUpperCase();
        if (best === 'RESIGN') best = 'PASS';
        const ist = await mitAntwort(f, zug);
        let soll = ist;
        if (best !== zug) soll = best === 'PASS' ? null : await mitAntwort(f, best);
        const z = {mc, zug, best, ist: ist.s, soll: soll ? soll.s : null,
                   verlust: soll ? +(soll.s - ist.s).toFixed(1) : null,
                   antwortIst: ist.antwort, antwortSoll: soll ? soll.antwort : null};
        (f === ki ? zuege : gegner).push(z);
      }
      await g.frage(`play ${f} ${zug}`);
      if (mc >= opt.ab && mc % 10 === 0) verlaufSchaetzung[mc] = wert(await g.frage('estimate_score'), ki);
    }
    return {nr: p.nr, seed: p.seed, ki: p.ki, wirFarbe: p.wirFarbe, ab: opt.ab, bis: opt.bis, stufe: opt.stufe,
            endstand: p.endstand, verlaufSchaetzung, zuege, gegner};
  } finally { g.ende(); }
}

function bericht(rs) {
  const summe = (a, f) => a.reduce((s, x) => s + f(x), 0);
  const mittel = (a, f) => a.length ? summe(a, f) / a.length : 0;
  console.log(`${rs.length} Partien, Fenster Zug ${rs[0].ab}–${rs[0].bis}, Schiedsrichter GNU Go Stufe ${rs[0].stufe}`);
  for (const [name, f] of [['KI', r => r.zuege], ['GNU Go', r => r.gegner]]) {
    const z = rs.flatMap(r => f(r).filter(x => x.verlust !== null));
    if (!z.length) continue;
    const v = z.map(x => x.verlust);
    const gross = z.filter(x => x.verlust >= 10);
    console.log(`${name}: ${z.length} Züge, gleich GNU Gos Vorschlag ${(100 * z.filter(x => x.zug === x.best).length / z.length).toFixed(0)} %,`
      + ` Verlust Ø ${mittel(v, x => x).toFixed(2)} je Zug, Σ je Partie ${(summe(v, x => x) / rs.length).toFixed(1)};`
      + ` ≥ 10 Punkte: ${gross.length} Züge (${(gross.length / rs.length).toFixed(1)} je Partie), Σ je Partie ${(summe(gross, x => x.verlust) / rs.length).toFixed(1)}`);
  }
  const mcs = Object.keys(rs[0].verlaufSchaetzung).map(Number).sort((a, b) => a - b);
  console.log('Schätzung der echten Stellung (Sicht der KI), Ø: '
    + mcs.map(m => `${m}: ${mittel(rs, r => r.verlaufSchaetzung[m] ?? 0).toFixed(1)}`).join(' · '));
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {ab: 100, bis: 200, stufe: 10, gegner: false, aus: null, gnugo: '/usr/games/gnugo', bericht: false};
  const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--bis') opt.bis = +a[++i];
    else if (a[i] === '--stufe') opt.stufe = +a[++i];
    else if (a[i] === '--gegner') opt.gegner = true;
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = true;
    else dateien.push(a[i]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(dateien.flatMap(lies)); return; }
  (async () => {
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege) continue;
      const t0 = Date.now();
      const r = await analysiere(p, opt);
      if (opt.aus) fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n');
      const v = summeVerlust(r.zuege);
      console.log(`Partie ${p.nr}: KI-Verlust Σ ${v.toFixed(0)} über ${r.zuege.length} Züge`
        + (opt.gegner ? `, GNU Go Σ ${summeVerlust(r.gegner).toFixed(0)}` : '')
        + ` · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}
function summeVerlust(z) { return z.reduce((s, x) => s + (x.verlust || 0), 0); }

module.exports = {analysiere, bericht};
