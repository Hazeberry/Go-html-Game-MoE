// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Brücke zu GNU Go (gnugo-duell.js): eine kurze Partie über GTP.

   Ohne GNU Go (z. B. in CI) überspringt sich der Test. Geprüft wird, dass
   eine Partie zu Ende läuft, die Bretter beider Programme übereinstimmen
   (das Werkzeug bricht sonst mit Fehler ab) und der Datensatz die
   erwarteten Felder trägt — mit und ohne Vorgabe. Dazu --gnugo-aufgabe 0:
   Eine Partie, die GNU Go sonst nach 80 Zügen aufgibt, läuft damit weiter,
   mit denselben ersten 80 Zügen.

   --orakel-zug (docs/muster-endspiel-orakel.md): ein zweites GNU Go zieht ab
   einer Zugzahl für die KI. Eine nicht erreichte Schwelle ändert nichts, bei
   ANTEIL 1 wird jeder Zug ab AB ersetzt, mit ANTEIL 0,5 ein Teil; falsche
   Angaben werden abgelehnt.

   Phasenstufen in --ki (docs/prior-nachmessung.md §2): name@N=wert gilt ab
   Zug N. Eine nicht erreichte Stufe ändert die Partie nicht, @0 spielt wie
   ohne @, eine Stufe mitten in der Partie lässt die Züge davor gleich und
   zählt einen Wechsel.

   auswertung/orakel-nachspiel.js (Zusatzrechnung zum Passen): Eine
   aufgezeichnete Partie aus docs/daten/endspiel-orakel/lauf1/ nachgespielt
   ergibt in GNU Go denselben Endstand wie in der Aufzeichnung, und die
   Stellung nach dem ersten Pass lässt sich zählen.

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
   nach 80 Zügen auf. Die Partie stammt aus der Zeit vor musterGewicht
   (Default 200 seit docs/muster.md); der Schalter ist hier auf 0 gesetzt,
   damit sie gleich bleibt. */
test('--gnugo-aufgabe 0: GNU Go gibt nicht auf, die Partie läuft weiter', () => {
  const basis = ['--partien', '1', '--von', '39', '--seed', '141', '--stufe', '1', '--vorgabe', '9',
                 '--maxzuege', '90', '--ki', 'mctsFixedSims=120,resignEnabled=0,musterGewicht=0'];
  const mit = partie([], basis), ohne = partie(['--gnugo-aufgabe', '0'], basis);
  pruefeGleich(mit.aufgabe, 'W', 'ohne Option: GNU Go gibt auf');
  pruefeGleich(mit.zuegeAnzahl, 80, 'nach 80 Zügen');
  pruefeGleich(mit.gnugoDarfAufgeben, true, 'Feld im Datensatz');
  pruefeGleich(ohne.aufgabe, null, 'mit Option: keine Aufgabe');
  pruefeGleich(ohne.zuegeAnzahl, 90, 'bis zum Zuglimit');
  pruefeGleich(ohne.gnugoDarfAufgeben, false, 'Feld im Datensatz');
  pruefeGleich(ohne.zuege.slice(0, 80).join(' '), mit.zuege.join(' '), 'dieselben ersten 80 Züge');
});

/* Orakel-Test: kurze Partie mit neun Vorgabesteinen, Orakel auf Stufe 1, damit
   sie schnell bleibt. Weiß (GNU Go) beginnt, die KI zieht an den ungeraden
   Zugnummern k = 1, 3, 5, … */
const ORAKEL = ['--partien', '1', '--seed', '3', '--stufe', '1', '--vorgabe', '9', '--maxzuege', '40', '--gnugo-aufgabe', '0',
                '--ki', 'mctsFixedSims=20,resignEnabled=0'];
let ohneOrakel = null;   /* dieselbe Partie ohne Option, einmal gespielt */
const ohneOption = () => (ohneOrakel = ohneOrakel || partie([], ORAKEL));

test('--orakel-zug: ohne Option nichts, nicht erreichte Schwelle ändert die Partie nicht', () => {
  const ohne = ohneOption(), nie = partie(['--orakel-zug', '99999'], ORAKEL);
  pruefe(!('orakelZug' in ohne), 'ohne Option kein Feld im Datensatz');
  pruefeGleich(nie.orakelZug.gelegenheiten, 0, 'Schwelle nie erreicht: keine Gelegenheit');
  pruefeGleich(nie.orakelZug.eingesetzt, 0, 'nichts eingesetzt');
  pruefeGleich(nie.zuege.join(' '), ohne.zuege.join(' '), 'dieselben Züge');
  pruefeGleich(nie.endstand, ohne.endstand, 'derselbe Endstand');
});

