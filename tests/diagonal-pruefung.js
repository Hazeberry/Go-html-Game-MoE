// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Stufe-1-Werkzeug der Diagonalprüfung (docs/diagonalpruefung-vorabfestlegung.md §4, §7, §11 AP3), ohne GNU Go und ohne die echten Archive:
   eine ATTRAPPE aus Zufallspartien (Seeds fest) im Verzeichnis tmp, mit allen Sonderfällen, durch das ganze Werkzeug als eigene Prozesse
   (ziehen, rechnen alt/testkopie/neu, vergleichen). Der Stand „alt“ ist hier aus der aktuellen index.html gebaut (Schalter und seine Zeile
   entfernt), weil ein Checkout ohne Historie die unveränderte Fassung nicht hat; die echte Fassung kommt im Workflow aus Git (Commit und SHA gebunden).
     1. Einspielen: besetzter Punkt, Selbstmord, Gefangene; SGF der Handpartien.
     2. Schritt 0: Zahlen je Gruppe, Ausschlüsse (abgebrochen, Komi), Quellpartien ausgeschlossen (Pfade normalisiert), S nur bei regulärem Ende,
        V nur bei Länge über dem Index (Grenzfall 250 und 251), Schnittmenge leer.
     3. Ganze Kette gültig: Betroffene Stellungen gleich einer unabhängigen Rechnung mit der Engine; Summenzeilen stimmen.
     4. Ungültig, nie ein Urteil: veränderte Tot-Menge bei aus (Nr. 3), bei an gegen die Test-Kopie (Nr. 4), gleicher Prozess, fehlende Stellung,
        falsche SHA; in Schritt 0: fehlende Quellpartie, unspielbare Partie, Gefangene weichen ab, Einheiten und Ergebniszeilen verschieden.
     5. Werkzeug verweigert die falsche Fassung (neu mit alter Datei, alt mit neuer).
     6. Fallabdeckung (leere Tot-Mengen oder Schalter ohne Wirkung: KEIN URTEIL); zu wenig Betroffene: Befund, aber kein Urteil über die Kandidatur.
     7. Workflow: nur manuell, kein GNU Go, drei getrennte Prozesse, Commit und SHA der unveränderten Fassung.
   Aufruf:  node tests/diagonal-pruefung.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), crypto = require('crypto'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, ladeKI} = require('./rahmen');
const L = require('../auswertung/endspiel/passregel-lib.js');
const B = require('./diagonalauge-brett.js');
const W = require('../auswertung/endspiel/diagonal-pruefung.js');

const wurzel = path.join(__dirname, '..');
const werkzeug = path.join(wurzel, 'auswertung/endspiel/diagonal-pruefung.js');
const htmlNeu = path.join(wurzel, 'index.html');
const E = ladeKI({htmlPfad: htmlNeu, mitNetz: false});
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diagonal-pruefung-'));
/* DIAGONAL_PRUEFUNG_BEHALTEN=1 lässt das Arbeitsverzeichnis (mit bericht.md der Attrappe) stehen und nennt es */
process.on('exit', () => {
  if (process.env.DIAGONAL_PRUEFUNG_BEHALTEN) { console.log('Arbeitsverzeichnis: ' + tmp); return; }
  try { fs.rmSync(tmp, {recursive: true, force: true}); } catch (e) { /* egal */ }
});

/* ── Attrappe ─────────────────────────────────────────────────────────── */
function spiel(seed, laenge, mitEnde = true) {
  const rnd = L.mulberry32(seed), b = new Uint8Array(361), zuege = [], caps = {1: 0, 2: 0};
  let f = 1;
  for (let k = 0; k < laenge; k++) {
    let ok = false;
    for (let t = 0; t < 30 && !ok; t++) {
      const i = Math.floor(rnd() * 361);
      if (b[i]) continue;
      b[i] = f; const c = E.removeDeadGroups(b, 3 - f, i);
      if (E.floodFill(b, i).liberties.length === 0) { b[i] = 0; continue; }
      caps[f] += c; zuege.push(L.zuGtp(i)); ok = true;
    }
    if (!ok) zuege.push('pass');
    f = 3 - f;
  }
  if (mitEnde) zuege.push('pass', 'pass');
  return {zuege, caps};
}
function partie(nr, laenge, sonder = {}) {
  const sp = spiel(1000 + nr * 7 + (sonder.seed || 0), laenge, sonder.ende !== false), ki = nr % 2 ? 1 : 2;
  const r = {nr, stufe: 1, wirFarbe: ki === 1 ? 'S' : 'W', beginnt: 'S', vorgabe: 0, komi: 7.5, vorgabeSteine: [], aufgabe: null, endstand: -10.5,
    gefangen: {wir: sp.caps[ki], gegner: sp.caps[3 - ki]}, zuege: sp.zuege};
  return Object.assign(r, sonder.felder || {});
}
const GRUPPE_A = [partie(1, 340), partie(2, 330), partie(3, 360), partie(4, 300), partie(5, 355), partie(6, 380), partie(7, 320),
  partie(8, 248), partie(9, 249), partie(10, 320, {ende: false}), partie(11, 320, {felder: {aufgabe: {wer: 'S'}}}),
  partie(12, 320, {felder: {abgebrochen: true}}), partie(13, 320, {felder: {komi: 6.5}})];
/* eigener Seed: sonst wären Partien beider Gruppen gleich oder hätten gleiche Anfänge (und damit gleiche Bretter) */
const GRUPPE_B = [partie(1, 340, {seed: 500}), partie(2, 310, {seed: 500}), partie(3, 330, {seed: 500}), partie(4, 350, {seed: 500}), partie(5, 365, {seed: 500})];
const ZUFALL_E = [5, 7, 9].map(s => B.ZUFALL.find(z => z.seed === s));

