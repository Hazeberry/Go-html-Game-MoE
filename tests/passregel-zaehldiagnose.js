// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zähldiagnose einer Stellung (docs/passregel-zaehldiagnose.md), ohne echtes GNU Go und ohne Messung:
     1. Zählbestandteile (Steine, Gebiet, neutral, tote Steine, Gefangene) stimmen mit `zaehleMitTotListe` überein
        (200 Zufallsbretter) und decken jeden Punkt genau einmal ab.
     2. Rohantworten: das GTP-Protokoll des Werkzeugs gibt Antworten unverändert wieder (Mehrzeiliges, Leerzeichen,
        „= “-Präfix, Fehlerantwort „?“).
     3. Das ganze Werkzeug gegen eine Attrappe als ausführbares Programm: Einheit, Seed und GNU-Go-Argumente sind
        dieselben wie in der Fortsetzung (gleiche Funktionen, im Quelltext gebunden), vollständige Zugfolge samt
        SHA-256, genaue Befehlsfolge, Version, Wiederholbarkeit, getrennte Zählbestandteile.
     4. Abweichung reproduziert / nicht reproduziert ist ein Ergebnis, keine Ungültigkeit; Punktabweichungen werden
        gefunden.
     5. Ungültig, nie ein Urteil: nicht wiederholbare Antworten, abgelehnter Zug, falsche Stellung (Index).
   Das echte GNU Go läuft nur in GitHub Actions.

   Aufruf:  node tests/passregel-zaehldiagnose.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const L = require('../auswertung/endspiel/passregel-lib.js');
const F = require('../auswertung/endspiel/passregel-fortsetzung.js');
const S = require('../auswertung/endspiel/passregel-stellungen.js');
const Z = require('../auswertung/endspiel/passregel-zaehldiagnose.js');

const wurzel = path.join(__dirname, '..');
const werkzeug = path.join(wurzel, 'auswertung/endspiel/passregel-zaehldiagnose.js');
const html = path.join(wurzel, 'index.html');
let _E = null;
const engine = () => _E || (_E = S.motor(html));

/* Attrappe als ausführbares Programm: spielt echte Regeln (Engine-Funktionen), antwortet mit Rohtext wie GNU Go.
   Verhalten über Umgebungsvariablen: STUB_TOT=alleSchwarz, STUB_FINAL_OHNE_TOT=1, STUB_ZUFALL=1, STUB_ABLEHNEN=<Punkt>,
   STUB_DAME_FALSCH=1 (ein Schwarz-Gebietspunkt wird als Dame gemeldet). */
const STUB = abs => `#!/usr/bin/env node
'use strict';
const F = require(${JSON.stringify(path.join(abs, 'auswertung/endspiel/passregel-fortsetzung.js'))});
const L = require(${JSON.stringify(path.join(abs, 'auswertung/endspiel/passregel-lib.js'))});
if (process.argv.includes('--version')) { console.log('GNU Go Attrappe 0.0-test\\nLizenz egal'); process.exit(0); }
const E = F.motor(${JSON.stringify(path.join(abs, 'index.html'))});
const n = E.BOARD_SIZE; let board = new Uint8Array(n), caps = {1: 0, 2: 0};
const out = s => process.stdout.write(s + '\\n\\n');
const farbe = s => (/^b/i.test(s) ? 1 : 2);
const stone = f => new Set([...board.keys()].filter(i => board[i] === f));
const tot = () => (process.env.STUB_TOT === 'alleSchwarz' ? stone(1) : new Set());
const zb = dead => L.zaehlbestandteile(board, caps, dead, 7.5, E.NEIGHBORS);
const fmt = s => (s > 0 ? 'B+' + s : s < 0 ? 'W+' + (-s) : '0');
const liste = set => { const p = [...set].sort((a, b) => a - b).map(L.zuGtp); const z = []; for (let i = 0; i < p.length; i += 5) z.push(p.slice(i, i + 5).join(' ')); return z.join('\\n'); };
let gaukelDame = null;
require('readline').createInterface({input: process.stdin}).on('line', l => {
  const t = l.trim().split(/\\s+/);
  if (process.env.STUB_FEHLER_BEI && l.trim() === process.env.STUB_FEHLER_BEI) return out('? cannot do that');
  switch (t[0]) {
    case 'protocol_version': return out('= 2');
    case 'name': return out('= GNU Go Attrappe');
    case 'version': return out('= 0.0-test');
    case 'boardsize': case 'komi': return out('=');
    case 'clear_board': board = new Uint8Array(n); caps = {1: 0, 2: 0}; return out('=');
    case 'play': {
      if (process.env.STUB_ABLEHNEN && t[2] === process.env.STUB_ABLEHNEN) return out('? illegal move');
      if (t[2].toLowerCase() !== 'pass') { const i = L.vonGtp(t[2]), f = farbe(t[1]); if (board[i]) return out('? occupied'); board[i] = f; caps[f] += E.removeDeadGroups(board, 3 - f, i); }
      return out('=');
    }
    case 'list_stones': return out('= ' + liste(stone(t[1] === 'black' ? 1 : 2)));
    case 'captures': return out('= ' + caps[t[1] === 'black' ? 1 : 2]);
    case 'final_score': {
      if (process.env.STUB_SCHLECHT === 'score') return out('= B+1.2.3');
      const s = zb(process.env.STUB_FINAL_OHNE_TOT ? new Set() : tot()).flaeche.stand + (process.env.STUB_ZUFALL ? Math.floor(Math.random() * 90) / 10 : 0);
      return out('= ' + fmt(s));
    }
    case 'final_status_list': {
      const d = tot(), z = zb(d), leer = o => new Set([...board.keys()].filter(i => !board[i] && z.besitzer[i] === o));
      const bt = leer(1), wt = leer(2), dame = leer(0);
      if (process.env.STUB_DAME_FALSCH && bt.size) { const p = [...bt][0]; bt.delete(p); dame.add(p); }
      const m = {alive: new Set([...board.keys()].filter(i => board[i] && !d.has(i))), dead: d, seki: new Set(), black_territory: bt, white_territory: wt, dame};
      return out('= ' + liste(m[t[1]] || new Set()));
    }
    case 'showboard': return out('= \\n    A B C D\\n 19 . . . .');
    case 'quit': return out('=') || process.exit(0);
    default: return out('? unknown command');
  }
});
`;

