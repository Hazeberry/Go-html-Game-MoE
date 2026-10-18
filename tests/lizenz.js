// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Lizenzhinweis in jeder Quelldatei (PolyForm Noncommercial 1.0.0).

   Die Lizenz verlangt, dass jeder, der einen Teil der Software bekommt, auch
   die Zeilen bekommt, die mit „Required Notice:“ beginnen. Geprüft wird:
   jede versionierte Quelldatei (.html, .js, .py, .sh) trägt genau die Zeile
   aus LICENSE und die SPDX-Kennung; index.html dazu die Lizenz-URL.

   Aufruf:  node tests/lizenz.js */
'use strict';
const fs = require('fs'), path = require('path'), {execFileSync} = require('child_process');
const {test, pruefe, laufeTests} = require('./rahmen');

const wurzel = path.join(__dirname, '..');
const notiz = fs.readFileSync(path.join(wurzel, 'LICENSE'), 'utf8').split('\n')
  .find(z => z.startsWith('Required Notice:'));

test('LICENSE enthält die Zeile „Required Notice:“', () => {
  pruefe(!!notiz, 'Zeile in LICENSE gefunden');
});

test('jede Quelldatei trägt Required Notice und SPDX-Kennung', () => {
  let dateien;
  try { dateien = execFileSync('git', ['ls-files'], {cwd: wurzel, encoding: 'utf8'}).split('\n'); }
  catch { return 'skip'; }
  dateien = dateien.filter(f => /\.(html|js|py|sh)$/.test(f));
  pruefe(dateien.length > 0, 'Quelldateien gefunden');
  for (const f of dateien) {
    const t = fs.readFileSync(path.join(wurzel, f), 'utf8');
    pruefe(t.includes(notiz), `${f}: Required Notice fehlt`);
    pruefe(t.includes('SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0'), `${f}: SPDX-Kennung fehlt`);
  }
});

test('index.html nennt die Lizenz-URL', () => {
  const t = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
  pruefe(t.includes('https://polyformproject.org/licenses/noncommercial/1.0.0'), 'URL vorhanden');
});

laufeTests('Lizenzhinweis').then(ok => process.exit(ok ? 0 : 1));
