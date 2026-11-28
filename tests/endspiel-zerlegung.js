// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Endspiel-Hypothese bei B, Stufe 1 (auswertung/endspiel-zerlegung.js, docs/endspiel-b-vorabfestlegung.md).

   Das Skript entscheidet, ob die Zerlegung ein Urteil trägt und wie es lautet. Geprüft wird an erfundenen
   Datensätzen mit bekannter Wirkung:
     1. Die Zerlegung aus Sicht von B stimmt in beiden Farben: Dieselbe Veränderung aus Sicht von Schwarz
        ist für B als Schwarz ein Gewinn und für B als Weiß ein Verlust; bei gleich vielen Partien heben sie
        sich auf. Die vier Abschnitte ergeben zusammen den Endstand.
     2. Nullen zählen im Vorzeichentest nicht mit und werden getrennt ausgewiesen.
     3. Die Urteilssätze für D3, wörtlich: Verlust, Gewinn, nicht nachgewiesen, Vorzeichentest und Mittelwert
        widersprechen sich.
     4. Partien unter 300 Zügen gehen nur in die Abschnitte ein, für die ihre Messpunkte reichen.
     5. Jeder Eingabefehler ergibt KEIN URTEIL, auch wenn die Zahl der Zeilen stimmt.
     6. Die echten, archivierten Dateien bestehen die Prüfung der Eingabe (nur die Gültigkeit, die
        Zerlegung wird hier nicht gerechnet).
     7. Ende zu Ende über die Befehlszeile mit Ausgang 0, 1 und 2.

   Aufruf:  node tests/endspiel-zerlegung.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const E = require('../auswertung/endspiel-zerlegung.js');

const SKRIPT = path.join(__dirname, '..', 'auswertung', 'endspiel-zerlegung.js');
const WURZEL = path.join(__dirname, '..');
const REAL_P = path.join(WURZEL, 'docs/daten/skalierung-heute/stufe-2-20261126/k3-partien.csv');
const REAL_D = path.join(WURZEL, 'docs/daten/skalierung-heute/aufbaupruefung-20261127/k3-diagnose-partien.csv');
let TMP;
const tmpdir = () => TMP || (TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'endspiel-zerlegung-')));

/* Ein Datensatz mit 1230 Partien. wirkung(i, farbeB) gibt {y, d1, d2, d3} aus Sicht von B; daraus entstehen
   die Werte aus Sicht von Schwarz. opt.zuege(i) setzt die Zugzahl, opt.aendere(P, D) verändert danach. */
function daten(wirkung, opt = {}) {
  const P = [], D = [];
  let i = 0;
  for (let s = 0; s < 123; s++) for (let n = 1; n <= 10; n++, i++) {
    const aSchwarz = n % 2 === 1;
    const armS = aSchwarz ? 'A' : 'B', armW = aSchwarz ? 'B' : 'A';
    const sg = armS === 'B' ? 1 : -1, farbeB = sg === 1 ? 'S' : 'W';
    const w = wirkung(i, farbeB);
    const zuege = opt.zuege ? opt.zuege(i) : 350;
    const s100 = sg * w.y, s200 = s100 + sg * w.d1, s300 = s200 + sg * w.d2, marge = s300 + sg * w.d3;
    const weiss = 200.5, schwarz = weiss + marge;
    const lFarbe = marge > 0 ? 'W' : 'S';
    P.push({seed: String(11260001 + s), lauf_id: '1', partie: String(n), aIst: aSchwarz ? 'Schwarz' : 'Weiß', sieger: 'A',
            siegerFarbe: marge > 0 ? 'S' : 'W', stand: `B ${schwarz} : W ${weiss.toFixed(1)}`, zuege: String(zuege),
            simsA: '2457', simsB: '4860', dauerMin: '9', final_board_hash: 'ab'.repeat(32)});
    const d = {seed: String(11260001 + s), partie: String(n), zuege: String(zuege), armSchwarz: armS, armWeiss: armW,
               verliererArm: lFarbe === 'S' ? armS : armW, verliererFarbe: lFarbe, kipppunkt: 'kein', kipppunkt_streng: 'kein'};
    for (const [m, v] of [[100, s100], [200, s200], [300, s300]]) {
      if (zuege >= m) { d[`s_gnugo${m}`] = String(v); d[`w_oben${m}`] = '50'; d[`w_unten${m}`] = '-50'; }
      else { d[`s_gnugo${m}`] = ''; d[`w_oben${m}`] = ''; d[`w_unten${m}`] = ''; }
    }
    D.push(d);
  }
  if (opt.aendere) opt.aendere(P, D);
  return {P, D};
}
/* Nur D3 wirkt; die Lage nach Zug 100 liegt bei 7,5 Punkten, damit kein Endstand unentschieden ist (das lehnt die
   Prüfung der Eingabe ab). */
