/* Zeichnet das Ergebnis-Diagramm für das README: Siegrate jeder gemessenen
   Änderung im Selbstspiel mit 95-%-Konfidenzintervall (Wilson), eingefärbt
   nach der Entscheidung, daneben das Ergebnis gegen GNU Go.

   Die Zahlen stehen unten in DATEN und stammen aus der Tabelle „Belegte
   Ergebnisse“ im README und den Nachträgen in docs/. Wer dort eine Zeile
   ergänzt, ergänzt sie hier und ruft das Skript neu auf.

   Aufruf:
     node auswertung/diagramm.js
   schreibt docs/bilder/ergebnisse-hell.svg und docs/bilder/ergebnisse-dunkel.svg */
'use strict';
const fs = require('fs');
const path = require('path');

/* siege/partien: Partien der Änderung (B) im Selbstspiel.
   art: eingebaut | offen | verworfen | massstab */
const DATEN = [
  {name: 'gebietZug 80', text: 'Gebiet in der Zugbewertung', siege: 300, partien: 360, art: 'eingebaut', gnugo: '+229 nach Zug 120'},
  {name: 'mctsValueScale 200', text: 'statt 350, Skala des Suchwerts', siege: 65, partien: 100, art: 'eingebaut', gnugo: '+14,2 Endstand (n. s.)'},
  {name: 'leseRettung 1', text: 'taktischer Leser rettet Ketten', siege: 452, partien: 720, art: 'offen', gnugo: '−30,5 Endstand'},
  {name: 'Doppelte Suche', text: '240 statt 120 Simulationen', siege: 218, partien: 360, art: 'massstab', gnugo: ''},
  {name: 'endTieBreak 1', text: 'Gleichstand im Endspiel ordnen', siege: 420, partien: 720, art: 'eingebaut', gnugo: ''},
  {name: 'captureCap 200', text: 'Deckel gegen falsche Aufgaben', siege: 778, partien: 1440, art: 'offen', gnugo: ''},
  {name: 'augenSchutz + passUnabwendbar', text: 'eigene Augen nicht füllen, passen', siege: 194, partien: 360, art: 'eingebaut', gnugo: '+217 Endstand'},
  {name: 'krisenKandidaten', text: 'Atari-Rettung immer in die Suche', siege: 372, partien: 720, art: 'verworfen', gnugo: '+7,5 Endstand (n. s.)'},
  {name: 'openContactResponse', text: 'Kontaktantwort in der Eröffnung', siege: 39, partien: 80, art: 'verworfen', gnugo: ''},
  {name: 'raumGewicht + raumZug', text: 'Raumrisiko im Laufkampf', siege: 163, partien: 360, art: 'verworfen', gnugo: ''},
  {name: 'phaseNormalize', text: 'Experten vor dem Blend normieren', siege: 34, partien: 80, art: 'verworfen', gnugo: ''},
  {name: 'netMaxBlend 0,3', text: 'KataGo-Netz als Prior', siege: 42, partien: 120, art: 'verworfen', gnugo: ''},
];

const ARTEN = {
  eingebaut: {label: 'eingebaut'},
  offen: {label: 'kein Default, Schalter im Dashboard'},
  verworfen: {label: 'verworfen'},
  massstab: {label: 'Maßstab'},
};

/* Farben nach docs der Referenzpalette: Slots 1–3, in beiden Modi geprüft. */
const THEMEN = {
  hell: {
    flaeche: '#fcfcfb', primaer: '#0b0b0b', sekundaer: '#52514e', gedaempft: '#898781',
    gitter: '#e1e0d9', achse: '#c3c2b7',
    eingebaut: '#2a78d6', offen: '#eb6834', verworfen: '#1baf7a', massstab: '#52514e',
  },
  dunkel: {
    flaeche: '#1a1a19', primaer: '#ffffff', sekundaer: '#c3c2b7', gedaempft: '#898781',
    gitter: '#2c2c2a', achse: '#383835',
    eingebaut: '#3987e5', offen: '#d95926', verworfen: '#199e70', massstab: '#c3c2b7',
  },
};

