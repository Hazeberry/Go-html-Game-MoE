// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Passregel-Vergleich, Stufen B und C (docs/passregel-vergleich.md §2, §5, §6):
   Je Einheit aus Stufe A (einheiten.jsonl)
     – die Zugfolge bis zur Stellung in GNU Go (Schiedsrichter) und, je nach Gegner, in Fuego
       oder die Gegner-KI einspielen, die Engine nachbauen,
     – die Voraussetzung „Gegner hat unmittelbar davor gepasst“ prüfen,
     – Brett, Gefangene und Gegner vergleichen,
     – Arm 1 „sofort“: GNU Gos Zählung der Stellung (final_score; final_status_list dead für Territory),
     – Arm 0 „weiter“: die KI (index.html, Standardwerte, Passregel AUS) spielt gegen den Gegner weiter
       bis zu zwei Pässen in Folge; GNU Go zählt die Endstellung.
   Ergebnis je Einheit eine Zeile JSONL für passregel-vergleich.js. Läuft nur in GitHub Actions,
   nach Go (CLAUDE.md). Nichts davon ändert den Spielcode.

   Aufruf:
     node auswertung/endspiel/passregel-fortsetzung.js --einheiten einheiten.jsonl --aus ergebnis.jsonl
        [--teil i/m] [--wiederhole 3] [--probe] [--sims 120] [--maxzuege 600] [--seed 1] [--html index.html]
        [--gnugo /usr/games/gnugo] [--fuego fuego-bin/fuego] [--gegner-html-verz vergleich] */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {spawn} = require('child_process');
const L = require('./passregel-lib.js');

/* ── Engine laden (eigener Prozess, Standardwerte = Passregel AUS) ───────── */
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
    + ';globalThis.__PF={PARAMS,getAIMove,computeZobrist,removeDeadGroups,floodFill,BOARD_SIZE,NEIGHBORS,'
    + 'toteSteineAmEnde,passNachGegnerpassPruefung,'
    + 'setzeKrisenDauer:typeof setzeKrisenDauer==="function"?setzeKrisenDauer:()=>{},'
    + 'setzeLebensurteil:typeof setzeLebensurteil==="function"?setzeLebensurteil:()=>{},'
    + 'neuePartie(){_mctsSavedRoot=null;_hopelessStreak=0;_allDeadStreak=0;_lastMsPerSim=null;}};');
  return globalThis.__PF;
}

