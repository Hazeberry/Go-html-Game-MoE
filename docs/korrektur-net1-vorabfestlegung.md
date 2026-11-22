# Korrektur NET-1: Vorabfestlegung

**Stand: 22.11.2026. Status: Entwurf, nicht umgesetzt.** Befund aus `docs/bughunt-wiederholung.md` §5 und §7 (NET-1).
Go von Hazeberry am 22.11.2026: „NET-1".

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Diese Korrektur ändert einen Engine-Block

**Das ist die erste Korrektur dieser Reihe, bei der ein Engine-Block nicht byteidentisch bleibt.** `PolicyNet.reset`
steht im Block `policy-net`, und dort sitzt die Änderung.

| Block | SHA-256 | |
|---|---|---|
| `shared-go-logic` | `54dfef2dd520309c5c785c65ff4f708f0ae0ccde90a79224543be614a92ebc66` | unverändert |
| `worker-ai` | `f847c1247188d8a0c94d269581ae465b7428d601c13afb65dced683d69a366e9` | unverändert |
| `policy-net` | alt `56a5d6c0eb3f122425560fc55ebfb44ee70eda8fb47406a4f354928d5d93a475` | **ändert sich** |
| `policy-net` | neu `b0040fe8c0a9eecead4c88b6d9f209846734d98d9a3b2050bffc420b5f2db4d2` | (am Prototyp, §6) |

`PARAMS_DEFAULT` bleibt gleich. Kein Schalter.

**Warum die Zugwahl dennoch unberührt bleibt**, am Code nachgelesen:

- `reset()` hat genau **zwei** Aufrufer: `trainGame` im Divergenzpfad (Z. 7299) und den Dashboard-Knopf
  „🗑 Netz zurücksetzen" (Z. 7880). `trainGame` selbst wird nur aus `showFinalScore` (Z. 5900) und dem Aufgabe-Pfad
  von `applyAIResult` (Z. 5960) gerufen — beide im Hauptskript, beide **nach** dem Spiel.
- `shared-go-logic` enthält keinen Aufruf von `reset()` oder `trainGame()`. `getAIMove` erreicht `reset()` auf keinem
  Weg.
- Die Änderung ist ein `try/catch` um einen `localStorage`-Zugriff. **In allen Node-Werkzeugen wirft `removeItem`
  nie**: `tests/rahmen.js` Z. 42 (`removeItem: k => { ablage.delete(k); }`), `gtp-ki.js` Z. 46 und
  `auswertung/weiterspielen.js` Z. 63 stellen Schalen bereit. Der `catch`-Zweig wird dort nie betreten, der Code läuft
  Anweisung für Anweisung wie bisher.
- Im Browser wirft `removeItem` nur bei gesperrtem Storage. Ohne Sperre ist das Verhalten identisch.

**Das Verhalten unterscheidet sich also ausschließlich in dem Fall, der heute abbricht.** Ein Messlauf oder ein
Engine-Vergleich ist dafür nach meiner Einschätzung nicht nötig.

**Offen für Hazeberrys Entscheidung:** `CLAUDE.md` sieht für Änderungen an einem Engine-Stand den Vergleich über
`engine-vergleich.yml` in GitHub Actions vor. Wer das trotz der Argumente oben haben will, braucht dafür ein eigenes
Go; die Umsetzung wartet dann darauf. Meine Empfehlung: verzichtbar, weil die Aufruferliste vollständig und kurz ist.

## 2. Befund

Zeilen am Stand `19803a2` (`index.html` SHA-256 `7cef50aa…`).

`PolicyNet.reset` (Z. 7379 ff.) beginnt mit

```js
  reset() {
    localStorage.removeItem('go_pnet');
```

**ungeschützt.** `save()` (Z. 7316 ff.) und `load()` (Z. 7339 ff.) liegen dagegen in `try/catch`, und das Dashboard
schützt jeden seiner vier `localStorage`-Zugriffe (Z. 8134, 8144, 8154, 8170). **`reset()` ist der einzige
ungeschützte `localStorage`-Zugriff im ganzen Code** — alle Vorkommen wurden dafür einzeln durchgesehen.

Ist der Storage gesperrt (privates Fenster, blockierte Site-Daten), wirft die erste Anweisung. Weil sie die erste ist,
passiert **nichts** von dem, was danach kommt: keine neuen Gewichte, keine Zähler auf 0, kein `_healthy`, kein
`save()`.

### Drei Wege, alle gemessen (§6)