function wilson(k, n, z = 1.96) {
  const p = k / n, d = 1 + z * z / n;
  const m = (p + z * z / (2 * n)) / d;
  const h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d;
  return [m - h, m + h];
}

const prozent = (x, s = 1) => (100 * x).toFixed(s).replace('.', ',') + ' %';
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function svg(t) {
  const B = 940, LINKS = 310, PLOT = 330, X0 = LINKS + 12, X1 = X0 + PLOT;
  const SP_RATE = X1 + 28, SP_GNU = SP_RATE + 74;
  const KOPF = 108, ZEILE = 40, FUSS = 92;
  const H = KOPF + DATEN.length * ZEILE + FUSS;
  const MIN = 0.25, MAX = 0.90;
  const x = v => X0 + (v - MIN) / (MAX - MIN) * PLOT;
  const font = 'font-family="system-ui, -apple-system, \'Segoe UI\', Helvetica, Arial, sans-serif"';
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}" ${font} role="img" aria-labelledby="titel beschr">`);
  o.push(`<title id="titel">Gemessene Änderungen an der Go-KI: Siegrate im Selbstspiel</title>`);
  o.push(`<desc id="beschr">${esc(DATEN.map(d => `${d.name}: ${prozent(d.siege / d.partien)} aus ${d.partien} Partien, ${ARTEN[d.art].label}`).join('; '))}</desc>`);
  o.push(`<rect width="${B}" height="${H}" rx="8" fill="${t.flaeche}"/>`);

  /* Titel und Legende */
  o.push(`<text x="24" y="36" font-size="18" font-weight="600" fill="${t.primaer}">Was hat die KI stärker gemacht?</text>`);
  o.push(`<text x="24" y="58" font-size="13" fill="${t.sekundaer}">Siegrate der Änderung im Selbstspiel gegen den Stand ohne sie, 95-%-Konfidenzintervall. 50 % = kein Unterschied.</text>`);
  let lx = 24;
  const ly = 84;
  for (const art of ['eingebaut', 'offen', 'verworfen', 'massstab']) {
    o.push(marke(art, lx + 6, ly - 4, t));
    const w = ARTEN[art].label.length * 6.6 + 34;
    o.push(`<text x="${lx + 18}" y="${ly}" font-size="12.5" fill="${t.sekundaer}">${esc(ARTEN[art].label)}</text>`);
    lx += w;
  }

  /* Gitter und Achse */
  const y0 = KOPF, y1 = KOPF + DATEN.length * ZEILE;
  for (let v = 0.3; v <= MAX + 1e-9; v += 0.1) {
    const xv = x(v), mitte = Math.abs(v - 0.5) < 1e-9;
    o.push(`<line x1="${xv.toFixed(1)}" y1="${y0 - 4}" x2="${xv.toFixed(1)}" y2="${y1}" stroke="${mitte ? t.gedaempft : t.gitter}" stroke-width="1"${mitte ? ' stroke-dasharray="4 3"' : ''}/>`);
    o.push(`<text x="${xv.toFixed(1)}" y="${y1 + 18}" font-size="11.5" fill="${t.gedaempft}" text-anchor="middle">${Math.round(v * 100)} %</text>`);
  }
  o.push(`<line x1="${X0}" y1="${y1}" x2="${X1}" y2="${y1}" stroke="${t.achse}" stroke-width="1"/>`);
  o.push(`<text x="${(X0 + X1) / 2}" y="${y1 + 38}" font-size="12" fill="${t.sekundaer}" text-anchor="middle">Siegrate im Selbstspiel</text>`);

  /* Spaltenköpfe */
  o.push(`<text x="${SP_RATE + 52}" y="${y0 - 8}" font-size="11.5" font-weight="600" fill="${t.sekundaer}" text-anchor="end">Siegrate</text>`);
  o.push(`<text x="${SP_GNU}" y="${y0 - 8}" font-size="11.5" font-weight="600" fill="${t.sekundaer}">gegen GNU Go</text>`);

  DATEN.forEach((d, i) => {
    const yc = y0 + i * ZEILE + ZEILE / 2;
    const p = d.siege / d.partien, [lo, hi] = wilson(d.siege, d.partien);
    const c = t[d.art];
    o.push(`<text x="${LINKS}" y="${yc - 3}" font-size="13" font-weight="600" fill="${t.primaer}" text-anchor="end">${esc(d.name)}</text>`);
    o.push(`<text x="${LINKS}" y="${yc + 12}" font-size="11" fill="${t.gedaempft}" text-anchor="end">${esc(d.text)} · ${d.partien.toLocaleString('de-DE')} Partien</text>`);
    o.push(`<line x1="${x(lo).toFixed(1)}" y1="${yc}" x2="${x(hi).toFixed(1)}" y2="${yc}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`);
    for (const e of [lo, hi]) o.push(`<line x1="${x(e).toFixed(1)}" y1="${yc - 4}" x2="${x(e).toFixed(1)}" y2="${yc + 4}" stroke="${c}" stroke-width="2" stroke-linecap="round"/>`);
    o.push(marke(d.art, x(p), yc, t));
    o.push(`<text x="${SP_RATE + 52}" y="${yc + 4}" font-size="12.5" fill="${t.primaer}" text-anchor="end" style="font-variant-numeric: tabular-nums">${prozent(p)}</text>`);
    o.push(`<text x="${SP_GNU}" y="${yc + 4}" font-size="12.5" fill="${d.gnugo ? t.primaer : t.gedaempft}">${esc(d.gnugo || '–')}</text>`);
  });

  o.push(`<text x="24" y="${H - 30}" font-size="11" fill="${t.gedaempft}">Gegen GNU Go: GNU Go 3.8 Stufe 1, neun Vorgabesteine für die KI, gepaarte Differenz in Punkten aus Sicht der KI.</text>`);
  o.push(`<text x="24" y="${H - 14}" font-size="11" fill="${t.gedaempft}">Neuere Selbstspiel-Messungen mit 120 Simulationen je Zug, Einzelheiten in docs/. Erzeugt mit auswertung/diagramm.js.</text>`);
  o.push('</svg>');
  return o.join('\n') + '\n';
}