/* ── GTP über Prozesse (wie gnugo-duell.js; ohne Neustart: ein Absturz ist ein Ausfall) ── */
function gtpStarten(programm, argumente, name) {
  const p = spawn(programm, argumente, {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = '', warte = [], stderr = '';
  p.stderr.on('data', d => { stderr += d.toString(); });
  p.on('exit', (code, sig) => { for (const w of warte.splice(0)) w(`? ${name} beendet (code ${code}, signal ${sig}) ${stderr.slice(-300)}`); });
  p.stdout.on('data', d => {
    puffer += d.toString(); let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) { const antwort = puffer.slice(0, k); puffer = puffer.slice(k + 2); const w = warte.shift(); if (w) w(antwort); }
  });
  const frage = befehl => new Promise((ok, fehler) => {
    warte.push(antwort => antwort.startsWith('=') ? ok(antwort.slice(1).trim()) : fehler(new Error(`${name}: ${befehl} → ${antwort}`)));
    p.stdin.write(befehl + '\n');
  });
  return {frage, ende: () => { try { p.stdin.write('quit\n'); } catch (e) {} p.kill(); }};
}

/* ── Ablauf je Einheit; ctx macht die Programme austauschbar (Test mit Attrappe) ──
   ctx: {E, DEFAULT, opt:{sims,maxZuege,seed}, startReferee(seed), startGegner(einheit, seed) → null bei GNU Go} */
const KOMI = 7.5;
/* Abweichung Fläche aus Tot-Liste ≠ final_score: die Gleichheitsprüfung bleibt; hier wird nur festgehalten, wo und womit */
function meldeAbweichung(res, wo, z) {
  (res.kontrolle.abweichungen = res.kontrolle.abweichungen || []).push({wo, finalScore: z.finalScore, flaecheAusTotListe: z.flaecheAusTotListe, tote: z.tote, diagnose: z.diagnose});
}
const fehlerProgramm = e => /^(GNU Go|Fuego|KI-Gegner)( beendet|: )/.test(e.message);
/* Art eines Fehlers beim Zählen (docs/passregel-vergleich.md §9 Nr. 5 und Nr. 6):
   daten      GNU Go hat geantwortet, die Antwort ist unzulässig (z. B. `pass` oder Z99 in der Tot-Liste, unlesbarer final_score) → Pflichtfehler
   technisch  GNU Go hat nicht geantwortet (Prozess beendet, Fehlerantwort „?“) → konservativ nach der Ausfallregel (§9 Nr. 6)
   werkzeug   alles andere: ein unerwarteter Fehler im Werkzeug selbst → Pflichtfehler */
/* Ursache eines technischen Ausfalls, ungekürzt: Fehlerantwort „?“ heißt „Befehl abgelehnt“ (GNU Go lebt, hat den Befehl aber
   verweigert), „beendet“ heißt kein Prozess mehr. Befehl und Fehlertext bleiben erhalten, damit eine systematische Fehlbedienung
   (derselbe Befehl in vielen Einheiten abgelehnt) erkennbar ist. */
const technischeUrsache = e => {
  const msg = String(e && e.message || ''), m = /^(GNU Go|Fuego|KI-Gegner): ([\s\S]+?) → ([\s\S]*)$/.exec(msg);
  if (m) return {typ: 'abgelehnt', programm: m[1], befehl: m[2], text: m[3].slice(0, 500)};
  const b = /^(GNU Go|Fuego|KI-Gegner) beendet/.exec(msg);
  return {typ: 'beendet', programm: b ? b[1] : null, befehl: null, text: msg.slice(0, 500)};
};
const fehlerArt = e => (e && e.daten ? 'daten' : e && fehlerProgramm(e) ? 'technisch' : 'werkzeug');

function setze(E, board, i, f) {
  board[i] = f;
  const cap = E.removeDeadGroups(board, 3 - f, i);
  let ko = null;
  if (cap === 1) { const ff = E.floodFill(board, i); if (ff.group.length === 1 && ff.liberties.length === 1) ko = ff.liberties[0]; }
  return {cap, ko};
}
async function bretterGleich(E, board, prog, name) {
  for (const [farbe, f] of [['black', 1], ['white', 2]]) {
    const bei = new Set((await prog.frage(`list_stones ${farbe}`)).split(/\s+/).filter(Boolean).map(L.vonGtp));
    for (let k = 0; k < E.BOARD_SIZE; k++) if ((board[k] === f) !== bei.has(k)) return `Brett weicht bei ${name} ab an ${L.zuGtp(k)}`;
  }
  return null;
}
/* Zählung der aktuellen Stellung durch den Schiedsrichter: Fläche (final_score) und Territory (Tot-Liste) */
const brettText = b => Array.from(b, c => '.XO'[c]).join('');
async function zaehlung(E, ref, board, caps) {
  const fs_ = await ref.frage('final_score');
  const flaeche = L.standAusFinalScore(fs_);
  const tot = L.totListeAusGtp(await ref.frage('final_status_list dead'));
  const territory = L.zaehleMitTotListe(board, caps, tot, KOMI, E.NEIGHBORS, 'territory').stand;
  const flaecheTot = L.zaehleMitTotListe(board, caps, tot, KOMI, E.NEIGHBORS, 'flaeche').stand;
  /* Diagnose zur Zählabweichung (docs/passregel-vergleich.md §9 Nr. 5): Brett, tote Koordinaten und beide Zählwerte */
  const diagnose = {brett: brettText(board), gefangen: {1: caps[1], 2: caps[2]}, tote: [...tot].sort((a, b) => a - b).map(L.zuGtp),
                    finalScore: fs_, flaecheFinalScore: flaeche, flaecheAusTotListe: flaecheTot, territoryAusTotListe: territory};
  /* Nur bei einer Abweichung: GNU Gos Listen holen und beide Zählverfahren Punkt für Punkt vergleichen (Koordinaten und
     Bestandteile, ohne Toleranz). Scheitert das, steht der Grund da; es ist kein Gültigkeitskriterium. */
  if (Math.abs(flaecheTot - flaeche) >= 1e-9) {
    try {
      const m = {dead: tot};
      for (const [k, art] of [['alive', 'alive'], ['seki', 'seki'], ['wt', 'white_territory'], ['bt', 'black_territory'], ['dame', 'dame']])
        m[k] = L.totListeAusGtp(await ref.frage('final_status_list ' + art));
      diagnose.vergleich = L.vergleicheZaehlung(board, caps, m, KOMI, E.NEIGHBORS, flaeche);
    } catch (err) { diagnose.vergleichFehler = err.message.slice(0, 160); }
  }
  return {flaeche, territory, flaecheTotListe: Math.abs(flaecheTot - flaeche) < 1e-9, flaecheAusTotListe: flaecheTot, tote: tot.size, finalScore: fs_, diagnose};
}

/* Kalibrierung der Konvention von GNU Gos `captures` an einer Stellung mit UNGLEICHEN Zahlen:
   Schwarz schlägt zwei Steine (A1, T1), Weiß einen (A19). Liefert `captures black` 2 und `captures white` 1,
   zählt GNU Go „von dieser Farbe gefangen“ (wie caps der Engine); liefert es 1 und 2, zählt es „an diese Farbe
   verloren“. Alles andere ist ein Fehler. Der Test läuft in einem eigenen, frischen Schiedsrichter und wird
   in jedem Prozess einmal gemacht; danach gilt genau diese Zuordnung. */
const KALIBRIER_ZUEGE = ['play B A2', 'play W A1', 'play B B1', 'play B T2', 'play W T1', 'play B S1', 'play W A18', 'play B A19', 'play W B19'];
async function kalibriereCaptures(startReferee, seed) {
  const ref = await startReferee(seed);
  try {
    for (const z of KALIBRIER_ZUEGE) await ref.frage(z);
    const gb = +(await ref.frage('captures black')), gw = +(await ref.frage('captures white'));
    if (gb === 2 && gw === 1) return {konvention: 'gefangen-von', black: gb, white: gw};
    if (gb === 1 && gw === 2) return {konvention: 'verloren-an', black: gb, white: gw};
    throw new Error(`captures-Kalibrierung nicht eindeutig: black ${gb}, white ${gw} (erwartet 2/1 oder 1/2)`);
  } finally { ref.ende(); }
}

async function bearbeiteEinheit(ctx, e) {
  const {E, opt} = ctx, N = E.BOARD_SIZE, ki = e.kiFarbe, seed = L.fortsetzungsSeed(opt.seed, e.gruppe, e.datei, e.nr, e.index);
  const res = {schluessel: e.schluessel, gruppe: e.gruppe, datei: e.datei, nr: e.nr, index: e.index, kiFarbe: ki, gegner: e.gegner, seed,
               fehler: [], arm1: {flaeche: null, territory: null}, arm0: {status: 'ausfall', grund: 'nicht gelaufen'}, kontrolle: {}, diagnose: {}};
  const t0 = Date.now();
  let ref = null, geg = null;
  const farbeDe = f => (f === 1 ? 'B' : 'W');
  try {
    ref = await ctx.startReferee(seed);
    geg = await ctx.startGegner(e, seed);            /* null: der Schiedsrichter zieht selbst für GNU Go */
    const gegner = geg || ref, opp = 3 - ki;
    /* Einspielen */
    const board = new Uint8Array(N), caps = {1: 0, 2: 0}, hist = new Set([E.computeZobrist(board)]);
    let ko = null, last = null, mc = 0, paesse = 0;
    const zz = [];
    for (let j = 0; j < e.zuege.length; j++) {
      const m = e.zuege[j], f = (e.index - j) % 2 === 0 ? opp : ki, i = m === 'pass' ? -1 : L.vonGtp(m);
      const befehl = `play ${farbeDe(f)} ${m === 'pass' ? 'pass' : m}`;
      await ref.frage(befehl); if (geg) await geg.frage(befehl);
      zz.push({farbe: f, punkt: i}); mc++;
      if (i < 0) { paesse++; ko = null; }
      else {
        if (board[i]) { res.fehler.push(`Einspielen: Zug ${j + 1} auf besetztes Feld ${m}`); return res; }
        const s = setze(E, board, i, f); caps[f] += s.cap; ko = s.ko; last = i; paesse = 0; hist.add(E.computeZobrist(board));
      }
    }
    /* Voraussetzung (§2, §9 Nr. 8) */
    const vz = L.voraussetzung(zz, e.index, ki, paesse);
    res.kontrolle.voraussetzung = vz;
    if (!vz.ok) res.fehler.push('Voraussetzung: ' + vz.fehler.join('; '));
    /* Brett, Gefangene (§9 Nr. 3, 5) */
    for (const [prog, name] of [[ref, 'GNU Go'], ...(geg ? [[geg, 'Gegner']] : [])]) {
      const b = await bretterGleich(E, board, prog, name);
      if (b) res.fehler.push('Einspielen: ' + b);
    }
    res.kontrolle.bretterGleich = !res.fehler.some(x => /^Einspielen: Brett/.test(x));
    try {
      /* Gefangene: nur die EINE in der Kalibrierung bestimmte Zuordnung gilt (siehe kalibriereCaptures).
         Ein vertauschter Zähler wird so nicht verdeckt: bei ungleichen Gefangenenzahlen schlägt die Prüfung an. */
      const konv = ctx.capturesKonvention;
      if (konv !== 'gefangen-von' && konv !== 'verloren-an') throw new Error('keine Kalibrierung der captures-Konvention');
      const gb = +(await ref.frage('captures black')), gw = +(await ref.frage('captures white'));
      const erwartetB = konv === 'gefangen-von' ? caps[1] : caps[2], erwartetW = konv === 'gefangen-von' ? caps[2] : caps[1];
      res.kontrolle.gefangen = {gnugoBlack: gb, gnugoWhite: gw, engineVonSchwarz: caps[1], engineVonWeiss: caps[2], konvention: konv,
                                unterscheidbar: caps[1] !== caps[2]};
      res.kontrolle.gefangenGleich = gb === erwartetB && gw === erwartetW;
      if (!res.kontrolle.gefangenGleich) res.fehler.push(`Gefangene: Engine ${caps[1]}/${caps[2]} (von Schwarz/von Weiß), GNU Go black ${gb} white ${gw}, Konvention ${konv}`);
    } catch (err) { res.kontrolle.gefangenGleich = false; res.fehler.push('Gefangene nicht prüfbar: ' + err.message.slice(0, 120)); }
    if (res.fehler.length) return res;
    /* Arm 1 „sofort“: Zählung der Stellung. Scheitert sie, ist „sofort“ unbekannt (zählt konservativ, §7). */
    try {
      const z = await zaehlung(E, ref, board, caps);
      res.arm1 = {flaeche: z.flaeche, territory: z.territory};
      res.kontrolle.flaecheTotListe = z.flaecheTotListe; res.kontrolle.arm1Zaehlung = {tote: z.tote, finalScore: z.finalScore, flaecheAusTotListe: z.flaecheAusTotListe};
      res.diagnose.anfang = z.diagnose; if (!z.flaecheTotListe) meldeAbweichung(res, 'anfang', z);
    } catch (err) {
      const art = fehlerArt(err);
      if (art === 'technisch') { res.arm1Fehler = err.message.slice(0, 160); res.arm1Technisch = technischeUrsache(err); }     /* „sofort“ unbekannt: zählt konservativ (§7) */
      else res.fehler.push(art === 'daten' ? 'Zählung Anfang: unzulässige Daten von GNU Go: ' + err.message.slice(0, 160)
                                           : 'Zählung Anfang: unerwarteter Fehler ' + (err.stack || err.message).slice(0, 300));
    }
    if (res.fehler.length) return res;
    /* Arm 0 „weiter“: Passregel AUS, 120 feste Simulationen, Aufgabe aus, kein adaptives Zeitbudget */
    Object.assign(E.PARAMS, ctx.DEFAULT, {adaptiveBudgetEnabled: 0, mctsFixedSims: opt.sims, resignEnabled: 0});
    E.neuePartie(); E.setzeKrisenDauer(null); E.setzeLebensurteil(null);
    Math.random = L.mulberry32(seed);
    let f = ki, kiSteine = 0, kiPaesse = 0, versuch = false, ausfall = null;
    const folge = [];   /* alle Züge der Fortsetzung in Reihenfolge (GTP), für die Wiederholungsprüfung §9 Nr. 7 */
    try {
      while (mc < opt.maxZuege && paesse < 2) {
        let i;
        if (f === ki) {
          if (E.PARAMS.passNachGegnerpass !== 0) throw new Error('PASSREGEL: passNachGegnerpass ist nicht 0');
          const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last);
          if (r.versuch) versuch = true;
          if (r.type === 'resign') { ausfall = 'KI-Aufgabe'; break; }
          i = r.type === 'stone' ? r.y * 19 + r.x : -1;
          const befehl = `play ${farbeDe(f)} ${i < 0 ? 'pass' : L.zuGtp(i)}`;
          await ref.frage(befehl); if (geg) await geg.frage(befehl);
          if (i < 0) kiPaesse++; else kiSteine++;
        } else {
          i = L.vonGtp(await gegner.frage(`genmove ${farbeDe(f)}`));
          if (i === -2) { ausfall = 'Gegner gibt auf'; break; }
          if (geg) await ref.frage(`play ${farbeDe(f)} ${i < 0 ? 'pass' : L.zuGtp(i)}`);
        }
        if (i < 0) { paesse++; ko = null; }
        else {
          if (board[i]) { throw Object.assign(new Error(`Zug ${mc + 1} auf besetztes Feld ${L.zuGtp(i)}`), {logik: true}); }
          const s = setze(E, board, i, f); caps[f] += s.cap; ko = s.ko; last = i; paesse = 0; hist.add(E.computeZobrist(board));
        }
        folge.push(i < 0 ? 'pass' : L.zuGtp(i));
        mc++; f = 3 - f;
      }
      if (!ausfall && paesse < 2) ausfall = `Zuglimit ${opt.maxZuege} erreicht`;
      if (!ausfall) {
        const b = await bretterGleich(E, board, ref, 'GNU Go');
        if (b) { res.fehler.push('Fortsetzung: ' + b); }
        else {
          const z = await zaehlung(E, ref, board, caps);
          res.arm0 = {status: 'regulaer', flaeche: z.flaeche, territory: z.territory, kiSteine, kiPaesse, zuegeNachher: mc - e.zuege.length, folge,
                      passNachGegnerpass: E.PARAMS.passNachGegnerpass, versuch};
          res.diagnose.ende = z.diagnose; if (!z.flaecheTotListe) { res.kontrolle.flaecheTotListe = false; meldeAbweichung(res, 'ende', z); }
        }
      } else res.arm0 = {status: 'ausfall', grund: ausfall, kiSteine, kiPaesse, folge, passNachGegnerpass: E.PARAMS.passNachGegnerpass, versuch};
    } catch (err) {
      if (err.logik || /^PASSREGEL/.test(err.message)) res.fehler.push('Fortsetzung: ' + err.message);
      else if (err.daten) res.fehler.push('Zählung Ende: unzulässige Daten von GNU Go: ' + err.message.slice(0, 160));
      else if (fehlerProgramm(err)) res.arm0 = {status: 'ausfall', grund: err.message.slice(0, 200), technisch: technischeUrsache(err), kiSteine, kiPaesse, folge, passNachGegnerpass: E.PARAMS.passNachGegnerpass, versuch};
      else res.fehler.push('Fortsetzung: unerwarteter Fehler ' + (err.stack || err.message).slice(0, 300));
    }
  } catch (err) {
    if (fehlerProgramm(err)) res.fehler.push('Start oder Einspielen: ' + err.message.slice(0, 200));
    else res.fehler.push('unerwarteter Fehler: ' + (err.stack || err.message).slice(0, 300));
  } finally {
    if (geg) geg.ende();
    if (ref) ref.ende();
    res.dauerMs = Date.now() - t0;
  }
  return res;
}

