// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Werkzeuge und Workflows der Datenaggregation (docs/muster-endspiel-dagger.md),
   der Messung gegen GNU Go (docs/muster-endspiel-messung.md) und des
   Orakel-Tests (docs/muster-endspiel-orakel.md).

     1. Die Tabelle lässt sich aus index.html auslesen und wieder einsetzen
        (muster-endspiel-tabelle.js); eine index.html ohne die Zeile wird
        abgelehnt.
     2. Der Pilotbericht rechnet gepaart richtig: t-Test, Intervall, Hälften,
        Siege; die Kontrolle gegen eine frühere Datei zählt gleiche Partien.
     3. Die Skripte in auswertung/dagger/ lehnen falsche Eingaben ab, ehe sie
        etwas tun.
     4. Die Workflows endspiel-dagger.yml, endspiel-messung.yml und
        endspiel-orakel.yml: Eingaben des Dispatch-Formulars stehen nur in
        env-Blöcken, und in run-Blöcken steht kein ${{ }} (Script-Injection,
        wie in ab-harness.yml); die Vorgaben der beiden letzten stimmen mit der
        jeweiligen Vorabfestlegung überein.
     5. Die Zusatzzahlen und der Bericht der Messung: Median, Vorzeichentest,
        16 Teile je Arm zu einem Bericht; fehlende oder unvollständige Teile
        werden abgelehnt.
     6. Der Bericht des Orakel-Tests: Zählung der ersetzten und geänderten
        Züge, Punkte je geändertem Zug, Steigung und Messlatte, Kontrolle
        gegen eine frühere Messung, 8 Teile je Arm zu einem Bericht.
     7. Die Zusatzrechnung zum Passen (orakel-nachspiel.js): erster Pass,
        Zählung aus Sicht der KI, Zusammenfassung. Das Nachspielen in GNU Go
        prüft tests/gnugo-bruecke.js.
     8. Die Parameter-Reihe (docs/parameter-reihe.md): Workflow, Arme in
        Skript, Workflow und Dokument stimmen überein, jeder geänderte
        Parameter steht in index.html; der Bericht urteilt nach der vorab
        festgelegten Regel und prüft die Negativkontrolle; 16 Teile je Arm
        (N: 2) werden zu einem Bericht, unvollständige Teile abgelehnt. Die
        Pass-Sonde (pass-sonde.js) findet ihre Stelle in index.html.
     9. Die Messung zu bensonAliveExempt (docs/benson-lebend-treppe.md):
        Workflow, Arme in Skript, Workflow und Dokument stimmen überein,
        der Schalter steht in index.html mit Default 0; der Bericht urteilt
        mit alpha 0,05, unvollständige Teile werden abgelehnt; die Treppen-
        Sonde (treppe-sonde.js) findet ihre vier Stellen in index.html.
    11. Der Endspiel-Lerner (docs/endspiel-lerner.md): Workflow und Vorgaben
        wie in der Vorabfestlegung, das Netz liegt im Repo, lerner-teil.sh
        lehnt falsche Eingaben ab; Merkmale, Vorwärtsrechnung und Tor.
    10. Die Nachmessung der Prior-Schärfe und von bensonDeathTransfer
        (docs/prior-nachmessung.md): Workflow, Arme in Skript, Workflow und
        Dokument stimmen überein, die Vorgaben auch; die Skripte lehnen falsche
        Eingaben ab; der Bericht prüft Stufe 1 mit alpha 0,05, Stufe 2 gegen S9
        mit alpha 0,0167, die Umschaltung von PH, die Kontrolle und M2;
        unvollständige Teile werden abgelehnt. Der Bericht des Selbstspiels
        (selbstspiel-bericht.js) zählt richtig und lehnt unvollständige,
        doppelte und fremde Teile ab.

   Aufruf:  node tests/dagger.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const T = require('../auswertung/muster-endspiel-tabelle.js');
const B = require('../auswertung/endspiel-pilot-bericht.js');
const Z = require('../auswertung/messung-zusatz.js');
const O = require('../auswertung/orakel-bericht.js');
const N = require('../auswertung/orakel-nachspiel.js');
const P = require('../auswertung/parameter-bericht.js');
const PS = require('../auswertung/pass-sonde.js');
const TS = require('../auswertung/treppe-sonde.js');
const SB = require('../auswertung/selbstspiel-bericht.js');
const LB = require('../auswertung/lerner-bericht.js');
const LM = require('../auswertung/lerner-merkmale.js');
const LN = require('../auswertung/lerner-netz.js');

const wurzel = path.join(__dirname, '..');
const temp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'dagger-'));

test('Tabelle: einsetzen und auslesen, Schlüssel sortiert', () => {
  const d = temp(), html = path.join(d, 'index.html');
  fs.writeFileSync(html, '<script>\nconst A = 1;\nconst MUSTER_ENDSPIEL = {};\nconst B = 2;\n</script>\n');
  const tab = {'z:2': 0.5, 'd:1-1': -1.25, 'k:..ox': 2};
  T.setzeEin(html, tab);
  const text = fs.readFileSync(html, 'utf8');
  pruefe(text.includes('const A = 1;\nconst MUSTER_ENDSPIEL = {"d:1-1":-1.25,"k:..ox":2,"z:2":0.5};\nconst B = 2;'), 'Zeile ersetzt, Rest unverändert');
  const zurueck = T.liesTabelle(html);
  pruefeGleich(JSON.stringify(zurueck), JSON.stringify({'d:1-1': -1.25, 'k:..ox': 2, 'z:2': 0.5}), 'Auslesen gibt die Tabelle zurück');
  T.setzeEin(html, {'m:#|#': 1});
  pruefeGleich(Object.keys(T.liesTabelle(html)).length, 1, 'zweites Einsetzen ersetzt wieder');
  fs.writeFileSync(html, '<script>const X = 1;</script>');
  let fehler = null;
  try { T.setzeEin(html, tab); } catch (e) { fehler = e; }
  pruefe(fehler && /MUSTER_ENDSPIEL/.test(fehler.message), 'index.html ohne die Zeile wird abgelehnt');
});

test('Pilotbericht: gepaarter t-Test, Intervall, t-Quantil', () => {
  pruefeNah(B.tKritisch(59), 2.0010, 0.001, 't-Quantil 0,975 bei 59 Freiheitsgraden');
  pruefeNah(B.tKritisch(4), 2.7764, 0.001, 't-Quantil bei 4 Freiheitsgraden');
  /* Differenzen 1..5: Mittel 3, SD √2,5, t = 3 / (SD/√5) = 4,2426, p = 0,0132 bei 4 Freiheitsgraden */
  const s = B.paarStatistik([1, 2, 3, 4, 5].map(d => ({x: 10 + d, y: 10})));
  pruefeGleich(s.n, 5, 'Paare');
  pruefeNah(s.diff, 3, 1e-12, 'Mittel');
  pruefeNah(s.sd, Math.sqrt(2.5), 1e-12, 'Standardabweichung');
  pruefeNah(s.t, 4.2426, 1e-3, 't');
  pruefeNah(s.p, 0.01324, 5e-4, 'p');
  pruefeNah(s.lo, 3 - 2.7764 * Math.sqrt(2.5) / Math.sqrt(5), 2e-3, 'untere Grenze');
  pruefeNah(s.hi, 3 + 2.7764 * Math.sqrt(2.5) / Math.sqrt(5), 2e-3, 'obere Grenze');
  pruefeGleich(B.paarStatistik([{x: 1, y: 2}, {x: 2, y: 1}]), null, 'zu wenige Paare');
});

test('Pilotbericht: Vergleich nach Partienummer, Hälften, Siege, abgebrochene Partien', () => {
  const arm = (werte, extra = {}) => new Map(werte.map(([nr, endstand, gewonnen]) => [nr, {nr, endstand, gewonnen, schaetzung: {120: endstand / 2}, zuegeAnzahl: 200 + nr, ...(extra[nr] || {})}]));
  const arme = {
    A: arm([[1, 10, true], [2, 20, true], [3, -5, false], [4, 0, false], [5, 30, true], [6, 40, true], [7, 1, true]]),
    B: arm([[1, 15, true], [2, 10, true], [3, -15, false], [4, 5, true], [5, 40, true], [6, 41, true], [7, 99, true]], {7: {abgebrochen: true}}),
  };
  const v = B.vergleiche(arme, 'B', 'A');
  pruefeGleich(v.gesamt.n, 6, 'die abgebrochene Partie fällt samt Partner heraus');
  pruefeNah(v.gesamt.diff, (5 - 10 - 10 + 5 + 10 + 1) / 6, 1e-12, 'mittlere Differenz');
  pruefeGleich(v.siegeX, 5, 'Siege B (ohne Partie 7)'); pruefeGleich(v.siegeY, 4, 'Siege A (ohne Partie 7)');
  pruefeGleich(v.besser, 4, 'besser'); pruefeGleich(v.schlechter, 2, 'schlechter');
  /* Hälften: kleinere Nummern (1–3) und größere (4–6) */
  pruefeNah(v.h1.diff, (5 - 10 - 10) / 3, 1e-12, 'Hälfte 1'); pruefeNah(v.h2.diff, (5 + 10 + 1) / 3, 1e-12, 'Hälfte 2');
  const text = B.bericht(arme, [['B', 'A']], {}).zeilen.join('\n');
  pruefe(/B − A: 6 Paare/.test(text) && /Siege 5 gegen 4/.test(text), 'Berichtszeile');
});

test('Pilotbericht: Kontrolle gegen eine frühere Datei', () => {
  const d = temp(), datei = path.join(d, 'alt.json');
  fs.writeFileSync(datei, JSON.stringify({partien: [
    {arm: 'A', nr: 1, endstand: 5, zuege: 200}, {arm: 'A', nr: 2, endstand: 6, zuege: 201}, {arm: '200', nr: 1, endstand: 7, zuege: 210},
  ]}));
  const m = (nr, endstand, zuegeAnzahl) => [nr, {nr, endstand, zuegeAnzahl}];
  const arme = {A: new Map([m(1, 5, 200), m(2, 6, 999)]), VOR: new Map([m(1, 7, 210)])};
  const k = B.containerKontrolle(arme, datei, {A: 'A', VOR: '200'});
  pruefeGleich(k[0].gleich, 1, 'Arm A: eine gleiche Partie'); pruefeGleich(k[0].n, 2, 'Arm A: zwei verglichen');
  pruefeGleich(k[1].gleich, 1, 'Arm VOR: gleich'); pruefeGleich(k[1].n, 1, 'Arm VOR: eine verglichen');
});

