// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Versuchsregel „Pass nach Gegnerpass“ (docs/passregel-versuch.md):
     1. Schalter AUS (Standard): keine Prüfung, kein Eintrag `versuch`, die Regel
        ändert nichts.
     2. Schalter AN: passt nur, wenn der Gegner gerade gepasst hat UND die
        Stellung ausgespielt ist (gemischter Anteil), geklärt (Spanne der beiden
        Stände) und der Vorsprung auch im ungünstigeren Stand die Marge erreicht.
        Jede Bedingung einzeln: Vorsprung, Spanne, offene Stellung, Gegner hat
        nicht gepasst, falsche Seite.
     3. Die eingestellte Wertung zählt (Area gegen Territory), mit Gefangenen.
     4. Nur auf Stufe Schwer; auf Leicht/Mittel keine Wirkung.
     5. Verdrahtung: Hauptthread, Worker-Nachricht und Rückfall reichen
        gegnerPasste, Wertung und Komi weiter.

   Aufruf:  node tests/passregel-versuch.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, removeDeadGroups, PARAMS, getAIMove} = KI;
const N = BOARD_SIZE;
const wurzel = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(wurzel, 'index.html'), 'utf8');

function sgf(pfad, bis = Infinity) {
  const txt = fs.readFileSync(pfad, 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g, b = new Uint8Array(N), caps = {1: 0, 2: 0}; let m, k = 0;
  while ((m = re.exec(txt)) && k++ < bis) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; caps[f] += removeDeadGroups(b, 3 - f, i);
  }
  return {b, caps};
}
const st = f => sgf(path.join(wurzel, 'tests', 'stellungen', f));
const mitSchalter = (an, f) => { const alt = PARAMS.passNachGegnerpass; PARAMS.passNachGegnerpass = an; try { return f(); } finally { PARAMS.passNachGegnerpass = alt; } };
const extra = (o = {}) => ({gegnerPasste: true, wertung: 'area', komi: 7.5, ...o});
const pruefung = (s, farbe, ex) => KI.passNachGegnerpassPruefung ? KI.passNachGegnerpassPruefung(s.b, farbe, s.caps, ex) : (() => { throw new Error('passNachGegnerpassPruefung fehlt'); })();

test('Schalter aus (Standard): keine Prüfung, kein Eintrag, Standardwerte', () => {
  pruefeGleich(PARAMS.passNachGegnerpass, 0, 'Standard ist AUS');
  pruefeGleich(PARAMS.passMarge, 20, 'Marge 20');
  pruefeGleich(PARAMS.passSpanne, 2, 'Spanne 2');
  pruefeGleich(PARAMS.passGemischt, 0.25, 'gemischter Anteil 0,25');
  const s = st('hand-427.sgf');
  pruefeGleich(pruefung(s, 1, extra()), null, 'keine Prüfung bei Schalter aus');
});

test('Schalter an: ausgespielte, geklärte Stellung mit großem Vorsprung → Pass (Partie 427, Schwarz führt)', () => {
  mitSchalter(1, () => {
    const s = st('hand-427.sgf'), p = pruefung(s, 1, extra());
    pruefe(p && p.pass, `passt (${p && p.grund})`);
    pruefe(p.mit >= 20 && p.nur >= 20, `Vorsprung ${p.mit}/${p.nur}`);
    const r = getAIMove(new Uint8Array(s.b), 1, [], s.caps, 427, 'hard', 1, null, null, extra());
    pruefeGleich(r.type, 'pass', 'getAIMove liefert Pass');
    pruefe(/Versuchsregel/.test(r.info), `Info nennt die Versuchsregel: ${r.info}`);
    pruefe(r.versuch && r.versuch.pass === true, 'Eintrag versuch');
  });
});

