/* Wie sterben lebende Gruppen der KI? Gehört zu docs/augen-urteil.md.

   Liest die Ausgabe von augen-urteil.js und die Rohdumps. Fälle sind
   Gruppen der KI, die an einer Marke nach GNU Go leben:

     stirbt     an der nächsten Marke sind mindestens 3 ihrer Steine tot
                oder geschlagen
     Kontrolle  an der nächsten Marke ist keiner ihrer Steine tot oder
                geschlagen (jede --kontrolle-te)

   Für jeden Fall spielt das Werkzeug die 20 Züge bis zur nächsten Marke
   nach und fragt nach jedem Zug nach dem Status der Drachen ihrer Steine.
   Festgehalten:

     kippt      Zug, nach dem mindestens min(3, halbe Gruppe) ihrer Steine
                nicht mehr stehen oder zu einem Drachen gehören, der nicht
                lebt; wer ihn spielte
                (kipptDurch), ob er an zwei Ketten der Gruppe grenzte
                (schnitt) und auf wie viele Drachen sich die stehenden
                Steine danach verteilen (teile)
     nahGG      Züge von GNU Go nah an der Gruppe (Abstand ≤ 2 zu einem
                ihrer Steine) bis dahin
     antwort    davon solche, auf die die KI direkt nah antwortete
     raumGG     Züge von GNU Go in den Augenraum der Gruppe (leere Gebiete
                ohne gegnerischen Nachbarn an der Marke, an die die Gruppe
                grenzt)
     raumKI     Züge der KI in den eigenen Augenraum
     augeKI     Züge der KI auf ein echtes Auge der Gruppe (findEyes an der
                Marke)
     schlagen   Steine der KI, die GNU Go bis dahin schlug

   Aufruf:
     node auswertung/augen-tod.js --urteil urteil.jsonl [...] --dumps dump.jsonl [...]
          [--kontrolle 10] [--aus tod.jsonl] [--gnugo pfad]
     node auswertung/augen-tod.js --bericht tod.jsonl [...] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));
const {gtp} = require('./endspiel-verlauf.js');

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => { s = s.toUpperCase(); return s === 'PASS' ? -1 : (19 - +s.slice(1)) * 19 + L.indexOf(s[0]); };
const zuGtp = i => L[i % 19] + (19 - Math.floor(i / 19));
const abstand = (a, b) => Math.max(Math.abs(a % 19 - b % 19), Math.abs(Math.floor(a / 19) - Math.floor(b / 19)));

/* Leere Gebiete ohne Stein der Farbe 3 - f am Rand, an die eine der Ketten grenzt. */
function augenraum(b, f, steine) {
  const raum = new Set(), gesehen = new Uint8Array(N);
  for (const s of steine) for (const n of E.NEIGHBORS[s]) {
    if (b[n] || gesehen[n]) continue;
    const q = [n]; gesehen[n] = 1; let fremd = false;
    for (let k = 0; k < q.length; k++) for (const m of E.NEIGHBORS[q[k]]) {
      if (!b[m]) { if (!gesehen[m]) { gesehen[m] = 1; q.push(m); } }
      else if (b[m] !== f) fremd = true;
    }
    if (!fremd && q.length <= 30) for (const p of q) raum.add(p);
  }
  return raum;
}

