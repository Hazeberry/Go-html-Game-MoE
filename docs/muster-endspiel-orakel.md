# Endspiel-Muster: Orakel-Test, wie viel in besseren Zügen steckt

**Status: festgelegt am 19.10.2026, vor dem Lauf.** Der Lauf ist noch nicht
gelaufen. Was danach kommt, steht als Nachtrag darunter; die Abschnitte 1–7
werden nicht mehr geändert.

---

## 1. Anlass

Die Datenaggregation ([`muster-endspiel-dagger.md`](muster-endspiel-dagger.md))
und die Messung mit 240 Paaren ([`muster-endspiel-messung.md`](muster-endspiel-messung.md))
haben für die Endspiel-Tabelle dasselbe gezeigt: Sie trifft GNU Gos Zug auf
neuen Stellungen um 2 bis 3 Prozentpunkte öfter als die alte, und das Spiel
wird davon nicht besser (B − A −3,7, 95 %: [−10,7; +3,3]). Offen ist, ob das
an der Tabelle liegt oder daran, dass im Endspiel wenig zu holen ist, und wie
viel besser ein Lerner treffen müsste, damit sich Punkte ergeben.

Dieser Test beantwortet das mit einem **Orakel**: GNU Go Stufe 10 zieht für
die KI, ab Zug 81 oder ab Zug 161, in einem Anteil der Züge oder in allen. Der
Unterschied im Endstand ist die Obergrenze dessen, was bessere Züge ab dort
bringen können; aus der Dosis ergibt sich, wie viel ein einzelner geänderter
Zug im Mittel wert ist. Hazeberry hat den Test am 19.10.2026 angefordert. Er
ändert nichts an der Engine und entscheidet nichts über die Tabelle (die ist
mit der Messung verworfen); er misst den Spielraum.

## 2. Arme

| Arm | Orakel |
|---|---|
| **A** | keins (Default) |
| **D25** | GNU Go Stufe 10 zieht für die KI ab Zug 81 in 25 % ihrer Züge |
| **D50** | ab Zug 81 in 50 % ihrer Züge |
| **D100** | ab Zug 81 in allen ihrer Züge |
| **E100** | ab Zug 161 in allen ihrer Züge |

„Zieht“ heißt: Ein zweites GNU Go auf Stufe 10 spielt jeden Zug der Partie mit
und liefert in jedem Zug der KI ab der Zugzahl `mc` ≥ AB (AB 80 = ab dem 81.
Zug, 160 = ab dem 161.) seinen Zug (`reg_genmove`). Mit der Wahrscheinlichkeit
des Arms, gezogen aus einem eigenen Zufallsstrom je Partie, wird dieser Zug
statt des Zugs der KI gespielt. Ein Pass des Orakels wird als Pass gespielt.
Die Suche der KI läuft in jedem Zug trotzdem, ihre Wahl wird nur verglichen.
Option `--orakel-zug AB[:ANTEIL]` in `gnugo-duell.js`; ohne sie ändert sich
nichts (der Test `tests/gnugo-bruecke.js` prüft, dass eine nicht erreichte
Schwelle dieselbe Partie ergibt).

## 3. Messung

Bedingungen wie in den Messungen: Gegner GNU Go Stufe 1, neun Vorgabesteine,
120 Simulationen (`mctsFixedSims=120`), Aufgabe der KI aus, GNU Go gibt nicht
auf, bis 600 Züge, ausgespielt. Seed **206**, 120 Partien je Arm in 8
Teilläufen zu 15 (Partien 1 bis 120); gleiche Partienummer in allen Armen ist
ein Paar. Das sind die Partien 1 bis 120 der Messung M1: Arm A spielt Zug für
Zug dieselben Partien wie dort. Der Lauf prüft das (Eingabe `kontrolle`:
gleicher Endstand und gleiche Zugzahl je Partie gegen Arm A aus M1).

Der Code ist der des Dispatch-Commits von `main`: `index.html` unverändert,
`gnugo-duell.js` mit der neuen Option. Es gibt keinen Schalter und keine
Tabelle. Der Lauf geschieht in GitHub Actions
([`endspiel-orakel.yml`](../.github/workflows/endspiel-orakel.yml), 40 Jobs:
5 Arme × 8 Teile).

