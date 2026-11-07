// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Untersuchung der Vorsprungsprüfung (docs/passregel-vorsprung.md): Warum meldet `passNachGegnerpassPruefung`
   (Zählvorschau der App, passMarge 20) Vorsprung, obwohl der Referenzstand die Stellung als verloren zeigt?

   Reine Rechnung auf den Rohdaten der Stufe C (Einheiten aus Stufe A, Ergebniszeilen der Fortsetzung). KEIN GNU Go,
   KEINE Partie, KEINE Änderung am Spiel. Schritte:
     0  Datenprüfung: welche Felder sind vorhanden? Fehlendes macht die betreffende Auswertung „nicht auswertbar“.
     1  Kennzahlen: Vorzeichenwechsel V (Auslösung, Referenzstand < 0), Verteilungen, Überlappungen. Beschreibend.
     2  Zerlegung der Differenz D = min(mit, nur) − Referenzstand als Rechenidentität, nur nach bestandener
        Identitätskontrolle (neu gerechnetes mit/nur = gespeichertes mit/nur, mit dem Code des Hauptlaufs).
   Referenzstand (Stand des Arms „sofort“, KI-Sicht): Fläche = GNU Gos final_score, Territory = App-Rechnung mit GNU Gos
   Tot-Liste (docs/passregel-vorsprung.md §2).

   Aufruf:  node auswertung/endspiel/passregel-vorsprung.js --einheiten einheiten.jsonl --ergebnisse teil-1.jsonl,teil-2.jsonl
              --html index-hauptlauf.html --aus verz [--artefakt "Beschreibung der Quelle"]
   `--html` MUSS der index.html des Hauptlaufs entsprechen (Commit HAUPTLAUF_COMMIT); der Workflow holt sie per `git show`.
   Der SHA-256 der benutzten Datei steht im Bericht. */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const L = require('./passregel-lib.js');

const HAUPTLAUF_COMMIT = '7d57e2bf1826904be9c4e6f8a59164db632d032f';
const WERTUNGEN = ['flaeche', 'territory'], KOMI = 7.5, MARGE = 20;

/* Eigener Lader (Engine-Funktionen des Hauptlaufs): zaehlVorschau, die Prüfung und die Brettfunktionen */
function motor(htmlPfad) {
  const html = fs.readFileSync(htmlPfad, 'utf8');
  const ex = id => {
    const m = new RegExp(`<script id="${id}">([\\s\\S]*?)</script>`).exec(html);
    if (!m) throw new Error(`<script id="${id}"> fehlt in ${htmlPfad}`);
    return m[1];
  };
  globalThis.localStorage = {getItem: () => null, setItem() {}, removeItem() {}};
  globalThis.document = {getElementById: () => null};
  (0, eval)(ex('shared-go-logic') + '\n' + ex('worker-ai')
    + ';globalThis.__PV={PARAMS,zaehlVorschau,passNachGegnerpassPruefung,removeDeadGroups,BOARD_SIZE,NEIGHBORS};');
  const E = globalThis.__PV;
  E.PARAMS.passNachGegnerpass = 1;   /* Standard-PARAMS mit eingeschalteter Versuchsregel, wie in Stufe A */
  E.htmlSha256 = crypto.createHash('sha256').update(html).digest('hex');
  return E;
}

const brettAusText = t => Uint8Array.from(String(t), c => (c === 'X' ? 1 : c === 'O' ? 2 : 0));
const nahe = (a, b) => Math.abs(a - b) < 1e-9;
const sicht = ki => (ki === 1 ? 1 : -1);
const quantil = (a, q) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : null; };

