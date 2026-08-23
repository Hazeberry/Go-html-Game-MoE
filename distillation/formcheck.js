'use strict';
/* Formmessung ueber einen Ordner voller SGF-Partien.
 *
 *     node distillation/formcheck.js <ordner-oder-datei> [...]
 *
 * ZWECK. Baut eine Seite zusammenhaengende Strukturen, oder zerfaellt sie?
 * Getrennt nach Spielerrolle (PB/PW), damit Mensch und KI unterscheidbar
 * bleiben, und mit Partien- und Zugzahl je Zeile, damit n sichtbar ist.
 *
 * DREI METRIKEN, weil keine einzelne traegt:
 *   1. Abstand zum raeumlich naechsten eigenen Stein — misst Isolation, ist
 *      aber durch die Steinzahl verzerrt: je mehr eigene Steine in der Naehe,
 *      desto kleiner zwangslaeufig.
 *   2. Abstand zum chronologisch vorigen eigenen Zug — misst, ob eine Seite
 *      in einem Gebiet weiterarbeitet oder springt. Unabhaengig von 1.
 *   3. Formkennzahlen der Endstellung — Gruppenzahl, groesste Gruppe, Anteil
 *      Steine in Gruppen mit <= 2 Freiheiten. Nicht durch die Steinzahl
 *      verzerrt.
 *
 * BEFUND an einer Partie (Mensch Schwarz gegen KI hard, KI gab auf):
 *
 *                              Schwarz        KI (hard)
 *   naechster eigener Stein    d=1 zu 92 %    d=1 zu 69 %
 *   voriger eigener Zug        Median 1       Median 5
 *   Anbau in schwache Gruppe   1 von 106      8 von 65   (1 % gegen 12 %)
 *   verlorene Steine           1              22, davon 21 auf einmal
 *   Endstellung                118 in 1 Gr.   96 in 30 Gr.
 *   davon <= 2 Freiheiten      0 %            36 %
 *
 * Die KI setzt ihre Steine durchaus an eigene an (69 % Kontakt) und zerfaellt
 * trotzdem in 30 Fragmente. ANSCHLUSS UND ZUSAMMENHALT SIND NICHT DASSELBE —
 * ein Term, der Abstaende regelt (localityBonus oder ein Formbonus mit
 * Maximum bei d=2), zielt daneben.
 *
 * SCHAERFER, aus dem Q-Verlauf derselben Partie (aus dem Bug-Report-Export,
 * nicht aus dem SGF): die spaeter geschlagene 21er-Gruppe wuchs zwischen Zug
 * 200 und 226 von 11 auf 21 Steine, waehrend ihre Freiheiten zwischen 5 und 2
 * pendelten — und Q blieb die ganze Zeit bei +0,37 bis +0,43. Erst bei einer
 * Freiheit stuerzte Q auf -0,88. Die Bewertung bepreist ANBAUEN
 * (midOwnNeighborBonus 15, midOwnGroup2 +40, midOwnGroup3 +60) und
 * FREIHEITEN (midLibBonus 30), aber nirgends das Produkt "viele Steine an
 * wenigen Freiheiten". Ein 21-Steine-Klotz auf zwei Freiheiten kostet so
 * wenig wie ein Einzelstein auf zwei Freiheiten.
 *
 * WAS DAS NICHT ZEIGT. Eine Partie, und zwar eine aufgegebene. Verlieren
 * erzeugt Fragmentierung genauso wie Fragmentierung Verlieren erzeugt; aus
 * einer Endstellung ist die Richtung nicht ablesbar. Dafuer braucht es viele
 * Partien und den VERLAUF der Gruppenzahl — laeuft sie frueh auseinander,
 * ist sie Ursache; erst im Zusammenbruch, ist sie Symptom.
 *
 * FALLE, die beim Bauen auffiel: ohne Schlagen waere die Endstellung die
 * Summe aller je gespielten Steine. Der erste Lauf meldete so 32 Gruppen und
 * 54 % schwache Steine statt 30 und 36 % — zu Gunsten von mehr Zusammenhang,
 * weil tote Steine Luecken schliessen. setzen() entfernt deshalb geschlagene
 * Gruppen und den Selbstmordfall.
 *
 * GRENZEN. Varianten werden nicht ausgewertet (alle Zuege in Dateireihenfolge);
 * fuer Engine-Exporte ohne Verzweigungen ist das exakt. Nicht-19x19 und
 * Partien unter 20 Zuegen werden uebersprungen und gezaehlt.
 */
