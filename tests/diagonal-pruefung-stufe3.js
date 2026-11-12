// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Stufe-3-Werkzeug der Diagonalprüfung (docs/diagonalpruefung-vorabfestlegung.md §6, §8, §10.4, AP5), ohne Beurteiler und ohne die echten Archive:
   Attrappe aus Zufallspartien, Stufe-1-Dateien vom Werkzeug von Stufe 1, Stufe-2-Ergebnisse synthetisch (GNU Gos Tot-Liste wie die App mit, ohne oder
   ohne Diagonalprüfung), die Antworten der Beurteiler schreibt der Test selbst.
     1. Einspielen mit Ko, Pässen und letzten Zügen (handgebautes Ko), SGF-Rundreise, Textdiagramm.
     2. Unterlage: Zugfarbe, Gefangene, Pässe, Ko-Punkt, letzte Züge, markierte Kette, Spielende nur bei der Endstellung.
     3. Paket: deterministisch, zufällige Kennungen und Reihenfolge, KEINE Herkunft (Programm, Gruppe, Menge, Urteile von App und GNU Go) in irgendeiner Datei.
     4. Antwortbogen: jede Kennung genau einmal, Kategorien, Begründung, Sicherheit, Teilurteile bei Ko, „offen“; falsches Manifest.
     5. Auswertung nach §6.4: R+, R−, gleich richtig, gleich falsch, ungeklärt, zwei Beurteilergruppen mit Widerspruch.
     6. Ganzer Ablauf in eigenen Prozessen (unterlagen, pruefen, auswerten), Befund nach §8 mit jeder Bedingung einzeln; Probe-Paket; Bogen eines anderen Pakets.
     7. Workflow: nur manuell, kein GNU Go, beide ZIPs gegen ihre SHA-256 geprüft.
   Aufruf:  node tests/diagonal-pruefung-stufe3.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), zlib = require('zlib'), crypto = require('crypto'), {spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, ladeKI} = require('./rahmen');
const L = require('../auswertung/endspiel/passregel-lib.js');
const B = require('./diagonalauge-brett.js');
const W = require('../auswertung/endspiel/diagonal-pruefung.js');
const S2 = require('../auswertung/endspiel/diagonal-pruefung-stufe2.js');
const S3 = require('../auswertung/endspiel/diagonal-pruefung-stufe3.js');

const wurzel = path.join(__dirname, '..');
const werkzeug = path.join(wurzel, 'auswertung/endspiel/diagonal-pruefung-stufe3.js');
const htmlPfad = path.join(wurzel, 'index.html');
const E = ladeKI({htmlPfad, mitNetz: false});
const sha = t => crypto.createHash('sha256').update(t).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'diagonal-stufe3-'));
process.on('exit', () => { if (process.env.DIAGONAL_STUFE3_BEHALTEN) { console.log('Arbeitsverzeichnis: ' + tmp); return; } try { fs.rmSync(tmp, {recursive: true, force: true}); } catch (e) { /* egal */ } });
const liesJson = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const schreibeJsonl = (p, z) => fs.writeFileSync(p, z.map(x => JSON.stringify(x)).join('\n') + '\n');
const lauf = (args, env = {}) => spawnSync(process.execPath, [werkzeug, ...args], {encoding: 'utf8', maxBuffer: 1 << 28, env: {...process.env, ...env}});

