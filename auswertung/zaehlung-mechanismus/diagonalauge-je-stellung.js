// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Nachtrag zu docs/zaehlung-mechanismus.md (§12): Einzelanalyse der Gegenprobe „Diagonalauge“ je Stellung.
   Je Anfangsstellung der Stufe C: Tot-Menge von toteSteineAmEnde im Original und in einer TEST-KOPIE von index.html
   (ein Ein-Punkt-Auge zählt nur mit _diagIsTrueEye; die Kopie liegt im Verzeichnis tmp, nicht im Repo) gegen GNU Gos Tot-Liste.
   Klassen je Stellung: unveraendert (Tot-Menge gleich der des ORIGINALS, nicht zwingend gleich GNU Gos), besser (nur behobene
   Abweichungen), schlechter (nur neue), gemischt. Dazu: neu entstandene Abweichungen und die verbleibenden V-Stellungen mit Brett.
   Nachträglicher Diagnosebefund an denselben Daten, keine Verbesserungsmessung. Kein GNU Go, kein Browser, keine Spieländerung.
   Aufruf: node diagonalauge-je-stellung.js <index.html> <entpacktes-Artefakt der Stufe C> <tmp-Verzeichnis> <aus.json> */
'use strict';
const G = require('./gemeinsam.js');
const [html, daten, tmp, aus] = process.argv.slice(2);
const orig = G.fs.readFileSync(html, 'utf8');
const a1 = 'V.augen++; if (r.groesse >= augeGross', a2 = 'if (!schwach) break;';
for (const a of [a1, a2]) if (orig.split(a).length !== 2) throw new Error('Anker: ' + a);
const patch = orig.replace(a1, 'if (r.groesse === 1 && !_diagIsTrueEye(b, r.punkte[0], r.rand)) continue; V.augen++; (V.ag = V.ag || []).push(r.groesse); if (r.groesse >= augeGross')
  .replace(a2, 'if (!schwach) { globalThis.__verb = [...verb.values()].map(V => ({benson: V.benson, augen: V.augen, gross: V.gross, offen: V.offen, ag: V.ag || [], steine: V.steine, punkte: V.ketten.flatMap(k => ketten[k].steine)})); break; }');
G.fs.mkdirSync(tmp, {recursive: true});
const kopie = G.path.join(tmp, 'index-schritt1.html'); G.fs.writeFileSync(kopie, patch);
const zeilen = G.ladeZeilen(daten), N = G.N;
const E0 = G.ladeKI({htmlPfad: html, mitNetz: false});
const t0 = zeilen.map(r => Array.from(E0.toteSteineAmEnde(G.brettAus(r.diagnose.anfang.brett))));
const E1 = G.ladeKI({htmlPfad: kopie, mitNetz: false});
const NB = E1.NEIGHBORS, t1 = [], verb1 = [];
zeilen.forEach(r => { globalThis.__verb = null; t1.push(Array.from(E1.toteSteineAmEnde(G.brettAus(r.diagnose.anfang.brett)))); verb1.push(globalThis.__verb || []); });