test('Skripte lehnen falsche Eingaben ab, ehe sie etwas tun', () => {
  const lauf = (skript, ...args) => spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', skript), ...args], {cwd: temp(), encoding: 'utf8'});
  pruefeGleich(lauf('vorbereiten.sh', 'kein-hash').status, 2, 'vorbereiten.sh: Basis kein Hash');
  pruefe(lauf('vorbereiten.sh', '').status !== 0, 'vorbereiten.sh: Basis leer');
  pruefeGleich(lauf('spielen.sh', 'x.jsonl', 'a', '1', '1', '1').status, 2, 'spielen.sh: Zahl erwartet');
  pruefeGleich(lauf('spielen.sh', 'x.jsonl', '1', '1', '1').status, 1, 'spielen.sh: Argument fehlt');
  const s = lauf('lernen.sh');
  pruefe(s.status !== 0, 'lernen.sh ohne Daten bricht ab');
  pruefeGleich(lauf('messung-ergebnis.sh', 'abc1234', 'tabelle.json', '200').status, 1, 'messung-ergebnis.sh: Argument fehlt');
  pruefeGleich(lauf('messung-ergebnis.sh', 'abc1234', 'gibt-es-nicht.json', '200', '206').status, 2, 'messung-ergebnis.sh: Tabelle fehlt');
  pruefeGleich(lauf('orakel-spielen.sh', 'X9', '1', '206', 'x.jsonl').status, 2, 'orakel-spielen.sh: unbekannter Arm');
  pruefeGleich(lauf('orakel-spielen.sh', 'A', 'a', '206', 'x.jsonl').status, 2, 'orakel-spielen.sh: Zahl erwartet');
  pruefeGleich(lauf('orakel-spielen.sh', 'A', '1', '206').status, 1, 'orakel-spielen.sh: Argument fehlt');
  pruefeGleich(lauf('orakel-ergebnis.sh').status, 1, 'orakel-ergebnis.sh: Seed fehlt');
  pruefeGleich(lauf('orakel-ergebnis.sh', '206', 'gibt-es-nicht.jsonl.gz').status, 2, 'orakel-ergebnis.sh: Kontrolldatei fehlt');
  pruefeGleich(lauf('orakel-ergebnis.sh', '206').status, 1, 'orakel-ergebnis.sh: keine Teile');
  pruefeGleich(lauf('parameter-spielen.sh', 'X9', '1', '206', 'x.jsonl').status, 2, 'parameter-spielen.sh: unbekannter Arm');
  pruefeGleich(lauf('parameter-spielen.sh', 'A', 'a', '206', 'x.jsonl').status, 2, 'parameter-spielen.sh: Zahl erwartet');
  pruefeGleich(lauf('parameter-spielen.sh', 'A', '1', '206').status, 1, 'parameter-spielen.sh: Argument fehlt');
  pruefeGleich(lauf('parameter-spielen.sh', '--ki', 'X9').status, 2, 'parameter-spielen.sh --ki: unbekannter Arm');
  pruefeGleich(lauf('parameter-ergebnis.sh').status, 1, 'parameter-ergebnis.sh: Seed fehlt');
  pruefeGleich(lauf('parameter-ergebnis.sh', '206', 'gibt-es-nicht.jsonl.gz').status, 2, 'parameter-ergebnis.sh: Kontrolldatei fehlt');
  pruefeGleich(lauf('parameter-ergebnis.sh', '206').status, 1, 'parameter-ergebnis.sh: keine Teile');
  pruefeGleich(lauf('benson-lebend-ergebnis.sh').status, 1, 'benson-lebend-ergebnis.sh: Seed fehlt');
  pruefeGleich(lauf('benson-lebend-ergebnis.sh', '206', 'gibt-es-nicht.jsonl.gz').status, 2, 'benson-lebend-ergebnis.sh: Kontrolldatei fehlt');
  pruefeGleich(lauf('benson-lebend-ergebnis.sh', '206').status, 1, 'benson-lebend-ergebnis.sh: keine Teile');
  const x = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-spielen.sh'), '--ki', 'B'], {cwd: temp(), encoding: 'utf8', env: {...process.env, ARME_DATEI: 'gibt-es-nicht.sh'}});
  pruefeGleich(x.status, 2, 'parameter-spielen.sh: Datei der Arme fehlt');
});

