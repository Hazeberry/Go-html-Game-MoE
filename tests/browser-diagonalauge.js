// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Schalter PARAMS.diagonalAugeEnde im echten Browser (docs/diagonalpruefung-vorabfestlegung.md, AP2):
     1. Standard 0 (PARAMS und PARAMS_DEFAULT); das Dashboard hat die Zeile mit Wert 0, Bereich 0 bis 1.
     2. Schlusszählung (resolveLifeAndDeath): bei aus entfernt sie genau die eingefrorene Tot-Menge der Entwicklungsstellung 212|337 (4 Steine),
        bei an die der Test-Kopie der Diagnose (29 Steine); bei der unveränderten Stellung 523|354 sind beide gleich.
     3. Zählvorschau (vorschauOeffnen): die als tot geführten Steine (bewiesen oder geschätzt) sind dieselben Mengen wie bei der Schlusszählung,
        bei aus und bei an.
     4. Eine bereits geöffnete Vorschau folgt dem Schalter: Ändern des Dashboard-Felds, Reset und Preset „Std“ berechnen sie neu (Mengen und
        Panel-Text gleich einer frisch geöffneten Vorschau); eine geschlossene Vorschau bleibt geschlossen; der Cache-Schlüssel enthält den Schalter.
     5. Schalter nur für die Schlusszählung (PARAMS.diagonalAugeSchluss, docs/diagonal-schluss-vorabfestlegung.md): Standard 0 mit Dashboard-Zeile;
        bei diagonalAugeSchluss = 1 und diagonalAugeEnde = 0 entfernt die Schlusszählung die Menge „an“, die Zählvorschau zeigt weiter die
        Menge „aus“; eine geöffnete Vorschau bleibt beim Ändern des Felds unverändert (Mengen, Panel-Text, Cache-Schlüssel).
   Die Mengen stammen aus tests/referenz/diagonalauge.json (vor der Änderung eingefroren).
   Aufruf:  node tests/browser-diagonalauge.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');
const {ladePlaywright, sucheChromium, starteServer} = require('./browser-rahmen');
const B = require('./diagonalauge-brett.js');

const HTML_PFAD = process.argv[2] || STANDARD_HTML;
const REF = JSON.parse(fs.readFileSync(B.REFERENZ_DATEI, 'utf8'));
const fix = k => REF.entwicklung.find(e => e.schluessel === k);
const STELLUNGEN = ['Fuego 50 Spiele|D.jsonl.gz|212|337', 'Fuego 50 Spiele|D.jsonl.gz|523|354'];
const playwright = ladePlaywright();
const chromePfad = sucheChromium(playwright);
const PFLICHT = process.env.REQUIRE_BROWSER === '1';
let browser = null, server = null, port = 0;

async function vorbereiten() {
  if (browser) return true;
  if (!playwright || !chromePfad) {
    if (PFLICHT) throw new Error(`REQUIRE_BROWSER=1, aber ${!playwright ? 'Playwright' : 'Chromium'} ist nicht auffindbar.`);
    return false;
  }
  browser = await playwright.chromium.launch({executablePath: chromePfad});
  ({server, port} = await starteServer(HTML_PFAD));
  return true;
}
async function seite() {
  const ctx = await browser.newContext(), s = await ctx.newPage(), fehler = [];
  s.on('pageerror', e => fehler.push(e.message));
  await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await s.waitForFunction(() => typeof state !== 'undefined' && typeof resolveLifeAndDeath === 'function' && typeof vorschauOeffnen === 'function' && typeof PARAMS !== 'undefined');
  await s.evaluate(() => { state.aiEnabled = false; });
  return {s, ctx, fehler};
}