const nur = (d3) => (i, f) => ({y: 7.5, d1: 0, d2: 0, d3: typeof d3 === 'function' ? d3(i, f) : d3});
const lauf = (w, opt) => E.auswerten(...Object.values(daten(w, opt)));

/* ── 1. Zerlegung aus Sicht von B ──────────────────────────────── */

test('B verliert in jeder Partie 2 Punkte ab Zug 301: D3 = −2, in beiden Farben, Summe = Endstand', () => {
  const r = lauf((i, f) => ({y: 3, d1: 1, d2: -1, d3: -2}));
  pruefeGleich(r.kein.length, 0, `Gründe: ${r.kein.slice(0, 2)}`);
  const f = r.fenster;
  pruefeNah(f.D3.mittel, -2, 1e-9, 'D3');
  pruefeNah(f.Y100.mittel, 3, 1e-9, 'Y100');
  pruefeNah(f.D1.mittel, 1, 1e-9, 'D1');
  pruefeNah(f.D2.mittel, -1, 1e-9, 'D2');
  pruefeNah(f.T.mittel, 3 + 1 - 1 - 2, 1e-9, 'Endstand = Summe');
  pruefeNah(f.D3.farbe.S.mittel, -2, 1e-9, 'B als Schwarz');
  pruefeNah(f.D3.farbe.W.mittel, -2, 1e-9, 'B als Weiß');
  pruefeGleich(f.D3.farbe.S.n + f.D3.farbe.W.n, 1230, 'n je Farbe');
  pruefeGleich(f.D3.neg, 1230, 'alle zu Ungunsten');
});

test('Dieselbe Veränderung aus Sicht von Schwarz: für B als Schwarz +2, als Weiß −2, gesamt 0', () => {
  /* Aus Sicht von B: +2 als Schwarz, −2 als Weiß, also in der Sicht von Schwarz immer +2. */
  const r = lauf(nur((i, f) => (f === 'S' ? 2 : -2)));
  pruefeNah(r.fenster.D3.farbe.S.mittel, 2, 1e-9, 'B als Schwarz');
  pruefeNah(r.fenster.D3.farbe.W.mittel, -2, 1e-9, 'B als Weiß');
  pruefeNah(r.fenster.D3.mittel, 0, 1e-9, 'gesamt');
  pruefeGleich(r.fenster.D3.neg, 615, 'zu Ungunsten'); pruefeGleich(r.fenster.D3.pos, 615, 'zu Gunsten');
  pruefe(r.fenster.D3.p > 0.5, `kein Befund: p ${r.fenster.D3.p}`);
});

test('Nullen zählen im Vorzeichentest nicht mit', () => {
  const r = lauf(nur((i) => (i % 2 === 0 ? 0 : -3)));
  pruefeGleich(r.fenster.D3.null, 615, 'ohne Veränderung');
  pruefeGleich(r.fenster.D3.neg, 615, 'zu Ungunsten');
  pruefeGleich(r.fenster.D3.pos, 0, 'zu Gunsten');
  pruefe(r.fenster.D3.p < 1e-100, `p ${r.fenster.D3.p}`);
});

/* ── 2. Urteilssätze ───────────────────────────────────────────── */

test('Urteil: Verlust, Gewinn, nicht nachgewiesen, Widerspruch', () => {
  const verlust = E.urteil(lauf(nur(-2)).fenster.D3);
  pruefe(verlust.startsWith('**Ab Zug 301 verliert B gegenüber A nachweisbar Punkte: −2,00 Punkte [') && verlust.includes('in 1230 von 1230 Partien'), verlust);
  const gewinn = E.urteil(lauf(nur(1)).fenster.D3);
  pruefe(gewinn.startsWith('**Ab Zug 301 gewinnt B gegenüber A nachweisbar Punkte: +1,00 Punkte ['), gewinn);
  const nichts = E.urteil(lauf(nur((i, f) => (f === 'S' ? 2 : -2))).fenster.D3);
  pruefe(nichts.startsWith('**Ein Punktverlust von B ab Zug 301 gegenüber A ist nicht nachgewiesen. Das Intervall ['), nichts);
  /* 800 kleine Verluste, 430 große Gewinne: Vorzeichentest sagt Verlust, Mittelwert sagt Gewinn. */
  const w = E.urteil(lauf(nur((i) => (i < 800 ? -0.5 : 10))).fenster.D3);
  pruefe(w.includes('zeigen in verschiedene Richtungen: kein einheitliches Urteil'), w);
  pruefe(!/nachweisbar/.test(w), 'kein Nachweis bei Widerspruch');
});

