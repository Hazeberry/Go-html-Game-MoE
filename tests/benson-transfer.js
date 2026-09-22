/* bensonDeathTransfer — die Übertragung für den BEWIESENEN Tod.

   Anlass ist eine gemessene Nicht-Monotonie in evaluateBoard: eine Kette im
   Atari wird über deathTransfer mit voller Größe belastet, dieselbe Kette als
   unbedingt tot BEWIESEN kostete gar nichts, weil der Benson-Zweig vor dem
   Transfer-Block abbiegt. Die stärkste Evidenz erzeugte die schwächste
   Buchung — bei geöffnetem Tor machte der Beweis die Lage sogar BESSER.

   Gemessen wird an einer echten Partie, nicht an einer erfundenen Stellung:
   tests/stellungen/laufkampf-211.sgf, gespielt am 22.09.2026 gegen die
   Hard-KI (Weiß). Bei Zug 195 fallen 18 weiße Steine.

   KEINE handgeschriebenen 361er-Arrays. Die Stellungen entstehen, indem die
   SGF-Züge mit removeDeadGroups und idx aus index.html abgespielt werden —
   derselbe Code, der im Browser zieht. Der erste Test belegt, dass dieses
   Replay stimmt; erst danach darf sich irgendein anderer Test darauf
   berufen. */
'use strict';
const fs = require('fs');
const path = require('path');
const {ladeKI, test, pruefe, pruefeGleich, laufeTests} = require('./rahmen.js');

const SGF = path.join(__dirname, 'stellungen', 'laufkampf-211.sgf');

/* Referenzwerte, gemessen am Stand VOR der Einführung von
   bensonDeathTransfer (Commit 0b80584). Ohne sie wäre „bitgenau
   unverändert" eine Behauptung statt einer Prüfung. */
const VORHER = {
  184: {standard:  153, torOffen: 153, ohneBenson:  153},
  185: {standard:   55, torOffen:  38, ohneBenson:   55},
  191: {standard: -188, torOffen:  71, ohneBenson: -188},
  194: {standard: -199, torOffen:  68, ohneBenson: -199}
};
const ZUEGE = Object.keys(VORHER).map(Number);

const api = ladeKI({mitNetz: false});
const {PARAMS, BOARD_SIZE, idx, evaluateBoard, removeDeadGroups,
       bensonClassify, _bnDead, NEIGHBORS} = api;

/* ── SGF abspielen, mit der Engine selbst ─────────────────────────────── */
function sgfZuege() {
  const txt = fs.readFileSync(SGF, 'utf8');
  const out = [];
  const re = /;([BW])\[([a-s]{0,2})\]/g;
  let m;
  while ((m = re.exec(txt))) {
    const farbe = m[1] === 'B' ? 1 : 2;
    out.push(m[2] ? {farbe, idx: idx(m[2].charCodeAt(0) - 97, m[2].charCodeAt(1) - 97)}
                  : {farbe, idx: -1});
  }
  return out;
}
const ZS = sgfZuege();

function stellung(bis) {
  const board = new Uint8Array(BOARD_SIZE);
  const captures = {1: 0, 2: 0};
  for (let t = 0; t < bis; t++) {
    const z = ZS[t];
    if (z.idx < 0) continue;
    board[z.idx] = z.farbe;
    captures[z.farbe] += removeDeadGroups(board, z.farbe === 1 ? 2 : 1, z.idx);
  }
  return {board, captures};
}

/* PARAMS für einen Aufruf setzen und danach exakt zurückgeben. Ein Test, der
   den Zustand liegen lässt, vergiftet die folgenden. */
function mit(werte, fn) {
  const alt = {};
  for (const k of Object.keys(werte)) { alt[k] = PARAMS[k]; PARAMS[k] = werte[k]; }
  try { return fn(); } finally { for (const k of Object.keys(alt)) PARAMS[k] = alt[k]; }
}

/* Summe über alle benson-toten Ketten, aus Sicht von `color`:
   eigene tote Kette → Abzug, gegnerische → Gutschrift. Unabhängig neu
   gerechnet, nicht aus evaluateBoard abgelesen. */