/* Wiederholungsprüfung §9 Nr. 7 (nur Probe). Plan je Gegnerart (je = 3):
   – mindestens je Einheiten vorhanden: die ersten je Einheiten (nach Schlüssel) laufen ein zweites Mal;
   – weniger als je Einheiten: JEDE vorhandene Einheit läuft insgesamt je-mal (je − 1 Wiederholungen), mit
     identischem Seed. Das prüft die Wiederholbarkeit an den vorhandenen Stellungen; weitere Durchläufe
     schaffen keine zusätzliche Stellung.
   Rückgabe: Map Schlüssel → Zahl der zusätzlichen Durchläufe. */
function wiederholungsPlan(einheiten, je) {
  const nach = {}, plan = new Map();
  for (const e of einheiten) (nach[e.gegner] = nach[e.gegner] || []).push(e.schluessel);
  for (const liste of Object.values(nach)) {
    liste.sort();
    if (liste.length >= je) liste.slice(0, je).forEach(s => plan.set(s, 1));
    else liste.forEach(s => plan.set(s, je - 1));
  }
  return plan;
}

/* Dieselbe Einheit `extra`-mal noch einmal mit demselben Seed. Verglichen werden Zugfolge und Endstand mit dem
   ersten Durchlauf; jedes Ergebnis hängt als Eintrag in `wiederholungen` an der ersten Zeile. */
