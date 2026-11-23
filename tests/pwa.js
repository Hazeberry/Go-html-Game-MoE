// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Vergleich mit der PWA (docs/pwa-vergleich.md):

     1. gtp-ki.js: GTP-Befehle und Schlagen, genmove gibt einen freien
        Punkt, set_random_seed macht den Zug wiederholbar, falsche Befehle
        und Optionen werden abgelehnt.
     2. gnugo-duell.js --gegner ki: eine Partie gegen die PWA läuft durch
        (GNU Go als tests/gtp-attrappe.js), der Datensatz nennt den Gegner
        mit sha256; mit demselben Seed sind die Züge gleich (Kontrolle);
        ohne --gegner-html oder mit falschem --gegner-ki bricht es ab.
     3. Die PWA-Datei ist die aus dem Dokument (sha256), die Teile, Seeds
        und Bedenkzeiten stimmen in Dokument, Spielskript, Workflow und
        Ergebnisskript überein, pwa-spielen.sh lehnt falsche Eingaben ab.
     4. pwa-bericht.js: Siegrate mit exaktem Intervall (auch bei 360
        Partien und Raten nahe 90 %), Urteil nach der vorab festgelegten
        Regel, Gleichstandsprobe, Kontrolle.
     5. pwa-ergebnis.sh fügt Teile und Kontrolle zusammen und nennt fehlende.

   Aufruf:  node tests/pwa.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const {execFileSync, spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const P = require('../auswertung/pwa-bericht.js');

const wurzel = path.join(__dirname, '..');
const PWA = path.join(wurzel, 'vergleich', 'pwa-index.html');
const GTP = path.join(wurzel, 'gtp-ki.js');
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-'));
const programm = path.join(ordner, 'attrappe');
fs.writeFileSync(programm, `#!/bin/sh\nexec "${process.execPath}" "${path.join(__dirname, 'gtp-attrappe.js')}" "$@"\n`, {mode: 0o755});
const SHA = '9100c565458b84bac71d8de308e8c064b53de37269bf725e7696ba30a838e685';

/* GTP-Befehle an gtp-ki.js, Antworten ohne "= " */
function gtp(html, befehle, ki = 'mctsFixedSims=20,resignEnabled=0') {
  const p = spawnSync(process.execPath, [GTP, '--html', html, '--ki', ki], {input: befehle.join('\n') + '\nquit\n', encoding: 'utf8', timeout: 120000});
  return p.stdout.split('\n\n').filter(Boolean).map(a => a.trim());
}

test('gtp-ki.js: Befehle, Schlagen, wiederholbarer genmove, Fehler', () => {
  const a = gtp(PWA, ['protocol_version', 'boardsize 19', 'clear_board', 'komi 7.5',
    'play b B1', 'play w A1', 'play b A2', 'list_stones white', 'list_stones black', 'boardsize 9', 'gibtsnicht', 'play b B1']);
  pruefeGleich(a.slice(0, 5).join('|'), '= 2|=|=|=|=', 'Antworten der ersten Befehle');
  pruefeGleich(a[6], '=', 'A2 schlägt A1');
  pruefeGleich(a[7], '=', 'Weiß hat keinen Stein mehr');
  pruefeGleich(a[8], '= A2 B1', 'Schwarz hat A2 und B1');
  pruefe(a[9].startsWith('?') && a[10].startsWith('?') && a[11].startsWith('?'), 'boardsize 9, unbekannter Befehl, besetztes Feld abgelehnt');
  const zug = seed => gtp(PWA, ['boardsize 19', 'clear_board', `set_random_seed ${seed}`, 'play b Q16', 'genmove w'])[4];
  const z1 = zug(7), z2 = zug(7);
  pruefe(/^= [A-HJ-T](1[0-9]|[1-9])$/.test(z1) && z1 !== '= Q16', `genmove gibt einen freien Punkt: ${z1}`);
  pruefeGleich(z2, z1, 'gleicher Seed, gleicher Zug');
  for (const ki of ['gibtsnicht=1', 'mctsFixedSims=x']) pruefeGleich(spawnSync(process.execPath, [GTP, '--html', PWA, '--ki', ki], {input: 'quit\n', encoding: 'utf8'}).status, 2, `--ki ${ki} abgelehnt`);
  pruefeGleich(spawnSync(process.execPath, [GTP], {input: 'quit\n', encoding: 'utf8'}).status, 2, 'ohne --html abgelehnt');
});

/* Eine Partie des Duell-Skripts gegen die KI aus html, 20 Simulationen, 60 Züge */
let zaehler = 0;
function duell(html, seed, extra = []) {
  const aus = path.join(ordner, `roh-${++zaehler}.jsonl`);
  const p = spawnSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), '--gnugo', programm, '--gegner', 'ki', '--gegner-html', html,
    '--gegner-ki', 'mctsFixedSims=20,resignEnabled=0', '--partien', '2', '--seed', String(seed), '--stufe', '1', '--vorgabe', '0',
    '--maxzuege', '60', '--schaetzung', '40', '--gnugo-aufgabe', '0', '--ki', 'mctsFixedSims=20,resignEnabled=0', '--roh', aus, ...extra],
    {encoding: 'utf8', timeout: 300000});
  return {status: p.status, stderr: p.stderr, roh: fs.existsSync(aus) ? fs.readFileSync(aus, 'utf8').trim().split('\n').map(z => JSON.parse(z)) : []};
}