/* Workflows: Eingaben des Dispatch-Formulars nur in env-Blöcken, in run-Blöcken kein ${{ }} */
function pruefeShellZeilen(datei, mindestensRun, eingaben) {
  const zeilen = fs.readFileSync(path.join(wurzel, '.github', 'workflows', datei), 'utf8').split('\n');
  const einzug = z => z.length - z.trimStart().length;
  let imRun = false, basis = 0, nRun = 0, nEnv = 0;
  zeilen.forEach((z, i) => {
    const w = i + 1;
    if (z.includes('inputs.') && !z.trimStart().startsWith('#')) {
      pruefe(/^\s+IN_[A-Z_]+: \$\{\{ inputs\.[a-z_]+ \}\}$/.test(z), `Zeile ${w}: Eingabe nur als env-Zuweisung IN_…: ${z.trim()}`);
      nEnv++;
    }
    if (imRun) {
      if (z.trim() === '' || einzug(z) > basis) { pruefe(!z.includes('${{'), `Zeile ${w}: Ausdruck in einem run-Block: ${z.trim()}`); return; }
      imRun = false;
    }
    const m = /^(\s*)(- )?run:\s*(\|)?\s*$/.exec(z);
    if (m) { imRun = true; basis = m[1].length + (m[2] ? 2 : 0); nRun++; return; }
    if (/^\s*(- )?run:\s*\S/.test(z)) { pruefe(!z.includes('${{'), `Zeile ${w}: Ausdruck in einer run-Zeile: ${z.trim()}`); nRun++; }
  });
  pruefe(nRun >= mindestensRun, 'run-Schritte gefunden');
  pruefeGleich(nEnv, eingaben, `${eingaben} Eingaben des Formulars, alle über env`);
}
test('Workflow endspiel-dagger.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('endspiel-dagger.yml', 15, 8));
test('Workflow endspiel-messung.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('endspiel-messung.yml', 6, 4));
test('Workflow endspiel-orakel.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('endspiel-orakel.yml', 5, 2));
test('Workflow parameter-reihe.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('parameter-reihe.yml', 5, 2));
test('Workflow benson-lebend.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('benson-lebend.yml', 5, 2));
test('Workflow prior-nachmessung.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('prior-nachmessung.yml', 10, 4));
test('Workflow endspiel-lerner.yml: keine Ausdrücke in Shell-Zeilen', () => pruefeShellZeilen('endspiel-lerner.yml', 5, 4));

const TEILE = [1, 16, 31, 46, 61, 76, 91, 106, 121, 136, 151, 166, 181, 196, 211, 226];

test('Workflow endspiel-dagger.yml: Aufbau', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-dagger.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'daten', 'lernen', 'pilot-ref', 'pilot-neu', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  for (const v of TEILE) pruefe(t.includes(String(v)), `Teil ${v}`);
  /* dieselben Versionen der Standardaktionen wie in tests.yml */
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const a of ['actions/checkout', 'actions/setup-node']) {
    const ver = s => (s.match(new RegExp(a + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${a} in derselben Version wie tests.yml`);
  }
});

test('Workflow endspiel-messung.yml: Aufbau und Vorgaben wie in der Vorabfestlegung', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-messung.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'spielen', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  pruefe(/arm: \[A, B\]/.test(t), 'beide Arme');
  pruefeGleich((/von: \[([0-9, ]+)\]/.exec(t) || [])[1].split(',').map(Number).join(','), TEILE.join(','), '16 Teile zu je 15 Partien');
  pruefe(/spielen\.sh "messung\/\$ARM-\$VON\.jsonl" "\$VON" 15 /.test(t), 'je Teil 15 Partien');
  pruefe(/\[ "\$ARM" = A \] && GEWICHT=0/.test(t), 'Arm A spielt mit Gewicht 0 (Schalter aus)');
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const a of ['actions/checkout', 'actions/setup-node']) {
    const ver = s => (s.match(new RegExp(a + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${a} in derselben Version wie tests.yml`);
  }
  /* Vorgaben des Formulars = Eingaben in docs/muster-endspiel-messung.md §7 */
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-endspiel-messung.md'), 'utf8');
  for (const name of ['basis', 'tabelle', 'gewicht', 'seed']) {
    const imDoc = (new RegExp('^\\| `' + name + '` \\| `?([^` |]+)', 'm').exec(doc) || [])[1];
    const imFlow = (new RegExp('^      ' + name + ':\\n(?:        .*\\n)*?        default: \'([^\']*)\'', 'm').exec(t) || [])[1];
    pruefe(imDoc !== undefined && imDoc === imFlow, `Vorgabe ${name}: Dokument „${imDoc}“, Workflow „${imFlow}“`);
  }
  /* die Tabelle von B gibt es und sie hat Einträge */
  const tab = JSON.parse(fs.readFileSync(path.join(wurzel, 'docs', 'daten', 'dagger', 'runde3-lauf3', 'tabelle-neu.json'), 'utf8'));
  pruefe(Object.keys(tab.tabelle).length > 1000, 'Tabelle T4 im Repo');
});

test('Zusatzzahlen der Paarmessung: Vorzeichentest, Median, abgebrochene Partien', () => {
  pruefeNah(Z.vorzeichenP(5, 5), 1, 1e-12, 'gleich verteilt: p = 1');
  pruefeNah(Z.vorzeichenP(9, 1), 2 * 11 / 1024, 1e-12, '9 gegen 1: p = 2 · 11/1024');
  pruefeNah(Z.vorzeichenP(1, 9), 2 * 11 / 1024, 1e-12, 'symmetrisch');
  pruefeGleich(Z.vorzeichenP(0, 0), 1, 'keine Paare');
  pruefeNah(Z.vorzeichenP(97, 82), 0.2954, 5e-4, '97 gegen 82');
  const arm = werte => new Map(werte.map(([nr, endstand, extra]) => [nr, {nr, endstand, zuegeAnzahl: 200 + nr, ...(extra || {})}]));
  const A = arm([[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0]]);
  const Bm = arm([[1, 10], [2, -4], [3, 0], [4, 6], [5, 8], [6, 99, {abgebrochen: true}]]);
  const z = Z.zusatz(A, Bm);
  pruefeGleich(z.paare, 5, 'die abgebrochene Partie fällt samt Partner heraus');
  pruefeGleich(z.besser, 3, 'besser'); pruefeGleich(z.schlechter, 1, 'schlechter'); pruefeGleich(z.gleich, 1, 'gleich');
  pruefeGleich(z.median, 6, 'Median der Differenzen 10, −4, 0, 6, 8');
  pruefeNah(z.zuegeA, 203, 1e-12, 'Züge je Partie A (Partien 1–5)');
  pruefeGleich(z.abgebrochenB, 1, 'eine abgebrochene Partie in B');
  pruefe(/Median der Differenz B − A: \+6,0/.test(Z.text(z)) && /B besser in 3 Paaren, schlechter in 1, gleich in 1/.test(Z.text(z)), 'Textzeilen');
});

/* Bericht der Messung aus 16 Teilen je Arm: Differenz B − A = 5 + (nr mod 3 − 1), im Mittel genau +5 */
function messungsTeile(verzeichnis, ohne) {
  const dir = path.join(verzeichnis, 'messung');
  fs.mkdirSync(dir, {recursive: true});
  for (const arm of ['A', 'B']) for (const von of TEILE) {
    if (ohne === `${arm}-${von}`) continue;
    const zeilen = [];
    for (let nr = von; nr < von + 15; nr++) {
      const a = ((nr * 37) % 101) - 50, endstand = arm === 'A' ? a : a + 5 + ((nr % 3) - 1);
      zeilen.push(JSON.stringify({nr, endstand, gewonnen: endstand > 0, zuegeAnzahl: 200 + (nr % 7), schaetzung: {120: endstand / 2, 200: endstand}}));
    }
    if (ohne === `${arm}-${von}-kurz`) zeilen.pop();
    fs.writeFileSync(path.join(dir, `${arm}-${von}.jsonl`), zeilen.join('\n') + '\n');
  }
}

test('Bericht der Messung: 16 Teile je Arm zu einem Bericht, Rohdaten gepackt', () => {
  const d = temp();
  messungsTeile(d);
  fs.writeFileSync(path.join(d, 'tabelle.json'), '{"tabelle":{"m:x":1}}');
  const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'messung-ergebnis.sh'), 'abc1234567', 'tabelle.json', '200', '206'], {cwd: d, encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Bericht läuft durch: ' + (r.stderr || '').slice(0, 300));
  const lies = f => fs.readFileSync(path.join(d, 'ergebnisse', f), 'utf8');
  const bericht = lies('bericht.md');
  pruefe(/Basis `abc1234`/.test(bericht) && /Gewicht 200, Seed 206/.test(bericht), 'Kopf mit Basis, Gewicht und Seed');
  pruefe(/B − A: 240 Paare/.test(lies('messung.txt')) && /Differenz \+5,0/.test(lies('messung.txt')), 'gepaarte Differenz +5,0 aus 240 Paaren');
  pruefe(/\| \*\*B − A\*\* \| 240 \|/.test(lies('messung.md')), 'Tabelle in Markdown');
  pruefe(/nach Zug 120: 240 Paare/.test(lies('zuege.txt')) && /Endstand: 240 Paare/.test(lies('zuege.txt')), 'nach Zug 120, 200 und am Ende');
  pruefe(/B besser in 240 Paaren, schlechter in 0/.test(lies('zusatz.txt')), 'Zusatzzahlen');
  for (const a of ['A', 'B']) {
    const roh = require('zlib').gunzipSync(fs.readFileSync(path.join(d, 'ergebnisse', `${a}.jsonl.gz`))).toString().trim().split('\n');
    pruefeGleich(roh.length, 240, `Rohdaten von ${a}: 240 Partien`);
  }
  pruefeGleich(lies('tabelle-B.json'), '{"tabelle":{"m:x":1}}', 'Tabelle von B mitgenommen');
});

test('Bericht der Messung: fehlende oder unvollständige Teile werden abgelehnt', () => {
  for (const [ohne, muster] of [['B-91', /B-91\.jsonl fehlt/], ['A-226-kurz', /A-226\.jsonl hat nicht 15 Partien/]]) {
    const d = temp();
    messungsTeile(d, ohne);
    fs.writeFileSync(path.join(d, 'tabelle.json'), '{}');
    const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'messung-ergebnis.sh'), 'abc1234', 'tabelle.json', '200', '206'], {cwd: d, encoding: 'utf8'});
    pruefeGleich(r.status, 1, `${ohne}: Abbruch`);
    pruefe(muster.test(r.stderr), `${ohne}: Meldung „${(r.stderr || '').trim()}“`);
    pruefe(!fs.existsSync(path.join(d, 'ergebnisse', 'bericht.md')), `${ohne}: kein Bericht`);
  }
});

test('Workflow endspiel-orakel.yml: Aufbau und Vorgaben wie in der Vorabfestlegung', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-orakel.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'spielen', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  pruefe(/arm: \[A, D25, D50, D100, E100\]/.test(t), 'fünf Arme');
  pruefeGleich((/von: \[([0-9, ]+)\]/.exec(t) || [])[1].split(',').map(Number).join(','), TEILE.slice(0, 8).join(','), '8 Teile zu je 15 Partien (Partien 1 bis 120)');
  pruefe(/orakel-spielen\.sh "\$ARM" "\$VON" "\$SEED" /.test(t), 'ein Teil je Arm und Beginn');
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const a of ['actions/checkout', 'actions/setup-node']) {
    const ver = s => (s.match(new RegExp(a + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${a} in derselben Version wie tests.yml`);
  }
  /* Vorgaben des Formulars = Eingaben in docs/muster-endspiel-orakel.md §7 */
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-endspiel-orakel.md'), 'utf8');
  for (const name of ['seed', 'kontrolle']) {
    const imDoc = (new RegExp('^\\| `' + name + '` \\| `?([^` |]+)', 'm').exec(doc) || [])[1];
    const imFlow = (new RegExp('^      ' + name + ':\\n(?:        .*\\n)*?        default: \'([^\']*)\'', 'm').exec(t) || [])[1];
    pruefe(imDoc !== undefined && imDoc === imFlow, `Vorgabe ${name}: Dokument „${imDoc}“, Workflow „${imFlow}“`);
  }
  /* die Arme im Skript sind die Arme im Dokument */
  const spielen = fs.readFileSync(path.join(wurzel, 'auswertung', 'dagger', 'orakel-spielen.sh'), 'utf8');
  for (const [arm, opt] of [['D25', '80:0.25'], ['D50', '80:0.5'], ['D100', '80'], ['E100', '160']]) {
    pruefe(new RegExp(`${arm}\\) +extra=\\(--orakel-zug ${opt.replace('.', '\\.')}\\)`).test(spielen), `Arm ${arm}: --orakel-zug ${opt}`);
    pruefe(new RegExp('^\\| \\*\\*' + arm + '\\*\\* \\|', 'm').test(doc), `Arm ${arm} steht im Dokument`);
  }
});

/* Synthetische Partien: Endstand von A = ((nr·37) mod 101) − 50; ein Arm mit Orakel liegt um 0,5 Punkte je geändertem Zug darüber, dazu ein Rauschen (nr mod 3) − 1 */
function orakelTeile(verzeichnis, ohne) {
  const dir = path.join(verzeichnis, 'orakel');
  fs.mkdirSync(dir, {recursive: true});
  const arme = {A: null, D25: [80, 20, 5], D50: [80, 40, 10], D100: [80, 80, 20], E100: [40, 40, 10]};   /* [Gelegenheiten, eingesetzt, gleich] */
  for (const [arm, o] of Object.entries(arme)) for (const von of TEILE.slice(0, 8)) {
    if (ohne === `${arm}-${von}`) continue;
    const zeilen = [];
    for (let nr = von; nr < von + 15; nr++) {
      const a = ((nr * 37) % 101) - 50, endstand = o ? a + 0.5 * (o[1] - o[2]) + ((nr % 3) - 1) : a;
      const rec = {nr, beginnt: 'W', wirFarbe: 'S', endstand, gewonnen: endstand > 0, zuegeAnzahl: 240, schaetzung: {120: endstand / 2, 200: endstand}};
      if (o) rec.orakelZug = {ab: arm === 'E100' ? 160 : 80, anteil: {D25: 0.25, D50: 0.5, D100: 1, E100: 1}[arm], stufe: 10, gelegenheiten: o[0], eingesetzt: o[1], gleich: o[2], paesse: 0, neustarts: 0};
      zeilen.push(JSON.stringify(rec));
    }
    if (ohne === `${arm}-${von}-kurz`) zeilen.pop();
    fs.writeFileSync(path.join(dir, `${arm}-${von}.jsonl`), zeilen.join('\n') + '\n');
  }
}

test('Orakel-Bericht: ersetzte und geänderte Züge, Punkte je geändertem Zug, Steigung, Messlatte', () => {
  const d = temp();
  orakelTeile(d);
  const arm = name => B.liesArm(TEILE.slice(0, 8).map(v => path.join(d, 'orakel', `${name}-${v}.jsonl`)));
  const arme = {A: arm('A'), D25: arm('D25'), D50: arm('D50'), D100: arm('D100'), E100: arm('E100')};
  const o = O.orakelArm(arme.D100);
  pruefeGleich(o.partien, 120, '120 Partien'); pruefeGleich(o.gelegenheiten, 80, 'Gelegenheiten Ø'); pruefeGleich(o.ersetzt, 80, 'ersetzt Ø');
  pruefeGleich(o.geaendert, 60, 'geändert Ø (ersetzt, aber nicht derselbe Zug)'); pruefeNah(o.gleich, 0.25, 1e-12, 'Zug der KI = Orakelzug zu einem Viertel');
  pruefeGleich(O.orakelArm(arme.A), null, 'Arm ohne Orakel');
  pruefeNah(O.steigung([{x: 15, y: 7.5}, {x: 30, y: 15}, {x: 60, y: 30}]), 0.5, 1e-12, 'Steigung durch den Ursprung');
  pruefe(Number.isNaN(O.steigung([])), 'keine Punkte: keine Steigung');
  /* die KI zieht an ungeraden Zugnummern, wenn Weiß (GNU Go) beginnt und sie Schwarz ist */
  pruefeGleich(O.kiZuegeAb({beginnt: 'W', wirFarbe: 'S', zuegeAnzahl: 240}, 80), 80, 'Züge der KI ab Zug 81 bei 240 Zügen');
  pruefeGleich(O.kiZuegeAb({beginnt: 'W', wirFarbe: 'S', zuegeAnzahl: 240}, 160), 40, 'ab Zug 161');
  pruefeGleich(O.kiZuegeAb({beginnt: 'S', wirFarbe: 'S', zuegeAnzahl: 241}, 80), 81, 'beginnt die KI, zieht sie an geraden Nummern');
  pruefeGleich(O.kiZuegeAb({beginnt: 'W', wirFarbe: 'S', zuegeAnzahl: 50}, 80), 0, 'Partie endet vor dem Beginn');
  const a = O.auswertung(arme, 'A', ['D25', 'D50'], 5);
  const z = n => a.zeilen.find(r => r.name === n);
  pruefeNah(z('D100').diff, 30, 1e-9, 'D100 − A'); pruefeNah(z('D50').diff, 15, 1e-9, 'D50 − A'); pruefeNah(z('D25').diff, 7.5, 1e-9, 'D25 − A');
  pruefeNah(z('E100').diff, 15, 1e-9, 'E100 − A'); pruefeNah(z('D100').jeZug, 0.5, 1e-9, 'Punkte je geändertem Zug');
  pruefeNah(a.steigung, 0.5, 1e-9, 'Steigung über die kleinen Dosen'); pruefeGleich(a.gelegenheiten, 80, 'n: Züge der KI ab Zug 81 in den Partien von Arm A');
  pruefeNah(a.q, 5 / (0.5 * 80), 1e-9, 'Messlatte q = 5 / (s × n)');
  const text = O.text(a, 'A', {markdown: false}), md = O.text(a, 'A', {markdown: true});
  pruefe(/Steigung über D25, D50 \(Regression durch den Ursprung\): \+0,50 Punkte je geändertem Zug/.test(text), 'Steigung im Text');
  pruefe(/Für 5 Punkte ist q = 12,5 %/.test(text), 'Messlatte im Text');
  pruefe(/\| \*\*D100\*\* \| ab Zug 81, 100 % \| 120 \|/.test(md) && /\| \*\*E100\*\* \| ab Zug 161, 100 % \|/.test(md), 'Markdown-Tabelle');
  /* Kontrolle gegen eine frühere Datei: Partien 1 bis 120, eine mit anderem Endstand */
  const frueher = path.join(d, 'frueher.jsonl');
  fs.writeFileSync(frueher, [...arme.A.values()].map((r, i) => JSON.stringify(i === 4 ? {...r, endstand: r.endstand + 1} : r)).join('\n') + '\n');
  const k = O.kontrolle(arme.A, frueher);
  pruefeGleich(k.n, 120, 'Kontrolle: 120 verglichen'); pruefeGleich(k.gleich, 119, 'Kontrolle: 119 gleich, eine anders');
  const gz = path.join(d, 'frueher.jsonl.gz');
  fs.writeFileSync(gz, require('zlib').gzipSync(fs.readFileSync(frueher)));
  pruefeGleich(O.kontrolle(arme.A, gz).gleich, 119, 'Kontrolle auch aus einer .gz-Datei');
});

test('Bericht des Orakel-Tests: 8 Teile je Arm zu einem Bericht, Kontrolle, Rohdaten gepackt', () => {
  const d = temp();
  orakelTeile(d);
  /* Kontrolle gegen sich selbst: Arm A der Partien 1 bis 120, gepackt */
  const a = []; for (const v of TEILE.slice(0, 8)) a.push(fs.readFileSync(path.join(d, 'orakel', `A-${v}.jsonl`), 'utf8'));
  fs.writeFileSync(path.join(d, 'kontrolle.jsonl.gz'), require('zlib').gzipSync(a.join('')));
  const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'orakel-ergebnis.sh'), '206', 'kontrolle.jsonl.gz'], {cwd: d, encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Bericht läuft durch: ' + (r.stderr || '').slice(0, 300));
  const lies = f => fs.readFileSync(path.join(d, 'ergebnisse', f), 'utf8');
  pruefe(/Orakel-Test: 120 Paare je Arm/.test(lies('bericht.md')) && /Seed 206/.test(lies('bericht.md')), 'Kopf des Berichts');
  pruefe(/\| \*\*D100 − A\*\* \| 120 \|/.test(lies('paare.md')) && /Differenz \+30,0/.test(lies('paare.txt')), 'gepaarte Differenz D100 − A = +30,0');
  pruefe(/Steigung über D25, D50 \(/.test(lies('orakel.txt')) && /Kontrolle gegen kontrolle\.jsonl\.gz, Arm A: 120 von 120/.test(lies('orakel.txt')), 'Steigung und Kontrolle 120 von 120');
  pruefe(/== E100 gegen A/.test(lies('zusatz.txt')) && /Median der Differenz B − A: \+15,0/.test(lies('zusatz.txt')), 'Zusatzzahlen je Arm');
  for (const arm of ['A', 'D25', 'D50', 'D100', 'E100']) {
    const roh = require('zlib').gunzipSync(fs.readFileSync(path.join(d, 'ergebnisse', `${arm}.jsonl.gz`))).toString().trim().split('\n');
    pruefeGleich(roh.length, 120, `Rohdaten von ${arm}: 120 Partien`);
  }
  /* fehlende oder unvollständige Teile */
  for (const [ohne, muster] of [['D50-61', /D50-61\.jsonl fehlt/], ['E100-106-kurz', /E100-106\.jsonl hat nicht 15 Partien/]]) {
    const e = temp();
    orakelTeile(e, ohne);
    const x = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'orakel-ergebnis.sh'), '206'], {cwd: e, encoding: 'utf8'});
    pruefeGleich(x.status, 1, `${ohne}: Abbruch`);
    pruefe(muster.test(x.stderr), `${ohne}: Meldung „${(x.stderr || '').trim()}“`);
    pruefe(!fs.existsSync(path.join(e, 'ergebnisse', 'bericht.md')), `${ohne}: kein Bericht`);
  }
});


test('Nachspiel-Zusatz: erster Pass, Zählung aus Sicht der KI, Zusammenfassung', () => {
  pruefeGleich(N.ersterPass(['D4', 'Q16', 'pass', 'C3', 'pass', 'pass']), 2, 'erster Pass');
  pruefeGleich(N.ersterPass(['D4', 'Q16']), -1, 'ohne Pass');
  pruefeGleich(N.ausSicht('B+12.5', true), 12.5, 'Schwarz vorn, KI Schwarz');
  pruefeGleich(N.ausSicht('B+12.5', false), -12.5, 'Schwarz vorn, KI Weiß');
  pruefeGleich(N.ausSicht('W+3.5', true), -3.5, 'Weiß vorn, KI Schwarz');
  pruefeGleich(N.ausSicht('0', true), 0, 'Gleichstand');
  /* drei Partien: eine ohne Änderung, eine mit +4 nach dem ersten Pass, eine ohne Pass */
  const a = N.auswerten([
    {erster: 100, laenge: 130, nach: 10, ende: 10, aufgezeichnet: 10},
    {erster: 90, laenge: 120, nach: 6, ende: 10, aufgezeichnet: 10},
    {erster: -1, laenge: 80, nach: null, ende: 20, aufgezeichnet: 21},
  ]);
  pruefeGleich(a.partien, 3, 'Partien');
  pruefeGleich(a.gleich, 2, 'Nachrechnung gleich der Aufzeichnung');
  pruefeGleich(a.ohnePass, 1, 'Partien ohne Pass');
  pruefeNah(a.diffMittel, 2, 1e-12, 'Ende − nach erstem Pass im Mittel über die Partien mit Pass');
  pruefeGleich(a.geaendert, 1, 'Partien mit Änderung');
  pruefeNah(a.zuegeDanach, 30, 1e-12, 'Züge nach dem ersten Pass');
  pruefeNah(a.endeMittel, 40 / 3, 1e-12, 'Endstand Ø über alle Partien');
  const t = N.text('X', a);
  pruefe(/^X: 3 Partien · Nachrechnung gleich der Aufzeichnung: 2 von 3/.test(t) && /\+2,00/.test(t) && /1 Partien ohne Pass/.test(t), 'Textzeile: ' + t);
});
/* ── Parameter-Reihe (docs/parameter-reihe.md) ─────────────────────────── */

/* Arme aus parameter-arme.sh: Reihenfolge und geänderte Parameter */
function parameterArme() {
  const t = fs.readFileSync(path.join(wurzel, 'auswertung', 'dagger', 'parameter-arme.sh'), 'utf8');
  const reihe = (/^ARM_REIHE=\(([^)]*)\)/m.exec(t) || [])[1].trim().split(/\s+/);
  const ki = {};
  for (const m of t.matchAll(/^\s+\[([A-Za-z0-9]+)\]="([^"]*)"/gm)) ki[m[1]] = m[2];
  return {reihe, ki};
}

test('Workflow parameter-reihe.yml: Aufbau, Arme und Vorgaben wie in der Vorabfestlegung', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'parameter-reihe.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'parameter-reihe.md'), 'utf8');
  const {reihe, ki} = parameterArme();
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'spielen', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  /* Arme der Matrix = Arme des Skripts, die Negativkontrolle N nur mit zwei Teilen */
  const matrixArme = (/arm: \[([A-Za-z0-9, ]+)\]/.exec(t) || [])[1].split(',').map(a => a.trim());
  pruefeGleich(matrixArme.join(','), reihe.filter(a => a !== 'N').join(','), 'Arme der Matrix = Arme von parameter-arme.sh ohne N');
  pruefeGleich((/von: \[([0-9, ]+)\]/.exec(t) || [])[1].split(',').map(Number).join(','), TEILE.join(','), '16 Teile zu je 15 Partien (Partien 1 bis 240)');
  pruefe(/include:\n\s+- arm: N\n\s+von: 1\n\s+- arm: N\n\s+von: 16\n/.test(t), 'N spielt nur die Teile 1 und 16');
  const jobs = matrixArme.length * TEILE.length + 2;
  pruefe(doc.includes(`${jobs} Jobs`) && t.includes(`${jobs} Jobs`), `${jobs} Jobs im Dokument und im Workflow`);
  pruefe(/parameter-spielen\.sh "\$ARM" "\$VON" "\$SEED" /.test(t), 'ein Teil je Arm und Beginn');
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const a of ['actions/checkout', 'actions/setup-node']) {
    const ver = x => (x.match(new RegExp(a + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${a} in derselben Version wie tests.yml`);
  }
  /* Vorgaben des Formulars = Eingaben in docs/parameter-reihe.md §7 */
  for (const name of ['seed', 'kontrolle']) {
    const imDoc = (new RegExp('^\\| `' + name + '` \\| `?([^` |]+)', 'm').exec(doc) || [])[1];
    const imFlow = (new RegExp('^      ' + name + ':\\n(?:        .*\\n)*?        default: \'([^\']*)\'', 'm').exec(t) || [])[1];
    pruefe(imDoc !== undefined && imDoc === imFlow, `Vorgabe ${name}: Dokument „${imDoc}“, Workflow „${imFlow}“`);
  }
  /* die Arme im Skript sind die Arme im Dokument, und jeder geänderte Parameter gibt es in index.html */
  const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  pruefeGleich(reihe.join(','), 'A,N,RAUS,R30,R3000,S0,S1,S9,B0,B24,P300,PNIE', 'zwölf Arme in der Reihenfolge der Tabelle');
  for (const arm of reihe) {
    const zeile = new RegExp('^\\| \\*\\*' + arm + '\\*\\* \\| (.*?) \\|', 'm').exec(doc);
    pruefe(zeile, `Arm ${arm} steht im Dokument`);
    pruefeGleich(zeile[1] === 'nichts' ? '' : zeile[1].replace(/`/g, ''), ki[arm], `Arm ${arm}: Parameter im Dokument = Skript`);
    const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-spielen.sh'), '--ki', arm], {encoding: 'utf8'});
    pruefeGleich(r.status, 0, `Arm ${arm}: --ki läuft`);
    pruefeGleich(r.stdout.trim(), 'mctsFixedSims=120,resignEnabled=0' + (ki[arm] ? ',' + ki[arm] : ''), `Arm ${arm}: --ki-Angabe`);
    for (const kv of ki[arm].split(',').filter(Boolean)) {
      const key = kv.split('=')[0];
      pruefe(new RegExp('^  ' + key + ':\\s', 'm').test(html), `${key} (Arm ${arm}) ist ein Parameter in index.html`);
    }
  }
});

test('Parameter-Bericht: Urteil nach der vorab festgelegten Regel, Negativkontrolle', () => {
  const g = (diff, p, hi) => ({diff, p, hi});
  pruefeGleich(P.urteil(g(12, 0.001, 20), 0.005), 'besser: Kandidat', 'besser unter alpha');
  pruefeGleich(P.urteil(g(-12, 0.001, -4), 0.005), 'schlechter', 'schlechter unter alpha');
  pruefeGleich(P.urteil(g(9, 0.02, 16), 0.005), 'Hinweis: besser', 'besser, nur unter 0,05');
  pruefeGleich(P.urteil(g(-9, 0.02, -1), 0.005), 'Hinweis: schlechter', 'schlechter, nur unter 0,05');
  pruefeGleich(P.urteil(g(9, 0.005, 16), 0.005), 'Hinweis: besser', 'p genau alpha ist noch kein Kandidat');
  pruefeGleich(P.urteil(g(2, 0.5, 9.9), 0.005), 'verworfen: kein Gewinn von 10', 'Obergrenze unter +10');
  pruefeGleich(P.urteil(g(2, 0.5, 10.1), 0.005), 'nicht belegt', 'Obergrenze über +10');
  pruefeGleich(P.urteil(g(-30, 0.5, 5), 0.005), 'verworfen: kein Gewinn von 10', 'ein schlechter, aber nicht belegter Arm mit niedriger Obergrenze');
  pruefeGleich(P.urteil(null, 0.005), 'zu wenige Paare', 'ohne Paare');
  /* Negativkontrolle: gleiche Zugfolge und gleicher Endstand */
  const rec = (nr, endstand, zuege) => [nr, {nr, endstand, zuegeAnzahl: zuege.length, zuege}];
  const ref = new Map([rec(1, 5, ['a', 'b']), rec(2, 6, ['a', 'c']), rec(3, 7, ['x'])]);
  const arm = new Map([rec(1, 5, ['a', 'b']), rec(2, 6, ['a', 'd']), rec(3, 7, ['x']), rec(4, 1, ['y'])]);
  const k = P.gleiche(ref, arm);
  pruefeGleich(k.n, 3, 'drei Partien in beiden'); pruefeGleich(k.gleich, 2, 'zwei gleich, bei einer weicht ein Zug ab');
  /* Siege gepaart: nur der Arm 3, nur die Referenz 1, beide 2, keiner 1, eine abgebrochene Partie fällt heraus */
  const sp = (nr, gewonnen, abgebrochen) => [nr, {nr, gewonnen, abgebrochen}];
  const s = P.siege(new Map([sp(1, false), sp(2, false), sp(3, false), sp(4, true), sp(5, true), sp(6, true), sp(7, false), sp(8, true)]),
                    new Map([sp(1, true), sp(2, true), sp(3, true), sp(4, false), sp(5, true), sp(6, true), sp(7, false), sp(8, true, true)]));
  pruefeGleich(s.b, 3, 'nur der Arm gewinnt'); pruefeGleich(s.c, 1, 'nur die Referenz gewinnt'); pruefeGleich(s.beide, 2, 'beide'); pruefeGleich(s.keiner, 1, 'keiner');
  pruefeGleich(s.siegeArm, 5, 'Siege des Arms'); pruefeGleich(s.siegeRef, 3, 'Siege der Referenz');
  pruefeNah(s.p, 0.625, 1e-9, 'McNemar exakt bei 3 gegen 1: 2 · (4 + 1) / 16 = 0,625');
});

/* Synthetische Partien: Endstand von A = ((nr·37) mod 101) − 50; ein Arm liegt um sein delta darüber, dazu ein Rauschen (nr mod 5) − 2 mit Mittel 0 über 240 Partien; N ist eine Kopie von A */
const PARAMETER_DELTA = {RAUS: -20, R30: 0, R3000: 20, S0: 0, S1: 0, S9: 0, B0: 0, B24: 0, P300: 0, PNIE: 0};
function parameterTeile(verzeichnis, ohne) {
  const dir = path.join(verzeichnis, 'parameter');
  fs.mkdirSync(dir, {recursive: true});
  for (const arm of parameterArme().reihe) for (const von of arm === 'N' ? TEILE.slice(0, 2) : TEILE) {
    if (ohne === `${arm}-${von}`) continue;
    const zeilen = [];
    for (let nr = von; nr < von + 15; nr++) {
      const a = ((nr * 37) % 101) - 50, endstand = PARAMETER_DELTA[arm] === undefined ? a : a + PARAMETER_DELTA[arm] + ((nr % 5) - 2);
      zeilen.push(JSON.stringify({nr, beginnt: 'W', wirFarbe: 'S', endstand, gewonnen: endstand > 0, zuegeAnzahl: 4, zuege: ['a' + nr, 'b' + nr, 'pass', 'pass'], schaetzung: {120: endstand / 2, 200: endstand}}));
    }
    if (ohne === `${arm}-${von}-kurz`) zeilen.pop();
    fs.writeFileSync(path.join(dir, `${arm}-${von}.jsonl`), zeilen.join('\n') + '\n');
  }
}

test('Bericht der Parameter-Reihe: 16 Teile je Arm zu einem Bericht, Kontrolle, Negativkontrolle, Rohdaten gepackt', () => {
  const d = temp();
  parameterTeile(d);
  /* Kontrolle gegen sich selbst: Arm A der Partien 1 bis 240, gepackt */
  const a = []; for (const v of TEILE) a.push(fs.readFileSync(path.join(d, 'parameter', `A-${v}.jsonl`), 'utf8'));
  fs.writeFileSync(path.join(d, 'kontrolle.jsonl.gz'), require('zlib').gzipSync(a.join('')));
  const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-ergebnis.sh'), '206', 'kontrolle.jsonl.gz'], {cwd: d, encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Bericht läuft durch: ' + (r.stderr || '').slice(0, 300));
  const lies = f => fs.readFileSync(path.join(d, 'ergebnisse', f), 'utf8');
  pruefe(/Parameter-Reihe: 240 Paare je Arm/.test(lies('bericht.md')) && /Seed 206/.test(lies('bericht.md')), 'Kopf des Berichts');
  const md = lies('parameter.md');
  pruefe(/\| RAUS \| `raveEnabled=0` \| 240 \| 0 \|/.test(md), 'Tabelle der Arme mit Parameter');
  pruefe(/\| \*\*RAUS\*\* \| 240 \| \*\*−20,0\*\* .* \| schlechter \|/.test(md), 'RAUS: schlechter');
  pruefe(/\| \*\*R3000\*\* \| 240 \| \*\*\+20,0\*\* .* \| besser: Kandidat \|/.test(md), 'R3000: Kandidat');
  pruefe(/\| \*\*PNIE\*\* \| 240 \| \*\*\+0,0\*\* .* \| verworfen: kein Gewinn von 10 \|/.test(md), 'PNIE: verworfen');
  pruefe(/\| \*\*PNIE\*\* .* \| 48 von 240 \| verworfen/.test(md), 'Spalte „Zug für Zug gleich A“: nur die 48 Partien ohne Rauschen sind gleich');
  pruefe(!/\| \*\*N\*\* \|/.test(md), 'N steht nicht unter den Vergleichen');
  pruefe(/\| \*\*R3000\*\* \| \d+ \| \d+ \| \d+ \| \d+ \| \d+ \| \d+ \| /.test(lies('siege.md')) && /R3000 gegen A: Siege \d+ gegen \d+ · nur R3000 gewinnt/.test(lies('siege.txt')), 'Siege gepaart als Tabelle und als Text');
  pruefe(/## Siege, gepaart \(McNemar, sekundär\)/.test(lies('bericht.md')), 'Siege im Bericht');
  pruefe(/Negativkontrolle N: 30 von 30 Partien Zug für Zug gleich Arm A/.test(md), 'Negativkontrolle 30 von 30');
  pruefe(/Kontrolle gegen kontrolle\.jsonl\.gz, Arm A: 240 von 240/.test(md), 'Kontrolle 240 von 240');
  const z = lies('zusatz.txt');
  pruefe(/== RAUS gegen A/.test(z) && /== PNIE gegen A/.test(z) && !/== N gegen A/.test(z) && /Median der Differenz B − A: −20,0/.test(z), 'Zusatzzahlen je Arm, ohne N');
  for (const arm of parameterArme().reihe) {
    const roh = require('zlib').gunzipSync(fs.readFileSync(path.join(d, 'ergebnisse', `${arm}.jsonl.gz`))).toString().trim().split('\n');
    pruefeGleich(roh.length, arm === 'N' ? 30 : 240, `Rohdaten von ${arm}: ${arm === 'N' ? 30 : 240} Partien`);
  }
  /* fehlende oder unvollständige Teile */
  for (const [ohne, muster] of [['S9-61', /S9-61\.jsonl fehlt/], ['R30-226-kurz', /R30-226\.jsonl hat nicht 15 Partien/], ['N-16', /N-16\.jsonl fehlt/]]) {
    const e = temp();
    parameterTeile(e, ohne);
    const x = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-ergebnis.sh'), '206'], {cwd: e, encoding: 'utf8'});
    pruefeGleich(x.status, 1, `${ohne}: Abbruch`);
    pruefe(muster.test(x.stderr), `${ohne}: Meldung „${(x.stderr || '').trim()}“`);
    pruefe(!fs.existsSync(path.join(e, 'ergebnisse', 'bericht.md')), `${ohne}: kein Bericht`);
  }
  /* weicht eine Partie von N ab, steht das im Bericht */
  const f = temp();
  parameterTeile(f);
  const nDatei = path.join(f, 'parameter', 'N-1.jsonl');
  fs.writeFileSync(nDatei, fs.readFileSync(nDatei, 'utf8').replace('"zuege":["a3","b3"', '"zuege":["a3","zzz"'));
  const y = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-ergebnis.sh'), '206'], {cwd: f, encoding: 'utf8'});
  pruefeGleich(y.status, 0, 'Bericht läuft auch bei abweichender Negativkontrolle');
  pruefe(/Negativkontrolle N: 29 von 30 Partien/.test(fs.readFileSync(path.join(f, 'ergebnisse', 'parameter.md'), 'utf8')), 'abweichende Partie in N wird gezählt');
});

test('Pass-Sonde: Protokollzeile an der Pass-Prüfung, Zählung der Werte', () => {
  const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  const g = PS.gepatcht(html);
  pruefe(g.length > html.length && g.includes("console.error('BEST '"), 'die Kopie bekommt die Protokollzeile');
  pruefeGleich(g.replace(/  if \(mc > 40 && diff === 'hard'\) console\.error\('BEST ' \+ mc \+ ' ' \+ best \+ ' ' \+ scored\.length\);\n/, ''), html, 'sonst bleibt index.html unverändert');
  let fehler = '';
  try { PS.gepatcht('kein index.html'); } catch (e) { fehler = e.message; }
  pruefe(/nicht genau einmal/.test(fehler), 'fehlt die Stelle, bricht die Sonde ab');
  pruefeGleich(PS.lies('BEST 90 120.5 60\nanderes\nBEST 200 -60 40\n').map(z => `${z.mc}:${z.best}:${z.kandidaten}`).join(' '), '90:120.5:60 200:-60:40', 'Zeilen lesen');
  const st = PS.statistik([{mc: 79, best: 5}, {mc: 81, best: 10}, {mc: 82, best: 100}, {mc: 90, best: 400}, {mc: 100, best: 1000}]);
  pruefeGleich(st.n, 4, 'nur Züge nach Zug 80'); pruefeGleich(st.median, 400, 'Median'); pruefeGleich(st.min, 10, 'Minimum'); pruefeGleich(st.max, 1000, 'Maximum');
  const an = s => st.anteil.find(x => x.schwelle === s).anteil;
  pruefeGleich(an(20), 0.25, 'Anteil unter 20'); pruefeGleich(an(100), 0.25, 'Anteil unter 100 (100 selbst nicht)'); pruefeGleich(an(200), 0.5, 'Anteil unter 200'); pruefeGleich(an(500), 0.75, 'Anteil unter 500');
  pruefeGleich(PS.statistik([{mc: 50, best: 1}]), null, 'keine Züge nach Zug 80');
});

/* ── bensonAliveExempt (docs/benson-lebend-treppe.md) ──────────────────── */

test('Workflow benson-lebend.yml: Aufbau, Arme und Vorgaben wie in der Vorabfestlegung', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'benson-lebend.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'benson-lebend-treppe.md'), 'utf8');
  const armeDatei = path.join(wurzel, 'auswertung', 'dagger', 'benson-lebend-arme.sh');
  const a = fs.readFileSync(armeDatei, 'utf8');
  const reihe = (/^ARM_REIHE=\(([^)]*)\)/m.exec(a) || [])[1].trim().split(/\s+/);
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'spielen', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  pruefeGleich((/arm: \[([A-Za-z0-9, ]+)\]/.exec(t) || [])[1].split(',').map(x => x.trim()).join(','), reihe.join(','), 'Arme der Matrix = Arme der Datei');
  pruefeGleich(reihe.join(','), 'A,B', 'zwei Arme');
  pruefeGleich((/von: \[([0-9, ]+)\]/.exec(t) || [])[1].split(',').map(Number).join(','), TEILE.join(','), '16 Teile zu je 15 Partien (Partien 1 bis 240)');
  pruefe(doc.includes(`${reihe.length * TEILE.length} Jobs`) && t.includes(`${reihe.length * TEILE.length} Jobs`), `${reihe.length * TEILE.length} Jobs im Dokument und im Workflow`);
  pruefe(/ARME_DATEI: auswertung\/dagger\/benson-lebend-arme\.sh\n/.test(t), 'die Arme kommen aus benson-lebend-arme.sh');
  pruefe(/parameter-spielen\.sh "\$ARM" "\$VON" "\$SEED" "benson-lebend\/\$ARM-\$VON\.jsonl"/.test(t), 'ein Teil je Arm und Beginn');
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const x of ['actions/checkout', 'actions/setup-node']) {
    const ver = y => (y.match(new RegExp(x + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${x} in derselben Version wie tests.yml`);
  }
  for (const name of ['seed', 'kontrolle']) {
    const imDoc = (new RegExp('^\\| `' + name + '` \\| `?([^` |]+)', 'm').exec(doc) || [])[1];
    const imFlow = (new RegExp('^      ' + name + ':\\n(?:        .*\\n)*?        default: \'([^\']*)\'', 'm').exec(t) || [])[1];
    pruefe(imDoc !== undefined && imDoc === imFlow, `Vorgabe ${name}: Dokument „${imDoc}“, Workflow „${imFlow}“`);
  }
  /* Arm B: im Dokument, in der Datei, in der --ki-Angabe, und der Schalter steht in index.html mit Default 0 */
  pruefe(/\| \*\*B\*\* \| `bensonAliveExempt=1` \|/.test(doc) && /\[B\]="bensonAliveExempt=1"/.test(a), 'Arm B: bensonAliveExempt=1');
  const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-spielen.sh'), '--ki', 'B'], {encoding: 'utf8', env: {...process.env, ARME_DATEI: armeDatei}});
  pruefeGleich(r.stdout.trim(), 'mctsFixedSims=120,resignEnabled=0,bensonAliveExempt=1', '--ki-Angabe von Arm B');
  pruefe(/^  bensonAliveExempt: 0,$/m.test(fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8')), 'bensonAliveExempt steht in index.html mit Default 0');
});

/* Synthetische Partien: Endstand von A = ((nr·37) mod 101) − 50; B liegt um 20 Punkte darüber, dazu ein Rauschen (nr mod 5) − 2 */
function bensonLebendTeile(verzeichnis, ohne) {
  const dir = path.join(verzeichnis, 'benson-lebend');
  fs.mkdirSync(dir, {recursive: true});
  for (const arm of ['A', 'B']) for (const von of TEILE) {
    if (ohne === `${arm}-${von}`) continue;
    const zeilen = [];
    for (let nr = von; nr < von + 15; nr++) {
      const a = ((nr * 37) % 101) - 50, endstand = arm === 'A' ? a : a + 20 + ((nr % 5) - 2);
      zeilen.push(JSON.stringify({nr, beginnt: 'W', wirFarbe: 'S', endstand, gewonnen: endstand > 0, zuegeAnzahl: 4, zuege: ['a' + nr, 'b' + nr, 'pass', 'pass'], schaetzung: {120: endstand / 2, 200: endstand}}));
    }
    if (ohne === `${arm}-${von}-kurz`) zeilen.pop();
    fs.writeFileSync(path.join(dir, `${arm}-${von}.jsonl`), zeilen.join('\n') + '\n');
  }
}

test('Bericht zu bensonAliveExempt: 16 Teile je Arm zu einem Bericht, Kontrolle, Rohdaten gepackt', () => {
  const d = temp();
  bensonLebendTeile(d);
  const a = []; for (const v of TEILE) a.push(fs.readFileSync(path.join(d, 'benson-lebend', `A-${v}.jsonl`), 'utf8'));
  fs.writeFileSync(path.join(d, 'kontrolle.jsonl.gz'), require('zlib').gzipSync(a.join('')));
  const skript = path.join(wurzel, 'auswertung', 'dagger', 'benson-lebend-ergebnis.sh');
  const r = spawnSync('bash', [skript, '206', 'kontrolle.jsonl.gz'], {cwd: d, encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Bericht läuft durch: ' + (r.stderr || '').slice(0, 300));
  const lies = f => fs.readFileSync(path.join(d, 'ergebnisse', f), 'utf8');
  pruefe(/Messung zu bensonAliveExempt: 240 Paare gegen GNU Go/.test(lies('bericht.md')) && /Seed 206/.test(lies('bericht.md')), 'Kopf des Berichts');
  pruefe(/\| \*\*B\*\* \| 240 \| \*\*\+20,0\*\* .* \| besser: Kandidat \|/.test(lies('messung.md')), 'B − A = +20,0, Kandidat bei alpha 0,05');
  pruefe(/alpha 0,05/.test(lies('messung.md')), 'alpha 0,05 im Bericht');
  pruefe(/Kontrolle gegen kontrolle\.jsonl\.gz, Arm A: 240 von 240/.test(lies('messung.md')), 'Kontrolle 240 von 240');
  pruefe(/Median der Differenz B − A: \+20,0/.test(lies('zusatz.txt')), 'Zusatzzahlen');
  for (const arm of ['A', 'B']) {
    const roh = require('zlib').gunzipSync(fs.readFileSync(path.join(d, 'ergebnisse', `${arm}.jsonl.gz`))).toString().trim().split('\n');
    pruefeGleich(roh.length, 240, `Rohdaten von ${arm}: 240 Partien`);
  }
  for (const [ohne, muster] of [['B-61', /B-61\.jsonl fehlt/], ['A-226-kurz', /A-226\.jsonl hat nicht 15 Partien/]]) {
    const e = temp();
    bensonLebendTeile(e, ohne);
    const x = spawnSync('bash', [skript, '206'], {cwd: e, encoding: 'utf8'});
    pruefeGleich(x.status, 1, `${ohne}: Abbruch`);
    pruefe(muster.test(x.stderr), `${ohne}: Meldung „${(x.stderr || '').trim()}“`);
    pruefe(!fs.existsSync(path.join(e, 'ergebnisse', 'bericht.md')), `${ohne}: kein Bericht`);
  }
});

test('Treppen-Sonde: vier Zähler an den Stellen von evaluateBoard, Auswertung', () => {
  const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  const g = TS.gepatcht(html);
  pruefe(g.length > html.length && g.includes('globalThis.__z.calls++') && g.includes('globalThis.__z.mitBenson++') && g.includes('z.alive++') && g.includes('aufrufeMitAlive++'), 'alle vier Zähler sind eingebaut');
  let fehler = '';
  try { TS.gepatcht('kein index.html'); } catch (e) { fehler = e.message; }
  pruefe(/nicht genau einmal/.test(fehler), 'fehlt eine Stelle, bricht die Sonde ab');
  const z = TS.zaehler('rauschen\nZAEHLER {"calls":10,"mitBenson":4,"treppe":6,"alive":3,"dtAlle":300,"dtAlive":60,"aufrufeMitAlive":2,"eigen":1,"fremd":2}\n');
  pruefeGleich(z.alive, 3, 'Zähler aus der Fehlerausgabe'); pruefeGleich(TS.zaehler('nichts'), null, 'ohne Zähler');
  const s = TS.summe([z, z]);
  pruefeGleich(s.calls, 20, 'Summe der Aufrufe'); pruefeGleich(s.dtAlive, 120, 'Summe der Abzüge auf lebenden Ketten');
  pruefe(/davon mit lebender Treppen-Kette 4 \(50,0 %\)/.test(TS.zeile('Zusammen', s)) && /Anteil am Abzug 20,0 %/.test(TS.zeile('Zusammen', s)), 'Zeile: ' + TS.zeile('Zusammen', s));
});

/* ── Nachmessung Prior-Schärfe und bensonDeathTransfer (docs/prior-nachmessung.md) ── */

const LANG = Array.from({length: 32}, (_, k) => 1 + 15 * k);   /* Partien 1 bis 480 */

test('Workflow prior-nachmessung.yml: Aufbau, Arme und Vorgaben wie in der Vorabfestlegung', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'prior-nachmessung.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'prior-nachmessung.md'), 'utf8');
  const armeDatei = path.join(wurzel, 'auswertung', 'dagger', 'prior-arme.sh');
  const a = fs.readFileSync(armeDatei, 'utf8');
  const reihe = (/^ARM_REIHE=\(([^)]*)\)/m.exec(a) || [])[1].trim().split(/\s+/);
  pruefeGleich(reihe.join(','), 'A,S9,S15,S30,PH,BT', 'sechs Arme');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'spielen', 'spielen-weitere', 'kontrolle', 'selbstspiel', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  pruefe(/needs: \[pruefen, spielen, spielen-weitere, kontrolle, selbstspiel\]/.test(t), 'der Bericht wartet auf alle Spieljobs');
  const matrizen = [...t.matchAll(/arm: \[([A-Za-z0-9, ]+)\]\n        (von|teil): \[([0-9, ]+)\]/g)].map(m => ({arme: m[1].split(',').map(x => x.trim()), art: m[2], werte: m[3].split(',').map(Number)}));
  pruefeGleich(matrizen.length, 3, 'drei Matrizen');
  const [lang, kurz, selbst] = matrizen;
  pruefeGleich(lang.arme.join(','), 'A,S9', 'A und S9 spielen 480 Partien');
  pruefeGleich(lang.werte.join(','), LANG.join(','), '32 Teile zu je 15 Partien (1 bis 480)');
  pruefeGleich(kurz.arme.join(','), 'S15,S30,PH,BT', 'die übrigen Arme spielen 240 Partien');
  pruefeGleich(kurz.werte.join(','), TEILE.join(','), '16 Teile zu je 15 Partien (1 bis 240)');
  pruefeGleich([...lang.arme, ...kurz.arme].join(','), reihe.join(','), 'jeder Arm der Datei spielt, genau einmal');
  pruefeGleich(selbst.art, 'teil', 'Selbstspiel in Teilen');
  pruefeGleich(selbst.arme.join(','), 'S9,BT', 'M2 für S9 und BT');
  pruefeGleich(selbst.werte.join(','), '1,2,3,4,5,6,7,8,9,10,11,12', 'zwölf Teile');
  const jobs = lang.arme.length * lang.werte.length + kurz.arme.length * kurz.werte.length + 1 + selbst.arme.length * selbst.werte.length;
  pruefeGleich(jobs, 153, '153 Jobs zum Spielen');
  pruefe(doc.includes(`${jobs} Jobs`) && t.includes(`${jobs} Jobs`), `${jobs} Jobs im Dokument und im Workflow`);
  pruefeGleich((t.match(/ARME_DATEI: auswertung\/dagger\/prior-arme\.sh\n/g) || []).length, 4, 'alle vier Spieljobs lesen prior-arme.sh');
  pruefeGleich((t.match(/parameter-spielen\.sh "\$ARM" "\$VON" "\$SEED" "prior\/\$ARM-\$VON\.jsonl"/g) || []).length, 2, 'ein Teil je Arm und Beginn');
  pruefe(/parameter-spielen\.sh A 1 "\$SEED" prior\/K-1\.jsonl/.test(t) && /SEED: \$\{\{ needs\.pruefen\.outputs\.kontrolle_seed \}\}/.test(t), 'Kontrolle: Arm A, Partien 1 bis 15, mit dem Seed der Kontrolldatei');
  pruefe(/selbstspiel-spielen\.sh "\$ARM" "\$TEIL" "\$SEED_BASIS" "prior\/m2-\$ARM-\$TEIL\.json"/.test(t), 'Selbstspiel: ein Teil je Arm');
  pruefe(/prior-ergebnis\.sh "\$SEED" "\$KONTROLLE" "\$SELBSTSPIEL_SEED"/.test(t), 'Bericht mit Seed, Kontrolle und Seed des Selbstspiels');
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const x of ['actions/checkout', 'actions/setup-node']) {
    const ver = y => (y.match(new RegExp(x + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${x} in derselben Version wie tests.yml`);
  }
  for (const name of ['seed', 'selbstspiel_seed', 'kontrolle', 'kontrolle_seed']) {
    const imDoc = (new RegExp('^\\| `' + name + '` \\| `?([^` |]+)', 'm').exec(doc) || [])[1];
    const imFlow = (new RegExp('^      ' + name + ':\\n(?:        .*\\n)*?        default: \'([^\']*)\'', 'm').exec(t) || [])[1];
    pruefe(imDoc !== undefined && imDoc === imFlow, `Vorgabe ${name}: Dokument „${imDoc}“, Workflow „${imFlow}“`);
  }
  pruefe(fs.existsSync(path.join(wurzel, 'docs', 'daten', 'parameter-reihe', 'lauf1', 'A.jsonl.gz')), 'die Kontrolldatei liegt im Repo');
  /* Jeder Arm: im Dokument, in der Datei und in der --ki-Angabe; die Parameter stehen in index.html */
  const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  for (const arm of reihe) {
    const ki = (new RegExp(`\\[${arm}\\]="([^"]*)"`).exec(a) || [])[1];
    pruefe(ki !== undefined, `Arm ${arm} in der Datei`);
    const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'parameter-spielen.sh'), '--ki', arm], {encoding: 'utf8', env: {...process.env, ARME_DATEI: armeDatei}});
    pruefeGleich(r.stdout.trim(), 'mctsFixedSims=120,resignEnabled=0' + (ki ? ',' + ki : ''), `--ki-Angabe von Arm ${arm}`);
    if (!ki) continue;
    pruefe(doc.includes(`| **${arm}** | \`${ki}\` |`), `Arm ${arm} steht im Dokument mit ${ki}`);
    const name = ki.split(/[@=]/)[0];
    pruefe(new RegExp(`^  ${name}:\\s+[0-9.]+,`, 'm').test(html), `${name} steht in index.html`);
  }
  pruefe(/^  mctsPriorSharp:\s+3,$/m.test(html) && /^  bensonDeathTransfer: 0,$/m.test(html), 'Defaults 3 und 0 in index.html');
});

test('Skripte der Nachmessung lehnen falsche Eingaben ab', () => {
  const s = (...x) => spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', x[0]), ...x.slice(1)], {cwd: temp(), encoding: 'utf8'});
  pruefeGleich(s('selbstspiel-spielen.sh', 'X9', '1', '20261201', 'x.json').status, 2, 'selbstspiel-spielen.sh: unbekannter Arm');
  pruefeGleich(s('selbstspiel-spielen.sh', 'A', '1', '20261201', 'x.json').status, 2, 'selbstspiel-spielen.sh: A gegen sich selbst');
  pruefeGleich(s('selbstspiel-spielen.sh', 'S9', '13', '20261201', 'x.json').status, 2, 'selbstspiel-spielen.sh: Teil 13');
  pruefeGleich(s('selbstspiel-spielen.sh', 'S9', '0', '20261201', 'x.json').status, 2, 'selbstspiel-spielen.sh: Teil 0');
  pruefeGleich(s('selbstspiel-spielen.sh', 'S9', 'a', '20261201', 'x.json').status, 2, 'selbstspiel-spielen.sh: Zahl erwartet');
  pruefeGleich(s('selbstspiel-spielen.sh', 'S9', '1', '20261201').status, 1, 'selbstspiel-spielen.sh: Argument fehlt');
  pruefeGleich(s('prior-ergebnis.sh').status, 1, 'prior-ergebnis.sh: Seed fehlt');
  pruefeGleich(s('prior-ergebnis.sh', '212', 'gibt-es-nicht.jsonl.gz', '20261201').status, 2, 'prior-ergebnis.sh: Kontrolldatei fehlt');
  pruefeGleich(s('prior-ergebnis.sh', '212', path.join(wurzel, 'docs', 'daten', 'parameter-reihe', 'lauf1', 'A.jsonl.gz')).status, 1, 'prior-ergebnis.sh: Seed des Selbstspiels fehlt');
  pruefeGleich(s('prior-ergebnis.sh', '212', path.join(wurzel, 'docs', 'daten', 'parameter-reihe', 'lauf1', 'A.jsonl.gz'), '20261201').status, 1, 'prior-ergebnis.sh: keine Teile');
  /* Phasenstufen in --ki von gnugo-duell.js: falsche Angaben scheitern, ehe GNU Go startet */
  for (const k of ['mctsPriorSharp@x=9', 'mctsPriorSharp@=9', '@5=9', 'mctsPriorSharp@5=', 'mctsPriorSharp@-1=9', 'mctsPriorSharp@5']) {
    const r = spawnSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), '--partien', '1', '--gnugo', '/gibt/es/nicht', '--ki', k], {encoding: 'utf8'});
    pruefeGleich(r.status, 2, `gnugo-duell.js --ki ${k}: abgelehnt`);
    pruefe(/ungültige Phasenstufe/.test(r.stderr), `gnugo-duell.js --ki ${k}: Meldung`);
  }
});

/* Synthetische Teile: Endstand von A = ((nr·37) mod 101) − 50; S9 liegt um 20 darüber, S15 um 20, S30 um 0,
   PH um 30, BT um 1, dazu je ein Rauschen ±((nr mod 5) − 2) mit dem Vorzeichen des Arms (Mittel 0; sonst wären
   die Differenzen zweier Arme konstant). PH beginnt wie A; M2: B gewinnt 20 von 30 je Teil. */
const VERSATZ = {A: 0, S9: 20, S15: 20, S30: 0, PH: 30, BT: 1, K: 0};
const VORZEICHEN = {S9: 1, S15: 1, S30: -1, PH: -1, BT: 1};
function priorTeile(verzeichnis, ohne) {
  const dir = path.join(verzeichnis, 'prior');
  fs.mkdirSync(dir, {recursive: true});
  const teile = {A: LANG, S9: LANG, S15: TEILE, S30: TEILE, PH: TEILE, BT: TEILE, K: [1]};
  for (const [arm, liste] of Object.entries(teile)) for (const von of liste) {
    if (ohne === `${arm}-${von}`) continue;
    const zeilen = [];
    for (let nr = von; nr < von + 15; nr++) {
      const a = ((nr * 37) % 101) - 50, endstand = arm === 'A' || arm === 'K' ? a : a + VERSATZ[arm] + VORZEICHEN[arm] * ((nr % 5) - 2);
      const zuege = arm === 'A' || arm === 'K' || arm === 'PH' ? ['a' + nr, 'b' + nr, 'pass', 'pass'] : [arm + nr, 'b' + nr, 'pass', 'pass'];
      zeilen.push(JSON.stringify({nr, beginnt: 'W', wirFarbe: 'S', endstand, gewonnen: endstand > 0, zuegeAnzahl: 4, zuege, schaetzung: {120: endstand / 2, 200: endstand}}));
    }
    if (ohne === `${arm}-${von}-kurz`) zeilen.pop();
    fs.writeFileSync(path.join(dir, `${arm}-${von}.jsonl`), zeilen.join('\n') + '\n');
  }
  for (const arm of ['S9', 'BT']) for (let k = 1; k <= 12; k++) {
    if (ohne === `m2-${arm}-${k}`) continue;
    const partien = Array.from({length: 30}, (_, g) => ({partie: g + 1, aIst: g % 2 === 0 ? 'Schwarz' : 'Weiß', sieger: g % 3 === 2 ? 'A' : 'B', zuege: 200, aufgabe: g % 4 === 0 ? 'W' : null}));
    fs.writeFileSync(path.join(dir, `m2-${arm}-${k}.json`), JSON.stringify({partien, konfig: {A: 'mctsFixedSims=120', B: 'mctsFixedSims=120,' + (arm === 'S9' ? 'mctsPriorSharp=9' : 'bensonDeathTransfer=1'), seed: 20261200 + k, abgeschlossen: true}}));
  }
}

test('Bericht der Nachmessung: Stufe 1, Stufe 2, Umschaltung von PH, Frage 2, Kontrolle, M2', () => {
  const d = temp();
  priorTeile(d);
  fs.writeFileSync(path.join(d, 'kontrolle.jsonl.gz'), require('zlib').gzipSync(fs.readFileSync(path.join(d, 'prior', 'K-1.jsonl'))));
  const skript = path.join(wurzel, 'auswertung', 'dagger', 'prior-ergebnis.sh');
  const r = spawnSync('bash', [skript, '212', 'kontrolle.jsonl.gz', '20261201'], {cwd: d, encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Bericht läuft durch: ' + (r.stderr || '').slice(0, 300));
  const lies = f => fs.readFileSync(path.join(d, 'ergebnisse', f), 'utf8');
  pruefe(/Seed 212 gegen GNU Go, Seeds ab 20261201 im Selbstspiel/.test(lies('bericht.md')), 'Kopf des Berichts');
  pruefe(/\| \*\*S9\*\* \| 480 \| \*\*\+20,0\*\* .* \| besser: Kandidat \|/.test(lies('stufe1.md')) && /alpha 0,05\)/.test(lies('stufe1.md')), 'Stufe 1: 480 Paare, +20,0, Kandidat bei alpha 0,05');
  pruefe(/\| \*\*PH\*\* \| 240 \| \*\*\+10,0\*\* .* \| besser: Kandidat \|/.test(lies('stufe2.md')) && /alpha 0,0167/.test(lies('stufe2.md')), 'Stufe 2: PH gegen S9 +10,0 auf 240 Paaren, alpha 0,0167');
  pruefe(/\| \*\*S30\*\* \| 240 \| \*\*−20,0\*\* .* \| schlechter \|/.test(lies('stufe2.md')), 'Stufe 2: S30 gegen S9 −20,0');
  pruefe(/PH: in 240 von 240 Paaren die ersten 120 Züge gleich A/.test(lies('dosis.md')) && /S9: in 0 von 480 Paaren/.test(lies('dosis.md')), 'Probe der Umschaltung: PH beginnt wie A');
  pruefe(/\| \*\*BT\*\* \| 240 \| \*\*\+1,0\*\* /.test(lies('transfer.md')), 'Frage 2: BT gegen A +1,0');
  pruefe(/Kontrolle gegen kontrolle\.jsonl\.gz, Arm K: 15 von 15/.test(lies('kontrolle.md')), 'Kontrolle 15 von 15');
  pruefe(/S9: B \(mctsFixedSims=120,mctsPriorSharp=9\) gegen A \(mctsFixedSims=120\) · 360 Partien in 12 Teilen \(Seeds 20261201 bis 20261212\) · B gewinnt 240, 66,7 %/.test(lies('selbstspiel.txt')), 'M2 von S9: 240 von 360');
  pruefe(/signifikant über 50 %/.test(lies('selbstspiel.md')) && /\| \*\*BT\*\* \|/.test(lies('selbstspiel.md')), 'M2: Urteil, beide Arme');
  pruefe(/== PH gegen A/.test(lies('zuege.txt')) && /== BT gegen A/.test(lies('zusatz.txt')), 'Zugzahlen und Zusatzzahlen je Arm');
  for (const [arm, n] of [['A', 480], ['S9', 480], ['S15', 240], ['S30', 240], ['PH', 240], ['BT', 240], ['K', 15], ['m2-S9', 360], ['m2-BT', 360]]) {
    const roh = require('zlib').gunzipSync(fs.readFileSync(path.join(d, 'ergebnisse', `${arm}.jsonl.gz`))).toString().trim().split('\n');
    pruefeGleich(roh.length, n, `Rohdaten von ${arm}: ${n}`);
  }
  for (const [ohne, muster] of [['S9-466', /S9-466\.jsonl fehlt/], ['PH-226-kurz', /PH-226\.jsonl hat nicht 15 Partien/], ['K-1', /K-1\.jsonl fehlt/], ['m2-BT-7', /m2-BT-7\.json fehlt/]]) {
    const e = temp();
    priorTeile(e, ohne);
    const x = spawnSync('bash', [skript, '212', path.join(d, 'kontrolle.jsonl.gz'), '20261201'], {cwd: e, encoding: 'utf8'});
    pruefeGleich(x.status, 1, `${ohne}: Abbruch`);
    pruefe(muster.test(x.stderr), `${ohne}: Meldung „${(x.stderr || '').trim()}“`);
    pruefe(!fs.existsSync(path.join(e, 'ergebnisse', 'bericht.md')), `${ohne}: kein Bericht`);
  }
});

test('Bericht des Selbstspiels: Siegrate, Intervall, Farben; unvollständige, doppelte und fremde Teile abgelehnt', () => {
  const teil = (seed, siegeB, extra = {}) => ({datei: `t${seed}.json`, daten: {konfig: {A: 'a', B: 'b', seed, abgeschlossen: true, ...extra},
    partien: Array.from({length: 30}, (_, g) => ({aIst: g % 2 === 0 ? 'Schwarz' : 'Weiß', sieger: g < siegeB ? 'B' : 'A', zuege: 100 + g, aufgabe: null}))}});
  const r = SB.auswertung(Array.from({length: 12}, (_, k) => teil(k + 1, 13)), 360);
  pruefeGleich(r.n, 360, '360 Partien'); pruefeGleich(r.b, 156, 'B gewinnt 13 je Teil');
  pruefeGleich(r.urteil, 'signifikant unter 50 %', 'Urteil bei 43,3 %');
  pruefeNah(r.p, Z.vorzeichenP(156, 204), 1e-12, 'p aus dem exakten Test');
  pruefeGleich(r.bSchwarz.siege + r.bWeiss.siege, 156, 'Farben zusammen'); pruefeGleich(r.bSchwarz.n, 180, 'B 180-mal Schwarz');
  pruefe(r.ci[0] < 156 / 360 && r.ci[1] > 156 / 360, 'Intervall um die Rate');
  const w = SB.wilson(180, 360);
  pruefeNah(w[0], 0.4485, 0.001, 'Wilson unten bei 50 %'); pruefeNah(w[1], 0.5515, 0.001, 'Wilson oben bei 50 %');
  pruefeGleich(SB.auswertung([teil(1, 15), teil(2, 15)], 60).urteil, 'nicht signifikant', '30 von 60');
  const fehler = f => { try { f(); return ''; } catch (e) { return e.message; } };
  pruefe(/nicht abgeschlossen/.test(fehler(() => SB.auswertung([teil(1, 15, {abgeschlossen: false})], 30))), 'unvollständiger Teil');
  pruefe(/Seed 1 doppelt/.test(fehler(() => SB.auswertung([teil(1, 15), teil(1, 15)], 60))), 'doppelter Seed');
  pruefe(/andere Konfiguration/.test(fehler(() => SB.auswertung([teil(1, 15), teil(2, 15, {B: 'c'})], 60))), 'fremder Teil');
  pruefe(/30 Partien statt 360/.test(fehler(() => SB.auswertung([teil(1, 15)], 360))), 'falsche Zahl');
  pruefeGleich(SB.rohZeilen([teil(5, 1)]).trim().split('\n').length, 30, 'Rohdaten: eine Zeile je Partie');
});

test('Bericht: gleicher Anfang zweier Arme', () => {
  const m = z => new Map(z.map((zuege, i) => [i + 1, {nr: i + 1, zuege}]));
  const ref = m([['a', 'b', 'c'], ['a', 'b'], ['x', 'y', 'z']]);
  const g = P.gleicherAnfang(ref, m([['a', 'b', 'd'], ['a', 'b'], ['x', 'q', 'z']]), 2);
  pruefeGleich(`${g.gleich}/${g.n}`, '2/3', 'zwei Paare mit gleichen ersten zwei Zügen');
  pruefeGleich(P.gleicherAnfang(ref, m([['a', 'b', 'd']]), 3).gleich, 0, 'der dritte Zug weicht ab');
});

/* ── Endspiel-Lerner (docs/endspiel-lerner.md) ──────────────────────────── */

test('Workflow endspiel-lerner.yml: Aufbau und Vorgaben wie in der Vorabfestlegung', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-lerner.yml'), 'utf8');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'endspiel-lerner.md'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'teil', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefeGleich((/von: \[([0-9, ]+)\]/.exec(t) || [])[1].split(',').map(Number).join(','), TEILE.join(','), '16 Teile zu je 15 Partien');
  pruefe(/lerner-teil\.sh "\$VON" "\$PRUEF" docs\/daten\/endspiel-lerner\/netz\.json\.gz "\$LAMBDA" "\$TOP" lerner/.test(t), 'ein Teil je Beginn, mit dem festen Netz');
  pruefe(fs.existsSync(path.join(wurzel, 'docs', 'daten', 'endspiel-lerner', 'netz.json.gz')), 'das Netz liegt im Repo');
  for (const name of ['pruefdatei', 'ohne_nr', 'lambda', 'top']) {
    const imDoc = (new RegExp('^\\| `' + name + '` \\| `?([^` |]+)', 'm').exec(doc) || [])[1];
    const imFlow = (new RegExp('^      ' + name + ':\\n(?:        .*\\n)*?        default: \'([^\']*)\'', 'm').exec(t) || [])[1];
    pruefe(imDoc !== undefined && imDoc === imFlow, `Vorgabe ${name}: Dokument „${imDoc}“, Workflow „${imFlow}“`);
  }
  const s = (...x) => spawnSync('bash', [path.join(wurzel, 'auswertung', 'dagger', 'lerner-teil.sh'), ...x], {cwd: temp(), encoding: 'utf8'});
  pruefeGleich(s('a', 'x.gz', 'n.gz', '0.5', '4', 'aus').status, 2, 'lerner-teil.sh: Zahl erwartet');
  pruefeGleich(s('1', 'gibt-es-nicht.gz', 'n.gz', '0.5', '4', 'aus').status, 2, 'lerner-teil.sh: Datei fehlt');
  pruefeGleich(s('1', 'x.gz').status, 1, 'lerner-teil.sh: Argument fehlt');
});

test('Lerner: Merkmale, Vorwärtsrechnung und Tor', () => {
  const E = require('./rahmen').ladeKI({mitNetz: false});
  const b = new Uint8Array(361);
  b[1] = 2; b[2] = 1; b[20] = 1;   /* weißer Stein B19 mit einer Freiheit (A19), Schwarz am Zug */
  const x = LM.ebenen(E, b, 1, 2, -1, -1, 100, new Uint8Array(LM.EBENEN * 361));
  const e = (k, i) => x[k * 361 + i];
  pruefeGleich(e(0, 2) + e(1, 1) + e(2, 0), 3, 'eigener, fremder Stein, leerer Punkt');
  pruefeGleich(e(7, 1), 1, 'fremde Kette mit einer Freiheit');
  pruefeGleich(e(15, 0), 1, 'A19 schlägt'); pruefeGleich(e(14, 0), 1, 'A19 ist legal');
  pruefeGleich(e(11, 2), 1, 'letzter Zug'); pruefeGleich(e(27, 0), 0, 'vor Zug 160');
  pruefeGleich(e(26, 180), 1, 'Ebene überall 1');
  const netz = LN.netzAus({ebenen: LM.EBENEN, kanaele: 1, schichten: 1,
    ein: {w: [[Array.from({length: LM.EBENEN}, (_, c) => Array.from({length: 5}, (_, y) => Array.from({length: 5}, (_, z) => c === 15 && y === 2 && z === 2 ? 1 : 0)))]], b: [0]},
    mitte: [], aus: {w: [[[[1]]]], b: [0]}});
  const p = LN.softmax(LN.vorwaerts(netz, x));
  pruefe(p[0] > p[5] && Math.abs(p.reduce((s, v) => s + v, 0) - 1) < 1e-9, 'das Netz bevorzugt den Schlag, Summe 1');
  pruefeGleich(p[1], 0, 'besetzte Punkte haben Wahrscheinlichkeit 0');
  const r = (y, ohne, mit, k = 100) => ({y, ohne, mit, z: ohne, netz: mit, k});
  const viele = [...Array(60)].map(() => r(1, 2, 1)).concat([...Array(40)].map(() => r(1, 2, 2)));
  pruefeGleich(LB.tor({diff: 0.6, p: 1e-10, nurMit: 60, nurOhne: 0}), 'bestanden', 'deutlicher Gewinn');
  pruefe(/Tor .*: bestanden/.test(LB.bericht(viele)), 'Bericht: bestanden');
  pruefeGleich(LB.tor({diff: 0.03, p: 0.001, nurMit: 30, nurOhne: 0}), 'nicht bestanden', 'unter +4,0');
  pruefeGleich(LB.tor({diff: 0.05, p: 0.2, nurMit: 5, nurOhne: 0}), 'nicht bestanden', 'nicht signifikant');
});

laufeTests('Datenaggregation, Messung und Orakel-Test: Werkzeuge und Workflows').then(ok => process.exit(ok ? 0 : 1));