function werkstatt() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'zdiag-')), gnugo = path.join(dir, 'gnugo');
  fs.writeFileSync(gnugo, STUB(wurzel)); fs.chmodSync(gnugo, 0o755);
  return {dir, gnugo};
}
function handPartie() {
  const txt = fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', 'hand-427.sgf'), 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g, zuege = [];
  let m; while ((m = re.exec(txt))) zuege.push(m[2] ? L.zuGtp((m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97)) : 'pass');
  return {nr: 1, seed: 1, wirFarbe: 'S', beginnt: 'S', vorgabe: 0, komi: 7.5, vorgabeSteine: [], endstand: 67.5, zuege};
}
function erstenIndex(E, r) {
  const stat = {stellungenGeprueft: 0, voraussetzungVerletzt: [], geprueft: {flaeche: 0, territory: 0}, gruende: {flaeche: Object.fromEntries(S.GRUENDE.map(g => [g, 0])), territory: Object.fromEntries(S.GRUENDE.map(g => [g, 0]))}};
  E.PARAMS.passNachGegnerpass = 1; try { return S.pruefePartie(E, r, stat).erste.flaeche.index; } finally { E.PARAMS.passNachGegnerpass = 0; }
}
function lauf(w, aus, index, env = {}, extra = []) {
  const archiv = path.join(w.dir, 'archiv.jsonl'); if (!fs.existsSync(archiv)) fs.writeFileSync(archiv, JSON.stringify(handPartie()) + '\n');
  const r = spawnSync(process.execPath, [werkzeug, '--datei', archiv, '--gruppe', 'hand', '--nr', '1', '--index', String(index), '--aus', aus, '--gnugo', w.gnugo, '--html', html, '--paket-version', '3.8-test', ...extra],
    {encoding: 'utf8', env: {...process.env, ...env}});
  const j = fs.existsSync(path.join(aus, 'zaehldiagnose.json')) ? JSON.parse(fs.readFileSync(path.join(aus, 'zaehldiagnose.json'), 'utf8')) : null;
  return {status: r.status, stdout: r.stdout, stderr: r.stderr, j};
}

/* finalAreaScore und finalTerritoryScore aus index.html schneiden (wie tests/passregel-vergleich.js) */
function appFunktionenTest(E) {
  const quelle = fs.readFileSync(html, 'utf8');
  const bau = (name, state) => {
    const m = new RegExp(`function ${name}\\(\\) \\{[\\s\\S]*?\\n\\}\\n`).exec(quelle);
    if (!m) throw new Error(name + ' nicht gefunden');
    return new Function('state', 'BOARD_SIZE', 'NEIGHBORS', m[0] + `;return ${name}();`)(state, E.BOARD_SIZE, E.NEIGHBORS);
  };
  return {area: s => bau('finalAreaScore', s), territory: s => bau('finalTerritoryScore', s)};
}
const gruendeText = r => (r.j ? r.j.gruendeUngueltig.join(' | ') : '') + ' ' + (r.stderr || '').slice(0, 300);

