// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Aufbauprüfung K3, Teil 3 (auswertung/k3-diagnose.js,
   docs/skalierung-aufbaupruefung-vorabfestlegung.md §3).

   Geprüft wird:
     1. GTP: Koordinaten (ohne I, Zeile 19 oben), Schätzung nach Zug 100, 200 und 300, Lesen von
        „B+x“, „W+x“, „0“ und der Schranken; ein abgelehnter Zug macht jede spätere Schätzung zu
        „fehlt“.
     2. Kipppunkt nach der Festlegung: erster Messpunkt, ab dem der Verlierer an jedem folgenden
        hinten liegt; „kein“, „ohne“, „fehlt“.
     3. Pässe je Arm und Farbe (je 100 Entscheidungen, ohne eigenen Pass, erster Pass) und q je
        Phase an kleinen, von Hand nachgerechneten Partien.
     4. Mit einem nachgebauten GNU Go: Sicht des Verlierers (Schwarz: Wert, Weiß: −Wert), Tabelle je
        Arm und Farbe, Ende zu Ende über die Befehlszeile mit Ausgang 0, 1 und 2.
     5. Mit dem echten GNU Go, wenn installiert: eine echte, kurze Harness-Partie wird nachgespielt
        und an jedem Messpunkt geschätzt (sonst übersprungen).

   Aufruf:  node tests/k3-diagnose.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const {spawnSync, execFileSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');
const D = require('../auswertung/k3-diagnose.js');
const U = require('../auswertung/k3-uebergabe.js');
const {BLOCKSUMMEN} = require('../auswertung/skalierung-bericht.js');
const {blocksummen} = require('../auswertung/eval-streuung-bericht.js');

const COMMIT = '98aa1ad586c9de23f64ca76c26af1d7b199b7b3a';
const SKRIPT = path.join(__dirname, '..', 'auswertung', 'k3-diagnose.js');
const HARNESS = path.join(__dirname, '..', 'ab-harness.js');
const ECHT = '/usr/games/gnugo';
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
let TMP;
const tmpdir = () => TMP || (TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'k3-diagnose-')));

/* Nachgebautes GNU Go: zählt die play-Befehle, antwortet auf estimate_score mit dem Wert aus
   FAKE_WERTE („100:W+5.5,200:B+3“) und lehnt den play-Befehl Nummer FAKE_FEHLER ab. */
function fakeGnugo() {
  const p = path.join(tmpdir(), 'gnugo-fake.sh');
  if (!fs.existsSync(p)) {
    fs.writeFileSync(p, `#!/bin/bash
if [ "$1" = "--version" ]; then echo "GNU Go 3.8 (Nachbau)"; exit 0; fi
n=0
while IFS= read -r z; do
  case "$z" in
    play*) n=$((n+1))
      if [ -n "$FAKE_FEHLER" ] && [ "$n" = "$FAKE_FEHLER" ]; then printf '? illegal move\\n\\n'; else printf '= \\n\\n'; fi ;;
    estimate_score)
      v=$(printf '%s' "$FAKE_WERTE" | tr ',' '\\n' | grep "^$n:" | cut -d: -f2)
      printf '= %s (upper bound: 1.0, lower: -1.0)\\n\\n' "\${v:-B+1.0}" ;;
    quit) printf '= \\n\\n'; exit 0 ;;
    *) printf '= \\n\\n' ;;
  esac
done
`);
    fs.chmodSync(p, 0o755);
  }
  return p;
}

/* Eine Partie wie im Harness: A ist in ungeraden Partien Schwarz; Pässe an den Zügen in `paesse`
   und an den letzten zwei Zügen. */
