/* Wo verliert die KI gegen GNU Go ihre Punkte? Zug für Zug, mit GNU Go als
   Schiedsrichter. Gehört zu docs/endspiel-verlust.md.

   Nimmt Rohdumps von gnugo-duell.js (Feld zuege) und spielt jede Partie in
   einem eigenen GNU-Go-Prozess nach. Ab Zug --ab wird vor jedem eigenen Zug
   gefragt:

     best   reg_genmove: was GNU Go an unserer Stelle spielen würde
     nach   estimate_score nach unserem Zug
     soll   estimate_score nach GNU Gos Zug (play, schätzen, undo)
     verlust = soll − nach, aus unserer Sicht; 0, wenn wir GNU Gos Zug
              gespielt haben

   Beide Schätzungen gelten für dieselbe Seite am Zug (GNU Go), sie sind
   also vergleichbar. GNU Gos Schätzung ist grob (einige Punkte Rauschen);
   aussagekräftig sind Summen und große Einzelverluste.

   Dazu alle --takt Züge und am Ende: wie viele unserer Steine GNU Go für
   tot hält (final_status_list dead). Mit --tote-je-zug auch nach jedem
   eigenen Zug und nach GNU Gos Vorschlag (tot, totSoll): Ein Zug, nach dem
   mehr eigene Steine tot sind als nach dem Vorschlag, hat eine Gruppe
   aufgegeben.

   Aufruf:
     node auswertung/endspiel-verlauf.js <dump.jsonl> [...] [--ab 100]
          [--stufe 1] [--takt 20] [--tote-je-zug] [--aus verlauf.jsonl] [--gnugo pfad]
     node auswertung/endspiel-verlauf.js --bericht verlauf.jsonl [...] */
'use strict';
const fs = require('fs');
const {spawn} = require('child_process');

const SPALTEN = 'ABCDEFGHJKLMNOPQRST';

