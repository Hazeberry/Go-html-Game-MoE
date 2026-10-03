# Blindheit im Laufkampf: Gibt es eine Fassung von „Einschließung", die trennt?

**Status: festgelegt am 03.10.2026, vor der Messung.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–5 werden nicht mehr geändert.

Explorativ in dem Sinn, dass noch kein Eingriff gemessen wird. Hier wird nur
geprüft, ob es eine Größe gibt, auf die ein Eingriff sich stützen könnte.

---

## 1. Anlass

Zwei echte Partien, Mensch gegen Hard-KI, beide Male verliert Weiß eine
große Gruppe, ohne auszubrechen:

- **22.09.2026** (`tests/stellungen/laufkampf-211.sgf`): 18 Steine, Zug 195.
  `evaluateBoard` stieg während der Einschließung bis zu ihrem Höchstwert bei
  Zug 184, einen Zug vor dem Benson-Beweis (`pilot-benson-defense.md`, §1).
- **03.10.2026** (Bug-Report, 247 Züge, mit `endTieBreak` = 1): 13 Steine um
  M14. Zwischen Zug 195 und 205 macht Schwarz mit K11, M11, N11, P11, N12,
  O12 von unten zu. Weiß spielt in derselben Zeit K8, L9, H9, M8. Die Gruppe
  hat durchgehend 6 Freiheiten. Ausbruchszüge wie N13 oder F14 (7 Freiheiten)
  bewertet `evaluateMove` mit 30,1, so hoch wie jeden ruhigen Zug. Sie stehen
  auf Rang 25–36 und kommen damit nicht in die 16 Wurzelkandidaten. Nach O12
  (Zug 205) ist die Gruppe Benson-tot, Q fällt von −0,01 auf −0,40.

Zwischen „wenige Freiheiten" (`STERBE_RAMPE`, ab 3 Freiheiten abwärts) und dem
Benson-Beweis hat die Bewertung nichts.

## 2. Die Vorbedingung

`pilot-benson-defense.md`, §10.5, hat eine Fassung geprüft: den Anteil
gegnerischer und Rand-Nachbarpunkte einer Gruppe. Roh trennte sie stark
(76 % gegen 35 %), aber fast nur über die Freiheiten. Innerhalb eines
Freiheitsbands trennte sie nichts (bei ≤ 3 Freiheiten 78,4 % gegen 79,2 %).
Dort steht: Wer einen Einschließungs-Term bauen will, braucht zuerst eine
Fassung, die nach Freiheiten geschichtet noch trennt. Das prüft dieses
Dokument.

## 3. Beobachtungen und Ausgang

- **Daten:** Rohdumps der Endspiel-Gleichstand-Läufe, Engine gegen sich
  selbst, `mctsFixedSims` = 120. **Entwicklung:** Erstlauf, Seeds
  20261006–09, 360 Partien. **Bestätigung:** Wiederholung, Seeds
  20261010–13, 360 Partien. Die Bestätigung wird erst angesehen, wenn der
  Kandidat auf der Entwicklung feststeht.
- **Beobachtung:** jede 5. Stellung; jede Kette mit mindestens 5 Steinen,
  die nicht Benson-tot ist.
- **Ausgang „stirbt":** Innerhalb der nächsten 40 Halbzüge wird der Ankerstein
  der Kette (ihr kleinster Index) geschlagen oder Benson-tot. Beobachtungen,
  nach denen keine 40 Halbzüge mehr folgen, entfallen, außer die Kette stirbt
  vorher.
- **Freiheitsbänder** wie in §10.5: ≤ 3, 4–7, 8–15, ≥ 16.

## 4. Kandidaten, festgelegt vor der Messung

| | Fassung | Erwartung bei Einschließung |
|---|---|---|
| **K0** | Einschließung wie §10.5: Anteil der Nachbarrichtungen der Kette, die auf einen gegnerischen Stein oder über den Rand zeigen | hoch |
| **K1** | Fluchtraum: leere Punkte, die von den Freiheiten aus über leere Punkte in höchstens 3 Schritten erreichbar sind (Freiheiten selbst zählen mit) | klein |
| **K2** | Zweite Freiheiten: Freiheiten plus deren leere Nachbarn, also K1 mit 1 Schritt | klein |
| **K3** | Einflussraum: Felder der eigenen Bouzy-Zone (Karte wie `influenceInvade`), die über eigene Zonenfelder mit der Kette zusammenhängen, ohne die Steine der Kette selbst | klein |

K0 ist die Referenz und soll §10.5 nachbilden. K1 und K2 messen, wie viel
Platz die Gruppe hat, statt wer neben ihr steht. K3 misst, ob sie in eigenem
oder fremdem Einfluss steht.

## 5. Kriterium

Gemessen wird je Band die **AUC** des Kandidaten für „stirbt", ausgerichtet
wie in §4 erwartet (0,5 = trennt nicht, 1 = trennt vollständig).

Ein Kandidat **besteht**, wenn er auf der Entwicklung erreicht:

- im Band **4–7** eine AUC ≥ 0,75. Das ist das Band der Partie vom 03.10.,
  in dem die Bewertung heute nichts sieht;
- im Band **≤ 3** eine AUC ≥ 0,65.

