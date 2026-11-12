// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagonalprüfung, Stufe 3 (docs/diagonalpruefung-vorabfestlegung.md §6, §8, §10.4, §11 AP5): unabhängige Beurteilung (Schicht B).
   Das Werkzeug beurteilt NICHT. Es baut die Unterlagen für eine getrennte Beurteilung, prüft deren Antwortbögen und deckt erst danach auf,
   was App aus, App an und GNU Go zu jeder Kette sagten (R+, R−, ungeklärt). Beurteilungen sind keine Ground Truth (§6).

   Drei Teilschritte:
     unterlagen  baut aus der Auswahl der Stufe 2 (B1 vollständig, B2 höchstens 60) das Paket für die Beurteiler: je Kette eine Unterlage (Markdown mit
                 Textdiagramm, Zugfarbe, Kurzansicht, vollständiger Zuggeschichte als SGF), Anleitung, Antwortbogen-Schema, Vorlage, Manifest. Das Paket
                 enthält KEINE Herkunft (weder Programm noch Gruppe noch Schalter noch die Urteile von App oder GNU Go). Die Zuordnung steht getrennt in
                 geheim/aufdeckung.json und wird erst nach allen Urteilen benutzt. Reihenfolge und Kennungen sind Hash-Zufall (§6.2).
     pruefen     prüft einen Antwortbogen gegen das Manifest (jede Kennung genau einmal, Kategorien, Begründung, Sicherheit).
     auswerten   prüft alle Bögen, deckt auf und berichtet nach §6.4 und §8: R+ (aus falsch, an richtig), R− (aus richtig, an falsch), ungeklärt,
                 getrennt nach Beurteilergruppe und nach B1 und B2; Befund nach §8 („positive Kandidatur“ oder „keine positive Kandidatur“, kein Go).
   Gültigkeit: nur zwei Zustände. Ungültig heißt „kein Urteil“ mit Grund, Exit 1.

   Aufrufe (Optionen als --name wert):
     node diagonal-pruefung-stufe3.js unterlagen --stufe1 verz --stufe2 verz --archiv docs/daten --aus verz [--probe 3]
     node diagonal-pruefung-stufe3.js pruefen --bogen datei --manifest manifest.json
     node diagonal-pruefung-stufe3.js auswerten --stufe1 verz --stufe2 verz --archiv docs/daten --bogen NAME=datei [--bogen NAME=datei] --aus verz
        (--stufe1: entpacktes Stufe-1-ZIP; --stufe2: entpacktes Stufe-2-ZIP mit bericht/, eingabe/plan/, teile/) */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = require('./passregel-lib.js');
const W = require('./diagonal-pruefung.js');
const S2 = require('./diagonal-pruefung-stufe2.js');
const B = require('../../tests/diagonalauge-brett.js');
const {ladeKI} = require('../../tests/rahmen.js');

const PRAEFIX = 'diagonal-pruefung-v1';
const N = 361, KOMI = 7.5;
const KATEGORIEN = ['lebendig', 'tot', 'seki', 'ko_zugabhaengig', 'nicht_entscheidbar'];
const TEILURTEILE = ['lebendig', 'tot', 'seki', 'nicht_entscheidbar'];
const SICHERHEIT = ['sicher', 'eher_sicher', 'unsicher'];
const BEGRUENDUNG_MIN = 20;                 /* Zeichen; Setzung: eine Begründung ist keine Leerformel */
const R_PLUS_MIN = 5, R_PLUS_PARTIEN_MIN = 3;       /* §10.5 (Setzung): mindestens 5 bestätigte Verbesserungen aus mindestens 3 verschiedenen Partien */
const MINDESTUMFANG = 30;                   /* §7 Nr. 7 */
const sha256 = t => crypto.createHash('sha256').update(t).digest('hex');
const hash = s => L.fnv32(`${PRAEFIX}|${s}`);
const leseJsonlDatei = p => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
const nachHash = (liste, schluesselVon) => [...liste].sort((a, b) => hash(schluesselVon(a)) - hash(schluesselVon(b)) || (schluesselVon(a) < schluesselVon(b) ? -1 : 1));
const prozent = x => `${(100 * x).toFixed(1).replace('.', ',')} %`;
const farbName = f => (f === 1 || f === 'X' ? 'Schwarz' : 'Weiß');

