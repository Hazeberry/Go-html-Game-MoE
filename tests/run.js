// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Alle Tests nacheinander. Jeder ist auch einzeln aufrufbar.

   Aufruf:  node tests/run.js [Schalter] [pfad/zur/index.html]
   Schalter:  --ohne-browser   alles außer den Suiten browser-*.js
              --nur-browser    nur diese Suiten
              --ohne-gnugo     alles außer den Suiten, die ein echtes GNU Go brauchen (GNUGO unten)
              --nur-gnugo      nur diese
   Die Schalter lassen sich verbinden (--ohne-browser --ohne-gnugo); dieselbe Gruppe mit --nur und --ohne
   ist ein Bedienfehler (Exit 2), ebenso eine unbekannte Gruppe.

   Die Liste der Suiten lebt NUR hier. Der CI-Workflow ruft nur diesen Runner mit Schaltern auf und nennt keine
   Datei. Das hat zwei Vorfälle als Grund: Beim Hinzufügen von resign-criterion.js wurde die Liste im Node-Job
   nicht mitgepflegt, der Job blieb grün und prüfte den neuen Test nicht. Und der Browser-Job führte seine sechs
   Suiten noch einmal einzeln auf; eine siebte nur im Runner hätte der Node-Job wegen --ohne-browser
   übersprungen, und der Browser-Job wäre trotzdem grün geblieben. tests/testlauf.js prüft beides: jede Suite
   steht in ALLE, und der Workflow nennt keine einzelne Datei.

   Übersprungenes wird nicht verschluckt: Jeder übersprungene Test meldet seinen Grund an den Runner
   (TESTS_UEBERSPRUNGEN, tests/rahmen.js), der Runner listet alle am Ende, schreibt sie in die Zusammenfassung
   des Jobs ($GITHUB_STEP_SUMMARY), gibt Anzahl und Liste als Ausgabe weiter ($GITHUB_OUTPUT) und setzt in
   GitHub Actions eine Warnung. Ob ein fehlendes Programm ein Fehler ist, entscheidet REQUIRE_<NAME>=1
   (REQUIRE_BROWSER, REQUIRE_GNUGO); ohne die Variable ist es ein sichtbares Überspringen mit Grund. */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawn} = require('child_process');

const ALLE = ['regeln.js', 'nan-guards.js', 'resign-criterion.js', 'transfer-telemetry.js',
              'benson-transfer.js', 'benson-lebend-treppe.js', 'endspiel-netz.js', 'feste-sims.js', 'roh-dump.js',
              'influence.js', 'endspiel-gleichstand.js', 'eval-streuung.js', 'eval-streuung-bericht.js', 'eval-streuung-vielfalt.js', 'skalierung-bericht.js', 'k3-uebergabe.js', 'k3-diagnose.js', 'k3-diagnose-gnugo.js', 'testlauf.js', 'arbeitspunkt.js', 'epochen.js', 'raumrisiko.js', 'gebiet.js', 'endspiel-augen.js', 'gegnerwert.js', 'lesen.js', 'wurzel.js', 'quick-rettung.js', 'atari-verzicht.js', 'muster.js', 'gebiet-sicher.js', 'zaehlung.js', 'extern.js', 'lizenz.js', 'ko-suche.js', 'muster-endspiel.js', 'dagger.js', 'gnugo-bruecke.js', 'gnugo-superko.js', 'fuego-gegner.js', 'komponenten.js', 'pwa.js', 'komi.js', 'endspiel-abraeumen.js', 'zaehlvorschau.js', 'zeit-zerlegung.js', 'passregel-versuch.js', 'passregel-vergleich.js', 'passregel-zaehldiagnose.js', 'passregel-vorsprung.js', 'zaehlung-mechanismus.js', 'diagonalauge.js', 'diagonal-pruefung.js', 'diagonal-pruefung-stufe2.js', 'diagonal-pruefung-stufe3.js', 'diagnose-p1p2.js', 'diagnose-p2-rang.js', 'kandidaten-orakel.js', 'kandidaten-orakel-spiel.js', 'kandidaten-orakel-haupt.js', 'engine-vergleich.js', 'kandidaten-orakel-vierarm.js',
              'training-stability.js', 'harness-smoke.js', 'browser-nan.js', 'browser-ui.js', 'browser-zaehlvorschau.js', 'browser-passregel.js', 'browser-diagonalauge.js', 'browser-zeiten.js'];

/* Gruppen, die ein eigener CI-Job übernimmt, weil sie ein Programm brauchen oder lange laufen. */
const BROWSER = f => f.startsWith('browser-');
const GNUGO_SUITEN = new Set(['gnugo-bruecke.js', 'k3-diagnose-gnugo.js']);
const GRUPPEN = {browser: BROWSER, gnugo: f => GNUGO_SUITEN.has(f)};

class Bedienfehler extends Error {}

