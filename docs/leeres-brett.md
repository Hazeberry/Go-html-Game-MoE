# Leeres Brett: trägt der Default auch ohne Vorgabe?

Vorab festgelegt am 29.10.2026, vor jedem Lauf. Hazeberry hat den Versuch an
diesem Tag beauftragt. Der Messlauf startet erst nach einem eigenen Go.

## 1. Anlass und Frage

Alle Defaults wurden gegen GNU Go mit neun oder sechs Vorgabesteinen gewählt
([`teststaerke.md`](teststaerke.md) §9). Im Browser spielt die KI aber ohne
Vorgabe, mit Komi 7,5. Ob Netz und Muster dort genauso tragen, ist nie
gemessen worden.

Drei Fragen, je ein Arm gegen den Default D:

- **M0 (ohne Muster):** Helfen die Muster ohne Vorgabe? Mit sechs Steinen
  brachten sie gegen GNU Go nichts Messbares (+2,0 [−6,7; +10,7],
  [`komponenten.md`](komponenten.md) §9).
- **N0 (ohne Endspiel-Netz):** Hilft das Netz ohne Vorgabe? Mit sechs Steinen
  kostete das Abschalten −70,8.
- **A80 (Muster erst ab Zug 80):** Tritt der Schaden aus dem Selbstspiel
  auch gegen einen fremden Gegner auf, wenn das Brett leer beginnt? Im
  Selbstspiel gewann A80 nur 27,8 %, mit sechs Steinen gegen GNU Go lag es
  bei +3,5 [−3,8; +10,9] ([`muster-eroeffnung.md`](muster-eroeffnung.md) §9).
  Die Diagnose dort hat Komi, knappe Partien und Farbe als Ursache
  ausgeschlossen. Offen blieb, ob der Schaden am leeren Brett oder am
  Selbstspiel hängt.

**Was über Partien ohne Vorgabe bekannt ist.** Am 11.10., noch ohne Netz,
verlor die KI gegen GNU Go Stufe 1 alle 60 Partien ohne Vorgabe, im Mittel mit
−136 ([`eroeffnung-linie.md`](eroeffnung-linie.md) §3 und §5). Nach GNU
Gos Schätzung lag sie nach Zug 30 und 60 vorn und verlor dann im Mittelspiel.
Die Siegrate taugt deshalb nicht als Endpunkt, wohl aber der Endstand: Die
Paardifferenzen streuten damals mit SD 61.

Der Versuch wählt **keinen Default**. Er sagt, ob die Befunde mit Vorgabe auf
das leere Brett übertragbar sind.

## 2. Arme

[`auswertung/komponenten/arme-l.sh`](../auswertung/komponenten/arme-l.sh):

| Arm | Angabe (`--ki`) | Partien |
|---|---|---:|
| D | – | 480 |
| M0 | `musterGewicht=0` | 480 |
| N0 | `endspielNetz=0` | 480 |
| A80 | `musterAb=80` | 480 |

M0 und N0 schalten ab wie in Stufe A, A80 wie in der Muster-Eröffnung. Alle
vier Arme werden mit einem neuen Seed neu gespielt, auch D.

## 3. Bedingungen

Gegner ist **GNU Go Stufe 1, ohne Vorgabe**. Die Farben wechseln je Partie:
In Partien mit gerader Nummer spielt die KI Schwarz, sonst Weiß. Komi 7,5,
GNU Go zählt nach Fläche. Sonst wie in Stufe A ([`komponenten.md`](komponenten.md)
§3): 120 Simulationen, Aufgabe der KI aus, GNU Go gibt nicht auf, bis 600
Züge, Schätzung nach Zug 40, 80, 120 und 200
([`leeres-brett.yml`](../.github/workflows/leeres-brett.yml),
[`spielen.sh`](../auswertung/komponenten/spielen.sh) mit
`ARME=auswertung/komponenten/arme-l.sh` und `VORGABE=0`).

Fuego läuft nicht mit. Seine Einstellung (100 Spiele je Zug) wurde für sechs
Vorgabesteine gewählt ([`fuego.md`](fuego.md) §12). Ohne Vorgabe wäre sie
nicht kalibriert.

| Eingabe | Wert |
|---|---|
| `seed` | 222 |

Seed **222** ist noch nie benutzt. Je Arm 16 Teile zu 30 Partien. Alle Arme
spielen dieselben Partienummern 1 bis 480 mit denselben Seeds und Farben.

