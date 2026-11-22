# Korrektur H-1: Vorabfestlegung

**Stand: 22.11.2026. Status: umgesetzt (§8), Abnahme gültig.** Befund aus `docs/bughunt-20261116.md` §7 (H-1). Go von
Hazeberry am 22.11.2026: „H-1 Vorabfestlegung".

Dieses Doc enthält Vorgaben für die Umsetzung. Hazeberry liest es vor dem Merge. Die Umsetzung folgt danach in einem
eigenen PR, nach dem Muster der bisherigen Korrekturen.

## 1. Grundsatz: Es ändert sich nur ein Text

H-1 ist ein falscher Hinweistext im Dashboard. Geändert wird **eine Zeichenkette** in der Abschnittsliste des
Dashboards, sonst nichts: kein Parameter, kein Standardwert, keine Rechnung, kein Schalter. `PARAMS_DEFAULT` bleibt
gleich. Die Blöcke `shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch** (Prüfsummen wie in
`docs/korrektur-d1-w1-vorabfestlegung.md` §1, am Stand `8666a92` gültig).

Das Spiel verhält sich danach bitgleich. Kein Messlauf, kein Engine-Vergleich.

## 2. Befund

Zeilen am Stand `8666a92` (`index.html` SHA-256 `1df02491…`).

Der Abschnitt `polnet` („🧠 Policy-Netz", Z. 7765 ff.) trägt diesen Hinweis (Z. 7767):

> 3971→128→361 Netz, REINFORCE. Score = (1−blend)·MoE + blend·Prior·scale. **Blend wächst automatisch: nach 5 Spielen
> ~30% Einfluss.** Gewichte in localStorage. Gradienten-Deckel 0 = aus — dann divergiert das Training (siehe Kommentar
> bei netGradClip).

Der hervorgehobene Satz ist falsch. Die übrigen Behauptungen des Hinweises sind geprüft und **richtig** (§6).

### Was `blendWeight` wirklich tut

`PolicyNet.blendWeight` (Z. 6948 bis 6956):

```js
if (!this._healthy) return 0;
if (this.gamesPlayed < 2) return 0;
return Math.min(PARAMS.netMaxBlend,
  (this.gamesPlayed / Math.max(1, PARAMS.netWarmup)) * PARAMS.netMaxBlend);