async function bearbeiteMitWiederholung(ctx, e, extra) {
  const r1 = await bearbeiteEinheit(ctx, e);
  if (!(extra > 0) || r1.fehler.length) return r1;
  const a = r1.arm0, endlich = x => Number.isFinite(x.flaeche) && Number.isFinite(x.territory);
  r1.wiederholungen = [];
  for (let k = 0; k < extra; k++) {
    const rk = await bearbeiteEinheit(ctx, e), b = rk.arm0;
    r1.wiederholungen.push({lauf: k + 2, gegner: e.gegner, seed: r1.seed, status1: a.status, status2: b.status, fehler2: rk.fehler,
      stand1: {flaeche: a.flaeche, territory: a.territory}, stand2: {flaeche: b.flaeche, territory: b.territory},
      gleichFolge: JSON.stringify(a.folge || null) === JSON.stringify(b.folge || null) && a.status === b.status,
      /* ohne endliche Stände gibt es keinen „gleichen Stand“ (undefined === undefined zählt nicht) */
      gleichStand: endlich(a) && endlich(b) && a.flaeche === b.flaeche && a.territory === b.territory,
      laenge1: (a.folge || []).length, laenge2: (b.folge || []).length, diagnose: rk.diagnose, abweichungen: rk.kontrolle.abweichungen || []});
    /* die Zählkontrolle gilt für jede gezählte Stellung, auch in den Wiederholungen */
    if (rk.kontrolle.flaecheTotListe === false) {
      r1.kontrolle.flaecheTotListe = false;
      for (const x of rk.kontrolle.abweichungen || []) (r1.kontrolle.abweichungen = r1.kontrolle.abweichungen || []).push({...x, wo: `wiederholung ${k + 2} ${x.wo}`});
    }
  }
  return r1;
}