/* ── Eingaben der Stufe 2 und Stufe 1 ─────────────────────────────────── */
function ladeEingabe(o) {
  const s1 = S2.ladeStufe1(o.stufe1), b2 = JSON.parse(fs.readFileSync(path.join(o.stufe2, 'bericht', 'bericht.json'), 'utf8'));
  const auswahl = JSON.parse(fs.readFileSync(path.join(o.stufe2, 'bericht', 'auswahl-stufe3.json'), 'utf8'));
  const plan = JSON.parse(fs.readFileSync(path.join(o.stufe2, 'eingabe', 'plan', 'plan.json'), 'utf8'));
  const teile = fs.readdirSync(path.join(o.stufe2, 'teile')).filter(f => /^teil-\d+\.jsonl$/.test(f)).sort().map(f => leseJsonlDatei(path.join(o.stufe2, 'teile', f)));
  const p1 = path.join(o.stufe1, 'bericht.json'), s1bericht = fs.existsSync(p1) ? JSON.parse(fs.readFileSync(p1, 'utf8')) : null;
  return {s1, s1bericht, bericht2: b2, auswahl, plan, zeilen: teile.flatMap(t => t.slice(1)), archiv: o.archiv, pro: new Map(s1.stellungen.map(s => [s.id, s]))};
}
/* Prüft die Auswahl der Stufe 2 an den Paketdaten und gibt die Ketten mit Status (App aus, App an, GNU Go) zurück. Pflichtfehler → gruende. */
function pruefeEingabe(ein) {
  const gruende = [];
  if (!ein.bericht2.gueltig) gruende.push('Bericht der Stufe 2 ist nicht gültig');
  if (ein.bericht2.modus !== 'haupt') gruende.push(`Bericht der Stufe 2 hat den Modus ${ein.bericht2.modus}, erwartet haupt`);
  const nutz = ein.zeilen.filter(z => z.status === 'gueltig' && z.kategorie === 'betroffen').map(z => { const s = ein.pro.get(z.id); return {id: z.id, art: z.art, brett: s.brett, appTotAus: z.appTot.aus, appTotAn: z.appTot.an, gnuDead: z.gnu.dead}; });
  const neu = S2.waehleKetten(nutz, ein.plan.basis);
  if (JSON.stringify(neu.b1) !== JSON.stringify(ein.auswahl.b1) || JSON.stringify(neu.b2Auswahl) !== JSON.stringify(ein.auswahl.b2Auswahl))
    gruende.push('auswahl-stufe3.json ist nicht gleich der Auswahl, die sich aus den Paketdaten ergibt');
  const nutzJe = new Map(nutz.map(x => [x.id, x])), ketten = [];
  for (const [menge, liste] of [['B1', ein.auswahl.b1], ['B2', ein.auswahl.b2Auswahl]]) for (const k of liste) {
    const x = nutzJe.get(k.stellung);
    if (!x) { gruende.push(`${k.schluessel}: Stellung nicht unter den gültigen betroffenen Stellungen`); continue; }
    const idx = k.punkte.map(L.vonGtp), st = (tot) => { const m = new Set(tot), n = idx.filter(i => m.has(i)).length; return n === idx.length ? 'tot' : n === 0 ? 'lebend' : 'gemischt'; };
    ketten.push({...k, menge, appAus: st(x.appTotAus), appAn: st(x.appTotAn), gnu: st(x.gnuDead)});
  }
  return {gruende, ketten};
}

/* ── Einspielen mit Ko, Pässen, letzten Zügen ─────────────────────────── */
function spielMitKo(E, folge) {
  const b = new Uint8Array(N), caps = {1: 0, 2: 0};
  let ko = null;
  for (let i = 0; i < folge.length; i++) {
    const z = folge[i]; ko = null;
    if (z.punkt < 0) continue;
    if (b[z.punkt]) return {fehler: `Zug ${i + 1}: Punkt besetzt`};
    const vor = Uint8Array.from(b);
    b[z.punkt] = z.farbe;
    const n = E.removeDeadGroups(b, 3 - z.farbe, z.punkt);
    caps[z.farbe] += n;
    const g = E.floodFill(b, z.punkt);
    if (g.liberties.length === 0) return {fehler: `Zug ${i + 1}: Selbstmord`};
    if (n === 1 && g.group.length === 1 && g.liberties.length === 1) { const geschlagen = [...b.keys()].find(k => vor[k] && !b[k] && k !== z.punkt); if (geschlagen === g.liberties[0]) ko = geschlagen; }
  }
  let pass = 0; for (let i = folge.length - 1; i >= 0 && folge[i].punkt < 0; i--) pass++;
  return {fehler: null, brett: b, caps, ko, paesseInFolge: pass, letzterPasser: pass ? folge[folge.length - 1].farbe : null};
}
const koord = p => (p < 0 ? 'pass' : L.zuGtp(p));
function sgfVon(folge) {
  const c = p => (p < 0 ? '' : String.fromCharCode(97 + (p % 19)) + String.fromCharCode(97 + Math.floor(p / 19)));
  return `(;GM[1]FF[4]CA[UTF-8]SZ[19]KM[${KOMI}]RU[Chinese]PB[Schwarz]PW[Weiss]\n${folge.map((z, i) => `;${z.farbe === 1 ? 'B' : 'W'}[${c(z.punkt)}]${(i + 1) % 10 === 0 ? '\n' : ''}`).join('')})\n`;
}
function diagramm(brett, markiert) {
  const spalten = 'ABCDEFGHJKLMNOPQRST', m = new Set(markiert), z = ['    ' + spalten.split('').join(' ')];
  for (let y = 0; y < 19; y++) {
    const zeile = []; for (let x = 0; x < 19; x++) { const i = y * 19 + x; zeile.push(m.has(i) ? '@' : brett[i] === 1 || brett[i] === 'X' ? 'X' : brett[i] === 2 || brett[i] === 'O' ? 'O' : '.'); }
    const r = String(19 - y).padStart(2, ' '); z.push(`${r}  ${zeile.join(' ')}  ${r}`);
  }
  z.push(z[0]); return z.join('\n');
}

