/* Trennt eine Fassung von „Einschließung" sterbende von überlebenden
   Gruppen — auch bei gleicher Freiheitszahl? Gehört zu docs/laufkampf.md.

   Jede Partie eines Rohdumps wird nachgespielt. An jeder 5. Stellung wird
   jede Kette mit mindestens 5 Steinen beobachtet, die nicht Benson-tot ist.
   Sie „stirbt", wenn ihr Ankerstein (kleinster Index) innerhalb der nächsten
   40 Halbzüge geschlagen oder Benson-tot wird. Beobachtungen ohne 40
   folgende Halbzüge entfallen, außer die Kette stirbt vorher.

   Kandidaten (docs/laufkampf.md, §4):
     K0  Anteil der Nachbarrichtungen auf gegnerische Steine oder den Rand
     K1  leere Punkte, von den Freiheiten über Leeres in ≤ 3 Schritten
     K2  dasselbe mit 1 Schritt (Freiheiten plus deren leere Nachbarn)
     K3  eigene Bouzy-Zonenfelder, zusammenhängend mit der Kette, ohne sie

   Je Freiheitsband: Zahl, Tode, Mittel je Ausgang und die AUC, ausgerichtet
   wie erwartet (K0 hoch = stirbt, K1–K3 klein = stirbt).

   Aufruf:
     node auswertung/einschliessung.js <dump.jsonl> [weitere.jsonl ...] [--json aus.json] */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI} = require(path.join(__dirname, '..', 'tests', 'rahmen.js'));

const E = ladeKI({mitNetz: false});
const N = E.BOARD_SIZE;
const ABSTAND = 5, VORLAUF = 40, MIN_GROESSE = 5;
const BAENDER = [['<=3', 0, 3], ['4-7', 4, 7], ['8-15', 8, 15], ['>=16', 16, 999]];
/* true: kleiner Wert spricht für Sterben */
const KANDIDATEN = {K0: false, K1: true, K2: true, K3: true};

function richtungen(i) {
  /* NEIGHBORS kennt nur Punkte auf dem Brett; die übrigen Richtungen gehen
     über den Rand. */
  return 4 - E.NEIGHBORS[i].length;
}

/* Leere Punkte, von den Freiheiten aus über Leeres in ≤ schritte erreichbar. */
function raum(b, freiheiten, schritte) {
  const tiefe = new Int16Array(N).fill(-1);
  const q = [];
  for (const l of freiheiten) { tiefe[l] = 0; q.push(l); }
  for (let k = 0; k < q.length; k++) {
    const c = q[k];
    if (tiefe[c] >= schritte) continue;
    for (const n of E.NEIGHBORS[c])
      if (!b[n] && tiefe[n] < 0) { tiefe[n] = tiefe[c] + 1; q.push(n); }
  }
  return q.length;
}

function merkmale(b, gruppe, freiheiten, farbe, inGruppe) {
  let rand = 0, gegner = 0, gesamt = 0;
  for (const g of gruppe) {
    /* Richtungen, die die Kette verlassen: über den Rand oder auf einen
       Punkt außerhalb der Kette. Richtungen in die eigene Kette zählen nicht. */
    rand += richtungen(g); gesamt += richtungen(g);
    for (const n of E.NEIGHBORS[g]) {
      if (inGruppe[n]) continue;
      gesamt++;
      if (b[n] && b[n] !== farbe) gegner++;
    }
  }
  /* K3: eigene Zone, zusammenhängend über eigene Zonenfelder, Start an den
     Nachbarn der Kette. Die Karte ist vorher für b berechnet. */
  const gesehen = new Uint8Array(N);
  const q = [];
  for (const g of gruppe) for (const n of E.NEIGHBORS[g])
    if (!inGruppe[n] && !gesehen[n] && E.influenceZone(n, farbe) > 0) { gesehen[n] = 1; q.push(n); }
  for (let k = 0; k < q.length; k++)
    for (const n of E.NEIGHBORS[q[k]])
      if (!inGruppe[n] && !gesehen[n] && E.influenceZone(n, farbe) > 0) { gesehen[n] = 1; q.push(n); }
  return {K0: (gegner + rand) / gesamt, K1: raum(b, freiheiten, 3), K2: raum(b, freiheiten, 1), K3: q.length};
}

