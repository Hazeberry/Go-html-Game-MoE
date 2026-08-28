/* Rauchtest für ab-harness.js.

   Der Harness ist ein MESSWERKZEUG, kein Prüfwerkzeug: sein Zeitbudget ist
   Wall-Clock, zwei Läufe mit identischem Seed liefern verschiedene Partien.
   Als Ja/Nein-Prüfung taugt er deshalb nicht, und deshalb läuft er auch nicht
   in der CI mit. Genau daraus wurde aber eine Lücke: er war die einzige
   Datei im Repo, die bei keinem Push angefasst wurde.

   Das ist mehr als Kosmetik. Harness und tests/rahmen.js schneiden beide die
   <script>-Blöcke aus index.html, aber mit GETRENNTEN Implementierungen — sie
   können auseinanderlaufen. Der Harness greift zudem auf sechs Engine-
   Funktionen zu, die kein anderer Test berührt (bensonClassify,
   evaluateBoard, evaluateMove, floodFill, quickEval, removeDeadGroups), und
   auf neun policyNet-Interna, darunter _netInp, _netHidden und _gameBuffer.
   Eine Änderung dort hätte ihn still gebrochen, bemerkt erst Wochen später
   beim nächsten manuellen Messlauf — und dann steckt die Ursache irgendwo in
   dreißig Commits.

   Dieser Test misst nichts. Er prüft nur, dass das Werkzeug noch anläuft und
   eine vollständige Auswertung ausgibt. Ergebnisse werden bewusst NICHT
   bewertet — sonst wäre die Nichtreproduzierbarkeit wieder das Problem.

   Aufruf:  node tests/harness-smoke.js [pfad/zur/index.html] */
'use strict';
const path = require('path');
const {execFileSync} = require('child_process');
const {test, pruefe, laufeTests, STANDARD_HTML} = require('./rahmen');

const HTML    = process.argv[2] || STANDARD_HTML;
const HARNESS = path.join(__dirname, '..', 'ab-harness.js');

test('ab-harness.js ist syntaktisch heil', () => {
  execFileSync(process.execPath, ['--check', HARNESS], {stdio: 'pipe'});
  pruefe(true, 'node --check läuft durch');
});

test('ab-harness.js läuft gegen das aktuelle index.html durch', () => {
  /* Winzig gehalten: eine Partie, 10 Züge, 20 ms Budget — rund eine halbe
     Sekunde. Groß genug, dass Eröffnung, Zugschleife, Wertung und Ausgabe
     einmal komplett durchlaufen. */
  let ausgabe;
  try {
    ausgabe = execFileSync(process.execPath,
      [HARNESS, '--html', HTML, '--games', '1', '--budget', '20',
       '--maxmoves', '10', '--seed', '1'],
      {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000});
  } catch (e) {
    const details = [e.message, e.stdout, e.stderr].filter(Boolean).join('\n').slice(0, 600);
    pruefe(false, `Harness-Lauf gescheitert:\n${details}`);
  }

  /* Auf die STRUKTUR der Auswertung prüfen, nicht auf Zahlen. Ein Harness,
     der startet und dann still nichts ausgibt, wäre sonst grün. */
  for (const marker of ['Partie 1/1', 'SIEGRATE', 'FARBE', 'PASS:', 'POLICYNET'])
    pruefe(ausgabe.includes(marker), `Auswertung enthält "${marker}"`);
  pruefe(/\d+ Züge/.test(ausgabe), 'die Partie hat Züge gespielt');
});

laufeTests('Rauchtest des A/B-Harness')
  .then(ok => process.exit(ok ? 0 : 1));
