/* Gemeinsamer Unterbau der Browser-Tests (browser-nan.js, browser-ui.js):
   Playwright und Chromium finden, und ein winziger Datei-Server.

   Braucht Playwright und Chromium. Fehlt eines von beidem, überspringen sich
   die Tests, statt fehlzuschlagen — das Repo hat bewusst keine
   node_modules. In CI erzwingt REQUIRE_BROWSER=1 einen Fehlschlag. */
'use strict';
const fs   = require('fs');
const os   = require('os');
const path = require('path');
const http = require('http');

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

/* Playwright weiß selbst, wohin es Chromium gelegt hat — danach fragen,
   statt es zu suchen. Die vorherige Fassung durchsuchte
   PLAYWRIGHT_BROWSERS_PATH mit Rückfall auf /opt/pw-browsers; auf einem
   GitHub-Runner ist die Variable nicht gesetzt und Playwright installiert
   nach ~/.cache/ms-playwright. Der Test hätte sich dort still übersprungen
   — CI wäre grün gewesen, ohne irgendetwas zu prüfen. Der Verzeichnis-Scan
   bleibt als Rückfall für den Fall, dass die Installation älter ist als das
   installierte Paket. */
function sucheChromium(playwright) {
  if (playwright) {
    try {
      const p = playwright.chromium.executablePath();
      if (p && fs.existsSync(p)) return p;
    } catch (e) { /* Rückfall unten */ }
  }
  for (const wurzel of [process.env.PLAYWRIGHT_BROWSERS_PATH,
                        path.join(os.homedir(), '.cache', 'ms-playwright'),
                        '/opt/pw-browsers']) {
    if (!wurzel || !fs.existsSync(wurzel)) continue;
    for (const e of fs.readdirSync(wurzel)) {
      if (!/^chromium-/.test(e)) continue;
      const p = path.join(wurzel, e, 'chrome-linux', 'chrome');
      if (fs.existsSync(p)) return p;
    }
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

module.exports = {ladePlaywright, sucheChromium, starteServer};
