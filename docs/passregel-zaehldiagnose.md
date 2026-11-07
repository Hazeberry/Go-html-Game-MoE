# Zähldiagnose: Warum weicht die Fläche aus der Tot-Liste von `final_score` ab?

Vorabfestlegung, 06.11.2026. Status: **Lauf 42317041690 am 07.11.2026 durchgeführt (Go von Hazeberry), gültig; Ergebnis in §8.**
Das Spiel bleibt unverändert. Anlass: Probe 1 des Passregel-Vergleichs
([`passregel-vergleich.md`](passregel-vergleich.md) §13) wurde ungültig, unter anderem weil bei **einer** Stellung
die Fläche aus GNU Gos Tot-Liste ungleich `final_score` war. Nach der Durchsicht von Hazeberry liegen die Werte drei Punkte
auseinander (`final_score` B+139,5 gegenüber +136,5 aus der Tot-Liste; von mir nicht nachgeprüft).

## 1. Frage und Abgrenzung

**Frage:** Wo genau entsteht die Abweichung an dieser Stellung, und lässt sie sich reproduzieren?

**Nur Einspielen und Zählen.** Keine Fortsetzung, keine Engine-Züge, keine Wiederholung der Probe, keine Auswertung der
Passregel und keine Wirkungszahl. Die Diagnose klärt eine Zählfrage an einer Stellung; sie sagt nichts über die Regel.

**Einheit:** Gruppe „alte PWA“, Datei `pwa-vergleich/lauf1/m1.jsonl.gz`, Partie 206, **Index 341**. „Zug 341“ ist hier der
Index 341 der Zugliste (0-basiert), also der 342. Zug der Aufzeichnung. Die Zugfolge enthält Index 0 bis 341, so wie Probe 1
sie eingespielt hat. Die Stellung ist die erste Auslösung der Stufe-A-Prüfung dieser Partie; das prüft das Werkzeug nach
(§4).

## 2. Was erfasst wird

1. **Zugfolge:** die vollständige archivierte Zugfolge bis zum Index (342 Einträge), als Liste und mit SHA-256; dazu die
   Länge der ganzen Archivpartie und deren SHA-256. Die Farben stammen aus der Aufzeichnung und werden gegen die Farben
   der Einheit geprüft.
2. **GNU-Go-Einstellungen und Seed wie in Probe 1:** Die Argumente kommen aus derselben Funktion (`gnugoArgumente`) wie
   im Fortsetzungswerkzeug: `--mode gtp --level 1 --chinese-rules --komi 7.5 --seed S --never-resign`. Der Seed wird mit
   derselben Funktion und denselben Eingaben abgeleitet (`fortsetzungsSeed(Basis 1, Gruppe, Dateiname, Nr., Index)`).
   Beides ist durch Tests im Quelltext gebunden.
3. **Version:** `gnugo --version`, GTP `name` und `version` (roh), Paketversion (`dpkg-query`), `apt-cache policy`,
   Runner-Image (`ImageVersion`, `ImageOS`) und Node-Version. **Grenze:** Probe 1 hat die GNU-Go-Version nicht
   protokolliert. „Dieselbe Version wie in Probe 1“ lässt sich deshalb nicht beweisen, nur „derselbe Runner-Typ
   `ubuntu-24.04` und dieselbe Paketquelle“. Eine Versionsabhängigkeit der Abweichung bleibt möglich.
4. **Befehlsfolge und Antworten:** jeder GTP-Befehl in der gesendeten Reihenfolge und die **unveränderte Rohantwort**
   (nichts wird getrimmt oder umgeschrieben), als JSON und als lesbarer Text (`gtp-protokoll.txt`).
5. **Abfragen am Ende:** `list_stones` (beide Farben), `captures` (beide Farben), `final_score`,
   `final_status_list` mit `alive`, `dead`, `seki`, `white_territory`, `black_territory` und `dame`, dazu `showboard`.
6. **Getrennte Zählbestandteile aus unserer Zählung:** Schwarz Steine, Schwarz Gebiet, Weiß Steine, Weiß Gebiet,
   neutrale Punkte, tote Steine je Farbe, Gefangene (bisher und mit Tot-Liste), Fläche und Territory; die neutralen
   Regionen mit Größe, Randfarben und Koordinaten.
7. **Punkt für Punkt:** GNU Gos Klasse jedes Punktes (lebend, tot, Seki, Schwarz-Gebiet, Weiß-Gebiet, Dame, nicht
   klassifiziert) gegen unseren Besitzer (Schwarz, Weiß, neutral). Das Ergebnis ist eine Kreuztabelle und die Liste der
   Punkte, an denen GNU Gos Gebiets- oder Dame-Klasse vom Besitzer abweicht, dazu Seki-Punkte und nicht klassifizierte
   Punkte. Zwei Nachbildungen von `final_score` aus GNU Gos Listen (lebende Steine plus Gebiet, mit und ohne Seki-Steine)
   sind **Hinweise**; sie nehmen keine Regeln von GNU Go an und gelten nicht als Erklärung.
