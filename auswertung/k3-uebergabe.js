// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Aufbauprüfung zu K3, Schritt 1 (docs/skalierung-aufbaupruefung-vorabfestlegung.md §1): Hat die
   Suche je Arm und Farbe die festgelegte Simulationszahl übernommen, A 2600 und B 5200?

   Beleg ist die Zahl, die jeder Zug meldet. Am Messcommit gilt im Harness (§1a): Steinzüge kommen
   in der Stufe „hard“ nur aus mctsPUCT; ist mctsFixedSims größer als 0, endet dessen Schleife erst
   bei sims === mctsFixedSims, und der Harness schreibt diese Zahl in das Zugereignis des
   Rohdumps. Hat jeder Steinzug von A genau 2600 und jeder von B genau 5200 gemeldet, hat die
   Suche den Wert ihres Arms übernommen. Eine Entscheidung ohne Meldung muss ein Pass sein.

   Geprüft wird für alle 123 Teilläufe und 1230 Partien:
     - Prüfsumme jedes Artefakts gegen die Angabe von GitHub und, falls übergeben, gegen
       laeufe.csv; Artefaktname passend zum Seed.
     - Konfiguration A mctsFixedSims=2600,resignEnabled=0 und B mctsFixedSims=5200,
       resignEnabled=0; params_hash in allen Partien gleich; Commit und Engine-Blöcke (§6).
     - Je Partie: Farbe von A wie im Harness (ungerade Partien Schwarz), passend zu armSchwarz/
       armWeiss des Rohdumps; Siegerfarbe im Rohdump gleich siegerFarbe im JSON; die Partie
       zählbar nach §13.4.
     - Je Zugereignis: Farbe im Wechsel ab Schwarz, Arm aus der Farbe; ein Steinzug meldet genau
       den Sollwert seines Arms, ein Pass meldet nichts.
     - Je Partie und Arm: simsA/simsB im JSON gleich der Summe der gemeldeten Simulationen
       geteilt durch alle Entscheidungen, gerundet (so zählt der Harness).

   Ausgang (zwei Zustände nach der Festlegung, gültig mit oder ohne Befund):
     0  gültig, kein Aufbaufehler gefunden
     3  gültig, Aufbaufehler gefunden (mit Partien und Zügen)
     1  KEIN URTEIL: Daten fehlen, sind doppelt, unlesbar oder gehören nicht zum Messcommit
     2  Bedienfehler

   Aufruf:
     node auswertung/k3-uebergabe.js --commit <sha> --html stand.html --pruefsummen p.tsv \
          [--laeufe laeufe.csv] --teil <Lauf-ID>,<ab-….json>,<roh-….jsonl> [--teil …]
   p.tsv: je Zeile Lauf-ID, Artefakt-ID, Artefaktname, SHA-256 der Datei, Digest von GitHub,
   mit Tabulator getrennt. */
'use strict';
const fs = require('fs');
const {spec, blocksummen} = require('./eval-streuung-bericht.js');
const {BLOCKSUMMEN, partieFehler} = require('./skalierung-bericht.js');

const K3 = Object.freeze({
  soll: Object.freeze({A: 2600, B: 5200}),
  seeds: Object.freeze(Array.from({length: 123}, (_, i) => 11260001 + i)),
  partienJeTeil: 10,
  schluessel: Object.freeze(['mctsFixedSims', 'resignEnabled']),
  komi: 7.5
});
const ZELLEN = [['A', 'S'], ['A', 'W'], ['B', 'S'], ['B', 'W']];
const FARBNAME = {S: 'Schwarz', W: 'Weiß'};
const HEX64 = /^[0-9a-f]{64}$/;

class Bedienfehler extends Error {}