function gtp(gnugo, stufe, komi) {
  const p = spawn(gnugo, ['--mode', 'gtp', '--level', String(stufe), '--chinese-rules', '--komi', String(komi)],
                  {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = '';
  const warte = [];
  p.on('exit', (code, sig) => { for (const w of warte.splice(0)) w(`? GNU Go beendet (${code}, ${sig})`); });
  p.stdout.on('data', d => {
    puffer += d.toString();
    let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) {
      const a = puffer.slice(0, k); puffer = puffer.slice(k + 2);
      const w = warte.shift(); if (w) w(a);
    }
  });
  const frage = befehl => new Promise((ok, fehler) => {
    warte.push(a => a.startsWith('=') ? ok(a.slice(1).trim()) : fehler(new Error(`${befehl} → ${a}`)));
    p.stdin.write(befehl + '\n');
  });
  return {frage, ende: () => { try { p.stdin.write('quit\n'); } catch (e) { /* schon weg */ } p.kill(); }};
}

/* "W+145.1 (upper bound: …)" → Punkte aus Sicht von farbe ('B'/'W') */
function wert(antwort, farbe) {
  const m = /^([BW])\+([\d.]+)/.exec(antwort);
  if (!m) return 0;
  return (m[1] === farbe ? 1 : -1) * +m[2];
}

async function analysiere(p, opt) {
  const wir = p.wirFarbe === 'S' ? 'B' : 'W', gegner = wir === 'B' ? 'W' : 'B';
  const g = gtp(opt.gnugo, opt.stufe, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    if (p.vorgabeSteine && p.vorgabeSteine.length) await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    const zuerst = p.beginnt === 'S' ? 'B' : 'W';
    const zuege = [], tote = [];
    const liste = async befehl => (await g.frage(befehl)).split(/\s+/).filter(Boolean);
    /* Unsere Steine, die GNU Go für tot hält. */
    const unsereTote = async () => {
      const eigene = new Set(await liste('list_stones ' + (wir === 'B' ? 'black' : 'white')));
      const tot = await liste('final_status_list dead');
      return {unsere: tot.filter(v => eigene.has(v)).length, gesamt: tot.length};
    };
    const zaehleTote = async mc => tote.push({mc, ...(await unsereTote())});
    for (let k = 0; k < p.zuege.length; k++) {
      const mc = k + 1, farbe = k % 2 === 0 ? zuerst : (zuerst === 'B' ? 'W' : 'B');
      const zug = p.zuege[k];
      if (farbe === wir && mc >= opt.ab) {
        let best = (await g.frage('reg_genmove ' + wir)).toUpperCase();
        if (best === 'RESIGN') best = 'PASS';
        let soll = null, totSoll = null;
        if (best !== zug.toUpperCase()) {
          await g.frage(`play ${wir} ${best}`);
          soll = wert(await g.frage('estimate_score'), wir);
          if (opt.toteJeZug) totSoll = (await unsereTote()).unsere;
          await g.frage('undo');
        }
        const vorher = +(await g.frage('captures ' + gegner));
        await g.frage(`play ${wir} ${zug}`);
        const nach = wert(await g.frage('estimate_score'), wir);
        const z = {mc, zug, best, nach, soll: soll === null ? nach : soll,
                   verlust: soll === null ? 0 : +(soll - nach).toFixed(1), gefangenVorher: vorher};
        if (opt.toteJeZug) { z.tot = (await unsereTote()).unsere; z.totSoll = totSoll === null ? z.tot : totSoll; }
        zuege.push(z);
      } else {
        await g.frage(`play ${farbe} ${zug}`);
      }
      if (mc >= opt.ab && mc % opt.takt === 0) await zaehleTote(mc);
      /* Steine, die der Gegner mit seinem Zug geschlagen hat, dem vorigen
         eigenen Zug zuordnen: dort hätte man sie retten können. */
      if (farbe === gegner && zuege.length) {
        const z = zuege[zuege.length - 1];
        if (z.mc === mc - 1) z.danachGeschlagen = +(await g.frage('captures ' + gegner)) - z.gefangenVorher;
      }
    }
    await zaehleTote(p.zuege.length);
    const ende = wert(await g.frage('final_score'), wir);
    return {nr: p.nr, ki: p.ki, wirFarbe: p.wirFarbe, zuegeAnzahl: p.zuege.length, endstand: ende,
            schaetzung: p.schaetzung, ab: opt.ab, stufe: opt.stufe, zuege, tote};
  } finally { g.ende(); }
}

function bericht(rs) {
  const phasen = [[0, 120], [120, 200], [200, 1e9]];
  const summe = (a, f) => a.reduce((s, x) => s + f(x), 0);
  console.log(`${rs.length} Partien, Endstand Ø ${(summe(rs, r => r.endstand) / rs.length).toFixed(1)}`);
  for (const [von, bis] of phasen) {
    const z = rs.flatMap(r => r.zuege.filter(x => x.mc > von && x.mc <= bis));
    if (!z.length) continue;
    const v = z.map(x => Math.max(0, x.verlust));
    const gross = z.filter(x => x.verlust >= 15);
    console.log(`Züge ${von + 1}–${bis >= 1e9 ? 'Ende' : bis}: ${z.length} eigene Züge, Verlust Σ ${summe(v, x => x).toFixed(0)}`
      + ` (Ø je Partie ${(summe(v, x => x) / rs.length).toFixed(1)}), anders als GNU Go ${z.filter(x => x.zug.toUpperCase() !== x.best).length},`
      + ` ≥ 15 Punkte: ${gross.length} Züge mit Σ ${summe(gross, x => x.verlust).toFixed(0)}`
      + `, Pässe ${z.filter(x => x.zug === 'pass').length}`);
  }
  const alle = rs.flatMap(r => r.zuege.map(x => ({...x, nr: r.nr})));
  const top = [...alle].sort((a, b) => b.verlust - a.verlust).slice(0, 15);
  console.log('Größte Einzelverluste:');
  for (const x of top) console.log(`  Partie ${x.nr}, Zug ${x.mc}: ${x.zug} statt ${x.best}, −${x.verlust}`
    + (x.danachGeschlagen ? `, danach ${x.danachGeschlagen} Steine geschlagen` : ''));
  const tot = rs.map(r => r.tote[r.tote.length - 1].unsere);
  console.log(`Eigene tote Steine am Ende (GNU Go): Ø ${(summe(tot, x => x) / rs.length).toFixed(1)}, Median ${[...tot].sort((a, b) => a - b)[tot.length >> 1]}`);
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {ab: 100, stufe: 1, takt: 20, aus: null, gnugo: '/usr/games/gnugo', bericht: false, toteJeZug: false};
  const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--stufe') opt.stufe = +a[++i];
    else if (a[i] === '--takt') opt.takt = +a[++i];
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = true;
    else if (a[i] === '--tote-je-zug') opt.toteJeZug = true;
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
      const v = r.zuege.reduce((s, x) => s + Math.max(0, x.verlust), 0);
      console.log(`Partie ${p.nr}: Verlust ab Zug ${opt.ab} Σ ${v.toFixed(0)}, Endstand ${r.endstand},`
        + ` tote eigene Steine am Ende ${r.tote[r.tote.length - 1].unsere} · ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  })();
}

module.exports = {analysiere, bericht, wert};
