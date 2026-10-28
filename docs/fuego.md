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

## 8. Nachtrag: Fuego als Gegner im Duell-Skript (28.10.2026)

Schritt 1 aus §3 ist gebaut: `gnugo-duell.js --gegner fuego`. Gemessen ist damit
noch nichts, und das Werkzeug hat noch keine Partie mit dem echten Fuego
gespielt. Das ist der Zweck des nächsten Schritts.

**Aufruf.**

```
node gnugo-duell.js --gegner fuego [--fuego fuego-bin/fuego] [--fuego-spiele 1000]
                    --vorgabe 6 --stufe 1 --schaetzung 60,120,200 ...
```

`--fuego` nennt das Programm (Standard `fuego-bin/fuego`, gebaut mit
`auswertung/fuego/bauen.sh svn gnu++14 fuego-bin`), `--fuego-spiele` die Spiele
je Zug (ganze Zahl von 1 bis 1 000 000, Standard 1 000).

**Was wer macht.**

| | GNU Go | Fuego |
|---|---|---|
| zieht für den Gegner | nein | **ja** (`genmove`) |
| bekommt die Züge der KI | ja (`play`) | ja (`play`) |
| bekommt Fuegos Züge | ja (`play`) | – |
| Vorgabesteine | setzt sie (`fixed_handicap`) | bekommt dieselben Punkte (`set_free_handicap`) |
| `estimate_score`, `final_score` | **ja, Schiedsrichter** | nein |
| Brett am Ende (`list_stones`) | verglichen | verglichen |

- **Zählung wie bisher.** Weil GNU Go zählt, sind die Endstände gegen Fuego und
  gegen GNU Go gleich gezählt. `--stufe` gilt dann für den Schiedsrichter, also
  weiter 1; die Stufe verändert seine Auszählung, deshalb wird sie nicht
  geändert, damit die Zahlen vergleichbar bleiben.
- **Fuego-Einstellungen**, in der Reihenfolge, die die Probe geprüft hat:
  `boardsize`, `clear_board`, `komi`, Vorgabesteine, dann `max_games`,
  `ponder 0`, `resign_threshold 0`, `deterministic_mode` und
  `set_random_seed` mit dem Seed der Partie (`--seed` · 100 000 + Partienummer).
  Ein neuer Prozess je Partie, `--srand` mit demselben Seed, `--nobook`,
  `--quiet`. **Alles andere sind Fuegos Voreinstellungen**, darunter
  `early_pass` (an) und `forced_opening_moves` (an; laut Fuego erzwingt es
  Eröffnungszüge in den Ecken auf großen Brettern, ob es bei sechs Vorgabesteinen
  noch greift, ist nicht geprüft). Wer
  Fuego härter oder weicher machen will, ändert das mit einer eigenen
  Vorabfestlegung.
- **Zurückweisung.** Weist GNU Go einen Zug ab (Fuego nennt einen Zug, den der
  Schiedsrichter nach seinen Regeln für illegal hält, etwa wegen des Ko, oder
  umgekehrt), zählt die Partie als abgebrochen und das Werkzeug läuft weiter.
  Die Auswertung nimmt abgebrochene Paare nicht mit und nennt ihre Zahl. Bei
  GNU Go als Gegner bleibt es beim alten Verhalten.
- **Datensatz.** Neu ist das Feld `gegner` {`name`, `spiele`,
  `schiedsrichterStufe`}, nur mit `--gegner fuego`. Ohne die Option sind die
  Datensätze unverändert, alte Läufe bleiben wiederholbar.
- **Falsche Angaben** (`--gegner` außer `gnugo` und `fuego`, `--fuego-spiele`
  keine ganze Zahl in 1 bis 1 000 000, `--fuego` zeigt auf keine Datei) lehnt
  das Werkzeug mit Fehlercode 2 ab.

