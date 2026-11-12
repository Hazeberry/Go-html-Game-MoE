// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Stufe-2-Werkzeug der Diagonalprüfung (docs/diagonalpruefung-vorabfestlegung.md §16, AP4), ohne echtes GNU Go und ohne die echten Archive:
   eine ATTRAPPE (Zufallspartien mit festen Seeds, Stufe-1-Dateien aus dem Werkzeug von Stufe 1 gerechnet, GNU Go als ausführbares Programm).
     1. Plan: Kontrollstichprobe und Paketzuteilung fest (Hash), unabhängig von der Eingabereihenfolge; jede Kennung genau einmal; betroffen.jsonl
        gleich der abgeleiteten Menge (sonst ungültig); Seeds nur aus festen Angaben (Festwerte).
     2. Ausfallgrenze „mehr als 5 %“ an den Schwellen (32/33 von 658, 53/54 von 1.060, 10/11 von 200).
     3. B1/B2: jede Kette genau einer Zuordnung; Richtung aus der Abweichung bei aus für BEIDE Klassen und BEIDE Richtungen, „gemischt“, B1-Vorrang,
        Kette ohne Abweichung in keiner Menge; Verteilung der 60 Plätze (mindestens 1 je nicht leerer Zelle, Summe, Obergrenze je Zelle).
     4. Ganzer Ablauf durch die eigenen Prozesse (plan, paket, auswerten) mit der Attrappe: Betroffene und Kontrolle, behoben/neu entstanden an einer
        unabhängigen Rechnung, Wiederholbarkeit R1 gleich R2 mit demselben Seed.
     5. Ausfall und Pflichtfehler getrennt: Absturz (Wiederholungsversuch, heilt oder nicht), Timeout, „cannot score“ ohne Wiederholung, nicht wiederholbar;
        abgelehnter Zug, falsches Brett, falsche Fassung der Engine: Pflichtfehler.
     6. Auswertung: fehlendes Paket wird mit Nummer genannt (Exit 1), Paket mit fehlender Kennung, abweichende GNU-Go-Version zwischen Paketen.
     7. Probe: 24 Stellungen nach der Regel (längste S, V350, Kontrolle), keine Tot-Listen, Regel für die Paketgröße einschließlich G unter 36.
     8. Workflow: nur manuell, fail-fast false, Auswertung mit always(), Prüfsumme des ZIP, E-2-Sperre für den Hauptlauf.
   Das echte GNU Go und den Workflow selbst prüft nur ein Lauf in Actions.
   Aufruf:  node tests/diagonal-pruefung-stufe2.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), crypto = require('crypto'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, ladeKI} = require('./rahmen');
const L = require('../auswertung/endspiel/passregel-lib.js');
const B = require('./diagonalauge-brett.js');
const W = require('../auswertung/endspiel/diagonal-pruefung.js');
const S2 = require('../auswertung/endspiel/diagonal-pruefung-stufe2.js');

const wurzel = path.join(__dirname, '..');
const werkzeug = path.join(wurzel, 'auswertung/endspiel/diagonal-pruefung-stufe2.js');
const htmlPfad = path.join(wurzel, 'index.html');
const E = ladeKI({htmlPfad, mitNetz: false});
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diagonal-stufe2-'));
process.on('exit', () => { if (process.env.DIAGONAL_STUFE2_BEHALTEN) { console.log('Arbeitsverzeichnis: ' + tmp); return; } try { fs.rmSync(tmp, {recursive: true, force: true}); } catch (e) { /* egal */ } });
const liesJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const liesJsonl = p => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
const schreibeJsonl = (p, z) => fs.writeFileSync(p, z.map(x => JSON.stringify(x)).join('\n') + '\n');
const lauf = (args, env = {}) => spawnSync(process.execPath, [werkzeug, ...args], {encoding: 'utf8', maxBuffer: 1 << 28, env: {...process.env, ...env}});

/* ── Attrappe: Partien, Stufe-1-Dateien ──────────────────────────────── */
function spiel(seed, laenge) {
  const rnd = L.mulberry32(seed), b = new Uint8Array(361), zuege = [], caps = {1: 0, 2: 0};
  let f = 1;
  for (let k = 0; k < laenge; k++) {
    let ok = false;
    for (let t = 0; t < 30 && !ok; t++) {
      const i = Math.floor(rnd() * 361);
      if (b[i]) continue;
      b[i] = f; const c = E.removeDeadGroups(b, 3 - f, i);
      if (E.floodFill(b, i).liberties.length === 0) { b[i] = 0; continue; }
      caps[f] += c; zuege.push(L.zuGtp(i)); ok = true;
    }
    if (!ok) zuege.push('pass');
    f = 3 - f;
  }
  zuege.push('pass', 'pass');
  return {zuege, caps};
}
const LAENGEN = [340, 330, 360, 300, 355, 380, 320, 372, 348, 364, 250, 262, 285, 310, 335, 352];
function baueGrund() {
  const verz = fs.mkdtempSync(path.join(tmp, 'g-')), daten = path.join(verz, 'daten', 'attrappe');
  fs.mkdirSync(daten, {recursive: true});
  const partien = LAENGEN.map((l, k) => { const sp = spiel(2000 + k * 11, l), ki = (k + 1) % 2 ? 1 : 2;
    return {nr: k + 1, wirFarbe: ki === 1 ? 'S' : 'W', beginnt: 'S', vorgabe: 0, komi: 7.5, vorgabeSteine: [], aufgabe: null, endstand: -10.5, gefangen: {wir: sp.caps[ki], gegner: sp.caps[3 - ki]}, zuege: sp.zuege}; });
  fs.writeFileSync(path.join(daten, 'A.jsonl.gz'), zlib.gzipSync(partien.map(r => JSON.stringify(r)).join('\n') + '\n'));
  const stellungen = [];
  for (const r of partien) {
    const folge = W.folgeAusArchiv(r), sp = W.spielEin(E, folge, [250, 300, 350].filter(i => folge.length > i));
    if (sp.fehler) throw new Error(sp.fehler);
    const basis = {gruppe: 'Gruppe A', quelle: 'attrappe/A.jsonl.gz', nr: r.nr, partie: `Gruppe A|attrappe/A.jsonl.gz|${r.nr}`, kiFarbe: r.wirFarbe === 'S' ? 1 : 2, komi: 7.5};
    stellungen.push({id: `${basis.partie}|S`, art: 'S', ...basis, index: folge.length - 1, brett: B.brettZuText(sp.brett), caps: [sp.caps[1], sp.caps[2]]});
    for (const i of [250, 300, 350]) if (sp.snaps[i]) stellungen.push({id: `${basis.partie}|V${i}`, art: 'V', ...basis, index: i, brett: sp.snaps[i].brett, caps: [sp.snaps[i].caps[1], sp.snaps[i].caps[2]]});
  }
  const htmlSha = sha(fs.readFileSync(htmlPfad)), neu = W.rechnen(E, {stand: 'neu'}, stellungen, htmlSha);
  const jeId = new Map(neu.slice(1).map(z => [z.id, z]));
  const betroffen = stellungen.filter(s => JSON.stringify(jeId.get(s.id).aus.tot) !== JSON.stringify(jeId.get(s.id).an.tot))
    .map(s => ({id: s.id, art: s.art, gruppe: s.gruppe, quelle: s.quelle, nr: s.nr, index: s.index, partie: s.partie, kiFarbe: s.kiFarbe}));
  const s1 = path.join(verz, 'stufe1');
  fs.mkdirSync(s1);
  schreibeJsonl(path.join(s1, 'stellungen.jsonl'), stellungen); schreibeJsonl(path.join(s1, 'neu.jsonl'), neu); schreibeJsonl(path.join(s1, 'betroffen.jsonl'), betroffen);
  return {verz, daten: path.join(verz, 'daten'), s1, stellungen, neu: jeId, betroffen, htmlSha};
}
let GR = null;
const grund = () => GR || (GR = baueGrund());
const planLauf = (verz, extra = []) => { const aus = fs.mkdtempSync(path.join(tmp, 'p-')); const r = lauf(['plan', '--stufe1', grund().s1, '--aus', aus, ...extra]); return {aus, ...r}; };

/* ── Attrappe für GNU Go als ausführbares Programm ───────────────────────
   STUB_DEAD=aus|an|leer|alleSchwarz  (was GNU Go als tot führt; aus/an = Tot-Menge der App ohne/mit Diagonalprüfung)
   STUB_AUSFALL_SEEDS=s1,s2   Absturz (SIGSEGV) bei final_status_list dead, in jedem Prozess
   STUB_HEILT_SEEDS=s1        Absturz nur im ersten Prozess mit diesem Seed (Marker in STUB_MARKER)
   STUB_NICHTWIEDER_SEEDS=s1  zweiter Prozess mit diesem Seed liefert eine andere dead-Liste
   STUB_TIMEOUT_SEEDS=s1      Antwort auf final_status_list alive kommt erst nach 4 s
   STUB_SCORE_SEEDS=s1        final_score antwortet „? cannot score“
   STUB_ABLEHNEN_SEEDS=s1     play wird abgelehnt
   STUB_BRETT_SEEDS=s1        list_stones black lässt einen Stein weg
   STUB_VERSION=text          Ausgabe von --version */
