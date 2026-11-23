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

   Korrektur H-1 (docs/korrektur-h1-vorabfestlegung.md, T-H1 bis T-H3):
    36. T-H1: Der Hinweis des Policy-Netz-Abschnitts nennt Formel und Default,
        nicht mehr „nach 5 Spielen ~30%".
    37. T-H2: blendWeight folgt netMaxBlend × min(1, Spiele/netWarmup).
    38. T-H3: mit den Standardwerten ist blendWeight immer 0.

   Korrektur UI-2 und UI-3 (docs/korrektur-ui2-ui3-vorabfestlegung.md,
   T-S1/T-S2 und T-V1/T-V2):
    39. T-S1: Wertungswechsel nach Spielende rechnet die Anzeige neu.
    40. T-S2: nach Aufgabe bleibt die Aufgabe-Anzeige stehen (Kontrolle).
    41. T-V1: ein Pass räumt die Marken der Zählvorschau vom Brett.
    42. T-V2: ein Zug räumt sie auch (Kontrolle).

   Korrektur NET-1 (docs/korrektur-net1-vorabfestlegung.md, T-N3/T-N4; T-N1,
   T-N2 und T-N5 stehen in tests/nan-guards.js):
    43. T-N3: Divergenz beim Spielende mit gesperrtem localStorage bricht das
        Spielende nicht ab.
    44. T-N4: dasselbe im Aufgabe-Pfad.

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

/* H-1: Der Abschnittshinweis wird als Inhalt von #pdhint-polnet gerendert
   (index.html, dashRender). T-H2 und T-H3 binden ihn an das Verhalten: Sie
   schlagen an, wenn jemand Formel oder Default ändert, ohne den Text
   nachzuziehen — genau der Weg, auf dem H-1 entstanden ist. */
test('T-H1: der Policy-Netz-Hinweis nennt Formel und Default statt einer Blend-Zahl', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const t = await s.evaluate(() => {
    const el = document.getElementById('pdhint-polnet');
    return el ? el.textContent : null;
  });
  await ctx.close();
  pruefe(t !== null, 'der Hinweis des Abschnitts polnet ist im DOM');
  pruefe(/netMaxBlend 0/.test(t), 'nennt netMaxBlend 0');
  pruefe(/steuert nie/.test(t), 'nennt die Folge: steuert nie');
  pruefe(/netWarmup/.test(t), 'nennt netWarmup in der Formel');
  pruefe(!/nach 5 Spielen/.test(t), 'keine Behauptung „nach 5 Spielen"');
  pruefe(!/[<&]/.test(t), 'keine spitzen Klammern und kein kaufmännisches Und');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-H2: blendWeight folgt netMaxBlend × min(1, Spiele/netWarmup)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    const alt = {g: policyNet.gamesPlayed, mb: PARAMS.netMaxBlend, w: PARAMS.netWarmup, h: policyNet._healthy};
    const falsch = []; let geprueft = 0;
    policyNet._healthy = true;
    for (const [mb, w] of [[0, 10], [0.3, 5], [0.5, 1], [0.6, 10], [1, 10]]) {
      PARAMS.netMaxBlend = mb; PARAMS.netWarmup = w;
      for (const g of [0, 1, 2, 3, 5, 9, 10, 11, 25]) {
        policyNet.gamesPlayed = g;
        const ist = policyNet.blendWeight;
        const soll = g < 2 ? 0 : mb * Math.min(1, g / w);
        geprueft++;
        if (Math.abs(ist - soll) > 1e-12) falsch.push(`mb ${mb}, w ${w}, g ${g}: ${ist} statt ${soll}`);
      }
    }
    /* Ein krankes Netz steuert nie, auch mit grossem netMaxBlend */
    PARAMS.netMaxBlend = 0.6; PARAMS.netWarmup = 10;
    policyNet.gamesPlayed = 5; policyNet._healthy = false;
    const krank = policyNet.blendWeight;
    Object.assign(policyNet, {gamesPlayed: alt.g, _healthy: alt.h});
    PARAMS.netMaxBlend = alt.mb; PARAMS.netWarmup = alt.w;
    return {falsch, geprueft, krank, altMb: alt.mb, altW: alt.w,
      wiederMb: PARAMS.netMaxBlend, wiederW: PARAMS.netWarmup};
  });
  await ctx.close();
  pruefeGleich(r.geprueft, 45, '45 Kombinationen geprüft');
  pruefeGleich(r.falsch.join('; '), '', 'blendWeight folgt der Formel');
  pruefeGleich(r.krank, 0, 'krankes Netz steuert nicht');
  pruefeGleich(r.wiederMb, r.altMb, 'netMaxBlend wiederhergestellt');
  pruefeGleich(r.wiederW, r.altW, 'netWarmup wiederhergestellt');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-H3: mit den Standardwerten steuert das Netz nie (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    const alt = {g: policyNet.gamesPlayed, h: policyNet._healthy};
    policyNet._healthy = true;
    const werte = [];
    for (const g of [0, 1, 2, 5, 10, 25, 100]) { policyNet.gamesPlayed = g; werte.push(policyNet.blendWeight); }
    Object.assign(policyNet, {gamesPlayed: alt.g, _healthy: alt.h});
    return {werte, mb: PARAMS.netMaxBlend, mbDefault: PARAMS_DEFAULT.netMaxBlend, wDefault: PARAMS_DEFAULT.netWarmup};
  });
  await ctx.close();
  pruefeGleich(r.mbDefault, 0, 'netMaxBlend hat den Default 0');
  pruefeGleich(r.wDefault, 10, 'netWarmup hat den Default 10');
  pruefeGleich(r.mb, 0, 'die Seite läuft mit netMaxBlend 0');
  pruefeGleich(r.werte.join(','), '0,0,0,0,0,0,0', 'blendWeight ist für jede Spielzahl 0');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* UI-2 und UI-3. Die Stellung fuer T-S1: alles Schwarz ausser zwei Augen, also
   Flaeche 361 zu 0 und Territory 2 zu 0 -- damit unterscheiden sich die beiden
   Wertungen deutlich (353,5 gegen -5,5). */
async function wertungsStellung(s) {
  return s.evaluate(() => {
    for (let i = 0; i < state.board.length; i++) state.board[i] = 1;
    state.board[idx(0, 0)] = 0; state.board[idx(2, 0)] = 0;
    state.currentPlayer = 1; state.consecutivePasses = 0;
  });
}