function schreibeArchiv(verz, a = GRUPPE_A, b = GRUPPE_B) {
  const d = path.join(verz, 'docs', 'daten', 'attrappe');
  fs.mkdirSync(d, {recursive: true});
  const gz = (f, rs) => fs.writeFileSync(path.join(d, f), zlib.gzipSync(rs.map(r => JSON.stringify(r)).join('\n') + '\n'));
  gz('A.jsonl.gz', a); gz('B.jsonl.gz', b);
  return {A: path.join(d, 'A.jsonl.gz'), B: path.join(d, 'B.jsonl.gz')};
}
/* Entwicklungsdaten: drei Einheiten aus zwei Quellpartien (wie in den echten Daten: eine Partie mit zwei Einheiten) */
function schreibeEntwicklung(verz, zeilenFilter = x => x) {
  const eh = [{gruppe: 'Gruppe A', datei: 'A.jsonl.gz', quellDatei: 'docs/daten/attrappe/A.jsonl.gz', nr: 2, index: 300},
    {gruppe: 'Gruppe A', datei: 'A.jsonl.gz', quellDatei: 'docs/daten/attrappe/A.jsonl.gz', nr: 2, index: 310},
    {gruppe: 'Gruppe B', datei: 'B.jsonl.gz', quellDatei: 'docs/daten/attrappe/B.jsonl.gz', nr: 3, index: 290}]
    .map(e => ({schluessel: `${e.gruppe}|${e.datei}|${e.nr}|${e.index}`, ...e}));
  const rows = eh.map((e, i) => ({schluessel: e.schluessel, gruppe: e.gruppe, datei: e.datei, nr: e.nr, index: e.index, kiFarbe: 1,
    diagnose: {anfang: {brett: B.brettZuText(B.zufallsbrett(E, ZUFALL_E[i].seed, ZUFALL_E[i].zuege))}}}));
  fs.mkdirSync(path.join(verz, 'entw', 'teile'), {recursive: true});
  fs.writeFileSync(path.join(verz, 'entw', 'teile', 'teil-1.jsonl'), zeilenFilter(rows).map(r => JSON.stringify(r)).join('\n') + '\n');
  fs.writeFileSync(path.join(verz, 'einheiten.jsonl'), eh.map(r => JSON.stringify(r)).join('\n') + '\n');
}
function baueStaende(verz) {
  const orig = fs.readFileSync(htmlNeu, 'utf8');
  const a = '      if (diagAuge && r.groesse === 1 && !_diagIsTrueEye(b, r.punkte[0], r.rand)) continue;\n', p = '  diagonalAugeEnde: 0,\n';
  if (orig.split(a).length !== 2 || orig.split(p).length !== 2) throw new Error('Attrappe „alt“ nicht baubar: Anker nicht genau einmal');
  fs.mkdirSync(path.join(verz, 'alt'), {recursive: true});
  const alt = orig.replace(a, '').replace(p, '');
  fs.writeFileSync(path.join(verz, 'alt', 'index.html'), alt);
  return sha(alt);
}
const lauf = (...args) => spawnSync(process.execPath, [werkzeug, ...args], {encoding: 'utf8', maxBuffer: 1 << 28});
function ziehe(verz, ausNameO = 'ziehen', archiv = schreibeArchiv(verz)) {
  const aus = path.join(verz, ausNameO);
  return {aus, ...lauf('ziehen', '--aus', aus, '--html', htmlNeu, '--entwicklung', path.join(verz, 'entw'), '--ausschluss', path.join(verz, 'einheiten.jsonl'),
    '--gruppe', `Gruppe A=${archiv.A}`, '--gruppe', `Gruppe B=${archiv.B}`, '--hand', path.join(wurzel, 'tests', 'stellungen'))};
}
function rechneAlle(verz, ziehAus, altSha) {
  const st = path.join(ziehAus, 'stellungen.jsonl'), r = {};
  r.alt = lauf('rechnen', '--stand', 'alt', '--html', path.join(verz, 'alt', 'index.html'), '--stellungen', st, '--aus', path.join(verz, 'alt.jsonl'), '--erwartet-sha', altSha);
  r.testkopie = lauf('rechnen', '--stand', 'testkopie', '--html', path.join(verz, 'alt', 'index.html'), '--stellungen', st, '--aus', path.join(verz, 'testkopie.jsonl'), '--tmp', path.join(verz, 'tk'));
  r.neu = lauf('rechnen', '--stand', 'neu', '--html', htmlNeu, '--stellungen', st, '--aus', path.join(verz, 'neu.jsonl'));
  return r;
}
const vergleiche = (verz, ziehAus, ausName, extra = []) => {
  const aus = path.join(verz, ausName);
  return {aus, ...lauf('vergleichen', '--aus', aus, '--stellungen', path.join(ziehAus, 'stellungen.jsonl'), '--schritt0', path.join(ziehAus, 'schritt0.json'),
    '--alt', path.join(verz, 'alt.jsonl'), '--testkopie', path.join(verz, 'testkopie.jsonl'), '--neu', path.join(verz, 'neu.jsonl'), ...extra)};
};
const liesJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const liesJsonl = p => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));

/* Gemeinsame Attrappe für mehrere Tests (einmal gebaut) */
let G = null;
function grund() {
  if (G) return G;
  const verz = fs.mkdtempSync(path.join(tmp, 'g-'));
  schreibeEntwicklung(verz);
  const altSha = baueStaende(verz), z = ziehe(verz), r = rechneAlle(verz, z.aus, altSha), v = vergleiche(verz, z.aus, 'vergleich', ['--erwartet-sha-alt', altSha]);
  return (G = {verz, altSha, z, r, v});
}

