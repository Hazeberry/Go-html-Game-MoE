// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Aufbauprüfung zu K3, Teil 3 (docs/skalierung-aufbaupruefung-vorabfestlegung.md §3): beschreibende
   Diagnose der 123 K3-Artefakte. Kein Test, kein Urteil über die Ursache.

   1. Pässe je Arm und Farbe: Pässe je 100 Entscheidungen, Anteil der Partien ohne eigenen Pass,
      erster eigener Pass (nur Partien mit eigenem Pass, mit Nenner). Ein Pass ist ein Zugereignis
      mit idx −1; Steinzüge kommen nur aus der Suche (§1a).
   2. q je Arm, Farbe und Zugphase (1–100, 101–200, 201–300, ab 301): Zahl der Partien mit eigenen
      Steinzügen in der Phase und Median der je Partie gemittelten q-Werte. q ist komi-blind und
      kommt aus verschieden tiefer Suche; deshalb nur getrennt nach Farbe und ohne Schwelle.
   3. Kipppunkt mit GNU Go als festem Bewerter (estimate_score, chinesische Regeln, Komi 7,5, wie
      in auswertung/aufgabe-gnugo.js): Die Züge jeder Partie werden in einem GNU-Go-Prozess
      nachgespielt, Messpunkte sind die Stellungen nach Zug 100, 200 und 300, soweit die Partie so
      lang ist. Kipppunkt ist der erste Messpunkt, ab dem GNU Go den späteren Verlierer an jedem
      folgenden Messpunkt hinten sieht (Schätzung unter 0 aus seiner Sicht). Ohne Messpunkt, ohne
      Kipppunkt und mit fehlender Schätzung wird gesondert gezählt. Verteilung je Arm und Farbe des
      Verlierers. Dazu die strenge Zählung (§3, vor dem Lauf ergänzt): Ein Messpunkt gilt dort nur
      als „hinten“, wenn auch die für den Verlierer günstigste Schranke von GNU Go unter 0 liegt;
      ohne Schranken zählt er als fehlend. Werte und Schranken stehen in den Einzelwerten.
   4. Baumwiederverwendung: am Messcommit liest der Harness die Zähler nicht aus; der Befund steht
      fest („mit vorhandenen Dumps nicht messbar“).

   Gültigkeit wie in Teil 1c: dieselben Prüfungen (auswertung/k3-uebergabe.js). Meldet sie KEIN
   URTEIL oder einen Befund, endet auch Teil 3 mit KEIN URTEIL; ebenso, wenn GNU Go nicht startet.

   Ausgang: 0 gültig · 1 KEIN URTEIL · 2 Bedienfehler

   Aufruf:
     node auswertung/k3-diagnose.js --commit <sha> --html stand.html --pruefsummen p.tsv \
          [--laeufe laeufe.csv] [--gnugo /usr/games/gnugo] [--parallel 4] [--csv einzeln.csv] \
          --teil <Lauf-ID>,<ab-….json>,<roh-….jsonl> [--teil …] */
'use strict';
const fs = require('fs');
const os = require('os');
const {spawn, spawnSync} = require('child_process');
const U = require('./k3-uebergabe.js');
const {blocksummen} = require('./eval-streuung-bericht.js');

const KOMI = 7.5;
const MESSPUNKTE = [100, 200, 300];
const PHASEN = [[1, 100], [101, 200], [201, 300], [301, Infinity]];
const PHASENNAME = ['1–100', '101–200', '201–300', 'ab 301'];
const FARBNAME = {S: 'Schwarz', W: 'Weiß'};
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));

function argumente(argv) {
  const rest = [], a = {gnugo: '/usr/games/gnugo', parallel: Math.max(1, os.cpus().length), csv: null};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--gnugo' || k === '--parallel' || k === '--csv') {
      if (v === undefined) throw new U.Bedienfehler(`${k} braucht einen Wert`);
      if (k === '--gnugo') a.gnugo = v;
      else if (k === '--csv') a.csv = v;
      else { a.parallel = parseInt(v, 10); if (!(a.parallel >= 1)) throw new U.Bedienfehler(`--parallel: ${v}`); }
      i++;
    } else rest.push(k);
  }
  return Object.assign(U.argumente(rest), a);
}

const median = a => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y), m = b.length >> 1;
  return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2;
};
const quantil = (a, p) => {
  if (!a.length) return null;
  const b = [...a].sort((x, y) => x - y), h = (b.length - 1) * p, u = Math.floor(h);
  return b[u] + (h - u) * ((b[Math.min(u + 1, b.length - 1)]) - b[u]);
};

