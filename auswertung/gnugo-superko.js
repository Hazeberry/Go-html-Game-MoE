#!/usr/bin/env node
// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Lehnt GNU Go eine positionelle Wiederholung ab?
   docs/gnugo-superko-vorabfestlegung.md, Aufbau in §3, Gültigkeitsregel in §4.

   Fünf Proben, je ein eigener Prozess, nie genmove — GNU Go sucht hier nicht,
   es beantwortet nur `play`. Die Antwort ist deshalb deterministisch; das ist
   keine Stärkemessung, und §2 des Docs begründet, warum McNemar und
   Clopper-Pearson hier nicht greifen.

   P0  Ko-Aufbau, dann list_stones: steht dieselbe Stellung?
   P1  Selbstmord                   KONTROLLE, muss abgelehnt werden
   P2  unmittelbare Ko-Rücknahme    KONTROLLE, muss abgelehnt werden
   P3  Wiederholung nach zwei Pässen   DIE FRAGE
   P4  wie P3, ohne --chinese-rules     hängt es am Regelsatz?

   Ohne P1 und P2 wäre ein `=` auf P3 nichtssagend: „erlaubt Wiederholungen“
   und „prüft hier gar nichts“ sähen gleich aus. Deshalb sind sie Bedingung,
   nicht Beobachtung, und ein Verstoß macht den Lauf ungültig.

   Exitcode 0 nur bei gültigem Lauf; 1 heißt „kein Urteil“ mit Grund, damit der
   Workflow rot wird. 2 heißt Fehler im Aufruf.

   Aufruf:  node auswertung/gnugo-superko.js [--gnugo pfad] [--aus datei.json]
            [--zeitgrenze ms] */
'use strict';
const fs = require('fs');
const {spawn} = require('child_process');

const a = process.argv.slice(2);
const opt = {gnugo: '/usr/games/gnugo', aus: null, zeitgrenze: 20000};
for (let i = 0; i < a.length; i++) {
  const v = a[i + 1];
  if (a[i] === '--gnugo') { opt.gnugo = v; i++; }
  else if (a[i] === '--aus') { opt.aus = v; i++; }
  else if (a[i] === '--zeitgrenze') {
    if (!/^\d+$/.test(v || '') || +v < 1) { console.error(`--zeitgrenze: ganze Zahl ab 1 erwartet, nicht '${v}'`); process.exit(2); }
    opt.zeitgrenze = +v; i++;
  } else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
}
if (!opt.gnugo) { console.error('--gnugo braucht einen Pfad'); process.exit(2); }

/* ── Die Stellungen aus auswertung/bughunt-20261107/reproduce.cjs ────── */
const KO_AUFBAU = ['play W B2', 'play W A3', 'play W C3', 'play W B4',
                   'play B A2', 'play B B1', 'play B C2', 'play B B3'];
const SOLL_W = ['A3', 'B4', 'C3'];                 /* sortiert */
const SOLL_B = ['A2', 'B1', 'B3', 'C2'];

