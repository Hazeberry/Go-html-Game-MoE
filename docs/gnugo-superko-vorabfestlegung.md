# GNU Go und die positionelle Wiederholung: Vorabfestlegung

**Stand: 23.11.2026. Status: Entwurf, nicht gelaufen.** Offene Frage aus
`docs/korrektur-gtp-vorabfestlegung.md` §10.5. Go von Hazeberry am 23.11.2026, als Punkt 3 einer Liste von vier.

Dieses Doc enthält Vorgaben für den Lauf. Hazeberry liest es vor dem Merge. **Der Lauf selbst wird vorher
ausdrücklich angekündigt** — was läuft, wo es läuft und welches Go dafür gilt.

## 1. Frage und Abgrenzung

**Frage:** Lehnt GNU Go 3.8 mit `--chinese-rules` einen Zug ab, der eine frühere Brettstellung wiederherstellt
(positionelle Wiederholung), wenn der einfache Ko-Punkt durch zwei Pässe nicht mehr gilt?

**Warum das jemanden interessiert.** In `gnugo-duell.js` bekommt GNU Go einen Zug des Adapters erst **nach** dem
Adapter (Z. 483): Bei eigenen Zügen ist er vorgeschaltet (Z. 470 vor 471), bei Adapterzügen ist er **Melder, nicht
Schutz**. Vor der Korrektur GTP-1 nahm der Adapter eine Wiederholung an. Ob ein solcher Zug damals überhaupt
aufgefallen wäre, hängt allein daran, ob GNU Go ihn ablehnt. Das ist eine **rückblickende Frage über den
Messaufbau**, nicht über den heutigen Code.

**Nicht Gegenstand:** Die Spielstärke. Das Verhalten unserer Engine — die prüft positionelle Wiederholung in
`getLegalMoves` und tat es auch vorher. Die Frage, ob eine bestimmte Archivpartie einen regelwidrigen Zug enthielt;
dafür bräuchte man die Befehlsfolgen jener Läufe (`docs/bughunt-wiederholung.md` §9).

## 2. Das ist keine Stärkemessung, und deshalb gelten andere Regeln

`CLAUDE.md` verlangt für Messungen gepaarte Anlage, exakten McNemar- oder Vorzeichentest und Clopper-Pearson. **Das
trifft hier nicht zu, und zwar nicht aus Bequemlichkeit:** Gefragt ist das Verhalten eines Protokolls an einer
festgelegten Stellung. GNU Go antwortet auf `play` mit `=` oder `?`; die Antwort ist deterministisch, hängt nicht am
Seed und nicht an der Suche. Es gibt keinen Anteil zu schätzen, kein Paar zu bilden und keine Streuung, über die ein
Intervall etwas sagen könnte. Ein Clopper-Pearson-Intervall auf einer einzigen deterministischen Antwort wäre
Zierwerk.

**Was stattdessen trägt:** Kontrollen, die zeigen, dass GNU Go in diesem Aufbau überhaupt Regeln prüft (§3, P1 und
P2), und eine harte Gültigkeitsregel (§4). Ohne die Kontrollen wäre ein `=` auf die Hauptfrage nichtssagend: Es
könnte heißen „GNU Go erlaubt Wiederholungen" oder „GNU Go prüft hier gar nichts".

## 3. Aufbau

Alle Stellungen sind die aus `auswertung/bughunt-20261107/reproduce.cjs` in `Hazeberry/codex`, wie sie schon die Tests
der GTP-Korrektur verwenden (`docs/korrektur-gtp-vorabfestlegung.md` §10.3). Jede Probe startet mit
`boardsize 19`, `clear_board`, `komi 7.5`.

**Der Ko-Aufbau** (acht Züge): `play W B2`, `W A3`, `W C3`, `W B4`, `B A2`, `B B1`, `B C2`, `B B3`. Der letzte Zug
schlägt W B2; danach steht Weiß auf {A3, C3, B4} und Schwarz auf {A2, B1, C2, B3}, und B3 ist ein einzelner Stein
mit der einen Freiheit B2 — der Ko-Punkt.

| Probe | Folge | Zweck | erwartet |
|---|---|---|---|
| **P0** | Ko-Aufbau, dann `list_stones W` und `list_stones B` | Kommt dieselbe Stellung heraus? | beide Mengen wie oben, B2 leer |
| **P1** | `play W A2`, `play W B1`, `play B A1` | **Kontrolle:** prüft GNU Go Selbstmord? | `?` |
| **P2** | Ko-Aufbau, dann `play W B2` | **Kontrolle:** prüft GNU Go das einfache Ko? | `?` |
| **P3** | Ko-Aufbau, `play W pass`, `play B pass`, `play W B2` | **die Frage** | offen: `=` oder `?` |
| **P4** | wie P3, aber GNU Go ohne `--chinese-rules` | hängt es am Regelsatz? | offen |