/* ── Unterlage ─────────────────────────────────────────────────────────── */
function unterlage(E, ein, kette, id) {
  const s = ein.pro.get(kette.stellung), partie = W.folgeAusArchiv(archivPartie(ein, s));
  const folge = partie.slice(0, s.index + 1);
  const sp = spielMitKo(E, folge);
  if (sp.fehler) throw new Error(`${kette.schluessel}: Einspielen: ${sp.fehler}`);
  if (B.brettZuText(sp.brett) !== s.brett) throw new Error(`${kette.schluessel}: Einspielen ergibt ein anderes Brett als Stufe 1`);
  const idx = kette.punkte.map(L.vonGtp), letzte = folge.slice(-10).map((z, k) => `${folge.length - Math.min(10, folge.length) + k + 1}. ${farbName(z.farbe)} ${koord(z.punkt)}`);
  const beendet = s.art === 'S', naechste = 3 - folge[folge.length - 1].farbe;
  const md = [`# Unterlage ${id}`, '',
    'Beurteile die mit `@` markierte Kette: Ist sie lebendig, tot, in Seki, vom Ko oder vom Zug abhängig, oder nicht entscheidbar? Die Anleitung steht in `anleitung-beurteiler.md`.', '',
    `- **Markierte Kette:** ${farbName(kette.farbe)}, ${kette.steine} ${kette.steine === 1 ? 'Stein' : 'Steine'}: ${kette.punkte.join(' ')}`,
    `- **Stellung:** nach Zug ${folge.length} (Zählung ab 1, Pässe eingerechnet); ${beendet ? 'die Partie ist beendet (zwei Pässe in Folge)' : 'die Partie ist nicht beendet'}`,
    `- **Als Nächstes am Zug wäre:** ${farbName(naechste)}`,
    `- **Regeln:** chinesisch (Flächenzählung), Komi ${String(KOMI).replace('.', ',')}`,
    `- **Gefangene:** Schwarz hat ${sp.caps[1]} Steine geschlagen, Weiß ${sp.caps[2]}`,
    `- **Pässe am Ende:** ${sp.paesseInFolge ? `${sp.paesseInFolge} in Folge, zuletzt von ${farbName(sp.letzterPasser)}` : 'keine'}`,
    `- **Ko-Punkt (sofortiges Zurücknehmen verboten):** ${sp.ko === null ? 'keiner' : koord(sp.ko)}`,
    `- **Letzte ${letzte.length} Züge:** ${letzte.join('; ')}`, '', '## Brett', '', '```', diagramm(sp.brett, idx).replace(/^/gm, ''), '```', '',
    '`X` Schwarz, `O` Weiß, `.` leer, `@` markierte Kette.', '', '## Zuggeschichte (SGF, alle Züge bis zur Stellung)', '', '```', sgfVon(folge).trimEnd(), '```', ''].join('\n');
  return {md, sgf: sgfVon(folge), zuege: folge.length};
}
const archivCache = new Map();
function archivPartie(ein, s) {
  const pfad = path.join(ein.archiv, s.quelle);
  if (!archivCache.has(pfad)) archivCache.set(pfad, new Map(L.leseJsonl(pfad).map(r => [r.nr, r])));
  const r = archivCache.get(pfad).get(s.nr);
  if (!r) throw new Error(`Partie nicht im Archiv: ${s.quelle}, Nr. ${s.nr}`);
  return r;
}

const ANLEITUNG = `# Anleitung für die Beurteilung

Du bekommst eine Reihe von Unterlagen (\`unterlagen/U-….md\`, dazu je eine SGF-Datei). In jeder Unterlage ist **eine Kette** von Steinen mit \`@\` markiert. Beurteile **jede Unterlage einzeln und unabhängig**, nur nach den Regeln des Go und nach dem, was auf dem Brett und in der Zuggeschichte steht.

## Aufgabe

Beurteile, ob die markierte Kette bei bestem Spiel beider Seiten (chinesische Regeln, Flächenzählung) **bestehen bleibt oder gefangen wird**. Die Stellung kann beendet oder mitten in der Partie sein; die Unterlage sagt es. Nutze die vollständige Zuggeschichte (SGF), wenn Ko, Superko oder die Reihenfolge der Züge eine Rolle spielen.

## Kategorien (genau eine je Unterlage)

- \`lebendig\`: Die Kette bleibt bestehen (zwei echte Augen, ausreichende Freiheiten im Kampf oder Verbindung mit einer lebenden Gruppe), auch wenn die Gegenseite zuerst zieht.
- \`tot\`: Die Kette wird gefangen, auch wenn die eigene Seite zuerst zieht.
- \`seki\`: Beide Seiten können die Kette bzw. die gegnerische Gruppe nicht fangen; beide bleiben bestehen, ohne Gebiet.
- \`ko_zugabhaengig\`: Das Ergebnis hängt von einem Ko oder davon ab, wer am Zug ist. Gib dann **zusätzlich** das Urteil bei Zug von Schwarz (\`urteilSchwarzAmZug\`) und bei Zug von Weiß (\`urteilWeissAmZug\`) an, jeweils \`lebendig\`, \`tot\`, \`seki\` oder \`nicht_entscheidbar\`.
- \`nicht_entscheidbar\`: Du kannst es nach sorgfältigem Lesen nicht entscheiden. Das ist eine ehrliche Antwort und besser als Raten.

## Begründung und Sicherheit

Schreibe zu jeder Unterlage eine **Begründung** nach allgemeinen Go-Kriterien: echte und falsche Augen, Freiheiten, Verbindungen und Schnittpunkte, Randlage und Ecke, Seki, Ko, Lesen der entscheidenden Zugfolge. Nenne die Koordinaten der entscheidenden Punkte. Gib die **Sicherheit** an:

- \`sicher\`: Du hast die Stellung bis zum Ergebnis gelesen und siehst keine Alternative.
- \`eher_sicher\`: Du hältst das Urteil für richtig, hast aber nicht jede Variante zu Ende gelesen.
- \`unsicher\`: Du bist dir nicht sicher. Dann schreibe unter \`offen\`, was offen bleibt.

Bei \`eher_sicher\`, \`unsicher\` und \`nicht_entscheidbar\` ist \`offen\` Pflicht.

## Antwortformat

Gib **eine JSON-Datei** zurück:

\`\`\`json
{
  "manifestSha256": "<Wert aus manifest.json, Feld manifestSha256>",
  "antworten": [
    {"id": "U-xxxxxx", "kategorie": "tot", "begruendung": "…", "sicherheit": "sicher"},
    {"id": "U-yyyyyy", "kategorie": "ko_zugabhaengig", "urteilSchwarzAmZug": "lebendig", "urteilWeissAmZug": "tot", "begruendung": "…", "sicherheit": "eher_sicher", "offen": "…"}
  ]
}
\`\`\`

Jede Kennung der Vorlage (\`bogen-vorlage.json\`) kommt **genau einmal** vor. Das Schema steht in \`bogen-schema.json\`.

## Wichtig

- Du kennst nicht, woher die Stellungen stammen, und sollst es nicht erraten. Beurteile nur, was du siehst.
- Dein Urteil ist eine Beurteilung, keine Wahrheit. Ehrliche Unsicherheit ist ausdrücklich erwünscht.
- Arbeite jede Unterlage für sich; vergleiche Unterlagen nicht untereinander.
`;
const SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Antwortbogen', type: 'object', required: ['manifestSha256', 'antworten'],
  properties: {manifestSha256: {type: 'string'}, beurteiler: {type: 'string'}, antworten: {type: 'array', items: {type: 'object', required: ['id', 'kategorie', 'begruendung', 'sicherheit'],
    properties: {id: {type: 'string', pattern: '^U-[0-9a-f]{6}$'}, kategorie: {enum: KATEGORIEN}, urteilSchwarzAmZug: {enum: TEILURTEILE}, urteilWeissAmZug: {enum: TEILURTEILE},
      begruendung: {type: 'string', minLength: BEGRUENDUNG_MIN}, sicherheit: {enum: SICHERHEIT}, offen: {type: 'string'}}}}}};

