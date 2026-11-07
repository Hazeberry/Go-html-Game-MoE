// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Untersuchung der Vorsprungsprüfung (docs/passregel-vorsprung.md), ohne GNU Go, ohne Messung, ohne Rohdaten:
     1. Zerlegung von D = min(mit, nur) − Referenzstand als Rechenidentität auf Zufallsbrettern mit zufälligen Tot-Listen,
        Fläche und Territory, Summe der Beiträge genau gleich D.
     2. Schritt 0: fehlende Felder werden erkannt und je Feld gezählt, die Einheit ist dann „nicht auswertbar“.
     3. Identitätskontrolle: neu gerechnetes mit/nur gleich gespeichert; eine Abweichung verhindert die Zerlegung.
     4. Vorzeichenwechsel V: Referenzstand < 0 bei Auslösung (min(mit, nur) ≥ 20); eine absolute Abweichung über 20 allein
        ist keiner; Näherungsfälle, Überlappung mit der Zählabweichung.
     5. Zugfolge ergibt dasselbe Brett wie diagnose.anfang, sonst keine Zerlegung.
     6. Werkzeug als Kommandozeile: Bericht mit Code-Kennung (SHA-256 und Hauptlauf-Commit); fehlende Dateien: Schritt 0, Exit 1.
   Aufruf:  node tests/passregel-vorsprung.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const L = require('../auswertung/endspiel/passregel-lib.js');
const S = require('../auswertung/endspiel/passregel-stellungen.js');
const V = require('../auswertung/endspiel/passregel-vorsprung.js');

const wurzel = path.join(__dirname, '..');
const html = path.join(wurzel, 'index.html');
const werkzeug = path.join(wurzel, 'auswertung/endspiel/passregel-vorsprung.js');
let _E = null;
const engine = () => _E || (_E = V.motor(html));

function handPartie() {
  const txt = fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', 'hand-427.sgf'), 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g, zuege = [];
  let m; while ((m = re.exec(txt))) zuege.push(m[2] ? L.zuGtp((m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97)) : 'pass');
  return {nr: 1, seed: 1, wirFarbe: 'S', beginnt: 'S', vorgabe: 0, komi: 7.5, vorgabeSteine: [], endstand: 67.5, zuege};
}
const brettText = b => Array.from(b, c => '.XO'[c]).join('');

/* Einheit und Ergebniszeile aus der Handpartie: wie Stufe A und die Fortsetzung sie schreiben würden */
function einheitAusHand(E) {
  const stat = {stellungenGeprueft: 0, voraussetzungVerletzt: [], geprueft: {flaeche: 0, territory: 0}, gruende: {flaeche: Object.fromEntries(S.GRUENDE.map(g => [g, 0])), territory: Object.fromEntries(S.GRUENDE.map(g => [g, 0]))}};
  const p = S.pruefePartie(E, handPartie(), stat);
  const ersteW = ['flaeche', 'territory'].find(w => p.erste[w]);
  if (!ersteW) throw new Error('Handpartie löst nicht aus');
  const index = p.erste[ersteW].index, ausgeloest = {flaeche: false, territory: false}, pruef = {};
  for (const w of ['flaeche', 'territory']) if (p.erste[w] && p.erste[w].index === index) { ausgeloest[w] = true; pruef[w] = p.erste[w]; }
  const zuege = p.zuege.slice(0, index + 1).map(z => (z.punkt < 0 ? 'pass' : L.zuGtp(z.punkt)));
  return {schluessel: 'hand|hand-427|1|' + index, gruppe: 'hand', datei: 'hand-427', nr: 1, kiFarbe: p.ki, gegner: 'gnugo', index, komi: 7.5, ausgeloest, pruef, zuege};
}
function zeileZu(E, e, referenzKI, tote = []) {
  const {board, caps} = V.einspielen(E, e);
  const s = e.kiFarbe === 1 ? 1 : -1, arm1 = {};
  for (const w of ['flaeche', 'territory']) arm1[w] = s * referenzKI;
  return {schluessel: e.schluessel, arm1, kontrolle: {flaecheTotListe: true},
          diagnose: {anfang: {brett: brettText(board), gefangen: {1: caps[1], 2: caps[2]}, tote: tote.map(L.zuGtp), finalScore: 'B+0', flaecheAusTotListe: 0}}};
}
const mit = (obj, aenderung) => { const k = JSON.parse(JSON.stringify(obj)); aenderung(k); return k; };

