// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Prüft die Gültigkeitslogik von auswertung/gnugo-superko.js
   (docs/gnugo-superko-vorabfestlegung.md §4).

   GNU Go gibt es im Container nicht und soll es nach CLAUDE.md auch nicht.
   Geprüft wird deshalb das, was ohne GNU Go prüfbar ist: dass das Skript seine
   Eingaben ablehnt und die Antwortmuster richtig einordnet. Dafür schreibt der
   Test einen kleinen GTP-Stummel in ein temporäres Verzeichnis, den er über
   Umgebungsvariablen umschalten kann: STUMMEL_KO, STUMMEL_SUICIDE und
   STUMMEL_SUPERKO auf `frei` schalten die jeweilige Prüfung ab, STUMMEL_PASS auf
   `ab` lässt ihn einen Pass ablehnen, STUMMEL_AUFBAU auf `falsch` verschluckt
   einen Aufbaustein, STUMMEL_TOD=N beendet ihn beim N-ten Befehl.

   Die Antwort von GNU Go selbst ist damit NICHT geprüft; das ist der Zweck des
   Laufs in Actions. Geprüft ist, dass jeder Fall aus §4 zum richtigen Urteil
   oder zum richtigen „kein Urteil" führt.

   Aufruf:  node tests/gnugo-superko.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const wurzel = path.join(__dirname, '..');
const SKRIPT = path.join(wurzel, 'auswertung', 'gnugo-superko.js');
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'superko-'));

/* Ein GTP-Stummel mit echter Brettlogik aus shared-go-logic, umschaltbar über
   Umgebungsvariablen. Er ahmt nur das nach, was die fünf Proben brauchen. */
const STUMMEL = `
'use strict';
const fs = require('fs'), path = require('path');
const html = fs.readFileSync(${JSON.stringify(path.join(wurzel, 'index.html'))}, 'utf8');
const logik = new RegExp('<script id="shared-go-logic">([\\\\s\\\\S]*?)</script>').exec(html)[1];
(0, eval)(logik + ';globalThis.__L={removeDeadGroups,floodFill,computeZobrist,BOARD_SIZE};');
const L = globalThis.__L;
const zu = n => (process.env['STUMMEL_' + n] || 'zu') === 'zu';
const SP = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SP[i % 19] + (19 - Math.floor(i / 19));
const vonGtp = s => { const t = String(s||'').trim().toUpperCase();
  if (t === 'PASS') return -1;
  const x = SP.indexOf(t[0]); return (19 - +t.slice(1)) * 19 + x; };
let board, ko, hist;
const neu = () => { board = new Uint8Array(L.BOARD_SIZE); ko = null; hist = new Set([L.computeZobrist(board)]); };
neu();
let zaehler = 0;
const tod = +(process.env.STUMMEL_TOD || 0);
function play(farbe, i) {
  if (i < 0) { if (process.env.STUMMEL_PASS === 'ab') return '? Pass abgelehnt'; ko = null; return '='; }
  if (board[i]) return '? besetzt';
  if (zu('KO') && ko !== null && i === ko) return '? illegal move: ko';
  const probe = Uint8Array.from(board); probe[i] = farbe;
  L.removeDeadGroups(probe, 3 - farbe, i);
  if (zu('SUICIDE') && L.floodFill(probe, i).liberties.length === 0) return '? illegal move: suicide';
  if (zu('SUPERKO') && hist.has(L.computeZobrist(probe))) return '? illegal move: repetition';
  board[i] = farbe;
  const cap = L.removeDeadGroups(board, 3 - farbe, i);
  ko = null;
  if (cap === 1) { const ff = L.floodFill(board, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
  hist.add(L.computeZobrist(board));
  return '=';
}
let puffer = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => {
  puffer += d; let k;
  while ((k = puffer.indexOf('\\n')) >= 0) {
    const zeile = puffer.slice(0, k).trim(); puffer = puffer.slice(k + 1);
    if (!zeile) continue;
    if (++zaehler === tod) process.exit(3);
    const w = zeile.split(/\\s+/), befehl = w[0];
    let aus = '=';
    if (befehl === 'quit') { process.stdout.write('=\\n\\n'); process.exit(0); }
    else if (befehl === 'version') aus = '= 3.8 (Stummel)';
    else if (befehl === 'clear_board') { neu(); aus = '='; }
    else if (befehl === 'play') {
      const farbe = /^b/i.test(w[1]) ? 1 : 2;
      /* falscher Aufbau: ein Stein des Aufbaus wird stillschweigend verschluckt */
      if (process.env.STUMMEL_AUFBAU === 'falsch' && w[2] === 'C3') aus = '=';
      else aus = play(farbe, vonGtp(w[2]));
    }
    else if (befehl === 'list_stones') {
      const f = /^b/i.test(w[1]) ? 1 : 2, z = [];
      for (let i = 0; i < L.BOARD_SIZE; i++) if (board[i] === f) z.push(zuGtp(i));
      aus = '= ' + z.join(' ');
    }
    process.stdout.write(aus + '\\n\\n');
  }
});
`;
const stummel = path.join(ordner, 'stummel.js');
fs.writeFileSync(stummel, STUMMEL);
const starter = path.join(ordner, 'gnugo');
fs.writeFileSync(starter, `#!/bin/sh\nexec "${process.execPath}" "${stummel}" "$@"\n`, {mode: 0o755});