function argumente(argv) {
  const a = {teile: [], commit: null, html: null, pruefsummen: null, laeufe: null};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    const wert = () => { if (v === undefined) throw new Bedienfehler(`${k} braucht einen Wert`); i++; return v; };
    if (k === '--teil') {
      const t = wert().split(',');
      if (t.length !== 3 || t.some(x => !x)) throw new Bedienfehler(`--teil erwartet <Lauf-ID>,<json>,<roh>: ${v}`);
      a.teile.push({laufId: t[0], json: t[1], roh: t[2]});
    } else if (k === '--commit') a.commit = wert();
    else if (k === '--html') a.html = wert();
    else if (k === '--pruefsummen') a.pruefsummen = wert();
    else if (k === '--laeufe') a.laeufe = wert();
    else throw new Bedienfehler(`unbekannte Option ${k}`);
  }
  if (!a.teile.length) throw new Bedienfehler('kein --teil angegeben');
  if (!a.commit || !/^[0-9a-f]{40}$/.test(a.commit)) throw new Bedienfehler('--commit braucht eine volle 40-stellige SHA');
  if (!a.html) throw new Bedienfehler('--html fehlt');
  if (!a.pruefsummen) throw new Bedienfehler('--pruefsummen fehlt');
  return a;
}

/* p.tsv: Lauf-ID, Artefakt-ID, Name, SHA-256 der Datei, Digest von GitHub („sha256:…“ oder hex). */
function liesPruefsummen(text) {
  const m = new Map(), doppelt = [];
  for (const z of text.split('\n').map(s => s.replace(/\r$/, '')).filter(Boolean)) {
    const [laufId, artefaktId, name, sha, digest] = z.split('\t');
    if (m.has(laufId)) doppelt.push(laufId);
    m.set(laufId, {artefaktId, name, sha: (sha || '').toLowerCase(),
                   digest: (digest || '').toLowerCase().replace(/^sha256:/, '')});
  }
  return {m, doppelt};
}

/* laeufe.csv der Stufe 2: Spalten Lauf-ID und SHA256 nach Kopfzeile. */
function liesLaeufe(text) {
  const z = text.split('\n').map(s => s.replace(/\r$/, '')).filter(Boolean);
  const kopf = (z[0] || '').split(',');
  const iId = kopf.indexOf('Lauf-ID'), iSha = kopf.indexOf('SHA256');
  if (iId < 0 || iSha < 0) return null;
  const m = new Map();
  for (const zeile of z.slice(1)) {
    const t = zeile.split(',');
    if (t[iId]) m.set(t[iId], (t[iSha] || '').toLowerCase());
  }
  return m;
}

const leereZelle = () => ({partien: 0, entscheidungen: 0, stein: 0, steinSoll: 0, steinAbw: 0, paesse: 0, passMitSims: 0});

/* Die Zugereignisse einer Partie. armVon = {S: Arm von Schwarz, W: Arm von Weiß}, soll = {A, B}.
   Bei kaputter Struktur {fehler}; sonst die Zählung je Zelle (ohne „partien“), die Abweichungen
   und je Arm Summe der gemeldeten Simulationen und Zahl der Entscheidungen. */
function zuegePruefen(ev, armVon, soll) {
  const zellen = {}, abweichungen = [], summe = {A: 0, B: 0}, zahl = {A: 0, B: 0};
  for (let j = 0; j < ev.length; j++) {
    const e = ev[j] || {};
    const farbe = j % 2 === 0 ? 'S' : 'W';
    if (e.zug !== j + 1 || e.farbe !== farbe)
      return {fehler: `Zugereignis ${j + 1} trägt Zug ${e.zug}, Farbe ${e.farbe}; erwartet ${j + 1}, ${farbe}.`};
    if (!Number.isInteger(e.idx) || e.idx < -1 || e.idx > 360)
      return {fehler: `Zug ${j + 1}: Feld ${e.idx} ist kein Brettpunkt und kein Pass.`};
    const arm = armVon[farbe];
    const z = zellen[arm + farbe] || (zellen[arm + farbe] = {entscheidungen: 0, stein: 0, steinSoll: 0, steinAbw: 0,
                                                              paesse: 0, passMitSims: 0});
    const sims = e.sims === undefined ? null : e.sims;
    z.entscheidungen++; zahl[arm]++;
    if (typeof sims === 'number') summe[arm] += sims;
    if (e.idx >= 0) {
      z.stein++;
      if (sims === soll[arm]) z.steinSoll++;
      else { z.steinAbw++; abweichungen.push({zug: j + 1, arm, farbe, sims, soll: soll[arm], stein: true}); }
    } else {
      z.paesse++;
      if (sims !== null) { z.passMitSims++; abweichungen.push({zug: j + 1, arm, farbe, sims, soll: soll[arm], stein: false}); }
    }
  }
  return {zellen, abweichungen, summe, zahl};
}

