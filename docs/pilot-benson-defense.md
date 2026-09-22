# Pilot: Benson-Verteidigung

**Status: eingefroren am 22.09.2026.** Änderungen an diesem Dokument nach dem
ersten Pilotlauf sind als Nachtrag zu kennzeichnen, nicht als Korrektur — sonst
ist die Vorab-Registrierung wertlos.

Diese Datei ist die Referenz, auf die sich `ab-harness.js --roh` und die
Auswertung berufen. Wer das Logging ändert, ändert zuerst hier.

---

## 1. Anlass

Eine echte Partie (`tests/stellungen/laufkampf-211.sgf`, 22.09.2026, Mensch
gegen Hard-KI, KI spielt Weiß) verliert bei Zug 195 achtzehn weiße Steine am
Stück. Die Rekonstruktion ergab drei Befunde, alle gemessen:

**Die Kandidatenliste war nicht schuld.** Zwischen Zug 160 und 184 ging der
Zug, der die Freiheiten der bedrohten Gruppe am stärksten erhöht, achtmal auf
Rang 1 oder 3 — und die KI spielte ihn jedes Mal. Über 200 Ziehungen geprüft,
weil `evaluateMove` rauscht: bei allen sieben Rang-1-Fällen `P(Rang 1) = 100 %`.

**Die Bewertung sah den Verfall nicht.** `evaluateBoard` aus Weiß' Sicht stieg
über den ganzen Laufkampf und erreichte bei **Zug 184 ihren Höchstwert (+153)**
— einen Zug, bevor Benson die Gruppe für unbedingt tot erklärt. Die Zahl der
schwarzen Steine direkt an der Gruppe (die Einschließung) wuchs derweil von 8
auf 24. Für Raum, Verbindung, Ausbruch oder Einschließung gibt es in
`evaluateBoard` keinen Term.

**Was sie stattdessen sah, war eine Stufenfunktion auf Freiheiten.** Über
`deathTransfer` und `STERBE_RAMPE` kostet eine 18er-Gruppe bei drei Freiheiten
`0,25 × 18 × 20 = 90` Punkte, bei vier Freiheiten **null**. Jede Rettung um eine
Freiheit war damit +90 wert, der Gegner nahm sie mit einem Zug zurück. Achtmal.

## 2. Der reparierte Defekt (#71)

`evaluateBoard` bucht eine benson-tote Kette als Material 0 — und übersprang
dabei den Transfer-Block. Eine Kette **im Atari** kostete damit `size ×
captureWeight`, dieselbe Kette **als unbedingt tot bewiesen** kostete nichts.
Die stärkste Evidenz erzeugte die schwächste Buchung:

| Zug | Gruppe | heute | Tor offen | Tor offen + Übertrag |
|---|---|---|---|---|
| 184 | 18 St., 4 Frei | 153 | 153 | 153 |
| 185 | 18 St., 3 Frei | 55 | 38 | −342 |
| 191 | 18 St., 1 Frei | −188 | **+71** | −309 |
| 194 | 18 St., 1 Frei | −199 | +68 | −292 |
| 195 | geschlagen | −345 | −345 | −345 |

PR #71 führte `PARAMS.bensonDeathTransfer` ein (Default 0). Der Sprung beim
Schlagen schrumpft damit von 400 Punkten auf 3.

**Offen und durch diesen Pilot NICHT adressiert:** die Züge 152–184 bleiben
unverändert. Die Blindheit *während* des Laufkampfs ist ein anderes Problem.

## 3. Warum ein Pilot vor der Dosisreihe

### 3.1 Der Harness war nicht reproduzierbar

Zwei Läufe mit `--seed 2026` und identischer Konfiguration endeten 2:0 und 1:1.
`--budget` ist eine Zeit; die Zahl der Simulationen hängt an der Maschinenlast,
derselbe Seed verbraucht unterschiedlich viele Zufallszahlen. PR #72 führte
`PARAMS.mctsFixedSims` ein (Default 0). Mit festen Sims ist alles außer der
Stoppuhr Zeichen für Zeichen gleich.

### 3.2 Der 160er-Arm ist nicht automatisch die heutige Engine

Über 20 echte Partien, 7161 Stellungen:

```
<= 160 freie Felder (Tor offen):              39.5 %
davon MIT benson-toter Kette auf dem Brett:   12.3 % aller Stellungen
Tor geht auf in 18 von 20 Partien, Median ab Zug 223
```

