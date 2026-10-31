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
2. Wenn die KI weiterspielt: Sind das schlagende Züge oder Züge ohne Schlag? Die
   Art der Züge ohne Schlag (Auffüllen, Grenze, Neutral, Vorbereitung, Verteidigung)
   unterscheidet die Zählung nicht.
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
   64). Warum, ist nicht geprüft (denkbar: Fuego passt in der Endphase
   anders als GNU Go, während die KI weiterspielt).
2. **Die meisten dieser KI-Züge schlagen nicht** (Fuego: 4,1 und 5,4 ohne Schlag
   gegen 0,5 und 0,9 mit Schlag im Mittel). „Ohne Schlag“ heißt aber nicht
   automatisch Auffüllen oder Neutralzug: Auch vorbereitende Schlagzüge und
   notwendige Verteidigung schlagen zunächst nichts. Welche Art von Zug es ist,
   zeigt die Zählung nicht (Korrektur 31.10.2026: die erste Fassung ordnete sie
   zu sicher als Auffüllen und Neutral ein).
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
Weiterspielen besteht nach den Programmpartien überwiegend aus Zügen ohne Schlag
(deren Art offen ist, siehe oben), und es tritt nicht nur bei „Gegner passt“ auf. Bevor ein Eingriff gewählt wird, bleibt
die Pass-Sonde (§4) der nächste Schritt: an späten Stellungen protokollieren, warum
die KI nicht passt, und die Laufzeit je Zug messen. Der Beschwerdefall „extrem lange“
ist bisher nur an einer Handpartie belegt; eine Bedenkzeit je Zug haben die
Datensätze nicht.

## 7. Pass-Sonde: Vorabfestlegung (31.10.2026, vor dem Lauf)

Nur Vorbereitung; der Lauf ([`pass-stellungen.yml`](../.github/workflows/pass-stellungen.yml))
startet erst nach Freigabe. Kein Eingriff in das Spiel.

**Was die Pass-Prüfung in `getAIMove` tut** (`index.html`, vor der Suche): Die KI
passt nur, wenn der beste Kandidatenwert `best` unter einer der Schwellen
`passMinMc40/80/120/150` (−50, 20, 8, 10) liegt (`wantsToPass`). Dann passt sie
trotzdem nicht, wenn eine eigene Kette im Atari steht (`ownInAtari`) oder der
beste Gegnerzug mehr als `passGainThreshold` (60) bringt (`oppBest`), außer der
Gegnerzug ist nicht abwendbar (`passUnabwendbar`). Die Engine weiß nicht, dass der
Gegner gerade gepasst hat; sie bewertet nur das Brett. Die Schwellen stammen aus
einer Zeit, in der Zugwerte in den Zehnern lagen
([`parameter-reihe.md`](parameter-reihe.md)).

**Stellungen:** Aus den archivierten Partien (Fuego 50, Fuego 100, GNU Go in zwei
Läufen, alte PWA, ohne Vorgabe, Arm D bzw. M1) die Stellung, in der die KI nach
dem **ersten Gegnerpass der Endphase** am Zug ist (Endphase wie in §3). Zwei
Gruppen je Quelle: **W** („KI spielte in der Partie weiter“, der nächste KI-Zug
war ein Stein) und **P** („KI passte“). Höchstens **100 je Gruppe und Quelle**,
gezogen mit festem Seed 1.

**Befragung:** `getAIMove`, Stufe hard, Default der Datei, 120 feste Simulationen,
Aufgabe aus (`resignEnabled=0`), ohne adaptives Zeitbudget, Zufall je Stellung
geseedet (Seed 1 und Partienummer). Eine Kopie von `index.html` im Speicher trägt
zwei Protokollzeilen an der Pass-Prüfung; die Datei im Repo bleibt unberührt.

**Protokoll je Stellung:** `best`, `wantsToPass`, `ownInAtari`, `oppBest`,
`opponentGainsAlot`, `unabwendbar`, die Entscheidung (pass, stone) mit gewähltem
Zug, ob sie dem Zug der Partie entspricht, und die Dauer von `getAIMove` in ms.

