// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* K3-Diagnose mit dem echten GNU Go (auswertung/k3-diagnose.js, docs/skalierung-aufbaupruefung-vorabfestlegung.md §3).

   Eine echte, kurze Harness-Partie wird in GNU Go nachgespielt und an jedem Messpunkt geschätzt. Geprüft wird,
   dass GNU Go jede Schätzung liefert und dass seine Schranken aus Sicht von Weiß stehen (der Wert aus Sicht von
   Weiß liegt dazwischen); darauf beruht die strenge Zählung des Kipppunkts.

   Gehört zur GNU-Go-Gruppe von tests/run.js und läuft im CI-Job „GNU Go“ mit REQUIRE_GNUGO=1. Ohne GNU Go und ohne
   die Variable wird der Test mit Grund übersprungen, mit der Variable ist das ein Fehlschlag.

   Aufruf:  node tests/k3-diagnose-gnugo.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {execFileSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, braucht, STANDARD_HTML} = require('./rahmen');
const D = require('../auswertung/k3-diagnose.js');

const HARNESS = path.join(__dirname, '..', 'ab-harness.js');
const ECHT = '/usr/games/gnugo';

test('Echtes GNU Go: kurze Harness-Partie nachgespielt, Schätzung an jedem Messpunkt', async () => {
  if (!braucht('GNUGO', fs.existsSync(ECHT), `${ECHT} fehlt`)) return {skip: `GNU Go nicht installiert (${ECHT})`};
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'k3-diagnose-gnugo-'));
  const ziel = path.join(tmp, 'echt.jsonl');
  execFileSync(process.execPath, [HARNESS, '--html', STANDARD_HTML, '--games', '1', '--maxmoves', '205', '--seed', '7',
    '--A', 'mctsFixedSims=30,resignEnabled=0', '--B', 'mctsFixedSims=30,resignEnabled=0', '--roh', ziel], {stdio: 'ignore'});
  const r = JSON.parse(fs.readFileSync(ziel, 'utf8').trim().split('\n')[0]);
  const p = {seed: 7, partie: 1, zuege: r.zuege, armVon: {S: r.armSchwarz, W: r.armWeiss},
             verliererFarbe: r.sieger === 'S' ? 'W' : 'S', verliererArm: 'A', ereignisse: r.ereignisse};
  const bew = await D.bewerte([p], {gnugo: ECHT, parallel: 1});
  const soll = D.MESSPUNKTE.filter(z => z <= r.zuege).length;
  pruefe(soll >= 1, `Partie zu kurz für einen Messpunkt: ${r.zuege} Züge`);
  pruefeGleich(bew[0].werte.length, soll, 'Messpunkte');
  for (const w of bew[0].werte) {
    pruefe(w.s && Number.isFinite(w.s.wert), `Schätzung nach Zug ${w.zug}: ${JSON.stringify(w.s)}`);
    /* Schranken aus Sicht von Weiß: der Wert aus Sicht von Weiß liegt dazwischen. */
    if (w.s && w.s.oben !== null)
      pruefe(w.s.unten <= -w.s.wert && -w.s.wert <= w.s.oben, `Schranken aus Sicht von Weiß nach Zug ${w.zug}: ${JSON.stringify(w.s)}`);
  }
  fs.rmSync(tmp, {recursive: true, force: true});
});

laufeTests('K3-Diagnose mit echtem GNU Go').then(ok => process.exit(ok ? 0 : 1));
