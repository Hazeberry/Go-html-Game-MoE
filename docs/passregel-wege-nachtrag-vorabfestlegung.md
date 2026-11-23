# Versuchsregel, Nachtrag: die Warnung in der Engine und der Schnappschuss (BR-1)

**Stand: 23.11.2026. Status: Entwurf, nicht umgesetzt.** Zwei Fragen aus `docs/passregel-wege-vorabfestlegung.md`
§7.4. Beide drehen sich um dieselbe Sache: **welche Wege geben der Engine `extra` mit, und was passiert, wenn einer
es nicht tut.**

**Stand der Fassung.** Hazeberry hat am 23.11.2026 autonomes Weiterarbeiten freigegeben und mir Frage A und BR-1
ausdrücklich ins eigene Ermessen gestellt, mit der Einladung, noch einmal nachzudenken. Das habe ich getan, und es
hat zwei meiner eigenen Aussagen widerlegt — beide stehen berichtigt im Text, nicht umgedeutet:

1. **§1.3:** „gibt die einzige Invariante her" war falsch. Die Prüfsumme von `policy-net` ist schon zweimal neu
   grundliniert worden (NET-1, DASH-1); eine neue Grundlinie ist eingeübte Praxis.
2. **§3:** „Ohne die Gewichte wäre der Bericht trotzdem nicht exakt" war falsch. Aufgezeichnete Priors ersetzen die
   Gewichte gerade. Der Grund, sie weglassen, ist jetzt ein gemessener Größenvergleich.
3. **§1.4:** Meine erste Zählung „elf Pfade" war unvollständig. Es sind **20 Dateien**, die die Engine antreiben,
   in vier Klassen. Abgedeckt sind sie alle — aber die Zahl war falsch, und mit ihr die Vorstellung vom Umfang.

Die Empfehlung zu Frage A bleibt im Ergebnis, steht aber auf schmalerem Grund — und sie lässt die Lücke nicht mehr
offen, sondern schließt sie anders (§1.5).

| Frage | Herkunft | Empfehlung |
|---|---|---|
| **A** — `passNachGegnerpassPruefung` meckert, wenn der Schalter an ist und `extra` fehlt | §3 und §7.4 des Haupt-Docs, dort erwogen und verworfen | **nicht in die Engine; stattdessen ein Bestandstest** (§1.5) |
| **B** — **BR-1**, neu: der Reproduktions-Schnappschuss im Fehlerbericht trägt `extra` nicht, verspricht aber „1:1" | beim Prüfen von Frage A gefunden | **umsetzen** (§2 bis §6) |

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

**Berichtigung meines ersten Entwurfs (23.11.2026).** Hier stand, die Änderung gebe „die einzige Invariante her, auf
die sich die ganze Korrekturreihe stützt". **Das war überzogen und ist falsch.** Nachgesehen in
`docs/korrektur-d1-w1-vorabfestlegung.md` §1: Die Prüfsumme von `policy-net` ist dort **schon zweimal** neu
grundliniert worden — Nachtrag vom 22.11.2026 wegen NET-1 (`56a5d6c0…` → neuer Wert) und Nachtrag vom 23.11.2026
wegen DASH-1 (→ `14cb39a1…`). Eine berechtigte Änderung an einem Engine-Block mit neuer Grundlinie ist in diesem
Projekt also **eingeübte Praxis**, keine verlorene Invariante. Es bleiben Buchhaltungskosten: ein weiterer Nachtrag,
auf den sich spätere Docs beziehen.

Was wirklich kostet:

- **Buchhaltung.** `f847c124…` ist nicht mehr der Wert für `worker-ai`; die Liste braucht einen Nachtrag. Nach der
  Berichtigung oben: real, aber klein.
- **Ein Engine-Vergleich in Actions** (`ladeEngine` lädt diesen Block). Er würde bei Schalter aus „gleich" zeigen,
  denn die neuen Zeilen sind dann unerreichbar; sein Wert liegt nicht im Nachweis der Logik, sondern darin, dass
  sonst nichts im Block verrutscht ist. Ein Workflow-Lauf, kein Messlauf — auch das ist klein, und Hazeberry zieht
  Actions ausdrücklich vor.