## 4. Was gemessen wird und wie gelesen wird

Je Arm gegen A, gepaart nach Partienummer:

- **Differenz des Endstands** nach GNU Gos Zählung, mit 95-%-Intervall
  (gepaarter t-Test).
- **Gelegenheiten** (Züge der KI ab AB je Partie), **ersetzt** (davon vom
  Orakel gespielt), **geändert** (ersetzt, und der Orakelzug war nicht der der
  KI), und wie oft der Zug der KI derselbe gewesen wäre.
- **Punkte je geändertem Zug** = Differenz / Ø geänderte Züge je Partie.
  Näherung: Der Nenner wird als fest behandelt.
- **Steigung** s über die kleinen Dosen D25 und D50 (Regression durch den
  Ursprung der Punkte (Ø geänderte Züge, Differenz)): Punkte je geändertem
  Zug. Ein Lerner ändert wenige Züge, deshalb zählt die Steigung bei kleiner
  Dosis. D100 geht nicht ein: Dort passt das Orakel früher und die Partien
  enden kürzer (§5), die Wirkung ist nicht linear in der Dosis. D100 steht für
  die Obergrenze.
- **Messlatte:** Ein Lerner, der in einem Anteil q der Züge der KI ab Zug 81
  den Zug der KI durch den Orakelzug ersetzt, wo beide verschieden sind,
  gewinnt rund s × n × q Punkte (n: Züge der KI ab Zug 81 in einer Partie von
  Arm A, also ohne Orakel). Für +5 Punkte ist q = 5 / (s × n). q ist der
  Zuwachs der Trefferquote der gespielten Züge.

**Lesart, vorab festgelegt** (es gibt keine Entscheidung über die Engine, nur
über die Richtung der Arbeit):

| D100 − A | Folge |
|---|---|
| unter +10 | Auch perfekt gewählte Züge ab Zug 81 bringen weniger als 10 Punkte. Die Arbeit an Endspielzügen lohnt nicht. Der nächste Orakel-Test wäre ab Zug 1 (Eröffnung und Mittelspiel). |
| +10 und mehr | Es steckt etwas drin. Dann gilt die Messlatte: Ein stärkerer Lerner als die Tabelle (z. B. ein kleines Netz auf den vorhandenen 71 000 beschrifteten Stellungen) wird zuerst offline geprüft, ohne Partien. Tor: Er muss die Trefferquote der gespielten Züge um mindestens q (+5 Punkte) über die Trefferquote der KI ohne Tabelle heben, auf Stellungen, die er nicht gesehen hat. Erst dann ein Pilot. |

Zur Einordnung steht im Nachtrag, welchen Gewinn s × n × q für den Zuwachs
von T4 (2 bis 3 Prozentpunkte bei Rang 1 in der Kandidatenliste, nicht bei den
gespielten Zügen, aber als Größenordnung brauchbar) vorhersagt, neben der
Messung M1 (−3,7 [−10,7; +3,3]). Aus E100 gegen D100 ergibt sich, welcher
Anteil des Gewinns auf Züge ab Zug 161 entfällt.

## 5. Erkennbare Größe und Erwartung

Mit 120 Paaren je Arm liegt der Standardfehler der Paardifferenz bei 6 bis 8
Punkten, die Intervalle bei ±12 bis ±16. Große Effekte (D100, E100) sind damit
klar zu sehen; bei D25 reicht es nur für einen Bereich. Es ist eine Schätzung,
kein Test einer Hypothese.

**Trockenlauf vor dieser Festlegung.** Je Arm zwei Partien (die Partien 1 und
2 von Seed 206; sie gehören zur Messung und zählen mit) liefen zur Probe der
Werkzeuge. Sie zeigten: Das Orakel greift (D100 gewann beide mit +119,5 und
+193,5, Arm A verlor sie mit −0,5 und −2,5), Partien mit Orakel ab Zug 81
enden früher (150 und 156 Züge statt 278 und 284, weil das Orakel passt), und
die Wirkung wächst stärker als linear mit der Dosis. Danach wurde die
Messlatte auf die Steigung bei kleinen Dosen und die Zügezahl von Arm A
umgestellt; Arme, Endpunkt und die Lesart der Differenz D100 − A blieben. Die
Erwartung unten ist vor dem Trockenlauf geschrieben und bleibt stehen; für
D100 widersprechen ihr die zwei Partien schon.

