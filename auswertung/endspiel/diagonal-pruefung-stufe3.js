// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagonalprüfung, Stufe 3 (docs/diagonalpruefung-vorabfestlegung.md §6, §8, §10.4, §11 AP5): unabhängige Beurteilung (Schicht B).
   Das Werkzeug beurteilt NICHT. Es baut die Unterlagen für eine getrennte Beurteilung, prüft deren Antwortbögen und deckt erst danach auf,
   was App aus, App an und GNU Go zu jeder Kette sagten (R+, R−, ungeklärt). Beurteilungen sind keine Ground Truth (§6).

   Teilschritte:
     unterlagen  baut aus der Auswahl der Stufe 2 (B1 vollständig, B2 höchstens 60) das Paket für die Beurteiler: je Kette eine Unterlage (Markdown mit
                 Textdiagramm, Zugfarbe, Kurzansicht, vollständiger Zuggeschichte als SGF), Anleitung, Antwortbogen-Schema, Vorlage, Manifest. Das Paket
                 enthält KEINE Herkunft (weder Programm noch Gruppe noch Schalter noch die Urteile von App oder GNU Go). Die Zuordnung steht getrennt in
                 geheim/aufdeckung.json und wird erst nach allen Urteilen benutzt. Reihenfolge und Kennungen sind Hash-Zufall (§6.2).
     pruefen     prüft einen Antwortbogen gegen das Manifest (jede Kennung genau einmal, Kategorien, Begründung, Sicherheit); mit --teil ja einen Teilbogen.
     zusammenfuegen  vereint Teilbögen mechanisch zu einem Bogen (§18.6); schreibt nur, wenn jede Kennung genau einmal beantwortet ist.
     auswerten   prüft alle Bögen, deckt auf und berichtet nach §6.4 und §8: R+ (aus falsch, an richtig), R− (aus richtig, an falsch), ungeklärt,
                 getrennt nach Beurteilergruppe und nach B1 und B2; Befund nach §8 („positive Kandidatur“ oder „keine positive Kandidatur“, kein Go).
   Gültigkeit: nur zwei Zustände. Ungültig heißt „kein Urteil“ mit Grund, Exit 1.

   Aufrufe (Optionen als --name wert):
     node diagonal-pruefung-stufe3.js unterlagen --stufe1 verz --stufe2 verz --archiv docs/daten --aus verz [--probe 3 [--probe-ziehung 1]]
     node diagonal-pruefung-stufe3.js pruefen --bogen datei --manifest manifest.json [--teil ja]
     node diagonal-pruefung-stufe3.js zusammenfuegen --manifest manifest.json --teil datei [--teil datei …] --aus bogen.json
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

/* ── Kontrollketten für das S-Paket (docs/diagonal-schluss-vorabfestlegung.md §4.4a) ──
   Ketten aus den gültigen S-Kontrollstellungen der Stufe 2 (der Schalter ändert dort nichts), bei denen App und GNU Go dasselbe sagen (ganz tot oder ganz
   lebend). Je Stellung höchstens eine Kette, höchstens so groß wie die größte geprüfte S-Kette, je Status die Hälfte Einzelsteine (ersatzweise andere).
   Gezogen nach Hash. Sie messen nur, ob der Bogen dort, wo sich alle einig sind, in beide Richtungen urteilt; die gemeinsame Referenz ist keine Ground Truth. */
