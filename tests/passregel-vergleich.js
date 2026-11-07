// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Werkzeuge des Passregel-Vergleichs (docs/passregel-vergleich.md): kein GNU Go, keine Messung.
     1. Statistik an bekannten Werten (Clopper-Pearson, exakter Test, t-Intervall); die Tabelle
        aus §8 (höchstes K bei oberer Grenze ≤ 2 %).
     2. Seed-Ableitung fest und eingabeabhängig.
     3. Voraussetzung „Gegner hat unmittelbar davor gepasst“ (§2): Fälle einzeln.
     4. Zählung aus der Tot-Liste gleich dem echten Code der App (finalAreaScore und
        finalTerritoryScore, aus index.html geschnitten).
     5. Auswertung: L, A, G, K und N an Handfällen; Ausfälle konservativ; Passregel im Arm
        „weiter“ nicht aus; Territory-Kontrolle; Gültigkeit; Wortlaut des Befunds.
     6. Stufe A an einer Handpartie (hand-427): erste Auslösung, Voraussetzung, Zählung der Gründe.
     7. Fortsetzung mit Attrappe statt GNU Go: Einspielen, Kontrollen, Arm 1 und Arm 0, Passregel
        AUS im Arm „weiter“, Verweigerung bei Schalter 1, Voraussetzung verletzt.
   Ein echter Lauf gegen GNU Go, Fuego und die Gegner-KI gehört in GitHub Actions.

   Aufruf:  node tests/passregel-vergleich.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, pruefeNah, laufeTests} = require('./rahmen');
const L = require('../auswertung/endspiel/passregel-lib.js');
const F = require('../auswertung/endspiel/passregel-fortsetzung.js');
const A = require('../auswertung/endspiel/passregel-stellungen.js');
const V = require('../auswertung/endspiel/passregel-vergleich.js');

const wurzel = path.join(__dirname, '..');
const htmlPfad = path.join(wurzel, 'index.html');
/* Die Engine wird genau einmal geladen (PARAMS ist global): erst hier, bei Bedarf */
let _E = null, _DEFAULT = null;
const engine = () => {
  if (!_E) { _E = F.motor(htmlPfad); _DEFAULT = JSON.parse(JSON.stringify(_E.PARAMS)); }
  return _E;
};

/* ── 1 Statistik ──────────────────────────────────────────────────── */
test('Clopper-Pearson: bekannte Werte und die Schwelle N = 183 bei K = 0', () => {
  const c = L.cpIntervall(5, 20);
  pruefeNah(c.unten, 0.0866, 0.0005, '5/20 unten'); pruefeNah(c.oben, 0.4910, 0.0005, '5/20 oben');
  pruefeNah(L.cpIntervall(20, 20).unten, 0.8316, 0.0005, '20/20 unten');
  pruefeGleich(L.cpIntervall(0, 183).oben <= 0.02, true, 'N = 183, K = 0: obere Grenze ≤ 2 %');
  pruefeGleich(L.cpIntervall(0, 182).oben <= 0.02, false, 'N = 182, K = 0: obere Grenze > 2 %');
  pruefeNah(L.cpIntervall(0, 100).oben, 0.0362, 0.0002, 'N = 100, K = 0');
});

test('Tabelle aus §8: höchstes K bei oberer Grenze ≤ 2 %', () => {
  const hoechstes = n => { let k = -1; while (k + 1 <= n && L.cpIntervall(k + 1, n).oben <= L.GRENZE) k++; return k; };
  const soll = {182: -1, 183: 0, 200: 0, 250: 0, 300: 1, 400: 2, 600: 5};
  for (const [n, k] of Object.entries(soll)) pruefeGleich(hoechstes(+n), k, `höchstes K bei N = ${n}`);
});

test('exakter Test (McNemar, Vorzeichentest) und t-Intervall an bekannten Werten', () => {
  pruefeNah(L.vorzeichenTestExakt(1, 9).p, 0.02148, 0.00001, '1 gegen 9');
  pruefeGleich(L.vorzeichenTestExakt(0, 0).p, 1, 'keine Fälle: p = 1');
  pruefeGleich(L.vorzeichenTestExakt(5, 5).p, 1, '5 gegen 5: p = 1');
  pruefeNah(L.tQuantil(0.975, 10), 2.2281, 0.0005, 't(0,975; 10)');
  pruefeNah(L.tQuantil(0.975, 30), 2.0423, 0.0005, 't(0,975; 30)');
  const t = L.tIntervall([1, 2, 3, 4, 5]);
  pruefeNah(t.unten, 1.0368, 0.001, 'Intervall unten'); pruefeNah(t.oben, 4.9632, 0.001, 'Intervall oben');
  pruefeGleich(L.tIntervall([3]), null, 'ein Wert: kein Intervall');
});

/* ── 2 Seeds ───────────────────────────────────────────────────────── */
test('Seed der Fortsetzung: fest, eingabeabhängig, im GNU-Go-Bereich', () => {
  const s = L.fortsetzungsSeed(1, 'g', 'a.jsonl', 3, 100);
  pruefeGleich(L.fortsetzungsSeed(1, 'g', 'a.jsonl', 3, 100), s, 'wiederholbar');
  pruefeGleich(s, 327905315, 'Festwert, vom Werkzeug selbst erzeugt und hier eingefroren (Änderung der Ableitung bricht die Wiederholbarkeit)');
  for (const x of [L.fortsetzungsSeed(2, 'g', 'a.jsonl', 3, 100), L.fortsetzungsSeed(1, 'h', 'a.jsonl', 3, 100), L.fortsetzungsSeed(1, 'g', 'b.jsonl', 3, 100),
                   L.fortsetzungsSeed(1, 'g', 'a.jsonl', 4, 100), L.fortsetzungsSeed(1, 'g', 'a.jsonl', 3, 101)])
    pruefe(x !== s, 'andere Eingabe, anderer Seed');
  pruefe(s >= 1 && s < 2147483647, 'Bereich');
});

/* ── 3 Voraussetzung ───────────────────────────────────────────────── */
test('Voraussetzung: Pass des Gegners, Zug davor kein Pass, Pass-Zähler 1', () => {
  const ki = 1;
  pruefe(L.voraussetzung([{farbe: 1, punkt: 5}, {farbe: 2, punkt: -1}], 1, ki, 1).ok, 'Gegner (Weiß) passt nach einem KI-Stein');
  pruefe(!L.voraussetzung([{farbe: 1, punkt: 5}, {farbe: 2, punkt: 7}], 1, ki, 0).ok, 'Gegner hat nicht gepasst');
  pruefe(!L.voraussetzung([{farbe: 2, punkt: 7}, {farbe: 1, punkt: -1}], 1, ki, 1).ok, 'Pass der falschen Farbe (KI selbst)');
  const zwei = L.voraussetzung([{farbe: 1, punkt: -1}, {farbe: 2, punkt: -1}], 1, ki, 2);
  pruefe(!zwei.ok && zwei.fehler.length === 2, `Pass nach Pass: ${zwei.fehler.join(' | ')}`);
  pruefe(!L.voraussetzung([{farbe: 1, punkt: 5}, {farbe: 2, punkt: -1}], 1, ki, 2).ok, 'falscher Zähler');
});

/* ── 4 Zählung aus der Tot-Liste gleich dem echten App-Code ───────────── */
function appFunktionen(E) {
  const html = fs.readFileSync(htmlPfad, 'utf8');
  const schneide = name => {
    const m = new RegExp(`function ${name}\\(\\) \\{[\\s\\S]*?\\n\\}\\n`).exec(html);
    if (!m) throw new Error(name + ' nicht in index.html gefunden');
    return m[0];
  };
  const bau = (name, state) => new Function('state', 'BOARD_SIZE', 'NEIGHBORS', schneide(name) + `;return ${name}();`)(state, E.BOARD_SIZE, E.NEIGHBORS);
  return {area: state => bau('finalAreaScore', state), territory: state => bau('finalTerritoryScore', state)};
}
function sgfStellung(E, datei, bis = Infinity) {
  const txt = fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', datei), 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g;
  const b = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0}; let m, k = 0;
  while ((m = re.exec(txt)) && k++ < bis) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; caps[f] += E.removeDeadGroups(b, 3 - f, i);
  }
  return {b, caps};
}
test('Zählung aus der Tot-Liste = finalAreaScore und finalTerritoryScore der App (aus index.html geschnitten)', () => {
  const E = engine(), app = appFunktionen(E);
  let mitTot = 0, mitTotUngleich = 0;
  for (const [datei, bis] of [['hand-427.sgf', Infinity], ['hand-364.sgf', Infinity], ['zaehlung-358.sgf', Infinity], ['hand-427.sgf', 150]]) {
    const s = sgfStellung(E, datei, bis), toteFeld = E.toteSteineAmEnde(Uint8Array.from(s.b));
    const tot = new Set(); for (let i = 0; i < s.b.length; i++) if (toteFeld[i] && s.b[i]) tot.add(i);
    /* wie die App nach resolveLifeAndDeath: tote Steine weg, dem Gegner als Gefangene gutgeschrieben */
    const b2 = Uint8Array.from(s.b), c2 = {1: s.caps[1], 2: s.caps[2]};
    for (const i of tot) { c2[b2[i] === 1 ? 2 : 1]++; b2[i] = 0; }
    const area = app.area({board: b2}), terr = app.territory({board: b2, captures: c2});
    const a = L.zaehleMitTotListe(s.b, s.caps, tot, 7.5, E.NEIGHBORS, 'flaeche'), t = L.zaehleMitTotListe(s.b, s.caps, tot, 7.5, E.NEIGHBORS, 'territory');
    pruefeGleich(a.schwarz, area[1], `${datei} (${bis}): Fläche Schwarz`); pruefeGleich(a.weiss, area[2], `${datei}: Fläche Weiß`);
    pruefeGleich(t.schwarz, terr[1], `${datei}: Territory Schwarz`); pruefeGleich(t.weiss, terr[2], `${datei}: Territory Weiß`);
    pruefeGleich(t.stand, terr[1] - (terr[2] + 7.5), `${datei}: Stand mit Komi`);
    if (tot.size > 0) mitTot++;
    if (tot.size > 0 && s.caps[1] !== s.caps[2]) mitTotUngleich++;
  }
  pruefe(mitTot >= 1, `mindestens eine Stellung mit toten Steinen (${mitTot})`);
  pruefe(mitTotUngleich >= 1, `mindestens eine Stellung mit toten Steinen UND ungleichen Gefangenenzahlen (${mitTotUngleich})`);
});

