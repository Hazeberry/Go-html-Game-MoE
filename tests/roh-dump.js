/* Rohdump des A/B-Harness — Schema und Abbruchkriterium.

   Die verbindliche Beschreibung steht in docs/pilot-benson-defense.md, §5.
   Dieser Test prüft, dass die Implementierung sie einhält. Wer das Format
   ändert, ändert zuerst dort und dann hier.

   Geprüft wird gegen einen echten, kurzen Harness-Lauf statt gegen eine
   Nachbildung: ein Test, der ein Format prüft, das niemand schreibt, prüft
   nichts. Deshalb auch die feste Simulationszahl — ohne sie wäre der zweite
   Lauf nicht reproduzierbar und das Abbruchkriterium nicht testbar. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {STANDARD_HTML, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen.js');

const HARNESS = path.join(__dirname, '..', 'ab-harness.js');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'rohdump-'));

/* Klein gehalten: der Test prüft das Format, nicht die Spielstärke.
   60 Simulationen und 40 Züge reichen dafür und halten ihn unter 10 s. */
const ARGS = ['--html', STANDARD_HTML, '--games', '2', '--maxmoves', '40',
              '--seed', '4242', '--A', 'mctsFixedSims=60', '--B', 'mctsFixedSims=60'];

function lauf(datei) {
  const ziel = path.join(TMP, datei);
  execFileSync(process.execPath, [HARNESS, ...ARGS, '--roh', ziel],
               {stdio: 'ignore'});
  return fs.readFileSync(ziel, 'utf8').trim().split('\n').map(z => JSON.parse(z));
}

let ERSTER = null;
const ersterLauf = () => (ERSTER || (ERSTER = lauf('a.jsonl')));

test('Eine Zeile je Partie, jede für sich gültiges JSON', () => {
  const z = ersterLauf();
  pruefeGleich(z.length, 2, 'Zeilen im Dump');
  for (const p of z) pruefeGleich(p.typ, 'partie', 'Satztyp');
});

test('Der Partiesatz trägt die Felder aus §5.1', () => {
  const p = ersterLauf()[0];
  for (const feld of ['typ', 'nr', 'seed', 'params_hash', 'final_board_hash',
                      'armSchwarz', 'armWeiss', 'sieger', 'zuege', 'gefangene',
                      'aufgabe', 'ereignisse'])
    pruefe(feld in p, `Feld ${feld} fehlt im Partiesatz`);
  pruefeGleich(p.nr, 1, 'laufende Nummer');
  pruefeGleich(p.seed, 4242, 'Seed');
  pruefe(p.sieger === 'S' || p.sieger === 'W', `Sieger: ${p.sieger}`);
  pruefe(Number.isInteger(p.gefangene.S) && Number.isInteger(p.gefangene.W),
    'Gefangene beider Farben sind ganze Zahlen');
});

test('Beide Hashes sind volle SHA-256 (§5.3)', () => {
  for (const p of ersterLauf()) {
    pruefe(/^[0-9a-f]{64}$/.test(p.params_hash), `params_hash: ${p.params_hash}`);
    pruefe(/^[0-9a-f]{64}$/.test(p.final_board_hash), `final_board_hash: ${p.final_board_hash}`);
  }
});

test('Das Zugereignis trägt die Felder aus §5.2', () => {
  const p = ersterLauf()[0];
  pruefe(p.ereignisse.length > 10, `zu wenige Ereignisse: ${p.ereignisse.length}`);
  const felder = ['zug', 'farbe', 'idx', 'sims', 'q', 'frei', 'tor', 'totEigen',
                  'totFremd', 'grossGruppen', 'minFreiGross', 'transferEigen',
                  'transferFremd', 'geschlagen'];
  for (const e of p.ereignisse)
    for (const f of felder) pruefe(f in e, `Feld ${f} fehlt im Zugereignis ${e.zug}`);
  /* Zugnummern lückenlos ab 1, Farben abwechselnd ab Schwarz. */
  p.ereignisse.forEach((e, i) => {
    pruefeGleich(e.zug, i + 1, 'Zugnummer');
    pruefeGleich(e.farbe, i % 2 === 0 ? 'S' : 'W', `Farbe bei Zug ${i + 1}`);
  });
});

