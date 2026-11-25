# Die Versuchsregel auf den Node-Wegen: Vorabfestlegung

**Stand: 23.11.2026. Status: umgesetzt (§7), Abnahme gültig, Testvorhersagen aus §4 in §7.1 berichtigt.** Offener Punkt aus
`docs/korrektur-gtp-vorabfestlegung.md` §3: Die Korrektur GTP-2 hat `gtp-ki.js` versorgt, „die anderen bleiben, wie
sie sind". Go von Hazeberry am 23.11.2026, als Punkt 4 einer Liste von vier.

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge.

## 1. Der Befund, und warum meine eigene Formulierung daneben lag

Ich hatte den Punkt als „die Versuchsregel auch in `gnugo-duell.js`, `ab-harness.js` und den Auswertungsskripten
versorgen" beschrieben. **Das ist nach Durchsicht falsch.** Von den 20 Node-Aufrufstellen von `getAIMove` außerhalb
`index.html` und `tests/` kann der Schalter `passNachGegnerpass` nur an **sechs** überhaupt anliegen — nämlich dort,
wo frei gewählte PARAMS eingemischt werden. Alle anderen mischen nur feste Literale ein; dort steht der Schalter
immer auf 0, und eine Änderung wäre toter Code.

Gezählt (Suche nach `Object.assign(…PARAMS…)` mit einem freien Argument am Ende):

| Aufrufer | freie PARAMS | spielt aus? | Pass-Zählung |
|---|---|---|---|
| `gtp-ki.js` Z. 150 | `opt.ki` | ja | **versorgt seit GTP-2** |
| `gnugo-duell.js` Z. 449 | `opt.ki` | ja | **sauber** |
| `ab-harness.js` Z. 1152 | `cfg` (Arm) | ja | **verunreinigt** (§2) |
| `ab-harness.js` Z. 1390 | keine (Eröffnung) | ja | — |
| `auswertung/weiterspielen.js` Z. 130 | `opt[arm]` | ja | **verunreinigt** |
| `auswertung/diagnose/wurzel-replay.js` Z. 88 | `p.ki` | nein | — |
| `auswertung/lerner-pruefung.js` Z. 115 | `opt.ki` | nein | — |
| elf weitere in `auswertung/`, `distillation/collect.js` | nur feste Literale | teils | — |

`auswertung/endspiel/passregel-fortsetzung.js` Z. 222 hat freie PARAMS und **prüft schon** (Z. 220: `throw`, wenn
`passNachGegnerpass !== 0`). Das ist der Vorgang, dem diese Festlegung folgt.

## 2. Zwei Fallen, die ein blindes „`extra` überall mitgeben" aufgerissen hätte

**Falle 1: Der Pass-Zähler zählt nicht nur Pässe.** `gegnerPasste` aus dem vorhandenen Zähler abzuleiten wäre an
drei Stellen **falsch**:

- `ab-harness.js` Z. 1219: ein Zug auf ein besetztes Feld oder ohne Koordinate erhöht `passes` als **Anomalie**
  (`anomalies++; passes++`). Nach einer Anomalie hätte die Engine „der Gegner hat gepasst" gehört, obwohl er zog.
- `auswertung/weiterspielen.js` Z. 132: `if (i < 0 || board[i])` erhöht `passes` — das deckt Pass, **Aufgabe** (weil
  `i` für jeden Nicht-Stein −1 wird) und besetztes Feld in einem Zweig.
- `distillation/collect.js` Z. 38 und 40: dasselbe Muster.

**Sauber ist nur `gnugo-duell.js`:** Aufgabe wird vorher abgefangen (Z. 450 `break`), ein besetztes Feld wirft
(Z. 488), und `paesse` zählt damit ausschließlich echte Pässe beider Seiten.

**Falle 2: `ab-harness.js` sagt zu, komi-blind zu sein.** Die Hilfe des Werkzeugs, Z. 49 bis 51:

> `--komi <f>` Komi für die Wertung (Default: 7.5). Hinweis: Die Engine selbst ist komi-blind — `--komi` ändert
> **NUR die Abrechnung, nie einen Zug**.

`passNachGegnerpassPruefung` rechnet mit `extra.komi` (`index.html` Z. 5228). Würde `ab-harness.js` `extra` mitgeben,
wäre diese Zusage bei eingeschaltetem Schalter nicht mehr wahr. Mit Schalter aus bliebe sie es — aber eine Zusage,
die nur manchmal gilt, ist keine.

## 3. Änderung

