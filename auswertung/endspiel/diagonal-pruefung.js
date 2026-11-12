// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagonalprüfung, Stufe 1 (docs/diagonalpruefung-vorabfestlegung.md §4, §7, §11 AP3): reine Rechnung, KEIN GNU Go, keine Partie.
   Ergebnis ist nur die BETROFFENHEIT: Bei welchen Prüfstellungen unterscheidet sich die Tot-Menge von toteSteineAmEnde bei Schalter aus
   und an. Eine Aussage zur Richtigkeit ist das nicht (kein Maßstab, keine Beurteilung); das ist Gegenstand der Stufen 2 und 3.

   Drei Teilschritte, jeder in EIGENEM Prozess (ladeKI lädt per globalem eval; zwei Stände nie im selben Prozess):
     ziehen       Schritt 0: Prüfdaten aus den Archiven ziehen (ohne die Quellpartien der 563 Entwicklungseinheiten), Zählung je Gruppe,
                  Nachspiel-Kontrolle (Einspielbarkeit, Gefangene), Stellungen S (Endstellung), V (nach Zug mit Index 250, 300, 350),
                  H (Endstellungen der Handpartien, nur illustrativ) und E (563 Entwicklungsstellungen, nur für die Kontrollen).
                  Ausgabe: stellungen.jsonl, schritt0.json, schritt0.md
     rechnen      Tot-Menge und Zählstände EINES Standes für alle Stellungen. --stand alt (unveränderte Fassung, nur aus), testkopie (Test-Kopie
                  der Diagnose aus der unveränderten Fassung, nur „aus“ der Kopie), neu (index.html mit Schalter, aus und an).
     vergleichen  Kontrollen (§7 Nr. 1 bis 4), Betroffenheit je Gruppe und Stellungsart, Wirkung auf Stand und Vorschau, Handpartien getrennt.
                  Ausgabe: bericht.json, bericht.md, betroffen.jsonl (Eingabe für Stufe 2)
   Gültigkeit: nur zwei Zustände. Ungültig heißt „kein Urteil“ mit Grund, Exit 1.

   Aufrufe (Optionen als --name wert):
     node diagonal-pruefung.js ziehen --aus verz --html index.html --entwicklung <entpacktes Artefakt der Stufe C> --ausschluss <stufe-a/einheiten.jsonl>
          --gruppe "name=datei[,datei]" ... [--hand tests/stellungen]
     node diagonal-pruefung.js rechnen --stand alt|testkopie|neu --html datei --stellungen stellungen.jsonl --aus out.jsonl [--tmp verz] [--erwartet-sha sha256]
     node diagonal-pruefung.js vergleichen --aus verz --stellungen s.jsonl --schritt0 schritt0.json --alt a.jsonl --testkopie t.jsonl --neu n.jsonl [--erwartet-sha-alt sha256] */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = require('./passregel-lib.js');
const B = require('../../tests/diagonalauge-brett.js');
const {ladeKI} = require('../../tests/rahmen.js');

const N = 361, KOMI = 7.5;
const V_INDIZES = [250, 300, 350];            /* Setzung §10.2, vor Stufe 1 festgeschrieben: Stellung NACH dem Zug mit diesem (nullbasierten) Index */
const MINDESTUMFANG = 30;                      /* §7 Nr. 7: Mindestumfang für die Kandidatur, kein Sicherheitsnachweis */
const MODI = ['flaeche', 'territory'];
const sha256 = inhalt => crypto.createHash('sha256').update(inhalt).digest('hex');
const norm = p => String(p).replace(/\\/g, '/').replace(/^.*?docs\/daten\//, '');
const partieKey = (gruppe, quelle, nr) => `${gruppe}|${norm(quelle)}|${nr}`;
const komma = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
const prozent = x => `${(100 * x).toFixed(1).replace('.', ',')} %`;
const lesePfad = (p, fn) => { try { return fn(p); } catch (e) { throw new Error(`${p}: ${e.message}`); } };
const leseJsonlDatei = p => lesePfad(p, q => fs.readFileSync(q, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z)));
const schreibeJsonl = (p, zeilen) => fs.writeFileSync(p, zeilen.map(z => JSON.stringify(z)).join('\n') + (zeilen.length ? '\n' : ''));
const quantil = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

/* ── Einspielen ─────────────────────────────────────────────────────────
   folge: [{farbe, punkt}] (punkt < 0 ist ein Pass). Geprüft wird: Punkt frei, kein Selbstmord (Schlagen zuerst, wie im Spiel).
   Ko und Superko werden NICHT geprüft (kein Stellungsgedächtnis); das ist eine Grenze der Nachspiel-Kontrolle. */
function spielEin(E, folge, halteBei = []) {
  const b = new Uint8Array(N), caps = {1: 0, 2: 0}, snaps = {};
  for (let i = 0; i < folge.length; i++) {
    const z = folge[i];
    if (z.punkt >= 0) {
      if (b[z.punkt]) return {fehler: `Zug ${i} (${L.zuGtp(z.punkt)}): Punkt besetzt`};
      b[z.punkt] = z.farbe; caps[z.farbe] += E.removeDeadGroups(b, 3 - z.farbe, z.punkt);
      if (E.floodFill(b, z.punkt).liberties.length === 0) return {fehler: `Zug ${i} (${L.zuGtp(z.punkt)}): Selbstmord`};
    }
    if (halteBei.includes(i)) snaps[i] = {brett: B.brettZuText(b), caps: {1: caps[1], 2: caps[2]}};
  }
  return {fehler: null, brett: b, caps, snaps};
}
const zweiPaesse = folge => folge.length >= 2 && folge[folge.length - 1].punkt < 0 && folge[folge.length - 2].punkt < 0;
/* Zugfolge eines Archivdatensatzes (beginnt S: Schwarz zieht zuerst; Farben wechseln je Zug, auch nach einem Pass) */
function folgeAusArchiv(r) {
  const erste = r.beginnt === 'S' ? 1 : 2;
  return r.zuege.map((m, i) => {
    let p;
    if (m === 'pass') p = -1;
    else { p = L.vonGtp(m); if (p < 0) throw new Error(`Zug ${i}: ${m} ist kein Brettpunkt`); }
    return {farbe: i % 2 === 0 ? erste : 3 - erste, punkt: p};
  });
}
/* SGF einer Handpartie: nur Züge (Pass: [] oder [tt]); Vorgabesteine und Setzsteine werden nicht angenommen */
function leseSgf(text) {
  if (/;?\bA[BWE]\[/.test(text)) throw new Error('SGF mit Setzsteinen (AB, AW, AE) wird nicht unterstützt');
  const folge = [], re = /;([BW])\[([a-t]{0,2})\]/g;
  let m;
  while ((m = re.exec(text))) {
    const pass = m[2] === '' || m[2] === 'tt';
    if (!pass && (m[2].length !== 2 || /t/.test(m[2]))) throw new Error(`SGF: Koordinate ${m[2]} außerhalb des Bretts`);
    folge.push({farbe: m[1] === 'B' ? 1 : 2, punkt: pass ? -1 : (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97)});
  }
  const ergebnis = (/RE\[([^\]]*)\]/.exec(text) || [])[1] || '', komi = +((/KM\[([^\]]*)\]/.exec(text) || [])[1]);
  return {folge, ergebnis, komi};
}

