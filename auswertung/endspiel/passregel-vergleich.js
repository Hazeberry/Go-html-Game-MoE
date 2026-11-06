// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Passregel-Vergleich, Auswertung (docs/passregel-vergleich.md §7 bis §9).
   Liest die Einheiten aus Stufe A und die Ergebniszeilen der Fortsetzungs-Pakete und schreibt
   Bericht und Zahlen. Mit --probe (Stufe B) erscheinen KEINE Wirkungszahlen (keine Siegwechsel,
   keine Punkt-Mittel, keine Intervalle): nur Gültigkeit, Kontrollen, Ausfälle und Dauer.

   Aufruf:
     node auswertung/endspiel/passregel-vergleich.js --einheiten einheiten.jsonl
        --ergebnisse datei.jsonl[,datei.jsonl...] --aus verzeichnis --nachspiel nachspiel.json [--probe]
   Endet mit Code 1, wenn der Lauf ungültig ist (Pflichtprüfung verletzt, Territory-Kontrolle verfehlt,
   Ergebnis doppelt). Ein gültiger Lauf kann trotzdem „Grenze von 2 % nicht gezeigt“ lauten. */
'use strict';
const fs = require('fs'), path = require('path');
const L = require('./passregel-lib.js');

const f1 = v => (v === null || v === undefined || !Number.isFinite(v) ? '–' : v.toFixed(1).replace('.', ','));
const f3 = v => (v * 100).toFixed(2).replace('.', ',') + ' %';
const iv = c => c ? `${f3(c.anteil)} [${f3(c.unten)} bis ${f3(c.oben)}]` : '–';

function auswerten({einheiten, zeilen, probe}) {
  const ergebnisse = new Map(), doppelt = [];
  for (const r of zeilen) { if (ergebnisse.has(r.schluessel)) doppelt.push(r.schluessel); ergebnisse.set(r.schluessel, r); }
  const bekannt = new Set(einheiten.map(e => e.schluessel));
  const unbekannt = zeilen.filter(r => !bekannt.has(r.schluessel)).map(r => r.schluessel);
  /* Territory-Kontrollen (§9 Nr. 5): Fläche aus der Tot-Liste gleich final_score auf allen Stellungen */
  const verletzt = zeilen.filter(r => r.kontrolle && r.kontrolle.flaecheTotListe === false).map(r => r.schluessel);
  const kontrollen = {ok: verletzt.length === 0, grund: verletzt.length ? `Fläche aus Tot-Liste ≠ final_score bei ${verletzt.length} Stellung(en)` : null};
  const ergebnis = L.bewerte(einheiten, ergebnisse, kontrollen);
  const globaleFehler = [];
  if (doppelt.length) globaleFehler.push(`${doppelt.length} Ergebnis(se) doppelt`);
  if (unbekannt.length) globaleFehler.push(`${unbekannt.length} Ergebnis(se) ohne Einheit`);
  if (globaleFehler.length) ergebnis.gueltig = false;
  const konv = {};
  for (const r of zeilen) { const k = r.kontrolle && r.kontrolle.gefangen && r.kontrolle.gefangen.konvention; if (k) konv[k] = (konv[k] || 0) + 1; }
  const dauer = zeilen.map(r => r.dauerMs).filter(Number.isFinite);
  return {ergebnis, globaleFehler, konv, verletztTotListe: verletzt, dauer: dauer.length ? {n: dauer.length, mittelS: L.mittel(dauer) / 1000, maxS: Math.max(...dauer) / 1000, summeS: dauer.reduce((s, x) => s + x, 0) / 1000} : null,
          zeilenZahl: zeilen.length, einheitenZahl: einheiten.length, probe};
}