test('Zählung aus der Tot-Liste = App-Code auch auf 300 Zufallsbrettern (tote Steine beider Farben, ungleiche Gefangene, Neutrale)', () => {
  const E = engine(), app = appFunktionen(E), zufall = L.mulberry32(20261106), n = E.BOARD_SIZE;
  let mitTote = 0, ungleich = 0, neutral = 0, beideTot = 0;
  for (let k = 0; k < 300; k++) {
    const dichte = 0.15 + zufall() * 0.6, b = new Uint8Array(n);
    for (let i = 0; i < n; i++) if (zufall() < dichte) b[i] = zufall() < 0.5 ? 1 : 2;
    const caps = {1: Math.floor(zufall() * 40), 2: Math.floor(zufall() * 40)}, tot = new Set(), arten = new Set();
    for (let i = 0; i < n; i++) if (b[i] && zufall() < 0.2) { tot.add(i); arten.add(b[i]); }
    const b2 = Uint8Array.from(b), c2 = {1: caps[1], 2: caps[2]};
    for (const i of tot) { c2[b2[i] === 1 ? 2 : 1]++; b2[i] = 0; }
    const area = app.area({board: b2}), terr = app.territory({board: b2, captures: c2});
    const a = L.zaehleMitTotListe(b, caps, tot, 7.5, E.NEIGHBORS, 'flaeche'), t = L.zaehleMitTotListe(b, caps, tot, 7.5, E.NEIGHBORS, 'territory');
    if (a.schwarz !== area[1] || a.weiss !== area[2] || t.schwarz !== terr[1] || t.weiss !== terr[2])
      pruefe(false, `Zufallsbrett ${k}: Fläche ${a.schwarz}/${a.weiss} gegen App ${area[1]}/${area[2]}, Territory ${t.schwarz}/${t.weiss} gegen App ${terr[1]}/${terr[2]}`);
    if (tot.size) mitTote++; if (caps[1] !== caps[2]) ungleich++; if (arten.size === 2) beideTot++;
    const leer = []; const v = new Uint8Array(n);
    for (let i = 0; i < n; i++) { if (b2[i] || v[i]) continue; const q = [i]; v[i] = 1; let r = 0; for (let j = 0; j < q.length; j++) for (const nb of E.NEIGHBORS[q[j]]) { if (!b2[nb]) { if (!v[nb]) { v[nb] = 1; q.push(nb); } } else r |= b2[nb]; } if (r === 3 || r === 0) neutral++; }
  }
  pruefe(mitTote > 250 && ungleich > 250 && beideTot > 100 && neutral > 100, `Abdeckung: tote ${mitTote}, ungleiche Gefangene ${ungleich}, tote beider Farben ${beideTot}, neutrale Regionen ${neutral}`);
  /* explizit: tote Steine einer Farbe werden dem GEGNER als Gefangene gutgeschrieben, nicht der eigenen Farbe.
     Ein toter weißer Stein neben einem schwarzen: Schwarz 5 + 1 Gefangene + 360 leere Punkte, nur von Schwarz umgeben. */
  const b = new Uint8Array(n); b[0] = 2; b[1] = 1;
  const t = L.zaehleMitTotListe(b, {1: 5, 2: 0}, new Set([0]), 0, E.NEIGHBORS, 'territory');
  pruefeGleich(t.schwarz, 366, 'toter weißer Stein: Schwarz bekommt den Gefangenen'); pruefeGleich(t.weiss, 0, 'Weiß bekommt nichts');
  const b3 = new Uint8Array(n); b3[0] = 1; b3[1] = 2;
  const t3 = L.zaehleMitTotListe(b3, {1: 0, 2: 7}, new Set([0]), 0, E.NEIGHBORS, 'territory');
  pruefeGleich(t3.weiss, 368, 'toter schwarzer Stein: Weiß 7 + 1 + 360'); pruefeGleich(t3.schwarz, 0, 'Schwarz bekommt nichts');
});

test('GNU-Go-Antworten lesen: final_score und Tot-Liste', () => {
  pruefeGleich(L.standAusFinalScore('B+12.5'), 12.5, 'B+'); pruefeGleich(L.standAusFinalScore('W+3.5'), -3.5, 'W+'); pruefeGleich(L.standAusFinalScore('0'), 0, 'Gleichstand');
  let fehler = false; try { L.standAusFinalScore('?'); } catch (e) { fehler = true; }
  pruefe(fehler, 'Unlesbares wirft');
  const t = L.totListeAusGtp('A1 B2\nC3'); pruefeGleich(t.size, 3, 'drei Punkte'); pruefe(t.has(L.vonGtp('B2')), 'B2');
  pruefeGleich(L.totListeAusGtp('').size, 0, 'leer');
  for (const schlecht of ['A1 PASS', 'Z99', 'A20', 'I5', 'resign', 'A0']) { let wirft = false; try { L.totListeAusGtp(schlecht); } catch (e) { wirft = true; } pruefe(wirft, `Tot-Liste mit ${JSON.stringify(schlecht)} wird abgelehnt (nie stillschweigend −1)`); }
  pruefeGleich(L.vonGtp(L.zuGtp(0)), 0, 'Umlauf links oben'); pruefeGleich(L.vonGtp(L.zuGtp(360)), 360, 'Umlauf rechts unten');
});

/* ── 5 Auswertung ──────────────────────────────────────────────────── */
const einheit = (n, o = {}) => ({schluessel: 'g|d|' + n + '|9', gruppe: o.gruppe || 'g', kiFarbe: o.farbe || 1, ausgeloest: {flaeche: true, territory: true}, pruef: {flaeche: {mit: 30, nur: 30}, territory: {mit: 30, nur: 30}}});
const regulaer = (stand0, stand1, o = {}) => ({fehler: o.fehler || [], arm1: {flaeche: stand1, territory: stand1},
  arm0: {status: 'regulaer', flaeche: stand0, territory: stand0, kiSteine: 3, kiPaesse: 1, passNachGegnerpass: o.passregel ?? 0, versuch: !!o.versuch}, kontrolle: {}});
const ausfall = stand1 => ({fehler: [], arm1: {flaeche: stand1, territory: stand1}, arm0: {status: 'ausfall', grund: 'GNU Go beendet'}, kontrolle: {}});
/* Stände sind Schwarz − Weiß − Komi; KI = Schwarz (1): positiv = KI gewinnt */
test('L, A, G, K, N: Handfälle (Sieg/Sieg, verlorener Sieg, Gewinn durch Passen, Ausfälle)', () => {
  const eh = [0, 1, 2, 3, 4, 5, 6, 7].map(i => einheit(i)), erg = new Map();
  erg.set(eh[0].schluessel, regulaer(20, 15));          /* weiter Sieg, sofort Sieg: nichts */
  erg.set(eh[1].schluessel, regulaer(20, -5));          /* verlorener Sieg: L */
  erg.set(eh[2].schluessel, regulaer(-3, 10));          /* Passen gewinnt: G */
  erg.set(eh[3].schluessel, ausfall(-8));               /* Ausfall, sofort verliert: A */
  erg.set(eh[4].schluessel, ausfall(12));               /* Ausfall, sofort gewinnt: kein Schaden möglich */
  /* eh[5]: kein Ergebnis → A (unbekannt) */
  erg.set(eh[6].schluessel, {fehler: [], arm1: {flaeche: null, territory: null}, arm0: {status: 'regulaer', flaeche: 9, territory: 9, kiSteine: 2, kiPaesse: 1, passNachGegnerpass: 0, versuch: false}, kontrolle: {}});   /* sofort unbekannt, weiter Sieg → A */
  erg.set(eh[7].schluessel, {fehler: [], arm1: {flaeche: null, territory: null}, arm0: {status: 'regulaer', flaeche: -9, territory: -9, kiSteine: 2, kiPaesse: 1, passNachGegnerpass: 0, versuch: false}, kontrolle: {}});  /* sofort unbekannt, weiter verloren → nichts */
  const z = L.bewerteWertung(eh, erg, 'flaeche');
  pruefeGleich(z.N, 8, 'N'); pruefeGleich(z.L, 1, 'L'); pruefeGleich(z.G, 1, 'G'); pruefeGleich(z.A, 3, 'A (Ausfall verliert, kein Ergebnis, sofort unbekannt bei Sieg)');
  pruefeGleich(z.K, 4, 'K = L + A'); pruefeGleich(z.ausfaelle, 3, 'Ausfälle (zwei Ausfälle, ein fehlendes Ergebnis)');
  pruefeGleich(z.W0, 3, 'Siege im Arm weiter: eh0, eh1, eh6');
  pruefeGleich(z.d.length, 3, 'Punktpaare: eh0, eh1, eh2');
  pruefeGleich(z.pflichtFehler.length, 0, 'keine Pflichtfehler');
  pruefeNah(z.cpK.anteil, 0.5, 1e-12, 'K/N');
  pruefe(!z.paareGueltig, '3 von 8 Ausfälle > 5 %: E2/E3/G ungültig');
  pruefeGleich(z.gueltig, true, 'E1 bleibt gültig');
});