/* ── 3. Kurze Partien ──────────────────────────────────────────── */

test('Partien unter 300 Zügen: nur Abschnitte, für die ihre Messpunkte reichen', () => {
  const r = lauf(nur(-1), {zuege: i => (i < 4 ? 250 : (i < 6 ? 150 : 350))});
  pruefeGleich(r.kein.length, 0, `Gründe: ${r.kein.slice(0, 2)}`);
  pruefeGleich(r.fenster.Y100.n, 1230, 'Y100');
  pruefeGleich(r.fenster.D1.n, 1230 - 2, 'D1: zwei Partien enden vor Zug 200');
  pruefeGleich(r.fenster.D2.n, 1230 - 6, 'D2');
  pruefeGleich(r.fenster.D3.n, 1230 - 6, 'D3');
  pruefeGleich(r.fenster.T.n, 1230, 'Endstand: alle Partien');
});

/* ── 4. KEIN URTEIL ────────────────────────────────────────────── */

const keinFall = (name, aendere, teil) => test(`KEIN URTEIL: ${name}`, () => {
  const r = lauf(nur(-2), {aendere});
  pruefe(r.kein.length > 0 && !r.fenster, `kein Urteil erwartet: ${JSON.stringify(Object.keys(r))}`);
  pruefe(r.kein.some(g => g.includes(teil)), `Grund nennt „${teil}“: ${r.kein.slice(0, 3).join(' | ')}`);
  pruefe(E.bericht(r).startsWith('# Endspiel-Hypothese bei B, Stufe 1: Zerlegung des Endstands\n\n**KEIN URTEIL.**'), 'Bericht');
});

keinFall('eine Partie fehlt in k3-partien.csv', (P) => { P.pop(); }, 'hat 1229 Partien');
keinFall('eine Partie fehlt in der Diagnose', (P, D) => { D.splice(5, 1); }, 'k3-diagnose-partien.csv hat 1229');
keinFall('Schlüssel doppelt', (P) => { P[1].partie = P[0].partie; P[1].seed = P[0].seed; }, 'doppelt');
keinFall('Schlüssel nur in einer Datei', (P, D) => { D[0].seed = '99999999'; }, 'steht nur in');
keinFall('Farbe von A in den Dateien verschieden', (P) => { P[0].aIst = 'Weiß'; }, 'Farbe von A in den beiden Dateien verschieden');
keinFall('aIst unbekannt', (P) => { P[0].aIst = 'Rot'; }, 'aIst „Rot“');
keinFall('beide Arme gleich', (P, D) => { D[0].armWeiss = D[0].armSchwarz; }, 'armSchwarz');
keinFall('Zugzahl verschieden', (P) => { P[0].zuege = '351'; }, 'zuege 351 gegen 350');
keinFall('Zugzahl über dem Limit', (P, D) => { P[0].zuege = '601'; D[0].zuege = '601'; }, 'zuege 601');
keinFall('Endstand unlesbar', (P) => { P[0].stand = 'B x : W y'; }, 'stand „B x : W y“');
keinFall('Endstand unentschieden', (P) => { P[0].stand = 'B 200.5 : W 200.5'; }, 'unentschieden');
keinFall('Verliererfarbe passt nicht zum Endstand', (P, D) => { D[0].verliererFarbe = D[0].verliererFarbe === 'S' ? 'W' : 'S'; }, 'passt nicht zum Endstand');
keinFall('Verliererarm passt nicht zur Farbe', (P, D) => { D[0].verliererArm = D[0].verliererArm === 'A' ? 'B' : 'A'; }, 'verliererArm passt nicht');
keinFall('Messpunkt fehlt trotz langer Partie', (P, D) => { D[3].s_gnugo200 = ''; }, 'Messpunkt 200 fehlt');
keinFall('Schranke fehlt trotz langer Partie', (P, D) => { D[3].w_oben300 = ''; }, 'Messpunkt 300 fehlt');
keinFall('Messpunkt bei kurzer Partie vorhanden', (P, D) => { P[2].zuege = '250'; D[2].zuege = '250'; }, 'Messpunkt 300 vorhanden, obwohl die Partie nur 250');
keinFall('Messpunkt unlesbar', (P, D) => { D[4].s_gnugo100 = 'x'; }, 'Messpunkt 100 fehlt');