const K_SOLL = Object.freeze({lebend: 12, tot: 4}), K_ABWEICHUNG_MAX = 1, K_ZAEHLEND_ANTEIL = 0.75;
function waehleKontrollen(ein, soll, steineMax) {
  const basis = ein.plan.basis, kand = [];
  for (const z of ein.zeilen) {
    if (z.status !== 'gueltig' || z.kategorie !== 'kontrolle' || z.art !== 'S') continue;
    const st = ein.pro.get(z.id); if (!st) continue;
    const aus = new Set(z.appTot.aus), an = new Set(z.appTot.an), gnu = new Set(z.gnu.dead);
    for (const k of S2.ketten(st.brett)) {
      if (k.punkte.length > steineMax) continue;
      const status = m => { const n = k.punkte.filter(i => m.has(i)).length; return n === k.punkte.length ? 'tot' : n === 0 ? 'lebend' : 'gemischt'; };
      const a = status(aus); if (a === 'gemischt' || status(an) !== a || status(gnu) !== a) continue;
      kand.push({schluessel: `${z.id}|${L.zuGtp(k.punkte[0])}`, stellung: z.id, art: 'S', farbe: k.farbe, steine: k.punkte.length, punkte: k.punkte.map(L.zuGtp), menge: 'K', appAus: a, appAn: a, gnu: a});
    }
  }
  const sortiert = nachHash(kand, k => `stufe3|kontrolle|${basis}|${k.schluessel}`), benutzt = new Set(), wahl = [];
  const nimm = (status, n, passt) => { let c = 0; for (const k of sortiert) { if (c >= n) break; if (k.appAus !== status || benutzt.has(k.stellung) || !passt(k)) continue; benutzt.add(k.stellung); wahl.push(k); c++; } return c; };
  for (const status of ['tot', 'lebend']) {   /* tot zuerst: die selteneren Kandidaten bekommen ihre Stellungen */
    const n = soll[status]; let c = nimm(status, Math.floor(n / 2), k => k.steine === 1); c += nimm(status, n - c, k => k.steine > 1); if (c < n) c += nimm(status, n - c, () => true);
    if (c < n) throw new Error(`Kontrollketten: nur ${c} von ${n} (${status}) verfügbar`);
  }
  return wahl;
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

Beurteile, ob die markierte Kette bei bestem Spiel beider Seiten (chinesische Regeln, Flächenzählung) **bestehen bleibt oder gefangen wird**. Die Stellung kann beendet oder mitten in der Partie sein; die Unterlage sagt es. Beurteile die Stellung, wie sie auf dem Brett steht, nicht, was im weiteren Verlauf der Partie vermutlich geschehen wäre.

## Kategorien (genau eine je Unterlage)

- \`lebendig\`: Die Kette bleibt bestehen (zwei echte Augen, ausreichende Freiheiten im Kampf oder Verbindung mit einer lebenden Gruppe), auch wenn die Gegenseite zuerst zieht.
- \`tot\`: Die Kette wird gefangen, auch wenn die eigene Seite zuerst zieht.
- \`seki\`: Beide Seiten können die Kette bzw. die gegnerische Gruppe nicht fangen; beide bleiben bestehen, ohne Gebiet.
- \`ko_zugabhaengig\`: Das Ergebnis ist bei Zug von Schwarz **ein anderes** als bei Zug von Weiß (wegen eines Kos oder weil der erste Zug am entscheidenden Punkt entscheidet). Gib dann **zusätzlich** das Urteil bei Zug von Schwarz (\`urteilSchwarzAmZug\`) und bei Zug von Weiß (\`urteilWeissAmZug\`) an, jeweils \`lebendig\`, \`tot\`, \`seki\` oder \`nicht_entscheidbar\`. Die beiden Teilurteile müssen sich unterscheiden.
- \`nicht_entscheidbar\`: Du kannst es nach sorgfältigem Lesen nicht entscheiden. Das ist eine ehrliche Antwort und besser als Raten.

## Zugrecht

Die Unterlage nennt, wer als Nächstes am Zug wäre. **Dein Urteil gilt trotzdem für beide Fälle:** Lies die Stellung einmal mit Schwarz am Zug und einmal mit Weiß am Zug.

- Kommst du in beiden Fällen zum selben Ergebnis, trage dieses Ergebnis als Kategorie ein (\`lebendig\`, \`tot\`, \`seki\` oder \`nicht_entscheidbar\`), **nicht** \`ko_zugabhaengig\`.
- Kommst du zu verschiedenen Ergebnissen, trage \`ko_zugabhaengig\` mit beiden Teilurteilen ein. Trage nie nur das Urteil für die Seite ein, die laut Unterlage am Zug ist.
- Das angegebene Zugrecht brauchst du für das Ko-Verbot: Der genannte Ko-Punkt ist nur für die Seite gesperrt, die laut Unterlage am Zug ist, und nur für ihren nächsten Zug. Liest du den anderen Fall (die andere Seite zieht zuerst), gilt am Anfang kein Ko-Verbot.

## Ko

Für jedes Ko gilt eine feste Annahme: **Keine Seite hat Ko-Drohungen außerhalb des Kampfes um die markierte Kette.** Wer nicht sofort zurückschlagen darf, kann also nur am Ort weiterspielen oder passen; danach darf die Gegenseite das Ko beenden. Du zählst keine Ko-Drohungen auf dem übrigen Brett.

Daraus folgt:

- **Ko, das nur eine Seite beenden kann** (die andere könnte nur immer wieder zurückschlagen, das Ko aber nie auflösen): Das Ergebnis ist für beide Zugrechte dasselbe. Trage es direkt ein, also \`tot\`, wenn die Kette am Ende fällt, und \`lebendig\`, wenn sie am Ende steht. Nenne das Ko in der Begründung.
- **Ko, das beide Seiten beenden können:** Wer es zuerst schlagen darf, gewinnt es. Meist sind die Ergebnisse dann verschieden, und die Kategorie ist \`ko_zugabhaengig\` mit beiden Teilurteilen.
- **Doppel-Ko und mehrstufiges Ko** liest du mit derselben Annahme zu Ende; ein Doppel-Ko kann eine Kette sicher leben lassen oder sicher fallen lassen.
- **Superko:** Du prüfst nicht, ob sich eine Stellung aus der Zuggeschichte wiederholt. Entsteht in deiner Lesung ein Kreislauf, den nur ein Wiederholungsverbot über mehrere Züge auflöst (zum Beispiel ein Dreifach-Ko), trage \`nicht_entscheidbar\` ein und nenne den Kreislauf.

## Lesetiefe

- Lies den **Kampf um die markierte Kette bis zum Ergebnis**: Die Kette ist geschlagen, sie hat zwei echte Augen oder eine nicht trennbare Verbindung zu einer Gruppe mit zwei echten Augen, es ist Seki, oder es bleibt ein Ko (siehe oben). Zum Kampf gehören alle Ketten und leeren Punkte, von denen das Schicksal der markierten Kette abhängt; das kann eine große Gruppe sein.
- **Nicht verlangt** sind: Ko-Drohungen auf dem übrigen Brett, Superko gegen die Zuggeschichte, der Punktestand, die Frage, wer die Partie gewinnt, und die Frage, ob sich ein Zug für eine Seite insgesamt lohnt. Was nicht verlangt ist, mindert die Sicherheit nicht und gehört nicht unter \`offen\`.
- Es gibt **keine Zeitvorgabe** je Unterlage. Kommst du nach sorgfältigem Lesen nicht zu einem Ergebnis, ist \`nicht_entscheidbar\` die richtige Antwort.

## Begründung und Sicherheit

Schreibe zu jeder Unterlage eine **Begründung** nach allgemeinen Go-Kriterien: echte und falsche Augen, Freiheiten, Verbindungen und Schnittpunkte, Randlage und Ecke, Seki, Ko, Lesen der entscheidenden Zugfolge. Nenne die Koordinaten der entscheidenden Punkte. Gib die **Sicherheit** an:

- \`sicher\`: Du hast den Kampf um die Kette in allen Varianten bis zum Ergebnis gelesen und siehst keine Alternative.
- \`eher_sicher\`: Du hältst das Urteil für richtig, hast aber nicht jede Variante des Kampfes zu Ende gelesen.
- \`unsicher\`: Du bist dir nicht sicher. Dann schreibe unter \`offen\`, was offen bleibt.

Bei \`eher_sicher\`, \`unsicher\` und \`nicht_entscheidbar\` ist \`offen\` Pflicht.

## Hilfsmittel

- **Erlaubt** sind Skripte, die du in dieser Arbeit selbst schreibst und die nur mechanisch arbeiten: SGF nachspielen, Brett anzeigen, Freiheiten zählen, prüfen, ob ein Zug erlaubt ist, eine von dir gewählte Zugfolge durchspielen. Das Urteil und die entscheidende Zugfolge kommen von dir; ein Skript prüft sie nach, es sucht sie nicht.
- **Nicht erlaubt** sind fremde Go-Software jeder Art (Spiel- und Analysesoftware, Löser für Leben und Tod, neuronale Netze), eine selbst geschriebene automatische Suche nach dem Ergebnis, Nachschlagen im Internet oder in Datenbanken und das Befragen anderer.
- Trage im Bogen unter \`hilfsmittel\` ein, was du benutzt hast (zum Beispiel „keine“ oder „eigenes Skript zum Nachspielen und Freiheitenzählen“).

## Arbeiten in Etappen

Du darfst die Unterlagen in mehreren Etappen bearbeiten und **Teilbögen** abgeben. Ein Teilbogen hat dasselbe Format und dasselbe \`manifestSha256\`, enthält aber nur die Kennungen dieser Etappe. Halte die Reihenfolge der Vorlage ein. Jede Kennung steht in genau einem Teilbogen; ein abgegebenes Urteil wird später nicht geändert. Die Teilbögen werden danach mechanisch zu einem Bogen vereint.

Wenn du die Zeit je Unterlage mit einer Uhr messen kannst, trage sie als \`dauerSekunden\` ein. Schätze sie nicht; ohne Messung lass das Feld weg.

## Antwortformat

Gib **eine JSON-Datei** je Bogen oder Teilbogen zurück:

\`\`\`json
{
  "manifestSha256": "<Wert aus manifest.json, Feld manifestSha256>",
  "beurteiler": "KI",
  "hilfsmittel": "keine",
  "antworten": [
    {"id": "U-xxxxxx", "kategorie": "tot", "begruendung": "…", "sicherheit": "sicher"},
    {"id": "U-yyyyyy", "kategorie": "ko_zugabhaengig", "urteilSchwarzAmZug": "lebendig", "urteilWeissAmZug": "tot", "begruendung": "…", "sicherheit": "eher_sicher", "offen": "…"}
  ]
}
\`\`\`

Im vollständigen Bogen kommt jede Kennung der Vorlage (\`bogen-vorlage.json\`) **genau einmal** vor. Das Schema steht in \`bogen-schema.json\`.

## Wichtig

- Du kennst nicht, woher die Stellungen stammen, und sollst es nicht erraten. Beurteile nur, was du siehst.
- Dein Urteil ist eine Beurteilung, keine Wahrheit. Ehrliche Unsicherheit ist ausdrücklich erwünscht.
- Arbeite jede Unterlage für sich; vergleiche Unterlagen nicht untereinander.
`;
/* Fassung 2 (docs/diagonal-schluss-vorabfestlegung.md): für Pakete mit Manifest-Version 2 (zuerst das S-Paket). Pflicht: gelesene Zugfolgen je Zugrecht,
   mechanisch nachgespielt, und gemessene Zeit; „nicht_entscheidbar“ ist keine Abkürzung mehr. Fassung 1 bleibt für die alten Pakete unverändert. */
const ANLEITUNG_V2 = `# Anleitung für die Beurteilung (Fassung 2)

Du bekommst eine Reihe von Unterlagen (\`unterlagen/U-….md\`, dazu je eine SGF-Datei). In jeder Unterlage ist **eine Kette** von Steinen mit \`@\` markiert. Beurteile **jede Unterlage einzeln und unabhängig**, nur nach den Regeln des Go und nach dem, was auf dem Brett und in der Zuggeschichte steht.

## Aufgabe

Beurteile, ob die markierte Kette bei bestem Spiel beider Seiten (chinesische Regeln, Flächenzählung) **bestehen bleibt oder gefangen wird**. Die Stellung kann beendet oder mitten in der Partie sein; die Unterlage sagt es. Beurteile die Stellung, wie sie auf dem Brett steht, nicht, was im weiteren Verlauf der Partie vermutlich geschehen wäre.

## Kategorien (genau eine je Unterlage)

- \`lebendig\`: Die Kette bleibt bestehen (zwei echte Augen, ausreichende Freiheiten im Kampf oder Verbindung mit einer lebenden Gruppe), auch wenn die Gegenseite zuerst zieht.
- \`tot\`: Die Kette wird gefangen, auch wenn die eigene Seite zuerst zieht.
- \`seki\`: Beide Seiten können die Kette bzw. die gegnerische Gruppe nicht fangen; beide bleiben bestehen, ohne Gebiet.
- \`ko_zugabhaengig\`: Das Ergebnis ist bei Zug von Schwarz **ein anderes** als bei Zug von Weiß (wegen eines Kos oder weil der erste Zug am entscheidenden Punkt entscheidet). Gib dann **zusätzlich** das Urteil bei Zug von Schwarz (\`urteilSchwarzAmZug\`) und bei Zug von Weiß (\`urteilWeissAmZug\`) an, jeweils \`lebendig\`, \`tot\`, \`seki\` oder \`nicht_entscheidbar\`. Die beiden Teilurteile müssen sich unterscheiden.
- \`nicht_entscheidbar\`: Du hast den Kampf gelesen und kannst ihn trotzdem nicht entscheiden. Diese Antwort verlangt **mehr** gelesene Zugfolgen als jede andere (siehe „Gelesene Zugfolgen“). Sie ersetzt das Lesen nicht.

## Zugrecht

Die Unterlage nennt, wer als Nächstes am Zug wäre. **Dein Urteil gilt trotzdem für beide Fälle:** Lies die Stellung einmal mit Schwarz am Zug und einmal mit Weiß am Zug.

- Kommst du in beiden Fällen zum selben Ergebnis, trage dieses Ergebnis als Kategorie ein (\`lebendig\`, \`tot\`, \`seki\` oder \`nicht_entscheidbar\`), **nicht** \`ko_zugabhaengig\`.
- Kommst du zu verschiedenen Ergebnissen, trage \`ko_zugabhaengig\` mit beiden Teilurteilen ein. Trage nie nur das Urteil für die Seite ein, die laut Unterlage am Zug ist.
- Das angegebene Zugrecht brauchst du für das Ko-Verbot: Der genannte Ko-Punkt ist nur für die Seite gesperrt, die laut Unterlage am Zug ist, und nur für ihren nächsten Zug. Liest du den anderen Fall (die andere Seite zieht zuerst), gilt am Anfang kein Ko-Verbot.

## Ko

Für jedes Ko gilt eine feste Annahme: **Keine Seite hat Ko-Drohungen außerhalb des Kampfes um die markierte Kette.** Wer nicht sofort zurückschlagen darf, kann also nur am Ort weiterspielen oder passen; danach darf die Gegenseite das Ko beenden. Du zählst keine Ko-Drohungen auf dem übrigen Brett.

Daraus folgt:

- **Ko, das nur eine Seite beenden kann** (die andere könnte nur immer wieder zurückschlagen, das Ko aber nie auflösen): Das Ergebnis ist für beide Zugrechte dasselbe. Trage es direkt ein, also \`tot\`, wenn die Kette am Ende fällt, und \`lebendig\`, wenn sie am Ende steht. Nenne das Ko in der Begründung.
- **Ko, das beide Seiten beenden können:** Wer es zuerst schlagen darf, gewinnt es. Meist sind die Ergebnisse dann verschieden, und die Kategorie ist \`ko_zugabhaengig\` mit beiden Teilurteilen.
- **Doppel-Ko und mehrstufiges Ko** liest du mit derselben Annahme zu Ende; ein Doppel-Ko kann eine Kette sicher leben lassen oder sicher fallen lassen.
- **Superko:** Du prüfst nicht, ob sich eine Stellung aus der Zuggeschichte wiederholt. Entsteht in deiner Lesung ein Kreislauf, den nur ein Wiederholungsverbot über mehrere Züge auflöst (zum Beispiel ein Dreifach-Ko), trage \`nicht_entscheidbar\` ein und nenne den Kreislauf.

## Lesetiefe

- Lies den **Kampf um die markierte Kette bis zum Ergebnis**: Die Kette ist geschlagen, sie hat zwei echte Augen oder eine nicht trennbare Verbindung zu einer Gruppe mit zwei echten Augen, es ist Seki, oder es bleibt ein Ko (siehe oben). Zum Kampf gehören alle Ketten und leeren Punkte, von denen das Schicksal der markierten Kette abhängt; das kann eine große Gruppe sein.
- **Nicht verlangt** sind: Ko-Drohungen auf dem übrigen Brett, Superko gegen die Zuggeschichte, der Punktestand, die Frage, wer die Partie gewinnt, und die Frage, ob sich ein Zug für eine Seite insgesamt lohnt. Was nicht verlangt ist, mindert die Sicherheit nicht und gehört nicht unter \`offen\`.
- Es gibt **keine Zeitvorgabe** je Unterlage. Nimm dir die Zeit, die der Kampf braucht. Erst wenn du die entscheidenden Zugfolgen für beide Zugrechte gelesen hast und trotzdem kein Ergebnis siehst, ist \`nicht_entscheidbar\` die richtige Antwort.

## Gelesene Zugfolgen (Pflicht)

Jede Antwort enthält im Feld \`varianten\` die Zugfolgen, auf die sich dein Urteil stützt:

- mindestens **eine** Zugfolge, in der Schwarz zuerst zieht, und mindestens **eine**, in der Weiß zuerst zieht;
- bei \`nicht_entscheidbar\` oder Sicherheit \`unsicher\` mindestens **drei** je Zugrecht.

Jede Zugfolge hat drei Felder:

- \`beginnt\`: \`"Schwarz"\` oder \`"Weiß"\`;
- \`zuege\`: die Züge abwechselnd, beginnend mit dieser Farbe, in Koordinaten wie im Diagramm (Spalten A bis T ohne I, Zeilen 1 bis 19, zum Beispiel \`"Q19"\`), \`"pass"\` für einen Pass; mindestens ein Zug, der kein Pass ist;
- \`ergebnis\`: was nach dieser Zugfolge mit der markierten Kette ist, in mindestens einem Satz.

Wähle die Zugfolgen, die das Ergebnis entscheiden: den stärksten Angriff und die beste Verteidigung, keine beliebigen Züge. Jede Zugfolge muss sich von den anderen unterscheiden; eine Zugfolge nur aus Pässen zählt nicht.

**Jede Zugfolge wird mechanisch nachgespielt.** Sie muss nach den Regeln möglich sein: kein besetzter Punkt, kein Selbstmord, kein sofortiges Zurückschlagen im Ko. Am Anfang ist der Ko-Punkt der Unterlage nur für die Seite gesperrt, die laut Unterlage am Zug ist. Ist eine Zugfolge nicht möglich, ist der Bogen ungültig; du bekommst die Fehlermeldung und darfst die betroffene Zugfolge berichtigen. Ob eine Zugfolge gut gewählt ist, prüft das Werkzeug nicht.

## Begründung und Sicherheit

Schreibe zu jeder Unterlage eine **Begründung** nach allgemeinen Go-Kriterien: echte und falsche Augen, Freiheiten, Verbindungen und Schnittpunkte, Randlage und Ecke, Seki, Ko, Lesen der entscheidenden Zugfolge. Nenne die Koordinaten der entscheidenden Punkte. Gib die **Sicherheit** an:

- \`sicher\`: Du hast den Kampf um die Kette in allen Varianten bis zum Ergebnis gelesen und siehst keine Alternative.
- \`eher_sicher\`: Du hältst das Urteil für richtig, hast aber nicht jede Variante des Kampfes zu Ende gelesen.
- \`unsicher\`: Du bist dir nicht sicher. Dann schreibe unter \`offen\`, was offen bleibt.

Bei \`eher_sicher\`, \`unsicher\` und \`nicht_entscheidbar\` ist \`offen\` Pflicht.

## Hilfsmittel

- **Erlaubt** sind Skripte, die du in dieser Arbeit selbst schreibst und die nur mechanisch arbeiten: SGF nachspielen, Brett anzeigen, Freiheiten zählen, prüfen, ob ein Zug erlaubt ist, eine von dir gewählte Zugfolge durchspielen. Das Urteil und die entscheidende Zugfolge kommen von dir; ein Skript prüft sie nach, es sucht sie nicht.
- **Nicht erlaubt** sind fremde Go-Software jeder Art (Spiel- und Analysesoftware, Löser für Leben und Tod, neuronale Netze), eine selbst geschriebene automatische Suche nach dem Ergebnis, Nachschlagen im Internet oder in Datenbanken und das Befragen anderer.
- Trage im Bogen unter \`hilfsmittel\` ein, was du benutzt hast (zum Beispiel „keine“ oder „eigenes Skript zum Nachspielen und Freiheitenzählen“).

## Arbeiten in Etappen

Du darfst die Unterlagen in mehreren Etappen bearbeiten und **Teilbögen** abgeben. Ein Teilbogen hat dasselbe Format und dasselbe \`manifestSha256\`, enthält aber nur die Kennungen dieser Etappe. Halte die Reihenfolge der Vorlage ein. Jede Kennung steht in genau einem Teilbogen; ein abgegebenes Urteil wird später nicht geändert. Die Teilbögen werden danach mechanisch zu einem Bogen vereint.

Miss die Zeit je Unterlage mit einer Uhr und trage sie als \`dauerSekunden\` ein (Pflicht): vom Öffnen der Unterlage bis zum fertigen Urteil, ohne Wartezeit auf Rückfragen. Schätze nicht.

## Antwortformat

Gib **eine JSON-Datei** je Bogen oder Teilbogen zurück:

\`\`\`json
{
  "manifestSha256": "<Wert aus manifest.json, Feld manifestSha256>",
  "beurteiler": "KI",
  "hilfsmittel": "keine",
  "antworten": [
    {"id": "U-xxxxxx", "kategorie": "tot", "begruendung": "…", "sicherheit": "sicher", "dauerSekunden": 412,
     "varianten": [
       {"beginnt": "Schwarz", "zuege": ["S18"], "ergebnis": "Schwarz schlägt die Kette sofort."},
       {"beginnt": "Weiß", "zuege": ["S18", "T19", "pass", "T17"], "ergebnis": "Weiß bekommt nur ein Auge; Schwarz schlägt."}
     ]},
    {"id": "U-yyyyyy", "kategorie": "ko_zugabhaengig", "urteilSchwarzAmZug": "lebendig", "urteilWeissAmZug": "tot", "begruendung": "…", "sicherheit": "eher_sicher", "offen": "…", "dauerSekunden": 655,
     "varianten": [ … ]}
  ]
}
\`\`\`

Im vollständigen Bogen kommt jede Kennung der Vorlage (\`bogen-vorlage.json\`) **genau einmal** vor. Das Schema steht in \`bogen-schema.json\`.

## Wichtig

- Du kennst nicht, woher die Stellungen stammen, und sollst es nicht erraten. Beurteile nur, was du siehst.
- Dein Urteil ist eine Beurteilung, keine Wahrheit. Ehrliche Unsicherheit ist erwünscht; sie ersetzt das Lesen nicht.
- Arbeite jede Unterlage für sich; vergleiche Unterlagen nicht untereinander.
`;
const SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema', title: 'Antwortbogen', type: 'object', required: ['manifestSha256', 'antworten'],
  properties: {manifestSha256: {type: 'string'}, beurteiler: {type: 'string'}, hilfsmittel: {type: 'string'}, antworten: {type: 'array', items: {type: 'object', required: ['id', 'kategorie', 'begruendung', 'sicherheit'],
    properties: {id: {type: 'string', pattern: '^U-[0-9a-f]{6}$'}, kategorie: {enum: KATEGORIEN}, urteilSchwarzAmZug: {enum: TEILURTEILE}, urteilWeissAmZug: {enum: TEILURTEILE},
      begruendung: {type: 'string', minLength: BEGRUENDUNG_MIN}, sicherheit: {enum: SICHERHEIT}, offen: {type: 'string'}, dauerSekunden: {type: 'number', minimum: 0}}}}}};
