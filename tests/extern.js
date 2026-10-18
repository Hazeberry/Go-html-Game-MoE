// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Die Seite lädt nichts von fremden Servern (Datenschutz: keine IP-Adresse
   an Dritte, etwa an Google Fonts). Geprüft wird der Quelltext von
   index.html: keine Adresse mit http(s) in src, href, @import, url() oder
   fetch, und kein Verweis auf Google Fonts. Ausgenommen sind Links zum
   Anklicken (<a href>, etwa Lizenz und Quellcode in der Fußzeile): Sie laden
   nichts, solange niemand klickt. Sie müssen rel="noopener" tragen.

   Aufruf:  node tests/extern.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {test, pruefe, laufeTests} = require('./rahmen');

const html = fs.readFileSync(process.argv[2] || path.join(__dirname, '..', 'index.html'), 'utf8');

test('keine Abrufe von fremden Servern', () => {
  const muster = [
    /(?:src|href)\s*=\s*["']\s*(?:https?:)?\/\//gi,
    /@import/gi,
    /url\(\s*["']?\s*(?:https?:)?\/\//gi,
    /fetch\(\s*["'`]\s*(?:https?:)?\/\//gi,
    /new\s+(?:Worker|EventSource|WebSocket)\(\s*["'`]\s*(?:https?:|wss?:)?\/\//gi,
    /fonts\.(?:googleapis|gstatic)\.com/gi,
  ];
  const ohneLinks = html.replace(/<a\s[^>]*>/gi, '');
  for (const m of muster) {
    const treffer = ohneLinks.match(m) || [];
    pruefe(treffer.length === 0, `${m}: ${treffer.slice(0, 3).join(', ')}`);
  }
});

test('Links nach außen öffnen mit rel="noopener"', () => {
  const links = html.match(/<a\s[^>]*href\s*=\s*["']\s*https?:\/\/[^>]*>/gi) || [];
  for (const a of links) pruefe(/rel\s*=\s*["'][^"']*noopener/i.test(a), `noopener fehlt: ${a}`);
});

test('Schriften kommen aus lokalen Schriftreihen', () => {
  pruefe(/--font-serif:[^;]*serif;/.test(html), '--font-serif mit generischem Ersatz');
  pruefe(/--font-mono:[^;]*monospace;/.test(html), '--font-mono mit generischem Ersatz');
});

laufeTests('Keine fremden Server').then(ok => process.exit(ok ? 0 : 1));