/* ── Schritt 0: Datenprüfung je Einheit und Wertung ───────────────────── */
const FELDER = ['Ergebniszeile', 'arm1', 'diagnose.anfang', 'brett', 'gefangen', 'tote', 'pruef.mit', 'pruef.nur', 'zuege'];
function pruefeFelder(e, r, w) {
  const fehlt = [];
  if (!r) return {fehlt: ['Ergebniszeile'], daten: null};
  const a1 = r.arm1 && r.arm1[w];
  if (!Number.isFinite(a1)) fehlt.push('arm1');
  const da = r.diagnose && r.diagnose.anfang;
  if (!da) fehlt.push('diagnose.anfang');
  else {
    if (typeof da.brett !== 'string' || da.brett.length !== 361 || /[^.XO]/.test(da.brett)) fehlt.push('brett');
    if (!da.gefangen || !Number.isFinite(da.gefangen[1]) || !Number.isFinite(da.gefangen[2])) fehlt.push('gefangen');
    if (!Array.isArray(da.tote) || da.tote.some(c => !/^[A-HJ-T]([1-9]|1[0-9])$/i.test(String(c)))) fehlt.push('tote');
  }
  const pr = e.pruef && e.pruef[w];
  if (!pr || !Number.isFinite(pr.mit)) fehlt.push('pruef.mit');
  if (!pr || !Number.isFinite(pr.nur)) fehlt.push('pruef.nur');
  if (!Array.isArray(e.zuege)) fehlt.push('zuege');
  return {fehlt, daten: fehlt.length ? null : {da, pr, referenz: a1}};
}

/* Zugfolge → Brett und Gefangene (Zusatzkontrolle gegen diagnose.anfang) */
function einspielen(E, e) {
  const board = new Uint8Array(E.BOARD_SIZE), caps = {1: 0, 2: 0};
  e.zuege.forEach((m, i) => {
    if (m === 'pass') return;
    const farbe = (e.index - i) % 2 === 0 ? 3 - e.kiFarbe : e.kiFarbe, p = L.vonGtp(m);
    board[p] = farbe; caps[farbe] += E.removeDeadGroups(board, 3 - farbe, p);
  });
  return {board, caps};
}

/* ── Identitätskontrolle: neu gerechnete Prüfung = gespeichertes mit/nur ── */
function identitaet(E, e, w, board, caps) {
  const p = E.passNachGegnerpassPruefung(board, e.kiFarbe, {1: caps[1], 2: caps[2]}, {gegnerPasste: true, wertung: w, komi: KOMI});
  const pr = e.pruef[w], gruende = [];
  if (!p) gruende.push('Prüfung lieferte null');
  else {
    if (!nahe(p.mit, pr.mit)) gruende.push(`mit ${p.mit} ≠ gespeichert ${pr.mit}`);
    if (!nahe(p.nur, pr.nur)) gruende.push(`nur ${p.nur} ≠ gespeichert ${pr.nur}`);
    if (pr.spanne !== undefined && !nahe(p.spanne, pr.spanne)) gruende.push(`Spanne ${p.spanne} ≠ gespeichert ${pr.spanne}`);
    if (pr.gemischt !== undefined && !nahe(p.gemischt, pr.gemischt)) gruende.push(`gemischt ${p.gemischt} ≠ gespeichert ${pr.gemischt}`);
    if (!p.pass) gruende.push(`Prüfung löst nicht aus (${p.grund})`);
  }
  return {ok: gruende.length === 0, gruende};
}

