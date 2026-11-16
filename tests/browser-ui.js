// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Korrekturen aus dem Code-Review vom 13.10. an der Oberfläche, im echten
   Browser (echter Worker, echtes localStorage, echtes DOM).

     1. Undo nach mehr als 50 Zügen: Die Superko-Prüfung kennt danach
        weiterhin alle Stellungen (vorher nur die der letzten 50
        Undo-Einträge).
     2. PolicyNet: Ein KI-Zug kommt erst nach dem gelungenen Setzen in den
        Trainingspuffer, und undo() nimmt ihn wieder heraus.
     3. Aufgabe der KI: trainiert als Niederlage (-1), auch wenn die Fläche
        gerade für die KI spricht. Nach Undo gilt die Aufgabe nicht mehr
        (kein RE[…+R] in der SGF).
     4. Notzug findAnyLegalMove füllt kein eigenes Auge.
     5. Dashboard: gespeichert werden nur Abweichungen vom Default, mit
        Version; ein alter Speicherstand (ganzer Parametersatz) wird
        verworfen und hält keine alten Defaults mehr fest.
     6. Lehnt Chrome den data:-Worker erst asynchron ab (onerror), wechselt
        die KI auf einen blob:-Worker statt dauerhaft auf den Hauptthread.

   Korrekturen D-1 und W-1 aus dem Bug Hunt vom 16.11.
   (docs/korrektur-d1-w1-vorabfestlegung.md, Tests T-D1 bis T-W3):
     7. T-D1: Dashboard-Felder mit gebrochenem Schritt übernehmen gebrochene
        Werte; ganzzahlige Felder lesen weiter ganzzahlig.
     8. T-W1: 20-mal KI aus und an während einer Rechnung auf Schwer: der
        Worker wird neu gestartet, kein Watchdog, ein Zug.
     9. T-W2: Klicks auf die schon gewählte Stufe oder Farbe während der
        Rechnung lösen keine Anfrage aus.
    10. T-W3: Zwei Züge ohne Klick: derselbe Worker, kein Neustart.
    11. T-W4: Neustart nach abgelehntem data:-Worker bleibt bei blob:.

   Korrektur D-2 (docs/korrektur-d2-vorabfestlegung.md, Tests T-P1 bis T-P3):
    12. T-P1: Ein Preset ergibt dieselben Werte, egal welches vorher gewählt war.
    13. T-P2: Werte außerhalb der Presets (aiTimeBudget) bleiben erhalten.
    14. T-P3: Die Felder zeigen nach Presetwechseln die Werte aus PARAMS.

   Korrektur K-1 und K-2 (docs/korrektur-k1-k2-vorabfestlegung.md, T-K1 bis T-K4):
    15. T-K1: Ohne navigator.clipboard kopieren 📋, 🐞 und Export über den Rückfall.
    16. T-K2: Scheitert das Kopieren ganz, zeigen die Knöpfe ✗ statt ✓.
    17. T-K3: Export meldet auf dem Export-Knopf; keine hängenden Beschriftungen.
    18. T-K4: Mit Zwischenablage-Schnittstelle kein Rückfall (Kontrolle).

   Korrektur L-1 (docs/korrektur-l1-vorabfestlegung.md, T-L1 bis T-L4):
    19. T-L1: Nach dem Verkleinern hat das Brett die Soll-Größe, kein waagerechtes Scrollen.
    20. T-L2: Stein und Zählvorschau bleiben, Klicks treffen.
    21. T-L3: Mit Fokus in einem Eingabefeld erst nach dem Verlassen anpassen.
    22. T-L4: resize ohne Größenänderung zeichnet nicht neu (Kontrolle).

   Aufruf:  node tests/browser-ui.js [pfad/zur/index.html] */
'use strict';
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

/* Neue Seite; init läuft vor allen Skripten der Seite. kontext: Optionen für
   newContext, etwa Berechtigungen für die Zwischenablage. */
async function seite(init, initArg, kontext) {
  const ctx = await browser.newContext(kontext);
  const s = await ctx.newPage();
  const fehler = [];
  s.on('pageerror', e => fehler.push(e.message));
  if (init) await s.addInitScript(init, initArg);
  await s.goto(`http://127.0.0.1:${port}/spiel.html`, {waitUntil: 'load'});
  await s.waitForFunction(() => typeof state !== 'undefined' && typeof placeStone === 'function');
  return {s, ctx, fehler};
}

