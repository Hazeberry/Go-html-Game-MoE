// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Gemeinsame Bausteine des Passregel-Vergleichs (docs/passregel-vergleich.md):
   Koordinaten, Statistik (Clopper-Pearson, McNemar/Vorzeichentest, t-Intervall),
   Seed-Ableitung, die geprüfte Voraussetzung „Gegner hat unmittelbar davor
   gepasst“, Zählung aus einer Tot-Liste (Fläche und Territory nach der Regel
   von finalTerritoryScore) und die Auswertung `bewerte` samt Gültigkeit.

   Reine Funktionen, ohne GNU Go und ohne Engine: testbar in tests/passregel-vergleich.js.
   Nichts hier startet eine Messung. */
'use strict';
const fs = require('fs'), zlib = require('zlib');

/* ── Koordinaten (GTP-Spalten ohne I, Zeile 1 unten; bei uns y = 0 oben) ── */
const SPALTEN = 'ABCDEFGHJKLMNOPQRST';
const zuGtp = i => SPALTEN[i % 19] + (19 - Math.floor(i / 19));
function vonGtp(s) {
  const t = String(s).trim().toUpperCase();
  if (t === 'PASS') return -1;
  if (t === 'RESIGN') return -2;
  const x = SPALTEN.indexOf(t[0]), r = +t.slice(1);
  if (x < 0 || !(r >= 1 && r <= 19)) throw new Error('GTP-Koordinate unlesbar: ' + s);
  return (19 - r) * 19 + x;
}

/* ── Zufall und Seeds ───────────────────────────────────────────────── */
function mulberry32(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function fnv32(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h;
}
/* Seed der Fortsetzung einer Stellung: nur aus festen Angaben, nie aus Zeit oder Reihenfolge */
function fortsetzungsSeed(basis, gruppe, datei, nr, index) {
  return fnv32(`passregel-vergleich-v1|${basis}|${gruppe}|${datei}|${nr}|${index}`) % 2147483647 || 1;
}

/* ── Statistik ──────────────────────────────────────────────────────── */
const _lnF = [0, 0];
function lnFak(n) { for (let i = _lnF.length; i <= n; i++) _lnF[i] = _lnF[i - 1] + Math.log(i); return _lnF[n]; }
function binomPmf(k, n, p) {
  if (p <= 0) return k === 0 ? 1 : 0;
  if (p >= 1) return k === n ? 1 : 0;
  return Math.exp(lnFak(n) - lnFak(k) - lnFak(n - k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
}
function binomCdf(k, n, p) { let s = 0; for (let i = 0; i <= k; i++) s += binomPmf(i, n, p); return Math.min(1, s); }

/* Exaktes zweiseitiges Clopper-Pearson-Intervall (Standard 95 %) für k von n */
function cpIntervall(k, n, alpha = 0.05) {
  if (!(Number.isInteger(k) && Number.isInteger(n) && n > 0 && k >= 0 && k <= n)) throw new Error(`cpIntervall: ungültig ${k}/${n}`);
  const a2 = alpha / 2;
  let unten = 0, oben = 1;
  if (k > 0) {   /* P(X >= k | p) = a2, steigend in p */
    let lo = 0, hi = k / n;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (1 - binomCdf(k - 1, n, m) > a2) hi = m; else lo = m; }
    unten = (lo + hi) / 2;
  }
  if (k < n) {   /* P(X <= k | p) = a2, fallend in p */
    let lo = k / n, hi = 1;
    for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (binomCdf(k, n, m) > a2) lo = m; else hi = m; }
    oben = (lo + hi) / 2;
  }
  return {k, n, anteil: k / n, unten, oben};
}

/* Exakter zweiseitiger Test gegen p = 0,5 (McNemar mit b und c, Vorzeichentest mit + und −; Nullen entfallen) */
function vorzeichenTestExakt(b, c) {
  const n = b + c;
  if (n === 0) return {b, c, n, p: 1};
  return {b, c, n, p: Math.min(1, 2 * binomCdf(Math.min(b, c), n, 0.5))};
}

/* Regularisierte unvollständige Betafunktion (Lentz) und Student-t */
function lnGamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015; for (const cj of c) s += cj / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betaI(a, b, x) {
  if (x <= 0) return 0; if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  const cf = (a, b, x) => {
    const TINY = 1e-30; let c = 1, d = 1 - (a + b) * x / (a + 1); if (Math.abs(d) < TINY) d = TINY; d = 1 / d; let h = d;
    for (let m = 1; m <= 300; m++) {
      const m2 = 2 * m; let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d; h *= d * c;
      aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
      d = 1 + aa * d; if (Math.abs(d) < TINY) d = TINY; c = 1 + aa / c; if (Math.abs(c) < TINY) c = TINY; d = 1 / d;
      const del = d * c; h *= del; if (Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  };
  return x < (a + 1) / (a + b + 2) ? bt * cf(a, b, x) / a : 1 - bt * cf(b, a, 1 - x) / b;
}
function tCdf(t, df) { const x = df / (df + t * t), p = 0.5 * betaI(df / 2, 0.5, x); return t > 0 ? 1 - p : p; }
function tQuantil(p, df) { let lo = 0, hi = 1000; for (let i = 0; i < 200; i++) { const m = (lo + hi) / 2; if (tCdf(m, df) < p) lo = m; else hi = m; } return (lo + hi) / 2; }

const mittel = a => a.reduce((s, x) => s + x, 0) / a.length;
const sd = a => a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - mittel(a)) ** 2, 0) / (a.length - 1)) : 0;
const median = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function tIntervall(werte, niveau = 0.95) {
  const n = werte.length;
  if (n < 2) return null;
  const m = mittel(werte), se = sd(werte) / Math.sqrt(n), q = tQuantil(1 - (1 - niveau) / 2, n - 1);
  return {n, mittel: m, unten: m - q * se, oben: m + q * se};
}