/* Logzeile je Einheit. In der Probe KEINE Wirkungszahlen (keine Stände beider Arme): nur Zugzahlen und Status. */
function logZeile(r, n, gesamt, probe) {
  const dauer = `(${((r.dauerMs || 0) / 1000).toFixed(0)} s)`, kopf = `${n}/${gesamt} ${r.schluessel}:`;
  if (r.fehler.length) return `${kopf} FEHLER ${r.fehler[0]} ${dauer}`;
  const a = r.arm0, wh = r.wiederholungen ? `, ${r.wiederholungen.length} Wiederholungslauf/-läufe` : '';
  if (probe) return `${kopf} ${a.status === 'regulaer' ? 'regulär' : 'Ausfall: ' + a.grund}, KI-Steinzüge ${a.kiSteine}, KI-Pässe ${a.kiPaesse}, Züge nach der Stellung ${a.zuegeNachher === undefined ? '–' : a.zuegeNachher}${wh} ${dauer}`;
  return `${kopf} ${a.status === 'regulaer' ? `weiter F ${a.flaeche} / sofort F ${r.arm1.flaeche}` : 'Ausfall: ' + a.grund}${wh} ${dauer}`;
}
/* Zählabweichungen mit Brett, toten Koordinaten und beiden Zählwerten ins Log (nur wo sie auftreten) */
function logAbweichungen(r) {
  const aus = [];
  for (const x of (r.kontrolle && r.kontrolle.abweichungen) || []) {
    aus.push(`ZÄHLABWEICHUNG ${r.schluessel} ${x.wo}: final_score "${x.finalScore}", Fläche aus Tot-Liste ${x.flaecheAusTotListe}, tote Steine ${x.tote}`);
    const d = x.diagnose;
    if (d && d.brett) {
      aus.push(`  gefangen von Schwarz/Weiß: ${d.gefangen[1]}/${d.gefangen[2]}; tote Koordinaten: ${d.tote.join(' ') || '–'}; Territory aus Tot-Liste ${d.territoryAusTotListe}`);
      if (d.vergleich) {
        const u = d.vergleich.unsereZaehlung;
        aus.push(`  Bestandteile (unsere Zählung): Schwarz Steine ${u.steine.schwarz} + Gebiet ${u.gebiet.schwarz}, Weiß Steine ${u.steine.weiss} + Gebiet ${u.gebiet.weiss}, neutral ${u.neutral}, tote Steine S/W ${u.tote.schwarz}/${u.tote.weiss}`);
        aus.push(`  Punktabweichungen GNU Go gegen unseren Besitzer: ${d.vergleich.punktAbweichungen.map(p => `${p.punkt} (GNU Go ${p.gnugo}, unser Besitzer ${p.unser})`).join('; ') || 'keine'}`);
      } else if (d.vergleichFehler) aus.push(`  Vergleich mit GNU Gos Listen nicht möglich: ${d.vergleichFehler}`);
      for (let y = 0; y < 19; y++) aus.push('  ' + d.brett.slice(y * 19, y * 19 + 19));
    }
  }
  return aus;
}