**Erwartung vorab, ohne Wirkung auf die Lesart:** D100 − A etwa +40 (zwischen
+20 und +70), E100 − A etwa +15 (zwischen +5 und +35), s etwa 0,6 Punkte je
geändertem Zug (zwischen 0,2 und 1,0), der Zug der KI gleich dem Orakelzug in
20 bis 30 % der Fälle (wie die Trefferquote bei Rang 1), q für +5 Punkte etwa
10 % (zwischen 6 % und 30 %). Daraus folgt für T4 ein Gewinn von rund +1 Punkt,
unter der Nachweisgrenze: kein Widerspruch zu M1. Das steht hier, damit sich
die Erwartung nicht nachträglich anpassen lässt.

## 6. Grenzen

- Das Orakel ersetzt nicht nur Randzüge, sondern auch Taktik (Lebensrettung,
  Angriff). D100 ist die Obergrenze für bessere Züge ab Zug 81 insgesamt, nicht
  für Randspiel allein; E100 grenzt auf Züge ab Zug 161 ein.
- Die Dosis-Wirkung muss nicht linear sein (ein Orakelzug kann mehr wert sein,
  wenn die folgenden auch gut sind). Die Steigung durch den Ursprung ist eine
  Näherung für kleine Dosen; D25, D50 und D100 zeigen, ob sie trägt.
- Das Orakel passt früher als die KI, die Partien mit Orakel werden kürzer
  (§5). Das ist Teil der Wirkung und wird nicht herausgerechnet; die Zahl der
  Züge je Partie steht im Bericht.
- Lehrer, Schiedsrichter und Gegner sind dasselbe Programm (GNU Go): Das
  Orakel (Stufe 10) spielt gegen Stufe 1, und die Zählung ist die von GNU Go.
- Ein Seed, 120 Paare je Arm. GNU Go 3.8 kann an einzelnen Stellungen
  abstürzen; abgebrochene Partien fallen samt Partner heraus und werden
  genannt.
- Gemessen wird gegen GNU Go Stufe 1 mit neun Vorgabesteinen, nicht gegen
  Menschen und nicht ohne Vorgabe.

## 7. Ablauf

Der Workflow startet nur manuell, auf dem Merge-Commit von `main`, der dieses
Dokument enthält (Hausregel). Eingaben:

| Eingabe | Wert |
|---|---|
| `seed` | 206 |
| `kontrolle` | `docs/daten/endspiel-messung/lauf1/A.jsonl.gz` (Arm A der Messung M1) |

Jobs: `pruefen` (Eingaben), `spielen` (5 Arme × 8 Teile zu 15 Partien),
`ergebnis` (Bericht mit `auswertung/endspiel-pilot-bericht.js`,
`orakel-bericht.js` und `messung-zusatz.js`, Rohdaten gepackt). Die Ergebnisse
legt der Workflow auf den Branch `ergebnisse/endspiel-orakel-lauf<N>` unter
`docs/daten/endspiel-orakel/lauf<N>/`, dazu als Artefakt (90 Tage). Nur der
letzte Job darf ins Repo schreiben, und nur auf einen neuen Branch. Ein
Orakel-Zug kostet GNU Go Stufe 10 Rechenzeit; erwartet werden 20 bis 40
Minuten für den ganzen Lauf.

## 8. Nachtrag: Ergebnis des Orakel-Tests (19.10.2026)

Gelaufen in GitHub Actions, Lauf #1 des Workflows `endspiel-orakel.yml`
([Run 39305055109](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/39305055109)),
auf dem Merge-Commit `324e0a4` von `main`, mit den Eingaben aus §7, in 19
Minuten (18:44 bis 19:03 UTC). Alle 600 Partien ausgespielt (120 je Arm), keine
abgebrochen, kein Neustart von GNU Go. Die Ergebnisse legte der Workflow auf den
Branch `ergebnisse/endspiel-orakel-lauf1`; sie stehen hier unter
[`daten/endspiel-orakel/lauf1/`](daten/endspiel-orakel/lauf1/): der Bericht, die
Partien aller fünf Arme und die Zusatzzahlen.