**Grund, warum die KI nicht passt:** (a) `best` über allen Schwellen, (b) eigene
Kette im Atari, (c) der Gegner hat einen Zug über `passGainThreshold`, (d) sonst.

**Auswertung, beschreibend:** je Quelle und Gruppe: Zahl der Stellungen, wie oft die
Sonde passt, wie oft sie denselben Zug wie die Partie wählt (Wiederholbarkeit),
Mediane von `best` und `oppBest`, die Gründe mit Anzahl, Dauer (Median, 90 %, Max).
Keine Schwelle, kein Urteil.

**Wie die Befunde zu lesen wären (vorab, nicht bindend):**

| Befund in Gruppe W | spricht für |
|---|---|
| (a) überwiegt: `best` weit über den Schwellen | die Passregel (Schwellen aus der Zehner-Zeit) als Kandidat |
| (c) überwiegt: Gegnerzug über der Schwelle, obwohl der Gegner gepasst hat | die Bewertung der Gegnerzüge (Auffüllen, Neutral), nicht die Schwellen |
| (b) überwiegt: eigene Kette im Atari | die Ketten selbst; Zählphase hilft nicht |
| Sonde passt oft, die Partie spielte weiter | Zufall oder Unterschied zwischen Sonde und Partie, Wiederholbarkeit prüfen |

**Grenzen:** (1) Die Dauer ist die von 120 festen Simulationen auf einem
Actions-Runner; sie sagt nichts über das Zeitbudget im Browser auf einem Handy
(dort bestimmt `getAdaptiveTimeBudget` die Zeit). Die Beschwerde „extrem lange“
bleibt damit unbelegt; dafür bräuchte es eine Messung im Browser. (2) Archivierte
Gegner sind Programme. (3) Die Befragung wiederholt die Entscheidung, sie erklärt
die Partie nur, wenn die Wiederholbarkeit hoch ist.

## 8. Nachtrag: Ergebnis der Pass-Sonde (31.10.2026)

Lauf 1 von [`pass-stellungen.yml`](../.github/workflows/pass-stellungen.yml),
rein lesend, etwa eine Minute. Zahlen:
[`daten/endspiel-abraeumen/lauf2/bericht.md`](daten/endspiel-abraeumen/lauf2/bericht.md).
Beschreibend; die Lesehilfe aus §7 ist keine Entscheidung.

| Quelle | W: KI spielte weiter (Stellungen) | Sonde passt | gleicher Zug | `best` Median | P: KI passte | Sonde passt | `best` Median |
|---|---:|---:|---:|---:|---:|---:|---:|
| GNU Go | 98 | 0 | 68 | 472 | 17 | 17 | −57 |
| Fuego 100 | 100 | 0 | 81 | 865 | 30 | 30 | −85 |
| Fuego 50 | 100 | 0 | 80 | 2 392 | 47 | 47 | −86 |
| alte PWA | 100 | 0 | 76 | 451 | 7 | 7 | −8 |

**Gründe, warum die Sonde in Gruppe W nicht passt (398 Stellungen):** In 389 liegt
`best` über allen Schwellen (a). In 9 Stellungen (Fuego 50: 1, alte PWA: 8)
erlaubt `best` das Passen, aber der Gegner hätte einen Zug über
`passGainThreshold` (c). **Keine Stellung wegen einer eigenen Kette im Atari (b).**

**Befunde (beschreibend):**

1. **Die Pass-Prüfung sieht in diesen Stellungen kein Passen vor.** Die Schwellen
   liegen bei −50 bis 20; `best` liegt in den Stellungen, in denen die KI in der
   Partie weiterspielte, im Median bei 451 bis 2 392. Die Schwellen stammen aus
   der Zeit, als Zugwerte in den Zehnern lagen ([`parameter-reihe.md`](parameter-reihe.md)).