const VARIANTEN_MIN = 1, VARIANTEN_MIN_OFFEN = 3, ERGEBNIS_MIN = 10;   /* Setzungen (docs/diagonal-schluss-vorabfestlegung.md §4): je Zugrecht; „offen“ = nicht_entscheidbar oder unsicher */
const SCHEMA_V2 = JSON.parse(JSON.stringify(SCHEMA));
SCHEMA_V2.title = 'Antwortbogen (Fassung 2)';
SCHEMA_V2.properties.antworten.items.required.push('varianten', 'dauerSekunden');
SCHEMA_V2.properties.antworten.items.properties.varianten = {type: 'array', minItems: 2, items: {type: 'object', required: ['beginnt', 'zuege', 'ergebnis'],
  properties: {beginnt: {enum: ['Schwarz', 'Weiß']}, zuege: {type: 'array', minItems: 1, items: {type: 'string', pattern: '^([A-HJ-T](1[0-9]|[1-9])|pass)$'}}, ergebnis: {type: 'string', minLength: ERGEBNIS_MIN}}}};

/* ── Stellung aus der SGF der Unterlage, Zugfolgen nachspielen (Fassung 2) ── */
function folgeAusSgf(sgf) {
  const folge = [], re = /;([BW])\[([a-s]{2})?\]/g; let m;
  while ((m = re.exec(sgf))) folge.push({farbe: m[1] === 'B' ? 1 : 2, punkt: m[2] ? (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97) : -1});
  return folge;
}
function stellungAusSgf(E, sgf) {
  const folge = folgeAusSgf(sgf), sp = spielMitKo(E, folge);
  if (sp.fehler) return {fehler: sp.fehler};
  return {brett: sp.brett, ko: sp.ko, naechste: folge.length ? 3 - folge[folge.length - 1].farbe : 1};
}
/* Spielt eine Zugfolge ab der Stellung; null heißt möglich, sonst der Grund. Einfaches Ko wird durchgesetzt, Superko nicht (wie in der Anleitung). */
function spieleVariante(E, st, beginnt, zuege) {
  const b = Uint8Array.from(st.brett);
  let farbe = beginnt, ko = beginnt === st.naechste ? st.ko : null;
  for (let i = 0; i < zuege.length; i++) {
    const z = zuege[i], name = `Zug ${i + 1} (${z})`;
    if (z === 'pass') { ko = null; farbe = 3 - farbe; continue; }
    let p; try { p = L.vonGtp(z); } catch (e) { return `${name}: keine Koordinate`; }
    if (!(p >= 0 && p < N) || L.zuGtp(p) !== z) return `${name}: keine Koordinate`;
    if (b[p]) return `${name}: Punkt besetzt`;
    if (p === ko) return `${name}: Ko-Verbot (sofortiges Zurückschlagen)`;
    const vor = Uint8Array.from(b); b[p] = farbe;
    const n = E.removeDeadGroups(b, 3 - farbe, p), g = E.floodFill(b, p);
    if (g.liberties.length === 0) return `${name}: Selbstmord`;
    ko = null;
    if (n === 1 && g.group.length === 1 && g.liberties.length === 1) { const geschlagen = [...b.keys()].find(k => vor[k] && !b[k] && k !== p); if (geschlagen === g.liberties[0]) ko = geschlagen; }
    farbe = 3 - farbe;
  }
  return null;
}
/* Stellungen je Kennung aus den Paketdateien (unterlagen/<id>.sgf) */
function stellungenAusDateien(E, dateien, reihenfolge) {
  const st = {};
  for (const id of reihenfolge) { const sgf = dateien[`unterlagen/${id}.sgf`]; st[id] = sgf === undefined ? {fehler: 'SGF fehlt'} : stellungAusSgf(E, sgf); }
  return st;
}
function pruefeVarianten(a, id, st, E, f) {
  const v = a.varianten;
  if (!(typeof a.dauerSekunden === 'number')) f.push(`${id}: dauerSekunden fehlt (Pflicht in Fassung 2)`);
  if (!Array.isArray(v)) { f.push(`${id}: varianten fehlt oder ist keine Liste (Pflicht in Fassung 2)`); return; }
  const offen = a.kategorie === 'nicht_entscheidbar' || a.sicherheit === 'unsicher', min = offen ? VARIANTEN_MIN_OFFEN : VARIANTEN_MIN, je = {1: 0, 2: 0}, gesehen = new Set();
  v.forEach((x, k) => {
    const n = `${id}: Zugfolge ${k + 1}`;
    if (!x || typeof x !== 'object') { f.push(`${n}: kein Objekt`); return; }
    const beginnt = x.beginnt === 'Schwarz' ? 1 : x.beginnt === 'Weiß' ? 2 : 0;
    if (!beginnt) { f.push(`${n}: beginnt ist nicht „Schwarz“ oder „Weiß“`); return; }
    if (!Array.isArray(x.zuege) || !x.zuege.length || !x.zuege.every(z => typeof z === 'string')) { f.push(`${n}: zuege ist keine Liste mit mindestens einem Zug`); return; }
    if (typeof x.ergebnis !== 'string' || x.ergebnis.trim().length < ERGEBNIS_MIN) f.push(`${n}: ergebnis fehlt oder ist kürzer als ${ERGEBNIS_MIN} Zeichen`);
    if (!st) { f.push(`${n}: Stellung nicht verfügbar, Zugfolge nicht prüfbar`); return; }
    if (st.fehler) { f.push(`${n}: Stellung der Unterlage nicht nachspielbar (${st.fehler})`); return; }
    const grund = spieleVariante(E, st, beginnt, x.zuege);
    if (grund) { f.push(`${n} (${x.beginnt} beginnt): ${grund}`); return; }
    /* Setzung: eine Zugfolge nur aus Pässen liest nichts, und dieselbe Zugfolge zählt nicht zweimal */
    if (x.zuege.every(z => z === 'pass')) { f.push(`${n}: besteht nur aus Pässen`); return; }
    const schluessel = beginnt + '|' + x.zuege.join(',');
    if (gesehen.has(schluessel)) { f.push(`${n}: doppelt (gleiche Zugfolge wie eine frühere)`); return; }
    gesehen.add(schluessel);
    je[beginnt]++;
  });
  if (je[1] < min || je[2] < min) f.push(`${id}: zu wenige mögliche Zugfolgen (Schwarz beginnt ${je[1]}, Weiß beginnt ${je[2]}; verlangt je ${min}${offen ? ', weil nicht_entscheidbar oder unsicher' : ''})`);
}

