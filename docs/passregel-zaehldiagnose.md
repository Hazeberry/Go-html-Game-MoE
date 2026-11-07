# Zähldiagnose: Warum weicht die Fläche aus der Tot-Liste von `final_score` ab?

Vorabfestlegung, 06.11.2026. Status: **vorbereitet, nicht gestartet, kein Go.** Der Lauf braucht ein eigenes ausdrückliches
Go von Hazeberry. Das Spiel bleibt unverändert. Anlass: Probe 1 des Passregel-Vergleichs
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
- Die Gleichheitsprüfung der Fläche in `passregel-vergleich.md` §9 Nr. 5 bleibt unverändert, bis Hazeberry anhand dieses
  Befunds etwas anderes entscheidet. Dieser Lauf ändert keine Kontrollregel.
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
