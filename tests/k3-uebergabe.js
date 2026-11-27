// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Aufbauprüfung K3, Schritt 1 (auswertung/k3-uebergabe.js,
   docs/skalierung-aufbaupruefung-vorabfestlegung.md §1).

   Geprüft wird:
     1. Der echte Harness am heutigen index.html: zwei Partien zu zwei Zügen, A mit 2600, B mit
        5200 Simulationen. Jeder Arm zieht einmal als Schwarz und einmal als Weiß, und jeder
        Steinzug meldet im Rohdump genau den Sollwert seines Arms. Das ist der Weg aus §1a.
     2. Ein vollständiger, richtiger Satz von 123 Teilläufen ist gültig ohne Befund, mit der
        Zählung je Arm und Farbe.
     3. Jeder Fehler, den Schritt 1 finden soll, ergibt „Aufbaufehler gefunden“ (Ausgang 3):
        falscher Simulationswert, Steinzug ohne Meldung, Pass mit Meldung, vertauschte Arme,
        falsche Farbe von A, falsche Konfiguration, verschiedene params_hash, falsche Zählung im
        JSON, abweichende Siegerfarbe.
     4. Jeder Daten- oder Strukturfehler ergibt KEIN URTEIL (Ausgang 1): fehlender oder doppelter
        Teillauf, Prüfsumme gegen GitHub oder laeufe.csv, Artefaktname, Commit, Engine-Block,
        nicht abgeschlossen, unlesbare Datei, Zugzahl, Zugfolge, Feld, Partie nach §13.4.
     5. Lesen von Prüfsummenliste und laeufe.csv; Bedienfehler mit Ausgang 2; Ende zu Ende über
        die Befehlszeile mit Ausgang 0 und 3.

   Aufruf:  node tests/k3-uebergabe.js */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const {spawnSync, execFileSync} = require('child_process');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');
const W = require('../auswertung/k3-uebergabe.js');
const {BLOCKSUMMEN} = require('../auswertung/skalierung-bericht.js');
const {blocksummen} = require('../auswertung/eval-streuung-bericht.js');

const COMMIT = '98aa1ad586c9de23f64ca76c26af1d7b199b7b3a';
const HASH = 'ab'.repeat(32);
const SKRIPT = path.join(__dirname, '..', 'auswertung', 'k3-uebergabe.js');
const HARNESS = path.join(__dirname, '..', 'ab-harness.js');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');
let TMP;
const tmpdir = () => TMP || (TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'k3-uebergabe-')));

/* Eine Partie wie im Harness: `zuege` Entscheidungen, die letzten zwei sind Pässe, Farben ab
   Schwarz im Wechsel; A ist in ungeraden Partien Schwarz. */
function partie(seed, nr, zuege = 30) {
  const aSchwarz = nr % 2 === 1;
  const armVon = {S: aSchwarz ? 'A' : 'B', W: aSchwarz ? 'B' : 'A'};
  const ereignisse = [], summe = {A: 0, B: 0}, zahl = {A: 0, B: 0};
  for (let j = 0; j < zuege; j++) {
    const farbe = j % 2 === 0 ? 'S' : 'W', arm = armVon[farbe];
    const pass = j >= zuege - 2;
    const sims = pass ? null : W.K3.soll[arm];
    ereignisse.push({zug: j + 1, farbe, idx: pass ? -1 : j, sims, q: 0.1});
    zahl[arm]++; if (sims) summe[arm] += sims;
  }
  const siegerFarbe = nr % 3 === 0 ? 'W' : 'S';
  const sieger = (siegerFarbe === 'S') === aSchwarz ? 'A' : 'B';
  const json = {partie: nr, aIst: aSchwarz ? 'Schwarz' : 'Weiß', sieger, siegerFarbe, aufgabe: null,
                stand: siegerFarbe === 'S' ? 'B 190 : W 177.5' : 'B 175 : W 192.5', zuege,
                simsA: Math.round(summe.A / zahl.A), simsB: Math.round(summe.B / zahl.B), dauerMin: 9};
  const roh = {typ: 'partie', seed, params_hash: HASH, nr, armSchwarz: armVon.S, armWeiss: armVon.W,
               final_board_hash: sha(`${seed}/${nr}`), sieger: siegerFarbe, zuege, aufgabe: null, ereignisse};
  return {json, roh};
}