/* ── GTP: eine Anfrage, eine Antwort (endet mit Leerzeile) ───────────── */
function starte(flags) {
  const p = spawn(opt.gnugo, ['--mode', 'gtp', ...flags], {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = '', warte = [], stderr = '', tot = null;
  p.stderr.on('data', d => { stderr += d.toString(); });
  p.on('exit', (code, sig) => {
    tot = `Prozess beendet (code ${code}, signal ${sig})${stderr.trim() ? ': ' + stderr.trim().slice(-200) : ''}`;
    for (const w of warte.splice(0)) w({fehler: tot});
  });
  p.on('error', e => { tot = `Prozess nicht startbar: ${e.message}`; for (const w of warte.splice(0)) w({fehler: tot}); });
  p.stdout.on('data', d => {
    puffer += d.toString();
    let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) {
      const roh = puffer.slice(0, k); puffer = puffer.slice(k + 2);
      const w = warte.shift(); if (w) w({roh: roh.trim()});
    }
  });
  const frage = befehl => new Promise(ok => {
    if (tot) return ok({fehler: tot});
    const uhr = setTimeout(() => ok({fehler: `Zeitgrenze ${opt.zeitgrenze} ms überschritten`}), opt.zeitgrenze);
    warte.push(r => { clearTimeout(uhr); ok(r); });
    try { p.stdin.write(befehl + '\n'); } catch (e) { clearTimeout(uhr); ok({fehler: 'stdin: ' + e.message}); }
  });
  return {frage, ende: () => { try { p.stdin.write('quit\n'); } catch (e) {} p.kill(); }};
}

/* Eine Probe: Befehle der Reihe nach, jede Antwort wörtlich ins Protokoll. */
async function probe(name, flags, befehle) {
  const g = starte(flags);
  const schritte = [];
  try {
    for (const b of ['boardsize 19', 'clear_board', 'komi 7.5', ...befehle]) {
      const r = await g.frage(b);
      if (r.fehler) { schritte.push({befehl: b, fehler: r.fehler}); break; }
      schritte.push({befehl: b, antwort: r.roh});
    }
  } finally { g.ende(); }
  const letzte = schritte[schritte.length - 1] || {};
  console.log(`\n[${name}] ${flags.join(' ') || '(ohne Regelflags)'}`);
  for (const s of schritte) console.log(`    ${s.befehl.padEnd(22)} -> ${s.fehler ? 'FEHLER ' + s.fehler : s.antwort}`);
  return {name, flags, schritte, abgebrochen: schritte.some(s => s.fehler), letzteAntwort: letzte.antwort || null};
}

const steine = antwort => (antwort || '').replace(/^=\s*/, '').split(/\s+/).filter(Boolean).sort();
const abgelehnt = antwort => typeof antwort === 'string' && antwort.startsWith('?');
const angenommen = antwort => typeof antwort === 'string' && antwort.startsWith('=');

(async () => {
  const CHIN = ['--chinese-rules'];
  const bericht = {stand: new Date().toISOString(), gnugo: opt.gnugo, proben: {}, gruende: [], gueltig: false, urteil: null};

  /* Version ins Protokoll (§4 Nr. 6) */
  const v = starte(CHIN);
  const vr = await v.frage('version'); v.ende();
  bericht.version = vr.fehler ? {fehler: vr.fehler} : {gtp: vr.roh};
  console.log(`GNU Go über GTP: ${bericht.version.gtp || 'FEHLER ' + bericht.version.fehler}`);

  bericht.proben.P0 = await probe('P0 Aufbau', CHIN, [...KO_AUFBAU, 'list_stones W', 'list_stones B']);
  bericht.proben.P1 = await probe('P1 Selbstmord (Kontrolle)', CHIN, ['play W A2', 'play W B1', 'play B A1']);
  bericht.proben.P2 = await probe('P2 Ko-Ruecknahme (Kontrolle)', CHIN, [...KO_AUFBAU, 'play W B2']);
  bericht.proben.P3 = await probe('P3 Wiederholung nach zwei Paessen', CHIN,
    [...KO_AUFBAU, 'play W pass', 'play B pass', 'play W B2', 'list_stones W']);
  bericht.proben.P4 = await probe('P4 wie P3, ohne --chinese-rules', [],
    [...KO_AUFBAU, 'play W pass', 'play B pass', 'play W B2', 'list_stones W']);

  /* ── Gültigkeitsregel §4: zwei Zustände, gültig oder ungültig ──────── */
  const g = bericht.gruende;
  for (const [n, p] of Object.entries(bericht.proben))
    if (p.abgebrochen) g.push(`${n}: Prozess abgestürzt oder Zeitgrenze (§4 Nr. 5)`);

  const p0 = bericht.proben.P0.schritte;
  const w = steine(p0[p0.length - 2] && p0[p0.length - 2].antwort);
  const b = steine(p0[p0.length - 1] && p0[p0.length - 1].antwort);
  bericht.aufbau = {weiss: w, schwarz: b};
  if (w.join(' ') !== SOLL_W.join(' ') || b.join(' ') !== SOLL_B.join(' '))
    g.push(`P0: Stellung stimmt nicht (§4 Nr. 1) — Weiss [${w}] soll [${SOLL_W}], Schwarz [${b}] soll [${SOLL_B}]`);

  const p1 = bericht.proben.P1.letzteAntwort;
  if (!abgelehnt(p1)) g.push(`P1: Selbstmord nicht abgelehnt (§4 Nr. 2) — Antwort '${p1}'`);
  const p2 = bericht.proben.P2.letzteAntwort;
  if (!abgelehnt(p2)) g.push(`P2: Ko-Ruecknahme nicht abgelehnt (§4 Nr. 3) — Antwort '${p2}'`);

  /* §4 Nr. 4: beide Paesse angenommen, und auf das folgende play geantwortet */
  const s3 = bericht.proben.P3.schritte;
  const pass1 = s3.find(s => s.befehl === 'play W pass'), pass2 = s3.find(s => s.befehl === 'play B pass');
  const zug3 = s3.filter(s => s.befehl === 'play W B2').pop();
  if (!pass1 || !angenommen(pass1.antwort)) g.push(`P3: erster Pass nicht angenommen (§4 Nr. 4) — '${pass1 && (pass1.antwort || pass1.fehler)}'`);
  if (!pass2 || !angenommen(pass2.antwort)) g.push(`P3: zweiter Pass nicht angenommen (§4 Nr. 4) — '${pass2 && (pass2.antwort || pass2.fehler)}'`);
  if (!zug3 || typeof zug3.antwort !== 'string') g.push('P3: keine Antwort auf den Wiederholungszug (§4 Nr. 4)');

  bericht.gueltig = g.length === 0;
  if (bericht.gueltig) {
    bericht.urteil = abgelehnt(zug3.antwort) ? 'GNU Go lehnt die positionelle Wiederholung ab'
                                             : 'GNU Go nimmt die positionelle Wiederholung an';
    const p4 = bericht.proben.P4.letzteAntwort;   /* nur berichtet, nicht Teil der Gueltigkeit */
    bericht.ohneRegelflags = bericht.proben.P4.abgebrochen ? 'Probe abgebrochen'
      : abgelehnt(p4) ? 'lehnt ebenfalls ab' : angenommen(p4) ? 'nimmt an' : `unklar ('${p4}')`;
  }

  console.log('\n' + '='.repeat(60));
  if (bericht.gueltig) {
    console.log(`GUELTIG. Urteil: ${bericht.urteil}`);
    console.log(`P3 antwortete: ${zug3.antwort}`);
    console.log(`Ohne --chinese-rules (P4, nur berichtet): ${bericht.ohneRegelflags}`);
  } else {
    console.log('UNGUELTIG — KEIN URTEIL. Gruende:');
    for (const z of g) console.log('  - ' + z);
  }
  if (opt.aus) { fs.writeFileSync(opt.aus, JSON.stringify(bericht, null, 1) + '\n'); console.log(`\nErgebnis in ${opt.aus}`); }
  process.exit(bericht.gueltig ? 0 : 1);
})().catch(e => { console.error('ABBRUCH: ' + (e && e.stack || e)); process.exit(1); });