Bestehen mehrere, wird der mit der höchsten AUC im Band 4–7 genommen. Er
gilt als bestätigt, wenn er auf der Bestätigung im Band 4–7 wieder
≥ 0,75 erreicht.

**Was daraus folgt:**

- **Bestätigt:** Auf diese Größe darf ein Term in `evaluateBoard` gebaut
  werden. Er wird mit eigener Festlegung und A/B-Lauf gemessen.
- **Kein Kandidat besteht:** Ein Einschließungs-Term bleibt unbegründet, wie
  in §10.5. Der Laufkampf wäre dann eher eine Frage der Suche als der
  Bewertung.

Berichtet werden alle vier Kandidaten, in allen Bändern, auch die
gescheiterten.

---

## 6. Nachtrag: Ergebnis (03.10.2026)

Werkzeug: [`auswertung/einschliessung.js`](../auswertung/einschliessung.js).
Eine Präzisierung vor der Messung, nach einer Probe an drei Partien: Bei K0
zählen Richtungen in die eigene Kette nicht mit, im Nenner stehen nur
Richtungen, die die Kette verlassen. So war §4 gemeint („Nachbarrichtungen
der Kette").

**Entwicklung** (Seeds 20261006–09, 74 372 Beobachtungen, 5 498 sterben),
AUC je Band:

| Band | n | stirbt | K0 | K1 | K2 | **K3** |
|---|---:|---:|---:|---:|---:|---:|
| ≤ 3 | 9 624 | 39,0 % | 0,637 | 0,634 | 0,639 | **0,674** |
| 4–7 | 19 280 | 8,9 % | 0,724 | 0,680 | 0,694 | **0,799** |
| 8–15 | 6 831 | 0,5 % | 0,822 | 0,726 | 0,719 | 0,874 |
| ≥ 16 | 38 637 | 0 | — | — | — | — |

Nur **K3, der Einflussraum, besteht** (4–7 ≥ 0,75 und ≤ 3 ≥ 0,65). Die
Mittelwerte: Sterbende Gruppen haben im Band 4–7 im Mittel 1,9 eigene
Zonenfelder um sich, überlebende 38,6.

**Bestätigung** (Seeds 20261010–13, 73 583 Beobachtungen, 5 638 sterben):
K3 erreicht im Band 4–7 **0,804**, im Band ≤ 3 0,699. **Bestätigt.** Die
übrigen Kandidaten liegen wie auf der Entwicklung darunter (K0 0,701, K1
0,698, K2 0,705 im Band 4–7).

**K0 trennt hier besser als in §10.5** (0,724 statt fast nichts). Die
Fassung ist nicht dieselbe (dort zählten Nachbarpunkte, hier Richtungen),
und die Daten auch nicht. Am Ergebnis ändert das nichts: K0 besteht das
Kriterium nicht.

### 6.1 Wie das Risiko mit K3 fällt (Entwicklung, ohne Test)

| K3 | ≤ 3 Freiheiten | 4–7 Freiheiten | 8–15 Freiheiten |
|---|---:|---:|---:|
| 0 | 50,0 % | 21,2 % | 2,6 % |
| 1–4 | 46,3 % | 14,3 % | 1,6 % |
| 5–14 | 19,2 % | 5,7 % | 0,8 % |
| 15–39 | 6,0 % | 0,9 % | 0 |
| ≥ 40 | 2,3 % | 0,1 % | 0 |

Anteil der Gruppen, die binnen 40 Halbzügen sterben. K3 = 0 heißt nicht
„tot", aber im Band 4–7 ein rund 200-fach höheres Risiko als K3 ≥ 40. Nach
Größe geschichtet steigt die AUC im Band 4–7 mit der Gruppe: 0,796 (5–7
Steine), 0,804 (8–12), 0,843 (13–20), 0,914 (ab 21). Größe erklärt die
Trennung also nicht weg.

### 6.2 Die beiden Partien

K3 der Gruppe, die verloren ging:

- **03.10., M14:** Ab Zug 193 steht K3 auf 0, bei 5–6 Freiheiten, bis zum
  Benson-Beweis nach Zug 205. Das sind 12 Züge Vorlauf, genau die Zeit, in
  der N13 oder F14 noch ausgebrochen wären. Davor springt K3 bei der kleinen
  Gruppe (2–3 Steine) zwischen 0 und rund 30.
- **22.09., J14:** K3 = 0 schon ab Zug 160 (10 Steine, 5 Freiheiten), 25
  Züge vor dem Benson-Beweis nach Zug 185.

### 6.3 Was daraus folgt

Nach §5 darf auf K3 ein Term gebaut werden, mit eigener Festlegung und
A/B-Lauf. Die Größe ist teuer, weil sie eine Bouzy-Karte braucht. Nach dem
Kommentar an der Karte ist das einmal pro Zug an der Wurzel vertretbar, pro
Simulation nicht. Ein Term gehört deshalb in die Zugbewertung an der Wurzel
(`evaluateMove`), nicht in `evaluateBoard`. Dort kostet er mit der
inkrementellen Karte aus `endTieBreak` wenig. Und dort sitzt auch der Fehler
der Partie vom 03.10.: Die Ausbruchszüge kamen nicht unter die 16
Wurzelkandidaten.