/* Ein Teillauf mit Seed, Lauf-ID und Prüfsumme. */
function teil(seed, i) {
  const ps = Array.from({length: 10}, (_, k) => partie(seed, k + 1));
  return {
    laufId: String(45722878539 + i),
    daten: {konfig: {A: 'mctsFixedSims=2600,resignEnabled=0', B: 'mctsFixedSims=5200,resignEnabled=0',
                     komi: 7.5, seed, modus: 'standard', commit: COMMIT, abgeschlossen: true},
            partien: ps.map(p => p.json)},
    roh: ps.map(p => p.roh),
    name: `ab-harness-10p-seed${seed}-run${192 + i}`
  };
}

/* Ein vollständiger Satz; aendere(satz) darf ihn vor der Prüfung verändern. */
function satz(aendere) {
  const s = {commit: COMMIT, bloecke: {...BLOCKSUMMEN}, teile: W.K3.seeds.map((seed, i) => teil(seed, i)),
             laeufe: null, pruefsummenDoppelt: []};
  if (aendere) aendere(s);
  s.pruefsummen = s.pruefsummen || new Map(s.teile.map(t =>
    [t.laufId, {artefaktId: '1', name: t.name, sha: sha(t.laufId), digest: sha(t.laufId)}]));
  return s;
}
const lauf = aendere => W.pruefe(satz(aendere));
const hat = (liste, teil) => liste.some(x => (typeof x === 'string' ? x : `${x.art} ${x.ort} ${x.text}`).includes(teil));

/* ── 1. Der echte Harness ──────────────────────────────────────── */

test('Harness am heutigen Stand: A meldet 2600, B 5200, je Arm in beiden Farben', () => {
  const ziel = path.join(tmpdir(), 'echt');
  fs.mkdirSync(ziel, {recursive: true});
  execFileSync(process.execPath, [HARNESS, '--html', STANDARD_HTML, '--games', '2', '--maxmoves', '2',
    '--seed', '11260001', '--A', 'mctsFixedSims=2600,resignEnabled=0', '--B', 'mctsFixedSims=5200,resignEnabled=0',
    '--json', path.join(ziel, 'ab.json'), '--roh', path.join(ziel, 'roh.jsonl')], {stdio: 'ignore'});
  const roh = fs.readFileSync(path.join(ziel, 'roh.jsonl'), 'utf8').trim().split('\n').map(z => JSON.parse(z));
  const json = JSON.parse(fs.readFileSync(path.join(ziel, 'ab.json'), 'utf8'));
  pruefeGleich(roh.length, 2, 'Partien im Rohdump');
  const zellen = {};
  roh.forEach((r, i) => {
    pruefeGleich(r.armSchwarz, i === 0 ? 'A' : 'B', `Arm von Schwarz in Partie ${i + 1}`);
    pruefeGleich(json.partien[i].aIst, i === 0 ? 'Schwarz' : 'Weiß', `Farbe von A in Partie ${i + 1}`);
    const z = W.zuegePruefen(r.ereignisse, {S: r.armSchwarz, W: r.armWeiss}, W.K3.soll);
    pruefe(!z.fehler, `Struktur: ${z.fehler}`);
    pruefeGleich(z.abweichungen.length, 0, `Abweichungen in Partie ${i + 1}: ${JSON.stringify(z.abweichungen)}`);
    for (const [k, w] of Object.entries(z.zellen)) zellen[k] = (zellen[k] || 0) + w.steinSoll;
    pruefeGleich(json.partien[i].simsA, Math.round(z.summe.A / z.zahl.A), 'simsA wie aus den Zugereignissen');
    pruefeGleich(json.partien[i].simsB, Math.round(z.summe.B / z.zahl.B), 'simsB wie aus den Zugereignissen');
  });
  for (const k of ['AS', 'AW', 'BS', 'BW']) pruefeGleich(zellen[k], 1, `Steinzüge mit Sollwert in Zelle ${k}`);
  pruefeGleich(roh[0].ereignisse[0].sims, 2600, 'Zug 1, A als Schwarz');
  pruefeGleich(roh[0].ereignisse[1].sims, 5200, 'Zug 2, B als Weiß');
  pruefeGleich(roh[1].ereignisse[0].sims, 5200, 'Zug 1, B als Schwarz');
  pruefeGleich(roh[1].ereignisse[1].sims, 2600, 'Zug 2, A als Weiß');
});