/* ── ziehen (Schritt 0) ───────────────────────────────────────────────── */
function ladeEntwicklung(verz) {
  const zeilen = [];
  for (const f of fs.readdirSync(path.join(verz, 'teile')).filter(x => /^teil-\d+\.jsonl$/.test(x)))
    zeilen.push(...leseJsonlDatei(path.join(verz, 'teile', f)));
  return zeilen;
}
function ziehen(E, o) {
  const pflicht = {daten: [], replay: [], schnittmenge: []};
  const einheiten = leseJsonlDatei(o.ausschluss), entwicklung = ladeEntwicklung(o.entwicklung);
  const quellKeys = new Set(einheiten.map(e => partieKey(e.gruppe, e.quellDatei, e.nr)));
  const schluesselA = new Set(einheiten.map(e => e.schluessel)), schluesselE = new Set(entwicklung.map(e => e.schluessel));
  if (schluesselA.size !== einheiten.length || schluesselE.size !== entwicklung.length) pflicht.daten.push('doppelte Schlüssel in den Entwicklungsdaten');
  if (schluesselA.size !== schluesselE.size || [...schluesselA].some(k => !schluesselE.has(k))) pflicht.daten.push(`Einheiten der Stufe A (${schluesselA.size}) und Ergebniszeilen der Stufe C (${schluesselE.size}) sind nicht dieselbe Menge`);
  /* Duplikate (§14.4): Brettvergleich, weil die Tot-Menge nur vom Brett abhängt. Ausgeschlossen werden (a) Partien mit gleicher Zugfolge (ohne Farbe der KI)
     wie eine Quellpartie, (b) Prüfstellungen, deren Brett einer Entwicklungsstellung gleicht, (c) Prüfstellungen, deren Brett in derselben Stellungsart schon
     vorkam (auch aus anderer Zugfolge). Behalten wird der ERSTE Vertreter in der Reihenfolge Gruppe (Aufrufreihenfolge), Datei, Zeile, S vor V, V aufsteigend.
     Ausgeschlossene werden nur gezählt, nicht gerechnet. S und V werden nicht gegeneinander abgeglichen (verschiedene Verfahren). */
  const brettVon = r => (r.diagnose && r.diagnose.anfang ? r.diagnose.anfang.brett : undefined);
  for (const r of entwicklung) if (typeof brettVon(r) !== 'string' || !/^[.XO]{361}$/.test(brettVon(r))) pflicht.daten.push(`Entwicklungsstellung ${r.schluessel}: Brett unzulässig`);
  const entwBretter = new Set(entwicklung.map(brettVon));
  const stellungen = [], gruppenBericht = [], gefundeneQuellen = new Set();
  const quellFolgen = new Set(), pruefFolgen = new Set(), gesehen = {S: new Set(), V: new Set()}, liste = [];
  const folgeOhneFarbe = r => `${r.beginnt}|${r.zuege.join(',')}`;
  const behalte = (art, brett, z) => {
    if (entwBretter.has(brett)) { z.entwicklung++; return false; }
    if (gesehen[art].has(brett)) { z.doppelt++; return false; }
    gesehen[art].add(brett); return true;
  };
  /* Phase 1: Zeilen lesen, filtern, Quellpartien und ihre Zugfolgen sammeln (alle Gruppen, bevor eine Prüfpartie beurteilt wird) */
  for (const g of o.gruppen) {
    const gb = {name: g.name, dateien: g.dateien, zeilen: 0, uebersprungen: {}, quellpartienAusgeschlossen: 0, pruefpartien: 0,
      s: {auswertbar: 0, behalten: 0, nicht: {}}, v: Object.fromEntries(V_INDIZES.map(i => [i, 0])), vBehalten: Object.fromEntries(V_INDIZES.map(i => [i, 0])),
      ausgeschlossen: {partieGleichQuelle: 0, S: {entwicklung: 0, doppelt: 0}, V: {entwicklung: 0, doppelt: 0}},
      laengen: [], gleicheZugfolgeImPruefsatz: 0, gefangenGeprueft: 0, gefangenFehlt: 0};
    gruppenBericht.push(gb);
    const skip = grund => { gb.uebersprungen[grund] = (gb.uebersprungen[grund] || 0) + 1; };
    const gesehenNr = new Set(), mine = [];
    for (const datei of g.dateien) for (const r of L.leseJsonl(datei)) {
      gb.zeilen++;
      if (r.abgebrochen || !Array.isArray(r.zuege) || !r.wirFarbe) { skip('abgebrochen oder unvollständig'); continue; }
      if (r.vorgabe > 0 || r.komi !== 7.5 || (r.vorgabeSteine && r.vorgabeSteine.length)) { skip('Vorgabe oder Komi ≠ 7,5'); continue; }
      if (!Number.isInteger(r.nr) || (r.beginnt !== 'S' && r.beginnt !== 'W') || (r.wirFarbe !== 'S' && r.wirFarbe !== 'W')) { pflicht.daten.push(`${g.name}|${norm(datei)}|${r.nr}: nr, beginnt oder wirFarbe unzulässig`); continue; }
      const key = partieKey(g.name, datei, r.nr);
      if (gesehenNr.has(key)) { pflicht.daten.push(`${key}: Partienummer doppelt in den Archivdateien`); continue; }
      gesehenNr.add(key);
      if (quellKeys.has(key)) { gb.quellpartienAusgeschlossen++; gefundeneQuellen.add(key); quellFolgen.add(folgeOhneFarbe(r)); continue; }
      mine.push({datei, r, key});
    }
    liste.push(mine);
  }
  /* Phase 2: Prüfpartien einspielen, Stellungen bilden, Duplikate ausschließen */
  o.gruppen.forEach((g, gi) => {
    const gb = gruppenBericht[gi];
    const nichtS = grund => { gb.s.nicht[grund] = (gb.s.nicht[grund] || 0) + 1; };
    for (const {datei, r, key} of liste[gi]) {
      const fk = folgeOhneFarbe(r);
      if (quellFolgen.has(fk)) { gb.ausgeschlossen.partieGleichQuelle++; continue; }
      gb.pruefpartien++;
      if (pruefFolgen.has(fk)) gb.gleicheZugfolgeImPruefsatz++; else pruefFolgen.add(fk);
      gb.laengen.push(r.zuege.length);
      let folge;
      try { folge = folgeAusArchiv(r); } catch (e) { pflicht.replay.push(`${key}: ${e.message}`); continue; }
      const halte = V_INDIZES.filter(i => folge.length > i);
      const sp = spielEin(E, folge, halte);
      if (sp.fehler) { pflicht.replay.push(`${key}: ${sp.fehler}`); continue; }
      const ki = r.wirFarbe === 'S' ? 1 : 2;
      if (r.gefangen && Number.isFinite(r.gefangen.wir) && Number.isFinite(r.gefangen.gegner)) {
        gb.gefangenGeprueft++;
        if (sp.caps[ki] !== r.gefangen.wir || sp.caps[3 - ki] !== r.gefangen.gegner)
          pflicht.replay.push(`${key}: Gefangene weichen ab (Einspielen wir ${sp.caps[ki]}, gegner ${sp.caps[3 - ki]}; Archiv ${r.gefangen.wir}, ${r.gefangen.gegner})`);
      } else gb.gefangenFehlt++;
      const basis = {gruppe: g.name, quelle: norm(datei), nr: r.nr, partie: key, kiFarbe: ki, komi: KOMI};
      /* S: nur reguläre Enden (zwei Pässe in Folge, keine Aufgabe, Endstand vorhanden) */
      if (r.aufgabe) nichtS('Aufgabe'); else if (!zweiPaesse(folge)) nichtS('Ende nicht mit zwei Pässen (Zuglimit oder anders)'); else if (!Number.isFinite(r.endstand)) nichtS('Endstand fehlt');
      else {
        gb.s.auswertbar++;
        const bt = B.brettZuText(sp.brett);
        if (behalte('S', bt, gb.ausgeschlossen.S)) { gb.s.behalten++; stellungen.push({id: `${key}|S`, art: 'S', ...basis, index: folge.length - 1, brett: bt, caps: [sp.caps[1], sp.caps[2]]}); }
      }
      for (const i of halte) {
        gb.v[i]++; const sn = sp.snaps[i];
        if (behalte('V', sn.brett, gb.ausgeschlossen.V)) { gb.vBehalten[i]++; stellungen.push({id: `${key}|V${i}`, art: 'V', ...basis, index: i, brett: sn.brett, caps: [sn.caps[1], sn.caps[2]]}); }
      }
    }
  });
  /* §7 Nr. 1: jede Quellpartie im Archiv gefunden, Schnittmenge (aus den tatsächlich gebildeten Stellungen) leer */
  const fehlendeQuellen = [...quellKeys].filter(k => !gefundeneQuellen.has(k));
  if (fehlendeQuellen.length) pflicht.daten.push(`${fehlendeQuellen.length} Quellpartien der Entwicklungsdaten nicht in den angegebenen Archivdateien: ${fehlendeQuellen.slice(0, 5).join('; ')}`);
  for (const k of new Set(stellungen.map(x => x.partie))) if (quellKeys.has(k)) pflicht.schnittmenge.push(k);
  /* H: Handpartien, nur Endstellung, nur illustrativ; E: Entwicklungsstellungen, nur für die Kontrollen */
  const hand = [];
  if (o.hand) for (const f of fs.readdirSync(o.hand).filter(x => /^hand-.*\.sgf$/.test(x)).sort()) {
    const info = {datei: f};
    try {
      const sg = leseSgf(fs.readFileSync(path.join(o.hand, f), 'utf8'));
      if (!Number.isFinite(sg.komi)) throw new Error('KM[] fehlt oder ist keine Zahl');
      const sp = spielEin(E, sg.folge);
      if (sp.fehler) { pflicht.replay.push(`Handpartie ${f}: ${sp.fehler}`); info.fehler = sp.fehler; }
      else {
        info.zuege = sg.folge.length; info.ergebnis = sg.ergebnis; info.komi = sg.komi;
        info.regulaer = zweiPaesse(sg.folge) && !/R$/.test(sg.ergebnis);
        info.grundNichtRegulaer = info.regulaer ? null : (/R$/.test(sg.ergebnis) ? 'Aufgabe' : 'Ende nicht mit zwei Pässen');
        info.komiStandard = sg.komi === KOMI;
        stellungen.push({id: `H|${f}`, art: 'H', gruppe: 'Handpartien', quelle: f, nr: 0, partie: `H|${f}`, kiFarbe: 0, komi: sg.komi, index: sg.folge.length - 1, brett: B.brettZuText(sp.brett), caps: [sp.caps[1], sp.caps[2]], regulaer: info.regulaer});
      }
    } catch (e) { pflicht.daten.push(`Handpartie ${f}: ${e.message}`); info.fehler = e.message; }
    hand.push(info);
  }
  for (const r of entwicklung) stellungen.push({id: `E|${r.schluessel}`, art: 'E', gruppe: r.gruppe, quelle: r.datei, nr: r.nr, partie: null, kiFarbe: r.kiFarbe, komi: KOMI, index: r.index, brett: r.diagnose.anfang.brett, caps: null});
  const ids = new Set(stellungen.map(s => s.id));
  if (ids.size !== stellungen.length) pflicht.daten.push('doppelte Stellungs-IDs');
  const schritt0 = {version: 1, vIndizes: V_INDIZES, quellpartien: quellKeys.size, einheitenEntwicklung: einheiten.length, entwicklungsstellungen: entwicklung.length,
    gruppen: gruppenBericht.map(g => ({...g, laengen: g.laengen.length ? {n: g.laengen.length, min: Math.min(...g.laengen), q1: quantil(g.laengen, 0.25), median: quantil(g.laengen, 0.5), q3: quantil(g.laengen, 0.75), max: Math.max(...g.laengen),
      kuerzerAls251: g.laengen.filter(x => x <= 250).length, kuerzerAls301: g.laengen.filter(x => x <= 300).length, kuerzerAls351: g.laengen.filter(x => x <= 350).length} : null})),
    handpartien: hand, stellungen: {S: stellungen.filter(s => s.art === 'S').length, V: stellungen.filter(s => s.art === 'V').length, H: stellungen.filter(s => s.art === 'H').length, E: entwicklung.length},
    pflichtfehler: pflicht, gueltig: Object.values(pflicht).every(a => a.length === 0),
    ausgeschlossen: gruppenBericht.reduce((t, g) => ({partieGleichQuelle: t.partieGleichQuelle + g.ausgeschlossen.partieGleichQuelle,
      S: {entwicklung: t.S.entwicklung + g.ausgeschlossen.S.entwicklung, doppelt: t.S.doppelt + g.ausgeschlossen.S.doppelt},
      V: {entwicklung: t.V.entwicklung + g.ausgeschlossen.V.entwicklung, doppelt: t.V.doppelt + g.ausgeschlossen.V.doppelt}}),
      {partieGleichQuelle: 0, S: {entwicklung: 0, doppelt: 0}, V: {entwicklung: 0, doppelt: 0}}),
    hinweis: 'Zählung vor jeder Rechnung (Schritt 0, §3.2). Duplikate (§14.4): Partien mit gleicher Zugfolge wie eine Quellpartie, Stellungen mit dem Brett einer Entwicklungsstellung und Stellungen mit einem Brett, das in derselben Stellungsart schon vorkam, sind aus der Hauptprüfung ausgeschlossen, nur gezählt und nicht gerechnet; behalten wird der erste Vertreter in Dateireihenfolge.'};
  return {stellungen, schritt0};
}
function berichtSchritt0(s0) {
  const m = ['# Diagonalprüfung, Schritt 0: Prüfdaten', '', `Zählung vor jeder Rechnung. Quellpartien der Entwicklungsdaten (ausgeschlossen): ${s0.quellpartien} verschiedene Partien in ${s0.einheitenEntwicklung} Einheiten; Entwicklungsstellungen: ${s0.entwicklungsstellungen}.`,
    `Zugindizes für V: ${s0.vIndizes.join(', ')} (Stellung nach dem Zug mit diesem nullbasierten Index; Partie muss länger sein).`, '',
    '| Gruppe | Zeilen | übersprungen | Quellpartien ausgeschlossen | gleiche Zugfolge wie Quellpartie (ausgeschlossen) | Prüfpartien | davon gleiche Zugfolge im Prüfsatz (nur gezählt) |', '|---|---:|---|---:|---:|---:|---:|'];
  for (const g of s0.gruppen) m.push(`| ${g.name} | ${g.zeilen} | ${JSON.stringify(g.uebersprungen)} | ${g.quellpartienAusgeschlossen} | ${g.ausgeschlossen.partieGleichQuelle} | ${g.pruefpartien} | ${g.gleicheZugfolgeImPruefsatz} |`);
  m.push('', '### Stellungen und ausgeschlossene Duplikate (Brettvergleich, §14.4)', '',
    '| Gruppe | S möglich | S gleich Entwicklungsbrett | S doppeltes Brett | S behalten | S nicht (Grund) | V möglich (250/300/350) | V gleich Entwicklungsbrett | V doppeltes Brett | V behalten (250/300/350) |', '|---|---:|---:|---:|---:|---|---|---:|---:|---|');
  for (const g of s0.gruppen) m.push(`| ${g.name} | ${g.s.auswertbar} | ${g.ausgeschlossen.S.entwicklung} | ${g.ausgeschlossen.S.doppelt} | ${g.s.behalten} | ${JSON.stringify(g.s.nicht)} | ${g.v[250]}/${g.v[300]}/${g.v[350]} | ${g.ausgeschlossen.V.entwicklung} | ${g.ausgeschlossen.V.doppelt} | ${g.vBehalten[250]}/${g.vBehalten[300]}/${g.vBehalten[350]} |`);
  m.push('', '### Partielängen der Prüfpartien (Züge einschließlich Pässe)', '', '| Gruppe | n | min | Q1 | Median | Q3 | max | ≤ 250 | ≤ 300 | ≤ 350 |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const g of s0.gruppen) { const l = g.laengen; m.push(l ? `| ${g.name} | ${l.n} | ${l.min} | ${l.q1} | ${l.median} | ${l.q3} | ${l.max} | ${l.kuerzerAls251} | ${l.kuerzerAls301} | ${l.kuerzerAls351} |` : `| ${g.name} | 0 | – | – | – | – | – | – | – | – |`); }
  m.push('', `Gefangene gegen das Archiv geprüft: ${s0.gruppen.map(g => `${g.name} ${g.gefangenGeprueft} (fehlt: ${g.gefangenFehlt})`).join('; ')}.`,
    `Stellungen: S ${s0.stellungen.S}, V ${s0.stellungen.V}, Handpartien ${s0.stellungen.H}, Entwicklung ${s0.stellungen.E}.`, '', s0.hinweis, '');
  m.push(s0.gueltig ? 'Pflichtprüfungen Schritt 0: bestanden.' : '**UNGÜLTIG (kein Urteil):** ' + Object.entries(s0.pflichtfehler).filter(([, a]) => a.length).map(([k, a]) => `${k}: ${a.length} (z. B. ${a.slice(0, 3).join(' | ')})`).join(' ; '));
  return m.join('\n') + '\n';
}

/* ── rechnen ──────────────────────────────────────────────────────────── */
const indizesVon = tot => Array.from(tot).flatMap((t, i) => (t ? [i] : []));
function rechneStellung(E, s, diag) {
  const brett = B.brettAusText(s.brett);
  const tot = diag === undefined ? E.toteSteineAmEnde(brett) : E.toteSteineAmEnde(brett, undefined, undefined, diag);
  const aus = {tot: indizesVon(tot)};
  if (s.art === 'E') return aus;
  const caps = {1: s.caps[0], 2: s.caps[1]};
  if (s.art === 'S' || s.art === 'H') {
    aus.zaehl = {};
    for (const w of MODI) { const z = L.zaehleMitTotListe(brett, caps, aus.tot, s.komi, E.NEIGHBORS, w); aus.zaehl[w] = {schwarz: z.schwarz, weiss: z.weiss, stand: z.stand}; }
  } else {
    aus.vorschau = {};
    for (const w of MODI) {
      const v = diag === undefined ? E.zaehlVorschau(brett, s.komi, {modus: w, gefangen: caps}) : E.zaehlVorschau(brett, s.komi, {modus: w, gefangen: caps, diagonalAuge: diag});
      aus.vorschau[w] = {hash: B.hashVorschau(v), standNur: v.nurBewiesen.stand, standMit: v.mitSchaetzung.stand, anzahl: v.anzahl, sicher: v.sicher};
    }
  }
  return aus;
}
function rechnen(E, o, stellungen, htmlSha) {
  const stand = o.stand, p = E.PARAMS;
  if (stand === 'neu') { if (p.diagonalAugeEnde !== 0) throw new Error(`--stand neu: PARAMS.diagonalAugeEnde ist ${p.diagonalAugeEnde}, erwartet 0 (Standard)`); }
  else if (p.diagonalAugeEnde !== undefined) throw new Error(`--stand ${stand}: diese index.html kennt den Schalter schon; erwartet die unveränderte Fassung`);
  const zeilen = [{kopf: {stand, htmlSha256: htmlSha, pid: process.pid, n: stellungen.length, node: process.version}}];
  for (const s of stellungen) {
    const z = {id: s.id, aus: rechneStellung(E, s, stand === 'neu' ? false : undefined)};
    if (stand === 'neu') z.an = rechneStellung(E, s, true);
    zeilen.push(z);
  }
  return zeilen;
}

/* ── vergleichen ──────────────────────────────────────────────────────── */
const gleichListe = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
function ladeStand(zeilen) {
  const kopf = zeilen[0] && zeilen[0].kopf;
  if (!kopf) throw new Error('Ergebnisdatei ohne Kopfzeile');
  return {kopf, jeId: new Map(zeilen.slice(1).map(z => [z.id, z])), reihenfolge: zeilen.slice(1).map(z => z.id)};
}
function wirkung(paare) {
  const d = paare.map(([a, b]) => b - a);
  return {n: paare.length, aendert: d.filter(x => x !== 0).length, siegerwechsel: paare.filter(([a, b]) => (a > 0) !== (b > 0)).length,
    min: d.length ? Math.min(...d) : null, median: quantil(d, 0.5), max: d.length ? Math.max(...d) : null};
}
function vergleichen(stellungen, schritt0, alt, testkopie, neu, erwartetAltSha) {
  const gruende = [], kontrollen = [];
  const kontrolle = (nr, name, fehler, extra = {}) => { kontrollen.push({nr, name, ok: fehler.length === 0, fehler: fehler.slice(0, 20), anzahlFehler: fehler.length, ...extra}); if (fehler.length) gruende.push(`${name}: ${fehler.length} (z. B. ${fehler[0]})`); };
  const pf = schritt0.pflichtfehler;
  kontrolle('§7 Nr. 1', 'Daten (Schritt 0), Schnittmenge mit den Quellpartien leer', [...pf.daten, ...pf.schnittmenge]);
  kontrolle('§7 Nr. 2', 'Nachspiel-Kontrolle (Einspielbarkeit, Gefangene gegen Archiv)', pf.replay);
  /* §14.4: unabhängig von ziehen aus den Stellungen selbst: kein Prüfbrett gleicht einem Entwicklungsbrett, kein Brett kommt in derselben Stellungsart doppelt vor */
  const dupF = [], eb = new Set(stellungen.filter(x => x.art === 'E').map(x => x.brett)), gs = {S: new Set(), V: new Set()};
  for (const x of stellungen) {
    if (x.art !== 'S' && x.art !== 'V') continue;
    if (eb.has(x.brett)) dupF.push(`${x.id}: Brett gleicht einer Entwicklungsstellung`);
    else if (gs[x.art].has(x.brett)) dupF.push(`${x.id}: Brett kommt in der Hauptprüfung doppelt vor`);
    gs[x.art].add(x.brett);
  }
  kontrolle('§14.4', 'Hauptprüfung ohne Entwicklungsbretter und ohne doppelte Bretter (je Stellungsart)', dupF);
  /* Vollständigkeit und Prozesse */
  const vollst = [], ids = stellungen.map(s => s.id);
  for (const [n, st] of [['alt', alt], ['testkopie', testkopie], ['neu', neu]]) {
    if (st.kopf.stand !== n) vollst.push(`${n}: Kopf nennt den Stand ${st.kopf.stand}`);
    if (!gleichListe(st.reihenfolge, ids)) vollst.push(`${n}: Stellungen und Reihenfolge weichen von stellungen.jsonl ab (${st.reihenfolge.length} statt ${ids.length})`);
  }
  if (new Set([alt.kopf.pid, testkopie.kopf.pid, neu.kopf.pid]).size !== 3) vollst.push('Die drei Stände liefen nicht in drei verschiedenen Prozessen');
  if (erwartetAltSha && alt.kopf.htmlSha256 !== erwartetAltSha) vollst.push(`alt: index.html SHA-256 ${alt.kopf.htmlSha256} statt ${erwartetAltSha}`);
  if (alt.kopf.htmlSha256 === neu.kopf.htmlSha256) vollst.push('alt und neu sind dieselbe index.html');
  kontrolle('Vollständigkeit', 'Ergebnisdateien: gleiche Stellungen, drei Prozesse, erwartete Fassung', vollst);
  if (vollst.length) return abschluss();
  const get = (st, id) => st.jeId.get(id);
  /* §7 Nr. 3: bei aus ist die Tot-Menge gleich der unveränderten Fassung (und alle Zählstände) */
  const f3 = [], f4 = [], f4pruef = [], f5 = [];
  const stat = {mitTot: {S: 0, V: 0, E: 0, H: 0}, anDiffE: 0, anDiffPruef: 0, n: {S: 0, V: 0, E: 0, H: 0}};
  for (const s of stellungen) {
    const a = get(alt, s.id).aus, t = get(testkopie, s.id).aus, nz = get(neu, s.id);
    stat.n[s.art]++; if (a.tot.length) stat.mitTot[s.art]++;
    if (!gleichListe(a.tot, nz.aus.tot)) f3.push(`${s.id}: Tot-Menge bei aus weicht von der unveränderten Fassung ab`);
    else if (s.art === 'S' || s.art === 'H') { for (const w of MODI) if (JSON.stringify(a.zaehl[w]) !== JSON.stringify(nz.aus.zaehl[w])) f3.push(`${s.id}: Zählstand ${w} bei aus weicht ab`); }
    else if (s.art === 'V') { for (const w of MODI) if (a.vorschau[w].hash !== nz.aus.vorschau[w].hash) f3.push(`${s.id}: Vorschau ${w} bei aus weicht ab`); }
    /* §7 Nr. 4: bei an gleich der Test-Kopie der Diagnose (563 Entwicklungsstellungen), zusätzlich auf den Prüfstellungen */
    const gleichT = gleichListe(t.tot, nz.an.tot);
    if (!gleichT) (s.art === 'E' ? f4 : f4pruef).push(`${s.id}: Tot-Menge bei an weicht von der Test-Kopie ab`);
    else if (s.art === 'S' || s.art === 'H') { for (const w of MODI) if (JSON.stringify(t.zaehl[w]) !== JSON.stringify(nz.an.zaehl[w])) f4pruef.push(`${s.id}: Zählstand ${w} bei an weicht von der Test-Kopie ab`); }
    else if (s.art === 'V') { for (const w of MODI) if (t.vorschau[w].hash !== nz.an.vorschau[w].hash) f4pruef.push(`${s.id}: Vorschau ${w} bei an weicht von der Test-Kopie ab`); }
    /* innere Konsistenz: gleiche Tot-Menge bei aus und an heißt gleiche Zählstände; „nur Bewiesenes“ hängt nie von der Tot-Menge ab */
    const gleichAA = gleichListe(nz.aus.tot, nz.an.tot);
    if (!gleichAA) { if (s.art === 'E') stat.anDiffE++; else stat.anDiffPruef++; }
    if (s.art === 'S' || s.art === 'H') { if (gleichAA) for (const w of MODI) if (JSON.stringify(nz.aus.zaehl[w]) !== JSON.stringify(nz.an.zaehl[w])) f5.push(`${s.id}: gleiche Tot-Menge, aber anderer Zählstand ${w}`); }
    else if (s.art === 'V') for (const w of MODI) {
      if (gleichAA && nz.aus.vorschau[w].hash !== nz.an.vorschau[w].hash) f5.push(`${s.id}: gleiche Tot-Menge, aber andere Vorschau ${w}`);
      if (nz.aus.vorschau[w].standNur !== nz.an.vorschau[w].standNur) f5.push(`${s.id}: „nur Bewiesenes“ ${w} ändert sich`);
    }
  }
  /* Vorprüfung der Fallabdeckung: „gleich“ gilt erst, wenn die Prüfung Fälle enthält, an denen ein Unterschied sichtbar würde */
  const abdeckung = [];
  for (const art of ['S', 'V', 'E']) if (stat.n[art] > 0 && stat.mitTot[art] === 0) abdeckung.push(`Stellungsart ${art}: keine Stellung mit nicht leerer Tot-Menge`);
  if (stat.n.E === 0) abdeckung.push('keine Entwicklungsstellungen');
  else if (stat.anDiffE === 0) abdeckung.push('Entwicklungsstellungen: der Schalter ändert in keiner Stellung die Tot-Menge (Kontrolle ohne Aussagekraft)');
  if (stat.n.S + stat.n.V === 0) abdeckung.push('keine Prüfstellungen');
  kontrolle('§7 Nr. 3', 'Identität bei aus: Tot-Menge und Zählstände gleich der unveränderten Fassung', f3, {stellungen: stellungen.length});
  kontrolle('Vorprüfung', 'Fallabdeckung der Identitätskontrolle (sonst KEIN URTEIL)', abdeckung, {mitTotMenge: stat.mitTot, stellungen: stat.n, entwicklungBetroffen: stat.anDiffE});
  kontrolle('§7 Nr. 4', 'Konsistenz bei an: Tot-Menge gleich der Test-Kopie der Diagnose (Entwicklungsstellungen)', f4, {entwicklungBetroffen: stat.anDiffE, entwicklung: stat.n.E});
  kontrolle('Setzung', 'Konsistenz bei an auf den Prüfstellungen und Handpartien gleich der Test-Kopie (zusätzlich, über §7 Nr. 4 hinaus)', f4pruef);
  kontrolle('Innere Konsistenz', 'gleiche Tot-Menge heißt gleiche Zählstände; „nur Bewiesenes“ unverändert', f5);
  return abschluss();

  function abschluss() {
    const gueltig = gruende.length === 0;
    if (!gueltig) return {bericht: {gueltig, urteil: 'KEIN URTEIL', gruende, kontrollen}, md: berichtMd({gueltig, gruende, kontrollen}), betroffen: []};
    /* Betroffenheit der Prüfstellungen (S, V) je Gruppe und Art; Handpartien getrennt */
    const rec = [], betroffen = [];
    for (const s of stellungen) {
      if (s.art === 'E') continue;
      const nz = get(neu, s.id), a = new Set(nz.aus.tot), b = new Set(nz.an.tot);
      const zusaetzlich = [...b].filter(i => !a.has(i)), wieder = [...a].filter(i => !b.has(i));
      const r = {s, betroffen: zusaetzlich.length + wieder.length > 0, zusaetzlich: zusaetzlich.length, wieder: wieder.length, nz};
      rec.push(r);
      if (r.betroffen && s.art !== 'H') betroffen.push({id: s.id, art: s.art, gruppe: s.gruppe, quelle: s.quelle, nr: s.nr, index: s.index, partie: s.partie, kiFarbe: s.kiFarbe,
        zusaetzlichTot: zusaetzlich.map(L.zuGtp), wiederLebend: wieder.map(L.zuGtp)});
    }
    const pruef = rec.filter(r => r.s.art === 'S' || r.s.art === 'V');
    const artSchluessel = s => (s.art === 'V' ? ['V', `V${s.index}`] : [s.art]);
    const tab = {};
    const eintrag = (gruppe, art) => (tab[gruppe + '|' + art] = tab[gruppe + '|' + art] || {gruppe, art, n: 0, betroffen: 0, partien: new Set(), betroffenePartien: new Set(), zusaetzlich: 0, wieder: 0});
    for (const r of pruef) for (const art of artSchluessel(r.s)) for (const gruppe of [r.s.gruppe, 'Summe (nicht gewichtet)']) {
      const e = eintrag(gruppe, art); e.n++; e.partien.add(r.s.partie);
      if (r.betroffen) { e.betroffen++; e.betroffenePartien.add(r.s.partie); e.zusaetzlich += r.zusaetzlich; e.wieder += r.wieder; }
    }
    const betroffenheit = Object.values(tab).map(e => ({gruppe: e.gruppe, art: e.art, stellungen: e.n, partien: e.partien.size, betroffen: e.betroffen, betroffenePartien: e.betroffenePartien.size,
      anteil: e.n ? e.betroffen / e.n : null, cp: e.n ? L.cpIntervall(e.betroffen, e.n) : null, steineZusaetzlichTot: e.zusaetzlich, steineWiederLebend: e.wieder}));
    const wirk = {};
    for (const art of ['S', 'V']) {
      const b = pruef.filter(r => r.s.art === art && r.betroffen);
      wirk[art] = {};
      for (const w of MODI) {
        if (art === 'S') wirk[art][w] = {stand: wirkung(b.map(r => [r.nz.aus.zaehl[w].stand, r.nz.an.zaehl[w].stand]))};
        else wirk[art][w] = {mitAnnahmen: wirkung(b.map(r => [r.nz.aus.vorschau[w].standMit, r.nz.an.vorschau[w].standMit])), nurBewiesen: wirkung(b.map(r => [r.nz.aus.vorschau[w].standNur, r.nz.an.vorschau[w].standNur]))};
      }
    }
    const hand = rec.filter(r => r.s.art === 'H').map(r => ({datei: r.s.quelle, regulaer: r.s.regulaer, komi: r.s.komi, totAus: r.nz.aus.tot.length, totAn: r.nz.an.tot.length, betroffen: r.betroffen, zusaetzlichTot: r.zusaetzlich, wiederLebend: r.wieder,
      stand: Object.fromEntries(MODI.map(w => [w, {aus: r.nz.aus.zaehl[w].stand, an: r.nz.an.zaehl[w].stand}]))}));
    const summe = (art) => betroffenheit.find(e => e.gruppe.startsWith('Summe') && e.art === art);
    const umfang = {S: summe('S') ? summe('S').betroffen : 0, V: summe('V') ? summe('V').betroffen : 0};
    const bericht = {gueltig, urteil: 'gültig', kontrollen, ausgeschlossen: schritt0.ausgeschlossen, betroffenheit, wirkung: wirk, handpartien: hand, mindestumfang: {schwelle: MINDESTUMFANG, betroffenS: umfang.S, betroffenV: umfang.V, S: umfang.S >= MINDESTUMFANG, V: umfang.V >= MINDESTUMFANG},
      entwicklung: {stellungen: stat.n.E, betroffen: stat.anDiffE, hinweis: 'nur Kontrolle, nicht Teil der Auswertung (§3.1)'}};
    return {bericht, md: berichtMd({gueltig, gruende, kontrollen, betroffenheit, wirk, hand, umfang, schritt0, stat}), betroffen};
  }
}
function berichtMd(x) {
  const m = ['# Diagonalprüfung, Stufe 1: Betroffenheit', '',
    'Reine Rechnung auf Archivdaten, kein GNU Go. Ergebnis ist **nur die Betroffenheit** (Tot-Menge bei Schalter aus gegen an). Das ist **keine Aussage zur Richtigkeit** und keine Beurteilung; ein Standardwechsel oder eine Kandidatur folgt daraus nicht (§8, §11).', '',
    '## Kontrollen', '', '| Kontrolle | Name | Ergebnis |', '|---|---|---|'];
  for (const k of x.kontrollen) m.push(`| ${k.nr} | ${k.name} | ${k.ok ? 'bestanden' : `**NICHT bestanden** (${k.anzahlFehler}): ${k.fehler.slice(0, 3).join(' | ')}`} |`);
  if (!x.gueltig) { m.push('', `**UNGÜLTIG, KEIN URTEIL.** Gründe: ${x.gruende.join(' ; ')}`, ''); return m.join('\n') + '\n'; }
  m.push('', 'Alle Pflichtkontrollen bestanden. „Gleich bei aus“ gilt für die Stellungen dieser Prüfung (Fallabdeckung vorab geprüft); es ist keine Aussage über alle Stellungen.', '', '## Betroffenheit', '',
    'Betroffen = Tot-Menge bei an ≠ bei aus. Stellungen aus derselben Partie (V250, V300, V350 und S) sind nicht unabhängig; die Spalte „Partien“ nennt die Zahl verschiedener Partien. Intervalle: Clopper-Pearson 95 %, unter Modellannahmen (Unabhängigkeit der Stellungen ist nicht gegeben).', '',
    '| Gruppe | Art | Stellungen | Partien | betroffen | betroffene Partien | Anteil | 95 %-Intervall | Steine zusätzlich tot | Steine wieder lebend |', '|---|---|---:|---:|---:|---:|---:|---|---:|---:|');
  const rang = a => ({S: 0, V: 1, V250: 2, V300: 3, V350: 4}[a]);
  for (const e of [...x.betroffenheit].sort((p, q) => (p.gruppe.startsWith('Summe') - q.gruppe.startsWith('Summe')) || p.gruppe.localeCompare(q.gruppe) || rang(p.art) - rang(q.art)))
    m.push(`| ${e.gruppe} | ${e.art} | ${e.stellungen} | ${e.partien} | ${e.betroffen} | ${e.betroffenePartien} | ${e.anteil === null ? '–' : prozent(e.anteil)} | ${e.cp ? `${prozent(e.cp.unten)} bis ${prozent(e.cp.oben)}` : '–'} | ${e.steineZusaetzlichTot} | ${e.steineWiederLebend} |`);
  const au = x.schritt0.ausgeschlossen;
  m.push('', '## Ausgeschlossene Duplikate (nicht gerechnet, nur gezählt)', '',
    `Aus der Hauptprüfung ausgeschlossen (§14.4, Brettvergleich; behalten wird der erste Vertreter in Dateireihenfolge): Partien mit gleicher Zugfolge wie eine Quellpartie ${au.partieGleichQuelle}; S: ${au.S.entwicklung} gleich einem Entwicklungsbrett, ${au.S.doppelt} doppeltes Brett; V: ${au.V.entwicklung} gleich einem Entwicklungsbrett, ${au.V.doppelt} doppeltes Brett. Je Gruppe: Schritt 0.`);
  const u = x.umfang;
  m.push('', `Mindestumfang für eine Kandidatur (§7 Nr. 7, Setzung ${MINDESTUMFANG} betroffene Stellungen je Stellungsart): S ${u.S} ${u.S >= MINDESTUMFANG ? '(erreicht)' : '(nicht erreicht)'}, V ${u.V} ${u.V >= MINDESTUMFANG ? '(erreicht)' : '(nicht erreicht)'}.`,
    u.S >= MINDESTUMFANG && u.V >= MINDESTUMFANG ? 'Das Erreichen der Zahl ist kein Sicherheitsnachweis.' : '**Kein Urteil über die Kandidatur: zu wenig Betroffene** (nicht „unbedenklich“). Der Befund wird trotzdem beschrieben; über eine Erweiterung der Prüfdaten entscheidet Hazeberry (E-1).');
  m.push('', '## Wirkung auf Stand und Vorschau (nur betroffene Stellungen, Schwarz − Weiß − Komi, an minus aus)', '', '| Art | Wertung | Maß | betroffene Stellungen | Stand ändert sich | Sieger wechselt | min | Median | max |', '|---|---|---|---:|---:|---:|---:|---:|---:|');
  const zeile = (art, w, mass, v) => m.push(`| ${art} | ${w} | ${mass} | ${v.n} | ${v.aendert} | ${v.siegerwechsel} | ${komma(v.min)} | ${komma(v.median)} | ${komma(v.max)} |`);
  for (const w of MODI) zeile('S (Endstand)', w, 'Endstand', x.wirk.S[w].stand);
  for (const w of MODI) { zeile('V (Vorschau)', w, 'mit Annahmen', x.wirk.V[w].mitAnnahmen); zeile('V (Vorschau)', w, 'nur Bewiesenes', x.wirk.V[w].nurBewiesen); }
  m.push('', 'Das ist die Wirkung des Schalters, nicht die einer Verbesserung: ob die Änderung richtig ist, sagen erst Stufe 2 (Übereinstimmung mit GNU Go) und Stufe 3 (Beurteilung).', '',
    '## Handpartien (getrennt, nur illustrativ, ohne Statistik)', '', '| Datei | reguläres Ende | Tot aus | Tot an | betroffen | Stand Fläche aus → an | Stand Territory aus → an |', '|---|---|---:|---:|---|---|---|');
  for (const h of x.hand) m.push(`| ${h.datei} | ${h.regulaer ? 'ja' : 'nein'} | ${h.totAus} | ${h.totAn} | ${h.betroffen ? 'ja' : 'nein'} | ${komma(h.stand.flaeche.aus)} → ${komma(h.stand.flaeche.an)} | ${komma(h.stand.territory.aus)} → ${komma(h.stand.territory.an)} |`);
  m.push('', `Entwicklungsstellungen: ${x.stat.n.E}, davon betroffen ${x.stat.anDiffE} (nur Kontrolle, nicht Teil der Auswertung, §3.1).`, '',
    '## Grenzen', '',
    '- Ohne GNU Go, ohne Maßstab: Betroffenheit sagt nicht, ob die Änderung die Zählung verbessert oder verschlechtert.',
    '- Die Prüfdaten stammen aus denselben Archiven wie die Entwicklungsdaten (gleiche Gruppen, teils gleiche Engine-Stände und Gegner); sie sind keine unabhängige Verteilung und gelten nicht für Menschen.',
    '- Duplikate (§14.4, Brettvergleich): Partien mit gleicher Zugfolge wie eine Quellpartie, Stellungen mit dem Brett einer Entwicklungsstellung und Stellungen mit einem Brett, das in derselben Stellungsart schon vorkam, sind aus der Hauptprüfung ausgeschlossen, nur gezählt und nicht gerechnet; behalten wird der erste Vertreter in Dateireihenfolge. Zahlen: Schritt 0 und der Abschnitt „Ausgeschlossene Duplikate“. Ähnliche, nicht gleiche Bretter werden nicht erkannt.',
    '- Die Einspiel-Kontrolle prüft Ko und Superko nicht.',
    '- S: nur reguläre Enden (zwei Pässe in Folge, keine Aufgabe); Zuglimit und andere Enden sind im Archiv nicht getrennt erkennbar und fallen unter „Ende nicht mit zwei Pässen“.');
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
function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  if (befehl === 'ziehen') {
    const o = optionen(rest, ['aus', 'html', 'entwicklung', 'ausschluss', 'gruppe', 'hand'], ['aus', 'html', 'entwicklung', 'ausschluss', 'gruppe'], ['gruppe']);
    o.gruppen = o.gruppe.map(g => { const k = g.indexOf('='); return {name: g.slice(0, k), dateien: g.slice(k + 1).split(',')}; });
    fs.mkdirSync(o.aus, {recursive: true});
    const E = ladeKI({htmlPfad: o.html, mitNetz: false});
    const {stellungen, schritt0} = ziehen(E, o);
    schreibeJsonl(path.join(o.aus, 'stellungen.jsonl'), stellungen);
    fs.writeFileSync(path.join(o.aus, 'schritt0.json'), JSON.stringify(schritt0, null, 1));
    const md = berichtSchritt0(schritt0);
    fs.writeFileSync(path.join(o.aus, 'schritt0.md'), md); console.log(md);
    process.exit(schritt0.gueltig ? 0 : 1);
  } else if (befehl === 'rechnen') {
    const o = optionen(rest, ['stand', 'html', 'stellungen', 'aus', 'tmp', 'erwartet-sha'], ['stand', 'html', 'stellungen', 'aus']);
    if (!['alt', 'testkopie', 'neu'].includes(o.stand)) throw new Error('--stand muss alt, testkopie oder neu sein');
    const orig = fs.readFileSync(o.html, 'utf8'), sha = sha256(orig);
    if (o['erwartet-sha'] && sha !== o['erwartet-sha']) throw new Error(`index.html weicht ab (${sha}), erwartet ${o['erwartet-sha']}`);
    let pfad = o.html;
    if (o.stand === 'testkopie') {   /* Verfahren wie auswertung/zaehlung-mechanismus/gegenprobe.js --variante diagonalauge */
      if (!o.tmp) throw new Error('--stand testkopie braucht --tmp');
      const anker = 'V.augen++; if (r.groesse >= augeGross';
      if (orig.split(anker).length !== 2) throw new Error('Anker für die Test-Kopie nicht genau einmal');
      fs.mkdirSync(o.tmp, {recursive: true}); pfad = path.join(o.tmp, 'index-testkopie.html');
      fs.writeFileSync(pfad, orig.replace(anker, 'if (r.groesse === 1 && !_diagIsTrueEye(b, r.punkte[0], r.rand)) continue; ' + anker));
    }
    const E = ladeKI({htmlPfad: pfad, mitNetz: false});
    const zeilen = rechnen(E, o, leseJsonlDatei(o.stellungen), sha);
    schreibeJsonl(o.aus, zeilen);
    console.log(`Stand ${o.stand}: ${zeilen.length - 1} Stellungen gerechnet; index.html ${sha}`);
  } else if (befehl === 'vergleichen') {
    const o = optionen(rest, ['aus', 'stellungen', 'schritt0', 'alt', 'testkopie', 'neu', 'erwartet-sha-alt'], ['aus', 'stellungen', 'schritt0', 'alt', 'testkopie', 'neu']);
    fs.mkdirSync(o.aus, {recursive: true});
    const r = vergleichen(leseJsonlDatei(o.stellungen), JSON.parse(fs.readFileSync(o.schritt0, 'utf8')), ladeStand(leseJsonlDatei(o.alt)), ladeStand(leseJsonlDatei(o.testkopie)), ladeStand(leseJsonlDatei(o.neu)), o['erwartet-sha-alt']);
    fs.writeFileSync(path.join(o.aus, 'bericht.json'), JSON.stringify(r.bericht, null, 1));
    fs.writeFileSync(path.join(o.aus, 'bericht.md'), r.md);
    schreibeJsonl(path.join(o.aus, 'betroffen.jsonl'), r.betroffen);
    console.log(r.md);
    process.exit(r.bericht.gueltig ? 0 : 1);
  } else throw new Error('Aufruf: node diagonal-pruefung.js ziehen|rechnen|vergleichen ...');
}
if (require.main === module) { try { main(); } catch (e) { console.error(e.stack || e.message); process.exit(2); } }
module.exports = {spielEin, folgeAusArchiv, leseSgf, ziehen, berichtSchritt0, rechnen, vergleichen, ladeStand, V_INDIZES, MINDESTUMFANG};
