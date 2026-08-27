/* Gemeinsamer Unterbau der Tests.

   Getestet wird derselbe Code, der im Browser läuft: die <script>-Blöcke
   werden zur Laufzeit aus index.html geschnitten und ausgewertet, genau wie
   ab-harness.js es macht. Kein Duplikat, keine Testkopie, die auseinander-
   laufen könnte — ein Test, der eine Datei prüft, die niemand ausliefert,
   prüft nichts.

   Keine Abhängigkeiten außer Node. Der Browser-Test braucht zusätzlich
   Playwright und überspringt sich selbst, wenn es fehlt. */
'use strict';
const fs   = require('fs');
const path = require('path');

const STANDARD_HTML = path.join(__dirname, '..', 'index.html');

function schneide(html, id) {
  const m = new RegExp(`<script id="${id}">([\\s\\S]*?)<\\/script>`).exec(html);
  if (!m) throw new Error(`<script id="${id}"> nicht gefunden`);
  return m[1];
}

/* Lädt die KI in den aktuellen Prozess und gibt zurück, was die Tests
   anfassen. Die Blöcke laufen im globalen Scope, deshalb reichen sie ihre
   internen Namen über die angehängte Exportzeile heraus — PARAMS und
   BOARD_SIZE sind sonst von außen unsichtbar.

   `mitNetz = false` lässt den policy-net-Block weg: die reinen MCTS-Tests
   brauchen ihn nicht und sollen nicht an localStorage hängen. */
function ladeKI({htmlPfad = STANDARD_HTML, mitNetz = true, speicher = null} = {}) {
  const html = fs.readFileSync(htmlPfad, 'utf8');

  /* Browser-Schalen. Der policy-net-Block fasst genau diese zwei Objekte an:
     localStorage (Gewichte laden/speichern) und document (dashUpdate holt
     Dashboard-Felder; das erste liefert null, die Methode kehrt sofort um). */
  const ablage = speicher instanceof Map ? speicher : new Map();
  globalThis.localStorage = {
    getItem:    k => (ablage.has(k) ? ablage.get(k) : null),
    setItem:    (k, v) => { ablage.set(k, String(v)); },
    removeItem: k => { ablage.delete(k); }
  };
  globalThis.document = { getElementById: () => null };

  let quelle = schneide(html, 'shared-go-logic') + '\n' + schneide(html, 'worker-ai');
  if (mitNetz) quelle += '\n' + schneide(html, 'policy-net');   /* MUSS nach worker-ai: der blendWeight-Getter liest PARAMS */
  quelle += `
    ;globalThis.__test = {
      mctsKids: _mctsKids, mctsPUCT, getAIMove, getLegalMoves,
      PARAMS, BOARD_SIZE, NEIGHBORS, idx, xOf, yOf
    };`;
  (0, eval)(quelle);

  const api = globalThis.__test;
  api.netz    = mitNetz ? globalThis.policyNet : null;
  api.ablage  = ablage;
  return api;
}

/* ── Winziger Testrahmen ──────────────────────────────────────────────
   Kein Framework: die Tests sollen ohne npm install laufen, weil das
   Repo bewusst keine node_modules hat. */
const _faelle = [];
let   _aktuell = null;

/* TEST_FILTER=teilstring grenzt auf einzelne Fälle ein — nützlich beim
   Nachmessen eines stochastischen Tests. */
function test(name, fn) {
  const f = process.env.TEST_FILTER;
  if (f && !name.toLowerCase().includes(f.toLowerCase())) return;
  _faelle.push({name, fn});
}

function pruefe(bedingung, was) {
  if (!_aktuell) throw new Error('pruefe() außerhalb eines Tests');
  _aktuell.pruefungen++;
  if (!bedingung) throw new Error(was);
}

function pruefeGleich(ist, soll, was) {
  pruefe(Object.is(ist, soll), `${was}: erwartet ${soll}, bekommen ${ist}`);
}

function pruefeNah(ist, soll, toleranz, was) {
  pruefe(Number.isFinite(ist) && Math.abs(ist - soll) <= toleranz,
    `${was}: erwartet ${soll} ± ${toleranz}, bekommen ${ist}`);
}

function pruefeFinit(feld, was) {
  for (let i = 0; i < feld.length; i++)
    if (!Number.isFinite(feld[i]))
      pruefe(false, `${was}: ${feld === undefined ? '?' : ''}[${i}] = ${feld[i]} ist nicht finit`);
  pruefe(true, was);
}

async function laufeTests(titel) {
  console.log(`\n${titel}`);
  console.log('─'.repeat(titel.length));
  let ok = 0, kaputt = 0, uebersprungen = 0;
  for (const f of _faelle) {
    _aktuell = {pruefungen: 0};
    const t0 = Date.now();
    try {
      const r = await f.fn();
      const ms = Date.now() - t0;
      if (r === 'skip') { uebersprungen++; console.log(`  ○  ${f.name} — übersprungen`); }
      else { ok++; console.log(`  ✓  ${f.name} (${_aktuell.pruefungen} Prüfungen, ${ms} ms)`); }
    } catch (e) {
      kaputt++;
      console.log(`  ✗  ${f.name}`);
      console.log(`     ${e && e.message ? e.message : e}`);
      if (e && e.stack && !/^Error: /.test(String(e.message))) console.log(`     ${e.stack.split('\n')[1] || ''}`);
    }
  }
  console.log(`\n  ${ok} bestanden · ${kaputt} fehlgeschlagen`
    + (uebersprungen ? ` · ${uebersprungen} übersprungen` : ''));
  return kaputt === 0;
}

module.exports = {ladeKI, schneide, STANDARD_HTML,
                 test, pruefe, pruefeGleich, pruefeNah, pruefeFinit, laufeTests};