/* ── 2. Der richtige Satz ──────────────────────────────────────── */

test('Vollständiger, richtiger Satz: gültig, kein Befund, Zählung je Arm und Farbe', () => {
  const e = lauf();
  pruefeGleich(e.kein.length, 0, `Gründe: ${e.kein.slice(0, 3).join(' | ')}`);
  pruefeGleich(e.befunde.length, 0, 'Befunde');
  pruefeGleich(W.status(e), 0, 'Ausgang');
  pruefeGleich(e.partien, 1230, 'Partien');
  for (const k of ['AS', 'AW', 'BS', 'BW']) {
    const z = e.zellen[k];
    pruefeGleich(z.partien, 615, `${k}: Partien`);
    pruefeGleich(z.stein, 615 * 14, `${k}: Steinzüge`);
    pruefeGleich(z.steinSoll, z.stein, `${k}: alle mit Sollwert`);
    pruefeGleich(z.paesse, 615, `${k}: Pässe`);
  }
  const b = W.bericht(e, COMMIT);
  pruefe(b.includes('**Gültig. Kein Aufbaufehler gefunden:**'), 'Urteilszeile');
  pruefe(b.includes('| A | Schwarz | 2600 | 615 |') && b.includes('| B | Weiß | 5200 | 615 |'), 'Tabelle je Arm und Farbe');
});

/* ── 3. Befunde ────────────────────────────────────────────────── */

const befundFall = (name, aendere, art, teilText) => test(`Befund: ${name}`, () => {
  const e = lauf(aendere);
  pruefeGleich(e.kein.length, 0, `kein KEIN URTEIL erwartet: ${e.kein.slice(0, 2).join(' | ')}`);
  pruefeGleich(W.status(e), 3, 'Ausgang 3');
  pruefe(e.befunde.some(b => b.art === art), `Befundart ${art}: ${e.befunde.slice(0, 2).map(b => b.art).join(', ')}`);
  if (teilText) pruefe(hat(e.befunde, teilText), `Befund nennt „${teilText}“: ${JSON.stringify(e.befunde.slice(0, 2))}`);
});