/* ── 1 Zerlegung als Rechenidentität ─────────────────────────────────── */
test('Zerlegung: Summe der Beiträge genau gleich D, auf 300 Zufallsbrettern mit zufälligen Tot-Listen, beide Wertungen', () => {
  const E = engine(), zufall = L.mulberry32(4711), n = E.BOARD_SIZE;   /* BOARD_SIZE = Zahl der Punkte (361) */ let ok = 0, mitGruppen = 0, ungleich = 0;
  for (let t = 0; t < 300; t++) {
    const board = new Uint8Array(n); for (let i = 0; i < n; i++) { const x = zufall(); board[i] = x < 0.18 ? 1 : x < 0.36 ? 2 : 0; }
    const caps = {1: Math.floor(zufall() * 12), 2: Math.floor(zufall() * 12)};
    const tote = [...board.keys()].filter(i => board[i] && zufall() < 0.25);
    for (const w of ['flaeche', 'territory']) for (const ki of [1, 2]) {
      const e = {kiFarbe: ki, index: 0}, ref = Math.round((zufall() - 0.5) * 80) + 0.5;
      const q = V.zerlege(E, e, w, board, caps, {da: {tote: tote.map(L.zuGtp)}, referenz: (ki === 1 ? 1 : -1) * ref});
      pruefe(q.ok, `Zufallsbrett ${t} ${w} KI ${ki}: ${q.grund.join('; ')}`);
      if (q.ok) ok++;
      if (q.gruppen.length) mitGruppen++;
      if (Math.abs(q.vorschauMinusTotListe) > 1e-9) ungleich++;
      /* explizit: Beiträge + Rest = D */
      const summe = q.gruppen.reduce((s, g) => s + g.beitrag, 0) + q.gebiet.beitrag;
      pruefe(Math.abs(summe - q.vorschauMinusTotListe) < 1e-9 && Math.abs(q.vorschauMinusTotListe + q.verfahrensRest - q.D) < 1e-9, `Identität ${t} ${w}`);
    }
  }
  pruefe(ok === 1200, `alle 1200 Zerlegungen bestehen (${ok})`);
  pruefe(mitGruppen > 400 && ungleich > 400, `die Fälle sind nicht leer: ${mitGruppen} mit Gruppen, ${ungleich} mit Unterschied zwischen Vorschau und Tot-Liste`);
});
test('Zerlegung: eine große, von GNU Go als tot geführte und von der Vorschau nicht als tot entfernte Gruppe erscheint als Beitrag mit Koordinaten', () => {
  const E = engine(), n = 19, board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0};
  /* Schwarz: große Gruppe links (Spalten A bis F, 6x19 minus zwei Augen), Weiß: schmale Gruppe rechts; die Vorschau entfernt Schwarz nicht als tot (das ist kein Lebensnachweis) */
  for (let y = 0; y < n; y++) for (let x = 0; x < 6; x++) board[y * n + x] = 1;
  for (const [x, y] of [[2, 4], [2, 14]]) board[y * n + x] = 0;
  for (let y = 0; y < n; y++) board[y * n + 7] = 2;
  const tot = [...board.keys()].filter(i => board[i] === 1);   /* GNU Go hielte sie für tot */
  const e = {kiFarbe: 1, index: 0};
  const q = V.zerlege(E, e, 'flaeche', board, caps, {da: {tote: tot.map(L.zuGtp)}, referenz: -50});
  pruefe(q.ok, q.grund.join('; '));
  const grosse = q.gruppen.find(g => g.richtung === 'nur Tot-Liste tot' && g.steine >= 100);
  pruefe(!!grosse, 'die Gruppe steht als Beitrag: ' + JSON.stringify(q.gruppen.map(g => [g.richtung, g.steine, g.beitrag])));
  pruefe(grosse && grosse.punkte.length === grosse.steine && grosse.punkte.includes('A1'), 'Koordinaten der Gruppe stehen da');
  pruefe(grosse && grosse.beitrag > 50, `Beitrag der Gruppe ist groß: ${grosse && grosse.beitrag}`);
});

