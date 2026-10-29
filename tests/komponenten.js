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
  pruefe(/--vorgabe 6/.test(sp) && /--fuego-spiele 100/.test(sp) && /--stufe 1/.test(sp) && /--gnugo-aufgabe 0/.test(sp) && /sims=\$\{SIMS:-120\}/.test(sp) && /mctsFixedSims=\$sims,resignEnabled=0/.test(sp) && /--maxzuege 600/.test(sp) && /40,80,120,200/.test(sp), 'Bedingungen in spielen.sh');
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
  pruefe(/const mg = mc >= PARAMS\.musterAb \? PARAMS\.musterGewicht : 0;/.test(html), 'der Schalter wirkt an der Wurzel');
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

laufeTests('Komponenten Stufe A, B und Muster-Eröffnung, Baum-Übernahme').then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