befundFall('A-Steinzug meldet 2599', s => {
  const e = s.teile[5].roh[2].ereignisse[4];   /* Partie 3: A ist Schwarz, Zug 5 ist Schwarz */
  e.sims = 2599; s.teile[5].daten.partien[2].simsA = Math.round((13 * 2600 + 2599) / 15);
}, 'Simulationen', 'Seed 11260006 Partie 3 Zug 5');
befundFall('B-Steinzug als Weiß meldet 2600', s => {
  const e = s.teile[0].roh[0].ereignisse[1];   /* Partie 1: B ist Weiß */
  e.sims = 2600; s.teile[0].daten.partien[0].simsB = Math.round((13 * 5200 + 2600) / 15);
}, 'Simulationen', 'Arm B (Weiß) meldet 2600');
befundFall('Steinzug ohne Meldung', s => {
  s.teile[1].roh[1].ereignisse[3].sims = null;
  s.teile[1].daten.partien[1].simsA = Math.round(13 * 2600 / 15);
}, 'Simulationen', 'keine Simulationen');
befundFall('Pass mit Meldung', s => {
  const r = s.teile[2].roh[0]; r.ereignisse[29].sims = 5200;
  s.teile[2].daten.partien[0].simsB = Math.round(15 * 5200 / 15);
}, 'Simulationen', 'Pass von Arm B');
befundFall('Arme im Rohdump vertauscht', s => {
  const r = s.teile[3].roh[0]; [r.armSchwarz, r.armWeiss] = [r.armWeiss, r.armSchwarz];
}, 'Zuordnung', 'Schwarz ist Arm B');
befundFall('A spielt in gerader Partie Schwarz', s => {
  const x = s.teile[4].daten.partien[1], r = s.teile[4].roh[1];
  x.aIst = 'Schwarz'; r.armSchwarz = 'A'; r.armWeiss = 'B';
  x.sieger = (x.siegerFarbe === 'S') ? 'A' : 'B';
  /* Zugereignisse passend zum Tausch, damit nur die Farbe von A auffällt */
  for (const e of r.ereignisse) if (e.sims !== null) e.sims = W.K3.soll[e.farbe === 'S' ? 'A' : 'B'];
}, 'Zuordnung', 'A spielt Schwarz');
befundFall('Konfiguration B mit 2600', s => {
  s.teile[7].daten.konfig.B = 'mctsFixedSims=2600,resignEnabled=0';
}, 'Konfiguration', 'Arm B läuft mit „mctsFixedSims=2600,resignEnabled=0“');
befundFall('Konfiguration mit zusätzlichem Schlüssel', s => {
  s.teile[8].daten.konfig.A = 'mctsFixedSims=2600,resignEnabled=0,puctC=2';
}, 'Konfiguration', 'puctC');
befundFall('params_hash verschieden', s => { s.teile[9].roh[4].params_hash = 'cd'.repeat(32); },
  'Konfiguration', '2 verschiedene params_hash');
befundFall('simsA im JSON passt nicht zu den Zugereignissen', s => { s.teile[10].daten.partien[0].simsA += 1; },
  'Zählung', 'simsA im JSON');
befundFall('Siegerfarbe im Rohdump weicht ab', s => {
  const r = s.teile[11].roh[0]; r.sieger = r.sieger === 'S' ? 'W' : 'S';
}, 'Zuordnung', 'Siegerfarbe im Rohdump');

/* ── 4. KEIN URTEIL ────────────────────────────────────────────── */

const keinFall = (name, aendere, teilText) => test(`KEIN URTEIL: ${name}`, () => {
  const e = lauf(aendere);
  pruefeGleich(W.status(e), 1, 'Ausgang 1');
  pruefe(hat(e.kein, teilText), `Grund nennt „${teilText}“: ${e.kein.slice(0, 3).join(' | ')}`);
});

keinFall('ein Teillauf fehlt', s => { s.teile.pop(); }, '1 Seeds fehlen: 11260123');
keinFall('Seed doppelt', s => { s.teile[1].daten.konfig.seed = 11260001; for (const r of s.teile[1].roh) r.seed = 11260001;
  s.teile[1].name = 'ab-harness-10p-seed11260001-run193'; }, 'Seed 11260001 kommt doppelt vor');