```

Weil `netMaxBlend` nie negativ ist, ist das gleichbedeutend mit
`netMaxBlend × min(1, Spiele/netWarmup)`, ab zwei Spielen und nur bei gesundem Netz. In 45 geprüften Kombinationen
stimmen beide Formen genau überein (§6).

Die Standardwerte sind `netMaxBlend` 0,00 (Z. 1868) und `netWarmup` 10 (Z. 1869). **Mit `netMaxBlend` 0 ist
`blendWeight` immer 0**, für jede Spielzahl — gemessen (§6). Der Blend ist der einzige Weg des PolicyNets in die
Zugwahl (`if (_bw > 0)`, Z. 5396; vgl. `docs/bughunt-wiederholung.md` §6). Das Netz rechnet und lernt, steuert aber
nie mit.

Der Satz ist damit in zwei Punkten falsch:

1. **„wächst automatisch"** — im Standard wächst nichts. Das setzt `netMaxBlend` größer 0 voraus, und das muss jemand
   im Dashboard von Hand setzen.
2. **„nach 5 Spielen ~30%"** — die Zahl passt zu keiner Standardlage. Gemessen ergeben fünf Spiele 30 % genau bei
   `netMaxBlend` 0,6 mit `netWarmup` 10, oder bei `netMaxBlend` 0,3 mit `netWarmup` 5. Mit den heutigen Standardwerten
   sind es 0 %.

Außerdem **fehlt** dem Satz, dass `_healthy` false den Blend ebenfalls stilllegt (gemessen: 0 trotz `netMaxBlend` 0,6).

### Was der Hinweis widerspricht

Der 🧠-Indikator in der Oberfläche sagt es richtig: bei `netMaxBlend` 0 lautet sein Titel „PolicyNet: lernt mit,
steuert nicht (netMaxBlend 0)" (Z. 6663 bis 6665). Die Oberfläche behauptet an zwei Stellen Verschiedenes.

### Herkunft, nicht belegt

Dass der Satz einmal gestimmt hat, ist in diesem Repo **nicht nachvollziehbar**: `netMaxBlend` steht schon im ersten
Commit, der die Zeile enthält (`35e3581`, Übernahme aus dem Schwesterrepo), auf 0,00. Dass „~30 % nach 5 Spielen" zu
`netMaxBlend` 0,6 passt, ist eine Rechnung, keine Geschichte. **Hypothese**, kein Befund.

### Keine weiteren falschen Hinweise

Alle zehn Abschnittshinweise des Dashboards wurden auf Zahlenaussagen durchgesehen. Außer H-1 ist keiner falsch:
`passGainThreshold` (Standard 60) mit den Vorschlägen 40 und 100, `useMCTS=0` als alter Ansatz (Standard 1) und die
Crisis-Formel `(1−wCrisis)·sPhase + wCrisis·sCrisis` (wörtlich wie Z. 4044) stimmen. Das ergänzt die Tooltip-Prüfung
aus `docs/bughunt-20261116.md` §7, die nur Zahlen hinter „Default" und „Standard" erfasste.

## 3. Änderung

Der Hinweis des Abschnitts `polnet` wird zu:

```
3971→128→361 Netz, REINFORCE. Score = (1−blend)·MoE + blend·Prior·scale, mit
blend = netMaxBlend × min(1, Spiele/netWarmup), erst ab 2 Spielen und nur bei gesundem Netz.
Mit netMaxBlend 0 (Default) lernt das Netz nur mit und steuert nie. Gewichte in localStorage.
Gradienten-Deckel 0 = aus — dann divergiert das Training (siehe Kommentar bei netGradClip).
```

(im Code eine Zeile, wie bisher)

Vier Dinge dabei:

1. Die Formel steht da, statt eines Beispiels mit einer Zahl. Ein Beispiel veraltet, sobald jemand einen Standardwert
   ändert; die Formel nicht.
2. Der Standard wird genannt, mit seiner Folge: lernt mit, steuert nie. Das ist derselbe Wortlaut wie im
   🧠-Indikator, also sagt die Oberfläche an beiden Stellen dasselbe.
3. „nur bei gesundem Netz" nimmt den `_healthy`-Fall auf, der bisher fehlte.
4. Die richtigen Teile des alten Hinweises bleiben wörtlich stehen.

**Zeichen:** Der Hinweis wird als HTML-Inhalt eines `div` eingesetzt (Z. 7829), nicht als Attribut. Er darf deshalb
keine spitzen Klammern und kein kaufmännisches Und enthalten; Anführungszeichen kommen ohnehin nicht vor. Die Zeichen
`→ − · ×` sind wie bisher unbedenklich.

**Unverändert:** jeder Parameter, jeder Standardwert, jeder Tooltip, der 🧠-Indikator, die Engine (§1).

**Erwogen und verworfen:**
- *Nur „nach 5 Spielen ~30%" streichen und „Blend wächst automatisch" stehen lassen.* Dann bliebe die falsche
  Kernaussage: im Standard wächst nichts.
- *Den Standardwert `netMaxBlend` auf einen Wert größer 0 setzen, damit der Hinweis stimmt.* Das wäre eine Änderung am
  Spiel und keine Textkorrektur. Sie bräuchte eine eigene Vorabfestlegung und eine Messung — `docs/bughunt-20261116.md`
  §7 hält fest, dass TRAIN-1, TRAIN-2 und NET-1 erst bei einem Blend größer 0 wirken, und die sind offen. **Nicht Teil
  dieser Korrektur.**
- *Den Hinweis aus den Daten in ein `title`-Attribut verschieben.* Keinen Anlass; der Hinweis wird über den
  ℹ-Knopf ein- und ausgeblendet und soll das bleiben.

**Nicht Teil der Korrektur:** UI-2, UI-3, TRAIN-1, TRAIN-2, NET-1, GTP-1 bis GTP-3. Die rund 2 100 Kommentarzeilen im
Parameterblock, die nach `docs/bughunt-20261116.md` §7 nur nach einer Form durchsucht, nicht vollständig gelesen sind.

## 4. Tests (in der Umsetzung)

Die Tests kommen in `tests/browser-ui.js`, die Zeile in `tests/README.md` wird ergänzt. Gelesen wird das gerenderte
Element `#pdhint-polnet`.