/* ── 1 Zählbestandteile ─────────────────────────────────────────────── */
test('Zählbestandteile = zaehleMitTotListe auf 200 Zufallsbrettern; jeder Punkt genau einmal', () => {
  const E = engine(), zufall = L.mulberry32(77), n = E.BOARD_SIZE; let mitNeutral = 0, mitTot = 0;
  for (let k = 0; k < 200; k++) {
    const b = new Uint8Array(n); for (let i = 0; i < n; i++) if (zufall() < 0.1 + zufall() * 0.5) b[i] = zufall() < 0.5 ? 1 : 2;
    const caps = {1: Math.floor(zufall() * 30), 2: Math.floor(zufall() * 30)}, tot = new Set(); for (let i = 0; i < n; i++) if (b[i] && zufall() < 0.2) tot.add(i);
    const z = L.zaehlbestandteile(b, caps, tot, 7.5, E.NEIGHBORS), a = L.zaehleMitTotListe(b, caps, tot, 7.5, E.NEIGHBORS, 'flaeche'), t = L.zaehleMitTotListe(b, caps, tot, 7.5, E.NEIGHBORS, 'territory');
    if (z.flaeche.schwarz !== a.schwarz || z.flaeche.weiss !== a.weiss || z.flaeche.stand !== a.stand || z.territory.schwarz !== t.schwarz || z.territory.weiss !== t.weiss || z.territory.stand !== t.stand)
      pruefe(false, `Zufallsbrett ${k}: Bestandteile weichen von der Zählung ab`);
    const leer = [...b].filter((x, i) => !x || tot.has(i)).length;
    pruefeGleich(z.gebiet[1] + z.gebiet[2] + z.neutral, leer, `Brett ${k}: Gebiet + neutral = leere Punkte nach Entfernung der toten Steine`);
    pruefeGleich(z.regionen.reduce((s, r) => s + r.groesse, 0), leer, `Brett ${k}: Regionen decken alle leeren Punkte ab`);
    pruefeGleich(z.steine[1] + z.steine[2] + leer, n, `Brett ${k}: Steine + leere Punkte = Brett`);
    if (z.neutral) mitNeutral++; if (tot.size) mitTot++;
  }
  pruefe(mitNeutral > 10 && mitTot > 150, `Abdeckung: neutrale ${mitNeutral}, tote ${mitTot}`);
});

/* ── 2 Rohantworten ─────────────────────────────────────────────────── */
test('GTP-Rohantworten bleiben unverändert (mehrzeilig, Leerzeichen, „?“)', async () => {
  const w = werkstatt(), p = Z.gtpRoh(w.gnugo, []);
  try {
    const a = await p.frage('showboard');
    pruefeGleich(a.roh, '= \n    A B C D\n 19 . . . .', 'Rohtext unverändert, einschließlich Leerzeichen und Zeilenumbruch');
    pruefeGleich(a.ok, true, 'ok bei „=“');
    pruefeGleich((await p.frage('quatsch')).roh, '? unknown command', 'Fehlerantwort unverändert'); pruefeGleich((await p.frage('quatsch')).ok, false, 'nicht ok bei „?“');
    await p.frage('play B D4'); const d = await p.frage('final_status_list black_territory');
    pruefe(/^= (\w\d+ ?)+\n(\w\d+ ?)+/.test(d.roh) && d.roh.split('\n').length > 1, 'mehrzeilige Liste bleibt mehrzeilig: ' + JSON.stringify(d.roh.slice(0, 40)));
    pruefeGleich((await p.frage('version')).roh, '= 0.0-test', 'kurze Antwort');
  } finally { p.ende(); fs.rmSync(w.dir, {recursive: true, force: true}); }
});

test('Antworten lesen: Ziffern gehören zur Antwort („= 75“, „= 0“), nicht zu einer Kennung', () => {
  const E = engine(), log = [['list_stones black', '= '], ['list_stones white', '= '], ['captures black', '= 75'], ['captures white', '= 21'], ['final_score', '= 0'],
    ['final_status_list alive', '= '], ['final_status_list dead', '= '], ['final_status_list seki', '= '], ['final_status_list white_territory', '= '],
    ['final_status_list black_territory', '= '], ['final_status_list dame', '= '], ['showboard', '= ']].map(([befehl, antwort]) => ({befehl, antwort}));
  const x = Z.analysiere(E, [], [], log);
  pruefeGleich(x.gnugoGefangen.black, 75, 'captures black = 75'); pruefeGleich(x.gnugoGefangen.white, 21, 'captures white = 21');
  pruefeGleich(x.finalScore.stand, 0, 'final_score „= 0“ (Gleichstand) ist lesbar'); pruefeGleich(x.finalScore.roh, '= 0', 'Rohtext bleibt');
  log[4].antwort = '= W+3.5'; pruefeGleich(Z.analysiere(E, [], [], log).finalScore.stand, -3.5, 'W+3.5');
  log[4].antwort = '= B+139.5'; pruefeGleich(Z.analysiere(E, [], [], log).finalScore.stand, 139.5, 'B+139.5 wie in Probe 1');
});