/* ── Voraussetzung jeder Stellung (docs/passregel-vergleich.md §2) ─────
   zuege: [{farbe, punkt}] bis einschließlich Index i; punkt < 0 ist ein Pass.
   Geprüft, nicht angenommen: (1) der Zug i ist ein Pass der Gegnerfarbe, (2) der Zug davor
   ist kein Pass, (3) der Pass-Zähler des Einspielens steht auf 1. */
function voraussetzung(zuege, i, kiFarbe, paesseZaehler) {
  const z = zuege[i], v = i > 0 ? zuege[i - 1] : null;
  const f = [];
  if (!z || z.punkt >= 0 || z.farbe !== 3 - kiFarbe) f.push('letzter Zug ist kein Pass der Gegnerfarbe');
  if (v && v.punkt < 0) f.push('Zug davor ist ein Pass');
  if (paesseZaehler !== undefined && paesseZaehler !== 1) f.push(`Pass-Zähler ${paesseZaehler} statt 1`);
  return {ok: f.length === 0, fehler: f};
}

/* ── Zählung aus einer Tot-Liste ────────────────────────────────────────
   board: Uint8Array (1 Schwarz, 2 Weiß), caps: bisher geschlagene Steine {1,2},
   tot: Menge der Punkte toter Steine (GNU Gos final_status_list dead),
   NEIGHBORS: Nachbarn je Punkt. Die tote Seite wird dem Gegner als Gefangene gutgeschrieben.
   'flaeche': Steine plus umschlossene Punkte. 'territory': Gefangene plus umschlossene Punkte
   (Regel von finalTerritoryScore, tote Steine wie bei resolveLifeAndDeath als Gefangene).
   stand = Schwarz − Weiß − Komi (größer 0: Schwarz vorn). */