- **Ein `throw` im heißen Pfad des Produkts.** Das ist der Posten, der bleibt. `getAIMove` läuft im Browser, im
  Worker, in `ladeEngine`, in `ab-harness.js` und in `gtp-ki.js`. Dass die Zeile heute unerreichbar ist, ist
  abgeleitet (§1.2), nicht erzwungen: Sie wird erreichbar, sobald irgendwo der Schalter angeht und ein Aufrufer
  `extra` vergisst — und dann bricht nicht ein Werkzeug ab, sondern möglicherweise ein Zug im Spiel.
- **Der Nutzen ist heute null.** Die Warnung feuert nur, wenn jemand `passNachGegnerpass` einschaltet. Die Regel
  bleibt auf 0, und aus keinem Ergebnis folgt eine Aktivierung (`docs/passregel-vergleich.md`). Es ist eine
  Versicherung gegen einen Fall, von dem das Projekt festgelegt hat, dass er nicht eintritt.

### 1.4 Der vollständige Bestand, nachgezählt

**Zweite Berichtigung (23.11.2026).** Hier stand zuerst eine Tabelle mit „elf Pfaden". Die war **unvollständig**:
Sie zählte die Pfade, an denen der Schalter angehen *kann*, und übersah, dass noch weitere Dateien die Engine
antreiben. Nachgezählt mit `git ls-files '*.js'` ohne `tests/`, gesucht nach `getAIMove(` oder
`passNachGegnerpassPruefung(`: es sind **20 Dateien**. Dazu `index.html` selbst mit seinen drei Browser-Pfaden.

| Klasse | Zahl | Dateien |
|---|---|---|
| **versorgt** — gibt `extra` an `getAIMove` weiter | 2 | `gnugo-duell.js`, `gtp-ki.js` |
| **versorgt direkt** — ruft `passNachGegnerpassPruefung` selbst mit `extra` auf, ohne `getAIMove` | 2 | `auswertung/endspiel/passregel-stellungen.js` (Z. 72), `auswertung/endspiel/passregel-vorsprung.js` (Z. 83) |
| **Wächter** — bricht ab, wenn der Schalter an ist | 5 | `ab-harness.js` (Z. 1111), `auswertung/weiterspielen.js` (Z. 132), `auswertung/diagnose/wurzel-replay.js` (Z. 88), `auswertung/lerner-pruefung.js` (Z. 114), `auswertung/endspiel/passregel-fortsetzung.js` (Z. 221, dazu die Default-Prüfung Z. 401) |
| **feste Literale** — kann den Schalter nicht einschalten | 11 | `auswertung/annaeherung.js`, `auswertung/endspiel/netz-kosten.js`, `auswertung/endspiel/pass-stellungen.js`, `auswertung/kritisch-rang.js`, `auswertung/lebensurteil-vergleich.js`, `auswertung/muster-endspiel-daten.js`, `auswertung/netz-zeit.js`, `auswertung/zugwahl-grund.js`, `auswertung/zugwert-rang.js`, `auswertung/zugwert-suche.js`, `distillation/collect.js` |
| **Browser** — `passExtra()` auf allen drei Wegen | 3 Pfade in `index.html` | Worker-Weg (`d.extra`, Z. 6035 ff.; Aufbau Z. 6280), `fallbackToMainThread` (Z. 6085), Leicht/Mittel (Z. 6353) |

2 + 2 + 5 + 11 = 20. **Jede Datei ist abgedeckt**, und für die elf mit festen Literalen ist nachgeprüft, woran das
hängt: Sie setzen `PARAMS` ausschließlich aus `DEFAULT` beziehungsweise `PARAMS_DEFAULT` plus festen Literalen, unter
denen `passNachGegnerpass` nicht vorkommt, und **keine der elf nennt den Schalter überhaupt** (geprüft mit
`grep -l`). Sie sind also nur deshalb sicher, weil der Standardwert 0 ist — was `passregel-fortsetzung.js` Z. 401
und die Tests festhalten.

Eine Datei gehört noch dazu, die die Engine nicht selbst anfasst: `auswertung/endspiel/passregel-zaehldiagnose.js`
setzt den Schalter auf 1 (Z. 128) und geht über `pruefePartie` aus `passregel-stellungen.js`, also über einen Pfad
der zweiten Klasse. Das sah zuerst wie ein Widerspruch zum Wächter in `passregel-fortsetzung.js` aus; es ist keiner,
nachgeprüft am Quelltext beider Dateien.