**Kontrolle.** Ein eigener Job spielt die Partien 1 bis 20 von D im selben
Lauf noch einmal. Erwartet: 20 von 20 Zug für Zug gleich. Mit Vorgabe 0
spielen frühere Läufe andere Partien, deshalb vergleicht die Kontrolle nicht
mit Stufe A.

**Proben.** N0 spielt in jedem Paar die ersten 80 Züge wie D, weil das Netz
erst ab Zug 80 wirkt. A80 spielt die ersten 80 Züge wie M0. Erwartet: 480 von
480.

**Neues Feld.** [`gnugo-duell.js`](../gnugo-duell.js) schreibt seit diesem
Versuch in jeden Datensatz `gefangen`: die Steine, die die KI und der Gegner
geschlagen haben. Die Züge ändern sich dadurch nicht.

## 4. Endpunkt und Urteil, vorab festgelegt

[`bericht.js`](../auswertung/komponenten/bericht.js) mit `--stufe L`,
[`ergebnis-l.sh`](../auswertung/komponenten/ergebnis-l.sh).

Endpunkt ist der Endstand Arm − D nach GNU Gos Zählung, gepaart nach
Partienummer, mit einem Intervall zu alpha 0,05/3 (**98,3 %**, t), weil es drei
Vergleiche gegen D gibt.

| Arm | Urteil | wenn |
|---|---|---|
| M0, N0 | **trägt ohne Vorgabe** | Obergrenze unter 0 (Abschalten kostet) |
| M0, N0 | Abschalten hilft ohne Vorgabe | Untergrenze über 0 |
| M0, N0 | kein Beitrag belegt | sonst |
| A80 | **Schaden auch gegen GNU Go ohne Vorgabe** | Obergrenze unter 0 |
| A80 | kein Schaden in der Größe des Selbstspiels | Untergrenze über −16,7 |
| A80 | offen | sonst |

−16,7 ist der mittlere Endstand von A80 im Selbstspiel gegen D (Diagnose in
[`muster-eroeffnung.md`](muster-eroeffnung.md) §9). Die Zählungen sind nicht
dieselben (dort die des Harness, hier die von GNU Go), die Zahl ist nur ein
grober Anker für „so groß wie im Selbstspiel“. Gilt für A80 beides, Obergrenze
unter 0 und Untergrenze über −16,7, zählt die erste Zeile: ein Schaden, aber
kleiner als im Selbstspiel.

**Beschreibend, ohne Anspruch:**

- Phasenprofil nach GNU Gos Schätzung (Zug 40, 80, 120, 200), Siege, erste
  Abweichung von D.
- **Verteilung des Endstands je Arm** (Minimum, 10 %, 25 %, Median, 75 %,
  90 %, Maximum, SD). Verliert die KI fast jede Partie hoch, zeigt die
  Verteilung, ob der Endstand trotzdem streut oder an einer Grenze klebt.
- Steine, die die KI im Mittel verliert und schlägt (Feld `gefangen`).
- **Unterschied der Bedingungen** Δ_ohne Vorgabe − Δ_sechs Steine je Arm
  (Welch, 98,3 %). Die Partien mit sechs Steinen kommen aus Stufe A (D, M0,
  N0) und der Muster-Eröffnung (A80), beide mit Seed 220 gegen GNU Go. Die
  Partien sind andere, deshalb Welch und kein Paarvergleich.
- Proben und Kontrolle.

Kein Ergebnis ändert einen Default. Zeigt sich ein Unterschied zur Messung
mit Vorgabe, folgt eine eigene Vorabfestlegung.

## 5. Auflösung, vorab gerechnet

Die SD der Paardifferenzen lag mit sechs Steinen bei 64 bis 75 (Stufe A) und
ohne Vorgabe am 11.10. bei 61 (60 Paare, ältere Engine). Mit 480 Paaren und
t = 2,40:

| SD der Differenzen | halbe Breite (98,3 %) | bei 80 % Power erkennbar | halbe Breite des Bedingungsunterschieds |
|---:|---:|---:|---:|
| 60 | 6,6 | 8,9 | 9,3 |
| 70 | 7,7 | 10,4 | 10,9 |
| 80 | 8,8 | 11,8 | 12,4 |

Ein Schaden von A80 in der Größe des Selbstspiels (−16,7) wäre also deutlich
zu sehen. Ein Unterschied der Bedingungen ist erst ab rund 10 bis 12 Punkten
erkennbar.

## 6. Erwartung vorab