async function analysiere(p, fall, opt) {
  const ki = p.wirFarbe === 'S' ? 1 : 2;
  const g = gtp(opt.gnugo, 1, p.komi);
  try {
    await g.frage('boardsize 19'); await g.frage('clear_board');
    const b = new Uint8Array(N);
    if (p.vorgabeSteine && p.vorgabeSteine.length) {
      await g.frage('set_free_handicap ' + p.vorgabeSteine.join(' '));
      for (const s of p.vorgabeSteine) b[vonGtp(s)] = 1;
    }
    const zuerst = p.beginnt === 'S' ? 1 : 2;
    const zug = async k => {
      const f = k % 2 === 0 ? zuerst : 3 - zuerst, i = vonGtp(p.zuege[k]);
      await g.frage(`play ${f === 1 ? 'B' : 'W'} ${p.zuege[k]}`);
      let weg = 0;
      if (i >= 0) { b[i] = f; weg = E.removeDeadGroups(b, 3 - f, i); }
      return {f, i, weg};
    };
    for (let k = 0; k < fall.mc; k++) await zug(k);
    await g.frage('dragon_status');
    const steine = (await g.frage('dragon_stones ' + fall.ursprung)).split(/\s+/).filter(Boolean).map(vonGtp);
    const raum = augenraum(b, ki, steine);
    const augen = new Set();
    const ges = new Set();
    for (const s of steine) {
      if (ges.has(s)) continue;
      const {group} = E.floodFill(b, s);
      for (const q of group) ges.add(q);
      for (const e of E.findEyes(b, group, ki)) augen.add(e);
    }
    const nah = i => steine.some(s => b[s] === ki && abstand(s, i) <= 2) || steine.some(s => abstand(s, i) <= 1);
    /* Zustand der ursprünglichen Steine: wie viele stehen nicht mehr oder
       gehören zu einem Drachen, der nicht lebt, und auf wie viele Drachen
       verteilen sich die stehenden. */
    const zustand = async () => {
      let nichtLebend = 0;
      const teile = new Set(), fertig = new Set();
      for (const s of steine) {
        if (b[s] !== ki) { nichtLebend++; continue; }
        if (fertig.has(s)) continue;
        const {group} = E.floodFill(b, s);
        const st = (await g.frage('dragon_status ' + zuGtp(s))).trim().split(/\s+/)[0].toLowerCase();
        teile.add((await g.frage('dragon_stones ' + zuGtp(s))).split(/\s+/)[0]);
        const imDrachen = steine.filter(q => group.includes(q));
        for (const q of imDrachen) fertig.add(q);
        if (st !== 'alive') nichtLebend += imDrachen.length;
      }
      return {nichtLebend, teile: teile.size};
    };
    const r = {seed: p.seed, mc: fall.mc, art: fall.art, klasse: fall.augen >= 2 || fall.benson ? '2+' : fall.augen === 1 ? '1' : '0',
               steine: steine.length, ketten: fall.ketten, raum: raum.size, augen: augen.size,
               kippt: null, kipptDurch: null, betroffen: null, teile: null, schnitt: null,
               nahGG: 0, antwort: 0, raumGG: 0, raumKI: 0, augeKI: 0, schlagen: 0};
    let wartetAntwort = false;
    for (let k = fall.mc; k < Math.min(fall.mc + 20, p.zuege.length); k++) {
      const vorher = steine.filter(s => b[s] === ki).length;
      const iz = vonGtp(p.zuege[k]);
      const istNah = iz >= 0 && nah(iz);
      /* Schnitt: der Zug grenzt an zwei verschiedene Ketten der Gruppe. */
      const kettenNachbar = new Set();
      if (iz >= 0) for (const n of E.NEIGHBORS[iz]) if (b[n] === ki && steine.includes(n)) kettenNachbar.add(Math.min(...E.floodFill(b, n).group));
      const {f, i} = await zug(k);
      const seite = f === ki ? 'ki' : 'gg';
      if (seite === 'ki' && wartetAntwort) { if (istNah) r.antwort++; wartetAntwort = false; }
      if (seite === 'gg' && istNah) { r.nahGG++; wartetAntwort = true; }
      if (i >= 0 && raum.has(i)) { if (seite === 'gg') r.raumGG++; else r.raumKI++; }
      if (seite === 'ki' && augen.has(i)) r.augeKI++;
      r.schlagen += vorher - steine.filter(s => b[s] === ki).length;
      const z = await zustand();
      if (z.nichtLebend >= Math.min(3, Math.ceil(steine.length / 2))) {
        r.kippt = k + 1 - fall.mc; r.kipptDurch = seite; r.betroffen = z.nichtLebend; r.teile = z.teile;
        r.schnitt = seite === 'gg' && kettenNachbar.size >= 2;
        break;
      }
    }
    return r;
  } finally { g.ende(); }
}