/* ── Attrappe ──────────────────────────────────────────────────────────── */
function spiel(seed, laenge) {
  const rnd = L.mulberry32(seed), b = new Uint8Array(361), zuege = [];
  let f = 1;
  for (let k = 0; k < laenge; k++) {
    let ok = false;
    for (let t = 0; t < 30 && !ok; t++) {
      const i = Math.floor(rnd() * 361);
      if (b[i]) continue;
      b[i] = f; E.removeDeadGroups(b, 3 - f, i);
      if (E.floodFill(b, i).liberties.length === 0) { b[i] = 0; continue; }
      zuege.push(L.zuGtp(i)); ok = true;
    }
    if (!ok) zuege.push('pass');
    f = 3 - f;
  }
  zuege.push('pass', 'pass');
  return zuege;
}
const LAENGEN = [340, 330, 360, 300, 355, 380, 320, 372, 348, 364, 250, 262];
function baueGrund(betroffenS = 658, betroffenV = 1060) {
  const verz = fs.mkdtempSync(path.join(tmp, 'g-')), daten = path.join(verz, 'daten', 'attrappe');
  fs.mkdirSync(daten, {recursive: true});
  const partien = LAENGEN.map((l, k) => ({nr: k + 1, wirFarbe: 'S', beginnt: 'S', vorgabe: 0, komi: 7.5, vorgabeSteine: [], aufgabe: null, endstand: -10.5, zuege: spiel(3000 + k * 13, l)}));
  fs.writeFileSync(path.join(daten, 'A.jsonl.gz'), zlib.gzipSync(partien.map(r => JSON.stringify(r)).join('\n') + '\n'));
  const stellungen = [];
  for (const r of partien) {
    const folge = W.folgeAusArchiv(r), sp = W.spielEin(E, folge, [250, 300, 350].filter(i => folge.length > i));
    const basis = {gruppe: 'Gruppe A', quelle: 'attrappe/A.jsonl.gz', nr: r.nr, partie: `Gruppe A|attrappe/A.jsonl.gz|${r.nr}`, kiFarbe: 1, komi: 7.5};
    stellungen.push({id: `${basis.partie}|S`, art: 'S', ...basis, index: folge.length - 1, brett: B.brettZuText(sp.brett), caps: [sp.caps[1], sp.caps[2]]});
    for (const i of [250, 300, 350]) if (sp.snaps[i]) stellungen.push({id: `${basis.partie}|V${i}`, art: 'V', ...basis, index: i, brett: sp.snaps[i].brett, caps: [sp.snaps[i].caps[1], sp.snaps[i].caps[2]]});
  }
  const neu = W.rechnen(E, {stand: 'neu'}, stellungen, sha(fs.readFileSync(htmlPfad))), jeId = new Map(neu.slice(1).map(z => [z.id, z]));
  const betroffen = stellungen.filter(s => JSON.stringify(jeId.get(s.id).aus.tot) !== JSON.stringify(jeId.get(s.id).an.tot));
  const s1 = path.join(verz, 'stufe1'); fs.mkdirSync(s1);
  schreibeJsonl(path.join(s1, 'stellungen.jsonl'), stellungen); schreibeJsonl(path.join(s1, 'neu.jsonl'), neu); schreibeJsonl(path.join(s1, 'betroffen.jsonl'), betroffen.map(s => ({id: s.id})));
  /* Stufe 2 synthetisch: GNU Gos Tot-Liste wie App mit Diagonalprüfung (behoben), wie App ohne (neu entstanden) oder leer (unverändert abweichend) */
  const zeilen = betroffen.map((s, i) => {
    const z = jeId.get(s.id), dead = i % 3 === 0 ? z.an.tot : i % 3 === 1 ? z.aus.tot : [];
    return {id: s.id, art: s.art, gruppe: s.gruppe, quelle: s.quelle, nr: s.nr, index: s.index, kategorie: 'betroffen', status: 'gueltig', appTot: {aus: z.aus.tot, an: z.an.tot}, gnu: {dead}};
  });
  const nutz = zeilen.map(z => ({id: z.id, art: z.art, brett: stellungen.find(s => s.id === z.id).brett, appTotAus: z.appTot.aus, appTotAn: z.appTot.an, gnuDead: z.gnu.dead}));
  const auswahl = S2.waehleKetten(nutz, 1);
  const s2 = path.join(verz, 'stufe2'); for (const d of ['bericht', 'eingabe/plan', 'teile']) fs.mkdirSync(path.join(s2, d), {recursive: true});
  const bericht = (S, V) => ({gueltig: true, urteil: 'gültig', modus: 'haupt', plan: {basis: 1, paketgroesse: 50, zahlen: {betroffen: {S, V}, kontrolle: {S: 0, V: 0}, gesamt: zeilen.length, pakete: 1}}, ausfaelle: []});
  fs.writeFileSync(path.join(s2, 'bericht', 'bericht.json'), JSON.stringify(bericht(betroffenS, betroffenV)));
  fs.writeFileSync(path.join(s2, 'bericht', 'auswahl-stufe3.json'), JSON.stringify(auswahl));
  fs.writeFileSync(path.join(s2, 'eingabe', 'plan', 'plan.json'), JSON.stringify({basis: 1}));
  schreibeJsonl(path.join(s2, 'teile', 'teil-1.jsonl'), [{kopf: {teil: 1}}, ...zeilen]);
  return {verz, daten: path.join(verz, 'daten'), s1, s2, stellungen, auswahl, nutz, zeilen, bericht};
}
let GR = null;
const grund = () => GR || (GR = baueGrund());
const eingabe = g => S3.ladeEingabe({stufe1: g.s1, stufe2: g.s2, archiv: g.daten});
function paket(g = grund(), opt = {}) {
  const ein = eingabe(g), pe = S3.pruefeEingabe(ein);
  if (pe.gruende.length) throw new Error(pe.gruende.join(' ; '));
  return {ein, pe, p: S3.erzeugePaket(E, ein, pe.ketten, opt)};
}
const ALT = (p, a) => ({manifestSha256: p.manifest.manifestSha256, beurteiler: 'KI', antworten: a});
const antwort = (id, kat = 'tot', extra = {}) => ({id, kategorie: kat, begruendung: 'Die Kette hat nur eine echte Freiheit und kann nicht verbunden werden.', sicherheit: 'sicher', ...extra});
const wertVon = status => (status === 'tot' ? 'tot' : 'lebendig');