test('Befund: Wortlaut nur bei N ≥ 183 ohne K; Ausfall mit möglichem Schaden verbraucht die Reserve', () => {
  const baue = (n, extra = {}) => {
    const eh = [], erg = new Map();
    for (let i = 0; i < n; i++) { const e = einheit(i); eh.push(e); erg.set(e.schluessel, regulaer(20, 15)); }
    if (extra.ausfallVerliert) erg.set(eh[0].schluessel, ausfall(-4));
    if (extra.ausfallGewinnt) erg.set(eh[0].schluessel, ausfall(9));
    return {eh, erg};
  };
  const ok = baue(183), r1 = L.bewerte(ok.eh, ok.erg);
  pruefe(r1.gueltig && /höchstens 2 %/.test(r1.befund) && /unter den Modellannahmen/.test(r1.befund), `183 ohne K: ${r1.befund}`);
  pruefe(!/ausgeschlossen/.test(r1.befund), 'kein absolutes Ausschließen im Wortlaut');
  const kurz = baue(182), r2 = L.bewerte(kurz.eh, kurz.erg);
  pruefeGleich(r2.befund, 'Grenze von 2 % nicht gezeigt.', '182: Grenze nicht gezeigt');
  const av = baue(183, {ausfallVerliert: true}), r3 = L.bewerte(av.eh, av.erg);
  pruefeGleich(r3.wertungen.flaeche.A, 1, 'Ausfall mit verlorener Sofort-Zählung zählt als A');
  pruefeGleich(r3.befund, 'Grenze von 2 % nicht gezeigt.', 'N = 183 und K = 1: Grenze nicht gezeigt');
  const ag = baue(183, {ausfallGewinnt: true}), r4 = L.bewerte(ag.eh, ag.erg);
  pruefeGleich(r4.wertungen.flaeche.A, 0, 'Ausfall bei gewonnener Sofort-Zählung: kein Schaden möglich');
  pruefe(/höchstens 2 %/.test(r4.befund), 'Befund bleibt, E1 gültig');
  const gr = baue(300); gr.erg.set(gr.eh[0].schluessel, regulaer(20, -5));
  pruefe(/höchstens 2 %/.test(L.bewerte(gr.eh, gr.erg).befund), 'N = 300 mit einem verlorenen Sieg: 1 ≤ höchstes K');
  const gr2 = baue(300); gr2.erg.set(gr2.eh[0].schluessel, regulaer(20, -5)); gr2.erg.set(gr2.eh[1].schluessel, regulaer(20, -5));
  pruefeGleich(L.bewerte(gr2.eh, gr2.erg).befund, 'Grenze von 2 % nicht gezeigt.', 'N = 300 mit zwei verlorenen Siegen');
});

test('Gültigkeit: Passregel im Arm „weiter“ nicht aus, Pflichtfehler, Territory-Kontrolle, Doppelte', () => {
  const eh = [einheit(0), einheit(1)], erg = new Map([[eh[0].schluessel, regulaer(20, 15)], [eh[1].schluessel, regulaer(20, 15, {passregel: 1})]]);
  const z = L.bewerteWertung(eh, erg, 'flaeche');
  pruefeGleich(z.gueltig, false, 'Passregel nicht aus macht die Wertung ungültig'); pruefeGleich(z.pflichtFehler.length, 1, 'ein Pflichtfehler');
  const erg2 = new Map([[eh[0].schluessel, regulaer(20, 15)], [eh[1].schluessel, regulaer(20, 15, {versuch: true})]]);
  pruefeGleich(L.bewerteWertung(eh, erg2, 'flaeche').gueltig, false, '`versuch` in einer KI-Antwort macht ungültig');
  const erg3 = new Map([[eh[0].schluessel, regulaer(20, 15)], [eh[1].schluessel, regulaer(20, 15, {fehler: ['Voraussetzung: x']})]]);
  pruefeGleich(L.bewerteWertung(eh, erg3, 'flaeche').gueltig, false, 'Fehler im Ergebnis');
  const gut = new Map([[eh[0].schluessel, regulaer(20, 15)], [eh[1].schluessel, regulaer(20, 15)]]);
  const k = L.bewerte(eh, gut, {ok: false, grund: 'Territory-Kontrolle'});
  pruefe(k.wertungen.flaeche.gueltig && !k.wertungen.territory.gueltig && !k.gueltig && /KEIN URTEIL/.test(k.befund), 'Territory ungültig: kein Urteil, Fläche bleibt gültig');
  const doppelt = V.auswerten({einheiten: eh, zeilen: [{schluessel: eh[0].schluessel, ...regulaer(20, 15)}, {schluessel: eh[0].schluessel, ...regulaer(20, 15)}, {schluessel: eh[1].schluessel, ...regulaer(20, 15)}], probe: false});
  pruefeGleich(doppelt.ergebnis.gueltig, false, 'doppeltes Ergebnis macht ungültig');
  const probe = V.bericht(V.auswerten({einheiten: eh, zeilen: eh.map(e => ({schluessel: e.schluessel, ...regulaer(20, -5)})), probe: true}));
  pruefe(!/## E1|## E2|## Befund|K\/N|L = |Konfidenz/.test(probe) && /keine Wirkungsauswertung/.test(probe), 'Probe: keine Wirkungszahlen im Bericht');
});

/* ── 6 Stufe A an einer Handpartie ─────────────────────────────────── */
function partieAusSgf(datei, wirFarbe) {
  const txt = fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', datei), 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g;
  const zuege = []; let m, erwartet = 'B';
  while ((m = re.exec(txt))) {
    if (m[1] !== erwartet) throw new Error('Farben wechseln nicht ab in ' + datei);
    erwartet = erwartet === 'B' ? 'W' : 'B';
    zuege.push(m[2] ? L.zuGtp((m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97)) : 'pass');
  }
  return {nr: 1, seed: 1, wirFarbe, beginnt: 'S', vorgabe: 0, komi: 7.5, vorgabeSteine: [], zuege};
}
test('Stufe A: erste Auslösung der Handpartie 427 (KI Schwarz, Weiß passt), Voraussetzung, Gründe', () => {
  const E = engine(), r = partieAusSgf('hand-427.sgf', 'S');
  const stat = {stellungenGeprueft: 0, voraussetzungVerletzt: [], geprueft: {flaeche: 0, territory: 0},
    gruende: {flaeche: Object.fromEntries(A.GRUENDE.map(g => [g, 0])), territory: Object.fromEntries(A.GRUENDE.map(g => [g, 0]))}};
  E.PARAMS.passNachGegnerpass = 1;
  let p;
  try { p = A.pruefePartie(E, r, stat); } finally { E.PARAMS.passNachGegnerpass = 0; }
  pruefe(p.erste.flaeche && p.erste.territory, 'beide Wertungen lösen in dieser Partie aus');
  pruefeGleich(stat.voraussetzungVerletzt.length, 0, 'keine verletzte Voraussetzung');
  for (const w of ['flaeche', 'territory']) {
    pruefeGleich(Object.values(stat.gruende[w]).reduce((s, x) => s + x, 0), stat.geprueft[w], `${w}: Gründe summieren sich auf die geprüften Stellungen`);
    pruefeGleich(stat.gruende[w]['ausgelöst'], 1, `${w}: genau eine Auslösung gezählt (danach wird nicht mehr geprüft)`);
  }
  const i = p.erste.flaeche.index, zz = A.folge(r);
  pruefe(zz[i].punkt < 0 && zz[i].farbe === 2, 'Auslösung nach einem Weißpass'); pruefeGleich(zz[i + 1].farbe, 1, 'danach zieht die KI (Schwarz)');
  pruefe(p.erste.flaeche.mit >= 20 && p.erste.flaeche.nur >= 20, `Vorsprung ${p.erste.flaeche.mit}/${p.erste.flaeche.nur}`);
  /* unabhängige Gegenprobe: dieselbe Stellung mit der Prüfung der Engine, Schalter 1 */
  const b = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0};
  for (let k = 0; k <= i; k++) { const z = zz[k]; if (z.punkt >= 0) { b[z.punkt] = z.farbe; caps[z.farbe] += E.removeDeadGroups(b, 3 - z.farbe, z.punkt); } }
  E.PARAMS.passNachGegnerpass = 1;
  try { const q = E.passNachGegnerpassPruefung(b, 1, caps, {gegnerPasste: true, wertung: 'flaeche', komi: 7.5}); pruefe(q && q.pass && q.mit === p.erste.flaeche.mit, 'Gegenprobe: dieselbe Auslösung und derselbe Stand'); }
  finally { E.PARAMS.passNachGegnerpass = 0; }
  pruefeGleich(E.PARAMS.passNachGegnerpass, 0, 'Schalter danach wieder 0');
});

