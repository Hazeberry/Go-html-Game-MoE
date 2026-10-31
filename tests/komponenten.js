// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Stufe A (docs/komponenten.md) und Stufe B (docs/komponenten-b.md) der
   Komponentenmessung.

     1. Die Arme in auswertung/komponenten/arme.sh: jeder Parameter steht mit
        Default in index.html, jede Abschaltung ändert den Default, B schaltet
        genau die neun Zusätze aus, die übrigen Arme sind Teile davon; Arme
        und Partienzahlen stimmen mit Dokument und Workflow überein.
     2. D und N0 spielen bei gleichem Seed die ersten 80 Züge gleich (das
        Netz wirkt erst ab Zug 80), gegen GNU Go und gegen Fuego; B weicht
        vorher ab (die Probe kann Abweichungen sehen). Gespielt wird gegen
        tests/gtp-attrappe.js, ohne GNU Go und ohne Fuego.
     3. Der Bericht: Intervall mit alpha 0,05/5, Wechselwirkung je
        Partienummer mit alpha 0,05/2, Unterschied der Gegner nach Welch,
        Probe der ersten 80 Züge, Kontrolle.
     4. spielen.sh lehnt falsche Eingaben ab.
     5. Stufe B: die Arme in arme-b.sh (je einer der sieben Zusätze, O7 alle
        sieben, D und R0 wie in Stufe A), Dokument, Workflow (fester Seed
        220, keine Eingaben) und Ergebnisskript stimmen überein; der Bericht
        rechnet mit alpha 0,05/8, die Wechselwirkung über die sieben und die
        erste Abweichung von D.
     6. Muster-Eröffnung (docs/muster-eroeffnung.md): Arme in arme-m.sh,
        Schalter musterAb mit Default 0 in index.html, Dokument, Workflow
        (fester Seed 220, Selbstspiel ohne Aufgabe) und Ergebnisskript stimmen
        überein; der Bericht rechnet mit alpha 0,05/2, prüft A40 und A80
        gegen M0 und urteilt über M1 nach der vorab festgelegten Regel.
     7. Baum-Übernahme (docs/baum-uebernahme.md): Arme in arme-t.sh, SIMS
        in spielen.sh, Teile und Seeds in Dokument, Workflow und
        Ergebnisskript; der Bericht prüft Nichtunterlegenheit (Grenze −10,
        bei 600 Simulationen −20 und Mittelwert über −5).
     8. Diagnose der Selbstspiel-Niederlagen (docs/muster-eroeffnung.md §9):
        selbstspiel-diagnose.js rechnet Komi, knappe Niederlagen, Farbe und
        Verlauf aus Sicht von B richtig, und die Tabellen im Dokument sind
        genau die Ausgabe des Skripts für die gespeicherten Daten.
     9. Leeres Brett (docs/leeres-brett.md): Arme in arme-l.sh, VORGABE in
        spielen.sh, Dokument, Workflow (Seed 222, VORGABE 0) und
        Ergebnisskript stimmen überein; ohne Vorgabe wechseln die Farben, N0
        spielt die ersten 80 Züge wie D und A80 wie M0, jeder Datensatz nennt
        die geschlagenen Steine (Attrappe); der Bericht rechnet mit alpha
        0,05/3, zeigt die Verteilung des Endstands und den Unterschied der
        Bedingungen und urteilt nach der vorab festgelegten Regel; das
        Ergebnisskript fügt Teile, Bedingung mit sechs Steinen und Kontrolle
        zusammen.
    10. Muster ohne Vorgabe (docs/muster-ohne-vorgabe.md): Schalter mit
        Default 1 bzw. 0 in index.html, Arme in arme-o.sh, Dokument, Workflow
        (Seed 226, VORGABE 0, Seeds des Selbstspiels) und Ergebnisskript
        stimmen überein; mit sechs Vorgabesteinen spielt M0 wie D, ohne
        Vorgabe nicht, MW0 spielt als Schwarz wie D (Attrappe); der Bericht
        urteilt nur über M0 und M50 und zeigt die Wirkung je Farbe.
    11. Siege (docs/muster-fuego-siege.md, docs/muster-ohne-vorgabe.md §10):
        siege-gepaart.js zählt die Paare und urteilt nach McNemar, die
        Tabelle in §10 ist genau seine Ausgabe; gerade-wahl.js wählt die
        Spielzahl nach der vorab festgelegten Regel; FUEGO_SPIELE in
        spielen.sh; Dokument, Workflow und Ergebnisskript des Prüfstands
        stimmen überein.

   Aufruf:  node tests/komponenten.js */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os');
const {execFileSync, spawnSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests} = require('./rahmen');
const K = require('../auswertung/komponenten/bericht.js');

const wurzel = path.join(__dirname, '..');
const SPIELEN = path.join(wurzel, 'auswertung', 'komponenten', 'spielen.sh');
const ordner = fs.mkdtempSync(path.join(os.tmpdir(), 'komponenten-'));
const programm = path.join(ordner, 'attrappe');
fs.writeFileSync(programm, `#!/bin/sh\nexec "${process.execPath}" "${path.join(__dirname, 'gtp-attrappe.js')}" "$@"\n`, {mode: 0o755});

const ARME = ['D', 'B', 'N0', 'M0', 'NM0', 'R0'];
const NEUN = ['musterGewicht', 'endspielNetz', 'raveEnabled', 'mctsTreeReuse', 'wurzelFrisch', 'endTieBreak', 'mctsPriorSharp', 'bensonEval', 'bensonMoveFilter'];
const armKi = Object.fromEntries(execFileSync('bash', ['-c', `source "${path.join(wurzel, 'auswertung', 'komponenten', 'arme.sh')}"; echo "\${ARM_REIHE[*]}"; for a in "\${ARM_REIHE[@]}"; do echo "$a=\${ARM_KI[$a]}"; done`], {encoding: 'utf8'})
  .trim().split('\n').slice(1).map(z => [z.slice(0, z.indexOf('=')), z.slice(z.indexOf('=') + 1)]));
const zerlege = s => Object.fromEntries(s ? s.split(',').map(kv => kv.split('=')) : []);
const html = fs.readFileSync(path.join(wurzel, 'index.html'), 'utf8');
const standard = name => { const m = new RegExp(`^  ${name}:\\s+([0-9.]+),`, 'm').exec(html); return m ? +m[1] : undefined; };

test('Arme: Parameter mit Default in index.html, B = die neun Zusätze, die übrigen Teile davon', () => {
  pruefeGleich(Object.keys(armKi).join(' '), ARME.join(' '), 'Reihe der Arme');
  pruefeGleich(armKi.D, '', 'D ist der Default');
  const b = zerlege(armKi.B);
  pruefeGleich(Object.keys(b).sort().join(' '), NEUN.slice().sort().join(' '), 'B schaltet genau die neun Zusätze aus');
  for (const a of ARME.slice(1)) for (const [k, w] of Object.entries(zerlege(armKi[a]))) {
    const d = standard(k);
    pruefe(d !== undefined, `${a}: ${k} steht mit Default in index.html`);
    pruefe(+w === 0 && d !== 0, `${a}: ${k}=${w} schaltet ab (Default ${d})`);
    pruefeGleich(b[k], w, `${a}: ${k} wie in B`);
  }
  pruefeGleich(armKi.NM0, 'endspielNetz=0,musterGewicht=0', 'NM0 = N0 und M0');
  for (const k of ['gebietZug', 'deathTransfer', 'augenSchutz', 'leseVerzicht', 'passUnabwendbar']) pruefe(standard(k) > 0 && !(k in b), `${k} bleibt in B an (Default ${standard(k)})`);
});