function partie(seed, nr, zuege = 310, opt = {}) {
  const aSchwarz = nr % 2 === 1;
  const armVon = {S: aSchwarz ? 'A' : 'B', W: aSchwarz ? 'B' : 'A'};
  const ereignisse = [], summe = {A: 0, B: 0}, zahl = {A: 0, B: 0};
  const paesse = new Set(opt.paesse || []);
  for (let j = 0; j < zuege; j++) {
    const farbe = j % 2 === 0 ? 'S' : 'W', arm = armVon[farbe], zug = j + 1;
    const pass = paesse.has(zug) || j >= zuege - 2;
    const sims = pass ? null : U.K3.soll[arm];
    const q = opt.q ? opt.q(zug, arm, farbe) : 0.1;
    ereignisse.push({zug, farbe, idx: pass ? -1 : j % 361, sims, q: pass ? null : q});
    zahl[arm]++; if (sims) summe[arm] += sims;
  }
  const siegerFarbe = opt.siegerFarbe || (nr % 3 === 0 ? 'W' : 'S');
  const sieger = (siegerFarbe === 'S') === aSchwarz ? 'A' : 'B';
  return {json: {partie: nr, aIst: aSchwarz ? 'Schwarz' : 'Weiß', sieger, siegerFarbe, aufgabe: null,
                 stand: siegerFarbe === 'S' ? 'B 190 : W 177.5' : 'B 175 : W 192.5', zuege,
                 simsA: Math.round(summe.A / zahl.A), simsB: Math.round(summe.B / zahl.B), dauerMin: 9},
          roh: {typ: 'partie', seed, params_hash: 'ab'.repeat(32), nr, armSchwarz: armVon.S, armWeiss: armVon.W,
                final_board_hash: sha(`${seed}/${nr}`), sieger: siegerFarbe, zuege, aufgabe: null, ereignisse}};
}
function teil(seed, i, zuege) {
  const ps = Array.from({length: 10}, (_, k) => partie(seed, k + 1, zuege));
  return {laufId: String(45722878539 + i), name: `ab-harness-10p-seed${seed}-run${192 + i}`,
          daten: {konfig: {A: 'mctsFixedSims=2600,resignEnabled=0', B: 'mctsFixedSims=5200,resignEnabled=0', komi: 7.5,
                           seed, modus: 'standard', commit: COMMIT, abgeschlossen: true},
                  partien: ps.map(p => p.json)},
          roh: ps.map(p => p.roh)};
}

/* ── 1. GTP ────────────────────────────────────────────────────── */

test('GTP: Koordinaten, Messpunkte nach Zug 100, 200, 300, Ende mit quit', () => {
  pruefeGleich(D.zuGtp(0), 'A19', 'Feld 0');
  pruefeGleich(D.zuGtp(8), 'J19', 'Spalte 9 ohne I');
  pruefeGleich(D.zuGtp(18), 'T19', 'Feld 18');
  pruefeGleich(D.zuGtp(360), 'T1', 'Feld 360');
  const {befehle, mess} = D.gtpBefehle(partie(1, 1, 250).roh.ereignisse);
  pruefeGleich(befehle.slice(0, 3).join('|'), 'boardsize 19|clear_board|komi 7.5', 'Kopf');
  pruefeGleich(mess.map(m => m.zug).join(), '100,200', 'Messpunkte bei 250 Zügen');
  pruefeGleich(befehle[mess[0].befehl], 'estimate_score', 'Schätzung an der gemerkten Stelle');
  pruefeGleich(befehle[mess[0].befehl - 1].startsWith('play B'), false, 'Zug 100 ist Weiß');
  pruefeGleich(befehle[mess[0].befehl - 1], 'play W ' + D.zuGtp(99), 'davor Zug 100');
  pruefeGleich(befehle[befehle.length - 1], 'quit', 'Ende');
  pruefe(befehle.includes('play W pass') || befehle.includes('play B pass'), 'Pass als „pass“');
});

test('Schätzung lesen: B+, W+, 0, Schranken, Fehler', () => {
  const a = D.schaetzungAus('= B+12.5 (upper bound: 20.0, lower: 3.0)');
  pruefeGleich(a.wert, 12.5, 'B+'); pruefeGleich(a.oben, 20, 'oben'); pruefeGleich(a.unten, 3, 'unten');
  pruefeGleich(D.schaetzungAus('= W+7.5').wert, -7.5, 'W+ ohne Schranken');
  pruefeGleich(D.schaetzungAus('= W+7.5').oben, null, 'ohne Schranken null');
  pruefeGleich(D.schaetzungAus('= 0').wert, 0, 'gleich');
  pruefeGleich(D.schaetzungAus('? illegal move'), null, 'Fehler');
  pruefeGleich(D.schaetzungAus('= unsinn'), null, 'unlesbar');
});

test('Ein abgelehnter Zug macht jede spätere Schätzung zu „fehlt“', () => {
  const {befehle, mess} = D.gtpBefehle(partie(1, 1, 310).roh.ereignisse);
  const antworten = befehle.map((b, i) => b === 'estimate_score' ? '= B+2.0' : (i === 150 ? '? illegal move' : '= '));
  const w = D.messwerte(antworten.join('\n\n') + '\n', befehle, mess);
  pruefeGleich(w[0].s.wert, 2, 'Zug 100 vor dem Fehler');
  pruefeGleich(w[1].s, null, 'Zug 200 nach dem Fehler');
  pruefeGleich(w[2].s, null, 'Zug 300 nach dem Fehler');
  pruefeGleich(D.messwerte('', befehle, mess).every(x => x.s === null), true, 'keine Ausgabe');
});