test('Undo nach 60 Zügen: die Superko-Prüfung kennt alle Stellungen', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    state.aiEnabled = false;
    let h1 = null, n = 0;
    for (let y = 0; y < 19 && n < 60; y += 2) for (let x = 0; x < 19 && n < 60; x += 2) {
      if (!placeStone(x, y).ok) return {fehler: `Zug ${n} abgelehnt`};
      n++; if (n === 1) h1 = state.currentHash;
    }
    undo();
    return {groesse: state.boardHistory.size, ersteBekannt: state.boardHistory.has(h1), zuege: state.moveCount};
  });
  await ctx.close();
  pruefe(!r.fehler, r.fehler || '');
  pruefeGleich(r.zuege, 59, 'ein Zug zurückgenommen');
  pruefe(r.ersteBekannt, 'die Stellung nach Zug 1 ist noch bekannt');
  pruefeGleich(r.groesse, 60, 'leeres Brett + 59 Stellungen');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('PolicyNet-Puffer: erst nach gelungenem Zug, Undo nimmt ihn heraus', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    state.aiEnabled = false; state.aiColor = 2;
    placeStone(3, 3);                              /* Mensch, Schwarz */
    policyNet._gameBuffer = [];
    const leer = new Float32Array(4);
    state.aiRequestId = 7;
    applyAIResult({type: 'stone', x: 3, y: 3}, 7, leer, leer, leer);   /* besetzt → Notzug */
    const nachAbgelehnt = policyNet._gameBuffer.length;
    placeStone(10, 10);                            /* Mensch */
    state.aiRequestId = 8;
    applyAIResult({type: 'stone', x: 15, y: 15}, 8, leer, leer, leer);
    const nachGut = policyNet._gameBuffer.length;
    undo();                                         /* nimmt den KI-Zug auf 15,15 zurück */
    return {nachAbgelehnt, nachGut, nachUndo: policyNet._gameBuffer.length};
  });
  await ctx.close();
  pruefeGleich(r.nachAbgelehnt, 0, 'abgelehnter KI-Zug nicht im Puffer');
  pruefeGleich(r.nachGut, 1, 'gelungener KI-Zug im Puffer');
  pruefeGleich(r.nachUndo, 0, 'nach Undo wieder heraus');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Aufgabe der KI: Training mit -1, nach Undo kein „+R“ mehr', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    state.aiEnabled = false; state.aiColor = 2;
    const aufrufe = [], echt = policyNet.trainGame.bind(policyNet);
    policyNet.trainGame = x => { aufrufe.push(x); };
    /* Weiß (KI) bekommt viel Fläche: zwei weiße Mauern, Schwarz fast nichts */
    placeStone(0, 0);
    for (let y = 0; y < 19; y++) { state.board[idx(10, y)] = 2; state.board[idx(9, y)] = 0; }
    state.currentPlayer = 2; state.aiRequestId = 3;
    applyAIResult({type: 'resign', info: 'Test'}, 3, null, null, null);
    const nachAufgabe = {aufrufe: aufrufe.slice(), resignedBy: state.resignedBy, sgf: buildSGF()};
    undo();
    const nachUndo = {resignedBy: state.resignedBy, sgf: buildSGF()};
    policyNet.trainGame = echt;
    return {nachAufgabe, nachUndo};
  });
  await ctx.close();
  pruefeGleich(JSON.stringify(r.nachAufgabe.aufrufe), '[-1]', 'genau ein Training, als Niederlage');
  pruefeGleich(r.nachAufgabe.resignedBy, 2, 'Weiß hat aufgegeben');
  pruefe(/RE\[B\+R\]/.test(r.nachAufgabe.sgf), 'SGF: RE[B+R] nach der Aufgabe');
  pruefeGleich(r.nachUndo.resignedBy, null, 'nach Undo keine Aufgabe mehr');
  pruefe(!/\+R\]/.test(r.nachUndo.sgf), 'SGF nach Undo ohne +R');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Notzug: kein eigenes Auge füllen', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    state.aiEnabled = false;
    /* Schwarz füllt das Brett bis auf zwei Augen */
    for (let i = 0; i < state.board.length; i++) state.board[i] = 1;
    state.board[idx(3, 3)] = 0; state.board[idx(15, 15)] = 0;
    state.koPoint = null;
    return findAnyLegalMove(1);
  });
  await ctx.close();
  pruefeGleich(r, null, 'kein Zug (passen), statt ein eigenes Auge zu füllen');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('Dashboard: nur Abweichungen speichern, altes Format verwerfen', async () => {
  if (!(await vorbereiten())) return 'skip';
  /* Altes Format: ganzer Parametersatz, darunter ein veralteter Default */
  let {s, ctx, fehler} = await seite(() => {
    localStorage.setItem('go_params', JSON.stringify({gebietZug: 0, mctsValueScale: 350}));
  });
  const alt = await s.evaluate(() => ({gz: PARAMS.gebietZug, def: PARAMS_DEFAULT.gebietZug,
    gespeichert: localStorage.getItem('go_params'), log: state.log.join('\n')}));
  /* Speichern: nur die eine Abweichung */
  const neu = await s.evaluate(() => {
    PARAMS.mctsValueScale = PARAMS_DEFAULT.mctsValueScale + 100;
    dashSave();
    return JSON.parse(localStorage.getItem('go_params'));
  });
  await ctx.close();
  pruefeGleich(alt.gz, alt.def, 'alter Speicherstand hält den alten Default nicht fest');
  pruefeGleich(alt.gespeichert, null, 'alter Speicherstand gelöscht');
  pruefe(/alten Format verworfen/.test(alt.log), 'Hinweis im Protokoll');
  pruefeGleich(neu.version, 2, 'Version 2');
  pruefeGleich(Object.keys(neu.abweichungen).join(','), 'mctsValueScale', 'nur die Abweichung gespeichert');
  /* Neues Format wird geladen */
  ({s, ctx, fehler} = await seite(w => { localStorage.setItem('go_params', w); }, JSON.stringify(neu)));
  const geladen = await s.evaluate(() => ({mvs: PARAMS.mctsValueScale, def: PARAMS_DEFAULT.mctsValueScale, gz: PARAMS.gebietZug, gzDef: PARAMS_DEFAULT.gebietZug}));
  await ctx.close();
  pruefeGleich(geladen.mvs, geladen.def + 100, 'Abweichung geladen');
  pruefeGleich(geladen.gz, geladen.gzDef, 'übrige Parameter auf Default');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('data:-Worker asynchron abgelehnt: KI wechselt auf blob:, nicht auf den Hauptthread', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(() => {
    const Echt = window.Worker;
    window.Worker = function (url, opt) {
      if (String(url).startsWith('data:')) {
        const falsch = {onmessage: null, onerror: null, terminate() {},
          postMessage() { setTimeout(() => { if (falsch.onerror) falsch.onerror({message: 'simuliert: data: abgelehnt'}); }, 20); }};
        return falsch;
      }
      return new Echt(url, opt);
    };
  });
  await s.evaluate(() => {
    state.aiDifficulty = 'hard'; state.aiColor = 2; state.aiEnabled = true;
    PARAMS.mctsFixedSims = 30;
    placeStone(3, 3); render(); triggerAIMove();
  });
  try { await s.waitForFunction(() => !state.aiThinking, {timeout: 30000}); } catch (e) { /* unten geprüft */ }
  const r = await s.evaluate(() => ({zuege: state.moveCount, tot: state.workerDead, grund: state.workerDeadReason,
    art: state.aiWorkerCtx ? state.aiWorkerCtx.art : null, log: state.log.join('\n')}));
  await ctx.close();
  pruefeGleich(r.zuege, 2, 'die KI hat geantwortet');
  pruefe(r.tot !== true, `der Worker gilt nicht als tot (${r.grund})`);
  pruefeGleich(r.art, 'blob', 'die KI rechnet im blob:-Worker');
  pruefe(/data:-Worker abgelehnt → blob:-Worker/.test(r.log), 'Wechsel im Protokoll');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ── Korrekturen D-1 und W-1 (docs/korrektur-d1-w1-vorabfestlegung.md §4) ── */

test('T-D1: Dashboard übernimmt gebrochene Werte, ganzzahlige Felder bleiben ganzzahlig', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    dashToggle();
    const falsch = [], geprueft = [];
    for (const e of document.querySelectorAll('.pd-input')) {
      if (Number.isInteger(parseFloat(e.step))) continue;
      const key = e.id.slice(3);
      if (!(key in PARAMS_DEFAULT)) continue;
      Object.assign(PARAMS, PARAMS_DEFAULT);
      const text = String(+(parseFloat(e.min) + parseFloat(e.step)).toFixed(6));
      e.value = text;
      e.dispatchEvent(new Event('input'));
      geprueft.push(key);
      if (PARAMS[key] !== parseFloat(text)) falsch.push(`${key}: ${text} → ${PARAMS[key]}`);
    }
    Object.assign(PARAMS, PARAMS_DEFAULT);
    const g = document.getElementById('pd-resignStreak');
    g.value = '7.6'; g.dispatchEvent(new Event('input'));
    const ganz = PARAMS.resignStreak;
    Object.assign(PARAMS, PARAMS_DEFAULT);
    return {falsch, geprueft, ganz};
  });
  await ctx.close();
  pruefeGleich(r.falsch.join('; '), '', 'jedes Feld mit gebrochenem Schritt übernimmt den Wert');
  for (const k of ['atariSizeWeight', 'raumZug', 'raumGewicht', 'endTieBreak'])
    pruefe(r.geprueft.includes(k), `${k} geprüft`);
  pruefeGleich(r.ganz, 7, 'ganzzahliges Feld liest 7.6 als 7');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* KI Schwarz auf Schwer mit kurzem, festem Budget: Watchdog 3 × 300 + 3000 = 3900 ms.
   Legt nur window.__schwerStart in der Seite an; GESTARTET wird im selben
   page.evaluate wie die Klicks danach. Zwischen zwei Aufrufen aus dem
   Testprozess kann ein langsamer Runner die 300-ms-Rechnung schon beendet
   haben, dann gingen die Klicks ins Leere (Hinweis von Luna). */
async function schwerVorbereiten(s) {
  await s.evaluate(() => {
    window.__schwerStart = () => {
      PARAMS.aiTimeBudget = 300; PARAMS.adaptiveBudgetEnabled = 0;
      document.querySelector('.diff-btn[data-diff="hard"]').click();
      document.querySelector('.color-btn[data-color="1"]').click();
      document.getElementById('btn-ai-toggle').click();
    };
  });
}
const zugFertig = (s, n) => s.waitForFunction(n => !state.aiThinking && state.moveCount >= n, n, {timeout: 30000})
  .catch(() => { /* unten geprüft */ });
const lage = s => s.evaluate(() => {
  const info = (state.aiDiag.at(-1) || {}).info || '', m = /MCTS (\d+) Sims/.exec(info);
  return {zuege: state.moveCount, tot: !!state.workerDead, grund: state.workerDeadReason,
    watchdog: state.log.some(l => l.includes('Watchdog')), neustarts: state.workerNeustarts,
    sims: m ? +m[1] : null};
});

test('T-W1: 20-mal KI aus und an während der Rechnung: Neustart statt Watchdog', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await schwerVorbereiten(s);
  /* Start und Klickfolge in EINEM Aufruf: über einzelne Klicks verteilt
     arbeitet der Worker die Anfragen schon ab, und der alte Code bliebe ohne
     Watchdog (§7); nach einem eigenen Startaufruf könnte die Rechnung schon
     vorbei sein. */
  const rechnet = await s.evaluate(() => {
    __schwerStart();
    const vorher = state.aiThinking;
    const k = document.getElementById('btn-ai-toggle');
    for (let i = 0; i < 20; i++) { k.click(); k.click(); }
    return vorher;
  });
  await zugFertig(s, 1);
  await s.waitForTimeout(300);
  const r = await lage(s);
  await ctx.close();
  /* Vorbedingung: Die Suche endete an der Frist von 300 ms, nicht am Limit von
     20 000 Simulationen. Nur dann dauert jede Anfrage mindestens 300 ms, und
     nur dann löst der alte Code hier zuverlässig den Watchdog aus (§4). */
  pruefe(rechnet, 'Vorbedingung: die KI rechnete beim ersten Klick');
  pruefe(r.sims !== null && r.sims < 20000, `Suche endete an der Frist (${r.sims} Simulationen)`);
  pruefeGleich(r.zuege, 1, 'genau ein KI-Zug');
  pruefe(r.tot !== true, `der Worker gilt nicht als tot (${r.grund})`);
  pruefe(!r.watchdog, 'kein Watchdog');
  pruefeGleich(r.neustarts, 20, 'zwanzig Neustarts gezählt');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-W2: gleiche Stufe und Farbe während der Rechnung lösen keine Anfrage aus', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await schwerVorbereiten(s);
  const r0 = await s.evaluate(() => {
    __schwerStart();
    window.__worker = state.aiWorker;
    const vor = state.aiRequestId;
    for (let i = 0; i < 5; i++) {
      document.querySelector('.diff-btn[data-diff="hard"]').click();
      document.querySelector('.color-btn[data-color="1"]').click();
    }
    return {vor, nach: state.aiRequestId, gleich: window.__worker === state.aiWorker, rechnet: state.aiThinking};
  });
  await zugFertig(s, 1);
  const r = await lage(s);
  await ctx.close();
  pruefe(r0.rechnet, 'Vorbedingung: die KI rechnete während der Klicks');
  pruefeGleich(r0.nach, r0.vor, 'aiRequestId unverändert');
  pruefe(r0.gleich, 'derselbe Worker');
  pruefeGleich(r.neustarts, 0, 'kein Neustart');
  pruefeGleich(r.zuege, 1, 'ein KI-Zug');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-W3: zwei Züge auf Schwer ohne Klick: derselbe Worker, kein Neustart', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await schwerVorbereiten(s);
  await s.evaluate(() => __schwerStart());
  await zugFertig(s, 1);
  await s.evaluate(() => {
    window.__worker = state.aiWorker;
    for (let i = 0; i < 361; i++) {
      if (state.board[i]) continue;
      if (placeStone(i % 19, (i / 19) | 0).ok) { render(); updateUI(); triggerAIMove(); break; }
    }
  });
  await zugFertig(s, 3);
  const r = await lage(s);
  const gleich = await s.evaluate(() => window.__worker === state.aiWorker && !!state.aiWorker);
  await ctx.close();
  pruefeGleich(r.zuege, 3, 'zwei KI-Züge und ein eigener');
  pruefe(gleich, 'derselbe Worker');
  pruefe(!r.neustarts, 'kein Neustart');
  pruefe(!r.watchdog && r.tot !== true, 'kein Watchdog, Worker lebt');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-W4: Neustart nach abgelehntem data:-Worker bleibt bei blob:', async () => {
  if (!(await vorbereiten())) return 'skip';
  /* Dieselbe Attrappe wie im Test zum asynchron abgelehnten data:-Worker */
  const {s, ctx, fehler} = await seite(() => {
    const Echt = window.Worker;
    window.Worker = function (url, opt) {
      if (String(url).startsWith('data:')) {
        const falsch = {onmessage: null, onerror: null, terminate() {},
          postMessage() { setTimeout(() => { if (falsch.onerror) falsch.onerror({message: 'simuliert: data: abgelehnt'}); }, 20); }};
        return falsch;
      }
      return new Echt(url, opt);
    };
  });
  await schwerVorbereiten(s);
  /* Warten auf den blob:-Worker und Klicken in EINEM Aufruf, ohne Umweg über
     den Testprozess: Sobald die Seite den Wechsel sieht, wird im selben Takt
     geklickt. */
  const bereit = await s.evaluate(() => new Promise(fertig => {
    __schwerStart();
    const t0 = Date.now();
    const pruefen = () => {
      if (state.aiWorkerCtx && state.aiWorkerCtx.art === 'blob' && state.aiThinking) {
        const k = document.getElementById('btn-ai-toggle');
        for (let i = 0; i < 5; i++) { k.click(); k.click(); }
        fertig(true);
      } else if (Date.now() - t0 > 10000) fertig(false);
      else setTimeout(pruefen, 2);
    };
    pruefen();
  }));
  await zugFertig(s, 1);
  const r = await lage(s);
  const w = await s.evaluate(() => ({art: state.aiWorkerCtx ? state.aiWorkerCtx.art : null,
    ablehnungen: state.log.filter(l => l.includes('data:-Worker abgelehnt')).length}));
  await ctx.close();
  pruefe(bereit, 'Vorbedingung: blob:-Worker rechnete beim ersten Klick');
  pruefeGleich(w.art, 'blob', 'nach den Neustarts weiter blob:');
  pruefeGleich(w.ablehnungen, 1, 'data: nur einmal abgelehnt, nicht bei jedem Neustart');
  pruefeGleich(r.neustarts, 5, 'fünf Neustarts gezählt');
  pruefe(!r.watchdog && r.tot !== true, `kein Watchdog, Worker lebt (${r.grund})`);
  pruefeGleich(r.zuege, 1, 'ein KI-Zug');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ── Korrektur D-2 (docs/korrektur-d2-vorabfestlegung.md §4) ── */

test('T-P1: ein Preset ergibt dieselben Werte, egal welches vorher gewählt war', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const abweichungen = await s.evaluate(() => {
    const presets = ['ausgeglichen', 'aggressiv', 'defensiv'], bild = () => JSON.stringify(PARAMS), aus = [];
    for (const x of presets) {
      dashApplyPreset('standard'); dashApplyPreset(x);
      const soll = bild();
      for (const y of presets) {
        if (y === x) continue;
        dashApplyPreset('standard'); dashApplyPreset(y); dashApplyPreset(x);
        if (bild() !== soll) {
          const d = [];
          for (const k of Object.keys(PARAMS_DEFAULT)) if (PARAMS[k] !== JSON.parse(soll)[k]) d.push(`${k}=${PARAMS[k]}`);
          aus.push(`${y} → ${x}: ${d.join(', ')}`);
        }
      }
    }
    dashApplyPreset('standard');
    return aus;
  });
  await ctx.close();
  pruefeGleich(abweichungen.join(' | '), '', 'keine Reste des vorigen Presets (sechs Folgen)');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-P2: Werte außerhalb der Presets bleiben beim Presetwechsel erhalten', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const wert = await s.evaluate(() => {
    dashApplyPreset('standard');
    const e = document.getElementById('pd-aiTimeBudget');
    e.value = '2500'; e.dispatchEvent(new Event('input'));
    dashApplyPreset('aggressiv'); dashApplyPreset('defensiv');
    const w = PARAMS.aiTimeBudget;
    dashApplyPreset('standard');
    return w;
  });
  await ctx.close();
  pruefeGleich(wert, 2500, 'aiTimeBudget bleibt 2500');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-P3: nach Presetwechseln zeigen die Felder die Werte aus PARAMS', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    dashApplyPreset('standard'); dashApplyPreset('aggressiv'); dashApplyPreset('defensiv');
    const falsch = []; let felder = 0;
    for (const k of Object.keys(PARAMS_DEFAULT)) {
      const e = document.getElementById('pd-' + k);
      if (!e) continue;
      felder++;
      const markiert = Math.abs(PARAMS[k] - PARAMS_DEFAULT[k]) > 1e-9;
      if (e.value !== String(PARAMS[k]) || e.classList.contains('changed') !== markiert)
        falsch.push(`${k}: Feld ${e.value}, PARAMS ${PARAMS[k]}`);
    }
    dashApplyPreset('standard');
    return {falsch, felder};
  });
  await ctx.close();
  pruefe(r.felder > 50, `Felder gefunden (${r.felder})`);
  pruefeGleich(r.falsch.join('; '), '', 'Felder und Markierung folgen PARAMS');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ── Korrektur K-1 und K-2 (docs/korrektur-k1-k2-vorabfestlegung.md §4) ── */