keinFall('Lauf-ID doppelt', s => { s.teile[2].laufId = s.teile[1].laufId; }, 'ist doppelt übergeben');
keinFall('Prüfsumme weicht von GitHub ab', s => {
  s.pruefsummen = new Map(s.teile.map(t => [t.laufId, {name: t.name, sha: sha(t.laufId), digest: sha(t.laufId)}]));
  s.pruefsummen.get(s.teile[0].laufId).digest = sha('anders');
}, 'weicht von der Angabe von GitHub');
keinFall('Prüfsumme fehlt', s => {
  s.pruefsummen = new Map(s.teile.slice(1).map(t => [t.laufId, {name: t.name, sha: sha(t.laufId), digest: sha(t.laufId)}]));
}, 'keine Prüfsumme übergeben');
keinFall('Prüfsumme weicht von laeufe.csv ab', s => {
  s.laeufe = new Map(s.teile.map(t => [t.laufId, sha(t.laufId)]));
  s.laeufe.set(s.teile[3].laufId, sha('anders'));
}, 'weicht von laeufe.csv');
keinFall('Lauf fehlt in laeufe.csv', s => {
  s.laeufe = new Map(s.teile.slice(1).map(t => [t.laufId, sha(t.laufId)]));
}, 'steht nicht in laeufe.csv');
keinFall('Artefaktname passt nicht zum Seed', s => { s.teile[4].name = 'ab-harness-10p-seed11260099-run196'; },
  'passt nicht zu Seed 11260005');
keinFall('anderer Commit', s => { s.teile[5].daten.konfig.commit = 'f'.repeat(40); }, 'lief auf ffffffffffff');
keinFall('Engine-Block weicht ab', s => { s.bloecke['worker-ai'] = '0'.repeat(64); }, 'Block worker-ai');
keinFall('Teillauf nicht abgeschlossen', s => { s.teile[6].daten.konfig.abgeschlossen = false; }, 'nicht abgeschlossen');
keinFall('Ergebnis-JSON unlesbar', s => { s.teile[7].daten = new Error('Unexpected end of JSON input'); },
  'Ergebnis-JSON nicht lesbar');
keinFall('Rohdump unlesbar', s => { s.teile[7].roh = new Error('Unexpected token'); }, 'Rohdump nicht lesbar');
keinFall('Rohdump mit einer Partie zu wenig', s => { s.teile[8].roh.pop(); }, 'JSON 10 Partien, Rohdump 9');
keinFall('Zugereignis fehlt', s => { s.teile[9].roh[0].ereignisse.pop(); }, 'Zugereignisse 29');
keinFall('Zugfolge gestört', s => { s.teile[10].roh[0].ereignisse[3].farbe = 'S'; }, 'Zugereignis 4 trägt');
keinFall('Feld außerhalb des Bretts', s => { s.teile[11].roh[0].ereignisse[2].idx = 400; }, 'Feld 400');
keinFall('Partie nach §13.4 nicht zählbar', s => { delete s.teile[12].daten.partien[0].sieger; }, '§13.4');
keinFall('Komi weicht ab', s => { s.teile[13].daten.konfig.komi = 6.5; }, 'Komi 6.5');

/* ── 5. Lesen, Bedienung, Ende zu Ende ─────────────────────────── */

test('Prüfsummenliste: Tabulatoren, Präfix „sha256:“, Doppelte erkannt', () => {
  const p = W.liesPruefsummen(`1\t10\tname-a\t${'A'.repeat(64)}\tsha256:${'a'.repeat(64)}\n2\t11\tname-b\t${'b'.repeat(64)}\t${'b'.repeat(64)}\n1\t10\tx\ty\tz\n`);
  pruefeGleich(p.m.get('2').sha, 'b'.repeat(64), 'SHA klein');
  pruefeGleich(p.m.get('2').digest, 'b'.repeat(64), 'Digest ohne Präfix');
  pruefeGleich(p.doppelt.join(), '1', 'doppelte Lauf-ID');
});

test('laeufe.csv der Stufe 2 mit Windows-Zeilenenden und Berichtszeile', () => {
  const m = W.liesLaeufe('Seed,Lauf-ID,Artefakt-ID,Name,SHA256,Bytes\r\n11260001,45722878539,15076750447,n,'
    + 'AB'.repeat(32) + ',55136\r\n,45800124437,15106632464,skalierung-bericht,' + 'cd'.repeat(32) + ',1511\r\n');
  pruefeGleich(m.get('45722878539'), 'ab'.repeat(32), 'SHA klein, ohne \\r');
  pruefeGleich(m.size, 2, 'zwei Zeilen');
  pruefeGleich(W.liesLaeufe('a,b\n1,2\n'), null, 'ohne die Spalten: null');
});

