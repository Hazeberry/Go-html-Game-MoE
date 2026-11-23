# Korrektur TRAIN-2: Vorabfestlegung

**Stand: 23.11.2026. Status: umgesetzt, Abnahme gültig (§8).** Befund aus `docs/bughunt-wiederholung.md` §4 und §5
(TRAIN-2); Stand der Reihe in `docs/bughunt-20261116.md` §3.

**Berichtigung zur Übergabe:** Die Varianten (a) bis (d) in `docs/bughunt-20261116.md` §7 gehören zu **TRAIN-1**
(Undo nach dem Training), nicht zu TRAIN-2. Für TRAIN-2 nennt `docs/bughunt-wiederholung.md` §5 genau einen
möglichen Weg („Verwerfen des Puffers beim Farbwechsel wäre eine mögliche korrekte Lösung"). Die Varianten in §3
dieses Docs sind daher neu aufgeschrieben.

**Zur Entscheidung:** Hazeberry hat am 23.11.2026 autonomes Weiterarbeiten freigegeben. Die Wahl der Variante habe
ich selbst getroffen; sie steht in §3 offen mit den Gründen gegen die Alternativen, damit sie umkehrbar ist. Dieses
Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge.

## 1. Grundsatz: eine Stelle im Hauptskript, die Engine und das Netz unberührt

Betroffen ist **eine** Stelle: der Farb-Handler im Hauptskript (Z. 6793 bis 6798). Die Blöcke `shared-go-logic`,
`worker-ai` und **auch `policy-net`** bleiben **byteidentisch**. Prüfsummen am Stand `ee8ce5d`
(`index.html` SHA-256 `fd58d14f…`), nachgerechnet am 23.11.2026:

| Block | SHA-256 |
|---|---|
| `shared-go-logic` | `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66` |
| `worker-ai` | `f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9` |
| `policy-net` | `14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190` |

Die maßgebliche Liste pflegt `docs/korrektur-d1-w1-vorabfestlegung.md` §1; die drei Werte stimmen mit den dortigen
Nachträgen überein.

`PARAMS_DEFAULT` bleibt gleich. Kein Schalter, kein Messlauf. **Kein Engine-Vergleich nötig:** `ladeEngine`
(`auswertung/diagnose/wurzel-replay.js`) lädt `shared-go-logic` und `worker-ai`; beide sind unberührt. Bei
`netMaxBlend` 0 (Default) wirkt das PolicyNet ohnehin nicht auf die Zugwahl
(`docs/korrektur-h1-vorabfestlegung.md` §2) — die Zugwahl ändert sich hier auch mit Blend nicht, weil nur das
Sammeln von Trainingsbeispielen berührt wird.

## 2. Befund

Zeilen am Stand `ee8ce5d`.

**Gelesen.** Der Farb-Handler (Z. 6793 bis 6798) setzt `state.aiColor` und fasst den Trainingspuffer nicht an:

```js
document.querySelectorAll('.color-btn').forEach(btn=>btn.addEventListener('click',function(){
  if(parseInt(this.dataset.color)===state.aiColor&&state.aiThinking)return;
  document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('active'));
  this.classList.add('active');state.aiColor=parseInt(this.dataset.color);updateAIStatus();
  if(state.aiEnabled&&!state.gameOver&&!humanTurn()){state.aiRequestId++;triggerAIMove();}
}));
```

Die Puffereinträge tragen **keine Farbe** (`applyAIResult`, Z. 5935 bis 5940): `{inp, probs, hidden, moveIdx}`.
Den Reward holt `showFinalScore` am Spielende aus `state.aiColor` (Z. 5903 bis 5909), der Aufgabe-Pfad nimmt
pauschal `-1` (Z. 5969). `trainGame` rechnet daraus **einen** `advantage` und gibt ihn jedem Eintrag
(Z. 7252 bis 7257).

Entscheidend für die Einordnung: `boardToInput` (Z. 7051) ist **perspektivisch**. Die Ebenen 0 und 1 sind „eigene"
und „gegnerische" Steine relativ zu `color`, ebenso Ebene 10; eine absolute Schwarz-Weiß-Information und ein Komi
stehen nicht in der Eingabe. Ein Beispiel aus der Zeit als Weiß ist also ein **gültiges** Beispiel — es braucht nur
das Vorzeichen seiner eigenen Farbe. Genau das bekommt es nicht.

**Gemessen** (§6, lokale Probe am unkorrigierten Stand): Nach einem KI-Zug als Weiß, einem Klick auf „Schwarz", einem
KI-Zug als Schwarz und zwei Pässen ruft `trainGame` `_backward` **zweimal mit demselben `advantage` −1** auf — auch
für den Weiß-Zug, obwohl Weiß die Partie mit 8,5 zu 2 gewonnen hat. Das Vorzeichen ist für diesen Eintrag also nicht
nur gleich, sondern **invertiert**: der Zug der Siegerfarbe wird bestraft.

**Weitere Wege gibt es nicht.** `state.aiColor` wird außer im Startzustand (Z. 5657) nur in diesem Handler
zugewiesen; `resetGame` leert Puffer und `_trained` gemeinsam (Z. 5786). Einen Spielstand-Import gibt es nicht (nur
`downloadSGF`, kein Parser), und in `localStorage` liegen allein die Netzgewichte (`go_pnet`) und die
Dashboard-Abweichungen. Der Puffer kann also nur über den Farbwechsel Beispiele einer anderen Farbe enthalten.

**Was der Befund nicht sagt.** Eine Wirkung auf die Spielstärke ist **nicht gemessen** und bei `netMaxBlend` 0 auch
nicht zu erwarten: Das PolicyNet geht nur über den Blend in die Zugwahl ein. Betroffen sind die gelernten Gewichte
und die Lernstatistik. Letztere wiegt erst, wenn jemand den Blend einschaltet: `gamesPlayed` geht über `blendWeight`
in den Einfluss des Netzes ein, und `wins/gamesPlayed` ist die Baseline des Vorteilsterms (Z. 7252).

**Wie oft das vorkommt, ist unbekannt.** Der Farbwechsel mitten in einer Partie ist ein Klick im Bedienfeld; wie oft
Hazeberry oder andere ihn benutzen, ist nicht erhoben. Der Befund hängt nicht daran: Wenn es passiert, lernt das Netz
ein Beispiel mit falschem Vorzeichen.

## 3. Änderung — Variante (a): der Puffer wird beim Farbwechsel verworfen

Eine Stelle, nichts wird entfernt. Der Handler bekommt den neuen Wert in eine Variable, damit der Vergleich vor der
Zuweisung möglich ist:

```js
document.querySelectorAll('.color-btn').forEach(btn=>btn.addEventListener('click',function(){
  const neu=parseInt(this.dataset.color);
  if(neu===state.aiColor&&state.aiThinking)return;
  /* Farbwechsel mitten in der Partie: Die bisher gesammelten Beispiele sind
     Züge der ALTEN Farbe, den Reward holt showFinalScore am Ende aber aus
     state.aiColor — sie bekämen das Vorzeichen der NEUEN Farbe. Gemessen in
     docs/korrektur-train2-vorabfestlegung.md §6: ein Zug der Siegerfarbe, mit
     advantage -1 bestraft, obwohl seine Farbe gewonnen hatte. Darum werden sie
     verworfen (TRAIN-2, Variante a); die Beispiele der neuen Farbe sammelt
     applyAIResult danach normal weiter. Nur bei ECHTEM Wechsel: Der Handler
     läuft auch beim Klick auf die schon aktive Farbe (die Rückkehr oben greift
     nur zusammen mit aiThinking), und dann gibt es nichts zu verwerfen. */
  if(neu!==state.aiColor&&globalThis.policyNet&&policyNet._gameBuffer&&policyNet._gameBuffer.length){
    state.log.push(`! Farbwechsel — ${policyNet._gameBuffer.length} gesammelte KI-Züge der alten Farbe gehen nicht ins Training.`);
    policyNet._gameBuffer=[];
    updateUI();   /* zeichnet das Protokoll; sonst stünde die Zeile nur in state.log */
  }
  document.querySelectorAll('.color-btn').forEach(b=>b.classList.remove('active'));
  this.classList.add('active');state.aiColor=neu;updateAIStatus();
  if(state.aiEnabled&&!state.gameOver&&!humanTurn()){state.aiRequestId++;triggerAIMove();}
}));
```

**Unverändert:** `applyAIResult`, `showFinalScore`, der Aufgabe-Pfad, `trainGame`, `undo`, `resetGame`, `_trained`.
Die Engine und `policy-net` ohnehin (§1).

**Bewusst so:**

- **Nur bei echtem Wechsel.** Der bestehende Handler läuft auch, wenn man die schon aktive Farbe anklickt (die
  Rückkehr oben greift nur zusammen mit `aiThinking`). Ohne `neu!==state.aiColor` würde ein solcher Klick den Puffer
  grundlos leeren. Geprüft als Kontrolle T-F3.
- **Die Zeile steht im Zugprotokoll**, nicht als Dialog — wie bei TRAIN-1
  (`docs/korrektur-train1-vorabfestlegung.md` §3). Damit landet sie im Fehlerbericht (🐞) und im Kopieren-Knopf und
  stört den Spielfluss nicht. Sie nennt die Zahl der verworfenen Züge, weil genau das die Information ist.
- **`updateUI()` nur in diesem Zweig.** Das Protokoll wird allein von `updateUI` gezeichnet (Z. 6701); der Handler
  rief es bisher nicht. Ohne den Aufruf stünde die Zeile in `state.log`, würde aber erst beim nächsten Zug sichtbar.
  **Nebenwirkung, bewusst in Kauf genommen:** `updateUI()` ohne Argument setzt die Statuszeile auf „–" (bzw. „Spiel
  beendet"). Eine vorher stehende Meldung wie „Beide gepasst." verschwindet damit beim Farbwechsel. Das ist in
  diesem Zweig hinnehmbar — ein Farbwechsel ist kein Zug, und die Meldung gehört zum vorherigen. Wer das anders
  will, nimmt den Aufruf heraus; die Korrektur selbst hängt nicht daran.
- **Der Puffer wird geleert, nicht gefiltert.** Ein Filter nach Farbe wäre Variante (b) und bräuchte die Farbe im
  Eintrag.
- **Kein Eingriff in `undo`.** `undo` kürzt den Puffer nur, wenn er **länger** ist als der gemerkte Stand
  (Z. 5705 f.). Nach dem Verwerfen ist er kürzer oder gleich lang, der Zweig greift also nicht und kann den Puffer
  nicht mit Lücken auffüllen. Geprüft als Kontrolle T-F5.
- **Folge, die gewollt ist:** Endet die Partie nach dem Wechsel ohne weiteren KI-Zug, ist der Puffer leer,
  `trainGame` kehrt vor dem Zählen um („Kein Buffer — kein Training", Z. 7245) und die Partie wird **nicht** gezählt.
  Das ist richtig: Es gibt kein Beispiel und keinen eindeutigen Ausgang für „die KI". Geprüft als T-F2.

**Erwogen und verworfen:**

- **(b) Farbe je Eintrag merken und das Vorzeichen je Eintrag drehen.** Das ist die inhaltlich reichere Lösung und
  **nicht falsch**: Weil `boardToInput` perspektivisch ist (§2), sind die Beispiele der alten Farbe brauchbar, sie
  brauchen nur `-advantage`. Dagegen sprechen zwei Dinge, die ich nicht belegen kann. Erstens die Baseline:
  `advantage = reward − baseline` mit `baseline = 2·wins/gamesPlayed − 1`, der Siegquote **der KI**. Für die
  gedrehten Einträge wäre `−advantage` nur dann richtig, wenn die erwartete Belohnung der Gegenseite genau
  `−baseline` ist. In einem Nullsummenspiel mit *einer* Politik auf beiden Seiten stimmt das; hier spielt die
  Gegenseite ein Mensch, und `wins/gamesPlayed` mischt Farben, Stufen und Komi. Das ist eine **Annahme, nicht
  gemessen**. Zweitens die Statistik: `gamesPlayed++` und `wins++` (Z. 7314 f.) gelten einer Partie und einem
  Ausgang; bei einem Wechsel mitten im Spiel ist nicht bestimmt, wessen Ausgang gezählt wird. (b) bleibt der Weg,
  wenn die Beispiele erhalten bleiben sollen — dann mit eigener Vorabfestlegung und eigener Prüfung der Baseline.
- **(c) Den Farbwechsel sperren, solange Beispiele im Puffer liegen.** Nimmt eine vorhandene Bedienmöglichkeit weg,
  und zwar genau dann, wenn die KI schon gezogen hat. Für ein Trainingsdetail bei `netMaxBlend` 0 ist das zu viel.
- **(d) Nur dokumentieren, Code lassen.** Dann bleibt ein Beispiel mit falschem Vorzeichen im Training. §6 zeigt den
  Fall gemessen; dokumentieren allein genügt nicht.
- **Den Puffer erst am Spielende prüfen** (etwa: Farbe gewechselt → nicht trainieren). Das verwirft auch die
  Beispiele der neuen Farbe, die richtig sind, und die Prüfung müsste sich den Wechsel ohnehin merken.

**Nicht Teil der Korrektur:** die Warnung in `passNachGegnerpassPruefung`
(`docs/passregel-wege-vorabfestlegung.md` §3), `node tests/pwa.js` am GTP-Prototyp, GTP-3 prototypisch. Die
Variante (b) oben, falls Hazeberry die Beispiele erhalten will.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`, die Zeile in `tests/README.md` wird ergänzt. Benennung `T-F…`
(Farbwechsel); `T-T…` ist von TRAIN-1 belegt.

**Zwei Vorgaben zum Aufbau, ohne die der Test nichts wert ist:**

1. **Echte Netzeingaben.** Die Puffereinträge müssen mit `policyNet.boardToInput` und `policyNet.forward` gebaut
   werden, nicht mit Attrappen wie `new Float32Array(4)`. Mit Attrappen rechnet `_backward` Unsinn, `_badWeight`
   schlägt an und `trainGame` läuft in den Divergenzpfad (Z. 7295 ff.), der `reset()` aufruft — der Test prüfte dann
   die Divergenz-Mechanik statt TRAIN-2. Dieselbe Falle hat schon bei TRAIN-1 einen Entwurf verdorben
   (`docs/korrektur-train1-vorabfestlegung.md` §4).
2. **Der Farbwechsel läuft über den echten Knopf** (`document.querySelector('.color-btn[data-color="1"]').click()`),
   nicht über `state.aiColor = 1`. Geprüft wird der Handler; eine direkte Zuweisung würde ihn umgehen und am alten
   wie am neuen Code dasselbe tun.

Zusätzlich wird `_backward` mit einem Wrapper protokolliert (`{moveIdx, advantage}`) und danach zurückgesetzt, und
jedes Feld vor dem Aufruf auf eine Markierung gesetzt, damit kein Wert aus einer früheren Probe gelesen wird.

| Test | Prüft | am alten Code |
|---|---|---|
| T-F1 | KI-Zug als Weiß (echte Eingaben), Klick „Schwarz", KI-Zug als Schwarz, zwei Pässe: Der Puffer ist nach dem Wechsel **leer**, die Protokollzeile steht da, und `_backward` läuft **genau einmal** — für den Schwarz-Zug | **scheitert**: Puffer 1 nach dem Wechsel, zwei `_backward`-Aufrufe, der Weiß-Zug mit demselben `advantage` |
| T-F2 | Spielende direkt nach dem Wechsel, ohne weiteren KI-Zug: kein Training, `gamesPlayed` bleibt 0, Meldung „Kein Buffer" | **scheitert**: ein Training mit dem Weiß-Zug, `gamesPlayed` 1 |
| T-F3 | Klick auf die **schon aktive** Farbe: Puffer unverändert, keine Protokollzeile (Kontrolle) | besteht |
| T-F4 | **Ohne** Farbwechsel: zwei KI-Züge als Weiß, zwei Pässe → zwei `_backward`-Aufrufe mit demselben `advantage`, `gamesPlayed` 1, keine Divergenz (Kontrolle, dass der normale Weg unberührt ist) | besteht |
| T-F5 | Nach dem Verwerfen ein `undo`: Der Puffer bleibt leer, kein Eintrag ist `undefined`, kein Seitenfehler (Kontrolle gegen das Auffüllen über `length`) | besteht |

T-F1 und T-F2 sind die Kernprüfungen, T-F3 bis T-F5 Kontrollen. **Jeder der fünf wird auch am alten Stand
ausgeführt** (`node tests/browser-ui.js <alte index.html>`); das Ergebnis gehört in den Nachtrag.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Blöcke haben die Prüfsummen aus §1, und `PARAMS_DEFAULT` ist unverändert.
2. T-F1 und T-F2 schlagen am alten Code fehl und bestehen am neuen; T-F3 bis T-F5 bestehen an beiden.
3. Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen am neuen Code, darunter
   „T-W2: gleiche Stufe und Farbe während der Rechnung lösen keine Anfrage aus" — der Test fasst denselben Handler
   an — und die TRAIN-1-Tests T-T1 bis T-T6.
4. `node tests/run.js` lokal grün, CI grün. `tests/training-stability.js` ist besonders zu beachten, weil es den
   Trainingspfad betrifft.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Die Ausgabe
   wird als `docs/daten/bughunt-20261116/nach-train2.json` abgelegt, mit Konsole.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Probe am unkorrigierten Stand (23.11.2026)

**Was lief, wo, mit welchem Go:** ein kurzer Playwright-Lauf im Container, eine Seite, vier Züge und zwei Pässe,
Dauer unter zehn Sekunden. Kein Messlauf, keine Partie, keine Spielstärkeaussage. Hazeberry hat am 23.11.2026
kostengünstige Läufe im Container freigegeben. Stand `ee8ce5d`, `index.html` SHA-256 `fd58d14f…`.

Ablauf: KI ist Weiß; Schwarz (Mensch) setzt auf 3/3; die KI als Weiß setzt auf 15/3 mit echten Eingaben aus
`boardToInput`/`forward`; Klick auf „Schwarz"; die KI als Schwarz setzt auf 3/15; zwei Pässe. `_backward` wurde mit
einem Wrapper protokolliert.

| Beobachtung | Wert |
|---|---|
| Puffer nach dem Weiß-Zug | 1 Eintrag, `moveIdx` 72 (= 3·19+15, der Zug auf 15/3) |
| `state.aiColor` nach dem Klick | 1 (Schwarz) |
| **Puffer nach dem Farbwechsel** | **1 Eintrag — unverändert** |
| Puffer nach dem Schwarz-Zug | 2 Einträge, `moveIdx` 72 und 288 (= 15·19+3) |
| Schlussfläche | Schwarz 2, Weiß 1 → mit Komi 7,5 gewinnt **Weiß** 8,5 zu 2 |
| Reward aus `showFinalScore` | −1 (für `state.aiColor` 1 = Schwarz, richtig) |
| **`_backward`-Aufrufe** | **zwei, beide mit `advantage` −1** — `moveIdx` 288 **und** `moveIdx` 72 |
| `gamesPlayed` / `wins` | 0 → 1 / 0 → 0 |
| Divergenzen | 0 (die echten Eingaben haben getragen) |
| Seitenfehler | keine |

**Das ist der Befund, und er ist schärfer als in `docs/bughunt-wiederholung.md` §4** („beide bekommen `advantage`
+1"): Hier bekommt der Zug der **Siegerfarbe** `advantage` −1. Das Vorzeichen ist für diesen Eintrag nicht nur
gleich, sondern umgekehrt. Dass dort +1 und hier −1 steht, ist kein Widerspruch — es hängt am Ausgang der jeweils
gestellten Partie; gemeinsam ist beiden, dass **ein** Vorzeichen für beide Farben gilt.

**Grenzen der Probe:** eine Umgebung (Chromium, Playwright), eine künstliche Stellung mit vier Steinen, frische
Gewichte (`gamesPlayed` 0, also `baseline` 0 und `advantage` = `reward`). Mit Vorgeschichte wäre der Betrag anders,
das gemeinsame Vorzeichen nicht. Die Gewichtsänderung selbst wurde nicht ausgemessen, nur der Aufruf mit seinem
`advantage`. Das Skript lag im Arbeitsbereich der Sitzung und ist nicht Teil des Repos; die Tests aus §4 nehmen
denselben Ablauf dauerhaft auf.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit den Ergebnissen
   aus §5 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, `unsubscribe_pr_activity`, kurzer Bericht mit den löschbaren Branches.

## 8. Nachtrag: Umsetzung und Abnahme (23.11.2026)

Umgesetzt wie in §3 beschrieben, eine Stelle in `index.html` (Z. 6793 bis 6814): 17 Zeilen hinzu, 2 ersetzt, keine
andere Datei am Spiel berührt.

### 8.1 Die fünf Abnahmepunkte

**1. Prüfsummen — erfüllt.** Nach der Änderung nachgerechnet, alle drei byteidentisch zu §1:

| Block | SHA-256 nach der Änderung |
|---|---|
| `shared-go-logic` | `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66` |
| `worker-ai` | `f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9` |
| `policy-net` | `14cb39a13b0ee34b8bd838aacad64e1492dbf90768abfb99fd934da0c8703190` |

`PARAMS_DEFAULT` ist unberührt (der Diff an `index.html` enthält das Wort nicht). Ein Engine-Vergleich war damit
nicht nötig und wurde nicht gefahren.

**2. T-F1 bis T-F5 — erfüllt.** Beide Läufe im Container, Chromium über Playwright:

| Lauf | Ergebnis | T-F1 | T-F2 | T-F3 | T-F4 | T-F5 |
|---|---|---|---|---|---|---|
| alter Stand (`ee8ce5d`) | 57 bestanden, **2 fehlgeschlagen** | **scheitert** | **scheitert** | besteht | besteht | besteht |
| neuer Stand | **59 bestanden, 0 fehlgeschlagen** | besteht | besteht | besteht | besteht | besteht |

Die Meldung am alten Stand ist bei beiden dieselbe Stelle: „der Puffer ist nach dem Wechsel LEER — das ist der
Befund: erwartet 0, bekommen 1" (T-F1) und „der Wechsel hat ihn verworfen: erwartet 0, bekommen 1" (T-F2).
Rohausgaben: `docs/daten/bughunt-20261116/browser-ui-f-alt.txt` und `browser-ui-f-neu.txt`.

**3. Bestehende Tests — erfüllt.** `tests/browser-ui.js` ist nur ergänzt, keine bestehende Zeile geändert. Grün sind
am neuen Stand insbesondere „T-W2: gleiche Stufe und Farbe während der Rechnung lösen keine Anfrage aus" — der Test
fasst denselben Handler an und bestätigt, dass die Rückkehr bei `aiThinking` weiter greift — und die
TRAIN-1-Tests T-T1 bis T-T6.

**4. `node tests/run.js` — erfüllt.** Alle 61 Testdateien bestanden, darunter `tests/training-stability.js`. CI grün
(Nachtrag 8.6).

**5. `auswertung/bughunt-20261116/pruefung.js` — erfüllt.** Am neuen Stand weiter **1 von 13 Fällen reproduziert**,
nämlich B-2 („Spielende: toter Stein verschwindet, rotes Kreuz wird nie gezeichnet"). Ausgabe in
`docs/daten/bughunt-20261116/nach-train2.json`, Konsole in `nach-train2-konsole.txt`, Prüfsummen in `SHA256SUMS`
ergänzt.

**Urteil: gültig.**

### 8.2 Was der Gegenlauf am alten Stand gemessen hat

Beide Szenarien einzeln am alten Stand nachgefahren, mit protokolliertem `_backward`:

| Szenario | alter Stand | neuer Stand |
|---|---|---|
| T-F1: Wechsel, dann ein KI-Zug als Schwarz, zwei Pässe | Puffer nach dem Wechsel **1**; **zwei** `_backward`-Aufrufe, `moveIdx` 288 **und 72**, beide `advantage` −1; `gamesPlayed` 1 | Puffer **0**; **ein** Aufruf, nur `moveIdx` 288, `advantage` −1; `gamesPlayed` 1 |
| T-F2: Wechsel, dann sofort zwei Pässe | Puffer **1**; **ein** Aufruf für `moveIdx` **72** (den Weiß-Zug) mit `advantage` −1; `gamesPlayed` 0 → **1**, `lastResult` −1 | Puffer **0**; **kein** Aufruf; `gamesPlayed` bleibt **0**, `lastResult` bleibt leer |

In beiden Fällen hatte **Weiß** die Stellung gewonnen (8,5 zu 2 bzw. 8,5 zu 1), und in beiden Fällen bekam der
Weiß-Zug `advantage` −1. Das Vorzeichen war also nicht nur für beide Farben gleich, sondern für diesen Eintrag
umgekehrt.

**Meine Vorhersagen in §4 zum alten Stand sind bei beiden Kernprüfungen aufgegangen** — für T-F1 „Puffer 1 nach dem
Wechsel, zwei `_backward`-Aufrufe, der Weiß-Zug mit demselben `advantage`", für T-F2 „ein Training mit dem Weiß-Zug,
`gamesPlayed` 1". Auch die drei Kontrollen verhielten sich wie angekündigt. Das ist hier erwähnenswert, weil bei der
Passregel-Korrektur drei von fünf Vorhersagen falsch waren.

### 8.3 Eine Ungenauigkeit in §6, offen benannt

Die Probe in §6 baute den letzten Zug falsch: `{x: state.lastMove.x, y: state.lastMove.y}` statt
`{x: xOf(state.lastMove), y: yOf(state.lastMove)}`. `state.lastMove` ist ein **Index** (Z. 5737), kein Objekt; `x`
und `y` waren damit `undefined`, `idx(undefined, undefined)` ergibt `NaN`, und eine Zuweisung auf `inp[NaN]` wird von
einem `Float32Array` stillschweigend verworfen. **Ebene 8 (letzter Zug) war in der Probe also leer.**

Das ändert am Befund nichts, und zwar nicht aus Nachsicht, sondern weil der `advantage` nicht von der Eingabe
abhängt: Er kommt allein aus `reward` und `baseline` und wird in `trainGame` vor der Schleife gebildet. Die übrigen
zehn Ebenen waren richtig, alle Werte endlich, `_backward` lief ohne Divergenz. Die Tests T-F1 bis T-F5 bauen die
Eingabe in der Form, die `triggerAIMove` benutzt (Z. 6218), und sind an derselben Stelle ausdrücklich kommentiert.

### 8.4 Geändert

- `index.html`: der Farb-Handler (Z. 6793 bis 6814). Sonst nichts.
- Der Codeblock in §3 ist an den tatsächlichen Wortlaut des Kommentars angeglichen (Umlaute, ein Satz zum Klick auf
  die schon aktive Farbe); inhaltlich unverändert.
- `tests/browser-ui.js`: `t2Init`, `t2BisWechsel` und die Tests T-F1 bis T-F5 angefügt; nichts geändert.
- `tests/README.md`: die Zeile zu `browser-ui.js` um die fünf Tests ergänzt.
- `docs/bughunt-20261116.md` §3: TRAIN-2 von „steht weiter im Code" auf „behoben".
- `docs/daten/bughunt-20261116/`: `nach-train2.json`, `nach-train2-konsole.txt`, `browser-ui-f-alt.txt`,
  `browser-ui-f-neu.txt`, vier Zeilen in `SHA256SUMS`.

Die `README.md` des Repos bleibt unberührt: Das Verhalten der Oberfläche ändert sich nur in einem Randfall des
Trainings, und das Netz steuert im Default nicht.

### 8.5 Was offen bleibt

- **Variante (b)** ist nicht umgesetzt. Wer die Beispiele der alten Farbe erhalten will, braucht die Farbe im
  Puffereintrag, ein Vorzeichen je Eintrag und eine Antwort auf die Baseline-Frage aus §3. Das ist eine eigene
  Vorabfestlegung.
- **Wie oft ein Farbwechsel mitten in der Partie vorkommt, ist nicht erhoben.** Ohne diese Zahl lässt sich nicht
  sagen, wie viel Training der Fehler bisher verdorben hat.
- **Keine Spielstärkeaussage.** Bei `netMaxBlend` 0 steuert das Netz nicht; eine Folge für das Spielgefühl wäre eine
  Hypothese und ist nicht gemessen.
- **Eine Umgebung.** Chromium über Playwright im Container. Firefox, Safari und ein echtes Handy sind nicht geprüft;
  der Handler hängt an keiner Browser-Eigenheit, das ist aber gelesen und nicht gemessen.
- **Die Nebenwirkung von `updateUI()`** (Statuszeile auf „–") ist in §3 begründet, aber nicht eigens getestet. Sie
  tritt nur in dem Zweig auf, der auch die Protokollzeile schreibt.