test('Standard 0; Dashboard-Zeile mit Wert 0 und Bereich 0 bis 1', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const w = await s.evaluate(() => {
    const i = document.getElementById('pd-diagonalAugeEnde');
    return {p: PARAMS.diagonalAugeEnde, d: PARAMS_DEFAULT.diagonalAugeEnde, zeile: !!i, wert: i && i.value, min: i && i.min, max: i && i.max};
  });
  await ctx.close();
  pruefeGleich(w.p, 0, 'PARAMS'); pruefeGleich(w.d, 0, 'PARAMS_DEFAULT'); pruefe(w.zeile, 'Dashboard-Zeile pd-diagonalAugeEnde vorhanden');
  pruefeGleich(w.wert, '0', 'Dashboard-Wert 0'); pruefeGleich(w.min, '0', 'min'); pruefeGleich(w.max, '1', 'max');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Schlusszählung: aus entfernt die eingefrorene Tot-Menge, an die der Test-Kopie', async () => {
  if (!(await vorbereiten())) return 'skip';
  for (const k of STELLUNGEN) {
    const e = fix(k);
    for (const [schalter, soll, was] of [[0, e.totAus, 'aus'], [1, e.totAn, 'an']]) {
      const {s, ctx, fehler} = await seite();
      const tot = await s.evaluate(([brett, sw]) => {
        for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0;
        PARAMS.diagonalAugeEnde = sw;
        resolveLifeAndDeath();
        return [...state.deadStones].sort((a, b) => a - b);
      }, [e.brett, schalter]);
      await ctx.close();
      pruefeGleich(JSON.stringify(tot), JSON.stringify(soll), `${k}: Schlusszählung ${was}`);
      pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
    }
  }
});

test('Zählvorschau (Anzeige): als tot geführte Steine gleich der Schlusszählung, aus und an', async () => {
  if (!(await vorbereiten())) return 'skip';
  for (const k of STELLUNGEN) {
    const e = fix(k);
    for (const [schalter, soll, was] of [[0, e.totAus, 'aus'], [1, e.totAn, 'an']]) {
      const {s, ctx, fehler} = await seite();
      const tot = await s.evaluate(([brett, sw]) => {
        for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0;
        PARAMS.diagonalAugeEnde = sw;
        vorschauOeffnen();
        const v = state.vorschau && state.vorschau.v, aus = [];
        if (v) for (let i = 0; i < v.bewiesenTot.length; i++) if (v.bewiesenTot[i] || v.geschaetztTot[i]) aus.push(i);
        return aus;
      }, [e.brett, schalter]);
      await ctx.close();
      pruefeGleich(JSON.stringify(tot), JSON.stringify(soll), `${k}: Vorschau ${was}`);
      pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
    }
  }
});