/* ── Paket: deterministisch aus den Eingaben ───────────────────────────── */
function erzeugePaket(E, ein, ketten, opt = {}) {
  if (opt.art && opt.probe) throw new Error('--art und --probe zusammen sind nicht vorgesehen');
  if (opt.art) {   /* Kennungen hängen nur am Schlüssel: für die geprüften Ketten dieselben wie im Gesamtpaket; dazu die Kontrollketten (für den Beurteiler nicht erkennbar) */
    ketten = ketten.filter(k => k.art === opt.art);
    ketten = ketten.concat(waehleKontrollen(ein, opt.kontrollen || K_SOLL, Math.max(1, ...ketten.map(k => k.steine))));
  }
  const version = opt.art ? 2 : 1;
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
  /* ziehung 0 ist die Ziehung der ersten Probe (§18.5); jede andere Zahl zieht unabhängig davon neu (§18.6) */
  if (opt.probe) waehl = nachHash(reihenfolge, id => `stufe3|probe${opt.ziehung ? '|' + opt.ziehung : ''}|${basis}|${id}`).slice(0, opt.probe);
  const dateien = {};
  for (const id of waehl) { dateien[`unterlagen/${id}.md`] = unterlagen.get(id).md; dateien[`unterlagen/${id}.sgf`] = unterlagen.get(id).sgf; }
  dateien['anleitung-beurteiler.md'] = version >= 2 ? ANLEITUNG_V2 : ANLEITUNG; dateien['bogen-schema.json'] = JSON.stringify(version >= 2 ? SCHEMA_V2 : SCHEMA, null, 1);
  dateien['bogen-vorlage.json'] = JSON.stringify({manifestSha256: null, beurteiler: 'KI', ...(version >= 2 ? {hilfsmittel: ''} : {}), antworten: waehl.map(id => ({id, kategorie: '', begruendung: '', sicherheit: '', ...(version >= 2 ? {dauerSekunden: null, varianten: []} : {})}))}, null, 1);
  const manifest = {version, modus: opt.probe ? 'probe' : 'haupt', ...(opt.art ? {art: opt.art} : {}), unterlagen: waehl.length, reihenfolge: waehl, dateien: Object.fromEntries(Object.entries(dateien).sort(([a], [b]) => (a < b ? -1 : 1)).map(([n, t]) => [n, sha256(t)]))};
  manifest.manifestSha256 = sha256(JSON.stringify(opt.art ? {version, modus: manifest.modus, art: opt.art, reihenfolge: manifest.reihenfolge, dateien: manifest.dateien} : {modus: manifest.modus, reihenfolge: manifest.reihenfolge, dateien: manifest.dateien}));
  dateien['manifest.json'] = JSON.stringify(manifest, null, 1);
  const geheim = Object.fromEntries(waehl.map(id => [id, aufdeckung[id]]));
  return {dateien, manifest, aufdeckung: geheim, anzahlK: waehl.filter(id => aufdeckung[id].menge === 'K').length, anzahlB1: waehl.filter(id => aufdeckung[id].menge === 'B1').length, anzahlB2: waehl.filter(id => aufdeckung[id].menge === 'B2').length};
}

