// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Wohin gehen die Punkte? Besitz jedes Brettpunkts nach GNU Go zu
   mehreren Zeitpunkten, und die Übergänge dazwischen. Gehört zu
   docs/punktverlust.md.

   An jeder Marke (--marken, Standard 100,120,…,200) fragt das Werkzeug GNU
   Go nach dem Status der Stellung (final_status_list: alive, dead,
   black_territory, white_territory, dame, seki) und ordnet jedem Punkt eine
   Art zu, aus Sicht der KI:

     KI-Stein      lebender Stein der KI          → gehört der KI
     KI-Gebiet     Gebiet der KI                   → gehört der KI
     GG-tot        toter Stein von GNU Go          → gehört der KI
     GG-Stein, GG-Gebiet, KI-tot                   → gehört GNU Go
     neutral       dame oder seki

   Der Stand nach dieser Zählung ist Fläche KI minus Fläche GNU Go minus
   Komi. Zwischen zwei Marken wird gezählt, wie viele Punkte von welcher Art
   in welche übergehen. Ein Punkt, der von der KI zu GNU Go wechselt, kostet
   2 Punkte, einer von der KI zu neutral 1.

   Die Marke „ende“ steht für die Schlussstellung der Partie, wann immer sie
   endet (Partien enden verschieden früh). Übersprungen werden nur Partien,
   die kürzer sind als die größte Zahlenmarke.

   Mit --karten speichert die Ausgabe je Marke die Karte als Zeichenkette
   (361 Zeichen, Zeile 19 zuerst, Spalten A–T ohne I): S KI-Stein, G
   KI-Gebiet, t GG-tot, . neutral, s GG-Stein, g GG-Gebiet, T KI-tot. Die
   liest einbruch.js.

   Aufruf:
     node auswertung/besitz-verlauf.js <dump.jsonl> [...] [--marken 100,120,140,160,180,200[,ende]]
          [--karten] [--aus besitz.jsonl] [--gnugo pfad]
     node auswertung/besitz-verlauf.js --bericht besitz.jsonl [...] [--von 100 --bis 200] */
'use strict';
const fs = require('fs');
const {wert, gtp} = require('./endspiel-verlauf.js');

const ARTEN = ['KI-Stein', 'KI-Gebiet', 'GG-tot', 'neutral', 'GG-Stein', 'GG-Gebiet', 'KI-tot'];
const BESITZ = {'KI-Stein': 1, 'KI-Gebiet': 1, 'GG-tot': 1, 'neutral': 0, 'GG-Stein': -1, 'GG-Gebiet': -1, 'KI-tot': -1};