const fs = require('fs'), path = require('path');

const dateien = [];
for (const arg of process.argv.slice(2)) {
  const st = fs.statSync(arg);
  if (st.isDirectory()) for (const f of fs.readdirSync(arg))
    { if (/\.sgf$/i.test(f)) dateien.push(path.join(arg, f)); }
  else dateien.push(arg);
}
if (!dateien.length) { console.error('Keine .sgf gefunden.'); process.exit(2); }

const cheb = (a, b) => Math.max(Math.abs(a[0]-b[0]), Math.abs(a[1]-b[1]));
const med = a => { const b = [...a].sort((x,y)=>x-y); return b.length ? b[b.length>>1] : NaN; };
const mit = a => a.length ? a.reduce((x,y)=>x+y,0)/a.length : NaN;

/* Gruppe ab einem Punkt einsammeln, mit ihren Freiheiten. */
function gruppeAb(board, i) {
  const farbe = board[i], st = [i], steine = [], frei = new Set(), seen = new Set([i]);
  while (st.length) {
    const p = st.pop(); steine.push(p);
    const x = p % 19, y = (p - x) / 19;
    for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
      const nx = x+dx, ny = y+dy;
      if (nx<0||nx>18||ny<0||ny>18) continue;
      const q = ny*19+nx;
      if (board[q] === 0) frei.add(q);
      else if (board[q] === farbe && !seen.has(q)) { seen.add(q); st.push(q); }
    }
  }
  return {steine, frei: frei.size};
}

/* Stein setzen UND schlagen. Ohne das waere die Endstellung die Summe aller
   je gespielten Steine — Gruppenzahl und Freiheiten waeren beide falsch, und
   zwar zugunsten von mehr Zusammenhang. */
function setzen(board, i, farbe) {
  board[i] = farbe;
  const gegner = farbe === 1 ? 2 : 1;
  const x = i % 19, y = (i - x) / 19;
  let geschlagen = 0;
  for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
    const nx = x+dx, ny = y+dy;
    if (nx<0||nx>18||ny<0||ny>18) continue;
    const q = ny*19+nx;
    if (board[q] !== gegner) continue;
    const g = gruppeAb(board, q);
    if (g.frei === 0) { geschlagen += g.steine.length;
                        for (const p of g.steine) board[p] = 0; }
  }
  const eigen = gruppeAb(board, i);       // Selbstmord (Chinese: illegal)
  if (eigen.frei === 0) { for (const p of eigen.steine) board[p] = 0;
                          return {geschlagen, groesse: 0, frei: 0}; }
  return {geschlagen, groesse: eigen.steine.length, frei: eigen.frei};
}

/* Gruppen und Freiheiten auf einem 19x19-Brett (Uint8, 0/1/2). */
function formkennzahlen(board, farbe) {
  const seen = new Uint8Array(361), gruppen = [];
  for (let i = 0; i < 361; i++) {
    if (board[i] !== farbe || seen[i]) continue;
    const st = [i], steine = [], frei = new Set();
    seen[i] = 1;
    while (st.length) {
      const p = st.pop(); steine.push(p);
      const x = p % 19, y = (p - x) / 19;
      for (const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
        const nx = x+dx, ny = y+dy;
        if (nx<0||nx>18||ny<0||ny>18) continue;
        const q = ny*19+nx;
        if (board[q] === 0) frei.add(q);
        else if (board[q] === farbe && !seen[q]) { seen[q] = 1; st.push(q); }
      }
    }
    gruppen.push({n: steine.length, frei: frei.size});
  }
  const steine = gruppen.reduce((s,g)=>s+g.n, 0);
  if (!steine) return null;
  return {
    steine, gruppen: gruppen.length,
    freiJeStein: gruppen.reduce((s,g)=>s+g.frei, 0) / steine,
    schwachAnteil: gruppen.filter(g=>g.frei<=2).reduce((s,g)=>s+g.n,0) / steine,
    groesste: Math.max(...gruppen.map(g=>g.n))
  };
}

const roll = {};   // Rolle -> Messwerte
const nimm = r => (roll[r] = roll[r] || {naechster: [], vorzug: [], form: [], partien: 0,
                   anbau: 0, anbauSchwach: 0, verloren: 0, groessterVerlust: 0});

