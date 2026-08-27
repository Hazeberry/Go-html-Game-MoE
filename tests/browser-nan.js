/* Ende-zu-Ende im echten Browser (PR #49).

   Die Node-Tests schneiden die <script>-Blöcke aus index.html und werten sie
   im Prozess aus. Das prüft die Logik, aber NICHT den Pfad, auf dem der
   Fehler gemeldet wurde: echter Web Worker, echtes localStorage, echtes DOM.
   Genau dort starb erst der Worker und danach der synchrone Fallback — also
   jeder KI-Zug.

   Dieser Test startet Chromium, legt die gemeldete Konfiguration in
   localStorage (netMaxBlend 0,09 plus vergiftete Gewichte), lässt die
   Hard-KI ein paar Züge spielen und sieht nach, ob sie antwortet.

   Braucht Playwright und Chromium. Fehlt eines von beidem, überspringt sich
   der Test, statt fehlzuschlagen — das Repo hat bewusst keine node_modules.

   Aufruf:  node tests/browser-nan.js [pfad/zur/index.html] */
'use strict';
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const http = require('http');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');

const HTML_PFAD = process.argv[2] || STANDARD_HTML;

/* Erst lokal, dann global installiert. Das Repo hat keine package.json, also
   liegt Playwright bei den meisten eher global — ohne den zweiten Versuch
   würde sich der Test dort grundlos überspringen. */