function erwarteterUebertrag(board, color, faktor) {
  const ep = bensonClassify(board);
  const gesehen = new Uint8Array(BOARD_SIZE);
  let summe = 0;
  for (let i = 0; i < BOARD_SIZE; i++) {
    const c = board[i];
    if (!c || gesehen[i] || _bnDead[i] !== ep) continue;
    let head = 0, tail = 0, groesse = 0;
    const q = [i];
    gesehen[i] = 1;
    while (head < q.length) {
      const g = q[head++]; groesse++;
      for (const n of NEIGHBORS[g])
        if (board[n] === c && !gesehen[n]) { gesehen[n] = 1; q.push(n); }
    }
    const bt = faktor * groesse * PARAMS.captureWeight;
    summe += (c === color) ? -bt : bt;
  }
  return summe;
}

/* ── 1. Das Replay ────────────────────────────────────────────────────── */

test('Das Replay der Partie ist nachweislich korrekt', () => {
  const board = new Uint8Array(BOARD_SIZE);
  const captures = {1: 0, 2: 0};
  let besetzt = 0, selbstmord = 0;
  for (const z of ZS) {
    if (z.idx < 0) continue;
    if (board[z.idx]) besetzt++;
    board[z.idx] = z.farbe;
    captures[z.farbe] += removeDeadGroups(board, z.farbe === 1 ? 2 : 1, z.idx);
    if (board[z.idx] !== z.farbe) selbstmord++;
  }
  pruefeGleich(besetzt, 0, 'kein Zug fällt auf ein besetztes Feld');
  pruefeGleich(selbstmord, 0, 'kein eigener Stein verschwindet nach dem eigenen Zug');
  /* Der Zähler der App zeigt am Ende dieser Partie 19 : 0. Das ist die
     unabhängige Bestätigung des ganzen Replays durch die Anwendung selbst. */
  pruefeGleich(captures[1], 19, 'Schwarz schlägt am Ende');
  pruefeGleich(captures[2],  0, 'Weiß schlägt am Ende');
});

test('Zug 195 schlägt genau die 18 Steine der Laufkampf-Gruppe', () => {
  const vor = stellung(194).board, nach = stellung(195).board;
  let weg = 0;
  for (let i = 0; i < BOARD_SIZE; i++) if (vor[i] === 2 && nach[i] !== 2) weg++;
  pruefeGleich(weg, 18, 'geschlagene weiße Steine bei Zug 195');
});

/* ── 2. Bitgenau unverändert, in drei Richtungen ──────────────────────── */

test('Richtung 1: bei bensonDeathTransfer = 0 rechnet evaluateBoard wie vorher', () => {
  for (const nr of ZUEGE) {
    const {board, captures} = stellung(nr);
    const v = mit({bensonDeathTransfer: 0}, () => evaluateBoard(board, 2, captures));
    pruefe(Object.is(v, VORHER[nr].standard),
      `Zug ${nr} im Auslieferungszustand: erwartet ${VORHER[nr].standard}, bekommen ${v}`);
  }
});

test('Richtung 2: bei geschlossenem Tor ändert der Regler nichts', () => {
  /* Der Auslieferungswert bensonEvalMaxEmpty = 160 hält den Benson-Zweig in
     dieser ganzen Partie zu (168 bis 178 freie Felder). Dann darf auch ein
     eingeschalteter Übertrag nicht das kleinste Bit bewegen. */
  for (const nr of ZUEGE) {
    const {board, captures} = stellung(nr);
    let frei = 0;
    for (let i = 0; i < BOARD_SIZE; i++) if (!board[i]) frei++;
    pruefe(frei > PARAMS.bensonEvalMaxEmpty,
      `Zug ${nr}: Tor muss zu sein (${frei} frei, Schwelle ${PARAMS.bensonEvalMaxEmpty})`);
    const aus = mit({bensonDeathTransfer: 0}, () => evaluateBoard(board, 2, captures));
    const an  = mit({bensonDeathTransfer: 1}, () => evaluateBoard(board, 2, captures));
    pruefe(Object.is(aus, an), `Zug ${nr}: ${aus} gegen ${an} bei geschlossenem Tor`);
  }
});

