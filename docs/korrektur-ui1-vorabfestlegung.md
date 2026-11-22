# Korrektur UI-1: Vorabfestlegung

**Stand: 22.11.2026. Status: umgesetzt (§8), Abnahme gültig.** Befund aus `docs/bughunt-wiederholung.md` §5 (UI-1), Stand
am heutigen Code bestätigt in `docs/bughunt-20261116.md` §3 und §8. Go von Hazeberry am 22.11.2026:
„UI-1 Vorabfestlegung".

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Die Engine bleibt unberührt

Betroffen sind zwei Stellen im Hauptskript: der Handler des KI-Knopfs und der Eingang von `fallbackToMainThread`. Die
Blöcke `shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch**. Die Prüfsummen aus
`docs/korrektur-d1-w1-vorabfestlegung.md` §1 gelten am Stand `dc2c1c9` unverändert (selbst nachgerechnet):

| Block | SHA-256 |
|---|---|
| `shared-go-logic` | `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66` |
| `worker-ai` | `f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9` |
| `policy-net` | `56a5d6c0eb3f122425560fc55ebfb44ee70eda8fb47406a4f354928d5d93a475` |

Kein Schalter, kein Messlauf. Solange niemand die KI während einer Rechnung abschaltet, läuft derselbe Code mit
denselben Aufrufen: Die eine Einfügung hängt an `if (!state.aiEnabled)`, die andere am Abschalten selbst. Ein
Spielstand entsteht nur in dem Fall anders, der heute einen unerwünschten Zug setzt.

## 2. Befund

Zeilen am Stand `dc2c1c9` (`index.html` SHA-256 `e9f99467…`).

Der Handler des KI-Knopfs (Z. 6744 bis 6750) sieht so aus:

```js
document.getElementById('btn-ai-toggle').addEventListener('click',function(){
  state.aiEnabled=!state.aiEnabled;
  this.textContent=state.aiEnabled?'KI deaktivieren':'KI aktivieren';
  this.classList.toggle('active-mode',state.aiEnabled);
  updateAIStatus();
  if(state.aiEnabled&&!state.gameOver&&!humanTurn())triggerAIMove();
});
```

Er erhöht `state.aiRequestId` **nicht**, setzt `state.aiThinking` **nicht** zurück und ruft `updateUndoButton()`
**nicht**. Die Stufen- und Farbknöpfe (Z. 6757, 6764) erhöhen die Kennung dagegen.

Daraus folgen zwei Dinge, beide gemessen (§6):

1. **Die KI setzt nach dem Abschalten noch einen Stein.** Die laufende Anfrage kommt zurück, `applyAIResult` prüft
   `reqId` und den Spieler am Zug, aber nie `aiEnabled` (Z. 5891 ff.) — und weil die Kennung unverändert ist, gilt die
   Antwort als aktuell.
2. **Rückgängig bleibt gesperrt.** `updateUndoButton` sperrt bei `state.aiThinking` (Z. 5707). Das bleibt `true`, bis
   die Antwort eintrifft. Die Anzeige sagt „KI ist deaktiviert", der Knopf gehorcht nicht. Dieser Teil steht in
   `docs/bughunt-wiederholung.md` noch nicht; er fiel bei der Entwurfsprüfung auf.

### Die Zustellwege im Einzelnen

Eine Antwort erreicht das Brett auf diesen Wegen. „Kennung" heißt: der Weg prüft `reqId !== state.aiRequestId`.

| Weg | Stelle | Übergebene Kennung | durch die Kennung geschützt? |
|---|---|---|---|
| Worker antwortet | `onmessage` → `applyAIResult`, Z. 6123 | `e.data.reqId` (die der Anfrage) | ja |
| Worker meldet eigenen Fehler | `onmessage` → `fallbackToMainThread`, Z. 6119 | `e.data.reqId` | ja |
| **Worker stürzt ab** | `onerror` → `fallbackToMainThread`, Z. 6152 | **`state.aiRequestId`** | **nein** |
| Worker gilt als tot | `triggerAIMove`, Z. 6219 | `reqId` der neuen Anfrage | ja (`triggerAIMove` prüft `aiEnabled` am Eingang) |
| Watchdog | `triggerAIMove`, Z. 6285 | `reqId` | ja |
| Worker nicht verfügbar | `catch` in `triggerAIMove`, Z. 6293 | `reqId` | ja |
| Leicht und Mittel | Zeitgeber in `triggerAIMove`, Z. 6337 | `reqId` | ja |

**Der Weg über `onerror` ist der Grund, warum das Erhöhen der Kennung allein nicht genügt.** Er übergibt die
*aktuelle* Kennung, nicht die der abgebrochenen Anfrage; die Prüfung in `fallbackToMainThread` (Z. 6055) kann dort
also nie greifen. Gemessen: Der alte Code setzt auf diesem Weg einen Stein, auch wenn die Kennung erhöht wurde (§6).

### Was der Befund nicht sagt

- Ein Auslöser aus dem Spiel heraus ist der Klick selbst; eine Partie, in der das geschehen ist, ist nicht
  dokumentiert. Die Folge für eine laufende Partie ist, dass ein Zug auf dem Brett steht, den niemand wollte.
- Ob jemand nach dem Abschalten weiterzieht und die alte Antwort dann auf ein **verändertes** Brett trifft, ist nicht
  geprüft. `applyAIResult` würde den Zug über `placeStone` prüfen und bei einem besetzten Punkt auf den Notzug
  ausweichen; der Zug wäre also legal, aber für die Stellung sinnlos. Das ist eine **Hypothese**, kein Messwert.
- UI-1 ist von W-1 unberührt geblieben: W-1 hat nur die Warteschlange beim Wieder-Einschalten entschärft
  (`docs/bughunt-20261116.md` §7). In W-1c steht `state.aiRequestId` deshalb weiter auf 6 (§8 dort).

## 3. Änderung

Zwei Einfügungen, nichts wird entfernt.

**(a) Abschalten verwirft die laufende Anfrage** (Handler des KI-Knopfs):

```js
  this.classList.toggle('active-mode',state.aiEnabled);
  /* Abschalten verwirft die laufende Anfrage: ohne das erhöhte aiRequestId
     gilt ihre Antwort als aktuell und setzt noch einen Stein; ohne
     aiThinking=false bleibt Rückgängig gesperrt (UI-1,
     docs/korrektur-ui1-vorabfestlegung.md). */
  if(!state.aiEnabled){state.aiRequestId++;state.aiThinking=false;updateUndoButton();}
  updateAIStatus();
