// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Passregel-Vergleich, Stufe A „Auslösung“ (docs/passregel-vergleich.md §4):
   Reine Rechnung auf Archivdaten, kein GNU Go, keine Partie, kein Spielcode geändert.

   Je Quellpartie werden die Gegnerpässe der Reihe nach geprüft (KI am Zug, danach folgt
   in der Aufzeichnung ein KI-Zug). An jeder geprüften Stellung wird die Voraussetzung
   „Gegner hat unmittelbar davor gepasst“ geprüft (§2) und `passNachGegnerpassPruefung` mit
   Schalter 1, Komi 7,5 und der Wertung (Fläche, Territory) gefragt. Die ERSTE Auslösung je
   Wertung ist die Einheit der Partie. Gleiche Zugfolgen (§10) zählen nur einmal.

   Dieser Prozess hat den Schalter 1; Fortsetzungen laufen in anderen Prozessen mit Schalter 0.

   Aufruf:
     node auswertung/endspiel/passregel-stellungen.js --aus verzeichnis
        --gruppe "name=datei[,datei...]" ...   (Gruppe, Dateien in Reihenfolge)
        [--html index.html] [--max-einheiten N] [--seed 1]
   Ausgabe in --aus: einheiten.jsonl, stufe-a.json, stufe-a.md.
   Endet mit Code 1, wenn eine Pflichtprüfung (§9 Nr. 2) verletzt ist. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./passregel-lib.js');

const WERTUNGEN = ['flaeche', 'territory'];
const GRUENDE = ['ausgelöst', 'nicht ausgespielt', 'ungeklärte Gruppen (Spanne)', 'Vorsprung zu klein'];

/* Engine in diesen Prozess laden, Schalter 1 */
function motor(htmlPfad) {
  const html = fs.readFileSync(htmlPfad, 'utf8');
  const ex = id => {
    const m = new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);
    if (!m) throw new Error(`<script id="${id}"> fehlt in ${htmlPfad}`);
    return m[1];
  };
  globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
  globalThis.document = {getElementById: () => null};
  (0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai')
    + ';globalThis.__PA={PARAMS,removeDeadGroups,BOARD_SIZE,NEIGHBORS,passNachGegnerpassPruefung};');
  const E = globalThis.__PA;
  if (typeof E.passNachGegnerpassPruefung !== 'function') throw new Error('passNachGegnerpassPruefung fehlt in ' + htmlPfad);
  E.PARAMS.passNachGegnerpass = 1;
  return E;
}

/* Zugfolge eines Datensatzes (beginnt S: Schwarz zieht zuerst) */
function folge(r) {
  const erste = r.beginnt === 'S' ? 1 : 2;
  return r.zuege.map((m, i) => ({farbe: i % 2 === 0 ? erste : 3 - erste, punkt: m === 'pass' ? -1 : L.vonGtp(m)}));
}
function gegnerArt(r) {
  const n = r.gegner && r.gegner.name;
  return n === 'fuego' ? 'fuego' : n === 'ki' ? 'ki' : 'gnugo';
}

/* Eine Partie: erste Auslösung je Wertung plus Zählung aller geprüften Stellungen */
function pruefePartie(E, r, statistik) {
  const ki = r.wirFarbe === 'S' ? 1 : 2, zuege = folge(r), N = E.BOARD_SIZE;
  const board = new Uint8Array(N), caps = {1: 0, 2: 0};
  const erste = {flaeche: null, territory: null};
  let paesse = 0, geprueft = 0;
  for (let i = 0; i < zuege.length; i++) {
    const z = zuege[i];
    if (z.punkt < 0) paesse++;
    else { board[z.punkt] = z.farbe; caps[z.farbe] += E.removeDeadGroups(board, 3 - z.farbe, z.punkt); paesse = 0; }
    const kandidat = z.punkt < 0 && z.farbe === 3 - ki && i + 1 < zuege.length && zuege[i + 1].farbe === ki;
    if (!kandidat) continue;
    const v = L.voraussetzung(zuege, i, ki, paesse);
    if (!v.ok) { statistik.voraussetzungVerletzt.push({nr: r.nr, index: i, fehler: v.fehler}); continue; }
    geprueft++;
    for (const w of WERTUNGEN) {
      if (erste[w]) continue;       /* nach der ersten Auslösung wird diese Wertung nicht mehr geprüft */
      const p = E.passNachGegnerpassPruefung(board, ki, {...caps}, {gegnerPasste: true, wertung: w, komi: 7.5});
      if (!p) throw new Error('Prüfung lieferte null bei Schalter 1');
      const grund = p.pass ? 'ausgelöst' : p.grund;
      if (!GRUENDE.includes(grund)) throw new Error('unbekannter Grund: ' + grund);
      statistik.gruende[w][grund]++; statistik.geprueft[w]++;
      /* Kopfwerte aus Sicht der KI; mit/nur wie die Prüfung sie liefert */
      if (p.pass) erste[w] = {index: i, mit: p.mit, nur: p.nur, spanne: p.spanne, gemischt: p.gemischt, caps: {...caps}};
    }
    if (erste.flaeche && erste.territory) break;
  }
  statistik.stellungenGeprueft += geprueft;
  return {zuege, ki, erste};
}

