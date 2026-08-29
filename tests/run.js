/* Alle Tests nacheinander. Jeder ist auch einzeln aufrufbar.

   Aufruf:  node tests/run.js [pfad/zur/index.html]
            node tests/run.js --ohne-browser [pfad]   (alles außer browser-nan)

   Ohne Playwright überspringt sich der Browser-Test, der Gesamtlauf bleibt
   dann grün — er prüft die Logik dann eben nur im Prozess.

   Warum --ohne-browser existiert: der CI-Workflow trennt Node- und
   Browser-Job, weil der Browser erst Chromium installieren muss. Vorher rief
   der Node-Job die Dateien EINZELN auf — und beim Hinzufügen von
   resign-criterion.js wurde die Liste dort nicht mitgepflegt. Der Job blieb
   grün und prüfte den neuen Test nicht. Die Liste lebt jetzt nur noch hier;
   der Workflow ruft diesen Schalter auf und kann nicht mehr davon abdriften. */
'use strict';
const path = require('path');
const {spawn} = require('child_process');

const argv = process.argv.slice(2);
const OHNE_BROWSER = argv.includes('--ohne-browser');
const pfad = argv.find(a => !a.startsWith('--'));
const HTML = pfad ? [path.resolve(pfad)] : [];

const ALLE = ['nan-guards.js', 'resign-criterion.js', 'training-stability.js',
              'harness-smoke.js', 'browser-nan.js'];
const SUITEN = OHNE_BROWSER ? ALLE.filter(s => s !== 'browser-nan.js') : ALLE;

/* training-stability nimmt Partien/Züge VOR dem Pfad — deshalb die Defaults
   mitgeben, wenn ein Pfad durchgereicht wird. */
const argumente = s =>
  (HTML.length && s === 'training-stability.js') ? ['30', '400', ...HTML] : HTML;

(async () => {
  let kaputt = 0;
  for (const s of SUITEN) {
    const code = await new Promise(fertig => {
      const p = spawn(process.execPath, [path.join(__dirname, s), ...argumente(s)],
                      {stdio: 'inherit'});
      p.on('close', fertig);
    });
    if (code !== 0) kaputt++;
  }
  console.log(`\n${'═'.repeat(52)}`);
  console.log(kaputt === 0
    ? `Alle ${SUITEN.length} Testdateien bestanden.`
    : `${kaputt} von ${SUITEN.length} Testdateien fehlgeschlagen.`);
  process.exit(kaputt === 0 ? 0 : 1);
})();
