// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gültigkeit des Browserteils der Diagnose (docs/zaehlung-mechanismus.md Teil B), ohne Browser, ohne Rohdaten:
     1. pruefeBericht: ein vollständiger, frischer Bericht zur richtigen index.html ist gültig; Startfehler, fehlende oder doppelte
        Pflichtfälle, ungültiger Status, fremde index.html, alter oder fehlender Zeitstempel sind „KEIN URTEIL“.
     2. browser-teil.sh mit einem Attrappen-browser.cjs: Exit 0 und 1 von browser.cjs sind nur mit frischem, gültigem Bericht ein
        gültiger Lauf; Exit 1 ohne Bericht (technischer Fehler), Exit 2, ein alter Bericht im Ausgabeverzeichnis, Startfehler,
        fehlender Pflichtfall und fremde index.html enden mit Exit 1.
     3. lauf.sh übernimmt den Exitcode von browser-teil.sh in den Gesamtstatus.
   Aufruf:  node tests/zaehlung-mechanismus.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const {pruefeBericht, PFLICHTFAELLE} = require('../auswertung/zaehlung-mechanismus/browser-vergleich.js');

const wurzel = path.join(__dirname, '..');
const teil = path.join(wurzel, 'auswertung/zaehlung-mechanismus/browser-teil.sh');
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const bericht = (h, extra = {}) => ({zeit: new Date().toISOString(), node: 'v0', quelle: {datei: 'x', sha256: sha(h)}, browser: '1',
  tests: PFLICHTFAELLE.map(id => ({id, status: 'reproduziert', pruefbar: true, defekt: true})), ...extra});

test('pruefeBericht: vollständiger frischer Bericht zur richtigen Datei ist gültig', () => {
  pruefeGleich(pruefeBericht(bericht('h'), {sha256: sha('h'), seit: '2000-01-01T00:00:00.000Z'}).join(), '');
  const b = bericht('h'); b.tests[0].status = 'nicht_reproduziert';
  pruefeGleich(pruefeBericht(b, {sha256: sha('h')}).join(), '', 'nicht_reproduziert ist ein gültiger Status');
});

test('pruefeBericht: jede Verletzung nennt einen Grund', () => {
  const g = (b, e) => pruefeBericht(b, e || {sha256: sha('h')}).join(' | ');
  pruefe(/nicht lesbar/.test(pruefeBericht(null).join()), 'null');
  pruefe(/Startfehler/.test(g(bericht('h', {startfehler: 'Chromium fehlt'}))), 'Startfehler');
  pruefe(/Browserversion/.test(g(bericht('h', {browser: undefined}))), 'Browser nicht gestartet');
  pruefe(/anderen index.html/.test(g(bericht('h'), {sha256: sha('andere')})), 'fremde index.html');
  const fehlt = bericht('h'); fehlt.tests.pop();
  pruefe(/Pflichtfall fehlt: NET-1/.test(g(fehlt)), 'fehlender Pflichtfall');
  const doppelt = bericht('h'); doppelt.tests.push({...doppelt.tests[0]});
  pruefe(/doppelt: UI-1/.test(g(doppelt)), 'doppelter Pflichtfall');
  const status = bericht('h'); status.tests[2].status = 'testfehler';
  pruefe(/ohne gültigen Status/.test(g(status)), 'Status testfehler');
  const extra = bericht('h'); extra.tests.push({id: 'UI-9', status: 'reproduziert'});
  pruefe(/unerwarteter Fall: UI-9/.test(g(extra)), 'unerwarteter Fall');
  pruefe(/älter als der Lauf/.test(g(bericht('h', {zeit: '2020-01-01T00:00:00.000Z'}), {sha256: sha('h'), seit: '2026-01-01T00:00:00.000Z'})), 'alter Bericht');
  pruefe(/Zeitstempel/.test(g(bericht('h', {zeit: undefined}), {sha256: sha('h'), seit: '2026-01-01T00:00:00.000Z'})), 'Zeitstempel fehlt');
  pruefe(/tests fehlt/.test(g(bericht('h', {tests: undefined}))), 'tests fehlt');
});

