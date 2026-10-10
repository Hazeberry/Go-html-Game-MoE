/* Brücke zu GNU Go (gnugo-duell.js): eine kurze Partie über GTP.

   Ohne GNU Go (z. B. in CI) überspringt sich der Test. Geprüft wird, dass
   eine Partie zu Ende läuft, die Bretter beider Programme übereinstimmen
   (das Werkzeug bricht sonst mit Fehler ab) und der Datensatz die
   erwarteten Felder trägt — mit und ohne Vorgabe. Dazu --gnugo-aufgabe 0:
   Eine Partie, die GNU Go sonst nach 80 Zügen aufgibt, läuft damit weiter,
   mit denselben ersten 80 Zügen.

   Aufruf:  node tests/gnugo-bruecke.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const {execFileSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const GNUGO = '/usr/games/gnugo';
const WERKZEUG = path.join(__dirname, '..', 'gnugo-duell.js');

function partie(extra, basis = ['--partien', '1', '--seed', '3', '--stufe', '1', '--maxzuege', '30', '--ki', 'mctsFixedSims=20']) {
  const aus = path.join(os.tmpdir(), `gnugo-test-${process.pid}-${Math.random().toString(36).slice(2)}.jsonl`);
  execFileSync(process.execPath, [WERKZEUG, ...basis, '--roh', aus, ...extra], {stdio: 'pipe', timeout: 120000});
  const r = JSON.parse(fs.readFileSync(aus, 'utf8').trim());
  fs.unlinkSync(aus);
  return r;
}

if (!fs.existsSync(GNUGO)) {
  console.log('\nGNU-Go-Brücke\n─────────────\n  übersprungen: GNU Go nicht installiert');
  process.exit(0);
}

test('Partie ohne Vorgabe läuft durch, Datensatz vollständig', () => {
  const r = partie([]);
  pruefe(!r.abgebrochen, 'nicht abgebrochen');
  pruefeGleich(r.zuegeAnzahl, 30, 'Zuglimit');
  pruefeGleich(r.zuege.length, 30, 'Züge protokolliert');
  pruefeGleich(r.komi, 7.5, 'Komi');
  pruefe(typeof r.gnugoStand === 'string' && /^[BW]\+/.test(r.gnugoStand), `GNU-Go-Stand ${r.gnugoStand}`);
});

test('Partie mit 9 Vorgabesteinen: Steine, Komi, Weiß beginnt', () => {
  const r = partie(['--vorgabe', '9']);
  pruefe(!r.abgebrochen, 'nicht abgebrochen');
  pruefeGleich(r.vorgabeSteine.length, 9, 'Vorgabesteine');
  pruefeGleich(r.komi, 0.5, 'Komi');
  pruefeGleich(r.beginnt, 'W', 'Weiß beginnt');
  pruefeGleich(r.wirFarbe, 'S', 'wir Schwarz');
});

/* Partie 39 aus docs/quick-rettung.md §6 (Seed 141, Arm A): GNU Go gibt
   nach 80 Zügen auf. */
test('--gnugo-aufgabe 0: GNU Go gibt nicht auf, die Partie läuft weiter', () => {
  const basis = ['--partien', '1', '--von', '39', '--seed', '141', '--stufe', '1', '--vorgabe', '9',
                 '--maxzuege', '90', '--ki', 'mctsFixedSims=120,resignEnabled=0'];
  const mit = partie([], basis), ohne = partie(['--gnugo-aufgabe', '0'], basis);
  pruefeGleich(mit.aufgabe, 'W', 'ohne Option: GNU Go gibt auf');
  pruefeGleich(mit.zuegeAnzahl, 80, 'nach 80 Zügen');
  pruefeGleich(mit.gnugoDarfAufgeben, true, 'Feld im Datensatz');
  pruefeGleich(ohne.aufgabe, null, 'mit Option: keine Aufgabe');
  pruefeGleich(ohne.zuegeAnzahl, 90, 'bis zum Zuglimit');
  pruefeGleich(ohne.gnugoDarfAufgeben, false, 'Feld im Datensatz');
  pruefeGleich(ohne.zuege.slice(0, 80).join(' '), mit.zuege.join(' '), 'dieselben ersten 80 Züge');
});

laufeTests('GNU-Go-Brücke').then(ok => process.exit(ok ? 0 : 1));