/* ── 1 Einspielen, SGF, Diagramm ──────────────────────────────────────── */
test('Einspielen: Ko-Punkt, Pässe, Gefangene (handgebautes Ko), kein Ko bei Schlagen mehrerer Steine', () => {
  const f = (farbe, g) => ({farbe, punkt: g === 'pass' ? -1 : L.vonGtp(g)});
  const folge = [f(1, 'E5'), f(2, 'F5'), f(1, 'D4'), f(2, 'E4'), f(1, 'E3'), f(2, 'F3'), f(1, 'pass'), f(2, 'G4'), f(1, 'F4')];
  const sp = S3.spielMitKo(E, folge);
  pruefeGleich(sp.fehler, null, 'spielbar'); pruefeGleich(sp.ko, L.vonGtp('E4'), 'Ko-Punkt E4 nach dem Schlagen von E4 durch F4'); pruefeGleich(sp.caps[1], 1, 'Schwarz hat 1 Stein geschlagen');
  pruefeGleich(S3.spielMitKo(E, [...folge, f(2, 'pass')]).ko, null, 'nach einem Pass ist kein Ko mehr');
  pruefeGleich(S3.spielMitKo(E, folge.slice(0, 8)).ko, null, 'ohne das Schlagen kein Ko');
  const zwei = S3.spielMitKo(E, [f(1, 'A1'), f(2, 'A2'), f(1, 'pass'), f(2, 'B1'), f(1, 'pass'), f(2, 'pass')]);
  pruefeGleich(zwei.paesseInFolge, 2, 'zwei Pässe in Folge am Ende (Schwarz, Weiß; davor ein Zug)'); pruefeGleich(zwei.letzterPasser, 2, 'zuletzt passte Weiß');
  pruefeGleich(S3.spielMitKo(E, [f(1, 'A1'), f(2, 'pass'), f(1, 'pass')]).paesseInFolge, 2, 'zwei Pässe in Folge'); pruefeGleich(S3.spielMitKo(E, [f(1, 'A1'), f(2, 'pass'), f(1, 'B1')]).paesseInFolge, 0, 'ein Zug nach dem Pass: keine Pässe am Ende');
  pruefe(/besetzt/.test(S3.spielMitKo(E, [f(1, 'A1'), f(2, 'A1')]).fehler), 'besetzter Punkt'); pruefe(/Selbstmord/.test(S3.spielMitKo(E, [f(1, 'B1'), f(1, 'A2'), f(2, 'A1')]).fehler), 'Selbstmord');
  const mehr = S3.spielMitKo(E, [f(1, 'A2'), f(2, 'A1'), f(1, 'B2'), f(2, 'T19'), f(1, 'B1')]);
  pruefeGleich(mehr.caps[1], 1, 'Stein in der Ecke geschlagen'); pruefeGleich(mehr.ko, null, 'ein Stein geschlagen, aber die schlagende Gruppe hat mehr als einen Stein: kein Ko');
});
test('SGF: Rundreise über den SGF-Leser von Stufe 1, Pässe, Zugfarben', () => {
  const g = grund(), s = g.stellungen.find(x => x.art === 'S'), rec = L.leseJsonl(path.join(g.daten, s.quelle)).find(r => r.nr === s.nr), folge = W.folgeAusArchiv(rec).slice(0, s.index + 1);
  const sg = W.leseSgf(S3.sgfVon(folge));
  pruefeGleich(sg.folge.length, folge.length, 'Zahl der Züge'); pruefe(sg.folge.every((z, i) => z.farbe === folge[i].farbe && z.punkt === folge[i].punkt), 'jeder Zug (Farbe, Punkt, Pass) gleich'); pruefeGleich(sg.komi, 7.5, 'Komi');
  pruefe(!/GNU|Fuego|Programm/i.test(S3.sgfVon(folge)), 'keine Herkunft im SGF');
});
test('Textdiagramm: Koordinaten, markierte Kette, Steinzahlen', () => {
  const brett = new Uint8Array(361); brett[0] = 1; brett[1] = 1; brett[20] = 2; brett[360] = 2;
  const d = S3.diagramm(brett, [0, 1]), zeilen = d.split('\n');
  pruefeGleich(zeilen.length, 21, '19 Zeilen und zwei Kopfzeilen'); pruefe(/A B C D E F G H J K L M N O P Q R S T/.test(zeilen[0]) && !/ I /.test(zeilen[0]), 'Spalten A bis T ohne I');
  pruefeGleich((d.match(/@/g) || []).length, 2, 'zwei markierte Steine'); pruefeGleich((d.match(/X/g) || []).length, 0, 'markierte Steine erscheinen nur als @'); pruefeGleich((zeilen.slice(1, 20).join('\n').match(/O/g) || []).length, 2, 'zwei weiße Steine (nur in den Brettzeilen, die Spaltenköpfe enthalten ein O)');
  pruefe(/^19 {2}@ @/.test(zeilen[1]) && /^ 1 /.test(zeilen[19]), 'oben Zeile 19, unten Zeile 1');
});