/* ── Paket: deterministisch aus den Eingaben ───────────────────────────── */
function erzeugePaket(E, ein, ketten, opt = {}) {
  const basis = ein.plan.basis, ids = new Map();
  for (const k of ketten) {
    let salz = 0, id;
    do { id = 'U-' + hash(`stufe3|id|${basis}|${salz++}|${k.schluessel}`).toString(16).padStart(8, '0').slice(0, 6); } while ([...ids.values()].includes(id));
    ids.set(k.schluessel, id);
  }
  const reihenfolge = nachHash(ketten, k => `stufe3|reihenfolge|${basis}|${k.schluessel}`).map(k => ids.get(k.schluessel));
  const unterlagen = new Map(), aufdeckung = {};
  for (const k of ketten) {
    const id = ids.get(k.schluessel), u = unterlage(E, ein, k, id); unterlagen.set(id, u);
    const s = ein.pro.get(k.stellung);
    aufdeckung[id] = {schluessel: k.schluessel, stellung: k.stellung, partie: s.partie, gruppe: s.gruppe, art: k.art, menge: k.menge, klasse: k.klasse || null, richtung: k.richtung || null, zelle: k.zelle || null,
      farbe: k.farbe, steine: k.steine, punkte: k.punkte, appAus: k.appAus, appAn: k.appAn, gnu: k.gnu};
  }
  let waehl = reihenfolge;
  if (opt.probe) waehl = nachHash(reihenfolge, id => `stufe3|probe|${basis}|${id}`).slice(0, opt.probe);
  const dateien = {};
  for (const id of waehl) { dateien[`unterlagen/${id}.md`] = unterlagen.get(id).md; dateien[`unterlagen/${id}.sgf`] = unterlagen.get(id).sgf; }
  dateien['anleitung-beurteiler.md'] = ANLEITUNG; dateien['bogen-schema.json'] = JSON.stringify(SCHEMA, null, 1);
  dateien['bogen-vorlage.json'] = JSON.stringify({manifestSha256: null, beurteiler: 'KI', antworten: waehl.map(id => ({id, kategorie: '', begruendung: '', sicherheit: ''}))}, null, 1);
  const manifest = {version: 1, modus: opt.probe ? 'probe' : 'haupt', unterlagen: waehl.length, reihenfolge: waehl, dateien: Object.fromEntries(Object.entries(dateien).sort(([a], [b]) => (a < b ? -1 : 1)).map(([n, t]) => [n, sha256(t)]))};
  manifest.manifestSha256 = sha256(JSON.stringify({modus: manifest.modus, reihenfolge: manifest.reihenfolge, dateien: manifest.dateien}));
  dateien['manifest.json'] = JSON.stringify(manifest, null, 1);
  const geheim = Object.fromEntries(waehl.map(id => [id, aufdeckung[id]]));
  return {dateien, manifest, aufdeckung: geheim, anzahlB1: waehl.filter(id => aufdeckung[id].menge === 'B1').length, anzahlB2: waehl.filter(id => aufdeckung[id].menge === 'B2').length};
}

/* ── Antwortbögen prüfen ───────────────────────────────────────────────── */
function pruefeBogen(bogen, manifest) {
  const f = [];
  if (!bogen || typeof bogen !== 'object' || !Array.isArray(bogen.antworten)) return ['Bogen ist kein Objekt mit einer Liste „antworten“'];
  if (bogen.manifestSha256 !== manifest.manifestSha256) f.push(`manifestSha256 ${JSON.stringify(bogen.manifestSha256)} gehört nicht zu diesem Paket (erwartet ${manifest.manifestSha256})`);
  const erwartet = new Set(manifest.reihenfolge), gesehen = new Set();
  for (const a of bogen.antworten) {
    const id = a && a.id;
    if (typeof id !== 'string' || !erwartet.has(id)) { f.push(`${JSON.stringify(id)}: unbekannte Kennung`); continue; }
    if (gesehen.has(id)) { f.push(`${id}: mehrfach beantwortet`); continue; }
    gesehen.add(id);
    if (!KATEGORIEN.includes(a.kategorie)) f.push(`${id}: Kategorie ${JSON.stringify(a.kategorie)} ungültig`);
    if (!SICHERHEIT.includes(a.sicherheit)) f.push(`${id}: Sicherheit ${JSON.stringify(a.sicherheit)} ungültig`);
    if (typeof a.begruendung !== 'string' || a.begruendung.trim().length < BEGRUENDUNG_MIN) f.push(`${id}: Begründung fehlt oder ist kürzer als ${BEGRUENDUNG_MIN} Zeichen`);
    if (a.kategorie === 'ko_zugabhaengig') {
      for (const feld of ['urteilSchwarzAmZug', 'urteilWeissAmZug']) if (!TEILURTEILE.includes(a[feld])) f.push(`${id}: ${feld} ${JSON.stringify(a[feld])} ungültig (bei ko_zugabhaengig Pflicht)`);
    } else for (const feld of ['urteilSchwarzAmZug', 'urteilWeissAmZug']) if (a[feld] !== undefined) f.push(`${id}: ${feld} nur bei ko_zugabhaengig erlaubt`);
    if ((a.sicherheit !== 'sicher' || a.kategorie === 'nicht_entscheidbar') && (typeof a.offen !== 'string' || !a.offen.trim())) f.push(`${id}: „offen“ fehlt (Pflicht bei eher_sicher, unsicher und nicht_entscheidbar)`);
  }
  for (const id of erwartet) if (!gesehen.has(id)) f.push(`${id}: nicht beantwortet`);
  return f;
}

