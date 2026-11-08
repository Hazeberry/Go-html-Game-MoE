// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Teil C (docs/zaehlung-mechanismus.md): Stellungen der Stufe C, in denen die Fläche aus GNU Gos Tot-Liste von
   final_score abweicht, mit Muster der gespeicherten Punktabweichungen (bericht/zahlen.json, Feld abweichungen).
   Aufruf: node zaehl-liste.js --daten <entpacktes-Artefakt> */
'use strict';
const G = require('./gemeinsam.js');
const o = G.optionen(process.argv.slice(2), ['daten']);
const zeilen = G.ladeZeilen(o.daten);
const zahlen = JSON.parse(G.fs.readFileSync(G.path.join(o.daten, 'bericht', 'zahlen.json'), 'utf8'));
const klasse = s => {
  const m = /\(GNU Go (gebiet-[SW]|seki-[SW]|dame), unser Besitzer (S|W|neutral)\)/.exec(s);
  if (!m) return 'unlesbar';
  return m[1].startsWith('gebiet') ? 'gebiet/neutral' : m[1].startsWith('seki') ? 'seki/Besitzer' : 'dame/Besitzer';
};
const tab = [];
for (const r of zeilen) {
  const d = r.diagnose || {};
  for (const wo of ['anfang', 'ende']) {
    const x = d[wo];
    if (!x || x.flaecheFinalScore === x.flaecheAusTotListe) continue;
    const abw = ((zahlen.abweichungen || {})[r.schluessel] || []).find(a => a.wo === wo);
    const z = {'gebiet/neutral': 0, 'seki/Besitzer': 0, 'dame/Besitzer': 0, unlesbar: 0};
    for (const p of (abw ? abw.punkte : [])) z[klasse(p)]++;
    tab.push({schluessel: r.schluessel, wo, finalScore: x.finalScore, fTot: x.flaecheAusTotListe, diff: x.flaecheAusTotListe - x.flaecheFinalScore, tote: (x.tote || []).length, punkte: abw ? abw.punkte.length : null, ...z});
  }
}
console.log(`Ergebniszeilen: ${zeilen.length}; Stellungen mit Abweichung: ${tab.length}; Einheiten: ${new Set(tab.map(t => t.schluessel)).size}`);
console.log('| Einheit | wo | final_score | Fläche aus Tot-Liste | Unterschied (Tot-Liste − final_score, Schwarz-Sicht) | tote Steine | Punktabweichungen | gebiet/neutral | seki/Besitzer | dame/Besitzer |');
console.log('|---|---|---|---:|---:|---:|---:|---:|---:|---:|');
for (const t of tab) console.log(`| ${t.schluessel.replace(/\|/g, '\\|')} | ${t.wo} | ${t.finalScore} | ${t.fTot} | ${t.diff} | ${t.tote} | ${t.punkte} | ${t['gebiet/neutral']} | ${t['seki/Besitzer']} | ${t['dame/Besitzer']} |`);
console.log(`\nGruppen der Einheiten: ${JSON.stringify(tab.reduce((m, t) => { const g = t.schluessel.split('|')[0]; m[g] = (m[g] || new Set()).add(t.schluessel); return m; }, {}), (k, v) => (v instanceof Set ? v.size : v))}`);
const ohnePunkte = tab.filter(t => t.punkte === 0);
console.log(`Stellungen ohne gespeicherte Punktabweichung trotz Unterschied: ${ohnePunkte.map(t => t.schluessel + ' (' + t.wo + ')').join('; ') || 'keine'}`);