```

Die Zeile steht **vor** `updateAIStatus()`, damit die Anzeige den neuen Zustand sieht.

**(b) Der synchrone Rückfall rechnet nicht für eine abgeschaltete KI** (`fallbackToMainThread`, nach der
Kennungsprüfung in Z. 6055):

```js
  setTimeout(() => {
    if (reqId !== state.aiRequestId) return;
    /* Der Weg über onerror (Z. 6152) übergibt die AKTUELLE Kennung, die
       Prüfung darüber kann dort nie greifen. Ohne das hier rechnet der
       Hauptthread für eine abgeschaltete KI und setzt ihren Zug (UI-1). */
    if (!state.aiEnabled) { state.aiThinking = false; updateAIStatus(); updateUndoButton(); return; }
    let r;
```

Damit sind alle sieben Wege aus §2 geschlossen: (b) deckt die fünf Fallback-Wege ab, (a) die beiden, die direkt zu
`applyAIResult` führen.

**Unverändert:** `applyAIResult`, `cleanupWorker`, der Worker selbst, die Stufen- und Farbknöpfe, der Watchdog,
`triggerAIMove` im Übrigen. Die Engine ohnehin (§1).

**Bewusst so:**
- **Der Worker rechnet nach dem Abschalten weiter**, bis er fertig ist; seine Antwort wird verworfen. Das kostet
  Rechenzeit, die niemand nutzt. Dafür bleibt das Verhalten beim Wieder-Einschalten genau das, das die Korrektur W-1
  festgelegt hat (Neustart statt Warteschlange, geprüft durch T-W1).
- **`aiThinking` wird im Handler gesetzt, nicht in `applyAIResult`.** Der Kommentar in `applyAIResult` (Z. 5893 ff.)
  verbietet es ausdrücklich, `aiThinking` dort für eine fremde Anfrage anzufassen: es gehört dem neueren Request. Beim
  Abschalten gibt es keinen neueren Request, und der Handler weiß das; `applyAIResult` nicht.

**Erwogen und verworfen:**
- *Zusätzlich `if (!state.aiEnabled)` am Anfang von `applyAIResult`.* Das wäre der naheliegende Gürtel zum
  Hosenträger und war der erste Entwurf. Er **bricht zwei bestehende Browser-Tests** („PolicyNet-Puffer…" und
  „Aufgabe der KI…"), die `state.aiEnabled = false` setzen und `applyAIResult` unmittelbar als Werkzeug aufrufen
  (gemessen, §6). Die Prüfung ist dort also zu grob, und die bestehenden Tests sollen unverändert bleiben.
- *Den Worker beim Abschalten beenden (`cleanupWorker()`).* Das würde die Rechnung wirklich abbrechen und auf dem
  Handy Strom sparen. Es ändert aber die Zählung, auf der T-W1 beruht: `triggerAIMove` zählt `workerNeustarts` nur,
  wenn noch ein Worker mit laufender Anfrage da ist (Z. 6226), und nach `cleanupWorker` ist `state.aiWorker` `null`.
  T-W1 erwartet nach 20-mal aus und an genau 20 Neustarts und würde fehlschlagen. Das berührt die Abnahme von W-1 und
  gehört, wenn überhaupt, in einen eigenen Punkt. *Gelesen, nicht gemessen.*
- *Nur `aiThinking` zurücksetzen, ohne die Kennung zu erhöhen.* Dann wäre Rückgängig frei, der Stein käme aber
  weiterhin — der Befund wäre halb behoben und schwerer zu erkennen.

**Nicht Teil der Korrektur:** UI-2, UI-3, TRAIN-1, TRAIN-2, NET-1, GTP-1 bis GTP-3, H-1. Die Rechenzeit des
weiterlaufenden Workers. Das Verhalten bei `terminate` (offener Punkt in `docs/bughunt-wiederholung.md` §5).

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`, die Zeile in `tests/README.md` wird ergänzt. Vorbereitung wie bei den
W-Tests über `schwerVorbereiten`, aber mit KI **Weiß**: So liegt ein Menschenzug im Rückgängig-Stapel, und der
gesperrte Knopf ist prüfbar (bei KI Schwarz im ersten Zug ist der Stapel leer und der Knopf ohnehin gesperrt).

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-U1 | Schwer, KI Weiß, Mensch setzt, KI rechnet, ein Klick auf „KI deaktivieren": sofort danach rechnet die KI nicht mehr und Rückgängig ist frei; nach 2,5 s steht kein weißer Stein, Zugzähler 1, keine Seitenfehler | scheitert: weißer Stein, Zugzähler 2; sofort danach `aiThinking` true und Rückgängig gesperrt |
| T-U2 | Dasselbe, aber der Worker stürzt nach dem Abschalten ab (`onerror` von Hand mit `{message:'Testabsturz'}`): kein weißer Stein, Zugzähler 1 | scheitert: weißer Stein, Zugzähler 2 |
| T-U3 | Abschalten während der Rechnung, dann wieder einschalten: die KI zieht genau einmal, der Worker gilt nicht als tot, kein Watchdog | besteht (Kontrolle; W-1 hat diesen Weg schon geregelt) |
| T-U4 | Kein Klick, sonst gleicher Ablauf: die KI zieht, Status „KI aktiv · Weiß · Schwer", Zugzähler 2 | besteht (Kontrolle des normalen Wegs) |

T-U1 und T-U2 müssen am alten Code fehlschlagen und am neuen bestehen. T-U3 und T-U4 bestehen an beiden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1.
2. T-U1 und T-U2 schlagen am alten Code fehl und bestehen am neuen; T-U3 und T-U4 bestehen an beiden.
3. **Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen am neuen Code** — heute sind
   das 31 ausgeführte Tests aus 29 `test(`-Aufrufen (T-R1 und T-R2 entstehen in einer Schleife über Leicht und
   Mittel), namentlich die beiden PolicyNet-Tests aus §3 und T-W1 bis T-W4.
4. `node tests/run.js` lokal grün, CI grün.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Die Ausgabe
   wird als `docs/daten/bughunt-20261116/nach-ui1.json` abgelegt, mit Konsole.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

Das Prüfskript deckt UI-1 **nicht** ab (es prüft nur die 13 Fälle vom 16.11.). Punkt 5 ist eine Kontrolle gegen
Rückschritte, kein Nachweis der Korrektur; den führen T-U1 und T-U2.

## 6. Prüfung des Entwurfs am Prototyp (22.11.2026)

Die Änderung aus §3 wurde in eine Kopie der `index.html` (Stand `dc2c1c9`) **außerhalb des Repos** eingesetzt und
lokal geprüft: Chromium 153.0.8010.12 headless, Node v22.23.5, nur Seitenaufrufe auf `127.0.0.1`. Der Prototyp ist
nicht die Umsetzung. Aufbau je Fall: Schwer mit `aiTimeBudget` 300 und ausgeschaltetem adaptiven Budget, KI Weiß,
Mensch setzt D16, `triggerAIMove`, dann der Klick — alles in einem Aufruf, damit die Rechnung noch läuft.

**Prüfsummen:** Die Engine-Blöcke des Prototyps haben die Prüfsummen aus §1.

**Fall U1a, Klick auf „KI deaktivieren" während der Rechnung:**

| | alter Code | Prototyp |
|---|---|---|
| sofort danach: `aiThinking` | `true` | `false` |
| sofort danach: Rückgängig | gesperrt | frei |
| sofort danach: `aiRequestId` | 1 (unverändert) | 2 |
| nach 2,5 s: Zugzähler | **2** | 1 |
| nach 2,5 s: weiße Steine | **1** | 0 |
| Seitenfehler | keine | keine |

In beiden Ständen zeigt die Statuszeile „KI ist deaktiviert". Der alte Code setzt den Stein also, ohne dass die
Anzeige es ankündigt.

**Fall über `onerror`** (Abschalten, dann `onerror` mit `{message:'Testabsturz'}`): alter Code Zugzähler 2 und ein
weißer Stein; Prototyp Zugzähler 1 und kein weißer Stein. Hier greift allein die Prüfung aus §3 (b) — die Kennung ist
auf beiden Seiten gleich, weil dieser Weg `state.aiRequestId` übergibt.

**Kontrolle ohne Klick:** in beiden Ständen gleich — Zugzähler 2, ein weißer Stein, Status „KI aktiv · Weiß · Schwer",
keine Seitenfehler.

**Bestehende Tests:** `node tests/browser-ui.js <prototyp>` ergibt **31 bestanden, 0 fehlgeschlagen**.

**Der verworfene erste Entwurf** (zusätzlich `if (!state.aiEnabled)` am Anfang von `applyAIResult`) ergab in demselben
Lauf **29 bestanden, 2 fehlgeschlagen**: „PolicyNet-Puffer: erst nach gelungenem Zug…" („gelungener KI-Zug im Puffer:
erwartet 1, bekommen 0") und „Aufgabe der KI: Training mit -1…" („genau ein Training, als Niederlage: erwartet [-1],
bekommen []"). Beide Tests setzen selbst `state.aiEnabled = false` und rufen `applyAIResult` direkt auf. Deshalb steht
in §3 die Prüfung in `fallbackToMainThread` und nicht in `applyAIResult`.

**Grenzen:** Nur Chromium 153 headless, eine Umgebung. Der Absturzfall ist mit einem von Hand gerufenen `onerror`
geprüft, nicht mit einem echten Worker-Absturz. Der Fall „Mensch zieht nach dem Abschalten weiter" ist nicht geprüft
(§2). Kein Handy, kein Firefox, keine Partie, keine Spielstärkemessung.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §5 und eine Zeile in `docs/bughunt-20261116.md`.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 8. Nachtrag: Umsetzung und Abnahme (22.11.2026)

Hazeberry, nach grüner CI von #341: „Go". Die Umsetzung folgt §3 und §4 ohne Abweichung. Geändert sind `index.html`
(Handler des KI-Knopfs, Eingang von `fallbackToMainThread`), `tests/browser-ui.js` (T-U1 bis T-U4 und der
Kommentarkopf) und `tests/README.md`.

**Abnahme nach §5:**

1. **Prüfsummen:** Die drei Engine-Blöcke haben die Prüfsummen aus §1, nach der Änderung nachgerechnet. Erfüllt.
2. **Neue Tests:** Am alten Code (`index.html` SHA-256 `e9f99467…`, Stand `1320f05`) schlagen T-U1 und T-U2 fehl, T-U3
   und T-U4 bestehen dort (33 bestanden, 2 fehlgeschlagen). Am neuen Code bestehen alle 35 Tests der Datei
   (0 fehlgeschlagen). Erfüllt.
   - T-U1 scheitert am alten Code an der ersten Prüfung nach dem Klick: „sofort nach dem Klick rechnet die KI nicht
     mehr". Der Rahmen bricht beim ersten Fehler ab, deshalb kommt der Test dort nicht mehr bis zur Steinprüfung; dass
     der Stein gesetzt wird, ist in §6 gemessen und in T-U2 auch am alten Code sichtbar.
   - T-U2 scheitert am alten Code an „kein weißer Stein auf dem Brett: erwartet 0, bekommen 1".
3. **Bestehende Tests:** unverändert übernommen; die 31 bestehen am neuen Code, die beiden PolicyNet-Tests und T-W1
   bis T-W4 eingeschlossen. Erfüllt.
4. **Testsuite:** `node tests/run.js` mit Browser-Tests, Ergebnis siehe unten. CI im PR.
5. **Prüfskript:** `auswertung/bughunt-20261116/pruefung.js` am neuen Code: 1 von 13 reproduziert, nämlich B-2 — das
   Soll. Daten: `docs/daten/bughunt-20261116/nach-ui1.json`, Konsole `nach-ui1-konsole.txt`. Erfüllt.

Neue `index.html`: SHA-256 `c5ba06077f6ad6452068743453cc53b9eff9cfbee2dee2deed4c7af9f0ed542d`.

**Grenzen:** Nur Chromium 153 headless. Der Absturzfall in T-U2 ruft `onerror` von Hand; ein echter Worker-Absturz
nach dem Abschalten ist nicht erzeugt. Der Fall „Mensch zieht nach dem Abschalten weiter" bleibt ungeprüft (§2). Kein
Handy, kein Firefox, keine Partie, keine Spielstärkemessung.
