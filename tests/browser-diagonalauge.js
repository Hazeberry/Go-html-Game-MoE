// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Schalter PARAMS.diagonalAugeEnde im echten Browser (docs/diagonalpruefung-vorabfestlegung.md, AP2):
     1. Standard 0 (PARAMS und PARAMS_DEFAULT); das Dashboard hat die Zeile mit Wert 0, Bereich 0 bis 1.
     2. Schlusszählung (resolveLifeAndDeath): bei aus entfernt sie genau die eingefrorene Tot-Menge der Entwicklungsstellung 212|337 (4 Steine),
        bei an die der Test-Kopie der Diagnose (29 Steine); bei der unveränderten Stellung 523|354 sind beide gleich.
     3. Zählvorschau (vorschauOeffnen): die als tot geführten Steine (bewiesen oder geschätzt) sind dieselben Mengen wie bei der Schlusszählung,
        bei aus und bei an.
   Die Mengen stammen aus tests/referenz/diagonalauge.json (vor der Änderung eingefroren).
   Aufruf:  node tests/browser-diagonalauge.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');
const {ladePlaywright, sucheChromium, starteServer} = require('./browser-rahmen');
const B = require('./diagonalauge-brett.js');

const HTML_PFAD = process.argv[2] || STANDARD_HTML;
const REF = JSON.parse(fs.readFileSync(B.REFERENZ_DATEI, 'utf8'));
const fix = k => REF.entwicklung.find(e => e.schluessel === k);
const STELLUNGEN = ['Fuego 50 Spiele|D.jsonl.gz|212|337', 'Fuego 50 Spiele|D.jsonl.gz|523|354'];
const playwright = ladePlaywright();
const chromePfad = sucheChromium(playwright);
const PFLICHT = process.env.REQUIRE_BROWSER === '1';
let browser = null, server = null, port = 0;

async function vorbereiten() {
  if (browser) return true;
  if (!playwright || !chromePfad) {
    if (PFLICHT) throw new Error(`REQUIRE_BROWSER=1, aber ${!playwright ? 'Playwright' : 'Chromium'} ist nicht auffindbar.`);
    return false;
  }
  browser = await playwright.chromium.launch({executablePath: chromePfad});
  ({server, port} = await starteServer(HTML_PFAD));
  return true;
}
async function seite() {
  const ctx = await browser.newContext(), s = await ctx.newPage(), fehler = [];
  s.on('pageerror', e => fehler.push(e.message));
  await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await s.waitForFunction(() => typeof state !== 'undefined' && typeof resolveLifeAndDeath === 'function' && typeof vorschauOeffnen === 'function' && typeof PARAMS !== 'undefined');
  await s.evaluate(() => { state.aiEnabled = false; });
  return {s, ctx, fehler};
}

test('Standard 0; Dashboard-Zeile mit Wert 0 und Bereich 0 bis 1', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const w = await s.evaluate(() => {
    const i = document.getElementById('pd-diagonalAugeEnde');
    return {p: PARAMS.diagonalAugeEnde, d: PARAMS_DEFAULT.diagonalAugeEnde, zeile: !!i, wert: i && i.value, min: i && i.min, max: i && i.max};
  });
  await ctx.close();
  pruefeGleich(w.p, 0, 'PARAMS'); pruefeGleich(w.d, 0, 'PARAMS_DEFAULT'); pruefe(w.zeile, 'Dashboard-Zeile pd-diagonalAugeEnde vorhanden');
  pruefeGleich(w.wert, '0', 'Dashboard-Wert 0'); pruefeGleich(w.min, '0', 'min'); pruefeGleich(w.max, '1', 'max');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Schlusszählung: aus entfernt die eingefrorene Tot-Menge, an die der Test-Kopie', async () => {
  if (!(await vorbereiten())) return 'skip';
  for (const k of STELLUNGEN) {
    const e = fix(k);
    for (const [schalter, soll, was] of [[0, e.totAus, 'aus'], [1, e.totAn, 'an']]) {
      const {s, ctx, fehler} = await seite();
      const tot = await s.evaluate(([brett, sw]) => {
        for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0;
        PARAMS.diagonalAugeEnde = sw;
        resolveLifeAndDeath();
        return [...state.deadStones].sort((a, b) => a - b);
      }, [e.brett, schalter]);
      await ctx.close();
      pruefeGleich(JSON.stringify(tot), JSON.stringify(soll), `${k}: Schlusszählung ${was}`);
      pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
    }
  }
});

test('Zählvorschau (Anzeige): als tot geführte Steine gleich der Schlusszählung, aus und an', async () => {
  if (!(await vorbereiten())) return 'skip';
  for (const k of STELLUNGEN) {
    const e = fix(k);
    for (const [schalter, soll, was] of [[0, e.totAus, 'aus'], [1, e.totAn, 'an']]) {
      const {s, ctx, fehler} = await seite();
      const tot = await s.evaluate(([brett, sw]) => {
        for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0;
        PARAMS.diagonalAugeEnde = sw;
        vorschauOeffnen();
        const v = state.vorschau && state.vorschau.v, aus = [];
        if (v) for (let i = 0; i < v.bewiesenTot.length; i++) if (v.bewiesenTot[i] || v.geschaetztTot[i]) aus.push(i);
        return aus;
      }, [e.brett, schalter]);
      await ctx.close();
      pruefeGleich(JSON.stringify(tot), JSON.stringify(soll), `${k}: Vorschau ${was}`);
      pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
    }
  }
});

laufeTests('Diagonalprüfung im Browser').then(async ok => {
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
