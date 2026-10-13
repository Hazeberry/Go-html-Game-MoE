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

/* Neue Seite; init läuft vor allen Skripten der Seite. */
async function seite(init, initArg) {
  const ctx = await browser.newContext();
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

laufeTests('Review-Korrekturen im echten Browser').then(ok => {
  if (!playwright || !chromePfad)
    console.log(`\n  ${PFLICHT ? 'FEHLT' : 'Übersprungen'}: ${!playwright ? 'Playwright' : 'Chromium'} nicht gefunden.`);
  if (browser) browser.close();
  if (server) server.close();
  process.exit(ok ? 0 : 1);
});
