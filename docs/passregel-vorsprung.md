# Passregel: Warum meldet die Vorsprungsprüfung Vorsprung bei verlorener Stellung?

Vorabfestlegung, 07.11.2026. **Status: nur Festlegung. Keine Rechnung, kein Lauf, kein Go.** Die Untersuchung beginnt erst
nach Durchsicht durch Hazeberry und einem ausdrücklichen Go. Das Spiel bleibt unverändert (`passNachGegnerpass` bleibt 0).
Anlass ist der Ergebnis-Nachtrag zu Stufe C in [`passregel-vergleich.md`](passregel-vergleich.md) §15; dort stehen die Zahlen
mit ihrer Quelle (Auswertungs-Log, Lauf 42331033107).

## 1. Frage

Die Prüfung `passNachGegnerpassPruefung` (`index.html`) löst aus, wenn der gemischte Anteil höchstens 0,25 beträgt
(`passGemischt`), `mit` und `nur` höchstens 2 Punkte auseinanderliegen (`passSpanne`) und der ungünstigere der beiden Stände
mindestens 20 Punkte Vorsprung zeigt (`passMarge`). Sie rechnet nur mit der **Zählvorschau der App** (`zaehlVorschau`, Seki
und Ko erkennt sie nicht, `docs/zaehlvorschau.md`). GNU Go kommt in der Prüfung nicht vor.

In Stufe C war der Arm „sofort“ (Zählung durch GNU Go) in 18 von 561 Auslösungen (Fläche) und 11 von 520 (Territory) für die
KI verloren (Log, §15). Die größte Abweichung der Zählvorschau vom GNU-Go-Stand betrug 122,0 Punkte.

**Frage:** Woher kommt in diesen Fällen die Differenz zwischen dem Vorsprung der Zählvorschau und dem Stand von GNU Go?

## 2. Definitionen (vorab)

- **Stand** = Stand aus Sicht der KI, positiv = KI gewinnt, Komi 7,5, je Wertung (Fläche, Territory) wie in der Messung.
- **Vorzeichenwechsel V** = Auslösung, bei der der Stand von GNU Go im Arm „sofort“ **negativ** ist. Bei einer Auslösung gilt
  min(mit, nur) ≥ 20 (`passMarge`); ein Wechsel heißt also: min(mit, nur) ≥ 20 und Stand(GNU Go) < 0. V ist genau die
  „Auslösung bei verlorener Stellung“ aus §15 (18 und 11 Fälle).
- **Differenz D** = min(mit, nur) − Stand(GNU Go). In V gilt D > 20. Umgekehrt ist eine absolute Abweichung über 20 **kein**
  Wechsel: Sie kann bei positivem GNU-Go-Stand auftreten. D > 20 ist notwendig, aber nicht hinreichend. Gezählt wird V direkt, nicht
  die Abweichung.
- **Näherungsfälle** (beschreibend): 0 < Stand(GNU Go) < 20 bei Auslösung.

## 3. Datenbedarf (Schritt 0, vor jeder Rechnung)

Die Zerlegung braucht die **Tot-/Lebend-Zuordnungen der Zählvorschau** je Gruppe. Aus bloßen Zählständen lässt sich keine
Ursache einzelner Gruppen ableiten. Was gespeichert ist, ist zunächst aus dem **Code** gelesen
(`auswertung/endspiel/passregel-fortsetzung.js`, `passregel-stellungen.js`), nicht aus den Daten:

| Vorhanden (laut Code) | Nicht gespeichert (laut Code) |
|---|---|
| Stufe A, `einheiten.jsonl`: `mit`, `nur`, `spanne`, `gemischt`, Gefangene (`caps`) je Einheit | Zuordnung der Zählvorschau (bewiesen tot, geschätzt tot, lebend) je Gruppe |
| Ergebniszeile: `arm1.flaeche`, `arm1.territory` (Stand GNU Go, „sofort“) | GNU Gos Listen `alive`, `seki`, `white_territory`, `black_territory`, `dame` (nur bei Zählabweichung, 15 Einheiten) |
| `diagnose.anfang`: Brett als Text, Gefangene, GNU Gos Tot-Liste, `final_score`, Fläche und Territory aus der Tot-Liste | |

**Schritt 0 stellt am Artefakt fest**, ob diese Felder in den Rohdaten tatsächlich vorhanden sind, und berichtet das, bevor
weitergerechnet wird. Fehlt ein Feld, ist die betreffende Auswertung nicht möglich und wird als „nicht auswertbar“ berichtet.