- **D** verliert fast alle Partien, im Mittel mit −80 bis −140. Das Netz ist
  seit dem 11.10. dazugekommen.
- **N0:** klar negativ, rund −40 bis −80, also „trägt ohne Vorgabe“. Das Netz
  wirkt ab Zug 80, mit und ohne Vorgabe.
- **M0:** offen. Mit sechs Steinen brachten die Muster nichts. Ohne Vorgabe
  zählt die Eröffnung mehr, ein leichter Verlust ist möglich. Am
  wahrscheinlichsten: „kein Beitrag belegt“.
- **A80:** nahe 0, „kein Schaden in der Größe des Selbstspiels“. Dann hängt
  der Schaden am Selbstspiel und nicht am leeren Brett.
- Proben 480 von 480, Kontrolle 20 von 20.

## 7. Ablauf und Dauer

[`leeres-brett.yml`](../.github/workflows/leeres-brett.yml), manuell auf
`main`, ohne Eingaben: 64 Jobs (vier Arme × 16 Teile), eine Kontrolle und der
Bericht auf `ergebnisse/leeres-brett-lauf<N>` unter
`docs/daten/leeres-brett/lauf<N>/`. Nur der letzte Job darf ins Repo
schreiben.

Zusammen 1 920 Partien und 20 in der Kontrolle. Eine Partie dauert bei 120
Simulationen gegen GNU Go rund 0,3 Minuten. Erwartet werden **rund 10
Runner-Stunden, unter einer Stunde Laufzeit**.

## 8. Danach

Der Nachtrag wendet das Urteil aus §4 an und ordnet die beschreibenden Zahlen
ein. Kein Default ändert sich.

## 9. Nachtrag: Ergebnis von Lauf 1 (29.10.2026)

[Workflow-Lauf 40943994425](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40943994425)
auf Merge `443724e`, in knapp 50 Minuten (19:52 bis 20:42 UTC, 14 Runner-Stunden).
Alle 66 Jobs sind grün, es fehlt kein Teil. Daten:
[`docs/daten/leeres-brett/lauf1/`](daten/leeres-brett/lauf1/), der volle
Bericht in [`bericht.md`](daten/leeres-brett/lauf1/bericht.md).

**Der Lauf ist sauber.** Eine Partie ist abgebrochen (A80, Partie 268: GNU Go
stürzte beim ersten Zug ab, SIGSEGV). Sie fällt samt Partner heraus, A80 hat
479 Paare. Keine Partie lief bis zum Zuglimit. Die Kontrolle ist bestanden (20
von 20 Partien Zug für Zug gleich), die Proben auch: N0 spielt in 480 von 480
Paaren die ersten 80 Züge wie D, A80 in 479 von 479 wie M0.

### Arm − D ohne Vorgabe (98,3 %)

| Arm | Paare | Differenz | 98,3 % | Siege Arm / D | Urteil nach §4 |
|---|---:|---:|---|---|---|
| M0 | 480 | **+14,3** | [+7,8; +20,8] | 16 / 8 | **Abschalten hilft ohne Vorgabe** |
| N0 | 480 | −46,9 | [−53,0; −40,7] | 2 / 8 | **trägt ohne Vorgabe** |
| A80 | 479 | **+17,1** | [+10,6; +23,5] | 19 / 8 | kein Schaden in der Größe des Selbstspiels |

D verliert 472 von 480 Partien, im Mittel mit −78,8.

### Unterschied zu sechs Vorgabesteinen (Welch, 98,3 %)

| Arm | sechs Steine | ohne Vorgabe | ohne − mit |
|---|---:|---:|---|
| M0 | +2,0 | +14,3 | +12,3 [+1,9; +22,6] |
| N0 | −70,8 | −46,9 | +23,9 [+14,6; +33,2] |
| A80 | +3,5 | +17,1 | +13,6 [+3,4; +23,7] |

### Verteilung des Endstands

| Arm | 10 % | Median | 90 % | SD | verloren Ø | geschlagen Ø |
|---|---:|---:|---:|---:|---:|---:|
| D | −132,5 | −76,5 | −27,4 | 43,0 | 20,7 | 14,4 |
| M0 | −109,6 | −64,5 | −19,5 | 39,0 | 20,5 | 13,8 |
| N0 | −193,5 | −120,0 | −64,4 | 50,3 | 20,4 | 11,8 |
| A80 | −104,7 | −62,5 | −20,3 | 38,6 | 18,2 | 13,8 |

