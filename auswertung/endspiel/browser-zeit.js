// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zeit eines KI-Zuges im echten Chromium (docs/zeitbudget.md): spielt eine SGF-Partie bis
   zu gegebenen Zügen ein, lässt die KI (Weiß) in der App über den Worker ziehen und zerlegt
   die Dauer aus der Diagnose (aiDiag): Suche, Rest, Messpunkte. Einmal mit Endspiel-Netz
   (PARAMS.endspielNetz 0,8), einmal ohne. Optional mit gedrosselter CPU (CDP), um ein
   langsames Gerät grob nachzustellen. Jede Probe dauert so lang wie das Zeitbudget (ca. 2 s).

   Aufruf:  node auswertung/endspiel/browser-zeit.js datei.sgf [zug,zug,…] [cpu-faktor] */
'use strict';
const fs = require('fs'), path = require('path');
const W = path.join(__dirname, '..', '..');
const {ladePlaywright, sucheChromium, starteServer} = require(path.join(W, 'tests', 'browser-rahmen'));
const {parseSgf} = require('./territory-fuellen');

async function messen(datei, proben, cpu = 1) {
  const pw = ladePlaywright(), chrome = sucheChromium(pw);
  if (!pw || !chrome) throw new Error('Playwright oder Chromium nicht auffindbar');
  const zuege = parseSgf(fs.readFileSync(datei, 'utf8')).map(x => [x.f, x.p]);
  const browser = await pw.chromium.launch({executablePath: chrome});
  const {server, port} = await starteServer(path.join(W, 'index.html'));
  const aus = [];
  try {
    for (const netz of [0.8, 0]) {
      const ctx = await browser.newContext(), s = await ctx.newPage();
      await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
      await s.waitForFunction(() => typeof state !== 'undefined' && typeof triggerAIMove === 'function');
      if (cpu > 1) { const c = await ctx.newCDPSession(s); await c.send('Emulation.setCPUThrottlingRate', {rate: cpu}); }
      await s.evaluate(n => { PARAMS.endspielNetz = n; }, netz);
      for (const n of proben) {
        const d = await s.evaluate(async ({zuege, n}) => {
          resetGame();
          state.aiEnabled = true; state.aiColor = 2; state.aiDifficulty = 'hard';
          for (let k = 0; k < n - 1; k++) { const [f, p] = zuege[k]; if (!p) continue; const i = (p.charCodeAt(1) - 97) * 19 + (p.charCodeAt(0) - 97); state.board[i] = f; state.captures[f] += removeDeadGroups(state.board, 3 - f, i); }
          state.currentPlayer = 2; state.moveCount = n - 1; state.consecutivePasses = 0; state.lastMove = null; state.aiDiag.length = 0;
          updateUI(); triggerAIMove();
          await new Promise(res => { const iv = setInterval(() => { if (!state.aiThinking && state.aiDiag.length) { clearInterval(iv); res(); } }, 50); });
          return state.aiDiag[state.aiDiag.length - 1];
        }, {zuege, n});
        const m = /(\d+)[^\d]*Sims/.exec(d.info || ''), suche = m ? Math.round(+m[1] * d.msProSim) : null;
        aus.push({netz, cpu, zug: n, dauerMs: d.dauerMs, budgetMs: d.budgetMs, sucheMs: suche, restMs: suche === null ? null : d.dauerMs - suche,
                  vorMs: d.zeiten && d.zeiten.vorMs, netzMs: d.zeiten && d.zeiten.netzMs, nachMs: d.zeiten && d.zeiten.nachMs, nachrichtMs: d.nachrichtMs});
      }
      await ctx.close();
    }
  } finally { await browser.close(); server.close(); }
  return aus;
}

module.exports = {messen};

if (require.main === module) {
  const a = process.argv.slice(2), datei = a[0];
  if (!datei) { console.error('Aufruf: node browser-zeit.js datei.sgf [zug,zug,…] [cpu-faktor]'); process.exit(2); }
  const proben = (a[1] || '70,78,80,82,84,100').split(',').map(Number), cpu = +(a[2] || 1);
  messen(datei, proben, cpu).then(r => {
    console.log(`CPU ×${cpu}; Zeiten in ms: Dauer, Suche, Rest, davon vor der Suche, Netz, nach der Suche, Nachrichtenweg`);
    for (const x of r) console.log(`Netz ${x.netz}  Zug ${String(x.zug).padStart(3)}  Dauer ${x.dauerMs}  Suche ${x.sucheMs}  Rest ${x.restMs}  vor ${x.vorMs}  Netz ${x.netzMs}  nach ${x.nachMs}  Nachricht ${x.nachrichtMs}`);
  }).catch(e => { console.error(e); process.exit(1); });
}