/* Marke je Entscheidung: Form und Füllung tragen die Art auch ohne Farbe. */
function marke(art, cx, cy, t) {
  const c = t[art], ring = `stroke="${t.flaeche}" stroke-width="2"`;
  cx = cx.toFixed(1);
  if (art === 'eingebaut') return `<circle cx="${cx}" cy="${cy}" r="6" fill="${c}" ${ring}/>`;
  if (art === 'offen') return `<rect x="${cx - 5.5}" y="${cy - 5.5}" width="11" height="11" fill="${c}" ${ring} transform="rotate(45 ${cx} ${cy})"/>`;
  if (art === 'verworfen') return `<circle cx="${cx}" cy="${cy}" r="5" fill="${t.flaeche}" stroke="${c}" stroke-width="2.5"/>`;
  return `<rect x="${cx - 5}" y="${cy - 5}" width="10" height="10" rx="1.5" fill="${c}" ${ring}/>`;
}

if (require.main === module) {
  const ziel = path.join(__dirname, '..', 'docs', 'bilder');
  fs.mkdirSync(ziel, {recursive: true});
  for (const [n, t] of Object.entries(THEMEN)) fs.writeFileSync(path.join(ziel, `ergebnisse-${n}.svg`), svg(t));
  console.log(`geschrieben: ${ziel}/ergebnisse-{hell,dunkel}.svg`);
}

module.exports = {wilson, DATEN};