Der Endstand klebt an keiner Grenze. Er streut mit SD 39 bis 50 über rund 100
Punkte zwischen dem 10- und dem 90-%-Quantil. Die Sorge, er reagiere bei fast
nur verlorenen Partien nicht mehr (§4), trifft nicht zu. Die SD der
Paardifferenzen liegt bei 56 bis 59, unter dem, womit §5 gerechnet hat.

### Was das heißt

Kein Default ändert sich (§4). Die Befunde:

- **Das Netz trägt auch ohne Vorgabe**, mit −46,9 aber weniger als mit sechs
  Steinen (−70,8). Wie erwartet (§6: −40 bis −80).
- **Die Muster schaden ohne Vorgabe gegen GNU Go.** Ohne sie (M0) steht die
  KI um 14,3 Punkte besser, mit ihnen erst ab Zug 80 (A80) um 17,1. Mit sechs
  Steinen brachten sie nichts Messbares (+2,0). Der Unterschied der
  Bedingungen ist für beide Arme gesichert (Untergrenzen +1,9 und +3,4).
  **Das war nicht erwartet** (§6: „kein Beitrag belegt“).
- **Der Schaden des Selbstspiels tritt gegen GNU Go nicht auf, im Gegenteil.**
  Im Selbstspiel gewann A80 nur 27,8 % gegen D. Gegen GNU Go auf dem leeren
  Brett steht A80 deutlich besser als D. Gegen sich selbst helfen die Muster
  in der Eröffnung, gegen GNU Go schaden sie dort. Der Befund aus dem
  Selbstspiel überträgt sich also nicht auf einen fremden Gegner.

**Beschreibend, nachgerechnet je Farbe der KI** (nicht vorab festgelegt, 95 %):

| Arm − D | KI Schwarz (240 Paare) | KI Weiß (240 Paare) |
|---|---|---|
| M0 | +6,9 ± 7,0 | +21,6 ± 7,8 |
| N0 | −38,0 ± 6,3 | −55,8 ± 7,6 |
| A80 | +8,8 ± 6,5 | +25,3 ± 8,1 |

Der Schaden der Muster entsteht vor allem, wenn die KI Weiß spielt. Mit
Vorgabe spielt sie immer Schwarz. Auch die Lehrdaten der Mustertabelle
stammen aus 120 Partien mit neun Vorgabesteinen (GNU Go Stufe 10 wurde dort
für beide Farben gefragt). [`muster.md`](muster.md) §2 hat schon darauf
hingewiesen, dass die Merkmale die Eigenheiten dieser Partien tragen. Ob das
der Grund ist, ist nicht geprüft.

Nach GNU Gos Schätzung liegen M0 und A80 schon nach Zug 40 rund 30 Punkte
vorn. Bei sechs Steinen war ein solcher früher Vorsprung bis zum Ende
verschwunden (Muster-Eröffnung §9). Hier bleibt die Hälfte davon im Endstand.

### Abgleich mit der Erwartung (§6)

| Erwartung | eingetreten? |
|---|---|
| D verliert fast alle Partien, Ø −80 bis −140 | ja: 472 von 480, Ø −78,8 (knapp darüber) |
| N0 klar negativ, −40 bis −80, „trägt ohne Vorgabe“ | ja: −46,9 |
| M0 offen, am wahrscheinlichsten „kein Beitrag belegt“ | **nein**: +14,3, „Abschalten hilft“ |
| A80 nahe 0, „kein Schaden in der Größe des Selbstspiels“ | Urteil ja, aber nicht nahe 0: **+17,1** |
| Proben 480 von 480, Kontrolle 20 von 20 | ja (A80: 479 von 479 nach einem Absturz von GNU Go) |

### Wie es weitergehen kann

§4 sagt: Zeigt sich ein Unterschied zur Messung mit Vorgabe, folgt eine
eigene Vorabfestlegung. Er hat sich gezeigt. Bevor die Muster für Partien
ohne Vorgabe geändert werden, sind zwei Dinge offen:

- **Ein zweiter Gegner.** Bisher spricht nur GNU Go gegen die Muster, und im
  Selbstspiel sprechen sie dafür. Im Browser ist der Gegner ein Mensch.
- **Ein Schalter, der nur ohne Vorgabe greift**, zum Beispiel Muster aus oder
  schwächer, wenn die Partie ohne Vorgabe beginnt. Mit Vorgabe brachten die
  Muster nichts Messbares, kosteten dort aber auch nichts.
