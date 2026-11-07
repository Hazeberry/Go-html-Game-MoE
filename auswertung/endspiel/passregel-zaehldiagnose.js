// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zähldiagnose für eine einzelne Stellung (docs/passregel-zaehldiagnose.md): Warum weicht die Fläche aus
   GNU Gos Tot-Liste von `final_score` ab (Probe 1: alte PWA, m1, Partie 206, Index 341)?

   Nur Einspielen und Zählen, KEINE Fortsetzung, keine Engine-Züge, keine Auswertung der Passregel.
   Erfasst wird:
     – die archivierte Zugfolge bis zum Index der Einheit, vollständig, mit SHA-256,
     – dieselben GNU-Go-Einstellungen (F.gnugoArgumente) und derselbe Seed wie in der Fortsetzung (L.fortsetzungsSeed),
     – GNU-Go-Version (`--version`, GTP `name` und `version`, Paketversion, Runner-Image),
     – die genaue GTP-Befehlsfolge und die UNVERÄNDERTEN Antworten (Rohtext, nicht getrimmt),
     – die Listen von `final_status_list` (alive, dead, seki, white_territory, black_territory, dame) und `final_score`,
     – getrennte Zählbestandteile für Schwarz, Weiß und neutrale Punkte aus unserer Zählung, Punkt für Punkt gegen
       GNU Gos Klassen verglichen.
   Der ganze GTP-Ablauf läuft zweimal mit demselben Seed in frischen Prozessen; die Rohantworten müssen identisch sein.

   Gültigkeit: zwei Zustände. Ob die Abweichung reproduziert wird, ist ein ERGEBNIS, kein Gültigkeitskriterium.
   Läuft nur in GitHub Actions, nach Go (CLAUDE.md).

   Aufruf:
     node auswertung/endspiel/passregel-zaehldiagnose.js --datei archiv.jsonl.gz --gruppe NAME --nr N --index I
        --aus verzeichnis [--seed-basis 1] [--gnugo /usr/games/gnugo] [--html index.html] [--paket-version TEXT] */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const {spawn, spawnSync} = require('child_process');
const L = require('./passregel-lib.js');
const S = require('./passregel-stellungen.js');
const F = require('./passregel-fortsetzung.js');

const KOMI = 7.5;
const ABFRAGEN = ['list_stones black', 'list_stones white', 'captures black', 'captures white', 'final_score',
  'final_status_list alive', 'final_status_list dead', 'final_status_list seki', 'final_status_list white_territory',
  'final_status_list black_territory', 'final_status_list dame', 'showboard'];
const KOPF = ['protocol_version', 'name', 'version', 'boardsize 19', 'clear_board', 'komi ' + KOMI];

/* ── GTP mit Rohantworten: nichts wird getrimmt oder ersetzt ──────────── */
function gtpRoh(programm, argumente) {
  const p = spawn(programm, argumente, {stdio: ['pipe', 'pipe', 'pipe']});
  let puffer = '', warte = [], stderr = '', ende = null;
  p.stdin.on('error', () => {});   /* Schreiben an einen beendeten Prozess (EPIPE) ist kein eigener Fehler */
  p.stderr.on('data', d => { stderr += d.toString(); });
  p.on('close', (code, sig) => { ende = {code, sig}; for (const w of warte.splice(0)) w({beendet: true}); });
  p.stdout.on('data', d => {
    puffer += d.toString(); let k;
    while ((k = puffer.indexOf('\n\n')) >= 0) { const roh = puffer.slice(0, k); puffer = puffer.slice(k + 2); const w = warte.shift(); if (w) w({roh}); }
  });
  /* „beendet“ (Prozess weg) und eine Fehlerantwort „?“ (Befehl abgelehnt) sind getrennte Zustände, kein Text, der erraten wird */
  const beendet = befehl => ({befehl, roh: `? Prozess beendet (code ${ende.code}, signal ${ende.sig}) ${stderr.slice(-300)}`.trim(), ok: false, beendet: true});
  const frage = befehl => new Promise(ok => {
    if (ende) return ok(beendet(befehl));
    warte.push(a => ok(a.beendet ? beendet(befehl) : {befehl, roh: a.roh, ok: /^=/.test(a.roh), beendet: false}));
    p.stdin.write(befehl + '\n');
  });
  return {frage, stderr: () => stderr, ende: () => { try { p.stdin.write('quit\n'); } catch (e) {} p.kill(); }};
}