2. **In Gruppe P passt die Sonde immer** (101 von 101), mit `best` im Median bei −8
   bis −86 und wiederholt den Zug der Partie jedes Mal. `best` trennt die beiden
   Gruppen also im Median klar. Wie scharf, zeigt nur die Verteilung (nächster
   Schritt); hier steht nur der Median.
3. **Wiederholbarkeit in Gruppe W: 68 bis 81 %** gleicher Zug wie in der Partie. Die
   Sonde ist also kein genaues Abbild der Partie (Zufall, Suchbaum, Zustand der
   Partie fehlen); das Passen selbst ist stabil (Pass-Prüfung ohne Suche), die
   Zugwahl danach weniger.
4. **Dauer bei 120 festen Simulationen:** Wo die KI weiterspielt, im Median rund
   122 ms (90 %: 127 bis 137 ms, Maximum 238 ms); wo sie passt, 3 bis 6 ms. Der
   Unterschied ist die Suche. **Das ist nicht die Zeit im Browser** (dort bestimmt
   `getAdaptiveTimeBudget` die Bedenkzeit); „extrem lange“ bleibt unbelegt.

**Vorbehalte:**

- `oppBest` wird nur berechnet, wenn `best` unter einer Schwelle liegt; in Gruppe W
  steht daher meist „–“.
- Es sind Mediane. Ob einzelne Stellungen in W so niedrige `best`-Werte haben, dass
  eine andere Schwelle sie trennen würde, zeigen die Mediane nicht.
- Archivierte Gegner sind Programme, Gruppen W und P sind nicht zufällig, sondern
  durch das Verhalten der KI selbst definiert; ein Schluss auf „die Schwelle ist
  schuld“ folgt daraus nicht. Gezeigt ist: In diesen Stellungen verhindert allein
  `best` über den Schwellen das Passen.

**Nächster Schritt (Vorschlag, nicht beschlossen):** die Verteilung von `best` in W
und P ausgeben (Minimum, 10-, 25-, 75-, 90-%-Quantil, Maximum), um zu sehen, ob sich
die Gruppen überlappen. Erst danach lässt sich beurteilen, ob eine Änderung der
Passregel überhaupt etwas trennen könnte. Nichts davon ändert das Spiel.

## 9. Verteilung von `best`: Vorabfestlegung (31.10.2026, vor dem Lauf)

Folgt aus §8 (dort nur Mediane). Nur Vorbereitung; der Lauf startet erst nach
Freigabe, kein Eingriff in das Spiel. Dieselben Stellungen wie in §7 (dieselbe
Auswahl, Seed 1, höchstens 100 je Gruppe und Quelle), dieselbe Befragung; neu ist
nur die Ausgabe in [`pass-stellungen.js`](../auswertung/endspiel/pass-stellungen.js):

- **Verteilung von `best`** je Quelle und Gruppe (W: „KI spielte weiter“, P: „KI
  passte“): Minimum, 10-, 25-, 75-, 90-%-Quantil, Maximum und der Median.
- **Anteil mit `best` unter 20, 100, 200, 500 und 1000** in jeder Gruppe. Eine
  Schwelle würde gut trennen, wenn der Anteil in P nahe 100 % und in W nahe 0 %
  läge.
- **Überlappung:** Anteil der W-Stellungen mit `best` ≤ dem größten `best` in P
  und Anteil der P-Stellungen mit `best` ≥ dem kleinsten `best` in W.
- **Rohzeilen** je Stellung (`stellungen.jsonl` im Ergebnisordner).

Keine Schwelle, kein Urteil. Die Verteilungen sagen, ob **eine** Schwelle auf
`best` die beiden Gruppen in diesen Stellungen überhaupt trennen könnte.

**Grenzen (vorab):**

1. **Die Gruppen sind durch das Verhalten der KI definiert.** P sind Stellungen, in
   denen die KI in der Partie passte; ihr `best` ist dort also von vornherein
   niedrig, sonst hätte sie nicht gepasst. Eine saubere Trennung in diesen Daten ist
   deshalb **keine Aussage darüber, ob eine geänderte Schwelle gute Partien
   ergäbe**: Mit anderen Schwellen ändert sich auch, welche Stellungen entstehen.