**Rekonstruktion der Zuordnung:** Brett und Gefangene stehen in `diagnose.anfang`. Die Zählvorschau lässt sich damit
deterministisch neu rechnen (ohne GNU Go, ohne Partie). Das gilt nur, wenn die **Identitätskontrolle** besteht: Für jede Einheit
muss die neu gerechnete Vorschau dasselbe `mit` und `nur` ergeben wie gespeichert. Besteht sie bei einer Einheit nicht, wird
diese Einheit nicht zerlegt, mit Grund.

## 4. Rohdatenquelle

- **Richtiges Artefakt:** Stufe C, Lauf 42331033107, Artefakt `bericht`, ID **13557498693** (am Lauf aufgelistet:
  511 610 Bytes, `sha256:0d9ca865d424251c57a3c9d424cd290e0206a86fe4d6fdd37bd13b8be4720e08`, läuft am 05.02.2027 ab). Laut
  Workflow-Definition enthält es die Verzeichnisse `bericht/`, `stufe-a/`, `teile/`, `nachspiel/`; **der Inhalt ist hier nicht
  geöffnet**. Daneben liegen `stufe-a` (13557332035) und `ergebnisse-teil-1` bis `-23` am selben Lauf.
- **Nicht** die Quelle: ID 13554508128. Sie gehört zu Probe 2 (Lauf 42324497564).
- Die **Rohdatensicherung** ist ein eigener Arbeitsschritt und nicht Teil dieser Festlegung. Wie die Daten zum Werkzeug kommen,
  ist dort zu klären.

## 5. Auswertung (alles beschreibend, kein Urteil)

**Schritt 1, ohne Zerlegung:** je Wertung
1. Anzahl V und V/N (N = Auslösungen), getrennt nach Gruppe und KI-Farbe.
2. Verteilung von Stand(GNU Go) und D in V, dazu die Näherungsfälle.
3. Überschneidung von V mit den 15 Einheiten, bei denen Fläche aus der Tot-Liste und `final_score` abweichen, und von V in
   Fläche gegen V in Territory.
4. Verteilung von D über **alle** Auslösungen (Median, Quantile, Anteil mit D > 20), nur als Beschreibung, nicht als Wechsel.

**Schritt 2, Zerlegung** (nur nach bestandener Identitätskontrolle, Schritt 0): Für jede V-Einheit wird D als **Rechenidentität**
in Beiträge zerlegt, mit den Bausteinen aus `passregel-lib.js` (`zaehlbestandteile`, `vergleicheZaehlung`): (a) Steine, die
Zählvorschau und GNU Go unterschiedlich als tot oder lebend führen (Koordinaten, Farbe, Gruppengröße), (b) Gebiet mit
anderem Besitzer oder als neutral/seki/dame geführt, (c) Gefangene. Die Summe muss D genau ergeben; sonst ist die Einheit
„nicht zerlegbar“, mit Grund.

## 6. Was daraus nicht abgeleitet wird

- Dass **eine große, unterschiedlich bewertete Gruppe** die Differenz erklärt, ist bis zur Zerlegung eine **Hypothese**. Sie wird
  nicht vorab als Ursache geführt.
- Eine Ursache einzelner Gruppen nennt der Bericht nur, wo Zuordnungen vorliegen oder rekonstruiert und kontrolliert sind. Aus
  Zählständen allein nicht.
- Keine Änderung am Spiel, an `passMarge` oder anderen Schwellen und keine Aktivierung der Passregel. Das wären eigene
  Festlegungen mit Go.
- Keine Tests oder Intervalle als Entscheidungsgrundlage; Anzahlen werden beschrieben.

## 7. Freigaben und Grenzen

- Dieses Doc ist Vorgabe für die KI-Assistenten; Hazeberry liest es vor dem Merge.
- Die Untersuchung läuft erst nach einem ausdrücklichen Go für genau diese Untersuchung. Vor dem Start wird genannt, was läuft,
  wo es läuft und welches Go gilt. Ein Werkzeug samt Tests kann als eigener PR vorbereitet werden; es rechnet nichts auf den
  Rohdaten ohne Go.
- Grenzen: 18 und 11 Fälle sind wenig; Verteilungen sind beschreibend. Die Zahlen aus Stufe C stammen aus dem Auswertungs-Log
  des berichtenden Assistenten und aus der getrennten Prüfung durch 6.1 Sol (ChatGPT), siehe §15 in `passregel-vergleich.md`.
