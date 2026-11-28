// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Der Test-Runner und der CI-Workflow (tests/run.js, tests/rahmen.js, .github/workflows/tests.yml).

   Zwei Fehler sind schon passiert oder wären möglich gewesen, beide mit grünem Lauf:
     a) Die Liste der Suiten stand im Workflow ein zweites Mal. Eine Suite nur im Runner wäre vom Node-Job
        (--ohne-browser) übersprungen und vom Browser-Job nie gestartet worden.
     b) Ein Test, der sich ohne Programm (GNU Go, Chromium) übersprang, hinterließ nur eine Zeile im Log;
        der Runner meldete „Alle Testdateien bestanden“, die Übersicht zeigte success.

   Geprüft wird:
     1. Die Auswahl der Suiten (--nur-/--ohne-browser, --nur-/--ohne-gnugo): die drei CI-Auswahlen teilen ALLE
        ohne Rest und ohne Überschneidung; Bedienfehler (gleiche Gruppe nur und ohne, unbekannte Gruppe,
        unbekannter Schalter) ergeben Exit 2.
     2. Die Liste ALLE: jede Datei darin gibt es, keine doppelt, und jede Datei in tests/ mit laufeTests( steht
        darin (außer rahmen.js).
     3. Der Workflow nennt keine einzelne Testdatei, ruft je Job den Runner mit dem richtigen Schalter auf,
        installiert GNU Go nur im GNU-Go-Job und setzt dort REQUIRE_GNUGO, im Browser-Job REQUIRE_BROWSER, gibt
        Anzahl und Liste des Übersprungenen als Job-Ausgabe weiter und wertet sie in der Zusammenfassung aus.
     4. Übersprungenes wird gemeldet: 'skip' und {skip: 'Grund'} kommen mit Test und Grund beim Runner an; ein
        Browser-Skip ohne Text bekommt den Grund „Playwright oder Chromium nicht auffindbar“; gleiche Gründe
        derselben Datei werden zusammengefasst; der Schlusssatz nennt sie.
     5. braucht(): Programm da → true; fehlt es → false, mit REQUIRE_<NAME>=1 ein Fehler.
     6. Der echte Runner meldet ein übersprungenes Programm am Ende und bricht bei REQUIRE_GNUGO=1 mit Exit 1 ab.

   Aufruf:  node tests/testlauf.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, braucht} = require('./rahmen');
const R = require('./run.js');

