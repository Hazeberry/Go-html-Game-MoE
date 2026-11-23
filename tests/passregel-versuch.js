// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Versuchsregel „Pass nach Gegnerpass“ (docs/passregel-versuch.md):
     1. Schalter AUS (Standard): keine Prüfung, kein Eintrag `versuch`, die Regel
        ändert nichts.
     2. Schalter AN: passt nur, wenn der Gegner gerade gepasst hat UND die
        Stellung ausgespielt ist (gemischter Anteil), geklärt (Spanne der beiden
        Stände) und der Vorsprung auch im ungünstigeren Stand die Marge erreicht.
        Jede Bedingung einzeln: Vorsprung, Spanne, offene Stellung, Gegner hat
        nicht gepasst, falsche Seite.
     3. Die eingestellte Wertung zählt (Area gegen Territory), mit Gefangenen.
     4. Nur auf Stufe Schwer; auf Leicht/Mittel keine Wirkung.
     5. Verdrahtung: Hauptthread, Worker-Nachricht und Rückfall reichen
        gegnerPasste, Wertung und Komi weiter.
     6. Die Node-Wege (T-PW…, docs/passregel-wege-vorabfestlegung.md):
        gnugo-duell.js versorgt extra, vier andere Werkzeuge brechen ab statt
        die Regel still ausfallen zu lassen, und mit Schalter 0 bleibt alles
        bitgleich.

   Aufruf:  node tests/passregel-versuch.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const {spawnSync, execFileSync} = require('child_process');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const KI = ladeKI({htmlPfad: process.argv[2] || undefined, mitNetz: false});
const {BOARD_SIZE, removeDeadGroups, PARAMS, getAIMove} = KI;
const N = BOARD_SIZE;
const wurzel = path.join(__dirname, '..');
const html = fs.readFileSync(process.argv[2] || path.join(wurzel, 'index.html'), 'utf8');

function sgf(pfad, bis = Infinity) {
  const txt = fs.readFileSync(pfad, 'utf8'), re = /;([BW])\[([a-s]{0,2})\]/g, b = new Uint8Array(N), caps = {1: 0, 2: 0}; let m, k = 0;
  while ((m = re.exec(txt)) && k++ < bis) {
    if (!m[2]) continue;
    const f = m[1] === 'B' ? 1 : 2, i = (m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97);
    b[i] = f; caps[f] += removeDeadGroups(b, 3 - f, i);
  }
  return {b, caps};
}
const st = f => sgf(path.join(wurzel, 'tests', 'stellungen', f));
const mitSchalter = (an, f) => { const alt = PARAMS.passNachGegnerpass; PARAMS.passNachGegnerpass = an; try { return f(); } finally { PARAMS.passNachGegnerpass = alt; } };
const extra = (o = {}) => ({gegnerPasste: true, wertung: 'area', komi: 7.5, ...o});
const pruefung = (s, farbe, ex) => KI.passNachGegnerpassPruefung ? KI.passNachGegnerpassPruefung(s.b, farbe, s.caps, ex) : (() => { throw new Error('passNachGegnerpassPruefung fehlt'); })();

test('Schalter aus (Standard): keine Prüfung, kein Eintrag, Standardwerte', () => {
  pruefeGleich(PARAMS.passNachGegnerpass, 0, 'Standard ist AUS');
  pruefeGleich(PARAMS.passMarge, 20, 'Marge 20');
  pruefeGleich(PARAMS.passSpanne, 2, 'Spanne 2');
  pruefeGleich(PARAMS.passGemischt, 0.25, 'gemischter Anteil 0,25');
  const s = st('hand-427.sgf');
  pruefeGleich(pruefung(s, 1, extra()), null, 'keine Prüfung bei Schalter aus');
});

test('Schalter an: ausgespielte, geklärte Stellung mit großem Vorsprung → Pass (Partie 427, Schwarz führt)', () => {
  mitSchalter(1, () => {
    const s = st('hand-427.sgf'), p = pruefung(s, 1, extra());
    pruefe(p && p.pass, `passt (${p && p.grund})`);
    pruefe(p.mit >= 20 && p.nur >= 20, `Vorsprung ${p.mit}/${p.nur}`);
    const r = getAIMove(new Uint8Array(s.b), 1, [], s.caps, 427, 'hard', 1, null, null, extra());
    pruefeGleich(r.type, 'pass', 'getAIMove liefert Pass');
    pruefe(/Versuchsregel/.test(r.info), `Info nennt die Versuchsregel: ${r.info}`);
    pruefe(r.versuch && r.versuch.pass === true, 'Eintrag versuch');
  });
});