2. Die Stellungen sind ein Zeitpunkt (der erste Gegnerpass der Endphase). Spätere
   Pässe des Gegners bleiben unberücksichtigt.
3. `oppBest` wird weiterhin nur berechnet, wenn `best` unter einer Schwelle liegt.
4. Programme sind keine Menschen; die Dauer ist die bei 120 festen Simulationen.

**Was nach dem Lauf entscheidet:** nichts automatisch. Zeigt sich eine große
Überlappung, spricht das gegen eine reine Schwellenänderung. Zeigt sich eine klare
Lücke, ist das ein Anlass für eine eigene Vorabfestlegung eines Eingriffs mit
Messung der Partien (Siegquote, Endstand, Länge der Endphase), nicht dieser
Auswertung.

## 10. Nachtrag: Ergebnis der Verteilung von `best` (31.10.2026)

Lauf 2 von [`pass-stellungen.yml`](../.github/workflows/pass-stellungen.yml), dieselben
Stellungen wie in §8, rein lesend. Zahlen:
[`daten/endspiel-abraeumen/lauf3/bericht.md`](daten/endspiel-abraeumen/lauf3/bericht.md).
Beschreibend, ohne Urteil; die Grenzen aus §9 gelten.

| Quelle | P: größtes `best` | P: `best` < 20 | W: kleinstes / Median / Maximum | W: `best` < 20 / < 100 / < 200 / < 500 / < 1000 |
|---|---:|---:|---|---|
| GNU Go | 9,7 | 100 % | 24 / 472 / 4 568 | 0 / 6 / 13 / 55 / 79 % |
| Fuego 100 | 19,3 | 100 % | 24 / 865 / 8 487 | 0 / 3 / 12 / 34 / 53 % |
| Fuego 50 | 17,6 | 100 % | −182 / 2 392 / 30 946 | 1 / 5 / 14 / 29 / 42 % |
| alte PWA | 13,7 | 100 % | −171 / 451 / 17 253 | 8 / 15 / 25 / 51 / 57 % |

**Befunde (beschreibend):**

1. **In Gruppe P liegt `best` immer unter 20** (größter Wert 19,3 über alle vier
   Quellen, 100 Stellungen). Das ist die Schwelle `passMinMc80`; die Gruppe P ist
   damit, wie in §9 vorweg gesagt, durch das KI-Verhalten bedingt.
2. **In Gruppe W liegt `best` fast immer darüber:** Unter 20 liegen 0 % bei GNU Go
   und Fuego 100, 1 % bei Fuego 50 und 8 % bei der alten PWA. Die Gruppen
   überlappen bei der Schwelle 20 kaum.
3. **Oberhalb von 20 reicht die Verteilung von W weit:** Der Median liegt bei 451
   bis 2 392, das Maximum bei 4 568 bis 30 946. Eine höhere Schwelle ließe in
   immer mehr W-Stellungen die Passprüfung weiterlaufen (`wantsToPass`): bei 100 in
   3 bis 15 %, bei 200 in 12 bis 25 %, bei 500 in 29 bis 55 %, bei 1000 in 42 bis
   79 %. **Das sind keine erwarteten Passquoten:** Die Prüfung auf eine eigene
   Kette im Atari und auf einen Gegnerzug über `passGainThreshold` kann das Passen
   danach weiterhin verhindern (in der Sonde bei 9 von 398 W-Stellungen schon
   bei `best` unter der Schwelle).
4. **Die Kennzahl „Anteil P mit `best` ≥ kleinstes `best` in W“ ist bei Fuego 50
   (89 %) und der alten PWA (86 %) nicht aussagekräftig:** Sie wird von je einem
   einzelnen sehr niedrigen W-Wert (−182 und −171) bestimmt. Maßgeblich sind die
   Quantile und die Anteile unter den Schwellen.

**Was das nicht zeigt** (Grenzen aus §9, hier konkret):