function ketten(board, gnu, a, b, ki) {   /* Ketten gleicher Farbe und gleichen Urteils beider Verfahren; Urteil als Schlüssel */
  const gesehen = new Uint8Array(N), out = [];
  const key = p => (gnu.has(p) ? 4 : 0) + (a[p] ? 2 : 0) + (b[p] ? 1 : 0);
  for (let i = 0; i < N; i++) {
    if (!board[i] || gesehen[i]) continue;
    const q = [i]; gesehen[i] = 1;
    for (let k = 0; k < q.length; k++) for (const n of NB[q[k]]) if (!gesehen[n] && board[n] === board[i] && key(n) === key(i)) { gesehen[n] = 1; q.push(n); }
    out.push({farbe: board[i] === ki ? 'KI' : 'Gegner', steine: q.length, key: key(i), punkte: q.map(G.L.zuGtp), anker: i});
  }
  return out;
}
const klassen = {}, zeile = [];
zeilen.forEach((r, ix) => {
  const board = G.brettAus(r.diagnose.anfang.brett), gnu = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
  let behoben = 0, neu = 0, gleichTot = true, nurOrigTot = 0, nurVarTot = 0;
  for (let i = 0; i < N; i++) {
    if (!board[i]) continue;
    const g = gnu.has(i), o = !!t0[ix][i], v = !!t1[ix][i];
    if (o !== v) { gleichTot = false; if (o) nurOrigTot++; else nurVarTot++; }
    if (o !== g && v === g) behoben++;
    if (o === g && v !== g) neu++;
  }
  const k = gleichTot ? 'unveraendert' : behoben && !neu ? 'besser' : neu && !behoben ? 'schlechter' : behoben && neu ? 'gemischt' : 'geaendert ohne Wirkung auf Abweichung';
  const dO = [...Array(N).keys()].filter(i => board[i] && (!!t0[ix][i]) !== gnu.has(i)).length, dV = [...Array(N).keys()].filter(i => board[i] && (!!t1[ix][i]) !== gnu.has(i)).length;
  zeile.push({ix, schluessel: r.schluessel, gruppe: r.gruppe, V: G.istV(r), klasse: k, behoben, neu, dO, dV, nurOrigTot, nurVarTot});
  const kk = k + (G.istV(r) ? ' | V' : ' | nicht V'); klassen[kk] = (klassen[kk] || 0) + 1;
});
console.log('Klassen je Stellung (563):'); for (const [k, v] of Object.entries(klassen).sort()) console.log('  ', k, v);
const sum = f => zeile.reduce((s, z) => s + f(z), 0);
console.log('Steine insgesamt: behoben', sum(z => z.behoben), '| neu entstandene Abweichungen', sum(z => z.neu), '| Original weicht ab', sum(z => z.dO), '| Variante weicht ab', sum(z => z.dV));
console.log('Richtung der Änderung der Tot-Menge: Steine nur im Original tot', sum(z => z.nurOrigTot), '| nur in der Variante tot', sum(z => z.nurVarTot));
const detail = [];
const zeigeBrett = (r, ix) => {
  const board = G.brettAus(r.diagnose.anfang.brett), gnu = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
  const lines = ['    A B C D E F G H J K L M N O P Q R S T'];
  for (let y = 0; y < 19; y++) {
    let s = String(19 - y).padStart(2) + '  ';
    for (let x = 0; x < 19; x++) {
      const i = y * 19 + x, c = board[i]; if (!c) { s += '. '; continue; }
      const g = gnu.has(i), v = !!t1[ix][i];
      /* beide tot: x/o | nur GNU tot: q/r | nur Variante tot: m/n | beide lebend: X/O */
      s += (g && v ? (c === 1 ? 'x' : 'o') : g ? (c === 1 ? 'q' : 'r') : v ? (c === 1 ? 'm' : 'n') : (c === 1 ? 'X' : 'O')) + ' ';
    }
    lines.push(s + ' ' + (19 - y));
  }
  return lines.join('\n');
};
console.log('\nStellungen mit neu entstandenen Abweichungen (Variante, nach „V“):');
for (const z of zeile.filter(z => z.neu > 0)) {
  const r = zeilen[z.ix], board = G.brettAus(r.diagnose.anfang.brett), gnu = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
  const neuKetten = ketten(board, gnu, t0[z.ix], t1[z.ix], r.kiFarbe).filter(c => ((c.key & 4) !== 0) === ((c.key & 2) !== 0) && ((c.key & 4) !== 0) !== ((c.key & 1) !== 0));
  console.log(`  ${z.schluessel}  ${z.V ? 'V' : 'nicht V'}  Klasse ${z.klasse}  behoben ${z.behoben} neu ${z.neu}  Abweichung Original ${z.dO} -> Variante ${z.dV}`);
  for (const c of neuKetten) console.log(`      neu abweichend: ${c.farbe} ${c.steine} Steine [${c.punkte.slice(0, 6).join(',')}${c.punkte.length > 6 ? ',…' : ''}] (GNU ${c.key & 4 ? 'tot' : 'lebend'}, Original ${c.key & 2 ? 'tot' : 'lebend'}, Variante ${c.key & 1 ? 'tot' : 'lebend'})`);
}
console.log('\nVerbleibende V-Stellungen mit Abweichung in der Variante:');
for (const z of zeile.filter(z => z.V && z.dV > 0)) {
  const r = zeilen[z.ix], board = G.brettAus(r.diagnose.anfang.brett), gnu = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
  console.log(`\n  ${z.schluessel}  KI-Farbe ${r.kiFarbe}  GNU ${r.diagnose.anfang.finalScore}  Fläche aus Tot-Liste ${r.diagnose.anfang.flaecheAusTotListe}  Abweichung Original ${z.dO} -> Variante ${z.dV}`);
  const vv = verb1[z.ix], verbVon = new Map(); vv.forEach((V, i) => V.punkte.forEach(p => verbVon.set(p, i)));
  for (const c of ketten(board, gnu, t0[z.ix], t1[z.ix], r.kiFarbe)) {
    const gt = !!(c.key & 4), ot = !!(c.key & 2), vt = !!(c.key & 1);
    if (gt === vt) continue;
    const V = verbVon.has(c.anker) ? vv[verbVon.get(c.anker)] : null;
    console.log(`    ${gt ? 'nur GNU tot' : 'nur Variante tot'}: ${c.farbe} ${c.steine} Steine [${c.punkte.slice(0, 5).join(',')}${c.punkte.length > 5 ? ',…' : ''}] Original ${ot ? 'tot' : 'lebend'}${V ? ` | Verband ${V.steine} Steine, Augenregionen ${V.ag.join(',')}${V.benson ? ', Benson-Kette im Verband' : ''}` : ''}`);
  }
  detail.push(z.schluessel);
  console.log(zeigeBrett(r, z.ix));
}
console.log('\nLegende: X/O beide lebend; x/o beide tot; q/r nur GNU tot (Schwarz/Weiß); m/n nur Variante tot (Schwarz/Weiß)');
G.fs.writeFileSync(aus, JSON.stringify({klassen, zeile}, null, 1));