/* ── 7 Fortsetzung mit Attrappe ────────────────────────────────────── */
function attrappe(E, konv = 'gefangen-von', gleichGemeldet = false) {
  const board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0}, log = [];
  const farbe = s => (/^b/i.test(s) ? 1 : 2);
  const frage = async befehl => {
    log.push(befehl);
    const t = befehl.trim().split(/\s+/);
    switch (t[0]) {
      case 'play': { const f = farbe(t[1]); if (t[2].toLowerCase() !== 'pass') { const s = F.setze(E, board, L.vonGtp(t[2]), f); caps[f] += s.cap; } return ''; }
      case 'genmove': return 'pass';                                       /* der Gegner passt immer */
      case 'list_stones': return [...board.keys()].filter(i => board[i] === (t[1] === 'black' ? 1 : 2)).map(L.zuGtp).join(' ');
      case 'captures': {   /* konv: wie GNU Go die Zahl meint; gleichGemeldet: defekt, beide gleich */
        const f = t[1] === 'black' ? 1 : 2;
        return String(gleichGemeldet ? 0 : konv === 'gefangen-von' ? caps[f] : caps[3 - f]);
      }
      case 'final_score': { const s = L.zaehleMitTotListe(board, caps, new Set(), 7.5, E.NEIGHBORS, 'flaeche').stand; return s > 0 ? `B+${s}` : s < 0 ? `W+${-s}` : '0'; }
      case 'final_status_list': return '';
      default: return '';
    }
  };
  return {frage, ende() {}, log};
}
async function einheitAusHand(E, ctxExtra = {}) {
  const r = partieAusSgf('hand-427.sgf', 'S');
  const stat = {stellungenGeprueft: 0, voraussetzungVerletzt: [], geprueft: {flaeche: 0, territory: 0}, gruende: {flaeche: {}, territory: {}}};
  for (const w of ['flaeche', 'territory']) for (const g of A.GRUENDE) stat.gruende[w][g] = 0;
  E.PARAMS.passNachGegnerpass = 1;
  let p; try { p = A.pruefePartie(E, r, stat); } finally { E.PARAMS.passNachGegnerpass = 0; }
  const index = p.erste.flaeche.index;
  return {schluessel: `hand|hand-427.sgf|1|${index}`, gruppe: 'hand', datei: 'hand-427.sgf', nr: 1, kiFarbe: 1, gegner: 'gnugo', gegnerInfo: null, index,
          zuege: r.zuege.slice(0, index + 1), ausgeloest: {flaeche: true, territory: !!p.erste.territory}, pruef: {flaeche: p.erste.flaeche, territory: p.erste.territory}, ...ctxExtra};
}
test('Fortsetzung mit Attrappe: Einspielen, Kontrollen, Arm 1 und Arm 0, Passregel AUS', async () => {
  const E = engine(), e = await einheitAusHand(E), ref = attrappe(E);
  const ctx = {E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt: {sims: 4, maxZuege: 600, seed: 1}, startReferee: async () => ref, startGegner: async () => null};
  const res = await F.bearbeiteEinheit(ctx, e);
  pruefeGleich(res.fehler.length, 0, 'keine Pflichtfehler: ' + res.fehler.join(' | '));
  pruefe(res.kontrolle.voraussetzung.ok, 'Voraussetzung geprüft und bestanden'); pruefeGleich(res.kontrolle.bretterGleich, true, 'Bretter gleich');
  pruefeGleich(res.kontrolle.gefangenGleich, true, 'Gefangene gleich'); pruefeGleich(res.kontrolle.gefangen.konvention, 'gefangen-von', 'Konvention der Attrappe');
  pruefeGleich(res.kontrolle.flaecheTotListe, true, 'Fläche aus der Tot-Liste gleich final_score');
  pruefe(Number.isFinite(res.arm1.flaeche) && Number.isFinite(res.arm1.territory), 'Arm 1 gezählt');
  pruefeGleich(res.arm0.status, 'regulaer', 'Fortsetzung endet mit zwei Pässen: ' + (res.arm0.grund || ''));
  pruefeGleich(res.arm0.passNachGegnerpass, 0, 'Passregel im Arm weiter aus'); pruefeGleich(res.arm0.versuch, false, 'kein `versuch` in den KI-Antworten');
  pruefe(res.arm0.kiPaesse >= 1, 'die KI beendet die Partie mit einem Pass');
  pruefe(ref.log.filter(x => /^play W pass/.test(x)).length >= 1, 'Einspielen enthält die Weiß-Pässe');
  /* dieselbe Einheit, anderer Lauf: gleiche Zugfolge (Wiederholbarkeit der Engine mit festem Seed) */
  const ref2 = attrappe(E), res2 = await F.bearbeiteEinheit({...ctx, startReferee: async () => ref2}, e);
  pruefeGleich(JSON.stringify(ref2.log), JSON.stringify(ref.log), 'zweiter Lauf spielt dieselben Züge');
  pruefeGleich(res2.arm0.flaeche, res.arm0.flaeche, 'und kommt auf denselben Endstand');
  /* die Auswertung nimmt das Ergebnis an */
  const z = L.bewerteWertung([e], new Map([[e.schluessel, res]]), 'flaeche');
  pruefeGleich(z.N, 1, 'N'); pruefeGleich(z.pflichtFehler.length, 0, 'keine Pflichtfehler in der Auswertung');
});

test('Fortsetzung verweigert sich bei Schalter 1 und meldet verletzte Voraussetzung', async () => {
  const E = engine(), e = await einheitAusHand(E);
  const an = JSON.parse(JSON.stringify(_DEFAULT)); an.passNachGegnerpass = 1;
  const r1 = await F.bearbeiteEinheit({E, DEFAULT: an, capturesKonvention: 'gefangen-von', opt: {sims: 4, maxZuege: 600, seed: 1}, startReferee: async () => attrappe(E), startGegner: async () => null}, e);
  pruefe(r1.fehler.some(x => /PASSREGEL/.test(x)), 'Schalter 1 im Fortsetzungsprozess wird verweigert: ' + r1.fehler.join(' | '));
  pruefeGleich(E.PARAMS.passNachGegnerpass, 1, 'der Test hat PARAMS über DEFAULT gesetzt (Rücksetzen folgt)');
  Object.assign(E.PARAMS, _DEFAULT);
  /* Voraussetzung verletzt: Zugfolge endet nicht mit einem Gegnerpass */
  const kaputt = {...e, zuege: e.zuege.slice(0, e.zuege.length - 1), index: e.index - 1};
  const r2 = await F.bearbeiteEinheit({E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt: {sims: 4, maxZuege: 600, seed: 1}, startReferee: async () => attrappe(E), startGegner: async () => null}, kaputt);
  pruefe(r2.fehler.some(x => /Voraussetzung/.test(x)), 'Voraussetzung verletzt wird gemeldet: ' + r2.fehler.join(' | '));
  pruefeGleich(r2.arm0.status, 'ausfall', 'ohne Voraussetzung keine Fortsetzung');
});

/* ── 7c Was Pflicht bleibt und dass es keine Toleranz gibt ─────────────── */
test('Pflichtprüfungen bleiben: Brett und Gefangene machen ungültig; der Zählvergleich ohne Toleranz weist jeden Unterschied aus', async () => {
  const E = engine(), e = await einheitAusHand(E), opt = {sims: 4, maxZuege: 600, seed: 1};
  const schlecht = () => { const a = attrappe(E), alt = a.frage; a.frage = async b => (/^list_stones white/.test(b) ? '' : alt(b)); return a; };
  const r = await F.bearbeiteEinheit({E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt, startReferee: async () => schlecht(), startGegner: async () => null}, e);
  pruefe(r.fehler.some(x => /^Einspielen: Brett weicht/.test(x)), 'abweichendes Brett ist ein Pflichtfehler: ' + r.fehler.join(' | '));
  const z = V.auswerten({einheiten: [e], zeilen: [{...r, gegner: 'gnugo'}], probe: true});
  pruefeGleich(z.ergebnis.wertungen.flaeche.gueltig, false, 'Brett abweichend: Fläche ungültig'); pruefeGleich(z.ergebnis.wertungen.territory.gueltig, false, 'Brett abweichend: Territory ungültig');
  /* keine pauschale Toleranz: Unterschiede von 0,5 und 3 stehen beide mit ihrem genauen Wert im Bericht */
  const zeile = (wo, fs, flaeche) => ({kontrolle: {flaecheTotListe: false, abweichungen: [{wo, finalScore: fs, flaecheAusTotListe: flaeche, tote: 2, diagnose: {vergleich: {punktAbweichungen: [{punkt: 'G19', gnugo: 'gebiet-S', unser: 'neutral'}], unsereZaehlung: {steine: {schwarz: 1, weiss: 2}, gebiet: {schwarz: 3, weiss: 4}, neutral: 5, tote: {schwarz: 0, weiss: 1}}}}}]}});
  const ehs = [einheit(0), einheit(1)], zeilen = ehs.map((x, k) => ({schluessel: x.schluessel, gegner: 'gnugo', ...regulaer(20, 15), ...zeile('anfang', k === 0 ? '= B+10.5' : '= B+139.5', k === 0 ? 10 : 136.5)}));
  const res = V.auswerten({einheiten: ehs, zeilen, probe: false}), md = V.bericht(res);
  pruefe(/Unterschied -0\.5/.test(md) && /Unterschied -3/.test(md), 'beide Unterschiede (−0,5 und −3) stehen genau da: ' + (md.match(/Unterschied -?[\d.]+/g) || []).join(', '));
  pruefe(res.ergebnis.wertungen.flaeche.gueltig && res.ergebnis.wertungen.territory.gueltig, 'keine Toleranzgrenze, aber auch keine Ungültigkeit durch den Vergleich');
  pruefe(/G19 \(GNU Go gebiet-S, unser Besitzer neutral\)/.test(md), 'Koordinate steht im Bericht');
});