/* Ein vollständiger GTP-Ablauf in einem frischen Prozess; Rückgabe: Protokoll aus {befehl, antwort} (Rohtext) */
async function protokollLauf(gnugo, seed, zuege, farben) {
  const prog = gtpRoh(gnugo, F.gnugoArgumente(seed)), log = [], fehler = [];
  /* JEDER verlangte Befehl muss mit „=“ beantwortet werden (Kopf, Züge, Abfragen); bei der ersten Fehlerantwort
     endet der Lauf als Fehler, nichts wird als Nutzdaten weiterverarbeitet. */
  const q = async b => {
    const a = await prog.frage(b); log.push({befehl: b, antwort: a.roh});
    if (!a.ok) fehler.push(a.beendet ? `Befehl „${b}“: Prozess beendet: ${a.roh}` : `Befehl „${b}“ abgelehnt: ${a.roh}`);
    return a;
  };
  try {
    for (const b of KOPF) { await q(b); if (fehler.length) break; }
    if (!fehler.length) for (let j = 0; j < zuege.length; j++) { await q(`play ${farben[j]} ${zuege[j]}`); if (fehler.length) break; }
    if (!fehler.length) for (const b of ABFRAGEN) { await q(b); if (fehler.length) break; }
  } finally { prog.ende(); }
  return {log, fehler, stderr: prog.stderr()};
}

/* ── Auswertung des Protokolls (rein, ohne GNU Go) ────────────────────── */
/* nur zur Anzeige im Bericht, nie für Nutzdaten: auch eine fehlende oder fehlerhafte Antwort bleibt darstellbar */
const zeige = roh => (roh === null || roh === undefined ? '–' : String(roh).replace(/^=\s*/, ''));
const antwortVon = (log, befehl) => { const x = log.find(e => e.befehl === befehl); return x ? x.antwort : null; };
/* Nutzdaten nur aus einer ERFOLGSantwort („=“): eine Fehlerantwort („?“) wirft, sie wird nie als Nutzdaten gelesen.
   Entfernt werden nur „=“ und die Leerzeichen dahinter; Befehle werden ohne Kennung gesendet, Ziffern gehören zur Antwort. */
const ohneKopf = roh => {
  if (!/^=/.test(String(roh))) throw new Error('Fehlerantwort statt Nutzdaten: ' + JSON.stringify(String(roh).slice(0, 80)));
  return String(roh).replace(/^=\s*/, '');
};
/* Punktliste: jedes Wort muss eine gültige Brettkoordinate sein (kein „pass“, keine Koordinate außerhalb des Bretts) */
const punkte = roh => {
  const menge = new Set();
  for (const w of ohneKopf(roh).split(/\s+/).filter(Boolean)) {
    if (!/^[A-HJ-T]([1-9]|1[0-9])$/i.test(w)) throw new Error('ungültige Koordinate in einer Punktliste: ' + JSON.stringify(w));
    menge.add(L.vonGtp(w));
  }
  return menge;
};
/* Zahl: nicht negative ganze Zahl, nichts anderes (eine leere Antwort ist keine 0) */
const zahlAntwort = roh => { const s = ohneKopf(roh).trim(); if (!/^\d+$/.test(s)) throw new Error('keine ganze Zahl: ' + JSON.stringify(s)); return +s; };