test('gnugo-duell.js --gegner ki: Partie gegen die PWA, Gegner im Datensatz, Züge wiederholbar', () => {
  const a = duell(PWA, 9), b = duell(PWA, 9);
  pruefeGleich(a.status, 0, 'Duell läuft: ' + a.stderr.slice(-200));
  pruefeGleich(a.roh.length, 2, 'zwei Partien');
  for (const r of a.roh) {
    pruefe(!r.abgebrochen && r.zuege.length === 60 && r.vorgabe === 0 && r.komi === 7.5, `ohne Vorgabe, 60 Züge: ${r.abgebrochen || r.zuege.length}`);
    pruefeGleich(JSON.stringify(r.gegner), JSON.stringify({name: 'ki', html: 'pwa-index.html', sha256: SHA, ki: 'mctsFixedSims=20,resignEnabled=0', schiedsrichterStufe: 1}), 'Gegner im Datensatz');
  }
  pruefeGleich(a.roh.map(r => r.wirFarbe).join(' '), 'W S', 'Farben wechseln');
  pruefeGleich(b.roh.map(r => r.zuege.join(' ')).join('|'), a.roh.map(r => r.zuege.join(' ')).join('|'), 'gleicher Seed, gleiche Partien');
  const c = duell(path.join(wurzel, 'index.html'), 9);
  pruefe(c.status === 0 && c.roh.length === 2 && c.roh[0].gegner.html === 'index.html', 'N gegen N über den Adapter läuft');
  pruefe(c.roh[0].zuege.join(' ') !== a.roh[0].zuege.join(' '), 'gegen N spielt der Gegner andere Züge als die PWA');
  const ohne = spawnSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), '--gegner', 'ki', '--partien', '1'], {encoding: 'utf8'});
  pruefeGleich(ohne.status, 2, 'ohne --gegner-html abgelehnt');
  const falsch = spawnSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), '--gegner', 'ki', '--gegner-html', PWA, '--gegner-ki', 'x=;rm'], {encoding: 'utf8'});
  pruefeGleich(falsch.status, 2, 'falsches --gegner-ki abgelehnt');
});

