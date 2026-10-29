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
     4. pwa-bericht.js: Siegrate mit exaktem Intervall, Urteil nach der
        vorab festgelegten Regel, Gleichstandsprobe, Kontrolle.
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

laufeTests('Vergleich mit der PWA').then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