| Test | Prüft | vor der Korrektur |
|---|---|---|
| T-H1 | Der Hinweis des Abschnitts `polnet` nennt `netMaxBlend 0` samt der Folge („steuert nie") und die Formel mit `netWarmup`; die Zeichenfolge „nach 5 Spielen" kommt nicht vor; der Text enthält weder `<` noch `&` | scheitert: „nach 5 Spielen" steht da, `netMaxBlend 0` fehlt |
| T-H2 | `policyNet.blendWeight` stimmt mit `netMaxBlend × min(1, Spiele/netWarmup)` überein — 45 Kombinationen aus `netMaxBlend` 0/0,3/0,5/0,6/1, `netWarmup` 1/5/10 und 0 bis 25 Spielen —, ist 0 unter zwei Spielen und 0 bei `_healthy` false | besteht (Kontrolle: bindet den Text an das Verhalten) |
| T-H3 | Mit den Standardwerten ist `blendWeight` für alle geprüften Spielzahlen 0 | besteht (Kontrolle) |

T-H1 muss am alten Code fehlschlagen und am neuen bestehen. T-H2 und T-H3 bestehen an beiden; sie schlagen an, wenn
jemand die Formel oder den Standard ändert, ohne den Text nachzuziehen.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §1, und `PARAMS_DEFAULT` ist unverändert.
2. Der Diff an `index.html` besteht aus **genau einer geänderten Zeile**, der Zeichenkette des Hinweises.
3. T-H1 schlägt am alten Code fehl und besteht am neuen; T-H2 und T-H3 bestehen an beiden.
4. Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen am neuen Code — heute sind das 35
   ausgeführte Tests.
5. `node tests/run.js` lokal grün, CI grün.
6. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 reproduziert, nämlich B-2. Die Ausgabe
   wird als `docs/daten/bughunt-20261116/nach-h1.json` abgelegt, mit Konsole.

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

Punkt 6 ist eine Kontrolle gegen Rückschritte: Das Prüfskript kennt H-1 nicht.

## 6. Prüfung des Entwurfs (22.11.2026)

Lokal, Chromium 153.0.8010.12 headless, Node v22.23.5, nur Seitenaufrufe auf `127.0.0.1`, an der **unveränderten**
`index.html` am Stand `8666a92`. Keine Partie, kein Messlauf.

**Die Formel, die in §3 in den Hinweis soll, stimmt mit dem Code überein:** 45 Kombinationen geprüft
(`netMaxBlend` 0 / 0,3 / 0,5 / 0,6 / 1 mit `netWarmup` 1 / 5 / 10, je für 0, 1, 2, 3, 5, 9, 10, 11 und 25 Spiele),
**0 Abweichungen** zwischen `policyNet.blendWeight` und `netMaxBlend × min(1, Spiele/netWarmup)` beziehungsweise 0
unter zwei Spielen.

**Die Standardlage:** `netMaxBlend` 0, `netWarmup` 10; `blendWeight` ist für jede geprüfte Spielzahl 0.

**Die Zahl aus dem alten Satz:** Fünf Spiele ergeben 0 % im Standard, 30 % bei `netMaxBlend` 0,6 mit `netWarmup` 10 und
30 % bei `netMaxBlend` 0,3 mit `netWarmup` 5.

**Der `_healthy`-Fall:** `_healthy` false ergibt 0 trotz `netMaxBlend` 0,6 und fünf Spielen.

**Die übrigen Behauptungen des Hinweises, am Code geprüft:**

| Behauptung | Befund |
|---|---|
| `3971→128→361 Netz` | richtig: `IN` 3971, `HID` 128, `OUT` 361 (Z. 6906 bis 6908) |
| `Score = (1−blend)·MoE + blend·Prior·scale` | richtig, wörtlich wie Z. 5405 |
| `Gewichte in localStorage` | richtig, Schlüssel `go_pnet` |
| `Gradienten-Deckel 0 = aus` | richtig: `cap = netGradClip > 0 ? netGradClip : Infinity` (Z. 7168), Standard 1,00 |
| `dann divergiert das Training` | vom Kommentar bei `netGradClip` (Z. 1872 bis 1885) gedeckt, der es nicht nur behauptet, sondern misst: über 400 Züge je Partie bei `netMaxBlend` 0,09 in 5 von 6 Läufen nicht-finite Gewichte binnen 30 Partien |
| `REINFORCE` | derselbe Kommentar nennt das Verfahren ausdrücklich so („dieses REINFORCE", Z. 1872); die Rechenschritte selbst sind hier nicht nachgerechnet |

**Grenzen:** Nur Chromium 153 headless. Die Spielzahlen und Parameter sind im Test gesetzt, nicht erspielt. Zum
Trainingsverfahren („REINFORCE") ist keine eigene Prüfung gemacht. Keine Messung der Spielstärke — die Korrektur
ändert das Spiel nicht.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Umsetzung in einem eigenen PR nach eigenem Go: Text nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit
   den Ergebnissen aus §5 und eine Zeile in `docs/bughunt-20261116.md` §7.
3. CI grün, Merge, kurzer Bericht mit den löschbaren Branches.

## 8. Nachtrag: Umsetzung und Abnahme (22.11.2026)

Hazeberry, nach grüner CI von #343: „Go". Die Umsetzung folgt §3 und §4 ohne Abweichung. Geändert sind `index.html`
(eine Zeile: die Zeichenkette des Hinweises), `tests/browser-ui.js` (T-H1 bis T-H3 und der Kommentarkopf) und
`tests/README.md`.

**Abnahme nach §5:**

1. **Prüfsummen und Standardwerte:** Die drei Engine-Blöcke haben die Prüfsummen aus §1, nach der Änderung
   nachgerechnet. Der Diff berührt keinen Parameter; `PARAMS_DEFAULT` ist unverändert. Erfüllt.
2. **Umfang:** `git diff --numstat index.html` ergibt `1  1  index.html` — genau eine Zeile ersetzt. Erfüllt.
3. **Neue Tests:** Am alten Code (`index.html` SHA-256 `1df02491…`, Stand `39e7f39`) schlägt T-H1 fehl, und zwar an
   der Prüfung „nennt netMaxBlend 0"; T-H2 und T-H3 bestehen dort (37 bestanden, 1 fehlgeschlagen). Am neuen Code
   bestehen alle 38 Tests der Datei. Erfüllt.
4. **Bestehende Tests:** unverändert übernommen; die 35 bestehen am neuen Code. Erfüllt.
5. **Testsuite:** `node tests/run.js` mit Browser-Tests: **alle 60 Testdateien bestanden**, Exit 0. Eine Prüfung
   übersprang sich, weil GNU Go lokal fehlt (wie bei R-1 und UI-1). Die CI steht im PR. Erfüllt, sobald die CI grün
   ist.
6. **Prüfskript:** `auswertung/bughunt-20261116/pruefung.js` am neuen Code: 1 von 13 reproduziert, nämlich B-2 — das
   Soll. Daten: `docs/daten/bughunt-20261116/nach-h1.json`, Konsole `nach-h1-konsole.txt`. Erfüllt.

**Der Hinweis lautet jetzt** (eine Zeile im Code, hier umgebrochen):

```
3971→128→361 Netz, REINFORCE. Score = (1−blend)·MoE + blend·Prior·scale, mit
blend = netMaxBlend × min(1, Spiele/netWarmup), erst ab 2 Spielen und nur bei gesundem Netz.
Mit netMaxBlend 0 (Default) lernt das Netz nur mit und steuert nie. Gewichte in localStorage.
Gradienten-Deckel 0 = aus — dann divergiert das Training (siehe Kommentar bei netGradClip).
```

355 Zeichen, ohne spitze Klammern, kaufmännisches Und oder Anführungszeichen (im Test geprüft, T-H1).

Neue `index.html`: SHA-256 `334166b01e86126b6d96c3b044ac58c0473c80ae6270f9889aa7f6895de7a4e7`.

**Grenzen:** Nur Chromium 153 headless. Die Spielzahlen und Parameter in T-H2 und T-H3 sind gesetzt, nicht erspielt.
Das Spiel ist unverändert, es gibt also nichts zu messen. Zum Trainingsverfahren („REINFORCE") ist weiterhin keine
eigene Prüfung gemacht; der Kommentar bei `netGradClip` nennt es so.