async function analysiere(p, opt) {
  const ki = p.wirFarbe === 'S' ? 'B' : 'W';
  const g = gtp(opt.gnugo, 1, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    if (p.vorgabeSteine && p.vorgabeSteine.length) await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    const zuerst = p.beginnt === 'S' ? 'B' : 'W';
    const liste = async befehl => (await g.frage(befehl)).split(/\s+/).filter(Boolean).map(s => s.toUpperCase());
    const karte = async () => {
      const tot = new Set(await liste('final_status_list dead'));   /* berechnet den Status; die übrigen Listen kommen aus dem Speicher */
      const art = {};
      for (const [farbe, name] of [['black', 'B'], ['white', 'W']])
        for (const s of await liste('list_stones ' + farbe))
          art[s] = name === ki ? (tot.has(s) ? 'KI-tot' : 'KI-Stein') : (tot.has(s) ? 'GG-tot' : 'GG-Stein');
      for (const [liste_, farbe] of [['black_territory', 'B'], ['white_territory', 'W']])
        for (const s of await liste('final_status_list ' + liste_)) art[s] = farbe === ki ? 'KI-Gebiet' : 'GG-Gebiet';
      return art;
    };
    const stand = {}, karten = {};
    const zahlen = opt.marken.filter(m => m !== 'ende'), mitEnde = opt.marken.includes('ende');
    const bis = mitEnde ? p.zuege.length : Math.max(...zahlen);
    for (let k = 0; k < p.zuege.length && k < bis; k++) {
      const mc = k + 1, f = k % 2 === 0 ? zuerst : (zuerst === 'B' ? 'W' : 'B');
      await g.frage(`play ${f} ${p.zuege[k]}`);
      if (zahlen.includes(mc)) {
        karten[mc] = await karte();
        stand[mc] = {schaetzung: wert(await g.frage('estimate_score'), ki)};
      }
    }
    if (mitEnde) {
      karten.ende = await karte();
      stand.ende = {schaetzung: wert(await g.frage('estimate_score'), ki), zug: p.zuege.length};
    }
    /* Alle Punkte (auch die, die in keiner Liste stehen, gelten als neutral). */
    const L = 'ABCDEFGHJKLMNOPQRST', punkte = [];
    for (let y = 19; y >= 1; y--) for (const x of L) punkte.push(x + y);
    const artVon = (mc, s) => karten[mc][s] || 'neutral';
    for (const mc of Object.keys(karten)) {
      const z = {};
      for (const a of ARTEN) z[a] = 0;
      for (const s of punkte) z[artVon(mc, s)]++;
      stand[mc].zaehlung = +(punkte.reduce((t, s) => t + BESITZ[artVon(mc, s)], 0) - (ki === 'W' ? -p.komi : p.komi)).toFixed(1);
      stand[mc].arten = z;
    }
    const marken = Object.keys(karten).filter(m => m !== 'ende').map(Number).sort((a, b) => a - b);
    if (karten.ende) marken.push('ende');
    const uebergaenge = {};
    for (let n = 0; n + 1 < marken.length; n++) {
      const t = marken[n], u = marken[n + 1], m = {};
      for (const s of punkte) {
        const a = artVon(t, s), b = artVon(u, s);
        if (a !== b) m[`${a}>${b}`] = (m[`${a}>${b}`] || 0) + 1;
      }
      uebergaenge[`${t}-${u}`] = m;
    }
    /* Auch direkt von der ersten zur letzten Marke. */
    const t0 = marken[0], t1 = marken[marken.length - 1], gesamt = {};
    for (const s of punkte) { const a = artVon(t0, s), b = artVon(t1, s); if (a !== b) gesamt[`${a}>${b}`] = (gesamt[`${a}>${b}`] || 0) + 1; }
    uebergaenge[`${t0}-${t1}`] = gesamt;
    const r = {nr: p.nr, seed: p.seed, wirFarbe: p.wirFarbe, komi: p.komi, marken, stand, uebergaenge};
    if (opt.karten) {
      const code = {'KI-Stein': 'S', 'KI-Gebiet': 'G', 'GG-tot': 't', 'neutral': '.', 'GG-Stein': 's', 'GG-Gebiet': 'g', 'KI-tot': 'T'};
      r.karten = Object.fromEntries(marken.map(m => [m, punkte.map(s => code[artVon(m, s)]).join('')]));
    }
    return r;
  } finally { g.ende(); }
}