/* ── Auswertung (rein) ─────────────────────────────────────────────────── */
/* Urteil → wert (lebendig/tot oder null=ungeklärt), entschieden, zaehlt (nicht unsicher) */
function normiere(a) {
  let wert = null, grund = null;
  if (a.kategorie === 'lebendig' || a.kategorie === 'tot') wert = a.kategorie;
  else if (a.kategorie === 'ko_zugabhaengig') { if (a.urteilSchwarzAmZug === a.urteilWeissAmZug && (a.urteilSchwarzAmZug === 'lebendig' || a.urteilSchwarzAmZug === 'tot')) wert = a.urteilSchwarzAmZug; else grund = 'Ko oder zugabhängig ohne einheitliches Urteil'; }
  else grund = a.kategorie === 'seki' ? 'Seki' : 'nicht entscheidbar';
  const unsicher = a.sicherheit === 'unsicher';
  if (wert !== null && unsicher) grund = 'unsicher';
  return {wert, entschieden: wert !== null, zaehlt: wert !== null && !unsicher, grund};
}
const alsStatus = w => (w === 'lebendig' ? 'lebend' : 'tot');
/* Ergebnis einer Kette über alle Beurteilergruppen (§6.4): R+ (alle entschieden, nicht unsicher, übereinstimmend gleich „an“, ungleich „aus“), R− (schon eine
   entschiedene, nicht unsichere Beurteilung gleich „aus“, wenn „an“ anders ist), ungeklärt sonst. Bei unveränderter App: gleich-richtig, gleich-falsch, ungeklärt. */