const STUB = abs => `#!/usr/bin/env node
'use strict';
const F = require(${JSON.stringify(path.join(abs, 'auswertung/endspiel/passregel-fortsetzung.js'))});
const L = require(${JSON.stringify(path.join(abs, 'auswertung/endspiel/passregel-lib.js'))});
if (process.argv.includes('--version')) { console.log(process.env.STUB_VERSION || 'GNU Go Attrappe 0.0-test'); process.exit(0); }
const seed = process.argv[process.argv.indexOf('--seed') + 1];
const liste = n => String(process.env[n] || '').split(',').filter(Boolean);
const dabei = n => liste(n).includes(seed);
const fs = require('fs');
const marker = (name) => { const d = process.env.STUB_MARKER; if (!d) return 0; const f = d + '/' + name + '-' + seed; const k = fs.existsSync(f) ? Number(fs.readFileSync(f, 'utf8')) : 0; fs.writeFileSync(f, String(k + 1)); return k; };
const E = F.motor(${JSON.stringify(path.join(abs, 'index.html'))});
const n = E.BOARD_SIZE; let board = new Uint8Array(n), caps = {1: 0, 2: 0};
const out = s => process.stdout.write(s + '\\n\\n');
const farbe = s => (/^b/i.test(s) ? 1 : 2);
const stone = f => new Set([...board.keys()].filter(i => board[i] === f));
let versuch = null;
const tot = () => {
  const m = process.env.STUB_DEAD || 'leer';
  if (m === 'aus') return new Set(Array.from(E.toteSteineAmEnde(board, undefined, undefined, false)).flatMap((t, i) => (t ? [i] : [])));
  if (m === 'an') return new Set(Array.from(E.toteSteineAmEnde(board, undefined, undefined, true)).flatMap((t, i) => (t ? [i] : [])));
  if (m === 'alleSchwarz') return stone(1);
  return new Set();
};
const zb = dead => L.zaehlbestandteile(board, caps, dead, 7.5, E.NEIGHBORS);
const fmt = s => (s > 0 ? 'B+' + s : s < 0 ? 'W+' + (-s) : '0');
const fl = set => { const p = [...set].sort((a, b) => a - b).map(L.zuGtp); const z = []; for (let i = 0; i < p.length; i += 5) z.push(p.slice(i, i + 5).join(' ')); return z.join('\\n'); };
require('readline').createInterface({input: process.stdin}).on('line', l => {
  const t = l.trim().split(/\\s+/);
  switch (t[0]) {
    case 'protocol_version': return out('= 2');
    case 'name': return out('= GNU Go Attrappe');
    case 'version': return out('= 0.0-test');
    case 'boardsize': case 'komi': return out('=');
    case 'clear_board': board = new Uint8Array(n); caps = {1: 0, 2: 0}; return out('=');
    case 'play': {
      if (dabei('STUB_ABLEHNEN_SEEDS')) return out('? illegal move');
      if (t[2].toLowerCase() !== 'pass') { const i = L.vonGtp(t[2]), f = farbe(t[1]); if (board[i]) return out('? occupied'); board[i] = f; caps[f] += E.removeDeadGroups(board, 3 - f, i); }
      return out('=');
    }
    case 'list_stones': {
      const s = stone(t[1] === 'black' ? 1 : 2);
      if (t[1] === 'black' && dabei('STUB_BRETT_SEEDS') && s.size) s.delete([...s][0]);
      return out('= ' + fl(s));
    }
    case 'captures': return out('= ' + caps[t[1] === 'black' ? 1 : 2]);
    case 'final_score': {
      if (dabei('STUB_SCORE_SEEDS')) return out('? cannot score');
      return out('= ' + fmt(zb(tot()).flaeche.stand));
    }
    case 'final_status_list': {
      if (t[1] === 'dead') {
        if (dabei('STUB_AUSFALL_SEEDS')) { process.stderr.write('Attrappe stuerzt ab\\n'); process.kill(process.pid, 'SIGSEGV'); return; }
        if (dabei('STUB_HEILT_SEEDS') && marker('heilt') === 0) { process.stderr.write('Attrappe stuerzt ab\\n'); process.kill(process.pid, 'SIGSEGV'); return; }
        if (dabei('STUB_NICHTWIEDER_SEEDS') && marker('nw') >= 1) { const d = tot(); d.add(0); return out('= ' + fl(d)); }
      }
      if (t[1] === 'alive' && dabei('STUB_TIMEOUT_SEEDS')) return setTimeout(() => out('= '), 4000);
      const d = tot(), z = zb(d);
      const m = {alive: new Set([...board.keys()].filter(i => board[i] && !d.has(i))), dead: d, seki: new Set()};
      return out('= ' + fl(m[t[1]] || new Set()));
    }
    case 'quit': return out('=') || process.exit(0);
    default: return out('? unknown command');
  }
});
`;
let _gnugo = null;
function gnugo() {
  if (_gnugo) return _gnugo;
  const dir = fs.mkdtempSync(path.join(tmp, 'stub-')), p = path.join(dir, 'gnugo');
  fs.writeFileSync(p, STUB(wurzel)); fs.chmodSync(p, 0o755);
  return (_gnugo = p);
}
const seedVon = s => L.fortsetzungsSeed(1, s.gruppe, s.quelle, s.nr, s.index);
function paketLauf(planDatei, teil, aus, env = {}, extra = []) {
  return lauf(['paket', '--plan', planDatei, '--teil', String(teil), '--stufe1', grund().s1, '--archiv', grund().daten, '--aus', aus, '--gnugo', gnugo(), '--html', htmlPfad, '--paket-version', '3.8-test', ...extra], env);
}
function alleLaeufe(planAus, env = {}, extra = []) {
  const plan = liesJson(path.join(planAus, 'plan.json')), dateien = [];
  for (const p of plan.pakete) { const f = path.join(planAus, `teil-${p.nr}.jsonl`); const r = paketLauf(path.join(planAus, 'plan.json'), p.nr, f, env, extra); dateien.push({f, status: r.status, out: r.stdout + r.stderr}); }
  return dateien;
}
function werteAus(planAus, dateien, ausName = 'auswertung') {
  const aus = path.join(planAus, ausName);
  const r = lauf(['auswerten', '--plan', path.join(planAus, 'plan.json'), '--stufe1', grund().s1, '--ergebnisse', dateien.join(','), '--aus', aus]);
  return {aus, ...r, bericht: fs.existsSync(path.join(aus, 'bericht.json')) ? liesJson(path.join(aus, 'bericht.json')) : null};
}
/* eigener Plan aus ausgewählten Kennungen (ein Paket), für Sonderfälle */
function sonderPlan(ids, kategorien = {}, modus = 'haupt') {
  const g = grund(), aus = fs.mkdtempSync(path.join(tmp, 'sp-')), pr = planLauf(g.verz, ['--paketgroesse', '99', '--kontrolle', '2']);
  const plan = liesJson(path.join(pr.aus, 'plan.json'));
  plan.modus = modus; plan.pakete = [{nr: 1, stellungen: ids.map(id => ({id, kategorie: kategorien[id] || 'betroffen'}))}];
  fs.writeFileSync(path.join(aus, 'plan.json'), JSON.stringify(plan));
  return aus;
}