/* ── 7d Fehlerwege der Zählung im ganzen Ablauf ───────────────────────── */
test('Fehlerwege der Zählung: unzulässige Daten = Pflichtfehler, technischer Ausfall = konservativ, unerwarteter Fehler = Pflichtfehler', async () => {
  const E = engine(), e = await einheitAusHand(E), opt = {sims: 4, maxZuege: 600, seed: 1};
  /* Schiedsrichter, dessen nummer-ter Aufruf von `muster` durch `antwort` ersetzt wird (Text oder eine Funktion, die wirft) */
  const mit = (muster, nummer, antwort) => { let n = 0; return async () => { const a = attrappe(E), alt = a.frage;
    a.frage = async b => (muster.test(b) && ++n === nummer ? (typeof antwort === 'function' ? antwort() : antwort) : alt(b)); return a; }; };
  const lauf = async (startReferee) => {
    const r = await F.bearbeiteEinheit({E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt, startReferee, startGegner: async () => null}, e);
    return {r, z: V.auswerten({einheiten: [e], zeilen: [{...r, gegner: 'gnugo'}], probe: true})};
  };
  const werfen = text => () => { throw new Error(text); };
  const absturz = werfen('GNU Go beendet (code null, signal SIGSEGV) ');
  const fehlerantwort = werfen('GNU Go: final_score → ? cannot do that');
  const pflicht = (x, was) => { pruefeGleich(x.z.ergebnis.wertungen.flaeche.gueltig, false, `${was}: Fläche ungültig`); pruefeGleich(x.z.ergebnis.wertungen.territory.gueltig, false, `${was}: Territory ungültig`); pruefeGleich(x.z.ergebnis.gueltig, false, `${was}: Lauf ungültig`); pruefe(/KEIN URTEIL/.test(x.z.ergebnis.befund), `${was}: Befund KEIN URTEIL`); };
  /* 1 bis 3: unzulässige Daten in der Tot-Liste und im final_score beim Arm „sofort“ */
  for (const [name, wert] of [['PASS in der Tot-Liste', 'A1 PASS'], ['Z99 in der Tot-Liste', 'Z99'], ['Koordinate A20', 'A20']]) {
    const x = await lauf(mit(/^final_status_list dead/, 1, wert));
    pruefe(x.r.fehler.some(f => /^Zählung Anfang: unzulässige Daten von GNU Go/.test(f)), `${name}: Pflichtfehler am Anfang: ${x.r.fehler.join(' | ')}`);
    pruefeGleich(x.r.arm1Fehler, undefined, `${name}: kein stiller arm1Fehler`); pruefeGleich(x.r.arm0.grund, 'nicht gelaufen', `${name}: keine Fortsetzung nach unzulässigen Daten`); pflicht(x, name);
  }
  const fs = await lauf(mit(/^final_score/, 1, 'B+1.2.3'));
  pruefe(fs.r.fehler.some(f => /^Zählung Anfang: unzulässige Daten/.test(f)), 'unlesbarer final_score: Pflichtfehler: ' + fs.r.fehler.join(' | ')); pflicht(fs, 'final_score unlesbar');
  /* 4: unzulässige Daten beim Arm „weiter“ (zweite Zählung) */
  const ende = await lauf(mit(/^final_status_list dead/, 2, 'PASS'));
  pruefe(ende.r.fehler.some(f => /^Zählung Ende: unzulässige Daten/.test(f)), 'unzulässige Daten am Ende: Pflichtfehler: ' + ende.r.fehler.join(' | ')); pflicht(ende, 'Daten am Ende');
  /* 5 und 6: technischer Ausfall beim Arm „sofort“ (Absturz, Fehlerantwort): kein Pflichtfehler, „sofort“ unbekannt, konservativ */
  for (const [name, f] of [['GNU-Go-Absturz', absturz], ['Fehlerantwort „?“', fehlerantwort]]) {
    const x = await lauf(mit(/^final_score/, 1, f));
    pruefeGleich(x.r.fehler.length, 0, `${name} beim Arm sofort: kein Pflichtfehler`); pruefe(typeof x.r.arm1Fehler === 'string' && x.r.arm1.flaeche === null, `${name}: „sofort“ unbekannt, Grund festgehalten: ${x.r.arm1Fehler}`);
    pruefeGleich(x.r.arm0.status, 'regulaer', `${name}: die Fortsetzung läuft weiter`);
    const w = x.z.ergebnis.wertungen.flaeche;
    pruefeGleich(w.gueltig, true, `${name}: Lauf bleibt gültig`); pruefeGleich(w.sofortUnbekannt, 1, `${name}: sofort unbekannt gezählt`);
    pruefeGleich(w.A, 1, `${name}: konservativ als möglicher verlorener Sieg (weiter gewinnt, sofort unbekannt)`); pruefeGleich(w.K, 1, `${name}: K = 1`);
  }
  /* 7: technischer Ausfall beim Arm „weiter“: Ausfallregel */
  const aus = await lauf(mit(/^final_score/, 2, absturz));
  pruefeGleich(aus.r.fehler.length, 0, 'Absturz beim Arm weiter: kein Pflichtfehler'); pruefeGleich(aus.r.arm0.status, 'ausfall', 'Ausfall des Arms weiter'); pruefe(/GNU Go beendet/.test(aus.r.arm0.grund), 'Grund festgehalten');
  pruefeGleich(aus.z.ergebnis.wertungen.flaeche.ausfaelle, 1, 'als Ausfall gezählt'); pruefeGleich(aus.z.ergebnis.wertungen.flaeche.gueltig, true, 'Lauf bleibt gültig');
  /* 8: unerwarteter Fehler im Werkzeug (kein Programm-, kein Datenfehler): Pflichtfehler, nicht still */
  for (const [name, nr, wo] of [['unerwarteter Fehler beim Arm sofort', 1, /^Zählung Anfang: unerwarteter Fehler/], ['unerwarteter Fehler beim Arm weiter', 2, /^Fortsetzung: unerwarteter Fehler/]]) {
    const x = await lauf(mit(/^final_score/, nr, () => { throw new TypeError('boom'); }));
    pruefe(x.r.fehler.some(f => wo.test(f)), `${name}: Pflichtfehler: ${x.r.fehler.join(' | ').slice(0, 200)}`); pruefeGleich(x.r.arm1Fehler, undefined, `${name}: nicht als technischer Ausfall getarnt`); pflicht(x, name);
  }
  /* die Klassifikation selbst */
  pruefeGleich(F.fehlerArt(Object.assign(new Error('x'), {daten: true})), 'daten', 'Datenfehler'); pruefeGleich(F.fehlerArt(new Error('GNU Go beendet (code 1)')), 'technisch', 'Prozess beendet');
  pruefeGleich(F.fehlerArt(new Error('GNU Go: final_score → ? x')), 'technisch', 'Fehlerantwort'); pruefeGleich(F.fehlerArt(new Error('Fuego beendet (code 1)')), 'technisch', 'Fuego beendet');
  pruefeGleich(F.fehlerArt(new TypeError('boom')), 'werkzeug', 'unerwartet'); pruefeGleich(F.fehlerArt(null), 'werkzeug', 'null');
});

/* ── 8 Kommandozeilen (mit Handdaten, nicht mit Archivdaten) ───────────── */
test('Kommandozeile: Stufe A schreibt Einheiten und Bericht; Auswertung verlangt die Nachspiel-Kontrolle', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'passregel-'));
  const node = (...a) => spawnSync(process.execPath, a, {encoding: 'utf8'});
  const r = partieAusSgf('hand-427.sgf', 'S'), quelle = path.join(tmp, 'quelle.jsonl');
  fs.writeFileSync(quelle, JSON.stringify(r) + '\n' + JSON.stringify({...r, nr: 2, abgebrochen: 'x'}) + '\n' + JSON.stringify({...r, nr: 3, vorgabe: 2}) + '\n');
  const aus = path.join(tmp, 'a');
  const a = node(path.join(wurzel, 'auswertung/endspiel/passregel-stellungen.js'), '--aus', aus, '--gruppe', `hand=${quelle}`);
  pruefeGleich(a.status, 0, 'Stufe A endet mit 0: ' + (a.stderr || a.stdout).slice(-300));
  const zeilen = fs.readFileSync(path.join(aus, 'einheiten.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
  pruefeGleich(zeilen.length, 1, 'eine Einheit (zweite abgebrochen, dritte mit Vorgabe übersprungen)');
  const sum = JSON.parse(fs.readFileSync(path.join(aus, 'stufe-a.json'), 'utf8'));
  pruefeGleich(sum.quellen.gelesen, 3, 'drei Zeilen gelesen'); pruefeGleich(sum.quellen.ausgewertet, 1, 'eine ausgewertet'); pruefeGleich(sum.gueltig, true, 'gültig');
  pruefe(zeilen[0].ausgeloest.flaeche && Array.isArray(zeilen[0].zuege) && zeilen[0].zuege[zeilen[0].index] === 'pass', 'Einheit endet mit dem Pass');
  pruefeGleich(sum.kriterium.flaecheErreicht, false, 'eine Einheit reicht nicht für N ≥ 183');
  const md = fs.readFileSync(path.join(aus, 'stufe-a.md'), 'utf8');
  pruefe(/Aufschlüsselung nach KI-Farbe/.test(md) && /\| hand \| Schwarz \| 1 \|/.test(md), 'Stufe-A-Bericht schlüsselt nach KI-Farbe auf');
  pruefe(/Werte an der Auslösung/.test(md) && /\| mit \| nur \| Spanne \| gemischt \|/.test(md), 'Stufe-A-Bericht nennt mit, nur, Spanne und gemischten Anteil');
  pruefe(sum.werte.flaeche.gesamt.mit && sum.werte.flaeche.S.einheiten === 1 && sum.werte.flaeche.W.einheiten === 0, 'Werte je Farbe in stufe-a.json');
  pruefeGleich(sum.gruppen[0].farben.S.partien, 1, 'Partien je Farbe in stufe-a.json');
  /* gleiche Zugfolge zweimal: Duplikat wird nur einmal gezählt */
  fs.writeFileSync(quelle, JSON.stringify(r) + '\n' + JSON.stringify({...r, nr: 9}) + '\n');
  const b = node(path.join(wurzel, 'auswertung/endspiel/passregel-stellungen.js'), '--aus', path.join(tmp, 'b'), '--gruppe', `hand=${quelle}`);
  pruefeGleich(b.status, 0, 'zweite Stufe A endet mit 0');
  const sb = JSON.parse(fs.readFileSync(path.join(tmp, 'b', 'stufe-a.json'), 'utf8'));
  pruefeGleich(sb.duplikate.length, 1, 'ein Duplikat erkannt'); pruefeGleich(sb.einheiten.gesamt, 1, 'nur einmal gezählt');
  /* Auswertung: ohne Nachspiel-Kontrolle ungültig, mit bestandener gültig, mit nicht bestandener ungültig */
  const e = zeilen[0], erg = path.join(tmp, 'erg.jsonl');
  fs.writeFileSync(erg, JSON.stringify({schluessel: e.schluessel, ...regulaer(20, 15)}) + '\n');
  const auswerten = (...extra) => node(path.join(wurzel, 'auswertung/endspiel/passregel-vergleich.js'), '--einheiten', path.join(aus, 'einheiten.jsonl'), '--ergebnisse', erg, '--aus', path.join(tmp, 'o'), ...extra);
  pruefeGleich(auswerten().status, 1, 'ohne --nachspiel ungültig');
  const ok = path.join(tmp, 'ok.json'), schlecht = path.join(tmp, 'schlecht.json');
  fs.writeFileSync(ok, JSON.stringify({ok: true, je: 10, gruppen: [{name: 'hand', verlangt: 10, geprueft: 10, gleich: 10, abweichend: []}]}));
  fs.writeFileSync(schlecht, JSON.stringify({ok: false, je: 10, gruppen: [{name: 'hand', verlangt: 10, geprueft: 10, gleich: 9, abweichend: [{nr: 1}]}]}));
  pruefeGleich(auswerten('--nachspiel', ok).status, 0, 'mit bestandener Kontrolle gültig');
  pruefeGleich(auswerten('--nachspiel', schlecht).status, 1, 'mit nicht bestandener Kontrolle ungültig');
  const p = auswerten('--nachspiel', ok, '--probe');
  pruefeGleich(p.status, 1, 'Probe ohne Wiederholungsprüfung ist ungültig (§9 Nr. 7), auch mit bestandener Nachspiel-Kontrolle'); pruefe(!/K\/N|## E1/.test(fs.readFileSync(path.join(tmp, 'o', 'bericht.md'), 'utf8')), 'Probe-Bericht ohne Wirkungszahlen');
  pruefe(!/Konfidenz|K\/N/.test(fs.readFileSync(path.join(tmp, 'o', 'zahlen.json'), 'utf8')), 'Probe-Zahlen ohne Wirkung');
  fs.rmSync(tmp, {recursive: true, force: true});
});

/* ── 7b captures: Konvention eindeutig bestimmen und fest anwenden ───────── */
test('captures-Kalibrierung: beide Konventionen werden unterschieden, Unklares ist ein Fehler', async () => {
  const E = engine();
  pruefeGleich((await F.kalibriereCaptures(async () => attrappe(E, 'gefangen-von'), 1)).konvention, 'gefangen-von', 'gefangen von');
  const v = await F.kalibriereCaptures(async () => attrappe(E, 'verloren-an'), 1);
  pruefeGleich(v.konvention, 'verloren-an', 'verloren an'); pruefeGleich(v.black + '/' + v.white, '1/2', 'Rohwerte vertauscht');
  let fehler = null;
  try { await F.kalibriereCaptures(async () => attrappe(E, 'gefangen-von', true), 1); } catch (e) { fehler = e.message; }
  pruefe(fehler && /nicht eindeutig/.test(fehler), 'gleiche Zahlen: Kalibrierung scheitert statt zu raten');
  /* die Kalibrierstellung hat wirklich ungleiche Zahlen (Schwarz 2, Weiß 1) in der Regelrechnung der Engine */
  const b = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0};
  for (const z of F.KALIBRIER_ZUEGE) { const [, f, p] = z.split(' '); const s = F.setze(E, b, L.vonGtp(p), f === 'B' ? 1 : 2); caps[f === 'B' ? 1 : 2] += s.cap; }
  pruefeGleich(caps[1] + '/' + caps[2], '2/1', 'Kalibrierstellung: Schwarz schlägt 2, Weiß 1');
});