/* ── 2. Kipppunkt ──────────────────────────────────────────────── */

test('Kipppunkt nach der Festlegung', () => {
  const w = (...s) => s.map((sicht, i) => ({zug: 100 * (i + 1), sicht}));
  pruefeGleich(D.kipppunkt(w(-1, -2, -3)), 100, 'durchgehend hinten');
  pruefeGleich(D.kipppunkt(w(1, -2, -3)), 200, 'ab 200');
  pruefeGleich(D.kipppunkt(w(-1, 2, -3)), 300, 'zwischendurch vorn');
  pruefeGleich(D.kipppunkt(w(-1, -2, 3)), 'kein', 'am Ende vorn');
  pruefeGleich(D.kipppunkt(w(-1, -2, 0)), 'kein', '0 ist nicht hinten');
  pruefeGleich(D.kipppunkt(w(-1)), 100, 'nur ein Messpunkt');
  pruefeGleich(D.kipppunkt([]), 'ohne', 'kein Messpunkt');
  pruefeGleich(D.kipppunkt(w(-1, null, -3)), 'fehlt', 'Schätzung fehlt');
});

/* ── 3. Pässe und q ────────────────────────────────────────────── */

test('Pässe je Arm und Farbe, erster Pass, Partien ohne eigenen Pass', () => {
  /* Partie 1: A Schwarz. 20 Züge, Pässe bei 7 (S) und 19, 20 (S, W). Partie 2: A Weiß, 10 Züge,
     Pass nur bei 9 (S = B) und 10 (W = A); dazu ohne eigenen Pass: niemand. */
  const t = {daten: {konfig: {seed: 1}, partien: [partie(1, 1, 20).json, partie(1, 2, 10).json]},
             roh: [partie(1, 1, 20, {paesse: [7]}).roh, partie(1, 2, 10).roh]};
  t.daten.partien.forEach(x => { x.siegerFarbe = 'S'; });
  const ps = D.partienAus([t]);
  const m = D.passMasse(ps);
  pruefeGleich(m.AS.entscheidungen, 10, 'A Schwarz: Entscheidungen');
  pruefeGleich(m.AS.paesse, 2, 'A Schwarz: Pässe (7 und 19)');
  pruefeGleich(m.AS.ersterPass.join(), '7', 'A Schwarz: erster Pass');
  pruefeGleich(m.BW.paesse, 1, 'B Weiß: Pass bei 20');
  pruefeGleich(m.BS.ersterPass.join(), '9', 'B Schwarz: erster Pass in Partie 2');
  pruefeGleich(m.AW.ersterPass.join(), '10', 'A Weiß: erster Pass in Partie 2');
  pruefeGleich(m.AS.ohnePass + m.AW.ohnePass + m.BS.ohnePass + m.BW.ohnePass, 0, 'jede Seite hat gepasst');
  /* ohne eigenen Pass: Partie, in der Weiß nie passt (letzter Zug Schwarz, Pässe nur bei Schwarz) */
  const r = partie(1, 1, 21).roh;   /* Pässe bei 20 (W) und 21 (S) */
  r.ereignisse[19] = {...r.ereignisse[19], idx: 5, sims: 5200};
  const m2 = D.passMasse(D.partienAus([{daten: {konfig: {seed: 1}, partien: [{...partie(1, 1, 21).json}]}, roh: [r]}]));
  pruefeGleich(m2.BW.ohnePass, 1, 'B Weiß ohne eigenen Pass');
  pruefeGleich(m2.BW.ersterPass.length, 0, 'und ohne Eintrag beim ersten Pass');
});

test('q je Phase: Mittel je Partie, Median über Partien, nur eigene Steinzüge', () => {
  const q = (zug, arm) => (arm === 'A' ? 1 : -1) * (zug <= 100 ? 0.1 : zug <= 200 ? 0.2 : zug <= 300 ? 0.3 : 0.4);
  const t = {daten: {konfig: {seed: 1}, partien: [partie(1, 1, 320, {q}).json, partie(1, 2, 320, {q}).json]},
             roh: [partie(1, 1, 320, {q}).roh, partie(1, 2, 320, {q}).roh]};
  const z = D.qPhasen(D.partienAus([t]));
  pruefeGleich(z.AS.map(w => w.length).join(), '1,1,1,1', 'A Schwarz: eine Partie je Phase');
  pruefeGleich(z.AS.map(w => w[0].toFixed(1)).join(), '0.1,0.2,0.3,0.4', 'A: Phasenwerte');
  pruefeGleich(z.BW.map(w => w[0].toFixed(1)).join(), '-0.1,-0.2,-0.3,-0.4', 'B: Phasenwerte');
});