/* ── 1 Plan ───────────────────────────────────────────────────────────── */
test('Attrappe: genug betroffene und unbetroffene Stellungen in S und V', () => {
  const g = grund(), ab = new Set(g.betroffen.map(b => b.id));
  for (const art of ['S', 'V']) {
    const alle = g.stellungen.filter(s => s.art === art);
    pruefe(alle.filter(s => ab.has(s.id)).length >= 2, `${art}: mindestens 2 betroffene (${alle.filter(s => ab.has(s.id)).length})`);
    pruefe(alle.filter(s => !ab.has(s.id)).length >= 4, `${art}: mindestens 4 unbetroffene (${alle.filter(s => !ab.has(s.id)).length})`);
  }
});
test('Plan: alle betroffenen, Kontrolle nur unbetroffen, jede Kennung genau einmal, Paketgröße, byte-gleich bei Wiederholung', () => {
  const g = grund(), ab = new Set(g.betroffen.map(b => b.id));
  const p1 = planLauf(g.verz, ['--paketgroesse', '4', '--kontrolle', '3']), p2 = planLauf(g.verz, ['--paketgroesse', '4', '--kontrolle', '3']);
  pruefeGleich(p1.status, 0, 'Plan gültig: ' + p1.stderr);
  const t1 = fs.readFileSync(path.join(p1.aus, 'plan.json'), 'utf8');
  pruefeGleich(t1, fs.readFileSync(path.join(p2.aus, 'plan.json'), 'utf8'), 'zweiter Lauf byte-gleich');
  const plan = JSON.parse(t1), alle = plan.pakete.flatMap(p => p.stellungen);
  pruefeGleich(new Set(alle.map(x => x.id)).size, alle.length, 'jede Kennung genau einmal');
  pruefeGleich(alle.filter(x => x.kategorie === 'betroffen').length, g.betroffen.length, 'alle betroffenen Stellungen');
  for (const x of alle) pruefe((x.kategorie === 'betroffen') === ab.has(x.id), `${x.id}: Kategorie passt zur Betroffenheit`);
  for (const art of ['S', 'V']) pruefeGleich(alle.filter(x => x.kategorie === 'kontrolle' && g.stellungen.find(s => s.id === x.id).art === art).length, 3, `Kontrolle ${art}: 3`);
  for (const p of plan.pakete.slice(0, -1)) pruefeGleich(p.stellungen.length, 4, 'Blöcke der Paketgröße');
  pruefe(plan.pakete.at(-1).stellungen.length <= 4, 'letztes Paket nicht größer');
  pruefeGleich(liesJson(path.join(p1.aus, 'teile.json')).length, plan.pakete.length, 'teile.json nennt alle Pakete');
  pruefeGleich(plan.erwarteteHtmlSha, g.htmlSha, 'SHA der index.html aus dem Kopf von neu.jsonl');
});
test('Plan: Kontrolle und Paketzuteilung hängen nicht von der Reihenfolge der Eingabe ab, wohl von der Paketgröße nur im Zuschnitt', () => {
  const g = grund(), s1 = S2.ladeStufe1(g.s1);
  const a = S2.erstellePlan(s1, {paketgroesse: 4, kontrolle: 3}).plan;
  const umgekehrt = {...s1, stellungen: [...s1.stellungen].reverse(), betroffen: [...s1.betroffen].reverse()};
  const b = S2.erstellePlan(umgekehrt, {paketgroesse: 4, kontrolle: 3}).plan;
  pruefeGleich(JSON.stringify(a.pakete), JSON.stringify(b.pakete), 'andere Eingabereihenfolge, gleiche Pakete');
  const c = S2.erstellePlan(s1, {paketgroesse: 7, kontrolle: 3}).plan;
  pruefeGleich(JSON.stringify(a.pakete.flatMap(p => p.stellungen)), JSON.stringify(c.pakete.flatMap(p => p.stellungen)), 'andere Paketgröße: gleiche Reihenfolge der Stellungen, nur anderer Zuschnitt');
});
test('Plan ohne Override: Kontrolle gleich viele wie betroffene, mindestens 50 und höchstens 200 (an den Grenzen)', () => {
  const mach = (nB, nU) => { const st = [], neu = new Map(), bet = []; for (let i = 0; i < nB + nU; i++) { const id = `x|${i}|S`; st.push({id, art: 'S', gruppe: 'g', quelle: 'q', nr: i, index: 5, brett: '.'.repeat(361), caps: [0, 0]});
      neu.set(id, {id, aus: {tot: []}, an: {tot: i < nB ? [1] : []}}); if (i < nB) bet.push({id}); }
    return {stellungen: st, neu, neuKopf: {htmlSha256: 'h'}, betroffen: bet, shaDatei: {}}; };
  const zahl = (nB, nU) => { const r = S2.erstellePlan(mach(nB, nU), {}); return r.plan ? r.plan.zahlen.kontrolle.S : 'ungültig: ' + r.gruende.join(' ; '); };
  pruefeGleich(zahl(30, 100), 50, 'wenige Betroffene: Untergrenze 50');
  pruefeGleich(zahl(120, 300), 120, 'dazwischen: gleich viele wie betroffene');
  pruefeGleich(zahl(658, 400), 200, 'viele Betroffene: Obergrenze 200');
  pruefe(/nur 10 unbetroffene/.test(zahl(30, 10)), 'zu wenige unbetroffene Stellungen: ungültig');
});
test('Plan ungültig: betroffen.jsonl ungleich der aus neu.jsonl abgeleiteten Menge, doppelte Kennung, fehlende Stellung', () => {
  const g = grund(), s1 = S2.ladeStufe1(g.s1);
  pruefe(/nicht gleich der aus neu\.jsonl/.test(S2.erstellePlan({...s1, betroffen: s1.betroffen.slice(1)}, {kontrolle: 3}).gruende.join(' ')), 'eine Kennung fehlt');
  pruefe(/doppelte Kennungen in betroffen/.test(S2.erstellePlan({...s1, betroffen: [...s1.betroffen, s1.betroffen[0]]}, {kontrolle: 3}).gruende.join(' ')), 'doppelte Kennung');
  const neu = new Map(s1.neu); neu.delete(s1.stellungen[0].id);
  pruefe(/fehlt in neu\.jsonl/.test(S2.erstellePlan({...s1, neu}, {kontrolle: 3}).gruende.join(' ')), 'Stellung fehlt in neu.jsonl');
  pruefe(/Modus x unbekannt/.test(S2.erstellePlan(s1, {modus: 'x'}).gruende.join(' ')), 'unbekannter Modus');
  const d = fs.mkdtempSync(path.join(tmp, 'ung-')); for (const f of ['stellungen.jsonl', 'neu.jsonl']) fs.copyFileSync(path.join(g.s1, f), path.join(d, f));
  schreibeJsonl(path.join(d, 'betroffen.jsonl'), s1.betroffen.slice(1));
  const r = lauf(['plan', '--stufe1', d, '--aus', path.join(d, 'out'), '--kontrolle', '3']);
  pruefeGleich(r.status, 1, 'Werkzeug endet mit Exit 1'); pruefe(/KEIN URTEIL/.test(r.stderr), 'KEIN URTEIL');
  pruefe(!fs.existsSync(path.join(d, 'out', 'plan.json')), 'kein Plan geschrieben');
});
test('Seed: nur aus festen Angaben (Festwerte), Werkzeug leitet ihn mit fortsetzungsSeed(Basis, Gruppe, Quelle, Nr., Index) ab', () => {
  pruefeGleich(L.fortsetzungsSeed(1, 'Gruppe A', 'attrappe/A.jsonl.gz', 3, 250), L.fortsetzungsSeed(1, 'Gruppe A', 'attrappe/A.jsonl.gz', 3, 250), 'wiederholbar');
  pruefeGleich(L.fortsetzungsSeed(1, 'g', 'a.jsonl', 3, 100), 327905315, 'Festwert der Funktion (wie tests/passregel-vergleich.js, unverändert)');
  pruefeGleich(L.fortsetzungsSeed(1, 'GNU Go ohne Vorgabe', 'leeres-brett/lauf1/g-D.jsonl.gz', 7, 250), 1274344074, 'Festwert mit vollem Quellpfad (Gruppe GNU Go ohne Vorgabe)');
  pruefe(L.fortsetzungsSeed(1, 'GNU Go ohne Vorgabe', 'leeres-brett/lauf1/g-D.jsonl.gz', 7, 250) !== L.fortsetzungsSeed(1, 'GNU Go ohne Vorgabe', 'muster-ohne-vorgabe/lauf1/g-D.jsonl.gz', 7, 250), 'gleicher Dateiname, anderer Ordner: anderer Seed');
  const q = fs.readFileSync(werkzeug, 'utf8');
  pruefe(/L\.fortsetzungsSeed\(plan\.basis, s\.gruppe, s\.quelle, s\.nr, s\.index\)/.test(q), 'Werkzeug leitet den Seed so ab (voller Quellpfad)');
  pruefe(!/fortsetzungsSeed\([^)]*(Date\.now|Math\.random)/.test(q) && !/Math\.random/.test(q), 'kein Seed aus Zeit oder Zufall');
});
test('Ausfallgrenze: mehr als 5 % an den Schwellen', () => {
  for (const [a, n, soll] of [[32, 658, false], [33, 658, true], [53, 1060, false], [54, 1060, true], [10, 200, false], [11, 200, true], [1, 20, false], [2, 20, true], [0, 0, false]])
    pruefeGleich(S2.ueberGrenze(a, n), soll, `${a} von ${n}`);
});

