# Vergleich mit der PWA: ist die Engine schlechter geworden?

Vorab festgelegt am 29.10.2026, vor jedem Lauf. Hazeberry hat den Versuch an
diesem Tag beauftragt. Der Messlauf startet erst nach einem eigenen Go.

## 1. Anlass und Frage

Hazeberry hatte den Eindruck, die Engine sei schlechter geworden. Die
Partie dazu lief auf der Stufe „Mittel“, die nicht sucht. Auf „Schwer“
gewann die KI danach W+226,5. Hazeberry hat eine ältere Fassung, die PWA, und
hält den direkten Vergleich für aussagekräftiger als weitere Messungen gegen
GNU Go.

Die Frage: **Gewinnt die aktuelle Engine (N) gegen die KI der PWA (P)?**

## 2. Die beiden Engines

**N** ist `index.html` des Commits, auf dem der Lauf startet, mit dem Default.

**P** ist [`vergleich/pwa-index.html`](../vergleich/pwa-index.html), von
Hazeberry am 29.10. bereitgestellt, sha256
`9100c565458b84bac71d8de308e8c064b53de37269bf725e7696ba30a838e685`. Laut
Kopfzeile stammt sie aus dem Repo Hazeberry/Go-PWA. Verglichen mit N:

- Es fehlen die Schalter, die am 20.10. dazukamen: das **Endspiel-Netz**
  (`endspielNetz`, `endspielNetzAb`, `endspielNetzTop`), `bensonAliveExempt`
  und `musterAb`. Der Engine-Stand liegt also etwa zwischen dem 18. und dem
  20.10.
- Drei Parameter haben andere Defaults: `passMinMc120` 20 statt 8,
  `passMinMc150` 20 statt 10 und `resignAreaMargin` 0 statt −1.
- Sie hat eine Zählphase, in der man tote Ketten markiert, eine Seki-Prüfung
  und weitere Funktionen der Oberfläche. Für die Suche zählen nur die Blöcke
  `shared-go-logic` und `worker-ai`.

Gemessen wird also vor allem, was seit dem 20.10. dazukam (das Netz, mit
Dosis 0,8 seit dem 24.10.), zusammen mit den drei Parametern der PWA.

## 3. Aufbau

[`gnugo-duell.js`](../gnugo-duell.js) bekommt einen neuen Gegner
`--gegner ki`: Die KI aus `--gegner-html` zieht über
[`gtp-ki.js`](../gtp-ki.js) in einem eigenen Prozess. Der Adapter lädt
`shared-go-logic` und `worker-ai` der Datei wie das Duell-Skript und zieht mit
`getAIMove` auf „hard“, mit dem Default der Datei. GNU Go Stufe 1 bleibt
Schiedsrichter wie gegen Fuego: Es bekommt jeden Zug, zählt am Ende nach
Fläche und schätzt nach Zug 40, 80, 120 und 200. Beide Seiten spielen ohne
Aufgabe und ohne adaptives Zeitbudget. Der Zufall beider Seiten ist je Partie
geseedet.

Ohne Vorgabe, Komi 7,5, die Farben wechseln je Partie (gerade Nummer: N
Schwarz), bis 600 Züge
([`pwa-spielen.sh`](../auswertung/pwa-spielen.sh),
[`pwa-vergleich.yml`](../.github/workflows/pwa-vergleich.yml)).

| Teil | Gegner | Bedenkzeit beider Seiten | Partien | Seed |
|---|---|---|---:|---:|
| **M1** (Hauptmessung) | P | 120 Simulationen | 360 | 223 |
| M2 (zweite Messung) | P | 1,8 s je Zug | 120 | 224 |
| K1 (Gleichstandsprobe) | N über den Adapter | 120 Simulationen | 120 | 225 |
| Kontrolle | P | wie M1, Partien 1 bis 20 noch einmal | 20 | 223 |

**M2** spielt mit dem Zeitbudget des Browsers. Damit hängt das Ergebnis an der
Geschwindigkeit des Runners, und M2 lässt sich nicht Zug für Zug wiederholen.

**K1** prüft den Adapter. Spielt N gegen sich selbst über `gtp-ki.js`, muss
die Siegrate nahe 50 % liegen. Sonst gäbe der Aufbau einer Seite einen
Vorteil, etwa über die Reihenfolge der Befehle oder den Zustand zwischen den
Zügen.

