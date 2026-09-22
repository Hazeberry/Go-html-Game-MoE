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

---

# Nachtrag vom 22.09.2026: Ergebnisse des Piloten und Festlegung der Reihe

Die Abschnitte 1 bis 8 bleiben unverändert stehen — sie waren vor den Daten
geschrieben und sollen so nachlesbar bleiben. Was dieser Nachtrag festlegt,
wurde **nach** dem Piloten entschieden und ist als solches gekennzeichnet.

## 9. Der Pilotlauf

40 Partien, Arm A gegen sich selbst, `mctsFixedSims=120`, Seed 20260922,
17,3 Minuten. Rohdump unter dem Schema aus §5.

### 9.1 Abbruchkriterium (§4.2)

```
params_hash über alle 40 Partien: einheitlich  e91c72317fdf0140…
verschiedene Endstellungen:       40 von 40
Simulationen je Zug:              120 (fest)
Partien am Zug-Limit 400:         1

Wiederholung mit demselben Seed, 5 Partien:
  params_hash, final_board_hash, Sieger, alle Zugereignisse identisch
```

**Einschränkung:** wiederholt wurden 5 der 40 Partien, nicht alle. Der
Harness spielt sequenziell aus einem Zufallsstrom; ein Auseinanderlaufen
hätte bei Partie 1 begonnen. Streng nach §4.2 wäre es der ganze Lauf.

### 9.2 Die vier Fragen aus §4.1

| Frage | Antwort |
|---|---|
| eigene Gruppe wird benson-tot | **40 von 40 Partien**, Ø 12,1 Steine, erstmals um Zug 147 |
| Sägezahn | 1,44 Rettungen je Farb-Partie, 0,78 davon zurückgedrückt; 18,8 % ohne |
| Tor geht auf | **40 von 40**, ab Zug ~206; 38,4 % aller Züge, davon 33,8 % mit toter Kette |
| Streuung | 333 Züge je Partie (SD 33); größter Einzelschlag Ø 13,6 Steine (SD 7,8) |

Das Ereignis ist **nicht selten**: `bensonDeathTransfer` greift in jedem
dritten Zug. Die in §3.3 befürchtete Seltenheit tritt nicht ein; die offene
Frage ist allein, ob der Eingriff nützt.

## 10. Endpunktwahl — nach Pilotdaten entschieden

Diese Auswahl wurde **nach** Sichtung der Pilotdaten getroffen. Das ist für
die Sekundäranalysen unkritisch, für den primären Endpunkt aber eine
Einschränkung der Vorab-Registrierung, die hier offen stehen muss.

### 10.1 Die Definitionen

Vom Auftraggeber geliefert, hier wörtlich zitiert (Farbe verallgemeinert):

> **V1:** Ein V1-Ereignis liegt vor, wenn ein Zug nach seiner Ausführung die
> Zahl der Freiheiten einer zusammenhängenden Gruppe um ≥1 erhöht und diese
> Gruppe vor dem Zug bereits benson-tot war.
>
> **V2:** Ein V2-Ereignis liegt vor, wenn ein Zug nach seiner Ausführung die
> Zahl der Freiheiten einer zusammenhängenden Gruppe um ≥1 erhöht und
> 1. die Gruppe vor dem Zug noch nicht benson-tot war und
> 2. die Gruppe später benson-tot wird, ohne dass zuvor ein Stein dieser
>    Gruppe geschlagen wird.

Die Definitionen stammen nicht aus diesem Repository und nicht aus dem
Pilotlauf; sie wurden zugeliefert. Keine der vier hier betrachteten Größen
braucht eine Änderung am Rohformat — alle sind aus §5 ableitbar.

### 10.2 V1 ist strukturell unmessbar

```
V1 über 40 Partien:  Ø 0,00   in 80 von 80 Farb-Partien   SD 0,00
```

Kein empirischer Nullbefund, sondern ein struktureller. Um die Freiheiten
einer bereits benson-toten Gruppe zu erhöhen, muss man entweder daneben
spielen oder eine angrenzende gegnerische Kette schlagen. Beides ist zu:

```
Freie Nachbarpunkte eigener benson-toter Gruppen: 6000
  legal (ohne Filter):                       5904  (98,4 %)
  vom Benson-Zugfilter als totgeboren markiert: 6000  (100,0 %)
```

`bensonMoveFilter` (Default an) entfernt **jeden** dieser Punkte aus der
Kandidatenliste, und die bordernden gegnerischen Ketten sind per Benson
pass-alive, also unschlagbar. Der Filter ist in allen Armen identisch und
wird von `bensonDeathTransfer` nicht berührt. V1 hat damit in jedem Arm
Varianz null: kein MDE, kein möglicher Effekt.