test('captures: ein vertauschter Zähler fällt bei ungleichen Zahlen auf; die kalibrierte Zuordnung gilt fest', async () => {
  const E = engine(), e = await einheitAusHand(E);
  const opt = {sims: 4, maxZuege: 600, seed: 1};
  const lauf = (programm, konvention) => F.bearbeiteEinheit({E, DEFAULT: _DEFAULT, capturesKonvention: konvention, opt, startReferee: async () => programm, startGegner: async () => null}, e);
  const gut = await lauf(attrappe(E, 'gefangen-von'), 'gefangen-von');
  pruefeGleich(gut.kontrolle.gefangen.unterscheidbar, true, 'die Stellung hat ungleiche Gefangenenzahlen (sonst prüft der Test nichts): ' + JSON.stringify(gut.kontrolle.gefangen));
  pruefeGleich(gut.fehler.length, 0, 'passende Zuordnung: kein Fehler');
  const verloren = await lauf(attrappe(E, 'verloren-an'), 'verloren-an');
  pruefeGleich(verloren.fehler.length, 0, 'andere Konvention, richtig kalibriert: kein Fehler');
  pruefeGleich(verloren.kontrolle.gefangen.konvention, 'verloren-an', 'angewendete Konvention protokolliert');
  const falsch = await lauf(attrappe(E, 'verloren-an'), 'gefangen-von');
  pruefe(falsch.fehler.some(x => /^Gefangene:/.test(x)), 'vertauschter Zähler gegen falsche Kalibrierung wird NICHT akzeptiert: ' + falsch.fehler.join(' | '));
  pruefeGleich(falsch.arm0.status, 'ausfall', 'ohne bestandene Kontrolle keine Fortsetzung');
  const ohne = await F.bearbeiteEinheit({E, DEFAULT: _DEFAULT, opt, startReferee: async () => attrappe(E), startGegner: async () => null}, e);
  pruefe(ohne.fehler.some(x => /Kalibrierung/.test(x)), 'ohne Kalibrierung keine Prüfung: ' + ohne.fehler.join(' | '));
});

/* ── 9 Wiederholung (§9 Nr. 7), Diagnose, Probe-Log und Schlussbefund bei Ungültigkeit ──── */
const mitGegner = (n, gegner, o = {}) => ({...einheit(n, o), gegner});
const wh = (o = {}) => ({lauf: 2, gegner: 'gnugo', status1: 'regulaer', status2: 'regulaer', fehler2: [], stand1: {flaeche: 5, territory: 6}, stand2: {flaeche: 5, territory: 6}, gleichFolge: true, gleichStand: true, ...o});
/* eine Zeile mit `laeufe` Wiederholungsläufen; o überschreibt Felder in jedem Lauf; gleich = false: abweichender Stand */
const zeileW = (e, gleich = true, o = {}, laeufe = 1) => ({schluessel: e.schluessel, gegner: e.gegner, ...regulaer(20, 15),
  wiederholungen: Array.from({length: laeufe}, (_, k) => wh({lauf: k + 2, gegner: e.gegner, gleichFolge: gleich, ...(gleich ? {} : {stand2: {flaeche: 7, territory: 6}, gleichStand: false}), ...o}))});
const dreiArten = () => { const eh = []; for (const [k, a] of ['gnugo', 'fuego', 'ki'].entries()) for (let i = 0; i < 3; i++) eh.push(mitGegner(k * 10 + i, a)); return eh; };

test('Wiederholung ab 3 Einheiten je Gegnerart: 3 Einheiten mit je einem vollständigen Lauf; gnugo und ki gleich, fuego berichtet', () => {
  const eh = dreiArten();
  const alle = (f = () => true) => eh.map(e => zeileW(e, f(e)));
  const gut = V.auswerten({einheiten: eh, zeilen: alle(), probe: true});
  pruefe(gut.ergebnis.gueltig && gut.globaleFehler.length === 0, 'alle gleich, je 3: gültig: ' + gut.globaleFehler.join(' | '));
  pruefeGleich(gut.wiederholung.gnugo.n, 3, 'gnugo 3 vollständige Läufe'); pruefeGleich(gut.wiederholung.gnugo.gleich, 3, 'alle drei gleich');
  pruefeGleich(gut.wiederholung.gnugo.verlangtJe, 1, 'ab 3 Einheiten genügt ein Wiederholungslauf je Einheit');
  const fuegoUngleich = V.auswerten({einheiten: eh, zeilen: alle(e => e.gegner !== 'fuego'), probe: true});
  pruefe(fuegoUngleich.ergebnis.gueltig, 'Fuego ungleich: nur berichtet, weiterhin gültig');
  pruefe(/fuego: 3\/3 Einheiten erfüllt/.test(V.bericht(fuegoUngleich)) && /davon gleich in Zugfolge und Stand 0/.test(V.bericht(fuegoUngleich)) && /Gleichheit nur berichtet/.test(V.bericht(fuegoUngleich)), 'Bericht nennt Fuego als nur berichtet');
  const einzeln = V.auswerten({einheiten: eh, zeilen: eh.map((e, i) => zeileW(e, !(e.gegner === 'gnugo' && i === 0))), probe: true});
  pruefeGleich(einzeln.ergebnis.gueltig, false, 'eine ungleiche gnugo-Wiederholung macht ungültig'); pruefe(/KEIN URTEIL/.test(einzeln.ergebnis.befund), 'Befund KEIN URTEIL');
  pruefeGleich(V.auswerten({einheiten: eh, zeilen: eh.map((e, i) => zeileW(e, !(e.gegner === 'ki' && i === 6))), probe: true}).ergebnis.gueltig, false, 'auch bei der Gegner-KI');
  const zuWenig = V.auswerten({einheiten: eh, zeilen: eh.map((e, i) => (i === 3 ? {...zeileW(e), wiederholungen: []} : zeileW(e))), probe: true});
  pruefeGleich(zuWenig.ergebnis.gueltig, false, 'fuego nur 2 Einheiten mit Wiederholung'); pruefe(zuWenig.globaleFehler.some(x => /Gegner fuego 2 von 3 Einheiten/.test(x)), zuWenig.globaleFehler.join(' | '));
  pruefeGleich(V.auswerten({einheiten: eh, zeilen: eh.map(e => ({schluessel: e.schluessel, gegner: e.gegner, ...regulaer(20, 15)})), probe: true}).ergebnis.gueltig, false, 'Probe ohne jede Wiederholung ist ungültig');
  pruefeGleich(V.auswerten({einheiten: eh, zeilen: eh.map(e => ({schluessel: e.schluessel, gegner: e.gegner, ...regulaer(20, 15)})), probe: false}).globaleFehler.length, 0, 'Hauptlauf verlangt keine Wiederholung');
});