8. **Ausgabe im Log:** der ganze Bericht (Kopf, Ergebnis, Zählbestandteile, tote Koordinaten, Punktabweichungen,
   Kreuztabelle, Brett), damit er ohne Artefakt-Download lesbar ist. Die Rohdaten stehen im Artefakt `zaehldiagnose`.

## 3. Ablauf

Der gesamte GTP-Ablauf (Kopf, alle Züge, alle Abfragen) läuft **zweimal** in frischen GNU-Go-Prozessen mit demselben Seed.
Die Rohantworten beider Läufe müssen Zeichen für Zeichen identisch sein. Zusätzlich läuft die `captures`-Kalibrierung
(wie in der Fortsetzung) in einem eigenen Prozess. Der Lauf endet mit Code 1, wenn die Diagnose ungültig ist.

## 4. Gültigkeit

Nur zwei Zustände, gültig oder ungültig. Ungültig heißt „kein Urteil“ mit Grund:

1. Datensatz brauchbar (nicht abgebrochen, ohne Vorgabe, Komi 7,5), Index innerhalb der Zugfolge.
2. **Einheit stimmt:** Die Stufe-A-Prüfung (Schalter 1, in diesem Prozess) löst in dieser Partie bei Fläche oder Territory
   am Index aus; die Voraussetzung „Gegner hat unmittelbar davor gepasst“ ist erfüllt.
3. **Farben:** die Farben der Aufzeichnung sind gleich den Farben der Einheit.
4. **Jeder verlangte GTP-Befehl wird erfolgreich beantwortet:** Kopfbefehle, jeder Zug und jede Abfrage am Ende müssen in
   beiden Läufen mit „=“ beantwortet werden. Bei der ersten Fehlerantwort („?“) endet der Lauf als Fehler und es wird nichts
   weiter gesendet. Eine Fehlerantwort wird nie als Nutzdaten gelesen; zwei identische Fehlerantworten bestehen die
   Wiederholbarkeit nicht.
5. **Wiederholbarkeit:** die Rohantworten beider Läufe sind identisch.
6. **Brett und Gefangene:** die Steinlisten der Engine und von GNU Go sind gleich; die Gefangenen stimmen mit der
   kalibrierten `captures`-Konvention überein (nie beide Zuordnungen).
7. **Antworten sind gültig:** `final_score` ist lesbar und endlich; jedes Wort in einer Punktliste ist eine gültige
   Brettkoordinate (kein `pass`, nichts außerhalb des Bretts); `captures` sind nicht negative ganze Zahlen (eine leere
   Antwort ist keine 0).

**Die Reproduktion der Abweichung ist ein Ergebnis, kein Gültigkeitskriterium:** „Abweichung reproduziert“ oder
„nicht reproduziert“ sind beide gültige Befunde.

## 5. Befund und Grenzen

- Berichtet werden Zahlen und Koordinaten. Eine Ursache wird nur als **Hypothese** genannt, bis sie an der Stellung
  gezeigt ist. Ein einzelner Fall begründet keine allgemeine Aussage über GNU Go.
- Der Lauf selbst ändert keine Kontrollregel. Die Änderung der Kontrollregel in `passregel-vergleich.md` §9 Nr. 5 ist eine
  eigene, begründete Festlegung nach diesem Befund (§8).
- Wird die Abweichung nicht reproduziert, ist offen, ob die Version, der Seed oder etwas in Probe 1 (etwa die Stellung
  nach der Fortsetzung statt davor) sie verursacht hat; das wird dann als offen berichtet, nicht erklärt.
- Ob die Abweichung am Anfang oder am Ende einer Fortsetzung auftrat, hat Probe 1 nicht festgehalten (das Feld `wo`
  gab es noch nicht). Diese Diagnose zählt nur die **Ausgangsstellung** (Index 341). Tritt dort keine Abweichung auf,
  könnte sie in der Endstellung der Fortsetzung gelegen haben; das wäre ein eigener Schritt.

## 6. Freigabe

Der Lauf (`passregel-zaehldiagnose.yml`, ohne Eingaben, einmalig) braucht ein eigenes Go für genau diese Diagnose. Danach
folgt ein Bericht mit dem Befund, ohne Auswirkung auf Probe 2 und Hauptlauf; deren Freigabe bleibt getrennt.

## 7. Umsetzung

- `auswertung/endspiel/passregel-zaehldiagnose.js` (Werkzeug), `.github/workflows/passregel-zaehldiagnose.yml`,
  `tests/passregel-zaehldiagnose.js` (Attrappe als ausführbares Programm, Mutationsprobe bestanden).
- Gemeinsame Funktionen: `L.zaehlbestandteile`, `L.fortsetzungsSeed`, `F.gnugoArgumente`, `F.kalibriereCaptures`.
- Nicht lokal geprüft: der echte Ablauf mit GNU Go.

## 8. Nachtrag: Ergebnis des Laufs 42317041690 (07.11.2026)