test('Geöffnete Vorschau folgt dem Schalter: Dashboard-Feld, Reset und Preset „Std“', async () => {
  if (!(await vorbereiten())) return 'skip';
  const e = fix('Fuego 50 Spiele|D.jsonl.gz|212|337');
  /* Frisch geöffnete Vorschau bei an: Mengen und Panel-Text als Maßstab */
  const frisch = async sw => {
    const {s, ctx} = await seite();
    const r = await s.evaluate(([brett, w]) => {
      for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0;
      PARAMS.diagonalAugeEnde = w; vorschauOeffnen();
      const v = state.vorschau.v, tot = [];
      for (let i = 0; i < v.bewiesenTot.length; i++) if (v.bewiesenTot[i] || v.geschaetztTot[i]) tot.push(i);
      return {tot, text: document.getElementById('zv-panel').textContent};
    }, [e.brett, sw]);
    await ctx.close();
    return r;
  };
  const an = await frisch(1), aus = await frisch(0);
  pruefe(an.text !== aus.text, 'der Panel-Text unterscheidet sich zwischen aus und an (der Test kann Veraltetes erkennen)');
  const {s, ctx, fehler} = await seite();
  const lies = () => s.evaluate(() => {
    const v = state.vorschau && state.vorschau.v, tot = [];
    if (v) for (let i = 0; i < v.bewiesenTot.length; i++) if (v.bewiesenTot[i] || v.geschaetztTot[i]) tot.push(i);
    return {offen: !!state.vorschau, tot, text: document.getElementById('zv-panel').textContent, schluessel: state.vorschau && state.vorschau.schluessel, schalter: PARAMS.diagonalAugeEnde};
  });
  await s.evaluate(brett => { for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0; vorschauOeffnen(); }, e.brett);
  const a0 = await lies();
  pruefeGleich(JSON.stringify(a0.tot), JSON.stringify(e.totAus), 'offen bei aus: Mengen aus');
  /* Dashboard-Feld auf 1: die offene Vorschau wird neu berechnet */
  await s.evaluate(() => { const i = document.getElementById('pd-diagonalAugeEnde'); i.value = '1'; i.dispatchEvent(new Event('change')); });
  const a1 = await lies();
  pruefe(a1.offen, 'die Vorschau bleibt nach der Änderung offen');
  pruefeGleich(a1.schalter, 1, 'Schalter 1');
  pruefeGleich(JSON.stringify(a1.tot), JSON.stringify(an.tot), 'nach Feldänderung: Mengen gleich einer frischen Vorschau bei an');
  pruefeGleich(a1.text, an.text, 'nach Feldänderung: Panel-Text gleich einer frischen Vorschau bei an');
  pruefe(a1.schluessel.endsWith(':1') && a0.schluessel.endsWith(':0'), `Cache-Schlüssel enthält den Schalter (${a0.schluessel} gegen ${a1.schluessel})`);
  /* Reset auf Standard: zurück zu aus */
  await s.evaluate(() => dashReset());
  const a2 = await lies();
  pruefeGleich(a2.schalter, 0, 'Reset setzt den Schalter auf 0');
  pruefeGleich(JSON.stringify(a2.tot), JSON.stringify(e.totAus), 'nach Reset: Mengen gleich aus');
  pruefeGleich(a2.text, aus.text, 'nach Reset: Panel-Text gleich einer frischen Vorschau bei aus');
  /* wieder an, dann Preset „Std“ (ruft den Reset) */
  await s.evaluate(() => { const i = document.getElementById('pd-diagonalAugeEnde'); i.value = '1'; i.dispatchEvent(new Event('change')); });
  pruefeGleich(JSON.stringify((await lies()).tot), JSON.stringify(an.tot), 'wieder an');
  await s.evaluate(() => dashApplyPreset('standard'));
  const a3 = await lies();
  pruefeGleich(a3.schalter, 0, 'Preset Std setzt den Schalter auf 0');
  pruefeGleich(JSON.stringify(a3.tot), JSON.stringify(e.totAus), 'nach Preset Std: Mengen gleich aus');
  pruefeGleich(a3.text, aus.text, 'nach Preset Std: Panel-Text gleich einer frischen Vorschau bei aus');
  await ctx.close();
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Nur Schlusszählung: Standard 0 mit Dashboard-Zeile; Schlusszählung an, Vorschau aus', async () => {
  if (!(await vorbereiten())) return 'skip';
  {
    const {s, ctx, fehler} = await seite();
    const w = await s.evaluate(() => { const i = document.getElementById('pd-diagonalAugeSchluss'); return {p: PARAMS.diagonalAugeSchluss, d: PARAMS_DEFAULT.diagonalAugeSchluss, zeile: !!i, wert: i && i.value, min: i && i.min, max: i && i.max}; });
    await ctx.close();
    pruefeGleich(w.p, 0, 'PARAMS'); pruefeGleich(w.d, 0, 'PARAMS_DEFAULT'); pruefe(w.zeile, 'Dashboard-Zeile pd-diagonalAugeSchluss vorhanden');
    pruefeGleich(w.wert, '0', 'Dashboard-Wert 0'); pruefeGleich(w.min, '0', 'min'); pruefeGleich(w.max, '1', 'max');
    pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
  }
  for (const k of STELLUNGEN) {
    const e = fix(k);
    for (const [schalter, sollSchluss, was] of [[0, e.totAus, 'aus'], [1, e.totAn, 'an']]) {
      const {s, ctx, fehler} = await seite();
      const r = await s.evaluate(([brett, sw]) => {
        const setze = () => { for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0; };
        PARAMS.diagonalAugeEnde = 0; PARAMS.diagonalAugeSchluss = sw;
        setze(); vorschauOeffnen();
        const v = state.vorschau && state.vorschau.v, vorschau = [];
        if (v) for (let i = 0; i < v.bewiesenTot.length; i++) if (v.bewiesenTot[i] || v.geschaetztTot[i]) vorschau.push(i);
        const schluessel = state.vorschau && state.vorschau.schluessel;
        setze(); resolveLifeAndDeath();
        return {schluss: [...state.deadStones].sort((a, b) => a - b), vorschau, schluessel};
      }, [e.brett, schalter]);
      await ctx.close();
      pruefeGleich(JSON.stringify(r.schluss), JSON.stringify(sollSchluss), `${k}: Schlusszählung bei diagonalAugeSchluss ${was}`);
      pruefeGleich(JSON.stringify(r.vorschau), JSON.stringify(e.totAus), `${k}: Vorschau bleibt aus bei diagonalAugeSchluss ${was}`);
      pruefe(r.schluessel && r.schluessel.endsWith(':0'), `${k}: Cache-Schlüssel der Vorschau zeigt aus (${r.schluessel})`);
      pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
    }
  }
});