test('Wiederholung bei weniger als 3 Einheiten (GNU Go hatte nur 2): jede Einheit insgesamt 3 Durchläufe, nie als 3 verschiedene Stellungen ausgegeben', () => {
  const eh = [mitGegner(0, 'gnugo'), mitGegner(1, 'gnugo')];
  const pruefen = zeilen => V.auswerten({einheiten: eh, zeilen, probe: true});
  const gut = pruefen(eh.map(e => zeileW(e, true, {}, 2)));
  pruefe(gut.ergebnis.gueltig, 'beide Einheiten je 2 vollständige gleiche Wiederholungsläufe (3 Durchläufe): gültig: ' + gut.globaleFehler.join(' | '));
  pruefeGleich(gut.wiederholung.gnugo.verlangtJe, 2, 'verlangt 2 Wiederholungsläufe je Einheit'); pruefeGleich(gut.wiederholung.gnugo.verlangtEinheiten, 2, 'verlangt beide Einheiten'); pruefeGleich(gut.wiederholung.gnugo.n, 4, 'vier vollständige Läufe');
  const einLauf = pruefen(eh.map(e => zeileW(e, true, {}, 1)));
  pruefeGleich(einLauf.ergebnis.gueltig, false, 'nur ein Wiederholungslauf je Einheit (2 Durchläufe) genügt bei 2 Einheiten nicht');
  pruefe(einLauf.globaleFehler.some(x => /0 von 2 Einheiten mit je 2 vollständigen/.test(x)), einLauf.globaleFehler.join(' | '));
  pruefeGleich(pruefen([zeileW(eh[0], true, {}, 2), zeileW(eh[1], true, {}, 2)].map((z, i) => (i === 1 ? {...z, wiederholungen: [z.wiederholungen[0], {...z.wiederholungen[1], gleichFolge: false}]} : z))).ergebnis.gueltig, false, 'ein ungleicher Lauf von drei macht ungültig');
  pruefeGleich(pruefen([zeileW(eh[0], true, {}, 2), zeileW(eh[1], true, {}, 2)].map((z, i) => (i === 1 ? {...z, wiederholungen: [z.wiederholungen[0], {...z.wiederholungen[1], status2: 'ausfall'}]} : z))).ergebnis.gueltig, false, 'ein Ausfall unter den Wiederholungsläufen: nicht vollständig');
  pruefeGleich(pruefen([zeileW(eh[0], true, {}, 2), {schluessel: eh[1].schluessel, gegner: 'gnugo', ...regulaer(20, 15)}]).ergebnis.gueltig, false, 'eine der beiden Einheiten ohne Wiederholung: ungültig');
  /* 1 Einheit: dieselbe Regel */
  pruefe(V.auswerten({einheiten: [eh[0]], zeilen: [zeileW(eh[0], true, {}, 2)], probe: true}).ergebnis.gueltig, 'eine einzige Einheit mit 3 Durchläufen genügt der Regel');
});

test('Wiederholungsplan: je Gegnerart, nach Schlüssel sortiert, wenige Einheiten insgesamt je 3 Durchläufe', () => {
  const eh = [...['b', 'a'].map(k => ({schluessel: 'gnugo-' + k, gegner: 'gnugo'})), ...['f1', 'f2', 'f3', 'f4', 'f5', 'f6'].map(k => ({schluessel: k, gegner: 'fuego'})), ...['k3', 'k1', 'k2'].map(k => ({schluessel: k, gegner: 'ki'}))];
  const plan = F.wiederholungsplan ? null : F.wiederholungsPlan(eh, 3);
  pruefeGleich(plan.get('gnugo-a'), 2, 'gnugo (2 Einheiten): 2 zusätzliche Durchläufe = 3 insgesamt'); pruefeGleich(plan.get('gnugo-b'), 2, 'auch die zweite');
  for (const k of ['f1', 'f2', 'f3']) pruefeGleich(plan.get(k), 1, `fuego ${k}: erste drei, ein zusätzlicher Durchlauf`);
  for (const k of ['f4', 'f5', 'f6']) pruefeGleich(plan.get(k), undefined, `fuego ${k}: nicht im Plan`);
  for (const k of ['k1', 'k2', 'k3']) pruefeGleich(plan.get(k), 1, `ki ${k}: genau 3 Einheiten, je ein zusätzlicher Durchlauf`);
  pruefeGleich(plan.size, 2 + 3 + 3, 'Größe des Plans');
});

test('Wiederholung: nur vollständige Durchläufe zählen (fehlerfrei, regulär, endliche Stände); Ausfälle sind nie „gleich“', () => {
  const eh = dreiArten();
  const mit = aendere => V.auswerten({einheiten: eh, zeilen: eh.map((e, i) => aendere(e, i) || zeileW(e)), probe: true});
  pruefe(mit(() => null).ergebnis.gueltig, 'Ausgangslage gültig');
  const f2 = mit((e, i) => (i === 0 ? zeileW(e, true, {fehler2: ['Fortsetzung: x']}) : null));
  pruefeGleich(f2.ergebnis.gueltig, false, 'fehler2 verhindert das Bestehen'); pruefe(f2.globaleFehler.some(x => /Gegner gnugo 2 von 3 Einheiten/.test(x)), f2.globaleFehler.join(' | '));
  const ausfall2 = mit((e, i) => (i === 0 ? zeileW(e, true, {status1: 'ausfall', status2: 'ausfall', stand1: {}, stand2: {}, gleichStand: false}) : null));
  pruefeGleich(ausfall2.ergebnis.gueltig, false, 'zwei Ausfälle mit gleicher Teilfolge zählen nicht als gleich'); pruefeGleich(ausfall2.wiederholung.gnugo.unvollstaendig, 1, 'als unvollständig gezählt');
  pruefeGleich(mit((e, i) => (i === 3 ? zeileW(e, true, {status2: 'ausfall'}) : null)).ergebnis.gueltig, false, 'ein Durchlauf Ausfall: nicht vollständig (auch bei Fuego)');
  pruefeGleich(mit((e, i) => (i === 6 ? zeileW(e, true, {stand1: {flaeche: NaN, territory: 1}, stand2: {flaeche: NaN, territory: 1}}) : null)).ergebnis.gueltig, false, 'nicht endliche Stände');
  pruefeGleich(mit((e, i) => (i === 7 ? zeileW(e, true, {stand1: undefined, stand2: undefined}) : null)).ergebnis.gueltig, false, 'fehlende Stände');
  pruefeGleich(mit((e, i) => (i === 1 ? zeileW(e, true, {stand2: {flaeche: 9, territory: 6}}) : null)).ergebnis.gueltig, false, 'gleiche Zugfolge, anderer Stand bei GNU Go');
  const fuegoAnders = mit(e => (e.gegner === 'fuego' ? zeileW(e, true, {stand2: {flaeche: 9, territory: 6}}) : null));
  pruefe(fuegoAnders.ergebnis.gueltig && fuegoAnders.wiederholung.fuego.gleich === 0 && fuegoAnders.wiederholung.fuego.n === 3, 'Fuego: ungleiche Stände nur berichtet, 3 vollständige vorhanden');
  pruefeGleich(mit((e, i) => (i === 0 ? {...zeileW(e), fehler: ['Einspielen: x']} : null)).ergebnis.gueltig, false, 'Fehler in der ersten Zeile: ungültig');
});

test('Wiederholung: bearbeiteMitWiederholung führt die zusätzlichen Durchläufe aus, vergleicht und protokolliert Diagnose', async () => {
  const E = engine(), e = {...(await einheitAusHand(E))};
  const opt = {sims: 4, maxZuege: 600, seed: 1};
  const ctx = (flaky = false) => { let n = 0; return {E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt,
    startReferee: async () => { n++; const a = attrappe(E); if (flaky && n === 2) { const alt = a.frage; a.frage = async b => (/^genmove/.test(b) && !a.schon ? (a.schon = true, 'A10') : alt(b)); } return a; }, startGegner: async () => null}; };
  const r = await F.bearbeiteMitWiederholung(ctx(), e, 2);
  pruefeGleich(r.wiederholungen.length, 2, 'zwei zusätzliche Durchläufe');
  pruefe(r.wiederholungen.every(w => w.gleichFolge && w.gleichStand && w.status2 === 'regulaer' && w.fehler2.length === 0), 'gleicher Seed: alle gleich in Zugfolge und Stand: ' + JSON.stringify(r.wiederholungen.map(w => [w.lauf, w.gleichFolge, w.gleichStand])));
  pruefeGleich(r.wiederholungen.map(w => w.lauf).join(','), '2,3', 'Laufnummern 2 und 3 (Durchlauf 1 ist die Zeile selbst)');
  pruefe(r.arm0.folge.length >= 1 && r.arm0.folge.length === r.wiederholungen[0].laenge1, 'die Folge wird protokolliert');
  pruefe(r.wiederholungen.every(w => w.diagnose && w.diagnose.anfang && w.diagnose.ende), 'Diagnose (Brett, tote Koordinaten, Zählwerte) für Anfang und Ende auch in den Wiederholungen');
  pruefe(r.diagnose.anfang.brett.length === 361 && r.diagnose.ende.brett.length === 361, 'Diagnose der ersten Zeile: Brett für Anfang und Ende');
  const k = await F.bearbeiteMitWiederholung(ctx(true), e, 1);
  pruefeGleich(k.wiederholungen[0].gleichFolge, false, 'abweichender zweiter Lauf wird als ungleich erkannt');
  pruefeGleich((await F.bearbeiteMitWiederholung(ctx(), e, 0)).wiederholungen, undefined, 'ohne Wiederholung kein Eintrag');
});