function zaehleMitTotListe(board, caps, tot, komi, NEIGHBORS, modus) {
  const n = board.length, b = Uint8Array.from(board), c = {1: caps[1] || 0, 2: caps[2] || 0};
  for (const i of tot) if (b[i]) { c[b[i] === 1 ? 2 : 1]++; b[i] = 0; }
  const f = modus === 'territory' ? {1: c[1], 2: c[2]} : {1: 0, 2: 0}, v = new Uint8Array(n);
  if (modus !== 'territory') for (let i = 0; i < n; i++) if (b[i]) f[b[i]]++;
  for (let i = 0; i < n; i++) {
    if (b[i] || v[i]) continue;
    const q = [i]; v[i] = 1; let rand = 0;
    for (let k = 0; k < q.length; k++) for (const nb of NEIGHBORS[q[k]]) {
      if (!b[nb]) { if (!v[nb]) { v[nb] = 1; q.push(nb); } } else rand |= b[nb];
    }
    if (rand === 1 || rand === 2) f[rand] += q.length;
  }
  return {schwarz: f[1], weiss: f[2], stand: f[1] - f[2] - komi};
}
/* Zählbestandteile (docs/passregel-zaehldiagnose.md): wie zaehleMitTotListe, aber nach Bestandteilen getrennt und mit
   Besitzer je Punkt. Besitzer: 1 Schwarz, 2 Weiß, 0 neutral (leere Region ohne einfarbigen Rand). Die toten Steine
   werden entfernt und dem Gegner als Gefangene gutgeschrieben; ihre Punkte werden danach wie leere Punkte behandelt.
   Regionen: jede zusammenhängende Menge leerer Punkte (nach Entfernung der toten Steine) mit Rand-Farben. */
function zaehlbestandteile(board, caps, tot, komi, NEIGHBORS) {
  const n = board.length, b = Uint8Array.from(board), c = {1: caps[1] || 0, 2: caps[2] || 0}, tote = {1: 0, 2: 0};
  for (const i of tot) if (b[i]) { tote[b[i]]++; c[b[i] === 1 ? 2 : 1]++; b[i] = 0; }
  const steine = {1: 0, 2: 0}; for (let i = 0; i < n; i++) if (b[i]) steine[b[i]]++;
  const besitzer = new Int8Array(n), gebiet = {1: 0, 2: 0}, regionen = [], v = new Uint8Array(n);
  let neutral = 0;
  for (let i = 0; i < n; i++) {
    if (b[i]) { besitzer[i] = b[i]; continue; }
    if (v[i]) continue;
    const q = [i]; v[i] = 1; let rand = 0;
    for (let k = 0; k < q.length; k++) for (const nb of NEIGHBORS[q[k]]) {
      if (!b[nb]) { if (!v[nb]) { v[nb] = 1; q.push(nb); } } else rand |= b[nb];
    }
    const eigner = rand === 1 || rand === 2 ? rand : 0;
    for (const p of q) besitzer[p] = eigner;
    if (eigner) gebiet[eigner] += q.length; else neutral += q.length;
    regionen.push({groesse: q.length, rand: rand === 1 ? 'S' : rand === 2 ? 'W' : rand === 3 ? 'SW' : '-', besitzer: eigner, punkte: q.slice()});
  }
  const flaeche = {schwarz: steine[1] + gebiet[1], weiss: steine[2] + gebiet[2]}, territory = {schwarz: c[1] + gebiet[1], weiss: c[2] + gebiet[2]};
  flaeche.stand = flaeche.schwarz - flaeche.weiss - komi; territory.stand = territory.schwarz - territory.weiss - komi;
  return {steine, gebiet, neutral, gefangenBisher: {1: caps[1] || 0, 2: caps[2] || 0}, tote, gefangenMitTot: c, flaeche, territory, besitzer, regionen};
}
const ausSicht = (stand, kiFarbe) => (kiFarbe === 1 ? 1 : -1) * stand;
const gewonnen = standKI => standKI > 0;   /* Remis zählt als nicht gewonnen (mit Komi 7,5 ohnehin unmöglich) */

/* GNU Gos final_score ("B+12.5", "W+3.5", "0") als Stand Schwarz − Weiß */
function standAusFinalScore(antwort) {
  const m = /^([BW])\+([\d.]+)/.exec(String(antwort).trim());
  if (!m) { if (String(antwort).trim() === '0') return 0; throw new Error('final_score unlesbar: ' + antwort); }
  return (m[1] === 'B' ? 1 : -1) * +m[2];
}
/* final_status_list dead: Zeilen mit Punkten getrennt durch Leerzeichen, jede Zeile eine Kette */
function totListeAusGtp(antwort) {
  return new Set(String(antwort).split(/\s+/).filter(Boolean).map(vonGtp));
}

/* ── Archivdaten lesen ───────────────────────────────────────────────── */
function leseJsonl(pfad) {
  let t = fs.readFileSync(pfad);
  if (/\.gz$/.test(pfad)) t = zlib.gunzipSync(t);
  return t.toString('utf8').split('\n').filter(Boolean).map(z => JSON.parse(z));
}

