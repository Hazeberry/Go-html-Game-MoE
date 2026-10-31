// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zählvorschau (zaehlVorschau; docs/zaehlvorschau.md): reine Funktion, die
   zeigt, wie die App die Stellung einschätzt, und die Unsicherheit sichtbar hält.

     1. Reinheit: verändert das Brett nicht, gleiche Eingabe gleiches Ergebnis,
        die Mengen bewiesenTot / geschaetztTot / bewiesenLebend / unbewiesen sind
        paarweise getrennt und decken alle Steine ab.
     2. Partie vom 12.10. (stellungen/zaehlung-358.sgf): die acht toten schwarzen
        Steine oben rechts sind NICHT bewiesen tot, sondern geschätzt; der Stand
        mit Schätzung ist W+102,5 (wie GNU Go), ohne Annahme W+82,5. Die
        Vorschau zeigt die Spanne von 20 Punkten statt nur die eine Zahl.
     3. Kleine Brettformen: zwei Augen leben bewiesen; ein Seki-ähnliches Gebilde
        und eine Ko-Form bleiben unbewiesen (nichts „bewiesen“, nichts tot).
     4. Unfertige Stellung (60 Züge von laufkampf-211.sgf, aufgabe-151.sgf):
        gemischtAnteil hoch, sicher false.
     5. Der Stand folgt der Fläche mit Komi (komi-Parameter, Vorzeichen).

   Aufruf:  node tests/zaehlvorschau.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');

const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, removeDeadGroups, zaehlVorschau, toteSteineAmEnde} = KI;
const N = BOARD_SIZE, L = 'ABCDEFGHJKLMNOPQRST';
const punkt = v => (19 - +v.slice(1)) * 19 + L.indexOf(v[0]);

function sgf(datei, bis = Infinity) {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', datei), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g, b = new Uint8Array(N); let m, k = 0;
  while ((m = re.exec(txt)) && k++ < bis) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; removeDeadGroups(b, 3 - f, i);
  }
  return b;
}
function zeichne(zeilen) {
  const b = new Uint8Array(N);
  zeilen.forEach((z, y) => [...z].forEach((c, x) => { b[y * 19 + x] = c === 'x' ? 1 : c === 'o' ? 2 : 0; }));
  return b;
}
const zahl = a => a.reduce((s, v) => s + v, 0);

test('Reinheit: Brett unverändert, deterministisch, Mengen getrennt und vollständig', () => {
  const b = sgf('zaehlung-358.sgf'), kopie = Uint8Array.from(b);
  const v1 = zaehlVorschau(b), v2 = zaehlVorschau(b);
  pruefeGleich(Buffer.compare(Buffer.from(b), Buffer.from(kopie)), 0, 'Brett unverändert');
  pruefeGleich(JSON.stringify([v1.anzahl, v1.nurBewiesen, v1.mitSchaetzung]), JSON.stringify([v2.anzahl, v2.nurBewiesen, v2.mitSchaetzung]), 'gleiche Eingabe, gleiches Ergebnis');
  let ueberschneidung = 0, ohneMenge = 0;
  for (let i = 0; i < N; i++) {
    const k = v1.bewiesenTot[i] + v1.geschaetztTot[i] + v1.bewiesenLebend[i] + v1.unbewiesen[i];
    if (b[i] && k !== 1) ohneMenge++;
    if (!b[i] && k !== 0) ueberschneidung++;
  }
  pruefeGleich(ohneMenge, 0, 'jeder Stein in genau einer Menge');
  pruefeGleich(ueberschneidung, 0, 'leere Punkte in keiner Menge');
  const steine = [...b].filter(Boolean).length;
  pruefeGleich(zahl(Object.values(v1.anzahl)), steine, 'Zahlen decken alle Steine ab');
});

test('Partie vom 12.10.: acht tote Steine nur geschätzt, Stand W+102,5 mit und W+82,5 ohne Annahme', () => {
  const b = sgf('zaehlung-358.sgf'), v = zaehlVorschau(b, 7.5);
  pruefeGleich(v.anzahl.geschaetztTot, 8, 'acht geschätzt tote Steine');
  pruefeGleich(v.anzahl.bewiesenTot, 0, 'keiner bewiesen tot');
  for (const p of ['R19', 'S19', 'S18', 'S17', 'S16']) pruefe(v.geschaetztTot[punkt(p)] === 1 || b[punkt(p)] !== 1, p + ' gehört, wenn Stein, zu den geschätzt toten');
  pruefeGleich(v.mitSchaetzung.stand, -102.5, 'mit Schätzung: W+102,5 wie GNU Go');
  pruefeGleich(v.nurBewiesen.stand, -82.5, 'nur mit bewiesen toten Steinen: W+82,5');
  pruefe(!v.sicher, 'nicht „sicher“: es gibt Annahmen');
  /* gleiche Zahl wie die Schlusszählung */
  const tot = toteSteineAmEnde(b); let n = 0; for (let i = 0; i < N; i++) n += tot[i];
  pruefeGleich(n, v.anzahl.geschaetztTot + v.anzahl.bewiesenTot, 'dieselben toten Steine wie toteSteineAmEnde');
});