/* ── 3 Das ganze Werkzeug ───────────────────────────────────────────── */
test('Werkzeug: dieselbe Einheit, derselbe Seed und dieselben GNU-Go-Argumente wie die Fortsetzung', () => {
  const quelle = fs.readFileSync(path.join(wurzel, 'auswertung/endspiel/passregel-fortsetzung.js'), 'utf8');
  pruefe(/L\.fortsetzungsSeed\(opt\.seed, e\.gruppe, e\.datei, e\.nr, e\.index\)/.test(quelle), 'Fortsetzung leitet den Seed so ab');
  pruefe(/gtpStarten\(opt\.gnugo, gnugoArgumente\(seed\), 'GNU Go'\)/.test(quelle), 'Fortsetzung startet den Schiedsrichter mit gnugoArgumente(seed)');
  const diag = fs.readFileSync(werkzeug, 'utf8');
  pruefe(/L\.fortsetzungsSeed\(opt\.seedBasis, opt\.gruppe, path\.basename\(opt\.datei\), opt\.nr, opt\.index\)/.test(diag), 'Diagnose leitet den Seed mit denselben Eingaben ab (Gruppe, Dateiname, Nr., Index)');
  pruefe(/gtpRoh\(gnugo, F\.gnugoArgumente\(seed\)\)/.test(diag), 'Diagnose startet GNU Go mit F.gnugoArgumente(seed)');
  pruefeGleich(F.gnugoArgumente(5).join(' '), '--mode gtp --level 1 --chinese-rules --komi 7.5 --seed 5 --never-resign', 'GNU-Go-Einstellungen wie in Probe 1');
});

test('Werkzeug gegen Attrappe: vollständige Zugfolge, Befehlsfolge, Rohantworten, Version, Wiederholbarkeit, Zählbestandteile', () => {
  const E = engine(), w = werkstatt(), index = erstenIndex(E, handPartie());
  try {
    const r = lauf(w, path.join(w.dir, 'a'), index, {STUB_TOT: 'keine'});
    pruefeGleich(r.status, 0, 'Exit 0: ' + gruendeText(r)); const j = r.j;
    pruefeGleich(j.gueltig, true, 'gültig: ' + j.gruendeUngueltig.join(' | '));
    const partie = handPartie(), prefix = partie.zuege.slice(0, index + 1);
    pruefeGleich(JSON.stringify(j.einheit.zuege), JSON.stringify(prefix), 'vollständige archivierte Zugfolge bis zum Index');
    pruefeGleich(j.einheit.zuegeInFolge, index + 1, 'Länge Index + 1'); pruefeGleich(j.einheit.archivZuegeGesamt, partie.zuege.length, 'Länge der ganzen Archivpartie festgehalten');
    pruefeGleich(j.einheit.folgeSha256, crypto.createHash('sha256').update(prefix.join(',')).digest('hex'), 'SHA-256 der Folge');
    pruefe(/0-basiert/.test(j.einheit.hinweisZugNummer) && j.einheit.hinweisZugNummer.includes(`Index ${index}`), 'Zugnummer-Konvention ausdrücklich: ' + j.einheit.hinweisZugNummer);
    pruefeGleich(j.seed.abgeleitet, L.fortsetzungsSeed(1, 'hand', 'archiv.jsonl', 1, index), 'Seed wie in der Fortsetzung'); pruefeGleich(j.gnugo.argumente.join(' '), F.gnugoArgumente(j.seed.abgeleitet).join(' '), 'Argumente wie in der Fortsetzung');
    const befehle = j.protokollLauf1.map(x => x.befehl);
    pruefeGleich(befehle.slice(0, 6).join('|'), 'protocol_version|name|version|boardsize 19|clear_board|komi 7.5', 'Befehlskopf');
    pruefeGleich(befehle.filter(b => /^play /.test(b)).length, index + 1, 'ein play je Zug');
    pruefeGleich(befehle.slice(-Z.ABFRAGEN.length).join('|'), Z.ABFRAGEN.join('|'), 'Abfragen am Ende in fester Reihenfolge');
    pruefeGleich(j.protokollLauf1.find(x => x.befehl === 'showboard').antwort, '= \n    A B C D\n 19 . . . .', 'Rohantwort unverändert im Protokoll');
    pruefeGleich(j.protokollLauf1.find(x => x.befehl === 'version').antwort, '= 0.0-test', 'GTP-Version roh');
    pruefe(/Attrappe 0\.0-test/.test(j.gnugo.gnugoVersionAusgabe) && j.gnugo.paketVersion === '3.8-test', 'GNU-Go-Version und Paketversion festgehalten');
    pruefeGleich(j.protokollLauf2IdentischMitLauf1, true, 'zweiter Lauf mit demselben Seed: Rohantworten identisch');
    pruefeGleich(j.kalibrierungCaptures.konvention, 'gefangen-von', 'captures-Kalibrierung');
    const a = j.analyse, u = a.unsereZaehlung;
    pruefeGleich(a.abweichungFlaecheAusTotListe.reproduziert, false, 'Attrappe zählt konsistent: Abweichung nicht reproduziert'); pruefeGleich(j.ergebnis, 'Abweichung NICHT reproduziert', 'Ergebnistext');
    pruefeGleich(u.flaeche.schwarz, u.steine.schwarz + u.gebiet.schwarz, 'Schwarz = Steine + Gebiet'); pruefeGleich(u.flaeche.weiss, u.steine.weiss + u.gebiet.weiss, 'Weiß = Steine + Gebiet');
    pruefe(Number.isInteger(u.neutral) && u.tote.schwarz === 0, 'neutrale Punkte und tote Steine getrennt ausgewiesen');
    pruefeGleich(a.brett.length, 361, 'Brett als Text'); pruefeGleich(a.bretterAbweichungen.length, 0, 'Brett wie GNU Go');
    pruefe(fs.existsSync(path.join(w.dir, 'a', 'gtp-protokoll.txt')) && fs.existsSync(path.join(w.dir, 'a', 'zaehldiagnose.md')), 'Protokolltext und Bericht geschrieben');
    pruefe(/Kreuztabelle/.test(r.stdout) && /Zählbestandteile/.test(r.stdout), 'Bericht steht im Log (ohne Artefakt lesbar)');
  } finally { fs.rmSync(w.dir, {recursive: true, force: true}); }
});

