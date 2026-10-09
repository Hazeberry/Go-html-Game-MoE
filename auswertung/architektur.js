/* Zeichnet die beiden Architekturdiagramme für das README:

     docs/bilder/aufbau-{hell,dunkel}.svg    eine Datei, zwei Laufzeiten
     docs/bilder/zugwahl-{hell,dunkel}.svg   wie getAIMove einen Zug findet

   Die Inhalte folgen index.html (getAIMove, evaluateMove, mctsPUCT,
   rollout, evaluateBoard) mit den heutigen Defaults. Ändert sich dort etwas
   Grundsätzliches, hier nachziehen und neu aufrufen:
     node auswertung/architektur.js */
'use strict';
const fs = require('fs');
const path = require('path');

const THEMEN = {
  hell: {
    flaeche: '#fcfcfb', feld: '#f3f2ee', akzentFeld: '#eaf2fc', primaer: '#0b0b0b', sekundaer: '#52514e',
    gedaempft: '#898781', rand: '#c3c2b7', akzent: '#2a78d6', ausgang: '#eb6834', pfeil: '#898781',
  },
  dunkel: {
    flaeche: '#1a1a19', feld: '#242423', akzentFeld: '#1b2533', primaer: '#ffffff', sekundaer: '#c3c2b7',
    gedaempft: '#898781', rand: '#4a4a46', akzent: '#3987e5', ausgang: '#d95926', pfeil: '#898781',
  },
};

const FONT = `font-family="system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"`;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* Kleine Zeichenhilfe: sammelt SVG-Elemente gegen ein Thema. */
function leinwand(t, B, H, titel, beschr) {
  const o = [];
  o.push(`<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${H}" viewBox="0 0 ${B} ${H}" ${FONT} role="img" aria-labelledby="titel beschr">`);
  o.push(`<title id="titel">${esc(titel)}</title><desc id="beschr">${esc(beschr)}</desc>`);
  o.push(`<defs>`
    + `<marker id="spitze" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${t.pfeil}"/></marker>`
    + `<marker id="spitzeA" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="${t.ausgang}"/></marker>`
    + `</defs>`);
  o.push(`<rect width="${B}" height="${H}" rx="8" fill="${t.flaeche}"/>`);
  const api = {
    o,
    text(x, y, s, {groesse = 13, farbe = t.primaer, fett = false, anker = 'start', mono = false} = {}) {
      const f = mono ? ` font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace"` : '';
      o.push(`<text x="${x}" y="${y}" font-size="${groesse}"${fett ? ' font-weight="600"' : ''} fill="${farbe}" text-anchor="${anker}"${f}>${esc(s)}</text>`);
    },
    /* Kasten mit Titel (optional Code-Name rechts daneben) und Zeilen. */
    kasten(x, y, w, h, {titel, code, zeilen = [], art = 'normal', zg = 12.5} = {}) {
      const fuell = art === 'akzent' ? t.akzentFeld : art === 'schalter' ? t.flaeche : t.feld;
      const strich = art === 'akzent' ? t.akzent : art === 'schalter' ? t.gedaempft : t.rand;
      const dash = art === 'schalter' ? ' stroke-dasharray="5 4"' : '';
      o.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fuell}" stroke="${strich}" stroke-width="${art === 'akzent' ? 1.5 : 1}"${dash}/>`);
      let zy = y + 21;
      if (titel) {
        api.text(x + 14, zy, titel, {fett: true, groesse: 13.5});
        if (code) api.text(x + w - 14, zy, code, {groesse: 11.5, farbe: t.gedaempft, anker: 'end', mono: true});
        zy += 19;
      }
      for (const z of zeilen) { api.text(x + 14, zy, z, {groesse: zg, farbe: t.sekundaer}); zy += zg + 5; }
    },
    pfeil(x1, y1, x2, y2, {farbe = t.pfeil, marker = 'spitze', dash = false, beide = false} = {}) {
      o.push(`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="1.5"${dash ? ' stroke-dasharray="4 3"' : ''}${beide ? ` marker-start="url(#${marker})"` : ''} marker-end="url(#${marker})"/>`);
    },
    linie(pts, {farbe = t.pfeil, ende = true} = {}) {
      o.push(`<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${farbe}" stroke-width="1.5"${ende ? ' marker-end="url(#spitze)"' : ''}/>`);
    },
    ausgang(x, y, w, s) {
      o.push(`<rect x="${x}" y="${y}" width="${w}" height="30" rx="15" fill="${t.flaeche}" stroke="${t.ausgang}" stroke-width="1.5"/>`);
      api.text(x + w / 2, y + 20, s, {fett: true, anker: 'middle', groesse: 13});
    },
    ende() { o.push('</svg>'); return o.join('\n') + '\n'; },
  };
  return api;
}

