// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Bug Hunt vom 16.11.2026 (docs/bughunt-20261116.md): prüft die Befunde an der
   UNVERÄNDERTEN index.html im Browser. Rein lesend, ändert keine Datei im Repo.

   Kein Test im Sinne von tests/: Jeder Fall meldet „reproduziert“, wenn der
   beschriebene Fehler auftritt, und „nicht reproduziert“ sonst. Nach einer
   Korrektur soll der jeweilige Fall auf „nicht reproduziert“ wechseln.

   Aufruf:  node auswertung/bughunt-20261116/pruefung.js [ausgabe.json]
   Braucht Playwright und Chromium (wie tests/browser-*.js). Dauer rund eine
   Minute, davon gut 40 s für die vier W-1-Fälle (Watchdog-Wartezeit). */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const {execFileSync} = require('child_process');
const WURZEL = path.join(__dirname, '..', '..');
const {ladePlaywright, sucheChromium, starteServer} = require(path.join(WURZEL, 'tests', 'browser-rahmen.js'));

const faelle = [];
function fall(id, titel, reproduziert, daten) {
  const status = reproduziert ? 'reproduziert' : 'nicht reproduziert';
  faelle.push({id, titel, status, daten});
  console.log(`[${id}] ${status}: ${titel}\n    ${JSON.stringify(daten)}`);
}

