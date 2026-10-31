# Tests

Regressionstests zum NaN-Bug in `mctsPUCT` ([#49](https://github.com/Hazeberry/Go-html-Game-MoE/pull/49)).

```
node tests/run.js                     # alles
node tests/run.js --ohne-browser      # alles außer dem Browser-Test
node tests/regeln.js                  # Regeln und Grundformen (< 1 s)
node tests/nan-guards.js              # nur die Schutzschichten (< 1 s)
node tests/resign-criterion.js        # nur das Aufgabe-Kriterium (< 1 s)
node tests/training-stability.js      # nur das Training (~20 s)
node tests/harness-smoke.js           # nur der Harness-Rauchtest (< 1 s)
node tests/browser-nan.js             # nur Ende-zu-Ende im Browser (~45 s)
```

Keine `node_modules` nötig — bis auf den Browser-Test, der sich ohne
Playwright selbst überspringt und den Gesamtlauf grün lässt.

## In CI

`.github/workflows/tests.yml` fährt die Tests bei jedem Push und jedem Pull
Request auf `main`, in zwei Jobs: `node` (alle Suiten außer Browser, keine
Abhängigkeiten, ~30 s) und `browser` (installiert Chromium, deshalb getrennt).

Der Node-Job ruft `node tests/run.js --ohne-browser` auf — **einen** Befehl,
nicht eine Liste von Einzelaufrufen. Das ist kein Stilentscheid: die frühere
Fassung listete die Dateien im Workflow auf, und beim Hinzufügen von
`resign-criterion.js` wurde die Liste dort nicht mitgepflegt. Der Job blieb
grün und prüfte den neuen Test nicht. Die Suite-Liste lebt jetzt nur in
`tests/run.js` und kann nicht mehr davon abdriften.
Der A/B-Harness läuft dort bewusst **nicht** mit — sein Zeitbudget ist
Wall-Clock, das Ergebnis also nicht reproduzierbar, und ein Messwerkzeug ohne
festes Ergebnis taugt nicht als Ja/Nein-Prüfung.

Der Browser-Job setzt `REQUIRE_BROWSER=1`. Ohne die Variable überspringt sich
der Test, wenn er Chromium nicht findet — in CI wäre der Lauf dann grün, ohne
irgendetwas geprüft zu haben. Mit ihr ist eine fehlende Installation ein
Fehlschlag.

Das ist kein hypothetisches Risiko: die erste Fassung suchte Chromium unter
`PLAYWRIGHT_BROWSERS_PATH` mit Rückfall auf einen festen Pfad. Auf einem
GitHub-Runner ist die Variable nicht gesetzt und Playwright installiert nach
`~/.cache/ms-playwright` — der Test hätte sich dort still übersprungen. Er
fragt jetzt Playwright selbst nach dem Pfad (`chromium.executablePath()`).

Jede Datei nimmt optional einen Pfad zu einer `index.html`. So lässt sich ein
älterer Stand gegenprüfen:

```
node tests/nan-guards.js /pfad/zu/alter/index.html
```

## Was geprüft wird

Getestet wird derselbe Code, der ausgeliefert wird: die `<script>`-Blöcke
werden zur Laufzeit aus `index.html` geschnitten, genau wie `ab-harness.js`
es macht. Ein Test gegen eine Kopie würde irgendwann etwas prüfen, das
niemand ausliefert.

| Datei | Ebene | Inhalt |
|---|---|---|
| `regeln.js` | Regeln | Selbstmord, Ko, Superko, Snapback, Seki und zwei echte Augen an festen Stellungen; dazu, dass die KI den Snapback schlägt und den verbotenen Rückschlag nicht spielt |
| `wurzel.js` | Suche | Wächter für Tree-Reuse; `wurzelFrisch` bildet die Wurzel eines übernommenen Teilbaums neu |
| `quick-rettung.js` | Suche | `quickEval` bei `quickRettung` 0 bitgenau wie vorher; bei 1 Rettungsbonus nur mit mindestens drei Freiheiten danach |
| `atari-verzicht.js` | Kandidaten | `vergeblicherZug` bei `atariVerzicht` 0 bitgenau wie vorher; bei 1 fällt ein Atari nur weg, wenn der Leser die eigene Kette fängt und das Ziel entkommt; Snapback bleibt erlaubt |
| `muster.js` | Kandidaten | `musterGewicht` Default 200; mit leerer Tabelle bitgenau wie bei 0; Musterschlüssel gleich wie in `auswertung/muster.js`; `musterWert` unter Drehung und Spiegelung gleich; Wurzelwert = Wert bei 0 + Gewicht × `musterWert`; `musterAb` Default 0, vor der Zugzahl wie Gewicht 0, ab der Zugzahl wie ohne Schalter |
| `gebiet-sicher.js` | Kandidaten | `gebietSicher` Default 0; bitgenau ohne Urteil, mit Urteil bei 0 und mit leerem Urteil; `lsNach` (tote Steine weg, bei 2 nicht; kritische Gruppen je nach Zug, angehängter Stein fällt mit); Gebietsterm = `gebietZug` × Bilanzänderung mit Urteil, nicht inkrementell nachgerechnet; `urteilAusGtp` liest GNU Gos `dragon_status`/`dragon_stones` |
| `zaehlung.js` | Auszählung | `toteSteineAmEnde`: in der Partie vom 12.10. genau die acht toten schwarzen Steine, W+102,5 wie GNU Go (alte Regel: W+70,5); Eindringling, zwei Augen, Zwei-Punkte-Auge, großes Auge; unfertige Stellungen fast unberührt; Partie vom 13.10. mit T-förmigem Fünf-Punkte-Auge B+93,5 wie GNU Go (vorher W+304,5); Nakade-Formen bei 4 und 5 Punkten |
| `benson-lebend-treppe.js` | Bewertung | `bensonAliveExempt` (`docs/benson-lebend-treppe.md`): an einer nachgebauten Stellung (zehn Steine, zwei Einzelaugen, pass-alive) belastet die Sterbe-Treppe die lebende Kette mit 100, die Ausnahme hebt das auf und lässt eine nicht lebende Kette mit zwei Freiheiten bei der Treppe; an zwei Endstellungen echter Partien gegen GNU Go ändert die Ausnahme den Wert um genau die unabhängig gerechneten Abzüge, und nur, wo die Benson-Analyse läuft; bei Schalter 0 und ohne den Schlüssel bleiben die Werte der Partie vom 22.09. unverändert |
| `extern.js` | Datenschutz | `index.html` lädt nichts von fremden Servern: keine http(s)-Adressen in `src`, `href`, `@import`, `url()`, `fetch`, kein Google Fonts; Schriften aus lokalen Schriftreihen |
| `muster-endspiel.js` | Muster | Werkzeuge für die Endspiel-Muster: Rang bei gleichen Werten, das gemeinsame Lernen findet bekannte Stärken wieder, die Merkmale m, l, z der Kandidatenliste ergeben `musterWert` der Engine, Bewertung ohne Muster + `musterGewicht` × Muster ergibt die Liste der KI |
| `dagger.js` | Muster | Werkzeuge und Workflows der Datenaggregation (`docs/muster-endspiel-dagger.md`) der Messung gegen GNU Go (`docs/muster-endspiel-messung.md`) und des Orakel-Tests (`docs/muster-endspiel-orakel.md`): Tabelle aus `index.html` auslesen und einsetzen, Pilotbericht (gepaarter t-Test, Intervall, Hälften, Kontrolle gegen eine frühere Datei), Zusatzzahlen der Paarmessung (Median, Vorzeichentest), Bericht der Messung aus 16 Teilen je Arm (fehlende oder unvollständige Teile werden abgelehnt), die Skripte in `auswertung/dagger/` lehnen falsche Eingaben ab, Bericht des Orakel-Tests (ersetzte und geänderte Züge, Punkte je geändertem Zug, Steigung, Messlatte, Kontrolle gegen eine frühere Messung), Zusatzrechnung zum Passen (`auswertung/orakel-nachspiel.js`: erster Pass, Zählung aus Sicht der KI, Zusammenfassung), Parameter-Reihe (`docs/parameter-reihe.md`: Arme in Skript, Workflow und Dokument stimmen überein, jeder geänderte Parameter steht in `index.html`, Bericht mit Urteil nach der vorab festgelegten Regel und Negativkontrolle, 16 Teile je Arm), Pass-Sonde (`auswertung/pass-sonde.js`: Stelle in `index.html`, Zählung), Messung zu `bensonAliveExempt` (`docs/benson-lebend-treppe.md`: Arme in Skript, Workflow und Dokument, Schalter mit Default 0 in `index.html`, Bericht mit alpha 0,05, 16 Teile je Arm) Treppen-Sonde (`auswertung/treppe-sonde.js`: die vier Stellen in `index.html`, Zählung) und Nachmessung der Prior-Schärfe mit `bensonDeathTransfer` (`docs/prior-nachmessung.md`: Arme in Skript, Workflow und Dokument, 153 Jobs, Bericht mit Stufe 1 bei alpha 0,05, Stufe 2 gegen S9 bei alpha 0,0167, Probe der Umschaltung von PH, Kontrolle und M2; `auswertung/selbstspiel-bericht.js`: Siegrate, Wilson-Intervall, Farben, unvollständige, doppelte und fremde Teile werden abgelehnt; falsche Phasenstufen in `--ki` von `gnugo-duell.js` werden abgelehnt), Endspiel-Lerner (`docs/endspiel-lerner.md`: Workflow und Vorgaben, Netz im Repo, Merkmale, Vorwärtsrechnung, Tor), Messungen des Endspiel-Netzes (`docs/endspiel-netz.md`, `docs/netz-dosis.md`, `docs/netz-hoch.md`) und der Prior-Schärfe 9 (`docs/prior-neun.md`): Arme in Skript, Workflow und Dokument, Vorgaben, Kontrolldatei, sechs Vorgabesteine über `VORGABE` in `parameter-spielen.sh`, Prüfstand (`docs/teststaerke.md` §8: Wahl der Vorgabe nach der vorab festgelegten Regel), Fuego (`docs/fuego.md`: Bau- und Probeskript lehnen falsche Eingaben ab, fester SVN-Stand und Prüfsumme, Probe bricht mit Meldung ab, wenn Fuego nicht antwortet; kurzer Lauf: Bericht mit Abbrüchen, Zuglimit und Pässen von Fuego, Spielskript mit den Bedingungen der Messungen, Vorgaben wie im Dokument; Prüfstand gegen Fuego: Wahl nach der vorab festgelegten Regel, exaktes Intervall, Kontrolle gegen den kurzen Lauf, Arme in Workflow und Dokument), in den Workflows `endspiel-dagger.yml`, `endspiel-messung.yml`, `endspiel-orakel.yml`, `parameter-reihe.yml`, `benson-lebend.yml`, `prior-nachmessung.yml`, `endspiel-lerner.yml`, `endspiel-netz.yml`, `prior-neun.yml`, `pruefstand.yml`, `netz-dosis.yml`, `netz-hoch.yml`, `fuego-probe.yml`, `fuego-kurz.yml`, `fuego-pruefstand.yml`, `komponenten.yml`, `komponenten-b.yml`, `muster-eroeffnung.yml`, `baum-uebernahme.yml`, `leeres-brett.yml`, `pwa-vergleich.yml`, `muster-ohne-vorgabe.yml` und `fuego-gerade.yml` stehen Eingaben nur in `env`-Blöcken und kein `${{ }}` in Shell-Zeilen, die Vorgaben von `endspiel-messung.yml`, `endspiel-orakel.yml`, `parameter-reihe.yml`, `benson-lebend.yml` und `prior-nachmessung.yml` stimmen mit der jeweiligen Vorabfestlegung überein |
| `lizenz.js` | Lizenz | jede versionierte Quelldatei (`.html`, `.js`, `.py`, `.sh`) trägt die Zeile `Required Notice:` aus `LICENSE` und die SPDX-Kennung, Dateien unter `vergleich/` die Zeile ihres Herkunftsrepos; `index.html` dazu die Lizenz-URL |
| `ko-suche.js` | Suche | `koNachZug`; in `mctsPUCT` bekommen Expansion und Rollout nach einem Ko-Schlag den Ko-Punkt, der sofortige Rückschlag steht nicht unter den Antworten (Code-Review 13.10.) |
| `nan-guards.js` | Logik im Prozess | `_mctsKids` bei NaN/Infinity, `mctsPUCT` mit vergifteter Wurzelliste, `forward`/`save`/`load`/`_backward`/`trainGame`-Schutz |
| `resign-criterion.js` | Aufgabe | gibt die KI nur noch auf, wenn auch das Gebiet verloren sagt |
| `training-stability.js` | Training | Regularisierungs-Parameter, Gradienten-Deckel, Max-Norm-Projektion, Advantage-Dämpfung, dazu der ursprüngliche Repro-Lauf |
| `harness-smoke.js` | Messwerkzeug | läuft `ab-harness.js` einmal winzig durch — misst nichts, prüft nur, dass er noch anläuft |
| `endspiel-netz.js` | Endspiel-Netz | Schalter `endspielNetz` in `index.html` (`docs/endspiel-netz.md`, `docs/netz-dosis.md`): Default 0,8, bei 0 bleiben die Kandidaten unberührt; Ebenen wie `auswertung/lerner-merkmale.js`; eingebettete Float32-Gewichte geben die Wahrscheinlichkeiten des geprüften Netzes; mit 0,5 dieselben Züge wie in der Offline-Prüfung |
| `gnugo-bruecke.js` | Messwerkzeug | kurze Partien gegen GNU Go über GTP, mit und ohne Vorgabe; mit `--gnugo-aufgabe 0` läuft eine Partie weiter, die GNU Go sonst aufgibt; `--orakel-zug` (Orakel-Test, `docs/muster-endspiel-orakel.md`): eine nicht erreichte Schwelle ändert nichts, bei Anteil 1 ersetzt das Orakel jeden Zug ab AB, mit Anteil 0,5 einen Teil, falsche Angaben werden abgelehnt; `auswertung/orakel-nachspiel.js` spielt eine aufgezeichnete Partie aus `docs/daten/endspiel-orakel/lauf1/` nach und kommt auf denselben Endstand; Phasenstufen in `--ki` (`name@N=wert`, `docs/prior-nachmessung.md`): eine nicht erreichte Stufe ändert nichts, `@0` spielt wie ohne `@`, eine Stufe mitten in der Partie lässt die Züge davor gleich und zählt einen Wechsel. Ohne GNU Go übersprungen |
| `fuego-gegner.js` | Messwerkzeug | `gnugo-duell.js --gegner fuego` (`docs/fuego.md` §8), ohne GNU Go und ohne Fuego: `tests/gtp-attrappe.js` spielt beide Rollen über GTP und schreibt jeden Befehl mit. Geprüft: Fuego bekommt die Einrichtung in der geprüften Reihenfolge (Vorgabesteine des Schiedsrichters mit `set_free_handicap`, Spiele je Zug, Aufgabe aus, `deterministic_mode`, dann `set_random_seed` mit dem Seed der Partie), zieht für den Gegner (`genmove`) und bekommt die Züge der KI (`play`); der Schiedsrichter bekommt jeden Zug als `play` und zieht nie; gleiche Angaben geben dieselbe Partie; ohne die Option bleibt alles wie bisher (kein Feld `gegner`); ein vom Schiedsrichter zurückgewiesener Zug zählt als abgebrochene Partie; falsche Angaben werden mit Fehlercode 2 abgelehnt |
| `komponenten.js` | Messwerkzeug | Stufe A der Komponentenmessung (`docs/komponenten.md`): jeder Parameter der Arme steht mit Default in `index.html` und wird abgeschaltet, B schaltet genau die neun Zusätze aus, die übrigen Arme sind Teile davon; Arme, Partienzahlen, Teile, Kontrollen und Seed stimmen in Dokument, Workflow und Skripten überein; D und N0 spielen bei gleichem Seed die ersten 80 Züge gleich, gegen GNU Go und gegen Fuego (beide als `tests/gtp-attrappe.js`), B weicht vorher ab; der Bericht rechnet Intervalle mit alpha 0,05/5, die Wechselwirkung je Partienummer mit alpha 0,05/2 und den Unterschied der Gegner nach Welch, lässt abgebrochene Partien samt Partner weg und urteilt nicht; `spielen.sh` lehnt falsche Eingaben ab; Stufe B (`docs/komponenten-b.md`): in `arme-b.sh` schaltet jeder Einzelarm genau einen der sieben Zusätze ab, O7 alle sieben, D und R0 wie in Stufe A; Dokument, Workflow (fester Seed 220, keine Eingaben) und Ergebnisskript stimmen überein; der Bericht rechnet mit alpha 0,05/8, die Wechselwirkung über die sieben und die erste Abweichung von D; Muster-Eröffnung (`docs/muster-eroeffnung.md`): Arme in `arme-m.sh`, Schalter `musterAb` mit Default 0, Dokument, Workflow (fester Seed 220, Selbstspiel ohne Aufgabe) und Ergebnisskript stimmen überein, der Bericht rechnet mit alpha 0,05/2, prüft A40 und A80 gegen M0 und urteilt über M1; Baum-Übernahme (`docs/baum-uebernahme.md`): Arme in `arme-t.sh`, `SIMS` in `spielen.sh`, Teile und Seeds in Dokument, Workflow und Ergebnisskript, Nichtunterlegenheit mit Grenze −10 (bei 600 Simulationen −20 und Mittelwert über −5); Diagnose der Selbstspiel-Niederlagen (`auswertung/komponenten/selbstspiel-diagnose.js`: Sicht von B, Komi, knappe Niederlagen, Farbe, Verlauf; die Tabellen in `docs/muster-eroeffnung.md` §9 sind genau die Ausgabe des Skripts); leeres Brett (`docs/leeres-brett.md`): Arme in `arme-l.sh`, `VORGABE` in `spielen.sh`, Dokument, Workflow (Seed 222, `VORGABE` 0) und Ergebnisskript stimmen überein, ohne Vorgabe wechseln die Farben, N0 spielt die ersten 80 Züge wie D und A80 wie M0, jeder Datensatz nennt die geschlagenen Steine (Attrappe), der Bericht rechnet mit alpha 0,05/3, zeigt Verteilung und Unterschied der Bedingungen und urteilt nach der vorab festgelegten Regel, das Ergebnisskript fügt Teile, Bedingung mit sechs Steinen und Kontrolle zusammen; Muster ohne Vorgabe (`docs/muster-ohne-vorgabe.md`): Schalter `musterOhneVorgabe`, `musterWeissOhneVorgabe` und `vorgabeSteine` mit Default in `index.html`, Arme in `arme-o.sh`, Dokument, Workflow (Seed 226, `VORGABE` 0, Seeds des Selbstspiels) und Ergebnisskript stimmen überein, mit sechs Vorgabesteinen spielt M0 wie D und ohne Vorgabe nicht, MW0 spielt als Schwarz wie D (Attrappe), der Bericht urteilt nur über M0 und M50 und zeigt die Wirkung je Farbe; Siege gegen Fuego (`docs/muster-fuego-siege.md`): `siege-gepaart.js` zählt die Paare und urteilt nach McNemar, die Tabelle in `docs/muster-ohne-vorgabe.md` §10 ist genau seine Ausgabe, `gerade-wahl.js` wählt die Spielzahl nach der vorab festgelegten Regel, `FUEGO_SPIELE` in `spielen.sh`, Dokument, Workflow und Ergebnisskript des Prüfstands stimmen überein; Zuglimit (`docs/zuglimit-zaehlung.md`): `bericht.js` zählt Partien mit `gewonnen` null als Zuglimit und lässt sie samt Partner aus den Intervallen und Siegen heraus |
| `pwa.js` | Messwerkzeug | Vergleich mit der PWA (`docs/pwa-vergleich.md`): `gtp-ki.js` versteht die GTP-Befehle des Duell-Skripts, schlägt richtig, gibt mit `genmove` einen freien Punkt und mit gleichem Seed denselben Zug, lehnt falsche Befehle und Optionen ab; `gnugo-duell.js --gegner ki` spielt gegen die PWA und gegen die aktuelle Engine (GNU Go als Attrappe), nennt den Gegner mit sha256 im Datensatz, wiederholt Partien Zug für Zug und lehnt fehlendes `--gegner-html` und falsches `--gegner-ki` ab; sha256 der PWA-Datei, Teile, Seeds und Bedenkzeiten in Dokument, `pwa-spielen.sh`, Workflow und `pwa-ergebnis.sh`; `pwa-bericht.js` rechnet die Siegrate mit exaktem Intervall, urteilt nach der vorab festgelegten Regel und prüft Gleichstandsprobe und Kontrolle; `pwa-ergebnis.sh` fügt Teile und Kontrolle zusammen |
| `komi.js` | Messwerkzeug | k-Schätzung für die Komi-Messung (`docs/komi-bewusstsein.md`): Regression mit u = SD(E)/SD(d), Verdünnung (u liegt zwischen den beiden Schätzungen), Einfrieren bei Zug 240 nur bei höchstens 25 % Abweichung bei 200 und 280, Bootstrap wiederholbar, Tragfähigkeit (R², Intervall über 0, k belastbar), Nachspielen (Schlagen, Gefangene, Pass, unlesbare Koordinate), Auswahl brauchbarer Partien, Probe der Gefangenenzahlen, Workflow `komi-k.yml` und Dokument |
| `browser-nan.js` | echter Browser | Chromium, echter Web Worker, echtes `localStorage` — der Pfad, auf dem der Fehler gemeldet wurde |
| `browser-ui.js` | Browser | Code-Review 13.10.: Superko-Verlauf nach Undo über 50 Züge hinaus; PolicyNet-Puffer erst nach gelungenem Zug, Undo nimmt ihn heraus; Aufgabe der KI trainiert als Niederlage, nach Undo kein „+R“; Notzug füllt kein eigenes Auge; Dashboard speichert nur Abweichungen (Version 2), altes Format wird verworfen; asynchron abgelehnter `data:`-Worker → `blob:`-Worker |

Der Browser-Test ist nicht redundant: die Node-Tests werten die Skript-Blöcke
im Prozess aus und sehen den Worker nie. Der gemeldete Crash tötete aber erst
den Worker und danach den synchronen Fallback.

## Wohin ein neuer Test gehört

| Was geprüft wird | Datei |
|---|---|
| Spielregeln, Benson, Grundformen an einer festen Stellung | `regeln.js` |
| Neue Guard-Logik — etwas fängt einen nicht-finiten oder entarteten Wert ab | `nan-guards.js` |
| Trainingsdynamik oder Regularisierung — Gradienten, Normen, Dämpfung, Zerfall | `training-stability.js` |
| Browser-spezifisches Verhalten oder `localStorage`-Interaktion | `browser-nan.js` |
| Der Messrahmen selbst (`ab-harness.js`) läuft nicht mehr | `harness-smoke.js` |
| Wann die KI aufgibt | `resign-criterion.js` |

Die Trennung ist nicht kosmetisch, sie folgt den Kosten: `nan-guards.js`
läuft in unter einer Sekunde und ist deshalb der Ort, an dem man beim
Entwickeln ständig nachsieht. `training-stability.js` braucht zwanzig
Sekunden, `browser-nan.js` startet einen Browser. Wer eine schnelle
Zusicherung in eine langsame Datei legt, verliert sie faktisch — sie wird
seltener ausgeführt.

Ein Grenzfall, der schon vorkam: `save()` und `load()` fassen `localStorage`
an, gehören aber trotzdem nach `nan-guards.js`, weil dort die
*Entscheidung* geprüft wird (einen nicht-finiten Stand ablehnen). Nach
`browser-nan.js` gehört der *Rundlauf* durch den echten Speicher — dass ein
vergifteter Eintrag einen Reload nicht überlebt. Faustregel: Logik, die
unter der Node-Schale identisch abläuft, bleibt in Node; alles, was nur im
Browser anders ist (Worker, echter Speicher, DOM), gehört in den
Browser-Test.

## Gegen den Stand vor dem Fix

Ein Test, der auf der kaputten Version grün ist, prüft nichts. Gemessen gegen
`ae626f9` (letzter Commit vor dem Fix):

| Datei | vor dem Fix | nach dem Fix |
|---|---|---|
| `nan-guards.js` | 2 von 11 bestanden | 11 von 11 |
| `resign-criterion.js` | 1 von 8 | 8 von 8 |
| `training-stability.js` | 0 von 5 | 5 von 5 |
| `harness-smoke.js` | 2 von 2 | 2 von 2 |
| `browser-nan.js` | 1 von 3 | 3 von 3 |

Die grünen Fälle im alten Stand prüfen bewusst *unverändertes* Verhalten und
sollen auf beiden Ständen halten: in `nan-guards.js` der Rang-Prior-Zweig und
gleiche Scores, in `browser-nan.js` der gesunde Start ohne vergiftete
Gewichte. `harness-smoke.js` ist grün auf beiden Ständen, weil er nichts über
den NaN-Bug aussagt — er bewacht eine andere Lücke, siehe unten.

## Warum der Harness einen eigenen Rauchtest hat

`ab-harness.js` läuft bewusst nicht als Messlauf in der CI — Wall-Clock-Budget,
nicht reproduzierbar, taugt nicht als Ja/Nein-Prüfung. Dadurch war er aber die
einzige Datei im Repo, die kein Push je anfasste.

Das ist keine Kosmetik. Harness und `tests/rahmen.js` schneiden beide die
`<script>`-Blöcke aus `index.html`, aber mit **getrennten** Implementierungen —
sie können auseinanderlaufen. Der Harness greift zusätzlich auf sechs
Engine-Funktionen zu, die kein anderer Test berührt (`bensonClassify`,
`evaluateBoard`, `evaluateMove`, `floodFill`, `quickEval`, `removeDeadGroups`),
und auf neun `policyNet`-Interna, darunter `_netInp`, `_netHidden` und
`_gameBuffer`.

Gemessen an Negativproben:

| Bruch | Rauchtest |
|---|---|
| Syntaxfehler in `ab-harness.js` | rot |
| `bensonClassify` in `index.html` umbenannt | rot — `nan-guards.js` bleibt dabei **grün** |
| Script-Block-Id in `index.html` umbenannt | rot |
| nichts verändert | grün |

Ohne diesen Test wäre so ein Bruch erst beim nächsten manuellen Messlauf
aufgefallen: Wochen später, Ursache irgendwo in dreißig Commits. Dieselbe
Fehlerklasse wie der ursprüngliche NaN-Bug — etwas läuft still kaputt, weil
nichts hinschaut.

Der Test bewertet bewusst **keine** Ergebnisse, nur den Exit-Code und die
Struktur der Auswertung. Sonst wäre die Nichtreproduzierbarkeit wieder das
Problem.

## Zum Repro-Lauf

`training-stability.js` fährt zuletzt den ursprünglichen Repro: Selbstspiel
auf einem nicht lernbaren Zufallsziel, also der Worst Case, in dem das
Trainingssignal nie schwächer wird.

Der Lauf würfelt aus einem **festen Seed** (Standard 2026, änderbar über
`SEED=…`). Ohne den war er glücksabhängig: bei 30 Partien × 400 Zügen fing er
die Divergenz im alten Stand je nach Zufallsstrom mal in 4 von 6 Fällen, mal
seltener. Ein Regressionstest, der mal anschlägt und mal nicht, erzeugt
falsche Sicherheit. Mit festem Seed ist das Ergebnis reproduzierbar:

| | ‖W1,b1‖ nach 30 Partien | Grenze |
|---|---|---|
| vor dem Fix | **603,6** — 65× Initialisierung | 92,4 |
| nach dem Fix | 8,25 | 37,0 |

Bei 25 × 200 divergiert der alte Stand in keinem geprüften Lauf, deshalb
30 × 400. Für einen schnellen Durchlauf ohne Regressionsanspruch:
`node tests/training-stability.js 12 200`.

Der Seed ist so gewählt, dass er den Fehler im alten Stand reproduziert —
das ist der Zweck eines Regressionstests. Umgekehrt ist er nicht
zurechtgebogen: der Test besteht nach dem Fix bei allen sechs geprüften
Seeds (1, 7, 42, 2026, 99991, 123456).

### Zwei Grenzen, und die zweite ist die wichtigere

Der Lauf prüft die Gewichtsnorm gegen die Max-Norm-Grenze des Fixes **und**
gegen das Zehnfache der gemessenen Startnorm. Die zweite Grenze setzt nichts
vom Fix voraus — und ohne sie war der Test zahnlos: am alten Stand lief
`‖W1,b1‖` auf 603 hoch, und der Test blieb grün, weil kein einziger Wert NaN
geworden war. Ein Training, das die Gewichte um eine Größenordnung aufbläst,
ist kaputt, egal ob daraus am Ende ein NaN wird.

## Warum das Zeitbudget hier keine Rolle spielt

Die Spielstärke-Messung über `ab-harness.js` ist wall-clock-getrieben und
deshalb **nicht** reproduzierbar (siehe Haupt-README). Diese Tests umgehen
das: sie prüfen Invarianten — finit, beschränkt, kein Absturz — und keine
Spielstärke. Nur `mctsPUCT` bekommt ein kleines Zeitbudget, und dort zählt
allein, *dass* ein Zug herauskommt.