/* Attrappe von browser.cjs: --selftest gelingt; sonst Exit-Code und Bericht nach Vorgabe */
function attrappe(verz, {exitCode, bericht: schreibe}) {
  const d = path.join(verz, 'codex/auswertung/bughunt-20261107');
  fs.mkdirSync(d, {recursive: true});
  fs.writeFileSync(path.join(d, 'browser.cjs'), `
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const a = process.argv.slice(2);
if (a.includes('--selftest')) process.exit(0);
const html = a[a.indexOf('--html') + 1], aus = a[a.indexOf('--aus') + 1];
const bericht = ${JSON.stringify(schreibe)};
if (bericht) {
  const sha = crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
  const r = bericht === 'gueltig' ? ${JSON.stringify(bericht('x'))} : JSON.parse(bericht);
  r.quelle = {datei: html, sha256: bericht === 'fremd' ? 'f'.repeat(64) : sha};
  r.zeit = new Date().toISOString();
  fs.mkdirSync(aus, {recursive: true});
  fs.writeFileSync(path.join(aus, 'bericht.json'), JSON.stringify(r));
}
process.exit(${exitCode});
`);
  return path.join(verz, 'codex');
}
function laufe(szenario, vorher) {
  const verz = fs.mkdtempSync(path.join(os.tmpdir(), 'zm-test-'));
  try {
    const html = path.join(verz, 'index.html'); fs.writeFileSync(html, '<html>test</html>');
    const codex = attrappe(verz, szenario), aus = path.join(verz, 'aus');
    if (vorher) vorher(aus);
    const lauf1 = path.join(verz, 'lauf1.json'); fs.writeFileSync(lauf1, JSON.stringify(bericht('x')));
    const r = spawnSync('bash', [teil, html, codex, aus, lauf1], {encoding: 'utf8', timeout: 60000});
    return {status: r.status, aus: r.stdout + r.stderr};
  } finally { fs.rmSync(verz, {recursive: true, force: true}); }
}
const gueltig = (m) => JSON.stringify(bericht('x', m));

test('browser-teil.sh: Exit 0 und 1 von browser.cjs mit frischem gültigem Bericht sind ein gültiger Lauf', () => {
  pruefeGleich(laufe({exitCode: 1, bericht: 'gueltig'}).status, 0, 'Exit 1 (reproduziert)');
  pruefeGleich(laufe({exitCode: 0, bericht: 'gueltig'}).status, 0, 'Exit 0 (nicht reproduziert)');
});

test('browser-teil.sh: technische Fehler und ungültige Berichte enden mit Exit 1', () => {
  const r1 = laufe({exitCode: 1, bericht: null});
  pruefeGleich(r1.status, 1, 'Exit 1 ohne Bericht (technischer Fehler) darf nicht als „reproduziert“ gelten');
  pruefe(/KEIN URTEIL/.test(r1.aus), 'Grund genannt');
  pruefeGleich(laufe({exitCode: 2, bericht: 'gueltig'}).status, 1, 'Exit 2 ist technischer Fehler, auch mit Bericht');
  pruefeGleich(laufe({exitCode: 1, bericht: gueltig({startfehler: 'Chromium fehlt'})}).status, 1, 'Startfehler im Bericht');
  const fehlt = JSON.parse(gueltig()); fehlt.tests.pop();
  pruefeGleich(laufe({exitCode: 1, bericht: JSON.stringify(fehlt)}).status, 1, 'Pflichtfall fehlt');
  pruefeGleich(laufe({exitCode: 1, bericht: 'fremd'}).status, 1, 'Bericht gehört zu einer anderen index.html');
});

test('browser-teil.sh: ein alter Bericht im Ausgabeverzeichnis wird nie gelesen', () => {
  const alt = aus => {
    fs.mkdirSync(path.join(aus, 'browser'), {recursive: true});
    const r = bericht('x'); r.quelle.sha256 = sha('<html>test</html>');
    fs.writeFileSync(path.join(aus, 'browser/bericht.json'), JSON.stringify(r));
  };
  const r = laufe({exitCode: 1, bericht: null}, alt);
  pruefeGleich(r.status, 1, 'alter, formal gültiger Bericht darf einen ausgefallenen Lauf nicht retten');
});

test('lauf.sh übernimmt den Exitcode des Browserteils in den Gesamtstatus', () => {
  const t = fs.readFileSync(path.join(wurzel, 'auswertung/zaehlung-mechanismus/lauf.sh'), 'utf8');
  pruefe(/browser-teil\.sh"[^\n]*\|\| status=1/.test(t), 'browser-teil.sh || status=1');
  pruefe(!/browser-exit\.txt/.test(t), 'kein loses Aufschreiben des Exitcodes in lauf.sh');
});

laufeTests('zaehlung-mechanismus.js').then(ok => {
  process.exitCode = ok ? 0 : 1;
});
