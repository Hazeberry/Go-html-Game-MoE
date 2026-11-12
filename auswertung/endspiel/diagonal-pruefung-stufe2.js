// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Diagonalprüfung, Stufe 2 (docs/diagonalpruefung-vorabfestlegung.md §16, AP4): GNU Gos Tot-Liste für alle betroffenen Stellungen aus
   Stufe 1 und für eine Kontrollstichprobe unbetroffener Stellungen. Schicht A: Übereinstimmung mit GNU Go, KEINE Aussage zur Richtigkeit.
   Läuft nur in GitHub Actions und nur nach Go (CLAUDE.md); lokal läuft nur der Test mit einer Attrappe (tests/diagonal-pruefung-stufe2.js).

   Drei Teilschritte:
     plan       liest die Stufe-1-Dateien (stellungen.jsonl, neu.jsonl, betroffen.jsonl; im Workflow aus dem gesicherten ZIP, SHA-256 geprüft),
                zieht die Kontrollstichprobe (§16.4), teilt die Stellungen in Pakete (§16.6) und schreibt plan.json. --modus probe wählt die
                24 Stellungen der Probe (§16.6) in EIN Paket.
     paket      bearbeitet ein Paket: je Stellung Einspielen und Abgleich mit Stufe 1 (Brett, Gefangene, App-Ergebnisse), zwei Referenzläufe
                R1 und R2 in frischen GNU-Go-Prozessen mit demselben Seed, ein Wiederholungsversuch je Lauf nach Absturz oder Timeout (§16.3).
                Ausgabe: teil-<n>.jsonl. Im Modus probe stehen darin KEINE Tot-Listen und keine Ergebnisse der Schicht A.
     auswerten  Vollständigkeit, Gültigkeit (§16.9), Ausfallgrenze (§16.7), Kennzahlen (§5), mechanische Auswahl B1 und B2 (§16.8).
                Im Modus probe nur Dauer, Status und technische Kontrollen.
   Gültigkeit: nur zwei Zustände. Ungültig heißt „kein Urteil“ mit Grund, Exit 1.

   Aufrufe (Optionen als --name wert):
     node diagonal-pruefung-stufe2.js plan --stufe1 verz --aus verz [--modus haupt|probe] [--paketgroesse 50] [--basis 1] [--kontrolle N]
     node diagonal-pruefung-stufe2.js paket --plan plan.json --teil N --stufe1 verz --archiv docs/daten --aus teil-N.jsonl --gnugo pfad
          [--html index.html] [--paket-version text] [--timeout-befehl-ms 120000] [--timeout-lauf-ms 600000]
     node diagonal-pruefung-stufe2.js auswerten --plan plan.json --stufe1 verz --ergebnisse a.jsonl,b.jsonl --aus verz */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {spawn, spawnSync} = require('child_process');
const L = require('./passregel-lib.js');
const F = require('./passregel-fortsetzung.js');
const Z = require('./passregel-zaehldiagnose.js');
const W = require('./diagonal-pruefung.js');
const B = require('../../tests/diagonalauge-brett.js');
const {ladeKI} = require('../../tests/rahmen.js');

const PRAEFIX = 'diagonal-pruefung-v1';
const N = 361, KOMI = 7.5, MODI = ['flaeche', 'territory'];
const KONTROLLE_MIN = 50, KONTROLLE_MAX = 200;          /* §16.4: gleich viele wie betroffene, mindestens 50, höchstens 200 je Stellungsart */
const B2_DECKEL = 60;                                   /* §10.4, §16.8 */
const GRENZE_PROZENT = 5;                               /* §16.7 (Vorschlag, von Hazeberry bestätigt): MEHR als 5 % → ungültig; ganzzahlig: ausfall · 100 > 5 · n */
const TIMEOUT_BEFEHL_MS = 120000, TIMEOUT_LAUF_MS = 600000;   /* §16.3 Nr. 7 (Setzung ohne Messung) */
const PROBE = {S: 10, V: 10, K_S: 2, K_V: 2};           /* §16.6: 10 längste betroffene S, 10 betroffene V350, 4 Kontrollstellungen */
const sha256 = t => crypto.createHash('sha256').update(t).digest('hex');
const hash = schluessel => L.fnv32(`${PRAEFIX}|${schluessel}`);
const leseJsonlDatei = p => fs.readFileSync(p, 'utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
const schreibeJsonl = (p, zeilen) => fs.writeFileSync(p, zeilen.map(z => JSON.stringify(z)).join('\n') + (zeilen.length ? '\n' : ''));
const gleichListe = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
const nachHash = (liste, schluesselVon, idVon) => [...liste].sort((a, b) => hash(schluesselVon(a)) - hash(schluesselVon(b)) || (idVon(a) < idVon(b) ? -1 : idVon(a) > idVon(b) ? 1 : 0));
const ueberGrenze = (ausfaelle, n) => ausfaelle * 100 > GRENZE_PROZENT * n;
const prozent = x => `${(100 * x).toFixed(1).replace('.', ',')} %`;
const komma = (x, d = 1) => (Number.isFinite(x) ? x.toFixed(d).replace('.', ',') : '–');
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const quantil = (a, q) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };

/* ── Stufe-1-Eingabe ─────────────────────────────────────────────────── */
function ladeStufe1(verz) {
  const stellungen = leseJsonlDatei(path.join(verz, 'stellungen.jsonl')), neuZeilen = leseJsonlDatei(path.join(verz, 'neu.jsonl')), betroffen = leseJsonlDatei(path.join(verz, 'betroffen.jsonl'));
  const kopf = neuZeilen[0] && neuZeilen[0].kopf;
  return {stellungen, neu: new Map(neuZeilen.slice(1).map(z => [z.id, z])), neuKopf: kopf, betroffen,
    shaDatei: Object.fromEntries(['stellungen.jsonl', 'neu.jsonl', 'betroffen.jsonl'].map(f => [f, sha256(fs.readFileSync(path.join(verz, f)))]))};
}
const istPruef = s => s.art === 'S' || s.art === 'V';

