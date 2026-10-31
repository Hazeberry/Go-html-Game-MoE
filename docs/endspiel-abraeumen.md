# Endspiel-Abräumen: zuerst die Diagnose

Vorbereitet am 31.10.2026. Nur Diagnose, kein neuer Messlauf, kein Eingriff in das
Spiel. Anlass ist die Beobachtung von Hazeberry: „Teilweise hat die KI extrem lange
gebraucht, Steine aus totem Gebiet zu räumen.“ Der Vorschlag zur Reihenfolge
stammt aus einer Durchsicht (Astra) und wird hier übernommen.

## 1. Was der Code heute tut

- Nach zwei Pässen in Folge beendet die App die Partie und entfernt vermeintlich
  tote Steine selbst (`pass()` → `resolveLifeAndDeath()` → `showFinalScore()` in
  `index.html`). Die Zählung beruht auf Benson; sie erkennt **Seki nicht
  zuverlässig**. Ein früheres automatisches Entfernen wäre deshalb kein guter
  erster Schritt.
- Die KI passt nach eigenen Regeln (Pass-Stellen in `getAIMove`). Solange sie
  Züge für sinnvoll hält, spielt sie weiter, auch wenn der Gegner schon passt.
  Zwei Pässe in Folge brauchen beide Seiten.
- Zwei Partien von Hand (SGF, 29.10.2026, unter
  [`daten/endspiel-abraeumen/`](daten/endspiel-abraeumen/)) zeigen den Fall: In
  `mensch-412zuege.sgf` passt Schwarz (der Mensch) ab Zug 323 immer wieder, 19 Mal
  in Folge am Ende, und die KI (Weiß, „hard“) spielt in dieser Endphase noch 19
  Steine, davon 8 schlagend. In `mensch-427zuege.sgf` (KI „medium“) endet die
  Partie nach einem Pass von Schwarz ohne Abräumen. Das ist **Anekdote, kein
  Beleg**, zwei Partien.

## 2. Die Fragen

1. **Spielt die KI nach dem Pass des Gegners unnötig weiter**, oder **passt sie
   schon, und der Gegner spielt weiter**? Das unterscheidet die möglichen
   Eingriffe.
2. Wenn die KI weiterspielt: Sind das schlagende Züge (echtes Abräumen) oder
   Züge ohne Schlag (Auffüllen, Grenze, Neutral)?
3. Wie oft und wie lange kommt das vor, und bei welchem Gegner?

## 3. Diagnose (Stufe 1, dieses Dokument)

Werkzeug: [`abraeumen-diagnose.js`](../auswertung/endspiel/abraeumen-diagnose.js),
Workflow [`endspiel-abraeumen.yml`](../.github/workflows/endspiel-abraeumen.yml).
Nur Lesen und Zählen auf archivierten Partien, die Zugfolge wird nachgespielt, um
Schläge zu erkennen.

Je Partie:

- **letzter Gegnerstein:** der letzte Nicht-Pass-Zug des Gegners.
- **Endphase:** alle Züge danach.
- **KI-Züge in der Endphase** (davon schlagend / ohne Schlag), **Pässe** beider
  Seiten, ob der Gegner **nach dem ersten KI-Pass** noch Steine setzt, und das
  **Ende** (zwei Pässe, oder Zuglimit/Abbruch). Partien ohne zwei Pässe am Ende
  werden **getrennt ausgewiesen** und nicht mitgemittelt.

Gruppen: GNU Go ohne Vorgabe (zwei Läufe), Fuego mit 100 und mit 50 Spielen, die
alte PWA, dazu die zwei Partien von Hand. Reihen sind beschreibend (Mittel,
Median, 90-%-Quantil, Maximum, Anteil mit KI-Zügen und über 10 KI-Zügen). Es gibt
kein Urteil und keine Schwelle; die Diagnose entscheidet nur, welcher Eingriff
als Nächstes vorbereitet wird.

**Grenze der Aussage:** Die archivierten Gegner sind Programme, die an der Linie
des Menschen nichts ändern. Ein Mensch, der viele Male in Folge passt, ist ein
anderer Fall als GNU Go. Die Diagnose kann zeigen, dass das Weiterspielen im
Programmvergleich selten ist; sie kann es für Menschen nicht ausschließen. Die
zwei SGF-Partien stehen deshalb getrennt in der Tabelle.

## 4. Spätere Schritte (nicht Teil dieser Vorbereitung)

Jeder Schritt bekommt eine eigene Vorabfestlegung, jeweils ein Eingriff:

1. **Pass-Sonde:** An fest ausgewählten späten Stellungen protokollieren, warum
   die KI nicht passt (Kandidatenwert, eigene Atari-Gefahr, drohender
   Gegnergewinn), und die Laufzeit der gesamten Zugberechnung messen. Ein ruhiger
   Endstand allein beweist nicht, dass Passen sicher wäre.