/* ── 4 Abweichung ist ein Ergebnis ──────────────────────────────────── */
test('Abweichung reproduziert: gültig, mit Unterschied; Punktabweichungen werden gefunden', () => {
  const E = engine(), w = werkstatt(), index = erstenIndex(E, handPartie());
  try {
    const r = lauf(w, path.join(w.dir, 'b'), index, {STUB_TOT: 'alleSchwarz', STUB_FINAL_OHNE_TOT: '1'});
    pruefeGleich(r.status, 0, 'Exit 0: ' + gruendeText(r)); pruefeGleich(r.j.gueltig, true, 'die Reproduktion der Abweichung macht die Diagnose nicht ungültig');
    pruefeGleich(r.j.ergebnis, 'Abweichung reproduziert', 'Ergebnistext'); pruefe(Math.abs(r.j.analyse.abweichungFlaecheAusTotListe.unterschied) > 0, 'Unterschied ≠ 0');
    pruefe(r.j.analyse.unsereZaehlung.tote.schwarz > 0 && r.j.analyse.listen.dead.length > 0, 'tote Koordinaten und tote Steine festgehalten');
    const dame = lauf(w, path.join(w.dir, 'c'), index, {STUB_TOT: 'keine', STUB_DAME_FALSCH: '1'});
    pruefeGleich(dame.status, 0, 'Exit 0'); pruefe(dame.j.analyse.punktAbweichungen.some(x => x.gnugo === 'dame' && x.unser === 'S'), 'ein als Dame gemeldeter Schwarz-Gebietspunkt wird als Punktabweichung gefunden: ' + JSON.stringify(dame.j.analyse.punktAbweichungen.slice(0, 2)));
    pruefe(dame.j.analyse.kreuztabelle['dame → S'] >= 1, 'Kreuztabelle nennt „dame → S“');
    pruefe(/Punkte, an denen GNU Gos Gebiets- oder Dame-Klasse/.test(dame.stdout), 'Punktabweichungen im Log');
  } finally { fs.rmSync(w.dir, {recursive: true, force: true}); }
});

/* ── 5 Ungültig ─────────────────────────────────────────────────────── */
test('Ungültig (kein Urteil): nicht wiederholbar, abgelehnter Zug, falsche Stellung', () => {
  const E = engine(), w = werkstatt(), index = erstenIndex(E, handPartie()), partie = handPartie();
  try {
    const z = lauf(w, path.join(w.dir, 'd'), index, {STUB_ZUFALL: '1'});
    pruefeGleich(z.status, 1, 'nicht wiederholbar: Exit 1'); pruefeGleich(z.j.gueltig, false, 'ungültig'); pruefe(z.j.gruendeUngueltig.some(x => /Wiederholbarkeit/.test(x)), z.j.gruendeUngueltig.join(' | '));
    pruefeGleich(z.j.ergebnis, 'Abweichung NICHT reproduziert'.startsWith('Abweichung') ? z.j.ergebnis : '', 'Ergebnistext vorhanden'); pruefe(z.j.unterschiedeZwischenLaeufen.length >= 1, 'Unterschiede zwischen den Läufen aufgelistet');
    const ab = lauf(w, path.join(w.dir, 'e'), index, {STUB_ABLEHNEN: partie.zuege.find((m, j) => j > 3 && m !== 'pass')});
    pruefeGleich(ab.status, 1, 'abgelehnter Zug: Exit 1'); pruefe(ab.j.gruendeUngueltig.some(x => /abgelehnt/.test(x)), ab.j.gruendeUngueltig.join(' | ')); pruefeGleich(ab.j.ergebnis, 'kein Urteil', 'kein Ergebnis ohne Analyse');
    const falsch = lauf(w, path.join(w.dir, 'f'), index - 2, {});
    pruefeGleich(falsch.status, 1, 'falsche Stellung: Exit 1'); pruefe(falsch.j.gruendeUngueltig.some(x => /Voraussetzung|Einheit:/.test(x)), 'falsche Stellung wird erkannt: ' + falsch.j.gruendeUngueltig.join(' | '));
    pruefe(/Diagnose UNGÜLTIG: kein Urteil/.test(falsch.stdout), 'Bericht sagt „kein Urteil“');
  } finally { fs.rmSync(w.dir, {recursive: true, force: true}); }
});

