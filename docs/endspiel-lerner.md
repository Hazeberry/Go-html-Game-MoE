# Endspiel-Lerner: ein kleines Netz für die Züge ab Zug 81 (Schritt 1, offline)

**Status: festgelegt am 20.10.2026, vor der Prüfung.** Die Prüfdaten sind noch
nicht beschriftet und von niemandem ausgewertet. Was danach kommt, steht als
Nachtrag darunter; die Abschnitte 1–7 werden nicht mehr geändert.

---

## 1. Anlass

Der Orakel-Test ([`muster-endspiel-orakel.md`](muster-endspiel-orakel.md) §8)
zeigt, dass im Endspiel viel zu holen ist: Zieht GNU Go Stufe 10 ab Zug 81 für
die KI, steigt der Endstand um +78,7. Ein geänderter Zug ist rund 1,6 Punkte
wert. Daraus folgt eine Messlatte: Ein Lerner muss die **gespielten Züge** der
KI ab Zug 81 so ändern, dass sie GNU Gos Zug um **4,0 Prozentpunkte** öfter
treffen, damit rund +5 Punkte herauskommen. Erst dann lohnt ein Versuch im Spiel.

Die Tabellen der Datenaggregation (T1 bis T4,
[`muster-endspiel-dagger.md`](muster-endspiel-dagger.md) §8) trafen GNU Gos Zug
in der Kandidatenliste um 2 bis 3 Prozentpunkte öfter, im Spiel kam davon
nichts an. Sie sehen nur die Nachbarschaft eines Punkts. Hazeberry hat am
20.10.2026 den nächsten Schritt beauftragt: einen stärkeren Lerner, zuerst
offline geprüft.

## 2. Der Lerner

Ein kleines Faltungsnetz über das ganze Brett:

- **Eingabe:** 28 Ebenen zu 19 × 19 aus Sicht der Seite am Zug
  ([`lerner-merkmale.js`](../auswertung/lerner-merkmale.js)). Darin stecken
  Steine, Freiheiten der Ketten (1, 2, 3, 4+), die letzten beiden Züge, Ko und
  legale Punkte, außerdem Schlag-, Atari- und Selbstatari-Punkte, die
  Bouzy-Karte der Engine, Benson (lebend, tot) und die Spielphase (ab Zug 160).
- **Aufbau:** eine 5×5-Faltung auf 32 Kanäle, vier 3×3-Faltungen mit
  Restverbindung, ReLU, eine 1×1-Faltung auf einen Wert je Punkt, Softmax über
  die legalen Punkte. Das sind rund 60 000 Gewichte.
- **Training** ([`lerner-training.py`](../auswertung/lerner-training.py),
  PyTorch, drei Epochen, Adam, zufällige Drehung und Spiegelung je Stapel):
  80 474 Stellungen mit der KI am Zug ab Zug 81, von GNU Go Stufe 10
  beschriftet. Sie stammen aus den Daten der Datenaggregation (Runden 1 bis 3
  und die drei Piloten, Seeds 204 bis 210) und den Entwicklungsdaten A und B
  der Endspiel-Muster (Seeds 151, 161, 201). Stellungen, in denen GNU Go passt,
  lernen nicht mit.
- **Die Gewichte stehen fest:** [`daten/endspiel-lerner/netz.json.gz`](daten/endspiel-lerner/netz.json.gz).
  Die Vorwärtsrechnung in JavaScript
  ([`lerner-netz.js`](../auswertung/lerner-netz.js)) gibt dieselben Werte wie
  PyTorch, geprüft auf vier Nachkommastellen.

**Wie der Lerner in die Suche greift** (nur an der Wurzel, nur ab Zug 81;
[`lerner-pruefung.js`](../auswertung/lerner-pruefung.js), über eine Kopie von
`index.html` mit zwei Haken; `index.html` im Repo bleibt unberührt):

1. Die **4 besten Punkte des Netzes** kommen unter die 16 Kandidaten der
   Wurzel, falls sie fehlen; sie verdrängen die letzten.
2. Der **Prior der Wurzelkinder** wird zu (1 − λ) · Heuristik + λ · Netz, mit
   **λ = 0,5**. Die Netz-Wahrscheinlichkeit wird dafür über die Wurzelkinder
   normiert.

Alles Übrige bleibt wie in der Standard-KI, auch Passen und Aufgabe.

## 3. Wie Netz und Einstellung entstanden

Die Prüfdaten der Endspiel-Muster (Seed 203, 240 Partien, 18 450 Stellungen)
dienten als Entwicklungsdaten. Dort trifft der beste Netzzug GNU Gos Zug in
38,9 % der Stellungen, der Zug der KI in der Partie in 18,4 %.

An gespielten Zügen, auf jeder 20. Stellung (923 Stellungen), mit den
Einstellungen der Prüfung:

| λ | Top | trifft ohne Lerner | trifft mit Lerner | Differenz | geändert |
|---:|---:|---:|---:|---:|---:|
| 0,3 | 4 | 19,4 % | 29,7 % | +10,3 | 30,8 % |
| **0,5** | **4** | 19,4 % | **35,0 %** | **+15,6** | 46,8 % |
| 0,8 | 4 | 19,4 % | 37,7 % | +18,3 | 61,9 % |

**Diese Zahlen kommen aus dem Container, nicht aus Actions.** Sie haben nur die
Einstellung bestimmt, sie zählen nicht. Ein größeres Netz (48 Kanäle, 6
Schichten) wurde angefangen, aber nicht zu Ende trainiert. Es geht nicht ein.
λ = 0,5 ist gewählt, weil es weniger Züge ändert als 0,8. Ein Zug, der
geändert wird und GNU Gos Zug nicht trifft, kann im Spiel auch schaden.

## 4. Prüfung und Tor (vorab festgelegt)

**Prüfdaten:** die Partien von Arm A der Parameter-Reihe
([`daten/parameter-reihe/lauf1/A.jsonl.gz`](daten/parameter-reihe/lauf1/A.jsonl.gz),
Seed 206), also die heutige Standard-KI gegen GNU Go Stufe 1 mit neun
Vorgabesteinen. Kein Lerner und keine Tabelle hat diese Partien gesehen.
Partie 1 zählt nicht: An ihr wurde das Werkzeug ausprobiert, und dabei war die
Trefferquote der KI ohne Lerner zu sehen. Es zählen die Partien 2 bis 240. Im Container
waren 97 dieser Partien schon zur Hälfte beschriftet, als die Prozesse
abbrachen. Ausgewertet wurde davon nichts, und die Dateien sind gelöscht;
Actions beschriftet alles neu.

**Ablauf** in GitHub Actions
([`endspiel-lerner.yml`](../.github/workflows/endspiel-lerner.yml), 16 Jobs zu
je 15 Partien):

1. GNU Go Stufe 10 beschriftet jede Stellung mit der KI am Zug ab Zug 81
   (`muster-daten.js --seite ki --ab 80`).
2. In jeder beschrifteten Stellung zieht die KI zweimal, ohne und mit Lerner.
   Die Stellung ist voll nachgestellt (Brett, Stellungsgeschichte, Gefangene,
   Ko, letzter Zug). Die Suche läuft mit 120 Simulationen, ohne
   Baumwiederverwendung und mit demselben festen Zufallsstrom für beide.

**Endpunkt:** Trefferquote der gespielten Züge auf GNU Gos Zug, mit Lerner minus
ohne, gepaart je Stellung, McNemar-Test (exakt, zweiseitig).

**Tor:** **bestanden**, wenn die Differenz mindestens **+4,0 Prozentpunkte**
beträgt **und** p < 0,05. Sonst nicht bestanden. `lerner-bericht.js` wertet es aus.

**Entscheidung:**
- **Bestanden:** Schritt 2 mit eigener Vorabfestlegung. Das Netz kommt als
  Schalter in `index.html` (Default 0), dann folgt die Messung im Spiel nach
  der Hausregel: 240 Paare gegen GNU Go und 360 Partien im Selbstspiel, in
  Actions.
- **Nicht bestanden:** Die Entwicklung hat sich nicht bestätigt. Kein Schritt
  2, das Ergebnis steht als Nachtrag.

**Sekundär, ohne Anspruch:** dieselben Zahlen für Zug 81–160 und ab Zug 161,
der Anteil geänderter Züge, die Trefferquote des besten Netzzugs allein und die
des Zugs in der Partie.

## 5. Erkennbare Größe und Erwartung

Erwartet werden rund 18 000 Stellungen. Ändert der Lerner rund die Hälfte der
Züge, liegt der Standardfehler der Differenz bei rund 0,4 Prozentpunkten. Das
Tor (+4,0) ist also weit über dem Rauschen, und es entscheidet die Größe, nicht
die Signifikanz.

**Erwartung vorab, ohne Wirkung auf die Lesart:** ohne Lerner rund 19 bis 25 %,
mit Lerner rund 30 bis 35 %, Differenz +8 bis +15 Prozentpunkte, Tor bestanden.
Etwas weniger als auf den Entwicklungsdaten, weil die Prüfdaten von einem
anderen Seed stammen.

## 6. Grenzen

- **Treffer sind nicht Punkte.** Die Datenaggregation hat gezeigt, dass eine
  bessere Vorhersage im Spiel verpuffen kann. Die Partien laufen mit dem Lerner
  in andere Stellungen, als die Prüfdaten enthalten. Das Tor ist deshalb nur die
  Eintrittskarte für Schritt 2.
- Ein geänderter Zug, der GNU Gos Zug verfehlt, kann besser oder schlechter
  sein als der alte. Die Prüfung sieht das nicht.
