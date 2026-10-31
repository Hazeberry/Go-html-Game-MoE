// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Versuchsregel „Pass nach Gegnerpass“ im echten Browser (docs/passregel-versuch.md):
     1. Schalter AN, ausgespielte Stellung mit klarem Vorsprung der KI: nach dem
        Pass des Menschen passt die KI sofort (Worker-Weg), das Spiel endet, das
        Protokoll nennt die Versuchsregel.
     2. Schalter AUS: dieselbe Stellung, dieselbe Situation — die Regel greift
        nicht (kein Eintrag im Protokoll).
     3. Schalter AN, aber der Mensch hat NICHT gepasst (er zieht): die Regel greift
        nicht.

   Aufruf:  node tests/browser-passregel.js [pfad/zur/index.html] */
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

function sgfZuege(datei) {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', datei), 'utf8');
  const re = /;([BW])\[([a-s]{2})\]/g, z = []; let m;
  while ((m = re.exec(txt))) z.push([(m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97), m[1] === 'B' ? 1 : 2]);
  return z;
}

/* Partie 427 (Schwarz führt, ausgespielt). KI = Schwarz, Mensch = Weiß am Zug. */
async function aufbau(schalter) {
  const ctx = await browser.newContext(), s = await ctx.newPage(), fehler = [];
  s.on('pageerror', e => fehler.push(e.message));
  await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await s.waitForFunction(() => typeof state !== 'undefined' && typeof placeStone === 'function');
  await s.evaluate(({zuege, schalter}) => {
    PARAMS.passNachGegnerpass = schalter;
    state.aiEnabled = true; state.aiColor = 1; state.aiDifficulty = 'hard';
    for (const [i, c] of zuege) { state.board[i] = c; removeDeadGroups(state.board, 3 - c, i); }
    state.currentPlayer = 2; state.moveCount = zuege.length; state.consecutivePasses = 0;
    drawStateToCache(); render(); updateUI();
  }, {zuege: sgfZuege('hand-427.sgf'), schalter});
  return {s, ctx, fehler};
}
const protokoll = s => s.evaluate(() => state.log.join('\n'));

test('Schalter an, Mensch passt, KI klar vorn: KI passt sofort, Spiel endet, Protokoll nennt die Versuchsregel', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await aufbau(1);
  await s.click('#btn-pass');
  await s.waitForFunction(() => state.gameOver, null, {timeout: 20000});
  const log = await protokoll(s);
  await ctx.close();
  pruefe(/Versuchsregel/.test(log), `Protokoll nennt die Versuchsregel: ${log.slice(-200)}`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Schalter aus: dieselbe Lage, die Versuchsregel greift nicht', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx} = await aufbau(0);
  await s.click('#btn-pass');
  await s.waitForFunction(() => !state.aiThinking && (state.gameOver || state.currentPlayer === 2 || state.moveCount > 427), null, {timeout: 30000});
  const log = await protokoll(s);
  await ctx.close();
  pruefe(!/Versuchsregel/.test(log), 'kein Eintrag der Versuchsregel');
});

test('Schalter an, aber der Mensch hat nicht gepasst: die Regel greift nicht', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx} = await aufbau(1);
  const frei = await s.evaluate(() => { for (let i = 0; i < BOARD_SIZE; i++) if (!state.board[i] && getLegalMoves(state.board, 2, state.boardHistory, state.koPoint).some(m => m.idx === i)) return i; return -1; });
  await s.evaluate(i => { placeStone(xOf(i), yOf(i)); updateUI(); triggerAIMove(); }, frei);
  await s.waitForFunction(() => !state.aiThinking, null, {timeout: 30000});
  await s.waitForTimeout(500);
  const log = await protokoll(s);
  await ctx.close();
  pruefe(!/Versuchsregel/.test(log), 'kein Eintrag der Versuchsregel nach einem Zug des Menschen');
});

laufeTests('Versuchsregel im Browser').then(async ok => {
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
