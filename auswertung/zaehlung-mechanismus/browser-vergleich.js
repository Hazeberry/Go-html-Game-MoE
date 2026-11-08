// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil B: Prüft den Bericht eines browser.cjs-Laufs gegen die eigene index.html auf Gültigkeit und vergleicht ihn mit dem
   der Wiederholung (docs/daten/bughunt-wiederholung/lauf1/browser/bericht.json). Gleich heißt: gleiche Felder außer Zeitstempel.
   Gültigkeit (nur zwei Zustände): Der Bericht ist lesbar, hat keinen Startfehler, nennt den Browser, gehört zur angegebenen
   index.html (SHA-256), ist nicht älter als der Start dieses Laufs (--seit) und enthält jeden der sieben Pflichtfälle genau einmal mit dem Status
   „reproduziert“ oder „nicht_reproduziert“. Sonst „KEIN URTEIL“ mit Grund und Exit 1. Ein bloßer Exit 1 von browser.cjs belegt nichts:
   Er heißt „mindestens ein Fall reproduziert“, kommt aber auch bei einem technischen Fehler von node vor.
   Aufruf: node browser-vergleich.js --eigen bericht.json --lauf1 bericht.json --html index.html --seit 2026-11-08T02:00:00.000Z */
'use strict';
const PFLICHTFAELLE = ['UI-1', 'TRAIN-1.pass', 'TRAIN-1.resign', 'UI-2', 'UI-3', 'TRAIN-2', 'NET-1'];
const STATUS = ['reproduziert', 'nicht_reproduziert'];
/* Gibt die Gründe zurück, warum der Bericht kein Urteil trägt (leere Liste = gültig). erwartet: {sha256, seit} */
function pruefeBericht(b, erwartet = {}) {
  const g = [];
  if (!b || typeof b !== 'object') return ['Bericht nicht lesbar'];
  if (b.startfehler) g.push('Startfehler: ' + String(b.startfehler).slice(0, 120));
  if (!b.browser) g.push('Browserversion fehlt (Browser nicht gestartet)');
  if (!b.quelle || typeof b.quelle.sha256 !== 'string') g.push('quelle.sha256 fehlt');
  else if (erwartet.sha256 && b.quelle.sha256 !== erwartet.sha256) g.push(`Bericht gehört zu einer anderen index.html (${b.quelle.sha256.slice(0, 12)} statt ${erwartet.sha256.slice(0, 12)})`);
  if (erwartet.seit) {
    const t = Date.parse(b.zeit), s = Date.parse(erwartet.seit);
    if (!Number.isFinite(t)) g.push('Zeitstempel fehlt oder unlesbar');
    else if (Number.isFinite(s) && t < s) g.push(`Bericht ist älter als der Lauf (${b.zeit} vor ${erwartet.seit}): alte Ausgabe`);
  }
  const tests = Array.isArray(b.tests) ? b.tests : null;
  if (!tests) g.push('tests fehlt');
  else {
    for (const id of PFLICHTFAELLE) {
      const n = tests.filter(t => t && t.id === id);
      if (n.length === 0) g.push(`Pflichtfall fehlt: ${id}`);
      else if (n.length > 1) g.push(`Pflichtfall doppelt: ${id}`);
      else if (!STATUS.includes(n[0].status)) g.push(`Pflichtfall ${id} ohne gültigen Status (${n[0].status})`);
    }
    for (const t of tests) if (!t || !PFLICHTFAELLE.includes(t.id)) g.push(`unerwarteter Fall: ${t && t.id}`);
  }
  return g;
}
module.exports = {pruefeBericht, PFLICHTFAELLE};

if (require.main === module) {
  const G = require('./gemeinsam.js');
  const o = G.optionen(process.argv.slice(2), ['eigen', 'lauf1', 'html', 'seit']);
  const kein = grund => { console.log('KEIN URTEIL: ' + grund); process.exit(1); };
  let a, b;
  try { a = JSON.parse(G.fs.readFileSync(o.eigen, 'utf8')); } catch (e) { kein('Bericht fehlt oder ist nicht lesbar: ' + o.eigen); }
  try { b = JSON.parse(G.fs.readFileSync(o.lauf1, 'utf8')); } catch (e) { kein('Bericht der Wiederholung fehlt oder ist nicht lesbar: ' + o.lauf1); }
  let sha;
  try { sha = G.sha256(G.fs.readFileSync(o.html)); } catch (e) { kein('index.html nicht lesbar: ' + o.html); }
  const gruende = pruefeBericht(a, {sha256: sha, seit: o.seit});
  if (gruende.length) kein(gruende.join('; '));
  console.log(`Bericht gültig: sieben Pflichtfälle, eigene index.html SHA-256 ${a.quelle.sha256}, Browser ${a.browser}, Zeit ${a.zeit}`);
  console.log(`Lauf 1             SHA-256 ${b.quelle.sha256} | Browser ${b.browser}`);
  const fl = (x, p = '') => Object.entries(x).flatMap(([k, v]) => (v && typeof v === 'object' ? fl(v, p + k + '.') : [[p + k, v]]));
  for (const t of a.tests) {
    const u = (b.tests || []).find(x => x.id === t.id);
    const A = Object.fromEntries(fl(t)), B = u ? Object.fromEntries(fl(u)) : {};
    const diff = [...new Set([...Object.keys(A), ...Object.keys(B)])].filter(k => JSON.stringify(A[k]) !== JSON.stringify(B[k]));
    console.log(`${t.id}: ${t.status} (Lauf 1: ${u && u.status}); Seitenfehler: ${JSON.stringify(t.pageErrors || t.seitenfehler || [])}; abweichende Felder: ${diff.length ? diff.join(', ') : 'keine'}`);
  }
}