/* Partien aus den gelesenen Teilen: Arm je Farbe aus dem Rohdump, Sieger aus dem JSON. */
function partienAus(teile) {
  const out = [];
  for (const t of teile) {
    const seed = t.daten.konfig.seed;
    t.daten.partien.forEach((x, i) => {
      const r = t.roh[i];
      const verliererFarbe = x.siegerFarbe === 'S' ? 'W' : 'S';
      out.push({seed, partie: x.partie, zuege: x.zuege, armVon: {S: r.armSchwarz, W: r.armWeiss},
                verliererFarbe, verliererArm: verliererFarbe === 'S' ? r.armSchwarz : r.armWeiss,
                ereignisse: r.ereignisse});
    });
  }
  return out;
}

/* 1. Pässe je Arm und Farbe. */
function passMasse(partien) {
  const z = {};
  for (const [a, f] of U.ZELLEN) z[a + f] = {partien: 0, entscheidungen: 0, paesse: 0, ohnePass: 0, ersterPass: []};
  for (const p of partien) {
    for (const f of ['S', 'W']) {
      const c = z[p.armVon[f] + f];
      c.partien++;
      let erster = null;
      for (const e of p.ereignisse) {
        if (e.farbe !== f) continue;
        c.entscheidungen++;
        if (e.idx === -1) { c.paesse++; if (erster === null) erster = e.zug; }
      }
      if (erster === null) c.ohnePass++; else c.ersterPass.push(erster);
    }
  }
  return z;
}

/* 2. q je Arm, Farbe und Phase: je Partie das Mittel der q eigener Steinzüge in der Phase. */
function qPhasen(partien) {
  const z = {};
  for (const [a, f] of U.ZELLEN) z[a + f] = PHASEN.map(() => []);
  for (const p of partien) {
    for (const f of ['S', 'W']) {
      const summe = PHASEN.map(() => 0), zahl = PHASEN.map(() => 0);
      for (const e of p.ereignisse) {
        if (e.farbe !== f || e.idx < 0 || typeof e.q !== 'number' || !Number.isFinite(e.q)) continue;
        const k = PHASEN.findIndex(([von, bis]) => e.zug >= von && e.zug <= bis);
        summe[k] += e.q; zahl[k]++;
      }
      PHASEN.forEach((_, k) => { if (zahl[k]) z[p.armVon[f] + f][k].push(summe[k] / zahl[k]); });
    }
  }
  return z;
}

/* GTP-Befehle für eine Partie: nachspielen, nach Zug 100, 200, 300 schätzen. */
function gtpBefehle(ereignisse, komi = KOMI) {
  const befehle = ['boardsize 19', 'clear_board', `komi ${komi}`], mess = [];
  ereignisse.forEach((e, j) => {
    befehle.push(`play ${e.farbe === 'S' ? 'B' : 'W'} ${e.idx < 0 ? 'pass' : zuGtp(e.idx)}`);
    if (MESSPUNKTE.includes(j + 1)) { mess.push({zug: j + 1, befehl: befehle.length}); befehle.push('estimate_score'); }
  });
  befehle.push('quit');
  return {befehle, mess};
}

/* „= B+12.5 (upper bound: 20.0, lower: 3.0)“ → Wert aus Sicht von Schwarz mit Schranken. */
function schaetzungAus(antwort) {
  if (typeof antwort !== 'string' || !antwort.startsWith('=')) return null;
  const m = /^=\s*(?:([BW])\+([\d.]+)|(0))(?:\s*\(upper bound:\s*(-?[\d.]+),\s*lower:\s*(-?[\d.]+)\))?/.exec(antwort);
  if (!m) return null;
  const wert = m[3] !== undefined ? 0 : (m[1] === 'B' ? 1 : -1) * Number(m[2]);
  /* Die Schranken stehen bei GNU Go 3.8 aus Sicht von Weiß (positiv = Weiß vorn): „W+17.5 (upper
     bound: 84.0, lower: -49.0)“, „B+51.0 (upper bound: 1.8, lower: -103.9)“. Sie gehen unverändert in
     die Einzelwerte (Spalten w_oben…, w_unten…) und nicht in den Kipppunkt. */
  return {wert, oben: m[4] !== undefined ? Number(m[4]) : null, unten: m[5] !== undefined ? Number(m[5]) : null};
}

/* Antworten einer GTP-Sitzung: je Befehl genau eine Zeile, die mit = oder ? beginnt. Ist ein
   play abgelehnt, gilt jede spätere Schätzung als fehlend: das Brett stimmt dann nicht mehr. */