/* Kern: nimmt bereits gelesene Daten, damit die Tests ohne Dateien auskommen.
   eingabe = {commit, bloecke (Blocksummen des Stands), pruefsummen (Map), laeufe (Map oder null),
              teile: [{laufId, daten (JSON oder Error), roh (Array der Zeilen-Objekte oder Error)}]} */
function pruefe(eingabe) {
  const kein = [], befunde = [];
  const zellen = Object.fromEntries(ZELLEN.map(([a, f]) => [a + f, leereZelle()]));
  const konfigA = new Map(), konfigB = new Map(), hashes = new Map();
  let partien = 0, pruefsummenGitHub = 0, pruefsummenLaeufe = 0;
  const befund = (art, ort, text) => befunde.push({art, ort, text});

  /* Engine-Stand und Commit (§6). */
  for (const [block, soll] of Object.entries(BLOCKSUMMEN))
    if ((eingabe.bloecke || {})[block] !== soll)
      kein.push(`Engine: Block ${block} hat SHA-256 ${((eingabe.bloecke || {})[block] || 'fehlt').slice(0, 16)}…, `
        + `festgelegt ist ${soll.slice(0, 16)}… (§6).`);

  /* Teilläufe: jeder Seed genau einmal, jede Lauf-ID genau einmal. */
  const ids = new Map(), seeds = new Map();
  for (const t of eingabe.teile) {
    if (ids.has(t.laufId)) kein.push(`Lauf ${t.laufId} ist doppelt übergeben.`);
    ids.set(t.laufId, t);
  }
  if (eingabe.pruefsummenDoppelt && eingabe.pruefsummenDoppelt.length)
    kein.push(`Prüfsummen: Lauf ${eingabe.pruefsummenDoppelt.join(', ')} steht mehrfach in der Liste.`);

  for (const t of eingabe.teile) {
    const wo = `Lauf ${t.laufId}`;
    /* Prüfsummen. */
    const p = eingabe.pruefsummen.get(t.laufId);
    if (!p) kein.push(`${wo}: keine Prüfsumme übergeben.`);
    else {
      if (!HEX64.test(p.sha) || p.sha !== p.digest)
        kein.push(`${wo}: SHA-256 des Artefakts ${p.sha.slice(0, 16) || 'fehlt'}… weicht von der Angabe von GitHub `
          + `${p.digest.slice(0, 16) || 'fehlt'}… ab.`);
      else pruefsummenGitHub++;
      if (eingabe.laeufe) {
        const l = eingabe.laeufe.get(t.laufId);
        if (!l) kein.push(`${wo} steht nicht in laeufe.csv.`);
        else if (l !== p.sha) kein.push(`${wo}: SHA-256 ${p.sha.slice(0, 16)}… weicht von laeufe.csv ${l.slice(0, 16)}… ab.`);
        else pruefsummenLaeufe++;
      }
    }
    if (t.daten instanceof Error) { kein.push(`${wo}: Ergebnis-JSON nicht lesbar (${t.daten.message}).`); continue; }
    if (t.roh instanceof Error) { kein.push(`${wo}: Rohdump nicht lesbar (${t.roh.message}).`); continue; }
    const k = t.daten.konfig || {};
    const seed = k.seed;
    if (p && p.name !== undefined && !new RegExp(`^ab-harness-${K3.partienJeTeil}p-seed${seed}-run\\d+$`).test(p.name))
      kein.push(`${wo}: Artefakt ${p.name} passt nicht zu Seed ${seed}.`);
    if (!K3.seeds.includes(seed)) kein.push(`${wo}: Seed ${seed} gehört nicht zu K3 (11260001 bis 11260123).`);
    else if (seeds.has(seed)) kein.push(`Seed ${seed} kommt doppelt vor (Lauf ${seeds.get(seed)} und ${t.laufId}).`);
    else seeds.set(seed, t.laufId);
    if (k.commit !== eingabe.commit)
      kein.push(`${wo} lief auf ${k.commit ? String(k.commit).slice(0, 12) : 'unbekanntem Commit'}, `
        + `festgelegt ist ${eingabe.commit.slice(0, 12)}.`);
    if (k.abgeschlossen !== true) kein.push(`${wo} ist nicht abgeschlossen.`);
    if (k.komi !== K3.komi) kein.push(`${wo}: Komi ${k.komi}, festgelegt ist 7,5.`);
    if (k.modus !== 'standard') kein.push(`${wo}: Modus ${k.modus}, festgelegt ist der Standardmodus.`);

    /* Konfiguration der Arme: genau die festgelegten Schlüssel und Werte. */
    for (const [arm, s] of [['A', k.A], ['B', k.B]]) {
      (arm === 'A' ? konfigA : konfigB).set(String(s), ((arm === 'A' ? konfigA : konfigB).get(String(s)) || 0) + 1);
      const x = spec(s), keys = Object.keys(x).sort();
      if (keys.join(',') !== [...K3.schluessel].sort().join(',') || x.mctsFixedSims !== K3.soll[arm] || x.resignEnabled !== 0)
        befund('Konfiguration', wo, `Arm ${arm} läuft mit „${s}“, festgelegt ist `
          + `mctsFixedSims=${K3.soll[arm]},resignEnabled=0.`);
    }

    const ps = Array.isArray(t.daten.partien) ? t.daten.partien : [];
    if (ps.length !== K3.partienJeTeil) kein.push(`${wo} hat ${ps.length} Partien im JSON, festgelegt sind ${K3.partienJeTeil}.`);
    if (t.roh.length !== ps.length) { kein.push(`${wo}: JSON ${ps.length} Partien, Rohdump ${t.roh.length}.`); continue; }

    ps.forEach((x, i) => {
      const r = t.roh[i] || {};
      const ort = `Seed ${seed} Partie ${x && x.partie}`;
      if (!x || x.partie !== i + 1) { kein.push(`${wo}: Partie an Stelle ${i + 1} trägt Nummer ${x && x.partie}.`); return; }
      if (r.nr !== x.partie) { kein.push(`${ort}: Rohdump-Zeile ${i + 1} trägt Nummer ${r.nr}.`); return; }
      if (r.seed !== seed) { kein.push(`${ort}: Rohdump nennt Seed ${r.seed}.`); return; }
      const f = partieFehler(x);
      if (f) { kein.push(`${ort}: nicht zählbar nach §13.4 (${f}).`); return; }
      if (typeof r.params_hash !== 'string' || !HEX64.test(r.params_hash)) { kein.push(`${ort}: params_hash fehlt.`); return; }
      hashes.set(r.params_hash, (hashes.get(r.params_hash) || 0) + 1);
      const ev = r.ereignisse;
      if (!Array.isArray(ev)) { kein.push(`${ort}: Rohdump ohne Zugereignisse.`); return; }
      if (r.zuege !== x.zuege || ev.length !== x.zuege) {
        kein.push(`${ort}: Zugzahl JSON ${x.zuege}, Rohdump ${r.zuege}, Zugereignisse ${ev.length}.`);
        return;
      }
      partien++;

      /* Zuordnung von Farbe und Arm. */
      const aSollFarbe = x.partie % 2 === 1 ? 'Schwarz' : 'Weiß';
      if (x.aIst !== aSollFarbe)
        befund('Zuordnung', ort, `A spielt ${x.aIst}; im Harness ist A in ${x.partie % 2 ? 'ungeraden' : 'geraden'} `
          + `Partien ${aSollFarbe}.`);
      const armVon = {S: r.armSchwarz, W: r.armWeiss};
      if (!['A', 'B'].includes(r.armSchwarz) || !['A', 'B'].includes(r.armWeiss) || r.armSchwarz === r.armWeiss) {
        befund('Zuordnung', ort, `Rohdump nennt armSchwarz ${r.armSchwarz}, armWeiss ${r.armWeiss}.`);
        return;
      }
      if ((r.armSchwarz === 'A') !== (x.aIst === 'Schwarz'))
        befund('Zuordnung', ort, `JSON: A spielt ${x.aIst}; Rohdump: Schwarz ist Arm ${r.armSchwarz}.`);
      if (r.sieger !== x.siegerFarbe)
        befund('Zuordnung', ort, `Siegerfarbe im Rohdump ${r.sieger}, im JSON ${x.siegerFarbe}.`);
      zellen['A' + (r.armSchwarz === 'A' ? 'S' : 'W')].partien++;
      zellen['B' + (r.armSchwarz === 'B' ? 'S' : 'W')].partien++;

      /* Je Zug: Arm aus der Farbe, Steinzug mit genau dem Sollwert, Pass ohne Meldung. */
      const z = zuegePruefen(ev, armVon, K3.soll);
      if (z.fehler) { kein.push(`${ort}: ${z.fehler}`); return; }
      for (const [k, w] of Object.entries(z.zellen))
        for (const [feld, n] of Object.entries(w)) zellen[k][feld] += n;
      for (const d of z.abweichungen)
        befund('Simulationen', `${ort} Zug ${d.zug}`, d.stein
          ? `Steinzug von Arm ${d.arm} (${FARBNAME[d.farbe]}) meldet `
            + `${d.sims === null ? 'keine Simulationen' : d.sims + ' Simulationen'}, festgelegt sind ${d.soll}.`
          : `Pass von Arm ${d.arm} (${FARBNAME[d.farbe]}) meldet ${d.sims} Simulationen.`);
      const {summe, zahl} = z;
      for (const arm of ['A', 'B']) {
        const erwartet = zahl[arm] ? Math.round(summe[arm] / zahl[arm]) : 0;
        const ist = arm === 'A' ? x.simsA : x.simsB;
        if (ist !== erwartet)
          befund('Zählung', ort, `sims${arm} im JSON ${ist}, aus den Zugereignissen ${erwartet}.`);
      }
    });
  }

  const fehlend = K3.seeds.filter(s => !seeds.has(s));
  if (fehlend.length) kein.push(`${fehlend.length} Seeds fehlen: ${fehlend.slice(0, 10).join(', ')}${fehlend.length > 10 ? ', …' : ''}.`);
  if (hashes.size > 1)
    befund('Konfiguration', 'alle Läufe', `${hashes.size} verschiedene params_hash: `
      + [...hashes].map(([h, n]) => `${h.slice(0, 12)}… (${n} Partien)`).join(', ') + '.');

  return {kein, befunde, zellen, partien, pruefsummenGitHub, pruefsummenLaeufe, laeufeVerglichen: !!eingabe.laeufe,
          teile: eingabe.teile.length, konfigA, konfigB, hashes};
}