/* ── Auswertung (docs/passregel-vergleich.md §7 bis §9) ──────────────────
   einheiten: Zeilen aus Stufe A {schluessel, gruppe, kiFarbe, ausgeloest: {flaeche, territory}, pruef: {…}}
   ergebnisse: Map schluessel → Ergebnis der Fortsetzung (siehe passregel-fortsetzung.js):
     {fehler?: [..], arm1: {flaeche: stand|null, territory: stand|null} (Stand Schwarz−Weiß−Komi),
      arm0: {status: 'regulaer'|'ausfall', grund?, flaeche, territory, kiSteine, kiPaesse, passNachGegnerpass, versuch},
      kontrolle: {flaecheTotListe: bool, gefangenGleich: bool, bretterGleich: bool}}
   Fehlt ein Ergebnis, ist die Einheit ungeklärt (zählt wie ein Ausfall mit unbekanntem „sofort“). */
const GRENZE = 0.02, MAX_AUSFALL_ANTEIL = 0.05, MIN_N_NULL = 183;

function bewerteWertung(einheiten, ergebnisse, wertung) {
  const us = einheiten.filter(e => e.ausgeloest && e.ausgeloest[wertung]);
  const N = us.length;
  const z = {N, L: 0, A: 0, G: 0, W0: 0, ausfaelle: 0, fehlend: 0, sofortVerloren: 0, sofortUnbekannt: 0,
             d: [], kiSteine: [], kiPaesse: [], abwMit: [], abwNur: [], pflichtFehler: [], ausfallListe: [],
             gruppen: {}, farben: {}};
  const grp = (map, key) => (map[key] = map[key] || {N: 0, L: 0, A: 0, G: 0});
  for (const e of us) {
    const r = ergebnisse.get(e.schluessel);
    const g = grp(z.gruppen, e.gruppe), fa = grp(z.farben, e.kiFarbe === 1 ? 'S' : 'W');
    g.N++; fa.N++;
    if (!r) { z.fehlend++; z.ausfaelle++; z.sofortUnbekannt++; z.A++; g.A++; fa.A++; z.ausfallListe.push({schluessel: e.schluessel, grund: 'kein Ergebnis'}); continue; }
    if (r.fehler && r.fehler.length) z.pflichtFehler.push({schluessel: e.schluessel, fehler: r.fehler});
    const s1 = r.arm1 && Number.isFinite(r.arm1[wertung]) ? ausSicht(r.arm1[wertung], e.kiFarbe) : null;
    const a0 = r.arm0 || {status: 'ausfall', grund: 'kein Arm 0'};
    if (a0.status === 'regulaer') {
      if (a0.passNachGegnerpass !== 0 || a0.versuch) z.pflichtFehler.push({schluessel: e.schluessel, fehler: ['Passregel im Arm „weiter“ nicht aus']});
      if (a0.kiSteine !== undefined) z.kiSteine.push(a0.kiSteine);
      if (a0.kiPaesse !== undefined) z.kiPaesse.push(a0.kiPaesse);
    }
    if (s1 === null) z.sofortUnbekannt++; else if (!gewonnen(s1)) z.sofortVerloren++;
    const mit = e.pruef && e.pruef[wertung];
    if (mit && s1 !== null) { z.abwMit.push(mit.mit - s1); z.abwNur.push(mit.nur - s1); }
    if (a0.status !== 'regulaer' || !Number.isFinite(a0[wertung])) {
      z.ausfaelle++; z.ausfallListe.push({schluessel: e.schluessel, grund: a0.grund || 'Ausfall', sofort: s1});
      if (s1 === null || !gewonnen(s1)) { z.A++; g.A++; fa.A++; }   /* konservativ: möglicher verlorener Sieg */
      continue;
    }
    const s0 = ausSicht(a0[wertung], e.kiFarbe), w0 = gewonnen(s0);
    if (w0) z.W0++;
    if (s1 === null) { if (w0) { z.A++; g.A++; fa.A++; } continue; }   /* „sofort“ nicht zählbar: nur bei Sieg „weiter“ möglich */
    if (w0 && !gewonnen(s1)) { z.L++; g.L++; fa.L++; }
    if (!w0 && gewonnen(s1)) { z.G++; g.G++; fa.G++; }
    z.d.push(s0 - s1);
  }
  const K = z.L + z.A;
  z.K = K;
  z.cpK = N > 0 ? cpIntervall(K, N) : null;
  z.cpL = N > 0 ? cpIntervall(z.L, N) : null;
  z.cpL_W0 = z.W0 > 0 ? cpIntervall(z.L, z.W0) : null;
  z.ausfallAnteil = N > 0 ? z.ausfaelle / N : 0;
  z.mcnemar = vorzeichenTestExakt(z.L, z.G);
  const pos = z.d.filter(x => x > 0).length, neg = z.d.filter(x => x < 0).length;
  z.punkte = z.d.length ? {n: z.d.length, mittel: mittel(z.d), median: median(z.d), t: tIntervall(z.d), vorzeichen: vorzeichenTestExakt(pos, neg), mehrWeiter: pos, wenigerWeiter: neg} : null;
  z.zuege = z.kiSteine.length ? {steineMittel: mittel(z.kiSteine), steineMedian: median(z.kiSteine),
                                  paesseMittel: z.kiPaesse.length ? mittel(z.kiPaesse) : null, n: z.kiSteine.length} : null;
  z.zaehlvorschau = z.abwMit.length ? {n: z.abwMit.length, mitMittel: mittel(z.abwMit), nurMittel: mittel(z.abwNur),
    mitGroesste: Math.max(...z.abwMit.map(Math.abs)), nurGroesste: Math.max(...z.abwNur.map(Math.abs))} : null;
  z.nMindestensFuerNull = MIN_N_NULL;
  z.grenzeErreicht = N > 0 && z.cpK.oben <= GRENZE;
  /* Gültigkeit: Pflichtfehler machen die Wertung ungültig; viele Ausfälle nur E2/E3/G */
  z.gueltig = z.pflichtFehler.length === 0 && N > 0;
  z.gruendeUngueltig = [];
  if (z.pflichtFehler.length) z.gruendeUngueltig.push(`${z.pflichtFehler.length} Pflichtprüfung(en) verletzt`);
  if (N === 0) z.gruendeUngueltig.push('keine ausgelöste Einheit');
  z.paareGueltig = z.ausfallAnteil <= MAX_AUSFALL_ANTEIL;
  return z;
}