function messwerte(stdout, befehle, mess) {
  const antworten = String(stdout || '').split('\n').filter(z => z.startsWith('=') || z.startsWith('?'));
  let ersterFehler = Infinity;
  for (let i = 0; i < befehle.length - 1 && i < antworten.length; i++)
    if (antworten[i].startsWith('?')) { ersterFehler = i; break; }
  return mess.map(({zug, befehl}) => {
    if (befehl > ersterFehler || befehl >= antworten.length) return {zug, s: null};
    return {zug, s: schaetzungAus(antworten[befehl])};
  });
}

/* Kipppunkt aus den Messwerten aus Sicht des Verlierers. `feld` wählt die Zählung: „sicht“ (Wert
   unter 0) oder „streng“ (auch die günstigste Schranke unter 0); null heißt fehlend. */
function kipppunkt(werte, feld = 'sicht') {
  if (!werte.length) return 'ohne';
  if (werte.some(w => w[feld] === null || w[feld] === undefined)) return 'fehlt';
  const hinten = w => feld === 'sicht' ? w.sicht < 0 : w[feld] === true;
  for (let m = 0; m < werte.length; m++)
    if (werte.slice(m).every(hinten)) return werte[m].zug;
  return 'kein';
}

/* Strenge Zählung: Die Schranken stehen aus Sicht von Weiß. Verliert Weiß, ist seine günstigste
   Schranke die obere; verliert Schwarz, ist es die untere (aus Sicht von Weiß), also −unten aus
   seiner Sicht. „Sicher hinten“ heißt: auch diese Schranke liegt unter 0. */
function sicherHinten(s, verliererFarbe) {
  if (!s || s.oben === null || s.unten === null) return null;
  return verliererFarbe === 'W' ? s.oben < 0 : -s.unten < 0;
}

function gnugoLaeuft(gnugo) {
  const r = spawnSync(gnugo, ['--version'], {encoding: 'utf8'});
  return r.status === 0 && /GNU Go/.test(r.stdout || '');
}

function sitzung(gnugo, eingabe) {
  return new Promise(res => {
    let out = '';
    const p = spawn(gnugo, ['--mode', 'gtp', '--chinese-rules'], {stdio: ['pipe', 'pipe', 'ignore']});
    p.stdout.on('data', d => { out += d; });
    p.on('error', () => res(null));
    p.on('close', () => res(out));
    p.stdin.on('error', () => {});
    p.stdin.end(eingabe);
  });
}

/* 3. Für jede Partie eine GNU-Go-Sitzung, höchstens `parallel` gleichzeitig. */
async function bewerte(partien, {gnugo, parallel, komi = KOMI}) {
  const ergebnis = new Array(partien.length);
  let naechste = 0;
  async function arbeiter() {
    while (naechste < partien.length) {
      const i = naechste++, p = partien[i];
      const {befehle, mess} = gtpBefehle(p.ereignisse, komi);
      const out = await sitzung(gnugo, befehle.join('\n') + '\n');
      const werte = messwerte(out, befehle, mess).map(({zug, s}) => ({
        zug, s, sicht: s === null ? null : (p.verliererFarbe === 'S' ? s.wert : -s.wert),
        streng: sicherHinten(s, p.verliererFarbe)}));
      ergebnis[i] = {werte, kipp: kipppunkt(werte), kippStreng: kipppunkt(werte, 'streng')};
    }
  }
  await Promise.all(Array.from({length: Math.min(parallel, partien.length)}, arbeiter));
  return ergebnis;
}

function kippTabelle(partien, bew, schluessel = 'kipp') {
  const zeilen = {};
  const neu = () => ({verluste: 0, 100: 0, 200: 0, 300: 0, kein: 0, ohne: 0, fehlt: 0, schaetzungenFehlend: 0});
  for (const [a, f] of U.ZELLEN) zeilen[a + f] = neu();
  zeilen.A = neu(); zeilen.B = neu();
  partien.forEach((p, i) => {
    for (const k of [p.verliererArm + p.verliererFarbe, p.verliererArm]) {
      const z = zeilen[k];
      z.verluste++; z[bew[i][schluessel]]++;
      z.schaetzungenFehlend += bew[i].werte.filter(w => w.sicht === null).length;
    }
  });
  return zeilen;
}

const zahl = (v, s = 1) => v === null || v === undefined ? '–' : v.toFixed(s).replace('.', ',');
const proz = (a, b) => b ? zahl(100 * a / b) + ' %' : '–';

