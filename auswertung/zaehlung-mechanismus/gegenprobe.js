// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil D, Gegenproben (beschreibend; KEIN Vorschlag und KEINE Spieländerung): Eine TEST-KOPIE von index.html
   (im Verzeichnis --tmp, nicht im Repo) weicht an genau einer Stelle von toteSteineAmEnde ab. Verglichen wird die Tot-Menge
   an den Anfangsstellungen der Stufe C mit GNU Gos Tot-Liste. Das ist ein nachträglicher Diagnosebefund an denselben Daten,
   an denen die Auffälligkeit gefunden wurde; er ist keine unabhängige Bestätigung und keine Verbesserungsmessung.
   Varianten:
     freiheitsverband  keine Verbandsbildung über gemeinsame Freiheiten (Verbände nur über gemeinsame Augen)
     diagonalauge      ein Ein-Punkt-Auge zählt nur, wenn _diagIsTrueEye es bestätigt
   Ausgabe --aus: je Stellung die Ketten „nur GNU tot“ und „nur App tot“, Original und Variante (für die Einzelprüfung).
   Aufruf: node gegenprobe.js --variante diagonalauge --html index.html --daten <entpacktes-Artefakt> --tmp <Verz> --aus x.json */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['variante', 'html', 'daten', 'tmp', 'aus']);
const VARIANTEN = {
  freiheitsverband: ['if (erste[f] < 0) erste[f] = k; else eins(erste[f], k);', '/* Gegenprobe: keine Verbandsbildung über gemeinsame Freiheiten */'],
  diagonalauge: ['V.augen++; if (r.groesse >= augeGross', 'if (r.groesse === 1 && !_diagIsTrueEye(b, r.punkte[0], r.rand)) continue; V.augen++; if (r.groesse >= augeGross']
};
if (!VARIANTEN[o.variante]) throw new Error('Variante unbekannt: ' + o.variante);
const orig = G.fs.readFileSync(o.html, 'utf8');
const [anker, ersatz] = VARIANTEN[o.variante];
if (orig.split(anker).length !== 2) throw new Error('Anker nicht genau einmal');
G.fs.mkdirSync(o.tmp, {recursive: true});
const kopie = G.path.join(o.tmp, `index-gegenprobe-${o.variante}.html`);
G.fs.writeFileSync(kopie, orig.replace(anker, ersatz));
const zeilen = G.ladeZeilen(o.daten), N = G.N;
const E0 = G.ladeKI({htmlPfad: o.html, mitNetz: false});
const tot0 = zeilen.map(r => Array.from(E0.toteSteineAmEnde(G.brettAus(r.diagnose.anfang.brett))));
const E1 = G.ladeKI({htmlPfad: kopie, mitNetz: false});
const tot1 = zeilen.map(r => Array.from(E1.toteSteineAmEnde(G.brettAus(r.diagnose.anfang.brett))));
const NB = E1.NEIGHBORS;
function kettenListe(board, gnu, tot, kiFarbe) {
  const gesehen = new Uint8Array(N), nurGnu = [], nurApp = [];
  for (let i = 0; i < N; i++) {
    if (!board[i] || gesehen[i]) continue;
    /* Kette = zusammenhängende Steine gleicher Farbe UND gleichen Urteils beider Verfahren */
    const key = p => (gnu.has(p) ? 1 : 0) * 2 + (tot[p] ? 1 : 0), q = [i]; gesehen[i] = 1;
    for (let k = 0; k < q.length; k++) for (const n of NB[q[k]]) if (!gesehen[n] && board[n] === board[i] && key(n) === key(i)) { gesehen[n] = 1; q.push(n); }
    const k = key(i);
    if (k === 2 || k === 1) (k === 2 ? nurGnu : nurApp).push({farbe: board[i] === kiFarbe ? 'KI' : 'Gegner', steine: q.length, punkte: q.map(G.L.zuGtp)});
  }
  return {nurGnuTot: nurGnu, nurAppTot: nurApp};
}
const mass = (tots, filter) => {
  let stell = 0, gleichStell = 0, gnuNurTot = 0, appNurTot = 0;
  zeilen.forEach((r, ix) => {
    if (!filter(r)) return; stell++;
    const g = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
    let a = 0, b = 0;
    for (let i = 0; i < N; i++) { const t = !!tots[ix][i]; if (g.has(i) && !t) a++; else if (!g.has(i) && t) b++; }
    gnuNurTot += a; appNurTot += b; if (!a && !b) gleichStell++;
  });
  return {stellungen: stell, gleichTotMenge: gleichStell, steineNurGnuTot: gnuNurTot, steineNurAppTot: appNurTot};
};
const einzel = [];
zeilen.forEach((r, ix) => {
  if (!G.istV(r)) return;
  const board = G.brettAus(r.diagnose.anfang.brett), gnu = new Set(r.diagnose.anfang.tote.map(G.L.vonGtp));
  einzel.push({schluessel: r.schluessel, kiFarbe: r.kiFarbe, original: kettenListe(board, gnu, tot0[ix], r.kiFarbe), variante: kettenListe(board, gnu, tot1[ix], r.kiFarbe)});
});
const kennzahlen = {alleOriginal: mass(tot0, () => true), alleVariante: mass(tot1, () => true), vOriginal: mass(tot0, G.istV), vVariante: mass(tot1, G.istV)};
G.fs.writeFileSync(o.aus, JSON.stringify({variante: o.variante, htmlSha256: G.sha256(orig), kennzahlen, vStellungenEinzeln: einzel}, null, 1));
console.log('Variante', o.variante, '| index.html SHA-256', G.sha256(orig));
console.log('Original   alle   :', JSON.stringify(kennzahlen.alleOriginal));
console.log('Variante   alle   :', JSON.stringify(kennzahlen.alleVariante));
console.log('Original   nur V  :', JSON.stringify(kennzahlen.vOriginal));
console.log('Variante   nur V  :', JSON.stringify(kennzahlen.vVariante));
const nApp = einzel.reduce((s, e) => s + e.variante.nurAppTot.length, 0), stApp = einzel.reduce((s, e) => s + e.variante.nurAppTot.reduce((t, k) => t + k.steine, 0), 0);
const sum = (w, art) => { const k = einzel.flatMap(e => e[w][art]); return `${k.length} Ketten, ${k.reduce((s, x) => s + x.steine, 0)} Steine (KI-Farbe ${k.filter(x => x.farbe === 'KI').length}, Gegner ${k.filter(x => x.farbe === 'Gegner').length})`; };
for (const [w, n] of [['original', 'Original'], ['variante', 'Variante']]) for (const [art, t] of [['nurGnuTot', 'nur GNU tot'], ['nurAppTot', 'nur App tot']]) console.log(`V, ${n}: Ketten „${t}“: ${sum(w, art)}`);
console.log(`V, Variante: Ketten „nur App tot“: ${nApp} (${stApp} Steine), davon KI-Farbe ${einzel.reduce((s, e) => s + e.variante.nurAppTot.filter(k => k.farbe === 'KI').length, 0)}, Gegner ${einzel.reduce((s, e) => s + e.variante.nurAppTot.filter(k => k.farbe === 'Gegner').length, 0)}; Einzelliste in ${G.path.basename(o.aus)}`);