/* ── 2 Ketten, Zellen, Verteilung (rein) ──────────────────────────────── */
/* Brett: jede Kette ein eigener Stein oder eine Zweierkette, weit auseinander, damit die Ketten klar getrennt sind */
const brettMit = (steine) => { const b = Array(361).fill('.'); for (const [i, f] of steine) b[i] = f; return b.join(''); };
test('Kettenzuordnung: jede Kette genau eine Zuordnung; Richtung aus der Abweichung bei aus für BEIDE Klassen und BEIDE Richtungen', () => {
  /* Punkte: a=20 b=60 c=100 d=140 e=180 f=220 g=260 (je Zweierkette mit +1), h=300 */
  const steine = [], kette = (i, f = 'X') => { steine.push([i, f], [i + 1, f]); return [i, i + 1]; };
  const a = kette(20), b = kette(60), c = kette(100), d = kette(140), e = kette(180), f = kette(220), g = kette(260), h = kette(300);
  const appAus = [], appAn = [], gnu = [];
  /* a: unverändert, GNU tot (GNU führt tot, App bei aus und an nicht) */           gnu.push(...a);
  /* b: unverändert, GNU lebend (App bei aus und an tot, GNU lebend) */              appAus.push(...b); appAn.push(...b);
  /* c: behoben, GNU tot (aus nicht, an tot, GNU tot) */                              appAn.push(...c); gnu.push(...c);
  /* d: behoben, GNU lebend (aus tot, an nicht, GNU lebend) */                        appAus.push(...d);
  /* e: gemischt, unverändert: ein Stein GNU tot, der andere App tot, beide bei aus und an abweichend */ gnu.push(e[0]); appAus.push(e[1]); appAn.push(e[1]);
  /* f: B1: f[0] behoben (aus nicht, an tot, GNU tot), f[1] neu entstanden (aus nicht, GNU nicht, an tot) */   appAn.push(f[0], f[1]); gnu.push(f[0]);
  /* g: neu entstanden rein (aus = GNU = nicht tot, an tot) */                       appAn.push(...g);
  /* h: ohne Abweichung (in allen drei Mengen tot) */                                appAus.push(...h); appAn.push(...h); gnu.push(...h);
  const kl = S2.steinKlassen(appAus, appAn, gnu), brett = brettMit(steine);
  const ordne = k => S2.ordneKette(k, kl);
  pruefeGleich(JSON.stringify(ordne(a)), JSON.stringify({menge: 'B2', klasse: 'unveraendert', richtung: 'GNU tot'}), 'a: unverändert abweichend, GNU tot');
  pruefeGleich(JSON.stringify(ordne(b)), JSON.stringify({menge: 'B2', klasse: 'unveraendert', richtung: 'GNU lebend'}), 'b: unverändert abweichend, GNU lebend');
  pruefeGleich(JSON.stringify(ordne(c)), JSON.stringify({menge: 'B2', klasse: 'behoben', richtung: 'GNU tot'}), 'c: behoben, GNU tot');
  pruefeGleich(JSON.stringify(ordne(d)), JSON.stringify({menge: 'B2', klasse: 'behoben', richtung: 'GNU lebend'}), 'd: behoben, GNU lebend');
  pruefeGleich(JSON.stringify(ordne(e)), JSON.stringify({menge: 'B2', klasse: 'unveraendert', richtung: 'gemischt'}), 'e: gemischt');
  pruefeGleich(ordne(f).menge, 'B1', 'f: ein neu entstandener und ein behobener Stein: B1 hat Vorrang');
  pruefeGleich(ordne(g).menge, 'B1', 'g: neu entstanden: B1');
  pruefeGleich(ordne(h).menge, null, 'h: ohne Abweichung: in keiner Menge');
  /* über die ganze Brettfunktion: jede Kette höchstens einmal, B1 und B2 überschneiden sich nicht */
  const r = S2.waehleKetten([{id: 's|1', art: 'S', brett, appTotAus: appAus, appTotAn: appAn, gnuDead: gnu}], 1, 60);
  const alle = [...r.b1, ...r.b2Auswahl].map(k => k.schluessel);
  pruefeGleich(new Set(alle).size, alle.length, 'keine Kette doppelt');
  pruefeGleich(r.b1.length, 2, 'B1: f und g'); pruefeGleich(r.b2Auswahl.length, 5, 'B2: a bis e (weniger als der Deckel: alle)');
  pruefeGleich(Object.keys(r.zellen).sort().join(','), 'S|behoben|GNU lebend,S|behoben|GNU tot,S|unveraendert|GNU lebend,S|unveraendert|GNU tot,S|unveraendert|gemischt', 'fünf Zellen');
  pruefeGleich(r.b1.find(k => k.schluessel === `s|1|${L.zuGtp(f[0])}`).steineNeu, 1, 'f: ein neu entstandener Stein');
});
test('Kettenzuordnung: Kette ohne Abweichung bei aus, aber bei an (nur neu) ist B1; Kette ganz leer gar nicht', () => {
  const kl = S2.steinKlassen([], [5], []);
  pruefeGleich(S2.ordneKette([5, 6], kl).menge, 'B1', 'aus gleich GNU (nicht tot), an tot: neu entstanden');
  pruefeGleich(S2.ordneKette([7, 8], kl).menge, null, 'andere Kette: nichts');
});
test('Verteilung der Plätze: mindestens 1 je nicht leerer Zelle, Summe gleich Deckel, nie mehr als die Zellgröße, deterministisch', () => {
  const v = S2.verteile({a: 100, b: 3, c: 1, d: 0}, 60);
  pruefeGleich(Object.values(v).reduce((t, x) => t + x, 0), 60, 'Summe 60'); pruefe(v.c === 1 && v.b >= 1 && v.b <= 3 && v.a >= 1, 'jede nicht leere Zelle mindestens 1, höchstens ihre Größe'); pruefe(!('d' in v), 'leere Zelle bekommt nichts');
  pruefeGleich(JSON.stringify(S2.verteile({a: 100, b: 3, c: 1}, 60)), JSON.stringify(S2.verteile({c: 1, b: 3, a: 100}, 60)), 'unabhängig von der Reihenfolge der Schlüssel');
  pruefeGleich(JSON.stringify(S2.verteile({a: 10, b: 20}, 60)), JSON.stringify({a: 10, b: 20}), 'höchstens der Deckel: alle');
  const w = S2.verteile({a: 30, b: 30, c: 30, d: 30, e: 30, f: 30, g: 30, h: 30, i: 30, j: 30, k: 30, l: 30}, 60);
  pruefe(Object.values(w).every(x => x === 5), 'gleich große Zellen: gleich viele Plätze');
  const x = S2.verteile({a: 2, b: 1000}, 60); pruefe(x.a >= 1 && x.a <= 2 && x.a + x.b === 60, 'kleine Zelle höchstens ihre Größe, große Zelle nimmt den Rest');
});
test('B2-Ziehung: Hash aus Basis und Kettenschlüssel, höchstens Deckel, unabhängig von der Reihenfolge der Stellungen', () => {
  const g = grund(), nutz = [];
  for (const s of g.stellungen.filter(x => g.betroffen.some(b => b.id === x.id))) { const z = g.neu.get(s.id); nutz.push({id: s.id, art: s.art, brett: s.brett, appTotAus: z.aus.tot, appTotAn: z.an.tot, gnuDead: []}); }
  const alle = S2.waehleKetten(nutz, 1, 100000), zellen = Object.keys(alle.zellen).length, deckel = zellen + 3;
  pruefe(alle.b2Kandidaten > deckel, `die Attrappe hat mehr B2-Kandidaten (${alle.b2Kandidaten}) als Plätze (${deckel}); sonst prüft die Ziehung nichts`);
  const r1 = S2.waehleKetten(nutz, 1, deckel), r2 = S2.waehleKetten([...nutz].reverse(), 1, deckel), r3 = S2.waehleKetten(nutz, 2, deckel);
  pruefeGleich(r1.b2Auswahl.length, deckel, 'genau der Deckel (mindestens 1 je Zelle, Rest nach Größe)');
  pruefeGleich(sha(JSON.stringify(r1)), sha(JSON.stringify(r2)), 'Reihenfolge der Stellungen egal (Prüfsummen des Ergebnisses)');
  pruefe(JSON.stringify(r1.b2Auswahl) !== JSON.stringify(r3.b2Auswahl), 'andere Basis, andere Ziehung');
  for (const z of Object.keys(r1.zellen)) pruefe(r1.b2Auswahl.some(k => k.zelle === z), `Zelle ${z}: mindestens eine Kette gezogen`);
});