function status(e) { return e.kein.length ? 1 : e.befunde.length ? 3 : 0; }

function bericht(e, commit) {
  const L = [];
  const s = status(e);
  L.push('# Aufbauprüfung K3, Schritt 1: Übernahme der Simulationszahl', '');
  if (s === 1) L.push('**KEIN URTEIL.**');
  else if (s === 3) L.push('**Gültig. Aufbaufehler gefunden.**');
  else L.push('**Gültig. Kein Aufbaufehler gefunden:** Jeder Steinzug von A meldet genau 2600, jeder Steinzug von B '
    + 'genau 5200 Simulationen, in beiden Farben; jede Entscheidung ohne Meldung ist ein Pass.');
  L.push(`Commit ${commit} · Festlegung: docs/skalierung-aufbaupruefung-vorabfestlegung.md §1`, '');
  if (e.kein.length) {
    L.push('## Gründe für KEIN URTEIL', '');
    for (const g of e.kein.slice(0, 40)) L.push(`- ${g}`);
    if (e.kein.length > 40) L.push(`- und ${e.kein.length - 40} weitere`);
    L.push('');
  }
  L.push('## Je Arm und Farbe', '');
  L.push('| Arm | Farbe | Sollwert | Partien | Entscheidungen | Steinzüge | davon genau Sollwert | Abweichungen | Pässe | Pässe mit Meldung |');
  L.push('|---|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const [a, f] of ZELLEN) {
    const z = e.zellen[a + f];
    L.push(`| ${a} | ${FARBNAME[f]} | ${K3.soll[a]} | ${z.partien} | ${z.entscheidungen} | ${z.stein} | ${z.steinSoll} | `
      + `${z.steinAbw} | ${z.paesse} | ${z.passMitSims} |`);
  }
  L.push('');
  L.push('## Daten', '');
  L.push(`- Teilläufe ${e.teile}, geprüfte Partien ${e.partien}.`);
  L.push(`- Prüfsummen: ${e.pruefsummenGitHub} von ${e.teile} gleich der Angabe von GitHub; `
    + (e.laeufeVerglichen ? `${e.pruefsummenLaeufe} von ${e.teile} gleich laeufe.csv.` : 'laeufe.csv nicht verglichen.'));
  L.push(`- Konfiguration A: ${[...e.konfigA].map(([k, n]) => `„${k}“ (${n})`).join(', ') || 'keine'}; `
    + `B: ${[...e.konfigB].map(([k, n]) => `„${k}“ (${n})`).join(', ') || 'keine'}.`);
  L.push(`- params_hash: ${[...e.hashes].map(([h, n]) => `${h.slice(0, 16)}… (${n} Partien)`).join(', ') || 'keiner'}.`);
  L.push('');
  if (e.befunde.length) {
    L.push(e.kein.length ? '## Zusätzlich gefunden (ohne Urteil)' : '## Befunde', '');
    const arten = new Map();
    for (const b of e.befunde) arten.set(b.art, (arten.get(b.art) || 0) + 1);
    L.push([...arten].map(([a, n]) => `${a}: ${n}`).join(' · '), '');
    for (const b of e.befunde.slice(0, 40)) L.push(`- ${b.art}, ${b.ort}: ${b.text}`);
    if (e.befunde.length > 40) L.push(`- und ${e.befunde.length - 40} weitere`);
    L.push('');
  }
  return L.join('\n');
}

