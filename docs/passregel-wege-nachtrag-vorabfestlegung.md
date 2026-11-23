# Versuchsregel, Nachtrag: die Warnung in der Engine und der Schnappschuss (BR-1)

**Stand: 23.11.2026. Status: Entwurf, nicht umgesetzt.** Zwei Fragen aus `docs/passregel-wege-vorabfestlegung.md`
§7.4. Beide drehen sich um dieselbe Sache: **welche Wege geben der Engine `extra` mit, und was passiert, wenn einer
es nicht tut.**

Hazeberry hat am 23.11.2026 autonomes Weiterarbeiten freigegeben. Dieses Doc enthält Vorgaben; er liest es vor dem
Merge. Die Empfehlungen sind meine, mit den Gründen daneben, damit sie umkehrbar sind.

| Frage | Herkunft | Empfehlung |
|---|---|---|
| **A** — `passNachGegnerpassPruefung` meckert, wenn der Schalter an ist und `extra` fehlt | §3 und §7.4 des Haupt-Docs, dort erwogen und verworfen | **nicht umsetzen** (§2) |
| **B** — **BR-1**, neu: der Reproduktions-Schnappschuss im Fehlerbericht trägt `extra` nicht, verspricht aber „1:1" | beim Prüfen von Frage A gefunden | **umsetzen** (§3 bis §6) |

Die Kennung **BR** steht für Bug-Report; `D` ist in dieser Reihe für das Dashboard belegt (D-1, D-2).

## 1. Frage A: die Warnung in der Engine — Empfehlung: nicht umsetzen

### 1.1 Was es wäre

Die Prüffunktion verlässt sich heute auf eine Bedingung, die drei Gründe zusammenfasst (`index.html` Z. 5226):

```js
if (!(PARAMS.passNachGegnerpass >= 1) || !extra || !extra.gegnerPasste) return null;
```

Ein Wächter wäre die Aufspaltung:

```js
  if (!(PARAMS.passNachGegnerpass >= 1)) return null;
  if (!extra) throw new Error('passNachGegnerpass ist an, aber extra fehlt — der Aufrufer gibt die Regel nicht weiter.');
  if (!extra.gegnerPasste) return null;
```

**Abbruch, nicht Warnung.** Der Grund steht schon im Haupt-Doc §3: Eine Warnung im Protokoll eines Messlaufs geht
unter, und der Fall ist genau der, in dem jemand eine Messung für gültig hält, die ohne die Regel lief. Dieselbe
Überlegung gilt hier; „meckern" wäre die schwächere Form derselben Idee. Die vier Wächter in den Werkzeugen brechen
ebenfalls ab.

### 1.2 Dass es sicher wäre, ist geprüft

- **Bei Schalter aus unerreichbar.** Die erste Zeile kehrt um, bevor die neue Zeile erreicht wird. Default ist
  `passNachGegnerpass: 0`, und er bleibt es.
- **Im Browser unerreichbar, auch bei Schalter an.** Alle drei echten `getAIMove`-Aufrufe geben `extra` mit, am Code
  nachgelesen: der Worker-Weg mit `d.extra` aus der Botschaft (Z. 6035 bis 6040), deren Aufbau `extra: passExtra()`
  enthält (Z. 6280); `fallbackToMainThread` mit `passExtra()` (Z. 6085 bis 6088); der Leicht/Mittel-Weg mit
  `passExtra()` (Z. 6353 bis 6356, dort greift die Regel ohnehin nicht, weil `diff !== 'hard'`).
- **In Node würde sie genau die vier Fälle treffen**, die heute die vier Wächter abdecken — und zusätzlich jedes
  künftige Werkzeug. Das ist der eigentliche Reiz.

### 1.3 Was es kostet