/* Gesamtbefund: nur wenn beide Wertungen gültig sind, kann der Wortlaut der 2-%-Grenze fallen */
function bewerte(einheiten, ergebnisse, kontrollenTerritory = {ok: true, grund: null}) {
  const w = {flaeche: bewerteWertung(einheiten, ergebnisse, 'flaeche'), territory: bewerteWertung(einheiten, ergebnisse, 'territory')};
  if (!kontrollenTerritory.ok) { w.territory.gueltig = false; w.territory.gruendeUngueltig.push(kontrollenTerritory.grund || 'Territory-Kontrolle verfehlt'); }
  const beideGueltig = w.flaeche.gueltig && w.territory.gueltig;
  let befund;
  if (!beideGueltig) befund = 'KEIN URTEIL (mindestens eine Wertung ungültig)';
  else if (w.flaeche.grenzeErreicht && w.territory.grenzeErreicht)
    befund = 'Die obere Konfidenzgrenze für den Anteil verlorener Siege liegt unter den Modellannahmen bei höchstens 2 %.';
  else befund = 'Grenze von 2 % nicht gezeigt.';
  return {wertungen: w, gueltig: beideGueltig, befund, grenze: GRENZE, maxAusfallAnteil: MAX_AUSFALL_ANTEIL};
}

module.exports = {zaehlbestandteile, SPALTEN, zuGtp, vonGtp, mulberry32, fnv32, fortsetzungsSeed, binomCdf, cpIntervall, vorzeichenTestExakt,
  betaI, tCdf, tQuantil, tIntervall, mittel, sd, median, voraussetzung, zaehleMitTotListe, ausSicht, gewonnen,
  standAusFinalScore, totListeAusGtp, leseJsonl, bewerteWertung, bewerte, GRENZE, MAX_AUSFALL_ANTEIL, MIN_N_NULL};