test('Einspielen: besetzter Punkt, Selbstmord und Gefangene werden erkannt', () => {
  const f = (farbe, punkt) => ({farbe, punkt});
  pruefe(/besetzt/.test(W.spielEin(E, [f(1, 100), f(2, 100)]).fehler), 'besetzter Punkt');
  pruefe(/Selbstmord/.test(W.spielEin(E, [f(1, 1), f(1, 19), f(2, 0)]).fehler), 'Selbstmord in der Ecke');
  const s = W.spielEin(E, [f(1, 1), f(2, 0), f(1, 19)]);
  pruefeGleich(s.fehler, null, 'Schlagen ist kein Selbstmord');
  pruefeGleich(s.caps[1], 1, 'ein Stein von Schwarz geschlagen');
  pruefeGleich(s.brett[0], 0, 'geschlagener Stein ist vom Brett');
  pruefeGleich(W.spielEin(E, [f(1, 5), f(2, -1), f(1, 6)], [1]).snaps[1].brett.length, 361, 'Schnappschuss nach Zug 1');
  pruefe(W.folgeAusArchiv({beginnt: 'W', zuege: ['A1', 'pass']})[0].farbe === 2, 'beginnt W: erster Zug Weiß');
  let fehler = false; try { W.folgeAusArchiv({beginnt: 'S', zuege: ['resign']}); } catch (e) { fehler = true; }
  pruefe(fehler, 'resign ist kein Zug');
});

test('SGF der Handpartien: Pässe, Setzsteine, die sechs echten Dateien', () => {
  const s = W.leseSgf('(;GM[1]KM[7.5]RE[B+R];B[aa];W[];B[tt];W[bb])');
  pruefeGleich(s.folge.length, 4, 'vier Züge'); pruefeGleich(s.folge[1].punkt, -1, '[] ist Pass'); pruefeGleich(s.folge[2].punkt, -1, '[tt] ist Pass');
  pruefeGleich(s.komi, 7.5, 'Komi'); pruefeGleich(s.ergebnis, 'B+R', 'Ergebnis');
  let wirft = false; try { W.leseSgf('(;SZ[19]AB[dd];W[ee])'); } catch (e) { wirft = true; }
  pruefe(wirft, 'Setzsteine werden nicht stillschweigend ignoriert');
  const dateien = fs.readdirSync(path.join(wurzel, 'tests/stellungen')).filter(f => /^hand-.*\.sgf$/.test(f));
  pruefeGleich(dateien.length, 6, 'sechs Handpartien');
  for (const f of dateien) pruefeGleich(W.spielEin(E, W.leseSgf(fs.readFileSync(path.join(wurzel, 'tests/stellungen', f), 'utf8')).folge).fehler, null, `${f} einspielbar`);
});

test('Schritt 0 (Attrappe): Zählung je Gruppe, Ausschlüsse, S und V', () => {
  const g = grund(), s0 = liesJson(path.join(g.z.aus, 'schritt0.json'));
  pruefeGleich(g.z.status, 0, 'ziehen gültig: ' + g.z.stdout.slice(-300));
  const [a, b] = s0.gruppen;
  pruefeGleich(a.zeilen, 13, 'A: Zeilen'); pruefeGleich(a.uebersprungen['abgebrochen oder unvollständig'], 1, 'A: abgebrochen'); pruefeGleich(a.uebersprungen['Vorgabe oder Komi ≠ 7,5'], 1, 'A: Komi');
  pruefeGleich(a.quellpartienAusgeschlossen, 1, 'A: Quellpartie (Pfade normalisiert) ausgeschlossen'); pruefeGleich(a.pruefpartien, 10, 'A: Prüfpartien');
  pruefeGleich(a.s.auswertbar, 8, 'A: S auswertbar (ohne „kein Ende“ und Aufgabe)');
  pruefeGleich(a.s.nicht['Ende nicht mit zwei Pässen (Zuglimit oder anders)'], 1, 'A: kein reguläres Ende');
  pruefeGleich(a.s.nicht['Aufgabe'], 1, 'A: Aufgabe');
  pruefeGleich(b.zeilen, 5, 'B: Zeilen'); pruefeGleich(b.quellpartienAusgeschlossen, 1, 'B: Quellpartie'); pruefeGleich(b.pruefpartien, 4, 'B: Prüfpartien'); pruefeGleich(b.s.auswertbar, 4, 'B: S');
  /* V: Länge über dem Index. A (Prüfpartien nr 1,3..11 mit Längen +2 Pässe): nr 8 hat 250 Einträge (kein V250), nr 9 hat 251 (V250 ja) */
  const ids = new Set(liesJsonl(path.join(g.z.aus, 'stellungen.jsonl')).map(x => x.id));
  const k = (grp, d, nr) => `Gruppe ${grp}|attrappe/${d}.jsonl.gz|${nr}`;
  pruefe(!ids.has(k('A', 'A', 8) + '|V250'), 'Länge 250: kein V250'); pruefe(ids.has(k('A', 'A', 9) + '|V250'), 'Länge 251: V250 vorhanden');
  pruefe(!ids.has(k('A', 'A', 9) + '|V300'), 'Länge 251: kein V300');
  pruefe(ids.has(k('A', 'A', 1) + '|S') && !ids.has(k('A', 'A', 2) + '|S') && !ids.has(k('A', 'A', 10) + '|S') && !ids.has(k('A', 'A', 11) + '|S'), 'S nur für reguläre Prüfpartien, nicht für die Quellpartie');
  pruefeGleich(s0.stellungen.S, 12, 'S gesamt'); pruefeGleich(s0.stellungen.E, 3, 'Entwicklungsstellungen'); pruefeGleich(s0.stellungen.H, 6, 'Handpartien');
  pruefeGleich(s0.pflichtfehler.schnittmenge.length, 0, 'Schnittmenge leer');
  const st = liesJsonl(path.join(g.z.aus, 'stellungen.jsonl'));
  pruefe(st.every(x => x.brett.length === 361 && /^[.XO]+$/.test(x.brett)), 'jede Stellung ist ein Brett aus 361 Zeichen');
  pruefe(st.filter(x => x.art === 'V').every(x => [250, 300, 350].includes(x.index)), 'V nur an den festgeschriebenen Indizes');
  pruefeGleich(JSON.stringify(W.V_INDIZES), '[250,300,350]', 'Indizes festgeschrieben');
});