test('T-S1: Wertungswechsel nach Spielende rechnet die Anzeige neu', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  await wertungsStellung(s);
  const r = await s.evaluate(() => {
    const re = t => { const m = /RE\[([^\]]*)\]/.exec(t); return m ? m[1] : '(kein RE)'; };
    pass(); pass();                                        /* Spielende */
    const vor = {anzeige: document.getElementById('final-score').textContent,
      label: document.getElementById('final-label').textContent, sgf: re(buildSGF())};
    document.querySelector('.scoring-btn[data-scoring="territory"]').click();
    return {vor, nach: {anzeige: document.getElementById('final-score').textContent,
      label: document.getElementById('final-label').textContent, sgf: re(buildSGF())},
      ende: state.gameOver, resign: state.resignedBy};
  });
  await ctx.close();
  pruefe(r.ende, 'Vorbedingung: das Spiel ist beendet');
  pruefe(!r.resign, 'Vorbedingung: keine Aufgabe');
  pruefeGleich(r.vor.anzeige, 'Schwarz +353.5', 'Area-Anzeige vor dem Wechsel');
  pruefeGleich(r.vor.sgf, 'B+353.5', 'SGF vor dem Wechsel');
  pruefeGleich(r.nach.anzeige, 'Weiß +5.5', 'Anzeige folgt der Wertung');
  pruefeGleich(r.nach.label, 'Territory (Komi 7.5)', 'Label folgt der Wertung');
  pruefeGleich(r.nach.sgf, 'W+5.5', 'SGF nach dem Wechsel');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-S2: nach Aufgabe bleibt die Aufgabe-Anzeige stehen (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const r = await s.evaluate(() => {
    const re = t => { const m = /RE\[([^\]]*)\]/.exec(t); return m ? m[1] : '(kein RE)'; };
    /* Aufgabe der KI auf dem Weg, den applyAIResult nimmt */
    state.aiEnabled = false; state.aiColor = 2;
    placeStone(0, 0);
    state.currentPlayer = 2; state.aiRequestId = 3;
    applyAIResult({type: 'resign', info: 'Test'}, 3, null, null, null);
    const vor = {anzeige: document.getElementById('final-score').textContent,
      label: document.getElementById('final-label').textContent, sgf: re(buildSGF())};
    document.querySelector('.scoring-btn[data-scoring="territory"]').click();
    return {vor, nach: {anzeige: document.getElementById('final-score').textContent,
      label: document.getElementById('final-label').textContent, sgf: re(buildSGF())},
      resign: state.resignedBy};
  });
  await ctx.close();
  pruefeGleich(r.resign, 2, 'Vorbedingung: Weiß hat aufgegeben');
  pruefeGleich(r.vor.label, 'Aufgabe', 'Label vor dem Wechsel');
  pruefeGleich(r.nach.label, 'Aufgabe', 'Label bleibt Aufgabe');
  pruefeGleich(r.nach.anzeige, r.vor.anzeige, 'Anzeige unverändert');
  pruefeGleich(r.nach.sgf, 'B+R', 'SGF bleibt RE[B+R]');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* T-V1/T-V2: Die Marken der Vorschau zeigen TOTE Steine, nicht Gebiet. Ohne
   toten Klumpen malt sie nichts, und der Test waere gruen, ohne etwas zu
   pruefen (Vorabfestlegung §3). Deshalb drei weisse Steine in der Mitte und
   eine ausdrueckliche Pruefung der Markenzahl. */
async function vorschauStellung(s) {
  return s.evaluate(() => {
    for (let i = 0; i < state.board.length; i++) state.board[i] = 1;
    state.board[idx(0, 0)] = 0; state.board[idx(2, 0)] = 0;
    for (const [x, y] of [[9, 9], [9, 10], [10, 9]]) state.board[idx(x, y)] = 2;
    state.currentPlayer = 1; state.consecutivePasses = 0;
    drawStateToCache(); render();
    vorschauOeffnen();
    let marken = 0;
    if (state.vorschau) for (let i = 0; i < 361; i++)
      if (state.vorschau.v.bewiesenTot[i] || state.vorschau.v.geschaetztTot[i]) marken++;
    return {offen: !!state.vorschau, marken, mitVorschau: canvas.toDataURL()};
  });
}