/* ── Aufbau: eine Datei, zwei Laufzeiten ─────────────────────────── */
function aufbau(t) {
  const B = 920, H = 530;
  const L = leinwand(t, B, H, 'Aufbau der Go-KI: eine Datei, zwei Laufzeiten',
    'index.html enthält vier Skriptblöcke. Im Browser laufen shared-go-logic und worker-ai im Web Worker, '
    + 'policy-net und das Haupt-Skript im Haupt-Thread. In Node lösen ab-harness.js, gnugo-duell.js und die Tests '
    + 'dieselben Blöcke zur Laufzeit heraus; es gibt kein Code-Duplikat.');
  L.text(24, 36, 'Aufbau: eine Datei, zwei Laufzeiten', {groesse: 18, fett: true});
  L.text(24, 58, 'Browser und Messrahmen führen denselben Code aus. Gemessen wird also genau der Stand, der im Spiel läuft.',
    {groesse: 13, farbe: t.sekundaer});

  /* Mitte: index.html mit vier Blöcken */
  const MX = 340, MW = 250, MY = 100;
  L.kasten(MX, MY, MW, 376, {titel: 'index.html', code: 'eine Datei'});
  const bloecke = [
    {id: 'shared-go-logic', zeilen: ['Regeln, Zobrist, Freiheiten,', 'Benson'], art: 'akzent'},
    {id: 'worker-ai', zeilen: ['Bewertung, Suche, Rollouts,', 'taktischer Leser'], art: 'akzent'},
    {id: 'policy-net', zeilen: ['Features, Forward,', 'REINFORCE-Training']},
    {id: 'Haupt-Skript', zeilen: ['Brett, Eingaben, Worker,', 'Dashboard, SGF']},
  ];
  const BY = [], BH = 64;
  bloecke.forEach((b, k) => {
    const y = MY + 40 + k * 74;
    BY.push(y);
    L.kasten(MX + 14, y, MW - 28, BH, {titel: b.id, zeilen: b.zeilen, art: b.art || 'normal', zg: 12});
  });
  L.text(MX + MW / 2, MY + 360, 'die blauen Blöcke sind DOM-frei', {groesse: 11.5, farbe: t.gedaempft, anker: 'middle'});

  /* Links: Browser */
  const LX = 24, LW = 236;
  L.text(LX, 92, 'Im Browser', {fett: true, groesse: 14, farbe: t.sekundaer});
  L.text(LX, MY + 340, 'beide Threads bekommen den Quelltext', {groesse: 11.5, farbe: t.gedaempft});
  L.text(LX, MY + 356, 'aus index.html, ohne Build-Schritt', {groesse: 11.5, farbe: t.gedaempft});
  L.kasten(LX, MY + 26, LW, 104, {titel: 'Web Worker', code: 'getAIMove',
    zeilen: ['sucht den Zug, ohne die', 'Oberfläche zu blockieren', 'gebaut aus den blauen Blöcken'], art: 'akzent'});
  L.kasten(LX, MY + 216, LW, 104, {titel: 'Haupt-Thread', zeilen: ['zeichnet, nimmt Züge an,', 'Dashboard und Parameter,', 'Netz-Priors für „Schwer“']});
  L.pfeil(LX + LW / 2, MY + 134, LX + LW / 2, MY + 212, {beide: true});
  L.text(LX + LW / 2 + 8, MY + 177, 'postMessage', {groesse: 11.5, farbe: t.gedaempft, mono: true});
  /* Blöcke → Browser */
  const kl = MX + 14;
  L.linie([[kl, BY[0] + 32], [kl - 22, BY[0] + 32], [kl - 22, BY[1] + 32], [kl, BY[1] + 32]], {ende: false});
  L.pfeil(kl - 22, MY + 78, LX + LW + 4, MY + 78);
  L.linie([[kl, BY[2] + 32], [kl - 22, BY[2] + 32], [kl - 22, BY[3] + 32], [kl, BY[3] + 32]], {ende: false});
  L.pfeil(kl - 22, MY + 268, LX + LW + 4, MY + 268);

  /* Rechts: Node */
  const RX = 646, RW = 250;
  L.text(RX, 92, 'In Node (Messrahmen)', {fett: true, groesse: 14, farbe: t.sekundaer});
  L.text(RX, MY + 26 + 4 * 74, 'löst die Blöcke zur Laufzeit heraus', {groesse: 11.5, farbe: t.gedaempft});
  const werkzeuge = [
    ['ab-harness.js', 'Selbstspiel, A gegen B'],
    ['gnugo-duell.js', 'gegen GNU Go 3.8 über GTP'],
    ['tests/run.js', 'Regeln, Taktik, Browser'],
    ['auswertung/', 'Rohdumps nachrechnen'],
  ];
  werkzeuge.forEach(([n, z], k) => L.kasten(RX, MY + 26 + k * 74, RW, 60, {titel: n, zeilen: [z]}));
  const kr = MX + MW - 14;
  L.linie([[kr, BY[0] + 32], [kr + 22, BY[0] + 32], [kr + 22, BY[2] + 32], [kr, BY[2] + 32]], {ende: false});
  L.linie([[kr, BY[1] + 32], [kr + 22, BY[1] + 32]], {ende: false});
  const bus = RX - 22;
  L.linie([[kr + 22, MY + 155], [bus, MY + 155]], {ende: false});
  L.linie([[bus, MY + 56], [bus, MY + 26 + 3 * 74 + 30]], {ende: false});
  for (let k = 0; k < 4; k++) L.pfeil(bus, MY + 56 + k * 74, RX - 3, MY + 56 + k * 74);

  L.text(24, H - 16, 'policy-net braucht im Messrahmen eine kleine Schale für localStorage und document. Erzeugt mit auswertung/architektur.js.',
    {groesse: 11, farbe: t.gedaempft});
  return L.ende();
}