**V1 entfällt als Endpunkt.** Nicht als Befund — dass die Engine eine
bewiesen tote Gruppe nicht verteidigen *kann*, gehört zum Bild.

### 10.3 Die messbaren Kandidaten

Alle Zahlen aus dem Piloten, MDE bei α = 0,025 zweiseitig, Power 80 %,
Partie als Einheit, gepaart.

| Größe | Ø je Farb-Partie | SD der Differenz | MDE n=240 | MDE n=360 | mit Sieg assoziiert |
|---|---|---|---|---|---|
| **V2** | 1,91 | 3,23 | **0,64** | **0,52** | nicht geprüft |
| D1 (Züge unter eigenem totem Bestand) | 55,01 | 44,86 | 8,93 | 7,29 | t = 0,54 |
| verlustMax (größter erlittener Einzelschlag) | 9,50 | 10,76 | 2,14 | 1,75 | **t = −4,66** |
| R1 (Rettungen großer Gruppen ≤3 → ≥4) | 1,44 | — | — | — | t = 1,11 |

`V2` ist **nicht** identisch mit `R1`: R1 zählt Rettungen großer Gruppen von
≤3 auf ≥4 Freiheiten, V2 jede Freiheitserhöhung an einer Gruppe, die später
ohne Steinverlust benson-tot wird.

`D1` misst **Dauer unter totem Bestand**, keine Verteidigung. Der Zähler
pausiert, wenn die tote Gruppe geschlagen wird, ist also auch nicht
„Spieldauer nach dem ersten Benson-Tod".

Nur `verlustMax` ist mit dem Partieausgang assoziiert (t = −4,66): wer
verliert, verliert am größten Einzelschlag Ø 6,75 Steine mehr.

### 10.4 Warum V2 primär wird

`bensonDeathTransfer` wirkt im Moment eines V2-Zuges nicht — die Gruppe ist
dann noch nicht benson-tot. Er wirkt über die **Vorausschau**: MCTS bewertet
Blätter mit `evaluateBoard`; führt eine Linie in eine Stellung, in der die
Gruppe benson-tot ist, bucht der Parameter dort `−size × captureWeight`
statt 0. Genau darüber kann die Suche den Tod vorher sehen und die
Investition unterlassen.

Das ist eine Herleitung aus dem Code, keine Messung. Der A/A-Pilot kann sie
nicht prüfen.

**Die Vorausschau ist armabhängig**, und das ist für die Auslegung der Tests
entscheidend:

```
WANN passieren V2-Ereignisse?   n = 153
  Zugnummer:     10 % 103   Median 182   90 % 265
  freie Felder:  10 % 257   Median 183   90 % 107

  Tor (<=160 freie Felder) zum Zeitpunkt bereits offen: 39,9 %
```

Arm B (`bensonEvalMaxEmpty=160`) kann nur bei **39,9 %** der V2-Gelegenheiten
überhaupt vorausschauen, Arm E (361) bei 100 %. Der Test **A–B misst eine
verdünnte Version des Effekts, B–E die volle.** Ein schwaches A–B darf
deshalb nicht als „wirkt nicht" gelesen werden.

### 10.5 Nullbefund zum Encerclement-Term

Geprüft wurde, ob Einschließung (Anteil gegnerischer und Rand-Nachbarpunkte
einer Gruppe) den Benson-Tod mit Vorlauf anzeigt — die Größe, die ein
eigener Einschließungs-Term bräuchte.

```
4887 Beobachtungen, große noch lebende Gruppen, 20 Partien

roh, Vorlauf 40 Zuege:
  stirbt  Einschliessung 76,3 % gegen 34,5 %   Freiheiten 3,3 gegen 33,5

nach Freiheitsband geschichtet, Vorlauf 40 Zuege:
  Freiheiten      n     stirbt        Einschliessung stirbt / ueberlebt
  <= 3          395    108 (27,3 %)         78,4 % gegen  79,2 %
  4-7          1070     48 ( 4,5 %)         71,5 % gegen  62,4 %
  8-15          330      0 ( 0,0 %)              — gegen  33,8 %
  >= 16        3092      0 ( 0,0 %)              — gegen  21,2 %
```

Der starke Rohkontrast ist fast vollständig ein Freiheitseffekt. **Innerhalb
eines Freiheitsbands trennt die Einschließung nichts** (78,4 % gegen 79,2 %
bei ≤3 Freiheiten). Keine einzige Gruppe mit ≥8 Freiheiten stirbt innerhalb
von 40 Zügen, in 3422 Beobachtungen.