/* ── 3 Ganzer Ablauf ──────────────────────────────────────────────────── */
let LAUF_AN = null;
function laufAn() {
  if (LAUF_AN) return LAUF_AN;
  const p = planLauf(grund().verz, ['--paketgroesse', '5', '--kontrolle', '3']), d = alleLaeufe(p.aus, {STUB_DEAD: 'an'});
  const a = werteAus(p.aus, d.map(x => x.f));
  return (LAUF_AN = {p, d, a});
}
test('Ablauf, GNU Go führt tot wie die App MIT Diagonalprüfung: alle Pakete grün, Wiederholbarkeit, Betroffene nur behoben, keine neu entstandenen', () => {
  const {p, d, a} = laufAn(), plan = liesJson(path.join(p.aus, 'plan.json'));
  for (const x of d) pruefeGleich(x.status, 0, 'Paket grün: ' + x.out.slice(0, 200));
  pruefeGleich(a.status, 0, 'Auswertung gültig: ' + (a.stdout || '').slice(0, 600) + a.stderr);
  pruefeGleich(a.bericht.urteil, 'gültig', 'gültig');
  const zeilen = d.flatMap(x => liesJsonl(x.f).slice(1));
  pruefeGleich(zeilen.length, plan.zahlen.gesamt, 'jede Kennung ein Ergebnis');
  pruefe(zeilen.every(z => z.status === 'gueltig' && z.wiederholbar === true), 'alle gültig und wiederholbar (R1 gleich R2 mit demselben Seed)');
  const g = grund();
  for (const z of zeilen) { const s = g.stellungen.find(x => x.id === z.id); pruefeGleich(z.seed, seedVon(s), `${z.id}: Seed gleich fortsetzungsSeed`); pruefeGleich(z.versuche.r1, 1, 'ein Versuch'); pruefe(z.dauerMs.gesamt >= 0, 'Dauer gemessen'); pruefeGleich(JSON.stringify(z.rohR1), JSON.stringify(z.rohR2), 'Rohantworten R1 und R2 gleich'); }
  /* unabhängige Rechnung: Steine behoben und neu entstanden aus den Mengen, ohne die Funktionen des Werkzeugs */
  let behoben = 0, neu = 0;
  for (const z of zeilen.filter(x => x.kategorie === 'betroffen')) {
    const aus = new Set(z.appTot.aus), an = new Set(z.appTot.an), gnu = new Set(z.gnu.dead);
    for (const i of new Set([...aus, ...an, ...gnu])) { const da = aus.has(i) !== gnu.has(i), dn = an.has(i) !== gnu.has(i); if (da && !dn) behoben++; if (!da && dn) neu++; }
  }
  const sA = Object.values(a.bericht.schichtA).filter(k => k.gruppe.startsWith('Summe') && k.kategorie === 'betroffen');
  pruefeGleich(sA.reduce((t, k) => t + k.steine.behoben, 0), behoben, 'Steine behoben gleich unabhängiger Rechnung');
  pruefeGleich(sA.reduce((t, k) => t + k.steine.neu, 0), neu, 'Steine neu entstanden gleich unabhängiger Rechnung');
  pruefeGleich(neu, 0, 'GNU Go = App mit Diagonalprüfung: nichts neu entstanden'); pruefe(behoben > 0, 'etwas behoben (Attrappe hat betroffene Stellungen)');
  pruefeGleich(a.bericht.auswahl.b1, 0, 'B1 leer');
  pruefe(fs.existsSync(path.join(a.aus, 'auswahl-stufe3.json')) && fs.existsSync(path.join(a.aus, 'bericht.md')), 'Bericht und Auswahl geschrieben');
  const md = fs.readFileSync(path.join(a.aus, 'bericht.md'), 'utf8');
  pruefe(/Maßstab dieser Messung, nicht die Wahrheit/.test(md) && /keine Verbesserung/.test(md), 'Bericht nennt GNU Go als Maßstab und keine Verbesserung');
  pruefe(/Kontrolle/.test(md) && /behoben und neu entstanden getrennt/.test(md), 'Kontrolle und getrennte Zahlen');
});
test('Ablauf, GNU Go führt tot wie die App OHNE Diagonalprüfung: Betroffene nur neu entstanden (B1), nichts behoben', () => {
  const p = planLauf(grund().verz, ['--paketgroesse', '99', '--kontrolle', '3']), d = alleLaeufe(p.aus, {STUB_DEAD: 'aus'}), a = werteAus(p.aus, d.map(x => x.f));
  pruefeGleich(a.status, 0, 'gültig: ' + (a.stdout || '').slice(0, 400) + a.stderr);
  const sA = Object.values(a.bericht.schichtA).filter(k => k.gruppe.startsWith('Summe') && k.kategorie === 'betroffen');
  pruefe(sA.reduce((t, k) => t + k.steine.neu, 0) > 0, 'neu entstanden > 0'); pruefeGleich(sA.reduce((t, k) => t + k.steine.behoben, 0), 0, 'nichts behoben');
  pruefe(a.bericht.auswahl.b1 > 0, 'B1 nicht leer'); pruefeGleich(a.bericht.auswahl.b2Kandidaten, 0, 'kein B2-Kandidat (alles bei aus gleich GNU Go)');
  const kon = Object.values(a.bericht.schichtA).filter(k => k.gruppe.startsWith('Summe') && k.kategorie === 'kontrolle');
  pruefeGleich(kon.reduce((t, k) => t + k.steine.behoben + k.steine.neu, 0), 0, 'Kontrolle unbetroffen: nichts ändert sich');
});
test('Ablauf, GNU Go führt nichts tot: unverändert abweichend, B2 mit Zellen, B1 leer', () => {
  const p = planLauf(grund().verz, ['--paketgroesse', '99', '--kontrolle', '3']), d = alleLaeufe(p.aus, {STUB_DEAD: 'leer'}), a = werteAus(p.aus, d.map(x => x.f));
  pruefeGleich(a.status, 1, 'Fallabdeckung: keine dead-Liste in S und V: KEIN URTEIL'); pruefe(/Fallabdeckung/.test(JSON.stringify(a.bericht.gruende)), 'Grund Fallabdeckung');
});

