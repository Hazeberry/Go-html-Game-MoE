/* Rettet die KI kritische Gruppen, und tötet sie kritische Gruppen des
   Gegners? GNU Go als Schiedsrichter (dragon_status). Gehört zu
   docs/punktverlust.md.

   Vor jedem Zug im Fenster --ab bis --bis fragt das Werkzeug GNU Go nach
   dem Status jeder Gruppe (alive, critical, dead; bei critical mit Angriffs-
   und Rettungspunkt). Für die ziehende Seite zählt:

     eigene kritisch   eigene Gruppe vor dem Zug kritisch
       gerettet        danach lebend
       gespielt        der Zug war GNU Gos Rettungspunkt
       weiter kritisch / tot   danach noch kritisch / tot oder geschlagen
       10 Züge später tot      Schicksal zehn Halbzüge später
     fremde kritisch   gegnerische Gruppe vor dem Zug kritisch
       getötet         danach tot oder geschlagen

   Eine Gruppe, die über mehrere Züge kritisch bleibt, zählt bei jedem Zug
   ihrer Seite. Gewichtet wird zusätzlich mit der Zahl ihrer Steine.

   Aufruf:
     node auswertung/kritisch.js <dump.jsonl> [...] [--ab 100] [--bis 200]
          [--aus kritisch.jsonl] [--gnugo pfad]
     node auswertung/kritisch.js --bericht kritisch.jsonl [...] */
'use strict';
const fs = require('fs');
const {gtp} = require('./endspiel-verlauf.js');

async function analysiere(p, opt) {
  const ki = p.wirFarbe === 'S' ? 'B' : 'W';
  const g = gtp(opt.gnugo, 1, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    if (p.vorgabeSteine && p.vorgabeSteine.length) await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
    const zuerst = p.beginnt === 'S' ? 'B' : 'W';
    const seiteVon = mc => mc % 2 === 1 ? zuerst : (zuerst === 'B' ? 'W' : 'B');
    const liste = async befehl => (await g.frage(befehl)).split(/\s+/).filter(Boolean).map(s => s.toUpperCase());
    /* Stellung: Farbe je Punkt, Gruppen mit Status und Steinen. */
    const stellung = async () => {
      const farbe = new Map();
      for (const s of await liste('list_stones black')) farbe.set(s, 'B');
      for (const s of await liste('list_stones white')) farbe.set(s, 'W');
      const gruppen = [];
      for (const zeile of (await g.frage('dragon_status')).split('\n')) {
        const m = /^\s*([A-T]\d+):\s*(\w+)\s*(.*)$/i.exec(zeile);
        if (!m) continue;
        const [, ecke, status, rest] = m, punkte = rest.split(/\s+/).filter(Boolean).map(s => s.toUpperCase());
        const gr = {ecke: ecke.toUpperCase(), status, farbe: farbe.get(ecke.toUpperCase())};
        if (status === 'critical') {
          gr.angriff = punkte[0] || null; gr.rettung = punkte[1] || null;
          gr.steine = await liste('dragon_stones ' + ecke);
          gr.freiheiten = +(await g.frage('countlib ' + ecke));
        }
        gruppen.push(gr);
      }
      return {farbe, gruppen};
    };
    /* Status der Gruppe, zu der Stein s jetzt gehört; 'weg', wenn s nicht
       mehr steht oder die Farbe gewechselt hat. */
    const statusVon = async (s, f) => {
      const jetzt = (await liste(`list_stones ${f === 'B' ? 'black' : 'white'}`));
      if (!jetzt.includes(s)) return 'weg';
      const a = (await g.frage('dragon_status ' + s)).trim().split(/\s+/)[0];
      return a;
    };
    const ereignisse = [];
    const offen = [];   /* {bis, s, f, e}: Schicksal nach 10 Zügen nachtragen */
    for (let k = 0; k < p.zuege.length && k < opt.bis; k++) {
      const mc = k + 1, f = seiteVon(mc), zug = p.zuege[k].toUpperCase();
      for (const o of offen.filter(o => o.bis === mc)) o.e.spaeter = await statusVon(o.s, o.f);
      let vor = null;
      if (mc >= opt.ab) vor = await stellung();
      await g.frage(`play ${f} ${zug}`);
      if (!vor) continue;
      for (const gr of vor.gruppen.filter(x => x.status === 'critical')) {
        const eigene = gr.farbe === f;
        const nachher = await statusVon(gr.ecke, gr.farbe);
        const e = {mc, seite: f === ki ? 'ki' : 'gegner', eigene, ecke: gr.ecke, steine: gr.steine.length,
                   freiheiten: gr.freiheiten, zug,
                   rettung: gr.rettung, angriff: gr.angriff, nachher,
                   gespielt: zug === (eigene ? gr.rettung : gr.angriff)};
        ereignisse.push(e);
        if (eigene) offen.push({bis: mc + 10, s: gr.ecke, f: gr.farbe, e});
      }
    }
    return {nr: p.nr, seed: p.seed, ab: opt.ab, bis: opt.bis, ereignisse};
  } finally { g.ende(); }
}

function bericht(rs) {
  const n = rs.length;
  const E = rs.flatMap(r => r.ereignisse);
  const tot = s => s === 'dead' || s === 'weg';
  console.log(`${n} Partien, Zug ${rs[0].ab}–${rs[0].bis}`);
  for (const [name, seite] of [['KI', 'ki'], ['GNU Go', 'gegner']]) {
    console.log(`${name}:`);
    for (const [teil, f] of [['alle Gruppen', () => true], ['ab 3 Steinen', e => e.steine >= 3]]) {
      const eig = E.filter(e => e.seite === seite && e.eigene && f(e)), fr = E.filter(e => e.seite === seite && !e.eigene && f(e));
      const steine = (a, g) => a.filter(g).reduce((s, e) => s + e.steine, 0);
      const pz = (a, g) => a.length ? `${(100 * a.filter(g).length / a.length).toFixed(0)} %` : '–';
      const sp = eig.filter(e => e.spaeter);
      console.log(`  ${teil}:`);
      console.log(`    eigene kritisch vor dem Zug: ${(eig.length / n).toFixed(1)} je Partie; danach lebend ${pz(eig, e => e.nachher === 'alive')},`
        + ` Rettungspunkt gespielt ${pz(eig, e => e.gespielt)}; 10 Züge später tot ${pz(sp, e => tot(e.spaeter))}`);
      console.log(`    fremde kritisch vor dem Zug: ${(fr.length / n).toFixed(1)} je Partie; danach tot ${pz(fr, e => tot(e.nachher))},`
        + ` Angriffspunkt gespielt ${pz(fr, e => e.gespielt)}; mit dem Zug getötete Steine ${(steine(fr, e => tot(e.nachher)) / n).toFixed(1)} je Partie`);
    }
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {ab: 100, bis: 200, aus: null, gnugo: '/usr/games/gnugo', bericht: false};
  const dateien = [];
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--ab') opt.ab = +a[++i];
    else if (a[i] === '--bis') opt.bis = +a[++i];
    else if (a[i] === '--aus') opt.aus = a[++i];
    else if (a[i] === '--gnugo') opt.gnugo = a[++i];
    else if (a[i] === '--bericht') opt.bericht = true;
    else dateien.push(a[i]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(dateien.flatMap(lies)); return; }
  (async () => {
    const alle = [];
    for (const p of dateien.flatMap(lies)) {
      if (p.abgebrochen || !p.zuege) continue;
      const r = await analysiere(p, opt);
      alle.push(r);
      if (opt.aus) fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n');
    }
    if (!opt.aus) bericht(alle);
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere, bericht};
