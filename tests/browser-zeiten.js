// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zeitmesspunkte der KI-Diagnose im echten Browser (docs/zeitbudget.md):
     1. Ein KI-Zug über den Worker trägt in aiDiag `zeiten` (gesamtMs, vorMs, netzMs,
        sucheMs, nachMs), `nachrichtMs` und `anwendenMs`.
     2. Die Teile gehen auf: vorMs + sucheMs + nachMs = gesamtMs; die Dauer des Zuges
        im Hauptthread ist mindestens gesamtMs + nachrichtMs.
     3. Das Endspiel-Netz erscheint erst ab Zug 80: vor Zug 80 netzMs = 0, danach > 0
        (und höchstens vorMs); mit PARAMS.endspielNetz = 0 bleibt es 0.
     4. Bei festen Simulationen ist die Zugwahl reproduzierbar (gleicher Zug bei zwei
        Läufen); die Messpunkte lesen nur die Uhr und gehen in keine Entscheidung ein.

   Aufruf:  node tests/browser-zeiten.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');
const {ladePlaywright, sucheChromium, starteServer} = require('./browser-rahmen');

const HTML_PFAD = process.argv[2] || STANDARD_HTML;
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

function sgfZuege() {
  const txt = fs.readFileSync(path.join(__dirname, '..', 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'mensch-494zuege-territory.sgf'), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g, z = []; let m;
  while ((m = re.exec(txt))) z.push([m[1] === 'B' ? 1 : 2, m[2]]);
  return z;
}

async function einZug(n, netz) {
  const ctx = await browser.newContext(), s = await ctx.newPage(), fehler = [];
  s.on('pageerror', e => fehler.push(e.message));
  await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await s.waitForFunction(() => typeof state !== 'undefined' && typeof triggerAIMove === 'function');
  const r = await s.evaluate(async ({zuege, n, netz}) => {
    PARAMS.endspielNetz = netz; PARAMS.mctsFixedSims = 60;
    state.aiEnabled = true; state.aiColor = 2; state.aiDifficulty = 'hard';
    for (let k = 0; k < n - 1; k++) { const [f, p] = zuege[k]; if (!p) continue; const i = (p.charCodeAt(1) - 97) * 19 + (p.charCodeAt(0) - 97); state.board[i] = f; state.captures[f] += removeDeadGroups(state.board, 3 - f, i); }
    state.currentPlayer = 2; state.moveCount = n - 1; state.consecutivePasses = 0; state.lastMove = null; state.aiDiag.length = 0;
    updateUI(); triggerAIMove();
    await new Promise(res => { const iv = setInterval(() => { if (!state.aiThinking && state.aiDiag.length) { clearInterval(iv); res(); } }, 20); });
    return state.aiDiag[state.aiDiag.length - 1];
  }, {zuege: sgfZuege(), n, netz});
  await ctx.close();
  return {d: r, fehler};
}

test('Zeitmesspunkte: Teile gehen auf, Dauer im Hauptthread enthält Worker-Zeit und Nachrichtenweg', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {d, fehler} = await einZug(100, 0.8);
  const z = d.zeiten;
  pruefe(z && typeof z.gesamtMs === 'number', 'zeiten vorhanden');
  pruefeGleich(Math.abs(z.vorMs + z.sucheMs + z.nachMs - z.gesamtMs) <= 1, true, `Teile gehen auf (${JSON.stringify(z)})`);
  pruefe(typeof d.nachrichtMs === 'number' && d.nachrichtMs >= 0, `nachrichtMs ${d.nachrichtMs}`);
  pruefe(typeof d.anwendenMs === 'number' && d.anwendenMs >= 0, `anwendenMs ${d.anwendenMs}`);
  pruefe(d.dauerMs + 1 >= z.gesamtMs + d.nachrichtMs, `Dauer ${d.dauerMs} mindestens gesamt ${z.gesamtMs} + Nachricht ${d.nachrichtMs}`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Endspiel-Netz erscheint erst ab Zug 80 in den Zeiten; mit endspielNetz 0 nie', async () => {
  if (!(await vorbereiten())) return 'skip';
  const frueh = (await einZug(60, 0.8)).d.zeiten, spaet = (await einZug(100, 0.8)).d.zeiten, aus = (await einZug(100, 0)).d.zeiten;
  pruefeGleich(frueh.netzMs, 0, 'Zug 60: kein Netz');
  pruefe(spaet.netzMs > 0 && spaet.netzMs <= spaet.vorMs, `Zug 100: Netz ${spaet.netzMs} ms, vor der Suche ${spaet.vorMs} ms`);
  pruefeGleich(aus.netzMs, 0, 'endspielNetz 0: kein Netz');
});

test('Feste Simulationen: Zugwahl reproduzierbar', async () => {
  if (!(await vorbereiten())) return 'skip';
  const a = (await einZug(100, 0.8)).d.info, b = (await einZug(100, 0.8)).d.info;
  const zug = t => /Sims · \d+% (\S+)/.exec(t || '')?.[1];
  pruefeGleich(zug(a), zug(b), `gleicher Zug (${a} / ${b})`);
});

laufeTests('Zeitmesspunkte im Browser').then(async ok => {
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