function bericht({e, pass, q, kipp, kippStreng, partien, bew, commit, kein}) {
  const L = [];
  L.push('# Aufbauprüfung K3, Teil 3: beschreibende Diagnose', '');
  if (kein.length) {
    L.push('**KEIN URTEIL.**', '', '## Gründe', '');
    for (const g of kein.slice(0, 40)) L.push(`- ${g}`);
    if (kein.length > 40) L.push(`- und ${kein.length - 40} weitere`);
    L.push('');
    return L.join('\n');
  }
  L.push('**Gültig.** Beschreibend, ohne Test und ohne Urteil über die Ursache.');
  L.push(`Commit ${commit} · Festlegung: docs/skalierung-aufbaupruefung-vorabfestlegung.md §3 · ${partien.length} Partien`, '');

  L.push('## 1. Pässe je Arm und Farbe', '');
  L.push('| Arm | Farbe | Partien | Entscheidungen | Pässe | je 100 Entscheidungen | Partien ohne eigenen Pass | erster eigener Pass: Partien, Median [Q1; Q3] |');
  L.push('|---|---|---:|---:|---:|---:|---:|---|');
  for (const [a, f] of U.ZELLEN) {
    const c = pass[a + f];
    L.push(`| ${a} | ${FARBNAME[f]} | ${c.partien} | ${c.entscheidungen} | ${c.paesse} | ${zahl(100 * c.paesse / c.entscheidungen, 2)} | `
      + `${c.ohnePass} (${proz(c.ohnePass, c.partien)}) | ${c.ersterPass.length}, Zug ${zahl(median(c.ersterPass), 0)} `
      + `[${zahl(quantil(c.ersterPass, 0.25), 0)}; ${zahl(quantil(c.ersterPass, 0.75), 0)}] |`);
  }
  L.push('');

  L.push('## 2. q je Arm, Farbe und Zugphase', '');
  L.push('Je Zelle: Partien mit eigenen Steinzügen in der Phase · Median der je Partie gemittelten q. q ist komi-blind '
    + 'und stammt aus verschieden tiefer Suche; Vergleiche nur innerhalb einer Farbe, keine Schwelle.', '');
  L.push(`| Arm | Farbe | ${PHASENNAME.join(' | ')} |`);
  L.push(`|---|---|${PHASENNAME.map(() => '---').join('|')}|`);
  for (const [a, f] of U.ZELLEN)
    L.push(`| ${a} | ${FARBNAME[f]} | ${q[a + f].map(w => `${w.length} · ${zahl(median(w), 3)}`).join(' | ')} |`);
  L.push('');

  L.push('## 3. Kipppunkt nach GNU Go (estimate_score, Komi 7,5)', '');
  L.push('Je Verlierer: erster Messpunkt, ab dem GNU Go ihn an jedem folgenden Messpunkt hinten sieht. „kein“: am letzten '
    + 'Messpunkt nicht hinten. „ohne“: Partie kürzer als 100 Züge. „fehlt“: mindestens eine Schätzung fehlt. GNU Gos '
    + 'Schätzung ist grob; der Wert beschreibt eine Schätzung, keine gesicherte Verluststellung.', '');
  const zeile = (name, z) => `| ${name} | ${z.verluste} | ${z[100]} (${proz(z[100], z.verluste)}) | ${z[200]} (${proz(z[200], z.verluste)}) | `
    + `${z[300]} (${proz(z[300], z.verluste)}) | ${z.kein} (${proz(z.kein, z.verluste)}) | ${z.ohne} | ${z.fehlt} |`;
  const kopf = ['| Verlierer | Verluste | ab Zug 100 | ab Zug 200 | ab Zug 300 | kein | ohne | fehlt |',
                '|---|---:|---:|---:|---:|---:|---:|---:|'];
  L.push('### Nach dem Wert der Schätzung', '', ...kopf);
  for (const [a, f] of U.ZELLEN) L.push(zeile(`${a} als ${FARBNAME[f]}`, kipp[a + f]));
  L.push(zeile('**A gesamt**', kipp.A), zeile('**B gesamt**', kipp.B));
  L.push('', '### Streng: auch die günstigste Schranke für den Verlierer unter 0', '', ...kopf);
  for (const [a, f] of U.ZELLEN) L.push(zeile(`${a} als ${FARBNAME[f]}`, kippStreng[a + f]));
  L.push(zeile('**A gesamt**', kippStreng.A), zeile('**B gesamt**', kippStreng.B));
  const fehlend = bew.reduce((s, b) => s + b.werte.filter(w => w.sicht === null).length, 0);
  const ohneSchranken = bew.reduce((s, b) => s + b.werte.filter(w => w.sicht !== null && w.streng === null).length, 0);
  const alle = bew.reduce((s, b) => s + b.werte.length, 0);
  L.push('', `Messpunkte ${alle}, davon ohne Schätzung ${fehlend}, mit Schätzung aber ohne Schranken ${ohneSchranken}.`, '');

  L.push('## 4. Baumwiederverwendung', '');
  L.push('Mit vorhandenen Dumps nicht messbar: Der Harness liest die Zähler der Engine (leseWurzelWaechter) am Messcommit '
    + 'nicht aus (§3).', '');

  L.push('## Daten', '');
  L.push(`- Teilläufe ${e.teile}, Partien ${e.partien}; Prüfsummen ${e.pruefsummenGitHub} von ${e.teile} gleich GitHub, `
    + (e.laeufeVerglichen ? `${e.pruefsummenLaeufe} von ${e.teile} gleich laeufe.csv.` : 'laeufe.csv nicht verglichen.'));
  L.push('- Prüfungen aus Teil 1c ohne Befund.', '');
  return L.join('\n');
}