test('Jede Bedingung einzeln: Marge, Spanne, offene Stellung, kein Gegnerpass, falsche Seite, andere Stufe', () => {
  mitSchalter(1, () => {
    const s = st('hand-427.sgf');
    pruefeGleich(pruefung(s, 2, extra()).grund, 'Vorsprung zu klein', 'Weiß liegt zurück: kein Pass');
    pruefe(!pruefung(s, 2, extra()).pass, 'Weiß passt nicht');
    const alt = PARAMS.passMarge; PARAMS.passMarge = 200;
    pruefeGleich(pruefung(s, 1, extra()).grund, 'Vorsprung zu klein', 'Marge 200 nicht erreicht');
    PARAMS.passMarge = alt;
    pruefeGleich(pruefung(s, 1, extra({gegnerPasste: false})), null, 'Gegner hat nicht gepasst: Regel gilt nicht');
    pruefeGleich(pruefung(s, 1, null), null, 'ohne extra: Regel gilt nicht');
    /* Partie vom 12.10.: Weiß führt, aber acht Steine nur geschätzt tot → Spanne 20 */
    const z = st('zaehlung-358.sgf'), pz = pruefung(z, 2, extra());
    pruefeGleich(pz.grund, 'ungeklärte Gruppen (Spanne)', `Spanne ${pz.spanne}`);
    pruefe(pz.mit >= 100 && !pz.pass, 'große Marge, trotzdem kein Pass');
    /* offene Stellung */
    const o = sgf(path.join(wurzel, 'tests', 'stellungen', 'laufkampf-211.sgf'), 60);
    pruefeGleich(pruefung(o, 1, extra()).grund, 'nicht ausgespielt', 'nach 60 Zügen');
    /* Stufe Mittel: keine Wirkung, kein Eintrag */
    const r = getAIMove(new Uint8Array(s.b), 1, [], s.caps, 427, 'medium', 1, null, null, extra());
    pruefe(r.versuch === undefined, 'Stufe Mittel ohne Eintrag');
  });
});

test('Wertung zählt: Area gegen Territory (Partie vom 31.10.), mit Gefangenen', () => {
  mitSchalter(1, () => {
    const pfad = path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'mensch-494zuege-territory.sgf');
    /* Bekannte Identität: haben beide Seiten gleich viele Züge gespielt (hier Zug 354, keine Pässe),
       sind Area- und Territory-Stand gleich. Danach passt Schwarz, Weiß spielt weiter: sie laufen auseinander. */
    const frueh = sgf(pfad, 354);
    const af = pruefung(frueh, 2, extra({wertung: 'area'})), tf = pruefung(frueh, 2, extra({wertung: 'territory'}));
    pruefeGleich(tf.mit, 186.5, 'Territory: Weiß +186,5 wie die Nachrechnung');
    pruefeGleich(af.mit, tf.mit, 'Zug 354: gleich viele Züge, Area = Territory');
    const ende = sgf(pfad), ae = pruefung(ende, 2, extra({wertung: 'area'})), te = pruefung(ende, 2, extra({wertung: 'territory'}));
    pruefeGleich(te.wertung, 'territory', 'Wertung Territory gemeldet');
    pruefeGleich(ae.wertung, 'flaeche', 'Wertung Area gemeldet');
    pruefeGleich(te.mit, 200.5, 'Ende, Territory: Weiß +200,5 wie die App');
    pruefe(ae.mit !== te.mit, `Ende: Area ${ae.mit} gegen Territory ${te.mit}`);
  });
});

test('Verdrahtung: Hauptthread, Worker-Nachricht und Rückfall reichen gegnerPasste, Wertung und Komi weiter', () => {
  pruefe(/function passExtra\(\)\s*\{\s*return \{gegnerPasste: state\.consecutivePasses >= 1, wertung: state\.scoringMode, komi: KOMI\};/.test(html), 'passExtra');
  pruefeGleich((html.match(/passExtra\(\)/g) || []).length, 4, 'Definition + Worker-Anfrage + zwei Aufrufe (Rückfall, Mittel/Leicht)');
  pruefe(/d\.extra \?\? null/.test(html), 'Worker reicht extra an getAIMove weiter');
  pruefe(/extra:\s+passExtra\(\)/.test(html), 'Anfrage an den Worker enthält extra');
});

laufeTests('Versuchsregel Pass nach Gegnerpass').then(ok => process.exit(ok ? 0 : 1));