test('Die Stellungsgrößen sind plausibel und auf die Stellung VOR dem Zug bezogen', () => {
  const p = ersterLauf()[0];
  const e0 = p.ereignisse[0];
  /* Der erste Zug sieht ein leeres Brett — stünde hier 360, wäre die
     Stellung NACH dem Zug gemessen und §5.2 verletzt. */
  pruefeGleich(e0.frei, 361, 'freie Felder vor dem ersten Zug');
  pruefeGleich(e0.totEigen, 0, 'tote eigene Steine vor dem ersten Zug');
  pruefeGleich(e0.grossGruppen, 0, 'große Gruppen vor dem ersten Zug');
  /* frei fällt monoton, solange nichts geschlagen wird. */
  let vorher = 362, verstoesse = 0;
  for (const e of p.ereignisse) {
    if (e.frei > vorher) verstoesse++;
    vorher = e.frei;
  }
  const schlaege = p.ereignisse.filter(e => e.geschlagen > 0).length;
  pruefe(verstoesse <= schlaege,
    `freie Felder stiegen ${verstoesse}-mal bei nur ${schlaege} Schlägen`);
  pruefe(p.ereignisse.every(e => e.tor === (e.frei <= 160)),
    'tor muss frei <= bensonEvalMaxEmpty entsprechen');
});

test('Abbruchkriterium §4.2: gleicher Seed, gleiche Hashes', () => {
  /* Das ist die Kontrolle, an der die Dosisreihe hängt. Weicht sie ab, ist
     jeder Lauf ungültig — deshalb steht sie hier und nicht nur im Dokument. */
  const a = ersterLauf();
  const b = lauf('b.jsonl');
  pruefeGleich(b.length, a.length, 'Partienzahl beider Läufe');
  for (let i = 0; i < a.length; i++) {
    pruefeGleich(b[i].params_hash, a[i].params_hash, `params_hash Partie ${i + 1}`);
    pruefeGleich(b[i].final_board_hash, a[i].final_board_hash,
      `final_board_hash Partie ${i + 1}`);
    pruefeGleich(JSON.stringify(b[i].ereignisse), JSON.stringify(a[i].ereignisse),
      `Ereignisse Partie ${i + 1}`);
  }
});

test('auswertung/benson-reihe.js liest den Dump und rechnet je Partie', () => {
  /* Der Rechenweg hinter §12 und §14 ging einmal verloren. Dieser Fall hält
     fest, dass das Werkzeug zum Format passt, das der Harness schreibt. */
  ersterLauf();
  const {auswerten} = require('../auswertung/benson-reihe.js');
  const {zeilen, text} = auswerten(path.join(TMP, 'a.jsonl'));
  pruefeGleich(zeilen.length, 2, 'Partien in der Auswertung');
  for (const z of zeilen)
    for (const arm of ['A', 'B'])
      for (const k of ['v2', 'gruppen', 'steine', 'verlustMax', 'd1'])
        pruefe(Number.isInteger(z[arm][k]) && z[arm][k] >= 0, `${arm}.${k} = ${z[arm][k]}`);
  pruefe(text.includes('params_hash einheitlich: ja'), 'Hash-Prüfung fehlt in der Ausgabe');
});

test('auswertung/einfluss.js liest den Dump und ordnet jeden Zug einer Zone zu', () => {
  ersterLauf();
  const {zonen} = require('../auswertung/einfluss.js');
  for (const p of ersterLauf()) {
    const z = zonen(p);
    const zuege = p.ereignisse.filter(e => e.idx >= 0);
    for (const f of ['S', 'W']) {
      const n = z[f].gegner + z[f].eigen + z[f].neutral;
      pruefeGleich(n, zuege.filter(e => e.farbe === f).length, `Züge von ${f} mit Zone`);
    }
  }
});

