// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Werkzeuge und Workflow der Datenaggregation (docs/muster-endspiel-dagger.md).

     1. Die Tabelle lässt sich aus index.html auslesen und wieder einsetzen
        (muster-endspiel-tabelle.js); eine index.html ohne die Zeile wird
        abgelehnt.
     2. Der Pilotbericht rechnet gepaart richtig: t-Test, Intervall, Hälften,
        Siege; die Kontrolle gegen eine frühere Datei zählt gleiche Partien.
     3. Die Skripte in auswertung/dagger/ lehnen falsche Eingaben ab, ehe sie
        etwas tun.
     4. Der Workflow endspiel-dagger.yml: Eingaben des Dispatch-Formulars
        stehen nur in env-Blöcken, und in run-Blöcken steht kein ${{ }}
        (Script-Injection, wie in ab-harness.yml).

   Aufruf:  node tests/dagger.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const T = require('../auswertung/muster-endspiel-tabelle.js');
const B = require('../auswertung/endspiel-pilot-bericht.js');

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
});

/* Workflow: Eingaben des Dispatch-Formulars nur in env-Blöcken, in run-Blöcken kein ${{ }} */
test('Workflow endspiel-dagger.yml: keine Ausdrücke in Shell-Zeilen', () => {
  const zeilen = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-dagger.yml'), 'utf8').split('\n');
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
  pruefe(nRun >= 15, 'run-Schritte gefunden');
  pruefeGleich(nEnv, 8, 'acht Eingaben des Formulars, alle über env');
});

test('Workflow endspiel-dagger.yml: Aufbau', () => {
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'endspiel-dagger.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(t), 'nur manuell gestartet');
  for (const job of ['pruefen', 'daten', 'lernen', 'pilot-ref', 'pilot-neu', 'ergebnis']) pruefe(new RegExp(`^  ${job}:$`, 'm').test(t), `Job ${job}`);
  pruefe(/^permissions:\n  contents: read$/m.test(t), 'Standard: nur lesen');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/ergebnis:[\s\S]*permissions:\n      contents: write/.test(t), 'das Schreibrecht hat der Ergebnisjob');
  for (const v of [1, 16, 31, 46, 61, 76, 91, 106, 121, 136, 151, 166, 181, 196, 211, 226]) pruefe(t.includes(String(v)), `Teil ${v}`);
  /* dieselben Versionen der Standardaktionen wie in tests.yml */
  const tests = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'tests.yml'), 'utf8');
  for (const a of ['actions/checkout', 'actions/setup-node']) {
    const ver = s => (s.match(new RegExp(a + '@(v[0-9]+)')) || [])[1];
    pruefe(ver(t) && ver(t) === ver(tests), `${a} in derselben Version wie tests.yml`);
  }
});

laufeTests('Datenaggregation: Werkzeuge und Workflow').then(ok => process.exit(ok ? 0 : 1));