test('Ganze Kette (drei Stände in drei Prozessen): gültig, Betroffene gleich einer unabhängigen Rechnung', () => {
  const g = grund();
  for (const n of ['alt', 'testkopie', 'neu']) pruefeGleich(g.r[n].status, 0, `rechnen ${n}: ${g.r[n].stderr}`);
  pruefeGleich(g.v.status, 0, 'vergleichen gültig: ' + g.v.stdout.slice(0, 1500));
  const b = liesJson(path.join(g.v.aus, 'bericht.json')), betroffen = liesJsonl(path.join(g.v.aus, 'betroffen.jsonl')), st = new Map(liesJsonl(path.join(g.z.aus, 'stellungen.jsonl')).map(x => [x.id, x]));
  pruefeGleich(b.gueltig, true, 'gültig'); pruefe(b.kontrollen.every(k => k.ok), 'alle Kontrollen bestanden');
  pruefe(betroffen.length >= 1, 'in der Attrappe gibt es betroffene Stellungen (sonst ist der Test ohne Aussage)');
  /* unabhängig: jede Stellung mit der Engine rechnen, Mengen vergleichen */
  let erwartet = 0;
  for (const [id, s] of st) {
    if (s.art !== 'S' && s.art !== 'V') continue;
    const br = B.brettAusText(s.brett), aus = B.indizes(E.toteSteineAmEnde(br)), an = B.indizes(E.toteSteineAmEnde(br, undefined, undefined, true));
    if (aus.join() !== an.join()) {
      erwartet++;
      const x = betroffen.find(y => y.id === id);
      pruefe(!!x, `${id} fehlt in betroffen.jsonl`);
      pruefeGleich(JSON.stringify(x.zusaetzlichTot), JSON.stringify(an.filter(i => !aus.includes(i)).map(L.zuGtp)), `${id}: zusätzlich tot`);
      pruefeGleich(JSON.stringify(x.wiederLebend), JSON.stringify(aus.filter(i => !an.includes(i)).map(L.zuGtp)), `${id}: wieder lebend`);
    }
  }
  pruefeGleich(betroffen.length, erwartet, 'genau die betroffenen Stellungen, keine weiteren');
  const summe = art => b.betroffenheit.find(e => e.gruppe.startsWith('Summe') && e.art === art);
  pruefeGleich(summe('V').stellungen, summe('V250').stellungen + summe('V300').stellungen + summe('V350').stellungen, 'V ist die Summe der Indizes');
  pruefeGleich(summe('S').stellungen + summe('V').stellungen, [...st.values()].filter(x => x.art === 'S' || x.art === 'V').length, 'alle Prüfstellungen gezählt');
  pruefeGleich(summe('S').betroffen + summe('V').betroffen, betroffen.length, 'Betroffenheit gleich der Liste');
  pruefe(b.betroffenheit.every(e => e.cp.unten <= e.anteil && e.anteil <= e.cp.oben), 'Clopper-Pearson umschließt den Anteil');
  pruefeGleich(b.handpartien.length, 6, 'sechs Handpartien getrennt berichtet');
  pruefe(b.entwicklung.hinweis.includes('nicht Teil der Auswertung'), 'Entwicklungsstellungen nicht in der Auswertung');
  const md = fs.readFileSync(path.join(g.v.aus, 'bericht.md'), 'utf8');
  pruefe(md.includes('Partien mit gleicher Zugfolge wie eine Quellpartie und Stellungen mit einem Entwicklungsbrett oder einem bereits in derselben Stellungsart erfassten Brett werden aus der Hauptprüfung ausgeschlossen (§14.4).'), 'Bericht erklärt die Ausschlüsse nach §14.4');
  pruefe(!md.includes('Duplikate (gleiche Zugfolge) zählen mehrfach'), 'Bericht enthält den veralteten Duplikatsatz nicht');
  pruefe(md.includes('zu wenig Betroffene') && /Keine Aussage|keine Aussage zur Richtigkeit/.test(md), 'Bericht: zu wenig Betroffene, keine Aussage zur Richtigkeit');
});