test('Richtung 3: ohne Benson-Ebene ändert der Regler nichts', () => {
  for (const nr of ZUEGE) {
    const {board, captures} = stellung(nr);
    const aus = mit({bensonEval: 0, bensonEvalMaxEmpty: 361, bensonDeathTransfer: 0},
                    () => evaluateBoard(board, 2, captures));
    const an  = mit({bensonEval: 0, bensonEvalMaxEmpty: 361, bensonDeathTransfer: 1},
                    () => evaluateBoard(board, 2, captures));
    pruefe(Object.is(aus, an), `Zug ${nr}: ${aus} gegen ${an} ohne Benson-Ebene`);
    pruefe(Object.is(aus, VORHER[nr].ohneBenson),
      `Zug ${nr} ohne Benson: erwartet ${VORHER[nr].ohneBenson}, bekommen ${aus}`);
  }
});

/* ── 3. Und er beißt, wenn er darf ────────────────────────────────────── */

test('Bei offenem Tor verschiebt der Regler genau die Größe der toten Ketten', () => {
  let beissende = 0;
  for (const nr of ZUEGE) {
    const {board, captures} = stellung(nr);
    const aus = mit({bensonEvalMaxEmpty: 361, bensonDeathTransfer: 0},
                    () => evaluateBoard(board, 2, captures));
    const an  = mit({bensonEvalMaxEmpty: 361, bensonDeathTransfer: 1},
                    () => evaluateBoard(board, 2, captures));
    pruefe(Object.is(aus, VORHER[nr].torOffen),
      `Zug ${nr} bei offenem Tor ohne Übertrag: erwartet ${VORHER[nr].torOffen}, bekommen ${aus}`);
    const soll = erwarteterUebertrag(board, 2, 1);
    pruefeGleich(an - aus, soll, `Zug ${nr}: Verschiebung durch den Übertrag`);
    if (soll !== 0) beissende++;
  }
  pruefe(beissende >= 3,
    `mindestens drei der vier Stellungen müssen betroffen sein, waren ${beissende}`);
});

/* ── 4. Die Nicht-Monotonie, die der Anlass war ───────────────────────── */

test('Der Beweis wiegt schwerer als die Freiheitsnot (Monotonie)', () => {
  /* Bei Zug 191 und 194 ist die Gruppe benson-tot UND im Atari. Dann muss
     die bewiesene Buchung mindestens so hart ausfallen wie die geschätzte —
     sonst lohnt es sich für die Bewertung, dass der Tod bewiesen wird. */
  for (const nr of [191, 194]) {
    const {board, captures} = stellung(nr);
    const geschaetzt = mit({bensonEval: 0}, () => evaluateBoard(board, 2, captures));
    const bewiesen = mit({bensonEvalMaxEmpty: 361, bensonDeathTransfer: 1},
                         () => evaluateBoard(board, 2, captures));
    pruefe(bewiesen <= geschaetzt,
      `Zug ${nr}: bewiesen tot ${bewiesen} muss <= geschätzt ${geschaetzt} sein`);
  }
});

test('Ohne den Übertrag ist die Monotonie verletzt — der Defekt ist real', () => {
  /* Dieser Test hält den Anlass fest. Fällt er eines Tages um, weil die
     Verletzung verschwunden ist, dann ist bensonDeathTransfer überflüssig
     geworden — und das soll auffallen, nicht stillschweigend passieren. */
  let verletzt = 0;
  for (const nr of [191, 194]) {
    const {board, captures} = stellung(nr);
    const geschaetzt = mit({bensonEval: 0}, () => evaluateBoard(board, 2, captures));
    const ohne = mit({bensonEvalMaxEmpty: 361, bensonDeathTransfer: 0},
                     () => evaluateBoard(board, 2, captures));
    if (ohne > geschaetzt) verletzt++;
  }
  pruefeGleich(verletzt, 2,
    'beide Atari-Stellungen müssen ohne Übertrag besser bewertet werden als ohne Beweis');
});

if (require.main === module)
  laufeTests('Benson-Übertrag (bensonDeathTransfer)').then(ok => process.exit(ok ? 0 : 1));