test('Jede Bedingung einzeln: Marge, Spanne, offene Stellung, kein Gegnerpass, falsche Seite, andere Stufe', () => {
  mitSchalter(1, () => {
    const s = st('hand-427.sgf');
    pruefeGleich(pruefung(s, 2, extra()).grund, 'Vorsprung zu klein', 'Weiß liegt zurück: kein Pass');
    pruefe(!pruefung(s, 2, extra()).pass, 'Weiß passt nicht');
    const alt = PARAMS.passMarge; PARAMS.passMarge = 200;
    pruefeGleich(pruefung(s, 1, extra()).grund, 'Vorsprung zu klein', 'Marge 200 nicht erreicht');
    PARAMS.passMarge = alt;
    pruefeGleich(pruefung(s, 1, extra({gegnerPasste: false})), null, 'Gegner hat nicht gepasst: Regel gilt nicht');
    pruefeGleich(pruefung(s, 1, null), null, 'ohne extra: Regel gilt nicht');
    /* Partie vom 12.10.: Weiß führt, aber acht Steine nur geschätzt tot → Spanne 20 */
    const z = st('zaehlung-358.sgf'), pz = pruefung(z, 2, extra());
    pruefeGleich(pz.grund, 'ungeklärte Gruppen (Spanne)', `Spanne ${pz.spanne}`);
    pruefe(pz.mit >= 100 && !pz.pass, 'große Marge, trotzdem kein Pass');
    /* offene Stellung */
    const o = sgf(path.join(wurzel, 'tests', 'stellungen', 'laufkampf-211.sgf'), 60);
    pruefeGleich(pruefung(o, 1, extra()).grund, 'nicht ausgespielt', 'nach 60 Zügen');
    /* Stufe Mittel: keine Wirkung, kein Eintrag */
    const r = getAIMove(new Uint8Array(s.b), 1, [], s.caps, 427, 'medium', 1, null, null, extra());
    pruefe(r.versuch === undefined, 'Stufe Mittel ohne Eintrag');
  });
});

test('Wertung zählt: Area gegen Territory (Partie vom 31.10.), mit Gefangenen', () => {
  mitSchalter(1, () => {
    const pfad = path.join(wurzel, 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'mensch-494zuege-territory.sgf');
    /* Bekannte Identität: haben beide Seiten gleich viele Züge gespielt (hier Zug 354, keine Pässe),
       sind Area- und Territory-Stand gleich. Danach passt Schwarz, Weiß spielt weiter: sie laufen auseinander. */
    const frueh = sgf(pfad, 354);
    const af = pruefung(frueh, 2, extra({wertung: 'area'})), tf = pruefung(frueh, 2, extra({wertung: 'territory'}));
    pruefeGleich(tf.mit, 186.5, 'Territory: Weiß +186,5 wie die Nachrechnung');
    pruefeGleich(af.mit, tf.mit, 'Zug 354: gleich viele Züge, Area = Territory');
    const ende = sgf(pfad), ae = pruefung(ende, 2, extra({wertung: 'area'})), te = pruefung(ende, 2, extra({wertung: 'territory'}));
    pruefeGleich(te.wertung, 'territory', 'Wertung Territory gemeldet');
    pruefeGleich(ae.wertung, 'flaeche', 'Wertung Area gemeldet');
    pruefeGleich(te.mit, 200.5, 'Ende, Territory: Weiß +200,5 wie die App');
    pruefe(ae.mit !== te.mit, `Ende: Area ${ae.mit} gegen Territory ${te.mit}`);
  });
});

