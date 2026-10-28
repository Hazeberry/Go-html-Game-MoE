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

## 4. Nachtrag: Lauf #1 der Probe (28.10.2026)

Gelaufen in GitHub Actions, Lauf #1 von `fuego-probe.yml`
([Run 40664655973](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40664655973)),
auf dem Merge-Commit `3277739` von `main`, in rund 2 Minuten.

| Quelle | C++14 | C++17 |
|---|---|---|
| SVN r2038 (2019) | **gebaut** | **gebaut** |
| Version 1.1 (2011) | Fehler beim Bauen | Fehler beim Bauen |

- **SVN r2038 baut** mit dem Compiler und dem Boost von Ubuntu 24.04, ohne
  Änderung am Code von Fuego. Der Bau dauert unter 2 Minuten.
- **Version 1.1 baut nicht:** `GtpEngine.cpp` bricht mit „reference to ‘mutex’
  is ambiguous“ ab. Der alte Code holt `std` und `boost` zugleich in den
  Namensraum, und das heutige Boost kennt ein eigenes `mutex`. Da SVN läuft,
  wird 1.1 nicht weiter verfolgt. Der Workflow baut nur noch SVN; das Skript
  kennt 1.1 weiter, zum Nachvollziehen.
- **Die Probe selbst lief nicht.** Das lag an einem Fehler in `bauen.sh`: Das
  Skript wechselte ins Bauverzeichnis, bevor es den Zielordner anlegte, und
  legte das Programm deshalb im Bauverzeichnis ab statt im Arbeitsordner. Die
  Probe fand dann kein Programm. Behoben: Der Zielordner wird jetzt angelegt
  und absolut gemacht, bevor das Skript wechselt. Ein Test prüft das.

Die Probe wird mit dem behobenen Skript wiederholt. Ihr Ergebnis kommt als
weiterer Nachtrag.

## 5. Nachtrag: Lauf #2 der Probe (28.10.2026)

Lauf #2 ([Run 40667269651](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40667269651),
Merge-Commit `3b8d44f`) hat Fuego wieder in beiden Fassungen gebaut, und das
Programm lag jetzt am richtigen Ort. Fuego hat aber auf keinen GTP-Befehl
geantwortet. Der Grund: Fuego liest seine Optionen mit `boost::program_options`
und kennt lange Optionen nur mit zwei Strichen (`--srand`, `--nobook`,
`--quiet`). Die Probe übergab sie mit einem Strich. Fuego zeigte darauf nur
seine Hilfe und beendete sich (`FuegoMain.cpp`, `Help` mit `exit(0)`).
Danach brach die Probe ohne Meldung ab, weil ein leeres Suchergebnis unter
`set -o pipefail` als Fehler zählt.

Behoben: Die Probe übergibt die Optionen mit zwei Strichen. Antwortet Fuego
nicht, bricht sie mit Meldung und dem Anfang der Fehlerausgabe ab. Zwei Tests
prüfen beides. Die Probe wird ein drittes Mal gestartet.

## 6. Nachtrag: Lauf #3 der Probe (28.10.2026)

Lauf #3 ([Run 40669268951](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40669268951),
Merge-Commit `cc8b1f8`) ist durchgelaufen, mit C++14 und mit C++17.

- **Befehle:** Fuego („Fuego 1.1.SVN“) kennt alle GTP-Befehle, die das
  Duell-Skript braucht: `fixed_handicap`, `play`, `genmove`, `final_score`,
  `list_stones`, `final_status_list` und die Parameter-Befehle.
- **Einstellungen:** Alle sechs werden angenommen (ein Thread, feste Spielzahl,
  keine Uhr, kein Weiterverwenden des Baums, kein Nachdenken in der Zeit des
  Gegners, keine Aufgabe).
- **Zeit je Zug** (19×19, sechs Vorgabesteine, 20 Züge, ein Thread, Rechner von
  GitHub Actions):

| Spiele je Zug | C++14 | C++17 |
|---:|---:|---:|
| 1 000 | 0,53 s | 0,80 s |
| 3 000 | 1,29 s | 1,86 s |
| 10 000 | 3,65 s | 4,77 s |

  `final_score` nach 20 Zügen antwortet meist (`B+5.5`, `B+7.5`), manchmal mit
  „cannot score“. Für die Messungen zählt ohnehin GNU Go (§3).
