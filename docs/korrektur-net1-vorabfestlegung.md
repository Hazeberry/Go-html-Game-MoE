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

**Zum Engine-Vergleich — nachgeprüft am 22.11. (§8), und das Ergebnis ist deutlicher als zuerst gedacht: Er wäre
blind.** `engine-vergleich.yml` ruft `auswertung/engine-vergleich.js --dump`, das die Engine über `R.ladeEngine` holt
(`auswertung/diagnose/wurzel-replay.js` Z. 44 bis 62). Diese Funktion lädt **nur** `shared-go-logic` und `worker-ai`;
der Block `policy-net` kommt in der ganzen Datei nicht vor. Ein Vergleich alt gegen neu würde also „GLEICH" melden,
ohne die geänderte Zeile geladen zu haben. Nach der Gültigkeitsregel des Projekts wäre dieses „GLEICH" kein Urteil
über die Änderung, sondern eine Aussage über Code, der nicht dabei war.

Ein Engine-Vergleich ist für NET-1 damit nicht „verzichtbar", sondern **ungeeignet**. Was die Änderung bewirkt,
prüfen die Tests aus §4 und die Prototyp-Messung aus §6.

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
6. **Die veraltete Prüfsummen-Referenz ist nachgetragen.** Neun Docs nennen `56a5d6c0…` als Nachweis „Engine
   unberührt", und alle neueren verweisen dafür auf `docs/korrektur-d1-w1-vorabfestlegung.md` §1. Die Umsetzung setzt
   dort einen Nachtrag: dass für `policy-net` seit NET-1 `b0040fe8…` gilt und die Zahl in der Tabelle den Stand bis
   dahin beschreibt. Ohne das zitiert die nächste Vorabfestlegung eine Zahl, die nicht mehr stimmt (§8).
7. **Die falsche Aussage in `docs/bughunt-20261116.md` §7 ist berichtigt:** Dort steht, `gnugo-duell.js`, `gtp-ki.js`
   und `ab-harness.js` würden „nur die Blöcke `shared-go-logic`, `worker-ai` und `policy-net`" laden. Für
   `gnugo-duell.js` und `gtp-ki.js` trifft das nicht zu — beide laden `policy-net` nicht (§8).

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