test('Kleine Formen: zwei Augen bewiesen lebend; Seki-ähnlich und Ko bleiben unbewiesen', () => {
  const zwei = zaehlVorschau(zeichne(['.o.oxx', 'ooooox', 'xxxxxx']));
  pruefe(zwei.anzahl.bewiesenLebend >= 7, `zwei Augen: weiße Kette bewiesen lebend (${zwei.anzahl.bewiesenLebend})`);
  const seki = zaehlVorschau(zeichne(['.xxxxx', 'xooooo', 'xo.x..', 'xo.xoo', 'xxxxxo']));
  pruefeGleich(`${seki.anzahl.bewiesenTot} ${seki.anzahl.bewiesenLebend} ${seki.anzahl.geschaetztTot}`, '0 0 0', 'Seki-ähnlich: nichts bewiesen, nichts als tot behauptet');
  pruefe(seki.anzahl.unbewiesen > 0 && !seki.sicher, 'Seki-ähnlich: alle Steine unbewiesen, nicht sicher');
  const ko = zaehlVorschau(zeichne(['.oo.xx', '.ooxxx', 'oxxxx.']));
  pruefeGleich(ko.anzahl.bewiesenTot + ko.anzahl.geschaetztTot, 0, 'Ko-Form: keine Steine für tot erklärt');
  pruefe(ko.anzahl.unbewiesen > 0 && !ko.sicher, 'Ko-Form: unbewiesen, nicht sicher');
});

test('Unfertige Stellungen: gemischtAnteil hoch, nie „sicher“', () => {
  const offen = zaehlVorschau(sgf('laufkampf-211.sgf', 60));
  pruefeGleich(offen.nurBewiesen.gemischtAnteil, 1, 'nach 60 Zügen: alle leeren Punkte in gemischten Regionen');
  pruefe(!offen.sicher, 'nicht sicher');
  const aufgabe = zaehlVorschau(sgf('aufgabe-151.sgf'));
  pruefe(aufgabe.nurBewiesen.gemischtAnteil > 0.9, `aufgabe-151: gemischtAnteil ${aufgabe.nurBewiesen.gemischtAnteil}`);
  const fertig = zaehlVorschau(sgf('auge-479.sgf'));
  pruefeGleich(fertig.nurBewiesen.gemischtAnteil, 0, 'ausgespielte Partie: kein gemischter Rest');
  pruefeGleich(fertig.mitSchaetzung.stand, 93.5, 'auge-479: B+93,5 wie GNU Go');
});

test('Stand folgt der Fläche mit Komi: Vorzeichen und komi-Parameter', () => {
  const b = zeichne(['xxxxxxxxxxxxxxxxxxx', 'xxxxxxxxxxxxxxxxxxx']);   // 38 schwarze Steine, kein Weiß
  const a = zaehlVorschau(b, 7.5), c = zaehlVorschau(b, 0.5);
  pruefeGleich(a.mitSchaetzung.schwarz - a.mitSchaetzung.weiss, 361, 'ganzes Brett Schwarz (Rest ist Schwarzgebiet)');
  pruefeGleich(a.mitSchaetzung.stand - c.mitSchaetzung.stand, -7, 'Komi 7,5 gegen 0,5: sieben Punkte weniger');
  pruefeGleich(a.komi, 7.5, 'Komi wird mitgegeben');
});

test('Sechs Handpartien (stellungen/hand-*.sgf): Endstand der Vorschau = Ergebnis der App, keine falsch toten Steine, offene Stellung erkannt', () => {
  /* RE[] der Dateien ist das Ergebnis, das die App selbst nach ihrer Zählung angezeigt hat */
  const erwartet = {'455': 61.5, '427': 67.5, '392': -106.5, '364': -98.5};
  for (const [nr, stand] of Object.entries(erwartet)) {
    const v = zaehlVorschau(sgf(`hand-${nr}.sgf`), 7.5);
    pruefeGleich(v.mitSchaetzung.stand, stand, `${nr}: Stand wie RE der Partie`);
    pruefeGleich(v.anzahl.geschaetztTot, 0, `${nr}: keine nur geschätzt toten Steine am Ende (nichts falsch als tot behauptet)`);
    pruefeGleich(v.nurBewiesen.gemischtAnteil, 0, `${nr}: ausgespielt`);
  }
  /* 478 ohne RE (die Partie wurde nicht beendet); die Auswertung der App am Ende: B+93,5 wie bei auge-479 */
  const v478 = zaehlVorschau(sgf('hand-478.sgf'), 7.5);
  pruefeGleich(v478.mitSchaetzung.stand, 93.5, '478: Stand 93,5');
  /* 117: nach Aufgabe der KI (B+R), nicht ausgespielt */
  const v117 = zaehlVorschau(sgf('hand-117.sgf'), 7.5);
  pruefe(v117.nurBewiesen.gemischtAnteil > 0.9 && !v117.sicher, `117: noch nicht ausgespielt (${v117.nurBewiesen.gemischtAnteil.toFixed(2)})`);
});

laufeTests('Zählvorschau (zaehlVorschau)').then(ok => process.exit(ok ? 0 : 1));
