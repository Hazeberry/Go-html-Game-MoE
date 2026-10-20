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

laufeTests('Datenaggregation, Messung und Orakel-Test: Werkzeuge und Workflows').then(ok => process.exit(ok ? 0 : 1));