test('Arme und Partien: Dokument, Workflow und Bericht stimmen überein', () => {
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'komponenten.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'komponenten.yml'), 'utf8');
  const zeilen = [...doc.matchAll(/^\| (D|B|N0|M0|NM0|R0) \| (?:`([^`]*)`|–) \| (\d+) \|/gm)];
  pruefeGleich(zeilen.map(m => m[1]).join(' '), ARME.join(' '), 'Arme im Dokument');
  for (const m of zeilen) pruefeGleich(m[2] || '', armKi[m[1]], `${m[1]}: Abschaltungen wie in arme.sh`);
  const partien = Object.fromEntries(zeilen.map(m => [m[1], +m[3]]));
  const liste = (name, was) => { const s = t.slice(t.indexOf(`\n  ${name}:\n`)); return (new RegExp(`${was}: \\[([^\\]]+)\\]`).exec(s) || [])[1].split(',').map(x => x.trim()); };
  for (const [name, gr] of [['gnugo-gross', 20], ['gnugo-klein', 20], ['fuego-gross', 40], ['fuego-klein', 40]]) {
    const arme = liste(name, 'arm'), von = liste(name, 'von').map(Number);
    pruefe(von.every((v, i) => v === 1 + i * gr), `${name}: Teile zu ${gr} lückenlos ab 1`);
    for (const a of arme) pruefeGleich(von.length * gr, partien[a], `${name}: ${a} spielt so viele Partien wie im Dokument`);
    pruefe(new RegExp(`spielen\\.sh ${name[0]} "\\$ARM" "\\$VON" ${gr} `).test(t.slice(t.indexOf(`\n  ${name}:\n`))), `${name}: ${gr} Partien je Teil`);
  }
  pruefeGleich(['gnugo-gross', 'gnugo-klein'].flatMap(n => liste(n, 'arm')).sort().join(' '), ARME.slice().sort().join(' '), 'jeder Arm gegen GNU Go');
  pruefeGleich(['fuego-gross', 'fuego-klein'].flatMap(n => liste(n, 'arm')).sort().join(' '), ARME.slice().sort().join(' '), 'jeder Arm gegen Fuego');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/spielen\.sh g D 1 15 216 /.test(t) && /SCHAETZUNG: '120,200'/.test(t), 'Kontrolle GNU Go: Seed 216, Partien 1 bis 15, Schätzung wie damals');
  pruefe(/spielen\.sh f D 1 10 219 /.test(t) && /SCHAETZUNG: '60,120,200'/.test(t), 'Kontrolle Fuego: Seed 219, Partien 1 bis 10, Schätzung wie damals');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis.sh'), 'utf8');
  pruefe(e.includes('netz-dosis/lauf1/L8.jsonl.gz') && e.includes('fuego-pruefstand/lauf1/v6-s100.jsonl.gz'), 'Kontrolldateien im Ergebnisskript');
  for (const d of ['docs/daten/netz-dosis/lauf1/L8.jsonl.gz', 'docs/daten/fuego-pruefstand/lauf1/v6-s100.jsonl.gz']) pruefe(fs.existsSync(path.join(wurzel, d)), `${d} liegt im Repo`);
  const sp = fs.readFileSync(SPIELEN, 'utf8');
  pruefe(/vorgabe=\$\{VORGABE:-6\}/.test(sp) && /--vorgabe "\$vorgabe"/.test(sp) && /fuego_spiele=\$\{FUEGO_SPIELE:-100\}/.test(sp) && /--fuego-spiele "\$fuego_spiele"/.test(sp) && /--stufe 1/.test(sp) && /--gnugo-aufgabe 0/.test(sp) && /sims=\$\{SIMS:-120\}/.test(sp) && /mctsFixedSims=\$sims,resignEnabled=0/.test(sp) && /--maxzuege 600/.test(sp) && /40,80,120,200/.test(sp), 'Bedingungen in spielen.sh');
  const imDoc = (/^\| `seed` \| `?([^` |]+)/m.exec(doc) || [])[1];
  const imFlow = (/^      seed:\n(?:        .*\n)*?        default: '([^']*)'/m.exec(t) || [])[1];
  pruefe(imDoc !== undefined && imDoc === imFlow, `Seed: Dokument „${imDoc}“, Workflow „${imFlow}“`);
});

/* Eine Partie gegen die Attrappe mit der --ki-Angabe eines Arms, 20 Simulationen, 84 Züge */
let zaehler = 0;
function partie(arm, gegner) {
  const ki = execFileSync('bash', [SPIELEN, '--ki', arm], {encoding: 'utf8'}).trim() + ',mctsFixedSims=20';
  const aus = path.join(ordner, `roh-${++zaehler}.jsonl`);
  const wer = gegner === 'f' ? ['--gegner', 'fuego', '--fuego', programm] : [];
  execFileSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), ...wer, '--gnugo', programm, '--partien', '1', '--seed', '7',
    '--stufe', '1', '--vorgabe', '6', '--maxzuege', '84', '--schaetzung', '40,80', '--gnugo-aufgabe', '0', '--ki', ki, '--roh', aus],
    {stdio: 'pipe', timeout: 300000});
  return JSON.parse(fs.readFileSync(aus, 'utf8').trim());
}

for (const gegner of ['g', 'f']) {
  test(`D und N0 spielen die ersten 80 Züge gleich (${gegner === 'g' ? 'GNU Go' : 'Fuego'} als Gegner, Attrappe)`, () => {
    const d = partie('D', gegner), n = partie('N0', gegner), b = partie('B', gegner);
    for (const r of [d, n, b]) pruefe(!r.abgebrochen && r.zuege.length === 84, `84 Züge: ${r.abgebrochen || r.zuege.length}`);
    pruefeGleich(n.zuege.slice(0, K.NETZ_AB).join(' '), d.zuege.slice(0, K.NETZ_AB).join(' '), 'erste 80 Züge gleich');
    pruefe(b.zuege.slice(0, K.NETZ_AB).join(' ') !== d.zuege.slice(0, K.NETZ_AB).join(' '), 'B weicht vor Zug 80 ab');
    pruefeGleich(JSON.stringify(n.ki), JSON.stringify({mctsFixedSims: 20, resignEnabled: 0, endspielNetz: 0}), 'N0 schaltet nur das Netz ab');
  });
}

test('Bericht: Intervalle, Wechselwirkung, Unterschied der Gegner, Probe und Kontrolle', () => {
  pruefe(Math.abs(K.tKrit(239, 0.01) - 2.5966) < 1e-3 && Math.abs(K.tKrit(239, 0.05) - 1.9699) < 1e-3, 't-Werte für 99 % und 95 %');
  pruefeGleich(`${K.ALPHA} ${K.ALPHA_I}`, '0.01 0.025', 'alpha 0,05/5 und 0,05/2');
  /* künstliche Arme: D, N0 = D − 10, M0 = D − 20, NM0 = D − 50 (+ Rauschen je Nummer) → I = −20 */
  const rausch = nr => ((nr * 37) % 11) - 5;
  const zuege = ['D4', 'Q16'];
  const arm = f => new Map(Array.from({length: 40}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: f(nr) > 0, schaetzung: {40: f(nr) / 2}, zuege}]));
  const D = arm(nr => 20 + 3 * rausch(nr)), N0 = arm(nr => 10 + 3 * rausch(nr) + rausch(nr + 1)), M0 = arm(nr => 0 + 3 * rausch(nr) - rausch(nr + 2));
  const NM0 = arm(nr => -30 + 3 * rausch(nr) + rausch(nr + 1) - rausch(nr + 2));
  const a = K.auswertung({g: {D, N0, M0, NM0}});
  const v = Object.fromEntries(a.gegner.g.vergleiche.map(x => [x.arm, x]));
  pruefe(Math.abs(v.NM0.g.m - (-50)) < 0.5 && v.NM0.g.n === 40, `NM0 − D ≈ −50: ${v.NM0.g.m}`);
  pruefe(v.N0.g.lo < v.N0.g.m && v.N0.g.hi > v.N0.g.m, 'Intervall um die Differenz');
  pruefe(Math.abs(a.gegner.g.wechselwirkung.m - (-20)) < 1e-9, `I = −50 − (−10) − (−20) = −20: ${a.gegner.g.wechselwirkung.m}`);
  pruefeGleich(`${v.N0.anfang.gleich} ${v.N0.anfang.n}`, '40 40', 'Probe der ersten 80 Züge');
  pruefe(Math.abs(v.N0.phasen[40].m - (-5)) < 0.5, `Phase Zug 40: ${v.N0.phasen[40].m}`);
  /* abgebrochen oder ohne Endstand: Partie fällt samt Partner heraus */
  N0.get(3).abgebrochen = 'x'; delete M0.get(4).endstand;
  const a2 = K.auswertung({g: {D, N0, M0, NM0}});
  pruefeGleich(a2.gegner.g.vergleiche.find(x => x.arm === 'N0').g.n, 39, 'abgebrochene Partie fällt heraus');
  pruefeGleich(a2.gegner.g.wechselwirkung.n, 38, 'Wechselwirkung nur über Nummern, die in allen vier Armen fertig sind');
  /* zwei Gegner: Unterschied f − g */
  const Df = arm(nr => 5 + 3 * rausch(nr)), N0f = arm(nr => 5 + 3 * rausch(nr) + rausch(nr + 1));
  const a3 = K.auswertung({g: {D, N0: arm(nr => 10 + 3 * rausch(nr) + rausch(nr + 1))}, f: {D: Df, N0: N0f}});
  const u = a3.unterschied.find(x => x.arm === 'N0');
  pruefe(Math.abs(u.m - 10) < 1e-9 && u.lo < 10 && u.hi > 10, `Δ_f − Δ_g = 0 − (−10) = +10: ${u.m} [${u.lo}; ${u.hi}]`);
  const md = K.text(a3, {f: {gleich: 9, erwartet: 10, ok: false}});
  pruefe(/Unterschied der Gegner/.test(md) && /NICHT bestanden/.test(md) && /99 %/.test(md), 'Bericht nennt Unterschied und Kontrolle');
  pruefe(!/Kandidat|verworfen|besser|schlechter/.test(md), 'Bericht urteilt nicht');
});

test('spielen.sh lehnt falsche Eingaben ab', () => {
  const s = (...x) => spawnSync('bash', [SPIELEN, ...x], {cwd: ordner, encoding: 'utf8'});
  pruefeGleich(s('x', 'D', '1', '20', '220', 'a.jsonl').status, 2, 'Gegner x');
  pruefeGleich(s('g', 'X', '1', '20', '220', 'a.jsonl').status, 2, 'Arm X');
  pruefeGleich(s('g', 'D', '1', 'viel', '220', 'a.jsonl').status, 2, 'Anzahl keine Zahl');
  pruefeGleich(s('g', 'D', '1', '20', '220').status, 1, 'Ausgabedatei fehlt');
  const k = spawnSync('bash', [SPIELEN, 'g', 'D', '1', '20', '220', 'a.jsonl'], {cwd: ordner, encoding: 'utf8', env: {...process.env, SCHAETZUNG: '40;rm'}});
  pruefeGleich(k.status, 2, 'Schätzung mit fremden Zeichen');
  pruefeGleich(execFileSync('bash', [SPIELEN, '--ki', 'R0'], {encoding: 'utf8'}).trim(), 'mctsFixedSims=120,resignEnabled=0,raveEnabled=0', '--ki R0');
});

/* ── Stufe B (docs/komponenten-b.md) ─────────────────────────────────── */
const ARME_B = path.join(wurzel, 'auswertung', 'komponenten', 'arme-b.sh');
const armKiB = Object.fromEntries(execFileSync('bash', ['-c', `source "${ARME_B}"; for a in "\${ARM_REIHE[@]}"; do echo "$a=\${ARM_KI[$a]}"; done`], {encoding: 'utf8'})
  .trim().split('\n').map(z => [z.slice(0, z.indexOf('=')), z.slice(z.indexOf('=') + 1)]));
const SIEBEN = NEUN.filter(k => k !== 'musterGewicht' && k !== 'endspielNetz');

test('Stufe B, Arme: jeder Einzelarm schaltet genau einen der sieben ab, O7 alle sieben, D und R0 wie in Stufe A', () => {
  pruefeGleich(Object.keys(armKiB).join(' '), 'D R0 T0 W0 E0 P0 BE0 BF0 O7', 'Reihe der Arme');
  pruefeGleich(`${armKiB.D}|${armKiB.R0}`, `${armKi.D}|${armKi.R0}`, 'D und R0 wie in Stufe A');
  const einzeln = ['R0', 'T0', 'W0', 'E0', 'P0', 'BE0', 'BF0'].map(a => zerlege(armKiB[a]));
  for (const [i, e] of einzeln.entries()) {
    pruefeGleich(Object.keys(e).length, 1, `${Object.keys(armKiB)[i + 1]}: genau eine Abschaltung`);
    for (const [k, w] of Object.entries(e)) pruefe(SIEBEN.includes(k) && +w === 0 && standard(k) > 0, `${k}=${w} ist einer der sieben und schaltet ab (Default ${standard(k)})`);
  }
  pruefeGleich(einzeln.map(e => Object.keys(e)[0]).sort().join(' '), SIEBEN.slice().sort().join(' '), 'die Einzelarme decken die sieben ab');
  const b = zerlege(armKi.B); delete b.musterGewicht; delete b.endspielNetz;
  pruefeGleich(JSON.stringify(zerlege(armKiB.O7), Object.keys(b).sort()), JSON.stringify(b, Object.keys(b).sort()), 'O7 = B aus Stufe A ohne Netz und Muster');
  pruefeGleich(execFileSync('bash', [SPIELEN, '--ki', 'P0'], {encoding: 'utf8', env: {...process.env, ARME: ARME_B}}).trim(), 'mctsFixedSims=120,resignEnabled=0,mctsPriorSharp=0', 'spielen.sh liest ARME');
  pruefeGleich(spawnSync('bash', [SPIELEN, '--ki', 'D'], {encoding: 'utf8', env: {...process.env, ARME: path.join(ordner, 'fehlt.sh')}}).status, 2, 'fehlende Datei der Arme');
});

test('Stufe B, Dokument, Workflow und Ergebnisskript stimmen überein', () => {
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'komponenten-b.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'komponenten-b.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-b.sh'), 'utf8');
  const zeilen = [...doc.matchAll(/^\| (D|R0|T0|W0|E0|P0|BE0|BF0|O7) \| (?:`([^`]*)`|–) \| (\d+) \|/gm)];
  pruefeGleich(zeilen.map(m => m[1]).join(' '), Object.keys(armKiB).join(' '), 'Arme im Dokument');
  for (const m of zeilen) pruefeGleich(m[2] || '', armKiB[m[1]], `${m[1]}: Abschaltung wie in arme-b.sh`);
  const partien = Object.fromEntries(zeilen.map(m => [m[1], +m[3]]));
  pruefeGleich(`${partien.D} ${partien.R0}`, '480 240', 'D und R0 so viele Partien wie in Stufe A');
  const liste = (name, was) => { const x = t.slice(t.indexOf(`\n  ${name}:\n`)); return (new RegExp(`${was}: \\[([^\\]]+)\\]`).exec(x) || [])[1].split(',').map(v => v.trim()); };
  for (const [name, gr] of [['gnugo', 20], ['fuego', 40]]) {
    pruefeGleich(liste(name, 'arm').join(' '), 'T0 W0 E0 P0 BE0 BF0 O7', `${name}: die sieben neuen Arme, nicht D und R0`);
    const von = liste(name, 'von').map(Number);
    pruefe(von.every((v, i) => v === 1 + i * gr) && von.length * gr === 480, `${name}: Teile zu ${gr}, zusammen 480`);
    pruefe(new RegExp(`spielen\\.sh ${name[0]} "\\$ARM" "\\$VON" ${gr} "\\$SEED"`).test(t), `${name}: ${gr} Partien je Teil mit dem festen Seed`);
  }
  pruefe(!/inputs:/.test(t) && /^  SEED: '220'$/m.test(t) && /^  ARME: auswertung\/komponenten\/arme-b\.sh$/m.test(t), 'fester Seed 220, keine Eingaben, Arme aus arme-b.sh');
  const seedB = (/^\| `seed` \| `?([^` |]+)/m.exec(doc) || [])[1];
  const seedA = (/^\| `seed` \| `?([^` |]+)/m.exec(fs.readFileSync(path.join(wurzel, 'docs', 'komponenten.md'), 'utf8')) || [])[1];
  pruefe(seedB === '220' && seedA === '220', `Seed im Dokument ${seedB}, in Stufe A ${seedA}`);
  pruefe(/spielen\.sh g D 1 20 "\$SEED" /.test(t) && /spielen\.sh f D 1 20 "\$SEED" /.test(t), 'Kontrollen: D, Partien 1 bis 20');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/for alt in D R0/.test(e) && /--stufe B/.test(e), 'Ergebnisskript nimmt D und R0 aus Stufe A und rechnet Stufe B');
  for (const o of ['g', 'f']) for (const a of ['D', 'R0']) pruefe(fs.existsSync(path.join(wurzel, 'docs', 'daten', 'komponenten', 'lauf1', `${o}-${a}.jsonl.gz`)), `Stufe A: ${o}-${a} liegt im Repo`);
});