/* Attrappe vor dem Laden: optional ohne navigator.clipboard oder mit
   ablehnendem writeText; execCommand('copy') gibt einen festen Wert, und ein
   Wrapper um select() hält den Text fest, der kopiert werden sollte. */
function kopierAttrappe({ohneApi, writeTextLehntAb, execOk}) {
  if (ohneApi) Object.defineProperty(navigator, 'clipboard', {value: undefined, configurable: true});
  if (writeTextLehntAb) navigator.clipboard.writeText = () => Promise.reject(new Error('Attrappe: abgelehnt'));
  window.__kopien = [];
  const sel = HTMLTextAreaElement.prototype.select;
  HTMLTextAreaElement.prototype.select = function () { window.__letzterText = this.value; return sel.call(this); };
  document.execCommand = function (befehl) {
    if (befehl === 'copy') window.__kopien.push(window.__letzterText);
    return execOk;
  };
}
const kopierKnoepfe = s => s.evaluate(() => ({log: document.getElementById('btn-copy-log').textContent,
  bug: document.getElementById('btn-bug-report').textContent,
  dash: [...document.querySelectorAll('.pd-export-btn')].map(b => b.textContent)}));
/* Export über die Funktion; am alten Code wirft sie ohne Schnittstelle. */
const exportiere = s => s.evaluate(() => { dashToggle(); try { dashExport(); return null; } catch (e) { return e.message; } });