test('auswertung/wurzel-gleichstand.js rekonstruiert die Wurzelliste aus dem Dump', () => {
  ersterLauf();
  const {messen} = require('../auswertung/wurzel-gleichstand.js');
  const z = messen(path.join(TMP, 'a.jsonl'), {partien: 2, abstand: 5});
  pruefe(z.length > 0, 'keine Stellung gemessen');
  for (const r of z) {
    pruefe(['sicher', 'los', 'darunter', 'pass', 'gefiltert'].includes(r.gespielt), `Klasse ${r.gespielt}`);
    pruefe(r.voll >= 0 && r.voll <= 1 && r.fein >= 0 && r.fein <= 1, 'Überlappung außerhalb [0, 1]');
    pruefe(r.ueber + r.gleich >= 16 || r.kandidaten <= 16, 'Platz 16 liegt nicht in ueber + gleich');
  }
  /* Je Arm mit eigenen Parametern: jede Zeile trägt ihren Arm, und PARAMS
     sind danach unverändert. */
  const {PARAMS} = require('../auswertung/wurzel-gleichstand.js');
  const vorher = PARAMS.endgameMoves;
  const za = messen(path.join(TMP, 'a.jsonl'), {partien: 2, abstand: 5,
    armParams: {A: {}, B: {endgameMoves: 150}}});
  pruefe(za.every(r => r.arm === 'A' || r.arm === 'B'), 'Zeile ohne Arm');
  pruefeGleich(za.length, z.length, 'gleich viele Stellungen mit und ohne Armparameter');
  pruefeGleich(PARAMS.endgameMoves, vorher, 'endgameMoves nach der Messung');
});

test('params_hash hängt an den Parametern, nicht am Seed', () => {
  /* §5.3: derselbe Parametersatz soll über Seeds hinweg denselben Hash
     tragen — sonst könnte man nicht prüfen, ob zwei Läufe dieselbe
     Konfiguration hatten. Und ein geänderter Parameter muss ihn bewegen,
     sonst prüft der Hash nichts. */
  const ziel = p => {
    const d = path.join(TMP, p.datei);
    execFileSync(process.execPath, [HARNESS, '--html', STANDARD_HTML,
      '--games', '1', '--maxmoves', '10', '--seed', String(p.seed),
      '--A', p.a, '--B', p.a, '--roh', d], {stdio: 'ignore'});
    return JSON.parse(fs.readFileSync(d, 'utf8').trim().split('\n')[0]).params_hash;
  };
  const basis  = ziel({datei: 'h1.jsonl', seed: 1, a: 'mctsFixedSims=20'});
  const anderS = ziel({datei: 'h2.jsonl', seed: 2, a: 'mctsFixedSims=20'});
  const anderP = ziel({datei: 'h3.jsonl', seed: 1, a: 'mctsFixedSims=20,bensonDeathTransfer=1'});
  pruefeGleich(anderS, basis, 'anderer Seed darf den params_hash nicht ändern');
  pruefe(anderP !== basis, 'ein geänderter Parameter MUSS den params_hash ändern');
});

test('Ohne --roh entsteht keine Datei und nichts wird gerechnet', () => {
  /* Die Analyse je Zug kostet ein bensonClassify und zwei Gruppenläufe. Ein
     normaler A/B-Lauf soll das nicht zahlen. */
  const d = path.join(TMP, 'gibtsnicht.jsonl');
  execFileSync(process.execPath, [HARNESS, '--html', STANDARD_HTML,
    '--games', '1', '--maxmoves', '10', '--seed', '7',
    '--A', 'mctsFixedSims=20', '--B', 'mctsFixedSims=20'], {stdio: 'ignore'});
  pruefe(!fs.existsSync(d), 'ohne --roh darf keine Dumpdatei entstehen');
});

test('--roh zusammen mit --paired bricht ab, statt stillschweigend nichts zu schreiben', () => {
  /* Der Rohdump ist nur im Standardmodus verdrahtet. Früher lief ein Paarlauf
     mit --roh einfach durch und hinterließ keine Datei und keine Meldung. */
  const d = path.join(TMP, 'paar.jsonl');
  let code = 0, fehler = '';
  try {
    execFileSync(process.execPath, [HARNESS, '--html', STANDARD_HTML,
      '--paired', '1', '--maxmoves', '10', '--seed', '7', '--roh', d],
      {stdio: ['ignore', 'ignore', 'pipe']});
  } catch (e) { code = e.status; fehler = String(e.stderr || ''); }
  pruefeGleich(code, 2, 'Exit-Code bei --roh mit --paired');
  pruefe(fehler.includes('--roh und --paired'), `Meldung fehlt oder unklar: ${fehler}`);
  pruefe(!fs.existsSync(d), 'es darf keine Dumpdatei entstehen');
});

if (require.main === module)
  laufeTests('Rohdump des Harness (--roh)').then(ok => {
    try { fs.rmSync(TMP, {recursive: true, force: true}); } catch (e) { /* egal */ }
    process.exit(ok ? 0 : 1);
  });