const TESTS = __dirname;
const RAHMEN = path.join(TESTS, 'rahmen.js');
const WORKFLOW = path.join(TESTS, '..', '.github', 'workflows', 'tests.yml');
let TMP;
const tmpdir = () => TMP || (TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'testlauf-')));
const ohneKommentar = t => t.replace(/^\s*#.*$/gm, '');

/* ── 1. Auswahl ────────────────────────────────────────────────── */

test('Die drei CI-Auswahlen teilen ALLE ohne Rest und ohne Überschneidung', () => {
  const node = R.waehle(['--ohne-browser', '--ohne-gnugo']).suiten;
  const browser = R.waehle(['--nur-browser']).suiten;
  const gnugo = R.waehle(['--nur-gnugo']).suiten;
  pruefe(node.length > 0 && browser.length > 0 && gnugo.length > 0, 'keine Auswahl leer');
  pruefeGleich(node.length + browser.length + gnugo.length, R.ALLE.length, 'Summe gleich ALLE');
  const alle = [...node, ...browser, ...gnugo];
  pruefeGleich(new Set(alle).size, alle.length, 'keine Suite doppelt');
  for (const f of R.ALLE) pruefe(alle.includes(f), `${f} läuft in keinem Job`);
  pruefe(browser.every(f => f.startsWith('browser-')), 'Browser-Auswahl nur browser-*.js');
  pruefeGleich(R.waehle(['--ohne-browser']).suiten.length, R.ALLE.length - browser.length, '--ohne-browser');
  pruefeGleich(R.waehle([]).suiten.length, R.ALLE.length, 'ohne Schalter alles');
  pruefeGleich(R.waehle(['--nur-browser', '--nur-gnugo']).suiten.length, browser.length + gnugo.length, 'zwei nur-Schalter: Vereinigung');
});

test('Pfad zur index.html wird durchgereicht, Schalter und Pfad lassen sich mischen', () => {
  const w = R.waehle(['--ohne-browser', 'irgendwo/index.html', '--ohne-gnugo']);
  pruefeGleich(w.pfad, path.resolve('irgendwo/index.html'), 'Pfad');
  pruefe(!w.suiten.some(f => f.startsWith('browser-')), 'ohne Browser');
});

test('Bedienfehler: nur und ohne derselben Gruppe, unbekannte Gruppe, unbekannter Schalter, zweiter Pfad', () => {
  for (const argv of [['--nur-browser', '--ohne-browser'], ['--ohne-gnugo', '--nur-gnugo'], ['--nur-fuego'], ['--ohne-xyz'], ['--foo'], ['a.html', 'b.html']]) {
    let fehler = null;
    try { R.waehle(argv); } catch (e) { fehler = e; }
    pruefe(fehler instanceof R.Bedienfehler, `Bedienfehler für ${argv.join(' ')}`);
  }
  const r = spawnSync(process.execPath, [path.join(TESTS, 'run.js'), '--nur-browser', '--ohne-browser'], {encoding: 'utf8'});
  pruefeGleich(r.status, 2, 'Exit 2 über die Befehlszeile');
  pruefe(/Bedienfehler/.test(r.stderr), 'Meldung');
});

/* ── 2. Die Liste ALLE ─────────────────────────────────────────── */

test('ALLE: jede Datei gibt es, keine doppelt, jede Suite in tests/ steht darin', () => {
  pruefeGleich(new Set(R.ALLE).size, R.ALLE.length, 'keine doppelt');
  for (const f of R.ALLE) pruefe(fs.existsSync(path.join(TESTS, f)), `${f} fehlt`);
  const suiten = fs.readdirSync(TESTS).filter(f => f.endsWith('.js') && f !== 'rahmen.js'
    && fs.readFileSync(path.join(TESTS, f), 'utf8').includes('laufeTests('));
  for (const f of suiten) pruefe(R.ALLE.includes(f), `${f} ruft laufeTests auf, steht aber nicht in ALLE (tests/run.js)`);
  for (const f of R.GNUGO_SUITEN) pruefe(R.ALLE.includes(f), `GNU-Go-Suite ${f} steht nicht in ALLE`);
});

/* ── 3. Der Workflow ───────────────────────────────────────────── */

test('Workflow: keine einzelne Testdatei, je Job der Runner mit dem richtigen Schalter', () => {
  const y = ohneKommentar(fs.readFileSync(WORKFLOW, 'utf8'));
  const einzeln = [...y.matchAll(/tests\/([\w-]+\.js)/g)].map(m => m[1]).filter(f => f !== 'run.js');
  pruefeGleich(einzeln.length, 0, `der Workflow nennt einzelne Testdateien: ${einzeln.join(', ')}`);
  const job = name => {
    const m = new RegExp(`\\n  ${name}:\\n([\\s\\S]*?)(?=\\n  [a-z]+:\\n|$)`).exec(y);
    pruefe(!!m, `Job ${name} fehlt`);
    return m[1];
  };
  pruefe(/node tests\/run\.js --ohne-browser --ohne-gnugo\b/.test(job('node')), 'node: --ohne-browser --ohne-gnugo');
  pruefe(/node tests\/run\.js --nur-gnugo\b/.test(job('gnugo')), 'gnugo: --nur-gnugo');
  pruefe(/node tests\/run\.js --nur-browser\b/.test(job('browser')), 'browser: --nur-browser');
  pruefe(/REQUIRE_GNUGO: '1'/.test(job('gnugo')), 'gnugo: REQUIRE_GNUGO');
  pruefe(/REQUIRE_BROWSER: '1'/.test(job('browser')), 'browser: REQUIRE_BROWSER');
  pruefe(/apt-get install[^\n]*gnugo/.test(job('gnugo')), 'gnugo: GNU Go wird installiert');
  pruefe(!/gnugo/i.test(job('node').replace(/--ohne-gnugo/g, '')), 'node: kein GNU Go');
  pruefe(!/gnugo/i.test(job('browser')), 'browser: kein GNU Go');
  for (const j of ['node', 'gnugo', 'browser']) {
    pruefe(/id: tests/.test(job(j)), `${j}: Schritt mit id tests`);
    pruefe(/uebersprungen: \$\{\{ steps\.tests\.outputs\.uebersprungen \}\}/.test(job(j)), `${j}: Ausgabe uebersprungen`);
    pruefe(/liste: \$\{\{ steps\.tests\.outputs\.liste \}\}/.test(job(j)), `${j}: Ausgabe liste`);
  }
});

test('Workflow: die Zusammenfassung wartet auf alle drei Jobs und weist Übersprungenes aus', () => {
  const y = ohneKommentar(fs.readFileSync(WORKFLOW, 'utf8'));
  const e = /\n  ergebnis:\n([\s\S]*)$/.exec(y)[1];
  pruefe(/needs: \[node, gnugo, browser\]/.test(e), 'needs alle drei');
  for (const n of ['NODE', 'GNUGO', 'BROWSER']) {
    pruefe(new RegExp(`${n}_UEB: \\$\\{\\{ needs\\.${n.toLowerCase()}\\.outputs\\.uebersprungen \\}\\}`).test(e), `${n}_UEB`);
    pruefe(new RegExp(`${n}_LISTE: \\$\\{\\{ needs\\.${n.toLowerCase()}\\.outputs\\.liste \\}\\}`).test(e), `${n}_LISTE`);
  }
  pruefe(/\| Ebene \| Ergebnis \| Übersprungen \|/.test(e), 'Spalte Übersprungen');
  pruefe(/Übersprungen, nicht geprüft/.test(e), 'Liste mit Grund');
  pruefe(/\[ "\$NODE_ERGEBNIS" = success \] && \[ "\$GNUGO_ERGEBNIS" = success \] && \[ "\$BROWSER_ERGEBNIS" = success \]/.test(e), 'alle drei müssen success sein');
});

/* ── 4. Übersprungenes wird gemeldet ───────────────────────────── */

/* Eine kleine Suite-Datei im Temp-Verzeichnis, die rahmen.js benutzt. */
function suite(name, rumpf) {
  const p = path.join(tmpdir(), name);
  fs.writeFileSync(p, `'use strict';\nconst {test, pruefe, laufeTests, braucht} = require(${JSON.stringify(RAHMEN)});\n${rumpf}\n`
    + `laufeTests(${JSON.stringify(name)}).then(ok => process.exit(ok ? 0 : 1));\n`);
  return path.basename(p);
}

test('fuehreAus: skip mit Grund, skip ohne Grund, Browser-Standardgrund, Fehlschlag, bestanden', async () => {
  const dir = path.join(tmpdir(), 'fuehre');
  fs.mkdirSync(dir, {recursive: true});
  const mach = (name, rumpf) => {
    fs.writeFileSync(path.join(dir, name), `'use strict';\nconst {test, pruefe, laufeTests} = require(${JSON.stringify(RAHMEN)});\n${rumpf}\n`
      + `laufeTests(${JSON.stringify(name)}).then(ok => process.exit(ok ? 0 : 1));\n`);
  };
  mach('a-gut.js', "test('gut', () => { pruefe(true, 'x'); });");
  mach('b-grund.js', "test('braucht Programm', () => ({skip: 'Programm X nicht installiert'}));\ntest('noch eins', () => ({skip: 'Programm X nicht installiert'}));\ntest('anderer Grund', () => ({skip: 'Daten fehlen'}));");
  mach('c-ohne.js', "test('ohne Angabe', () => 'skip');");
  mach('browser-d.js', "test('b1', () => 'skip');\ntest('b2', () => 'skip');\ntest('b3', () => 'skip');");
  mach('e-kaputt.js', "test('schlecht', () => { pruefe(false, 'kaputt'); });");
  const erg = await R.fuehreAus(['a-gut.js', 'b-grund.js', 'c-ohne.js', 'browser-d.js', 'e-kaputt.js'], dir, null, process.env, {stumm: true});
  pruefeGleich(erg.kaputt.join(), 'e-kaputt.js', 'kaputte Datei');
  pruefeGleich(erg.uebersprungen.length, 3 + 1 + 3 + 1 - 1, 'Zahl der Übersprungenen');
  const g = R.gruppiere(erg.uebersprungen);
  const zeilen = g.map(R.listenzeile);
  pruefe(zeilen.includes('b-grund.js: 2 Tests — Programm X nicht installiert'), `zusammengefasst: ${zeilen}`);
  pruefe(zeilen.includes('b-grund.js: anderer Grund — Daten fehlen'), 'einzelner Test mit Namen');
  pruefe(zeilen.includes('c-ohne.js: ohne Angabe — Grund nicht angegeben'), 'ohne Text: Grund nicht angegeben');
  pruefe(zeilen.includes('browser-d.js: 3 Tests — Playwright oder Chromium nicht auffindbar'), 'Browser-Standardgrund');
  const text = R.fasseZusammen(5, erg);
  pruefe(text.startsWith('1 von 5 Testdateien fehlgeschlagen: e-kaputt.js.'), text);
  const ok = R.fasseZusammen(2, {kaputt: [], uebersprungen: erg.uebersprungen.slice(0, 2)});
  pruefe(ok.startsWith('Alle 2 Testdateien bestanden, aber 2 Tests übersprungen.') && ok.includes('○ b-grund.js: 2 Tests — Programm X nicht installiert'), ok);
  pruefeGleich(R.fasseZusammen(2, {kaputt: [], uebersprungen: []}), 'Alle 2 Testdateien bestanden.', 'ohne Übersprungenes unverändert');
});

/* ── 5. braucht() ──────────────────────────────────────────────── */

test('braucht(): da → true; fehlt → false; fehlt mit REQUIRE_<NAME>=1 → Fehler', () => {
  pruefeGleich(braucht('TESTPROGRAMM', true, 'egal'), true, 'vorhanden');
  delete process.env.REQUIRE_TESTPROGRAMM;
  pruefeGleich(braucht('TESTPROGRAMM', false, 'Programm fehlt'), false, 'fehlt, nicht Pflicht');
  process.env.REQUIRE_TESTPROGRAMM = '1';
  let fehler = null;
  try { braucht('TESTPROGRAMM', false, 'Programm fehlt'); } catch (e) { fehler = e; }
  delete process.env.REQUIRE_TESTPROGRAMM;
  pruefe(fehler && /REQUIRE_TESTPROGRAMM=1, aber Programm fehlt/.test(fehler.message), `Fehler: ${fehler && fehler.message}`);
  process.env.REQUIRE_TESTPROGRAMM = '0';
  pruefeGleich(braucht('TESTPROGRAMM', false, 'x'), false, 'REQUIRE=0 ist nicht Pflicht');
  delete process.env.REQUIRE_TESTPROGRAMM;
});

/* ── 6. Der echte Runner ───────────────────────────────────────── */

/* Ein Programm, das es nicht gibt, durch den Pfad der echten GNU-Go-Brücke ersetzen geht nicht, ohne den Test zu
   ändern; deshalb ein eigenes Wurzelverzeichnis mit einer Suite, die ein fehlendes Programm meldet, und ein
   Lauf von run.js' fuehreAus mit dem Pflicht-Schalter. */
test('fuehreAus: fehlendes Programm → übersprungen mit Grund; mit REQUIRE_…=1 → Datei kaputt', async () => {
  const dir = path.join(tmpdir(), 'pflicht');
  fs.mkdirSync(dir, {recursive: true});
  fs.writeFileSync(path.join(dir, 'x.js'), `'use strict';\nconst {test, laufeTests, braucht} = require(${JSON.stringify(RAHMEN)});\n`
    + "test('Programm Z', () => { if (!braucht('PROGRAMMZ', false, 'Programm Z fehlt')) return {skip: 'Programm Z nicht installiert'}; });\n"
    + "laufeTests('x').then(ok => process.exit(ok ? 0 : 1));\n");
  const basis = {...process.env}; delete basis.REQUIRE_PROGRAMMZ;
  const a = await R.fuehreAus(['x.js'], dir, null, basis, {stumm: true});
  const b = await R.fuehreAus(['x.js'], dir, null, {...basis, REQUIRE_PROGRAMMZ: '1'}, {stumm: true});
  pruefeGleich(a.kaputt.length, 0, 'ohne Pflicht nicht kaputt');
  pruefeGleich(a.uebersprungen.length, 1, 'aber sichtbar übersprungen');
  pruefeGleich(a.uebersprungen[0].grund, 'Programm Z nicht installiert', 'Grund');
  pruefeGleich(b.kaputt.join(), 'x.js', 'mit Pflicht: Datei schlägt fehl');
  pruefeGleich(b.uebersprungen.length, 0, 'und nichts wird übersprungen');
});

laufeTests('Test-Runner und CI-Workflow').then(ok => process.exit(ok ? 0 : 1));