/* ── 2 Unterlage und Paket ────────────────────────────────────────────── */
test('Auswahl der Stufe 2 wird an den Paketdaten nachgeprüft (verfälschte Auswahl: KEIN URTEIL)', () => {
  const g = grund(), ok = S3.pruefeEingabe(eingabe(g));
  pruefeGleich(ok.gruende.length, 0, 'unverfälscht: ' + ok.gruende.join(';')); pruefeGleich(ok.ketten.length, g.auswahl.b1.length + g.auswahl.b2Auswahl.length, 'jede Kette der Auswahl');
  const ein = eingabe(g); ein.auswahl = {...ein.auswahl, b1: ein.auswahl.b1.slice(1)};
  pruefe(/nicht gleich der Auswahl/.test(S3.pruefeEingabe(ein).gruende.join(' ')), 'fehlende B1-Kette wird erkannt');
  const e2 = eingabe(g); e2.bericht2 = {...e2.bericht2, gueltig: false}; pruefe(/nicht gültig/.test(S3.pruefeEingabe(e2).gruende.join(' ')), 'ungültiger Bericht der Stufe 2');
  const e3 = eingabe(g); e3.bericht2 = {...e3.bericht2, modus: 'probe'}; pruefe(/Modus/.test(S3.pruefeEingabe(e3).gruende.join(' ')), 'Probe-Bericht statt Hauptlauf');
  pruefe(g.auswahl.b1.length >= 3 && g.auswahl.b2Auswahl.length >= 3, 'die Attrappe hat B1 und B2 (' + g.auswahl.b1.length + ', ' + g.auswahl.b2Auswahl.length + ')');
});
test('Unterlage: Zugfarbe, Gefangene, Pässe, Ko, letzte Zehn, markierte Kette, Spielende nur bei der Endstellung, SGF eingebettet', () => {
  const {ein, pe, p} = paket(), aufd = p.aufdeckung;
  for (const [id, a] of Object.entries(aufd)) {
    const s = ein.pro.get(a.stellung), md = p.dateien[`unterlagen/${id}.md`], sgf = p.dateien[`unterlagen/${id}.sgf`];
    const rec = L.leseJsonl(path.join(ein.archiv, s.quelle)).find(r => r.nr === s.nr), folge = W.folgeAusArchiv(rec).slice(0, s.index + 1), sp = S3.spielMitKo(E, folge);
    pruefe(md.includes(`nach Zug ${folge.length}`), `${id}: Zugnummer`); pruefe(md.includes(`Als Nächstes am Zug wäre:** ${folge[folge.length - 1].farbe === 1 ? 'Weiß' : 'Schwarz'}`), `${id}: Zugfarbe`);
    pruefe(md.includes(`Schwarz hat ${sp.caps[1]} Steine geschlagen, Weiß ${sp.caps[2]}`), `${id}: Gefangene`);
    pruefe(s.art === 'S' ? md.includes('die Partie ist beendet') : md.includes('die Partie ist nicht beendet'), `${id}: Spielende nur bei der Endstellung`);
    pruefeGleich((md.match(/\d+\. (Schwarz|Weiß) /g) || []).length, 10, `${id}: letzte zehn Züge`); pruefe(md.includes(sgf.trimEnd()), `${id}: SGF eingebettet`);
    pruefe(md.includes(a.punkte.join(' ')), `${id}: Koordinaten der Kette`); pruefeGleich((md.match(/@/g) || []).length >= a.steine, true, `${id}: markierte Steine im Diagramm`);
    pruefe(/Ko-Punkt[^\n]*:\*\* (keiner|[A-T]\d+)/.test(md), `${id}: Ko-Zeile`); pruefe(/Pässe am Ende:/.test(md), `${id}: Pass-Zeile`);
  }
  pruefeGleich(Object.keys(aufd).length, pe.ketten.length, 'eine Unterlage je Kette');
});
test('Paket: deterministisch, zufällige Kennungen und Reihenfolge, Manifest bindet jede Datei', () => {
  const a = paket().p, b = paket().p;
  pruefeGleich(JSON.stringify(a.dateien), JSON.stringify(b.dateien), 'zweiter Lauf byte-gleich'); pruefeGleich(a.manifest.manifestSha256, b.manifest.manifestSha256, 'gleiches Manifest');
  const ids = a.manifest.reihenfolge; pruefeGleich(new Set(ids).size, ids.length, 'Kennungen eindeutig'); pruefe(ids.every(i => /^U-[0-9a-f]{6}$/.test(i)), 'Format U-xxxxxx');
  const mengen = ids.map(i => a.aufdeckung[i].menge), erstesB2 = mengen.indexOf('B2'), letztesB1 = mengen.lastIndexOf('B1');
  pruefe(erstesB2 >= 0 && letztesB1 > erstesB2, 'B1 und B2 sind in der Reihenfolge gemischt (nicht erst B1, dann B2)');
  const keys = Object.keys(a.aufdeckung).map(i => a.aufdeckung[i].schluessel); pruefeGleich(JSON.stringify(ids.map(i => a.aufdeckung[i].schluessel)) === JSON.stringify([...keys].sort()), false, 'Reihenfolge nicht nach Schlüssel sortiert');
  for (const [n, h] of Object.entries(a.manifest.dateien)) pruefeGleich(sha(a.dateien[n]), h, `${n}: SHA-256 im Manifest`);
  pruefeGleich(a.manifest.unterlagen, ids.length, 'Zahl der Unterlagen'); pruefeGleich(a.anzahlB1 + a.anzahlB2, ids.length, 'B1 plus B2');
  pruefe(Object.keys(a.dateien).filter(n => n.startsWith('unterlagen/')).length === 2 * ids.length, 'je Unterlage Markdown und SGF');
});
test('Paket enthält KEINE Herkunft: weder Programm noch Gruppe noch Menge noch Urteile von App oder GNU Go noch Regel der App', () => {
  const {p} = paket(), verboten = [/GNU/i, /Fuego/i, /PWA/i, /\bApp\b/, /Schalter/i, /Diagonal/i, /Stufe/i, /Gruppe A/i, /ohne Vorgabe/i, /Referenz/i, /Engine/i, /Maßstab/i, /behoben/i, /unver(ae|ä)ndert/i, /Kandidatur/i, /Menge/i, /Zelle/i, /Klasse/i, /Richtung/i, /_diagIsTrueEye/, /attrappe/i, /jsonl/i, /Programm/i, /betroffen/i];
  for (const [n, t] of Object.entries(p.dateien)) {
    for (const v of verboten) pruefe(!v.test(t), `${n}: enthält ${v}`);
    if (!n.startsWith('unterlagen/')) for (const v of [/B1\b/, /B2\b/]) pruefe(!v.test(t), `${n}: enthält ${v} (in Unterlagen sind B1 und B2 Brettkoordinaten)`);
    for (const a of Object.values(p.aufdeckung)) { pruefe(!t.includes(a.schluessel) && !t.includes(a.stellung) && !t.includes(a.partie), `${n}: Schlüssel oder Stellungskennung`); }
  }
  pruefe(!Object.keys(p.dateien).some(n => /geheim|aufdeckung/.test(n)), 'die Aufdeckung liegt nicht im Paket');
  const mf = JSON.parse(p.dateien['manifest.json']); pruefe(!/menge|zelle|klasse|richtung|app|gnu/i.test(JSON.stringify(Object.keys(mf))), 'Manifest ohne Herkunftsfelder');
  pruefe(/Kategorien/.test(p.dateien['anleitung-beurteiler.md']) && /echte und falsche Augen/.test(p.dateien['anleitung-beurteiler.md']), 'Anleitung nennt Kategorien und allgemeine Go-Begriffe');
  pruefe(/Du kennst nicht, woher die Stellungen stammen/.test(p.dateien['anleitung-beurteiler.md']), 'Anleitung sagt, dass die Herkunft unbekannt ist');
});
test('Probe-Paket: nur die gewünschte Zahl, eigenes Manifest (modus probe), Kennungen wie im Hauptpaket', () => {
  const haupt = paket().p, probe = paket(grund(), {probe: 3}).p;
  pruefeGleich(probe.manifest.unterlagen, 3, 'drei Unterlagen'); pruefeGleich(probe.manifest.modus, 'probe', 'Modus probe');
  pruefe(probe.manifest.manifestSha256 !== haupt.manifest.manifestSha256, 'anderes Manifest als das Hauptpaket'); pruefe(probe.manifest.reihenfolge.every(i => haupt.manifest.reihenfolge.includes(i)), 'Kennungen aus dem Hauptpaket');
  pruefeGleich(Object.keys(probe.dateien).filter(n => n.startsWith('unterlagen/')).length, 6, 'Markdown und SGF je Unterlage');
});