/* ── Schritt 2: Zerlegung von D als Rechenidentität ──────────────────── */
const punktBeitrag = (zb, board, tot, w, p) => (w === 'territory' && board[p] && !tot.has(p) ? 0 : (zb.besitzer[p] === 1 ? 1 : zb.besitzer[p] === 2 ? -1 : 0));
function zerlege(E, e, w, board, caps, daten) {
  const ki = e.kiFarbe, s = sicht(ki), N = board.length;
  const v = E.zaehlVorschau(board, KOMI, {modus: w, gefangen: caps});
  const mitKI = s * v.mitSchaetzung.stand, nurKI = s * v.nurBewiesen.stand;
  const variante = mitKI <= nurKI ? 'mit' : 'nur';
  const totV = new Set();
  for (let i = 0; i < N; i++) if (v.bewiesenTot[i] || (variante === 'mit' && v.geschaetztTot[i])) totV.add(i);
  const totT = new Set(daten.da.tote.map(L.vonGtp));
  const zbV = L.zaehlbestandteile(board, caps, totV, KOMI, E.NEIGHBORS), zbT = L.zaehlbestandteile(board, caps, totT, KOMI, E.NEIGHBORS);
  const standV = s * zbV[w].stand, standT = s * zbT[w].stand, X = Math.min(mitKI, nurKI), R = s * daten.referenz;
  const grund = [];
  if (!nahe(standV, X)) grund.push(`Bestandteile (Vorschau) ${standV} ≠ Vorschau ${X}`);
  const capV = w === 'territory' ? zbV.gefangenMitTot[1] - zbV.gefangenMitTot[2] : 0, capT = w === 'territory' ? zbT.gefangenMitTot[1] - zbT.gefangenMitTot[2] : 0;
  let sV = -KOMI + capV, sT = -KOMI + capT;
  const dpt = new Int8Array(N);
  for (let p = 0; p < N; p++) { const a = punktBeitrag(zbV, board, totV, w, p), b = punktBeitrag(zbT, board, totT, w, p); sV += a; sT += b; dpt[p] = a - b; }
  if (!nahe(s * sV, standV)) grund.push('Punktsumme (Vorschau) ≠ Stand');
  if (!nahe(s * sT, standT)) grund.push('Punktsumme (Tot-Liste) ≠ Stand');
  /* Steine mit verschiedenem Tot/Lebend-Urteil; Gruppen = zusammenhängende Steine gleicher Farbe und Richtung */
  const status = p => (board[p] ? (totV.has(p) ? 1 : 0) - (totT.has(p) ? 1 : 0) : 0);   /* +1 nur Vorschau tot, −1 nur Tot-Liste tot */
  const gesehen = new Uint8Array(N), gruppen = [];
  let beitragSteine = 0;
  for (let p = 0; p < N; p++) {
    if (!status(p) || gesehen[p]) continue;
    const q = [p]; gesehen[p] = 1;
    for (let k = 0; k < q.length; k++) for (const nb of E.NEIGHBORS[q[k]]) if (!gesehen[nb] && board[nb] === board[p] && status(nb) === status(p)) { gesehen[nb] = 1; q.push(nb); }
    let b = 0;
    for (const x of q) b += dpt[x];
    if (w === 'territory') b += status(p) * (board[p] === 1 ? -1 : 1) * q.length;   /* tote Steine zählen dem Gegner als Gefangene */
    gruppen.push({farbe: board[p] === 1 ? 'S' : 'W', steine: q.length, richtung: status(p) > 0 ? 'nur Vorschau tot' : 'nur Tot-Liste tot', beitrag: s * b, punkte: q.map(L.zuGtp)});
    beitragSteine += b;
  }
  /* übrige Punkte: gleiches Urteil, anderer Besitz */
  let beitragGebiet = 0; const gebietPunkte = [];
  for (let p = 0; p < N; p++) if (!status(p) && dpt[p]) { beitragGebiet += dpt[p]; gebietPunkte.push(L.zuGtp(p)); }
  const xt = s * (beitragSteine + beitragGebiet), rest = standT - R, D = X - R;
  if (!nahe(xt, standV - standT)) grund.push(`Beiträge ${xt} ≠ Vorschau − Tot-Liste ${standV - standT}`);
  if (!nahe(xt + rest, D)) grund.push(`Beiträge ${xt} + Rest ${rest} ≠ D ${D}`);
  return {ok: grund.length === 0, grund, variante, vorschau: X, referenz: R, totListeRechnung: standT, D, vorschauMinusTotListe: standV - standT,
          verfahrensRest: rest, gruppen, gebiet: {punkte: gebietPunkte, beitrag: s * beitragGebiet},
          summeSteine: s * beitragSteine, nVorschauTot: totV.size, nTotListeTot: totT.size};
}