test('PWA-Datei, Dokument, Spielskript, Workflow und Ergebnisskript stimmen überein', () => {
  pruefeGleich(crypto.createHash('sha256').update(fs.readFileSync(PWA)).digest('hex'), SHA, 'sha256 der PWA-Datei');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'pwa-vergleich.md'), 'utf8');
  const sp = fs.readFileSync(path.join(wurzel, 'auswertung', 'pwa-spielen.sh'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'pwa-vergleich.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'pwa-ergebnis.sh'), 'utf8');
  pruefe(doc.includes(SHA), 'sha256 im Dokument');
  const zeilen = Object.fromEntries([...doc.matchAll(/^\| \*{0,2}(M1|M2|K1)\*{0,2}[^|]*\| ([^|]+) \| ([^|]+) \| (\d+) \| (\d+) \|/gm)].map(m => [m[1], {gegner: m[2].trim(), zeit: m[3].trim(), partien: +m[4], seed: +m[5]}]));
  pruefeGleich(Object.keys(zeilen).join(' '), 'M1 M2 K1', 'Teile im Dokument');
  const skript = Object.fromEntries([...sp.matchAll(/^  (M1|M2|K1)\) seed=(\d+); ki="([^"]+)"; gegner="\$wurzel\/([^"]+)"/gm)].map(m => [m[1], {seed: +m[2], ki: m[3], gegner: m[4]}]));
  for (const k of ['M1', 'M2', 'K1']) pruefeGleich(skript[k].seed, zeilen[k].seed, `${k}: Seed in Dokument und Spielskript`);
  pruefe(/mctsFixedSims=120/.test(skript.M1.ki) && /mctsFixedSims=120/.test(skript.K1.ki) && /mctsFixedSims=0,aiTimeBudget=1800/.test(skript.M2.ki), 'Bedenkzeit: 120 Simulationen bzw. 1,8 s');
  pruefe(/120 Simulationen/.test(zeilen.M1.zeit) && /1,8 s/.test(zeilen.M2.zeit) && /120 Simulationen/.test(zeilen.K1.zeit), 'Bedenkzeit im Dokument');
  pruefe(skript.M1.gegner === 'vergleich/pwa-index.html' && skript.M2.gegner === 'vergleich/pwa-index.html' && skript.K1.gegner === 'index.html', 'Gegner: PWA bzw. N');
  pruefe(Object.values(skript).every(s => /resignEnabled=0/.test(s.ki)) && /--vorgabe 0/.test(sp) && /--maxzuege 600/.test(sp) && /--gegner-ki "\$ki"/.test(sp) && /--ki "\$ki"/.test(sp), 'gleiche Bedingungen für beide Seiten');
  const liste = name => { const s = t.slice(t.indexOf(`\n  ${name}:\n`)); return (/von: \[([^\]]+)\]/.exec(s) || [])[1].split(',').map(x => +x.trim()); };
  for (const [name, teil, gr] of [['m1', 'M1', 30], ['m2', 'M2', 6], ['k1', 'K1', 30]]) {
    const von = liste(name);
    pruefe(von.every((v, i) => v === 1 + i * gr), `${name}: Teile zu ${gr} lückenlos ab 1`);
    pruefeGleich(von.length * gr, zeilen[teil].partien, `${teil}: Partien wie im Dokument`);
    pruefe(new RegExp(`pwa-spielen\\.sh ${teil} "\\$VON" ${gr} "stand/${name}-\\$VON\\.jsonl"`).test(t), `${name}: ${gr} Partien je Teil`);
    pruefe(new RegExp(`sammle ${teil} ${gr} ${von.length}`).test(e), `${name}: Ergebnisskript sammelt ${von.length} Teile zu ${gr}`);
  }
  pruefe(/pwa-spielen\.sh M1 1 20 stand\/kontrolle\.jsonl/.test(t), 'Kontrolle: M1, Partien 1 bis 20');
  pruefe(!/inputs:/.test(t) && (t.match(/contents: write/g) || []).length === 1, 'keine Eingaben, Schreibrecht in einem Job');
  const s = (...x) => spawnSync('bash', [path.join(wurzel, 'auswertung', 'pwa-spielen.sh'), ...x], {encoding: 'utf8', env: {...process.env, GNUGO: programm}});
  pruefeGleich(s('X', '1', '1', path.join(ordner, 'a.jsonl')).status, 2, 'Teil X abgelehnt');
  pruefeGleich(s('M1', 'eins', '1', path.join(ordner, 'a.jsonl')).status, 2, 'Beginn keine Zahl');
  pruefeGleich(s('M1', '1', '1').status, 1, 'Ausgabedatei fehlt');
});