Die Freiheitszahl ist die trennende Größe, und `STERBE_RAMPE` liest sie
bereits. **Nach diesen Daten ist ein eigener Encerclement-Term nicht
begründbar.** Nicht widerlegt: eine A/A-Konfiguration über 20 Partien ist
schmal, und „Anteil gegnerischer Nachbarpunkte" ist nur eine mögliche
Fassung von Einschließung. Wer den Term dennoch bauen will, braucht zuerst
eine Fassung, die dieses Schichtungsbild besteht.

## 11. Festlegung der Reihe

| | |
|---|---|
| **Arme** | A (`160/0`), B (`160/1`), E (`361/1`) — `bensonEvalMaxEmpty`/`bensonDeathTransfer` |
| **Vergleiche** | A–B und B–E, je eine eigene Partienserie |
| **n** | 360 Partien je Vergleich, 720 insgesamt |
| **Einheit** | die Partie; beide Arme spielen dieselbe Partie, also gepaart |
| **Primär** | V2, gepaarter t-Test auf der Differenz je Partie |
| **Multiplizität** | Bonferroni über zwei Tests, α = 0,025 je Test |
| **Sekundär** | `verlustMax`, `D1`, Siegrate — nach Farbe stratifiziert, ohne Anspruch |
| **Sims** | `mctsFixedSims=120` in allen Armen |
| **Laufzeit** | 26 s je Partie gemessen → ≈ 5,2 h |

### 11.1 Paarung

Die Beobachtungen sind konstruktionsbedingt gepaart: beide Arme spielen
dieselbe Partie. Im Piloten ist die Korrelation der beiden Seiten
**negativ** (r = −0,235 bei `verlustMax`) — die Paarung bringt also nichts
ein. Sie ist trotzdem verbindlich, denn ein ungepaarter Test unterstellt
Unabhängigkeit, die nicht besteht, und behauptet damit mehr Präzision als
vorhanden:

```
SE der Mittelwertsdifferenz, verlustMax, n = 240
  gepaart (korrekt):       10,76 / √240 = 0,695
  ungepaart (unzulässig):  √2·7,27/√240 = 0,664
```

### 11.2 Farbe

Im A/A-Piloten, in dem beide Seiten dieselbe Engine sind:

```
Schwarz verliert im groessten Schlag  Ø  7,38 Steine
Weiss   verliert im groessten Schlag  Ø 11,63 Steine
Differenz -4,25   t = -2,50 bei n = 40
```

Der Farbeffekt ist doppelt so groß wie der MDE bei n = 240. Der Harness
wechselt die Farben partieweise, was ihn im Armvergleich aufhebt; die
Auswertung trennt trotzdem nach Farbe, sonst misst eine ungerade Partienzahl
die Farbe statt den Parameter.

### 11.3 Was diese Reihe nicht beantwortet

Ob `bensonDeathTransfer` die Spielstärke hebt. Der MDE der Siegrate liegt
bei 8,1 Prozentpunkten (n = 360, α = 0,025) — über allem, was in diesem
Projekt je an Effekt gemessen wurde. Die Siegrate läuft als Kontrollgröße
mit, nicht als Nachweis.

---

# Nachtrag vom 22.09.2026, zweiter Teil: Ergebnis der Reihe

## 12. Die Reihe ist gelaufen

720 Partien nach §11, zwei Vergleiche zu je 360, getrennte Seeds
(20260923 und 20260924), `mctsFixedSims=120`, je 153 bzw. 152 Minuten.
Beide Läufe parallel auf vier Kernen — zulässig, weil `mctsFixedSims` die
Zeitabhängigkeit aus der Suche genommen hat und CPU-Konkurrenz die Partien
nicht mehr verändern kann.

`params_hash` je Lauf einheitlich, 360 verschiedene Endstellungen je Lauf.

### 12.1 Primärer Endpunkt V2

| | A (160/0) | B (160/1) | Differenz | t | p |
|---|---|---|---|---|---|
| **A–B** | 1,850 | 1,147 | **−0,703** | −5,570 | **< 0,0001** |

| | B (160/1) | E (361/1) | Differenz | t | p |
|---|---|---|---|---|---|
| **B–E** | 1,306 | 1,567 | +0,261 | 2,190 | 0,0285 |

**Test A–B schlägt an** (α = 0,025), und der Effekt ist größer als der vorab
berechnete MDE von 0,52. Mit eingeschaltetem Übertrag investiert die Engine
38 % weniger Züge in Gruppen, die später bewiesen sterben.

**Test B–E verfehlt die Schwelle** — und zeigt in die Gegenrichtung.

### 12.2 Die Vorhersage aus §10.4 ist nicht eingetreten