test('T-K1: ohne Zwischenablage-Schnittstelle kopieren 📋, 🐞 und Export über den Rückfall', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(kopierAttrappe, {ohneApi: true, execOk: true});
  await s.evaluate(() => { state.log.push('Testzeile K1'); updateUI(); });
  await s.click('#btn-copy-log');
  await s.click('#btn-bug-report');
  const wurf = await exportiere(s);
  await s.waitForTimeout(300);
  const kopien = await s.evaluate(() => window.__kopien.map(t => String(t || '')));
  const k = await kopierKnoepfe(s);
  await ctx.close();
  pruefeGleich(wurf, null, 'Export wirft nicht');
  pruefeGleich(kopien.length, 3, 'dreimal über den Rückfall kopiert');
  pruefe((kopien[0] || '').includes('Testzeile K1'), 'Protokoll kopiert');
  pruefe((kopien[1] || '').includes('"meta"'), 'Fehlerbericht kopiert');
  pruefe((kopien[2] || '').includes('globalThis.PARAMS'), 'Parameter-Export kopiert');
  pruefeGleich(`${k.log} ${k.bug} | ${k.dash.join(' | ')}`, '✓ ✓ | 💾 Speichern | ✓ Kopiert', 'Rückmeldungen auf den richtigen Knöpfen');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-K2: scheitert das Kopieren ganz, zeigen die Knöpfe ✗', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(kopierAttrappe, {writeTextLehntAb: true, execOk: false});
  await s.click('#btn-copy-log');
  await s.click('#btn-bug-report');
  const wurf = await exportiere(s);
  await s.waitForTimeout(300);
  const k = await kopierKnoepfe(s);
  await ctx.close();
  pruefeGleich(wurf, null, 'Export wirft nicht');
  pruefeGleich(`${k.log} ${k.bug} | ${k.dash.join(' | ')}`, '✗ ✗ | 💾 Speichern | ✗ Fehler', 'Misserfolg sichtbar, auf den richtigen Knöpfen');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-K3: Export meldet auf dem Export-Knopf, Beschriftungen bleiben nicht hängen', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(null, undefined, {permissions: ['clipboard-read', 'clipboard-write']});
  await s.evaluate(() => dashToggle());
  await s.evaluate(() => dashExport());
  await s.waitForTimeout(150);
  const direkt = (await kopierKnoepfe(s)).dash.join(' | ');
  await s.waitForTimeout(1700);
  await s.evaluate(() => { dashSave(); dashExport(); });
  await s.waitForTimeout(1800);
  const nachBeiden = (await kopierKnoepfe(s)).dash.join(' | ');
  await s.evaluate(() => dashSave());
  await s.waitForTimeout(300);
  await s.evaluate(() => dashSave());
  await s.waitForTimeout(1800);
  const nachZweimal = (await kopierKnoepfe(s)).dash.join(' | ');
  await ctx.close();
  pruefeGleich(direkt, '💾 Speichern | ✓ Kopiert', 'Export meldet auf dem eigenen Knopf');
  pruefeGleich(nachBeiden, '💾 Speichern | ⬇ Export', 'nach Speichern und Export wieder in Ruhe');
  pruefeGleich(nachZweimal, '💾 Speichern | ⬇ Export', 'nach zweimal Speichern wieder in Ruhe');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-K4: mit Zwischenablage-Schnittstelle kein Rückfall (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(() => {
    window.__exec = 0;
    const echt = document.execCommand.bind(document);
    document.execCommand = function (c) { window.__exec++; return echt(c); };
  }, undefined, {permissions: ['clipboard-read', 'clipboard-write']});
  await s.evaluate(() => { state.log.push('Kontrolle K4'); updateUI(); });
  await s.click('#btn-copy-log');
  await s.waitForTimeout(300);
  const r = await s.evaluate(async () => ({inhalt: await navigator.clipboard.readText(), exec: window.__exec,
    knopf: document.getElementById('btn-copy-log').textContent, log: state.log.join('\n')}));
  await ctx.close();
  pruefeGleich(r.inhalt, r.log, 'Protokoll steht in der Zwischenablage');
  pruefeGleich(r.exec, 0, 'kein Rückfall über execCommand');
  pruefeGleich(r.knopf, '✓', 'Rückmeldung ✓');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ── Korrektur L-1 (docs/korrektur-l1-vorabfestlegung.md §4) ── */

const GROSS = {viewport: {width: 1200, height: 900}};
const KLEIN = {width: 400, height: 800};

test('T-L1: nach dem Verkleinern hat das Brett die Soll-Größe, die Seite scrollt nicht waagerecht', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(null, undefined, GROSS);
  const vorher = await s.evaluate(() => document.getElementById('board').width);
  await s.setViewportSize(KLEIN);
  await s.waitForTimeout(400);
  const r = await s.evaluate(() => ({breite: document.getElementById('board').width, soll: computeLayout().S,
    scroll: document.documentElement.scrollWidth, fenster: innerWidth}));
  await ctx.close();
  pruefe(vorher > r.soll, `Ausgangsbrett größer als das Soll (${vorher} > ${r.soll})`);
  pruefeGleich(r.breite, r.soll, 'Canvas-Breite = computeLayout().S');
  pruefe(r.scroll <= r.fenster, `kein waagerechtes Scrollen (${r.scroll} ≤ ${r.fenster})`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-L2: nach dem Verkleinern bleiben Stein und Zählvorschau, Klicks treffen', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(null, undefined, GROSS);
  await s.evaluate(() => { placeStone(3, 3); drawStateToCache(); render(); vorschauOeffnen(); });
  await s.setViewportSize(KLEIN);
  await s.waitForTimeout(400);
  /* Pixel an der SOLL-Lage nach computeLayout(), nicht nach der gespeicherten
     Variable layout: die bliebe am alten Code die alte Lage (§6). */
  const pixel = await s.evaluate(() => {
    const L = computeLayout();
    const d = document.getElementById('board').getContext('2d').getImageData(L.MARGIN + 3 * L.CELL, L.MARGIN + 3 * L.CELL, 1, 1).data;
    return [d[0], d[1], d[2]];
  });
  const vorschau = await s.evaluate(() => !!state.vorschau);
  await s.evaluate(() => vorschauSchliessen());
  const box = await s.locator('#board').boundingBox();
  const L = await s.evaluate(() => computeLayout());
  const f = box.width / L.S;
  await s.mouse.click(box.x + (L.MARGIN + 15 * L.CELL) * f, box.y + (L.MARGIN + 15 * L.CELL) * f);
  await s.waitForTimeout(100);
  const klick = await s.evaluate(() => state.board[idx(15, 15)]);
  await ctx.close();
  pruefe(Math.max(...pixel) < 80, `schwarzer Stein an der neuen Lage (RGB ${pixel.join('/')})`);
  pruefe(vorschau, 'Zählvorschau bleibt offen');
  pruefeGleich(klick, 2, 'Klick setzt auf 15/15 (Weiß am Zug)');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-L3: mit Fokus in einem Eingabefeld passt sich das Brett erst nach dem Verlassen an', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(null, undefined, GROSS);
  await s.evaluate(() => { dashToggle(); dashSecToggle('search'); });
  await s.focus('#pd-aiTimeBudget');
  const vorher = await s.evaluate(() => document.getElementById('board').width);
  await s.setViewportSize(KLEIN);
  await s.waitForTimeout(400);
  const waehrend = await s.evaluate(() => document.getElementById('board').width);
  await s.evaluate(() => document.activeElement.blur());
  await s.waitForTimeout(300);
  const danach = await s.evaluate(() => ({breite: document.getElementById('board').width, soll: computeLayout().S}));
  await ctx.close();
  pruefeGleich(waehrend, vorher, 'mit Fokus unverändert');
  pruefeGleich(danach.breite, danach.soll, 'nach dem Verlassen Soll-Größe');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-L4: resize ohne Größenänderung zeichnet nicht neu (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(null, undefined, GROSS);
  await s.evaluate(() => { window.__maserung = grainCanvas; dispatchEvent(new Event('resize')); });
  await s.waitForTimeout(400);
  const gleich = await s.evaluate(() => window.__maserung === grainCanvas);
  await ctx.close();
  pruefe(gleich, 'dieselbe Maserung');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

laufeTests('Review-Korrekturen im echten Browser').then(ok => {
  if (!playwright || !chromePfad)
    console.log(`\n  ${PFLICHT ? 'FEHLT' : 'Übersprungen'}: ${!playwright ? 'Playwright' : 'Chromium'} nicht gefunden.`);
  if (browser) browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