**Kontrolle.** Die Partien 1 bis 20 von M1 noch einmal. Erwartet: 20 von 20
Zug für Zug gleich.

## 4. Endpunkt und Urteil, vorab festgelegt

[`pwa-bericht.js`](../auswertung/pwa-bericht.js),
[`pwa-ergebnis.sh`](../auswertung/pwa-ergebnis.sh).

Endpunkt ist die **Siegrate von N**, mit dem exakten 95-%-Intervall
(Clopper-Pearson) und dem exakten Binomialtest gegen 50 %. Abgebrochene
Partien und Partien am Zuglimit zählen nicht.

| Teil | Urteil | wenn |
|---|---|---|
| M1, M2 je für sich | **neu stärker** | Untergrenze über 50 % |
| M1, M2 je für sich | **neu schwächer** | Obergrenze unter 50 % |
| M1, M2 je für sich | kein Unterschied belegt | sonst |
| K1 | bestanden | das Intervall enthält 50 % |

Ist K1 nicht bestanden, gilt das Urteil über M1 und M2 nur unter Vorbehalt.
Der Bericht nennt das beim Urteil.

**Beschreibend, ohne Anspruch:** Endstand aus Sicht von N (Mittel, 95 %, t),
Siege je Farbe, GNU Gos Schätzung nach Zug 40, 80, 120 und 200, Züge und
Simulationen je Zug.

Kein Ergebnis ändert einen Default. Der Versuch beantwortet die Frage aus §1.

## 5. Auflösung, vorab gerechnet

Mit 360 Partien ist das 95-%-Intervall bei einer Siegrate um 50 % rund ±5,2
Prozentpunkte breit. Eine wahre Siegrate von 57,5 % wird in 80 % der Läufe
erkannt. Mit 120 Partien (M2, K1) sind es rund ±9 Prozentpunkte. K1 übersieht
also einen Vorteil des Adapters unter etwa 10 Prozentpunkten.

## 6. Erwartung vorab

- **M1: neu stärker**, deutlich. Das Endspiel-Netz gewann im Selbstspiel
  83,1 % gegen dieselbe Engine ohne Netz ([`endspiel-netz.md`](endspiel-netz.md)
  §8), die Dosis 0,8 gegen 0,5 noch einmal 56,4 % ([`netz-dosis.md`](netz-dosis.md)
  §8). Erwartet wird eine Siegrate von rund 80 %. Die drei abweichenden
  Parameter der PWA betreffen Pass und Aufgabe und sollten wenig ändern.
- **M2: neu stärker**, ähnlich deutlich. Das Netz kostet bei 1,8 s rund 41 ms
  je Zug ([`teststaerke.md`](teststaerke.md) §9), also kaum Simulationen.
- **K1:** nahe 50 %, bestanden.
- **Kontrolle:** 20 von 20.

## 7. Ablauf und Dauer

[`pwa-vergleich.yml`](../.github/workflows/pwa-vergleich.yml), manuell auf
`main`, ohne Eingaben: 12 Jobs M1, 20 Jobs M2, 4 Jobs K1, eine Kontrolle und
der Bericht auf `ergebnisse/pwa-vergleich-lauf<N>` unter
`docs/daten/pwa-vergleich/lauf<N>/`. Nur der letzte Job darf ins Repo
schreiben.

Eine Partie mit 120 Simulationen auf beiden Seiten dauert rund 0,5 Minuten,
mit 1,8 s je Zug bei rund 370 Zügen rund 11 Minuten. Zusammen rund 26
Runner-Stunden, davon 22 für M2. Erwartet werden **gut eine Stunde
Laufzeit**, bestimmt von M2.

## 8. Danach

Der Nachtrag wendet das Urteil aus §4 an und ordnet es ein. Kein Default
ändert sich.

## 9. Nachtrag: Ergebnis von Lauf 1 (29.10.2026)

