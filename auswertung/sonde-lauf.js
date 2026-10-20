// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gemeinsamer Unterbau der Sonden (pass-sonde.js, treppe-sonde.js): ganze
   Partien gegen GNU Go mit einer Kopie von index.html spielen, in die eine
   Sonde eingebaut ist (eine Protokollzeile oder ein Zähler), und die
   Fehlerausgabe jeder Partie zurückgeben. Die Kopie ändert nichts am Spiel;
   index.html im Repo bleibt unberührt.

   Bedingungen wie in den Messungen: Stufe 1, neun Vorgabesteine, 120
   Simulationen, GNU Go gibt nicht auf, bis 600 Züge. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const {spawn} = require('child_process');

const wurzel = path.join(__dirname, '..');

/* Text an genau einer Stelle ersetzen; bricht ab, wenn die Stelle fehlt oder mehrfach vorkommt */
function ersetzeEinmal(text, anker, neu, was) {
  if (text.split(anker).length !== 2) throw new Error(`${was}: Stelle in index.html nicht genau einmal gefunden`);
  return text.replace(anker, neu);
}

function spiele(nr, dir, opt) {
  return new Promise((ok, fehler) => {
    const p = spawn(process.execPath, [path.join(dir, 'gnugo-duell.js'), '--partien', '1', '--von', String(nr), '--seed', String(opt.seed),
      '--stufe', '1', '--vorgabe', '9', '--maxzuege', '600', '--gnugo-aufgabe', '0', '--gnugo', opt.gnugo,
      '--ki', 'mctsFixedSims=120,resignEnabled=0' + (opt.ki ? ',' + opt.ki : ''), '--roh', path.join(dir, `sonde-${nr}.jsonl`)], {stdio: ['ignore', 'ignore', 'pipe']});
    let err = '';
    p.stderr.on('data', d => { err += d; });
    p.on('exit', c => c === 0 ? ok(err) : fehler(new Error(`Partie ${nr}: Exit ${c}\n${err.slice(-300)}`)));
  });
}

/* opt: {partien, von, seed, gnugo, ki, patch: html => html} → Fehlerausgabe je Partie */
async function sondeSpielen(opt) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-'));
  try {
    fs.mkdirSync(path.join(dir, 'auswertung'));
    fs.copyFileSync(path.join(wurzel, 'gnugo-duell.js'), path.join(dir, 'gnugo-duell.js'));
    fs.copyFileSync(path.join(wurzel, 'auswertung', 'lebensurteil.js'), path.join(dir, 'auswertung', 'lebensurteil.js'));
    fs.writeFileSync(path.join(dir, 'index.html'), opt.patch(fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8')));
    const nummern = Array.from({length: opt.partien}, (_, i) => opt.von + i);
    return { nummern, fehler: await Promise.all(nummern.map(nr => spiele(nr, dir, opt))) };
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
}

/* Gemeinsame Aufrufoptionen der Sonden: --partien, --von, --seed, --gnugo, --ki */
function optionen(argv) {
  const opt = {partien: 4, von: 1, seed: 206, gnugo: '/usr/games/gnugo', ki: ''};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--partien') opt.partien = +argv[++i];
    else if (argv[i] === '--von') opt.von = +argv[++i];
    else if (argv[i] === '--seed') opt.seed = +argv[++i];
    else if (argv[i] === '--gnugo') opt.gnugo = argv[++i];
    else if (argv[i] === '--ki') opt.ki = argv[++i];
  }
  return opt;
}

module.exports = {ersetzeEinmal, sondeSpielen, optionen};