function liesJson(pfad) { try { return JSON.parse(fs.readFileSync(pfad, 'utf8')); } catch (err) { return err; } }
function liesRoh(pfad) {
  try { return fs.readFileSync(pfad, 'utf8').split('\n').filter(z => z.trim()).map(z => JSON.parse(z)); }
  catch (err) { return err; }
}

function main() {
  let a;
  try { a = argumente(process.argv.slice(2)); }
  catch (err) {
    if (err instanceof Bedienfehler) { console.error(`Bedienfehler: ${err.message}`); process.exit(2); }
    throw err;
  }
  const ps = liesPruefsummen(fs.readFileSync(a.pruefsummen, 'utf8'));
  let laeufe = null;
  const kein = [];
  if (a.laeufe) {
    laeufe = liesLaeufe(fs.readFileSync(a.laeufe, 'utf8'));
    if (!laeufe) kein.push(`${a.laeufe} hat keine Spalten Lauf-ID und SHA256.`);
  }
  let bloecke;
  try { bloecke = blocksummen(a.html); } catch (err) { bloecke = {}; kein.push(`Stand ${a.html} nicht lesbar (${err.message}).`); }
  const e = pruefe({commit: a.commit, bloecke, pruefsummen: ps.m, pruefsummenDoppelt: ps.doppelt, laeufe,
                    teile: a.teile.map(t => ({laufId: t.laufId, daten: liesJson(t.json), roh: liesRoh(t.roh)}))});
  e.kein.unshift(...kein);
  console.log(bericht(e, a.commit));
  process.exit(status(e));
}

if (require.main === module) main();
module.exports = {K3, ZELLEN, argumente, liesPruefsummen, liesLaeufe, zuegePruefen, pruefe, status, bericht,
                  Bedienfehler};