test('--orakel-zug AB: ab AB zieht das Orakel in jedem Zug der KI', () => {
  const ohne = ohneOption(), voll = partie(['--orakel-zug', '10', '--orakel-zug-stufe', '1'], ORAKEL);
  pruefe(!voll.abgebrochen, 'nicht abgebrochen');
  let erwartet = 0;
  for (let k = 10; k < voll.zuegeAnzahl; k++) if (k % 2 === 1) erwartet++;
  const o = voll.orakelZug;
  pruefeGleich(o.ab, 10, 'AB im Datensatz'); pruefeGleich(o.anteil, 1, 'Anteil im Datensatz'); pruefeGleich(o.stufe, 1, 'Stufe im Datensatz');
  pruefeGleich(o.gelegenheiten, erwartet, `Gelegenheiten: die ${erwartet} Züge der KI ab Zug 11`);
  pruefeGleich(o.eingesetzt, o.gelegenheiten, 'bei Anteil 1 in jedem eingesetzt');
  pruefe(o.gleich >= 0 && o.gleich <= o.eingesetzt, 'gleich liegt zwischen 0 und eingesetzt');
  pruefeGleich(voll.zuege.slice(0, 10).join(' '), ohne.zuege.slice(0, 10).join(' '), 'die ersten 10 Züge sind dieselben');
  pruefe(voll.zuege.slice(10).join(' ') !== ohne.zuege.slice(10).join(' '), 'danach spielt die Partie anders');
});

test('--orakel-zug AB:ANTEIL: nur ein Teil der Gelegenheiten, falsche Angaben abgelehnt', () => {
  const halb = partie(['--orakel-zug', '10:0.5', '--orakel-zug-stufe', '1'], ORAKEL).orakelZug;
  pruefe(halb.eingesetzt > 0 && halb.eingesetzt < halb.gelegenheiten, `ein Teil von ${halb.gelegenheiten}: ${halb.eingesetzt}`);
  for (const falsch of ['abc', '10:0', '10:1.5', '-3']) {
    let status = 0;
    try { execFileSync(process.execPath, [WERKZEUG, ...ORAKEL, '--orakel-zug', falsch], {stdio: 'pipe', timeout: 20000}); }
    catch (e) { status = e.status; }
    pruefeGleich(status, 2, `--orakel-zug ${falsch} wird abgelehnt`);
  }
});

test('--ki name@N=wert: nicht erreichte Stufe ändert nichts, @0 wie ohne @, Wechsel mitten in der Partie', () => {
  const basis = k => ['--partien', '1', '--seed', '3', '--stufe', '1', '--maxzuege', '30', '--ki', 'mctsFixedSims=20' + k];
  const ohne = partie([], basis('')), spaet = partie([], basis(',mctsPriorSharp@200=9'));
  pruefeGleich(spaet.zuege.join(' '), ohne.zuege.join(' '), 'Stufe ab Zug 200 in 30 Zügen: dieselbe Partie');
  pruefeGleich(JSON.stringify(spaet.kiStufen), '{"mctsPriorSharp":[[200,9]]}', 'Stufen im Datensatz');
  pruefeGleich(spaet.phasenwechsel, 0, 'kein Wechsel');
  pruefe(!('kiStufen' in ohne) && !('phasenwechsel' in ohne), 'ohne @ keine neuen Felder');
  const neun = partie([], basis(',mctsPriorSharp=9')), null9 = partie([], basis(',mctsPriorSharp@0=9'));
  pruefeGleich(null9.zuege.join(' '), neun.zuege.join(' '), '@0 spielt wie ohne @');
  pruefeGleich(null9.phasenwechsel, 0, '@0: kein Wechsel');
  const mitte = partie([], basis(',mctsPriorSharp@10=30'));
  pruefeGleich(mitte.zuege.slice(0, 10).join(' '), ohne.zuege.slice(0, 10).join(' '), 'die ersten 10 Züge wie ohne Stufe');
  pruefeGleich(mitte.phasenwechsel, 1, 'ein Wechsel');
});

test('orakel-nachspiel.js: eine aufgezeichnete Partie nachgespielt ergibt den aufgezeichneten Endstand', async () => {
  const N = require('../auswertung/orakel-nachspiel.js');
  const daten = path.join(__dirname, '..', 'docs', 'daten', 'endspiel-orakel', 'lauf1', 'A.jsonl.gz');
  pruefe(fs.existsSync(daten), 'die eingecheckten Partien des Orakel-Tests liegen vor');
  const q = N.liesJsonl(daten).slice(0, 1);
  const [z] = await N.nachrechnen(q, GNUGO);
  pruefeGleich(z.ende, q[0].endstand, 'Endstand wie aufgezeichnet');
  pruefeGleich(z.laenge, q[0].zuege.length, 'alle Züge nachgespielt');
  pruefeGleich(z.erster, q[0].zuege.indexOf('pass'), 'erster Pass');
  pruefe(Number.isFinite(z.nach), `Stand nach dem ersten Pass: ${z.nach}`);
});

laufeTests('GNU-Go-Brücke').then(ok => process.exit(ok ? 0 : 1));
