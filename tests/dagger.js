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

   Aufruf:  node tests/dagger.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const T = require('../auswertung/muster-endspiel-tabelle.js');
const B = require('../auswertung/endspiel-pilot-bericht.js');
const Z = require('../auswertung/messung-zusatz.js');
const O = require('../auswertung/orakel-bericht.js');

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


laufeTests('Datenaggregation, Messung und Orakel-Test: Werkzeuge und Workflows').then(ok => process.exit(ok ? 0 : 1));
