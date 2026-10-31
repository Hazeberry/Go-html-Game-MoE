// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Zählvorschau im echten Browser (docs/zaehlvorschau.md §5).

     1. Der Knopf „Zählvorschau“ steht zwischen „Rückgängig“ und „Neues Spiel“.
     2. Ein Klick zeigt zwei Zahlen („Mit Annahmen“, „Nur Bewiesenes“) und den
        Hinweis zu Seki und Ko.
     3. Die Vorschau ändert nichts: Brett, Gefangene, Protokoll, tote Steine,
        Zugzähler und Spieler sind danach gleich.
     4. Ein Zug, ein Pass, Rückgängig und „Neues Spiel“ blenden sie aus;
        „Weiterspielen“ ebenfalls; der Knopf schaltet sie ein und aus.
     5. Partie vom 12.10. (stellungen/zaehlung-358.sgf): acht geschätzt tote
        Steine, oranges Kreuz im Bild, der Text nennt sie.
     6. Offene Stellung: Hinweis „noch nicht ausgespielt“.
     7. Nach dem Spielende tut der Knopf nichts.
     8. Territory-Modus: der Text nennt „Territory“, der Stand der Partie vom
        31.10. vor dem ersten Pass ist W+186,5 (mit den Gefangenen der Partie);
        das Umschalten der Wertung blendet die Vorschau aus.

   Aufruf:  node tests/browser-zaehlvorschau.js [pfad/zur/index.html] */
'use strict';
const fs = require('fs'), path = require('path');
const {test, pruefe, pruefeGleich, laufeTests, STANDARD_HTML} = require('./rahmen');
const {ladePlaywright, sucheChromium, starteServer} = require('./browser-rahmen');

const HTML_PFAD = process.argv[2] || STANDARD_HTML;
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
  const ctx = await browser.newContext();
  const s = await ctx.newPage();
  const fehler = [];
  s.on('pageerror', e => fehler.push(e.message));
  await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await s.waitForFunction(() => typeof state !== 'undefined' && typeof placeStone === 'function' && typeof zaehlVorschau === 'function');
  await s.evaluate(() => { state.aiEnabled = false; });
  return {s, ctx, fehler};
}

/* Zugfolge einer SGF-Datei als [[Index, Farbe], …] (Pässe weggelassen) */
function sgfZuege(datei) {
  const txt = fs.readFileSync(path.join(__dirname, 'stellungen', datei), 'utf8');
  const re = /;([BW])\[([a-s]{2})\]/g, z = []; let m;
  while ((m = re.exec(txt))) z.push([(m[2].charCodeAt(1) - 97) * 19 + (m[2].charCodeAt(0) - 97), m[1] === 'B' ? 1 : 2]);
  return z;
}

const ZUSTAND = () => ({
  brett: Array.from(state.board).join(''), gef: JSON.stringify(state.captures), log: state.log.join('\n'),
  tot: JSON.stringify([...state.deadStones]), zuege: state.moveCount, spieler: state.currentPlayer, vorbei: state.gameOver
});
const panelSichtbar = () => document.getElementById("zv-panel").style.display !== "none";