function bewerteKette(k, urteile) {
  const r = {ergebnis: null, grund: null, widerspruch: false, urteile: urteile.map(u => ({gruppe: u.gruppe, wert: u.wert, zaehlt: u.zaehlt, grund: u.grund}))};
  const zaehlende = urteile.filter(u => u.zaehlt), entschiedene = urteile.filter(u => u.entschieden);
  r.widerspruch = new Set(entschiedene.map(u => u.wert)).size > 1;
  if (k.appAus === 'gemischt' || k.appAn === 'gemischt') { r.ergebnis = 'ungeklaert'; r.grund = 'App uneinheitlich (Kette teils tot, teils lebend)'; return r; }
  const einig = zaehlende.length === urteile.length && new Set(zaehlende.map(u => u.wert)).size === 1;
  if (k.appAus !== k.appAn) {
    if (zaehlende.some(u => alsStatus(u.wert) === k.appAus)) { r.ergebnis = 'R-'; return r; }
    if (einig && alsStatus(zaehlende[0].wert) === k.appAn) { r.ergebnis = 'R+'; return r; }
  } else if (einig) { r.ergebnis = alsStatus(zaehlende[0].wert) === k.appAus ? 'gleich-richtig' : 'gleich-falsch'; return r; }
  r.ergebnis = 'ungeklaert';
  r.grund = r.widerspruch ? 'Widerspruch zwischen Beurteilern' : (urteile.find(u => !u.zaehlt) || {}).grund || 'nicht übereinstimmend';
  return r;
}
function auswertung(aufdeckung, boegen, ein) {
  const gruppen = Object.keys(boegen), ids = Object.keys(aufdeckung);
  const proKette = ids.map(id => {
    const k = aufdeckung[id], urteile = gruppen.map(g => { const a = boegen[g].find(x => x.id === id); return {gruppe: g, ...normiere(a), kategorie: a.kategorie, sicherheit: a.sicherheit}; });
    return {id, ...k, ...bewerteKette(k, urteile), urteileRoh: urteile};
  });
  const zaehle = (liste, f) => liste.filter(f).length;
  const je = (menge, art) => proKette.filter(x => (!menge || x.menge === menge) && (!art || x.art === art));
  const erg = l => Object.fromEntries(['R+', 'R-', 'gleich-richtig', 'gleich-falsch', 'ungeklaert'].map(e => [e, zaehle(l, x => x.ergebnis === e)]));
  const uebersicht = {gesamt: erg(proKette), B1: erg(je('B1')), B2: erg(je('B2')), S: erg(je(null, 'S')), V: erg(je(null, 'V'))};
  const rPlus = proKette.filter(x => x.ergebnis === 'R+'), rMinus = proKette.filter(x => x.ergebnis === 'R-');
  const partienPlus = new Set(rPlus.map(x => x.partie));
  /* Übereinstimmung je Beurteilergruppe (nur entschiedene, nicht unsichere Urteile) */
  const uebereinstimmung = {};
  for (const g of gruppen) {
    const l = proKette.map(x => ({k: x, u: x.urteileRoh.find(u => u.gruppe === g)})).filter(x => x.u.zaehlt);
    const anteil = (feld) => { const m = l.filter(x => x.k[feld] !== 'gemischt'); return {n: m.length, gleich: m.filter(x => alsStatus(x.u.wert) === x.k[feld]).length}; };
    uebereinstimmung[g] = {urteile: boegen[g].length, zaehlend: l.length, appAus: anteil('appAus'), appAn: anteil('appAn'), gnu: anteil('gnu')};
  }
  const verteilung = {};
  for (const g of gruppen) verteilung[g] = {kategorie: Object.fromEntries(KATEGORIEN.map(c => [c, boegen[g].filter(a => a.kategorie === c).length])), sicherheit: Object.fromEntries(SICHERHEIT.map(c => [c, boegen[g].filter(a => a.sicherheit === c).length]))};
  const abweichungGnu = proKette.filter(x => x.urteileRoh.some(u => u.zaehlt && x.gnu !== 'gemischt' && alsStatus(u.wert) !== x.gnu)).map(x => ({id: x.id, schluessel: x.schluessel, menge: x.menge, art: x.art, gnu: x.gnu, urteile: x.urteileRoh.map(u => `${u.gruppe}: ${u.wert}`)}));
  /* §8: Entscheidungsregel, jede Bedingung einzeln */
  const b1Ungeklaert = je('B1').filter(x => x.ergebnis === 'ungeklaert');
  const betroffen = ein.bericht2.plan.zahlen.betroffen, ausfaelleBetroffen = ein.bericht2.ausfaelleBetroffen === undefined ? ein.bericht2.ausfaelle.filter(a => a.kategorie === 'betroffen').length : ein.bericht2.ausfaelleBetroffen;
  /* §8 Nr. 5: Wirkung auf den Endstand (S), einschließlich der Siegerwechsel. Sie steht im Bericht der Stufe 1 (§15.4, `wirkung.S`) und wird hier nur übernommen und gezeigt, nicht neu gerechnet. */
  const w1 = ein.s1bericht && ein.s1bericht.wirkung && ein.s1bericht.wirkung.S, MODI = ['flaeche', 'territory'];
  const endstand = {}; let endstandDa = !!w1;
  for (const m of MODI) { const x = w1 && w1[m] && w1[m].stand; if (!x || !Number.isFinite(x.n) || !Number.isFinite(x.siegerwechsel)) { endstandDa = false; continue; } endstand[m] = {n: x.n, aendert: x.aendert, siegerwechsel: x.siegerwechsel, median: x.median};
    const pa = ein.bericht2.schichtA && ein.bericht2.schichtA['S|betroffen|Summe (nicht gewichtet)']; if (pa && pa.punkte && pa.punkte[m]) endstand[m].siegerWieReferenz = {aus: pa.punkte[m].siegerGleichAus, an: pa.punkte[m].siegerGleichAn, n: pa.punkte[m].n}; }
  const bed = [
    {nr: 1, text: 'Pflichtprüfungen der Stufen 1 bis 3 bestanden (Stufe 2 gültig, Bögen geprüft)', erfuellt: true},
    {nr: 2, text: `Bestätigter Nutzen: mindestens ${R_PLUS_MIN} R+ aus mindestens ${R_PLUS_PARTIEN_MIN} verschiedenen Partien (§10.5, Setzung)`, erfuellt: rPlus.length >= R_PLUS_MIN && partienPlus.size >= R_PLUS_PARTIEN_MIN, detail: `${rPlus.length} R+ aus ${partienPlus.size} Partien`},
    {nr: 3, text: 'R− = 0 in beiden Stellungsarten (konservativ gezählt)', erfuellt: rMinus.length === 0, detail: `S ${zaehle(rMinus, x => x.art === 'S')}, V ${zaehle(rMinus, x => x.art === 'V')}`},
    {nr: 4, text: 'Alle B1-Fälle entschieden (kein ungeklärter B1-Fall) und alle betroffenen Stellungen ausgewertet (keine Ausfälle in betroffenen Stellungen)', erfuellt: b1Ungeklaert.length === 0 && ausfaelleBetroffen === 0, detail: `ungeklärte B1-Fälle ${b1Ungeklaert.length}, Ausfälle in betroffenen Stellungen ${ausfaelleBetroffen}`},
    {nr: 5, text: 'Wirkung auf den Endstand (S) berichtet, einschließlich der Fälle, in denen sich der Sieger ändert (Bericht der Stufe 1, §15.4)', erfuellt: endstandDa, detail: endstandDa ? MODI.map(m => `${m === 'flaeche' ? 'Fläche' : 'Territory'}: Stand ändert sich bei ${endstand[m].aendert} von ${endstand[m].n}, Sieger wechselt bei ${endstand[m].siegerwechsel}`).join('; ') : 'Bericht der Stufe 1 (bericht.json, wirkung.S) fehlt oder ist unvollständig'}];
  /* Mindestumfang (§7 Nr. 7) ist eine eigene Bedingung, keine Nummer von §8: nicht erreicht heißt „Kandidatur offen“ (zu wenig Betroffene), nicht „keine positive Kandidatur“ */
  const mindest = {schwelle: MINDESTUMFANG, S: betroffen.S, V: betroffen.V, erfuellt: betroffen.S >= MINDESTUMFANG && betroffen.V >= MINDESTUMFANG};
  const positiv = bed.every(b => b.erfuellt) && mindest.erfuellt;
  return {proKette, uebersicht, uebereinstimmung, verteilung, rPlus: rPlus.length, partienRPlus: partienPlus.size, rMinus: rMinus.length, abweichungGnu, bedingungen: bed, endstand, mindestumfang: mindest, befund: !mindest.erfuellt ? 'Kandidatur offen (zu wenig Betroffene)' : positiv ? 'positive Kandidatur' : 'keine positive Kandidatur',
    ungeklaertB2: je('B2').filter(x => x.ergebnis === 'ungeklaert').length, b1Ungeklaert: b1Ungeklaert.length};
}
function berichtMd(r, gruppen, paketInfo) {
  const m = ['# Diagonalprüfung, Stufe 3: Beurteilung (Schicht B)', '',
    '**Beurteilungen, keine Ground Truth** (§6). Beurteilergruppen werden getrennt geführt (KI, Mensch). Die Zuordnung zu App aus, App an und GNU Go wurde **erst nach allen Urteilen** aufgedeckt. Das Ergebnis ist ein Befund und kein Go (§8).', '',
    `Unterlagen: ${paketInfo.unterlagen} (B1 ${paketInfo.anzahlB1}, B2 ${paketInfo.anzahlB2}); Beurteilergruppen: ${gruppen.join(', ')}.`, '', '## Verteilung der Urteile', '', '| Gruppe | lebendig | tot | seki | ko_zugabhaengig | nicht_entscheidbar | sicher | eher sicher | unsicher |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const g of gruppen) { const v = r.verteilung[g]; m.push(`| ${g} | ${KATEGORIEN.map(c => v.kategorie[c]).join(' | ')} | ${SICHERHEIT.map(c => v.sicherheit[c]).join(' | ')} |`); }
  m.push('', '## Übereinstimmung der Beurteilung mit App aus, App an und GNU Go', '', 'Nur entschiedene, nicht unsichere Urteile. „App uneinheitlich“ und „GNU Go uneinheitlich“ (Kette teils tot, teils lebend) sind nicht eingerechnet.', '', '| Gruppe | Urteile | zählend | App aus | App an | GNU Go |', '|---|---:|---:|---|---|---|');
  for (const g of gruppen) { const u = r.uebereinstimmung[g], p = x => `${x.gleich} von ${x.n} (${x.n ? prozent(x.gleich / x.n) : '–'})`; m.push(`| ${g} | ${u.urteile} | ${u.zaehlend} | ${p(u.appAus)} | ${p(u.appAn)} | ${p(u.gnu)} |`); }
  m.push('', '## Ergebnis je Kette (getrennt nach B1 und B2)', '', '| Menge | R+ | R− | gleich richtig | gleich falsch | ungeklärt |', '|---|---:|---:|---:|---:|---:|');
  for (const k of ['B1', 'B2', 'S', 'V', 'gesamt']) { const u = r.uebersicht[k]; m.push(`| ${k === 'S' || k === 'V' ? 'Art ' + k : k} | ${u['R+']} | ${u['R-']} | ${u['gleich-richtig']} | ${u['gleich-falsch']} | ${u.ungeklaert} |`); }
  m.push('', 'R+ = aus falsch, an richtig (nur wenn alle Urteile entschieden, nicht unsicher und übereinstimmend); R− = aus richtig, an falsch (konservativ: schon ein entschiedenes, nicht unsicheres Urteil genügt); „gleich“ = App bei aus und an gleich. Ungeklärt zählt nie als Unbedenklichkeit.', '',
    '## Einzelfälle', '');
  const liste = (titel, l) => { m.push(`### ${titel} (${l.length})`, ''); if (!l.length) m.push('Keine.', ''); else { m.push('| Kennung | Menge | Art | Partie | Kette | App aus | App an | GNU Go | Urteile |', '|---|---|---|---|---|---|---|---|---|'); for (const x of l) m.push(`| ${x.id} | ${x.menge} | ${x.art} | ${x.partie} | ${x.schluessel.split('|').pop()} | ${x.appAus} | ${x.appAn} | ${x.gnu} | ${x.urteileRoh.map(u => `${u.gruppe}: ${u.wert || u.kategorie}${u.zaehlt ? '' : ' (' + u.grund + ')'}`).join('; ')} |`); m.push(''); } };
  liste('R−', r.proKette.filter(x => x.ergebnis === 'R-')); liste('R+', r.proKette.filter(x => x.ergebnis === 'R+')); liste('Ungeklärt', r.proKette.filter(x => x.ergebnis === 'ungeklaert'));
  m.push(`### GNU Go weicht von einem zählenden Urteil ab (${r.abweichungGnu.length})`, '');
  if (!r.abweichungGnu.length) m.push('Keine.', ''); else { m.push('| Kennung | Menge | Art | GNU Go | Urteile |', '|---|---|---|---|---|'); for (const x of r.abweichungGnu) m.push(`| ${x.id} | ${x.menge} | ${x.art} | ${x.gnu} | ${x.urteile.join('; ')} |`); m.push(''); }
  m.push('## Wirkung auf den Endstand (S, §8 Nr. 5)', '', 'Aus dem Bericht der Stufe 1 übernommen (nicht neu gerechnet): betroffene Schlusszählungen, bei denen der Schalter den Stand ändert, und Siegerwechsel; dazu aus der Stufe 2 die Zahl der Stände, deren Sieger mit der Referenz aus GNU Gos Tot-Liste übereinstimmt.', '');
  if (r.endstand.flaeche && r.endstand.territory) { m.push('| Wertung | betroffene Stellungen | Stand ändert sich | Sieger wechselt | Sieger wie Referenz, aus | Sieger wie Referenz, an |', '|---|---:|---:|---:|---:|---:|'); for (const [k, n] of [['flaeche', 'Fläche'], ['territory', 'Territory']]) { const e = r.endstand[k], sr = e.siegerWieReferenz; m.push(`| ${n} | ${e.n} | ${e.aendert} | ${e.siegerwechsel} | ${sr ? sr.aus : '–'} | ${sr ? sr.an : '–'} |`); } m.push(''); } else m.push('**Fehlt:** Der Bericht der Stufe 1 enthält die Wirkung auf den Endstand nicht (Bedingung 5 nicht erfüllt).', '');
  m.push('## Entscheidungsregel (§8)', '', '| Nr. | Bedingung | erfüllt | Detail |', '|---|---|---|---|');
  for (const b of r.bedingungen) m.push(`| ${b.nr} | ${b.text} | ${b.erfuellt ? 'ja' : '**nein**'} | ${b.detail || ''} |`);
  m.push('', `**Mindestumfang (§7 Nr. 7, eigene Bedingung):** mindestens ${r.mindestumfang.schwelle} betroffene Stellungen je Stellungsart; S ${r.mindestumfang.S}, V ${r.mindestumfang.V}: ${r.mindestumfang.erfuellt ? 'erreicht' : '**nicht erreicht**'}. Nicht erreicht heißt: kein Urteil über die Kandidatur, zu wenig Betroffene.`);
  m.push('', `**Befund: ${r.befund}.** ${r.befund === 'positive Kandidatur' ? 'Das heißt nur: In dieser Prüfmenge (ausgewählte Archivpartien) wurde nichts Gegenteiliges gefunden. Es heißt nicht „unbedenklich“, und ein Standardwechsel bräuchte eine eigene Vorabfestlegung und ein Go (§8).' : 'Die nicht erfüllten Bedingungen stehen oben; das ist ein Befund über diese Prüfmenge und keine Aussage über die Richtigkeit.'}`, '',
    '## Grenzen', '', '- Beurteilungen sind keine Ground Truth; die KI-Beurteilung ist nicht unabhängig im strengen Sinn (Engine und Diagnosen entstanden mit derselben Modellfamilie, §10.4).', '- Die Beurteilung betrifft nur die ausgewählten Ketten (B1 vollständig, B2 eine Ziehung von höchstens 60); Hochrechnungen sind nicht Teil dieses Berichts.',
    `- Ungeklärte B2-Fälle (${r.ungeklaertB2}) verhindern die Kandidatur nicht (Auslegung von §8 Nr. 4: dort sind B1-Fälle genannt); sie stehen oben.`);
  return m.join('\n') + '\n';
}

/* ── Aufruf ───────────────────────────────────────────────────────────── */
function optionen(argv, erlaubt, pflicht, mehrfach = []) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const n = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !erlaubt.includes(n) || argv[i + 1] === undefined) throw new Error('Unbekannte oder unvollständige Option: ' + argv[i]);
    if (mehrfach.includes(n)) (o[n] = o[n] || []).push(argv[++i]); else o[n] = argv[++i];
  }
  for (const n of pflicht) if (o[n] === undefined) throw new Error('Option fehlt: --' + n);
  return o;
}
function schreibe(wurzel, dateien) { for (const [n, t] of Object.entries(dateien)) { const p = path.join(wurzel, n); fs.mkdirSync(path.dirname(p), {recursive: true}); fs.writeFileSync(p, t); } }
function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  const html = path.join(__dirname, '..', '..', 'index.html');
  if (befehl === 'unterlagen' || befehl === 'auswerten') {
    const o = optionen(rest, ['stufe1', 'stufe2', 'archiv', 'aus', 'probe', 'bogen'], ['stufe1', 'stufe2', 'archiv', 'aus'], ['bogen']);
    const ein = ladeEingabe(o), E = ladeKI({htmlPfad: html, mitNetz: false}), pe = pruefeEingabe(ein);
    if (pe.gruende.length) { console.error('KEIN URTEIL: ' + pe.gruende.join(' ; ')); process.exit(1); }
    fs.mkdirSync(o.aus, {recursive: true});
    if (befehl === 'unterlagen') {
      const probe = o.probe === undefined ? 0 : +o.probe;
      const p = erzeugePaket(E, ein, pe.ketten, {probe});
      schreibe(path.join(o.aus, probe ? 'probe-paket' : 'beurteiler-paket'), p.dateien);
      fs.mkdirSync(path.join(o.aus, 'geheim'), {recursive: true});
      fs.writeFileSync(path.join(o.aus, 'geheim', probe ? 'aufdeckung-probe.json' : 'aufdeckung.json'), JSON.stringify(p.aufdeckung, null, 1));
      console.log(`${probe ? 'Probe-Paket' : 'Paket'}: ${p.manifest.unterlagen} Unterlagen (B1 ${p.anzahlB1}, B2 ${p.anzahlB2}); manifestSha256 ${p.manifest.manifestSha256}`);
      return;
    }
    if (!o.bogen || !o.bogen.length) throw new Error('Option fehlt: --bogen NAME=datei');
    const p = erzeugePaket(E, ein, pe.ketten, {}), boegen = {}, gruende = [];
    for (const b of o.bogen) {
      const k = b.indexOf('='), name = b.slice(0, k), datei = b.slice(k + 1);
      let bogen; try { bogen = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { gruende.push(`${name}: ${e.message}`); continue; }
      const f = pruefeBogen(bogen, p.manifest);
      if (f.length) gruende.push(`${name}: ${f.length} Fehler (z. B. ${f[0]})`); else boegen[name] = bogen.antworten;
    }
    if (gruende.length) { fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.md'), `# Diagonalprüfung, Stufe 3\n\n**UNGÜLTIG, KEIN URTEIL.** ${gruende.join(' ; ')}\n`); console.error('KEIN URTEIL: ' + gruende.join(' ; ')); process.exit(1); }
    const r = auswertung(p.aufdeckung, boegen, ein), md = berichtMd(r, Object.keys(boegen), {unterlagen: p.manifest.unterlagen, anzahlB1: p.anzahlB1, anzahlB2: p.anzahlB2});
    fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.md'), md);
    fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.json'), JSON.stringify({befund: r.befund, uebersicht: r.uebersicht, uebereinstimmung: r.uebereinstimmung, verteilung: r.verteilung, bedingungen: r.bedingungen, mindestumfang: r.mindestumfang, endstand: r.endstand, rPlus: r.rPlus, partienRPlus: r.partienRPlus, rMinus: r.rMinus, manifestSha256: p.manifest.manifestSha256}, null, 1));
    fs.writeFileSync(path.join(o.aus, 'ketten-stufe3.jsonl'), r.proKette.map(x => JSON.stringify(x)).join('\n') + '\n');
    console.log(md);
  } else if (befehl === 'pruefen') {
    const o = optionen(rest, ['bogen', 'manifest'], ['bogen', 'manifest']);
    const f = pruefeBogen(JSON.parse(fs.readFileSync(o.bogen, 'utf8')), JSON.parse(fs.readFileSync(o.manifest, 'utf8')));
    if (f.length) { console.error(`BOGEN UNGÜLTIG (${f.length}):\n` + f.slice(0, 50).join('\n')); process.exit(1); }
    console.log('Bogen gültig: jede Kennung genau einmal, alle Felder zulässig.');
  } else throw new Error('Aufruf: node diagonal-pruefung-stufe3.js unterlagen|pruefen|auswerten ...');
}
if (require.main === module) { try { main(); } catch (e) { console.error(e.stack || e.message); process.exit(2); } }
module.exports = {ladeEingabe, pruefeEingabe, spielMitKo, sgfVon, diagramm, unterlage, erzeugePaket, pruefeBogen, normiere, bewerteKette, auswertung, berichtMd, ANLEITUNG, SCHEMA, KATEGORIEN, SICHERHEIT, R_PLUS_MIN, R_PLUS_PARTIEN_MIN, MINDESTUMFANG};
