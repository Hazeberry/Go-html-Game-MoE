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

   Korrektur R-1 (docs/korrektur-r1-vorabfestlegung.md, T-R1 bis T-R4):
    23. T-R1: Leicht, getAIMove wirft: Protokollzeile, Notzug, keine Hängepartie.
    24. T-R2: dasselbe auf Mittel.
    25. T-R3: ohne legalen Zug passt die KI.
    26. T-R4: ohne Fehler zieht die KI normal (Kontrolle).

   Korrektur B-1 bis B-3 (docs/korrektur-b1-b3-vorabfestlegung.md, T-B1 bis T-B5):
    27. T-B1: Dashboard-Feld zeigt nach der Eingabe den gültigen Wert.
    28. T-B2: tote Steine am Ende blass mit rotem Kreuz, Wertung unverändert.
    29. T-B3: nach Rückgängig kein Kreuz (Kontrolle).
    30. T-B4: nach Aufgabe der KI kein Kreuz (Kontrolle).
    31. T-B5: „Beide gepasst.“ nach zwei Pässen.

   Korrektur UI-1 (docs/korrektur-ui1-vorabfestlegung.md, T-U1 bis T-U4):
    32. T-U1: Abschalten während der Rechnung: kein Zug mehr, Rückgängig frei.
    33. T-U2: dasselbe, wenn der Worker danach abstürzt (onerror).
    34. T-U3: aus und wieder an: genau ein Zug, kein Watchdog (Kontrolle).
    35. T-U4: ohne Klick zieht die KI normal (Kontrolle).

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

/* ── Korrektur R-1 (docs/korrektur-r1-vorabfestlegung.md §4) ── */

const kiLage = s => s.evaluate(() => ({denkt: state.aiThinking, undoGesperrt: document.getElementById('btn-undo').disabled,
  zuege: state.moveCount, amZug: state.currentPlayer, status: document.getElementById('ai-status').textContent,
  fehlerZeilen: state.log.filter(l => l.includes('KI-Fehler')), letzte: state.log[state.log.length - 1] || ''}));

for (const [nr, stufe, name] of [['T-R1', 'easy', 'Leicht'], ['T-R2', 'medium', 'Mittel']]) {
  test(`${nr}: ${name}, getAIMove wirft: Protokollzeile und Notzug statt Hängepartie`, async () => {
    if (!(await vorbereiten())) return 'skip';
    const {s, ctx, fehler} = await seite();
    await s.evaluate(st => {
      getAIMove = () => { throw new Error('Attrappe'); };
      document.querySelector(`.diff-btn[data-diff="${st}"]`).click();
      document.getElementById('btn-ai-toggle').click();
      placeStone(3, 3); render(); updateUI(); triggerAIMove();
    }, stufe);
    await s.waitForTimeout(600);
    const r = await kiLage(s);
    await ctx.close();
    pruefe(!r.denkt, `die KI rechnet nicht mehr (${r.status})`);
    pruefe(!r.undoGesperrt, 'Rückgängig ist frei');
    pruefeGleich(`${r.zuege}/${r.amZug}`, '2/1', 'Notzug von Weiß, Schwarz am Zug');
    pruefeGleich(r.fehlerZeilen.join(' | '), `! KI-Fehler (${name}): Attrappe → Notzug`, 'Protokollzeile mit Anzeigenamen');
    pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
  });
}

