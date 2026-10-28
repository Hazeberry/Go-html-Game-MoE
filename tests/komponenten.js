// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Stufe A der Komponentenmessung (docs/komponenten.md).

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
  pruefe(/--vorgabe 6/.test(sp) && /--fuego-spiele 100/.test(sp) && /--stufe 1/.test(sp) && /--gnugo-aufgabe 0/.test(sp) && /mctsFixedSims=120,resignEnabled=0/.test(sp) && /--maxzuege 600/.test(sp) && /40,80,120,200/.test(sp), 'Bedingungen in spielen.sh');
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

laufeTests('Komponenten Stufe A').then(ok => { fs.rmSync(ordner, {recursive: true, force: true}); process.exit(ok ? 0 : 1); });