[Workflow-Lauf 40957619160](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40957619160)
auf Merge `1777a60`, von 21:25 bis 23:00 UTC (26 Runner-Stunden, wie
geschätzt). Die Laufzeit lag mit gut eineinhalb Stunden über der Schätzung
(§7), weil höchstens 20 Jobs gleichzeitig laufen und ein Teil von M2 auf die
Jobs von M1 warten musste. Ein Job von M2 brauchte im Mittel 66 Minuten.
Alle 38 Jobs sind grün, es fehlt kein Teil. Daten:
[`docs/daten/pwa-vergleich/lauf1/`](daten/pwa-vergleich/lauf1/), der volle
Bericht in [`bericht.md`](daten/pwa-vergleich/lauf1/bericht.md).

**Der Lauf ist sauber.** Keine Partie ist abgebrochen, keine lief bis zum
Zuglimit. Die Kontrolle ist bestanden (20 von 20 Partien Zug für Zug gleich),
die Gleichstandsprobe K1 auch.

| Teil | Siege N | Rate | 95 % | Endstand aus Sicht von N | Urteil nach §4 |
|---|---:|---:|---|---|---|
| **M1** (120 Simulationen) | 305 von 360 | **84,7 %** | [80,6 %; 88,3 %] | +40,4 [+35,9; +44,8] | **neu stärker** |
| **M2** (1,8 s je Zug) | 86 von 120 | **71,7 %** | [62,7 %; 79,5 %] | +28,7 [+20,1; +37,3] | **neu stärker** |
| K1 (N gegen N) | 62 von 120 | 51,7 % | [42,4 %; 60,9 %] | +0,2 [−6,5; +6,9] | bestanden |

**Korrektur am Bericht.** In `bericht.md` steht für M1 die Obergrenze 87,4 %.
Richtig ist **88,3 %**. Die Funktion `binomVerteilung` in
[`pruefstand-bericht.js`](../auswertung/fuego/pruefstand-bericht.js) rechnete
`(1 − p)^n` direkt. Bei 360 Partien wird das ab p ≈ 0,86 kleiner als die
kleinste darstellbare Zahl und damit 0, und die Suche nach der Obergrenze
hielt zu früh an. Sie rechnet jetzt über Logarithmen, ein Test prüft 305 von
360. Die Untergrenze, M2, K1 und das Urteil sind davon nicht berührt. Der
Fuego-Prüfstand, die einzige frühere Nutzung, hatte höchstens 30 Partien je
Arm. Dort tritt der Fehler nicht auf.

### Was das heißt

- **Die aktuelle Engine ist klar stärker als die PWA**, bei 120 Simulationen
  wie mit dem Zeitbudget des Browsers. Bei 1,8 s je Zug kam N auf rund 4 700
  Simulationen je Zug.
- **Der Vorsprung entsteht nach der Eröffnung.** Nach GNU Gos Schätzung
  stehen beide bis Zug 80 gleich (M1: −0,7 nach Zug 40, −0,1 nach Zug 80).
  Danach wächst der Vorsprung von N auf +6,2 nach Zug 120 und +27,3 nach Zug
  200. Das passt zum Endspiel-Netz, das ab Zug 80 eingreift und der PWA
  fehlt.
- **Mit mehr Simulationen ist der Abstand kleiner**, 71,7 % statt 84,7 %. Die
  beiden Intervalle überschneiden sich knapp nicht (Untergrenze M1 80,6 %,
  Obergrenze M2 79,5 %). Ein Test dieses Unterschieds war nicht vorab
  festgelegt, er ist nur beschreibend. Eine naheliegende Erklärung, nicht
  geprüft: Mit vielen Simulationen findet die Suche der PWA im Endspiel
  selbst mehr von dem, was das Netz beiträgt.
- **Der Adapter ist fair.** N gegen N über `gtp-ki.js` ergibt 51,7 % und
  einen mittleren Endstand von +0,2.
- **Zur Frage aus §1:** Schlechter geworden ist die Engine nicht. Der
  Eindruck kam aus einer Partie auf „Mittel“, die nicht sucht.

### Abgleich mit der Erwartung (§6)

| Erwartung | eingetreten? |
|---|---|
| M1: neu stärker, rund 80 % | ja: 84,7 % |
| M2: neu stärker, ähnlich deutlich | stärker ja, aber weniger deutlich: 71,7 % |
| K1: nahe 50 %, bestanden | ja: 51,7 % |
| Kontrolle 20 von 20 | ja |