/* GNU-Go-Argumente des Schiedsrichters: EINE Stelle, damit Fortsetzung und Zähldiagnose dieselben Einstellungen nutzen */
const gnugoArgumente = seed => ['--mode', 'gtp', '--level', '1', '--chinese-rules', '--komi', String(KOMI), '--seed', String(seed), '--never-resign'];

/* ── echte Programme ──────────────────────────────────────────────────── */
function echteProgramme(opt) {
  return {
    async startReferee(seed) {
      const g = gtpStarten(opt.gnugo, gnugoArgumente(seed), 'GNU Go');
      await g.frage('boardsize 19'); await g.frage('clear_board'); await g.frage('komi ' + KOMI);
      return g;
    },
    async startGegner(e, seed) {
      if (e.gegner === 'gnugo') return null;
      let f;
      if (e.gegner === 'fuego') {
        f = gtpStarten(opt.fuego, ['--srand', String(seed), '--nobook', '--quiet'], 'Fuego');
        await f.frage('boardsize 19'); await f.frage('clear_board'); await f.frage('komi ' + KOMI);
        await f.frage(`uct_param_player max_games ${(e.gegnerInfo && e.gegnerInfo.spiele) || 1000}`);
        await f.frage('uct_param_player ponder 0'); await f.frage('uct_param_player resign_threshold 0');
        await f.frage('deterministic_mode'); await f.frage('set_random_seed ' + Math.max(1, seed % 2147483647));
      } else {
        const info = e.gegnerInfo || {}, html = path.join(opt.gegnerHtmlVerz, info.html || '');
        const sha = crypto.createHash('sha256').update(fs.readFileSync(html)).digest('hex');
        if (info.sha256 && sha !== info.sha256) throw new Error(`KI-Gegner: Hash von ${info.html} weicht vom Archiv ab`);
        f = gtpStarten(process.execPath, [path.join(__dirname, '..', '..', 'gtp-ki.js'), '--html', html, ...(info.ki ? ['--ki', info.ki] : [])], 'KI-Gegner');
        await f.frage('boardsize 19'); await f.frage('clear_board'); await f.frage('komi ' + KOMI);
        await f.frage('set_random_seed ' + ((seed + 80000) % 2147483647));
      }
      return f;
    }
  };
}