test('CSV lesen: Kopfzeile, Spaltenzahl, Windows-Zeilenenden', () => {
  const ok = E.liesCsv(`${E.KOPF_P.join(',')}\r\n${E.KOPF_P.map((k, i) => i).join(',')}\r\n`, E.KOPF_P, 'x');
  pruefeGleich(ok.length, 1, 'eine Zeile'); pruefeGleich(ok[0].seed, '0', 'ohne \\r');
  let f = null; try { E.liesCsv('seed,partie\n1,2\n', E.KOPF_P, 'x'); } catch (e) { f = e; }
  pruefe(f && /Kopfzeile weicht ab/.test(f.message), 'falsche Kopfzeile');
  f = null; try { E.liesCsv(`${E.KOPF_P.join(',')}\n1,2\n`, E.KOPF_P, 'x'); } catch (e) { f = e; }
  pruefe(f && /Spalten/.test(f.message), 'falsche Spaltenzahl');
});

/* ── 5. Die echten Dateien ─────────────────────────────────────── */

test('Die archivierten Dateien bestehen die Prüfung der Eingabe (nur Gültigkeit, keine Zerlegung)', () => {
  const P = E.liesCsv(fs.readFileSync(REAL_P, 'utf8'), E.KOPF_P, 'k3-partien.csv');
  const D = E.liesCsv(fs.readFileSync(REAL_D, 'utf8'), E.KOPF_D, 'k3-diagnose-partien.csv');
  const e = E.pruefeEingabe(P, D);
  pruefeGleich(e.kein.length, 0, `Gründe: ${e.kein.slice(0, 3).join(' | ')}`);
  pruefeGleich(e.zeilen.length, 1230, 'Partien');
  pruefeGleich(e.zeilen.filter(z => z.s[300] !== undefined).length, 1226, 'Partien mit Messpunkt 300 (vier enden früher)');
});

/* ── 6. Befehlszeile ───────────────────────────────────────────── */

function schreibe(d) {
  const dir = fs.mkdtempSync(path.join(tmpdir(), 'cli-'));
  const cs = (z, kopf) => [kopf.join(','), ...z.map(x => kopf.map(k => x[k]).join(','))].join('\n') + '\n';
  fs.writeFileSync(path.join(dir, 'p.csv'), cs(d.P, E.KOPF_P));
  fs.writeFileSync(path.join(dir, 'd.csv'), cs(d.D, E.KOPF_D));
  return [path.join(dir, 'p.csv'), path.join(dir, 'd.csv')];
}
const cli = args => spawnSync(process.execPath, [SKRIPT, ...args], {encoding: 'utf8'});

test('Ende zu Ende: gültig → Ausgang 0 mit Urteil und Tabellen; ungültig → 1; Bedienfehler → 2', () => {
  const [p, d] = schreibe(daten(nur(-2)));
  const r = cli(['--partien', p, '--diagnose', d]);
  pruefeGleich(r.status, 0, `Ausgang; ${r.stderr.slice(0, 200)}`);
  for (const t of ['**Gültig.**', '## Urteil (primär: Abschnitt ab Zug 301)', 'verliert B gegenüber A nachweisbar', '## Zerlegung aus Sicht von B',
                   '## Getrennt nach der Farbe von B', '## Grenzen', 'Y100 + D1 + D2 + D3 = Endstand'])
    pruefe(r.stdout.includes(t), `Bericht enthält ${t}`);
  const [p2, d2] = schreibe(daten(nur(-2), {aendere: (P) => { P.pop(); }}));
  const r2 = cli(['--partien', p2, '--diagnose', d2]);
  pruefeGleich(r2.status, 1, 'Ausgang ungültig'); pruefe(r2.stdout.includes('**KEIN URTEIL.**'), 'KEIN URTEIL');
  const r3 = cli(['--partien', '/gibt/es/nicht.csv', '--diagnose', d]);
  pruefeGleich(r3.status, 1, 'Datei fehlt: KEIN URTEIL'); pruefe(r3.stdout.includes('Eingabe nicht lesbar'), 'Grund');
  pruefeGleich(cli(['--partien', p]).status, 2, 'ohne --diagnose');
  pruefeGleich(cli(['--foo', 'x']).status, 2, 'unbekannte Option');
});

laufeTests('Endspiel-Zerlegung (Hypothese bei B, Stufe 1)').then(ok => process.exit(ok ? 0 : 1));