test('Ungültig, nie ein Urteil: Kontrollen §7 Nr. 3 und 4, Vollständigkeit', () => {
  const g = grund(), mutiere = (name, datei, f, extra = []) => {
    const verz = fs.mkdtempSync(path.join(tmp, 'm-'));
    for (const n of ['alt', 'testkopie', 'neu']) fs.copyFileSync(path.join(g.verz, n + '.jsonl'), path.join(verz, n + '.jsonl'));
    const z = liesJsonl(path.join(verz, datei + '.jsonl')); f(z);
    fs.writeFileSync(path.join(verz, datei + '.jsonl'), z.map(x => JSON.stringify(x)).join('\n') + '\n');
    const v = vergleiche(verz, g.z.aus, 'v', extra);
    pruefeGleich(v.status, 1, `${name}: Exit 1`);
    const b = liesJson(path.join(v.aus, 'bericht.json'));
    pruefeGleich(b.urteil, 'KEIN URTEIL', `${name}: KEIN URTEIL`); pruefeGleich(b.gueltig, false, `${name}: ungültig`);
    pruefeGleich(fs.readFileSync(path.join(v.aus, 'betroffen.jsonl'), 'utf8'), '', `${name}: keine Betroffenenliste bei ungültigem Lauf`);
    pruefe(fs.readFileSync(path.join(v.aus, 'bericht.md'), 'utf8').includes('KEIN URTEIL'), `${name}: Bericht nennt KEIN URTEIL`);
    return b;
  };
  const ersteMitTot = z => z.slice(1).find(x => x.aus.tot.length);
  let b = mutiere('Tot-Menge bei aus verändert', 'alt', z => { ersteMitTot(z).aus.tot.pop(); });
  pruefe(b.kontrollen.some(k => k.nr === '§7 Nr. 3' && !k.ok), 'Nr. 3 schlägt an');
  b = mutiere('Test-Kopie weicht bei einer Entwicklungsstellung ab', 'testkopie', z => { const e = z.slice(1).find(x => x.id.startsWith('E|')); e.aus.tot = e.aus.tot.concat([360]); });
  pruefe(b.kontrollen.some(k => k.nr === '§7 Nr. 4' && !k.ok), 'Nr. 4 schlägt an');
  b = mutiere('Test-Kopie weicht auf einer Prüfstellung ab', 'testkopie', z => { const e = z.slice(1).find(x => x.id.endsWith('|V300') && x.aus.vorschau); e.aus.vorschau.flaeche.hash = 'x'; });
  pruefe(b.kontrollen.some(k => k.nr === 'Setzung' && !k.ok), 'zusätzliche Kontrolle schlägt an');
  b = mutiere('gleicher Prozess', 'testkopie', z => { z[0].kopf.pid = liesJsonl(path.join(g.verz, 'alt.jsonl'))[0].kopf.pid; });
  pruefe(b.kontrollen.some(k => k.nr === 'Vollständigkeit' && !k.ok), 'Prozesskontrolle schlägt an');
  b = mutiere('Stellung fehlt', 'neu', z => { z.splice(5, 1); });
  pruefe(b.kontrollen.some(k => k.nr === 'Vollständigkeit' && !k.ok), 'Vollständigkeit schlägt an');
  b = mutiere('falsche SHA der unveränderten Fassung', 'alt', () => {}, ['--erwartet-sha-alt', 'f'.repeat(64)]);
  pruefe(b.kontrollen.some(k => k.nr === 'Vollständigkeit' && !k.ok), 'SHA-Kontrolle schlägt an');
  b = mutiere('gleiche Tot-Menge, andere Vorschau (innere Konsistenz)', 'neu', z => { const x = z.slice(1).find(y => y.id.endsWith('|V250') && y.aus.tot.join() === y.an.tot.join()); x.an.vorschau.flaeche.hash = 'y'; });
  pruefe(b.kontrollen.some(k => k.nr === 'Innere Konsistenz' && !k.ok), 'innere Konsistenz schlägt an');
});

test('Ungültig in Schritt 0: fehlende Quellpartie, unspielbare Partie, abweichende Gefangene, ungleiche Entwicklungsdaten', () => {
  const fall = (name, baue, erwartet) => {
    const verz = fs.mkdtempSync(path.join(tmp, 's-'));
    const {a, b, entw} = baue();
    schreibeEntwicklung(verz, entw);
    const z = ziehe(verz, 'z', schreibeArchiv(verz, a, b));
    pruefeGleich(z.status, 1, `${name}: Exit 1`);
    const s0 = liesJson(path.join(z.aus, 'schritt0.json'));
    pruefeGleich(s0.gueltig, false, `${name}: ungültig`);
    pruefe(JSON.stringify(s0.pflichtfehler).includes(erwartet), `${name}: Grund „${erwartet}“ genannt: ${JSON.stringify(s0.pflichtfehler).slice(0, 300)}`);
    return verz;
  };
  fall('Quellpartie fehlt im Archiv', () => ({a: GRUPPE_A.filter(r => r.nr !== 2), b: GRUPPE_B, entw: x => x}), 'nicht in den angegebenen Archivdateien');
  fall('Partie nicht einspielbar', () => ({a: GRUPPE_A.map(r => (r.nr === 3 ? {...r, zuege: [r.zuege[0], r.zuege[0], ...r.zuege.slice(2)]} : r)), b: GRUPPE_B, entw: x => x}), 'Punkt besetzt');
  fall('Gefangene weichen ab', () => ({a: GRUPPE_A.map(r => (r.nr === 3 ? {...r, gefangen: {wir: r.gefangen.wir + 1, gegner: r.gefangen.gegner}} : r)), b: GRUPPE_B, entw: x => x}), 'Gefangene weichen ab');
  fall('Einheiten und Ergebniszeilen sind nicht dieselbe Menge', () => ({a: GRUPPE_A, b: GRUPPE_B, entw: x => x.slice(1)}), 'nicht dieselbe Menge');
  fall('Partienummer doppelt', () => ({a: GRUPPE_A.concat([{...GRUPPE_A[0]}]), b: GRUPPE_B, entw: x => x}), 'Partienummer doppelt');
});