Ein Arm mit `bensonEvalMaxEmpty=160` **und** `bensonDeathTransfer=1` weicht
also in jeder achten Stellung von heute ab. Er ist keine Kontrolle.

### 3.3 Die Siegrate ist als Endpunkt zu stumpf

Vorab gerechnet, vier getestete Arme, Bonferroni-α = 0,0125, Power 80 %:

| Partien/Arm | kleinster nachweisbarer Effekt |
|---|---|
| 120 | 15,1 pp |
| 240 | 10,7 pp |
| 360 | 8,8 pp |
| 600 | 6,8 pp |

Zum Vergleich: die Decke der `resignAreaMargin`-Reihe lag bei 8,1 pp über 160
Partien, und fünf vergleichbare Terme dieses Projekts blieben nach Dosisreihen
bei 0. Ein realistisch erwarteter Effekt wäre mit 240 Partien je Arm **nicht**
nachweisbar. Deshalb misst der Pilot zuerst die **Häufigkeit der Ereignisse**,
auf die der Eingriff überhaupt wirken kann — daraus wird der Endpunkt der
eigentlichen Reihe bestimmt, nicht umgekehrt.

## 4. Der Pilotlauf

| | |
|---|---|
| **Arme** | nur Arm A gegen sich selbst (A/A) |
| **Arm A** | `bensonEvalMaxEmpty=160`, `bensonDeathTransfer=0` — Auslieferungszustand |
| **Partien** | 40, Standardmodus mit Farbwechsel |
| **Sims** | `mctsFixedSims=120`, beide Seiten |
| **Seed** | fest, im Rohdump vermerkt |
| **Zug-Limit** | 400 (Harness-Default) |

Ein A/A-Lauf misst **keinen Parametereffekt** — er kann keinen haben. Er
liefert: die Basisrate der Ereignisse, die Streuung zwischen Partien, und den
Nachweis, dass Logging und Hashes tragen.

### 4.1 Was der Pilot beantworten soll

1. Wie oft wird überhaupt eine eigene Gruppe **benson-tot**, und wie groß ist
   sie dann? Ohne dieses Ereignis kann `bensonDeathTransfer` nichts bewirken.
2. Wie oft tritt das **Rettungsmuster** auf (große Gruppe von ≤3 auf ≥4
   Freiheiten gehoben, danach wieder auf ≤3)? Das ist der Sägezahn aus §1.
3. Wie oft geht das **Tor** auf, und wie viele Züge bleiben danach?
4. Wie stark streuen diese Zahlen zwischen Partien? Das entscheidet die
   Partienzahl der eigentlichen Reihe.

### 4.2 Abbruchkriterium

Wird der Pilot mit **identischem Seed und identischer Konfiguration**
wiederholt, müssen `params_hash` und `final_board_hash` **jeder** Partie
übereinstimmen. Weicht eine ab, ist der Lauf ungültig und die Ursache zu
klären, bevor irgendetwas ausgewertet wird. Zeitfelder sind davon ausgenommen:
Wanduhrzeiten sind prinzipiell nicht reproduzierbar.

### 4.3 Was der Pilot ausdrücklich NICHT beantwortet

Spielstärke. 40 Partien A gegen A haben eine Erwartung von 50 % und keine
Aussagekraft über irgendeinen Parameter. Jede Siegrate aus diesem Lauf ist
Rauschen und darf nicht zitiert werden.

## 5. Logging-Schema

`node ab-harness.js --roh <pfad>` schreibt **JSON Lines**: eine Zeile je
Partie, geschrieben unmittelbar nach deren Ende. Stirbt der Lauf, bleiben die
fertigen Partien lesbar.

### 5.1 Partiesatz

| Feld | Bedeutung |
|---|---|
| `typ` | immer `"partie"` |
| `nr` | laufende Nummer ab 1 |
| `seed` | der Seed des Laufs, oder `null` |
| `params_hash` | siehe §5.3 |
| `final_board_hash` | siehe §5.3 |
| `armSchwarz`, `armWeiss` | `"A"` oder `"B"` |
| `sieger` | `"S"` oder `"W"` |
| `zuege` | gespielte Züge |
| `gefangene` | `{S, W}` |
| `aufgabe` | Farbe der Aufgabe oder `null` |
| `ereignisse` | Array, ein Eintrag je Zug (§5.2) |

### 5.2 Zugereignis

Alle Größen werden auf der Stellung **vor** dem Zug gerechnet, aus Sicht der
ziehenden Farbe. `geschlagen` ist die einzige Ausnahme: sie gehört zum Zug.