/* ── 4. Mit nachgebautem GNU Go ────────────────────────────────── */

test('Sicht des Verlierers und Tabelle je Arm und Farbe', async () => {
  process.env.FAKE_WERTE = '100:W+5.5,200:B+3.0,300:W+12.0';
  delete process.env.FAKE_FEHLER;
  /* Partie 1: A Schwarz, Sieger S → Verlierer B als Weiß, Sicht = −Wert: 5.5, −3, 12 → kein.
     Partie 3: A Schwarz, Sieger W → Verlierer A als Schwarz, Sicht = Wert: −5.5, 3, −12 → 300. */
  const ps = D.partienAus([{daten: {konfig: {seed: 1}, partien: [partie(1, 1).json, partie(1, 3).json]},
                             roh: [partie(1, 1).roh, partie(1, 3).roh]}]);
  const bew = await D.bewerte(ps, {gnugo: fakeGnugo(), parallel: 2});
  pruefeGleich(bew[0].werte.map(w => w.sicht).join(), '5.5,-3,12', 'Verlierer Weiß: −Wert');
  pruefeGleich(bew[0].kipp, 'kein', 'Partie 1');
  pruefeGleich(bew[1].werte.map(w => w.sicht).join(), '-5.5,3,-12', 'Verlierer Schwarz: Wert');
  pruefeGleich(bew[1].kipp, 300, 'Partie 3');
  const k = D.kippTabelle(ps, bew);
  pruefeGleich(k.BW.kein, 1, 'B als Weiß: kein');
  pruefeGleich(k.AS[300], 1, 'A als Schwarz: ab 300');
  pruefeGleich(k.A.verluste + k.B.verluste, 2, 'Verluste gesamt');
  const c = D.csv(ps, bew).trim().split('\n');
  pruefeGleich(c.length, 3, 'CSV: Kopf und zwei Partien');
  pruefe(c[2].endsWith(',300'), `CSV-Zeile: ${c[2]}`);
  pruefe(c[1].includes(',-5.5,1,-1,'), `Wert aus Sicht von Schwarz mit Schranken: ${c[1]}`);
});

test('Abgelehnter Zug im nachgebauten GNU Go: „fehlt“', async () => {
  process.env.FAKE_WERTE = '100:W+5.5,200:W+3.0,300:W+12.0';
  process.env.FAKE_FEHLER = '150';
  const ps = D.partienAus([{daten: {konfig: {seed: 1}, partien: [partie(1, 3).json]}, roh: [partie(1, 3).roh]}]);
  const bew = await D.bewerte(ps, {gnugo: fakeGnugo(), parallel: 1});
  delete process.env.FAKE_FEHLER;
  pruefeGleich(bew[0].werte.map(w => w.sicht === null ? 'x' : w.sicht).join(), '-5.5,x,x', 'nach Zug 150 fehlt');
  pruefeGleich(bew[0].kipp, 'fehlt', 'Kipppunkt');
});

function befehlszeile({gnugo, aendere, zuege = 310} = {}) {
  const d = fs.mkdtempSync(path.join(tmpdir(), 'cli-'));
  const teile = U.K3.seeds.map((s, i) => teil(s, i, zuege));
  if (aendere) aendere(teile);
  const args = ['--commit', COMMIT, '--html', STANDARD_HTML, '--pruefsummen', path.join(d, 'p.tsv'),
                '--gnugo', gnugo, '--parallel', '4', '--csv', path.join(d, 'einzeln.csv')];
  const z = [];
  for (const t of teile) {
    const j = path.join(d, `ab-${t.laufId}.json`), r = path.join(d, `roh-${t.laufId}.jsonl`);
    fs.writeFileSync(j, JSON.stringify(t.daten));
    fs.writeFileSync(r, t.roh.map(x => JSON.stringify(x)).join('\n') + '\n');
    args.push('--teil', `${t.laufId},${j},${r}`);
    z.push([t.laufId, '1', t.name, sha(t.laufId), 'sha256:' + sha(t.laufId)].join('\t'));
  }
  fs.writeFileSync(path.join(d, 'p.tsv'), z.join('\n') + '\n');
  const res = spawnSync(process.execPath, [SKRIPT, ...args], {encoding: 'utf8', env: process.env});
  res.csvPfad = path.join(d, 'einzeln.csv');
  return res;
}
const engineWieFestgelegt = () => {
  const ist = blocksummen(STANDARD_HTML);
  return Object.entries(BLOCKSUMMEN).every(([b, s]) => ist[b] === s);
};