/* ── Auswertung ──────────────────────────────────────────────────────── */
function auswerten(E, einheiten, ergebnisse, optionen = {}) {
  const out = {kopf: {hauptlaufCommit: HAUPTLAUF_COMMIT, htmlSha256: E.htmlSha256, parameter: {passNachGegnerpass: E.PARAMS.passNachGegnerpass, passMarge: E.PARAMS.passMarge, passSpanne: E.PARAMS.passSpanne, passGemischt: E.PARAMS.passGemischt, komi: KOMI}, quelle: optionen.quelle || null},
               schritt0: {}, schritt1: {}, schritt2: {}, einheiten: {}};
  const zaehlAbw = new Set(ergebnisse.size ? [...ergebnisse.values()].filter(r => r.kontrolle && r.kontrolle.flaecheTotListe === false).map(r => r.schluessel) : []);
  const vSchluessel = {};
  for (const w of WERTUNGEN) {
    const us = einheiten.filter(e => e.ausgeloest && e.ausgeloest[w]);
    const s0 = {N: us.length, vorhanden: 0, fehlendeFelder: Object.fromEntries(FELDER.map(f => [f, 0])), nichtAuswertbar: [], replayAbweichung: [], identitaet: {bestanden: 0, durchgefallen: []}};
    const zeilen = [];
    for (const e of us) {
      const r = ergebnisse.get(e.schluessel);
      const pf = pruefeFelder(e, r, w);
      for (const f of pf.fehlt) s0.fehlendeFelder[f]++;
      if (pf.fehlt.length) { s0.nichtAuswertbar.push({schluessel: e.schluessel, fehlt: pf.fehlt}); continue; }
      s0.vorhanden++;
      const board = brettAusText(pf.daten.da.brett), caps = {1: pf.daten.da.gefangen[1], 2: pf.daten.da.gefangen[2]};
      const rp = einspielen(E, e), abw = [];
      for (let i = 0; i < board.length; i++) if (board[i] !== rp.board[i]) { abw.push(L.zuGtp(i)); if (abw.length >= 5) break; }
      if (abw.length || rp.caps[1] !== caps[1] || rp.caps[2] !== caps[2]) s0.replayAbweichung.push({schluessel: e.schluessel, punkte: abw, gefangenZugfolge: rp.caps, gefangenDiagnose: caps});
      const id = identitaet(E, e, w, board, caps);
      if (id.ok) s0.identitaet.bestanden++; else s0.identitaet.durchgefallen.push({schluessel: e.schluessel, gruende: id.gruende});
      const R = sicht(e.kiFarbe) * pf.daten.referenz, X = Math.min(pf.daten.pr.mit, pf.daten.pr.nur);
      zeilen.push({e, r, board, caps, daten: pf.daten, id, replayOk: !abw.length && rp.caps[1] === caps[1] && rp.caps[2] === caps[2], R, X, D: X - R});
    }
    out.schritt0[w] = s0;
    /* Schritt 1 */
    const V = zeilen.filter(z => z.R < 0), nah = zeilen.filter(z => z.R >= 0 && z.R < MARGE);
    vSchluessel[w] = new Set(V.map(z => z.e.schluessel));
    const jeGruppe = {}, jeFarbe = {};
    for (const z of zeilen) { for (const [m, k] of [[jeGruppe, z.e.gruppe], [jeFarbe, z.e.kiFarbe === 1 ? 'S' : 'W']]) { m[k] = m[k] || {N: 0, V: 0}; m[k].N++; if (z.R < 0) m[k].V++; } }
    const Ds = zeilen.map(z => z.D);
    out.schritt1[w] = {
      N: us.length, auswertbar: zeilen.length, V: V.length, anteilV: zeilen.length ? V.length / zeilen.length : null,
      minVorschauKleinerMarge: zeilen.filter(z => z.X < MARGE).length,
      jeGruppe, jeFarbe,
      naehefaelle: nah.length,
      verteilungReferenzInV: V.map(z => z.R).sort((a, b) => a - b),
      verteilungDInV: V.map(z => z.D).sort((a, b) => a - b),
      dAlle: Ds.length ? {n: Ds.length, mittel: L.mittel(Ds), median: L.median(Ds), q10: quantil(Ds, 0.1), q90: quantil(Ds, 0.9), q99: quantil(Ds, 0.99), max: Math.max(...Ds), min: Math.min(...Ds),
                          anteilUeber20: Ds.filter(d => d > 20).length / Ds.length, anzahlUeber20: Ds.filter(d => d > 20).length} : null,
      ueberlappungMitZaehlabweichung: V.filter(z => zaehlAbw.has(z.e.schluessel)).map(z => z.e.schluessel),
      zaehlabweichungGesamt: us.filter(e => zaehlAbw.has(e.schluessel)).length,
      vListe: V.map(z => ({schluessel: z.e.schluessel, gruppe: z.e.gruppe, kiFarbe: z.e.kiFarbe === 1 ? 'S' : 'W', vorschau: z.X, referenz: z.R, D: z.D}))
    };
    /* Schritt 2: nur V, nur nach bestandener Kontrolle (Identität und Zugfolge) */
    const zer = {zerlegt: [], nichtZerlegt: []};
    for (const z of V) {
      if (!z.id.ok) { zer.nichtZerlegt.push({schluessel: z.e.schluessel, grund: 'Identitätskontrolle: ' + z.id.gruende.join('; ')}); continue; }
      if (!z.replayOk) { zer.nichtZerlegt.push({schluessel: z.e.schluessel, grund: 'Zugfolge ergibt ein anderes Brett oder andere Gefangene als diagnose.anfang'}); continue; }
      const q = zerlege(E, z.e, w, z.board, z.caps, z.daten);
      if (!q.ok) zer.nichtZerlegt.push({schluessel: z.e.schluessel, grund: 'Rechenidentität verletzt: ' + q.grund.join('; ')});
      else zer.zerlegt.push({schluessel: z.e.schluessel, gruppe: z.e.gruppe, kiFarbe: z.e.kiFarbe === 1 ? 'S' : 'W', ...q});
    }
    out.schritt2[w] = zer;
  }
  out.schritt1.ueberlappungFlaecheTerritory = [...vSchluessel.flaeche].filter(k => vSchluessel.territory.has(k));
  return out;
}