§10.4 leitete aus dem Code her, Arm E müsse **stärker** senken als Arm B,
weil er 100 % statt 39,9 % der V2-Gelegenheiten vorausschauen kann. Gemessen
ist das Gegenteil, knapp unter der Signifikanzschwelle.

Die Herleitung war nicht falsch im Mechanismus — sie war unvollständig. Ein
weiter geöffnetes Tor bewertet auch **gegnerische** tote Gruppen früher, und
was daraus für die Zugwahl folgt, wurde nicht durchdacht. Die Vorhersage
gilt als nicht bestätigt.

### 12.3 Gelegenheit gegen Investition — ein Konstruktionsfehler der Spec

V2 ist eine absolute Zahl. Fällt sie, kann das zwei Ursachen haben: weniger
Fehlinvestition, oder schlicht weniger sterbende Gruppen. Beides tritt ein:

```
A gegen B:  tote Gruppen  5,35 → 4,64  (t = −4,82)
            tote Steine  12,85 → 9,59  (t = −5,78)

B gegen E:  tote Gruppen  4,78 → 5,19  (t = +3,01)
            tote Steine   9,50 → 10,79 (t = +2,95)
```

Eine Rate wäre der saubere Endpunkt gewesen. Das war beim Schreiben von §11
nicht gesehen. **Nachträglich** — also explorativ, nicht vorab registriert —
auf die Gelegenheiten normiert:

```
V2 je toter Gruppe

A gegen B:  0,346 → 0,247   Differenz −0,1108   t = −4,081   p < 0,0001
                            95%-KI [−0,1640, −0,0576]   345 Partien

B gegen E:  0,273 → 0,302   Differenz +0,0374   t =  1,422   p = 0,1550
                            95%-KI [−0,0141, +0,0890]   349 Partien
```

**Der Effekt in A–B überlebt die Normierung.** Es sind nicht nur weniger
Gelegenheiten; die Rate selbst fällt um 29 %. Ein neuer Lauf ist dafür nicht
nötig gewesen — beide Größen liegen je Partie im Rohdump.

### 12.4 Sekundär, ohne Anspruch

```
                 A gegen B                    B gegen E
verlustMax    8,29 → 7,50   p = 0,075      6,96 → 6,75   p = 0,718
D1           62,33 → 53,55  p = 0,0001    67,83 → 59,53  p = 0,0001
Siegrate      B 51,7 %  (±5,2)  n. s.      E 46,4 %  (±5,2)  n. s.
Aufgaben      A 115  B 124                 B 103  E 122
```

Die **Siegrate bewegt sich in keinem der beiden Tests**. `verlustMax` — die
einzige im Piloten mit dem Partieausgang assoziierte Größe (t = −4,66) —
sinkt um 0,79 Steine und verfehlt die Schwelle.

### 12.5 Was daraus folgt

**Der Mechanismus wirkt, nachweisbar.** Mit `bensonDeathTransfer = 1`
verliert die Engine **3,3 Steine je Partie weniger** an bewiesen tote
Gruppen (t = −5,78), verbringt **9 Züge weniger** unter totem Bestand
(t = −3,88) und investiert **29 % seltener** in eine Gruppe, die stirbt
(t = −4,08). Das ist der größte gemessene Effekt dieser Serie.

**Ein Spielstärkegewinn ist nicht belegt.** Die Siegrate liegt in beiden
Tests innerhalb des Rauschens, wie bei `deathDiscount`, `tsumegoSunkCost`,
`tsumegoEyeOpenPenalty`, `openLineWeight` und `atariSizeWeight` zuvor.

**Der Default bleibt deshalb 0.** Nach den Maßstäben dieses Projekts trägt
ein Wirknachweis ohne Stärkebeleg keine Default-Änderung — dieselbe
Entscheidung wie bei `endLibPressure`, wo der Wirknachweis ebenfalls klar
und der Stärkeeffekt ebenfalls offen war.

**Das weitere Öffnen des Tors bringt nichts.** `bensonEvalMaxEmpty` bleibt
auf 160; die Dosisreihe darüber ist damit beantwortet und braucht keine
Fortsetzung.

### 12.6 Einschränkungen

- Der primäre Endpunkt vermengt Gelegenheit und Investition (§12.3). Die
  Normierung, die das trennt, ist **nachträglich** gewählt.
- Die Endpunktwahl selbst erfolgte nach Sichtung der Pilotdaten (§10).
- Die §10.4-Vorhersage zur Vorausschau ist nicht eingetreten; der
  Mechanismus ist damit schlechter verstanden, als §10.4 nahelegt.
- Beide Läufe nutzen dieselbe Engine auf beiden Seiten mit nur diesem einen
  Parameterunterschied. Übertragbarkeit auf das Spiel gegen Menschen ist
  nicht geprüft.