**Kontrollen.** Arm A spielt dieselben Partien wie Arm A der Messung M1: 120 von
120 mit gleichem Endstand und gleicher Zugzahl. Jeder Orakel-Arm spielt in jeder
Partie bis zur Schwelle dieselben Züge wie A (120 von 120; mindestens die ersten
81 Züge bei D25, D50 und D100, die ersten 161 bei E100). Deshalb liegt E100 nach
Zug 120 exakt gleichauf mit A (+0,0), wie es sein muss: Das Orakel greift nur
dort ein, wo es soll.

**Endpunkt** (120 Paare je Arm, Endstand nach GNU Gos Zählung, gepaart nach
Partienummer, Seed 206):

| Arm | Orakel | Endstand Ø | Siege | Züge je Partie |
|---|---|---:|---:|---:|
| A | keins | +22,9 | 79 | 238,8 |
| D25 | ab Zug 81, 25 % | +44,3 | 100 | 207,7 |
| D50 | ab Zug 81, 50 % | +55,7 | 107 | 197,2 |
| D100 | ab Zug 81, alle | +101,7 | 120 | 171,8 |
| E100 | ab Zug 161, alle | +57,4 | 109 | 193,2 |

| Vergleich | Differenz | 95 % | p | Hälfte 1 / 2 | Siege | nach Zug 120 |
|---|---:|---|---:|---|---|---:|
| **D25 − A** | **+21,3** | [+10,6; +32,1] | 0,0001 | +27,6 / +15,1 | 100 gegen 79 | +1,4 |
| **D50 − A** | **+32,8** | [+23,3; +42,3] | 3,9 · 10⁻¹⁰ | +31,0 / +34,6 | 107 gegen 79 | +6,1 |
| **D100 − A** | **+78,7** | [+68,5; +88,9] | 5,6 · 10⁻³⁰ | +78,9 / +78,5 | 120 gegen 79 | +22,2 |
| **E100 − A** | **+34,4** | [+26,0; +42,8] | 5,9 · 10⁻¹³ | +35,9 / +32,9 | 109 gegen 79 | +0,0 |

**Was das Orakel getan hat** (Mittel je Partie):

| Arm | Gelegenheiten | ersetzt | davon geändert | Pässe des Orakels | Zug der KI = Orakelzug | Punkte je geändertem Zug |
|---|---:|---:|---:|---:|---:|---|
| D25 | 63,6 | 15,6 | 11,7 | 0,9 | 25,1 % | +1,83 [+0,91; +2,75] |
| D50 | 58,4 | 28,8 | 21,4 | 1,0 | 25,6 % | +1,53 [+1,08; +1,97] |
| D100 | 45,6 | 45,6 | 37,7 | 1,1 | 17,5 % | +2,09 [+1,82; +2,36] |
| E100 | 16,4 | 16,4 | 13,3 | 1,0 | 18,6 % | +2,58 [+1,95; +3,21] |

Die Gelegenheiten nehmen mit der Dosis ab, weil die Partien mit Orakel früher
enden (die Spalte zählt die Züge der KI ab der Schwelle in den Partien des
jeweiligen Arms).

**Lesart nach §4: D100 − A = +78,7.** Die Untergrenze des Intervalls (+68,5)
liegt weit über +10. **Es steckt etwas drin**, und es gilt die Messlatte aus §4:

- Steigung über D25 und D50 (Regression durch den Ursprung): **s = +1,60** Punkte
  je geändertem Zug. In allen vier Armen liegt der Wert zwischen +1,5 und +2,6
  und steigt mit der Dosis und mit dem späteren Beginn eher an; die lineare
  Näherung trägt also grob und unterschätzt bei großer Dosis.