test('T-V1: ein Pass räumt die Marken der Zählvorschau vom Brett', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const v = await vorschauStellung(s);
  const r = await s.evaluate(mitVorschau => {
    document.getElementById('btn-pass').click();
    const nachPass = canvas.toDataURL();
    drawStateToCache(); render();
    return {gleichVorschau: nachPass === mitVorschau, gleichNeuaufbau: nachPass === canvas.toDataURL(),
      vorschauWeg: !state.vorschau, zuege: state.moveCount};
  }, v.mitVorschau);
  await ctx.close();
  pruefe(v.offen, 'Vorbedingung: die Vorschau war offen');
  pruefeGleich(v.marken, 3, 'Vorbedingung: drei Marken auf dem Brett');
  pruefeGleich(r.zuege, 1, 'ein Pass gezählt');
  pruefe(r.vorschauWeg, 'die Vorschau ist verworfen');
  pruefe(!r.gleichVorschau, 'das Bild zeigt die Marken nicht mehr');
  pruefe(r.gleichNeuaufbau, 'das Bild gleicht dem sauberen Neuaufbau');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-V2: ein Zug räumt die Marken auch (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const v = await vorschauStellung(s);
  const r = await s.evaluate(mitVorschau => {
    /* Denselben Weg wie der Canvas-Klick nehmen (index.html Z. 6721):
       placeStone aktualisiert den Cache, erst render() malt ihn aufs Canvas.
       Ohne render() prueft der Test ein veraltetes Bild. */
    const gesetzt = placeStone(0, 0);                      /* freier Punkt (Auge) */
    render();
    const nachZug = canvas.toDataURL();
    drawStateToCache(); render();
    return {ok: gesetzt.ok, gleichVorschau: nachZug === mitVorschau,
      gleichNeuaufbau: nachZug === canvas.toDataURL(), vorschauWeg: !state.vorschau};
  }, v.mitVorschau);
  await ctx.close();
  pruefe(v.offen, 'Vorbedingung: die Vorschau war offen');
  pruefeGleich(v.marken, 3, 'Vorbedingung: drei Marken auf dem Brett');
  pruefe(r.ok, 'der Zug wurde gesetzt');
  pruefe(r.vorschauWeg, 'die Vorschau ist verworfen');
  pruefe(!r.gleichVorschau, 'das Bild zeigt die Marken nicht mehr');
  pruefe(r.gleichNeuaufbau, 'das Bild gleicht dem sauberen Neuaufbau');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* NET-1: reset() begann mit einem ungeschuetzten localStorage.removeItem.
   trainGame ruft reset() im Divergenzpfad, und das steckt mitten im
   Spielende — der Wurf brach deshalb den Aufrufer ab. Aufbau: removeItem
   wirft, getItem liefert null (damit load() im Divergenzpfad false liefert
   und reset() an die Reihe kommt), ein KI-Zug mit ECHTEN Netzeingaben fuellt
   den Puffer, ein NaN im Gewicht erzwingt die Divergenz. */
async function net1Vorbereiten(s) {
  return s.evaluate(() => {
    Storage.prototype.removeItem = function () { throw new DOMException('gesperrt', 'SecurityError'); };
    Storage.prototype.getItem = function () { return null; };
    state.aiEnabled = false; state.aiColor = 2;
    const inp = policyNet.boardToInput(state.board, 2, null, null);
    const {probs, hidden} = policyNet.forward(inp);
    placeStone(3, 3);
    state.currentPlayer = 2; state.aiRequestId = 1;
    applyAIResult({type: 'stone', x: 15, y: 15}, 1, inp, probs, hidden);
    policyNet.W1[0] = NaN;
    return {puffer: policyNet._gameBuffer.length, w1Kaputt: !Number.isFinite(policyNet.W1[0])};
  });
}

test('T-N3: Divergenz beim Spielende mit gesperrtem localStorage bricht nicht ab', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const v = await net1Vorbereiten(s);
  const r = await s.evaluate(() => {
    let wurf = null;
    try {
      state.currentPlayer = 1; state.consecutivePasses = 0;
      pass(); pass();
    } catch (e) { wurf = (e && e.name) || String(e); }
    return {wurf, ende: state.gameOver,
      anzeige: document.getElementById('final-score').textContent,
      panel: document.getElementById('territory-panel').style.display,
      w1endlich: Number.isFinite(policyNet.W1[0])};
  });
  await ctx.close();
  pruefeGleich(v.puffer, 1, 'Vorbedingung: ein Zug im Trainingspuffer');
  pruefe(v.w1Kaputt, 'Vorbedingung: ein Gewicht ist nicht endlich');
  pruefeGleich(r.wurf, null, 'pass() wirft nicht');
  pruefe(r.ende, 'das Spiel ist beendet');
  pruefe(r.anzeige !== '–', `der Endstand steht da (${r.anzeige})`);
  pruefeGleich(r.panel, 'flex', 'das Endstands-Panel ist sichtbar');
  pruefe(r.w1endlich, 'der Reset hat gegriffen: W1[0] ist wieder endlich');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-N4: Divergenz im Aufgabe-Pfad mit gesperrtem localStorage bricht nicht ab', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite();
  const v = await net1Vorbereiten(s);
  const r = await s.evaluate(() => {
    let wurf = null;
    try {
      placeStone(3, 15);
      state.currentPlayer = 2; state.aiRequestId = 2;
      applyAIResult({type: 'resign', info: 'Test'}, 2, null, null, null);
    } catch (e) { wurf = (e && e.name) || String(e); }
    return {wurf, resign: state.resignedBy,
      label: document.getElementById('final-label').textContent,
      anzeige: document.getElementById('final-score').textContent,
      panel: document.getElementById('territory-panel').style.display};
  });
  await ctx.close();
  pruefe(v.w1Kaputt, 'Vorbedingung: ein Gewicht ist nicht endlich');
  pruefeGleich(r.wurf, null, 'applyAIResult wirft nicht');
  pruefeGleich(r.resign, 2, 'Weiß hat aufgegeben');
  pruefeGleich(r.label, 'Aufgabe', 'das Label nennt die Aufgabe');
  pruefe(/gewinnt/.test(r.anzeige), `die Anzeige nennt den Gewinner (${r.anzeige})`);
  pruefeGleich(r.panel, 'flex', 'das Endstands-Panel ist sichtbar');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ══ TRAIN-1, Variante a ═════════════════════════════════════
   docs/korrektur-train1-vorabfestlegung.md, Tests nach §4. Eine Partie wird
   genau einmal gelernt; nach dem Abschluss wird nicht mehr gesammelt, und jedes
   Undo einer gelernten Partie sagt es im Protokoll.

   §4 gibt eine Vorgabe zum Aufbau, die den Test erst tragfaehig macht: Die
   Puffer-Eintraege muessen ECHTE Netzeingaben tragen (boardToInput und forward).
   Mit Attrappen rechnet _backward Unsinn, _badWeight schlaegt an, und trainGame
   laeuft in den Divergenzpfad, der reset() aufruft — gamesPlayed 0 und _trained
   false. Der Test pruefte dann die Divergenz-Mechanik statt TRAIN-1. */
const t1Init = () => {
  globalThis.t1KiZug = (x, y, reqId) => {
    const lm = state.lastMove !== null ? {x: xOf(state.lastMove), y: yOf(state.lastMove)} : null;
    const inp = policyNet.boardToInput(state.board, state.aiColor, lm, state.koPoint);
    const {probs, hidden} = policyNet.forward(inp);
    state.aiRequestId = reqId;
    applyAIResult({type: 'stone', x, y}, reqId, inp, probs, hidden);
  };
  globalThis.t1Zeilen = () => state.log.filter(z => /bereits gelernt/.test(z)).length;
};

/* Zwei KI-Zuege mit echten Eingaben, dann Spielende durch zwei Paesse.
   showFinalScore setzt _trained und ruft trainGame: der Puffer wird geleert,
   gamesPlayed steht auf 1. Danach hebt ein Undo das Spielende auf. */
const t1BisUndo = `
  state.aiEnabled = false; state.aiColor = 2;
  const aufrufe = [], echt = policyNet.trainGame.bind(policyNet);
  policyNet.trainGame = x => { aufrufe.push(x); return echt(x); };
  placeStone(3, 3);                       /* Mensch, Schwarz */
  t1KiZug(15, 15, 1);                     /* KI, Weiss */
  placeStone(4, 4);
  t1KiZug(16, 16, 2);
  const vorEnde = policyNet._gameBuffer.length;
  pass();                                 /* Schwarz passt */
  pass();                                 /* Weiss passt → Spielende, Training */
  const nachEnde = {puffer: policyNet._gameBuffer.length, trained: policyNet._trained,
                    spiele: policyNet.gamesPlayed, aufrufe: aufrufe.length};
  undo();                                 /* hebt den zweiten Pass auf */
`;

test('T-T1: nach dem Abschluss sammelt die Fortsetzung nicht mehr', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t1Init);
  const r = await s.evaluate(`(() => {
    ${t1BisUndo}
    const nachUndo = {amZug: state.currentPlayer, beendet: state.gameOver};
    t1KiZug(17, 17, 3);                   /* Fortsetzung nach dem Undo */
    return {vorEnde, nachEnde, nachUndo, nachFortsetzung: policyNet._gameBuffer.length,
            gesetzt: state.board[idx(17, 17)], trained: policyNet._trained,
            spiele: policyNet.gamesPlayed, divergenzen: policyNet._divergences,
            gesund: policyNet._healthy};
  })()`);
  await ctx.close();
  pruefeGleich(r.vorEnde, 2, 'zwei KI-Zuege im Puffer');
  pruefeGleich(r.nachEnde.puffer, 0, 'das Training hat den Puffer geleert');
  pruefeGleich(r.nachEnde.spiele, 1, 'eine Partie gezaehlt');
  pruefeGleich(r.nachUndo.beendet, false, 'das Undo hat das Spielende aufgehoben');
  pruefeGleich(r.nachUndo.amZug, 2, 'nach dem Undo ist die KI am Zug');
  /* Ohne diese Zeile waere der leere Puffer nichtssagend: ein nicht
     stattgefundener Zug fuellt ihn auch nicht. */
  pruefeGleich(r.gesetzt, 2, 'der Fortsetzungszug der KI liegt wirklich auf dem Brett');
  pruefeGleich(r.nachFortsetzung, 0, 'der Puffer bleibt LEER — das ist der Befund');
  pruefeGleich(r.trained, true, '_trained bleibt true');
  pruefeGleich(r.spiele, 1, 'gamesPlayed bleibt 1');
  pruefeGleich(r.divergenzen, 0, 'keine Divergenz (echte Netzeingaben, §4)');
  pruefeGleich(r.gesund, true, 'das Netz gilt als gesund');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-T2: ein zweites Spielende lernt nicht erneut, und der Puffer bleibt leer', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t1Init);
  const r = await s.evaluate(`(() => {
    ${t1BisUndo}
    t1KiZug(17, 17, 3);
    pass();                               /* Schwarz passt */
    pass();                               /* Weiss passt → zweites Spielende */
    return {aufrufe: aufrufe.slice(), puffer: policyNet._gameBuffer.length,
            spiele: policyNet.gamesPlayed, trained: policyNet._trained,
            beendet: state.gameOver};
  })()`);
  await ctx.close();
  pruefeGleich(r.beendet, true, 'die Partie ist wieder beendet');
  pruefeGleich(r.aufrufe.length, 1, 'genau EIN Trainingsaufruf fuer die ganze Partie');
  pruefeGleich(r.spiele, 1, 'gamesPlayed bleibt 1');
  pruefeGleich(r.puffer, 0, 'der Puffer ist leer — nichts wurde nutzlos gesammelt');
  pruefeGleich(r.trained, true, '_trained bleibt true');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-T3: die Zeile steht nach JEDEM Undo einer gelernten Partie, genau einmal', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t1Init);
  const r = await s.evaluate(`(() => {
    ${t1BisUndo}
    const nachErstem = {zeilen: t1Zeilen(), letzte: state.log[state.log.length - 1]};
    undo();                               /* zweites Undo: kuerzt das Protokoll erneut */
    const nachZweitem = {zeilen: t1Zeilen(), letzte: state.log[state.log.length - 1]};
    return {nachErstem, nachZweitem, trained: policyNet._trained};
  })()`);
  await ctx.close();
  pruefeGleich(r.nachErstem.zeilen, 1, 'nach dem ersten Undo steht die Zeile einmal');
  pruefe(/bereits gelernt/.test(r.nachErstem.letzte || ''), `als letzte Zeile: ${r.nachErstem.letzte}`);
  /* Der Kern von T-T3: undo kuerzt auf prev.logLength, ein nur einmal
     geschriebener Hinweis waere jetzt weg. */
  pruefeGleich(r.nachZweitem.zeilen, 1, 'nach dem ZWEITEN Undo steht sie noch da, und nur einmal');
  pruefe(/bereits gelernt/.test(r.nachZweitem.letzte || ''), `wieder als letzte Zeile: ${r.nachZweitem.letzte}`);
  pruefeGleich(r.trained, true, '_trained bleibt true');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-T4: nach Aufgabe der KI und einem Undo steht die Zeile ebenfalls', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t1Init);
  const r = await s.evaluate(() => {
    state.aiEnabled = false; state.aiColor = 2;
    placeStone(3, 3);                     /* ein Undo-Eintrag; die Aufgabe hat keinen eigenen */
    t1KiZug(15, 15, 1);
    placeStone(4, 4);
    /* Weiss (KI) gibt auf: der Aufgabe-Pfad in applyAIResult setzt _trained
       und trainiert mit -1. */
    state.currentPlayer = 2; state.aiRequestId = 2;
    applyAIResult({type: 'resign', info: 'Test'}, 2, null, null, null);
    const nachAufgabe = {trained: policyNet._trained, resignedBy: state.resignedBy, zeilen: t1Zeilen()};
    undo();
    return {nachAufgabe, zeilen: t1Zeilen(), letzte: state.log[state.log.length - 1],
            trained: policyNet._trained, resignedBy: state.resignedBy};
  });
  await ctx.close();
  pruefeGleich(r.nachAufgabe.resignedBy, 2, 'Weiss hat aufgegeben');
  pruefeGleich(r.nachAufgabe.trained, true, 'der Aufgabe-Pfad hat gelernt');
  pruefeGleich(r.nachAufgabe.zeilen, 0, 'vor dem Undo steht die Zeile nicht');
  pruefeGleich(r.zeilen, 1, 'nach dem Undo steht sie');
  pruefe(/bereits gelernt/.test(r.letzte || ''), `als letzte Zeile: ${r.letzte}`);
  pruefeGleich(r.trained, true, '_trained bleibt true');
  pruefeGleich(r.resignedBy, null, 'die Aufgabe gilt nicht mehr');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-T5: nach Neues Spiel wird wieder gesammelt (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t1Init);
  const r = await s.evaluate(`(() => {
    ${t1BisUndo}
    resetGame();
    const nachReset = {trained: policyNet._trained, puffer: policyNet._gameBuffer.length};
    state.aiEnabled = false; state.aiColor = 2;
    placeStone(3, 3);
    t1KiZug(15, 15, 4);
    return {nachReset, puffer: policyNet._gameBuffer.length, zeilen: t1Zeilen()};
  })()`);
  await ctx.close();
  pruefeGleich(r.nachReset.trained, false, 'Neues Spiel setzt _trained zurueck');
  pruefeGleich(r.nachReset.puffer, 0, 'und leert den Puffer');
  pruefeGleich(r.puffer, 1, 'der KI-Zug landet wieder im Puffer — nichts ist dauerhaft abgeschaltet');
  pruefeGleich(r.zeilen, 0, 'im frischen Protokoll steht die Zeile nicht');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-T6: ein Undo ohne Spielende schreibt keine Zeile und kuerzt den Puffer (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t1Init);
  const r = await s.evaluate(() => {
    state.aiEnabled = false; state.aiColor = 2;
    placeStone(3, 3);
    t1KiZug(15, 15, 1);
    const vor = {puffer: policyNet._gameBuffer.length, trained: policyNet._trained};
    undo();
    return {vor, puffer: policyNet._gameBuffer.length, zeilen: t1Zeilen(), beendet: state.gameOver};
  });
  await ctx.close();
  pruefeGleich(r.vor.trained, false, 'die Partie ist nicht gelernt');
  pruefeGleich(r.vor.puffer, 1, 'der KI-Zug ist im Puffer');
  pruefeGleich(r.puffer, 0, 'das Undo nimmt ihn heraus, wie bisher');
  pruefeGleich(r.zeilen, 0, 'keine Zeile im Protokoll');
  pruefeGleich(r.beendet, false, 'kein Spielende');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

/* ══ DASH-1: dashUpdate ist null-sicher ════════════════════════════
   docs/korrektur-dash1-vorabfestlegung.md, Tests nach §4. dashUpdate pruefte
   von sechs Anzeigeelementen nur pn-games; ein fehlendes Geschwister warf einen
   TypeError und liess die Anzeige halb aktualisiert zurueck.

   §4 gibt eine Vorgabe zum Aufbau: Die vier Pflichtfelder werden vor JEDEM
   Aufruf auf eine Markierung gesetzt. Sonst ist nicht unterscheidbar, ob ein
   Feld geschrieben wurde oder noch einen Wert aus einem fruehen Schritt traegt
   — die erste Fassung dieser Messung hatte genau den Fehler (§6). */
const daInit = () => {
  globalThis.daProbe = (weg) => {
    const PFLICHT = ['pn-games', 'pn-wins', 'pn-blend', 'pn-result'];
    const gemerkt = weg.map(id => {
      const e = document.getElementById(id);
      return {id, e, eltern: e && e.parentNode, next: e && e.nextSibling};
    });
    for (const g of gemerkt) if (g.e) g.e.remove();
    for (const id of PFLICHT) { const e = document.getElementById(id); if (e) e.textContent = 'MARKE'; }
    policyNet.gamesPlayed = 7; policyNet.wins = 4; policyNet.lastResult = 1;
    let wurf = null;
    try { policyNet.dashUpdate(); } catch (e) { wurf = e.constructor.name; }
    const gelesen = {};
    for (const id of PFLICHT) { const e = document.getElementById(id); gelesen[id] = e ? e.textContent : null; }
    for (const g of gemerkt) if (g.e) g.eltern.insertBefore(g.e, g.next);   /* Markup zuruecklegen */
    return {wurf, gelesen, geschrieben: PFLICHT.filter(id => gelesen[id] !== null && gelesen[id] !== 'MARKE')};
  };
};

test('T-DA1: fehlt ein Pflichtfeld, wirft dashUpdate nicht und schreibt gar nichts', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(daInit);
  const r = await s.evaluate(() => ({
    ohneWins:   daProbe(['pn-wins']),
    ohneBlend:  daProbe(['pn-blend']),
    ohneResult: daProbe(['pn-result'])
  }));
  await ctx.close();
  for (const [name, v] of Object.entries(r)) {
    pruefeGleich(v.wurf, null, `${name}: kein Wurf`);
    /* Der Kern: nicht nur kein Wurf, sondern auch keine halb aktualisierte
       Anzeige. Am alten Code standen hier ein bis drei geschriebene Felder. */
    pruefeGleich(v.geschrieben.length, 0, `${name}: kein Pflichtfeld geschrieben (${v.geschrieben})`);
  }
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-DA2: sind alle sechs da, schreibt dashUpdate wie bisher (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(daInit);
  const r = await s.evaluate(() => daProbe([]));
  await ctx.close();
  pruefeGleich(r.wurf, null, 'kein Wurf');
  pruefeGleich(r.geschrieben.length, 4, 'alle vier Pflichtfelder geschrieben');
  /* Die Werte sind am alten Code nachgefahren: 7 Spiele, 4 Siege = 57 %,
     Netz-Einfluss 0 % bei netMaxBlend 0, letztes Spiel ein Sieg. */
  pruefeGleich(r.gelesen['pn-games'], '7', 'Spiele');
  pruefeGleich(r.gelesen['pn-wins'], '4 (57%)', 'Siege mit Rate');
  pruefeGleich(r.gelesen['pn-blend'], '0%', 'Netz-Einfluss');
  pruefeGleich(r.gelesen['pn-result'], '✓ Sieg', 'letztes Spiel');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-DA3: pn-health und pn-warmup-bar bleiben optional (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(daInit);
  const r = await s.evaluate(() => daProbe(['pn-health', 'pn-warmup-bar']));
  await ctx.close();
  pruefeGleich(r.wurf, null, 'kein Wurf');
  pruefeGleich(r.geschrieben.length, 4, 'die vier Pflichtfelder werden trotzdem gesetzt');
  pruefeGleich(r.gelesen['pn-result'], '✓ Sieg', 'auch das letzte Feld');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-DA4: fehlt pn-games, steigt dashUpdate wie bisher frueh aus (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(daInit);
  const r = await s.evaluate(() => daProbe(['pn-games']));
  await ctx.close();
  pruefeGleich(r.wurf, null, 'kein Wurf');
  pruefeGleich(r.geschrieben.length, 0, 'nichts geschrieben');
  pruefeGleich(r.gelesen['pn-wins'], 'MARKE', 'die Markierung steht noch — der Ausstieg kam davor');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});


/* ══ TRAIN-2: der Farbwechsel verwirft den Trainingspuffer ════════════
   docs/korrektur-train2-vorabfestlegung.md, Tests nach §4. Der Farb-Handler
   wechselte state.aiColor und liess die gesammelten Beispiele der ALTEN Farbe
   im Puffer stehen; den Reward holt showFinalScore am Ende aus state.aiColor,
   und trainGame gibt ihn jedem Eintrag. Gemessen in §6: ein Zug der
   Siegerfarbe mit advantage -1.

   Zwei Vorgaben aus §4, ohne die der Test nichts wert ist:
     1. ECHTE Netzeingaben (boardToInput und forward). Mit Attrappen wie
        new Float32Array(4) rechnet _backward Unsinn, _badWeight schlaegt an,
        und trainGame laeuft in den Divergenzpfad, der reset() aufruft — der
        Test pruefte dann die Divergenz-Mechanik statt TRAIN-2.
     2. Der Wechsel laeuft ueber den ECHTEN Knopf. Eine Zuweisung an
        state.aiColor wuerde den Handler umgehen und am alten wie am neuen
        Code dasselbe tun. */
const t2Init = () => {
  /* Wie triggerAIMove (Z. 6218): state.lastMove ist ein INDEX, nicht ein
     Objekt (Z. 5737). Mit {x: state.lastMove.x} blieben x und y undefined und
     Ebene 8 (letzter Zug) leer. */
  globalThis.t2KiZug = (x, y, reqId) => {
    const lm = state.lastMove !== null ? {x: xOf(state.lastMove), y: yOf(state.lastMove)} : null;
    const inp = policyNet.boardToInput(state.board, state.aiColor, lm, state.koPoint);
    const {probs, hidden} = policyNet.forward(inp);
    state.aiRequestId = reqId;
    applyAIResult({type: 'stone', x, y}, reqId, inp, probs, hidden);
  };
  /* _backward protokollieren; das echte Training laeuft weiter, damit auch
     Divergenz und Gewichtspruefung echt bleiben. */
  globalThis.t2Horchen = () => {
    globalThis.t2Rueckwaerts = [];
    const echt = policyNet._backward.bind(policyNet);
    policyNet._backward = (inp, hidden, probs, moveIdx, advantage) => {
      globalThis.t2Rueckwaerts.push({moveIdx, advantage});
      return echt(inp, hidden, probs, moveIdx, advantage);
    };
  };
  globalThis.t2Klick = c => document.querySelector('.color-btn[data-color="' + c + '"]').click();
  globalThis.t2Zeilen = () => state.log.filter(z => /Farbwechsel/.test(z));
};

/* KI ist Weiss und zieht einmal; dann der Klick auf Schwarz. Das Brett danach:
   Schwarz 3/3, Weiss 15/3 — moveIdx 72 ist der Weiss-Zug (3·19+15). */
const t2BisWechsel = `
  state.aiEnabled = false; state.aiColor = 2;
  t2Horchen();
  placeStone(3, 3);                     /* Mensch, Schwarz */
  t2KiZug(15, 3, 101);                  /* KI, Weiss */
  const nachWeiss = {puffer: policyNet._gameBuffer.length,
                     idx: policyNet._gameBuffer.map(b => b.moveIdx)};
  t2Klick(1);                           /* KI spielt jetzt Schwarz */
  const nachWechsel = {puffer: policyNet._gameBuffer.length, farbe: state.aiColor,
                       zeilen: t2Zeilen()};
`;

test('T-F1: der Farbwechsel verwirft die Beispiele der alten Farbe, nur die neue Farbe wird gelernt', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t2Init);
  const r = await s.evaluate(`(() => {
    ${t2BisWechsel}
    t2KiZug(3, 15, 102);                /* KI, Schwarz — moveIdx 288 */
    const nachSchwarz = policyNet._gameBuffer.length;
    pass();                             /* Weiss (Mensch) passt */
    pass();                             /* Schwarz passt → Spielende, Training */
    const f = finalAreaScore();
    return {nachWeiss, nachWechsel, nachSchwarz, rueck: globalThis.t2Rueckwaerts,
            flaeche: {schwarz: f[1], weiss: f[2]}, spiele: policyNet.gamesPlayed,
            div: policyNet._divergences, gesund: policyNet._healthy,
            beendet: state.gameOver};
  })()`);
  await ctx.close();
  /* Vorbedingung: ohne diese Zeile waere ein leerer Puffer nichtssagend. */
  pruefeGleich(r.nachWeiss.puffer, 1, 'Vorbedingung: der Weiss-Zug liegt im Puffer');
  pruefeGleich(r.nachWeiss.idx[0], 72, 'und zwar als moveIdx 72 (Zug auf 15/3)');
  pruefeGleich(r.nachWechsel.farbe, 1, 'der Knopf hat die KI-Farbe auf Schwarz gestellt');
  pruefeGleich(r.nachWechsel.puffer, 0, 'der Puffer ist nach dem Wechsel LEER — das ist der Befund');
  pruefeGleich(r.nachWechsel.zeilen.length, 1, 'genau eine Protokollzeile zum Farbwechsel');
  pruefe(/1 gesammelte/.test(r.nachWechsel.zeilen[0] || ''),
         `die Zeile nennt die Zahl der verworfenen Zuege (${r.nachWechsel.zeilen[0] || '—'})`);
  pruefeGleich(r.nachSchwarz, 1, 'die neue Farbe wird normal weiter gesammelt');
  pruefeGleich(r.beendet, true, 'zwei Paesse haben die Partie beendet');
  pruefeGleich(r.flaeche.schwarz, 2, 'Schlussflaeche Schwarz 2');
  pruefeGleich(r.flaeche.weiss, 1, 'Schlussflaeche Weiss 1 — mit Komi 7,5 gewinnt Weiss');
  pruefeGleich(r.rueck.length, 1, 'genau ein Beispiel gelernt — der Weiss-Zug ist nicht dabei');
  pruefeGleich(r.rueck[0] && r.rueck[0].moveIdx, 288, 'und es ist der Schwarz-Zug (moveIdx 288)');
  pruefeGleich(r.rueck[0] && r.rueck[0].advantage, -1, 'mit dem Reward seiner eigenen Farbe (Schwarz verliert)');
  pruefeGleich(r.spiele, 1, 'eine Partie gezaehlt');
  pruefeGleich(r.div, 0, 'keine Divergenz (echte Netzeingaben, §4)');
  pruefeGleich(r.gesund, true, 'das Netz gilt als gesund');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-F2: endet die Partie direkt nach dem Wechsel, wird gar nicht gelernt', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t2Init);
  const r = await s.evaluate(`(() => {
    ${t2BisWechsel}
    pass();                             /* Schwarz (KI) passt — kein KI-Zug mehr */
    pass();                             /* Weiss passt → Spielende */
    return {nachWeiss, nachWechsel, rueck: globalThis.t2Rueckwaerts,
            spiele: policyNet.gamesPlayed, wins: policyNet.wins,
            trained: policyNet._trained, letztes: policyNet.lastResult,
            beendet: state.gameOver, div: policyNet._divergences};
  })()`);
  await ctx.close();
  pruefeGleich(r.nachWeiss.puffer, 1, 'Vorbedingung: der Weiss-Zug lag im Puffer');
  pruefeGleich(r.nachWechsel.puffer, 0, 'der Wechsel hat ihn verworfen');
  pruefeGleich(r.beendet, true, 'die Partie ist beendet');
  pruefeGleich(r.rueck.length, 0, 'kein einziges Beispiel gelernt — es gibt keines mehr');
  pruefeGleich(r.spiele, 0, 'und keine Partie gezaehlt (trainGame kehrt vor dem Zaehlen um)');
  pruefeGleich(r.wins, 0, 'kein Sieg gezaehlt');
  pruefeGleich(r.letztes, null, 'lastResult bleibt leer');
  pruefeGleich(r.trained, true, '_trained ist gesetzt — die Partie gilt als abgeschlossen');
  pruefeGleich(r.div, 0, 'keine Divergenz');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-F3: ein Klick auf die schon aktive Farbe verwirft nichts (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t2Init);
  const r = await s.evaluate(`(() => {
    state.aiEnabled = false; state.aiColor = 2;
    placeStone(3, 3);
    t2KiZug(15, 3, 101);
    const vor = policyNet._gameBuffer.length;
    t2Klick(2);                         /* Weiss ist schon aktiv */
    return {vor, nach: policyNet._gameBuffer.length, farbe: state.aiColor,
            zeilen: t2Zeilen().length};
  })()`);
  await ctx.close();
  pruefeGleich(r.vor, 1, 'Vorbedingung: ein Beispiel im Puffer');
  pruefeGleich(r.nach, 1, 'der Puffer bleibt unangetastet');
  pruefeGleich(r.farbe, 2, 'die Farbe bleibt Weiss');
  pruefeGleich(r.zeilen, 0, 'keine Protokollzeile');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-F4: ohne Farbwechsel laeuft das Training unveraendert (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t2Init);
  const r = await s.evaluate(`(() => {
    state.aiEnabled = false; state.aiColor = 2;
    t2Horchen();
    placeStone(3, 3);
    t2KiZug(15, 3, 101);                /* moveIdx 72 */
    placeStone(4, 4);
    t2KiZug(16, 4, 102);                /* moveIdx 92 */
    const vorEnde = policyNet._gameBuffer.length;
    pass(); pass();
    const f = finalAreaScore();
    return {vorEnde, rueck: globalThis.t2Rueckwaerts, spiele: policyNet.gamesPlayed,
            div: policyNet._divergences, zeilen: t2Zeilen().length,
            flaeche: {schwarz: f[1], weiss: f[2]}};
  })()`);
  await ctx.close();
  pruefeGleich(r.vorEnde, 2, 'zwei KI-Zuege im Puffer');
  pruefeGleich(r.zeilen, 0, 'keine Farbwechsel-Zeile');
  pruefeGleich(r.rueck.length, 2, 'beide Beispiele gelernt');
  pruefeGleich(JSON.stringify(r.rueck.map(e => e.moveIdx)), '[72,92]', 'in der Reihenfolge des Puffers');
  pruefeGleich(r.flaeche.weiss, 2, 'Schlussflaeche Weiss 2 — mit Komi 7,5 gewinnt Weiss');
  pruefeGleich(r.rueck[0] && r.rueck[0].advantage, 1, 'Weiss hat gewonnen: advantage +1');
  pruefeGleich(r.rueck[1] && r.rueck[1].advantage, 1, 'derselbe advantage fuer beide — hier richtig, beide sind Weiss');
  pruefeGleich(r.spiele, 1, 'eine Partie gezaehlt');
  pruefeGleich(r.div, 0, 'keine Divergenz');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-F5: ein Undo nach dem Verwerfen fuellt den Puffer nicht mit Luecken (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(t2Init);
  const r = await s.evaluate(`(() => {
    ${t2BisWechsel}
    undo();                             /* nimmt den KI-Zug auf 15/3 zurueck */
    const buf = policyNet._gameBuffer;
    return {nachUndo: buf.length, loecher: Array.from(buf).filter(e => !e || !e.inp).length,
            zuege: state.moveCount, stein: state.board[idx(15, 3)]};
  })()`);
  await ctx.close();
  /* Absichtlich ohne Pruefung des Verwerfens selbst — das tut T-F1. Hier geht
     es allein um den length-Zweig in undo (Z. 5705 f.): er kuerzt nur, wenn
     der Puffer LAENGER ist als der gemerkte Stand, und darf ihn nie
     verlaengern. Darum besteht dieser Test an beiden Staenden. */
  pruefeGleich(r.stein, 0, 'Vorbedingung: das Undo hat den KI-Zug vom Brett genommen');
  pruefeGleich(r.zuege, 1, 'ein Zug zurueckgenommen');
  pruefeGleich(r.nachUndo, 0, 'der Puffer ist leer');
  pruefeGleich(r.loecher, 0, 'kein Eintrag ist undefined — length hat nicht verlaengert');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});


/* ══ BR-1: der Reproduktions-Schnappschuss ist der Worker-Request ══════
   docs/passregel-wege-nachtrag-vorabfestlegung.md, Tests nach §4.

   state.lastAIRequest verspricht im Kommentar an buildBugReport, der letzte
   Worker-Request zu sein, trug aber reqId und extra nicht. Ohne extra laeuft
   eine Nachstellung OHNE die Versuchsregel: gemessen (§2.2) ueber einen
   anderen Zweig, mit anderem info und ohne versuch-Feld.

   Vorgabe aus §4: Der Schnappschuss muss ueber den ECHTEN Weg entstehen
   (triggerAIMove mit workerDead, damit er gebaut wird), nicht von Hand
   nachgebaut -- ein nachgebautes Objekt enthielte am alten wie am neuen Code
   dasselbe und pruefte nichts. */
const brInit = () => {
  /* Zwei Aufrufe mit identischem Zufallsstrom, sonst sind zwei Suchen auf
     derselben Stellung nicht vergleichbar. */
  globalThis.brSaat = () => {
    let s = 42;
    Math.random = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
  };
  globalThis.brRuf = (snap, extra) => {
    brSaat();
    return getAIMove(new Uint8Array(snap.board), snap.aiColor, new Set(snap.histHashes),
      {...snap.captures}, snap.mc, snap.difficulty || 'hard', 1, snap.koPoint, snap.lastMove, extra);
  };
  /* Weiss besitzt das Brett mit zwei Augen, Schwarz hat gerade gepasst:
     genau der Fall, in dem die Versuchsregel greift. Kuenstlich, aber die
     Regel haengt nur an gegnerPasste und am Vorsprung. */
  globalThis.brStellung = () => {
    for (let i = 0; i < 361; i++) state.board[i] = 2;
    state.board[idx(0, 0)] = 0; state.board[idx(18, 18)] = 0;
    state.aiColor = 2; state.currentPlayer = 2;
    state.consecutivePasses = 1; state.moveCount = 200;
    PARAMS.mctsFixedSims = 20; PARAMS.adaptiveBudgetEnabled = 0;
  };
};

test('T-BR1: der Schnappschuss des Schwer-Wegs traegt extra und reqId, die Nachstellung trifft den Zug', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(brInit);
  const r = await s.evaluate(() => {
    const echtesRandom = Math.random;
    PARAMS.passNachGegnerpass = 1;
    brStellung();
    state.aiDifficulty = 'hard';
    state.aiEnabled = true; state.workerDead = true;   /* erzwingt den Schnappschuss-Zweig */
    triggerAIMove();
    const snap = state.lastAIRequest;
    const schluessel = Object.keys(snap);
    const mitExtra = brRuf(snap, passExtra());
    const ausSnap  = brRuf(snap, snap.extra);
    Math.random = echtesRandom;
    return {schluessel,
            extra: snap.extra === undefined ? null : snap.extra,
            reqIdTyp: typeof snap.reqId, reqId: snap.reqId,
            mitExtra: {typ: mitExtra.type, info: mitExtra.info || null,
                       versuch: mitExtra.versuch ? {pass: mitExtra.versuch.pass} : null},
            ausSnap:  {typ: ausSnap.type, info: ausSnap.info || null,
                       versuch: ausSnap.versuch ? {pass: ausSnap.versuch.pass} : null}};
  });
  await ctx.close();
  /* Vorbedingung: die Regel greift in dieser Stellung ueberhaupt. */
  pruefe(r.mitExtra.versuch !== null, 'Vorbedingung: der echte Aufruf wendet die Versuchsregel an');
  pruefeGleich(r.mitExtra.typ, 'pass', 'und sie fuehrt zum Pass');
  /* Der Befund. */
  pruefe(r.extra !== null, 'der Schnappschuss traegt extra — das ist der Befund');
  pruefeGleich(r.extra && r.extra.gegnerPasste, true, 'extra.gegnerPasste ist gesetzt');
  pruefe(r.extra && typeof r.extra.wertung === 'string', 'extra.wertung ist dabei');
  pruefeGleich(r.extra && r.extra.komi, 7.5, 'extra.komi ist dabei');
  pruefeGleich(r.reqIdTyp, 'number', 'der Schnappschuss traegt reqId');
  pruefe(r.reqId > 0, `reqId ist die echte Kennung (${r.reqId})`);
  pruefe(r.schluessel.includes('extra') && r.schluessel.includes('reqId'),
         `beide Felder in den Schluesseln (${r.schluessel.join(',')})`);
  /* Und die Nachstellung trifft jetzt denselben Zweig. */
  pruefeGleich(r.ausSnap.typ, r.mitExtra.typ, 'die Nachstellung liefert denselben Zugtyp');
  pruefeGleich(r.ausSnap.info, r.mitExtra.info, 'dieselbe Begruendung — nicht mehr „eigene Augen“');
  pruefe(r.ausSnap.versuch !== null, 'und das versuch-Feld ist da');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-BR2: der Schnappschuss des Leicht/Mittel-Wegs traegt extra und reqId', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(brInit);
  const r = await s.evaluate(async () => {
    state.aiEnabled = false; state.aiColor = 2; state.aiDifficulty = 'easy';
    placeStone(3, 3);                      /* Mensch, Schwarz → Weiss am Zug */
    state.aiEnabled = true;
    /* Der Leicht/Mittel-Zweig steckt in einem setTimeout (Z. 6332): nach dem
       synchronen Aufruf gibt es den Schnappschuss noch nicht. Darauf warten,
       nicht raten. */
    triggerAIMove();
    for (let i = 0; i < 100 && !state.lastAIRequest; i++)
      await new Promise(f => setTimeout(f, 50));
    const snap = state.lastAIRequest;
    if (!snap) return {fehlt: true};
    return {schluessel: Object.keys(snap),
            extra: snap.extra === undefined ? null : snap.extra,
            reqIdTyp: typeof snap.reqId, stufe: snap.difficulty,
            zuege: state.moveCount};
  });
  await ctx.close();
  pruefe(!r.fehlt, 'der Schnappschuss ist innerhalb von 5 s entstanden');
  pruefeGleich(r.stufe, 'easy', 'Vorbedingung: der Schnappschuss ist der des Leicht-Wegs');
  pruefeGleich(r.zuege, 2, 'und die KI hat wirklich gezogen');
  pruefe(r.extra !== null, 'er traegt extra');
  pruefeGleich(r.extra && r.extra.gegnerPasste, false, 'gegnerPasste ist hier false (niemand hat gepasst)');
  pruefeGleich(r.reqIdTyp, 'number', 'und reqId');
  pruefe(r.schluessel.includes('extra') && r.schluessel.includes('reqId'),
         `beide Felder in den Schluesseln (${r.schluessel.join(',')})`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-BR3: mit dem Default-Schalter aendert die Nachstellung nichts (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(brInit);
  const r = await s.evaluate(() => {
    const echtesRandom = Math.random;
    brStellung();                          /* Schalter bleibt auf dem Default */
    state.aiDifficulty = 'hard';
    state.aiEnabled = true; state.workerDead = true;
    triggerAIMove();
    const snap = state.lastAIRequest;
    const a = brRuf(snap, passExtra());
    const b = brRuf(snap, snap.extra);
    Math.random = echtesRandom;
    return {schalter: PARAMS.passNachGegnerpass,
            a: {typ: a.type, info: a.info || null, x: a.x ?? null, y: a.y ?? null, versuch: !!a.versuch},
            b: {typ: b.type, info: b.info || null, x: b.x ?? null, y: b.y ?? null, versuch: !!b.versuch}};
  });
  await ctx.close();
  pruefeGleich(r.schalter, 0, 'Vorbedingung: die Versuchsregel ist aus (Default)');
  pruefeGleich(r.b.typ, r.a.typ, 'derselbe Zugtyp');
  pruefeGleich(r.b.x, r.a.x, 'derselbe Punkt (x)');
  pruefeGleich(r.b.y, r.a.y, 'derselbe Punkt (y)');
  pruefeGleich(r.b.info, r.a.info, 'dieselbe Begruendung');
  pruefeGleich(r.a.versuch, false, 'kein versuch-Feld, weil der Schalter aus ist');
  pruefeGleich(r.b.versuch, false, 'auf beiden Wegen nicht');
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

test('T-BR4: der Fehlerbericht bleibt gueltiges JSON und traegt bewusst kein netPriors (Kontrolle)', async () => {
  if (!(await vorbereiten())) return 'skip';
  const {s, ctx, fehler} = await seite(brInit);
  const r = await s.evaluate(() => {
    brStellung();
    state.aiDifficulty = 'hard';
    state.aiEnabled = true; state.workerDead = true;
    triggerAIMove();
    const roh = buildBugReport();
    let b = null, fehler = null;
    try { b = JSON.parse(roh); } catch (e) { fehler = (e && e.message) || String(e); }
    const rep = (b && b.reproduktion) || {};
    return {laenge: roh.length, parseFehler: fehler,
            hatReproduktion: !!(b && b.reproduktion),
            schalterImBericht: rep.params ? rep.params.passNachGegnerpass : 'fehlt',
            hatNetPriors: Object.prototype.hasOwnProperty.call(rep, 'netPriors'),
            hatBrett: Array.isArray(rep.board)};
  });
  await ctx.close();
  pruefeGleich(r.parseFehler, null, 'der Bericht ist gueltiges JSON');
  pruefeGleich(r.hatReproduktion, true, 'mit einem Reproduktions-Teil');
  pruefeGleich(r.hatBrett, true, 'der das Brett enthaelt');
  pruefeGleich(r.schalterImBericht, 0, 'PARAMS im Bericht nennt den Schalter (Default 0)');
  /* Bewusste Entscheidung aus §3: die 361 Priors waeren 7775 Zeichen gegen
     8106 des ganzen Berichts. Der Kommentar an buildBugReport nennt die
     Grenze; dieser Test haelt sie fest, damit sie nicht unbemerkt kippt. */
  pruefeGleich(r.hatNetPriors, false, 'und bewusst KEIN netPriors (§3)');
  pruefe(r.laenge > 500 && r.laenge < 60000, `der Bericht bleibt handlich (${r.laenge} Zeichen)`);
  pruefeGleich(fehler.length, 0, `keine Seitenfehler ${fehler[0] || ''}`);
});

laufeTests('Review-Korrekturen im echten Browser').then(ok => {
  if (!playwright || !chromePfad)
    console.log(`\n  ${PFLICHT ? 'FEHLT' : 'Übersprungen'}: ${!playwright ? 'Playwright' : 'Chromium'} nicht gefunden.`);
  if (browser) browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