test('Stufe B, Bericht: alpha 0,05/8, Wechselwirkung über die sieben, erste Abweichung', () => {
  pruefeGleich(K.STUFEN.B.alpha, 0.05 / 8, 'alpha 0,05/8');
  pruefeGleich(K.STUFEN.B.vergleiche.join(' '), 'R0 T0 W0 E0 P0 BE0 BF0 O7', 'acht Vergleiche');
  pruefeGleich(`${K.ersteAbweichung(['a', 'b', 'c'], ['a', 'x', 'c'])} ${K.ersteAbweichung(['a', 'b'], ['a', 'b'])} ${K.ersteAbweichung(['a'], ['a', 'b'])}`, '2 null 2', 'erste Abweichung');
  const zuege = n => Array.from({length: 10}, (_, i) => i < n ? 'D4' : 'Q16');
  const arm = (f, ab = 10) => new Map(Array.from({length: 30}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: f(nr) > 0, schaetzung: {}, zuege: zuege(ab)}]));
  const r = nr => ((nr * 13) % 7) - 3;
  const D = arm(nr => 10 + 4 * r(nr));
  const daten = {D};
  const sieben = ['R0', 'T0', 'W0', 'E0', 'P0', 'BE0', 'BF0'];
  sieben.forEach((a, i) => { daten[a] = arm(nr => 10 + 4 * r(nr) - (i + 1), 3 + i); });
  daten.O7 = arm(nr => 10 + 4 * r(nr) - 40, 2);   /* Summe der sieben: −28, zusammen −40 → I = −12 */
  const a = K.auswertung({g: daten}, 'B');
  pruefe(Math.abs(a.gegner.g.wechselwirkung.m - (-12)) < 1e-9, `I = −40 − (−28) = −12: ${a.gegner.g.wechselwirkung.m}`);
  const p0 = a.gegner.g.vergleiche.find(v => v.arm === 'P0');
  pruefe(Math.abs(p0.g.m - (-5)) < 1e-9 && p0.abweichung === 8, `P0: −5, weicht ab Zug 8 ab: ${p0.g.m}, ${p0.abweichung}`);
  pruefe(/0,05\/8 \(99,4 %\)/.test(K.text(a)) && /Δ_O7 − Δ_R0 − Δ_T0/.test(K.text(a)), 'Bericht nennt alpha und die Wechselwirkung');
  pruefeGleich(K.auswertung({g: daten}).gegner.g.vergleiche.map(v => v.arm).join(' '), 'R0', 'ohne Stufe B: nur die Arme von Stufe A (hier R0)');
});

/* ── Muster-Eröffnung (docs/muster-eroeffnung.md) ─────────────────────── */
const ARME_M = path.join(wurzel, 'auswertung', 'komponenten', 'arme-m.sh');
const armKiM = Object.fromEntries(execFileSync('bash', ['-c', `source "${ARME_M}"; for a in "\${ARM_REIHE[@]}"; do echo "$a=\${ARM_KI[$a]}"; done`], {encoding: 'utf8'})
  .trim().split('\n').map(z => [z.slice(0, z.indexOf('=')), z.slice(z.indexOf('=') + 1)]));