test('Zählvergleich (geänderte Kontrollregel): Abweichung mit Koordinaten und Bestandteilen berichtet, kein Gültigkeitskriterium; Anfang, Ende, Wiederholung', async () => {
  const E = engine(), e = await einheitAusHand(E);
  /* Attrappe, deren Tot-Liste ALLE schwarzen Steine nennt: Fläche aus der Tot-Liste ≠ final_score */
  const mitTot = () => { const a = attrappe(E), alt = a.frage;
    a.frage = async b => (/^final_status_list/.test(b) ? alt('list_stones black') : alt(b)); return a; };
  const ctx = {E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt: {sims: 4, maxZuege: 600, seed: 1}, startReferee: async () => mitTot(), startGegner: async () => null};
  const r = await F.bearbeiteMitWiederholung(ctx, e, 1);
  pruefeGleich(r.kontrolle.flaecheTotListe, false, 'der Vergleich erkennt die Abweichung (Hinweis in den Rohdaten)');
  const wos = r.kontrolle.abweichungen.map(x => x.wo).sort().join(',');
  pruefeGleich(wos, 'anfang,ende,wiederholung 2 anfang,wiederholung 2 ende', 'Abweichung an Anfang, Ende und in der Wiederholung festgehalten: ' + wos);
  const x = r.kontrolle.abweichungen[0], d = x.diagnose;
  pruefe(d.brett.length === 361 && /^[.XO]+$/.test(d.brett), 'Brett als Text'); pruefe(d.tote.length >= 1 && /^[A-HJ-T]\d+$/.test(d.tote[0]), 'tote Koordinaten: ' + d.tote.join(' '));
  pruefe(Number.isFinite(d.flaecheFinalScore) && Number.isFinite(d.flaecheAusTotListe) && Number.isFinite(d.territoryAusTotListe) && d.flaecheFinalScore !== d.flaecheAusTotListe, 'beide Zählwerte und Territory festgehalten und verschieden');
  pruefe(d.gefangen[1] >= 0 && d.gefangen[2] >= 0 && typeof d.finalScore === 'string', 'Gefangene und final_score-Text');
  const log = F.logAbweichungen(r);
  pruefe(/ZÄHLABWEICHUNG .* anfang: final_score ".*", Fläche aus Tot-Liste -?[\d.]+, tote Steine \d+/.test(log[0]) && log.filter(z => /^  [.XO]{19}$/.test(z)).length >= 19, 'Log: Abweichung samt Brett (19 Zeilen): ' + log[0]);
  const res = V.auswerten({einheiten: [e], zeilen: [{...r, gegner: 'gnugo'}], probe: true});
  pruefeGleich(res.ergebnis.wertungen.territory.gueltig, true, 'die Abweichung der beiden Zählverfahren macht Territory NICHT ungültig'); pruefeGleich(res.ergebnis.wertungen.flaeche.gueltig, true, 'Fläche bleibt gültig');
  const v = r.kontrolle.abweichungen[0].diagnose.vergleich;
  pruefe(v && Array.isArray(v.punktAbweichungen) && v.unsereZaehlung && v.kreuztabelle, 'Koordinaten und Bestandteile an der Abweichung: ' + JSON.stringify(Object.keys(r.kontrolle.abweichungen[0].diagnose)));
  pruefe(/Bestandteile \(unsere Zählung\): Schwarz Steine \d+ \+ Gebiet \d+/.test(log.join('\n')) && /Punktabweichungen GNU Go gegen unseren Besitzer:/.test(log.join('\n')), 'Log nennt Bestandteile und Punktabweichungen');
  const bericht = V.bericht(res);
  pruefe(Object.keys(res.abweichungen).length === 1 && /Zählvergleich zweier Verfahren \(kein Gültigkeitskriterium\) .* \(anfang\)/.test(bericht), 'Bericht nennt den Vergleich');
  pruefe(/Unterschied -?[\d.]+/.test(bericht) && /Bestandteile \(unsere Zählung\)/.test(bericht) && /Punktabweichungen:/.test(bericht), 'Bericht weist Unterschied, Bestandteile und Punktabweichungen aus');
  /* nur die Wiederholung weicht ab (der erste Durchlauf zählt richtig): die Kontrolle muss trotzdem anschlagen */
  let nr = 0;
  const nurWdh = await F.bearbeiteMitWiederholung({...ctx, startReferee: async () => (++nr === 2 ? mitTot() : attrappe(E))}, e, 1);
  pruefeGleich(nurWdh.diagnose.anfang.tote.length, 0, 'erster Durchlauf ohne Abweichung');
  pruefeGleich(nurWdh.kontrolle.flaecheTotListe, false, 'Abweichung nur in der Wiederholung macht die Kontrolle der Einheit falsch');
  pruefeGleich(nurWdh.kontrolle.abweichungen.map(x => x.wo).sort().join(','), 'wiederholung 2 anfang,wiederholung 2 ende', 'nur die Wiederholung ist als Abweichung festgehalten');
  pruefeGleich(V.auswerten({einheiten: [e], zeilen: [{...nurWdh, gegner: 'gnugo'}], probe: true}).ergebnis.wertungen.territory.gueltig, true, 'auch dann bleibt Territory gültig');
  /* ohne Abweichung: keine Meldung, keine Einträge */
  const ok = await F.bearbeiteMitWiederholung({...ctx, startReferee: async () => attrappe(E)}, e, 0);
  pruefe(ok.kontrolle.abweichungen === undefined && F.logAbweichungen(ok).length === 0, 'ohne Abweichung nichts im Log');
});

test('Probe-Log: keine Wirkungszahlen, nur Zugzahlen und Status; außerhalb der Probe die Stände', async () => {
  const E = engine(), e = await einheitAusHand(E);
  const r = await F.bearbeiteMitWiederholung({E, DEFAULT: _DEFAULT, capturesKonvention: 'gefangen-von', opt: {sims: 4, maxZuege: 600, seed: 1}, startReferee: async () => attrappe(E), startGegner: async () => null}, e, 1);
  const probe = F.logZeile(r, 1, 11, true), voll = F.logZeile(r, 1, 11, false);
  pruefe(/KI-Steinzüge \d+, KI-Pässe \d+, Züge nach der Stellung \d+/.test(probe) && /regulär/.test(probe), 'Probe nennt Zugzahlen und Status: ' + probe);
  pruefe(!/weiter F|sofort F/.test(probe) && !/-?\d+\.5/.test(probe.replace(/\(\d+ s\)/, '')), 'Probe-Zeile ohne Stände beider Arme: ' + probe);
  pruefe(/weiter F -?[\d.]+ \/ sofort F -?[\d.]+/.test(voll), 'außerhalb der Probe stehen die Stände in der Zeile: ' + voll);
  /* Probe-Bericht: Ausfälle ohne „sofort“-Wert, KI-Züge als technische Diagnose */
  const eh = [e], zeile = {...r, gegner: 'gnugo'};
  const ausfall = {...zeile, arm0: {status: 'ausfall', grund: 'GNU Go beendet', kiSteine: 0, kiPaesse: 0}, wiederholungen: undefined};
  const b1 = V.bericht(V.auswerten({einheiten: eh, zeilen: [ausfall], probe: true})), b2 = V.bericht(V.auswerten({einheiten: eh, zeilen: [ausfall], probe: false}));
  pruefe(!/sofort aus KI-Sicht/.test(b1) && /sofort aus KI-Sicht/.test(b2), 'Ausfallliste: in der Probe ohne Sofort-Wert, sonst mit');
  const b3 = V.bericht(V.auswerten({einheiten: eh, zeilen: [zeile], probe: true}));
  pruefe(/KI-Züge in den Fortsetzungen \(technisch\): 1 reguläre, Steinzüge \d+ bis \d+/.test(b3), 'Probe-Bericht nennt die KI-Zugzahlen als technische Diagnose: ' + (b3.match(/- KI-Züge.*/) || [''])[0]);
});

test('Ungültiger Lauf: der Schlussbefund heißt KEIN URTEIL, nie der erfüllte 2-%-Wortlaut', () => {
  const eh = [], erg = [];
  for (let i = 0; i < 183; i++) { const e = einheit(i); eh.push(e); erg.push({schluessel: e.schluessel, ...regulaer(20, 15)}); }
  const gut = V.auswerten({einheiten: eh, zeilen: erg, probe: false});
  pruefe(/höchstens 2 %/.test(gut.ergebnis.befund) && gut.ergebnis.gueltig, 'Ausgangslage: gültig, Grenze erfüllt');
  const doppelt = V.auswerten({einheiten: eh, zeilen: [...erg, erg[0]], probe: false});
  pruefeGleich(doppelt.ergebnis.gueltig, false, 'doppeltes Ergebnis: ungültig');
  pruefe(/^KEIN URTEIL/.test(doppelt.ergebnis.befund) && !/höchstens 2 %/.test(doppelt.ergebnis.befund), 'Befund überschrieben: ' + doppelt.ergebnis.befund);
  const b = V.bericht(doppelt);
  pruefe(/\*\*KEIN URTEIL/.test(b) && !/liegt unter den Modellannahmen/.test(b), 'Bericht ohne positiven Schlusssatz');
  const a = V.setzeUngueltig(V.auswerten({einheiten: eh, zeilen: erg, probe: false}), 'Nachspiel-Kontrolle fehlt');
  pruefe(/^KEIN URTEIL: Nachspiel-Kontrolle fehlt/.test(a.ergebnis.befund), 'setzeUngueltig überschreibt den Befund');
  /* Kommandozeile: 183 gute Einheiten, aber keine Nachspiel-Kontrolle */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'passregel-')), ef = path.join(tmp, 'e.jsonl'), zf = path.join(tmp, 'z.jsonl');
  fs.writeFileSync(ef, eh.map(e => JSON.stringify(e)).join('\n') + '\n'); fs.writeFileSync(zf, erg.map(r => JSON.stringify(r)).join('\n') + '\n');
  const r = spawnSync(process.execPath, [path.join(wurzel, 'auswertung/endspiel/passregel-vergleich.js'), '--einheiten', ef, '--ergebnisse', zf, '--aus', path.join(tmp, 'o')], {encoding: 'utf8'});
  pruefeGleich(r.status, 1, 'ohne Nachspiel-Kontrolle: Exit 1');
  const md = fs.readFileSync(path.join(tmp, 'o', 'bericht.md'), 'utf8'), zahlen = JSON.parse(fs.readFileSync(path.join(tmp, 'o', 'zahlen.json'), 'utf8'));
  pruefe(/\*\*Lauf UNGÜLTIG/.test(md) && /\*\*KEIN URTEIL: Nachspiel-Kontrolle fehlt/.test(md) && !/liegt unter den Modellannahmen/.test(md), 'Bericht: oben UNGÜLTIG und unten ebenfalls KEIN URTEIL');
  pruefe(/^KEIN URTEIL/.test(zahlen.ergebnis.befund), 'zahlen.json: Befund KEIN URTEIL');
  fs.rmSync(tmp, {recursive: true, force: true});
});

laufeTests('Passregel-Vergleich (Werkzeuge)').then(ok => process.exit(ok ? 0 : 1));