**(a) `gnugo-duell.js` bekommt `extra`.** Es ist das einzige Werkzeug, das ausspielt, einen sauberen Pass-Zähler
führt und ein echtes Komi kennt (`KOMI`, Z. 203: 0,5 mit Vorgabe, sonst 7,5). Die Wertung ist `flaeche`: GNU Go läuft
dort mit `--chinese-rules`.

```js
const r = E.getAIMove(board, f, Array.from(hist), {...caps}, mc, 'hard', 1, ko, last,
  {...extra, gegnerPasste: paesse >= 1, wertung: 'flaeche', komi: KOMI});
```

`extra` trägt dort schon das Kandidaten-Orakel (Z. 447); die Felder werden ergänzt, nicht ersetzt. **`paesse >= 1`
ist hier richtig**, weil der Zähler sauber ist (§2) und beim eigenen Zug unmittelbar vorher der Gegner am Zug war.

**(b) Vier Stellen bekommen einen Wächter statt `extra`:** `ab-harness.js` (Z. 1152), `auswertung/weiterspielen.js`,
`auswertung/diagnose/wurzel-replay.js` und `auswertung/lerner-pruefung.js`. Nach dem Vorgang aus
`passregel-fortsetzung.js` Z. 220:

```js
if (PARAMS.passNachGegnerpass >= 1)
  throw new Error('passNachGegnerpass: dieses Werkzeug versorgt extra nicht, die Regel wuerde still ausfallen '
                  + '(docs/passregel-wege-vorabfestlegung.md)');
```

**Warum Wächter und nicht versorgen:**
- **`ab-harness.js`:** Falle 2. Die Zusage „komi-blind" ist der Grund, warum man dem Werkzeug A/B-Vergleiche
  zutraut. Eine Passregel-Messung über `ab-harness` hätte ohnehin einen eigenen Entwurf gebraucht — die Stufe C
  wurde an Archivstellungen gerechnet, nicht ausgespielt (`docs/passregel-vergleich.md` §2).
- **`weiterspielen.js`:** Falle 1, und es ist ein Diagnosewerkzeug für eine bestimmte Untersuchung, kein Messstand.
- **`wurzel-replay.js` und `lerner-pruefung.js`:** Sie bewerten **Einzelstellungen**. `gegnerPasste` hat dort keinen
  Wert, den man herleiten könnte; die Angabe müsste aus den Daten kommen, und die tragen sie nicht.

**(c) Nichts ändert sich** an den elf Aufrufern mit festen Literalen, an `collect.js`, an `ab-harness.js` Z. 1390
(Eröffnung ohne Arm-Parameter, Schalter immer 0) und an `passregel-fortsetzung.js` (prüft schon). Ein Wächter dort
wäre toter Code.

**Die Engine bleibt unberührt.** `index.html` wird nicht angefasst: keine Zeile, kein Parameter. Damit bleiben alle
drei Engine-Blöcke byteidentisch und ein Engine-Vergleich ist nicht nötig.

**Erwogen und verworfen:**
- *Die Warnung in die Engine legen — `passNachGegnerpassPruefung` meckert, wenn der Schalter an ist und `extra`
  fehlt.* Das würde **alle** Aufrufer auf einmal abdecken, auch künftige, und wäre der sauberste Ort. Es ändert aber
  den Block `worker-ai`, auf dessen Byteidentität sich jede bisherige Korrektur beruft, und `ladeEngine` lädt diesen
  Block — ein Engine-Vergleich wäre **nicht** blind, sondern nötig, in Actions und nach eigenem Go. Das ist mehr
  Aufwand und mehr Risiko als vier Wächter in Werkzeugen. Wenn jemand es später doch will, ist es eine eigene
  Festlegung.
- *Überall `extra` mitgeben.* Falle 1 und Falle 2. An den Einzelstellungs-Skripten wäre es zudem erfunden.
- *Den Wächter als Warnung statt als Abbruch.* Eine Warnung im Protokoll eines Messlaufs geht unter; der Fall ist
  genau der, in dem jemand eine Messung für gültig hält, die ohne die Regel lief. Abbruch ist hier die mildere Folge.

**Nicht Teil der Korrektur:** TRAIN-2. Die Frage, ob die Versuchsregel überhaupt eingeschaltet werden soll — sie
bleibt auf 0, aus keinem Ergebnis folgt eine Aktivierung (`docs/passregel-vergleich.md`).

## 4. Tests (in der Umsetzung)