/* ── 4 Ausfall und Pflichtfehler ──────────────────────────────────────── */
const betroffeneIds = () => grund().betroffen.map(b => b.id);
const stellungVon = id => grund().stellungen.find(s => s.id === id);
test('Ausfall: Absturz → genau ein Wiederholungsversuch, dann ungeklärter Ausfall; Absturz einmal → Wiederholung heilt', () => {
  const ids = betroffeneIds().slice(0, 3), [x, y, z] = ids, aus = sonderPlan(ids), plan = path.join(aus, 'plan.json');
  const marker = fs.mkdtempSync(path.join(tmp, 'm-'));
  const r = paketLauf(plan, 1, path.join(aus, 'teil-1.jsonl'), {STUB_DEAD: 'an', STUB_AUSFALL_SEEDS: String(seedVon(stellungVon(x))), STUB_HEILT_SEEDS: String(seedVon(stellungVon(y))), STUB_MARKER: marker});
  pruefeGleich(r.status, 0, 'Ausfall ist kein Pflichtfehler: Paket Exit 0: ' + r.stdout + r.stderr);
  const e = Object.fromEntries(liesJsonl(path.join(aus, 'teil-1.jsonl')).slice(1).map(l => [l.id, l]));
  pruefeGleich(e[x].status, 'ausfall', 'x: Ausfall'); pruefeGleich(e[x].ursache, 'absturz', 'Ursache Absturz'); pruefeGleich(e[x].versuche.r1, 2, 'genau ein Wiederholungsversuch (zwei Versuche)');
  pruefeGleich(e[y].status, 'gueltig', 'y: Wiederholung heilt'); pruefeGleich(e[y].versuche.r1, 2, 'y: zwei Versuche'); pruefe(e[y].ersterVersuch && /Absturz/.test(e[y].ersterVersuch.grund), 'y: erster Versuch festgehalten');
  pruefeGleich(e[z].status, 'gueltig', 'z: unberührt'); pruefeGleich(e[z].versuche.r1, 1, 'z: ein Versuch');
});
test('Ausfall: Timeout (nach Zeitgrenze, ein Wiederholungsversuch), „cannot score“ ohne Wiederholung, nicht wiederholbar', () => {
  const sId = grund().betroffen.find(b => b.art === 'S').id, vIds = grund().betroffen.filter(b => b.art === 'V').map(b => b.id), ids = [vIds[0], sId, vIds[1]], aus = sonderPlan(ids), plan = path.join(aus, 'plan.json');
  const marker = fs.mkdtempSync(path.join(tmp, 'm-'));
  const r = paketLauf(plan, 1, path.join(aus, 'teil-1.jsonl'), {STUB_DEAD: 'an', STUB_TIMEOUT_SEEDS: String(seedVon(stellungVon(ids[0]))), STUB_SCORE_SEEDS: String(seedVon(stellungVon(ids[1]))),
    STUB_NICHTWIEDER_SEEDS: String(seedVon(stellungVon(ids[2]))), STUB_MARKER: marker}, ['--timeout-befehl-ms', '1500']);
  pruefeGleich(r.status, 0, 'Exit 0: ' + r.stdout + r.stderr);
  const e = Object.fromEntries(liesJsonl(path.join(aus, 'teil-1.jsonl')).slice(1).map(l => [l.id, l]));
  pruefeGleich(e[ids[0]].status, 'ausfall', 'Timeout: Ausfall'); pruefeGleich(e[ids[0]].ursache, 'timeout', 'Ursache timeout'); pruefeGleich(e[ids[0]].versuche.r1, 2, 'Timeout: ein Wiederholungsversuch');
  pruefeGleich(e[ids[1]].status, 'ausfall', '„cannot score“: Ausfall'); pruefeGleich(e[ids[1]].ursache, 'ohne Ergebnis', 'Ursache ohne Ergebnis'); pruefeGleich(e[ids[1]].versuche.r1, 1, '„cannot score“: kein Wiederholungsversuch');
  pruefeGleich(e[ids[2]].status, 'ausfall', 'nicht wiederholbar: Ausfall'); pruefeGleich(e[ids[2]].ursache, 'nicht wiederholbar', 'Ursache nicht wiederholbar'); pruefe(e[ids[2]].unterschiede.length > 0, 'Unterschiede genannt');
});
test('Pflichtfehler (kein Ausfall): abgelehnter Archivzug, falsches Brett bei GNU Go, falsche Fassung der Engine', () => {
  const ids = betroffeneIds().slice(0, 2), aus = sonderPlan(ids), plan = path.join(aus, 'plan.json');
  let r = paketLauf(plan, 1, path.join(aus, 'teil-1.jsonl'), {STUB_DEAD: 'an', STUB_ABLEHNEN_SEEDS: String(seedVon(stellungVon(ids[0]))), STUB_BRETT_SEEDS: String(seedVon(stellungVon(ids[1])))});
  pruefeGleich(r.status, 1, 'Pflichtfehler: Exit 1');
  const e = Object.fromEntries(liesJsonl(path.join(aus, 'teil-1.jsonl')).slice(1).map(l => [l.id, l]));
  pruefeGleich(e[ids[0]].status, 'pflichtfehler', 'abgelehnter Zug'); pruefe(/abgelehnt/.test(e[ids[0]].grund), 'Grund: abgelehnt');
  pruefeGleich(e[ids[1]].status, 'pflichtfehler', 'falsches Brett'); pruefe(/Brett von GNU Go/.test(e[ids[1]].grund), 'Grund: Brett');
  /* falsche Fassung: andere index.html als in Stufe 1 */
  const html2 = path.join(aus, 'index-anders.html'); fs.writeFileSync(html2, fs.readFileSync(htmlPfad, 'utf8') + '\n<!-- anders -->\n');
  r = lauf(['paket', '--plan', plan, '--teil', '1', '--stufe1', grund().s1, '--archiv', grund().daten, '--aus', path.join(aus, 'x.jsonl'), '--gnugo', gnugo(), '--html', html2], {STUB_DEAD: 'an'});
  pruefeGleich(r.status, 1, 'andere index.html: Exit 1'); pruefe(/SHA-256/.test(r.stdout + r.stderr) || /SHA-256/.test(JSON.stringify(liesJsonl(path.join(aus, 'x.jsonl'))[0])), 'Grund: SHA-256 der index.html');
  pruefeGleich(liesJsonl(path.join(aus, 'x.jsonl')).length, 1, 'nur der Kopf, keine Stellung gerechnet');
});
test('Pflichtfehler: Einspielen ergibt ein anderes Brett, andere Gefangene oder ein anderes App-Ergebnis als Stufe 1', () => {
  const g = grund(), ids = betroffeneIds().slice(0, 3);
  const mach = (aendere) => {
    const d = fs.mkdtempSync(path.join(tmp, 's1-')); for (const f of ['stellungen.jsonl', 'neu.jsonl', 'betroffen.jsonl']) fs.copyFileSync(path.join(g.s1, f), path.join(d, f));
    aendere(d);
    const aus = path.join(d, 'plan'); fs.mkdirSync(aus);
    const r = lauf(['plan', '--stufe1', d, '--aus', aus, '--paketgroesse', '99', '--kontrolle', '2']); if (r.status !== 0) throw new Error('Plan: ' + r.stderr.slice(0, 200));
    const plan = liesJson(path.join(aus, 'plan.json')); plan.pakete = [{nr: 1, stellungen: ids.map(id => ({id, kategorie: 'betroffen'}))}]; fs.writeFileSync(path.join(aus, 'plan.json'), JSON.stringify(plan));
    const f = path.join(aus, 'teil-1.jsonl');
    const p = lauf(['paket', '--plan', path.join(aus, 'plan.json'), '--teil', '1', '--stufe1', d, '--archiv', g.daten, '--aus', f, '--gnugo', gnugo(), '--html', htmlPfad], {STUB_DEAD: 'an'});
    return {status: p.status, zeilen: Object.fromEntries(liesJsonl(f).slice(1).map(l => [l.id, l]))};
  };
  const aendereStellung = fn => d => { const z = liesJsonl(path.join(d, 'stellungen.jsonl')); fn(z.find(s => s.id === ids[0])); schreibeJsonl(path.join(d, 'stellungen.jsonl'), z); };
  let r = mach(aendereStellung(s => { const i = s.brett.indexOf('.'); s.brett = s.brett.slice(0, i) + 'X' + s.brett.slice(i + 1); }));
  pruefeGleich(r.status, 1, 'anderes Brett: Exit 1'); pruefeGleich(r.zeilen[ids[0]].status, 'pflichtfehler', 'Pflichtfehler'); pruefe(/anderes Brett/.test(r.zeilen[ids[0]].grund), 'Grund: anderes Brett');
  pruefeGleich(r.zeilen[ids[1]].status, 'gueltig', 'andere Stellungen unberührt');
  r = mach(aendereStellung(s => { s.caps = [s.caps[0] + 1, s.caps[1]]; }));
  pruefeGleich(r.zeilen[ids[0]].status, 'pflichtfehler', 'andere Gefangene: Pflichtfehler'); pruefe(/andere Gefangene/.test(r.zeilen[ids[0]].grund), 'Grund: Gefangene');
  r = mach(d => { const z = liesJsonl(path.join(d, 'neu.jsonl')); const e = z.find(l => l.id === ids[0]); if (e.aus.zaehl) e.aus.zaehl.flaeche.stand += 1; else e.aus.vorschau.flaeche.standMit += 1; schreibeJsonl(path.join(d, 'neu.jsonl'), z); });
  pruefeGleich(r.zeilen[ids[0]].status, 'pflichtfehler', 'anderes App-Ergebnis: Pflichtfehler'); pruefe(/neu\.jsonl/.test(r.zeilen[ids[0]].grund), 'Grund: weicht von neu.jsonl ab');
});
test('Auswertung: Pflichtfehler und Ausfall über der Grenze machen den Lauf ungültig (KEIN URTEIL, Exit 1), jeder Ausfall steht einzeln im Bericht', () => {
  const ids = betroffeneIds().slice(0, 3), aus = sonderPlan(ids), plan = path.join(aus, 'plan.json'), f = path.join(aus, 'teil-1.jsonl');
  paketLauf(plan, 1, f, {STUB_DEAD: 'an', STUB_AUSFALL_SEEDS: String(seedVon(stellungVon(ids[0])))});
  const a = werteAus(aus, [f]);
  pruefeGleich(a.status, 1, 'ungültig: Exit 1'); pruefeGleich(a.bericht.urteil, 'KEIN URTEIL', 'KEIN URTEIL');
  pruefe(/Ausfallgrenze/.test(JSON.stringify(a.bericht.gruende)), 'Grund: Ausfallgrenze (1 von 3 ist mehr als 5 %)');
  pruefeGleich(a.bericht.ausfaelle.length, 1, 'der Ausfall steht einzeln im Bericht'); pruefe(a.bericht.ausfaelle[0].ursache === 'absturz' && a.bericht.ausfaelle[0].totMengeUnterschied, 'mit Ursache und Unterschied der Tot-Mengen');
  const ids2 = betroffeneIds().slice(0, 2), aus2 = sonderPlan(ids2), f2 = path.join(aus2, 'teil-1.jsonl');
  paketLauf(path.join(aus2, 'plan.json'), 1, f2, {STUB_DEAD: 'an', STUB_ABLEHNEN_SEEDS: String(seedVon(stellungVon(ids2[0])))});
  const b = werteAus(aus2, [f2]);
  pruefeGleich(b.status, 1, 'Pflichtfehler: ungültig'); pruefe(/Pflichtfehler/.test(JSON.stringify(b.bericht.gruende)), 'Grund: Pflichtfehler');
});