test('Knopf steht zwischen „Rückgängig“ und „Neues Spiel“', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const ids = await s.evaluate(() => [...document.querySelectorAll('#btn-pass, #btn-undo, #btn-zaehlvorschau, #btn-reset')].map(b => b.id));
  const text = await s.evaluate(() => document.getElementById('btn-zaehlvorschau').textContent);
  await ctx.close();
  pruefeGleich(ids.join(','), 'btn-pass,btn-undo,btn-zaehlvorschau,btn-reset', 'Reihenfolge Passen, Rückgängig, Zählvorschau, Neues Spiel');
  pruefeGleich(text, 'Zählvorschau', 'Beschriftung');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Klick zeigt zwei Zahlen und den Hinweis; nichts im Spiel ändert sich', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.evaluate(() => { placeStone(3, 3); placeStone(15, 15); placeStone(3, 15); render(); updateUI(); });
  const vorher = await s.evaluate(ZUSTAND);
  await s.click('#btn-zaehlvorschau');
  const nachher = await s.evaluate(ZUSTAND);
  const sichtbar = await s.evaluate(panelSichtbar);
  const texte = await s.evaluate(() => ['zv-mit', 'zv-nur', 'zv-info', 'zv-hinweis'].map(i => document.getElementById(i).textContent));
  await ctx.close();
  pruefe(sichtbar, 'Ergebnisfeld sichtbar');
  pruefe(/^Mit Annahmen: (Schwarz|Weiß) \+\d+\.\d$/.test(texte[0]), `Zeile 1: ${texte[0]}`);
  pruefe(/^Nur Bewiesenes: (Schwarz|Weiß) \+\d+\.\d$/.test(texte[1]), `Zeile 2: ${texte[1]}`);
  pruefe(/Komi 7,5/.test(texte[2]) && /Fläche/.test(texte[2]), `Info: ${texte[2]}`);
  pruefe(/Seki und Ko erkennt die Zählung nicht/.test(texte[3]), 'Hinweis zu Seki und Ko');
  pruefeGleich(JSON.stringify(nachher), JSON.stringify(vorher), 'Brett, Gefangene, Protokoll, tote Steine, Zugzähler, Spieler unverändert');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Zug, Pass, Rückgängig, Neues Spiel und „Weiterspielen“ blenden die Vorschau aus; der Knopf schaltet um', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const nach = async aktion => {
    await s.evaluate(() => { placeStone(3, 3); render(); updateUI(); });
    await s.click('#btn-zaehlvorschau');
    const an = await s.evaluate(panelSichtbar);
    await aktion();
    const aus = await s.evaluate(() => document.getElementById('zv-panel').style.display === 'none' && state.vorschau === null);
    await s.evaluate(() => { resetGame(); render(); updateUI(); });
    return {an, aus};
  };
  const zug = await nach(() => s.evaluate(() => { placeStone(10, 10); render(); updateUI(); }));
  const pass = await nach(() => s.click('#btn-pass'));
  const undo = await nach(() => s.click('#btn-undo'));
  const neu = await nach(() => s.click('#btn-reset'));
  const weiter = await nach(() => s.click('#btn-zv-weiter'));
  /* Umschalten */
  await s.evaluate(() => { placeStone(3, 3); render(); updateUI(); });
  await s.click('#btn-zaehlvorschau');
  const ein = await s.evaluate(panelSichtbar);
  await s.click('#btn-zaehlvorschau');
  const wieder = await s.evaluate(panelSichtbar);
  await ctx.close();
  for (const [name, r] of Object.entries({Zug: zug, Pass: pass, Rückgängig: undo, 'Neues Spiel': neu, Weiterspielen: weiter})) {
    pruefe(r.an, `${name}: Vorschau war an`); pruefe(r.aus, `${name}: Vorschau danach aus`);
  }
  pruefe(ein && !wieder, 'zweiter Klick schließt');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Partie vom 12.10.: acht geschätzt tote Steine, oranges Kreuz im Bild, Text nennt sie', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(zuege => {
    for (const [i, c] of zuege) { state.board[i] = c; removeDeadGroups(state.board, 3 - c, i); }
    state.currentPlayer = 1; state.moveCount = zuege.length;
    drawStateToCache(); render(); updateUI();
    document.getElementById('btn-zaehlvorschau').click();
    const v = state.vorschau.v;
    const erster = [...v.geschaetztTot].findIndex(x => x);
    const {MARGIN: M, CELL: C} = layout;
    const px = stateCache.getContext('2d').getImageData(Math.round(M + xOf(erster) * C), Math.round(M + yOf(erster) * C), 1, 1).data;
    return {geschaetzt: v.anzahl.geschaetztTot, bewiesen: v.anzahl.bewiesenTot, pixel: Array.from(px),
            mit: v.mitSchaetzung.stand, nur: v.nurBewiesen.stand,
            info: document.getElementById('zv-info').textContent, zeile1: document.getElementById('zv-mit').textContent,
            zeile2: document.getElementById('zv-nur').textContent, hinweis: document.getElementById('zv-hinweis').textContent};
  }, sgfZuege('zaehlung-358.sgf'));
  await ctx.close();
  pruefeGleich(r.geschaetzt, 8, 'acht geschätzt tote Steine');
  pruefeGleich(r.bewiesen, 0, 'keiner bewiesen tot');
  pruefeGleich(`${r.mit} ${r.nur}`, '-102.5 -82.5', 'Stände wie in den Tests der Funktion');
  pruefeGleich(r.zeile1, 'Mit Annahmen: Weiß +102.5', 'Zeile 1');
  pruefeGleich(r.zeile2, 'Nur Bewiesenes: Weiß +82.5', 'Zeile 2');
  pruefe(/8 als tot geschätzt/.test(r.info), `Info nennt die acht: ${r.info}`);
  pruefe(r.pixel[0] > 200 && r.pixel[1] > 90 && r.pixel[1] < 160 && r.pixel[2] < 90, `Kreuz orange (Pixel ${r.pixel})`);
  pruefe(!/noch nicht ausgespielt/.test(r.hinweis), 'ausgespielte Partie: kein Hinweis auf offene Stellung');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Offene Stellung: Hinweis „noch nicht ausgespielt“', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const hinweis = await s.evaluate(() => {
    placeStone(3, 3); placeStone(15, 15); placeStone(3, 15); placeStone(15, 3); render(); updateUI();
    document.getElementById('btn-zaehlvorschau').click();
    return document.getElementById('zv-hinweis').textContent;
  });
  await ctx.close();
  pruefe(/noch nicht ausgespielt/.test(hinweis), `Hinweis: ${hinweis}`);
  pruefe(/Seki und Ko/.test(hinweis), 'Seki-und-Ko-Hinweis bleibt');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Nach dem Spielende tut der Knopf nichts', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    placeStone(3, 3); pass(); pass(); render(); updateUI();
    const vorbei = state.gameOver;
    document.getElementById('btn-zaehlvorschau').click();
    return {vorbei, vorschau: state.vorschau, sichtbar: document.getElementById('zv-panel').style.display !== 'none'};
  });
  await ctx.close();
  pruefe(r.vorbei, 'Spiel beendet');
  pruefeGleich(r.vorschau, null, 'keine Vorschau');
  pruefe(!r.sichtbar, 'Ergebnisfeld bleibt zu');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Territory-Modus: Text, Stand der Partie vom 31.10. und Ausblenden beim Umschalten der Wertung', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const txt = fs.readFileSync(path.join(__dirname, '..', 'docs', 'daten', 'endspiel-abraeumen', 'territory', 'mensch-494zuege-territory.sgf'), 'utf8');
  const zuege = []; { const re = /;([BW])\[([a-s]{0,2})\]/g; let m; while ((m = re.exec(txt))) zuege.push([m[1] === 'B' ? 1 : 2, m[2]]); }
  const ersterPass = zuege.findIndex(z => !z[1]);
  const r = await s.evaluate(({zuege, bis}) => {
    document.querySelector('.scoring-btn[data-scoring="territory"]').click();
    state.captures = {1: 0, 2: 0};
    for (let k = 0; k < bis; k++) {
      const [f, p] = zuege[k]; if (!p) continue;
      const i = (p.charCodeAt(1) - 97) * 19 + (p.charCodeAt(0) - 97);
      state.board[i] = f; state.captures[f] += removeDeadGroups(state.board, 3 - f, i);
    }
    state.currentPlayer = 1; state.moveCount = bis;
    drawStateToCache(); render(); updateUI();
    document.getElementById('btn-zaehlvorschau').click();
    const aus = {mit: document.getElementById('zv-mit').textContent, info: document.getElementById('zv-info').textContent,
                 modus: state.vorschau && state.vorschau.v.modus, sichtbar: document.getElementById('zv-panel').style.display !== 'none'};
    document.querySelector('.scoring-btn[data-scoring="area"]').click();
    aus.nachUmschalten = document.getElementById('zv-panel').style.display !== 'none' || !!state.vorschau;
    document.getElementById('btn-zaehlvorschau').click();
    aus.flaecheInfo = document.getElementById('zv-info').textContent; aus.flaecheModus = state.vorschau.v.modus;
    return aus;
  }, {zuege, bis: ersterPass});
  await ctx.close();
  pruefeGleich(r.modus, 'territory', 'Modus Territory');
  pruefeGleich(r.mit, 'Mit Annahmen: Weiß +186.5', 'Stand wie die Nachrechnung vor dem ersten Pass');
  pruefe(/^Territory \(Gebiet \+ Gefangene\), Komi 7,5\./.test(r.info), `Info nennt Territory: ${r.info}`);
  pruefeGleich(r.nachUmschalten, false, 'Umschalten der Wertung blendet die Vorschau aus');
  pruefeGleich(r.flaecheModus, 'flaeche', 'zurück auf Area: wieder Fläche');
  pruefe(/^Fläche, Komi 7,5\./.test(r.flaecheInfo), `Info nennt Fläche: ${r.flaecheInfo}`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

laufeTests('Zählvorschau im Browser').then(async ok => {
  if (browser) await browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