- Lehrer, Schiedsrichter und Gegner sind dasselbe Programm (GNU Go).
- Die Suche wird für jede Stellung neu gestartet; im Spiel übernimmt sie den
  Baum vom Zug davor. Beide Arme der Prüfung laufen gleich, der Vergleich ist
  fair, die absolute Trefferquote kann von der in Partien abweichen.
- Die Vorwärtsrechnung dauert in JavaScript rund 0,1 s je Zug. Für das Spiel
  im Browser ist das tragbar, aber nicht frei.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält. Eingaben:

| Eingabe | Wert |
|---|---|
| `pruefdatei` | `docs/daten/parameter-reihe/lauf1/A.jsonl.gz` |
| `ohne_nr` | `1` |
| `lambda` | `0.5` |
| `top` | `4` |

Jobs: `pruefen` (Eingaben), `teil` (16 Teile: beschriften und ziehen lassen,
`auswertung/dagger/lerner-teil.sh`), `ergebnis` (Bericht mit
`lerner-bericht.js`, Stellungen und Ergebnisse gepackt). Die Ergebnisse legt der
Workflow auf den Branch `ergebnisse/endspiel-lerner-lauf<N>` unter
`docs/daten/endspiel-lerner/lauf<N>/`. Nur der letzte Job darf ins Repo
schreiben. Erwartet werden 20 bis 40 Minuten.

## 8. Nachtrag: Ergebnis der Prüfung, Tor bestanden (20.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `endspiel-lerner.yml`
([Run 39378250135](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39378250135)),
auf dem Merge-Commit `526e01a` von `main`, mit den Eingaben aus §7, in 15 Minuten
(06:04 bis 06:19 UTC). GNU Go Stufe 10 beschriftete 19 222 Stellungen aus den
Partien 2 bis 240. Die Ergebnisse stehen unter
[`daten/endspiel-lerner/lauf1/`](daten/endspiel-lerner/lauf1/): der Bericht, die
beschrifteten Stellungen und je Stellung die Züge ohne und mit Lerner.

| Stellungen | n | trifft ohne Lerner | mit Lerner | Differenz | nur mit / nur ohne | geändert | bester Netzzug | Zug in der Partie |
|---|---:|---:|---:|---:|---|---:|---:|---:|
| **alle** | 19 222 | 18,1 % | **34,9 %** | **+16,8** | 3 676 / 443 | 48,0 % | 39,3 % | 17,9 % |
| Zug 81–160 | 9 550 | 18,6 % | 41,9 % | +23,2 | 2 444 / 226 | 49,1 % | 48,1 % | 18,6 % |
| ab Zug 161 | 9 672 | 17,5 % | 28,0 % | +10,5 | 1 232 / 217 | 47,0 % | 30,6 % | 17,2 % |

McNemar, exakt: p < 10⁻³⁰⁰ für alle Stellungen.

**Tor nach §4: bestanden.** Die Differenz liegt mit +16,8 Prozentpunkten weit über
+4,0. Das Ergebnis der Entwicklungsdaten (+15,6) bestätigt sich auf Partien,
die kein Lerner gesehen hat. Damit folgt Schritt 2 mit eigener
Vorabfestlegung: das Netz als Schalter in `index.html` (Default 0), dann die
Messung im Spiel nach der Hausregel, in Actions.

**Gegen die Erwartung aus §5.** Die Erwartung stand vor der Prüfung und bleibt
stehen. Getroffen haben: ohne Lerner 18,1 % (erwartet 19 bis 25 %), mit Lerner
34,9 % (erwartet 30 bis 35 %), Tor bestanden. Höher als erwartet war die
Differenz mit +16,8 (erwartet +8 bis +15); der Abstand zu den
Entwicklungsdaten blieb aus.

**Was das heißt, und was nicht.**

- Der Lerner ändert fast jeden zweiten Zug ab Zug 81. In 3 676 Stellungen
  trifft er GNU Gos Zug, wo die KI ihn verfehlte. In 443 verfehlt er ihn, wo die
  KI ihn traf.
- Nach der Messlatte aus dem Orakel-Test (s × n × q = 1,60 × 79,1 × 0,168)
  wären das rund **+21 Punkte**. Das ist nur eine Größenordnung. Die Messlatte
  zählt Züge, die durch genau GNU Gos Zug ersetzt werden. Hier wird aber die
  Hälfte der geänderten Züge zu einem anderen Zug, und ob der besser ist als
  der alte, sieht diese Prüfung nicht.
- Im Spiel laufen die Partien in andere Stellungen. Bei den Tabellen hat genau
  das den Vorsprung aufgezehrt (§6). Erst Schritt 2 sagt, ob der Lerner Punkte
  bringt.
- Im frühen Endspiel (Zug 81–160) ist der Vorsprung doppelt so groß wie danach.
  Der beste Netzzug allein trifft dort in 48 % der Stellungen.