/* ── 5b Fester Testfall: die bekannte Zähldifferenz aus Probe 1 ─────────── */
test('Fester Testfall alte PWA, m1, Partie 206, Index 341: die bekannte Differenz von 3 Punkten bleibt nachvollziehbar', () => {
  const fx = JSON.parse(fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', 'zaehldiagnose-pwa206-341.json'), 'utf8')), E = engine(), n = E.BOARD_SIZE;
  const rec = L.leseJsonl(path.join(wurzel, fx.einheit.datei)).find(r => r.nr === fx.einheit.nr);
  const zuege = rec.zuege.slice(0, fx.einheit.index + 1), farben = zuege.map((_, j) => (j % 2 === 0 ? (rec.beginnt === 'S' ? 'B' : 'W') : (rec.beginnt === 'S' ? 'W' : 'B')));
  pruefeGleich(zuege.length, fx.einheit.zuegeInFolge, 'Länge der Folge'); pruefeGleich(rec.zuege.length, fx.einheit.archivZuegeGesamt, 'Länge der ganzen Archivpartie');
  pruefeGleich(crypto.createHash('sha256').update(zuege.join(',')).digest('hex'), fx.einheit.folgeSha256, 'SHA-256 der Folge wie in der Diagnose');
  pruefeGleich(L.fortsetzungsSeed(1, fx.einheit.gruppe, path.basename(fx.einheit.datei), fx.einheit.nr, fx.einheit.index), fx.gnugo.seed, 'Seed wie in der Diagnose');
  pruefeGleich(F.gnugoArgumente(fx.gnugo.seed).join(' '), fx.gnugo.argumente, 'GNU-Go-Argumente wie in der Diagnose');
  /* Brett und Gefangene aus dem Archiv gleich dem Brett, das GNU Go im Lauf hatte (Abschrift des Berichts) */
  const board = new Uint8Array(n), caps = {1: 0, 2: 0};
  zuege.forEach((m, j) => { if (m === 'pass') return; const i = L.vonGtp(m), f = farben[j] === 'B' ? 1 : 2; board[i] = f; caps[f] += E.removeDeadGroups(board, 3 - f, i); });
  pruefeGleich(Array.from({length: 19}, (_, y) => Array.from(board.slice(y * 19, y * 19 + 19), c => '.XO'[c]).join('')).join('\n'), fx.brett.join('\n'), 'Brett wie im Bericht des Laufs');
  pruefeGleich(caps[1] + '/' + caps[2], fx.gefangen.schwarz + '/' + fx.gefangen.weiss, 'Gefangene wie GNU Go (74/20)');
  /* unsere Zählung mit der Tot-Liste des Laufs */
  const tot = new Set(fx.tot.map(L.vonGtp)), zb = L.zaehlbestandteile(board, caps, tot, 7.5, E.NEIGHBORS), u = fx.unsereZaehlung;
  pruefeGleich(zb.steine[1] + '/' + zb.steine[2], u.steine.schwarz + '/' + u.steine.weiss, 'Steine'); pruefeGleich(zb.gebiet[1] + '/' + zb.gebiet[2], u.gebiet.schwarz + '/' + u.gebiet.weiss, 'Gebiet');
  pruefeGleich(zb.neutral, u.neutral, 'neutrale Punkte'); pruefeGleich(zb.tote[1] + '/' + zb.tote[2], u.tote.schwarz + '/' + u.tote.weiss, 'tote Steine');
  pruefeGleich(zb.flaeche.stand, u.flaeche.stand, 'Fläche aus der Tot-Liste 136,5'); pruefeGleich(zb.territory.stand, u.territoryStand, 'Territory aus der Tot-Liste 128,5');
  const neutral = zb.regionen.filter(r => r.besitzer === 0);
  pruefeGleich(neutral.length, 1, 'eine neutrale Region'); pruefeGleich(neutral[0].punkte.map(L.zuGtp).sort().join(' '), [...u.neutraleRegion.punkte].sort().join(' '), 'E19 F19 G19 H19 J19'); pruefeGleich(neutral[0].rand, u.neutraleRegion.rand, 'Rand Schwarz und Weiß');
  /* die App zählt dieselbe Stellung nach derselben Flood-Fill-Regel: gleich unserer Zählung, ungleich GNU Gos final_score */
  const app = appFunktionenTest(E), b2 = Uint8Array.from(board), c2 = {1: caps[1], 2: caps[2]};
  for (const i of tot) { c2[b2[i] === 1 ? 2 : 1]++; b2[i] = 0; }
  const fl = app.area({board: b2}), tr = app.territory({board: b2, captures: c2});
  pruefeGleich(fl[1] + '/' + fl[2], u.flaeche.schwarz + '/' + u.flaeche.weiss, 'finalAreaScore der App: 250/106, gleich unserer Zählung');
  pruefeGleich(fl[1] - (fl[2] + 7.5), u.flaeche.stand, 'Stand der App-Fläche 136,5'); pruefe(fl[1] - (fl[2] + 7.5) !== fx.finalScore.stand, 'App-Fläche ≠ final_score (139,5): Vergleich zweier Zählverfahren');
  pruefeGleich(tr[1] - (tr[2] + 7.5), u.territoryStand, 'finalTerritoryScore der App 128,5');
  /* GNU Gos Listen: bt und wt aus der Kreuztabelle abgeleitet (nicht roh gespeichert, siehe Fixture) */
  const bt = new Set(), wt = new Set(), dame = new Set(fx.dame.map(L.vonGtp)), alive = new Set(), nur = fx.punktAbweichungen.map(L.vonGtp);
  for (let p = 0; p < n; p++) { if (board[p]) { if (!tot.has(p)) alive.add(p); continue; } if (dame.has(p) || nur.includes(p)) continue; if (zb.besitzer[p] === 1) bt.add(p); if (zb.besitzer[p] === 2) wt.add(p); }
  for (const p of nur) bt.add(p);
  pruefeGleich(bt.size + '/' + wt.size + '/' + alive.size, fx.listenGroesse.bt + '/' + fx.listenGroesse.wt + '/' + fx.listenGroesse.alive, 'Größen der abgeleiteten Listen wie im Lauf (84/35/220)');
  const v = L.vergleicheZaehlung(board, caps, {alive, dead: tot, seki: new Set(), wt, bt, dame}, 7.5, E.NEIGHBORS, fx.finalScore.stand);
  pruefeGleich(JSON.stringify(Object.fromEntries(Object.entries(v.kreuztabelle).sort())), JSON.stringify(Object.fromEntries(Object.entries(fx.kreuztabelle).sort())), 'Kreuztabelle wie im Lauf');
  pruefeGleich(v.punktAbweichungen.map(x => x.punkt).sort().join(' '), [...fx.punktAbweichungen].sort().join(' '), 'abweichende Punkte G19 H19 J19');
  pruefe(v.punktAbweichungen.every(x => x.gnugo === 'gebiet-S' && x.unser === 'neutral'), 'GNU Go: Schwarz-Gebiet, unser Besitzer: neutral');
  pruefeGleich(v.abweichungFlaecheAusTotListe.unterschied, -3, 'Unterschied −3'); pruefeGleich(v.abweichungFlaecheAusTotListe.reproduziert, true, 'Abweichung');
  pruefeGleich(v.gnugoAusListen.variante1_lebendePlusGebiet.stand, fx.nachbildungen.variante1, 'Variante 1 wie im Lauf'); pruefeGleich(v.gnugoAusListen.variante2_mitSeki.stand, fx.nachbildungen.variante2, 'Variante 2 wie im Lauf');
  pruefeGleich(v.gnugoAusListen.variante3_mitPunktenToterSteine.stand, fx.nachbildungen.variante3, 'Variante 3 trifft final_score (139,5)'); pruefeGleich(v.gnugoAusListen.v3GleichFinalScore, true, 'Nachrechnung: 253 − 106 − 7,5');
  pruefeGleich(v.gnugoAusListen.variante3_mitPunktenToterSteine.schwarz + '/' + v.gnugoAusListen.variante3_mitPunktenToterSteine.weiss, '253/106', 'Schwarz 150 + 84 + 19 = 253, Weiß 70 + 35 + 1 = 106');
});

/* ── 6 Jeder verlangte Befehl muss erfolgreich beantwortet werden ───────── */
test('Fehlerantworten: jeder Befehl (Kopf, Zug, Abfragen) macht den Lauf zum Fehler und wird nie als Nutzdaten gelesen', async () => {
  const w = werkstatt(), partie = handPartie(), zuege = partie.zuege.slice(0, 6), farben = zuege.map((_, j) => (j % 2 === 0 ? 'B' : 'W'));
  const befehle = [...Z.KOPF, `play ${farben[0]} ${zuege[0]}`, `play ${farben[3]} ${zuege[3]}`, ...Z.ABFRAGEN];
  try {
    for (const b of befehle) {
      process.env.STUB_FEHLER_BEI = b;
      const l = await Z.protokollLauf(w.gnugo, 5, zuege, farben);
      pruefeGleich(l.fehler.length, 1, `„${b}“ abgelehnt: genau ein Fehler`);
      pruefe(l.fehler[0].includes(`Befehl „${b}“ abgelehnt: ? cannot do that`), 'Fehlertext nennt Befehl und Rohantwort: ' + l.fehler[0]);
      pruefeGleich(l.log[l.log.length - 1].befehl, b, `nach der Fehlerantwort auf „${b}“ wird nichts weiter gesendet`);
    }
  } finally { delete process.env.STUB_FEHLER_BEI; fs.rmSync(w.dir, {recursive: true, force: true}); }
});

test('Zwei identische Fehlerantworten bestehen die Wiederholbarkeit nicht: ungültig mit dem Grund des Befehls', () => {
  const E = engine(), w = werkstatt(), index = erstenIndex(E, handPartie());
  try {
    for (const b of ['final_score', 'version', 'final_status_list dead', 'showboard']) {
      const r = lauf(w, path.join(w.dir, 'x-' + b.replace(/\W+/g, '_')), index, {STUB_FEHLER_BEI: b});
      pruefeGleich(r.status, 1, `„${b}“ abgelehnt: Exit 1`); pruefeGleich(r.j.gueltig, false, 'ungültig');
      pruefe(r.j.gruendeUngueltig.some(x => x.startsWith('Lauf 1: ') && x.includes(`Befehl „${b}“ abgelehnt`)) && r.j.gruendeUngueltig.some(x => x.startsWith('Lauf 2: ')),
        'beide Läufe nennen den abgelehnten Befehl: ' + r.j.gruendeUngueltig.join(' | '));
      pruefeGleich(r.j.protokollLauf2IdentischMitLauf1, true, 'die Fehlerantworten sind identisch, das reicht trotzdem nicht'); pruefeGleich(r.j.ergebnis, 'kein Urteil', 'kein Ergebnis aus Fehlerantworten'); pruefeGleich(r.j.analyse, null, 'keine Auswertung');
      pruefe(/Diagnose UNGÜLTIG: kein Urteil/.test(r.stdout), 'Bericht auch bei fehlenden Antworten darstellbar');
    }
    const schlecht = lauf(w, path.join(w.dir, 'y'), index, {STUB_SCHLECHT: 'score'});
    pruefeGleich(schlecht.status, 1, 'nicht endlicher final_score: Exit 1'); pruefe(schlecht.j.gruendeUngueltig.some(x => /Auswertung des Protokolls/.test(x)), schlecht.j.gruendeUngueltig.join(' | '));
  } finally { fs.rmSync(w.dir, {recursive: true, force: true}); }
});

test('Nutzdaten streng: Erfolgsantwort, gültige Koordinaten, endlicher final_score, ganze Zahlen', () => {
  const wirft = f => { try { f(); return false; } catch (e) { return true; } };
  pruefe(wirft(() => Z.ohneKopf('? bad')), 'eine Fehlerantwort wird nie zu Nutzdaten'); pruefe(wirft(() => Z.ohneKopf('')), 'leere Antwort ist keine Erfolgsantwort');
  pruefeGleich(Z.ohneKopf('='), '', 'leere Nutzdaten'); pruefeGleich(Z.ohneKopf('= B+1.5'), 'B+1.5', 'Nutzdaten');
  pruefeGleich(Z.punkte('= A1 B2\nT19').size, 3, 'drei gültige Koordinaten'); pruefeGleich(Z.punkte('=').size, 0, 'leere Liste');
  for (const schlecht of ['= A1 PASS', '= Z99', '= A20', '= I5', '= A0', '= resign']) pruefe(wirft(() => Z.punkte(schlecht)), `ungültige Koordinate ${schlecht} wird abgelehnt`);
  pruefe(wirft(() => Z.punkte('? A1 B2')), 'Fehlerantwort als Punktliste wird abgelehnt');
  pruefeGleich(Z.zahlAntwort('= 12'), 12, '12'); pruefeGleich(Z.zahlAntwort('= 0'), 0, '0');
  for (const schlecht of ['= ', '=', '= -1', '= 1.5', '= abc', '? 3']) pruefe(wirft(() => Z.zahlAntwort(schlecht)), `keine ganze Zahl: ${JSON.stringify(schlecht)}`);
  const E = engine(), basis = () => [['list_stones black', '= '], ['list_stones white', '= '], ['captures black', '= 0'], ['captures white', '= 0'], ['final_score', '= B+5.5'],
    ['final_status_list alive', '= '], ['final_status_list dead', '= '], ['final_status_list seki', '= '], ['final_status_list white_territory', '= '], ['final_status_list black_territory', '= '], ['final_status_list dame', '= '], ['showboard', '= ']].map(([befehl, antwort]) => ({befehl, antwort}));
  pruefeGleich(Z.analysiere(E, [], [], basis()).finalScore.stand, 5.5, 'gültiges Protokoll wird gelesen');
  for (const [befehl, antwort, text] of [['final_score', '= B+1.2.3', /nicht endlich/], ['final_score', '? nope', /Fehlerantwort/], ['captures black', '= ', /keine ganze Zahl/], ['captures white', '= -2', /keine ganze Zahl/],
                                         ['final_status_list dead', '= A1 PASS', /ungültige Koordinate/], ['final_status_list dame', '? x', /Fehlerantwort/], ['list_stones white', '= Z99', /ungültige Koordinate/]]) {
    const log = basis(); log.find(x => x.befehl === befehl).antwort = antwort;
    let msg = ''; try { Z.analysiere(E, [], [], log); } catch (e) { msg = e.message; }
    pruefe(text.test(msg), `${befehl} → ${JSON.stringify(antwort)}: ${msg || 'keine Fehlermeldung'}`);
  }
});

laufeTests('Zähldiagnose (Werkzeug, Attrappe)').then(ok => process.exit(ok ? 0 : 1));