| Weg | was heute passiert |
|---|---|
| **Divergenzpfad beim Spielende** (zwei Pässe → `showFinalScore` → `trainGame` → `reset()`) | `SecurityError` fliegt aus `pass()` heraus. `drawStateToCache()` und `updateUndoButton()` in `pass` laufen nicht, im Pass-Handler auch `render()` und `updateUI()` nicht. **Das vergiftete Gewicht bleibt** (`W1[0]` nicht endlich), `_healthy` bleibt `true`, `_divergences` steht auf 1. |
| **Divergenzpfad im Aufgabe-Pfad** (`applyAIResult`, Z. 5960) | `SecurityError` fliegt heraus, und zwar **vor** `resolveLifeAndDeath` (5961), `showFinalScore` (5962), der Brett-Wiederherstellung (5964 f.), `drawStateToCache` (5966) und der Aufgabe-Anzeige (5968). Gemessen: Spiel beendet, aber Label „Area (Komi 7.5)", Anzeige „–", Panel unsichtbar. Der Spieler sieht keinen Endstand. |
| **Dashboard-Knopf** | `SecurityError`, der Reset passiert nicht, Gewichte und Zähler bleiben (17 Spiele, 9 Siege). Das ist der Teil, den `docs/bughunt-wiederholung.md` §4 schon reproduziert hat. |

### Was daran schwerer ist als die Befundnotiz sagt

`docs/bughunt-wiederholung.md` §7 führt die Folge für das Spielende als „statisch abgeleitet, weder reproduziert noch
geprüft". Sie ist jetzt reproduziert — und sie hat eine Seite, die dort nicht steht:

**Der Selbstheilungsmechanismus wird unwirksam, genau wenn er gebraucht wird.** Der Divergenzpfad existiert, um
nicht-finite Gewichte wegzuräumen. Bricht `reset()` in seiner ersten Zeile ab, bleiben die NaN-Gewichte im Speicher
**und** `_healthy` bleibt `true`. Damit greift auch der Stillstands-Schutz nicht, der `blendWeight` bei krankem Netz
auf 0 setzt (`docs/korrektur-h1-vorabfestlegung.md` §2). Bei `netMaxBlend` 0 — dem Default — bleibt das ohne Folge für
die Zugwahl; wer den Blend eingeschaltet hat, spielt danach mit einem Netz, dessen Ausfall erkannt, aber nicht
behoben wurde.

## 3. Änderung

Eine Einfügung in `reset()`:

```js
  reset() {
    /* localStorage kann gesperrt sein (privates Fenster, blockierte
       Site-Daten). Ungeschützt brach der Wurf hier den AUFRUFER ab:
       trainGame ruft reset() im Divergenzpfad, und das steckt mitten im
       Spielende — vor resolveLifeAndDeath und der Endstandsanzeige (NET-1).
       Der Reset im Speicher läuft trotzdem; nur der gespeicherte Stand bleibt
       dann liegen, und save() unten lehnt still ab. */
    try { localStorage.removeItem('go_pnet'); }
    catch (e) { console.warn('[PolicyNet] localStorage nicht löschbar:', (e && e.message) || e); }
```

**Bewusst so:**
- **Der Reset läuft weiter.** Die Gewichte im Speicher zurückzusetzen ist der Zweck; dass der gespeicherte Stand
  liegen bleibt, ist die kleinere Folge.
- **Nur eine Konsolenwarnung, keine Protokollzeile.** `save()` und das Dashboard machen es ebenso. Der Fall trifft
  Browser mit gesperrtem Storage; dort schlägt ohnehin jedes Speichern fehl, und eine Zeile je Reset im Zugprotokoll
  wäre Lärm an der falschen Stelle.
- **Bei gesperrtem Storage ist der Reset nicht dauerhaft:** `save()` am Ende von `reset()` lehnt still ab, und beim
  nächsten Laden kommt der alte Stand zurück. Das ist eine Eigenschaft der Umgebung, nicht dieser Korrektur, und wird
  mit ihr nicht schlechter.

**Unverändert:** `save()`, `load()`, `trainGame`, der Dashboard-Knopf, das Dashboard, die Zugwahl. Die Blöcke
`shared-go-logic` und `worker-ai` bleiben byteidentisch (§1).

**Erwogen und verworfen:**
- *Den `try/catch` um den Aufruf in `trainGame` legen statt in `reset()`.* Das würde den Knopf-Fall offen lassen und
  den Fehler an der Stelle behandeln, an der er nicht entsteht.
- *`reset()` bei gesperrtem Storage ganz abbrechen (früher `return`).* Dann bliebe genau der Zustand, der heute das
  Problem ist: NaN-Gewichte und `_healthy` true.
- *Eine Protokollzeile wie bei TRAIN-1.* Siehe oben: falscher Ort, und der Fall ist nicht spielbezogen.

**Nicht Teil der Korrektur:** TRAIN-1 (Umsetzung), TRAIN-2, GTP-1 bis GTP-3. Dass der Reset bei gesperrtem Storage
nicht dauerhaft ist.

## 4. Tests (in der Umsetzung)

**Aufgeteilt nach Prüfebene**, mit Begründung:

- Der Kern — `reset()` und der Divergenzpfad — lässt sich **in Node** prüfen: `tests/nan-guards.js` enthält schon
  „trainGame(): ein divergierter Stand wird zurückgerollt statt gespeichert" (Z. 165 ff.) und zeigt das Muster
  (`netz.W1[0] = NaN`, Puffer füllen, `trainGame` rufen, `KI.ablage` prüfen). Die Schale dort lässt sich für einen
  Test so umstellen, dass `removeItem` wirft. Schnell und ohne Browser.