test('Muster-Eröffnung: Arme, Schalter, Dokument, Workflow und Ergebnisskript stimmen überein', () => {
  pruefeGleich(Object.keys(armKiM).join(' '), 'D M0 A40 A80', 'Reihe der Arme');
  pruefeGleich(`${armKiM.D}|${armKiM.M0}`, `${armKi.D}|${armKi.M0}`, 'D und M0 wie in Stufe A');
  pruefeGleich(`${armKiM.A40}|${armKiM.A80}`, 'musterAb=40|musterAb=80', 'A40 und A80');
  pruefeGleich(standard('musterAb'), 0, 'musterAb steht mit Default 0 in index.html');
  pruefe(/let mg = mc >= PARAMS\.musterAb \? PARAMS\.musterGewicht : 0;/.test(html), 'der Schalter wirkt an der Wurzel');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-eroeffnung.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'muster-eroeffnung.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-m.sh'), 'utf8');
  const zeilen = [...doc.matchAll(/^\| (D|M0|A40|A80) \| (?:`([^`]*)`|–) \| (\d+) \|/gm)];
  pruefeGleich(zeilen.map(m => m[1]).join(' '), 'D M0 A40 A80', 'Arme im Dokument');
  for (const m of zeilen) pruefe((m[2] || '') === armKiM[m[1]] && +m[3] === 480, `${m[1]}: Angabe und 480 Partien wie in arme-m.sh`);
  const liste = (name, was) => { const x = t.slice(t.indexOf(`\n  ${name}:\n`)); return (new RegExp(`${was}: \\[([^\\]]+)\\]`).exec(x) || [])[1].split(',').map(v => v.trim()); };
  for (const [name, gr] of [['gnugo', 20], ['fuego', 40]]) {
    pruefeGleich(liste(name, 'arm').join(' '), 'A40 A80', `${name}: nur die neuen Arme`);
    const von = liste(name, 'von').map(Number);
    pruefe(von.every((v, i) => v === 1 + i * gr) && von.length * gr === 480, `${name}: Teile zu ${gr}, zusammen 480`);
  }
  pruefeGleich(`${liste('selbstspiel', 'arm').join(' ')} | ${liste('selbstspiel', 'teil').length}`, 'A40 A80 | 12', 'Selbstspiel: beide Arme, zwölf Teile');
  pruefe(/OHNE_AUFGABE: '1'/.test(t) && /ARME_DATEI: auswertung\/komponenten\/arme-m\.sh/.test(t), 'Selbstspiel ohne Aufgabe, Arme aus arme-m.sh');
  pruefe(!/inputs:/.test(t) && /^  SEED: '220'$/m.test(t) && /^  ARME: auswertung\/komponenten\/arme-m\.sh$/m.test(t), 'fester Seed 220, keine Eingaben');
  for (const [arm, seed] of [['A40', '20262201'], ['A80', '20262301']]) {
    pruefe(new RegExp(`SEED_M2_${arm}: '${seed}'`).test(t) && doc.includes(`**${seed}**`), `M2-Seed von ${arm}: ${seed} in Workflow und Dokument`);
  }
  pruefe(/spielen\.sh g D 1 20 "\$SEED" /.test(t) && /spielen\.sh f D 1 20 "\$SEED" /.test(t), 'Kontrollen: D, Partien 1 bis 20');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/for alt in D M0/.test(e) && /--stufe M/.test(e) && /--partien 360/.test(e), 'Ergebnisskript: D und M0 aus Stufe A, Stufe M, 360 Partien im Selbstspiel');
  pruefeGleich(execFileSync('bash', [SPIELEN, '--ki', 'A40'], {encoding: 'utf8', env: {...process.env, ARME: ARME_M}}).trim(), 'mctsFixedSims=120,resignEnabled=0,musterAb=40', 'spielen.sh --ki A40');
});

test('Muster-Eröffnung, Bericht: alpha 0,05/2, Probe gegen M0, Urteil über M1', () => {
  pruefeGleich(K.STUFEN.M.alpha, 0.025, 'alpha 0,05/2');
  const zuege = n => Array.from({length: 100}, (_, i) => i < n ? 'D4' : 'Q16');
  const arm = (f, ab = 100) => new Map(Array.from({length: 40}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: f(nr) > 0, schaetzung: {}, zuege: zuege(ab)}]));
  const r = nr => ((nr * 13) % 7) - 3;
  const D = arm(nr => 10 + 4 * r(nr), 100), M0 = arm(nr => 12 + 4 * r(nr), 10);
  const A40 = arm(nr => 30 + 4 * r(nr) + r(nr + 1), 60), A80 = arm(nr => 12 + 4 * r(nr) + 6 * r(nr + 2), 5);
  /* M0 spielt nur bis Zug 10 wie A40 und A80: die Probe muss jedes Paar als abweichend zählen */
  const daten = {g: {D, M0, A40, A80}, f: {D, M0, A40: arm(nr => 25 + 4 * r(nr) + r(nr + 3), 60), A80}};
  const a = K.auswertung(daten, 'M');
  pruefeGleich(a.urteile.map(u => `${u.arm}:${u.urteil}`).join(' '), 'A40:besser gegen beide Gegner A80:nicht belegt', 'Urteile');
  const p = a.gegner.g.proben;
  pruefeGleich(p.map(x => `${x.arm}/${x.ref}/${x.zuege}:${x.gleich}`).join(' '), 'A40/M0/40:0 A80/M0/80:0', 'Probe zählt Abweichungen');
  const gleichM0 = arm(nr => 30 + 4 * r(nr) + r(nr + 1), 10);
  pruefeGleich(K.probe({A40: gleichM0, M0}, 'A40', 'M0', 40).gleich, 40, 'gleiche erste 40 Züge: alle Paare');
  const schlecht = K.auswertung({g: {D, A40: arm(nr => -10 + 4 * r(nr) + r(nr + 1))}, f: {D, A40}}, 'M');
  pruefeGleich(schlecht.urteile[0].urteil, 'schlechter', 'gegen einen Gegner schlechter: schlechter');
  pruefeGleich(K.auswertung({g: {D, A40}}, 'M').urteile[0].urteil, 'unvollständig', 'ein Gegner fehlt: unvollständig');
  const md = K.text(a);
  pruefe(/0,05\/2 \(97,5 %\)/.test(md) && /Urteil über M1/.test(md) && !/Wechselwirkung/.test(md), 'Bericht: alpha, Urteil, keine Wechselwirkung');
});

/* ── Baum-Übernahme (docs/baum-uebernahme.md) ────────────────────────── */
test('Baum-Übernahme: Arme, Dokument, Workflow und Ergebnisskript stimmen überein', () => {
  const ARME_T = path.join(wurzel, 'auswertung', 'komponenten', 'arme-t.sh');
  const ki = arm => execFileSync('bash', [SPIELEN, '--ki', arm], {encoding: 'utf8', env: {...process.env, ARME: ARME_T}}).trim();
  pruefeGleich(`${ki('D')} | ${ki('T0')}`, 'mctsFixedSims=120,resignEnabled=0 | mctsFixedSims=120,resignEnabled=0,mctsTreeReuse=0', 'Arme D und T0');
  pruefeGleich(execFileSync('bash', [SPIELEN, '--ki', 'T0'], {encoding: 'utf8', env: {...process.env, ARME: ARME_T, SIMS: '600'}}).trim(), 'mctsFixedSims=600,resignEnabled=0,mctsTreeReuse=0', 'SIMS 600');
  for (const v of ['0', 'x', '200000']) pruefeGleich(spawnSync('bash', [SPIELEN, '--ki', 'D'], {encoding: 'utf8', env: {...process.env, SIMS: v}}).status, 2, `SIMS ${v} abgelehnt`);
  pruefeGleich(standard('mctsTreeReuse'), 1, 'Default heute 1');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'baum-uebernahme.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'baum-uebernahme.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-t.sh'), 'utf8');
  const liste = (name, was) => { const x = t.slice(t.indexOf(`\n  ${name}:\n`)); return (new RegExp(`${was}: \\[([^\\]]+)\\]`).exec(x) || [])[1].split(',').map(v => v.trim()); };
  const zeile = sims => (new RegExp(`^\\| [^|]+ \\| ${sims} \\| (\\d+) \\| GNU Go (\\d+) zu (\\d+), Fuego (\\d+) zu (\\d+) \\|$`, 'm').exec(doc) || []).slice(1).map(Number);
  for (const [sims, gn, fn] of [[120, 'gnugo-120', 'fuego-120'], [600, 'gnugo-600', 'fuego-600']]) {
    const [paare, gt, gg, ft, fg] = zeile(sims);
    pruefe(gt * gg === paare && ft * fg === paare, `${sims} Simulationen: Teile im Dokument ergeben ${paare} Paare`);
    for (const [name, teile, gr] of [[gn, gt, gg], [fn, ft, fg]]) {
      pruefeGleich(liste(name, 'arm').join(' '), 'D T0', `${name}: Arme`);
      const von = liste(name, 'von').map(Number);
      pruefe(von.length === teile && von.every((v, i) => v === 1 + i * gr), `${name}: ${teile} Teile zu ${gr}`);
      const x = t.slice(t.indexOf(`\n  ${name}:\n`));
      pruefe(new RegExp(`spielen\\.sh ${name[0]} "\\$ARM" "\\$VON" ${gr} "\\$SEED" "stand/s${sims}-`).test(x), `${name}: ${gr} Partien je Teil, Dateien s${sims}`);
      pruefe(sims === 600 ? /SIMS: '600'/.test(x.slice(0, x.indexOf('Partien sichern'))) : !/SIMS:/.test(x.slice(0, x.indexOf('Partien sichern'))), `${name}: Simulationen ${sims}`);
    }
  }
  pruefe(!/inputs:/.test(t) && /^  SEED: '221'$/m.test(t) && /^  SEED_M2: '20262401'$/m.test(t) && doc.includes('**221**') && doc.includes('**20262401**'), 'Seeds 221 und 20262401 in Workflow und Dokument');
  pruefe(/spielen\.sh g D 1 20 220 /.test(t) && /spielen\.sh f D 1 20 220 /.test(t), 'Kontrollen mit Seed 220');
  pruefe(/selbstspiel-spielen\.sh T0 "\$TEIL" "\$SEED_M2"/.test(t) && /ARME_DATEI: auswertung\/komponenten\/arme-t\.sh/.test(t), 'Selbstspiel T0 gegen D');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/sammle 120 g 30 32/.test(e) && /sammle 120 f 60 16/.test(e) && /sammle 600 g 8 30/.test(e) && /sammle 600 f 15 16/.test(e) && /--stufe T /.test(e) && /--stufe T6 /.test(e), 'Ergebnisskript sammelt die Teile wie der Workflow');
});

test('Baum-Übernahme, Bericht: Nichtunterlegenheit mit Grenze −10, bei 600 Simulationen −20 und Mittelwert über −5', () => {
  pruefeGleich(`${K.STUFEN.T.alpha} ${K.STUFEN.T.ni.grenze} ${K.STUFEN.T6.ni.grenze} ${K.STUFEN.T6.ni.punkt}`, '0.05 -10 -20 -5', 'Stufen T und T6');
  const v = (lo, m) => ({vergleiche: [{arm: 'T0', g: {lo, m, hi: m + 5}}]});
  pruefeGleich(K.urteilNI({g: v(-9, -4), f: v(-8, 0)}, 'T0', K.STUFEN.T.ni), 'nicht unterlegen gegen beide Gegner', 'beide über −10');
  pruefeGleich(K.urteilNI({g: v(-11, -6), f: v(-8, 0)}, 'T0', K.STUFEN.T.ni), 'Nichtunterlegenheit nicht gezeigt', 'GNU Go unter −10');
  pruefeGleich(K.urteilNI({g: v(-15, -6), f: v(-12, -2)}, 'T0', K.STUFEN.T6.ni), 'Nichtunterlegenheit nicht gezeigt', '600: Mittelwert −6 unter −5');
  pruefeGleich(K.urteilNI({g: v(-15, -4), f: v(-12, -2)}, 'T0', K.STUFEN.T6.ni), 'nicht unterlegen gegen beide Gegner', '600: über −20, Mittel über −5');
  pruefeGleich(K.urteilNI({g: v(-9, -4)}, 'T0', K.STUFEN.T.ni), 'unvollständig', 'ein Gegner fehlt');
  const r = nr => ((nr * 13) % 7) - 3;
  const arm = f => new Map(Array.from({length: 30}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: f(nr) > 0, schaetzung: {}, zuege: ['D4']}]));
  const D = arm(nr => 4 * r(nr)), T0 = arm(nr => 4 * r(nr) + r(nr + 1));
  const md = K.text(K.auswertung({g: {D, T0}, f: {D, T0}}, 'T'));
  pruefe(/\(95 %\)/.test(md) && /Nichtunterlegenheit \(Grenze −10,0; vorab festgelegt\)/.test(md) && /nicht unterlegen gegen beide Gegner/.test(md), 'Bericht nennt Grenze und Urteil');
});

test('Selbstspiel-Diagnose: Sicht von B, Komi, knappe Niederlagen, Farbe; Tabellen im Dokument', () => {
  const S = require('../auswertung/komponenten/selbstspiel-diagnose.js');
  pruefeGleich(S.differenz('B 188 : W 180.5'), 7.5, 'Stand lesen');
  const g = (b, w) => ({b, w});
  const p = (aIst, stand, stand0, sieger, sieger0, m150) => ({aIst, stand, standKomi0: stand0, sieger, siegerKomi0: sieger0,
    gebietOhneKomi: {M150: m150, M200: m150, M250: m150}, verlust: {A: {summe: 10}, B: {summe: 20}}});
  const d = S.diagnose([
    p('Weiß', 'B 190 : W 180.5', 'B 190 : W 173.0', 'B', 'B', g(80, 70)),    // B Schwarz, +9,5
    p('Schwarz', 'B 185 : W 176.5', 'B 185 : W 169.0', 'A', 'A', g(80, 70)), // B Weiß, −8,5
    p('Schwarz', 'B 180 : W 181.5', 'B 180 : W 174.0', 'B', 'A', g(70, 80)), // B Weiß, +1,5; kippt gegen B
    p('Weiß', 'B 178 : W 183.5', 'B 178 : W 176.0', 'A', 'B', g(70, 80))     // B Schwarz, −5,5; kippt für B
  ]);
  pruefeGleich(`${d.siege} ${d.siegeKomi0} ${d.gekippt} ${d.gekipptFuerB}`, '2 2 2 1', 'Komi');
  pruefeGleich(`${d.niederlagen} ${d.knapp} ${d.medianNiederlage} ${d.schranke}`, '2 1 -7 0.75', 'knappe Niederlagen und Schranke');
  pruefeGleich(`${d.farbe.Schwarz.siege} ${d.farbe.Schwarz.mittel} ${d.farbe.Weiß.mittel} ${d.schwarzWeiss.m}`, '1 2 -3.5 5.5', 'Farbe');
  pruefeGleich(`${d.verlauf.M150.mittel} ${d.verlauf.M150.vorn} ${d.verlust.B}`, '0 2 20', 'Verlauf');
  const daten = path.join(wurzel, 'docs/daten/muster-eroeffnung/lauf1');
  const aus = execFileSync('node', [path.join(wurzel, 'auswertung/komponenten/selbstspiel-diagnose.js'),
    `A40=${daten}/m2-A40.jsonl.gz`, `A80=${daten}/m2-A80.jsonl.gz`], {encoding: 'utf8'});
  const doc = fs.readFileSync(path.join(wurzel, 'docs/muster-eroeffnung.md'), 'utf8');
  const fehlt = aus.split('\n').filter(z => z.trim() && !doc.includes(z));
  pruefeGleich(fehlt.length, 0, 'Tabellen im Dokument = Ausgabe des Skripts' + (fehlt.length ? ': ' + fehlt[0] : ''));
});