**Jede Antwort wird wörtlich protokolliert**, auch die auf die beiden Pässe in P3. Dass GNU Go nach zwei Pässen
weiterspielt, ist **nicht vorausgesetzt**: Lehnt es einen Pass ab oder hält es die Partie für beendet, ist P3 nicht
durchgeführt und das Ergebnis lautet „kein Urteil" mit genau diesem Grund (§4).

**Umfang:** ein Lauf, fünf Proben, je ein GNU-Go-Prozess. Kein Seed nötig — es wird nie `genmove` gerufen, GNU Go
sucht nicht. Laufzeit geschätzt unter einer Minute, der Großteil davon die Installation des Pakets.

## 4. Gültigkeitsregel

Zwei Zustände, gültig oder ungültig. **Gültig** nur, wenn alles zutrifft:

1. **P0 stimmt:** beide Steinmengen wie in §3, und B2 ist leer. Sonst steht die Stellung nicht, und alles Weitere
   betrifft eine andere Aufgabe.
2. **P1 antwortet `?`** — GNU Go lehnt Selbstmord ab.
3. **P2 antwortet `?`** — GNU Go lehnt die unmittelbare Ko-Rücknahme ab.
4. **In P3 sind beide Pässe mit `=` angenommen** und GNU Go hat auf den folgenden `play` geantwortet.
5. **Kein Prozess ist abgestürzt und keine Anfrage lief in die Zeitgrenze.** GNU Go 3.8 stürzt an manchen Stellungen
   ab (`gnugo-duell.js`, Kommentar vor `MAX_NEUSTARTS`); hier wird **nicht** neu gestartet, ein Absturz macht den Lauf
   ungültig.
6. Die Version steht im Protokoll (`gnugo --version` und `dpkg -l gnugo`).

**Ungültig heißt: kein Urteil, mit Grund, und der Lauf wird rot.** Nicht „wahrscheinlich doch", nicht „teilweise".

## 5. Was das Ergebnis ändert — und was nicht

**Am Code ändert es nichts.** Die Korrektur GTP-1 ist gemergt; der Adapter lehnt die Wiederholung ab, unabhängig
davon, was GNU Go tut. Es gibt keinen Schalter und keine Folgeänderung, wie das Ergebnis auch ausfällt.

Was es ändert, ist eine Aussage in `docs/korrektur-gtp-vorabfestlegung.md` §10.5:

- **GNU Go lehnt ab (`?`):** Dann war GNU Go schon vorher ein brauchbarer Melder — ein regelwidriger Adapterzug hätte
  den Lauf abgebrochen, statt still durchzugehen. Der Satz „GNU Go ist dort Melder, nicht Schutz" bleibt richtig, die
  Meldung hätte aber funktioniert.
- **GNU Go nimmt an (`=`):** Dann hätte eine Wiederholung in beiden Richtungen still passieren können, und die
  Aussage „nicht gesichert, ob eine Messung betroffen war" bleibt offen — mit einem Grund mehr.

Beides wird als Nachtrag in jenem §10.5 und hier festgehalten. **Aus keinem Ergebnis folgt eine Spieländerung.**

## 6. Werkzeug und Workflow

- `auswertung/gnugo-superko.js`: spricht GTP mit einem GNU-Go-Prozess je Probe, protokolliert jede Anfrage und jede
  Antwort wörtlich, prüft §4 und schreibt `ergebnis.json` plus Konsolenprotokoll. **Exitcode 1, wenn der Lauf nach
  §4 ungültig ist** — damit wird der Lauf rot, wie die Gültigkeitsregel es verlangt.
- `.github/workflows/gnugo-superko.yml`: `workflow_dispatch`, `ubuntu-24.04` (wie alle Messläufe: neuere Bilder haben
  andere Paketstände von GNU Go), ein Job, GNU Go aus dem Paketstand des Runners, Ergebnis als Artefakt und in der
  Lauf-Zusammenfassung.
- **Lokal nicht lauffähig:** GNU Go ist im Container nicht vorhanden und gehört nach `CLAUDE.md` auch nicht dorthin.
  Geprüft wird lokal nur, was ohne GNU Go geht: dass das Skript seine Eingaben ablehnt und die Antwortmuster richtig
  einordnet, gegen `tests/gtp-attrappe.js`.

## 7. Ablauf

1. Dieses Doc als PR, CI grün, **Hazeberry liest es**, Merge.
2. Werkzeug und Workflow in einem eigenen PR, mit dem lokalen Test aus §6. CI grün, Merge.
3. **Ankündigung des Laufs**, dann Start über `workflow_dispatch`.
4. Ergebnis als Nachtrag hier und in `docs/korrektur-gtp-vorabfestlegung.md` §10.5, Rohdaten unter
   `docs/daten/gnugo-superko/`. Kurzer Bericht mit den löschbaren Branches.