/* ── Zugwahl: der Weg durch getAIMove ─────────────────────────────── */
function zugwahl(t) {
  const B = 920, X = 32, W = 600, EX = 700, EW = 190;
  const schritte = [];
  let y = 104;
  const L = leinwand(t, B, 1400, '', '');   /* Höhe wird am Ende gesetzt */
  const pfeilAb = (y1, y2) => L.pfeil(X + W / 2, y1, X + W / 2, y2 - 3);
  const raus = (yy, s) => {
    L.pfeil(X + W + 3, yy, EX - 3, yy, {farbe: t.ausgang, marker: 'spitzeA'});
    L.ausgang(EX, yy - 15, EW, s);
  };
  const schritt = (h, opt, nachher) => {
    if (schritte.length) pfeilAb(y - 26, y);
    L.kasten(X, y, W, h, opt);
    schritte.push(y);
    if (nachher) nachher(y);
    y += h + 26;
  };

  L.text(24, 36, 'Wie die KI einen Zug findet', {groesse: 18, fett: true});
  L.text(24, 58, 'Der Weg durch getAIMove auf Stufe „Schwer“, mit den heutigen Defaults. Gestrichelt: Schalter, die im Default aus sind.',
    {groesse: 13, farbe: t.sekundaer});
  L.text(24, 78, 'Rechts die Ausgänge: Hier kann die KI passen oder aufgeben, statt zu ziehen.', {groesse: 13, farbe: t.sekundaer});

  schritt(58, {titel: 'Stellung', zeilen: ['Brett, Ko-Punkt, Gefangene und alle bisherigen Stellungen']});
  schritt(58, {titel: 'Legale Züge', code: 'getLegalMoves', zeilen: ['kein Selbstmord, kein Ko, kein Superko']});
  schritt(94, {titel: 'Filter', zeilen: ['Benson: Züge, deren Stein beweisbar tot geboren wäre, fallen weg',
    'augenSchutz: eigene echte Augen werden nicht gefüllt',
    'leseVerzicht: keine Züge, deren Kette der Leser sofort fängt']},
  y0 => raus(y0 + 38, 'Pass: nichts übrig'));

  /* Bewertung, mit Unterkästen */
  schritt(320, {titel: 'Zugbewertung: Mischung von Experten', code: 'evaluateMove', art: 'akzent',
    zeilen: ['Jeder Zug bekommt einen Wert; die Partiephase gewichtet drei Experten:']},
  y0 => {
    const sw = (W - 28 - 20) / 3, sy = y0 + 66;
    /* evalOpening, evalMidgame, evalEndgame */
    [['Eröffnung', 'bis etwa Zug 20'], ['Mittelspiel', 'Ketten, Freiheiten'],
      ['Endspiel', 'ab Zug 80 oder Enge']].forEach(([n, z], k) => {
      L.kasten(X + 14 + k * (sw + 10), sy, sw, 56, {titel: n, zeilen: [z], zg: 12});
    });
    L.kasten(X + 14, sy + 68, W - 28, 56, {titel: '+ Gebiet', code: 'gebietZug 80', zg: 12,
      zeilen: ['80 × Gebietsgewinn des Zuges auf der Bouzy-Einflusskarte']});
    L.kasten(X + 14, sy + 134, W - 28, 56, {titel: '+ Krise', code: 'evalTsumego', zg: 12,
      zeilen: ['Atari, Augen, Nakade: in Krisenzonen wird Taktik eingemischt']});
    L.kasten(X + 14, sy + 200, W - 28, 40, {art: 'schalter'});
    L.text(X + 28, sy + 225, 'Policy-Netz: lernt mit, steuert nicht (netMaxBlend 0)', {groesse: 12, farbe: t.sekundaer});
  });

  schritt(96, {titel: 'Pass-Prüfung', zeilen: ['Ist der beste Wert für diese Partiephase zu klein?',
    'Dann passt die KI, außer eine eigene Kette steht im Atari oder dem Gegner',
    'winkt ein großer Zug, den ein eigener Zug abwenden kann (passUnabwendbar).']},
  y0 => raus(y0 + 48, 'Pass'));

  schritt(58, {titel: 'Taktik-Schalter', art: 'schalter', zeilen: ['leseRettung, krisenKandidaten, gegnerWert: heben einzelne Kandidaten an']},
    y0 => {
      L.pfeil(X + W + 3, y0 + 29, EX - 3, y0 + 29, {dash: true});
      L.kasten(EX, y0 + 2, EW, 54, {zeilen: ['Leicht / Mittel: Zufall', 'unter den besten 25 % / 8 %'], zg: 12});
    });

  /* Suche */
  schritt(366, {titel: 'Suche: Monte-Carlo-Baum mit PUCT', code: 'mctsPUCT', art: 'akzent',
    zeilen: ['Simulationen nach Zeitbudget; der Baum wird im nächsten Zug weiterverwendet.']},
  y0 => {
    const iw = W - 28, ix = X + 14;
    let iy = y0 + 54;
    const zeile = (h, titel, zeilen) => { L.kasten(ix, iy, iw, h, {titel, zeilen, zg: 12}); iy += h + 10; };
    zeile(58, 'Wurzel', ['die 16 besten Kandidaten aus der Zugbewertung, Prior per Softmax']);
    zeile(58, 'Auswahl', ['Q + 1,4 · P · √N / (1 + n), dazu RAVE; innere Knoten mit 8 Kindern']);
    zeile(76, 'Blatt: Rollout', ['24 Halbzüge, jeweils zufällig unter den 3 bzw. 6 besten Zügen',
      'nach quickEval, ohne eigene Augen zu füllen']);
    zeile(76, 'Wert', ['tanh(evaluateBoard / 200), aus Sicht der KI zwischen −1 und +1',
      'evaluateBoard = Gefangene × 20 + je Kette Größe × 5 + Freiheiten × 3']);
  });

  schritt(58, {titel: 'Aufgabe-Prüfung', zeilen: ['Q ≤ −0,95 in 5 Zügen in Folge (ab Zug 60), und die Gebietsschätzung sagt verloren']},
    y0 => raus(y0 + 29, 'Aufgabe'));

  pfeilAb(y - 26, y);
  L.o.push(`<rect x="${X + W / 2 - 140}" y="${y}" width="280" height="34" rx="17" fill="${t.akzent}"/>`);
  L.text(X + W / 2, y + 22, 'Zug: das meistbesuchte Kind', {fett: true, anker: 'middle', farbe: '#ffffff', groesse: 13.5});
  y += 34;

  const H = y + 44;
  L.text(24, H - 16, 'Erzeugt mit auswertung/architektur.js. Die Zahlen sind Defaults und im Dashboard einstellbar.', {groesse: 11, farbe: t.gedaempft});
  /* Kopf mit der echten Höhe neu schreiben */
  L.o[0] = L.o[0].replace(/height="1400" viewBox="0 0 920 1400"/, `height="${H}" viewBox="0 0 ${B} ${H}"`);
  L.o[1] = `<title id="titel">Wie die KI einen Zug findet</title><desc id="beschr">${esc(
    'Stellung, legale Züge, Filter (Benson, augenSchutz), Zugbewertung als Mischung von Experten mit Gebiet und Krise, '
    + 'Pass-Prüfung, optionale Taktik-Schalter, Monte-Carlo-Suche mit PUCT, Rollouts und tanh(evaluateBoard/200), '
    + 'Aufgabe-Prüfung, dann der meistbesuchte Zug.')}</desc>`;
  L.o[3] = `<rect width="${B}" height="${H}" rx="8" fill="${t.flaeche}"/>`;
  return L.ende();
}

if (require.main === module) {
  const ziel = path.join(__dirname, '..', 'docs', 'bilder');
  fs.mkdirSync(ziel, {recursive: true});
  for (const [n, t] of Object.entries(THEMEN)) {
    fs.writeFileSync(path.join(ziel, `aufbau-${n}.svg`), aufbau(t));
    fs.writeFileSync(path.join(ziel, `zugwahl-${n}.svg`), zugwahl(t));
  }
  console.log(`geschrieben: ${ziel}/{aufbau,zugwahl}-{hell,dunkel}.svg`);
}