- Die **Aufrufketten** (Spielende, Aufgabe) brauchen das Hauptskript, das `ladeKI` nicht lädt. Sie kommen als
  Browser-Tests nach `tests/browser-ui.js`, wo die Tests dieser Korrekturreihe liegen.

| Test | Datei | Prüft | vor der Korrektur |
|---|---|---|---|
| T-N1 | `nan-guards.js` | `reset()` bei werfendem `removeItem`: kein Wurf, Gewichte endlich, `gamesPlayed` und `wins` auf 0, `_healthy` true | scheitert: der Wurf kommt durch |
| T-N2 | `nan-guards.js` | Divergenzpfad ohne gespeicherten Stand und mit werfendem `removeItem`: `trainGame` wirft nicht, `W1` ist danach endlich, der Puffer leer | scheitert: der Wurf kommt durch |
| T-N3 | `browser-ui.js` | Spielende durch zwei Pässe mit vergiftetem Gewicht und gesperrtem `removeItem`: `pass()` wirft nicht, Endstand sichtbar, `W1[0]` endlich | scheitert: `SecurityError` aus `pass()`, `W1[0]` nicht endlich |
| T-N4 | `browser-ui.js` | Aufgabe der KI unter denselben Bedingungen: Label „Aufgabe", Endstand sichtbar | scheitert: Label „Area (Komi 7.5)", Anzeige „–" |
| T-N5 | `nan-guards.js` | Kontrolle: ohne Sperre setzt `reset()` wie bisher zurück und entfernt den Eintrag aus der Ablage | besteht an beiden |

T-N1 bis T-N4 müssen am alten Code fehlschlagen und am neuen bestehen. T-N5 besteht an beiden.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. `shared-go-logic` und `worker-ai` haben die Prüfsummen aus §1. `policy-net` hat die dort genannte **neue**
   Prüfsumme, und der Diff an diesem Block besteht aus genau der Einfügung aus §3. `PARAMS_DEFAULT` ist unverändert.
2. T-N1 bis T-N4 schlagen am alten Code fehl und bestehen am neuen; T-N5 besteht an beiden.
3. Die bestehenden Tests in `tests/nan-guards.js` und `tests/browser-ui.js` bleiben unverändert und bestehen am neuen
   Code — heute 11 beziehungsweise 42 ausgeführte Tests.
4. `node tests/run.js` lokal grün, CI grün. Wegen des geänderten Engine-Blocks ist der Lauf **vollständig** zu
   machen, nicht nur die berührten Dateien.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Ausgabe als
   `docs/daten/bughunt-20261116/nach-net1.json`, mit Konsole.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Prüfung des Entwurfs am Prototyp (22.11.2026)

Die Änderung aus §3 wurde in eine Kopie der `index.html` (Stand `19803a2`) **außerhalb des Repos** eingesetzt und
lokal geprüft: Chromium 153.0.8010.12 headless, Node v22.23.5, nur Seitenaufrufe auf `127.0.0.1`. Der Prototyp ist
nicht die Umsetzung.

**Aufbau:** `Storage.prototype.removeItem` wirft einen `SecurityError`, `getItem` liefert `null` (damit `load()` im
Divergenzpfad false liefert und `reset()` an die Reihe kommt), ein KI-Zug mit echten Netzeingaben füllt den Puffer,
`policyNet.W1[0] = NaN` erzwingt die Divergenz.

| | alter Code | Prototyp |
|---|---|---|
| **A, zwei Pässe:** Wurf aus `pass()` | **SecurityError: gesperrt** | keiner |
| A: Endstand | „Weiß +7.5", Panel sichtbar | gleich |
| A: `W1[0]` endlich | **nein** | **ja** |
| A: Spiele / Divergenzen | 0 / **1** | 0 / 0 |
| **B, Aufgabe:** Wurf aus `applyAIResult` | **SecurityError: gesperrt** | keiner |
| B: Label / Anzeige | **„Area (Komi 7.5)" / „–"**, Panel unsichtbar | **„Aufgabe" / „Schwarz gewinnt (Stand Weiß +6.5)"**, Panel sichtbar |
| **C, Dashboard-Knopf:** Wurf | **SecurityError: gesperrt** | keiner |
| C: Netz danach | **17 Spiele, 9 Siege** (unverändert) | 0 Spiele, 0 Siege |

Keine Seitenfehler in beiden Läufen. Prüfsummen: `shared-go-logic` und `worker-ai` byteidentisch, `policy-net` wie in
§1 angegeben.

**Grenzen:** Nur Chromium 153 headless. Die Sperre ist durch Überschreiben von `Storage.prototype.removeItem`
erzeugt, nicht durch ein echtes privates Fenster oder blockierte Site-Daten. Die Divergenz ist durch ein gesetztes
NaN erzwungen, nicht erspielt. Keine Partie gegen einen Gegner, keine Spielstärkemessung.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es** — und entscheidet dabei auch über den Engine-Vergleich (§1).
   Merge.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §5 und eine Zeile in `docs/bughunt-20261116.md` §3.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.