function analysiere(E, zuege, farben, log) {
  const n = E.BOARD_SIZE, board = new Uint8Array(n), caps = {1: 0, 2: 0};
  for (let j = 0; j < zuege.length; j++) {
    if (zuege[j] === 'pass') continue;
    const i = L.vonGtp(zuege[j]), f = farben[j] === 'B' ? 1 : 2;
    board[i] = f; caps[f] += E.removeDeadGroups(board, 3 - f, i);
  }
  const rohFinal = antwortVon(log, 'final_score'), stand = L.standAusFinalScore(ohneKopf(rohFinal));
  if (!Number.isFinite(stand)) throw new Error('final_score ist nicht endlich: ' + JSON.stringify(rohFinal));
  const m = {alive: punkte(antwortVon(log, 'final_status_list alive')), dead: punkte(antwortVon(log, 'final_status_list dead')),
             seki: punkte(antwortVon(log, 'final_status_list seki')), wt: punkte(antwortVon(log, 'final_status_list white_territory')),
             bt: punkte(antwortVon(log, 'final_status_list black_territory')), dame: punkte(antwortVon(log, 'final_status_list dame'))};
  /* Brett und Gefangene gegen GNU Go */
  const bretter = [];
  for (const [farbe, f] of [['black', 1], ['white', 2]]) {
    const bei = punkte(antwortVon(log, `list_stones ${farbe}`));
    for (let k = 0; k < n; k++) if ((board[k] === f) !== bei.has(k)) bretter.push(`${farbe} ${L.zuGtp(k)}`);
  }
  const gb = zahlAntwort(antwortVon(log, 'captures black')), gw = zahlAntwort(antwortVon(log, 'captures white'));
  const vgl = L.vergleicheZaehlung(board, caps, m, KOMI, E.NEIGHBORS, stand);
  return {brett: Array.from(board, c => '.XO'[c]).join(''), gefangen: {schwarz: caps[1], weiss: caps[2]}, gnugoGefangen: {black: gb, white: gw},
          bretterAbweichungen: bretter, finalScore: {roh: rohFinal, stand},
          listen: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, [...v].sort((a, b) => a - b).map(L.zuGtp)])),
          listenGroesse: Object.fromEntries(Object.entries(m).map(([k, v]) => [k, v.size])),
          ...vgl};
}

/* ── Einheit prüfen: dieselbe Auslösung wie in Stufe A (Kontrolle gegen eine falsche Stellung) ── */
function einheitKontrolle(E, r, index) {
  const stat = {stellungenGeprueft: 0, voraussetzungVerletzt: [], geprueft: {flaeche: 0, territory: 0},
    gruende: {flaeche: Object.fromEntries(S.GRUENDE.map(g => [g, 0])), territory: Object.fromEntries(S.GRUENDE.map(g => [g, 0]))}};
  const alt = E.PARAMS.passNachGegnerpass; E.PARAMS.passNachGegnerpass = 1;
  let p; try { p = S.pruefePartie(E, r, stat); } finally { E.PARAMS.passNachGegnerpass = alt; }
  return {ausloesung: {flaeche: p.erste.flaeche ? p.erste.flaeche.index : null, territory: p.erste.territory ? p.erste.territory.index : null},
          ok: [p.erste.flaeche, p.erste.territory].some(x => x && x.index === index), kiFarbe: p.ki, zuege: p.zuege};
}