function bericht(out) {
  const md = ['# Passregel: Untersuchung der Vorsprungsprüfung (nur Rechnung)', '',
    `Code des Hauptlaufs: Commit \`${out.kopf.hauptlaufCommit}\`; SHA-256 der benutzten index.html: \`${out.kopf.htmlSha256}\`.`,
    `Parameter: ${JSON.stringify(out.kopf.parameter)}. Quelle der Daten: ${out.kopf.quelle || 'nicht angegeben'}.`,
    'Referenzstand: Fläche = GNU Gos final_score, Territory = App-Rechnung mit GNU Gos Tot-Liste. Alles beschreibend, kein Urteil, keine Änderung am Spiel.', ''];
  for (const w of WERTUNGEN) {
    const s0 = out.schritt0[w], s1 = out.schritt1[w], s2 = out.schritt2[w];
    md.push(`## ${w}`, '', '### Schritt 0: Datenprüfung', '',
      `Einheiten: ${s0.N}; mit allen Feldern: ${s0.vorhanden}; nicht auswertbar: ${s0.nichtAuswertbar.length}. Fehlende Felder: ${JSON.stringify(s0.fehlendeFelder)}.`,
      `Identitätskontrolle (neu gerechnetes mit/nur = gespeichert): bestanden ${s0.identitaet.bestanden}, durchgefallen ${s0.identitaet.durchgefallen.length}. Zugfolge ≠ diagnose.anfang: ${s0.replayAbweichung.length}.`);
    for (const x of s0.identitaet.durchgefallen.slice(0, 20)) md.push(`- Identität verletzt ${x.schluessel}: ${x.gruende.join('; ')}`);
    for (const x of s0.replayAbweichung.slice(0, 20)) md.push(`- Zugfolge-Abweichung ${x.schluessel}: ${JSON.stringify(x)}`);
    md.push('', '### Schritt 1: Kennzahlen', '',
      `N ${s1.N}, auswertbar ${s1.auswertbar}; **V (Referenzstand < 0): ${s1.V}** (${s1.anteilV === null ? 'n/a' : (100 * s1.anteilV).toFixed(2) + ' %'}); Näherungsfälle (0 ≤ Referenzstand < ${MARGE}): ${s1.naehefaelle}.`,
      `V je Gruppe: ${JSON.stringify(s1.jeGruppe)}; V je KI-Farbe: ${JSON.stringify(s1.jeFarbe)}.`,
      `Referenzstand in V (aufsteigend): ${s1.verteilungReferenzInV.join(', ') || '–'}.`, `D in V (aufsteigend): ${s1.verteilungDInV.join(', ') || '–'}.`,
      s1.dAlle ? `D über alle auswertbaren Auslösungen: n ${s1.dAlle.n}, Mittel ${s1.dAlle.mittel.toFixed(2)}, Median ${s1.dAlle.median}, q10 ${s1.dAlle.q10}, q90 ${s1.dAlle.q90}, q99 ${s1.dAlle.q99}, Minimum ${s1.dAlle.min}, Maximum ${s1.dAlle.max}; D > 20: ${s1.dAlle.anzahlUeber20} (${(100 * s1.dAlle.anteilUeber20).toFixed(2)} %). Nur Beschreibung, D > 20 ist kein Vorzeichenwechsel.` : 'D: keine auswertbaren Einheiten.',
      `Zählabweichung (Fläche aus Tot-Liste ≠ final_score) bei ${s1.zaehlabweichungGesamt} Einheit(en) dieser Wertung; davon in V: ${s1.ueberlappungMitZaehlabweichung.length} (${s1.ueberlappungMitZaehlabweichung.join(', ') || '–'}).`, '');
    md.push('### Schritt 2: Zerlegung von D in V (Rechenidentität)', '', `Zerlegt: ${s2.zerlegt.length}; nicht zerlegt: ${s2.nichtZerlegt.length}.`, '');
    for (const x of s2.nichtZerlegt) md.push(`- nicht zerlegt ${x.schluessel}: ${x.grund}`);
    for (const q of s2.zerlegt) {
      md.push('', `**${q.schluessel}** (${q.gruppe}, KI ${q.kiFarbe}): Vorschau (${q.variante}) ${q.vorschau}, Referenzstand ${q.referenz}, D ${q.D}; ` +
        `Vorschau − Tot-Liste-Rechnung ${q.vorschauMinusTotListe}, Rest Tot-Liste-Rechnung − Referenzstand ${q.verfahrensRest}.`,
        `Beiträge: Steine mit verschiedenem Urteil ${q.summeSteine}, Gebiet mit anderem Besitz ${q.gebiet.beitrag} (${q.gebiet.punkte.length} Punkte).`);
      for (const g of q.gruppen) md.push(`- ${g.richtung}, ${g.farbe}, ${g.steine} Steine, Beitrag ${g.beitrag}: ${g.punkte.join(' ')}`);
    }
    md.push('');
  }
  md.push('## Überlappung', '', `V in Fläche und in Territory: ${out.schritt1.ueberlappungFlaecheTerritory.length} (${out.schritt1.ueberlappungFlaecheTerritory.join(', ') || '–'}).`, '',
    '**Grenzen.** Die Zerlegung nennt Beiträge, keine Ursache im Programm. Eine „große, unterschiedlich bewertete Gruppe“ gilt nur dort, wo die Zerlegung sie als Beitrag ausweist. Keine Änderung an Schwellen oder am Spiel.');
  return md.join('\n') + '\n';
}