/* ── Antwortbögen prüfen ───────────────────────────────────────────────── */
/* opt.teil: Teilbogen (§18.6), fehlende Kennungen sind dann kein Fehler */
function pruefeBogen(bogen, manifest, opt = {}) {
  const f = [];
  if (!bogen || typeof bogen !== 'object' || !Array.isArray(bogen.antworten)) return ['Bogen ist kein Objekt mit einer Liste „antworten“'];
  if (bogen.manifestSha256 !== manifest.manifestSha256) f.push(`manifestSha256 ${JSON.stringify(bogen.manifestSha256)} gehört nicht zu diesem Paket (erwartet ${manifest.manifestSha256})`);
  if (bogen.hilfsmittel !== undefined && typeof bogen.hilfsmittel !== 'string') f.push('hilfsmittel ist kein Text');
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
      if (TEILURTEILE.includes(a.urteilSchwarzAmZug) && a.urteilSchwarzAmZug === a.urteilWeissAmZug) f.push(`${id}: bei ko_zugabhaengig müssen sich die Teilurteile unterscheiden; gleiches Ergebnis für beide Zugrechte direkt als Kategorie ${a.urteilSchwarzAmZug} eintragen`);
    } else for (const feld of ['urteilSchwarzAmZug', 'urteilWeissAmZug']) if (a[feld] !== undefined) f.push(`${id}: ${feld} nur bei ko_zugabhaengig erlaubt`);
    if ((manifest.version || 1) >= 2) pruefeVarianten(a, id, opt.stellungen && opt.stellungen[id], opt.E, f);
    if (a.dauerSekunden !== undefined && !(typeof a.dauerSekunden === 'number' && Number.isFinite(a.dauerSekunden) && a.dauerSekunden >= 0)) f.push(`${id}: dauerSekunden ist keine Zahl ab 0`);
    if ((a.sicherheit !== 'sicher' || a.kategorie === 'nicht_entscheidbar') && (typeof a.offen !== 'string' || !a.offen.trim())) f.push(`${id}: „offen“ fehlt (Pflicht bei eher_sicher, unsicher und nicht_entscheidbar)`);
  }
  if (!opt.teil) for (const id of erwartet) if (!gesehen.has(id)) f.push(`${id}: nicht beantwortet`);
  return f;
}
/* Teilbögen vereinen (§18.6): rein mechanisch, ändert kein Urteil. Jeder Teilbogen muss für sich gültig sein und zum Manifest passen; keine Kennung darf in zwei
   Teilbögen stehen (auch nicht gleichlautend); „beurteiler“ muss überall gleich sein. Ergebnis in der Reihenfolge des Manifests. bogen ist null, solange etwas fehlt. */