test('Ende zu Ende: 123 Teilläufe, nachgebautes GNU Go → Ausgang 0 mit allen Teilen', () => {
  if (!engineWieFestgelegt()) return 'skip';
  process.env.FAKE_WERTE = '100:B+1.0,200:B+2.0,300:B+3.0';
  const r = befehlszeile({gnugo: fakeGnugo()});
  pruefeGleich(r.status, 0, `Ausgang; ${r.stdout.slice(0, 300)} ${r.stderr.slice(0, 200)}`);
  for (const t of ['## 1. Pässe', '## 2. q je Arm', '## 3. Kipppunkt', '## 4. Baumwiederverwendung', '**Gültig.**'])
    pruefe(r.stdout.includes(t), `Bericht enthält ${t}`);
  /* Alle Schätzungen B+: Verlierer Schwarz nie hinten (kein), Verlierer Weiß ab 100 hinten. */
  pruefe(/\| A als Schwarz \| \d+ \| 0 \(0,0 %\) \| 0 \(0,0 %\) \| 0 \(0,0 %\) \| \d+ \(100,0 %\)/.test(r.stdout), 'Schwarz verliert: kein');
  pruefe(/\| B als Weiß \| \d+ \| \d+ \(100,0 %\)/.test(r.stdout), 'Weiß verliert: ab 100');
  pruefeGleich(fs.readFileSync(r.csvPfad, 'utf8').trim().split('\n').length, 1231, 'CSV: 1230 Partien');
  pruefe(r.stdout.includes('Messpunkte 3690, davon ohne Schätzung 0'), 'Messpunkte gezählt');
});

test('Ende zu Ende: Befund aus Teil 1c → KEIN URTEIL (Ausgang 1)', () => {
  if (!engineWieFestgelegt()) return 'skip';
  const r = befehlszeile({gnugo: fakeGnugo(), zuege: 30, aendere: t => { t[0].roh[0].ereignisse[0].sims = 2599; }});
  pruefeGleich(r.status, 1, 'Ausgang');
  pruefe(r.stdout.includes('KEIN URTEIL') && r.stdout.includes('Befunde'), 'Grund genannt');
});

test('Ende zu Ende: GNU Go fehlt → KEIN URTEIL; Bedienfehler → Ausgang 2', () => {
  if (!engineWieFestgelegt()) return 'skip';
  const r = befehlszeile({gnugo: path.join(tmpdir(), 'gibt-es-nicht'), zuege: 30});
  pruefeGleich(r.status, 1, 'Ausgang ohne GNU Go');
  pruefe(r.stdout.includes('GNU Go startet nicht'), 'Grund');
  pruefeGleich(spawnSync(process.execPath, [SKRIPT, '--parallel', '0'], {encoding: 'utf8'}).status, 2, 'Bedienfehler');
});

/* ── 5. Echtes GNU Go ──────────────────────────────────────────── */

test('Echtes GNU Go: kurze Harness-Partie nachgespielt, Schätzung an jedem Messpunkt', async () => {
  if (!fs.existsSync(ECHT)) return 'skip';
  const ziel = path.join(tmpdir(), 'echt.jsonl');
  execFileSync(process.execPath, [HARNESS, '--html', STANDARD_HTML, '--games', '1', '--maxmoves', '205', '--seed', '7',
    '--A', 'mctsFixedSims=30,resignEnabled=0', '--B', 'mctsFixedSims=30,resignEnabled=0', '--roh', ziel], {stdio: 'ignore'});
  const r = JSON.parse(fs.readFileSync(ziel, 'utf8').trim().split('\n')[0]);
  const p = {seed: 7, partie: 1, zuege: r.zuege, armVon: {S: r.armSchwarz, W: r.armWeiss},
             verliererFarbe: r.sieger === 'S' ? 'W' : 'S', verliererArm: 'A', ereignisse: r.ereignisse};
  const bew = await D.bewerte([p], {gnugo: ECHT, parallel: 1});
  const soll = D.MESSPUNKTE.filter(z => z <= r.zuege).length;
  pruefe(soll >= 1, `Partie zu kurz für einen Messpunkt: ${r.zuege} Züge`);
  pruefeGleich(bew[0].werte.length, soll, 'Messpunkte');
  for (const w of bew[0].werte) pruefe(w.s && Number.isFinite(w.s.wert), `Schätzung nach Zug ${w.zug}: ${JSON.stringify(w.s)}`);
});

laufeTests('K3-Diagnose (Aufbauprüfung, Teil 3)').then(ok => process.exit(ok ? 0 : 1));