test('Bedienfehler: ohne --teil, ohne volle SHA, unbekannte Option; Ausgang 2', () => {
  for (const argv of [['--commit', COMMIT, '--html', 'x', '--pruefsummen', 'p'],
                      ['--teil', '1,a,b', '--commit', 'abc', '--html', 'x', '--pruefsummen', 'p'],
                      ['--teil', '1,a', '--commit', COMMIT, '--html', 'x', '--pruefsummen', 'p'],
                      ['--foo']]) {
    let fehler = null;
    try { W.argumente(argv); } catch (e) { fehler = e; }
    pruefe(fehler instanceof W.Bedienfehler, `Bedienfehler für ${argv.join(' ')}`);
  }
  const r = spawnSync(process.execPath, [SKRIPT, '--foo'], {encoding: 'utf8'});
  pruefeGleich(r.status, 2, 'Ausgang');
});

/* Schreibt einen Satz als Dateien und ruft das Skript auf. Der gültige Fall braucht ein
   index.html mit den Blöcken aus §6; das heutige ist es, solange die Engine unverändert ist. */
function befehlszeile(aendere) {
  const s = satz(aendere), d = fs.mkdtempSync(path.join(tmpdir(), 'cli-'));
  const args = ['--commit', COMMIT, '--html', STANDARD_HTML, '--pruefsummen', path.join(d, 'p.tsv')];
  const zeilen = [];
  for (const t of s.teile) {
    const j = path.join(d, `ab-${t.laufId}.json`), r = path.join(d, `roh-${t.laufId}.jsonl`);
    fs.writeFileSync(j, JSON.stringify(t.daten));
    fs.writeFileSync(r, t.roh.map(x => JSON.stringify(x)).join('\n') + '\n');
    args.push('--teil', `${t.laufId},${j},${r}`);
    zeilen.push([t.laufId, '1', t.name, sha(t.laufId), 'sha256:' + sha(t.laufId)].join('\t'));
  }
  fs.writeFileSync(path.join(d, 'p.tsv'), zeilen.join('\n') + '\n');
  return spawnSync(process.execPath, [SKRIPT, ...args], {encoding: 'utf8'});
}
const engineWieFestgelegt = () => {
  const ist = blocksummen(STANDARD_HTML);
  return Object.entries(BLOCKSUMMEN).every(([b, s]) => ist[b] === s);
};

test('Ende zu Ende: richtiger Satz → Ausgang 0, Bericht mit Tabelle', () => {
  if (!engineWieFestgelegt()) return 'skip';
  const r = befehlszeile();
  pruefeGleich(r.status, 0, `Ausgang; stderr: ${r.stderr.slice(0, 200)}`);
  pruefe(r.stdout.includes('Kein Aufbaufehler gefunden'), 'Urteilszeile');
  pruefe(r.stdout.includes('123 von 123 gleich der Angabe von GitHub'), 'Prüfsummen gezählt');
});

test('Ende zu Ende: ein falscher Wert → Ausgang 3 mit Ort', () => {
  if (!engineWieFestgelegt()) return 'skip';
  const r = befehlszeile(s => { s.teile[0].roh[0].ereignisse[0].sims = 2400;
    s.teile[0].daten.partien[0].simsA = Math.round((13 * 2600 + 2400) / 15); });
  pruefeGleich(r.status, 3, 'Ausgang');
  pruefe(r.stdout.includes('Seed 11260001 Partie 1 Zug 1'), 'Ort im Bericht');
});

laufeTests('K3-Übergabe (Aufbauprüfung, Schritt 1)').then(ok => process.exit(ok ? 0 : 1));