function fuegeZusammen(teile, manifest, opt = {}) {
  const fehler = [], nachId = new Map(), hilfsmittel = [], beurteiler = new Set();
  teile.forEach(({name, bogen}) => {
    const f = pruefeBogen(bogen, manifest, {...opt, teil: true});
    if (f.length) { fehler.push(`${name}: ${f.length} Fehler (z. B. ${f[0]})`); return; }
    beurteiler.add(bogen.beurteiler === undefined ? null : bogen.beurteiler);
    if (bogen.hilfsmittel !== undefined && !hilfsmittel.includes(bogen.hilfsmittel)) hilfsmittel.push(bogen.hilfsmittel);
    for (const a of bogen.antworten) { if (nachId.has(a.id)) fehler.push(`${a.id}: in ${nachId.get(a.id).name} und in ${name} beantwortet`); else nachId.set(a.id, {name, a}); }
  });
  if (beurteiler.size > 1) fehler.push(`„beurteiler“ ist nicht in allen Teilbögen gleich: ${[...beurteiler].map(b => JSON.stringify(b)).join(', ')}`);
  const fehlend = manifest.reihenfolge.filter(id => !nachId.has(id));
  if (fehler.length || fehlend.length) return {bogen: null, fehler, fehlend, beantwortet: nachId.size};
  const bogen = {manifestSha256: manifest.manifestSha256};
  const b = [...beurteiler][0]; if (b !== null) bogen.beurteiler = b;
  if (hilfsmittel.length) bogen.hilfsmittel = hilfsmittel.join('; ');
  bogen.antworten = manifest.reihenfolge.map(id => nachId.get(id).a);
  return {bogen, fehler: pruefeBogen(bogen, manifest, opt), fehlend, beantwortet: nachId.size};
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
function auswertung(aufdeckung, boegen, ein, opt = {}) {
  const nurS = opt.art === 'S';
  const gruppen = Object.keys(boegen), ids = Object.keys(aufdeckung);
  const alleKetten = ids.map(id => {
    const k = aufdeckung[id], urteile = gruppen.map(g => { const a = boegen[g].find(x => x.id === id); return {gruppe: g, ...normiere(a), kategorie: a.kategorie, sicherheit: a.sicherheit}; });
    return {id, ...k, ...bewerteKette(k, urteile), urteileRoh: urteile};
  });
  /* Kontrollketten (Menge K) zählen nicht zu R+, R− oder den Übersichten; sie entscheiden nur über die Gültigkeit des Bogens */
  const proKette = alleKetten.filter(x => x.menge !== 'K'), kKetten = alleKetten.filter(x => x.menge === 'K');
  let kontrolle = null;
  if (nurS) {
    const zaehlend = kKetten.filter(x => x.ergebnis === 'gleich-richtig' || x.ergebnis === 'gleich-falsch'), abweichend = kKetten.filter(x => x.ergebnis === 'gleich-falsch');
    const ist = {lebend: kKetten.filter(x => x.gnu === 'lebend').length, tot: kKetten.filter(x => x.gnu === 'tot').length}, mindestZaehlend = Math.ceil(K_ZAEHLEND_ANTEIL * kKetten.length), gruende = [];
    if (abweichend.length > K_ABWEICHUNG_MAX) gruende.push(`${abweichend.length} Kontrollketten weichen von der gemeinsamen Referenz ab (erlaubt höchstens ${K_ABWEICHUNG_MAX}): ${abweichend.map(x => x.id).join(', ')}`);
    if (zaehlend.length < mindestZaehlend) gruende.push(`nur ${zaehlend.length} von ${kKetten.length} Kontrollketten mit einem zählenden Urteil (verlangt mindestens ${mindestZaehlend})`);
    kontrolle = {n: kKetten.length, ist, soll: {...K_SOLL}, wieFestgelegt: ist.lebend === K_SOLL.lebend && ist.tot === K_SOLL.tot, zaehlend: zaehlend.length, mindestZaehlend, abweichend: abweichend.map(x => x.id), abweichungMax: K_ABWEICHUNG_MAX, gueltig: gruende.length === 0, gruende,
      ketten: kKetten.map(x => ({id: x.id, referenz: x.gnu, steine: x.steine, ergebnis: x.ergebnis, urteile: x.urteileRoh.map(u => `${u.kategorie}/${u.sicherheit}`)}))};
  }
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
  const w1 = ein.s1bericht && ein.s1bericht.wirkung && ein.s1bericht.wirkung.S, MODI = ['flaeche', 'territory'], NAMEN = {flaeche: 'Fläche', territory: 'Territory'};
  const endstand = {}, endstandProbleme = [];
  if (!w1) endstandProbleme.push('wirkung.S fehlt im Bericht der Stufe 1');
  else for (const m of MODI) {
    const x = w1[m] && w1[m].stand;
    if (!x) { endstandProbleme.push(`${NAMEN[m]}: wirkung.S.${m}.stand fehlt`); continue; }
    const fehlt = ['n', 'aendert', 'siegerwechsel'].filter(f => !Number.isFinite(x[f]));
    if (fehlt.length) { endstandProbleme.push(`${NAMEN[m]}: ${fehlt.join(', ')} fehlt oder ist keine Zahl`); continue; }
    if (!(x.siegerwechsel >= 0 && x.siegerwechsel <= x.aendert && x.aendert <= x.n)) { endstandProbleme.push(`${NAMEN[m]}: unplausibel (siegerwechsel ${x.siegerwechsel}, aendert ${x.aendert}, n ${x.n}; erwartet 0 ≤ siegerwechsel ≤ aendert ≤ n)`); continue; }
    if (x.n !== ein.bericht2.plan.zahlen.betroffen.S) { endstandProbleme.push(`${NAMEN[m]}: n ${x.n} ist ungleich der Zahl betroffener S-Stellungen der Stufe 2 (${ein.bericht2.plan.zahlen.betroffen.S}); der Bericht gehört nicht zu diesem Lauf`); continue; }
    endstand[m] = {n: x.n, aendert: x.aendert, siegerwechsel: x.siegerwechsel, median: x.median};
    const pa = ein.bericht2.schichtA && ein.bericht2.schichtA['S|betroffen|Summe (nicht gewichtet)']; if (pa && pa.punkte && pa.punkte[m]) endstand[m].siegerWieReferenz = {aus: pa.punkte[m].siegerGleichAus, an: pa.punkte[m].siegerGleichAn, n: pa.punkte[m].n};
  }
  const endstandDa = endstandProbleme.length === 0;
  const bed = [
    {nr: 1, text: nurS ? `Pflichtprüfungen bestanden (Stufe 2 gültig, Bogen geprüft, Kontrollketten wie festgelegt: ${K_SOLL.lebend} lebend, ${K_SOLL.tot} tot)` : 'Pflichtprüfungen der Stufen 1 bis 3 bestanden (Stufe 2 gültig, Bögen geprüft)', erfuellt: !nurS || kontrolle.wieFestgelegt, ...(nurS ? {detail: `Kontrollketten ${kontrolle.ist.lebend} lebend, ${kontrolle.ist.tot} tot`} : {})},
    {nr: 2, text: `Bestätigter Nutzen: mindestens ${R_PLUS_MIN} R+ aus mindestens ${R_PLUS_PARTIEN_MIN} verschiedenen Partien (§10.5, Setzung)`, erfuellt: rPlus.length >= R_PLUS_MIN && partienPlus.size >= R_PLUS_PARTIEN_MIN, detail: `${rPlus.length} R+ aus ${partienPlus.size} Partien`},
    {nr: 3, text: nurS ? 'R− = 0 in der Schlusszählung (S; konservativ gezählt)' : 'R− = 0 in beiden Stellungsarten (konservativ gezählt)', erfuellt: rMinus.length === 0, detail: `S ${zaehle(rMinus, x => x.art === 'S')}, V ${zaehle(rMinus, x => x.art === 'V')}`},
    {nr: 4, text: 'Alle B1-Fälle entschieden (kein ungeklärter B1-Fall) und alle betroffenen Stellungen ausgewertet (keine Ausfälle in betroffenen Stellungen)', erfuellt: b1Ungeklaert.length === 0 && ausfaelleBetroffen === 0, detail: `ungeklärte B1-Fälle ${b1Ungeklaert.length}, Ausfälle in betroffenen Stellungen ${ausfaelleBetroffen}`},
    {nr: 5, text: 'Wirkung auf den Endstand (S) berichtet, einschließlich der Fälle, in denen sich der Sieger ändert (Bericht der Stufe 1, §15.4)', erfuellt: endstandDa, detail: endstandDa ? MODI.map(m => `${NAMEN[m]}: Stand ändert sich bei ${endstand[m].aendert} von ${endstand[m].n}, Sieger wechselt bei ${endstand[m].siegerwechsel}`).join('; ') : endstandProbleme.join('; ')}];
  /* Mindestumfang (§7 Nr. 7) ist eine eigene Bedingung, keine Nummer von §8: nicht erreicht heißt „Kandidatur offen“ (zu wenig Betroffene), nicht „keine positive Kandidatur“ */
  const mindest = {schwelle: MINDESTUMFANG, S: betroffen.S, V: betroffen.V, nurS, erfuellt: betroffen.S >= MINDESTUMFANG && (nurS || betroffen.V >= MINDESTUMFANG)};
  const positiv = bed.every(b => b.erfuellt) && mindest.erfuellt;
  return {proKette, kontrolle, kontrollKetten: kKetten, uebersicht, uebereinstimmung, verteilung, rPlus: rPlus.length, partienRPlus: partienPlus.size, rMinus: rMinus.length, abweichungGnu, bedingungen: bed, endstand, endstandProbleme, mindestumfang: mindest, befund: !mindest.erfuellt ? 'Kandidatur offen (zu wenig Betroffene)' : positiv ? 'positive Kandidatur' : 'keine positive Kandidatur',
    ungeklaertB2: je('B2').filter(x => x.ergebnis === 'ungeklaert').length, b1Ungeklaert: b1Ungeklaert.length};
}
function berichtMd(r, gruppen, paketInfo) {
  const m = ['# Diagonalprüfung, Stufe 3: Beurteilung (Schicht B)', '',
    '**Beurteilungen, keine Ground Truth** (§6). Beurteilergruppen werden getrennt geführt (KI, Mensch). Die Zuordnung zu App aus, App an und GNU Go wurde **erst nach allen Urteilen** aufgedeckt. Das Ergebnis ist ein Befund und kein Go (§8).', '',
    `Unterlagen: ${paketInfo.unterlagen} (B1 ${paketInfo.anzahlB1}, B2 ${paketInfo.anzahlB2}${paketInfo.anzahlK ? `, Kontrolle ${paketInfo.anzahlK}` : ''}); Beurteilergruppen: ${gruppen.join(', ')}.`, '', '## Verteilung der Urteile', '', '| Gruppe | lebendig | tot | seki | ko_zugabhaengig | nicht_entscheidbar | sicher | eher sicher | unsicher |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|'];
  for (const g of gruppen) { const v = r.verteilung[g]; m.push(`| ${g} | ${KATEGORIEN.map(c => v.kategorie[c]).join(' | ')} | ${SICHERHEIT.map(c => v.sicherheit[c]).join(' | ')} |`); }
  m.push('', '## Übereinstimmung der Beurteilung mit App aus, App an und GNU Go', '', 'Nur entschiedene, nicht unsichere Urteile. „App uneinheitlich“ und „GNU Go uneinheitlich“ (Kette teils tot, teils lebend) sind nicht eingerechnet.', '', '| Gruppe | Urteile | zählend | App aus | App an | GNU Go |', '|---|---:|---:|---|---|---|');
  for (const g of gruppen) { const u = r.uebereinstimmung[g], p = x => `${x.gleich} von ${x.n} (${x.n ? prozent(x.gleich / x.n) : '–'})`; m.push(`| ${g} | ${u.urteile} | ${u.zaehlend} | ${p(u.appAus)} | ${p(u.appAn)} | ${p(u.gnu)} |`); }
  if (r.kontrolle) {
    const k = r.kontrolle;
    m.push('', '## Kontrollketten', '', `${k.n} Kontrollketten (${k.ist.lebend} lebend, ${k.ist.tot} tot nach gemeinsamer Referenz von App und GNU Go; keine Ground Truth). Zählende Urteile: ${k.zaehlend} (verlangt mindestens ${k.mindestZaehlend}). Abweichend: ${k.abweichend.length} (erlaubt höchstens ${k.abweichungMax}). Sie zählen nicht zu R+ und R−.`, '', '| Kennung | Referenz | Steine | Urteil | Ergebnis |', '|---|---|---:|---|---|');
    for (const x of k.ketten) m.push(`| ${x.id} | ${x.referenz} | ${x.steine} | ${x.urteile.join(', ')} | ${x.ergebnis === 'gleich-richtig' ? 'wie Referenz' : x.ergebnis === 'gleich-falsch' ? 'abweichend' : 'nicht zählend'} |`);
  }
  m.push('', '## Ergebnis je Kette (getrennt nach B1 und B2)', '', '| Menge | R+ | R− | gleich richtig | gleich falsch | ungeklärt |', '|---|---:|---:|---:|---:|---:|');
  for (const k of ['B1', 'B2', 'S', 'V', 'gesamt']) { const u = r.uebersicht[k]; m.push(`| ${k === 'S' || k === 'V' ? 'Art ' + k : k} | ${u['R+']} | ${u['R-']} | ${u['gleich-richtig']} | ${u['gleich-falsch']} | ${u.ungeklaert} |`); }
  m.push('', 'R+ = aus falsch, an richtig (nur wenn alle Urteile entschieden, nicht unsicher und übereinstimmend); R− = aus richtig, an falsch (konservativ: schon ein entschiedenes, nicht unsicheres Urteil genügt); „gleich“ = App bei aus und an gleich. Ungeklärt zählt nie als Unbedenklichkeit.', '',
    '## Einzelfälle', '');
  const liste = (titel, l) => { m.push(`### ${titel} (${l.length})`, ''); if (!l.length) m.push('Keine.', ''); else { m.push('| Kennung | Menge | Art | Partie | Kette | App aus | App an | GNU Go | Urteile |', '|---|---|---|---|---|---|---|---|---|'); for (const x of l) m.push(`| ${x.id} | ${x.menge} | ${x.art} | ${x.partie} | ${x.schluessel.split('|').pop()} | ${x.appAus} | ${x.appAn} | ${x.gnu} | ${x.urteileRoh.map(u => `${u.gruppe}: ${u.wert || u.kategorie}${u.zaehlt ? '' : ' (' + u.grund + ')'}`).join('; ')} |`); m.push(''); } };
  liste('R−', r.proKette.filter(x => x.ergebnis === 'R-')); liste('R+', r.proKette.filter(x => x.ergebnis === 'R+')); liste('Ungeklärt', r.proKette.filter(x => x.ergebnis === 'ungeklaert'));
  m.push(`### GNU Go weicht von einem zählenden Urteil ab (${r.abweichungGnu.length})`, '');
  if (!r.abweichungGnu.length) m.push('Keine.', ''); else { m.push('| Kennung | Menge | Art | GNU Go | Urteile |', '|---|---|---|---|---|'); for (const x of r.abweichungGnu) m.push(`| ${x.id} | ${x.menge} | ${x.art} | ${x.gnu} | ${x.urteile.join('; ')} |`); m.push(''); }
  m.push('## Wirkung auf den Endstand (S, §8 Nr. 5)', '', 'Aus dem Bericht der Stufe 1 übernommen (nicht neu gerechnet): betroffene Schlusszählungen, bei denen der Schalter den Stand ändert, und Siegerwechsel; dazu aus der Stufe 2 die Zahl der Stände, deren Sieger mit der Referenz aus GNU Gos Tot-Liste übereinstimmt.', '');
  if (!r.endstandProbleme.length && r.endstand.flaeche && r.endstand.territory) { m.push('| Wertung | betroffene Stellungen | Stand ändert sich | Sieger wechselt | Sieger wie Referenz, aus | Sieger wie Referenz, an |', '|---|---:|---:|---:|---:|---:|'); for (const [k, n] of [['flaeche', 'Fläche'], ['territory', 'Territory']]) { const e = r.endstand[k], sr = e.siegerWieReferenz; m.push(`| ${n} | ${e.n} | ${e.aendert} | ${e.siegerwechsel} | ${sr ? sr.aus : '–'} | ${sr ? sr.an : '–'} |`); } m.push(''); } else m.push(`**Fehlt oder unvollständig (Bedingung 5 nicht erfüllt):** ${r.endstandProbleme.join('; ')}.`, '');
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
/* Fassung 2: Stellungen aus den SGF neben dem Manifest; die Dateien müssen zu den Prüfsummen im Manifest passen */
function paketStellungen(manifestPfad, manifest) {
  if ((manifest.version || 1) < 2) return {};
  const verz = path.dirname(path.resolve(manifestPfad)), dateien = {};
  for (const id of manifest.reihenfolge) {
    const n = `unterlagen/${id}.sgf`, d = path.join(verz, n);
    if (!fs.existsSync(d)) continue;
    const t = fs.readFileSync(d, 'utf8');
    if (manifest.dateien && manifest.dateien[n] !== sha256(t)) throw new Error(`${n}: Prüfsumme passt nicht zum Manifest`);
    dateien[n] = t;
  }
  const E = ladeKI({htmlPfad: path.join(__dirname, '..', '..', 'index.html'), mitNetz: false});
  return {E, stellungen: stellungenAusDateien(E, dateien, manifest.reihenfolge)};
}
function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  const html = path.join(__dirname, '..', '..', 'index.html');
  if (befehl === 'unterlagen' || befehl === 'auswerten') {
    const o = optionen(rest, ['stufe1', 'stufe2', 'archiv', 'aus', 'probe', 'probe-ziehung', 'bogen', 'art', 'kontrollen'], ['stufe1', 'stufe2', 'archiv', 'aus'], ['bogen']);
    if (o.art !== undefined && o.art !== 'S') throw new Error('--art kennt nur den Wert S');
    const art = o.art || null;
    /* --kontrollen L,T ist nur für Tests an kleinen Attrappen gedacht: mit anderen Zahlen als der Festlegung ist Bedingung 1 nie erfüllt */
    let kontrollen;
    if (o.kontrollen !== undefined) { const m = /^(\d+),(\d+)$/.exec(o.kontrollen); if (!m || !art) throw new Error('--kontrollen erwartet LEBEND,TOT und gilt nur mit --art S'); kontrollen = {lebend: +m[1], tot: +m[2]}; }
    const ein = ladeEingabe(o), E = ladeKI({htmlPfad: html, mitNetz: false}), pe = pruefeEingabe(ein);
    if (pe.gruende.length) { console.error('KEIN URTEIL: ' + pe.gruende.join(' ; ')); process.exit(1); }
    fs.mkdirSync(o.aus, {recursive: true});
    if (befehl === 'unterlagen') {
      const probe = o.probe === undefined ? 0 : +o.probe, ziehung = o['probe-ziehung'] === undefined ? 0 : +o['probe-ziehung'];
      if (!Number.isInteger(probe) || probe < 0 || !Number.isInteger(ziehung) || ziehung < 0 || (ziehung && !probe)) throw new Error('--probe und --probe-ziehung sind ganze Zahlen ab 0; --probe-ziehung nur zusammen mit --probe');
      const p = erzeugePaket(E, ein, pe.ketten, {probe, ziehung, art, kontrollen});
      schreibe(path.join(o.aus, probe ? 'probe-paket' : art ? 'beurteiler-paket-' + art : 'beurteiler-paket'), p.dateien);
      fs.mkdirSync(path.join(o.aus, 'geheim'), {recursive: true});
      fs.writeFileSync(path.join(o.aus, 'geheim', probe ? 'aufdeckung-probe.json' : art ? `aufdeckung-${art}.json` : 'aufdeckung.json'), JSON.stringify(p.aufdeckung, null, 1));
      console.log(`${probe ? 'Probe-Paket' : art ? 'Paket ' + art : 'Paket'}: ${p.manifest.unterlagen} Unterlagen (B1 ${p.anzahlB1}, B2 ${p.anzahlB2}${art ? `, Kontrolle ${p.anzahlK}` : ''}); manifestSha256 ${p.manifest.manifestSha256}`);
      return;
    }
    if (!o.bogen || !o.bogen.length) throw new Error('Option fehlt: --bogen NAME=datei');
    const p = erzeugePaket(E, ein, pe.ketten, {art, kontrollen}), boegen = {}, gruende = [], stellungen = stellungenAusDateien(E, p.dateien, p.manifest.reihenfolge);
    /* Setzung (docs/diagonal-schluss-vorabfestlegung.md §5): im S-Paket wird genau ein Bogen ausgewertet */
    if (art && o.bogen.length !== 1) { console.error(`KEIN URTEIL: im Paket ${art} wird genau ein Bogen ausgewertet, übergeben ${o.bogen.length}`); process.exit(1); }
    for (const b of o.bogen) {
      const k = b.indexOf('='), name = b.slice(0, k), datei = b.slice(k + 1);
      let bogen; try { bogen = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { gruende.push(`${name}: ${e.message}`); continue; }
      const f = pruefeBogen(bogen, p.manifest, {stellungen, E});
      if (f.length) gruende.push(`${name}: ${f.length} Fehler (z. B. ${f[0]})`); else boegen[name] = bogen.antworten;
    }
    if (gruende.length) { fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.md'), `# Diagonalprüfung, Stufe 3\n\n**UNGÜLTIG, KEIN URTEIL.** ${gruende.join(' ; ')}\n`); console.error('KEIN URTEIL: ' + gruende.join(' ; ')); process.exit(1); }
    const r = auswertung(p.aufdeckung, boegen, ein, {art});
    /* Kontrollketten entscheiden über die Gültigkeit: ungültig heißt „kein Urteil“, ohne R+ und R− zu zeigen */
    if (r.kontrolle && !r.kontrolle.gueltig) {
      const k = r.kontrolle, zeilen = k.ketten.map(x => `| ${x.id} | ${x.referenz} | ${x.urteile.join(', ')} | ${x.ergebnis === 'gleich-richtig' ? 'wie Referenz' : x.ergebnis === 'gleich-falsch' ? 'abweichend' : 'nicht zählend'} |`);
      fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.md'), `# Diagonalprüfung, Stufe 3\n\n**UNGÜLTIG, KEIN URTEIL.** Kontrollketten: ${k.gruende.join(' ; ')}\n\nDie übrigen Ketten wurden nicht ausgewertet.\n\n| Kennung | Referenz | Urteil | Ergebnis |\n|---|---|---|---|\n${zeilen.join('\n')}\n`);
      console.error('KEIN URTEIL: Kontrollketten: ' + k.gruende.join(' ; ')); process.exit(1);
    }
    const md = berichtMd(r, Object.keys(boegen), {unterlagen: p.manifest.unterlagen, anzahlB1: p.anzahlB1, anzahlB2: p.anzahlB2, anzahlK: p.anzahlK});
    fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.md'), md);
    fs.writeFileSync(path.join(o.aus, 'bericht-stufe3.json'), JSON.stringify({befund: r.befund, uebersicht: r.uebersicht, uebereinstimmung: r.uebereinstimmung, verteilung: r.verteilung, bedingungen: r.bedingungen, kontrolle: r.kontrolle, mindestumfang: r.mindestumfang, endstand: r.endstand, rPlus: r.rPlus, partienRPlus: r.partienRPlus, rMinus: r.rMinus, endstandProbleme: r.endstandProbleme, manifestSha256: p.manifest.manifestSha256}, null, 1));
    fs.writeFileSync(path.join(o.aus, 'ketten-stufe3.jsonl'), [...r.proKette, ...r.kontrollKetten].map(x => JSON.stringify(x)).join('\n') + '\n');
    console.log(md);
  } else if (befehl === 'pruefen') {
    const o = optionen(rest, ['bogen', 'manifest', 'teil'], ['bogen', 'manifest']);
    if (o.teil !== undefined && o.teil !== 'ja') throw new Error('--teil kennt nur den Wert ja');
    const manifest = JSON.parse(fs.readFileSync(o.manifest, 'utf8'));
    const f = pruefeBogen(JSON.parse(fs.readFileSync(o.bogen, 'utf8')), manifest, {teil: o.teil === 'ja', ...paketStellungen(o.manifest, manifest)});
    if (f.length) { console.error(`BOGEN UNGÜLTIG (${f.length}):\n` + f.slice(0, 50).join('\n')); process.exit(1); }
    console.log(o.teil === 'ja' ? 'Teilbogen gültig: keine Kennung doppelt oder unbekannt, alle Felder zulässig.' : 'Bogen gültig: jede Kennung genau einmal, alle Felder zulässig.');
  } else if (befehl === 'zusammenfuegen') {
    const o = optionen(rest, ['teil', 'manifest', 'aus'], ['teil', 'manifest', 'aus'], ['teil']);
    const manifest = JSON.parse(fs.readFileSync(o.manifest, 'utf8')), teile = [], ps = paketStellungen(o.manifest, manifest);
    for (const datei of o.teil) { let bogen = null; try { bogen = JSON.parse(fs.readFileSync(datei, 'utf8')); } catch (e) { bogen = null; } teile.push({name: path.basename(datei), bogen}); }
    if (new Set(teile.map(t => t.name)).size !== teile.length) throw new Error('Zwei Teilbögen haben denselben Dateinamen');
    const r = fuegeZusammen(teile, manifest, ps);
    console.log(`Teilbögen: ${teile.length}; beantwortet ${r.beantwortet} von ${manifest.reihenfolge.length}.`);
    if (r.fehler.length) { console.error(`NICHT VEREINT (${r.fehler.length} Fehler):\n` + r.fehler.slice(0, 50).join('\n')); process.exit(1); }
    if (r.fehlend.length) { console.error(`NICHT VEREINT: ${r.fehlend.length} Kennungen fehlen noch (z. B. ${r.fehlend.slice(0, 5).join(', ')}). Es wurde keine Datei geschrieben.`); process.exit(1); }
    fs.mkdirSync(path.dirname(path.resolve(o.aus)), {recursive: true}); fs.writeFileSync(o.aus, JSON.stringify(r.bogen, null, 1) + '\n');
    console.log(`Bogen geschrieben: ${o.aus} (SHA-256 ${sha256(fs.readFileSync(o.aus, 'utf8'))}).`);
  } else throw new Error('Aufruf: node diagonal-pruefung-stufe3.js unterlagen|pruefen|zusammenfuegen|auswerten ...');
}
if (require.main === module) { try { main(); } catch (e) { console.error(e.stack || e.message); process.exit(2); } }
module.exports = {ladeEingabe, pruefeEingabe, spielMitKo, sgfVon, folgeAusSgf, stellungAusSgf, spieleVariante, stellungenAusDateien, pruefeVarianten, diagramm, unterlage, erzeugePaket, pruefeBogen, fuegeZusammen, normiere, bewerteKette, auswertung, berichtMd, waehleKontrollen, K_SOLL, K_ABWEICHUNG_MAX, ANLEITUNG, ANLEITUNG_V2, SCHEMA, SCHEMA_V2, VARIANTEN_MIN, VARIANTEN_MIN_OFFEN, KATEGORIEN, SICHERHEIT, R_PLUS_MIN, R_PLUS_PARTIEN_MIN, MINDESTUMFANG};
