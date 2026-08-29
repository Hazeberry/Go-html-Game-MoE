/* Alle Tests nacheinander. Jeder ist auch einzeln aufrufbar.

   Aufruf:  node tests/run.js [pfad/zur/index.html]
   Ohne Playwright überspringt sich der Browser-Test, der Gesamtlauf bleibt
   dann grün — er prüft die Logik dann eben nur im Prozess. */
'use strict';
const path = require('path');
const {spawn} = require('child_process');

const HTML = process.argv[2] ? [path.resolve(process.argv[2])] : [];
const SUITEN = ['nan-guards.js', 'resign-criterion.js', 'training-stability.js',
                'harness-smoke.js', 'browser-nan.js'];

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