- Dass die Gruppen bei 20 getrennt sind, ist durch die Definition von P
  vorgegeben. Es sagt nichts darüber, ob das **Weiterspielen in W schlecht** war.
  Viele W-Stellungen haben hohe `best`-Werte (hunderte bis tausende); ob diese Züge
  etwas wert sind (z. B. weil sonst Punkte verloren gehen) oder nur Aufräumen
  nach dem Pass des Gegners, ist offen. Die Auswertung kennt den Endstand nicht.
- Eine höhere Schwelle ändert den Partieverlauf; was dann in den Stellungen
  passiert, zeigt diese Auswertung nicht.
- Programme sind keine Menschen.

**Folge für die Vorbereitung (Vorschlag, nicht beschlossen):** Eine reine
Schwellenänderung ist nach diesen Daten ein möglicher Kandidat, aber **nicht ohne
Messung der Partien**. Die Frage wäre, ob das frühere Passen in W-Stellungen mit
`best` etwa 20 bis 200 Punkte kostet. Das ließe sich in einer eigenen
Vorabfestlegung messen (gepaarter Endstand und Siegquote, z. B. gegen GNU Go,
ohne Vorgabe, Länge der Endphase als Nebenmaß). Alternativ bleibt die Zählphase
(§4) der Kandidat, der die Suchstärke nicht berührt. Beide Wege brauchen
Teststellungen für Seki, Ko und ungewöhnliche Augen. Entschieden ist nichts.

## 11. Offener Vorschlag: Gegenprobe zum frühen Passen (nicht vorbereitet)

Aus einer Durchsicht (Astra, 31.10.2026), noch nicht festgelegt: Die Sonde und die
Verteilung zeigen, **warum** die KI nicht passt, aber nicht, **ob** früheres Passen
etwas kostet. Eine Gegenprobe wäre: dieselben ausgewählten Stellungen (besonders
gegen Fuego, wo das Weiterspielen häufiger vorkommt; GNU Go als zweite Referenz)
einmal normal und einmal mit **erzwungenem Pass** der KI weiterspielen lassen und
Endstand, Siegerwechsel und verbleibende Züge vergleichen. Das prüfte erstmals,
ob das Weiterspielen etwas wert ist, bevor eine Schwelle gewählt wird.

Offene Punkte dafür: Der Gegner (GNU Go, Fuego) müsste aus einer Stellung
weiterspielen (die Züge der Partie per GTP einspielen, dann weiter), das
Duell-Werkzeug kann bisher nur von der leeren Brettstellung starten. Der
Vergleich wäre gepaart je Stellung. Die Zählphase löst den Fall „Mensch passt, KI
spielt weiter“ für sich allein nicht. Bis zur Freigabe wird nichts davon gebaut.

## 12. Einordnung der Handpartien und Kandidat Zählvorschau (31.10.2026)

Aus einer weiteren Durchsicht (Astra), übernommen als Einordnung, nicht als Beschluss:

- Die zwei Handpartien (§1) sind eine gute Referenz für das **Bedienproblem**: Sie
  zeigen, was passiert, wenn kein sinnvoller Zug mehr gesehen und wiederholt gepasst
  wird. Sie sind **kein Maßstab dafür, wann die KI passen sollte.**
- Ein Pass des Menschen bedeutet nicht, dass die Stellung ausgespielt ist. Die KI
  könnte noch berechtigt schlagen oder Gebiet sichern. Das lange Weiterspielen
  ist deshalb **zunächst kein belegter Fehler** (das deckt sich mit §8 und §10:
  ob das Weiterspielen etwas wert ist, ist offen).
- **Kandidat für den Fall „Mensch passt, KI spielt weiter“:** eine **freiwillige
  Zählvorschau** mit „Weiterspielen“. Sie zeigt, wie die App die Stellung
  einschätzt, ohne die KI zu einem vorzeitigen Pass zu zwingen. Die Unsicherheit
  bei toten Gruppen muss sichtbar bleiben: „nicht von Benson als lebendig bestätigt“
  heißt nicht „tot“, und Seki erkennt die Zählung nicht zuverlässig (§1). Gebaut
  ist davon nichts; eine Umsetzung bräuchte eine eigene Vorabfestlegung und
  Teststellungen für Seki, Ko, offene Grenzen und ungewöhnliche Augen.