function bericht(z) {
  const pz = (a, f) => a.length ? `${(100 * a.filter(f).length / a.length).toFixed(0)} %` : '–';
  const mw = (a, f) => a.length ? (a.reduce((t, x) => t + f(x), 0) / a.length).toFixed(1) : '–';
  for (const [name, art] of [['stirbt bis zur nächsten Marke (≥ 3 Steine)', 'stirbt'], ['Kontrolle: kein Stein stirbt', 'kontrolle']]) {
    const alle = z.filter(x => x.art === art);
    console.log(`${name}: ${alle.length} Gruppen`);
    for (const [teil, a] of [['alle', alle], ['2+ Augen', alle.filter(x => x.klasse === '2+')], ['1 Auge', alle.filter(x => x.klasse === '1')], ['0 Augen', alle.filter(x => x.klasse === '0')]]) {
      if (!a.length) continue;
      const k = a.filter(x => x.kippt !== null);
      const nahGG = a.reduce((t, x) => t + x.nahGG, 0);
      console.log(`  ${teil} (${a.length}): Steine Ø ${mw(a, x => x.steine)}, Ketten Ø ${mw(a, x => x.ketten)}, Augenraum Ø ${mw(a, x => x.raum)}`);
      console.log(`    kippt: ${pz(a, x => x.kippt !== null)}, nach Ø ${mw(k, x => x.kippt)} Zügen, durch GNU Go ${pz(k, x => x.kipptDurch === 'gg')};`
        + ` Zug grenzt an zwei Ketten ${pz(k, x => x.schnitt)}; Steine danach auf 2+ Drachen ${pz(k, x => x.teile >= 2)}`);
      console.log(`    bis dahin: GNU Go nah Ø ${mw(a, x => x.nahGG)}, KI antwortet nah ${nahGG ? (100 * a.reduce((t, x) => t + x.antwort, 0) / nahGG).toFixed(0) + ' %' : '–'};`
        + ` GNU Go im Augenraum Ø ${mw(a, x => x.raumGG)}; KI im eigenen Augenraum Ø ${mw(a, x => x.raumKI)}, auf ein eigenes Auge Ø ${mw(a, x => x.augeKI)}`);
    }
  }
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const opt = {kontrolle: 10, aus: null, gnugo: '/usr/games/gnugo', bericht: false};
  const urteil = [], dumps = [], berichte = [];
  let liste = berichte;
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--urteil') liste = urteil;
    else if (a[k] === '--dumps') liste = dumps;
    else if (a[k] === '--kontrolle') opt.kontrolle = +a[++k];
    else if (a[k] === '--aus') opt.aus = a[++k];
    else if (a[k] === '--gnugo') opt.gnugo = a[++k];
    else if (a[k] === '--bericht') { opt.bericht = true; liste = berichte; }
    else liste.push(a[k]);
  }
  const lies = d => fs.readFileSync(d, 'utf8').trim().split('\n').filter(Boolean).map(z => JSON.parse(z));
  if (opt.bericht) { bericht(berichte.flatMap(lies)); return; }
  const partien = new Map(dumps.flatMap(lies).map(p => [p.seed, p]));
  const tot = x => x.spaeterSteine.dead + x.spaeterSteine.weg;
  let n = 0;
  const faelle = urteil.flatMap(lies).filter(x => x.seite === 'ki' && x.gnugo === 'alive' && x.spaeterSteine).flatMap(x => {
    if (tot(x) >= 3) return [{...x, art: 'stirbt'}];
    if (tot(x) === 0 && n++ % opt.kontrolle === 0) return [{...x, art: 'kontrolle'}];
    return [];
  });
  (async () => {
    const alle = [];
    for (const f of faelle) {
      const p = partien.get(f.seed);
      if (!p) continue;
      const r = await analysiere(p, f, opt);
      alle.push(r);
      if (opt.aus) fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n');
    }
    if (!opt.aus) bericht(alle);
  })().catch(e => { console.error(e.stack || e.message); process.exit(1); });
}

module.exports = {analysiere, bericht};