function ladePlaywright() {
  try { return require('playwright'); } catch (e) { /* weiter */ }
  try {
    const global = require('child_process')
      .execSync('npm root -g', {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).trim();
    return require(path.join(global, 'playwright'));
  } catch (e) { return null; }
}

/* Chromium ohne feste Versionsnummer suchen: Playwright legt es unter
   chromium-<build> ab, und die Nummer ändert sich mit jedem Update. */
function sucheChromium() {
  const wurzel = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  if (!fs.existsSync(wurzel)) return null;
  for (const e of fs.readdirSync(wurzel)) {
    if (!/^chromium-/.test(e)) continue;
    const p = path.join(wurzel, e, 'chrome-linux', 'chrome');
    if (fs.existsSync(p)) return p;
  }
  return null;
}

/* Winziger Datei-Server. file:// reicht nicht: der Worker wird aus einer
   data:- bzw. blob:-URL gebaut, und die braucht einen echten Origin. */
function starteServer(datei) {
  const inhalt = fs.readFileSync(datei);
  return new Promise(fertig => {
    const s = http.createServer((req, res) => {
      if (req.url.startsWith('/spiel.html')) {
        res.writeHead(200, {'Content-Type': 'text/html; charset=utf-8'});
        res.end(inhalt);
      } else { res.writeHead(404); res.end(); }
    });
    s.listen(0, '127.0.0.1', () => fertig({server: s, port: s.address().port}));
  });
}

/* Gewichte im Browser-Format (das, was save() nach localStorage legt). */
function gewichte(wert, spiele) {
  const enc = a => {
    const u = new Uint8Array(a.buffer); let s = '';
    for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
    return Buffer.from(s, 'binary').toString('base64');
  };
  return JSON.stringify({
    W1: enc(new Float32Array(128 * 3971).fill(wert)),
    b1: enc(new Float32Array(128)),
    W2: enc(new Float32Array(361 * 128).fill(wert)),
    b2: enc(new Float32Array(361)),
    games: spiele, wins: Math.floor(spiele / 2)
  });
}

const PARAMETER = JSON.stringify({netMaxBlend: 0.09, netWarmup: 10, aiTimeBudget: 200});

async function spiele(browser, port, pnet, menschZuege) {
  const ctx   = await browser.newContext();
  const seite = await ctx.newPage();
  const fehler = [], diagnose = [];
  /* Drei Sorten Konsolenausgabe auseinanderhalten:
       Umgebung — blockierte Google Fonts, fehlendes Favicon. Kommen in JEDEM
                  Lauf vor, auch im gesunden, und sagen nichts über das Spiel.
       Diagnose — die eigene Meldung des Netzes, wenn es sich abmeldet. Das
                  ist das gewünschte Verhalten, kein Fehler.
       Fehler   — alles andere, insbesondere [Worker] und [Fallback]. Genau
                  die müssen null sein. */
  const istUmgebung = t => /Failed to load resource|ERR_CONNECTION|fonts\.googleapis/.test(t);
  const istDiagnose = t => /^\[PolicyNet\]/.test(t);
  seite.on('console', m => {
    if (m.type() !== 'error') return;
    const t = m.text();
    if (istUmgebung(t)) return;
    (istDiagnose(t) ? diagnose : fehler).push(t);
  });
  seite.on('pageerror', e => fehler.push('pageerror: ' + e.message));

  await seite.addInitScript(([w, p]) => {
    if (w) localStorage.setItem('go_pnet', w);
    localStorage.setItem('go_params', p);
  }, [pnet, PARAMETER]);

  await seite.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await seite.waitForFunction(() => typeof state !== 'undefined' && typeof placeStone === 'function');
  await seite.evaluate(() => {
    state.aiDifficulty = 'hard';
    state.aiColor = 2;            /* Mensch Schwarz, KI Weiß */
    state.aiEnabled = true;
  });

  /* Randpunkte: die KI nimmt sie kaum, also bleiben die Menschenzüge frei. */
  const punkte = [[0, 0], [18, 18], [0, 18], [18, 0], [0, 9], [18, 9]];
  let gesetzt = 0;
  for (let i = 0; i < menschZuege; i++) {
    const [x, y] = punkte[i % punkte.length];
    const ok = await seite.evaluate(([x, y]) => {
      if (state.board[idx(x, y)] !== 0) return false;
      const r = placeStone(x, y);
      if (r.ok) { render(); triggerAIMove(); }
      return r.ok;
    }, [x, y]);
    if (!ok) continue;
    gesetzt++;
    try { await seite.waitForFunction(() => !state.aiThinking, {timeout: 20000}); }
    catch { /* Hänger — genau das meldete der Report; die Prüfung unten fängt es */ }
  }

  const st = await seite.evaluate(() => ({
    zuege:      state.moveCount,
    aiThinking: state.aiThinking,
    workerTot:  state.workerDead === true,
    grund:      state.workerDeadReason || null,
    gesund:     globalThis.policyNet ? policyNet._healthy : null,
    spiele:     globalThis.policyNet ? policyNet.gamesPlayed : null,
    blend:      globalThis.policyNet ? policyNet.blendWeight : null
  }));
  st.menschZuege = gesetzt;
  st.kiZuege = st.zuege - gesetzt;
  await ctx.close();
  return {st, fehler, diagnose};
}

const playwright = ladePlaywright();
const chromePfad = sucheChromium();
let browser = null, server = null, port = 0;

async function vorbereiten() {
  if (browser) return true;
  if (!playwright || !chromePfad) return false;
  browser = await playwright.chromium.launch({executablePath: chromePfad});
  ({server, port} = await starteServer(HTML_PFAD));
  return true;
}

function fall(name, pnetWert, spieleZahl, zusatz) {
  test(name, async () => {
    if (!(await vorbereiten())) return 'skip';
    const pnet = pnetWert === null ? null : gewichte(pnetWert, spieleZahl);
    const {st, fehler, diagnose} = await spiele(browser, port, pnet, 3);

    pruefe(st.menschZuege === 3, `alle 3 Menschenzüge gesetzt (waren ${st.menschZuege})`);
    pruefe(st.kiZuege === st.menschZuege,
      `die KI antwortet auf jeden Zug (${st.kiZuege} von ${st.menschZuege})`);
    pruefeGleich(st.aiThinking, false, 'die KI hängt nicht');
    pruefe(!st.workerTot, `der Worker lebt${st.grund ? ' — Grund: ' + st.grund : ''}`);
    pruefeGleich(fehler.length, 0,
      `keine Spielfehler in der Konsole${fehler.length ? ' — erster: ' + fehler[0].slice(0, 120) : ''}`);
    if (zusatz) zusatz(st, diagnose);
  });
}

fall('gesunder Start: die Hard-KI spielt', null, 0, null);

fall('vergiftete Gewichte (NaN): load() heilt selbst', NaN, 12, st => {
  pruefeGleich(st.spiele, 0, 'der vergiftete Stand wurde verworfen, das Netz startet frisch');
  pruefeGleich(st.gesund, true, 'das frische Netz ist gesund');
});

fall('vergiftete Gewichte (endlich, 1e20): forward() meldet ab', 1e20, 12, (st, diagnose) => {
  pruefeGleich(st.spiele, 12, 'der Stand wurde geladen — er ist ja finit');
  pruefeGleich(st.gesund, false, 'das Netz hat sich als divergiert abgemeldet');
  pruefeGleich(st.blend, 0, 'es steuert nicht mehr mit, trotz netMaxBlend 0,09');
  /* Stilles Abschalten wäre schlimmer als der Crash: dann stünde der Blend
     auf 0 und niemand wüsste warum. Die Meldung gehört zum Verhalten. */
  pruefe(diagnose.some(d => /nicht-finite Wahrscheinlichkeiten/.test(d)),
    'das Netz sagt in der Konsole, warum es abschaltet');
});

laufeTests('NaN-Schutz im echten Browser (Worker + localStorage)').then(ok => {
  if (!playwright || !chromePfad)
    console.log(`\n  Übersprungen: ${!playwright ? 'Playwright nicht gefunden' : 'Chromium nicht gefunden'}.`
      + '\n  Installation:  npm i -D playwright && npx playwright install chromium');
  if (browser) browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