/* ── 3 Antwortbögen ───────────────────────────────────────────────────── */
test('Antwortbogen: jede Kennung genau einmal, zulässige Werte, Begründung, Teilurteile bei Ko, „offen“, Manifest', () => {
  const {p} = paket(), ids = p.manifest.reihenfolge, voll = () => ALT(p, ids.map(id => antwort(id)));
  pruefeGleich(S3.pruefeBogen(voll(), p.manifest).length, 0, 'vollständiger Bogen gültig');
  const mit = (aendere, muster, name) => { const b = voll(); aendere(b); const f = S3.pruefeBogen(b, p.manifest); pruefe(f.some(x => muster.test(x)), `${name}: ${f.slice(0, 2).join(' | ') || 'keine Fehler'}`); };
  mit(b => b.antworten.pop(), /nicht beantwortet/, 'fehlende Kennung'); mit(b => b.antworten.push(b.antworten[0]), /mehrfach beantwortet/, 'doppelte Kennung');
  mit(b => { b.antworten[0].id = 'U-ffffff'; }, /unbekannte Kennung/, 'unbekannte Kennung'); mit(b => { b.antworten[0].kategorie = 'vielleicht'; }, /Kategorie .* ungültig/, 'Kategorie');
  mit(b => { b.antworten[0].sicherheit = 'ganz sicher'; }, /Sicherheit .* ungültig/, 'Sicherheit'); mit(b => { b.antworten[0].begruendung = 'tot'; }, /Begründung fehlt oder ist kürzer/, 'Begründung zu kurz');
  mit(b => { b.antworten[0].kategorie = 'ko_zugabhaengig'; }, /urteilSchwarzAmZug .* ungültig/, 'Ko ohne Teilurteile'); mit(b => { b.antworten[0].urteilSchwarzAmZug = 'tot'; }, /nur bei ko_zugabhaengig erlaubt/, 'Teilurteil bei tot');
  mit(b => { b.antworten[0].sicherheit = 'unsicher'; }, /„offen“ fehlt/, 'unsicher ohne offen'); mit(b => { b.antworten[0].kategorie = 'nicht_entscheidbar'; }, /„offen“ fehlt/, 'nicht entscheidbar ohne offen');
  mit(b => { b.manifestSha256 = 'x'; }, /gehört nicht zu diesem Paket/, 'falsches Manifest'); pruefe(S3.pruefeBogen({}, p.manifest)[0].includes('Liste'), 'kein Bogen');
  const ok = voll(); ok.antworten[0] = antwort(ids[0], 'ko_zugabhaengig', {urteilSchwarzAmZug: 'lebendig', urteilWeissAmZug: 'tot', sicherheit: 'eher_sicher', offen: 'Ko-Drohungen nicht gelesen.'});
  pruefeGleich(S3.pruefeBogen(ok, p.manifest).length, 0, 'Ko mit beiden Teilurteilen und „offen“ ist gültig');
});

/* ── 4 Bewertung (rein) ───────────────────────────────────────────────── */
const urt = (kat, extra = {}) => ({gruppe: extra.gruppe || 'KI', ...S3.normiere({kategorie: kat, sicherheit: 'sicher', ...extra}), kategorie: kat});
const kette = (aus, an, gnu = 'tot') => ({appAus: aus, appAn: an, gnu});
test('Bewertung nach §6.4: R+, R−, gleich richtig, gleich falsch, ungeklärt (jede Ursache), App uneinheitlich', () => {
  const e = (k, u) => S3.bewerteKette(k, u).ergebnis, v = kette('tot', 'lebend'), v2 = kette('lebend', 'tot');
  pruefeGleich(e(v, [urt('lebendig')]), 'R+', 'aus tot, an lebend, Urteil lebendig: R+'); pruefeGleich(e(v, [urt('tot')]), 'R-', 'Urteil tot: R−');
  pruefeGleich(e(v2, [urt('tot')]), 'R+', 'aus lebend, an tot, Urteil tot: R+'); pruefeGleich(e(v2, [urt('lebendig')]), 'R-', 'Urteil lebendig: R−');
  pruefeGleich(e(v, [urt('tot', {sicherheit: 'unsicher'})]), 'ungeklaert', 'unsicher zählt für R− nicht (nur entschiedene, nicht unsichere Urteile)'); pruefeGleich(e(v, [urt('lebendig', {sicherheit: 'unsicher'})]), 'ungeklaert', 'unsicher bestätigt kein R+');
  pruefeGleich(e(v, [urt('lebendig', {sicherheit: 'eher_sicher'})]), 'R+', 'eher sicher ist nicht unsicher');
  for (const k of ['seki', 'nicht_entscheidbar']) pruefeGleich(e(v, [urt(k)]), 'ungeklaert', `${k}: ungeklärt`);
  pruefeGleich(e(v, [urt('ko_zugabhaengig', {urteilSchwarzAmZug: 'lebendig', urteilWeissAmZug: 'tot'})]), 'ungeklaert', 'Ko ohne einheitliches Urteil: ungeklärt');
  pruefeGleich(e(v, [urt('ko_zugabhaengig', {urteilSchwarzAmZug: 'lebendig', urteilWeissAmZug: 'lebendig'})]), 'R+', 'Ko mit einheitlichem Urteil zählt als dieses Urteil');
  const gl = kette('tot', 'tot');
  pruefeGleich(e(gl, [urt('tot')]), 'gleich-richtig', 'App unverändert, Urteil gleich'); pruefeGleich(e(gl, [urt('lebendig')]), 'gleich-falsch', 'App unverändert, Urteil anders'); pruefeGleich(e(gl, [urt('seki')]), 'ungeklaert', 'unverändert, Seki: ungeklärt');
  pruefeGleich(e(kette('gemischt', 'tot'), [urt('tot')]), 'ungeklaert', 'App uneinheitlich: ungeklärt'); pruefe(/uneinheitlich/.test(S3.bewerteKette(kette('tot', 'gemischt'), [urt('tot')]).grund), 'Grund genannt');
  /* zwei Beurteilergruppen */
  const ki = urt('lebendig'), mensch = urt('tot', {gruppe: 'Mensch'});
  const w = S3.bewerteKette(v, [ki, mensch]); pruefeGleich(w.ergebnis, 'R-', 'Widerspruch: ein entschiedenes Urteil gleich „aus“ genügt für R− (konservativ)'); pruefeGleich(w.widerspruch, true, 'Widerspruch vermerkt');
  pruefeGleich(e(v, [ki, urt('lebendig', {gruppe: 'Mensch'})]), 'R+', 'beide übereinstimmend gleich „an“: R+'); pruefeGleich(e(v, [ki, urt('lebendig', {gruppe: 'Mensch', sicherheit: 'unsicher'})]), 'ungeklaert', 'R+ verlangt alle Urteile sicher');
  const w2 = S3.bewerteKette(gl, [urt('tot'), urt('lebendig', {gruppe: 'Mensch'})]); pruefeGleich(w2.ergebnis, 'ungeklaert', 'unverändert mit Widerspruch: ungeklärt'); pruefe(/Widerspruch/.test(w2.grund), 'Grund Widerspruch');
});