/* ── 2 bis 5: Schritte mit Einheiten aus der Handpartie ───────────────── */
test('Schritt 0: fehlende Felder werden je Feld gezählt, die Einheit ist dann nicht auswertbar', () => {
  const E = engine(), e = einheitAusHand(E), w = e.ausgeloest.flaeche ? 'flaeche' : 'territory';
  const gut = zeileZu(E, e, 10);
  const lauf = (z, einheit = e) => V.auswerten(E, [einheit], new Map([[e.schluessel, z]])).schritt0[w];
  pruefeGleich(lauf(gut).vorhanden, 1, 'vollständige Einheit ist auswertbar');
  for (const [feld, f] of [['brett', z => { delete z.diagnose.anfang.brett; }], ['gefangen', z => { delete z.diagnose.anfang.gefangen; }], ['tote', z => { z.diagnose.anfang.tote = 'x'; }],
                            ['arm1', z => { z.arm1[w] = null; }], ['diagnose.anfang', z => { delete z.diagnose; }]]) {
    const s0 = lauf(mit(gut, f));
    pruefeGleich(s0.vorhanden, 0, `${feld}: nicht auswertbar`); pruefe(s0.fehlendeFelder[feld] === 1, `${feld} wird gezählt: ${JSON.stringify(s0.fehlendeFelder)}`);
  }
  const ohneZuege = mit(e, k => { delete k.zuege; });
  pruefe(lauf(gut, ohneZuege).fehlendeFelder.zuege === 1, 'fehlende Zugfolge wird gezählt');
  const s0 = V.auswerten(E, [e], new Map()).schritt0[w];
  pruefe(s0.fehlendeFelder.Ergebniszeile === 1 && s0.vorhanden === 0, 'fehlende Ergebniszeile wird gezählt');
});
test('Identitätskontrolle: gleiches mit/nur besteht; abweichendes verhindert die Zerlegung, mit Grund', () => {
  const E = engine(), e = einheitAusHand(E), w = e.ausgeloest.flaeche ? 'flaeche' : 'territory';
  const z = zeileZu(E, e, -30);
  const gut = V.auswerten(E, [e], new Map([[e.schluessel, z]]));
  pruefeGleich(gut.schritt0[w].identitaet.bestanden, 1, 'Identität besteht');
  pruefeGleich(gut.schritt2[w].zerlegt.length, 1, 'V wird zerlegt');
  for (const feld of ['mit', 'nur']) {
    const schlecht = mit(e, k => { k.pruef[w][feld] += 1; });
    const r = V.auswerten(E, [schlecht], new Map([[e.schluessel, z]]));
    pruefeGleich(r.schritt0[w].identitaet.durchgefallen.length, 1, `${feld} abweichend: durchgefallen`);
    pruefeGleich(r.schritt2[w].zerlegt.length, 0, `${feld} abweichend: nicht zerlegt`);
    pruefe(r.schritt2[w].nichtZerlegt.length === 1 && /Identität/.test(r.schritt2[w].nichtZerlegt[0].grund), 'Grund nennt die Identität');
  }
  /* anderes Brett (ein Stein weg) ergibt ein anderes mit/nur oder eine Zugfolge-Abweichung: keine Zerlegung */
  const k = mit(z, x => { const b = x.diagnose.anfang.brett; const i = b.search(/[XO]/); x.diagnose.anfang.brett = b.slice(0, i) + '.' + b.slice(i + 1); });
  const r = V.auswerten(E, [e], new Map([[e.schluessel, k]]));
  pruefeGleich(r.schritt2[w].zerlegt.length, 0, 'verändertes Brett: keine Zerlegung');
  pruefe(r.schritt0[w].replayAbweichung.length === 1, 'Zugfolge ≠ diagnose.anfang wird gemeldet');
});
test('V: Referenzstand < 0 bei Auslösung; eine große Abweichung bei positivem Referenzstand ist kein V', () => {
  const E = engine(), e = einheitAusHand(E), w = e.ausgeloest.flaeche ? 'flaeche' : 'territory', X = Math.min(e.pruef[w].mit, e.pruef[w].nur);
  pruefe(X >= 20, `Auslösung hat min(mit, nur) ≥ 20 (${X})`);
  const lauf = ref => V.auswerten(E, [e], new Map([[e.schluessel, zeileZu(E, e, ref)]]));
  const neg = lauf(-0.5).schritt1[w], pos = lauf(+1.5).schritt1[w], hoch = lauf(+3).schritt1[w];
  pruefeGleich(neg.V, 1, 'Referenzstand −0,5 ist ein Wechsel'); pruefeGleich(neg.vListe[0].referenz, -0.5, 'Referenzstand in KI-Sicht');
  pruefeGleich(pos.V, 0, 'Referenzstand +1,5 ist kein Wechsel');
  pruefeGleich(pos.dAlle.anzahlUeber20, X - 1.5 > 20 ? 1 : 0, 'D > 20 wird gezählt, ist aber kein Wechsel');
  pruefe(X - 1.5 > 20 && pos.dAlle.anteilUeber20 === 1 && pos.V === 0, 'D über 20 ohne Vorzeichenwechsel: kein V');
  pruefeGleich(hoch.V, 0, 'positiver Referenzstand ist kein V');
  /* Näherungsfall: 0 ≤ Referenzstand < 20 */
  pruefeGleich(lauf(10).schritt1[w].naehefaelle, 1, 'Referenzstand 10 ist ein Näherungsfall');
  pruefeGleich(lauf(25).schritt1[w].naehefaelle, 0, 'Referenzstand 25 ist keiner');
  /* Referenzstand roh = Schwarz − Weiß; die KI-Sicht dreht das Vorzeichen für KI Weiß. Schritt 1 läuft unabhängig von der Identität. */
  const weiss = mit(e, k => { k.kiFarbe = 2; });
  const roh = wert => { const z = zeileZu(E, e, 0); z.arm1.flaeche = wert; z.arm1.territory = wert; return z; };
  const rw = wert => V.auswerten(E, [weiss], new Map([[e.schluessel, roh(wert)]])).schritt1[w];
  pruefeGleich(rw(+20).V, 1, 'KI Weiß, Schwarz führt um 20: Referenzstand −20 für die KI, ein Wechsel');
  pruefeGleich(rw(+20).vListe[0].referenz, -20, 'Referenzstand in KI-Sicht für Weiß');
  pruefeGleich(rw(-20).V, 0, 'KI Weiß, Weiß führt um 20: kein Wechsel');
  pruefeGleich(rw(-20).vListe.length, 0, 'keine V-Einträge');
  const schwarz = V.auswerten(E, [e], new Map([[e.schluessel, roh(+20)]])).schritt1[w];
  pruefeGleich(schwarz.V, 0, 'KI Schwarz, Schwarz führt um 20: kein Wechsel');
});
test('Überlappung mit der Zählabweichung und zwischen Fläche und Territory wird berichtet', () => {
  const E = engine(), e = einheitAusHand(E);
  const z = zeileZu(E, e, -30); z.kontrolle.flaecheTotListe = false;
  const r = V.auswerten(E, [e], new Map([[e.schluessel, z]]));
  const w = e.ausgeloest.flaeche ? 'flaeche' : 'territory';
  pruefeGleich(r.schritt1[w].ueberlappungMitZaehlabweichung.length, 1, 'V und Zählabweichung überlappen');
  const beide = e.ausgeloest.flaeche && e.ausgeloest.territory;
  pruefeGleich(r.schritt1.ueberlappungFlaecheTerritory.length, beide ? 1 : 0, 'Überlappung Fläche/Territory');
  const md = V.bericht(r);
  pruefe(/V \(Referenzstand < 0\)/.test(md) && /Referenzstand/.test(md) && /kein Urteil/.test(md), 'Bericht nennt V, Referenzstand und dass es kein Urteil ist');
  pruefe(md.includes(V.HAUPTLAUF_COMMIT) && md.includes(r.kopf.htmlSha256), 'Bericht trägt Hauptlauf-Commit und SHA-256 der index.html');
});