2. **Danach genau eine Änderung**, je nach Befund: bei unnötiger Wartezeit ein
   kürzeres Denken; bei falschen Passentscheidungen die Passregel; bei bereits
   passender KI eine korrigierbare **Zählphase** wie in der PWA, mit
   „Weiterspielen“.
3. **Vorläufige Empfehlung:** die Zählphase als ersten Umsetzungskandidaten
   vorbereiten. Sie lässt sich prüfen, ohne die Suchstärke zu ändern. Teststellungen
   für Seki, Ko, offene Grenzen und lebende Gruppen mit ungewöhnlichen Augen
   gehören dazu: „Nicht von Benson als lebendig bestätigt“ heißt nicht „tot“.

## 5. Stand

Das Werkzeug ist getestet (`tests/endspiel-abraeumen.js`). Der Workflow lief am
31.10.2026 (§6).

## 6. Nachtrag: Ergebnis der Diagnose (31.10.2026)

Lauf 1 von [`endspiel-abraeumen.yml`](../.github/workflows/endspiel-abraeumen.yml),
rein lesend, keine neuen Partien. Zahlen:
[`daten/endspiel-abraeumen/lauf1/bericht.md`](daten/endspiel-abraeumen/lauf1/bericht.md).
Beschreibend, ohne Urteil.

| Gruppe | Partien | KI-Züge in der Endphase Ø / Median / 90 % / Max | davon schlagend Ø | über 10 KI-Züge | Gegner spielt nach KI-Pass |
|---|---:|---|---:|---:|---:|
| GNU Go (Leeres Brett) | 480 | 1,0 / 0 / 1 / 30 | 0,1 | 4,8 % | 0,2 % |
| GNU Go (Muster ohne Vorgabe) | 480 | 1,2 / 0 / 3 / 35 | 0,1 | 3,3 % | 0,0 % |
| Fuego, 100 Spiele | 479 (1 ohne zwei Pässe) | 4,6 / 1 / 16 / 49 | 0,5 | 14,8 % | 25,3 % |
| Fuego, 50 Spiele | 960 | 6,3 / 2 / 19 / 64 | 0,9 | 24,6 % | 32,6 % |
| alte PWA | 360 | 3,0 / 0 / 12 / 29 | 0,4 | 13,1 % | 76,1 % |
| Mensch (zwei SGF) | 2 | 9,5 / 9,5 / – / 19 | 4,0 | – | – |

**Befunde:**

1. **Gegen GNU Go kommt das Weiterspielen selten vor** (Median 0, 3 bis 5 % über 10
   Züge), gegen **Fuego öfter** (Median 1 bis 2, 15 bis 25 % über 10 Züge, Maximum
   64). Fuego passt später oder setzt in der Endphase eigene Pässe zwischen die
   KI-Züge; die KI antwortet dann weiter.
2. **Die meisten dieser KI-Züge schlagen nicht** (Fuego: 4,1 und 5,4 ohne Schlag
   gegen 0,5 und 0,9 mit Schlag im Mittel). Es ist in den Programmpartien also
   überwiegend Auffüllen, Grenze und Neutral, nicht das Abräumen toter Steine.
3. **Beides kommt vor:** „KI spielt weiter, der Gegner passt“ (Fuego) und „die KI
   passt zuerst, der Gegner spielt noch Steine“ (alte PWA 76 %, Fuego 25 bis 33 %,
   GNU Go fast nie).
4. **Die zwei Handpartien** zeigen den Fall des Anlasses nur einmal: in
   `mensch-412zuege.sgf` 19 KI-Steine nach dem letzten Gegnerstein, davon 8
   schlagend, bei 19 Pässen des Menschen; in `mensch-427zuege.sgf` nichts. Das ist
   Anekdote, kein Beleg.

**Vorbehalte:**

- „Gegner spielt nach KI-Pass“ zählt vom **ersten** KI-Pass der Partie an. Ein
  früher KI-Pass mitten in der Partie würde die Zahl erhöhen; ein Teil der 76 % bei
  der alten PWA kann daran liegen. Das Werkzeug trennt es nicht.
- Programme sind keine Menschen. Ein Mensch, der viele Male in Folge passt, bringt
  die KI in eine Lage, die diese Gegner nicht herstellen. Die Zahlen zu Fuego sind
  die nächste Annäherung, aber keine Aussage über Menschen.
- Die Diagnose hat keine Schwelle. Sie sagt nicht, ob 6 Züge „zu lang“ sind.

**Was daraus für die Vorbereitung folgt (Vorschlag, nicht beschlossen):** Das
Weiterspielen ist nach den Programmpartien überwiegend Auffüllen ohne Schlag, und
es tritt nicht nur bei „Gegner passt“ auf. Bevor ein Eingriff gewählt wird, bleibt
die Pass-Sonde (§4) der nächste Schritt: an späten Stellungen protokollieren, warum
die KI nicht passt, und die Laufzeit je Zug messen. Der Beschwerdefall „extrem lange“
ist bisher nur an einer Handpartie belegt; eine Bedenkzeit je Zug haben die
Datensätze nicht.