/* ── 5 Ganzer Ablauf ──────────────────────────────────────────────────── */
function ablauf(g, pakete = {}) {
  const aus = fs.mkdtempSync(path.join(tmp, 'a-')), r = lauf(['unterlagen', '--stufe1', g.s1, '--stufe2', g.s2, '--archiv', g.daten, '--aus', aus]);
  return {aus, ...r};
}
const auswerten = (g, aus, boegen, ausName = 'auswertung') => {
  const o = path.join(aus, ausName), args = ['auswerten', '--stufe1', g.s1, '--stufe2', g.s2, '--archiv', g.daten, '--aus', o];
  for (const [n, d] of Object.entries(boegen)) args.push('--bogen', `${n}=${d}`);
  const r = lauf(args); return {o, ...r, json: fs.existsSync(path.join(o, 'bericht-stufe3.json')) ? liesJson(path.join(o, 'bericht-stufe3.json')) : null, md: fs.existsSync(path.join(o, 'bericht-stufe3.md')) ? fs.readFileSync(path.join(o, 'bericht-stufe3.md'), 'utf8') : ''};
};
let AB = null;
function ablaufGrund() {
  if (AB) return AB;
  const g = baueGrund(658, 1060), a = ablauf(g), aufd = liesJson(path.join(a.aus, 'geheim', 'aufdeckung.json')), manifest = liesJson(path.join(a.aus, 'beurteiler-paket', 'manifest.json'));
  return (AB = {g, a, aufd, manifest});
}
const schreibeBogen = (dir, name, manifest, antworten) => { const p = path.join(dir, name); fs.writeFileSync(p, JSON.stringify({manifestSha256: manifest.manifestSha256, beurteiler: 'KI', antworten})); return p; };
test('Ablauf: Werkzeug schreibt Beurteilerpaket und Aufdeckung getrennt; „pruefen“ prüft einen Bogen gegen das Manifest', () => {
  const {a, aufd, manifest} = ablaufGrund();
  pruefeGleich(a.status, 0, 'unterlagen: ' + a.stderr); pruefe(fs.existsSync(path.join(a.aus, 'beurteiler-paket', 'anleitung-beurteiler.md')) && fs.existsSync(path.join(a.aus, 'beurteiler-paket', 'bogen-vorlage.json')), 'Paket mit Anleitung und Vorlage');
  pruefe(!fs.existsSync(path.join(a.aus, 'beurteiler-paket', 'aufdeckung.json')) && fs.existsSync(path.join(a.aus, 'geheim', 'aufdeckung.json')), 'Aufdeckung nur unter geheim/');
  pruefeGleich(Object.keys(aufd).length, manifest.unterlagen, 'Aufdeckung und Manifest gleich groß');
  const b = schreibeBogen(a.aus, 'ok.json', manifest, manifest.reihenfolge.map(id => antwort(id))), ok = lauf(['pruefen', '--bogen', b, '--manifest', path.join(a.aus, 'beurteiler-paket', 'manifest.json')]);
  pruefeGleich(ok.status, 0, 'Bogen gültig'); pruefe(/Bogen gültig/.test(ok.stdout), 'Meldung');
  const schlecht = schreibeBogen(a.aus, 'schlecht.json', manifest, manifest.reihenfolge.slice(1).map(id => antwort(id))), no = lauf(['pruefen', '--bogen', schlecht, '--manifest', path.join(a.aus, 'beurteiler-paket', 'manifest.json')]);
  pruefeGleich(no.status, 1, 'unvollständiger Bogen: Exit 1'); pruefe(/nicht beantwortet/.test(no.stderr), 'Meldung');
});
test('Auswertung, Beurteilung folgt App MIT Diagonalprüfung: R− = 0, R+ vorhanden, positive Kandidatur nur wenn alle Bedingungen erfüllt (§8), jede Bedingung einzeln', () => {
  const {g, a, aufd, manifest} = ablaufGrund();
  const bogen = schreibeBogen(a.aus, 'an.json', manifest, manifest.reihenfolge.map(id => antwort(id, wertVon(aufd[id].appAn))));
  const r = auswerten(g, a.aus, {KI: bogen});
  pruefeGleich(r.status, 0, 'Auswertung: ' + r.stderr + r.md.slice(0, 300)); const j = r.json;
  const veraendert = Object.values(aufd).filter(k => k.appAus !== k.appAn).length;
  pruefeGleich(j.rMinus, 0, 'R− = 0'); pruefeGleich(j.uebersicht.gesamt['R+'], veraendert, 'R+ = alle Ketten, deren App-Urteil sich ändert'); pruefeGleich(j.uebersicht.gesamt['R-'], 0, 'R− in der Übersicht');
  const bed = Object.fromEntries(j.bedingungen.map(b => [b.nr, b.erfuellt]));
  pruefeGleich(bed[3], true, 'Bedingung 3 (R− = 0)'); pruefeGleich(bed[5], true, 'Bedingung 5 (Mindestumfang, Bericht der Stufe 2 nennt 658 und 1060)');
  pruefeGleich(bed[2], j.rPlus >= S3.R_PLUS_MIN && j.partienRPlus >= S3.R_PLUS_PARTIEN_MIN, 'Bedingung 2 gleich 5 R+ aus 3 Partien');
  pruefeGleich(j.befund, j.bedingungen.every(b => b.erfuellt) ? 'positive Kandidatur' : 'keine positive Kandidatur', 'Befund folgt aus den Bedingungen');
  pruefe(/Beurteilungen, keine Ground Truth/.test(r.md) && /kein Go/.test(r.md) && /erst nach allen Urteilen/.test(r.md), 'Bericht: keine Ground Truth, kein Go, Aufdeckung erst nach den Urteilen');
  pruefe(/### R\+/.test(r.md) && /### R−/.test(r.md) && /### Ungeklärt/.test(r.md) && /GNU Go weicht von einem zählenden Urteil ab/.test(r.md), 'Einzelfälle aufgeführt');
  pruefe(j.befund === 'positive Kandidatur' ? /nicht „unbedenklich“/.test(r.md) : /keine Aussage über die Richtigkeit/.test(r.md), 'Wortlaut des Befunds ohne „unbedenklich“');
  pruefe(fs.existsSync(path.join(r.o, 'ketten-stufe3.jsonl')), 'Ergebnis je Kette abgelegt');
});
test('Auswertung: ein R− (Urteil gleich App aus, an anders) verhindert die Kandidatur; ein ungeklärter B1-Fall ebenso; ungeklärter B2-Fall nicht', () => {
  const {g, a, aufd, manifest} = ablaufGrund(), ids = manifest.reihenfolge;
  const wie = id => antwort(id, wertVon(aufd[id].appAn)), basis = () => ids.map(wie);
  const zuR = ids.find(id => aufd[id].appAus !== aufd[id].appAn), b1id = ids.find(id => aufd[id].menge === 'B1' && aufd[id].appAus !== aufd[id].appAn), b2id = ids.find(id => aufd[id].menge === 'B2');
  const mitR = basis().map(x => (x.id === zuR ? antwort(zuR, wertVon(aufd[zuR].appAus)) : x)), rMinus = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'rminus.json', manifest, mitR)}, 'rminus');
  pruefeGleich(rMinus.status, 0, 'gültig: ' + rMinus.stderr); pruefeGleich(rMinus.json.rMinus, 1, 'genau ein R−'); pruefeGleich(rMinus.json.bedingungen.find(b => b.nr === 3).erfuellt, false, 'Bedingung 3 nicht erfüllt'); pruefeGleich(rMinus.json.befund, 'keine positive Kandidatur', 'keine positive Kandidatur');
  pruefe(rMinus.md.includes(zuR), 'das R− steht einzeln im Bericht (nach der Aufdeckung)');
  const mitSeki = basis().map(x => (x.id === b1id ? antwort(b1id, 'seki') : x)), seki = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'seki.json', manifest, mitSeki)}, 'seki');
  pruefeGleich(seki.json.b1Ungeklaert === undefined ? seki.json.bedingungen.find(b => b.nr === 4).erfuellt : false, false, 'Bedingung 4: ungeklärter B1-Fall verhindert'); pruefeGleich(seki.json.befund, 'keine positive Kandidatur', 'keine positive Kandidatur');
  pruefe(seki.json.uebersicht.B1.ungeklaert >= 1, 'ungeklärt im B1 gezählt');
  const mitB2 = basis().map(x => (x.id === b2id ? antwort(b2id, 'seki') : x)), b2 = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'b2.json', manifest, mitB2)}, 'b2');
  pruefeGleich(b2.json.bedingungen.find(b => b.nr === 4).erfuellt, true, 'ungeklärter B2-Fall verhindert die Kandidatur nicht (Auslegung von §8 Nr. 4, offen berichtet)'); pruefe(/Ungeklärte B2-Fälle \(1\)/.test(b2.md), 'im Bericht genannt');
});
test('Auswertung: zwei Beurteilergruppen mit Widerspruch; Bogen eines anderen Pakets, unvollständiger Bogen und kein Bogen sind KEIN URTEIL (Exit 1)', () => {
  const {g, a, aufd, manifest} = ablaufGrund(), ids = manifest.reihenfolge, zuR = ids.find(id => aufd[id].appAus !== aufd[id].appAn);
  const ki = ids.map(id => antwort(id, wertVon(aufd[id].appAn))), mensch = ids.map(id => (id === zuR ? antwort(id, wertVon(aufd[id].appAus)) : antwort(id, wertVon(aufd[id].appAn))));
  const zwei = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'ki2.json', manifest, ki), Mensch: schreibeBogen(a.aus, 'mensch2.json', manifest, mensch)}, 'zwei');
  pruefeGleich(zwei.status, 0, 'zwei Gruppen gültig: ' + zwei.stderr); pruefeGleich(zwei.json.rMinus, 1, 'R− durch ein entschiedenes Urteil der zweiten Gruppe (konservativ)');
  pruefe(/\| KI \|/.test(zwei.md) && /\| Mensch \|/.test(zwei.md), 'Gruppen getrennt berichtet'); pruefe(zwei.json.verteilung.KI && zwei.json.verteilung.Mensch, 'Verteilung je Gruppe');
  const fremd = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'fremd.json', {manifestSha256: 'a'.repeat(64)}, ki)}, 'fremd');
  pruefeGleich(fremd.status, 1, 'Bogen mit fremdem Manifest: Exit 1'); pruefe(/KEIN URTEIL/.test(fremd.stderr) && /gehört nicht zu diesem Paket/.test(fremd.stderr), 'KEIN URTEIL mit Grund'); pruefe(/UNGÜLTIG, KEIN URTEIL/.test(fremd.md), 'Bericht nennt es');
  const luecke = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'luecke.json', manifest, ki.slice(1))}, 'luecke');
  pruefeGleich(luecke.status, 1, 'unvollständiger Bogen (auch nur eine B1- oder B2-Kette fehlt): Exit 1'); pruefe(/nicht beantwortet/.test(luecke.stderr), 'Grund: nicht beantwortet'); pruefeGleich(luecke.json, null, 'kein Ergebnis');
  const keiner = lauf(['auswerten', '--stufe1', g.s1, '--stufe2', g.s2, '--archiv', g.daten, '--aus', path.join(a.aus, 'keiner')]); pruefeGleich(keiner.status, 2, 'ohne --bogen: Werkzeugfehler');
  const probe = lauf(['unterlagen', '--stufe1', g.s1, '--stufe2', g.s2, '--archiv', g.daten, '--aus', path.join(a.aus, 'probe'), '--probe', '3']); pruefeGleich(probe.status, 0, 'Probe-Paket: ' + probe.stderr);
  const pm = liesJson(path.join(a.aus, 'probe', 'probe-paket', 'manifest.json')); pruefeGleich(pm.unterlagen, 3, 'drei Unterlagen'); pruefeGleich(pm.modus, 'probe', 'Modus probe');
  const probeBogen = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'probebogen.json', pm, pm.reihenfolge.map(id => antwort(id)))}, 'probebogen');
  pruefeGleich(probeBogen.status, 1, 'Bogen des Probe-Pakets wird in der Auswertung nicht angenommen'); pruefe(pm.manifestSha256 !== manifest.manifestSha256, 'das Probe-Paket hat ein anderes Manifest als das Hauptpaket');
});
test('Auswertung: nicht erreichter Mindestumfang (Bericht der Stufe 2 nennt weniger als 30) verhindert die Kandidatur, auch bei bester Beurteilung', () => {
  const g = baueGrund(10, 10), a = ablauf(g), aufd = liesJson(path.join(a.aus, 'geheim', 'aufdeckung.json')), man = liesJson(path.join(a.aus, 'beurteiler-paket', 'manifest.json'));
  const r = auswerten(g, a.aus, {KI: schreibeBogen(a.aus, 'klein.json', man, man.reihenfolge.map(id => antwort(id, wertVon(aufd[id].appAn))))});
  pruefeGleich(r.status, 0, 'gültig: ' + r.stderr); const b5 = r.json.bedingungen.find(b => b.nr === 5); pruefeGleich(b5.erfuellt, false, 'Mindestumfang nicht erreicht'); pruefeGleich(r.json.befund, 'keine positive Kandidatur', 'keine positive Kandidatur');
});