/* ── 6 Kommandozeile ─────────────────────────────────────────────────── */
test('Werkzeug: Kommandozeile schreibt Bericht und JSON; fehlende Dateien ergeben Schritt 0 „nicht auswertbar“ und Exit 1', () => {
  const E = engine(), e = einheitAusHand(E), dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vorsprung-'));
  try {
    const eh = path.join(dir, 'einheiten.jsonl'), erg = path.join(dir, 'teil-1.jsonl'), aus = path.join(dir, 'aus');
    fs.writeFileSync(eh, JSON.stringify(e) + '\n'); fs.writeFileSync(erg, JSON.stringify(zeileZu(E, e, -30)) + '\n');
    const r = spawnSync(process.execPath, [werkzeug, '--einheiten', eh, '--ergebnisse', erg, '--html', html, '--aus', aus, '--artefakt', 'Test'], {encoding: 'utf8'});
    pruefeGleich(r.status, 0, 'Exit 0: ' + (r.stderr || '').slice(0, 200));
    pruefe(fs.existsSync(path.join(aus, 'vorsprung.md')) && fs.existsSync(path.join(aus, 'vorsprung.json')), 'Bericht und JSON stehen da');
    const j = JSON.parse(fs.readFileSync(path.join(aus, 'vorsprung.json'), 'utf8'));
    pruefeGleich(j.kopf.hauptlaufCommit, V.HAUPTLAUF_COMMIT, 'Commit im JSON'); pruefeGleich(j.kopf.quelle, 'Test', 'Quelle im JSON');
    pruefeGleich(j.kopf.parameter.passNachGegnerpass, 1, 'Parameter: Versuchsregel eingeschaltet, wie in Stufe A');
    /* gültig: Exit 0 und „Lauf gültig“ */
    pruefe(/Lauf gültig/.test(fs.readFileSync(path.join(aus, 'vorsprung.md'), 'utf8')) && j.gueltigkeit.gueltig === true, 'vollständige Daten: Lauf gültig');
    /* fehlende Ergebniszeile, fehlendes Pflichtfeld, durchgefallene Identität, Zugfolge ≠ Brett: Exit 1, Bericht entsteht trotzdem, KEIN URTEIL */
    const w = e.ausgeloest.flaeche ? 'flaeche' : 'territory', gut = zeileZu(E, e, -30);
    const faelle = {
      'fehlende Ergebniszeile': {zeilen: [], einheit: e},
      'fehlendes Pflichtfeld (Brett)': {zeilen: [mit(gut, z => { delete z.diagnose.anfang.brett; })], einheit: e},
      'fehlende Tot-Liste': {zeilen: [mit(gut, z => { delete z.diagnose.anfang.tote; })], einheit: e},
      'fehlender Referenzstand': {zeilen: [mit(gut, z => { z.arm1[w] = null; })], einheit: e},
      'Identitätskontrolle durchgefallen': {zeilen: [gut], einheit: mit(e, k => { k.pruef[w].mit += 1; })},
      'nur die Zugfolge weicht ab (Identität besteht)': {zeilen: [gut], einheit: mit(e, k => { const frei = [...Array(361).keys()].map(L.zuGtp).find(c => !k.zuege.includes(c)); k.zuege[0] = frei; })},
      'Zugfolge ≠ diagnose.anfang': {zeilen: [mit(gut, z => { const b = z.diagnose.anfang.brett, i = b.search(/[XO]/); z.diagnose.anfang.brett = b.slice(0, i) + '.' + b.slice(i + 1); })], einheit: e}};
    for (const [name, f] of Object.entries(faelle)) {
      const d2 = path.join(dir, 'f-' + name.replace(/\W+/g, '_')), eh2 = path.join(d2, 'einheiten.jsonl'), er2 = path.join(d2, 'teil-1.jsonl'), aus2 = path.join(d2, 'aus');
      fs.mkdirSync(d2, {recursive: true}); fs.writeFileSync(eh2, JSON.stringify(f.einheit) + '\n'); fs.writeFileSync(er2, f.zeilen.map(z => JSON.stringify(z)).join('\n') + '\n');
      const r2 = spawnSync(process.execPath, [werkzeug, '--einheiten', eh2, '--ergebnisse', er2, '--html', html, '--aus', aus2], {encoding: 'utf8'});
      pruefeGleich(r2.status, 1, `${name}: Exit 1 (rot)`);
      pruefe(fs.existsSync(path.join(aus2, 'vorsprung.md')) && /KEIN URTEIL/.test(fs.readFileSync(path.join(aus2, 'vorsprung.md'), 'utf8')), `${name}: Bericht entsteht, KEIN URTEIL`);
      pruefe(JSON.parse(fs.readFileSync(path.join(aus2, 'vorsprung.json'), 'utf8')).gueltigkeit.gueltig === false, `${name}: gueltigkeit.gueltig false`);
    }
    const fehl = spawnSync(process.execPath, [werkzeug, '--einheiten', path.join(dir, 'gibtsnicht.jsonl'), '--ergebnisse', erg, '--html', html, '--aus', path.join(dir, 'aus2')], {encoding: 'utf8'});
    pruefeGleich(fehl.status, 1, 'fehlende Datei: Exit 1'); pruefe(/nicht auswertbar/.test(fehl.stdout), 'Schritt 0: nicht auswertbar');
    const ohneErg = spawnSync(process.execPath, [werkzeug, '--einheiten', eh, '--ergebnisse', ',', '--html', html, '--aus', path.join(dir, 'aus3')], {encoding: 'utf8'});
    pruefeGleich(ohneErg.status, 1, 'keine Ergebnisdateien: Exit 1'); pruefe(/nicht auswertbar/.test(ohneErg.stdout), 'keine Ergebnisdateien: Schritt 0');
    const leer = spawnSync(process.execPath, [werkzeug, '--einheiten', eh, '--ergebnisse', '', '--html', html, '--aus', path.join(dir, 'aus4')], {encoding: 'utf8'});
    pruefeGleich(leer.status, 2, 'leerer Wert für --ergebnisse: Aufruffehler');
    const falsch = spawnSync(process.execPath, [werkzeug, '--unbekannt'], {encoding: 'utf8'});
    pruefeGleich(falsch.status, 2, 'falsche Option: Exit 2');
  } finally { fs.rmSync(dir, {recursive: true, force: true}); }
});
test('Hauptlauf-Commit: index.html im Repo und die Kennung des Werkzeugs sind eine 40-stellige SHA', () => {
  pruefe(/^[0-9a-f]{40}$/.test(V.HAUPTLAUF_COMMIT), 'volle SHA');
  pruefeGleich(V.HAUPTLAUF_COMMIT, '7d57e2bf1826904be9c4e6f8a59164db632d032f', 'Commit des Hauptlaufs');
});

laufeTests('Vorsprungsprüfung (Werkzeug)').then(ok => process.exit(ok ? 0 : 1));