/* ── plan ─────────────────────────────────────────────────────────────── */
/* Reine Funktion: Eingaben aus Stufe 1 → Plan. Gründe (ungültig) in `gruende`. */
function erstellePlan(s1, o) {
  const gruende = [], basis = o.basis === undefined ? 1 : o.basis, paketgroesse = o.paketgroesse === undefined ? 50 : o.paketgroesse, modus = o.modus || 'haupt';
  if (!['haupt', 'probe'].includes(modus)) gruende.push(`Modus ${modus} unbekannt`);
  if (!Number.isInteger(paketgroesse) || paketgroesse < 1) gruende.push('Paketgröße muss eine ganze Zahl ≥ 1 sein');
  if (!s1.neuKopf) gruende.push('neu.jsonl ohne Kopfzeile');
  const ids = s1.stellungen.map(s => s.id);
  if (new Set(ids).size !== ids.length) gruende.push('doppelte Kennungen in stellungen.jsonl');
  const proId = new Map(s1.stellungen.map(s => [s.id, s]));
  /* Pflicht: die Menge der betroffenen Kennungen ist gleich der aus neu.jsonl abgeleiteten (S und V, Tot-Menge an ≠ aus) */
  const abgeleitet = [];
  for (const s of s1.stellungen) {
    if (!istPruef(s)) continue;
    const z = s1.neu.get(s.id);
    if (!z) { gruende.push(`${s.id}: fehlt in neu.jsonl`); continue; }
    if (!gleichListe(z.aus.tot, z.an.tot)) abgeleitet.push(s.id);
  }
  const datei = new Set(s1.betroffen.map(b => b.id));
  if (datei.size !== s1.betroffen.length) gruende.push('doppelte Kennungen in betroffen.jsonl');
  const ab = new Set(abgeleitet);
  if (datei.size !== ab.size || [...datei].some(i => !ab.has(i))) gruende.push(`betroffen.jsonl (${datei.size}) ist nicht gleich der aus neu.jsonl abgeleiteten Menge (${ab.size})`);
  for (const b of s1.betroffen) if (!proId.has(b.id)) gruende.push(`betroffen.jsonl: ${b.id} fehlt in stellungen.jsonl`);
  if (gruende.length) return {gruende};
  const betroffenArt = art => s1.stellungen.filter(s => s.art === art && ab.has(s.id));
  const pool = art => s1.stellungen.filter(s => s.art === art && !ab.has(s.id));
  const kontrollenZahl = art => (o.kontrolle !== undefined ? o.kontrolle : Math.min(KONTROLLE_MAX, Math.max(KONTROLLE_MIN, betroffenArt(art).length)));
  const kontrolle = {}, gewaehlt = [];
  for (const art of ['S', 'V']) {
    const keine = !s1.stellungen.some(s => s.art === art);   /* gibt es von dieser Stellungsart gar keine Stellung, entfällt ihre Kontrolle */
    const k = keine ? 0 : kontrollenZahl(art), p = nachHash(pool(art), s => `kontrolle|${basis}|${s.id}`, s => s.id);
    if (p.length < k) gruende.push(`Kontrollstichprobe ${art}: nur ${p.length} unbetroffene Stellungen, verlangt ${k}`);
    kontrolle[art] = p.slice(0, k).map(s => s.id);
  }
  if (gruende.length) return {gruende};
  let ausgewaehlt;
  if (modus === 'probe') {
    const bS = betroffenArt('S').sort((a, b) => b.index - a.index || hash(`probe|${basis}|${a.id}`) - hash(`probe|${basis}|${b.id}`) || (a.id < b.id ? -1 : 1)).slice(0, PROBE.S);
    const bV = nachHash(betroffenArt('V').filter(s => s.index === 350), s => `probe|${basis}|${s.id}`, s => s.id).slice(0, PROBE.V);
    ausgewaehlt = [...bS.map(s => ({id: s.id, kategorie: 'betroffen'})), ...bV.map(s => ({id: s.id, kategorie: 'betroffen'})),
      ...kontrolle.S.slice(0, PROBE.K_S).map(id => ({id, kategorie: 'kontrolle'})), ...kontrolle.V.slice(0, PROBE.K_V).map(id => ({id, kategorie: 'kontrolle'}))];
  } else {
    ausgewaehlt = [...s1.stellungen.filter(s => ab.has(s.id)).map(s => ({id: s.id, kategorie: 'betroffen'})), ...[...kontrolle.S, ...kontrolle.V].map(id => ({id, kategorie: 'kontrolle'}))];
  }
  const sortiert = nachHash(ausgewaehlt, x => `paket|${basis}|${x.id}`, x => x.id);
  const gr = modus === 'probe' ? sortiert.length : paketgroesse, pakete = [];
  for (let i = 0; i < sortiert.length; i += gr) pakete.push({nr: pakete.length + 1, stellungen: sortiert.slice(i, i + gr)});
  const zaehle = (art, kat) => ausgewaehlt.filter(x => proId.get(x.id).art === art && x.kategorie === kat).length;
  const plan = {version: 1, modus, basis, paketgroesse: gr, kontrolleProArt: o.kontrolle === undefined ? 'min(200, max(50, betroffene))' : o.kontrolle, b2Deckel: B2_DECKEL, grenzeProzent: GRENZE_PROZENT,
    zeitgrenzen: {befehlMs: TIMEOUT_BEFEHL_MS, laufMs: TIMEOUT_LAUF_MS},
    zahlen: {betroffen: {S: zaehle('S', 'betroffen'), V: zaehle('V', 'betroffen')}, kontrolle: {S: zaehle('S', 'kontrolle'), V: zaehle('V', 'kontrolle')}, gesamt: ausgewaehlt.length, pakete: pakete.length},
    erwarteteHtmlSha: s1.neuKopf.htmlSha256, stufe1: s1.shaDatei, pakete};
  return {plan, gruende};
}