test('Nur Schlusszählung: eine geöffnete Vorschau bleibt beim Ändern des Felds unverändert', async () => {
  if (!(await vorbereiten())) return 'skip';
  const e = fix('Fuego 50 Spiele|D.jsonl.gz|212|337');
  const {s, ctx, fehler} = await seite();
  const lies = () => s.evaluate(() => {
    const v = state.vorschau && state.vorschau.v, tot = [];
    if (v) for (let i = 0; i < v.bewiesenTot.length; i++) if (v.bewiesenTot[i] || v.geschaetztTot[i]) tot.push(i);
    return {offen: !!state.vorschau, tot, text: document.getElementById('zv-panel').textContent, schluessel: state.vorschau && state.vorschau.schluessel, schalter: PARAMS.diagonalAugeSchluss};
  });
  await s.evaluate(brett => { for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0; vorschauOeffnen(); }, e.brett);
  const a0 = await lies();
  await s.evaluate(() => { const i = document.getElementById('pd-diagonalAugeSchluss'); i.value = '1'; i.dispatchEvent(new Event('change')); });
  const a1 = await lies();
  await ctx.close();
  pruefeGleich(a1.schalter, 1, 'Feld setzt PARAMS.diagonalAugeSchluss auf 1'); pruefe(a1.offen, 'Vorschau bleibt offen');
  pruefeGleich(JSON.stringify(a1.tot), JSON.stringify(e.totAus), 'Mengen bleiben aus'); pruefeGleich(a1.text, a0.text, 'Panel-Text unverändert');
  pruefeGleich(a1.schluessel, a0.schluessel, 'Cache-Schlüssel unverändert');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Geschlossene Vorschau bleibt bei Änderung des Schalters geschlossen', async () => {
  if (!(await vorbereiten())) return 'skip';
  const e = fix('Fuego 50 Spiele|D.jsonl.gz|212|337');
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(brett => {
    for (let i = 0; i < brett.length; i++) state.board[i] = brett[i] === 'X' ? 1 : brett[i] === 'O' ? 2 : 0;
    const i = document.getElementById('pd-diagonalAugeEnde'); i.value = '1'; i.dispatchEvent(new Event('change'));
    const nachFeld = !!state.vorschau;
    dashReset();
    return {nachFeld, nachReset: !!state.vorschau, schalter: PARAMS.diagonalAugeEnde};
  }, e.brett);
  await ctx.close();
  pruefeGleich(r.nachFeld, false, 'nach Feldänderung ohne offene Vorschau bleibt sie zu');
  pruefeGleich(r.nachReset, false, 'nach Reset ohne offene Vorschau bleibt sie zu');
  pruefeGleich(r.schalter, 0, 'Reset setzt den Schalter auf 0');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

laufeTests('Diagonalprüfung im Browser').then(async ok => {
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