- **Reproduzierbarkeit: nein.** Zweimal Seed 11 gab verschiedene Züge, ebenso
  dieselbe Partie in beiden Fassungen.

**Ursache, aus dem Quelltext.** Fuego bricht die Suche nicht nur nach der Zahl
der Spiele ab, sondern prüft in Abständen, ob sich der beste Zug noch ändern
kann (`SgUctSearch::CheckAbortSearch`). Wie oft es prüft, passt es an die
gemessene Zeit an (`UpdateCheckTimeInterval`). Damit hängt der Abbruch von der
Rechnergeschwindigkeit ab. Fuego hat dafür den GTP-Befehl `deterministic_mode`.
Er hält den Prüfabstand fest (1 500 Spiele), legt einen Thread, keine Uhr und
kein Weiterverwenden des Baums fest und sperrt diese Parameter. Er setzt aber
auch den Seed auf 1. Deshalb muss danach `set_random_seed` folgen.

**Nächster Lauf.** Die Probe stellt jetzt `deterministic_mode` und danach
`set_random_seed` ein. Sie prüft ohne und mit dem Befehl, je bei 1 000 und 3 000
Spielen, ob zweimal derselbe Seed dieselben Züge gibt, ob ein anderer Seed
andere Züge gibt und ab welchem Zug zwei Läufe auseinandergehen. Die Zeit je
Zug misst sie mit `deterministic_mode`, so wie später gespielt wird.

## 7. Nachtrag: Lauf #4 der Probe, Fuego ist reproduzierbar (28.10.2026)

Lauf #4 ([Run 40671405713](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/40671405713),
Merge-Commit `13eda05`) ist mit C++14 und C++17 durchgelaufen.

**Gleicher Seed, gleiche Züge?** (40 Züge, sechs Vorgabesteine)

| `deterministic_mode` | Spiele je Zug | Seed 11 zweimal | Seed 11 gegen 12 | erster Unterschied |
|---:|---:|---|---|---:|
| aus | 1 000 | verschieden | verschieden | Zug 7 (C++14), 4 (C++17) |
| aus | 3 000 | verschieden | verschieden | Zug 2 |
| **an** | 1 000 | **gleich** | verschieden | – |
| **an** | 3 000 | **gleich** | verschieden | – |

Mit `deterministic_mode` und danach `set_random_seed` ist Fuego
reproduzierbar: Derselbe Seed gibt dieselben Züge, ein anderer Seed andere.
Beide Fassungen ziehen dabei dieselben Züge (letzter Zug F3, H4 und K11 in
beiden). Ohne den Befehl gehen zwei Läufe schon nach 2 bis 7 Zügen
auseinander. Damit sind gepaarte Messungen gegen Fuego möglich wie gegen GNU
Go.

**Zeit je Zug** mit `deterministic_mode` (20 Züge, ein Thread, Rechner von
GitHub Actions):

| Spiele je Zug | C++14 | C++17 |
|---:|---:|---:|
| 1 000 | 0,77 s | 0,97 s |
| 3 000 | 1,88 s | 2,35 s |
| 10 000 | 4,20 s | 5,21 s |

Die Fassung mit C++14 ist rund 20 % schneller und wird künftig verwendet.

**Was das für die Messungen heißt, ohne Anspruch.** Eine Partie dauert gegen
GNU Go Stufe 1 rund 270 bis 300 Züge, die Hälfte davon zieht der Gegner. Mit
1 000 Spielen je Zug braucht Fuego dann rund 2 Minuten je Partie, mit 3 000
rund 5 Minuten, dazu die Zeit unserer KI. Ein Teil zu 15 Partien kostet
allein für Fuegos Züge also rund 30 oder 70 Minuten. Welche Spielzahl die KI
fordert, ohne sie zu überfahren, klärt erst der Prüfstand gegen Fuego (§3,
Schritt 2).

**Die Probe ist damit abgeschlossen.** Als Nächstes kommt Schritt 1 aus §3:
Fuego als Gegner im Duell-Skript, GNU Go zählt als Schiedsrichter.