Die Lücke ist damit weiterhin **genau eine**: eine Datei, die es heute noch nicht gibt. Aber die Zahl, über die man
dabei redet, ist 20, nicht 6 und nicht 11 — und ohne diese Zählung hätte ich sie weiter falsch genannt.

### 1.5 Empfehlung: nicht in die Engine — aber die Lücke nicht offen lassen

**Die Warnung kommt nicht in die Engine.** Nach der Berichtigung in §1.3 steht die Empfehlung auf einem schmaleren,
aber tragfähigen Grund: Der verbleibende Posten ist ein `throw` im heißen Pfad des Produkts, und er kauft eine
Versicherung gegen einen Fall, von dem festgelegt ist, dass er nicht eintritt. Dafür ist der Preis zu hoch.

**Die Lücke aus §1.4 bleibt aber nicht offen.** Was Frage A eigentlich wollte — ein künftiger Aufrufer wird nicht
stillschweigend übergangen — lässt sich billiger und früher erreichen, als die Engine es kann: mit einem Test, der
den Bestand aus §1.4 **geschlossen** hält.

**T-PR1, Bestandsprüfung.** Der Test führt den Bestand aus §1.4 als Liste, je Datei mit ihrer Klasse, und prüft:

1. **Geschlossene Welt der Aufrufer.** Die Menge der versionierten `.js`-Dateien außerhalb von `tests/`, die
   `getAIMove(` oder `passNachGegnerpassPruefung(` enthalten, ist **genau** die Liste — heute 20. Eine neue Datei,
   die die Engine anfasst, macht den Test rot, bis jemand sie einordnet. Das ist der eigentliche Mechanismus.
2. **Geschlossene Welt der Schalterstellen.** Die Menge der Dateien, die `passNachGegnerpass` überhaupt nennen, ist
   ebenfalls genau eine Liste. Damit fällt auch eine Datei auf, die den Schalter neu anfasst, ohne die Engine selbst
   zu rufen — wie `passregel-zaehldiagnose.js`.
3. Jede `versorgt`-Datei enthält an ihrem Aufruf ein `extra`, jede `waechter`-Datei ihre Abbruchbedingung, und jede
   der elf `feste-literale`-Dateien nennt `passNachGegnerpass` **nicht** — das ist die Eigenschaft, auf der ihre
   Sicherheit beruht, und sie ist prüfbar.

**Was der Test besser kann als die Engine-Warnung:** Er schlägt in der CI zu, **bevor** ein Messlauf läuft, statt
mitten darin; er kostet keine Zeile in der Engine, keine neue Prüfsumme, keinen Engine-Vergleich und kein `throw` im
Produkt; und er greift unabhängig davon, ob der Schalter an ist.

**Was er schlechter kann, und das ist kein kleiner Vorbehalt:** Er prüft **Text, nicht Verhalten**. Eine Datei, die
in der Liste als `versorgt` steht und später einen zweiten Codeweg bekommt, der `extra` vergisst, fällt ihm nicht
auf. Genau das hätte die Engine-Warnung zur Laufzeit gefangen. Der Test ist also **kein Ersatz im strengen Sinn**,
sondern deckt den wahrscheinlicheren der beiden Fälle ab (eine ganz neue Datei) und lässt den selteneren offen (ein
zweiter Pfad in einer bekannten Datei). Beides sind Versicherungen gegen künftige Fehler; die billigere zuerst.