function partie(p, aus) {
  /* Alle Stellungen und ihre Benson-toten Felder vorab. */
  const bretter = [], tot = [];
  const b = new Uint8Array(N);
  const merke = () => {
    bretter.push(new Uint8Array(b));
    const ep = E.bensonClassify(b);
    const t = new Uint8Array(N);
    for (let i = 0; i < N; i++) if (b[i] && E._bnDead[i] === ep) t[i] = 1;
    tot.push(t);
  };
  merke();
  for (const e of p.ereignisse) {
    if (e.idx >= 0) {
      const f = e.farbe === 'S' ? 1 : 2;
      b[e.idx] = f; E.removeDeadGroups(b, f === 1 ? 2 : 1, e.idx);
    }
    merke();
  }
  const ende = bretter.length - 1;
  for (let t = ABSTAND; t <= ende; t += ABSTAND) {
    const s = bretter[t];
    const erledigt = new Uint8Array(N);
    let karte = false;
    for (let i = 0; i < N; i++) {
      if (!s[i] || erledigt[i]) continue;
      const {group, liberties} = E.floodFill(s, i);
      for (const g of group) erledigt[g] = 1;
      if (group.length < MIN_GROESSE || tot[t][i]) continue;
      const farbe = s[i], anker = i;   /* kleinster Index der Kette */
      let stirbt = false, offen = true;
      for (let u = t + 1; u <= Math.min(ende, t + VORLAUF); u++)
        if (bretter[u][anker] !== farbe || tot[u][anker]) { stirbt = true; break; }
      if (!stirbt && t + VORLAUF > ende) offen = false;
      if (!offen) continue;
      if (!karte) { E.primeInfluenceCache(s); karte = true; }
      const inGruppe = new Uint8Array(N);
      for (const g of group) inGruppe[g] = 1;
      aus.push({fr: liberties.length, groesse: group.length, stirbt,
                ...merkmale(s, group, liberties, farbe, inGruppe)});
    }
  }
}

/* AUC nach Mann-Whitney, mit Bindungen. kleinStirbt: kleiner Wert = stirbt. */
function auc(zeilen, k, kleinStirbt) {
  const a = zeilen.map(z => ({v: kleinStirbt ? -z[k] : z[k], s: z.stirbt}))
    .sort((x, y) => x.v - y.v);
  let rangSumme = 0, n1 = 0;
  for (let i = 0; i < a.length;) {
    let j = i; while (j < a.length && a[j].v === a[i].v) j++;
    const r = (i + 1 + j) / 2;
    for (let m = i; m < j; m++) if (a[m].s) { rangSumme += r; n1++; }
    i = j;
  }
  const n0 = a.length - n1;
  if (!n1 || !n0) return null;
  return (rangSumme - n1 * (n1 + 1) / 2) / (n1 * n0);
}

function bericht(zeilen) {
  const L = [];
  const mit = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  L.push(`${zeilen.length} Beobachtungen, ${zeilen.filter(z => z.stirbt).length} sterben`);
  L.push('');
  L.push('Band      n   stirbt   ' + Object.keys(KANDIDATEN).map(k => `${k}: Mittel stirbt/lebt, AUC`.padEnd(30)).join(''));
  for (const [name, lo, hi] of BAENDER) {
    const z = zeilen.filter(x => x.fr >= lo && x.fr <= hi);
    const d = z.filter(x => x.stirbt), l = z.filter(x => !x.stirbt);
    let zeile = `${name.padEnd(6)}${String(z.length).padStart(5)}${String(d.length).padStart(6)} `
      + `(${(100 * d.length / (z.length || 1)).toFixed(1).padStart(4)} %) `;
    for (const [k, klein] of Object.entries(KANDIDATEN)) {
      const f = k === 'K0' ? x => (100 * x).toFixed(1) : x => x.toFixed(1);
      const a = auc(z, k, klein);
      zeile += `${f(mit(d.map(x => x[k])))}/${f(mit(l.map(x => x[k])))}, `.padStart(16)
        + `${a === null ? '  —  ' : a.toFixed(3)}`.padEnd(14);
    }
    L.push(zeile);
  }
  return L.join('\n');
}

if (require.main === module) {
  const a = process.argv.slice(2);
  const dateien = a.filter((x, i) => !x.startsWith('--') && a[i - 1] !== '--json');
  const jsonAus = a.includes('--json') ? a[a.indexOf('--json') + 1] : null;
  if (!dateien.length) { console.error('Aufruf: siehe Kopf der Datei'); process.exit(2); }
  const zeilen = [];
  for (const d of dateien)
    for (const z of fs.readFileSync(d, 'utf8').trim().split('\n')) partie(JSON.parse(z), zeilen);
  if (jsonAus) fs.writeFileSync(jsonAus, JSON.stringify(zeilen));
  console.log(bericht(zeilen));
}

module.exports = {partie, merkmale, auc, bericht};