/* ── 6 Workflow und Werkzeug ──────────────────────────────────────────── */
test('Workflow: nur manuell, kein GNU Go, beide ZIPs gegen ihre SHA-256 geprüft, Aufdeckung getrennt hochgeladen', () => {
  const y = fs.readFileSync(path.join(wurzel, '.github/workflows/diagonal-pruefung-stufe3.yml'), 'utf8');
  pruefe(/^on:\n  workflow_dispatch:/m.test(y) && !/\n  (push|pull_request|schedule):/.test(y), 'nur workflow_dispatch'); pruefe(!/gnugo|fuego/i.test(y.replace(/^#.*$/gm, '')), 'kein GNU Go und kein Fuego im Ablauf');
  pruefe(/8c835dfb5b6ed7cb5af951de92351de2fd67643151025ab56fad51a89c133740/.test(y) && /d3f92b964891a176aedf128e834138816cb92399b0edfa6fe2d1c4c263f49d95/.test(y), 'beide ZIPs mit gebundener SHA-256');
  pruefe(/sha256sum/.test(y) && /diagonal-pruefung-stufe1\.zip/.test(y) && /stufe2-hauptlauf-43274198340/.test(y), 'Prüfung der ZIPs aus dem Repo');
  pruefe(/runs-on: ubuntu-24\.04/.test(y), 'ubuntu-24.04'); pruefe(/beurteiler-paket/.test(y) && /stufe3-geheim/.test(y), 'Paket und Aufdeckung als getrennte Artefakte');
  pruefe(/\|\| status=\$\?/.test(y), 'Exit-Codes mit || status=$? abgefangen'); pruefe(!/cancel-in-progress: true/.test(y), 'laufende Läufe werden nicht abgebrochen');
  pruefe(/auswerten/.test(y) && /bogen/.test(y), 'Modus auswerten mit Bogen aus dem Repo');
  const yaml = spawnSync('python3', ['-c', 'import sys,yaml; yaml.safe_load(open(sys.argv[1]))', path.join(wurzel, '.github/workflows/diagonal-pruefung-stufe3.yml')], {encoding: 'utf8'});
  pruefe(yaml.status === 0 || /No module named/.test(yaml.stderr), 'YAML lesbar: ' + yaml.stderr);
});
test('Werkzeug: beurteilt nicht selbst, ändert weder Spiel noch Stufe 1 und 2', () => {
  const q = fs.readFileSync(werkzeug, 'utf8');
  pruefe(!/writeFileSync\([^)]*index\.html/.test(q), 'schreibt keine index.html'); pruefe(!/spawn|execFile|child_process/.test(q), 'startet keine Programme (kein GNU Go, kein Beurteiler)');
  pruefe(/R_PLUS_MIN = 5, R_PLUS_PARTIEN_MIN = 3/.test(q) && /MINDESTUMFANG = 30/.test(q), 'Setzungen aus §10.5 und §7 Nr. 7');
});

laufeTests('Diagonalprüfung Stufe 3: Werkzeug (Attrappe, ohne Beurteiler)').then(ok => process.exit(ok ? 0 : 1));