test('rechnen verweigert die falsche Fassung', () => {
  const g = grund(), st = path.join(g.z.aus, 'stellungen.jsonl');
  let r = lauf('rechnen', '--stand', 'neu', '--html', path.join(g.verz, 'alt', 'index.html'), '--stellungen', st, '--aus', path.join(g.verz, 'x1.jsonl'));
  pruefe(r.status !== 0 && /erwartet 0|undefined/.test(r.stderr), '--stand neu mit der unveränderten Fassung: ' + r.stderr.slice(0, 200));
  r = lauf('rechnen', '--stand', 'alt', '--html', htmlNeu, '--stellungen', st, '--aus', path.join(g.verz, 'x2.jsonl'));
  pruefe(r.status !== 0 && /kennt den Schalter/.test(r.stderr), '--stand alt mit der neuen Fassung: ' + r.stderr.slice(0, 200));
  r = lauf('rechnen', '--stand', 'alt', '--html', path.join(g.verz, 'alt', 'index.html'), '--stellungen', st, '--aus', path.join(g.verz, 'x3.jsonl'), '--erwartet-sha', '0'.repeat(64));
  pruefe(r.status !== 0 && /weicht ab/.test(r.stderr), 'falsche SHA wird abgelehnt');
  r = lauf('rechnen', '--stand', 'sonst', '--html', htmlNeu, '--stellungen', st, '--aus', path.join(g.verz, 'x4.jsonl'));
  pruefe(r.status !== 0, 'unbekannter Stand');
});

/* Synthetische Ergebnisse für die Fallabdeckung und den Mindestumfang */
const leer = {flaeche: {schwarz: 0, weiss: 0, stand: -7.5}, territory: {schwarz: 0, weiss: 0, stand: -7.5}};
const vor = {flaeche: {hash: 'h', standNur: -7.5, standMit: -7.5, anzahl: {}, sicher: true}, territory: {hash: 'h', standNur: -7.5, standMit: -7.5, anzahl: {}, sicher: true}};
const einStein = p => '.'.repeat(p) + 'X' + '.'.repeat(360 - p);
const stell = [{id: 'E|x', art: 'E', gruppe: 'g', quelle: 'q', nr: 1, index: 5, partie: null, kiFarbe: 1, komi: 7.5, brett: einStein(0)},
  {id: 'g|q|1|S', art: 'S', gruppe: 'g', quelle: 'q', nr: 1, index: 5, partie: 'g|q|1', kiFarbe: 1, komi: 7.5, brett: einStein(1)},
  {id: 'g|q|1|V250', art: 'V', gruppe: 'g', quelle: 'q', nr: 1, index: 250, partie: 'g|q|1', kiFarbe: 1, komi: 7.5, brett: einStein(2)}];
const stand = (n, pid, sha_, tots) => ({kopf: {stand: n, htmlSha256: sha_, pid}, reihenfolge: stell.map(s => s.id),
  jeId: new Map(stell.map((s, i) => [s.id, {id: s.id, aus: s.art === 'E' ? {tot: tots[i]} : s.art === 'S' ? {tot: tots[i], zaehl: leer} : {tot: tots[i], vorschau: vor},
    an: s.art === 'E' ? {tot: tots[i]} : s.art === 'S' ? {tot: tots[i], zaehl: leer} : {tot: tots[i], vorschau: vor}}]))});
const s0ok = {pflichtfehler: {daten: [], replay: [], schnittmenge: []}, ausgeschlossen: {partieGleichQuelle: 0, S: {entwicklung: 0, doppelt: 0}, V: {entwicklung: 0, doppelt: 0}}};

test('Fallabdeckung: leere Tot-Mengen oder ein Schalter ohne Wirkung ergeben KEIN URTEIL, nicht „gleich“', () => {
  const alle = (t) => [t, t, t];
  const r = W.vergleichen(stell, s0ok, stand('alt', 1, 'a', alle([])), stand('testkopie', 2, 'a', alle([])), stand('neu', 3, 'n', alle([])), null);
  pruefeGleich(r.bericht.gueltig, false, 'ungültig'); pruefeGleich(r.bericht.urteil, 'KEIN URTEIL', 'KEIN URTEIL');
  pruefe(r.bericht.kontrollen.some(k => k.nr === 'Vorprüfung' && !k.ok), 'Vorprüfung schlägt an');
  /* mit Tot-Mengen, aber der Schalter ändert in den Entwicklungsstellungen nichts */
  const r2 = W.vergleichen(stell, s0ok, stand('alt', 1, 'a', alle([4])), stand('testkopie', 2, 'a', alle([4])), stand('neu', 3, 'n', alle([4])), null);
  pruefeGleich(r2.bericht.gueltig, false, 'Schalter ohne Wirkung: ungültig');
  pruefe(JSON.stringify(r2.bericht.kontrollen).includes('ohne Aussagekraft'), 'Grund: Kontrolle ohne Aussagekraft');
});