- n = 79,1 Züge der KI ab Zug 81 in einer Partie von Arm A.
- **q für +5 Punkte = 4,0 %:** Ein Lerner, der in 4 von 100 Zügen der KI ab Zug
  81 den Zug der KI durch den Orakelzug ersetzt, wo beide verschieden sind,
  gewinnt rund 5 Punkte. Ohne Tabelle trifft die KI den Orakelzug in rund 25 %
  ihrer Züge (D25: 25,1 %, D50: 25,6 %). Das Tor aus §4 heißt also: Die
  gespielten Züge eines Lerners müssen den Orakelzug in rund 29 statt 25 % der
  Fälle treffen, gemessen auf Stellungen, die er nicht gesehen hat.

**Einordnung für T4 (§4).** T4 trifft GNU Gos Zug auf neuen Stellungen um 2 bis 3
Prozentpunkte öfter (Rang 1). Mit s × n × q: 1,60 × 79,1 × 0,02 bis 0,03 =
**+2,5 bis +3,8 Punkte.** Die Messung M1 ergab −3,7 [−10,7; +3,3], mit den drei
Piloten der Datenaggregation (420 Paare) −2,2 [−7,8; +3,4]. Die Vorhersage liegt
am oberen Rand dieser Intervalle, die Punktschätzer knapp zwei Standardfehler
darunter: weder Widerspruch noch Bestätigung. Sicher ist nur, dass ein Zuwachs
von 2 bis 3 Prozentpunkten rechnerisch rund 3 Punkte wert ist und dass keine der
Messungen das erkennen konnte (Intervallbreite ±7). Das passt dazu, dass M1
nichts zeigte. Die Vorhersage ist eine Größenordnung: Sie nimmt den Rang-1-Zuwachs
statt der Trefferquote der gespielten Züge und rechnet linear.

**Wo die Punkte liegen.** Ab Zug 161 allein (E100) holt das Orakel +34,4, das
sind 44 % des Gewinns von D100 bei 36 % der Gelegenheiten (16,4 von 45,6). Je
geändertem Zug sind die späten Züge mehr wert (+2,58 gegen +2,09). D100 − E100,
gepaart: +44,3 [+36,9; +51,7]; die Züge zwischen 81 und 160 tragen also rund 44
Punkte bei, nicht additiv, weil die Partien mit Orakel früher enden. E100 mit
13,3 geänderten Zügen liegt gleichauf mit D50 mit 21,4: E100 − D50 = +1,6
[−6,4; +9,6] (nachträglicher Vergleich, ohne Anspruch).

**Gegen die Erwartung aus §5.** Die Erwartung stand vor dem Lauf und bleibt
stehen. Alle Abweichungen gehen in dieselbe Richtung: Ein geänderter Zug ist
mehr wert als erwartet (1,6 statt 0,6 Punkte).

| Größe | Erwartung vorab | gemessen | Lage |
|---|---|---|---|
| D100 − A | +40 (+20 bis +70) | +78,7 [+68,5; +88,9] | über dem Bereich; die zwei Partien des Trockenlaufs hatten es angedeutet |
| E100 − A | +15 (+5 bis +35) | +34,4 [+26,0; +42,8] | am oberen Rand |
| s | 0,6 (0,2 bis 1,0) | +1,60 | über dem Bereich |
| Zug der KI = Orakelzug | 20 bis 30 % | 25,1 % und 25,6 % (D25, D50); 17,5 % und 18,6 % (D100, E100) | in den kleinen Dosen im Bereich, bei D100 und E100 darunter |
| q für +5 Punkte | rund 10 % (6 bis 30 %) | 4,0 % | unter dem Bereich |
| Gewinn für T4 | rund +1 | +2,5 bis +3,8 | höher, aber unter der Nachweisgrenze von M1 |

Dass die KI den Orakelzug auf den Stellungen, die das Orakel selbst erreicht
(D100, E100), seltener trifft als auf ihren eigenen (rund 25 %), passt zum
Befund der Datenaggregation (Treffer hängen von der Verteilung der Stellungen
ab). Für die Messlatte zählt die Quote auf den eigenen Stellungen der KI.

**Sekundär, ohne Anspruch**

- Median der Differenz: D25 +26,0, D50 +28,0, D100 +86,0, E100 +21,0, jeweils
  in der Größenordnung des Mittels. Vorzeichentest (exakt, zweiseitig): D25
  besser in 80 Paaren, schlechter in 40 (p = 0,0003); D50 91 gegen 28, 1 gleich;
  D100 117 gegen 3; E100 81 gegen 12, 27 gleich (alle p < 0,0001 außer D25).