(async () => {
  const playwright = ladePlaywright();
  const chrome = sucheChromium(playwright);
  if (!playwright || !chrome) { console.error('Playwright oder Chromium fehlt'); process.exit(2); }
  const html = path.join(WURZEL, 'index.html');
  const {server, port} = await starteServer(html);
  const browser = await playwright.chromium.launch({executablePath: chrome});
  const url = `http://127.0.0.1:${port}/spiel.html`;

  async function seite(opt = {}) {
    const ctx = await browser.newContext(opt);
    /* Nur der lokale Server; nichts nach außen. */
    await ctx.route(u => !u.href.startsWith(`http://127.0.0.1:${port}/`), r => r.abort());
    const s = await ctx.newPage();
    const fehler = [];
    s.on('pageerror', e => fehler.push(String(e.message || e)));
    await s.goto(url);
    await s.waitForFunction(() => typeof dashUpdate === 'function');
    return {s, ctx, fehler};
  }
  async function tippe(s, id, wert) {
    await s.evaluate(([id, wert]) => {
      if (!document.getElementById('pdash-body').classList.contains('open')) dashToggle();
      const el = document.getElementById(id);
      el.value = wert;
      el.dispatchEvent(new Event('input', {bubbles: true}));
      el.dispatchEvent(new Event('change', {bubbles: true}));
    }, [id, wert]);
  }

  /* D-1: gebrochene Eingaben in Feldern ohne float-Kennzeichen */
  {
    const {s, ctx} = await seite();
    const r = {};
    for (const [key, wert] of [['endTieBreak', '0.5'], ['endTieBreak', '1.5'], ['atariSizeWeight', '0.25'],
                               ['raumZug', '0.5'], ['raumGewicht', '1.5'], ['tsumegoNakade', '0.75']]) {
      await s.evaluate(() => Object.assign(PARAMS, PARAMS_DEFAULT));
      await tippe(s, 'pd-' + key, wert);
      r[`${key}=${wert}`] = await s.evaluate(k => ({params: PARAMS[k], feld: document.getElementById('pd-' + k).value,
        standard: PARAMS_DEFAULT[k], markiert: document.getElementById('pd-' + k).classList.contains('changed')}), key);
    }
    const betroffen = await s.evaluate(() => [...document.querySelectorAll('.pd-input')]
      .filter(e => /\./.test(e.step) && /,\s*false\)/.test(e.getAttribute('oninput') || ''))
      .map(e => `${e.id.slice(3)} (step ${e.step})`));
    const falsch = Object.entries(r).filter(([k, v]) => String(v.params) !== v.feld).map(([k]) => k);
    fall('D-1', 'Dashboard: gebrochene Eingaben werden abgeschnitten (parseInt)', falsch.length > 0,
      {abgeschnitten: falsch, werte: r, betroffeneFelder: betroffen});
    await ctx.close();
  }

  /* D-2: Presets bauen aufeinander auf */
  {
    const {s, ctx} = await seite();
    const abw = () => s.evaluate(() => { const a = {}; for (const k of Object.keys(PARAMS_DEFAULT)) if (PARAMS[k] !== PARAMS_DEFAULT[k]) a[k] = PARAMS[k]; return a; });
    const unterschied = (a, b) => { const d = {}; for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (a[k] !== b[k]) d[k] = [a[k] ?? 'Standard', b[k] ?? 'Standard']; return d; };
    await s.evaluate(() => { dashApplyPreset('standard'); dashApplyPreset('defensiv'); });
    const defDirekt = await abw();
    await s.evaluate(() => { dashApplyPreset('standard'); dashApplyPreset('aggressiv'); dashApplyPreset('defensiv'); });
    const defNachAgg = await abw();
    await s.evaluate(() => { dashApplyPreset('standard'); dashApplyPreset('aggressiv'); });
    const aggDirekt = await abw();
    await s.evaluate(() => { dashApplyPreset('standard'); dashApplyPreset('ausgeglichen'); dashApplyPreset('aggressiv'); });
    const aggNachAusg = await abw();
    const d1 = unterschied(defDirekt, defNachAgg), d2 = unterschied(aggDirekt, aggNachAusg);
    fall('D-2', 'Presets: Werte des vorigen Presets bleiben stehen ([direkt, nach anderem Preset])',
      Object.keys(d1).length + Object.keys(d2).length > 0,
      {defensivNachAggressiv: d1, aggressivNachAusgewogen: d2});
    await ctx.close();
  }

  /* W-1: mehrere Anfragen hintereinander während einer Rechnung auf Schwer.
     Der Worker arbeitet sie nacheinander ab; der Watchdog gilt nur für die
     letzte. Kontrolle: weniger Anfragen, als für den Watchdog nötig wären. */
  async function w1(id, titel, aktion, anzahl) {
    const {s, ctx, fehler} = await seite();
    await s.click('.diff-btn[data-diff="hard"]');
    await s.click('.color-btn[data-color="1"]');     /* KI spielt Schwarz, ist sofort am Zug */
    await s.click('#btn-ai-toggle');
    await s.waitForTimeout(200);
    const t0 = Date.now();
    for (let i = 0; i < anzahl; i++) { await aktion(s); await s.waitForTimeout(100); }
    const anfragen = await s.evaluate(() => state.aiRequestId);
    await s.waitForFunction(() => !state.aiThinking && state.moveCount >= 1, null, {timeout: 90000});
    const z = await s.evaluate(() => ({workerDead: !!state.workerDead, grund: state.workerDeadReason,
      zug: state.moveCount, warnungen: state.log.filter(l => l.startsWith('!')),
      dauerMs: state.aiDiag.map(d => d.dauerMs), budgetMs: state.aiDiag.map(d => d.budgetMs)}));
    fall(id, titel, z.workerDead, {zusatzKlicks: anzahl, anfragen, msBisZug: Date.now() - t0, ...z, seitenfehler: fehler});
    await ctx.close();
  }
  await w1('W-1a', 'Schwer: 5 Klicks auf die Stufe während der Rechnung', s => s.click('.diff-btn[data-diff="hard"]'), 5);
  await w1('W-1b', 'Schwer: 5 Klicks auf die Farbe während der Rechnung', s => s.click('.color-btn[data-color="1"]'), 5);
  await w1('W-1c', 'Schwer: 5-mal KI aus und an während der Rechnung',
    async s => { await s.click('#btn-ai-toggle'); await s.click('#btn-ai-toggle'); }, 5);
  await w1('W-1k', 'Kontrolle: 2 Klicks auf die Stufe (Erwartung: kein Watchdog)', s => s.click('.diff-btn[data-diff="hard"]'), 2);

  /* K-1: Kopierknöpfe ohne navigator.clipboard (z. B. http im LAN) */
  {
    const {s, ctx, fehler} = await seite();
    await s.evaluate(() => Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true}));
    const r = {};
    for (const id of ['btn-copy-log', 'btn-bug-report']) {
      fehler.length = 0;
      await s.click('#' + id);
      await s.waitForTimeout(200);
      r[id] = {beschriftung: await s.evaluate(i => document.getElementById(i).textContent, id), seitenfehler: [...fehler]};
    }
    r.dashExport = await s.evaluate(() => { try { dashExport(); return 'kein Fehler'; } catch (e) { return String(e.message); } });
    fall('K-1', 'Kopieren ohne navigator.clipboard wirft, Rückfall wird nie erreicht',
      r['btn-copy-log'].seitenfehler.length > 0 || r['btn-bug-report'].seitenfehler.length > 0 || r.dashExport !== 'kein Fehler', r);
    await ctx.close();
  }

  /* K-2: Rückmeldung von „Export“ landet auf dem Speichern-Knopf */
  {
    const {s, ctx} = await seite({permissions: ['clipboard-read', 'clipboard-write']});
    await s.evaluate(() => dashToggle());
    const knoepfe = () => s.evaluate(() => [...document.querySelectorAll('.pd-export-btn')].map(b => b.textContent));
    const vor = await knoepfe();
    await s.evaluate(() => dashExport());
    const direkt = await knoepfe();
    await s.waitForTimeout(1700);
    await s.evaluate(() => { dashSave(); dashExport(); });
    await s.waitForTimeout(1800);
    const spaeter = await knoepfe();
    fall('K-2', 'Export: Rückmeldung auf dem falschen Knopf, Beschriftung kann hängen bleiben',
      direkt[0] !== vor[0] || spaeter[0] !== vor[0], {vorher: vor, direktNachExport: direkt, nachSpeichernUndExport: spaeter});
    await ctx.close();
  }

  /* L-1: Brettgröße nach Änderung der Fenstergröße */
  {
    const {s, ctx} = await seite({viewport: {width: 1200, height: 900}});
    const vor = await s.evaluate(() => ({canvas: document.getElementById('board').width, layout: computeLayout().S}));
    await s.setViewportSize({width: 400, height: 800});
    await s.waitForTimeout(300);
    const nach = await s.evaluate(() => ({canvas: document.getElementById('board').width, layout: computeLayout().S,
      scrollWidth: document.documentElement.scrollWidth, innerWidth}));
    fall('L-1', 'Brett passt sich der Fenstergröße nicht an', nach.canvas !== nach.layout, {vorher: vor, nachher: nach});
    await ctx.close();
  }

  /* R-1: Leicht ohne try/catch um getAIMove (Wurf-Attrappe) */
  {
    const {s, ctx, fehler} = await seite();
    await s.evaluate(() => { getAIMove = () => { throw new Error('Attrappe'); }; });
    await s.click('#btn-ai-toggle');
    const box = await s.locator('#board').boundingBox();
    const L = await s.evaluate(() => layout);
    await s.mouse.click(box.x + L.MARGIN + 3 * L.CELL, box.y + L.MARGIN + 3 * L.CELL);
    await s.waitForTimeout(600);
    const z = await s.evaluate(() => ({aiThinking: state.aiThinking, rueckgaengigGesperrt: document.getElementById('btn-undo').disabled,
      status: document.getElementById('ai-status').textContent, zug: state.moveCount}));
    fall('R-1', 'Leicht: wirft getAIMove, bleibt „KI denkt...“ stehen', z.aiThinking, {...z, seitenfehler: fehler});
    await ctx.close();
  }

  /* B-1: Klemmung im Dashboard, Feld und PARAMS weichen ab */
  {
    const {s, ctx} = await seite();
    await tippe(s, 'pd-aiTimeBudget', '99999');
    const r = await s.evaluate(() => ({params: PARAMS.aiTimeBudget, feld: document.getElementById('pd-aiTimeBudget').value}));
    fall('B-1', 'Dashboard: Feld zeigt den ungeklemmten Wert', String(r.params) !== r.feld, r);
    await ctx.close();
  }

  /* B-2: tote Steine am Spielende werden entfernt, nicht markiert */
  {
    const {s, ctx} = await seite();
    const r = await s.evaluate(() => {
      const b = createBoard();
      for (let x = 0; x < 19; x++) { b[idx(x, 2)] = 1; b[idx(x, 4)] = 2; }
      b[idx(5, 0)] = 2;                       /* weißer Stein im schwarzen Gebiet */
      state.board = b; state.currentHash = computeZobrist(b);
      drawStateToCache();
      pass(); pass();
      return {spielende: state.gameOver, tote: [...state.deadStones], steinAufF19: state.board[idx(5, 0)], log: state.log.slice(-1)};
    });
    fall('B-2', 'Spielende: toter Stein verschwindet, rotes Kreuz wird nie gezeichnet', r.spielende && r.steinAufF19 === 0, r);
    await ctx.close();
  }

  /* B-3: Meldung „Beide gepasst.“ */
  {
    const {s, ctx} = await seite();
    await s.click('#btn-pass'); await s.click('#btn-pass');
    const text = await s.evaluate(() => document.getElementById('message').textContent);
    fall('B-3', 'Statuszeile zeigt „Beide gepasst.“ nie', text !== 'Beide gepasst.', {statuszeile: text});
    await ctx.close();
  }

  const umgebung = {
    datum: new Date().toISOString(),
    commit: (() => { try { return execFileSync('git', ['rev-parse', 'HEAD'], {cwd: WURZEL, encoding: 'utf8'}).trim(); } catch { return null; } })(),
    indexHtmlSha256: crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex'),
    node: process.version, chromium: browser.version()
  };
  await browser.close(); server.close();
  const ergebnis = {umgebung, faelle};
  if (process.argv[2]) fs.writeFileSync(process.argv[2], JSON.stringify(ergebnis, null, 1) + '\n');
  console.log(`\n${faelle.filter(f => f.status === 'reproduziert').length} von ${faelle.length} Fällen reproduziert`);
})().catch(e => { console.error('ABBRUCH', e); process.exit(2); });