function lauf(env = {}) {
  const aus = path.join(ordner, `e-${Math.random().toString(36).slice(2)}.json`);
  const p = spawnSync(process.execPath, [SKRIPT, '--gnugo', starter, '--aus', aus, '--zeitgrenze', '15000'],
    {encoding: 'utf8', timeout: 120000, env: {...process.env, ...env}});
  return {status: p.status, ausgabe: p.stdout + p.stderr,
          bericht: fs.existsSync(aus) ? JSON.parse(fs.readFileSync(aus, 'utf8')) : null};
}

test('gueltig: lehnt der Stummel alles ab, lautet das Urteil „lehnt ab"', () => {
  const r = lauf();                               /* alles zu (Standard) */
  pruefeGleich(r.status, 0, 'Exitcode 0 bei gueltigem Lauf: ' + r.ausgabe.slice(-400));
  pruefe(r.bericht && r.bericht.gueltig === true, 'Bericht sagt gueltig');
  pruefeGleich(r.bericht.gruende.length, 0, 'keine Gruende');
  pruefe(/lehnt die positionelle Wiederholung ab/.test(r.bericht.urteil), `Urteil: ${r.bericht.urteil}`);
  pruefeGleich(r.bericht.aufbau.weiss.join(' '), 'A3 B4 C3', 'Aufbau Weiss');
  pruefeGleich(r.bericht.aufbau.schwarz.join(' '), 'A2 B1 B3 C2', 'Aufbau Schwarz');
});

test('gueltig: ist nur Superko frei, lautet das Urteil „nimmt an"', () => {
  const r = lauf({STUMMEL_SUPERKO: 'frei'});
  pruefeGleich(r.status, 0, 'Exitcode 0: ' + r.ausgabe.slice(-400));
  pruefe(r.bericht.gueltig === true, 'gueltig: Ko und Selbstmord werden ja weiter abgelehnt');
  pruefe(/nimmt die positionelle Wiederholung an/.test(r.bericht.urteil), `Urteil: ${r.bericht.urteil}`);
});

test('ungueltig: freies Ko (P2) — kein Urteil, Exitcode 1', () => {
  const r = lauf({STUMMEL_KO: 'frei', STUMMEL_SUPERKO: 'frei'});
  pruefeGleich(r.status, 1, 'Exitcode 1');
  pruefeGleich(r.bericht.gueltig, false, 'ungueltig');
  pruefeGleich(r.bericht.urteil, null, 'KEIN Urteil — das ist der Kern der Regel');
  pruefe(r.bericht.gruende.some(z => /^P2:/.test(z)), `Grund nennt P2: ${r.bericht.gruende}`);
});

test('ungueltig: freier Selbstmord (P1) — kein Urteil', () => {
  const r = lauf({STUMMEL_SUICIDE: 'frei'});
  pruefeGleich(r.status, 1, 'Exitcode 1');
  pruefeGleich(r.bericht.urteil, null, 'kein Urteil');
  pruefe(r.bericht.gruende.some(z => /^P1:/.test(z)), `Grund nennt P1: ${r.bericht.gruende}`);
});

test('ungueltig: Pass abgelehnt — P3 gar nicht durchgefuehrt', () => {
  const r = lauf({STUMMEL_PASS: 'ab'});
  pruefeGleich(r.status, 1, 'Exitcode 1');
  pruefeGleich(r.bericht.urteil, null, 'kein Urteil');
  pruefe(r.bericht.gruende.some(z => /Pass nicht angenommen/.test(z)), `Grund nennt den Pass: ${r.bericht.gruende}`);
});

test('ungueltig: falscher Aufbau (P0) — kein Urteil', () => {
  const r = lauf({STUMMEL_AUFBAU: 'falsch'});
  pruefeGleich(r.status, 1, 'Exitcode 1');
  pruefeGleich(r.bericht.urteil, null, 'kein Urteil');
  pruefe(r.bericht.gruende.some(z => /^P0:/.test(z)), `Grund nennt P0: ${r.bericht.gruende}`);
});

test('ungueltig: Prozess stirbt mitten im Lauf — kein Urteil, kein Neustart', () => {
  const r = lauf({STUMMEL_TOD: '6'});              /* mitten im Ko-Aufbau */
  pruefeGleich(r.status, 1, 'Exitcode 1');
  pruefeGleich(r.bericht.urteil, null, 'kein Urteil');
  pruefe(r.bericht.gruende.some(z => /abgestürzt oder Zeitgrenze/.test(z)), `Grund nennt den Absturz: ${r.bericht.gruende}`);
});

test('Aufruf: falsche Optionen werden abgelehnt', () => {
  for (const args of [['--zeitgrenze', 'x'], ['--gibtsnicht']]) {
    const p = spawnSync(process.execPath, [SKRIPT, ...args], {encoding: 'utf8'});
    pruefeGleich(p.status, 2, `abgelehnt: ${args.join(' ')}`);
  }
});

laufeTests('GNU Go und die positionelle Wiederholung: Gültigkeitslogik')
  .then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