function csv(partien, bew) {
  const kopf = ['seed', 'partie', 'zuege', 'armSchwarz', 'armWeiss', 'verliererArm', 'verliererFarbe',
    ...MESSPUNKTE.flatMap(z => [`s_gnugo${z}`, `w_oben${z}`, `w_unten${z}`]), 'kipppunkt', 'kipppunkt_streng'];
  const z = [kopf.join(',')];
  partien.forEach((p, i) => {
    const w = MESSPUNKTE.map(m => bew[i].werte.find(x => x.zug === m));
    z.push([p.seed, p.partie, p.zuege, p.armVon.S, p.armVon.W, p.verliererArm, p.verliererFarbe,
      ...w.flatMap(x => !x ? ['', '', ''] : x.s === null ? ['fehlt', '', ''] : [x.s.wert, x.s.oben ?? '', x.s.unten ?? '']),
      bew[i].kipp, bew[i].kippStreng].join(','));
  });
  return z.join('\n') + '\n';
}

function liesJson(pfad) { try { return JSON.parse(fs.readFileSync(pfad, 'utf8')); } catch (err) { return err; } }
function liesRoh(pfad) {
  try { return fs.readFileSync(pfad, 'utf8').split('\n').filter(z => z.trim()).map(z => JSON.parse(z)); }
  catch (err) { return err; }
}

async function main() {
  let a;
  try { a = argumente(process.argv.slice(2)); }
  catch (err) {
    if (err instanceof U.Bedienfehler) { console.error(`Bedienfehler: ${err.message}`); process.exit(2); }
    throw err;
  }
  const kein = [];
  const ps = U.liesPruefsummen(fs.readFileSync(a.pruefsummen, 'utf8'));
  let laeufe = null;
  if (a.laeufe) { laeufe = U.liesLaeufe(fs.readFileSync(a.laeufe, 'utf8')); if (!laeufe) kein.push(`${a.laeufe} hat keine Spalten Lauf-ID und SHA256.`); }
  let bloecke;
  try { bloecke = blocksummen(a.html); } catch (err) { bloecke = {}; kein.push(`Stand ${a.html} nicht lesbar (${err.message}).`); }
  const teile = a.teile.map(t => ({laufId: t.laufId, daten: liesJson(t.json), roh: liesRoh(t.roh)}));
  const e = U.pruefe({commit: a.commit, bloecke, pruefsummen: ps.m, pruefsummenDoppelt: ps.doppelt, laeufe, teile});
  kein.push(...e.kein);
  if (!e.kein.length && e.befunde.length)
    kein.push(`Die Prüfungen aus Teil 1c melden ${e.befunde.length} Befunde (erster: ${e.befunde[0].ort}: ${e.befunde[0].text}).`);
  if (!kein.length && !gnugoLaeuft(a.gnugo)) kein.push(`GNU Go startet nicht (${a.gnugo}).`);
  if (kein.length) { console.log(bericht({kein})); process.exit(1); }

  const partien = partienAus(teile);
  const bew = await bewerte(partien, {gnugo: a.gnugo, parallel: a.parallel});
  if (a.csv) fs.writeFileSync(a.csv, csv(partien, bew));
  console.log(bericht({e, pass: passMasse(partien), q: qPhasen(partien), kipp: kippTabelle(partien, bew),
                       kippStreng: kippTabelle(partien, bew, 'kippStreng'), partien, bew,
                       commit: a.commit, kein}));
  process.exit(0);
}

if (require.main === module) main();
module.exports = {MESSPUNKTE, PHASEN, argumente, partienAus, passMasse, qPhasen, gtpBefehle, schaetzungAus, messwerte,
                  kipppunkt, sicherHinten, bewerte, kippTabelle, bericht, csv, zuGtp};