/* Wählt die Suiten. Rückgabe {suiten, pfad}; wirft Bedienfehler. */
function waehle(argv, alle = ALLE) {
  const nur = [], ohne = [];
  let pfad = null;
  for (const a of argv) {
    const m = /^--(nur|ohne)-([a-z]+)$/.exec(a);
    if (m) {
      if (!GRUPPEN[m[2]]) throw new Bedienfehler(`unbekannte Gruppe in ${a} (bekannt: ${Object.keys(GRUPPEN).join(', ')})`);
      (m[1] === 'nur' ? nur : ohne).push(m[2]);
    } else if (a.startsWith('--')) throw new Bedienfehler(`unbekannter Schalter ${a}`);
    else if (pfad === null) pfad = a;
    else throw new Bedienfehler(`zweiter Pfad ${a}`);
  }
  for (const g of nur) if (ohne.includes(g)) throw new Bedienfehler(`--nur-${g} und --ohne-${g} widersprechen sich`);
  let suiten = nur.length ? alle.filter(f => nur.some(g => GRUPPEN[g](f))) : alle.slice();
  suiten = suiten.filter(f => !ohne.some(g => GRUPPEN[g](f)));
  return {suiten, pfad: pfad ? path.resolve(pfad) : null};
}

/* Führt die Suiten nacheinander aus. Rückgabe {kaputt: [Dateien], uebersprungen: [{datei, test, grund}]}. */
async function fuehreAus(suiten, verzeichnis, html = null, env = process.env, {stumm = false} = {}) {
  const kanal = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'tests-uebersprungen-')), 'uebersprungen.jsonl');
  fs.writeFileSync(kanal, '');
  /* training-stability nimmt Partien/Züge VOR dem Pfad — deshalb die Defaults mitgeben, wenn ein Pfad
     durchgereicht wird. */
  const argumente = s => !html ? [] : (s === 'training-stability.js' ? ['30', '400', html] : [html]);
  const kaputt = [];
  for (const s of suiten) {
    const code = await new Promise(fertig => {
      const p = spawn(process.execPath, [path.join(verzeichnis, s), ...argumente(s)],
                      {stdio: stumm ? 'ignore' : 'inherit', env: {...env, TESTS_UEBERSPRUNGEN: kanal}});
      p.on('close', fertig);
    });
    if (code !== 0) kaputt.push(s);
  }
  const uebersprungen = fs.readFileSync(kanal, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)).map(u =>
    /* Die Browser-Suiten melden 'skip' ohne Text; vorbereiten() liefert dort nur dann false, wenn Playwright oder
       Chromium fehlt (mit REQUIRE_BROWSER=1 wirft es stattdessen). */
    (u.grund === 'Grund nicht angegeben' && BROWSER(u.datei)) ? {...u, grund: 'Playwright oder Chromium nicht auffindbar'} : u);
  fs.rmSync(path.dirname(kanal), {recursive: true, force: true});
  return {kaputt, uebersprungen};
}

const eineZeile = s => String(s).replace(/[\r\n]+/g, ' ');
/* Gleicher Grund in derselben Datei wird zusammengefasst: Fehlt Playwright, überspringen über hundert Tests. */
function gruppiere(uebersprungen) {
  const g = new Map();
  for (const u of uebersprungen) {
    const k = `${u.datei}\u0000${u.grund}`;
    if (!g.has(k)) g.set(k, {datei: u.datei, grund: u.grund, namen: []});
    g.get(k).namen.push(u.test);
  }
  return [...g.values()];
}
const listenzeile = g => g.namen.length === 1 ? `${g.datei}: ${g.namen[0]} — ${g.grund}` : `${g.datei}: ${g.namen.length} Tests — ${g.grund}`;

/* Text für Konsole und Zusammenfassung. */
function fasseZusammen(anzahlSuiten, ergebnis) {
  const {kaputt, uebersprungen} = ergebnis;
  const z = [];
  z.push(kaputt.length === 0
    ? `Alle ${anzahlSuiten} Testdateien bestanden${uebersprungen.length ? `, aber ${uebersprungen.length} ${uebersprungen.length === 1 ? 'Test' : 'Tests'} übersprungen` : ''}.`
    : `${kaputt.length} von ${anzahlSuiten} Testdateien fehlgeschlagen: ${kaputt.join(', ')}.`);
  if (uebersprungen.length) {
    z.push('', 'Übersprungen (nicht geprüft):');
    for (const g of gruppiere(uebersprungen)) z.push(`  ○ ${listenzeile(g)}`);
  }
  return z.join('\n');
}

async function main() {
  let wahl;
  try { wahl = waehle(process.argv.slice(2)); }
  catch (e) {
    if (e instanceof Bedienfehler) { console.error(`Bedienfehler: ${e.message}`); process.exit(2); }
    throw e;
  }
  const ergebnis = await fuehreAus(wahl.suiten, __dirname, wahl.pfad);
  const text = fasseZusammen(wahl.suiten.length, ergebnis);
  console.log(`\n${'═'.repeat(52)}\n${text}`);
  const u = ergebnis.uebersprungen;
  if (process.env.GITHUB_STEP_SUMMARY && u.length) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY,
      `\n### Übersprungen (nicht geprüft): ${u.length}\n\n${gruppiere(u).map(x => `- ${listenzeile(x)}`).join('\n')}\n`);
  }
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `uebersprungen=${u.length}\nliste=${eineZeile(gruppiere(u).map(listenzeile).join(' | '))}\n`);
  }
  if (process.env.GITHUB_ACTIONS && u.length)
    console.log(`::warning title=Tests übersprungen::${eineZeile(u.length + ' Tests nicht geprüft: ' + gruppiere(u).map(listenzeile).join(' | '))}`);
  process.exit(ergebnis.kaputt.length === 0 ? 0 : 1);
}

if (require.main === module) main();
module.exports = {ALLE, GRUPPEN, GNUGO_SUITEN, Bedienfehler, waehle, fuehreAus, fasseZusammen, gruppiere, listenzeile};