**Tests** ([`tests/fuego-gegner.js`](../tests/fuego-gegner.js), 6 Tests ohne
GNU Go und ohne Fuego): [`tests/gtp-attrappe.js`](../tests/gtp-attrappe.js)
spielt beide Rollen über GTP, mit den Regeln aus `index.html`, und schreibt
jeden Befehl mit. Damit ist belegt, wer wem was schickt: die Einrichtung von
Fuego in der Reihenfolge oben, `genmove` nur an Fuego, `play` für jeden Zug an
den Schiedsrichter, gleiche Angaben gleiche Partie, ohne Option alles wie
bisher, abgewiesener Zug gleich abgebrochene Partie.

**Was die Tests nicht belegen.** Die Attrappe antwortet, wie Fuego laut Probe
antwortet; ob das echte Fuego in einer ganzen Partie so antwortet, zeigt erst
der nächste Lauf. Mögliche Stolpersteine sind Regelunterschiede zwischen Fuego
und GNU Go (Ko, Selbstmord), die zu abgebrochenen Partien führen, und ein
Fuego, das früh passt.

**Nächster Schritt:** ein kurzer Lauf in GitHub Actions mit dem echten Fuego, 15
Partien mit sechs Vorgabesteinen und 1 000 Spielen je Zug, Seed 218. Er prüft nur,
ob alles zusammenläuft, wie viele Partien abbrechen und wie lange eine Partie
dauert. Danach folgt der Prüfstand gegen Fuego (§3, Schritt 2) mit eigener
Vorabfestlegung.

## 9. Kurzer Lauf gegen das echte Fuego (vorab festgelegt, 28.10.2026)

**Zweck.** Das Werkzeug hat bisher nur gegen eine Attrappe gespielt (§8). Dieser
Lauf prüft, ob es mit dem echten Fuego zusammenläuft, wie viele Partien
abbrechen und wie lange eine Partie dauert. Er misst nichts an der KI, und
aus ihm folgt keine Änderung an `index.html`. Hazeberry hat ihn am 28.10.2026
beauftragt.

**Bedingungen.** Die heutige Standard-KI (`endspielNetz` 0,8) gegen Fuego aus
SVN r2038 (C++14) mit 1 000 Spielen je Zug, sechs Vorgabesteine für die KI,
GNU Go Stufe 1 als Schiedsrichter, 120 Simulationen, Aufgabe der KI aus, bis
600 Züge, Schätzung nach Zug 60, 120 und 200. Seed **218**, noch nie benutzt.
15 Partien in drei Teilen zu fünf
([`fuego-kurz.yml`](../.github/workflows/fuego-kurz.yml),
[`auswertung/fuego/spielen.sh`](../auswertung/fuego/spielen.sh)).

| Eingabe | Wert |
|---|---|
| `seed` | 218 |
| `spiele` | 1000 |
| `vorgabe` | 6 |

**Die eine Frage, vorab festgelegt.** Der Lauf gilt als „läuft zusammen“, wenn
höchstens eine der 15 Partien abbricht und kein Teil mit Fehler endet. Dann
folgt der Prüfstand gegen Fuego (§3, Schritt 2) mit eigener Vorabfestlegung.
Sonst werden zuerst die Gründe der Abbrüche geklärt.

**Beschrieben, ohne Anspruch**
([`auswertung/fuego/kurz-bericht.js`](../auswertung/fuego/kurz-bericht.js)):
Siege der KI, Endstand, Schätzung nach Zug 60, 120 und 200, Züge je Partie,
wie oft und wie früh Fuego passt und Minuten je Partie. Mit 15 Partien sind
das grobe Hinweise. Sie dienen nur dazu, den Prüfstand zu planen: welche
Vorgaben und Spielzahlen er braucht und wie lange er dauert.

**Erwartung vorab.** Partien dauern 3 bis 6 Minuten, mit der Zeit unserer KI.
Abgebrochen werden 0 oder 1 Partien. Wie stark Fuego mit 1 000 Spielen gegen
sechs Vorgabesteine ist, ist offen. Vermutet: Die KI liegt nach Zug 60 vorn,
weil Fuego ohne Eröffnungsbuch und ohne dynamisches Komi aus einer verlorenen
Lage spielt. Ob sie vorn bleibt, ist die Frage, die der Prüfstand klären soll.