/* ── 4b Laufzeitstatistik, Duplikate im Paket, Status jeder Zeile ───────── */
test('Probe: auch ein Ausfall schon bei R1 (zweimal Timeout) steht mit seiner Gesamtzeit in der Laufzeitstatistik', () => {
  const vIds = grund().betroffen.filter(b => b.art === 'V').map(b => b.id), ids = vIds.slice(0, 3), aus = sonderPlan(ids, {}, 'probe'), plan = path.join(aus, 'plan.json'), f = path.join(aus, 'teil-1.jsonl');
  const r = paketLauf(plan, 1, f, {STUB_DEAD: 'an', STUB_TIMEOUT_SEEDS: String(seedVon(stellungVon(ids[0])))}, ['--timeout-befehl-ms', '1500']);
  pruefeGleich(r.status, 0, 'Ausfall ist kein Pflichtfehler: ' + r.stdout + r.stderr);
  const e = Object.fromEntries(liesJsonl(f).slice(1).map(l => [l.id, l]));
  pruefeGleich(e[ids[0]].status, 'ausfall', 'R1 zweimal Timeout: Ausfall'); pruefeGleich(e[ids[0]].ursache, 'timeout', 'Ursache Timeout'); pruefeGleich(e[ids[0]].versuche.r1, 2, 'zwei Versuche bei R1');
  pruefe(e[ids[0]].dauerMs && e[ids[0]].dauerMs.gesamt >= 3000, 'Gesamtzeit schon beim frühen Rücksprung gesetzt (mindestens 2 × 1,5 s): ' + JSON.stringify(e[ids[0]].dauerMs));
  pruefeGleich(e[ids[0]].dauerMs.r2, undefined, 'R2 lief nicht');
  const a = werteAus(aus, [f]);
  pruefeGleich(a.status, 0, 'Probe gültig (Ausfälle machen die Probe nicht ungültig): ' + (a.stdout || '').slice(0, 300) + a.stderr);
  pruefeGleich(a.bericht.dauerSekundenJeStellung.alle.n, 3, 'alle drei Stellungen in der Statistik, auch der Ausfall');
  pruefe(a.bericht.dauerSekundenJeStellung.alle.max >= 3, 'das Maximum ist die langsame Stellung (mindestens 3 s), nicht die schnellen');
  pruefe(a.bericht.dauerSekundenJeStellung.alle.max === Math.max(...Object.values(e).map(l => l.dauerMs.gesamt)) / 1000, 'Maximum gleich dem größten Wert der Ergebniszeilen');
});
test('Auswertung: doppelte Kennung innerhalb eines Pakets wird erkannt, auch wenn alle geplanten Kennungen vorhanden sind', () => {
  const ids = grund().betroffen.filter(b => b.art === 'V').map(b => b.id).slice(0, 3), aus = sonderPlan(ids), plan = path.join(aus, 'plan.json'), f = path.join(aus, 'teil-1.jsonl');
  paketLauf(plan, 1, f, {STUB_DEAD: 'an'});
  const ok = werteAus(aus, [f], 'ok');
  pruefeGleich(ok.status, 0, 'Ausgangslage gültig: ' + (ok.stdout || '').slice(0, 300) + ok.stderr);
  const z = liesJsonl(f), dup = path.join(aus, 'dup.jsonl'); schreibeJsonl(dup, [...z, z[2]]);
  const a = werteAus(aus, [dup], 'dup');
  pruefeGleich(a.status, 1, 'doppelte Kennung: Exit 1'); pruefeGleich(a.bericht.urteil, 'KEIN URTEIL', 'KEIN URTEIL');
  pruefe(/mehrfach im Paket 1/.test(JSON.stringify(a.bericht.gruende)), 'Grund: mehrfach im Paket 1');
  const dup2 = path.join(aus, 'dup2.jsonl'); schreibeJsonl(dup2, [z[0], z[1], z[1]]);
  pruefe(/mehrfach/.test(JSON.stringify(werteAus(aus, [dup2], 'dup2').bericht.gruende)), 'auch eine Kennung doppelt statt der fehlenden');
});
test('Auswertung: jede Ergebniszeile braucht einen bekannten Status und die zugehörigen Felder (sonst KEIN URTEIL)', () => {
  const ids = grund().betroffen.filter(b => b.art === 'V').map(b => b.id).slice(0, 3), aus = sonderPlan(ids), plan = path.join(aus, 'plan.json'), f = path.join(aus, 'teil-1.jsonl');
  paketLauf(plan, 1, f, {STUB_DEAD: 'an'});
  const z = liesJsonl(f);
  const pruefeVariante = (name, aendere, muster) => {
    const k = z.map(l => JSON.parse(JSON.stringify(l))); aendere(k[1]);
    const d = path.join(aus, `status-${name}.jsonl`); schreibeJsonl(d, k);
    const a = werteAus(aus, [d], name);
    pruefeGleich(a.status, 1, `${name}: Exit 1`); pruefeGleich(a.bericht.urteil, 'KEIN URTEIL', `${name}: KEIN URTEIL`); pruefe(muster.test(JSON.stringify(a.bericht.gruende)), `${name}: Grund ${muster}: ${JSON.stringify(a.bericht.gruende).slice(0, 200)}`);
  };
  pruefeVariante('unbekannt', l => { l.status = 'fertig'; }, /Status .{1,3}fertig.{1,3} ist unbekannt/);
  pruefeVariante('fehlt', l => { delete l.status; }, /unbekannt oder fehlt/);
  pruefeVariante('ohne-dauer', l => { delete l.dauerMs; }, /Dauer fehlt/);
  pruefeVariante('nicht-wiederholbar', l => { l.wiederholbar = false; }, /nicht als wiederholbar belegt/);
  pruefeVariante('ohne-liste', l => { delete l.gnu; }, /ohne GNU-Go-Liste/);
  pruefeVariante('ausfall-ohne-ursache', l => { l.status = 'ausfall'; delete l.ursache; }, /Ausfall ohne Ursache/);
  pruefeVariante('pflichtfehler-ohne-grund', l => { l.status = 'pflichtfehler'; delete l.grund; }, /Pflichtfehler ohne Grund/);
  pruefeGleich(werteAus(aus, [f], 'unveraendert').status, 0, 'unveränderte Datei bleibt gültig');
});

/* ── 5 Pakete fehlen, unvollständig, Versionen ────────────────────────── */
test('Auswertung: fehlendes Paket wird mit Nummer genannt und der Lauf endet rot; Paket ohne Kennung; abweichende GNU-Go-Version', () => {
  const p = planLauf(grund().verz, ['--paketgroesse', '5', '--kontrolle', '3']), plan = liesJson(path.join(p.aus, 'plan.json'));
  pruefe(plan.pakete.length >= 3, 'mindestens 3 Pakete');
  const d = alleLaeufe(p.aus, {STUB_DEAD: 'an'}).map(x => x.f);
  const a = werteAus(p.aus, d.slice(1), 'fehlt');
  pruefeGleich(a.status, 1, 'Paket 1 fehlt: Exit 1'); pruefeGleich(a.bericht.kontrollen[0].fehlendePakete.join(','), '1', 'fehlendes Paket benannt');
  pruefe(/Paket 1 fehlt/.test(a.bericht.kontrollen[0].fehler[0]) && /\|S\b|\|V\d+/.test(a.bericht.kontrollen[0].fehler[0]), 'mit Anzahl und Kennungen');
  pruefe(/fehlt/.test(fs.readFileSync(path.join(a.aus, 'bericht.md'), 'utf8')), 'Bericht nennt es');
  /* Paket ohne eine Kennung */
  const t2 = liesJsonl(d[1]); const kaputt = path.join(p.aus, 'kaputt.jsonl'); schreibeJsonl(kaputt, t2.slice(0, -1));
  const b = werteAus(p.aus, [d[0], kaputt, ...d.slice(2)], 'luecke');
  pruefeGleich(b.status, 1, 'Kennung fehlt: Exit 1'); pruefe(/fehlt im Paket 2/.test(JSON.stringify(b.bericht.gruende)), 'fehlende Kennung benannt');
  /* andere GNU-Go-Version in einem Paket */
  const c0 = liesJsonl(d[0]); c0[0].kopf.gnugoVersionAusgabe = 'GNU Go 3.9'; const v = path.join(p.aus, 'version.jsonl'); schreibeJsonl(v, c0);
  const c = werteAus(p.aus, [v, ...d.slice(1)], 'version');
  pruefeGleich(c.status, 1, 'Version verschieden: Exit 1'); pruefe(/gnugoVersionAusgabe/.test(JSON.stringify(c.bericht.gruende)), 'Grund: GNU-Go-Version');
  /* Seed gefälscht */
  const e0 = liesJsonl(d[0]); e0[1].seed = 12345; const sf = path.join(p.aus, 'seed.jsonl'); schreibeJsonl(sf, e0);
  const s = werteAus(p.aus, [sf, ...d.slice(1)], 'seed');
  pruefeGleich(s.status, 1, 'falscher Seed: Exit 1'); pruefe(/Seed/.test(JSON.stringify(s.bericht.gruende)), 'Grund: Seed');
});