function bericht(rs, von, bis) {
  const n = rs.length;
  const mw = f => rs.reduce((s, r) => s + f(r), 0) / n;
  const marken = rs[0].marken;
  von = von || marken[0]; bis = bis || marken[marken.length - 1];
  console.log(`${n} Partien, Marken ${marken.join(', ')}`);
  console.log('Stand je Marke (Ø, Sicht der KI): ' + marken.map(m => `${m}: Zählung ${mw(r => r.stand[m].zaehlung).toFixed(1)},`
    + ` Schätzung ${mw(r => r.stand[m].schaetzung).toFixed(1)}`).join(' · '));
  console.log('Arten je Marke (Ø Punkte): ' + marken.map(m => `${m}: ` + ARTEN.map(a => `${a} ${mw(r => r.stand[m].arten[a]).toFixed(0)}`).join(', ')).join(' | '));
  const key = `${von}-${bis}`;
  const alle = {};
  for (const r of rs) for (const [k, v] of Object.entries(r.uebergaenge[key] || {})) alle[k] = (alle[k] || 0) + v;
  const zeilen = Object.entries(alle).map(([k, v]) => {
    const [a, b] = k.split('>');
    return {k, je: v / n, punkte: (BESITZ[b] - BESITZ[a]) * v / n};
  }).sort((x, y) => x.punkte - y.punkte);
  console.log(`Übergänge ${key}, je Partie (Punkte aus Sicht der KI):`);
  for (const z of zeilen) if (Math.abs(z.punkte) >= 0.5) console.log(`  ${z.k.padEnd(24)} ${z.je.toFixed(1).padStart(6)} Punkte des Bretts  → ${z.punkte >= 0 ? '+' : ''}${z.punkte.toFixed(1)}`);
  const summe = zeilen.reduce((s, z) => s + z.punkte, 0);
  console.log(`  Summe ${summe.toFixed(1)} (Änderung der Zählung ${(mw(r => r.stand[bis].zaehlung) - mw(r => r.stand[von].zaehlung)).toFixed(1)})`);
  /* Zusammengefasst nach Herkunft der verlorenen KI-Punkte. */
  const gruppe = f => zeilen.filter(z => f(...z.k.split('>'))).reduce((s, z) => s + z.punkte, 0);
  console.log('Zusammengefasst:');
  console.log(`  eigene Steine sterben (KI-Stein → KI-tot oder geschlagen): ${gruppe((a, b) => a === 'KI-Stein' && BESITZ[b] < 1).toFixed(1)}`);
  console.log(`  eigenes Gebiet geht verloren (KI-Gebiet → GNU Go oder neutral): ${gruppe((a, b) => a === 'KI-Gebiet' && BESITZ[b] < 1).toFixed(1)}`);
  console.log(`  neutrales Gebiet an GNU Go / an die KI: ${gruppe((a, b) => a === 'neutral' && BESITZ[b] < 0).toFixed(1)} / +${gruppe((a, b) => a === 'neutral' && BESITZ[b] > 0).toFixed(1)}`);
  console.log(`  von GNU Go zurückgewonnen (GG-Stein, GG-Gebiet → KI oder neutral): +${gruppe((a, b) => (a === 'GG-Stein' || a === 'GG-Gebiet') && BESITZ[b] > BESITZ[a]).toFixed(1)}`);
  console.log(`  eigene tote Steine wieder lebend (KI-tot → KI oder neutral): +${gruppe((a, b) => a === 'KI-tot' && BESITZ[b] > BESITZ[a]).toFixed(1)}`);
  console.log(`  tote GNU-Go-Steine wieder lebend (GG-tot → GNU Go oder neutral): ${gruppe((a, b) => a === 'GG-tot' && BESITZ[b] < 1).toFixed(1)}`);
  console.log('  (Die sieben Posten teilen alle Übergänge, die Punkte ändern; ihre Summe ist die Summe oben.)');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {marken: [100, 120, 140, 160, 180, 200], aus: null, gnugo: '/usr/games/gnugo', bericht: false, von: 0, bis: 0, karten: false};
  const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--marken') opt.marken = a[++i].split(',').map(m => m === 'ende' ? 'ende' : +m);
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = true;
    else if (a[i] === '--von') opt.von = +a[++i];
    else if (a[i] === '--bis') { const v = a[++i]; opt.bis = v === 'ende' ? 'ende' : +v; }
    else if (a[i] === '--karten') opt.karten = true;
    else dateien.push(a[i]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(dateien.flatMap(lies), opt.von, opt.bis); return; }
  (async () => {
    const alle = [];
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege || p.zuege.length < Math.max(...opt.marken.filter(m => m !== 'ende'))) continue;
      const r = await analysiere(p, opt);
      alle.push(r);
      if (opt.aus) fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n');
    }
    if (!opt.aus) bericht(alle);
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere, bericht};