let uebersprungen = 0;
for (const datei of dateien) {
  const s = fs.readFileSync(datei, 'utf8');
  const sz = (s.match(/SZ\[(\d+)\]/) || [])[1];
  if (sz && sz !== '19') { uebersprungen++; continue; }
  const namen = {B: (s.match(/PB\[([^\]]*)\]/) || [,'Schwarz'])[1],
                 W: (s.match(/PW\[([^\]]*)\]/) || [,'Weiss'])[1]};
  const zuege = [...s.matchAll(/;([BW])\[([a-s]{2})\]/g)]
    .map(m => [m[1], m[2].charCodeAt(0)-97, m[2].charCodeAt(1)-97]);
  if (zuege.length < 20) { uebersprungen++; continue; }

  const board = new Uint8Array(361);
  const eigen = {B: [], W: []};
  for (const [c, x, y] of zuege) {
    const r = nimm(namen[c]);
    if (eigen[c].length) {
      r.naechster.push(Math.min(...eigen[c].map(p => cheb(p, [x,y]))));
      r.vorzug.push(cheb(eigen[c][eigen[c].length-1], [x,y]));
    }
    eigen[c].push([x,y]);
    const e = setzen(board, y*19+x, c === 'B' ? 1 : 2);
    /* Einsatz in eine schwache Gruppe: der Zug haengt an eine BESTEHENDE
       eigene Gruppe an (Ergebnis > 1 Stein) und die bleibt trotzdem bei
       hoechstens drei Freiheiten. In der Beispielpartie 8 mal (12 % der
       Anbauzuege) gegen 1 mal (1 %) beim Menschen. */
    if (e.groesse > 1 && e.frei <= 3) r.anbauSchwach++;
    if (e.groesse > 1) r.anbau++;
    const gegner = nimm(namen[c === 'B' ? 'W' : 'B']);
    if (e.geschlagen > gegner.groessterVerlust) gegner.groessterVerlust = e.geschlagen;
    gegner.verloren += e.geschlagen;
  }
  for (const c of 'BW') {
    const f = formkennzahlen(board, c === 'B' ? 1 : 2);
    if (f) nimm(namen[c]).form.push(f);
    nimm(namen[c]).partien++;
  }
}

console.log(`${dateien.length} Datei(en), ${uebersprungen} uebersprungen `
  + `(nicht 19x19 oder zu kurz)\n`);
const rollen = Object.keys(roll);
for (const r of rollen) {
  const d = roll[r];
  const kn = d.naechster, kv = d.vorzug;
  const anteil = () => [1,2,3].map(i =>
    `${i}:${Math.round(kn.filter(x=>x===i).length/kn.length*100)}%`).join(' ');
  console.log(`── ${r}  (${d.partien} Partien, ${kn.length} Zuege)`);
  console.log(`   naechster eigener Stein: Median ${med(kn).toFixed(1)} `
    + `Mittel ${mit(kn).toFixed(2)}   ${anteil()} `
    + `>=4:${Math.round(kn.filter(x=>x>=4).length/kn.length*100)}%`);
  console.log(`   voriger eigener Zug:     Median ${med(kv).toFixed(1)} `
    + `Mittel ${mit(kv).toFixed(2)}`);
  if (d.anbau) console.log(`   Anbau an eigene Gruppe:  ${d.anbau} Zuege, davon `
    + `${d.anbauSchwach} in eine Gruppe mit <=3 Freiheiten `
    + `(${Math.round(d.anbauSchwach/d.anbau*100)} %)`);
  console.log(`   verlorene Steine:        ${d.verloren} gesamt, groesster `
    + `Einzelverlust ${d.groessterVerlust}`);
  if (d.form.length) {
    const F = k => mit(d.form.map(f=>f[k]));
    console.log(`   Endstellung: ${F('steine').toFixed(0)} Steine in `
      + `${F('gruppen').toFixed(1)} Gruppen, groesste ${F('groesste').toFixed(0)}`);
    console.log(`                ${F('freiJeStein').toFixed(2)} Freiheiten/Stein, `
      + `${(F('schwachAnteil')*100).toFixed(0)} % in Gruppen mit <=2 Freiheiten`);
  }
  console.log();
}