async function main() {
  const a = process.argv.slice(2), opt = {datei: null, gruppe: null, nr: null, index: null, aus: null, seedBasis: 1, gnugo: '/usr/games/gnugo',
    html: path.join(__dirname, '..', '..', 'index.html'), paket: ''};
  for (let i = 0; i < a.length; i++) {
    const v = a[i + 1];
    switch (a[i]) {
      case '--datei': opt.datei = v; i++; break; case '--gruppe': opt.gruppe = v; i++; break;
      case '--nr': opt.nr = +v; i++; break; case '--index': opt.index = +v; i++; break;
      case '--aus': opt.aus = v; i++; break; case '--seed-basis': opt.seedBasis = +v; i++; break;
      case '--gnugo': opt.gnugo = v; i++; break; case '--html': opt.html = v; i++; break;
      case '--paket-version': opt.paket = v; i++; break;
      default: console.error('Unbekannte Option ' + a[i]); process.exit(2);
    }
  }
  if (!opt.datei || !opt.gruppe || !Number.isInteger(opt.nr) || !Number.isInteger(opt.index) || !opt.aus) {
    console.error('Aufruf: --datei f --gruppe g --nr N --index I --aus verz [--seed-basis 1] [--gnugo pfad] [--paket-version t]'); process.exit(2);
  }
  if (!fs.existsSync(opt.gnugo)) { console.error('GNU Go nicht gefunden: ' + opt.gnugo); process.exit(2); }
  fs.mkdirSync(opt.aus, {recursive: true});
  const gruende = [], E = S.motor(opt.html);
  const rec = L.leseJsonl(opt.datei).find(r => r.nr === opt.nr);
  if (!rec) { console.error(`Partie ${opt.nr} nicht in ${opt.datei}`); process.exit(2); }
  if (rec.abgebrochen || !Array.isArray(rec.zuege) || !rec.wirFarbe) gruende.push('Datensatz unbrauchbar (abgebrochen oder ohne Züge)');
  if (rec.vorgabe > 0 || rec.komi !== KOMI) gruende.push('Vorgabe oder Komi ≠ 7,5');
  if (!(rec.zuege && rec.zuege.length > opt.index)) { console.error('Index jenseits der Zugfolge'); process.exit(2); }
  const ki = rec.wirFarbe === 'S' ? 1 : 2, opp = 3 - ki, erste = rec.beginnt === 'S' ? 'B' : 'W';
  const zuege = rec.zuege.slice(0, opt.index + 1), farben = zuege.map((_, j) => (j % 2 === 0 ? erste : erste === 'B' ? 'W' : 'B'));
  /* Farben der Einheit (Fortsetzungswerkzeug: Zug j hat die Gegnerfarbe, wenn (index − j) gerade) gegen die Aufzeichnung */
  const farbenEinheit = zuege.map((_, j) => ((opt.index - j) % 2 === 0 ? opp : ki) === 1 ? 'B' : 'W');
  if (farben.join('') !== farbenEinheit.join('')) gruende.push('Farben der Aufzeichnung und der Einheit stimmen nicht überein');
  const zz = zuege.map((m, j) => ({farbe: farben[j] === 'B' ? 1 : 2, punkt: m === 'pass' ? -1 : L.vonGtp(m)}));
  let paesse = 0; for (const z of zz) paesse = z.punkt < 0 ? paesse + 1 : 0;
  const vz = L.voraussetzung(zz, opt.index, ki, paesse); if (!vz.ok) gruende.push('Voraussetzung: ' + vz.fehler.join('; '));
  const kontrolle = einheitKontrolle(E, rec, opt.index);
  if (!kontrolle.ok) gruende.push(`Einheit: die Auslösung der Stufe-A-Prüfung liegt bei Fläche ${kontrolle.ausloesung.flaeche}, Territory ${kontrolle.ausloesung.territory}, nicht bei ${opt.index}`);
  const seed = L.fortsetzungsSeed(opt.seedBasis, opt.gruppe, path.basename(opt.datei), opt.nr, opt.index);
  const sha = x => crypto.createHash('sha256').update(x).digest('hex');
  /* GNU-Go-Version und Umgebung */
  const v = spawnSync(opt.gnugo, ['--version'], {encoding: 'utf8'});
  const umgebung = {gnugoVersionAusgabe: (v.stdout || v.stderr || '').trim(), paketVersion: opt.paket || null, node: process.version,
    imageVersion: process.env.ImageVersion || null, imageOS: process.env.ImageOS || null, runnerOS: process.env.RUNNER_OS || null};
  /* captures-Konvention */
  let kal = null;
  try { kal = await F.kalibriereCaptures(F.echteProgramme({gnugo: opt.gnugo}).startReferee, seed); } catch (e) { gruende.push('captures-Kalibrierung: ' + e.message.slice(0, 160)); }
  /* zwei vollständige Läufe, derselbe Seed, frische Prozesse */
  const laeufe = [await protokollLauf(opt.gnugo, seed, zuege, farben), await protokollLauf(opt.gnugo, seed, zuege, farben)];
  for (const [k, l] of laeufe.entries()) for (const f of l.fehler) gruende.push(`Lauf ${k + 1}: ${f}`);
  const identisch = laeufe[0].log.length === laeufe[1].log.length && laeufe[0].log.every((e, k) => e.befehl === laeufe[1].log[k].befehl && e.antwort === laeufe[1].log[k].antwort);
  const unterschiede = identisch ? [] : laeufe[0].log.map((e, k) => (laeufe[1].log[k] && e.antwort === laeufe[1].log[k].antwort ? null : {nr: k, befehl: e.befehl, lauf1: e.antwort, lauf2: laeufe[1].log[k] && laeufe[1].log[k].antwort})).filter(Boolean).slice(0, 20);
  if (!identisch) gruende.push('Wiederholbarkeit: die Rohantworten der beiden Läufe mit demselben Seed sind nicht identisch');
  let analyse = null;
  if (!laeufe[0].fehler.length) {
    try { analyse = analysiere(E, zuege, farben, laeufe[0].log); } catch (e) { gruende.push('Auswertung des Protokolls: ' + e.message.slice(0, 200)); }
  }
  if (analyse) {
    if (analyse.bretterAbweichungen.length) gruende.push(`Brett der Engine weicht von GNU Go ab (${analyse.bretterAbweichungen.slice(0, 5).join(', ')})`);
    const konv = kal && kal.konvention, ge = konv === 'verloren-an' ? {b: analyse.gefangen.weiss, w: analyse.gefangen.schwarz} : {b: analyse.gefangen.schwarz, w: analyse.gefangen.weiss};
    if (konv && (analyse.gnugoGefangen.black !== ge.b || analyse.gnugoGefangen.white !== ge.w)) gruende.push(`Gefangene weichen ab (Engine ${analyse.gefangen.schwarz}/${analyse.gefangen.weiss}, GNU Go ${analyse.gnugoGefangen.black}/${analyse.gnugoGefangen.white}, Konvention ${konv})`);
  }
  const gueltig = gruende.length === 0 && !!analyse;
  const ergebnis = {
    version: 1, gueltig, gruendeUngueltig: gruende, ergebnis: analyse ? (analyse.abweichungFlaecheAusTotListe.reproduziert ? 'Abweichung reproduziert' : 'Abweichung NICHT reproduziert') : 'kein Urteil',
    einheit: {gruppe: opt.gruppe, datei: path.basename(opt.datei), nr: opt.nr, index: opt.index, schluessel: `${opt.gruppe}|${path.basename(opt.datei)}|${opt.nr}|${opt.index}`,
      kiFarbe: ki === 1 ? 'S' : 'W', gegner: rec.gegner || null, hinweisZugNummer: `Index ${opt.index} (0-basiert) ist der ${opt.index + 1}. Zug der Aufzeichnung; die Zugfolge enthält Index 0 bis ${opt.index}`,
      zuegeInFolge: zuege.length, archivZuegeGesamt: rec.zuege.length, folgeSha256: sha(zuege.join(',')), archivFolgeSha256: sha(rec.zuege.join(',')), archivEndstand: rec.endstand, zuege, farben},
    ausloesungKontrolle: {ausloesung: kontrolle.ausloesung, ok: kontrolle.ok},
    seed: {basis: opt.seedBasis, abgeleitet: seed, ableitung: `passregel-vergleich-v1|${opt.seedBasis}|${opt.gruppe}|${path.basename(opt.datei)}|${opt.nr}|${opt.index}`},
    gnugo: {pfad: opt.gnugo, argumente: F.gnugoArgumente(seed), ...umgebung}, kalibrierungCaptures: kal,
    protokollLauf1: laeufe[0].log, protokollLauf2IdentischMitLauf1: identisch, unterschiedeZwischenLaeufen: unterschiede, stderrLauf1: laeufe[0].stderr.slice(-500), analyse};
  fs.writeFileSync(path.join(opt.aus, 'zaehldiagnose.json'), JSON.stringify(ergebnis, null, 1));
  fs.writeFileSync(path.join(opt.aus, 'gtp-protokoll.txt'), laeufe[0].log.map((e, k) => `#${k} >> ${e.befehl}\n${e.antwort}\n`).join('\n'));
  const md = [];
  md.push('# Zähldiagnose', '', `Einheit ${ergebnis.einheit.schluessel}; KI ${ergebnis.einheit.kiFarbe}; ${ergebnis.einheit.hinweisZugNummer}.`,
    `Folge: ${zuege.length} Züge, SHA-256 ${ergebnis.einheit.folgeSha256}; Archiv gesamt ${rec.zuege.length} Züge.`,
    `Seed ${seed} (aus ${ergebnis.seed.ableitung}); GNU-Go-Argumente: ${ergebnis.gnugo.argumente.join(' ')}`,
    `GNU Go: ${umgebung.gnugoVersionAusgabe.split('\n')[0]}; Paket ${umgebung.paketVersion || '–'}; Image ${umgebung.imageVersion || '–'}; GTP name/version: ${zeige(antwortVon(laeufe[0].log, 'name'))} / ${zeige(antwortVon(laeufe[0].log, 'version'))}`,
    `captures-Kalibrierung: ${kal ? kal.konvention : 'fehlgeschlagen'}. Auslösung (Stufe-A-Prüfung): Fläche ${kontrolle.ausloesung.flaeche}, Territory ${kontrolle.ausloesung.territory}.`, '',
    gueltig ? '**Diagnose gültig.**' : `**Diagnose UNGÜLTIG: kein Urteil.** ${gruende.join(' | ')}`, `Zwei Läufe mit demselben Seed, Rohantworten identisch: ${identisch ? 'ja' : 'NEIN'} (${laeufe[0].log.length} Befehle).`);
  if (analyse) {
    const u = analyse.unsereZaehlung, g = analyse.abweichungFlaecheAusTotListe;
    md.push('', '## Ergebnis (Fläche)', '', `- final_score roh: \`${analyse.finalScore.roh}\` (Stand Schwarz − Weiß − Komi ${analyse.finalScore.stand})`,
      `- Fläche aus der Tot-Liste (unsere Zählung): ${u.flaeche.stand}; Unterschied ${g.unterschied}; **${g.reproduziert ? 'Abweichung reproduziert' : 'Abweichung nicht reproduziert'}**`,
      `- Zählbestandteile (unsere Zählung): Schwarz Steine ${u.steine.schwarz} + Gebiet ${u.gebiet.schwarz} = ${u.flaeche.schwarz}; Weiß Steine ${u.steine.weiss} + Gebiet ${u.gebiet.weiss} = ${u.flaeche.weiss}; neutrale Punkte ${u.neutral}; tote Steine Schwarz ${u.tote.schwarz}, Weiß ${u.tote.weiss}`,
      `- Gefangene bisher Schwarz/Weiß ${analyse.gefangen.schwarz}/${analyse.gefangen.weiss} (GNU Go black/white ${analyse.gnugoGefangen.black}/${analyse.gnugoGefangen.white}); Territory aus Tot-Liste ${u.territory.stand}`,
      `- GNU Gos Listen (Anzahl Punkte): ${Object.entries(analyse.listenGroesse).map(([k, x]) => `${k} ${x}`).join(', ')}`,
      `- Nachbildung aus GNU Gos Listen: Variante 1 (lebende Steine + Gebiet) Stand ${analyse.gnugoAusListen.variante1_lebendePlusGebiet.stand} (${analyse.gnugoAusListen.v1GleichFinalScore ? 'gleich' : 'ungleich'} final_score); Variante 2 (mit Seki-Steinen) Stand ${analyse.gnugoAusListen.variante2_mitSeki.stand} (${analyse.gnugoAusListen.v2GleichFinalScore ? 'gleich' : 'ungleich'}); Variante 3 (zusätzlich Punkte toter Steine dem Gegner) Stand ${analyse.gnugoAusListen.variante3_mitPunktenToterSteine.stand} (${analyse.gnugoAusListen.v3GleichFinalScore ? 'gleich' : 'ungleich'}) – Hinweise, keine Annahme über GNU Gos Regeln`,
      `- Neutrale Regionen (unsere Zählung): ${u.neutraleRegionen.length ? u.neutraleRegionen.map(r => `${r.groesse} Punkte, Rand ${r.rand}: ${r.punkte.join(' ')}`).join(' | ') : 'keine'}`,
      `- Tote Koordinaten (GNU Go): ${analyse.listen.dead.join(' ') || '–'}`, `- Seki: ${analyse.listen.seki.join(' ') || '–'}; Dame: ${analyse.listen.dame.join(' ') || '–'}`,
      `- Punkte, an denen GNU Gos Gebiets- oder Dame-Klasse von unserem Besitzer abweicht (und Seki/unklassifiziert): ${analyse.punktAbweichungen.length}`);
    for (const x of analyse.punktAbweichungen.slice(0, 60)) md.push(`    - ${x.punkt}: GNU Go ${x.gnugo}, unser Besitzer ${x.unser}${x.aufTotemStein ? ' (auf totem Stein)' : ''}${x.hinweis ? ' – ' + x.hinweis : ''}`);
    md.push('', '### Kreuztabelle GNU-Go-Klasse → unser Besitzer (Anzahl Punkte)', '', ...Object.entries(analyse.kreuztabelle).sort().map(([k, x]) => `- ${k}: ${x}`));
    md.push('', '### Brett', '', ...Array.from({length: 19}, (_, y) => '    ' + analyse.brett.slice(y * 19, y * 19 + 19)));
  }
  fs.writeFileSync(path.join(opt.aus, 'zaehldiagnose.md'), md.join('\n') + '\n');
  console.log(md.join('\n'));
  process.exit(gueltig ? 0 : 1);
}

if (require.main === module) main().catch(e => { console.error(e.stack || e.message); process.exit(1); });
module.exports = {gtpRoh, protokollLauf, analysiere, einheitKontrolle, ohneKopf, punkte, zahlAntwort, KOPF, ABFRAGEN};