- Keine Partie abgebrochen, in jedem Arm im Mittel rund ein Pass des Orakels je
  Partie (0,9 bis 1,1).

**Zusatz, nicht vorab festgelegt: Hängt der Gewinn am früheren Passen?** §6 nennt
als Grenze, dass das Orakel früher passt als die KI und die Partien kürzer
werden. Ohne Orakel spielt die KI nach dem ersten Pass der Partie im Mittel noch
28,9 Züge weiter, mit Orakel 8,2 (D25), 4,0 (D50), 2,5 (D100) und 3,3 (E100). Läge
der Gewinn darin, dass das Orakel rechtzeitig aufhört? Dagegen spricht die
Zählung der Stellung unmittelbar nach dem ersten Pass (GNU Gos `final_score`
wie im Duell, `auswertung/orakel-nachspiel.js`, Ausgabe in
[`daten/endspiel-orakel/lauf1/nachspiel.txt`](daten/endspiel-orakel/lauf1/nachspiel.txt)):

| Arm | Endstand Ø | nach dem ersten Pass Ø | Ende − nach erstem Pass | Partien mit Änderung |
|---|---:|---:|---|---:|
| A | +22,9 | +21,8 | +1,15 (SE 1,06) | 9 |
| D25 | +44,3 | +43,6 | +0,70 (SE 1,18) | 9 |
| D50 | +55,7 | +56,6 | −0,85 (SE 0,85) | 1 |
| D100 | +101,7 | +101,4 | +0,22 (SE 0,31) | 2 |
| E100 | +57,4 | +57,4 | −0,03 (SE 0,03) | 1 |

Die Züge nach dem ersten Pass ändern den Endstand in höchstens 9 von 120 Partien
je Arm und im Mittel um nicht mehr als einen Punkt (in A +1,15, nicht
signifikant). Wäre die Partie beim ersten Pass zu Ende gewesen, kämen dieselben
Endstände heraus. Der Gewinn des Orakels entsteht also in den Zügen davor, nicht
im Zeitpunkt des Passens. Das Nachspielen ergibt in allen 600 Partien den
aufgezeichneten Endstand.

**Was der Test sagt.** Es steckt viel in besseren Zügen ab Zug 81. Wo GNU Go
Stufe 10 für die KI zieht, gewinnt sie alle 120 Partien mit im Mittel +101,7
statt 79 von 120 mit +22,9. Schon jeder vierte Zug (D25) bringt +21,3, und ein
geänderter Zug ist im Mittel rund 1,6 Punkte wert. Die Messlatte für einen
stärkeren Lerner liegt dadurch niedrig: 4,0 Prozentpunkte mehr Treffer bei den
gespielten Zügen für +5 Punkte.

**Was er nicht sagt.**

- Nicht, dass sich dieser Gewinn mit gelernten Zügen holen lässt. Das Orakel ist
  GNU Go Stufe 10 und ersetzt auch Taktik (§6). Ein Lerner ändert andere Züge
  als das Orakel (die, bei denen er sich sicher ist), ändert auch falsch, und der
  mittlere Wert eines Orakelzugs gilt für ihn nur grob. s × n × q ist eine
  Größenordnung, kein Versprechen.
- Nichts über Züge vor Zug 81; dafür wäre ein Orakel-Test ab Zug 1 nötig (§4
  sieht ihn nur für den Fall unter +10 vor).
- Ein Seed, ein Gegner (GNU Go Stufe 1, neun Vorgabesteine), und der
  Schiedsrichter ist GNU Go (§6).

**Folge nach §4.** Die Engine bleibt unverändert, `index.html` ist nicht
berührt. Nach der Lesart wäre der nächste Schritt ein stärkerer Lerner als die
Tabelle, zuerst offline und ohne Partien, mit dem Tor q = 4,0 Prozentpunkte
(Trefferquote der gespielten Züge auf ungesehenen Stellungen). Er ist nicht
begonnen; ob und mit welchem Lerner, entscheidet Hazeberry.
