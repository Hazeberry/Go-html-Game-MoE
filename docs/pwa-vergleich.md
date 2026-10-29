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