/* ── Leeres Brett (docs/leeres-brett.md) ─────────────────────────────── */
const ARME_L = path.join(wurzel, 'auswertung', 'komponenten', 'arme-l.sh');
const kiL = arm => execFileSync('bash', [SPIELEN, '--ki', arm], {encoding: 'utf8', env: {...process.env, ARME: ARME_L}}).trim();

test('Leeres Brett: Arme, Dokument, Workflow und Ergebnisskript stimmen überein', () => {
  pruefeGleich(['D', 'M0', 'N0', 'A80'].map(kiL).join(' | '), 'mctsFixedSims=120,resignEnabled=0 | mctsFixedSims=120,resignEnabled=0,musterGewicht=0 | mctsFixedSims=120,resignEnabled=0,endspielNetz=0 | mctsFixedSims=120,resignEnabled=0,musterAb=80', 'Arme');
  pruefe(standard('musterGewicht') > 0 && standard('endspielNetz') > 0 && standard('musterAb') === 0, 'Defaults: Muster und Netz an, musterAb 0');
  for (const v of ['1', '10', 'x']) pruefeGleich(spawnSync('bash', [SPIELEN, 'g', 'D', '1', '20', '222', 'a.jsonl'], {cwd: ordner, encoding: 'utf8', env: {...process.env, VORGABE: v}}).status, 2, `VORGABE ${v} abgelehnt`);
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'leeres-brett.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'leeres-brett.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-l.sh'), 'utf8');
  const zeilen = [...doc.matchAll(/^\| (D|M0|N0|A80) \| (?:`([^`]*)`|–) \| (\d+) \|/gm)];
  pruefeGleich(zeilen.map(m => m[1]).join(' '), 'D M0 N0 A80', 'Arme im Dokument');
  for (const m of zeilen) pruefeGleich(`mctsFixedSims=120,resignEnabled=0${m[2] ? ',' + m[2] : ''}`, kiL(m[1]), `${m[1]}: wie in arme-l.sh`);
  const liste = was => (new RegExp(`${was}: \\[([^\\]]+)\\]`).exec(t) || [])[1].split(',').map(x => x.trim());
  pruefeGleich(liste('arm').join(' '), 'D M0 N0 A80', 'Arme im Workflow');
  const von = liste('von').map(Number);
  pruefe(von.length === 16 && von.every((v, i) => v === 1 + i * 30), '16 Teile zu 30 lückenlos ab 1');
  for (const m of zeilen) pruefeGleich(+m[3], von.length * 30, `${m[1]}: Partien wie im Dokument`);
  pruefe(/spielen\.sh g "\$ARM" "\$VON" 30 "\$SEED" "stand\/g-\$ARM-\$VON\.jsonl"/.test(t), '30 Partien je Teil');
  pruefe(!/inputs:/.test(t) && /^  SEED: '222'$/m.test(t) && /^  VORGABE: '0'$/m.test(t) && /^  ARME: auswertung\/komponenten\/arme-l\.sh$/m.test(t), 'Seed 222, VORGABE 0 und arme-l.sh im Workflow');
  pruefe(/^\| `seed` \| 222 \|$/m.test(doc) && doc.includes('Seed **222**') && doc.includes('98,3 %'), 'Seed und Niveau im Dokument');
  pruefe(/spielen\.sh g D 1 20 "\$SEED" stand\/kontrolle-g\.jsonl/.test(t), 'Kontrolle: D, Partien 1 bis 20, gleicher Seed');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefe(/for arm in D M0 N0 A80/.test(e) && /i < 16; i\+\+/.test(e) && /1 \+ i \* 30/.test(e) && /--stufe L /.test(e), 'Ergebnisskript sammelt die Teile wie der Workflow');
  pruefe(/komponenten\/lauf1/.test(e) && /muster-eroeffnung\/lauf1/.test(e) && /v:A80=\$m\/g-A80\.jsonl\.gz/.test(e), 'Bedingung mit sechs Steinen aus Stufe A und der Muster-Eröffnung');
  for (const d of ['komponenten/lauf1/g-D.jsonl.gz', 'komponenten/lauf1/g-M0.jsonl.gz', 'komponenten/lauf1/g-N0.jsonl.gz', 'muster-eroeffnung/lauf1/g-A80.jsonl.gz']) pruefe(fs.existsSync(path.join(wurzel, 'docs', 'daten', d)), `${d} liegt im Repo`);
});

test('Leeres Brett, Attrappe: Farben wechseln, N0 wie D und A80 wie M0 in den ersten 80 Zügen, geschlagene Steine', () => {
  const spiel = (arm, nr) => {
    const aus = path.join(ordner, `leer-${arm}-${nr}.jsonl`);
    execFileSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), '--gnugo', programm, '--partien', '1', '--von', String(nr), '--seed', '222',
      '--stufe', '1', '--vorgabe', '0', '--maxzuege', '84', '--schaetzung', '40,80', '--gnugo-aufgabe', '0', '--ki', kiL(arm) + ',mctsFixedSims=20', '--roh', aus],
      {stdio: 'pipe', timeout: 300000});
    return JSON.parse(fs.readFileSync(aus, 'utf8').trim());
  };
  const d = spiel('D', 2), n = spiel('N0', 2), m = spiel('M0', 2), a = spiel('A80', 2), w = spiel('D', 3);
  for (const r of [d, n, m, a, w]) pruefe(!r.abgebrochen && r.zuege.length === 84 && r.vorgabe === 0 && r.komi === 7.5, `ohne Vorgabe, Komi 7,5, 84 Züge: ${r.abgebrochen || r.zuege.length}`);
  pruefeGleich(`${d.wirFarbe} ${w.wirFarbe}`, 'S W', 'gerade Partie Schwarz, ungerade Weiß');
  pruefeGleich(n.zuege.slice(0, 80).join(' '), d.zuege.slice(0, 80).join(' '), 'N0 wie D bis Zug 80');
  pruefeGleich(a.zuege.slice(0, 80).join(' '), m.zuege.slice(0, 80).join(' '), 'A80 wie M0 bis Zug 80');
  pruefe(m.zuege.slice(0, 80).join(' ') !== d.zuege.slice(0, 80).join(' '), 'M0 weicht vor Zug 80 von D ab');
  pruefe([d, n, m, a, w].every(r => r.gefangen && Number.isInteger(r.gefangen.wir) && Number.isInteger(r.gefangen.gegner)), 'jeder Datensatz nennt die geschlagenen Steine');
});

test('Leeres Brett, Bericht: alpha 0,05/3, Verteilung, Unterschied der Bedingungen, Urteil', () => {
  pruefeGleich(`${K.STUFEN.L.alpha} ${K.STUFEN.L.vergleiche.join(' ')} ${K.STUFEN.L.leer.selbstspiel}`, `${0.05 / 3} M0 N0 A80 -16.7`, 'Stufe L');
  const v = (arm, lo, hi) => ({g: {vergleiche: [{arm, g: {lo, hi, m: (lo + hi) / 2}}]}});
  pruefeGleich(K.urteilL(v('N0', -80, -60), 'N0'), 'trägt ohne Vorgabe', 'Obergrenze unter 0');
  pruefeGleich(K.urteilL(v('M0', 1, 15), 'M0'), 'Abschalten hilft ohne Vorgabe', 'Untergrenze über 0');
  pruefeGleich(K.urteilL(v('M0', -8, 6), 'M0'), 'kein Beitrag belegt', 'Intervall enthält 0');
  pruefeGleich(K.urteilL(v('A80', -12, -1), 'A80'), 'Schaden auch gegen GNU Go ohne Vorgabe', 'A80: Obergrenze unter 0 geht vor');
  pruefeGleich(K.urteilL(v('A80', -9, 7), 'A80'), 'kein Schaden in der Größe des Selbstspiels', 'A80: Untergrenze über −16,7');
  pruefeGleich(K.urteilL(v('A80', -20, 3), 'A80'), 'offen', 'A80: Untergrenze unter −16,7');
  pruefeGleich(K.urteilL({}, 'A80'), 'unvollständig', 'ohne Daten');
  pruefeGleich([0, 0.25, 0.5, 1].map(q => K.quantil([1, 2, 3, 4, 5], q)).join(' '), '1 2 3 5', 'Quantile');
  const r = nr => ((nr * 13) % 7) - 3;
  const arm = (f, g) => new Map(Array.from({length: 30}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: f(nr) > 0, schaetzung: {}, zuege: ['D4'], ...(g ? {gefangen: {wir: 2, gegner: g}} : {})}]));
  const leer = {D: arm(nr => -100 + 4 * r(nr), 10), M0: arm(nr => -110 + 4 * r(nr) + r(nr + 1), 12), N0: arm(nr => -160 + 4 * r(nr), 20), A80: arm(nr => -100 + 4 * r(nr) + r(nr + 2), 11)};
  const sechs = {D: arm(nr => 20 + 4 * r(nr)), M0: arm(nr => 22 + 4 * r(nr) + r(nr + 1)), N0: arm(nr => -50 + 4 * r(nr)), A80: arm(nr => 23 + 4 * r(nr) + r(nr + 2))};
  const a = K.auswertung({g: leer, v: sechs}, 'L');
  const u = Object.fromEntries(a.unterschied.map(x => [x.arm, x]));
  pruefe(Math.abs(u.M0.m - (-10 - 2)) < 0.5 && Math.abs(u.N0.m - (-60 + 70)) < 0.5, `Δ_g − Δ_v: M0 ${u.M0.m}, N0 ${u.N0.m}`);
  const vt = Object.fromEntries(a.gegner.g.verteilung.map(x => [x.arm, x]));
  pruefeGleich(`${vt.D.n} ${vt.D.verloren} ${vt.N0.verloren} ${vt.D.geschlagen}`, '30 10 20 2', 'Verteilung: Partien, verlorene und geschlagene Steine');
  pruefe(Number.isNaN(a.gegner.v.verteilung[0].verloren), 'ohne Feld gefangen: keine Zahl');
  const md = K.text(a, {g: {gleich: 20, erwartet: 20, ok: true}});
  pruefe(/alpha 0,05\/3 \(98,3 %\)/.test(md) && /## GNU Go Stufe 1, ohne Vorgabe/.test(md) && /## GNU Go Stufe 1, sechs Vorgabesteine/.test(md), 'Niveau und beide Bedingungen');
  pruefe(/\| Arm \| Partien \| Min \| 10 % \| 25 % \| Median \| 75 % \| 90 % \| Max \| SD \| verloren Ø \| geschlagen Ø \|/.test(md), 'Tabelle der Verteilung');
  pruefe(/## Unterschied der Bedingungen/.test(md) && !/Unterschied der Gegner/.test(md) && /## Urteil ohne Vorgabe \(vorab festgelegt\)/.test(md), 'Unterschied der Bedingungen und Urteil');
  pruefe(/Kontrolle: 20 von 20 Partien gleich wie in den Partien von D dieses Laufs \(bestanden\)/.test(md), 'Kontrolle im selben Lauf');
});

test('Leeres Brett: Ergebnisskript fügt Teile, Bedingung mit sechs Steinen und Kontrolle zusammen', () => {
  const ort = fs.mkdtempSync(path.join(ordner, 'leer-'));
  fs.mkdirSync(path.join(ort, 'stand'));
  const rec = (nr, endstand) => JSON.stringify({nr, endstand, gewonnen: endstand > 0, schaetzung: {}, zuege: ['D4', 'Q16', String(nr)], gefangen: {wir: 1, gegner: 3}});
  for (const [arm, off] of [['D', -100], ['M0', -105], ['N0', -150], ['A80', -101]]) for (const von of [1, 31]) {
    fs.writeFileSync(path.join(ort, 'stand', `g-${arm}-${von}.jsonl`), Array.from({length: 30}, (_, i) => rec(von + i, off + ((von + i) * 7) % 11)).join('\n') + '\n');
  }
  fs.writeFileSync(path.join(ort, 'stand', 'kontrolle-g.jsonl'), Array.from({length: 20}, (_, i) => rec(i + 1, -100 + ((i + 1) * 7) % 11)).join('\n') + '\n');
  const p = spawnSync('bash', [path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-l.sh')], {cwd: ort, encoding: 'utf8'});
  pruefeGleich(p.status, 0, 'Ergebnisskript läuft: ' + p.stderr.slice(-300));
  const md = fs.readFileSync(path.join(ort, 'ergebnisse', 'bericht.md'), 'utf8');
  const fehlt = fs.readFileSync(path.join(ort, 'ergebnisse', 'fehlende-teile.txt'), 'utf8').trim().split('\n');
  pruefeGleich(fehlt.length, 4 * 14, 'je Arm 14 von 16 Teilen fehlen');
  pruefe(fehlt.includes('g-A80-451') && !fehlt.includes('g-D-31'), 'fehlende Teile benannt');
  pruefe(/\| D \| 60 \|/.test(md) && /\| D \| 480 \|/.test(md), 'ohne Vorgabe 60 Partien, mit sechs Steinen 480');
  pruefe(/Kontrolle: 20 von 20 Partien gleich wie in den Partien von D dieses Laufs \(bestanden\)/.test(md), 'Kontrolle bestanden');
  pruefe(['g-D', 'g-M0', 'g-N0', 'g-A80', 'kontrolle-g'].every(n => fs.existsSync(path.join(ort, 'ergebnisse', `${n}.jsonl.gz`))), 'Rohdaten gepackt');
});

/* ── Muster ohne Vorgabe (docs/muster-ohne-vorgabe.md) ──────────────── */
const ARME_O = path.join(wurzel, 'auswertung', 'komponenten', 'arme-o.sh');
const kiO = arm => execFileSync('bash', [SPIELEN, '--ki', arm], {encoding: 'utf8', env: {...process.env, ARME: ARME_O}}).trim();

test('Muster ohne Vorgabe: Schalter, Arme, Dokument, Workflow und Ergebnisskript stimmen überein', () => {
  pruefeGleich(`${standard('musterOhneVorgabe')} ${standard('musterWeissOhneVorgabe')} ${standard('vorgabeSteine')}`, '1 1 0', 'Defaults der Schalter');
  pruefe(/let mg = mc >= PARAMS\.musterAb \? PARAMS\.musterGewicht : 0;\n  if \(PARAMS\.vorgabeSteine < 2\) mg \*= PARAMS\.musterOhneVorgabe \* \(aiColor === 2 \? PARAMS\.musterWeissOhneVorgabe : 1\);/.test(html), 'Schalter wirken nur ohne Vorgabe, der zweite nur als Weiß');
  pruefeGleich(['D', 'M0', 'M50', 'MW0'].map(kiO).join(' | '), 'mctsFixedSims=120,resignEnabled=0 | mctsFixedSims=120,resignEnabled=0,musterOhneVorgabe=0 | mctsFixedSims=120,resignEnabled=0,musterOhneVorgabe=0.5 | mctsFixedSims=120,resignEnabled=0,musterWeissOhneVorgabe=0', 'Arme');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-ohne-vorgabe.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'muster-ohne-vorgabe.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-o.sh'), 'utf8');
  const zeilen = [...doc.matchAll(/^\| (D|M0|M50|MW0) \| (?:`([^`]*)`|–) \| (\d+) \|/gm)];
  pruefeGleich(zeilen.map(m => m[1]).join(' '), 'D M0 M50 MW0', 'Arme im Dokument');
  for (const m of zeilen) pruefeGleich(`mctsFixedSims=120,resignEnabled=0${m[2] ? ',' + m[2] : ''}`, kiO(m[1]), `${m[1]}: wie in arme-o.sh`);
  const liste = (name, was) => { const x = t.slice(t.indexOf(`\n  ${name}:\n`)); return (new RegExp(`${was}: \\[([^\\]]+)\\]`).exec(x) || [])[1].split(',').map(v => v.trim()); };
  for (const [name, o, gr, teile] of [['gnugo', 'g', 30, 16], ['fuego', 'f', 60, 8]]) {
    pruefeGleich(liste(name, 'arm').join(' '), 'D M0 M50 MW0', `${name}: Arme`);
    const von = liste(name, 'von').map(Number);
    pruefe(von.length === teile && von.every((v, i) => v === 1 + i * gr), `${name}: ${teile} Teile zu ${gr}`);
    for (const m of zeilen) pruefeGleich(+m[3], von.length * gr, `${name}: ${m[1]} spielt so viele Partien wie im Dokument`);
    pruefe(new RegExp(`spielen\\.sh ${o} "\\$ARM" "\\$VON" ${gr} "\\$SEED" "stand/${o}-\\$ARM-\\$VON\\.jsonl"`).test(t.slice(t.indexOf(`\n  ${name}:\n`))), `${name}: ${gr} Partien je Teil`);
    pruefe(e.includes(`if [ "$o" = g ]; then schritt=30; n=16; else schritt=60; n=8; fi`), 'Ergebnisskript sammelt die Teile wie der Workflow');
  }
  pruefeGleich(liste('selbstspiel', 'arm').join(' '), 'M0 M50 MW0', 'Selbstspiel: Arme');
  pruefe(!/inputs:/.test(t) && /^  SEED: '226'$/m.test(t) && /^  VORGABE: '0'$/m.test(t) && /^  ARME: auswertung\/komponenten\/arme-o\.sh$/m.test(t), 'Seed 226, VORGABE 0, arme-o.sh');
  for (const [arm, seed] of [['M0', '20262501'], ['M50', '20262601'], ['MW0', '20262701']]) pruefe(new RegExp(`^  SEED_M2_${arm}: '${seed}'$`, 'm').test(t) && doc.includes(`**${seed}** (${arm})`), `Seed des Selbstspiels ${arm}`);
  pruefe(/^\| `seed` \| 226 \|$/m.test(doc) && doc.includes('Seed **226**') && doc.includes('98,3 %'), 'Seed und Niveau im Dokument');
  pruefe(/spielen\.sh g D 1 20 222 stand\/kontrolle-g\.jsonl/.test(t) && /spielen\.sh f D 1 20 "\$SEED" stand\/kontrolle-f\.jsonl/.test(t), 'Kontrollen: GNU Go mit Seed 222, Fuego mit Seed 226');
  pruefe(/leeres-brett\/lauf1/.test(e) && /--stufe O /.test(e) && /for arm in M0 M50 MW0/.test(e), 'Ergebnisskript: Kontrolle gegen „Leeres Brett“, Stufe O, Selbstspiel');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
});