test('Zu wenig Betroffene: Befund wird beschrieben, die Kandidatur bleibt offen', () => {
  const neuS = stand('neu', 3, 'n', [[4], [4], [4]]);
  neuS.jeId.get('E|x').an = {tot: []};                        /* der Schalter ändert eine Entwicklungsstellung ... */
  const testS = stand('testkopie', 2, 'a', [[], [4], [4]]);   /* ... genau wie die Test-Kopie */
  const r = W.vergleichen(stell, s0ok, stand('alt', 1, 'a', [[4], [4], [4]]), testS, neuS, null);
  pruefeGleich(r.bericht.gueltig, true, 'gültig: ' + JSON.stringify(r.bericht.gruende));
  pruefeGleich(r.bericht.mindestumfang.S, false, 'Mindestumfang S nicht erreicht'); pruefeGleich(r.bericht.mindestumfang.V, false, 'Mindestumfang V nicht erreicht');
  pruefe(r.md.includes('Kein Urteil über die Kandidatur: zu wenig Betroffene'), 'Wortlaut „kein Urteil über die Kandidatur: zu wenig Betroffene“');
  pruefeGleich(r.betroffen.length, 0, 'keine betroffene Prüfstellung');
  pruefe(!/positive Kandidatur|unbedenklich\b(?!“)/.test(r.md.replace(/\(nicht „unbedenklich“\)/g, '')), 'Bericht sagt nicht „unbedenklich“ oder „positive Kandidatur“');
  /* Schlechte Daten: S-Stellung mit Tot-Menge bei aus ≠ alt */
  const schlecht = stand('neu', 3, 'n', [[4], [5], [4]]); schlecht.jeId.get('E|x').an = {tot: []};
  pruefeGleich(W.vergleichen(stell, s0ok, stand('alt', 1, 'a', [[4], [4], [4]]), testS, schlecht, null).bericht.gueltig, false, 'abweichende Tot-Menge bei aus ist ungültig');
});

test('Duplikate (§14.4): gleiche Zugfolge wie Quellpartie, Entwicklungsbrett, doppeltes Brett aus anderer Zugfolge; erster Vertreter bleibt', () => {
  const verz = fs.mkdtempSync(path.join(tmp, 'd-'));
  /* Duplikate stehen am Dateiende: der Vertreter ist der frühere Eintrag in Dateireihenfolge */
  const kopie = (nr, von, aender) => ({...von, nr, ...aender(von)});
  const q2 = GRUPPE_A.find(r => r.nr === 2), p3 = GRUPPE_A.find(r => r.nr === 3), p4 = GRUPPE_A.find(r => r.nr === 4), p5 = GRUPPE_A.find(r => r.nr === 5);
  const tausche = r => { const z = r.zuege.slice(); [z[0], z[2]] = [z[2], z[0]]; return z; };   /* zwei frühe Schwarzzüge vertauscht: andere Zugfolge, gleiche Bretter */
  const dups = [
    kopie(20, q2, r => ({wirFarbe: r.wirFarbe === 'S' ? 'W' : 'S', gefangen: {wir: r.gefangen.gegner, gegner: r.gefangen.wir}})),   /* gleiche Zugfolge wie Quellpartie, andere Farbe der KI */
    kopie(21, p3, r => ({wirFarbe: r.wirFarbe === 'S' ? 'W' : 'S', gefangen: {wir: r.gefangen.gegner, gegner: r.gefangen.wir}})),   /* ganze Partie doppelt im Prüfsatz */
    kopie(22, p4, r => ({zuege: tausche(r)}))];                                                                                    /* andere Zugfolge, gleiche Bretter */
  schreibeEntwicklung(verz, rows => {   /* eine Entwicklungsstellung gleicht V300 der Prüfpartie 5 */
    const sp = W.spielEin(E, W.folgeAusArchiv(p5), [300]);
    rows[0].diagnose.anfang.brett = sp.snaps[300].brett; return rows;
  });
  const z = ziehe(verz, 'z', schreibeArchiv(verz, GRUPPE_A.concat(dups), GRUPPE_B));
  pruefeGleich(z.status, 0, 'gültig: ' + z.stdout.slice(-400));
  const s0 = liesJson(path.join(z.aus, 'schritt0.json')), a = s0.gruppen[0], ids = new Set(liesJsonl(path.join(z.aus, 'stellungen.jsonl')).map(x => x.id));
  const k = nr => `Gruppe A|attrappe/A.jsonl.gz|${nr}`;
  pruefeGleich(a.ausgeschlossen.partieGleichQuelle, 1, 'Partie gleich Quellpartie (ohne Farbe der KI erkannt)');
  pruefe(![...ids].some(i => i.startsWith(k(20) + '|')), 'Partie 20 ist ganz ausgeschlossen');
  pruefeGleich(a.pruefpartien, 12, 'Prüfpartien: 10 + 2 (die Quell-Duplikatpartie zählt nicht)');
  pruefeGleich(a.gleicheZugfolgeImPruefsatz, 1, 'gleiche Zugfolge im Prüfsatz nur gezählt');
  pruefe(ids.has(k(3) + '|S') && !ids.has(k(21) + '|S'), 'Partie 3 bleibt (erster Vertreter), die Kopie 21 nicht');
  pruefe(ids.has(k(4) + '|V300') && !ids.has(k(22) + '|V300') && !ids.has(k(22) + '|S'), 'Brettvergleich: Partie 22 (andere Zugfolge, gleiche Bretter) ist ausgeschlossen');
  pruefe(!ids.has(k(5) + '|V300') && ids.has(k(5) + '|V250') && ids.has(k(5) + '|S'), 'V300 von Partie 5 gleicht einem Entwicklungsbrett: nur diese Stellung entfällt');
  pruefeGleich(a.ausgeschlossen.V.entwicklung, 1, 'V gleich Entwicklungsbrett: 1');
  pruefeGleich(a.ausgeschlossen.S.doppelt, 2, 'S doppelt: Partie 21 und 22');
  pruefe(a.ausgeschlossen.V.doppelt >= 4, 'V doppelt: mindestens je zwei Indizes der Partien 21 und 22: ' + a.ausgeschlossen.V.doppelt);
  pruefeGleich(a.s.behalten, a.s.auswertbar - a.ausgeschlossen.S.entwicklung - a.ausgeschlossen.S.doppelt, 'S: möglich minus ausgeschlossen gleich behalten');
  pruefeGleich(a.v[250] + a.v[300] + a.v[350] - a.vBehalten[250] - a.vBehalten[300] - a.vBehalten[350], a.ausgeschlossen.V.entwicklung + a.ausgeschlossen.V.doppelt, 'V: möglich minus behalten gleich ausgeschlossen');
  pruefeGleich(s0.ausgeschlossen.V.doppelt, a.ausgeschlossen.V.doppelt + s0.gruppen[1].ausgeschlossen.V.doppelt, 'Summe über die Gruppen');
  /* kein Duplikat in der Hauptprüfung, deterministisch (zweiter Lauf byte-gleich), Hash-Vergleich der Bretter */
  const st = liesJsonl(path.join(z.aus, 'stellungen.jsonl')).filter(x => x.art === 'S' || x.art === 'V'), eb = new Set(liesJsonl(path.join(verz, 'entw', 'teile', 'teil-1.jsonl')).map(x => x.diagnose.anfang.brett));
  for (const art of ['S', 'V']) { const b = st.filter(x => x.art === art).map(x => x.brett); pruefeGleich(new Set(b).size, b.length, `${art}: keine doppelten Bretter`); pruefe(b.every(x => !eb.has(x)), `${art}: kein Entwicklungsbrett`); }
  const z2 = ziehe(verz, 'z2', { A: path.join(verz, 'docs/daten/attrappe/A.jsonl.gz'), B: path.join(verz, 'docs/daten/attrappe/B.jsonl.gz') });
  pruefeGleich(fs.readFileSync(path.join(z2.aus, 'stellungen.jsonl'), 'utf8'), fs.readFileSync(path.join(z.aus, 'stellungen.jsonl'), 'utf8'), 'zweiter Lauf: gleiche Stellungen in gleicher Reihenfolge');
  pruefe(fs.readFileSync(path.join(z.aus, 'schritt0.md'), 'utf8').includes('Duplikate'), 'Schritt-0-Bericht nennt die Ausschlüsse');
});