Benennung `T-PW…`, in `tests/passregel-versuch.js`, wo die Verdrahtung der Regel schon geprüft wird (Z. 101).

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-PW1 | `gnugo-duell.js` gibt `extra` mit `gegnerPasste`, `wertung` `flaeche` und `komi` weiter — über eine Attrappe für `getAIMove`, die Argumentzahl und `extra` protokolliert | scheitert: `argc` 9 bzw. `extra` ohne die Felder |
| T-PW2 | Nach einem Gegnerpass steht `gegnerPasste` auf true, nach einem Steinzug auf false | scheitert |
| T-PW3 | Mit Vorgabe trägt `extra.komi` 0,5, ohne Vorgabe 7,5 | scheitert |
| T-PW4 | Die vier Wächter brechen mit `--ki passNachGegnerpass=1` ab und nennen den Grund | scheitert: sie laufen still durch |
| T-PW5 | Kontrolle: mit Schalter 0 verhalten sich alle fünf Werkzeuge **bitgleich** — dieselben Züge wie vorher bei festem Seed | besteht an beiden |

T-PW1 bis T-PW4 müssen am alten Stand fehlschlagen und am neuen bestehen. T-PW5 besteht an beiden und ist der
Nachweis, dass der Standardfall unberührt bleibt.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. `index.html` ist **unverändert** (Prüfsumme vor und nach dem PR gleich), alle drei Engine-Blöcke byteidentisch.
2. T-PW1 bis T-PW4 schlagen am alten Stand fehl und bestehen am neuen; T-PW5 besteht an beiden.
3. Die bestehenden Tests in `tests/passregel-versuch.js` bleiben unverändert und bestehen.
4. `node tests/run.js` lokal grün, CI grün.
5. Die Hilfe von `ab-harness.js` (Z. 49 bis 51) nennt den Wächter, damit die Zusage „komi-blind" nachprüfbar bleibt.
6. Kein Messlauf. Mit Schalter 0 — dem Standard — ist jedes Werkzeug bitgleich; es gibt nichts zu messen.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR: Code nach §3, Tests nach §4, Nachtrag hier mit den Ergebnissen aus §5 und eine
   Zeile in `docs/korrektur-gtp-vorabfestlegung.md` §3, wo der offene Punkt steht.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 7. Nachtrag: Umsetzung und Abnahme (23.11.2026)

Hazeberry: Go für die Liste und die PRs, autonom. Die Umsetzung folgt §3 ohne Abweichung in der Sache. Node
v22.23.5, lokal; kein Messlauf.

### 7.1 Die sechs Abnahmepunkte

1. **`index.html` ist unverändert**, alle drei Engine-Blöcke byteidentisch (`54dfef2d…`, `f847c124…`,
   `14cb39a1…`). Geändert sind fünf Werkzeuge und eine Testdatei.
2. **Hier ist meine Vorhersage in §4 falsch gewesen, bei drei von fünf Tests.** Gemessen, zwei Läufe von
   `tests/passregel-versuch.js`, einmal mit zurückgenommenen Änderungen: **alt 7 von 11, neu 11 von 11.**

   | Test | §4 sagte | gemessen | warum |
   |---|---|---|---|
   | T-PW1 | scheitert alt | **scheitert alt** ✓ | — |
   | T-PW2 | scheitert alt | **besteht an beiden** | Dass `paesse` in `gnugo-duell.js` sauber zählt, war **schon vorher** so — genau deshalb wurde dieses Werkzeug gewählt. Der Test ist eine Kontrolle, kein Änderungsnachweis. |
   | T-PW3 | scheitert alt | **besteht an beiden** | `KOMI` gab es vorher. Auch eine Kontrolle. |
   | T-PW4, T-PW4b | scheitert alt | **scheitert alt** ✓ | — |
   | T-PW5 | besteht an beiden | **scheitert alt** | Der Test stellt den Stand vor der Korrektur her, indem er den neuen Ausdruck entfernt. Am alten Stand gibt es nichts zu entfernen, also meldet er seine fehlende Voraussetzung — richtig so, aber das Gegenteil der Vorhersage. |

   Die Änderungsnachweise sind damit **T-PW1, T-PW4 und T-PW4b**; T-PW2 und T-PW3 sind Kontrollen, T-PW5 ist der
   Bitgleich-Nachweis. Dieselbe Berichtigung gilt für §5 Nr. 2, die die Zahlen von §4 übernommen hatte.
3. **Die fünf bestehenden Tests in `tests/passregel-versuch.js` sind unverändert und bestehen.** Geändert sind nur
   der Kopfkommentar und die `require`-Zeile der Datei, nicht ein bestehender Test.
4. **`node tests/run.js` lokal grün.** CI: siehe PR.
5. **Die Hilfe von `ab-harness.js` nennt den Wächter** (bei `--komi`), damit die Zusage „komi-blind" nachprüfbar
   bleibt. T-PW4b prüft diese Zeile mit.