/* ── GTP mit Zeitgrenzen und Rohantworten ─────────────────────────────── */
function gtpStart(programm, argumente) {
  const p = spawn(programm, argumente, {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = '', warte = [], stderr = '', ende = null, abgebrochen = false;
  p.stdin.on('error', () => {});
  p.stderr.on('data', d => { stderr += d.toString(); });
  p.on('close', (code, sig) => { ende = {code, sig}; for (const w of warte.splice(0)) w({beendet: true}); });
  p.stdout.on('data', d => {
    puffer += d.toString(); let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) { const roh = puffer.slice(0, k); puffer = puffer.slice(k + 2); const w = warte.shift(); if (w) w({roh}); }
  });
  const beendet = befehl => ({befehl, roh: `? Prozess beendet (code ${ende && ende.code}, signal ${ende && ende.sig}) ${stderr.slice(-200)}`.trim(), art: 'beendet'});
  /* art: ok („=“), abgelehnt („?“, Prozess lebt), beendet (Prozess weg, auch Absturz), timeout (Zeitgrenze, Prozess wird beendet) */
  const frage = (befehl, ms) => new Promise(ok => {
    if (abgebrochen) return ok({befehl, roh: '', art: 'timeout'});
    if (ende) return ok(beendet(befehl));
    let fertig = false;
    const t = setTimeout(() => { if (fertig) return; fertig = true; abgebrochen = true; try { p.kill('SIGKILL'); } catch (e) { /* weg */ } ok({befehl, roh: '', art: 'timeout'}); }, Math.max(1, ms));
    warte.push(a => { if (fertig) return; fertig = true; clearTimeout(t); ok(a.beendet ? beendet(befehl) : {befehl, roh: a.roh, art: /^=/.test(a.roh) ? 'ok' : 'abgelehnt'}); });
    p.stdin.write(befehl + '\n');
  });
  return {frage, stderr: () => stderr, ende: () => { try { p.stdin.write('quit\n'); } catch (e) { /* weg */ } try { p.kill(); } catch (e) { /* weg */ } }};
}
const KOPF = ['protocol_version', 'name', 'version', 'boardsize 19', 'clear_board', 'komi ' + KOMI];
const ABFRAGEN_BRETT = ['list_stones black', 'list_stones white', 'captures black', 'captures white'];
const ABFRAGEN_LISTE = ['final_status_list dead', 'final_status_list alive', 'final_status_list seki'];

/* Ein Referenzlauf in frischem Prozess. Ergebnis: {art: 'ok'|'ausfall'|'pflichtfehler', grund, log, dauerMs}.
   Ausfall: Absturz, Timeout, „?“ auf final_score oder final_status_list (protokollkonforme Antwort ohne Ergebnis).
   Pflichtfehler: „?“ auf Kopf, Zug (Archivzug abgelehnt), list_stones oder captures. */
async function referenzLauf(o, seed, zuege, farben, mitScore) {
  const t0 = Date.now(), prog = gtpStart(o.gnugo, F.gnugoArgumente(seed)), log = [];
  const rest = () => o.timeoutLaufMs - (Date.now() - t0);
  let ergebnis = null;
  const q = async (b, istPflicht) => {
    if (rest() <= 0) { ergebnis = {art: 'ausfall', grund: `Timeout (Lauf, ${o.timeoutLaufMs} ms)`}; return null; }
    const a = await prog.frage(b, Math.min(o.timeoutBefehlMs, rest()));
    log.push({befehl: b, roh: a.roh});
    if (a.art === 'ok') return a;
    if (a.art === 'timeout') ergebnis = {art: 'ausfall', grund: `Timeout bei „${b}“`};
    else if (a.art === 'beendet') ergebnis = {art: 'ausfall', grund: `Absturz oder Ende des Prozesses bei „${b}“: ${a.roh.slice(0, 160)}`};
    else ergebnis = istPflicht ? {art: 'pflichtfehler', grund: `Befehl „${b}“ abgelehnt: ${a.roh.slice(0, 160)}`} : {art: 'ausfall', grund: `Antwort ohne Ergebnis bei „${b}“: ${a.roh.slice(0, 160)}`};
    return null;
  };
  try {
    for (const b of KOPF) if (!await q(b, true)) break;
    if (!ergebnis) for (let j = 0; j < zuege.length && !ergebnis; j++) await q(`play ${farben[j]} ${zuege[j]}`, true);
    if (!ergebnis) for (const b of ABFRAGEN_BRETT) if (!await q(b, true)) break;
    if (!ergebnis) for (const b of ABFRAGEN_LISTE) if (!await q(b, false)) break;
    if (!ergebnis && mitScore) await q('final_score', false);
  } finally { prog.ende(); }
  return {...(ergebnis || {art: 'ok', grund: null}), log, dauerMs: Date.now() - t0, stderr: prog.stderr().slice(-300)};
}
/* Referenzlauf mit genau einem Wiederholungsversuch nach Absturz oder Timeout (nicht nach Pflichtfehler, nicht nach „?“ ohne Ergebnis) */
async function mitWiederholung(o, seed, zuege, farben, mitScore) {
  const erster = await referenzLauf(o, seed, zuege, farben, mitScore);
  const technisch = x => x.art === 'ausfall' && /^(Timeout|Absturz)/.test(x.grund);
  if (!technisch(erster)) return {...erster, versuche: 1, dauerGesamtMs: erster.dauerMs};
  const zweiter = await referenzLauf(o, seed, zuege, farben, mitScore);
  return {...zweiter, versuche: 2, dauerGesamtMs: erster.dauerMs + zweiter.dauerMs, ersterVersuch: {art: erster.art, grund: erster.grund}};
}
const logSha = log => sha256(log.map(e => e.befehl + '\n' + e.roh).join('\n\n'));
const antwort = (log, b) => { const x = log.find(e => e.befehl === b); return x ? x.roh : null; };

/* Auswertung eines gültigen Referenzlaufs (rein): Listen, Brett gegen die Stufe-1-Stellung, Gefangene (kalibrierte Konvention) */
function analysiereLauf(s, caps, log, kon, mitScore) {
  const fehler = [], gnu = {};
  try {
    gnu.dead = [...Z.punkte(antwort(log, 'final_status_list dead'))].sort((a, b) => a - b);
    gnu.alive = [...Z.punkte(antwort(log, 'final_status_list alive'))].sort((a, b) => a - b);
    gnu.seki = [...Z.punkte(antwort(log, 'final_status_list seki'))].sort((a, b) => a - b);
    if (mitScore) { const roh = antwort(log, 'final_score'); gnu.finalScoreRoh = roh; gnu.stand = L.standAusFinalScore(Z.ohneKopf(roh)); if (!Number.isFinite(gnu.stand)) fehler.push('final_score nicht endlich'); }
    const abw = [];
    for (const [farbe, zeichen] of [['black', 'X'], ['white', 'O']]) {
      const bei = Z.punkte(antwort(log, `list_stones ${farbe}`));
      for (let k = 0; k < N; k++) if ((s.brett[k] === zeichen) !== bei.has(k)) abw.push(`${farbe} ${L.zuGtp(k)}`);
    }
    if (abw.length) fehler.push(`Brett von GNU Go weicht von der Stufe-1-Stellung ab (${abw.slice(0, 5).join(', ')})`);
    const gb = Z.zahlAntwort(antwort(log, 'captures black')), gw = Z.zahlAntwort(antwort(log, 'captures white'));
    const erwartet = kon === 'verloren-an' ? {b: caps[2], w: caps[1]} : {b: caps[1], w: caps[2]};
    if (gb !== erwartet.b || gw !== erwartet.w) fehler.push(`Gefangene weichen ab (Stufe 1 ${caps[1]}/${caps[2]}, GNU Go black ${gb}, white ${gw}, Konvention ${kon})`);
  } catch (e) { fehler.push('Antwort ungültig: ' + e.message.slice(0, 200)); }
  return {gnu, fehler};
}

/* ── paket ────────────────────────────────────────────────────────────── */
function archivPartie(cache, wurzel, quelle, nr) {
  const pfad = path.join(wurzel, quelle);
  if (!cache.has(pfad)) cache.set(pfad, new Map(L.leseJsonl(pfad).map(r => [r.nr, r])));
  return cache.get(pfad).get(nr) || null;
}
async function bearbeiteStellung(ctx, s, kategorie) {
  const {E, o, plan, kal, cache} = ctx, probe = plan.modus === 'probe';
  const seed = L.fortsetzungsSeed(plan.basis, s.gruppe, s.quelle, s.nr, s.index), z = {id: s.id, art: s.art, gruppe: s.gruppe, quelle: s.quelle, nr: s.nr, index: s.index, kategorie, seed, partieLaenge: null};
  const pflicht = grund => ({...z, status: 'pflichtfehler', grund});
  /* 1. Einspielen aus dem Archiv: dasselbe Brett und dieselben Gefangenen wie in Stufe 1 */
  const rec = archivPartie(cache, o.archiv, s.quelle, s.nr);
  if (!rec) return pflicht(`Partie nicht im Archiv gefunden (${s.quelle}, Nr. ${s.nr})`);
  let folge; try { folge = W.folgeAusArchiv(rec); } catch (e) { return pflicht('Archivzug unlesbar: ' + e.message); }
  z.partieLaenge = folge.length;
  const teil = folge.slice(0, s.index + 1);
  if (teil.length !== s.index + 1) return pflicht('Index jenseits der Zugfolge');
  const sp = W.spielEin(E, teil);
  if (sp.fehler) return pflicht('Einspielen: ' + sp.fehler);
  if (B.brettZuText(sp.brett) !== s.brett) return pflicht('Einspielen ergibt ein anderes Brett als Stufe 1');
  if (s.caps && (sp.caps[1] !== s.caps[0] || sp.caps[2] !== s.caps[1])) return pflicht('Einspielen ergibt andere Gefangene als Stufe 1');
  /* 2. App-Ergebnisse bei aus und an gleich neu.jsonl */
  const sx = {...s}, mine = {aus: W.rechneStellung(E, sx, false), an: W.rechneStellung(E, sx, true)}, ref = ctx.s1.neu.get(s.id);
  if (JSON.stringify(mine.aus) !== JSON.stringify(ref.aus) || JSON.stringify(mine.an) !== JSON.stringify(ref.an)) return pflicht('App-Ergebnis bei aus oder an weicht von neu.jsonl ab (andere Fassung der Engine?)');
  if (!probe) z.appTot = {aus: mine.aus.tot, an: mine.an.tot};      /* Probe: keine Tot-Mengen im Ergebnis (§16.6) */
  const zuege = teil.map(m => (m.punkt < 0 ? 'pass' : L.zuGtp(m.punkt))), farben = teil.map(m => (m.farbe === 1 ? 'B' : 'W'));
  const mitScore = s.art === 'S';
  /* 3. zwei Referenzläufe, derselbe Seed, je ein Wiederholungsversuch nach Absturz oder Timeout */
  const r1 = await mitWiederholung(o, seed, zuege, farben, mitScore);
  z.versuche = {r1: r1.versuche};
  const zeit = {r1: r1.dauerGesamtMs};
  const fertig = (status, extra) => ({...z, status, dauerMs: zeit, ...extra});
  if (r1.art === 'pflichtfehler') return {...pflicht(`R1: ${r1.grund}`), dauerMs: zeit};
  if (r1.art === 'ausfall') return fertig('ausfall', {grund: `R1: ${r1.grund}`, ursache: ursacheVon(r1.grund)});
  const r2 = await mitWiederholung(o, seed, zuege, farben, mitScore);
  z.versuche.r2 = r2.versuche; zeit.r2 = r2.dauerGesamtMs; zeit.gesamt = zeit.r1 + zeit.r2;
  if (r2.art === 'pflichtfehler') return {...pflicht(`R2: ${r2.grund}`), dauerMs: zeit};
  if (r2.art === 'ausfall') return fertig('ausfall', {grund: `R2: ${r2.grund}`, ursache: ursacheVon(r2.grund)});
  const s1 = logSha(r1.log), s2 = logSha(r2.log);
  if (s1 !== s2) {
    const unterschiede = r1.log.map((e, k) => (r2.log[k] && e.roh === r2.log[k].roh ? null : {nr: k, befehl: e.befehl, r1: e.roh.slice(0, 120), r2: r2.log[k] && r2.log[k].roh.slice(0, 120)})).filter(Boolean).slice(0, 5);
    return fertig('ausfall', {grund: 'nicht wiederholbar: die Rohantworten von R1 und R2 mit demselben Seed sind nicht gleich', ursache: 'nicht wiederholbar', unterschiede});
  }
  const a = analysiereLauf(s, sp.caps, r1.log, kal.konvention, mitScore);
  if (a.fehler.length) return {...pflicht(a.fehler.join(' | ')), dauerMs: zeit};
  const roh = lauf => Object.fromEntries([...ABFRAGEN_LISTE, 'captures black', 'captures white', ...(mitScore ? ['final_score'] : [])].map(b => [b, antwort(lauf.log, b)]));
  const stderrHinweis = r1.stderr || r2.stderr ? {stderr: (r1.stderr + r2.stderr).slice(-200)} : {};
  if (probe) return fertig('gueltig', {wiederholbar: true, logSha: s1, befehle: r1.log.length, ...stderrHinweis});
  return fertig('gueltig', {wiederholbar: true, logSha: s1, befehle: r1.log.length, ersterVersuch: r1.ersterVersuch || null, gnu: a.gnu,
    rohR1: roh(r1), rohR2: roh(r2), listStonesSha: sha256(antwort(r1.log, 'list_stones black') + '\n' + antwort(r1.log, 'list_stones white')), ...stderrHinweis});
}
const ursacheVon = g => (/Timeout/.test(g) ? 'timeout' : /Absturz/.test(g) ? 'absturz' : 'ohne Ergebnis');

async function paketLauf(o) {
  const plan = JSON.parse(fs.readFileSync(o.plan, 'utf8')), paket = plan.pakete.find(p => p.nr === o.teil);
  if (!paket) throw new Error(`Paket ${o.teil} steht nicht im Plan`);
  const s1 = ladeStufe1(o.stufe1), pro = new Map(s1.stellungen.map(s => [s.id, s]));
  const htmlSha = sha256(fs.readFileSync(o.html));
  const E = ladeKI({htmlPfad: o.html, mitNetz: false});
  const gruende = [];
  if (E.PARAMS.diagonalAugeEnde !== 0) gruende.push(`PARAMS.diagonalAugeEnde ist ${E.PARAMS.diagonalAugeEnde}, erwartet 0 (Standard)`);
  if (htmlSha !== plan.erwarteteHtmlSha) gruende.push(`index.html SHA-256 ${htmlSha} statt ${plan.erwarteteHtmlSha} (Stand von Stufe 1)`);
  for (const [f, h] of Object.entries(plan.stufe1)) if (s1.shaDatei[f] !== h) gruende.push(`${f} weicht vom Plan ab`);
  const v = spawnSync(o.gnugo, ['--version'], {encoding: 'utf8'});
  const umgebung = {gnugoVersionAusgabe: (v.stdout || v.stderr || '').trim().split('\n')[0], paketVersion: o.paketVersion || null, node: process.version,
    imageVersion: process.env.ImageVersion || null, imageOS: process.env.ImageOS || null, argumenteOhneSeed: F.gnugoArgumente(0).join(' ').replace('--seed 0', '--seed <seed>')};
  const kopf = {kopf: {teil: o.teil, modus: plan.modus, pid: process.pid, htmlSha256: htmlSha, planSha256: sha256(fs.readFileSync(o.plan)), ...umgebung, stellungen: paket.stellungen.length}};
  const zeilen = [kopf];
  let kal = null;
  if (!gruende.length) {
    try { kal = await F.kalibriereCaptures(F.echteProgramme({gnugo: o.gnugo}).startReferee, L.fortsetzungsSeed(plan.basis, 'kalibrierung', 'kalibrierung', 0, 0)); kopf.kopf.kalibrierung = kal.konvention; }
    catch (e) { gruende.push('captures-Kalibrierung: ' + e.message.slice(0, 160)); }
  }
  kopf.kopf.pflichtfehlerPaket = gruende;
  if (!gruende.length) {
    const ctx = {E, o, plan, kal, s1, cache: new Map()};
    for (const x of paket.stellungen) {
      const s = pro.get(x.id);
      if (!s) { zeilen.push({id: x.id, status: 'pflichtfehler', grund: 'Kennung fehlt in stellungen.jsonl'}); continue; }
      zeilen.push(await bearbeiteStellung(ctx, s, x.kategorie));
    }
  }
  schreibeJsonl(o.aus, zeilen);
  const ok = z => z.status === 'gueltig', aus = zeilen.slice(1);
  console.log(`Paket ${o.teil}: ${aus.length} Stellungen, gültig ${aus.filter(ok).length}, Ausfall ${aus.filter(z => z.status === 'ausfall').length}, Pflichtfehler ${aus.filter(z => z.status === 'pflichtfehler').length}${gruende.length ? '; Paketfehler: ' + gruende.join(' | ') : ''}`);
  return !gruende.length && !aus.some(z => z.status === 'pflichtfehler') ? 0 : 1;
}

/* ── Schicht A und Auswahl der Ketten (rein, ohne GNU Go) ─────────────── */
const NACHBARN = Array.from({length: N}, (_, i) => { const x = i % 19, y = (i / 19) | 0, r = []; if (y > 0) r.push(i - 19); if (x > 0) r.push(i - 1); if (x < 18) r.push(i + 1); if (y < 18) r.push(i + 19); return r; });
function ketten(brett) {
  const besucht = new Uint8Array(N), liste = [];
  for (let i = 0; i < N; i++) {
    if (brett[i] === '.' || besucht[i]) continue;
    const f = brett[i], q = [i]; besucht[i] = 1;
    for (let k = 0; k < q.length; k++) for (const nb of NACHBARN[q[k]]) if (!besucht[nb] && brett[nb] === f) { besucht[nb] = 1; q.push(nb); }
    liste.push({farbe: f, punkte: q.sort((a, b) => a - b)});
  }
  return liste;
}
/* Steinweise Einordnung nach §5 (Tot = GNU Go führt tot / App führt tot). Nur Steine, die in mindestens einer der drei Mengen stehen, können abweichen. */
function steinKlassen(appAus, appAn, gnuDead) {
  const aus = new Set(appAus), an = new Set(appAn), gnu = new Set(gnuDead), r = {};
  for (const i of new Set([...aus, ...an, ...gnu])) {
    const devAus = aus.has(i) !== gnu.has(i), devAn = an.has(i) !== gnu.has(i);
    r[i] = {devAus, devAn, klasse: devAus && !devAn ? 'behoben' : !devAus && devAn ? 'neu' : devAus && devAn ? 'unveraendert' : 'gleich',
      wechsel: an.has(i) && !aus.has(i) ? 'zusaetzlichTot' : aus.has(i) && !an.has(i) ? 'wiederLebendig' : null,
      richtung: devAus ? (gnu.has(i) ? 'GNU tot' : 'GNU lebend') : null};
  }
  return r;
}
/* §16.8: Zuordnung jeder Kette: B1 (mindestens ein neu entstandener Stein), sonst B2 (mindestens ein Stein weicht bei aus ab) mit Klasse und Richtung */
function ordneKette(punkte, kl) {
  const st = punkte.map(i => kl[i]).filter(Boolean);
  if (st.some(x => x.klasse === 'neu')) return {menge: 'B1'};
  const dev = st.filter(x => x.devAus);
  if (!dev.length) return {menge: null};
  const klasse = dev.some(x => x.klasse === 'behoben') ? 'behoben' : 'unveraendert';
  const rich = new Set(dev.map(x => x.richtung));
  return {menge: 'B2', klasse, richtung: rich.size > 1 ? 'gemischt' : [...rich][0]};
}
const KLASSEN = ['behoben', 'unveraendert'], RICHTUNGEN = ['GNU tot', 'GNU lebend', 'gemischt'];
/* Verteilung der Plätze: mindestens 1 je nicht leerer Zelle (das geht vor dem Deckel; bei höchstens 12 Zellen und Deckel 60 ohne Folgen), danach jeweils an die Zelle mit der größten Lücke zum proportionalen Anteil (Gleichstand: Zellname) */
function verteile(groessen, deckel) {
  const zellen = Object.keys(groessen).filter(k => groessen[k] > 0).sort(), gesamt = zellen.reduce((t, k) => t + groessen[k], 0), zuteil = {};
  if (gesamt <= deckel) { for (const k of zellen) zuteil[k] = groessen[k]; return zuteil; }
  for (const k of zellen) zuteil[k] = 1;
  let rest = deckel - zellen.length;
  while (rest > 0) {
    let bester = null, luecke = -Infinity;
    for (const k of zellen) { if (zuteil[k] >= groessen[k]) continue; const l = deckel * groessen[k] / gesamt - zuteil[k]; if (l > luecke + 1e-12) { luecke = l; bester = k; } }
    if (bester === null) break;
    zuteil[bester]++; rest--;
  }
  return zuteil;
}
function waehleKetten(stellungen, basis = 1, deckel = B2_DECKEL) {
  const b1 = [], b2 = [];
  for (const s of stellungen) {
    const kl = steinKlassen(s.appTotAus, s.appTotAn, s.gnuDead);
    for (const k of ketten(s.brett)) {
      const z = ordneKette(k.punkte, kl);
      if (!z.menge) continue;
      const eintrag = {schluessel: `${s.id}|${L.zuGtp(k.punkte[0])}`, stellung: s.id, art: s.art, farbe: k.farbe, steine: k.punkte.length, punkte: k.punkte.map(L.zuGtp)};
      if (z.menge === 'B1') b1.push({...eintrag, steineNeu: k.punkte.filter(i => kl[i] && kl[i].klasse === 'neu').length});
      else b2.push({...eintrag, klasse: z.klasse, richtung: z.richtung, zelle: `${s.art}|${z.klasse}|${z.richtung}`});
    }
  }
  const zaehlung = {};
  for (const k of b2) zaehlung[k.zelle] = (zaehlung[k.zelle] || 0) + 1;
  const groessen = Object.fromEntries(Object.keys(zaehlung).sort().map(k => [k, zaehlung[k]]));   /* feste Reihenfolge der Schlüssel, unabhängig von der Reihenfolge der Stellungen */
  const zuteil = verteile(groessen, deckel), auswahl = [];
  for (const zelle of Object.keys(zuteil)) auswahl.push(...nachHash(b2.filter(k => k.zelle === zelle), k => `b2|${basis}|${k.schluessel}`, k => k.schluessel).slice(0, zuteil[zelle]));
  const byKey = (a, b) => (a.schluessel < b.schluessel ? -1 : a.schluessel > b.schluessel ? 1 : 0);
  return {b1: b1.sort(byKey), b2Kandidaten: b2.length, zellen: groessen, zuteilung: zuteil, b2Auswahl: auswahl.sort(byKey)};
}

/* Kennzahlen je Gruppe von Stellungen (betroffen oder Kontrolle), §5 */
function kennzahlen(liste, E) {
  const z = {stellungen: liste.length, steine: {behoben: 0, neu: 0, unveraendert: 0, behobenZusaetzlichTot: 0, behobenWiederLebendig: 0, neuZusaetzlichTot: 0, neuWiederLebendig: 0, unveraendertGnuTot: 0, unveraendertGnuLebend: 0},
    stellungsebene: {behoben: 0, neu: 0, gemischt: 0, ohneAenderung: 0}, punkte: {}};
  for (const m of MODI) z.punkte[m] = {n: 0, gleichAus: 0, gleichAn: 0, naeherAn: 0, weiterAn: 0, gleichNah: 0, siegerGleichAus: 0, siegerGleichAn: 0};
  for (const s of liste) {
    const kl = steinKlassen(s.appTotAus, s.appTotAn, s.gnuDead);
    let hatB = false, hatN = false;
    for (const x of Object.values(kl)) {
      if (x.klasse === 'behoben') { z.steine.behoben++; hatB = true; z.steine[x.wechsel === 'zusaetzlichTot' ? 'behobenZusaetzlichTot' : 'behobenWiederLebendig']++; }
      else if (x.klasse === 'neu') { z.steine.neu++; hatN = true; z.steine[x.wechsel === 'zusaetzlichTot' ? 'neuZusaetzlichTot' : 'neuWiederLebendig']++; }
      else if (x.klasse === 'unveraendert') z.steine[x.richtung === 'GNU tot' ? 'unveraendertGnuTot' : 'unveraendertGnuLebend']++, z.steine.unveraendert++;
    }
    z.stellungsebene[hatB && hatN ? 'gemischt' : hatB ? 'behoben' : hatN ? 'neu' : 'ohneAenderung']++;
    /* Punkte: Referenzstand je Wertung. S: Fläche = final_score, Territory = App-Rechnung auf GNU Gos Tot-Liste. V: beide Wertungen App-Rechnung auf GNU Gos Tot-Liste (kein final_score). */
    const brett = B.brettAusText(s.brett), caps = {1: s.caps[0], 2: s.caps[1]};
    for (const m of MODI) {
      const ref = s.art === 'S' && m === 'flaeche' ? s.gnuStand : L.zaehleMitTotListe(brett, caps, s.gnuDead, KOMI, E.NEIGHBORS, m).stand;
      const aus = s.art === 'S' ? s.neu.aus.zaehl[m].stand : s.neu.aus.vorschau[m].standMit, an = s.art === 'S' ? s.neu.an.zaehl[m].stand : s.neu.an.vorschau[m].standMit;
      const p = z.punkte[m], da = Math.abs(aus - ref), dn = Math.abs(an - ref);
      p.n++; if (da < 1e-9) p.gleichAus++; if (dn < 1e-9) p.gleichAn++;
      if (dn < da - 1e-9) p.naeherAn++; else if (dn > da + 1e-9) p.weiterAn++; else p.gleichNah++;
      if ((aus > 0) === (ref > 0)) p.siegerGleichAus++; if ((an > 0) === (ref > 0)) p.siegerGleichAn++;
    }
  }
  return z;
}

/* ── auswerten ────────────────────────────────────────────────────────── */
function auswerten(plan, s1, teile, E) {
  const gruende = [], kontrollen = [], probe = plan.modus === 'probe';
  const kontrolle = (name, fehler, extra = {}) => { kontrollen.push({name, ok: fehler.length === 0, anzahlFehler: fehler.length, fehler: fehler.slice(0, 10), ...extra}); if (fehler.length) gruende.push(`${name}: ${fehler.length} (z. B. ${fehler[0]})`); };
  const erwartetNr = plan.pakete.map(p => p.nr), vorhanden = teile.map(t => t.kopf.teil);
  const fehlend = erwartetNr.filter(n => !vorhanden.includes(n));
  kontrolle('Pakete vollständig', fehlend.map(n => `Paket ${n} fehlt (Stellungen: ${plan.pakete.find(p => p.nr === n).stellungen.length}, z. B. ${plan.pakete.find(p => p.nr === n).stellungen.slice(0, 3).map(x => x.id).join('; ')})`), {erwartet: erwartetNr.length, vorhanden: vorhanden.length, fehlendePakete: fehlend});
  const doppelt = vorhanden.filter((n, i) => vorhanden.indexOf(n) !== i);
  const k2 = [...doppelt.map(n => `Paket ${n} mehrfach geliefert`), ...vorhanden.filter(n => !erwartetNr.includes(n)).map(n => `Paket ${n} steht nicht im Plan`)];
  /* Kopf: gleiche Fassung, gleicher Plan, gleiche GNU-Go-Version und -Argumente in allen Paketen */
  const kopfFehler = [];
  const gleich = (feld, soll) => { for (const t of teile) if (t.kopf[feld] !== soll) kopfFehler.push(`Paket ${t.kopf.teil}: ${feld} ${JSON.stringify(t.kopf[feld])} statt ${JSON.stringify(soll)}`); };
  if (teile.length) {
    gleich('htmlSha256', plan.erwarteteHtmlSha); gleich('planSha256', teile[0].kopf.planSha256); gleich('gnugoVersionAusgabe', teile[0].kopf.gnugoVersionAusgabe); gleich('paketVersion', teile[0].kopf.paketVersion);
    gleich('argumenteOhneSeed', teile[0].kopf.argumenteOhneSeed); gleich('imageVersion', teile[0].kopf.imageVersion); gleich('modus', plan.modus);
    for (const t of teile) for (const g of t.kopf.pflichtfehlerPaket || []) kopfFehler.push(`Paket ${t.kopf.teil}: ${g}`);
  }
  kontrolle('Köpfe: gleiche Fassung der Engine, gleicher Plan, gleiche GNU-Go-Version und -Argumente, kein Paketfehler', [...k2, ...kopfFehler]);
  /* Vollständigkeit der Stellungen: jede Kennung des Plans genau einmal, in dem Paket, das der Plan nennt */
  const jeId = new Map(), vollst = [];
  for (const t of teile) {
    const soll = plan.pakete.find(p => p.nr === t.kopf.teil); if (!soll) continue;
    const ids = t.zeilen.map(z => z.id);
    for (const id of ids) { if (jeId.has(id)) vollst.push(`${id}: mehrfach im Ergebnis`); }
    for (const x of soll.stellungen) if (!ids.includes(x.id)) vollst.push(`${x.id}: fehlt im Paket ${t.kopf.teil}`);
    for (const id of ids) if (!soll.stellungen.some(x => x.id === id)) vollst.push(`${id}: gehört nicht zu Paket ${t.kopf.teil}`);
    for (const z of t.zeilen) jeId.set(z.id, z);
  }
  const alleIds = plan.pakete.flatMap(p => p.stellungen.map(x => x.id));
  const nurKomplett = teile.length === plan.pakete.length;
  if (nurKomplett) for (const id of alleIds) if (!jeId.has(id)) vollst.push(`${id}: ohne Ergebnis`);
  kontrolle('Vollständigkeit: jede Kennung des Plans genau einmal mit Status', vollst, {erwartet: alleIds.length, vorhanden: jeId.size});
  const pro = new Map(s1.stellungen.map(s => [s.id, s]));
  const kategorieVon = new Map(plan.pakete.flatMap(p => p.stellungen.map(x => [x.id, x.kategorie])));
  const seedF = [];
  for (const z of jeId.values()) { const s = pro.get(z.id); if (s && z.seed !== L.fortsetzungsSeed(plan.basis, s.gruppe, s.quelle, s.nr, s.index)) seedF.push(`${z.id}: Seed ${z.seed} weicht von fortsetzungsSeed ab`); }
  kontrolle('Seeds gleich fortsetzungsSeed(Basis, Gruppe, Quelle, Nr., Index)', seedF);
  const zeilen = [...jeId.values()], pflichtF = zeilen.filter(z => z.status === 'pflichtfehler');
  kontrolle('Pflichtfehler (Daten, Replay, abweichendes Brett, ungültige Antworten, Abgleich mit Stufe 1)', pflichtF.map(z => `${z.id}: ${z.grund}`));
  const ausfaelle = zeilen.filter(z => z.status === 'ausfall');
  /* Ausfallgrenze (§16.7): mehr als 5 % der betroffenen Stellungen je Art, und der Kontrollstichprobe je Art */
  const grenzFehler = [], grenzen = {};
  for (const art of ['S', 'V']) for (const kat of ['betroffen', 'kontrolle']) {
    const ids = alleIds.filter(id => pro.get(id) && pro.get(id).art === art && kategorieVon.get(id) === kat), n = ids.length, a = ausfaelle.filter(z => ids.includes(z.id)).length;
    grenzen[`${art}|${kat}`] = {n, ausfaelle: a, ueberGrenze: n > 0 && ueberGrenze(a, n), ab: Math.floor(GRENZE_PROZENT * n / 100) + 1};
    if (!probe && n > 0 && ueberGrenze(a, n)) grenzFehler.push(`${art} ${kat}: ${a} Ausfälle von ${n} (mehr als ${GRENZE_PROZENT} %, ab ${Math.floor(GRENZE_PROZENT * n / 100) + 1})`);
  }
  kontrolle(`Ausfallgrenze (mehr als ${GRENZE_PROZENT} % je Stellungsart, betroffen und Kontrolle getrennt)`, grenzFehler, {grenzen});
  /* Fallabdeckung: „R1 gleich R2“ zählt nur, wenn je Stellungsart mindestens eine gültige Stellung eine nicht leere dead-Liste hat (nicht in der Probe: dort keine Listen) */
  if (!probe) {
    const abd = [];
    for (const art of ['S', 'V']) { const g = zeilen.filter(z => z.art === art && z.status === 'gueltig'); if (g.length && !g.some(z => z.gnu.dead.length)) abd.push(`Stellungsart ${art}: keine gültige Stellung mit nicht leerer dead-Liste`); }
    kontrolle('Fallabdeckung der Wiederholbarkeit (sonst KEIN URTEIL)', abd);
  }
  const gueltig = gruende.length === 0;
  const basisBericht = {gueltig, urteil: gueltig ? 'gültig' : 'KEIN URTEIL', gruende, kontrollen, modus: plan.modus, plan: {basis: plan.basis, paketgroesse: plan.paketgroesse, zahlen: plan.zahlen}};
  const ausfallListe = ausfaelle.map(z => ({id: z.id, art: z.art, gruppe: z.gruppe, kategorie: z.kategorie, partieLaenge: z.partieLaenge, ursache: z.ursache, grund: z.grund, versuche: z.versuche,
    totMengeUnterschied: z.appTot ? {zusaetzlichTot: z.appTot.an.filter(i => !z.appTot.aus.includes(i)).length, wiederLebend: z.appTot.aus.filter(i => !z.appTot.an.includes(i)).length} : null}));
  if (probe) return probeBericht(basisBericht, zeilen, ausfallListe);
  if (!gueltig) return {bericht: {...basisBericht, ausfaelle: ausfallListe}, md: berichtMd({...basisBericht, ausfaelle: ausfallListe}), auswahl: null};
  /* gültig: Schicht A und mechanische Auswahl */
  const nutz = zeilen.filter(z => z.status === 'gueltig').map(z => { const s = pro.get(z.id); return {id: z.id, art: z.art, gruppe: z.gruppe, kategorie: z.kategorie, brett: s.brett, caps: s.caps, appTotAus: z.appTot.aus, appTotAn: z.appTot.an, gnuDead: z.gnu.dead, gnuStand: z.gnu.stand, neu: s1.neu.get(z.id)}; });
  const schichtA = {};
  for (const art of ['S', 'V']) for (const kat of ['betroffen', 'kontrolle']) {
    const l = nutz.filter(x => x.art === art && x.kategorie === kat);
    const gr = {'Summe (nicht gewichtet)': l};
    for (const g of new Set(l.map(x => x.gruppe))) gr[g] = l.filter(x => x.gruppe === g);
    for (const [g, ll] of Object.entries(gr)) schichtA[`${art}|${kat}|${g}`] = {art, kategorie: kat, gruppe: g, ...kennzahlen(ll, E)};
  }
  const auswahl = waehleKetten(nutz.filter(x => x.kategorie === 'betroffen'), plan.basis);
  const seki = zeilen.filter(z => z.status === 'gueltig' && z.gnu.seki.length).length;
  const bericht = {...basisBericht, ausfaelle: ausfallListe, schichtA, auswahl: {b1: auswahl.b1.length, b2Kandidaten: auswahl.b2Kandidaten, zellen: auswahl.zellen, zuteilung: auswahl.zuteilung, b2Ausgewaehlt: auswahl.b2Auswahl.length},
    stellungenMitGnuSeki: seki, gueltigeStellungen: nutz.length, ausfaelleBetroffen: ausfaelle.filter(z => z.kategorie === 'betroffen').length};
  return {bericht, md: berichtMd(bericht), auswahl};
}
function probeBericht(basis, zeilen, ausfallListe) {
  const d = art => zeilen.filter(z => (art ? z.art === art : true) && z.dauerMs && Number.isFinite(z.dauerMs.gesamt)).map(z => z.dauerMs.gesamt / 1000);
  const stat = a => ({n: a.length, median: median(a), p95: quantil(a, 0.95), max: a.length ? Math.max(...a) : null});
  const dauer = {alle: stat(d()), S: stat(d('S')), V: stat(d('V'))}, max = dauer.alle.max;
  const g = max ? Math.floor(3600 / max) : null;
  const regel = max === null ? 'keine Dauer gemessen' : (max * 50 <= 3600 ? 'Maximum × 50 ≤ 60 Minuten: Paketgröße 50 bleibt' : (g >= 36 ? `G = ${g} (≥ 36): Paketgröße ${Math.min(g, 50)}` : `G = ${g} < 36: Budget und Paketgrenze lassen sich nicht zugleich einhalten; die Paketgrenze wird NEU ENTSCHIEDEN (Hazeberry), die 36 wird nicht eingesetzt`));
  const bericht = {...basis, dauerSekundenJeStellung: dauer, paketgroesseRegel: regel, ausfaelle: ausfallListe, hinweis: 'Probe: nur Dauer, Status und technische Kontrollen; keine Tot-Listen, keine Schicht-A-Zahlen. Die 24 Stellungen laufen im Hauptlauf neu.'};
  const m = ['# Diagonalprüfung, Stufe 2: Probe (nur technisch)', '', 'Zweck: Dauer messen und den Ablauf mit echtem GNU Go prüfen (§16.6). **Keine Schicht-A-Zahlen, keine Tot-Listen.** Die Stellungen laufen im Hauptlauf neu.', '',
    `Plan: ${basis.plan.zahlen.gesamt} Stellungen (betroffen S ${basis.plan.zahlen.betroffen.S}, V ${basis.plan.zahlen.betroffen.V}; Kontrolle S ${basis.plan.zahlen.kontrolle.S}, V ${basis.plan.zahlen.kontrolle.V}).`, '', '## Kontrollen', '', '| Kontrolle | Ergebnis |', '|---|---|',
    ...basis.kontrollen.map(k => `| ${k.name} | ${k.ok ? 'bestanden' : `**NICHT bestanden** (${k.anzahlFehler}): ${k.fehler.slice(0, 3).join(' | ')}`} |`), '',
    `**${basis.gueltig ? 'Probe gültig (technisch).' : 'Probe UNGÜLTIG, KEIN URTEIL.'}**${basis.gueltig ? '' : ' Gründe: ' + basis.gruende.join(' ; ')}`, '',
    '## Dauer je Stellung (beide Referenzläufe samt Wiederholungsversuchen, Sekunden)', '', '| Art | n | Median | 95 %-Quantil | Maximum |', '|---|---:|---:|---:|---:|',
    ...Object.entries(dauer).map(([k, v]) => `| ${k} | ${v.n} | ${komma(v.median)} | ${komma(v.p95)} | ${komma(v.max)} |`), '',
    `Regel für die Paketgröße (§16.6): ${regel}. Das ist ein rechnerischer Hinweis; die Entscheidung steht vor dem Go zum Hauptlauf im Doc.`, '',
    `Ausfälle: ${ausfallListe.length}${ausfallListe.length ? ' (' + ausfallListe.map(a => `${a.id}: ${a.ursache}`).join('; ') + ')' : ''}.`, ''];
  return {bericht, md: m.join('\n') + '\n', auswahl: null};
}
function berichtMd(b) {
  const m = ['# Diagonalprüfung, Stufe 2: Übereinstimmung mit GNU Go (Schicht A)', '',
    'GNU Gos Tot-Liste ist der **Maßstab dieser Messung, nicht die Wahrheit** (§5, §6). Übereinstimmung ist nicht Richtigkeit; ein Standardwechsel oder eine Kandidatur folgt daraus nicht (§8). Betroffenheit und Übereinstimmung sind keine Verbesserung.', '',
    `Plan: ${b.plan.zahlen.gesamt} Stellungen in ${b.plan.zahlen.pakete} Paketen (Paketgröße ${b.plan.paketgroesse}, Seed-Basis ${b.plan.basis}); betroffen S ${b.plan.zahlen.betroffen.S}, V ${b.plan.zahlen.betroffen.V}; Kontrolle S ${b.plan.zahlen.kontrolle.S}, V ${b.plan.zahlen.kontrolle.V}.`, '',
    '## Kontrollen', '', '| Kontrolle | Ergebnis |', '|---|---|', ...b.kontrollen.map(k => `| ${k.name} | ${k.ok ? 'bestanden' : `**NICHT bestanden** (${k.anzahlFehler}): ${k.fehler.slice(0, 3).join(' | ')}`} |`), ''];
  if (!b.gueltig) { m.push(`**UNGÜLTIG, KEIN URTEIL.** Gründe: ${b.gruende.join(' ; ')}`, ''); }
  else m.push('Alle Pflichtkontrollen bestanden.', '');
  m.push('## Ausfälle (einzeln, §16.7)', '', 'Ausfälle sind nicht zufällig (schwierige Stellungen, Absturz durch die Stellung selbst). **Jeder ungeklärte Ausfall in einer betroffenen Stellung verhindert die positive Kandidatur**, auch unter der Berichtsgrenze.', '');
  if (!b.ausfaelle.length) m.push('Keine Ausfälle.', '');
  else { m.push('| Stellung | Art | Gruppe | Kategorie | Partielänge | Ursache | Unterschied der Tot-Mengen aus/an |', '|---|---|---|---|---:|---|---|');
    for (const a of b.ausfaelle) m.push(`| ${a.id} | ${a.art} | ${a.gruppe} | ${a.kategorie} | ${a.partieLaenge === null ? '–' : a.partieLaenge} | ${a.ursache} | ${a.totMengeUnterschied ? `zusätzlich tot ${a.totMengeUnterschied.zusaetzlichTot}, wieder lebend ${a.totMengeUnterschied.wiederLebend}` : '–'} |`); m.push(''); }
  if (!b.gueltig) return m.join('\n') + '\n';
  m.push('## Kennzahlen (Steine; behoben und neu entstanden getrennt, nie nur als Saldo)', '',
    'behoben = bei aus von GNU Go abweichend, bei an gleich; neu entstanden = bei aus gleich, bei an abweichend; unverändert abweichend = bei beiden abweichend. „zusätzlich tot“ = bei an tot, bei aus lebend; „wieder lebendig“ umgekehrt. Stellungen derselben Partie sind nicht unabhängig.', '',
    '| Art | Kategorie | Gruppe | Stellungen | Steine behoben (zusätzlich tot / wieder lebendig) | Steine neu entstanden (zusätzlich tot / wieder lebendig) | Steine unverändert abweichend (GNU tot / GNU lebend) | Stellungen mit behoben | mit neu | beides | ohne Änderung |', '|---|---|---|---:|---|---|---|---:|---:|---:|---:|');
  for (const k of Object.values(b.schichtA).sort((p, q) => (p.art + p.kategorie + p.gruppe).localeCompare(q.art + q.kategorie + q.gruppe))) {
    const s = k.steine, e = k.stellungsebene;
    m.push(`| ${k.art} | ${k.kategorie} | ${k.gruppe} | ${k.stellungen} | ${s.behoben} (${s.behobenZusaetzlichTot} / ${s.behobenWiederLebendig}) | ${s.neu} (${s.neuZusaetzlichTot} / ${s.neuWiederLebendig}) | ${s.unveraendert} (${s.unveraendertGnuTot} / ${s.unveraendertGnuLebend}) | ${e.behoben} | ${e.neu} | ${e.gemischt} | ${e.ohneAenderung} |`);
  }
  m.push('', '## Punkte (Abstand des Standes zum Referenzstand aus GNU Gos Tot-Liste)', '',
    'S: Fläche gegen `final_score`, Territory gegen die App-Rechnung auf GNU Gos Tot-Liste. V: „mit Annahmen“ gegen die App-Rechnung auf GNU Gos Tot-Liste (kein `final_score`). „näher“ und „weiter“ vergleichen den Abstand bei an mit dem bei aus.', '',
    '| Art | Kategorie | Gruppe | Wertung | n | gleich bei aus | gleich bei an | bei an näher | bei an weiter | Abstand gleich | Sieger wie Referenz aus | an |', '|---|---|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const k of Object.values(b.schichtA).filter(x => x.gruppe.startsWith('Summe')).sort((p, q) => (p.art + p.kategorie).localeCompare(q.art + q.kategorie)))
    for (const w of MODI) { const p = k.punkte[w]; m.push(`| ${k.art} | ${k.kategorie} | ${k.gruppe} | ${w} | ${p.n} | ${p.gleichAus} | ${p.gleichAn} | ${p.naeherAn} | ${p.weiterAn} | ${p.gleichNah} | ${p.siegerGleichAus} | ${p.siegerGleichAn} |`); }
  m.push('', 'Je Gruppe stehen die Zahlen in `bericht.json`. Die Kontrollstichprobe geht in keine Kennzahl der betroffenen Stellungen ein und misst nicht die Wirkung des Schalters (§16.4).', '',
    '## Mechanische Auswahl für Stufe 3 (§16.8, ohne Sicht auf Urteile)', '',
    `- B1 (alle neu entstandenen Abweichungen, ohne Deckel): ${b.auswahl.b1} Ketten.`, `- B2: ${b.auswahl.b2Kandidaten} Kandidaten, davon ${b.auswahl.b2Ausgewaehlt} gezogen (Deckel ${B2_DECKEL}); Zellen (Art|Klasse|Richtung): ${JSON.stringify(b.auswahl.zellen)}; Zuteilung: ${JSON.stringify(b.auswahl.zuteilung)}.`,
    `- Stellungen mit Seki-Eintrag bei GNU Go: ${b.stellungenMitGnuSeki}.`, '- Ausfälle in betroffenen Stellungen haben keine GNU-Go-Liste, gehen weder in B1 noch in B2 ein und stehen oben als ungeklärt.', '',
    '## Grenzen', '', '- GNU Go als Maßstab, ohne Beurteilung (Stufe 3 steht aus).', '- Die Prüfdaten stammen aus denselben Archiven wie die Entwicklungsdaten und gelten nicht für Menschen.',
    '- Ko und Superko wurden beim Einspielen nicht geprüft (wie Stufe 1).', '- Die GNU-Go-Fassung des Archivlaufs ist nicht bekannt; diese Messung protokolliert ihre Fassung (Köpfe der Pakete).', '- Zeit je Stellung und Timeouts sind Setzungen (§16.3 Nr. 7).');
  return m.join('\n') + '\n';
}

/* ── Aufruf ───────────────────────────────────────────────────────────── */
function optionen(argv, erlaubt, pflicht) {
  const o = {};
  for (let i = 0; i < argv.length; i++) {
    const n = argv[i].replace(/^--/, '');
    if (!argv[i].startsWith('--') || !erlaubt.includes(n) || argv[i + 1] === undefined) throw new Error('Unbekannte oder unvollständige Option: ' + argv[i]);
    o[n] = argv[++i];
  }
  for (const n of pflicht) if (o[n] === undefined) throw new Error('Option fehlt: --' + n);
  return o;
}
const ganzzahl = (wert, name) => { if (!/^\d+$/.test(String(wert))) throw new Error(`--${name} muss eine ganze Zahl sein`); return +wert; };
async function main() {
  const [befehl, ...rest] = process.argv.slice(2);
  if (befehl === 'plan') {
    const o = optionen(rest, ['stufe1', 'aus', 'modus', 'paketgroesse', 'basis', 'kontrolle'], ['stufe1', 'aus']);
    fs.mkdirSync(o.aus, {recursive: true});
    const r = erstellePlan(ladeStufe1(o.stufe1), {modus: o.modus, paketgroesse: o.paketgroesse === undefined ? undefined : ganzzahl(o.paketgroesse, 'paketgroesse'),
      basis: o.basis === undefined ? undefined : ganzzahl(o.basis, 'basis'), kontrolle: o.kontrolle === undefined ? undefined : ganzzahl(o.kontrolle, 'kontrolle')});
    if (r.gruende.length) { console.error('PLAN UNGÜLTIG, KEIN URTEIL: ' + r.gruende.join(' ; ')); process.exit(1); }
    fs.writeFileSync(path.join(o.aus, 'plan.json'), JSON.stringify(r.plan));
    fs.writeFileSync(path.join(o.aus, 'teile.json'), JSON.stringify(r.plan.pakete.map(p => p.nr)));
    console.log(`Plan (${r.plan.modus}): ${r.plan.zahlen.gesamt} Stellungen in ${r.plan.zahlen.pakete} Paketen; betroffen S ${r.plan.zahlen.betroffen.S}, V ${r.plan.zahlen.betroffen.V}; Kontrolle S ${r.plan.zahlen.kontrolle.S}, V ${r.plan.zahlen.kontrolle.V}`);
  } else if (befehl === 'paket') {
    const o = optionen(rest, ['plan', 'teil', 'stufe1', 'archiv', 'aus', 'gnugo', 'html', 'paket-version', 'timeout-befehl-ms', 'timeout-lauf-ms'], ['plan', 'teil', 'stufe1', 'archiv', 'aus', 'gnugo']);
    const opt = {plan: o.plan, teil: ganzzahl(o.teil, 'teil'), stufe1: o.stufe1, archiv: o.archiv, aus: o.aus, gnugo: o.gnugo, html: o.html || path.join(__dirname, '..', '..', 'index.html'),
      paketVersion: o['paket-version'] || '', timeoutBefehlMs: o['timeout-befehl-ms'] ? ganzzahl(o['timeout-befehl-ms'], 'timeout-befehl-ms') : TIMEOUT_BEFEHL_MS,
      timeoutLaufMs: o['timeout-lauf-ms'] ? ganzzahl(o['timeout-lauf-ms'], 'timeout-lauf-ms') : TIMEOUT_LAUF_MS};
    if (!fs.existsSync(opt.gnugo)) throw new Error('GNU Go nicht gefunden: ' + opt.gnugo);
    fs.mkdirSync(path.dirname(path.resolve(opt.aus)), {recursive: true});
    process.exit(await paketLauf(opt));
  } else if (befehl === 'auswerten') {
    const o = optionen(rest, ['plan', 'stufe1', 'ergebnisse', 'aus', 'html'], ['plan', 'stufe1', 'aus']);
    const plan = JSON.parse(fs.readFileSync(o.plan, 'utf8')), s1 = ladeStufe1(o.stufe1);
    const dateien = (o.ergebnisse || '').split(',').filter(Boolean);
    const teile = dateien.map(f => { const z = leseJsonlDatei(f); return {kopf: z[0].kopf, zeilen: z.slice(1), datei: f}; });
    const E = ladeKI({htmlPfad: o.html || path.join(__dirname, '..', '..', 'index.html'), mitNetz: false});
    fs.mkdirSync(o.aus, {recursive: true});
    const r = auswerten(plan, s1, teile, E);
    fs.writeFileSync(path.join(o.aus, 'bericht.json'), JSON.stringify(r.bericht, null, 1));
    fs.writeFileSync(path.join(o.aus, 'bericht.md'), r.md);
    if (r.auswahl) fs.writeFileSync(path.join(o.aus, 'auswahl-stufe3.json'), JSON.stringify(r.auswahl, null, 1));
    console.log(r.md);
    process.exit(r.bericht.gueltig ? 0 : 1);
  } else throw new Error('Aufruf: node diagonal-pruefung-stufe2.js plan|paket|auswerten ...');
}
if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(2); });
module.exports = {erstellePlan, ladeStufe1, gtpStart, referenzLauf, mitWiederholung, analysiereLauf, ketten, steinKlassen, ordneKette, verteile, waehleKetten, kennzahlen, auswerten, probeBericht, ueberGrenze, hash,
  GRENZE_PROZENT, KONTROLLE_MIN, KONTROLLE_MAX, B2_DECKEL, TIMEOUT_BEFEHL_MS, TIMEOUT_LAUF_MS, PROBE, KLASSEN, RICHTUNGEN};