**Bestehende Tests, wegen des geänderten Engine-Blocks vollständig:** `node tests/run.js <prototyp>` ergibt **alle 60
Testdateien bestanden**, Exit 0 — darunter `tests/nan-guards.js` („NaN-Schutz in MCTS/PUCT und Policy-Netz", 11 Tests)
und `tests/browser-nan.js` („NaN-Schutz im echten Browser"), also genau die Dateien, die den Divergenz- und
Speicherpfad prüfen, sowie `tests/training-stability.js` und `tests/browser-ui.js` (42 Tests).

**Grenzen:** Nur Chromium 153 headless. Die Sperre ist durch Überschreiben von `Storage.prototype.removeItem`
erzeugt, nicht durch ein echtes privates Fenster oder blockierte Site-Daten. Die Divergenz ist durch ein gesetztes
NaN erzwungen, nicht erspielt. Keine Partie gegen einen Gegner, keine Spielstärkemessung.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge. Die Frage nach dem Engine-Vergleich ist durch §8
   beantwortet: Er wäre ungeeignet, nicht nur verzichtbar.
2. Umsetzung in einem eigenen PR nach eigenem Go: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §5, eine Zeile in `docs/bughunt-20261116.md` §3 — **und die beiden Doc-Berichtigungen aus
   Abnahmepunkt 6 und 7** (Prüfsummen-Nachtrag in `docs/korrektur-d1-w1-vorabfestlegung.md` §1, Berichtigung der
   Ladeliste in `docs/bughunt-20261116.md` §7).
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 8. Pedantische Nachprüfung (22.11.2026, auf Bitte von Hazeberry)

Anlass: ein Engine-Block ändert sich, und das soll keine Folgebaustelle aufmachen. Neun Punkte, zwei davon mit
Befund.

**1. Ist die alte Prüfsumme irgendwo fest kodiert?** `56a5d6c0…` kommt in **neun Docs** vor und in **keiner** Datei
unter `tests/`, `auswertung/`, `distillation/`, `.github/workflows/` oder im Wurzelverzeichnis. Kein Test und kein
Workflow bricht.

**2. Befund: Die Docs veralten.** Alle Vorabfestlegungen ab D-2 verweisen für „Engine unberührt" auf
`docs/korrektur-d1-w1-vorabfestlegung.md` §1. Nach NET-1 stimmt die dortige `policy-net`-Zahl nicht mehr für den
aktuellen Stand. Das ist genau die Folgebaustelle, die zu vermeiden ist: Die nächste Korrektur würde die veraltete
Zahl zitieren und als „unberührt" belegen, was gar nicht mehr geprüft wäre. **Abnahmepunkt 6** schreibt den Nachtrag
dort fest.

**3. Wer lädt den Block `policy-net`?** Vollständige Liste, durch Suche über alle `.js`-Dateien:

| lädt `policy-net` | `localStorage`-Schale | ruft `reset()` / `trainGame()`? |
|---|---|---|
| `index.html` (Browser) | echtes `localStorage` | ja, das ist der Befund |
| `ab-harness.js` (Z. 878) | Z. 856 `removeItem: k => speicher.delete(k)` | über `--nettrain` möglich |
| `auswertung/weiterspielen.js` | Z. 63 `removeItem() {}` | nein |
| `distillation/collect.js`, `dump_boards.js`, `export_check.js`, `lokalitaet_check.js`, `spanne_check.js` | je eine Schale mit `removeItem` | nein |
| `tests/rahmen.js` (Z. 47, für alle Node-Tests mit Netz) | Z. 42 `removeItem: k => ablage.delete(k)` | ja, in `nan-guards.js` und `training-stability.js` |

**In jeder dieser Schalen funktioniert `removeItem` und wirft nie.** Der `catch`-Zweig aus §3 wird dort nie betreten;
der Code läuft Anweisung für Anweisung wie bisher. `auswertung/architektur.js` nennt den Blocknamen nur als Text für
ein Diagramm.

**4. Befund: `ladeEngine` lädt den Block nicht — der Engine-Vergleich wäre blind.** Siehe §1. Belegt durch 0 Treffer
für `policy-net` in `auswertung/diagnose/wurzel-replay.js`.

**5. Und `gnugo-duell.js`, `gtp-ki.js` und `auswertung/engine-vergleich.js` laden ihn auch nicht** — je 0 Treffer.
Damit sind die Werkzeuge, die gegen GNU Go und Fuego spielen und die PWA-Vergleiche fahren, von dieser Änderung
überhaupt nicht berührt: Der geänderte Code kommt dort nie vor. Das ist ein stärkeres Argument als die Aufruferliste
allein — und es berichtigt eine Aussage in `docs/bughunt-20261116.md` §7 (**Abnahmepunkt 7**).

**6. Zählt ein Test die neue `console.warn`-Zeile als Fehler?** Nein, zweifach abgesichert: `tests/browser-nan.js`
bewertet nur `m.type() === 'error'` (Z. 62), und Meldungen, die mit `[PolicyNet]` beginnen, sortiert es ohnehin als
Diagnose ein, nicht als Fehler (Z. 60). Die neue Zeile beginnt genau so.

**7. Prüft ein Test Prüfsummen von Engine-Blöcken?** `tests/engine-vergleich.js` nicht — es startet
`auswertung/engine-vergleich.js` zweimal mit **demselben** Stand und erwartet „gleich". Keine Datei im Repo vergleicht
Blockprüfsummen gegen einen festen Wert.

**8. Ist der Diff im Block wirklich nur die eine Stelle?** Zeilenweiser Vergleich des extrahierten Blocks: 498 Zeilen
alt, 505 neu. Eine Zeile entfernt (`localStorage.removeItem('go_pnet');`), acht eingefügt (sechs Kommentar, zwei
Code), erste Abweichung bei Blockzeile 462, danach wieder identisch. Keine andere Stelle berührt.

**9. Volle Testsuite gegen den Prototyp:** alle 60 Testdateien bestanden (§6), darunter die vier Dateien, die
Divergenz, Speicherpfad und Training prüfen.

**Was diese Nachprüfung nicht abdeckt:** Ein echtes privates Browserfenster (die Sperre ist im Test erzeugt), ein
`--nettrain`-Lauf des Harness mit erzwungener Divergenz (die Schale dort wirft nie, der Fall ist konstruierbar, aber
nicht erspielt), und die Frage, ob `ab-harness.js --nettrain` überhaupt je mit divergierenden Gewichten gelaufen ist.
