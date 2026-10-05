/* Hätte ein taktischer Leser die verlorenen Gruppen gerettet? Gehört zu
   docs/laufkampf-lesen.md.

   Für jeden Schlag ab MIN_STEINE Steinen wird rückwärts geschaut, höchstens
   FENSTER Halbzüge. An jeder Stellung, in der das Opfer am Zug war und die
   Kette (verfolgt über einen ihrer Steine) schon stand, fragt der Leser aus
   index.html:

     bedroht   Angreifer am Zug fängt die Kette (leseAngriff)
     rettbar   Opfer am Zug kann sie retten (leseVerteidigung)
     gerettet  nach dem tatsächlich gespielten Zug fängt der Angreifer nicht mehr

   Je Verlust zählt die letzte Stellung, die bedroht und rettbar war, deren
   Zug aber nicht rettete: eine verpasste Rettung, die der Leser gesehen
   hätte. Gibt es keine, war die Kette für den Leser entweder schon verloren,
   als sie zum ersten Mal bedroht war, oder sie fiel außerhalb seiner Reichweite
   (mehr als drei Freiheiten, Ko, Augen).

   Eingaben: Rohdumps von ab-harness.js (Felder ereignisse, armSchwarz,
   armWeiss) oder Zuglisten (eine Datei mit Zügen in GTP-Schreibweise,
   Schwarz beginnt, "pass" erlaubt) mit --zuege.

   Aufruf:
     node auswertung/laufkampf-lesen.js <dump.jsonl> [...] [--max-partien N]
     node auswertung/laufkampf-lesen.js --zuege zuege.txt [--farbe W] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const MIN_STEINE = 5, FENSTER = 40;
const L = 'ABCDEFGHJKLMNOPQRST';
const vonGtp = s => (19 - +s.slice(1)) * 19 + L.indexOf(s[0]);
const zuGtp = i => L[i % 19] + (19 - Math.floor(i / 19));

/* zuege: [{f, i}] mit i = -1 für Pass. Liefert je Verlust einen Eintrag. */
function analysiere(zuege) {
  const bretter = [];
  const b = new Uint8Array(N);
  const verluste = [];
  for (let t = 0; t < zuege.length; t++) {
    bretter.push(new Uint8Array(b));
    const {f, i} = zuege[t];
    if (i < 0) continue;
    const vorher = new Uint8Array(b);
    b[i] = f;
    const cap = E.removeDeadGroups(b, 3 - f, i);
    if (cap >= MIN_STEINE) {
      /* geschlagene Steine: vorher Opfer, jetzt leer */
      const steine = [];
      for (let k = 0; k < N; k++) if (vorher[k] === 3 - f && !b[k]) steine.push(k);
      verluste.push({t, opfer: 3 - f, steine});
    }
  }
  const aus = [];
  for (const v of verluste) {
    let verpasst = null, ersteBedrohung = null, stellungen = 0;
    for (let u = v.t - 1; u >= Math.max(0, v.t - FENSTER); u--) {
      if (zuege[u].f !== v.opfer) continue;
      const bb = bretter[u];
      /* ein Stein der späteren Opferkette, der hier schon steht */
      const s = v.steine.find(k => bb[k] === v.opfer);
      if (s === undefined) break;
      stellungen++;
      const bedroht = E.leseAngriff(bb, s).ja;
      if (!bedroht) continue;
      ersteBedrohung = u;
      const rettbar = E.leseVerteidigung(bb, s).ja;
      if (!rettbar) continue;
      const m = zuege[u].i;
      let gerettet = false;
      if (m >= 0) {
        const nb = new Uint8Array(bb); nb[m] = v.opfer; E.removeDeadGroups(nb, 3 - v.opfer, m);
        gerettet = nb[s] === v.opfer && !E.leseAngriff(nb, s).ja;
      }
      if (!gerettet && !verpasst) {
        const {group, liberties} = E.floodFill(bb, s);
        verpasst = {zug: u + 1, vorSchlag: v.t - u, groesse: group.length, freiheiten: liberties.length, stein: zuGtp(s),
                    gespielt: m >= 0 ? zuGtp(m) : 'pass'};
      }
    }
    aus.push({schlagZug: v.t + 1, opfer: v.opfer, steine: v.steine.length, stellungen,
              ersteBedrohungVorSchlag: ersteBedrohung === null ? null : v.t - ersteBedrohung, verpasst});
  }
  return aus;
}

function ausDump(p) {
  return p.ereignisse.map(e => ({f: e.farbe === 'S' ? 1 : 2, i: e.idx,
                                 arm: e.farbe === 'S' ? p.armSchwarz : p.armWeiss}));
}

function bericht(eintraege, titel) {
  const n = eintraege.length, mit = eintraege.filter(e => e.verpasst);
  const z = [`${titel}: ${n} Verluste ab ${MIN_STEINE} Steinen, ${eintraege.reduce((x, e) => x + e.steine, 0)} Steine`];
  z.push(`  mit verpasster Rettung, die der Leser sieht: ${mit.length} (${(100 * mit.length / (n || 1)).toFixed(1)} %),`
    + ` ${mit.reduce((x, e) => x + e.steine, 0)} Steine`);
  const vor = mit.map(e => e.verpasst.vorSchlag).sort((a, b) => a - b);
  if (vor.length) z.push(`  Abstand verpasste Rettung → Schlag: Median ${vor[vor.length >> 1]} Halbzüge, `
    + `Freiheiten dabei: ${[1, 2, 3].map(l => `${l}: ${mit.filter(e => e.verpasst.freiheiten === l).length}`).join(', ')}`);
  const ohne = eintraege.filter(e => !e.verpasst);
  z.push(`  ohne lesbare Chance: ${ohne.length} — davon schon bei der ersten Bedrohung verloren `
    + `${ohne.filter(e => e.ersteBedrohungVorSchlag !== null).length}`);
  return z.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  let maxPartien = Infinity, zuegeDatei = null, farbe = null;
  const dateien = [];
  for (let k = 0; k < a.length; k++) {
    if (a[k] === '--max-partien') maxPartien = +a[++k];
    else if (a[k] === '--zuege') zuegeDatei = a[++k];
    else if (a[k] === '--farbe') farbe = a[++k] === 'S' ? 1 : 2;
    else dateien.push(a[k]);
  }
  if (zuegeDatei) {
    const z = fs.readFileSync(zuegeDatei, 'utf8').trim().split(/\s+/)
      .map((s, t) => ({f: t % 2 === 0 ? 1 : 2, i: s === 'pass' ? -1 : vonGtp(s)}));
    const r = analysiere(z).filter(e => !farbe || e.opfer === farbe);
    for (const e of r) console.log(JSON.stringify(e));
    console.log(bericht(r, path.basename(zuegeDatei)));
  } else {
    const je = {A: [], B: []};
    let n = 0;
    for (const d of dateien) for (const zl of fs.readFileSync(d, 'utf8').trim().split('\n')) {
      if (n++ >= maxPartien) break;
      const p = JSON.parse(zl), z = ausDump(p);
      for (const e of analysiere(z)) je[e.opfer === 1 ? p.armSchwarz : p.armWeiss].push(e);
    }
    console.log(`${Math.min(n, maxPartien)} Partien`);
    for (const k of ['A', 'B']) console.log(bericht(je[k], `Arm ${k}`));
    console.log(bericht([...je.A, ...je.B], 'zusammen'));
  }
}

module.exports = {analysiere};