function main() {
  const a = process.argv.slice(2), opt = {aus: null, gruppen: [], html: path.join(__dirname, '..', '..', 'index.html'), max: Infinity, seed: 1};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    if (a[i] === '--aus') { opt.aus = v; i++; }
    else if (a[i] === '--html') { opt.html = v; i++; }
    else if (a[i] === '--seed') { opt.seed = +v; i++; }
    else if (a[i] === '--max-einheiten') { opt.max = +v; i++; }
    else if (a[i] === '--gruppe') { const k = v.indexOf('='); opt.gruppen.push({name: v.slice(0, k), dateien: v.slice(k + 1).split(',')}); i++; }
    else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
  }
  if (!opt.aus || !opt.gruppen.length || !(opt.max > 0)) { console.error('Aufruf: --aus verz --gruppe name=datei[,datei] ... [--html index.html] [--max-einheiten N] [--seed 1]'); process.exit(2); }
  fs.mkdirSync(opt.aus, {recursive: true});
  const E = motor(opt.html);
  const stat = {stellungenGeprueft: 0, voraussetzungVerletzt: [], geprueft: {flaeche: 0, territory: 0},
                gruende: {flaeche: Object.fromEntries(GRUENDE.map(g => [g, 0])), territory: Object.fromEntries(GRUENDE.map(g => [g, 0]))}};
  const gruppenBericht = [], einheiten = [], gesehen = new Map(), duplikate = [];
  const quellen = {gelesen: 0, ausgewertet: 0, uebersprungen: {}};
  const skip = (grund, n = 1) => { quellen.uebersprungen[grund] = (quellen.uebersprungen[grund] || 0) + n; };
  for (const g of opt.gruppen) {
    const zeilenJeDatei = {};
    const gb = {name: g.name, dateien: g.dateien, partien: 0, ausgeloest: {flaeche: 0, territory: 0}, ohneAusloesung: {flaeche: 0, territory: 0},
                farben: {S: {partien: 0, ausgeloest: {flaeche: 0, territory: 0}}, W: {partien: 0, ausgeloest: {flaeche: 0, territory: 0}}}};
    const kand = [];
    for (const datei of g.dateien) {
      const zeilen = L.leseJsonl(datei);
      zeilenJeDatei[datei] = zeilen.length; quellen.gelesen += zeilen.length;
      for (const r of zeilen) {
        if (r.abgebrochen || !Array.isArray(r.zuege) || !r.wirFarbe) { skip('abgebrochen oder unvollständig'); continue; }
        if (r.vorgabe > 0 || r.komi !== 7.5 || (r.vorgabeSteine && r.vorgabeSteine.length)) { skip('Vorgabe oder Komi ≠ 7,5'); continue; }
        quellen.ausgewertet++; gb.partien++;
        const p = pruefePartie(E, r, stat);
        const fb = gb.farben[p.ki === 1 ? 'S' : 'W']; fb.partien++;
        for (const w of WERTUNGEN) if (p.erste[w]) { gb.ausgeloest[w]++; fb.ausgeloest[w]++; } else gb.ohneAusloesung[w]++;
        /* je Stellung eine Einheit; fällt eine Stellung in beiden Wertungen zusammen, ist es eine Einheit */
        const byIdx = new Map();
        for (const w of WERTUNGEN) if (p.erste[w]) {
          const e = byIdx.get(p.erste[w].index) || {index: p.erste[w].index, ausgeloest: {flaeche: false, territory: false}, pruef: {}};
          e.ausgeloest[w] = true; e.pruef[w] = p.erste[w]; byIdx.set(e.index, e);
        }
        for (const e of byIdx.values()) {
          const prefix = p.zuege.slice(0, e.index + 1).map(z => (z.punkt < 0 ? 'pass' : L.zuGtp(z.punkt)));
          const dupKey = p.ki + '|' + prefix.join(',');
          const einheit = {schluessel: `${g.name}|${path.basename(datei)}|${r.nr}|${e.index}`, gruppe: g.name, datei: path.basename(datei),
            quellDatei: datei, nr: r.nr, seedQuelle: r.seed, kiFarbe: p.ki, gegner: gegnerArt(r), gegnerInfo: r.gegner || null,
            index: e.index, komi: 7.5, ausgeloest: e.ausgeloest, pruef: e.pruef, zuege: prefix};
          if (gesehen.has(dupKey)) { duplikate.push({schluessel: einheit.schluessel, gleichWie: gesehen.get(dupKey)}); continue; }
          gesehen.set(dupKey, einheit.schluessel);
          kand.push(einheit);
        }
      }
    }
    gb.zeilenJeDatei = zeilenJeDatei;
    /* Deckel je Gruppe (nur wenn gesetzt): feste Ziehung nach Hash aus Seed und Schlüssel */
    let gewaehlt = kand;
    if (kand.length > opt.max)
      gewaehlt = [...kand].sort((x, y) => L.fnv32(`${opt.seed}|${x.schluessel}`) - L.fnv32(`${opt.seed}|${y.schluessel}`)).slice(0, opt.max);
    gb.einheitenVorDeckel = kand.length; gb.einheiten = gewaehlt.length;
    einheiten.push(...gewaehlt); gruppenBericht.push(gb);
  }
  /* Pflichtprüfung §9 Nr. 2: nichts stillschweigend weglassen */
  const fehler = [];
  const uebersprungen = Object.values(quellen.uebersprungen).reduce((s, x) => s + x, 0);
  if (quellen.gelesen !== quellen.ausgewertet + uebersprungen) fehler.push(`Zeilen ${quellen.gelesen} ≠ ausgewertet ${quellen.ausgewertet} + übersprungen ${uebersprungen}`);
  for (const w of WERTUNGEN) {
    const s = Object.values(stat.gruende[w]).reduce((x, y) => x + y, 0);
    if (s !== stat.geprueft[w]) fehler.push(`${w}: Gründe ${s} ≠ geprüfte Stellungen ${stat.geprueft[w]}`);
  }
  /* Kandidaten ohne die Voraussetzung werden nicht ausgewählt, aber gezählt und aufgelistet (stat.voraussetzungVerletzt). */
  /* Ausgewählte Einheiten haben die Voraussetzung per Konstruktion erfüllt; erneut prüfen */
  for (const e of einheiten) {
    const zz = e.zuege.map((m, i) => ({farbe: (e.index - i) % 2 === 0 ? 3 - e.kiFarbe : e.kiFarbe, punkt: m === 'pass' ? -1 : L.vonGtp(m)}));
    const v = L.voraussetzung(zz, e.index, e.kiFarbe, 1);
    if (!v.ok) fehler.push(`Einheit ${e.schluessel}: ${v.fehler.join('; ')}`);
  }
  fs.writeFileSync(path.join(opt.aus, 'einheiten.jsonl'), einheiten.map(e => JSON.stringify(e)).join('\n') + (einheiten.length ? '\n' : ''));
  const n = w => einheiten.filter(e => e.ausgeloest[w]).length;
  /* Werte an der Auslösung (aus Sicht der KI, wie die Prüfung sie liefert): mit, nur, Spanne, gemischter Anteil */
  const werte = {};
  for (const w of WERTUNGEN) {
    werte[w] = {};
    for (const [name, filter] of [['gesamt', () => true], ['S', e => e.kiFarbe === 1], ['W', e => e.kiFarbe === 2]]) {
      const es = einheiten.filter(e => e.ausgeloest[w] && filter(e));
      const st = key => { const x = es.map(e => e.pruef[w][key]).filter(Number.isFinite); return x.length ? {n: x.length, mittel: L.mittel(x), median: L.median(x), min: Math.min(...x), max: Math.max(...x)} : null; };
      werte[w][name] = {einheiten: es.length, mit: st('mit'), nur: st('nur'), spanne: st('spanne'), gemischt: st('gemischt')};
    }
  }
  const summary = {version: 1, quellen, gruppen: gruppenBericht, stellungenGeprueft: stat.stellungenGeprueft, geprueft: stat.geprueft, gruende: stat.gruende,
    einheiten: {gesamt: einheiten.length, flaeche: n('flaeche'), territory: n('territory')}, werte, duplikate, voraussetzungVerletzt: stat.voraussetzungVerletzt,
    kriterium: {mindestensNBeiNull: L.MIN_N_NULL, flaecheErreicht: n('flaeche') >= L.MIN_N_NULL, territoryErreicht: n('territory') >= L.MIN_N_NULL},
    pflichtfehler: fehler, gueltig: fehler.length === 0, maxEinheitenJeGruppe: Number.isFinite(opt.max) ? opt.max : null};
  fs.writeFileSync(path.join(opt.aus, 'stufe-a.json'), JSON.stringify(summary, null, 1));
  const md = [];
  md.push('# Passregel-Vergleich, Stufe A (Auslösung)', '', 'Reine Rechnung auf Archivdaten (Schalter 1 in diesem Prozess). Keine Partie, kein GNU Go.', '');
  md.push(`Zeilen gelesen: ${quellen.gelesen}, ausgewertet: ${quellen.ausgewertet}; übersprungen: ${JSON.stringify(quellen.uebersprungen)}`, '');
  md.push('| Gruppe | Partien | Einheiten (vor Deckel) | Einheiten | ausgelöst Fläche | ausgelöst Territory | ohne Auslösung Fläche | ohne Auslösung Territory |', '|---|---:|---:|---:|---:|---:|---:|---:|');
  for (const g of gruppenBericht) md.push(`| ${g.name} | ${g.partien} | ${g.einheitenVorDeckel} | ${g.einheiten} | ${g.ausgeloest.flaeche} | ${g.ausgeloest.territory} | ${g.ohneAusloesung.flaeche} | ${g.ohneAusloesung.territory} |`);
  md.push('', '### Aufschlüsselung nach KI-Farbe', '', '| Gruppe | KI-Farbe | Partien | ausgelöst Fläche | ausgelöst Territory |', '|---|---|---:|---:|---:|');
  for (const g of gruppenBericht) for (const f of ['S', 'W']) md.push(`| ${g.name} | ${f === 'S' ? 'Schwarz' : 'Weiß'} | ${g.farben[f].partien} | ${g.farben[f].ausgeloest.flaeche} | ${g.farben[f].ausgeloest.territory} |`);
  const z1 = x => (x ? `${x.mittel.toFixed(1).replace('.', ',')} (Median ${x.median.toFixed(1).replace('.', ',')}; ${x.min.toFixed(1).replace('.', ',')} bis ${x.max.toFixed(1).replace('.', ',')})` : '–');
  const z2 = x => (x ? `${x.mittel.toFixed(3).replace('.', ',')} (max ${x.max.toFixed(3).replace('.', ',')})` : '–');
  md.push('', '### Werte an der Auslösung (aus Sicht der KI: mit Annahmen, nur Bewiesenes, Spanne, gemischter Anteil)', '', '| Wertung | Auswahl | Einheiten | mit | nur | Spanne | gemischt |', '|---|---|---:|---|---|---|---|');
  for (const w of WERTUNGEN) for (const k of ['gesamt', 'S', 'W']) { const x = werte[w][k]; md.push(`| ${w} | ${k === 'gesamt' ? 'alle' : k === 'S' ? 'KI Schwarz' : 'KI Weiß'} | ${x.einheiten} | ${z1(x.mit)} | ${z1(x.nur)} | ${z2(x.spanne)} | ${z2(x.gemischt)} |`); }
  md.push('', `Geprüfte Stellungen (Gegnerpass, KI am Zug): ${stat.stellungenGeprueft}`, '', '| Grund | Fläche | Territory |', '|---|---:|---:|');
  for (const g of GRUENDE) md.push(`| ${g} | ${stat.gruende.flaeche[g]} | ${stat.gruende.territory[g]} |`);
  md.push('', `Einheiten nach Abzug der Duplikate: Fläche ${n('flaeche')}, Territory ${n('territory')} (Einheiten gesamt ${einheiten.length}). Duplikate (gleiche Zugfolge bis zur Stellung, nur einmal gezählt): ${duplikate.length}.`);
  md.push(`Kriterium aus §8: mindestens ${L.MIN_N_NULL} Auslösungen je Wertung bei K = 0: Fläche ${summary.kriterium.flaecheErreicht ? 'erreicht' : 'NICHT erreicht'}, Territory ${summary.kriterium.territoryErreicht ? 'erreicht' : 'NICHT erreicht'}.`);
  md.push('', fehler.length ? '**UNGÜLTIG:** ' + fehler.join(' | ') : 'Pflichtprüfungen Stufe A: bestanden.');
  fs.writeFileSync(path.join(opt.aus, 'stufe-a.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
  if (fehler.length) process.exit(1);
}

if (require.main === module) main();
module.exports = {motor, folge, gegnerArt, pruefePartie, GRUENDE};
