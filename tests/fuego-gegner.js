// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Fuego als Gegner in gnugo-duell.js (docs/fuego.md §8).

   Getestet wird ohne GNU Go und ohne Fuego: tests/gtp-attrappe.js spielt
   beide Rollen über GTP und schreibt jeden Befehl mit. Daran lässt sich
   prüfen, was das Werkzeug wem schickt:

     --gegner fuego   Fuego bekommt die Einrichtung in der geprüften
                      Reihenfolge (boardsize, clear_board, komi, die
                      Vorgabesteine des Schiedsrichters mit set_free_handicap,
                      dann Spiele je Zug, Aufgabe aus, deterministic_mode,
                      set_random_seed), danach genmove für den Gegner und
                      play für jeden Zug der KI. Der Schiedsrichter (GNU Go)
                      bekommt jeden Zug mit play, nie genmove.
     ohne die Option  wie bisher: GNU Go zieht selbst, der Datensatz hat
                      kein Feld `gegner`.
     Zurückweisung    Nennt der Gegner einen besetzten Punkt, weist der
                      Schiedsrichter den Zug ab; die Partie zählt als
                      abgebrochen, das Werkzeug läuft weiter.
     falsche Angaben  werden mit Fehlercode 2 abgelehnt.

   Aufruf:  node tests/fuego-gegner.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const {execFileSync, spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const WERKZEUG = path.join(__dirname, '..', 'gnugo-duell.js');
const ATTRAPPE = path.join(__dirname, 'gtp-attrappe.js');
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'fuego-gegner-'));
const programm = path.join(ordner, 'attrappe');
fs.writeFileSync(programm, `#!/bin/sh\nexec "${process.execPath}" "${ATTRAPPE}" "$@"\n`, {mode: 0o755});

let zaehler = 0;
const BASIS = ['--partien', '1', '--seed', '3', '--stufe', '1', '--maxzuege', '12', '--ki', 'mctsFixedSims=20',
               '--gnugo', programm, '--schaetzung', '6'];

/* Eine Partie; gibt den Datensatz und die Befehlsprotokolle beider Rollen zurück. */
function lauf(extra, env = {}) {
  const nr = ++zaehler, aus = path.join(ordner, `roh-${nr}.jsonl`), log = path.join(ordner, `log-${nr}`);
  execFileSync(process.execPath, [WERKZEUG, ...BASIS, '--roh', aus, ...extra],
    {stdio: 'pipe', timeout: 120000, env: {...process.env, ATTRAPPE_LOG: log, ...env}});
  const lies = rolle => fs.existsSync(`${log}.${rolle}`)
    ? fs.readFileSync(`${log}.${rolle}`, 'utf8').trim().split('\n').map(z => z.replace(/^\d+ /, '')) : null;
  return {r: JSON.parse(fs.readFileSync(aus, 'utf8').trim()), fuego: lies('fuego'), gnugo: lies('gnugo')};
}
const zuege = l => l.filter(b => /^(genmove|play) /.test(b));

test('--gegner fuego: Einrichtung in geprüfter Reihenfolge, Fuego zieht, GNU Go bekommt jeden Zug', () => {
  const {r, fuego, gnugo} = lauf(['--gegner', 'fuego', '--fuego', programm, '--vorgabe', '2']);
  pruefe(!r.abgebrochen, `nicht abgebrochen: ${r.abgebrochen}`);
  pruefeGleich(r.zuegeAnzahl, 12, 'zwölf Züge');
  pruefeGleich(fuego.slice(0, 9).join('\n'), ['boardsize 19', 'clear_board', 'komi 0.5', 'set_free_handicap D4 Q16',
    'uct_param_player max_games 1000', 'uct_param_player ponder 0', 'uct_param_player resign_threshold 0',
    'deterministic_mode', 'set_random_seed 300001'].join('\n'), 'Einrichtung von Fuego');
  const f = zuege(fuego);
  pruefeGleich(f.length, 12, 'Fuego: sechs genmove und sechs play');
  pruefe(f.every((b, k) => k % 2 === 0 ? b === 'genmove W' : /^play B [A-T]\d+$/.test(b)), `Fuego: Weiß zieht, Schwarz wird gemeldet: ${f.join(' | ')}`);
  /* quit fehlt womöglich im Protokoll: das Werkzeug beendet den Prozess gleich danach */
  pruefeGleich(fuego.filter(b => b !== 'quit').slice(-2).join('\n'), 'list_stones black\nlist_stones white', 'Bretter von Fuego verglichen');
  pruefe(!fuego.some(b => b.startsWith('fixed_handicap')), 'Fuego bekommt die Vorgabe nur über set_free_handicap');
  /* Schiedsrichter: Vorgabe, dann jeder Zug als play, kein genmove */
  pruefeGleich(gnugo.slice(0, 4).join('\n'), 'boardsize 19\nclear_board\nkomi 0.5\nfixed_handicap 2', 'Einrichtung des Schiedsrichters');
  const s = zuege(gnugo);
  pruefeGleich(s.length, 12, 'Schiedsrichter: zwölf play');
  pruefe(s.every((b, k) => new RegExp(`^play ${k % 2 === 0 ? 'W' : 'B'} [A-T]\\d+$`).test(b)), `Schiedsrichter: alle Züge als play: ${s.join(' | ')}`);
  pruefe(!gnugo.some(b => b.startsWith('genmove')), 'Schiedsrichter zieht nie');
  pruefe(gnugo.includes('estimate_score') && gnugo.includes('final_score'), 'Schiedsrichter schätzt und zählt');
  /* Der Schiedsrichter sieht dieselben Züge in derselben Reihenfolge wie der Datensatz;
     Fuego bekommt von ihnen die der KI (Schwarz) als play. */
  const punkt = b => b.replace(/^(play|genmove) \w ?/, '');
  pruefeGleich(r.zuege.join(' '), s.map(punkt).join(' '), 'Zugfolge im Datensatz = beim Schiedsrichter');
  pruefeGleich(f.filter(b => b.startsWith('play')).map(punkt).join(' '), r.zuege.filter((_, k) => k % 2 === 1).join(' '), 'Fuego bekommt die Züge der KI');
  pruefeGleich(JSON.stringify(r.gegner), '{"name":"fuego","spiele":1000,"schiedsrichterStufe":1}', 'Feld gegner im Datensatz');
  pruefe(typeof r.schaetzung[6] === 'number', `Schätzung nach Zug 6: ${JSON.stringify(r.schaetzung)}`);
});