/* ── 6 Probe ──────────────────────────────────────────────────────────── */
test('Probe: 10 betroffene S mit dem höchsten Zugindex, betroffene V350, 2 + 2 Kontrolle, ein Paket, Auswahl nur nach Index und Hash', () => {
  const g = grund(), ab = new Set(g.betroffen.map(b => b.id));
  const p = planLauf(g.verz, ['--modus', 'probe', '--kontrolle', '3']), plan = liesJson(path.join(p.aus, 'plan.json'));
  pruefeGleich(p.status, 0, 'Plan: ' + p.stderr); pruefeGleich(plan.pakete.length, 1, 'ein Paket');
  const x = plan.pakete[0].stellungen, art = id => stellungVon(id).art;
  const bS = x.filter(y => y.kategorie === 'betroffen' && art(y.id) === 'S'), bV = x.filter(y => y.kategorie === 'betroffen' && art(y.id) === 'V');
  const alleS = g.stellungen.filter(s => s.art === 'S' && ab.has(s.id)).sort((a, b) => b.index - a.index);
  pruefeGleich(bS.length, Math.min(10, alleS.length), 'betroffene S: höchstens 10');
  pruefe(bS.every(y => stellungVon(y.id).index >= alleS[bS.length - 1].index), 'die längsten (höchster Zugindex)');
  pruefe(bV.length <= 10 && bV.every(y => stellungVon(y.id).index === 350), 'betroffene V nur V350');
  pruefeGleich(x.filter(y => y.kategorie === 'kontrolle' && art(y.id) === 'S').length, 2, '2 Kontrolle S'); pruefeGleich(x.filter(y => y.kategorie === 'kontrolle' && art(y.id) === 'V').length, 2, '2 Kontrolle V');
  pruefeGleich(plan.modus, 'probe', 'Modus im Plan');
});
test('Probe: keine Tot-Listen und keine Schicht-A-Zahlen in Ergebnis und Bericht; nur Dauer, Status und technische Kontrollen', () => {
  const p = planLauf(grund().verz, ['--modus', 'probe', '--kontrolle', '3']), d = alleLaeufe(p.aus, {STUB_DEAD: 'an'}), a = werteAus(p.aus, d.map(x => x.f));
  pruefeGleich(d[0].status, 0, 'Paket grün: ' + d[0].out.slice(0, 300)); pruefeGleich(a.status, 0, 'Probe gültig: ' + (a.stdout || '').slice(0, 300) + a.stderr);
  const roh = fs.readFileSync(d[0].f, 'utf8');
  pruefe(!/"dead"|"rohR1"|"gnu"|"appTot"/.test(roh), 'Ergebnisdatei ohne Tot-Listen');
  pruefe(!/schichtA/.test(JSON.stringify(a.bericht)) && !a.bericht.schichtA, 'Bericht ohne Schicht A'); pruefe(!/behoben/.test(fs.readFileSync(path.join(a.aus, 'bericht.md'), 'utf8')), 'Bericht ohne Zahlen zu behoben oder neu entstanden');
  pruefe(a.bericht.dauerSekundenJeStellung.alle.n > 0 && typeof a.bericht.paketgroesseRegel === 'string', 'Dauer und Regel für die Paketgröße');
  pruefe(!fs.existsSync(path.join(a.aus, 'auswahl-stufe3.json')), 'keine Auswahl für Stufe 3');
});
test('Paketgrößenregel der Probe: 50 bleibt, G ≥ 36 gilt, G < 36 verlangt die Neuentscheidung (36 wird nicht eingesetzt)', () => {
  const basis = {gueltig: true, urteil: 'gültig', gruende: [], kontrollen: [], modus: 'probe', plan: {basis: 1, paketgroesse: 24, zahlen: {gesamt: 24, betroffen: {S: 10, V: 10}, kontrolle: {S: 2, V: 2}}}};
  const mit = sek => S2.probeBericht(basis, [{art: 'S', dauerMs: {gesamt: sek * 1000}}], []).bericht.paketgroesseRegel;
  pruefe(/Paketgröße 50 bleibt/.test(mit(60)), '60 s: 60 × 50 = 3.000 s ≤ 3.600 s: 50 bleibt');
  pruefe(/G = 45 \(≥ 36\): Paketgröße 45/.test(mit(80)), '80 s: G = 45, ≥ 36: Paketgröße 45');
  const r = mit(120);
  pruefe(/G = 30 < 36/.test(r) && /NEU ENTSCHIEDEN/.test(r) && /36 wird nicht eingesetzt/.test(r), '120 s: G = 30 < 36: Paketgrenze neu entscheiden, 36 nicht eingesetzt');
  pruefe(!/Paketgröße 36/.test(r), 'nie die 36 als Größe');
  pruefe(/keine Dauer gemessen/.test(S2.probeBericht(basis, [], []).bericht.paketgroesseRegel), 'ohne Dauer keine Regel');
});

/* ── 7 Workflow ───────────────────────────────────────────────────────── */
test('Workflow: nur manuell, fail-fast false, Auswertung mit always(), Prüfsumme des ZIP, E-2-Sperre für den Hauptlauf, GNU Go nur im Paketjob', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagonal-pruefung-stufe2.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(y) && !/\n  (push|pull_request|schedule):/.test(y), 'nur workflow_dispatch');
  pruefe(/fail-fast: false/.test(y), 'fail-fast: false');
  pruefe(/ergebnis:[\s\S]*?if: \$\{\{ always\(\)/.test(y), 'Auswertungsjob mit always()');
  pruefe(/actions\/upload-artifact@v7\n\s+if: always\(\)/.test(y), 'Ergebnisse mit if: always() hochladen');
  pruefe(/sha256sum/.test(y) && /diagonal-pruefung-stufe1\.zip/.test(y) && /8c835dfb5b6ed7cb5af951de92351de2fd67643151025ab56fad51a89c133740/.test(y), 'ZIP gegen SHA-256 geprüft (Wert gebunden)');
  pruefe(/runs-on: ubuntu-24\.04/.test(y) && !/runs-on: ubuntu-latest/.test(y), 'ubuntu-24.04');
  pruefe(/e2_entschieden/.test(y) && /Hauptlauf/.test(y), 'E-2-Sperre für den Hauptlauf');
  pruefe(/FEHLENDE PAKETE|fehlende Pakete/i.test(y) || /auswerten/.test(y), 'Auswertung nennt fehlende Pakete');
  pruefe(/\|\| status=\$\?/.test(y), 'Exit-Codes mit || status=$? abgefangen (bash -e)');
  pruefe(!/cancel-in-progress: true/.test(y), 'laufende Läufe werden nicht abgebrochen');
  const teile = y.split(/\n  (?=[a-z0-9_-]+:\n    name:)/), gnuJobs = teile.filter(t => /apt-get install[^\n]*gnugo/.test(t));
  pruefeGleich(gnuJobs.length, 1, 'GNU Go wird in genau einem Job installiert (Paketjob)'); pruefe(/Paket/.test(gnuJobs[0].split('\n')[1] || '') || /matrix/.test(gnuJobs[0]), 'und das ist der Matrix-Job');
  const yaml = spawnSync('python3', ['-c', 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))', path.join(wurzel, '.github/workflows/diagonal-pruefung-stufe2.yml')], {encoding: 'utf8'});
  pruefe(yaml.status === 0 || /No module named/.test(yaml.stderr), 'YAML lesbar: ' + yaml.stderr);
});
test('Werkzeug: keine Spieländerung, kein Eingriff in den Stand von Stufe 1', () => {
  const q = fs.readFileSync(werkzeug, 'utf8');
  pruefe(!/writeFileSync\([^)]*index\.html/.test(q), 'schreibt keine index.html');
  pruefe(/E\.PARAMS\.diagonalAugeEnde !== 0/.test(q), 'verlangt den Standard 0 des Schalters');
  pruefe(/plan\.erwarteteHtmlSha/.test(q), 'bindet die Fassung der index.html an Stufe 1');
});

laufeTests('Diagonalprüfung Stufe 2: Werkzeug (Attrappe, ohne echtes GNU Go)');