test('Verdrahtung: Hauptthread, Worker-Nachricht und Rückfall reichen gegnerPasste, Wertung und Komi weiter', () => {
  pruefe(/function passExtra\(\)\s*\{\s*return \{gegnerPasste: state\.consecutivePasses >= 1, wertung: state\.scoringMode, komi: KOMI\};/.test(html), 'passExtra');
  /* 4 → 6 durch BR-1 (docs/passregel-wege-nachtrag-vorabfestlegung.md §3):
     Die beiden Reproduktions-Schnappschuesse tragen jetzt ebenfalls
     extra: passExtra(). Die Zahl bleibt eine Zahl und keine Mindestgrenze,
     damit ein versehentlich weggefallener Aufruf weiter auffaellt. */
  pruefeGleich((html.match(/passExtra\(\)/g) || []).length, 6,
    'Definition + Worker-Anfrage + zwei Aufrufe (Rückfall, Mittel/Leicht) + zwei Schnappschuesse (BR-1)');
  pruefe(/d\.extra \?\? null/.test(html), 'Worker reicht extra an getAIMove weiter');
  pruefe(/extra:\s+passExtra\(\)/.test(html), 'Anfrage an den Worker enthält extra');
});

/* ══ Die Node-Wege: T-PW1 bis T-PW5 ══════════════════════════════
   docs/passregel-wege-vorabfestlegung.md. Von 20 Node-Aufrufstellen kann der
   Schalter nur an sechs anliegen; gnugo-duell.js bekommt extra, vier andere
   einen Waechter, die uebrigen bleiben unberuehrt.

   Was hier AUSGEFUEHRT wird und was am Quelltext geprueft ist, steht je Test
   dabei. Die drei Auswertungsskripte brauchen Archivdaten und brechen vor dem
   Waechter ab (Exit 2, 2 und 1 ohne Argumente) -- ihr Waechter ist deshalb am
   Quelltext geprueft, der von ab-harness.js ausgefuehrt. */
const wurzelDuell = fs.readFileSync(path.join(wurzel, 'gnugo-duell.js'), 'utf8');

test('T-PW1: gnugo-duell.js gibt extra mit gegnerPasste, Wertung und Komi weiter (Quelltext)', () => {
  /* Dieselbe Pruefebene wie die Verdrahtungspruefung oben: der Aufruf ist eine
     Zeile, und ein Lauf gegen GNU Go ist hier nicht moeglich. */
  pruefe(/gegnerPasste: paesse >= 1/.test(wurzelDuell), 'gegnerPasste aus paesse');
  pruefe(/wertung: 'flaeche'/.test(wurzelDuell), "Wertung 'flaeche'");
  pruefe(/komi: KOMI/.test(wurzelDuell), 'Komi aus KOMI');
  pruefe(/\{\.\.\.extra, gegnerPasste/.test(wurzelDuell), 'extra wird ergaenzt, nicht ersetzt');
  /* extra selbst darf nicht ueberschrieben werden, sonst greift der
     if-(extra)-Zweig des Kandidaten-Orakels auch ohne Orakel. */
  pruefe(!/extra = \{\.\.\.extra/.test(wurzelDuell), 'extra selbst bleibt unangetastet');
});

test('T-PW2: in gnugo-duell.js zaehlt paesse nur echte Paesse (Quelltext)', () => {
  /* Der Kern von §2 der Festlegung: in ab-harness.js, weiterspielen.js und
     collect.js zaehlt der Zaehler auch Anomalien, Aufgaben oder besetzte
     Felder mit -- dort waere paesse >= 1 falsch. Hier nicht, und das haengt an
     diesen drei Zeilen. */
  pruefe(/if \(i < 0\) \{ paesse\+\+;/.test(wurzelDuell), 'erhoeht wird nur im Pass-Zweig');
  pruefe(/paesse = 0;/.test(wurzelDuell), 'und im Steinzug-Zweig zurueckgesetzt');
  pruefe(/if \(r\.type === 'resign'\) \{ aufgabe = f; break; \}/.test(wurzelDuell),
         'Aufgabe bricht vorher ab, zaehlt also nicht als Pass');
  pruefe(/throw new Error\(`Zug \$\{mc \+ 1\} auf besetztes Feld/.test(wurzelDuell),
         'ein besetztes Feld wirft, zaehlt also nicht als Pass');
  /* Gegenprobe: in ab-harness.js ist es wirklich verunreinigt. */
  const ab = fs.readFileSync(path.join(wurzel, 'ab-harness.js'), 'utf8');
  pruefe(/anomalies\+\+; passes\+\+;/.test(ab), 'ab-harness: eine Anomalie erhoeht passes (deshalb dort kein extra)');
});

test('T-PW3: KOMI ist 0,5 mit Vorgabe und 7,5 ohne (ausgefuehrt)', () => {
  pruefe(/const KOMI = opt\.vorgabe >= 2 \? 0\.5 : 7\.5;/.test(wurzelDuell), 'die Zeile steht so da');
  /* Ausgefuehrt: dieselbe Rechnung, beide Zweige. */
  const komi = vorgabe => (vorgabe >= 2 ? 0.5 : 7.5);
  pruefeGleich(komi(0), 7.5, 'ohne Vorgabe 7,5');
  pruefeGleich(komi(9), 0.5, 'mit neun Vorgabesteinen 0,5');
});

test('T-PW4: der Waechter von ab-harness.js bricht ab und nennt den Grund (ausgefuehrt)', () => {
  const p = spawnSync(process.execPath, [path.join(wurzel, 'ab-harness.js'),
    '--A', 'passNachGegnerpass=1', '--games', '1', '--budget', '10', '--maxmoves', '4'],
    {encoding: 'utf8', timeout: 180000});
  pruefeGleich(p.status, 1, 'Exitcode 1');
  const aus = p.stdout + p.stderr;
  pruefe(/passNachGegnerpass: dieses Werkzeug versorgt extra nicht/.test(aus), 'Meldung nennt die Ursache');
  pruefe(/still ausfallen/.test(aus), 'und die Folge');
  pruefe(/passregel-wege-vorabfestlegung\.md/.test(aus), 'und wo es nachzulesen ist');
});

test('T-PW4b: die drei Auswertungsskripte tragen denselben Waechter (Quelltext)', () => {
  /* Sie brauchen Archivdaten und brechen ohne Argumente vor dem Waechter ab;
     ausgefuehrt ist er deshalb nur bei ab-harness.js (T-PW4). */
  for (const rel of ['auswertung/weiterspielen.js', 'auswertung/diagnose/wurzel-replay.js',
                     'auswertung/lerner-pruefung.js']) {
    const q = fs.readFileSync(path.join(wurzel, rel), 'utf8');
    pruefe(/if \(E\.PARAMS\.passNachGegnerpass >= 1\)/.test(q), `${rel}: Waechter vorhanden`);
    pruefe(/passregel-wege-vorabfestlegung\.md/.test(q), `${rel}: Meldung nennt das Doc`);
  }
  /* Und die Hilfe von ab-harness nennt ihn, damit die Zusage „komi-blind“
     nachpruefbar bleibt (Abnahmepunkt 5). */
  const ab = fs.readFileSync(path.join(wurzel, 'ab-harness.js'), 'utf8');
  pruefe(/kein extra mit und bricht ab/.test(ab), 'ab-harness-Hilfe nennt den Waechter');
});

test('T-PW5: mit Schalter 0 spielt gnugo-duell.js dieselben Partien wie vorher (ausgefuehrt)', () => {
  /* Bitgleich-Nachweis fuer den Standardfall: derselbe Seed gegen dieselbe
     Attrappe, einmal mit dem Stand VOR dieser Korrektur und einmal mit dem
     jetzigen. extra ist jetzt immer ein Objekt; bei passNachGegnerpass 0 gibt
     passNachGegnerpassPruefung trotzdem null zurueck und _kandOrakel bleibt
     null, die Zugwahl darf sich also nicht aendern. */
  const ordner2 = fs.mkdtempSync(path.join(os.tmpdir(), 'pw-'));
  try {
    const attrappe = path.join(ordner2, 'gnugo');
    fs.writeFileSync(attrappe, `#!/bin/sh\nexec "${process.execPath}" "${path.join(__dirname, 'gtp-attrappe.js')}" "$@"\n`, {mode: 0o755});
    /* Der Stand vor der Korrektur: dieselbe Datei ohne die vier extra-Felder. */
    const alt = wurzelDuell.replace(/\{\.\.\.extra, gegnerPasste: paesse >= 1, wertung: 'flaeche', komi: KOMI\}/, 'extra');
    pruefe(alt !== wurzelDuell, 'der alte Stand liess sich herstellen');
    const altDatei = path.join(wurzel, '.tmp-duell-alt.js');
    fs.writeFileSync(altDatei, alt);
    const fahre = skript => {
      const roh = path.join(ordner2, `roh-${path.basename(skript)}.jsonl`);
      const p = spawnSync(process.execPath, [skript, '--gnugo', attrappe, '--partien', '2', '--seed', '9',
        '--stufe', '1', '--vorgabe', '0', '--maxzuege', '30', '--gnugo-aufgabe', '0',
        '--ki', 'mctsFixedSims=20,resignEnabled=0', '--roh', roh],
        {encoding: 'utf8', timeout: 300000});
      pruefeGleich(p.status, 0, `${path.basename(skript)} laeuft: ${(p.stderr || '').slice(-200)}`);
      return fs.readFileSync(roh, 'utf8').trim().split('\n').map(z => JSON.parse(z).zuege.join(' ')).join('|');
    };
    try {
      const neu = fahre(path.join(wurzel, 'gnugo-duell.js'));
      const vorher = fahre(altDatei);
      pruefe(neu.length > 50, `Partien gespielt (${neu.length} Zeichen Zugfolge)`);
      pruefeGleich(neu, vorher, 'Zug fuer Zug dieselben Partien wie vor der Korrektur');
    } finally { fs.rmSync(altDatei, {force: true}); }
  } finally { fs.rmSync(ordner2, {recursive: true, force: true}); }
});


/* ══ T-PR1: Bestandspruefung der Engine-Aufrufer ═══════════════════════
   docs/passregel-wege-nachtrag-vorabfestlegung.md §1.4 und §1.5.

   Dieser Test behebt nichts. Er haelt den Bestand GESCHLOSSEN: Eine neue
   Datei, die die Engine anfasst, macht ihn rot, bis jemand sie einordnet. Er
   steht an der Stelle der dort verworfenen Warnung in der Engine und greift
   frueher als sie -- in der CI, bevor ein Messlauf laeuft, statt mitten darin.

   Vorbehalt, in §1.5 benannt: Geprueft wird TEXT, nicht Verhalten. Eine Datei,
   die hier als `versorgt` steht und spaeter einen zweiten Codeweg bekommt, der
   extra vergisst, faellt diesem Test NICHT auf. Das haette die Engine-Warnung
   zur Laufzeit gefangen; sie ist aus den Gruenden in §1.3 und §1.5 nicht
   gebaut. */
const BESTAND = {
  /* gibt extra an getAIMove weiter */
  'gnugo-duell.js':                               'versorgt',
  'gtp-ki.js':                                    'versorgt',
  /* ruft passNachGegnerpassPruefung selbst mit extra auf, ohne getAIMove */
  'auswertung/endspiel/passregel-stellungen.js':  'versorgt-direkt',
  'auswertung/endspiel/passregel-vorsprung.js':   'versorgt-direkt',
  /* bricht ab, wenn der Schalter an ist */
  'ab-harness.js':                                'waechter',
  'auswertung/weiterspielen.js':                  'waechter',
  'auswertung/diagnose/wurzel-replay.js':         'waechter',
  'auswertung/lerner-pruefung.js':                'waechter',
  'auswertung/endspiel/passregel-fortsetzung.js': 'waechter',
  /* Klasse `feste-literale`: Die Datei kann den Schalter nicht einschalten.
     Geprueft wird die Eigenschaft, auf der das beruht -- sie nennt
     passNachGegnerpass nirgends -- und das traegt nur, weil es in keiner dieser
     Dateien einen generischen Weg gibt, der beliebige Schluessel aus Argumenten
     in PARAMS uebernimmt (wie ab-harness.js ihn hat, daher dort ein Waechter).
     Praezisierung vom 23.11.2026: Die elf alten Dateien setzen PARAMS wirklich
     nur aus DEFAULT plus festen Literalen; prior-reproduktion.js nimmt zwei
     WERTE aus Argumenten (--sims, --blend), aber nur fuer namentlich genannte
     Felder, unter denen der Schalter nicht ist. Der Klassenname ist der alte
     geblieben, die gepruefte Eigenschaft ist dieselbe. */
  'auswertung/annaeherung.js':                    'feste-literale',
  'auswertung/endspiel/netz-kosten.js':           'feste-literale',
  'auswertung/endspiel/pass-stellungen.js':       'feste-literale',
  'auswertung/kritisch-rang.js':                  'feste-literale',
  'auswertung/lebensurteil-vergleich.js':         'feste-literale',
  'auswertung/muster-endspiel-daten.js':          'feste-literale',
  'auswertung/netz-zeit.js':                      'feste-literale',
  'auswertung/zugwahl-grund.js':                  'feste-literale',
  'auswertung/zugwert-rang.js':                   'feste-literale',
  'auswertung/zugwert-suche.js':                  'feste-literale',
  'distillation/collect.js':                      'feste-literale',
  /* Neu am 23.11.2026, und T-PR1 hat die Datei selbst gemeldet, als sie
     unverzeichnet dazukam (docs/prior-reproduktion-vorabfestlegung.md §8.5). */
  'auswertung/diagnose/prior-reproduktion.js':    'feste-literale',
  'auswertung/diagnose/prior-seeds.js':           'feste-literale'
};

/* Dateien, die den Schalter nennen, ohne die Engine selbst zu rufen. */
const SCHALTERSTELLEN = {
  'auswertung/endspiel/passregel-lib.js':           'liest ihn nur fuer den Bericht',
  'auswertung/endspiel/passregel-zaehldiagnose.js': 'setzt ihn auf 1 und geht ueber passregel-stellungen.js'
};

const jsDateien = () => execFileSync('git', ['ls-files', '*.js'], {cwd: wurzel, encoding: 'utf8'})
  .split('\n').filter(f => f && !f.startsWith('tests/'));
const quelle = rel => fs.readFileSync(path.join(wurzel, rel), 'utf8');

test('T-PR1: der Bestand der Engine-Aufrufer ist geschlossen, jede Klasse haelt ihre Eigenschaft', () => {
  const alle = jsDateien();
  const gelistet = Object.keys(BESTAND);

  /* 1. Geschlossene Welt der Aufrufer. */
  const ruft = alle.filter(f => /getAIMove\(|passNachGegnerpassPruefung\(/.test(quelle(f)));
  const unverzeichnet = ruft.filter(f => !gelistet.includes(f));
  const verschwunden = gelistet.filter(f => !ruft.includes(f));
  pruefe(unverzeichnet.length === 0, unverzeichnet.length
    ? `NEUE Datei ruft die Engine an und ist nicht eingeordnet: ${unverzeichnet.join(', ')}`
      + ' -- in BESTAND aufnehmen (docs/passregel-wege-nachtrag-vorabfestlegung.md §1.4):'
      + ' versorgt, versorgt-direkt, waechter oder feste-literale'
    : 'keine unverzeichnete Datei ruft die Engine an');
  pruefe(verschwunden.length === 0, verschwunden.length
    ? `verzeichnete Datei ruft die Engine nicht mehr an: ${verschwunden.join(', ')} -- BESTAND kuerzen`
    : 'keine verzeichnete Datei ist verschwunden');
  pruefeGleich(ruft.length, 22, 'heute sind es 22 Dateien (§1.4)');

  /* 2. Geschlossene Welt der Schalterstellen: auch eine Datei, die den
        Schalter anfasst, ohne die Engine zu rufen, soll auffallen. */
  const nennt = alle.filter(f => /passNachGegnerpass/.test(quelle(f)));
  const fremd = nennt.filter(f => !gelistet.includes(f) && !(f in SCHALTERSTELLEN));
  pruefe(fremd.length === 0, fremd.length
    ? `Datei nennt den Schalter und ist nirgends eingeordnet: ${fremd.join(', ')}`
    : 'jede Datei, die den Schalter nennt, ist eingeordnet');

  /* 3. Eigenschaft je Klasse. */
  let gezaehlt = {versorgt: 0, 'versorgt-direkt': 0, waechter: 0, 'feste-literale': 0};
  for (const [rel, klasse] of Object.entries(BESTAND)) {
    const q = quelle(rel);
    gezaehlt[klasse]++;
    if (klasse === 'versorgt')
      pruefe(/gegnerPasste/.test(q), `${rel}: gibt extra mit gegnerPasste weiter`);
    else if (klasse === 'versorgt-direkt')
      pruefe(/passNachGegnerpassPruefung\(/.test(q) && /gegnerPasste: true/.test(q),
             `${rel}: ruft die Pruefung direkt mit einem extra auf`);
    else if (klasse === 'waechter')
      pruefe(/passNachGegnerpass (>= 1|!== 0)/.test(q), `${rel}: Waechter auf den Schalter`);
    else
      /* Das ist die Eigenschaft, auf der ihre Sicherheit beruht: Wer den
         Schalter nicht nennt, kann ihn nicht einschalten -- der Rest kommt
         aus DEFAULT, und dort steht 0. */
      pruefe(!/passNachGegnerpass/.test(q),
             `${rel}: nennt den Schalter nicht (feste Literale, §1.4)`);
  }
  pruefeGleich(JSON.stringify(gezaehlt), JSON.stringify(
    {versorgt: 2, 'versorgt-direkt': 2, waechter: 5, 'feste-literale': 13}),
    'die vier Klassen sind 2 + 2 + 5 + 13 (§1.4)');
});

laufeTests('Versuchsregel Pass nach Gegnerpass').then(ok => process.exit(ok ? 0 : 1));