test('--fuego-spiele geht an Fuego, der Seed folgt Partie und --seed, ohne Vorgabe zieht Fuego die andere Farbe', () => {
  const {r, fuego} = lauf(['--gegner', 'fuego', '--fuego', programm, '--fuego-spiele', '3000', '--seed', '5', '--von', '2']);
  pruefe(fuego.includes('uct_param_player max_games 3000'), 'Spiele je Zug 3000');
  pruefe(fuego.includes('set_random_seed 500002'), `Seed 5 · 100000 + Partie 2: ${fuego.filter(b => b.startsWith('set_random')).join()}`);
  pruefeGleich(r.gegner.spiele, 3000, 'im Datensatz');
  /* gerade Partienummer: wir Schwarz, Weiß beginnt nicht (ohne Vorgabe zieht Schwarz zuerst) → Fuego ist Weiß */
  pruefeGleich(r.wirFarbe, 'S', 'wir spielen Schwarz');
  pruefe(zuege(fuego)[0].startsWith('play B'), `Schwarz (die KI) zieht zuerst und wird Fuego gemeldet: ${zuege(fuego)[0]}`);
  pruefe(fuego.slice(0, 3).join() === 'boardsize 19,clear_board,komi 7.5', 'Komi 7,5 ohne Vorgabe');
});

test('gleiche Angaben, gleiche Partie (Seed je Partie)', () => {
  const a = lauf(['--gegner', 'fuego', '--fuego', programm, '--vorgabe', '2']).r;
  const b = lauf(['--gegner', 'fuego', '--fuego', programm, '--vorgabe', '2']).r;
  pruefeGleich(a.zuege.join(' '), b.zuege.join(' '), 'dieselben Züge');
  pruefeGleich(a.endstand, b.endstand, 'derselbe Endstand');
  const c = lauf(['--gegner', 'fuego', '--fuego', programm, '--vorgabe', '2', '--seed', '4']).r;
  pruefe(a.zuege.join() !== c.zuege.join(), 'anderer Seed, andere Züge');
});

test('ohne --gegner: wie bisher, GNU Go zieht selbst, kein Feld gegner', () => {
  const {r, fuego, gnugo} = lauf(['--vorgabe', '2']);
  pruefe(!r.abgebrochen, `nicht abgebrochen: ${r.abgebrochen}`);
  pruefe(!('gegner' in r), 'kein Feld gegner');
  pruefeGleich(fuego, null, 'kein Fuego gestartet');
  pruefeGleich(zuege(gnugo).filter(b => b.startsWith('genmove')).length, 6, 'GNU Go zieht sechsmal selbst');
  pruefeGleich(zuege(gnugo).filter(b => b.startsWith('play')).length, 6, 'und bekommt sechs Züge der KI');
});

test('Zurückweisung durch den Schiedsrichter: Partie abgebrochen, Werkzeug läuft weiter', () => {
  const {r} = lauf(['--gegner', 'fuego', '--fuego', programm, '--vorgabe', '2'], {ATTRAPPE_SCHLECHT: '2'});
  pruefe(typeof r.abgebrochen === 'string' && /play .*illegal move/.test(r.abgebrochen), `abgebrochen: ${r.abgebrochen}`);
  pruefe(!('endstand' in r), 'kein Endstand für eine abgebrochene Partie');
});

test('falsche Angaben werden mit Fehlercode 2 abgelehnt', () => {
  const lauf2 = extra => spawnSync(process.execPath, [WERKZEUG, '--partien', '1', '--gnugo', programm, ...extra], {encoding: 'utf8', timeout: 60000});
  const a = lauf2(['--gegner', 'pachi']);
  pruefeGleich(a.status, 2, '--gegner pachi'); pruefe(/gnugo oder fuego/.test(a.stderr), a.stderr);
  for (const v of ['0', 'abc', '-5', '2000000', '1.5']) pruefeGleich(lauf2(['--fuego-spiele', v]).status, 2, `--fuego-spiele ${v}`);
  const b = lauf2(['--gegner', 'fuego', '--fuego', path.join(ordner, 'gibt-es-nicht')]);
  pruefeGleich(b.status, 2, 'Fuego nicht gefunden'); pruefe(/Fuego nicht gefunden/.test(b.stderr) && /bauen\.sh/.test(b.stderr), b.stderr);
});

laufeTests('Fuego als Gegner (mit Attrappe)').then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