| Feld | Bedeutung |
|---|---|
| `zug` | Zugnummer ab 1 |
| `farbe` | `"S"` oder `"W"` |
| `idx` | 0–360, oder `-1` für Pass/Aufgabe |
| `sims` | Simulationen dieser Suche |
| `q` | Q des gewählten Zuges, oder `null` |
| `frei` | freie Felder |
| `tor` | `frei <= bensonEvalMaxEmpty` |
| `totEigen`, `totFremd` | benson-tote **Steine** je Seite |
| `grossGruppen` | eigene Gruppen ab `deathDiscountSize` Steinen |
| `minFreiGross` | kleinste Freiheitszahl darunter, oder `null` |
| `transferEigen`, `transferFremd` | Summe von `deathTransfer × STERBE_RAMPE[libs] × size × captureWeight` über alle Gruppen mit `libs < 4` und `size >= deathDiscountSize` |
| `geschlagen` | durch diesen Zug geschlagene gegnerische Steine |

Die Transfer-Größen werden im Harness **aus der Stellung** neu gerechnet, nicht
aus `leseTransferWaechter` gelesen: der Wächter summiert über alle
`evaluateBoard`-Aufrufe der Suche (Tausende je Zug), hier ist die Buchung der
Stellung selbst gefragt.

### 5.3 Hashes

`params_hash` — SHA-256 über einen kanonischen JSON-Text (Schlüssel sortiert)
aus den **effektiven** PARAMS beider Arme nach Anwendung von `--A`/`--B`, plus
`budget`, `maxMoves`, `komi`, `modus`, `opening`. Zweck: zwei Läufe sind nur
vergleichbar, wenn dieser Wert gleich ist. Der Seed steht bewusst **nicht**
darin — derselbe Parametersatz soll über Seeds hinweg denselben Hash tragen.

`final_board_hash` — SHA-256 über die 361 rohen Endbrett-Bytes (0 leer,
1 schwarz, 2 weiß), **ohne** Totsteinbereinigung. Zweck: der Nachweis, dass
zwei Läufe dieselbe Partie gespielt haben. Zusammen mit `params_hash` ist das
das Abbruchkriterium aus §4.2.

Beides wird mit `crypto.createHash('sha256')` gebildet und in voller Länge
(64 Hex-Zeichen) ausgegeben.

## 6. Auswertung des Piloten

Berichtet werden je Partie und aggregiert:

- Partien mit mindestens einer eigenen benson-toten Gruppe, deren Größe
- Rettungsereignisse: `minFreiGross` steigt von ≤3 auf ≥4 und fällt danach
  wieder auf ≤3 — gezählt je Farbe, mit der Gruppengröße zum Zeitpunkt des
  Anstiegs
- Züge mit offenem Tor, absolut und als Anteil
- Verteilung von `transferEigen` über die Partie
- Streuung all dieser Zahlen zwischen den 40 Partien

Erst danach wird über Partienzahl, Endpunkt und weitere Arme entschieden.

## 7. Geplante Arme der eigentlichen Reihe

Festgehalten, damit später nachvollziehbar ist, was **vor** den Daten geplant
war. Die endgültige Auswahl richtet sich nach §6.

| Arm | `bensonEvalMaxEmpty` | `bensonDeathTransfer` | misst |
|---|---|---|---|
| A | 160 | 0 | Auslieferungszustand (Kontrolle) |
| B | 160 | 1 | Effekt von #71 allein |
| C | 200 | 1 | Dosis |
| D | 250 | 1 | Dosis |
| E | 361 | 1 | Tor ganz offen |

Arm A ist keine Messung, sondern die Kontrolle aus §4.2. Die Trennung von A und
B ist nicht verzichtbar: ohne sie wäre jeder Dosiseffekt mit dem Effekt von #71
vermengt (§3.2).

## 8. Maßstabs-Konvention

Jede Aussage über eine Stellung nennt ihren Maßstab:

- `[roh]` — `estimateArea`, ohne Totsteinbereinigung
- `[benson]` — `bensonClassify`, beweisbar tot
- `[voll]` — `resolveLifeAndDeath` + `finalAreaScore`

Für „wer liegt vorn" gilt `[voll]`, nie `estimateArea`. Bei nicht-finalen
Stellungen wird eine Spanne genannt, keine Zahl. Eine Gegenprobe zählt nur,
wenn sie einen **anderen** blinden Fleck hat als die geprüfte Größe.