test('pwa-bericht.js: Siegrate, exaktes Intervall, Urteil, Gleichstandsprobe, Kontrolle', () => {
  const partien = (siege, n, farbe = i => i % 2 ? 'W' : 'S') => Array.from({length: n}, (_, i) => ({nr: i + 1, gewonnen: i < siege, wirFarbe: farbe(i), endstand: i < siege ? 10 : -10, zuegeAnzahl: 300, simsMittel: 120, schaetzung: {40: 1}, zuege: ['D4']}));
  pruefeGleich(P.urteil(P.teil(partien(220, 360))), 'neu stärker', '61 % von 360');
  pruefeGleich(P.urteil(P.teil(partien(140, 360))), 'neu schwächer', '39 % von 360');
  pruefeGleich(P.urteil(P.teil(partien(190, 360))), 'kein Unterschied belegt', '53 % von 360');
  const t = P.teil([...partien(3, 4), {nr: 9, abgebrochen: 'x'}, {nr: 10, gewonnen: null, endstand: 5}]);
  pruefeGleich(`${t.partien} ${t.abgebrochen} ${t.zuglimit} ${t.n} ${t.siege}`, '6 1 1 4 3', 'Abbruch und Zuglimit zählen nicht');
  pruefe(Math.abs(t.lo - 0.1941) < 0.001 && Math.abs(t.hi - 0.9937) < 0.001, `Clopper-Pearson 3 von 4: ${t.lo} bis ${t.hi}`);
  const g = P.teil(partien(305, 360));
  pruefe(Math.abs(g.lo - 0.8058) < 0.001 && Math.abs(g.hi - 0.8828) < 0.001, `Clopper-Pearson 305 von 360 (ohne Unterlauf von (1 − p)^n): ${g.lo} bis ${g.hi}`);
  const a = P.auswertung({M1: partien(300, 360), K1: partien(90, 120)});
  pruefe(!a.k1.bestanden && a.urteile.length === 1 && a.urteile[0].urteil === 'neu stärker', 'K1 mit 75 % nicht bestanden');
  const md = P.text(a, {gleich: 20, erwartet: 20, ok: true});
  pruefe(/NICHT bestanden: Der Adapter/.test(md) && /Vorsicht: K1 nicht bestanden/.test(md) && /Kontrolle: 20 von 20 .*bestanden/.test(md), 'Bericht nennt K1 und Kontrolle');
  pruefe(P.auswertung({M1: partien(180, 360), K1: partien(60, 120)}).k1.bestanden, 'K1 mit 50 % bestanden');
});