## 13. Territory-Partie vom 31.10.2026: was kostet das Weiterspielen? (Nachtrag)

Material: [`mensch-494zuege-territory.sgf`](daten/endspiel-abraeumen/territory/mensch-494zuege-territory.sgf)
(Japanisch/Territory, Mensch Schwarz, KI Weiß „hard“, RE W+200,5) und die zugehörige
Diagnosedatei [`mensch-494zuege-diagnose.json`](daten/endspiel-abraeumen/territory/mensch-494zuege-diagnose.json).
Rechnung: [`auswertung/endspiel/territory-fuellen.js`](../auswertung/endspiel/territory-fuellen.js),
Ausgabe [`territory-fuellen.txt`](daten/endspiel-abraeumen/territory/territory-fuellen.txt) (Archivdaten, keine
Partie gespielt). Die Nachrechnung endet bei W+200,5 und stimmt damit mit der Anzeige der App überein.

**Frage:** Die Hypothese war, dass das Weiterspielen der KI nach dem Pass des Menschen unter
Territory Punkte kostet, weil es eigene Gebiete füllt.

**Befund auf dieser einen Partie:**

- Schwarz passt zum ersten Mal nach Zug 354 und danach 49-mal; Weiß setzt in dieser Zeit
  69 Steine und passt einmal (am Ende).
- Stand (Territory, Komi 7,5, tote Steine nach `toteSteineAmEnde` als Gefangene): vor dem
  ersten Pass W+186,5, am Ende W+200,5. Der Stand der KI wurde in diesem Abschnitt also
  **um 14 Punkte besser**, nicht schlechter.
- Zerlegung (Gebiet vorher → nachher): Weiß 117 → 79 (−38), Schwarz 29 → 7 (−22). Gefangene
  Weiß 115 → 145 (davon sind vorher 29 geschätzt tote Steine eingerechnet, am Ende 0 geschätzt:
  sie wurden real geschlagen). Die Züge nach dem ersten Pass enthalten also sowohl Steine in
  eigenem Gebiet als auch Züge ins Gebiet des Gegners; ich habe sie nicht je Zug getrennt.

**Einordnung:** Für diese Partie ist „Auffüllen kostet Punkte“ **nicht belegt**; die KI hat
netto gewonnen. Das Ergebnis sagt nichts darüber, ob die Weiß-Züge in eigenem Gebiet für sich
genommen Punkte gekostet haben (das Gebiet 117 → 79 ist ein Teil davon, aber ohne Zugtrennung
nicht eindeutig). Ob der Gegnerpass der Auslöser war oder der Stand ohnehin so gewesen wäre,
zeigt eine einzelne Partie nicht. Eine Gegenprobe wäre das „erzwungene Passen“ aus §11.

**Nebenbefund Schätzung:** Die Zahl der als tot geschätzten Steine schwankt in der Reihe
(354: 29, 394: 8, 414: 29, 474: 0), und der Stand springt zwischen Zug 394 und 414 von W+178,5 auf
W+239,5 (61 Punkte). Während die Partie nicht ausgespielt ist, hängt die Vorschau stark von
dieser Schätzung ab. Die Spanne „Mit Annahmen / Nur Bewiesenes“ der Zählvorschau zeigt das an.

**Nebenbefund Zeit (Diagnosedatei):** 238 von 281 KI-Steinzügen dauerten länger als das 1,5-Fache
des Budgets (`budgetMs`, anfangs 1800 ms). Bis etwa Zug 80 liegen die Züge bei ca. 2,0 s, ab Zug 82
bei ca. 3,8 s, gegen Ende bis 5,7 s; Mittelwert 4,0 s. Gerät: Android-Chrome-Handy. Ursache offen
(Drosselung des Geräts, Mehrfachsuche oder anderes); Gegenstand eines eigenen Punkts.