function main() {
  const a = process.argv.slice(2), opt = {einheiten: null, ergebnisse: null, html: null, aus: null, quelle: null};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    if (a[i] === '--einheiten') { opt.einheiten = v; i++; } else if (a[i] === '--ergebnisse') { opt.ergebnisse = v; i++; }
    else if (a[i] === '--html') { opt.html = v; i++; } else if (a[i] === '--aus') { opt.aus = v; i++; } else if (a[i] === '--artefakt') { opt.quelle = v; i++; }
    else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
  }
  if (!opt.einheiten || !opt.ergebnisse || !opt.html || !opt.aus) { console.error('Aufruf: --einheiten datei --ergebnisse d1,d2,… --html index-hauptlauf.html --aus verz [--artefakt text]'); process.exit(2); }
  fs.mkdirSync(opt.aus, {recursive: true});
  const fehlend = [opt.einheiten, ...opt.ergebnisse.split(',').filter(Boolean), opt.html].filter(p => !fs.existsSync(p));
  if (fehlend.length || !opt.ergebnisse.split(',').filter(Boolean).length) {
    const t = `# Schritt 0: nicht auswertbar\n\nDateien fehlen: ${fehlend.join(', ') || '(keine Ergebnisdateien angegeben)'}.\n`;
    fs.writeFileSync(path.join(opt.aus, 'vorsprung.md'), t); console.log(t); process.exit(1);
  }
  const E = motor(opt.html);
  const einheiten = L.leseJsonl(opt.einheiten), ergebnisse = new Map();
  for (const f of opt.ergebnisse.split(',').filter(Boolean)) for (const r of L.leseJsonl(f)) ergebnisse.set(r.schluessel, r);
  const out = auswerten(E, einheiten, ergebnisse, {quelle: opt.quelle});
  fs.writeFileSync(path.join(opt.aus, 'vorsprung.json'), JSON.stringify(out, null, 1));
  const md = bericht(out);
  fs.writeFileSync(path.join(opt.aus, 'vorsprung.md'), md);
  console.log(md);
}
if (require.main === module) main();
module.exports = {motor, brettAusText, pruefeFelder, einspielen, identitaet, zerlege, auswerten, bericht, HAUPTLAUF_COMMIT, FELDER};