test('T-R3: ohne legalen Zug passt die KI nach dem Fehler', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.evaluate(() => {
    getAIMove = () => { throw new Error('Attrappe'); };
    /* Ganzes Brett schwarz bis auf zwei Augen A19 und C19: jeder weiße Zug wäre Selbstmord */
    const b = createBoard();
    for (let i = 0; i < BOARD_SIZE; i++) b[i] = 1;
    b[idx(0, 0)] = 0; b[idx(2, 0)] = 0;
    state.board = b; state.currentHash = computeZobrist(b);
    state.boardHistory = new Set([state.currentHash]); state.hashListe = [state.currentHash];
    state.currentPlayer = 2; state.aiColor = 2; state.aiDifficulty = 'easy'; state.aiEnabled = true;
    triggerAIMove();
  });
  await s.waitForTimeout(600);
  const r = await kiLage(s);
  await ctx.close();
  pruefe(!r.denkt, `die KI rechnet nicht mehr (${r.status})`);
  pruefeGleich(r.letzte, '1. ○ Weiß passt', 'Weiß passt');
  pruefeGleich(r.amZug, 1, 'Schwarz am Zug');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-R4: ohne Fehler zieht die KI auf Leicht normal (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.evaluate(() => { document.getElementById('btn-ai-toggle').click(); placeStone(3, 3); render(); updateUI(); triggerAIMove(); });
  await s.waitForTimeout(800);
  const r = await kiLage(s);
  await ctx.close();
  pruefe(!r.denkt, 'die KI hat geantwortet');
  pruefeGleich(`${r.zuege}/${r.amZug}`, '2/1', 'Zug von Weiß, Schwarz am Zug');
  pruefeGleich(r.fehlerZeilen.length, 0, 'keine Fehlerzeile');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ── Korrektur B-1 bis B-3 (docs/korrektur-b1-b3-vorabfestlegung.md §4) ── */

test('T-B1: nach der Eingabe zeigt ein Dashboard-Feld den gültigen Wert, beim Tippen greift nichts ein', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    dashToggle(); dashSecToggle('search');
    const e = document.getElementById('pd-aiTimeBudget'), aus = {};
    const tippe = v => { e.value = v; e.dispatchEvent(new Event('input', {bubbles: true})); return e.value; };
    const fertig = () => { e.dispatchEvent(new Event('change', {bubbles: true})); return e.value; };
    aus.waehrend = tippe('99999');
    aus.danach = fertig();
    aus.params = PARAMS.aiTimeBudget;
    aus.schritte = ['5', '50', '500'].map(tippe);
    aus.ende = fertig();
    aus.params2 = PARAMS.aiTimeBudget;
    const g = document.getElementById('pd-resignStreak');
    g.value = '7.6'; g.dispatchEvent(new Event('input', {bubbles: true})); g.dispatchEvent(new Event('change', {bubbles: true}));
    aus.ganz = g.value;
    Object.assign(PARAMS, PARAMS_DEFAULT);
    return aus;
  });
  await ctx.close();
  pruefeGleich(r.waehrend, '99999', 'beim Tippen bleibt die Eingabe');
  pruefeGleich(r.danach, String(r.params), 'nach change zeigt das Feld PARAMS');
  pruefeGleich(r.params, 5000, 'PARAMS auf das Maximum begrenzt');
  pruefeGleich(r.schritte.join(','), '5,50,500', '5, 50, 500 ungestört eintippbar');
  pruefeGleich(`${r.ende}/${r.params2}`, '500/500', 'danach 500');
  pruefeGleich(r.ganz, '7', 'ganzzahliges Feld zeigt nach change 7');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* Schwarze Mauer auf Reihe 17, weiße auf Reihe 15, ein weißer Stein auf F19
   im schwarzen Gebiet (wie im Bug Hunt, B-2). */
function stellungB2() {
  const b = createBoard();
  for (let x = 0; x < 19; x++) { b[idx(x, 2)] = 1; b[idx(x, 4)] = 2; }
  b[idx(5, 0)] = 2;
  state.board = b; state.currentHash = computeZobrist(b);
  state.boardHistory = new Set([state.currentHash]); state.hashListe = [state.currentHash];
  drawStateToCache(); render();
}
/* Pixel auf dem Kreuzarm von F19 (ein Fünftel einer Zelle nach rechts unten) */
const pixelF19 = s => s.evaluate(() => {
  const L = layout, d = document.getElementById('board').getContext('2d')
    .getImageData(L.MARGIN + 5 * L.CELL + Math.round(L.CELL * 0.2), L.MARGIN + Math.round(L.CELL * 0.2), 1, 1).data;
  return [d[0], d[1], d[2]];
});
const rot = p => p[0] > 150 && p[1] < 100 && p[2] < 100;

test('T-B2: am Spielende tote Steine blass mit rotem Kreuz, Wertung unverändert', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.evaluate(stellungB2);
  await s.click('#btn-pass'); await s.click('#btn-pass');
  await s.waitForTimeout(100);
  const r = await s.evaluate(() => ({brett: state.board[idx(5, 0)], tote: [...state.deadStones],
    anzeige: document.getElementById('final-score').textContent, gefangen: `${state.captures[1]}/${state.captures[2]}`}));
  const p = await pixelF19(s);
  await ctx.close();
  pruefeGleich(r.brett, 0, 'F19 bleibt auf dem Brett leer');
  pruefeGleich(r.tote.join(','), String(5), 'F19 in deadStones');
  pruefeGleich(r.anzeige, 'Weiß +235.5', 'Wertung wie am alten Code');
  pruefeGleich(r.gefangen, '1/0', 'Gefangene wie am alten Code');
  pruefe(rot(p), `rotes Kreuz an F19 (RGB ${p.join('/')})`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-B3: nach Rückgängig am Spielende kein Kreuz (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.evaluate(stellungB2);
  await s.click('#btn-pass'); await s.click('#btn-pass');
  await s.evaluate(() => { undo(); render(); });
  const r = await s.evaluate(() => ({brett: state.board[idx(5, 0)], farben: state.deadFarben ? state.deadFarben.size : 0}));
  const p = await pixelF19(s);
  await ctx.close();
  pruefeGleich(r.brett, 2, 'weißer Stein zurück');
  pruefeGleich(r.farben, 0, 'keine gemerkten toten Steine');
  pruefe(!rot(p), `kein rotes Kreuz an F19 (RGB ${p.join('/')})`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-B4: nach Aufgabe der KI kein Kreuz (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.evaluate(stellungB2);
  await s.evaluate(() => {
    state.aiEnabled = true; state.aiColor = 2; state.currentPlayer = 2;
    applyAIResult({type: 'resign'}, state.aiRequestId); render();
  });
  const r = await s.evaluate(() => ({brett: state.board[idx(5, 0)], status: document.getElementById('message').textContent}));
  const p = await pixelF19(s);
  await ctx.close();
  pruefeGleich(r.brett, 2, 'F19 bleibt weiß');
  pruefe(!rot(p), `kein rotes Kreuz an F19 (RGB ${p.join('/')})`);
  pruefeGleich(r.status, 'Spiel beendet', 'Statuszeile nach Aufgabe');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-B5: nach zwei Pässen über den Knopf steht „Beide gepasst.“', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await s.click('#btn-pass'); await s.click('#btn-pass');
  const text = await s.evaluate(() => document.getElementById('message').textContent);
  await ctx.close();
  pruefeGleich(text, 'Beide gepasst.', 'Statuszeile');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* UI-1: KI Weiß, damit ein Menschenzug im Rückgängig-Stapel liegt und der
   Knopf prüfbar ist (bei KI Schwarz im ersten Zug ist der Stapel leer und der
   Knopf ohnehin gesperrt). Start, Menschenzug und Klick in EINEM Aufruf: sonst
   kann die 300-ms-Rechnung schon vorbei sein (wie bei T-W1). */
async function ui1Vorbereiten(s) {
  await s.evaluate(() => {
    window.__ui1Start = () => {
      PARAMS.aiTimeBudget = 300; PARAMS.adaptiveBudgetEnabled = 0;
      document.querySelector('.diff-btn[data-diff="hard"]').click();
      document.querySelector('.color-btn[data-color="2"]').click();   /* KI = Weiß */
      document.getElementById('btn-ai-toggle').click();               /* KI an */
      placeStone(3, 3); render(); updateUI('');                       /* Mensch Schwarz */
      if (!state.aiThinking) triggerAIMove();
    };
  });
}
const ui1Lage = s => s.evaluate(() => {
  let weiss = 0;
  for (let i = 0; i < state.board.length; i++) if (state.board[i] === 2) weiss++;
  return {zuege: state.moveCount, weiss, rechnet: state.aiThinking,
    undoGesperrt: document.getElementById('btn-undo').disabled,
    status: document.getElementById('ai-status').textContent, aiEnabled: state.aiEnabled,
    tot: !!state.workerDead, grund: state.workerDeadReason,
    watchdog: state.log.some(l => l.includes('Watchdog')), neustarts: state.workerNeustarts};
});

test('T-U1: Abschalten während der Rechnung: kein Zug mehr, Rückgängig frei', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await ui1Vorbereiten(s);
  const sofort = await s.evaluate(() => {
    __ui1Start();
    const rechnete = state.aiThinking, stapel = state.undoStack.length;
    document.getElementById('btn-ai-toggle').click();                 /* KI aus */
    return {rechnete, stapel, rechnet: state.aiThinking,
      undoGesperrt: document.getElementById('btn-undo').disabled, aiEnabled: state.aiEnabled};
  });
  /* Warten, bis der Worker geantwortet hat: dann hat der alte Code den Stein
     gesetzt, der neue die Antwort verworfen. Robuster als eine feste Frist. */
  await s.waitForFunction(() => state.aiWorkerCtx && state.aiWorkerCtx.antwort === true, null, {timeout: 20000})
    .catch(() => { /* unten geprüft */ });
  await s.waitForTimeout(300);
  const r = await ui1Lage(s);
  await ctx.close();
  pruefe(sofort.rechnete, 'Vorbedingung: die KI rechnete beim Klick');
  pruefeGleich(sofort.stapel, 1, 'Vorbedingung: ein Menschenzug im Rückgängig-Stapel');
  pruefe(!sofort.aiEnabled, 'die KI ist abgeschaltet');
  pruefe(!sofort.rechnet, 'sofort nach dem Klick rechnet die KI nicht mehr');
  pruefe(!sofort.undoGesperrt, 'sofort nach dem Klick ist Rückgängig frei');
  pruefeGleich(r.weiss, 0, 'kein weißer Stein auf dem Brett');
  pruefeGleich(r.zuege, 1, 'nur der Menschenzug');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-U2: Worker-Absturz nach dem Abschalten setzt keinen Zug', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await ui1Vorbereiten(s);
  const sofort = await s.evaluate(() => {
    __ui1Start();
    const rechnete = state.aiThinking;
    document.getElementById('btn-ai-toggle').click();                 /* KI aus */
    /* Genau der Weg aus attachWorkerHandlers.onerror: dort ruft
       fallbackToMainThread(state.aiRequestId, ...) mit der AKTUELLEN Kennung,
       die Kennungsprüfung kann dort nie greifen (UI-1 §2). */
    const onerror = state.aiWorker && state.aiWorker.onerror;
    if (onerror) onerror.call(state.aiWorker, {message: 'Testabsturz'});
    return {rechnete, onerrorVorhanden: !!onerror};
  });
  /* Am alten Code steht der Stein nach rund 400 ms; am neuen kommt er nie,
     deshalb läuft die Frist dort ab. */
  await s.waitForFunction(() => state.moveCount >= 2, null, {timeout: 4000})
    .catch(() => { /* unten geprüft */ });
  const r = await ui1Lage(s);
  await ctx.close();
  pruefe(sofort.rechnete, 'Vorbedingung: die KI rechnete beim Klick');
  pruefe(sofort.onerrorVorhanden, 'Vorbedingung: der Worker hatte einen onerror-Handler');
  pruefeGleich(r.weiss, 0, 'kein weißer Stein auf dem Brett');
  pruefeGleich(r.zuege, 1, 'nur der Menschenzug');
  pruefe(!r.rechnet, 'die KI rechnet nicht mehr');
  pruefe(!r.undoGesperrt, 'Rückgängig ist frei');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-U3: aus und wieder an während der Rechnung: genau ein Zug (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await ui1Vorbereiten(s);
  const sofort = await s.evaluate(() => {
    __ui1Start();
    const rechnete = state.aiThinking;
    const k = document.getElementById('btn-ai-toggle');
    k.click(); k.click();                                             /* aus, wieder an */
    return {rechnete, aiEnabled: state.aiEnabled};
  });
  await zugFertig(s, 2);
  const r = await ui1Lage(s);
  await ctx.close();
  pruefe(sofort.rechnete, 'Vorbedingung: die KI rechnete beim ersten Klick');
  pruefe(sofort.aiEnabled, 'die KI ist wieder an');
  pruefeGleich(r.zuege, 2, 'genau ein KI-Zug');
  pruefeGleich(r.weiss, 1, 'ein weißer Stein');
  pruefe(r.tot !== true, `der Worker gilt nicht als tot (${r.grund})`);
  pruefe(!r.watchdog, 'kein Watchdog');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-U4: ohne Klick zieht die KI normal (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await ui1Vorbereiten(s);
  const rechnete = await s.evaluate(() => { __ui1Start(); return state.aiThinking; });
  await zugFertig(s, 2);
  const r = await ui1Lage(s);
  await ctx.close();
  pruefe(rechnete, 'Vorbedingung: die KI rechnete');
  pruefeGleich(r.zuege, 2, 'die KI hat gezogen');
  pruefeGleich(r.weiss, 1, 'ein weißer Stein');
  pruefeGleich(r.status, 'KI aktiv · Weiß · Schwer', 'Statuszeile');
  pruefe(!r.undoGesperrt, 'Rückgängig ist frei');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

laufeTests('Review-Korrekturen im echten Browser').then(ok => {
  if (!playwright || !chromePfad)
    console.log(`\n  ${PFLICHT ? 'FEHLT' : 'Übersprungen'}: ${!playwright ? 'Playwright' : 'Chromium'} nicht gefunden.`);
  if (browser) browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