Quelle: Job-Log (Job 128232101736) am Merge-Commit `358ca0951480d9b46e0b7e3f4e4b93b86487bdd9`; der Bericht steht unverändert in
[`docs/daten/passregel-zaehldiagnose/lauf1/zaehldiagnose.md`](daten/passregel-zaehldiagnose/lauf1/zaehldiagnose.md). **Nicht gesichert:**
das Artefakt `zaehldiagnose` (ID 13551695622) mit der vollständigen Zugfolge, allen Listen und dem GTP-Protokoll mit den
unveränderten Antworten; es war aus der Arbeitsumgebung nicht ladbar.

**Gemessen** (Fläche, Ausgangsstellung Index 341, KI Schwarz):
- Die Diagnose ist gültig; zwei Läufe mit demselben Seed (432182360) liefern in allen 360 Befehlen identische Rohantworten.
  GNU Go 3.8, Paket `gnugo 3.8-11build2`, Runner-Image 20261101.360.1. Die Version von Probe 1 ist nicht protokolliert, „dieselbe
  Version“ lässt sich nicht beweisen.
- `final_score` roh `= B+139.5`; Fläche aus der Tot-Liste 136,5; Unterschied −3. Die Abweichung ist an der Ausgangsstellung
  **reproduziert**.
- Unsere Zählung: Schwarz 150 Steine + 100 Gebiet = 250, Weiß 70 + 36 = 106, 5 neutrale Punkte (E19 F19 G19 H19 J19, Rand Schwarz und
  Weiß), tote Steine Schwarz 1 und Weiß 19, Gefangene 74/20 (gleich GNU Gos `captures`).
- GNU Gos Listen: alive 220, dead 20, seki 0, white_territory 35, black_territory 84, dame 2 (E19, F19).
- **Punkte mit abweichender Zuordnung: G19, H19, J19** (GNU Go: Schwarz-Gebiet; unsere Zählung: neutral). Bei allen übrigen Punkten, für die GNU Go
  ein Gebiet oder Dame nennt (81 + 35 + 2), stimmt die Zuordnung überein; lebende Steine (150 + 70) sind gleich, die Punkte der 20
  toten Steine nennt GNU Go nicht als Gebiet (Kreuztabelle im Bericht).
- Nachgerechnet aus den Zahlen des Berichts (Variante 3 im Werkzeug, ein Hinweis ohne Annahme über GNU Gos Regeln): Schwarz 150 lebende
  Steine + 84 Gebiet + 19 Punkte toter weißer Steine = 253, Weiß 70 + 35 + 1 Punkt toter schwarzer Steine = 106, 253 − 106 − 7,5 =
  139,5. Die Differenz von 3 entspricht damit genau den drei Punkten.

**Am Code geprüft, keine Hypothese:** Die App zählt nach derselben Regel wie unsere Zählung. In `index.html` zählt `finalAreaScore`
(Zeile 5812) und `finalTerritoryScore` (Zeile 5835) eine zusammenhängende leere Region nur, wenn sie genau eine Randfarbe hat
(`borders.size === 1`). Der feste Testfall (`tests/stellungen/zaehldiagnose-pwa206-341.json`, Test in
`tests/passregel-zaehldiagnose.js`) schneidet beide Funktionen aus `index.html` und zeigt: Die App-Fläche dieser Stellung ist
250/106, Stand 136,5, gleich unserer Zählung und ungleich `final_score`.

**Eingeschränkt, was daraus folgt:**
- Der Befund erklärt die drei Punkte Differenz. Er beweist **keinen Fehler der App-Zählung**: beide Verfahren ordnen G19, H19 und J19
  unterschiedlich zu. **Warum GNU Go diese Zuordnung trifft, bleibt offen.**
- Gezeigt ist die Abweichung für **diese eine Stellung**. In Probe 1 meldete die Kontrolle unter 11 Einheiten diese eine
  Abweichung. Ob sie bei anderen Stellungen mit teilweise strittigen Regionen auftritt, ist nicht gezeigt; eine allgemeine Aussage
  („bei jeder solchen Region“) trägt dieser Befund nicht.
- Dass die Differenz schon an der Ausgangsstellung liegt, ist gezeigt; ob zusätzlich die Endstellung der Fortsetzung in Probe 1
  abwich, ist nicht untersucht.
- Die vollständigen Listen `black_territory` und `white_territory` sind nicht roh gesichert. Der feste Testfall leitet sie aus der
  Kreuztabelle des Laufs ab (81 + 3 bzw. 35 Punkte) und kennzeichnet das.

**Folge für die Kontrollregel:** `passregel-vergleich.md` §9 Nr. 5 ist begründet geändert (ab Probe 2): Die Gleichheit der
Flood-Fill-Fläche mit `final_score` wird als Vergleich zweier Zählverfahren berichtet und ist keine Pflicht mehr; Brett, Gefangene,
Tot-Liste, Komi und die Übereinstimmung mit dem App-Code bleiben Pflicht. Territory bleibt „App-Rechnung mit GNU-Go-Tot-Liste“, die
Fläche verwendet direkt `final_score`. Probe 1 bleibt ungültig.