6. **Kein Messlauf**, und T-PW5 belegt, warum keiner nötig ist: ausgeführt, derselbe Seed gegen dieselbe Attrappe,
   einmal mit dem Stand vor der Korrektur und einmal mit dem jetzigen — **Zug für Zug dieselben zwei Partien.**

### 7.2 Was ausgeführt ist und was am Quelltext geprüft

Offen benannt, weil §4 bei T-PW4 „brechen ab" schrieb und das Ausführung nahelegt:

| Test | Ebene | Grund |
|---|---|---|
| T-PW1, T-PW2, T-PW4b | **Quelltext** | Der Aufruf und die Wächter sind je eine Zeile; dieselbe Prüfebene nutzt die Verdrahtungsprüfung für den Browser in derselben Datei schon. |
| T-PW3 | ausgeführt | beide Zweige der Komi-Rechnung |
| **T-PW4** | **ausgeführt** | `ab-harness.js --A passNachGegnerpass=1` → Exit **1** mit der Meldung |
| **T-PW5** | **ausgeführt** | zwei Duelle gegen `tests/gtp-attrappe.js`, Zugfolgen verglichen |

**Warum die drei Auswertungsskripte nicht ausgeführt geprüft sind:** Sie brauchen Archivdaten und brechen ohne
Argumente ab, bevor der Wächter erreicht wird — gemessen: `weiterspielen.js` Exit 2, `wurzel-replay.js` Exit 2,
`lerner-pruefung.js` Exit 1. Ihren Wächter auszuführen hätte bedeutet, Archivdaten in Testformat zu erfinden, für
drei Zeilen identischen Codes. Der wichtigste der vier, `ab-harness.js`, ist ausgeführt.

### 7.3 Geändert

`gnugo-duell.js` (das zehnte Argument), `ab-harness.js` (Wächter und Hilfe), `auswertung/weiterspielen.js`,
`auswertung/diagnose/wurzel-replay.js`, `auswertung/lerner-pruefung.js` (je ein Wächter),
`tests/passregel-versuch.js` (T-PW1 bis T-PW5), dieses Doc und eine Zeile in
`docs/korrektur-gtp-vorabfestlegung.md` §3.

### 7.4 Was offen bleibt

- **TRAIN-2** steht weiter im Code, ohne Vorabfestlegung.
- Die Warnung in der Engine, die alle Aufrufer auf einmal abdecken würde (§3, erwogen und verworfen): bleibt eine
  eigene Festlegung, falls sie jemand will. Sie bräuchte einen Engine-Vergleich.
  **Entschieden am 23.11.2026** in `docs/passregel-wege-nachtrag-vorabfestlegung.md`: **nicht in die Engine, aber
  die Lücke wird anders geschlossen** (dort §1.5). Der verbleibende Einwand ist ein `throw` im heißen Pfad des
  Produkts für eine Versicherung gegen einen Fall, von dem festgelegt ist, dass er nicht eintritt. Die Buchhaltung
  wiegt dabei weniger, als hier zuerst stand: Eine neue Prüfsumme ist eingeübte Praxis, `policy-net` wurde durch
  NET-1 und DASH-1 schon zweimal neu grundliniert (dort §1.3, Berichtigung). Statt der Engine-Warnung hält **T-PR1**
  den Bestand der Aufrufer geschlossen — eine neue Datei, die die Engine anfasst, macht die CI rot, bis jemand sie
  einordnet. Vorbehalt: T-PR1 prüft Text, nicht Verhalten. Der Entwurf für die Engine-Warnung liegt fertig, falls die
  Versuchsregel je eingeschaltet wird; dann ist er der erste Schritt davor.
  Beim Nachzählen kamen **20 Dateien** heraus, die die Engine antreiben, in vier Klassen (dort §1.4) — alle
  abgedeckt. Zwei geben `extra` an `getAIMove` weiter, zwei rufen `passNachGegnerpassPruefung` direkt mit `extra` auf,
  fünf haben einen Wächter, und elf setzen `PARAMS` nur aus `DEFAULT` plus festen Literalen und nennen den Schalter
  nirgends — sie sind allein deshalb sicher, weil der Standardwert 0 ist. Die Zahl „elf Aufrufer mit festen
  Literalen" aus §3 ist damit bestätigt; sie ist aber nicht der ganze Bestand.
  Beim Prüfen dieser Frage fiel **BR-1** auf: Der Reproduktions-Schnappschuss des Fehlerberichts trägt `extra` nicht,
  verspricht aber „1:1" — siehe dort §2.
- Ob die Versuchsregel überhaupt eingeschaltet werden soll: unverändert nein, sie bleibt auf 0.