test('Muster ohne Vorgabe, Attrappe: mit sechs Steinen M0 wie D, ohne Vorgabe nicht; MW0 als Schwarz wie D', () => {
  const spiel = (arm, nr, vorgabe) => {
    const aus = path.join(ordner, `o-${arm}-${nr}-${vorgabe}.jsonl`);
    fs.rmSync(aus, {force: true});
    execFileSync(process.execPath, [path.join(wurzel, 'gnugo-duell.js'), '--gnugo', programm, '--partien', '1', '--von', String(nr), '--seed', '226',
      '--stufe', '1', '--vorgabe', String(vorgabe), '--maxzuege', '40', '--gnugo-aufgabe', '0', '--ki', kiO(arm) + ',mctsFixedSims=20', '--roh', aus],
      {stdio: 'pipe', timeout: 300000});
    return JSON.parse(fs.readFileSync(aus, 'utf8').trim()).zuege.join(' ');
  };
  pruefeGleich(spiel('M0', 1, 6), spiel('D', 1, 6), 'mit sechs Steinen: M0 spielt wie D');
  pruefe(spiel('M0', 2, 0) !== spiel('D', 2, 0), 'ohne Vorgabe: M0 weicht von D ab');
  pruefeGleich(spiel('MW0', 2, 0), spiel('D', 2, 0), 'ohne Vorgabe, KI Schwarz (gerade Partie): MW0 spielt wie D');
  pruefe(spiel('MW0', 3, 0) !== spiel('D', 3, 0), 'ohne Vorgabe, KI Weiß: MW0 weicht ab');
});

test('Muster ohne Vorgabe, Bericht: Urteil nur über M0 und M50, Wirkung je Farbe, Kontrolltexte', () => {
  pruefeGleich(`${K.STUFEN.O.vergleiche.join(' ')} | ${K.STUFEN.O.urteilArme.join(' ')} | ${K.STUFEN.O.alpha}`, `M0 M50 MW0 | M0 M50 | ${0.05 / 3}`, 'Stufe O');
  const r = nr => ((nr * 13) % 7) - 3;
  const arm = f => new Map(Array.from({length: 40}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: f(nr) > 0, wirFarbe: nr % 2 ? 'W' : 'S', schaetzung: {}, zuege: ['D4']}]));
  const g = {D: arm(nr => -80 + 4 * r(nr)), M0: arm(nr => -80 + 4 * r(nr) + 20 + r(nr + 1)), M50: arm(nr => -80 + 4 * r(nr) + r(nr + 2)), MW0: arm(nr => -80 + 4 * r(nr) + (nr % 2 ? 30 : 0) + r(nr + 3))};
  const a = K.auswertung({g, f: g}, 'O');
  pruefeGleich(a.urteile.map(u => `${u.arm}:${u.urteil}`).join(' '), 'M0:besser gegen beide Gegner M50:nicht belegt', 'Urteile ohne MW0');
  const mw = a.gegner.g.vergleiche.find(v => v.arm === 'MW0');
  pruefe(Math.abs(mw.jeFarbe.W.m - 30) < 2 && Math.abs(mw.jeFarbe.S.m) < 2, `MW0 je Farbe: S ${mw.jeFarbe.S.m}, W ${mw.jeFarbe.W.m}`);
  const md = K.text(a, {g: {gleich: 20, erwartet: 20, ok: true}, f: {gleich: 20, erwartet: 20, ok: true}});
  pruefe(/Arm − D je Farbe der KI \(98,3 %\)/.test(md) && /MW0 erkundend, ohne Urteil/.test(md) && !/- MW0:/.test(md), 'Bericht: Farben und Urteil');
  pruefe(/gleich wie im Lauf „Leeres Brett“ \(Seed 222\)/.test(md) && /gleich wie in den Partien von D dieses Laufs/.test(md), 'Kontrolltexte je Gegner');
});