function bericht(a) {
  const md = [], r = a.ergebnis;
  md.push(`# Passregel-Vergleich, ${a.probe ? 'technische Probe (Stufe B)' : 'Hauptlauf (Stufe C)'}`, '');
  md.push(`Einheiten aus Stufe A: ${a.einheitenZahl}; Ergebniszeilen: ${a.zeilenZahl}.`, '');
  md.push(r.gueltig ? '**Lauf gültig.**' : '**Lauf UNGÜLTIG: kein Urteil.**');
  for (const w of ['flaeche', 'territory']) {
    const z = r.wertungen[w];
    if (!z.gueltig) md.push(`- ${w}: ungültig (${z.gruendeUngueltig.join('; ')})`);
  }
  for (const g of a.globaleFehler) md.push(`- ${g}`);
  md.push('', '## Pflichtprüfungen und Kontrollen', '');
  for (const w of ['flaeche', 'territory']) {
    const z = r.wertungen[w];
    md.push(`- ${w}: N ${z.N}, Ausfälle ${z.ausfaelle} (${f3(z.ausfallAnteil)}), davon ohne Ergebnis ${z.fehlend}, Pflichtfehler ${z.pflichtFehler.length}`);
    for (const p of z.pflichtFehler.slice(0, 10)) md.push(`    - ${p.schluessel}: ${p.fehler.join('; ')}`);
  }
  if (a.nachspiel) md.push(`- Nachspiel-Kontrolle am Archiv (§9 Nr. 4): ${a.nachspiel.ok ? 'bestanden' : 'NICHT bestanden'}; ` + a.nachspiel.gruppen.map(g => `${g.name} ${g.gleich}/${g.geprueft}`).join(', '));
  md.push(`- Konvention von GNU Gos \`captures\` (Anzahl Stellungen): ${JSON.stringify(a.konv)}`);
  if (a.verletztTotListe.length) md.push(`- Fläche aus Tot-Liste ≠ final_score: ${a.verletztTotListe.join(', ')}`);
  if (a.dauer) md.push(`- Dauer je Einheit: Mittel ${a.dauer.mittelS.toFixed(0)} s, Maximum ${a.dauer.maxS.toFixed(0)} s, Summe ${(a.dauer.summeS / 3600).toFixed(2)} h`);
  md.push('', '## Ausfälle (einzeln, §9 Nr. 6)', '');
  for (const w of ['flaeche', 'territory']) {
    const z = r.wertungen[w];
    md.push(`${w}: ${z.ausfallListe.length}`);
    for (const x of z.ausfallListe) md.push(`- ${x.schluessel}: ${x.grund}${x.sofort !== undefined && x.sofort !== null ? ` (sofort aus KI-Sicht ${f1(x.sofort)})` : x.sofort === null ? ' (sofort unbekannt)' : ''}`);
  }
  if (a.probe) { md.push('', '**Probe: keine Wirkungsauswertung.** Siegwechsel, Punkt-Mittel und Intervalle werden nicht berichtet.'); return md.join('\n') + '\n'; }
  md.push('', '## E1 verlorene Siege (Endpunkt, §7)', '');
  for (const w of ['flaeche', 'territory']) {
    const z = r.wertungen[w];
    md.push(`### ${w}`, '',
      `N = ${z.N} (alle Auslösungen), L = ${z.L}, A = ${z.A}, K = L + A = ${z.K}, G = ${z.G}`, '',
      `- K/N: ${iv(z.cpK)}`, `- L/N: ${iv(z.cpL)}`, `- L/W₀ (W₀ = ${z.W0}, nur beschreibend): ${iv(z.cpL_W0)}`,
      `- Grenze 2,0 % ${z.grenzeErreicht ? 'erreicht' : 'nicht erreicht'} (bei K = 0 braucht es N ≥ ${z.nMindestensFuerNull})`,
      `- L gegen G, exakter Test: p = ${z.mcnemar.p.toFixed(4)} (beschreibend)`, '');
    md.push('| Gruppe | N | L | A | G |', '|---|---:|---:|---:|---:|');
    for (const [k, v] of Object.entries(z.gruppen)) md.push(`| ${k} | ${v.N} | ${v.L} | ${v.A} | ${v.G} |`);
    md.push('', '| KI-Farbe | N | L | A | G |', '|---|---:|---:|---:|---:|');
    for (const [k, v] of Object.entries(z.farben)) md.push(`| ${k} | ${v.N} | ${v.L} | ${v.A} | ${v.G} |`);
    md.push('');
  }
  md.push('## E2 Punktverlust, E3 Züge, Nebenkennzahlen (beschreibend)', '');
  for (const w of ['flaeche', 'territory']) {
    const z = r.wertungen[w];
    md.push(`### ${w}`, '');
    if (!z.paareGueltig) md.push(`**E2, E3 und G ungültig:** Ausfälle ${f3(z.ausfallAnteil)} > ${f3(r.maxAusfallAnteil)} der Auslösungen (kein Urteil).`);
    else {
      if (z.punkte) md.push(`- E2: D = „weiter“ − „sofort“ (KI-Sicht), n = ${z.punkte.n}: Mittel ${f1(z.punkte.mittel)}${z.punkte.t ? ` [${f1(z.punkte.t.unten)} bis ${f1(z.punkte.t.oben)}]` : ''}, Median ${f1(z.punkte.median)}; „weiter“ besser in ${z.punkte.mehrWeiter}, schlechter in ${z.punkte.wenigerWeiter}, Vorzeichentest p = ${z.punkte.vorzeichen.p.toFixed(4)}`);
      if (z.zuege) md.push(`- E3: KI-Steinzüge in „weiter“ Mittel ${f1(z.zuege.steineMittel)}, Median ${f1(z.zuege.steineMedian)}; KI-Pässe Mittel ${f1(z.zuege.paesseMittel)} (n = ${z.zuege.n})`);
    }
    md.push(`- Auslösung bei verlorener Stellung („sofort“ verliert): ${z.sofortVerloren} von ${z.N}; „sofort“ unbekannt: ${z.sofortUnbekannt}`);
    if (z.zaehlvorschau) md.push(`- Zählvorschau minus GNU Go (KI-Sicht, n = ${z.zaehlvorschau.n}): „mit Annahmen“ Mittel ${f1(z.zaehlvorschau.mitMittel)}, größte Abweichung ${f1(z.zaehlvorschau.mitGroesste)}; „nur Bewiesenes“ Mittel ${f1(z.zaehlvorschau.nurMittel)}, größte Abweichung ${f1(z.zaehlvorschau.nurGroesste)}`);
    md.push('');
  }
  md.push('## Befund', '', r.gueltig ? `**${r.befund}**` : `**${r.befund}**`, '',
    'Das Urteil betrifft ausschließlich den Anteil verlorener Siege pro Auslösung (K/N, beide Wertungen). Punktverluste bei weiterhin gewonnenen Partien und andere Verschlechterungen erfasst es nicht (E2, E3 getrennt). Die Intervalle gelten unter der Modellannahme unabhängiger Einheiten (§10) und nur für dieses Material.');
  return md.join('\n') + '\n';
}