test('Duplikat-Kontrolle in vergleichen: Entwicklungsbrett oder doppeltes Brett in der Hauptprüfung ergibt KEIN URTEIL', () => {
  const alle = t => [t, t, t];
  const probe = st => W.vergleichen(st, s0ok, stand('alt', 1, 'a', alle([4])), stand('testkopie', 2, 'a', alle([4])), stand('neu', 3, 'n', alle([4])), null);
  let r = probe(stell.map(x => (x.art === 'S' ? {...x, brett: stell[0].brett} : x)));
  pruefeGleich(r.bericht.gueltig, false, 'S gleicht dem Entwicklungsbrett: ungültig'); pruefe(r.bericht.kontrollen.some(k => k.nr === '§14.4' && !k.ok), 'Kontrolle §14.4 schlägt an');
  r = probe([...stell, {...stell[2], id: 'g|q|2|V300', index: 300, partie: 'g|q|2'}]);   /* gleiches Brett wie g|q|1|V250 */
  pruefe(r.bericht.kontrollen.some(k => k.nr === '§14.4' && !k.ok), 'doppeltes V-Brett schlägt an');
  const ok = W.vergleichen(stell.map(x => ({...x})), s0ok, stand('alt', 1, 'a', alle([4])), stand('testkopie', 2, 'a', alle([4])), stand('neu', 3, 'n', alle([4])), null);
  pruefe(ok.bericht.kontrollen.find(k => k.nr === '§14.4').ok, 'verschiedene Bretter: Kontrolle bestanden');
  /* S und V werden nicht gegeneinander abgeglichen */
  const sv = stell.map(x => (x.art === 'V' ? {...x, brett: stell[1].brett} : x));
  pruefe(W.vergleichen(sv, s0ok, stand('alt', 1, 'a', alle([4])), stand('testkopie', 2, 'a', alle([4])), stand('neu', 3, 'n', alle([4])), null).bericht.kontrollen.find(k => k.nr === '§14.4').ok, 'gleiches Brett in S und V ist erlaubt');
});

test('Workflow diagonal-pruefung.yml: nur manuell, ohne GNU Go, drei getrennte Prozesse, Fassung gebunden', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagonal-pruefung.yml'), 'utf8');
  pruefe(/^on:\n\s+workflow_dispatch:\s*$/m.test(y) && !/\bpush:|\bschedule:|\bpull_request:/.test(y), 'nur workflow_dispatch');
  pruefe(/NICHT STARTEN ohne ausdrückliches Go/.test(y), 'Hinweis „nicht starten ohne Go“');
  pruefe(y.includes('ubuntu-24.04') && !/gnugo|gnu go installieren/i.test(y.replace(/^#.*$/gm, '')), 'Runner ubuntu-24.04, GNU Go wird nicht installiert');
  for (const s of ['alt', 'testkopie', 'neu']) pruefe(new RegExp(`diagonal-pruefung\\.js rechnen[\\s\\S]*?--stand ${s}\\b`).test(y), `eigener Schritt für --stand ${s}`);
  pruefe(y.includes('c504143') && y.includes('d3bcb1cc54c56f0729cf80d36a462fd564a69ed4561fccbe2d42efba461fa69b'), 'unveränderte Fassung: Commit und SHA-256 gebunden');
  pruefe(/fetch-depth: 0/.test(y), 'volle Historie für git show');
  pruefe(y.includes('|| status=$?'), 'Exit-Codes werden mit || status=$? abgefangen');
  pruefe(/sha256sum|SHA256SUMS/.test(y), 'Prüfsumme des Stufe-C-Artefakts wird geprüft');
  pruefeGleich((y.match(/--gruppe "/g) || []).length, 4, 'vier Gruppen');
});

laufeTests('Diagonalprüfung, Stufe-1-Werkzeug').then(ok => process.exit(ok ? 0 : 1));
