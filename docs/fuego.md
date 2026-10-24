# Fuego als zweiter Gegner

**Status: Plan und Probe, 24.10.2026.** Hier wird noch nichts entschieden und
nichts an der KI gemessen. Die Ergebnisse der Probe stehen als Nachtrag
darunter. Jede spätere Messung gegen Fuego bekommt eine eigene Vorabfestlegung.

---

## 1. Anlass

Alle Messungen der Spielstärke laufen gegen GNU Go. Auch Lehrer der Muster und
des Endspiel-Netzes ist GNU Go. Seit das Netz mitentscheidet, kann ein Gewinn
gegen GNU Go teils daher kommen, dass die KI GNU Gos Züge vorwegnimmt
([`netz-dosis.md`](netz-dosis.md) §6, [`netz-hoch.md`](netz-hoch.md) §6). Das
Selbstspiel prüft das nur gegen die eigene KI. Hazeberry hat am 24.10.2026
gewünscht, Fuego als zweiten Gegner einzubauen, damit die Engine nicht nur auf
GNU Go zugeschnitten ist.

Fuego (Universität Alberta, LGPL 3) ist eine Monte-Carlo-Baumsuche, also ganz
anders gebaut als GNU Go mit seinen Regeln und Mustern. Es spricht GTP wie GNU
Go. Es gibt kein Ubuntu-Paket. Fuego liegt nicht im Repo, sondern wird in GitHub
Actions von SourceForge geladen und gebaut, auf einem festen Stand.

## 2. Probe

[`fuego-probe.yml`](../.github/workflows/fuego-probe.yml) baut Fuego mit
[`auswertung/fuego/bauen.sh`](../auswertung/fuego/bauen.sh) aus zwei Quellen:
- SVN-Trunk r2038 vom 10.12.2019, der letzte Stand;
- Version 1.1 vom 13.03.2011, mit fester Prüfsumme.

Gebaut wird je mit C++14 und C++17, weil der alte Code mit heutigen Compilern
und Boost-Versionen brechen kann.
[`auswertung/fuego/probe.sh`](../auswertung/fuego/probe.sh) prüft dann:

1. ob Fuego die GTP-Befehle kennt, die das Duell-Skript braucht
   (`fixed_handicap`, `play`, `genmove`, `final_score`, `list_stones`);
2. ob die Einstellungen greifen: ein Thread, feste Zahl von Spielen je Zug,
   keine Uhr, kein Weiterverwenden des Baums, keine Aufgabe;
3. wie lange ein Zug bei 1 000, 3 000 und 10 000 Spielen braucht;
4. ob zwei Läufe mit demselben Seed (`-srand`) dieselben Züge ziehen.

Punkt 4 entscheidet, ob gepaarte Messungen gegen Fuego möglich sind wie gegen
GNU Go: Gleiche Partienummer heißt dort gleiche Bedingungen für beide Arme.

## 3. Plan danach

1. **Gegner im Duell-Skript.** `gnugo-duell.js` bekommt einen Schalter für den
   Gegner. Fuego zieht, GNU Go spielt jeden Zug mit und bleibt Schiedsrichter:
   Es zählt am Ende (`final_score`) und schätzt nach Zug 120 und 200. So sind
   die Endstände gegen Fuego und gegen GNU Go gleich gezählt.
2. **Prüfstand gegen Fuego.** Wie in [`teststaerke.md`](teststaerke.md) §8:
   Vorgabe und Spielzahl so wählen, dass die KI rund die Hälfte gewinnt. Die
   Regel dafür wird vorab festgelegt.
3. **Messungen.** Neue Eingriffe werden gegen beide Gegner gemessen. Was
   gilt, wenn die Gegner sich widersprechen, legt die erste Vorabfestlegung mit
   Fuego fest.