**Was die Empfehlung umdrehen würde:** Sollte die Versuchsregel je eingeschaltet werden, ist der Wächter in der
Engine der **erste** Schritt davor und nicht mehr optional — dann feuert er nicht hypothetisch, und der Vorbehalt
oben („zweiter Pfad in einer bekannten Datei") wird von einer Möglichkeit zu einem Risiko. Der Entwurf in §1.1 ist
für diesen Fall fertig; die Berichtigung in §1.3 hält fest, dass die Kosten dafür kleiner sind, als ich zuerst
geschrieben habe.

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
- **`netPriors` wird nicht aufgenommen — mit berichtigter Begründung.** Hier stand zuerst: „Ohne die Gewichte wäre
  der Bericht trotzdem nicht exakt." **Das war falsch.** Aufgezeichnete Priors ersetzen die Gewichte gerade: Der
  Worker-Pfad rechnet sie nie selbst, er liest `d.netPriors` in einen Stummel (`index.html` Z. 6025 ff.), und ein
  Nachstell-Rahmen, der diesen Stummel nachbaut, käme mit den aufgezeichneten Priors exakt hin, ohne die 2,2 MB
  Gewichte. Der Grund, sie trotzdem weglassen, ist **gemessen**: Ein Fehlerbericht wiegt bei Zug 2 **8 106 Zeichen**
  (`reproduktion.params` 3 058, `board` 723); die 361 Priors wären **7 775 Zeichen** — fast eine Verdopplung von
  etwas, das man auf dem Handy in die Zwischenablage kopiert. `extra` und `reqId` zusammen sind dagegen **70
  Zeichen**. Dazu entsteht der Nutzen nur bei `netMaxBlend` grösser 0 (Default 0, dann gehen die Priors nicht in die
  Zugwahl ein) **und** nur mit einem Rahmen, der den Worker-Stummel nachbaut — den gibt es nicht. Die benannte Grenze
  im Kommentar ist hier mehr wert als 7 775 Zeichen für einen doppelt bedingten Nutzen.
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

Dazu der Test zu Frage A, in `tests/passregel-versuch.js`:

| Test | Prüft | heute |
|---|---|---|
| T-PR1 | Bestandsprüfung nach §1.5: die Liste aller Dateien, die `getAIMove(` oder `passNachGegnerpassPruefung(` enthalten, ist geschlossen; jede `versorgt`-Datei hat ihr `extra`, jede `waechter`-Datei ihre Abbruchbedingung | besteht — er hält den Bestand, er behebt nichts |

T-PR1 ist absichtlich **kein** Rot-nach-Grün-Test: Es gibt heute keine Lücke im Bestand (§1.4). Sein Wert liegt in
der Zukunft. Damit das nicht nur behauptet ist, wird in der Umsetzung **gezeigt**, dass er anspringt: eine
wegwerfbare Datei mit einem `getAIMove(`-Aufruf im Arbeitsbereich, Test rot, Datei weg, Test grün. Das Ergebnis
gehört in den Nachtrag.

Jeder BR-Test läuft auch am alten Stand; das Ergebnis gehört in den Nachtrag.

## 5. Abnahme

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. Die drei Engine-Blöcke haben die Prüfsummen aus §3, `PARAMS_DEFAULT` ist unverändert.
2. T-BR1 und T-BR2 scheitern am alten Code und bestehen am neuen; T-BR3 und T-BR4 bestehen an beiden.
2a. T-PR1 besteht, und es ist **gezeigt**, dass er anspringt: mit einer wegwerfbaren Datei, die `getAIMove(`
   enthält, wird er rot; ohne sie grün. Ausgabe beider Läufe in den Nachtrag.
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
  wird. Der Bestand in §1.4 ist am Quelltext gelesen, nicht ausgeführt.
- **T-PR1 prüft Text, nicht Verhalten** (§1.5). Er deckt eine neue Datei ab, nicht einen zweiten Codeweg in einer
  bekannten. Dieser Rest bleibt offen, und die Engine-Warnung wäre dafür das Mittel.
- **BR-1 ist in einer Umgebung gemessen** (Chromium über Playwright, Container) und in einer künstlichen Stellung.
  Dass der Zug selbst abweichen kann, ist geschlossen, nicht gemessen (§2.2).
- **Kein Messlauf, keine Spielstärkeaussage.** Beide Fragen betreffen Diagnose und Werkzeuge, nicht die Zugwahl im
  Default.

## 7. Ablauf

1. Dieses Doc als PR (#364), CI grün, Merge. Hazeberry hat Frage A und BR-1 ins eigene Ermessen gestellt; die
   Entscheidungen stehen offen im Text und sind mit einem PR umkehrbar.
2. Umsetzung als eigener PR: BR-1 nach §3, T-PR1 nach §1.5 und §4, Tests nach §4, `tests/README.md`,
   `docs/passregel-wege-vorabfestlegung.md` §7.4 um das Ergebnis zu Frage A ergänzt, Nachtrag hier mit den
   Ergebnissen aus §5.
3. CI grün, Merge, `unsubscribe_pr_activity`, kurzer Bericht mit den löschbaren Branches.
4. **In der Engine ändert sich nichts.** Kein Engine-Vergleich, kein Messlauf, keine neue Prüfsumme.