test('Muster ohne Vorgabe: Ergebnisskript fügt Teile, Kontrollen und Selbstspiel zusammen', () => {
  const ort = fs.mkdtempSync(path.join(ordner, 'o-'));
  fs.mkdirSync(path.join(ort, 'stand'));
  const rec = (nr, endstand) => JSON.stringify({nr, endstand, gewonnen: endstand > 0, wirFarbe: nr % 2 ? 'W' : 'S', schaetzung: {}, zuege: ['D4', String(nr)]});
  for (const arm of ['D', 'M0', 'M50', 'MW0']) {
    fs.writeFileSync(path.join(ort, 'stand', `g-${arm}-1.jsonl`), Array.from({length: 30}, (_, i) => rec(i + 1, -60 + ((i * 7) % 11))).join('\n') + '\n');
    fs.writeFileSync(path.join(ort, 'stand', `f-${arm}-1.jsonl`), Array.from({length: 60}, (_, i) => rec(i + 1, -90 + ((i * 5) % 13))).join('\n') + '\n');
  }
  fs.writeFileSync(path.join(ort, 'stand', 'kontrolle-f.jsonl'), Array.from({length: 20}, (_, i) => rec(i + 1, 0)).join('\n') + '\n');
  const p = spawnSync('bash', [path.join(wurzel, 'auswertung', 'komponenten', 'ergebnis-o.sh')], {cwd: ort, encoding: 'utf8'});
  pruefeGleich(p.status, 0, 'Ergebnisskript läuft: ' + p.stderr.slice(-300));
  const md = fs.readFileSync(path.join(ort, 'ergebnisse', 'bericht.md'), 'utf8');
  const fehlt = fs.readFileSync(path.join(ort, 'ergebnisse', 'fehlende-teile.txt'), 'utf8').trim().split('\n');
  pruefeGleich(fehlt.length, 4 * 15 + 4 * 7 + 1 + 36, 'fehlende Teile: GNU Go, Fuego, Kontrolle GNU Go, Selbstspiel');
  pruefe(fehlt.includes('kontrolle-g') && fehlt.includes('m2-MW0-12'), 'fehlende Kontrolle und Selbstspiel benannt');
  pruefe(/Kontrolle: 20 von 20 Partien gleich wie in den Partien von D dieses Laufs \(bestanden\)/.test(md) && /M0: Selbstspiel unvollständig \(0 von 12 Teilen\)/.test(md), 'Kontrolle Fuego und unvollständiges Selbstspiel');
  pruefe(['g-D', 'f-MW0', 'kontrolle-f'].every(n => fs.existsSync(path.join(ort, 'ergebnisse', `${n}.jsonl.gz`))), 'Rohdaten gepackt');
});

/* ── Siege gegen Fuego (docs/muster-fuego-siege.md) ─────────────────── */
test('Siege gepaart: Zählung, Urteil nach McNemar, Tabelle in muster-ohne-vorgabe.md §10', () => {
  const SG = require('../auswertung/komponenten/siege-gepaart.js');
  const m = l => new Map(l.map(([nr, g]) => [nr, {nr, gewonnen: g}]));
  const D = m([[1, true], [2, false], [3, true], [4, false], [5, null], [6, true]]);
  const X = m([[1, false], [2, true], [3, true], [4, false], [5, true], [6, false]]);
  const r = SG.siege(D, X);
  pruefeGleich(`${r.n} ${r.b} ${r.c} ${r.beide} ${r.keiner} ${r.siegeArm} ${r.siegeD}`, '5 1 2 1 1 2 3', 'Paare zählen, Partie ohne Sieger fällt heraus');
  pruefeGleich(`${SG.urteil({n: 960, b: 150, c: 100, p: 0.002}, 0.025)} | ${SG.urteil({n: 960, b: 90, c: 130, p: 0.008}, 0.025)} | ${SG.urteil({n: 960, b: 110, c: 100, p: 0.03}, 0.025)}`,
    'Arm gewinnt öfter | D gewinnt öfter | kein Unterschied belegt', 'Urteil');
  const L = path.join(wurzel, 'docs/daten/leeres-brett/lauf1'), O = path.join(wurzel, 'docs/daten/muster-ohne-vorgabe/lauf1');
  const a = [];
  for (const arm of ['D', 'M0', 'A80']) a.push(`GNU Go, Leeres Brett (Seed 222):${arm}=${L}/g-${arm}.jsonl.gz`);
  for (const arm of ['D', 'M0', 'M50', 'MW0']) a.push(`GNU Go (Seed 226):${arm}=${O}/g-${arm}.jsonl.gz`);
  for (const arm of ['D', 'M0', 'M50', 'MW0']) a.push(`Fuego, 100 Spiele (Seed 226):${arm}=${O}/f-${arm}.jsonl.gz`);
  const aus = execFileSync('node', [path.join(wurzel, 'auswertung/komponenten/siege-gepaart.js'), ...a], {encoding: 'utf8'});
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-ohne-vorgabe.md'), 'utf8');
  const fehlt = aus.split('\n').filter(z => z.trim() && !doc.includes(z));
  pruefeGleich(fehlt.length, 0, 'Tabelle in §10 = Ausgabe des Skripts' + (fehlt.length ? ': ' + fehlt[0] : ''));
  pruefe(/## 10\. Nachtrag: gepaarter Vergleich der Siege \(explorativ/.test(doc) && /\*\*Explorativ, nicht vorab festgelegt\.\*\*/.test(doc), '§10 ist als explorativ geführt');
});

test('Prüfstand Fuego ohne Vorgabe: Wahl nach Regel, FUEGO_SPIELE, Dokument, Workflow, Ergebnisskript', () => {
  const W = require('../auswertung/fuego/gerade-wahl.js');
  const a = (spiele, siege, n = 120) => W.arm(spiele, Array.from({length: n}, (_, i) => ({nr: i + 1, gewonnen: i < siege, endstand: i < siege ? 5 : -5})));
  pruefeGleich(JSON.stringify(W.wahl([a(10, 100), a(20, 60), a(30, 48), a(50, 20), a(70, 10)])), JSON.stringify({spiele: 30, stufe: 1}), '50 % (20 Spiele) und 40 % (30 Spiele) gleich weit von 45 %: die höhere Spielzahl');
  pruefeGleich(JSON.stringify(W.wahl([a(10, 100), a(20, 56), a(30, 50), a(50, 20)])), JSON.stringify({spiele: 20, stufe: 1}), '46,7 % (20 Spiele) liegt näher an 45 % als 41,7 % (30 Spiele)');
  pruefeGleich(JSON.stringify(W.wahl([a(10, 100), a(20, 70), a(30, 30)])), JSON.stringify({spiele: 20, stufe: 2}), 'keine zwischen 40 und 50 %: Regel 2');
  pruefeGleich(W.wahl([a(10, 110), a(70, 10)]), null, 'keine zwischen 30 und 60 %: keine Wahl');
  const p = W.arm(20, [{nr: 1, gewonnen: true}, {nr: 2, abgebrochen: 'x'}, {nr: 3, gewonnen: null}, {nr: 4, gewonnen: false}]);
  pruefeGleich(`${p.partien} ${p.n} ${p.siege}`, '4 2 1', 'Partien ohne Sieger zählen nicht');
  for (const v of ['0', 'x', '200000']) pruefeGleich(spawnSync('bash', [SPIELEN, 'f', 'D', '1', '20', '227', 'a.jsonl'], {cwd: ordner, encoding: 'utf8', env: {...process.env, FUEGO_SPIELE: v}}).status, 2, `FUEGO_SPIELE ${v} abgelehnt`);
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-fuego-siege.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'fuego-gerade.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'fuego', 'gerade-ergebnis.sh'), 'utf8');
  pruefe(/spiele: \[10, 20, 30, 50, 70\]/.test(t) && /von: \[1, 31, 61, 91\]/.test(t) && /\*\*10, 20, 30, 50 und\s+70 Spielen je\s+Zug\*\*/.test(doc) && /for s in 10 20 30 50 70; do/.test(e) && /for von in 1 31 61 91; do/.test(e), 'Spielzahlen und Teile in Dokument, Workflow und Ergebnisskript');
  pruefe(/spielen\.sh f D "\$VON" 30 "\$SEED" "stand\/s\$FUEGO_SPIELE-\$VON\.jsonl"/.test(t) && /FUEGO_SPIELE: \$\{\{ matrix\.spiele \}\}/.test(t), '30 Partien je Teil mit FUEGO_SPIELE');
  pruefe(!/inputs:/.test(t) && /^  SEED: '227'$/m.test(t) && /^  VORGABE: '0'$/m.test(t) && /Seed \*\*227\*\*/.test(doc) && /Seed\s+\*\*228\*\*/.test(doc), 'Seeds 227 und 228, VORGABE 0');
  pruefe(/alpha\s+\*\*0,05\/2 = 0,025\*\*/.test(doc) && /je\s+\*\*960 Partien\*\*/.test(doc) && /\| M50 gewinnt öfter \| \*\*Default `musterOhneVorgabe` 0,5\*\* \|/.test(doc), 'Endpunkt, Umfang und Folge im Dokument');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  const ort = fs.mkdtempSync(path.join(ordner, 'fg-'));
  fs.mkdirSync(path.join(ort, 'stand'));
  for (const [s, sieg] of [[10, 25], [20, 14], [30, 12]]) fs.writeFileSync(path.join(ort, 'stand', `s${s}-1.jsonl`), Array.from({length: 30}, (_, i) => JSON.stringify({nr: i + 1, gewonnen: i < sieg, endstand: i < sieg ? 3 : -3})).join('\n') + '\n');
  const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'fuego', 'gerade-ergebnis.sh')], {cwd: ort, encoding: 'utf8'});
  pruefeGleich(r.status, 0, 'Ergebnisskript läuft: ' + r.stderr.slice(-300));
  const md = fs.readFileSync(path.join(ort, 'ergebnisse', 'bericht.md'), 'utf8');
  pruefe(/\*\*Wahl: 20 Spiele je Zug\*\*/.test(md) && fs.readFileSync(path.join(ort, 'ergebnisse', 'fehlende-teile.txt'), 'utf8').trim().split('\n').length === 3 * 3 + 2 * 4, 'Wahl und fehlende Teile');
});