function main() {
  const a = process.argv.slice(2), opt = {einheiten: null, ergebnisse: [], aus: null, probe: false, nachspiel: null};
  for (let i = 0; i < a.length; i++) {
    if (a[i] === '--einheiten') { opt.einheiten = a[++i]; }
    else if (a[i] === '--ergebnisse') { opt.ergebnisse = a[++i].split(',').filter(Boolean); }
    else if (a[i] === '--aus') { opt.aus = a[++i]; }
    else if (a[i] === '--nachspiel') { opt.nachspiel = a[++i]; }
    else if (a[i] === '--probe') opt.probe = true;
    else { console.error('Unbekannte Option ' + a[i]); process.exit(2); }
  }
  if (!opt.einheiten || !opt.aus) { console.error('Aufruf: --einheiten datei --ergebnisse d1[,d2...] --aus verz --nachspiel datei.json [--probe]'); process.exit(2); }
  const einheiten = L.leseJsonl(opt.einheiten);
  const zeilen = opt.ergebnisse.flatMap(d => L.leseJsonl(d));
  const a_ = auswerten({einheiten, zeilen, probe: opt.probe});
  /* §9 Nr. 4: Nachspiel-Kontrolle am Archiv; fehlt sie oder ist sie nicht bestanden, ist der Lauf ungültig */
  let nach = null;
  try { nach = opt.nachspiel ? JSON.parse(fs.readFileSync(opt.nachspiel, 'utf8')) : null; } catch (e) { nach = null; }
  if (!nach) { a_.globaleFehler.push('Nachspiel-Kontrolle fehlt'); a_.ergebnis.gueltig = false; }
  else if (!nach.ok) { a_.globaleFehler.push('Nachspiel-Kontrolle nicht bestanden: ' + nach.gruppen.map(g => `${g.name} ${g.gleich}/${g.verlangt}`).join(', ')); a_.ergebnis.gueltig = false; }
  a_.nachspiel = nach;
  fs.mkdirSync(opt.aus, {recursive: true});
  const md = bericht(a_);
  fs.writeFileSync(path.join(opt.aus, 'bericht.md'), md);
  const roh = opt.probe ? {gueltig: a_.ergebnis.gueltig, globaleFehler: a_.globaleFehler, konv: a_.konv, dauer: a_.dauer, einheiten: a_.einheitenZahl, zeilen: a_.zeilenZahl}
    : {...a_, ergebnis: {...a_.ergebnis, wertungen: Object.fromEntries(Object.entries(a_.ergebnis.wertungen).map(([k, z]) => { const {d, kiSteine, kiPaesse, abwMit, abwNur, ...rest} = z; return [k, rest]; }))}};
  fs.writeFileSync(path.join(opt.aus, 'zahlen.json'), JSON.stringify(roh, null, 1));
  console.log(md);
  if (!a_.ergebnis.gueltig) process.exit(1);
}

if (require.main === module) main();
module.exports = {auswerten, bericht};