- **`worker-ai` verliert die Byteidentität.** Darauf beruft sich **jede** bisherige Korrektur in ihrem ersten
  Abnahmepunkt („die drei Engine-Blöcke haben die Prüfsummen aus §1"). Nach dieser Änderung ist `f847c124…` nicht
  mehr der Wert, und die Liste in `docs/korrektur-d1-w1-vorabfestlegung.md` §1 braucht einen neuen Nachtrag, auf den
  sich alle späteren Docs beziehen müssen.
- **Ein Engine-Vergleich in Actions wird nötig** (`ladeEngine` lädt diesen Block), nach eigenem Go. Er würde bei
  Schalter aus „gleich" zeigen, denn die neuen Zeilen sind dann unerreichbar. Sein Wert liegt nicht im Nachweis der
  Logik, sondern darin, dass sonst nichts im Block verrutscht ist.
- **Der Nutzen ist heute null.** Die Warnung feuert nur, wenn jemand `passNachGegnerpass` einschaltet. Die Regel
  bleibt auf 0, und aus keinem Ergebnis folgt eine Aktivierung (`docs/passregel-vergleich.md`). Es ist eine
  Versicherung gegen einen Fall, von dem das Projekt festgelegt hat, dass er nicht eintritt.

### 1.4 Empfehlung

**Nicht umsetzen.** Der Tausch ist schlecht: Er gibt die einzige Invariante her, auf die sich die ganze
Korrekturreihe stützt, und kauft dafür eine Versicherung gegen einen Fall, der nach eigener Festlegung nicht
eintritt. Die vier Wächter decken jedes heute existierende Node-Werkzeug ab; ein künftiges schreibt jemand, der
`CLAUDE.md` und die Passregel-Docs liest, und `docs/passregel-wege-vorabfestlegung.md` §3 nennt die Falle beim Namen.

**Was die Empfehlung umdrehen würde:** Sollte die Versuchsregel je eingeschaltet werden, ist dieser Wächter der
**erste** Schritt davor und nicht mehr optional — dann feuert er nicht hypothetisch, sondern bei jedem Aufrufer, der
nicht mitgezogen ist. Der Entwurf in §1.1 ist für diesen Fall fertig.

**Was ich nicht behaupte:** Dass die vier Wächter lückenlos sind. Sie decken die vier Werkzeuge ab, die `extra`
weitergeben könnten und es nicht tun. Ein Werkzeug, das es morgen neu gibt, ist nicht abgedeckt — das ist der Preis
dieser Empfehlung und kein Nebeneffekt.

## 2. Frage B, Befund BR-1: der Schnappschuss ist nicht der Worker-Request 1:1

### 2.1 Die Zusage

`buildBugReport` beschreibt das Feld `reproduktion` so (Z. 6880 bis 6883):

> `reproduktion`: der letzte Worker-Request **1:1** (Brett, Historie-Hashes, Gefangene, Ko-Punkt, PARAMS) —
> `getAIMove` damit füttern reproduziert **exakt** den Zug, bei dem es geklemmt hat.

Dieselbe Zusage steht am Schnappschuss selbst (Z. 6228 bis 6230): „Form wie das Worker-postMessage — damit ein
Hänger später außerhalb des Spiels 1:1 nachgestellt werden kann".

### 2.2 Die Wirklichkeit, gemessen

| | echter Worker-Request (Z. 6271) | Schnappschuss (Z. 6234) |
|---|---|---|
| `board`, `aiColor`, `histHashes`, `captures`, `mc`, `koPoint`, `lastMove`, `params`, `netBlend` | ja | ja |
| `reqId` | **ja** | **nein** |
| `extra` | **ja** (`passExtra()`) | **nein** |
| `netPriors` | **ja** | **nein** |
| `lastMsPerSim` | nein | ja (Diagnose) |

Gemessene Schlüssel des Schnappschusses, im Browser über den echten Weg (`triggerAIMove` mit `workerDead`, damit der
Schnappschuss entsteht): `board, aiColor, histHashes, captures, mc, koPoint, lastMove, params, netBlend,
lastMsPerSim`. `extra` und `netPriors` fehlen, `buildBugReport().reproduktion` enthält `extra` ebenfalls nicht.

**Die Folge, am selben Zug gemessen.** Stellung: Weiß besitzt das Brett mit zwei Augen, Schwarz hat gepasst,
`passNachGegnerpass` auf 1, Stufe Schwer. Derselbe Aufruf zweimal, einmal mit `passExtra()` und einmal mit dem
`extra` aus dem Schnappschuss (also `undefined`):

| | mit `passExtra()` (so läuft das Spiel) | mit dem Schnappschuss |
|---|---|---|
| Zug | `pass` | `pass` |
| `info` | „Pass — Gegner hat gepasst, Vorsprung 368.5/368.5 (**Versuchsregel**)" | „Pass — frei sind nur noch eigene Augen" |
| `versuch` | `{pass: true, grund: null}` | **`null`** |

Die Nachstellung läuft also über einen **anderen Zweig** und liefert ein anderes `info` und kein `versuch`-Feld. Die
Zusage „1:1" und „exakt" trifft nicht zu.

**Was die Messung nicht zeigt:** dass der **Zug selbst** abweichen kann. In dieser Stellung ist das Brett voll, beide
Zweige passen. Dass die Regel den Zug ändert, ist aber an anderer Stelle gemessen:
`docs/korrektur-gtp-vorabfestlegung.md` §11.2, Partie 427 — mit Schalter antwortet `genmove B` mit `pass`, ohne
Schalter mit einem Stein (`R4`). In einer solchen Stellung würde die Nachstellung aus dem Fehlerbericht also einen
**anderen Zug** ergeben. Das ist ein Schluss aus zwei Messungen, keine eigene Messung.

### 2.3 Wie schwer das wiegt

**Heute latent, nicht wirksam.** Mit `passNachGegnerpass` 0 geben beide Wege `null` zurück, und die Nachstellung
stimmt. Wirksam wird es, sobald jemand den Schalter einschaltet — und dann trifft es genau das Werkzeug, mit dem man
einen Fehler sucht. Das ist die unangenehmste Stelle für eine solche Lücke: Ein Fehlerbericht, der den Fehler nicht
reproduziert, führt die Diagnose in die Irre, statt sie zu stoppen.

**`netPriors` ist der mildere Fall.** Eine Nachstellung mit echtem `policyNet` rechnet die Priors selbst
(`_getAIMoveKern` Z. 5387); dieselben Werte entstehen, solange die Gewichte dieselben sind. Die Gewichte stehen nicht
im Schnappschuss (es wären rund 2,2 MB), und mit `netMaxBlend` 0 gehen die Priors ohnehin nicht in die Zugwahl ein.
`reqId` wirkt gar nicht auf den Zug, sie wird nur durchgereicht.

## 3. Änderung für BR-1

Drei Einfügungen und eine Berichtigung am Kommentar. **Nur das Hauptskript** (Block ohne `id`, Z. 5632 bis 6920);
`shared-go-logic`, `worker-ai` und `policy-net` bleiben **byteidentisch**, Prüfsummen `54dfef2d…`, `f847c124…`,
`14cb39a1…`. `PARAMS_DEFAULT` bleibt gleich. Kein Schalter, kein Engine-Vergleich, kein Messlauf.

**(a) Der Schnappschuss des Schwer-Wegs** (Z. 6234) bekommt `reqId` und `extra`:

```js
      mc:         state.moveCount,
      reqId,                                 /* BR-1: der echte Request hat sie */
      koPoint:    state.koPoint,
      lastMove:   state.lastMove,
      extra:      passExtra(),               /* BR-1: ohne extra stellt man den Zug OHNE die Versuchsregel nach */
```

`reqId` steht an dieser Stelle im Gültigkeitsbereich (Z. 6187).

**(b) Der Schnappschuss des Leicht/Mittel-Wegs** (Z. 6334) ebenso. Dort greift die Regel nicht (`diff !== 'hard'`),
die Felder gehören aber zum Aufruf, der wirklich stattfindet (`passExtra()`, Z. 6356) — sonst wandert die Lücke nur.

**(c) Der Kommentar an `buildBugReport`** (Z. 6880) nennt die verbleibende Grenze, statt „1:1" zu versprechen:
`netPriors` und die Netzgewichte stehen nicht im Bericht; eine Nachstellung rechnet die Priors neu und ist darum nur
exakt, solange die Gewichte dieselben sind — bei `netMaxBlend` 0 ohne Belang, weil die Priors nicht in die Zugwahl
eingehen.

**Bewusst so:**
- **`netPriors` wird nicht aufgenommen.** 361 Zahlen je Zug im Fehlerbericht, den man in die Zwischenablage kopiert,
  für einen Nutzen, der bei `netMaxBlend` 0 nicht existiert. Ohne die Gewichte wäre der Bericht trotzdem nicht
  exakt — die aufzunehmen wären rund 2,2 MB. Die ehrliche Grenze im Kommentar ist hier mehr wert als ein halber Fix.
- **`passExtra()` wird aufgerufen, nicht nachgebaut.** Derselbe Ausdruck wie am echten Aufruf; ein zweiter Aufbau
  könnte auseinanderlaufen.
- **Der Schnappschuss behält `lastMsPerSim`.** Es gehört nicht zum Request, aber zur Diagnose, und niemand füttert
  `getAIMove` mit einem unbekannten Feld.

**Erwogen und verworfen:**
- *Nur den Kommentar berichtigen, die Felder lassen.* Macht die Zusage ehrlich und den Bericht weiter unbrauchbar für
  den Fall, der ihn braucht. `extra` kostet nichts.
- *Den Schnappschuss aus `anfrage` ableiten* (`{...anfrage, lastMsPerSim}`). Verlockend, aber `anfrage` entsteht erst
  nach der `workerDead`-Prüfung und nach dem Watchdog-Aufbau; auf dem Rückfall- und dem Leicht/Mittel-Weg gibt es sie
  gar nicht. Eine Umstellung der Reihenfolge wäre eine größere Änderung an einem Pfad, den UI-1 und W-1 gerade erst
  geordnet haben.

**Nicht Teil der Änderung:** Frage A (§1), TRAIN-2 (in eigenen PRs), die Frage, ob die Versuchsregel eingeschaltet
wird — sie bleibt auf 0.

## 4. Tests (in der Umsetzung)

In `tests/browser-ui.js`, Benennung `T-BR…`; die Zeile in `tests/README.md` wird ergänzt.

**Vorgabe zum Aufbau:** Der Schnappschuss muss über den **echten Weg** entstehen (`triggerAIMove()` mit
`state.workerDead = true`, damit er gebaut wird und der Rückfall rechnet) — nicht von Hand nachgebaut. Ein
nachgebautes Objekt würde am alten wie am neuen Code dasselbe enthalten und nichts prüfen.

| Test | Prüft | am alten Code |
|---|---|---|
| T-BR1 | Schwer-Weg: der Schnappschuss trägt `extra` mit `gegnerPasste`, `wertung`, `komi` und trägt `reqId`; mit ihm gefüttert liefert `getAIMove` dasselbe `info` und dasselbe `versuch` wie der echte Aufruf | **scheitert**: kein `extra`, `versuch` `null`, anderes `info` |
| T-BR2 | Leicht/Mittel-Weg: der Schnappschuss trägt `extra` und `reqId` | **scheitert**: beide fehlen |
| T-BR3 | Mit dem Default `passNachGegnerpass` 0 liefert die Nachstellung aus dem Schnappschuss denselben Zug wie der echte Aufruf (Kontrolle: die Änderung ändert im Normalbetrieb nichts) | besteht |
| T-BR4 | `buildBugReport()` ist weiter gültiges JSON, `reproduktion.params` trägt `passNachGegnerpass`, und `reproduktion` trägt **kein** `netPriors` (Kontrolle zur bewussten Entscheidung in §3) | besteht bis auf `extra` — wird so geschrieben, dass es an beiden Ständen besteht |

Jeder Test läuft auch am alten Stand; das Ergebnis gehört in den Nachtrag.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §3, `PARAMS_DEFAULT` ist unverändert.
2. T-BR1 und T-BR2 scheitern am alten Code und bestehen am neuen; T-BR3 und T-BR4 bestehen an beiden.
3. Die bestehenden Tests in `tests/browser-ui.js` bleiben unverändert und bestehen, darunter T-U1 bis T-U4 und
   T-W1 bis T-W4 — sie fassen `triggerAIMove` und den Rückfallweg an.
4. `node tests/run.js` lokal grün, CI grün. Besonders zu beachten: `tests/zeit-zerlegung.js`, weil es
   `reproduktion.params` aus abgelegten Berichten liest, und `tests/passregel-versuch.js`.
5. `auswertung/bughunt-20261116/pruefung.js` am neuen Code: weiter 1 von 13 (B-2).
6. Ein abgelegter Fehlerbericht aus `docs/daten/` lässt sich weiter einlesen (Punkt 4 deckt das über
   `tests/zeit-zerlegung.js` ab; hier nur als eigene Zusage genannt, weil der Bericht ein Austauschformat ist).

**Ungültig** heißt: kein Merge, der Grund steht als Nachtrag in diesem Doc.

## 6. Grenzen

- **Frage A ist nicht gemessen, sondern abgewogen.** Die Behauptungen über Unerreichbarkeit in §1.2 sind am Code
  gelesen, nicht ausgeführt; ein Engine-Vergleich ist bewusst nicht gelaufen, weil die Änderung nicht vorgeschlagen
  wird.
- **BR-1 ist in einer Umgebung gemessen** (Chromium über Playwright, Container) und in einer künstlichen Stellung.
  Dass der Zug selbst abweichen kann, ist geschlossen, nicht gemessen (§2.2).
- **Kein Messlauf, keine Spielstärkeaussage.** Beide Fragen betreffen Diagnose und Werkzeuge, nicht die Zugwahl im
  Default.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Für Frage A ist damit nichts zu tun, wenn er der Empfehlung folgt; `docs/passregel-wege-vorabfestlegung.md` §7.4
  bekommt einen Verweis hierher.
3. BR-1 als eigener PR: Code nach §3, Tests nach §4, `tests/README.md`, Nachtrag hier mit den Ergebnissen aus §5.
4. CI grün, Merge, `unsubscribe_pr_activity`, kurzer Bericht mit den löschbaren Branches.