test('Bericht: Partien am Zuglimit (gewonnen null, aber ein Endstand) werden gezählt und fallen samt Partner heraus', () => {
  const arm = (f, limit = []) => new Map(Array.from({length: 20}, (_, i) => i + 1).map(nr => [nr, {nr, endstand: f(nr), gewonnen: limit.includes(nr) ? null : f(nr) > 0, schaetzung: {}, zuege: ['D4']}]));
  const D = arm(nr => 10 - nr), T0 = arm(nr => 10 - nr + 5, [3]);
  const a = K.auswertung({g: {D, T0}}, 'T');
  const b = a.gegner.g.arme.find(x => x.arm === 'T0'), d = a.gegner.g.arme.find(x => x.arm === 'D');
  pruefeGleich(`${b.n} ${b.zuglimit} ${b.fertig} ${d.zuglimit}`, '20 1 19 0', 'Zuglimit gezählt (vorher immer 0), Partien ohne Zuglimit gewertet');
  const v = a.gegner.g.vergleiche[0];
  pruefeGleich(`${v.g.n} ${v.g.m}`, '19 5', 'das Paar mit der Zuglimit-Partie fällt heraus, die übrigen 19 bleiben');
  pruefeGleich(`${v.siegeX} ${v.siegeD}`, '13 8', 'Siege zählen nur gewertete Partien (Partie 3 ist beiden Armen ein Sieg und fällt weg)');
  pruefe(/\| T0 \| 20 \| 0 \| 1 \| /.test(K.text(a)), 'Bericht zeigt 1 Partie am Zuglimit');
  const ohne = K.auswertung({g: {D: arm(nr => 10 - nr), T0: arm(nr => 15 - nr)}}, 'T').gegner.g.arme.find(x => x.arm === 'T0');
  pruefeGleich(`${ohne.zuglimit} ${ohne.fertig}`, '0 20', 'ohne Zuglimit: wie bisher');
});

test('Siege gegen Fuego ohne Vorgabe (Stufe 2): Bericht, Urteil, Workflow, Ergebnisskript', () => {
  const B = require('../auswertung/fuego/siege-bericht.js');
  const arm = (f, farbe = nr => (nr % 2 ? 'W' : 'S')) => new Map(Array.from({length: 40}, (_, i) => i + 1).map(nr => [nr, {nr, gewonnen: f(nr), endstand: f(nr) ? 5 : -5, wirFarbe: farbe(nr)}]));
  const D = arm(nr => nr <= 16);
  const besser = arm(nr => nr <= 16 || nr > 28);
  const KO = new Map(Array.from({length: 20}, (_, i) => [i + 1, {nr: i + 1, zuege: ['D4']}]));
  const mitZ = M => new Map([...M].map(([nr, r]) => [nr, {...r, zuege: ['D4']}]));
  const d = mitZ(D), bs = mitZ(besser);
  let a = B.auswertung({D: d, M0: d, M50: bs}, KO, 40);
  pruefeGleich(a.zeilen.find(z => z.arm === 'M50').urteil, 'Arm gewinnt öfter', '12 gegen 0 Paare: M50 gewinnt öfter');
  pruefeGleich(a.zeilen.find(z => z.arm === 'M0').urteil, 'kein Unterschied belegt', 'gleiche Partien: kein Unterschied');
  pruefeGleich(a.folge, 'Default `musterOhneVorgabe` wird 0,5', 'M50 gewinnt öfter: Default 0,5');
  pruefeGleich(B.auswertung({D: d, M0: d, M50: d}, KO, 40).folge, 'Default bleibt 1', 'sonst bleibt der Default');
  pruefeGleich(B.auswertung({D: d, M0: bs, M50: d}, KO, 40).folge, 'Default bleibt 1; M0 gewinnt öfter, untersuchen', 'M0 gewinnt öfter: untersuchen');
  pruefe(/\| M50 \| 40 \| 12 \| 0 \|/.test(B.text(a)) && a.gueltig && !/KEIN URTEIL/.test(B.text(a)), 'Tabelle nennt die Paare');
  /* Gültigkeit: drei kleine Fälle mit Fake-Daten */
  const zl = (M, nrs) => new Map([...M].map(([nr, r]) => [nr, nrs.includes(nr) ? {...r, gewonnen: null} : r]));
  const fehlt = new Map([...d].filter(([nr]) => nr <= 30));
  const v1 = B.auswertung({D: d, M0: d, M50: fehlt}, KO, 40);
  pruefe(!v1.gueltig && v1.gruende.some(g => /Arm M50 unvollständig: 30 von 40/.test(g)), 'ein Teillauf fehlt: ungültig mit Grund');
  const kaputt = new Map([...KO].map(([nr, r]) => [nr, nr <= 3 ? {...r, zuege: ['Q16']} : r]));
  const v2 = B.auswertung({D: d, M0: d, M50: bs}, kaputt, 40);
  pruefe(!v2.gueltig && v2.gruende.some(g => /Kontrolle nicht bestanden: 17 von 20/.test(g)), 'Kontrolle fällt durch: ungültig mit Grund');
  pruefeGleich(B.auswertung({D: d, M0: d, M50: bs}, null, 40).gueltig, false, 'ohne Kontrolle ungültig');
  const v3 = B.auswertung({D: d, M0: d, M50: zl(bs, [7])}, KO, 100);
  pruefeGleich(v3.gueltig, false, 'bei erwartet 100 fehlen Partien (Gegenprobe der Rechnung)');
  const gross = n => new Map(Array.from({length: n}, (_, i) => [i + 1, {nr: i + 1, gewonnen: (i * 7) % 10 < 5, endstand: 1, wirFarbe: 'S', zuege: ['D4']}]));
  const G = gross(960), Gz = zl(G, [10, 500]);
  const v4 = B.auswertung({D: G, M0: Gz, M50: Gz}, new Map(Array.from({length: 20}, (_, i) => [i + 1, {nr: i + 1, zuege: ['D4']}])), 960);
  pruefe(v4.gueltig && v4.zeilen.every(z => z.n === 958), 'zwei Zuglimit-Paare (958 von 960): bleibt gültig');
  const v5 = B.auswertung({D: G, M0: zl(G, Array.from({length: 20}, (_, i) => i + 1)), M50: G}, new Map(Array.from({length: 20}, (_, i) => [i + 1, {nr: i + 1, zuege: ['D4']}])), 960);
  pruefe(!v5.gueltig && v5.gruende.some(g => /M0: nur 940 von 960 Paaren/.test(g)), '20 Zuglimit-Paare (940 von 960): unter 98 %, ungültig');
  pruefe(/KEIN URTEIL/.test(B.text(v1)) && /vorläufig/.test(B.text(v1)) && !/\*\*Arm gewinnt öfter\*\*/.test(B.text(v1)) && /\*\*Folge:\*\* keine/.test(B.text(v1)), 'ungültiger Bericht: kein Urteil, vorläufig, keine Folge');
  pruefeGleich(B.quote(D).S + ' ' + B.quote(D).W, '0.4 0.4', 'Quote je Farbe');
  const doc = fs.readFileSync(path.join(wurzel, 'docs', 'muster-fuego-siege.md'), 'utf8');
  const t = fs.readFileSync(path.join(wurzel, '.github', 'workflows', 'fuego-siege.yml'), 'utf8');
  const e = fs.readFileSync(path.join(wurzel, 'auswertung', 'fuego', 'siege-ergebnis.sh'), 'utf8');
  pruefe(/^  SEED: '228'$/m.test(t) && /^  FUEGO_SPIELE: '50'$/m.test(t) && /^  VORGABE: '0'$/m.test(t) && !/inputs:/.test(t), 'Seed 228, 50 Spiele, ohne Vorgabe, keine Eingaben');
  pruefe(/arm: \[D, M0, M50\]/.test(t) && /von: \[1, 61, 121, 181, 241, 301, 361, 421, 481, 541, 601, 661, 721, 781, 841, 901\]/.test(t) && /for \(\(i = 0; i < 16; i\+\+\)\)/.test(e) && /1 \+ i \* 60/.test(e) && /for arm in D M0 M50; do/.test(e), 'Arme und 16 Teile zu 60 in Workflow und Ergebnisskript');
  pruefe(/spielen\.sh f "\$ARM" "\$VON" 60 "\$SEED"/.test(t) && /spielen\.sh f D 1 20 "\$SEED"/.test(t), '60 Partien je Teil, Kontrolle 20');
  pruefe(/\*\*Wahl: 50 Spiele je Zug\*\*/.test(doc) && /Fuego mit 50 Spielen je Zug, Seed 228/.test(doc), 'Wahl im Dokument');
  pruefe(/\|\| touch ungueltig/.test(t) && /name: Gültigkeit[\s\S]*exit 1/.test(t) && /--erwartet 960/.test(e) && /98 %/.test(doc) && /sehr schwacher Fuego/.test(doc), 'ungültig → roter Lauf nach dem Sichern; 98 % und Geltungsbereich im Dokument');
  pruefeGleich((t.match(/contents: write/g) || []).length, 1, 'Schreibrecht in genau einem Job');
  pruefeGleich((t.match(/runs-on: ubuntu-24\.04/g) || []).length, 4, 'alle vier Jobs auf Ubuntu 24.04');
  const ort = fs.mkdtempSync(path.join(ordner, 'fs-'));
  fs.mkdirSync(path.join(ort, 'stand'));
  const zeile = (nr, g, zuege = ['D4']) => JSON.stringify({nr, gewonnen: g, endstand: g ? 3 : -3, wirFarbe: nr % 2 ? 'W' : 'S', zuege});
  for (const [name, f] of [['D', nr => nr <= 10], ['M0', nr => nr <= 10], ['M50', nr => nr <= 18]]) fs.writeFileSync(path.join(ort, 'stand', `${name}-1.jsonl`), Array.from({length: 20}, (_, i) => zeile(i + 1, f(i + 1))).join('\n') + '\n');
  fs.writeFileSync(path.join(ort, 'stand', 'kontrolle.jsonl'), Array.from({length: 20}, (_, i) => zeile(i + 1, i < 10)).join('\n') + '\n');
  const r = spawnSync('bash', [path.join(wurzel, 'auswertung', 'fuego', 'siege-ergebnis.sh')], {cwd: ort, encoding: 'utf8'});
  pruefeGleich(r.status, 1, 'Ergebnisskript endet mit Exit-Code 1, wenn Teile fehlen (hier 20 statt 960 Partien je Arm): ' + r.stderr.slice(-300));
  const md = fs.readFileSync(path.join(ort, 'ergebnisse', 'bericht.md'), 'utf8');
  pruefe(/KEIN URTEIL/.test(md) && /unvollständig: 20 von 960/.test(md) && /vorläufig/.test(md) && /Kontrolle: 20 von 20 Partien Zug für Zug gleich/.test(md) && !/Default `musterOhneVorgabe` wird/.test(md), 'ungültiger Bericht: kein Urteil mit Grund, vorläufig, Kontrolle genannt');
  pruefe(/::error::Lauf ungültig/.test(r.stdout + r.stderr), 'Fehlermeldung für den Lauf');
  pruefeGleich(fs.readFileSync(path.join(ort, 'ergebnisse', 'fehlende-teile.txt'), 'utf8').trim().split('\n').length, 3 * 15, 'je Arm 15 fehlende Teile genannt');
});

laufeTests('Komponenten Stufe A, B und Muster-Eröffnung, Baum-Übernahme, leeres Brett, Muster ohne Vorgabe, Siege gegen Fuego, Zuglimit').then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