async function main() {
  const a = process.argv.slice(2);
  const opt = {einheiten: null, aus: null, teil: [1, 1], wiederhole: 0, probe: false, sims: 120, maxZuege: 600, seed: 1, html: path.join(__dirname, '..', '..', 'index.html'),
               gnugo: '/usr/games/gnugo', fuego: path.join(__dirname, '..', '..', 'fuego-bin', 'fuego'), gegnerHtmlVerz: path.join(__dirname, '..', '..', 'vergleich')};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) {
      case '--einheiten': opt.einheiten = v; i++; break;
      case '--aus': opt.aus = v; i++; break;
      case '--teil': { const m = /^(\d+)\/(\d+)$/.exec(v || ''); if (!m || +m[1] < 1 || +m[1] > +m[2]) { console.error('--teil erwartet i/m mit 1 ≤ i ≤ m'); process.exit(2); } opt.teil = [+m[1], +m[2]]; i++; break; }
      case '--sims': opt.sims = +v; i++; break;
      case '--maxzuege': opt.maxZuege = +v; i++; break;
      case '--seed': opt.seed = +v; i++; break;
      case '--wiederhole': opt.wiederhole = +v; i++; break;
      case '--probe': opt.probe = true; break;
      case '--html': opt.html = v; i++; break;
      case '--gnugo': opt.gnugo = v; i++; break;
      case '--fuego': opt.fuego = v; i++; break;
      case '--gegner-html-verz': opt.gegnerHtmlVerz = v; i++; break;
      default: console.error('Unbekannte Option ' + a[i]); process.exit(2);
    }
  }
  if (!opt.einheiten || !opt.aus) { console.error('Aufruf: --einheiten datei --aus ergebnis.jsonl [--teil i/m] ...'); process.exit(2); }
  if (!fs.existsSync(opt.gnugo)) { console.error('GNU Go nicht gefunden: ' + opt.gnugo); process.exit(2); }
  const alle = L.leseJsonl(opt.einheiten).sort((x, y) => (x.schluessel < y.schluessel ? -1 : 1));
  const meine = alle.filter((_, k) => k % opt.teil[1] === opt.teil[0] - 1);
  if (meine.some(e => e.gegner === 'fuego') && !fs.existsSync(opt.fuego)) { console.error('Fuego nicht gefunden: ' + opt.fuego); process.exit(2); }
  fs.mkdirSync(path.dirname(path.resolve(opt.aus)), {recursive: true});
  fs.writeFileSync(opt.aus, '', {flag: 'wx'});
  const E = motor(opt.html), DEFAULT = JSON.parse(JSON.stringify(E.PARAMS));
  if (DEFAULT.passNachGegnerpass !== 0) { console.error('Standardwert passNachGegnerpass ist nicht 0: Abbruch'); process.exit(2); }
  const ctx = {E, DEFAULT, opt, ...echteProgramme(opt)};
  const kal = await kalibriereCaptures(ctx.startReferee, opt.seed);
  ctx.capturesKonvention = kal.konvention;
  console.log(`captures-Kalibrierung: black ${kal.black}, white ${kal.white} → Konvention ${kal.konvention}`);
  let n = 0, fehler = 0, ausfaelle = 0;
  const plan = opt.wiederhole > 0 ? wiederholungsPlan(meine, opt.wiederhole) : new Map();
  for (const e of meine) {
    const r = await bearbeiteMitWiederholung(ctx, e, plan.get(e.schluessel) || 0);
    fs.appendFileSync(opt.aus, JSON.stringify(r) + '\n');
    n++; if (r.fehler.length) fehler++; if (r.arm0.status !== 'regulaer') ausfaelle++;
    console.log(logZeile(r, n, meine.length, opt.probe));
    for (const z of logAbweichungen(r)) console.log(z);
  }
  console.log(`Fertig: ${n} Einheiten, ${fehler} mit Pflichtfehler, ${ausfaelle} ohne reguläre Fortsetzung`);
  process.exit(fehler ? 1 : 0);
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
module.exports = {motor, fehlerArt, technischeUrsache, gnugoArgumente, bearbeiteEinheit, bearbeiteMitWiederholung, wiederholungsPlan, logZeile, logAbweichungen, setze, echteProgramme, kalibriereCaptures, KALIBRIER_ZUEGE};