test('pwa-ergebnis.sh: Teile, Kontrolle, fehlende Teile', () => {
  const ort = fs.mkdtempSync(path.join(ordner, 'erg-'));
  fs.mkdirSync(path.join(ort, 'stand'));
  const rec = nr => JSON.stringify({nr, gewonnen: nr % 3 !== 0, wirFarbe: nr % 2 ? 'W' : 'S', endstand: nr % 3 ? 12 : -8, zuegeAnzahl: 300, simsMittel: 120, schaetzung: {}, zuege: ['D4', String(nr)]});
  const schreibe = (datei, von, n) => fs.writeFileSync(path.join(ort, 'stand', datei), Array.from({length: n}, (_, i) => rec(von + i)).join('\n') + '\n');
  schreibe('m1-1.jsonl', 1, 30); schreibe('m1-31.jsonl', 31, 30); schreibe('m2-1.jsonl', 1, 6); schreibe('k1-1.jsonl', 1, 30);
  schreibe('kontrolle.jsonl', 1, 20);
  const p = spawnSync('bash', [path.join(wurzel, 'auswertung', 'pwa-ergebnis.sh')], {cwd: ort, encoding: 'utf8'});
  pruefeGleich(p.status, 0, 'Ergebnisskript läuft: ' + p.stderr.slice(-300));
  const md = fs.readFileSync(path.join(ort, 'ergebnisse', 'bericht.md'), 'utf8');
  const fehlt = fs.readFileSync(path.join(ort, 'ergebnisse', 'fehlende-teile.txt'), 'utf8').trim().split('\n');
  pruefeGleich(fehlt.length, 10 + 19 + 3, 'fehlende Teile: 10 von M1, 19 von M2, 3 von K1');
  pruefe(md.includes(SHA) && /## M1: /.test(md) && /## M2: /.test(md) && /## K1: /.test(md), 'Bericht mit sha256 und allen Teilen');
  pruefe(/Kontrolle: 20 von 20 Partien Zug für Zug gleich wie in M1 \(bestanden\)/.test(md), 'Kontrolle bestanden');
  pruefe(['m1', 'm2', 'k1', 'kontrolle'].every(n => fs.existsSync(path.join(ort, 'ergebnisse', `${n}.jsonl.gz`))), 'Rohdaten gepackt');
});

/* ══ Korrektur GTP-1 bis GTP-3 ═════════════════════════════════
   docs/korrektur-gtp-vorabfestlegung.md, Tests nach §7. Die Zugfolgen sind die
   aus auswertung/bughunt-20261107/reproduce.cjs in Hazeberry/codex (§10.3),
   damit die Vorher-Nachher-Lage mit dem Lauf vom 07.11.2026 vergleichbar bleibt.

   Hier laeuft index.html, nicht die PWA-Datei: vergleich/pwa-index.html kennt
   weder passNachGegnerpass noch zaehlVorschau, --ki passNachGegnerpass=1 wuerde
   dort mit Exit 2 abgelehnt. */
const IDX = path.join(wurzel, 'index.html');
const KI_KURZ = 'mctsFixedSims=20,resignEnabled=0';
const KO_AUFBAU = ['play W B2', 'play W A3', 'play W C3', 'play W B4',
                   'play B A2', 'play B B1', 'play B C2', 'play B B3'];

/* wie gtp(), aber mit stderr — die Attrappe in T-G3 protokolliert dorthin */
function gtpVoll(html, befehle, ki = KI_KURZ) {
  const p = spawnSync(process.execPath, [GTP, '--html', html, '--ki', ki],
    {input: befehle.join('\n') + '\nquit\n', encoding: 'utf8', timeout: 300000});
  return {antworten: p.stdout.split('\n\n').filter(Boolean).map(a => a.trim()), stderr: p.stderr, status: p.status};
}

test('T-G1, T-G1b, T-G2: play lehnt Ko, Selbstmord und Wiederholung ab, ohne den Zustand zu aendern', () => {
  /* T-G1b Selbstmord: A1 hat in der Ecke nur A2 und B1 als Nachbarn, beide Weiss,
     und beide behalten eigene Freiheiten — es wird nichts geschlagen. */
  const sm = gtp(IDX, ['play W A2', 'play W B1', 'play B A1', 'list_stones B', 'list_stones W'], KI_KURZ);
  pruefe(sm[2].startsWith('?'), `Selbstmord abgelehnt: ${sm[2]}`);
  pruefeGleich(sm[3], '=', 'Schwarz hat keinen Stein — A1 steht nicht auf dem Brett');
  pruefeGleich(sm[4], '= A2 B1', 'Weiss unveraendert');

  /* T-G1 Ko: B B3 schlaegt W B2, die unmittelbare Ruecknahme W B2 ist verboten. */
  const ko = gtp(IDX, [...KO_AUFBAU, 'play W B2', 'list_stones W', 'list_stones B'], KI_KURZ);
  pruefe(ko[8].startsWith('?'), `Ko-Ruecknahme abgelehnt: ${ko[8]}`);
  pruefe(!ko[9].split(/\s+/).includes('B2'), `W B2 steht nicht: ${ko[9]}`);
  pruefe(ko[10].split(/\s+/).includes('B3'), `B B3 ist noch da: ${ko[10]}`);

  /* T-G2 Superko: nach zwei Paessen ist der Ko-Punkt frei, die Stellung aber
     dieselbe wie vor dem Schlag — positionelle Wiederholung. */
  const sk = gtp(IDX, [...KO_AUFBAU, 'play W pass', 'play B pass', 'play W B2', 'list_stones W'], KI_KURZ);
  pruefe(sk[10].startsWith('?'), `Wiederholung abgelehnt: ${sk[10]}`);
  pruefe(!sk[11].split(/\s+/).includes('B2'), `W B2 steht nicht: ${sk[11]}`);

  /* Abnahmepunkt 4: eine Ablehnung aendert den Zustand nicht. Beobachtbar ist das
     ueber GTP am Brett und am Weiterspielen; die Gefangenenzahl ist von aussen
     nicht abfragbar. Nach der abgelehnten Ruecknahme steht das Brett unveraendert
     und der Ko-Punkt gilt weiter, und sobald die Stellung sich wirklich
     unterscheidet (W T19 dazwischen), ist derselbe Punkt erlaubt und schlaegt. */
  const zu = gtp(IDX, [...KO_AUFBAU, 'play W B2', 'play W T19', 'play B pass', 'play W B2',
                       'list_stones W', 'list_stones B'], KI_KURZ);
  pruefe(zu[8].startsWith('?'), 'die Ruecknahme ist zuerst abgelehnt');
  pruefeGleich(zu[11], '=', 'nach einem Zwischenzug ist derselbe Punkt erlaubt');
  pruefe(zu[12].split(/\s+/).includes('B2'), `jetzt steht W B2: ${zu[12]}`);
  pruefe(!zu[13].split(/\s+/).includes('B3'), `und B B3 ist geschlagen: ${zu[13]}`);
});

test('T-G2b: die neuen Pruefungen lehnen keinen legalen Zug ab (Gegenprobe gegen Fehlalarm)', () => {
  /* Legaler Zug und Pass in der Ko-Stellung; dann derselbe Punkt nach einem
     Zwischenzug. gnugo-duell.js verwirft jede Antwort ohne "=", eine zu scharfe
     Pruefung wuerde dort einen Messlauf hart abbrechen. */
  const a = gtp(IDX, [...KO_AUFBAU, 'play W T19', 'play B pass', 'play W B2'], KI_KURZ);
  pruefeGleich(a.slice(8, 11).join('|'), '=|=|=', `legaler Zug, Pass und Ruecknahme danach: ${a.slice(8, 11)}`);

  /* Der Ablauf des bestehenden Tests oben, Stein fuer Stein: B A2 schlaegt W A1.
     Die schlagende Gruppe hat drei Freiheiten, es entsteht also kein Ko-Punkt. */
  const b = gtp(IDX, ['play b B1', 'play w A1', 'play b A2', 'list_stones white', 'list_stones black'], KI_KURZ);
  pruefeGleich(b.slice(0, 3).join('|'), '=|=|=', 'Aufbau und Schlag unveraendert angenommen');
  pruefeGleich(b[3], '=', 'Weiss hat keinen Stein mehr');
  pruefeGleich(b[4], '= A2 B1', 'Schwarz hat A2 und B1');

  /* set_free_handicap wird nach §5 nicht geprueft und muss weiter durchgehen. */
  const c = gtp(IDX, ['set_free_handicap D4 Q16 D16', 'list_stones B'], KI_KURZ);
  pruefeGleich(c[0], '=', 'set_free_handicap angenommen');
  pruefeGleich(c[1].split(/\s+/).slice(1).sort().join(' '), 'D16 D4 Q16', `Vorgabesteine stehen: ${c[1]}`);
});

test('T-G3: genmove reicht extra weiter — gegnerPasste, Wertung und das gesetzte Komi', () => {
  /* Attrappe statt echter Suche: sie protokolliert, was an der Aufrufstelle ankommt. */
  const html = fs.readFileSync(IDX, 'utf8');
  const m = /<script id="worker-ai">([\s\S]*?)<\/script>/.exec(html);
  pruefe(!!m, '<script id="worker-ai"> gefunden');
  const attrappe = `
getAIMove = function (board, aiColor, histHashes, captures, mc, diff, reqId, koPoint, lastMove, extra) {
  console.error('EXTRA ' + JSON.stringify({argc: arguments.length, gp: extra && extra.gegnerPasste,
    w: extra && extra.wertung, k: extra && extra.komi}));
  return {type: 'stone', x: 3, y: 3, requestId: reqId};
};
`;
  const schnitt = m.index + m[0].length - '</script>'.length;
  const kopie = path.join(ordner, 'attrappe.html');
  fs.writeFileSync(kopie, html.slice(0, schnitt) + attrappe + html.slice(schnitt));

  const r = gtpVoll(kopie, [
    'boardsize 19', 'clear_board', 'komi 6.5', 'play W pass', 'genmove B',   /* 1: Gegnerpass, Komi 6,5 */
    'clear_board', 'play W pass', 'genmove B',                              /* 2: clear_board setzt Komi zurueck */
    'clear_board', 'play W pass', 'play B C3', 'genmove W',                  /* 3: ein Stein loescht letzterPass */
    'clear_board', 'play W pass', 'genmove W'                               /* 4: Farbpruefung */
  ], KI_KURZ);
  const prot = r.stderr.split('\n').filter(z => z.startsWith('EXTRA ')).map(z => JSON.parse(z.slice(6)));
  pruefeGleich(prot.length, 4, `vier Aufrufe protokolliert: ${r.stderr.slice(-300)}`);
  pruefeGleich(prot[0].argc, 10, 'zehn Argumente — extra geht mit');
  pruefeGleich(prot[0].gp, true, 'gegnerPasste true nach play W pass');
  pruefeGleich(prot[0].w, 'flaeche', 'Wertung flaeche');
  pruefeGleich(prot[0].k, 6.5, 'das ueber komi gesetzte Komi kommt an');
  pruefeGleich(prot[1].k, 7.5, 'clear_board setzt Komi auf 7,5 zurueck');
  pruefeGleich(prot[2].gp, false, 'ein Steinzug loescht letzterPass');
  pruefeGleich(prot[3].gp, false, 'der Pass war Weiss, Weiss ist am Zug: kein Gegnerpass');
});

/* Zuege aus einem SGF als GTP-Befehle; Paesse uebersprungen, wie im Parser von
   tests/passregel-versuch.js, damit dasselbe Brett entsteht. */
function sgfAlsPlay(datei) {
  const SP = 'ABCDEFGHJKLMNOPQRST', txt = fs.readFileSync(path.join(wurzel, 'tests', 'stellungen', datei), 'utf8');
  const re = /;([BW])\[([a-s]{0,2})\]/g, zuege = []; let m;
  while ((m = re.exec(txt))) {
    if (!m[2]) continue;
    zuege.push(`play ${m[1]} ${SP[m[2].charCodeAt(0) - 97]}${19 - (m[2].charCodeAt(1) - 97)}`);
  }
  return zuege;
}

test('T-G3b: Versuchsregel loest mit Schalter aus und ohne nicht (Partie 427, Schwarz fuehrt)', () => {
  /* Dieselbe Stellung wie in tests/passregel-versuch.js: ausgespielt, geklaert,
     grosser Vorsprung fuer Schwarz. Das Einspielen ist gleichzeitig die groesste
     Fehlalarm-Gegenprobe, die es gibt: 397 Zuege einer echten Partie. */
  const zuege = sgfAlsPlay('hand-427.sgf');
  pruefeGleich(zuege.length, 397, 'alle Steinzuege der Partie');
  const lauf = ki => {
    const r = gtpVoll(IDX, [...zuege, 'play W pass', 'genmove B'], ki);
    return {abgelehnt: r.antworten.filter(a => a.startsWith('?')), zug: r.antworten[zuege.length + 1]};
  };
  const an = lauf(KI_KURZ + ',passNachGegnerpass=1');
  pruefeGleich(an.abgelehnt.length, 0, `kein Zug der echten Partie abgelehnt: ${an.abgelehnt.slice(0, 3)}`);
  pruefeGleich(an.zug, '= pass', 'mit Schalter passt die Engine');

  const aus = lauf(KI_KURZ);
  pruefeGleich(aus.abgelehnt.length, 0, 'auch ohne Schalter kein Zug abgelehnt');
  pruefe(/^= [A-HJ-T](1[0-9]|[1-9])$/.test(aus.zug), `ohne Schalter zieht sie: ${aus.zug}`);
});

test('T-G4: Befehlsnummern werden erkannt und zurueckgegeben, auch im Fehlerfall', () => {
  const a = gtp(IDX, ['17 protocol_version', '18 name', '19 bloedsinn', '17', 'protocol_version'], KI_KURZ);
  pruefeGleich(a[0], '=17 2', 'Erfolgsantwort mit Nummer');
  pruefeGleich(a[1], '=18 gtp-ki', 'zweite Nummer');
  pruefeGleich(a[2], '?19 unbekannter Befehl', 'Fehlerantwort mit Nummer');
  pruefeGleich(a[3], '?17 unbekannter Befehl', 'eine Zeile aus nur einer Zahl: unbekannter Befehl mit Nummer');
  pruefeGleich(a[4], '= 2', 'ohne Nummer unveraendert');
  pruefeGleich(a[5], '=', 'quit ohne Nummer unveraendert');
});

test('T-G5: Kontrolle — gewoehnlicher Ablauf und Zugwahl unveraendert', () => {
  const a = gtp(IDX, ['protocol_version', 'boardsize 19', 'clear_board', 'komi 7.5',
    'set_random_seed 7', 'play b Q16', 'genmove w', 'list_stones b'], KI_KURZ);
  pruefeGleich(a.slice(0, 5).join('|'), '= 2|=|=|=|=', 'Antworten der ersten Befehle unveraendert');
  /* R17 ist der Zug, den der Adapter VOR der Korrektur auf diesem Seed lieferte
     (am Stand 7382a19 nachgefahren). Die Zugwahl darf sich nicht aendern. */
  pruefeGleich(a[6], '= R17', 'derselbe Zug wie am alten Adapter');
  pruefeGleich(a[7], '= Q16', 'Schwarz steht auf Q16');
  const b = gtp(IDX, ['boardsize 19', 'clear_board', 'set_random_seed 7', 'play b Q16', 'genmove w'], KI_KURZ);
  pruefeGleich(b[4], a[6], 'gleicher Seed, gleicher Zug');
});

laufeTests('Vergleich mit der PWA').then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
