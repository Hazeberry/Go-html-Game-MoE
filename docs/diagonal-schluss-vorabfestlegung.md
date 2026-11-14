# Vorabfestlegung: Diagonalprüfung nur in der Schlusszählung (`diagonalAugeSchluss`)

Entwurf, 14.11.2026. **Status: Vorabfestlegung mit vorbereitetem Schalter und Werkzeug, nicht freigegeben.** Hazeberry hat das Go gegeben, den Schalter aufzuteilen und die drei Punkte vorzubereiten („Lass uns den Schalter aufteilen … alle drei Punkte vorbereiten“, 14.11.2026). Dieses Doc gehört zu dem PR, der den Schalter (Standard 0), das Werkzeug und die Tests bringt. Hazeberry liest es vor dem Merge (CLAUDE.md).

**Dieses Doc erteilt kein Go** für den Bau des Pakets, die Beurteilung, die Auswertung, einen Engine-Vergleich oder einen Standardwechsel. Jeder dieser Schritte braucht ein eigenes Go (§7). Werte, die als **Setzung** stehen, sind keine Messergebnisse; mit **Entscheidung offen** markierte Punkte sind Hazeberrys.

Vorgeschichte: `docs/diagonalpruefung-vorabfestlegung.md`, besonders §15 (Stufe 1), §17.6 (Stufe 2), §18.5 bis §18.10 (Proben der Stufe 3) und §18.11 (Abschluss mit dem Hinweis auf den S-Teil, Nr. 6). Abschnittsnummern ohne Doc-Angabe beziehen sich hier auf dieses Doc; „alt §…“ auf das alte.

## 1. Frage und Grundlage

Der bisherige Schalter `diagonalAugeEnde` stellt Schlusszählung (S) und Zählvorschau (V) gemeinsam um. Stufe 3 scheiterte an der Menge (416 Ketten) und an der Strenge von alt §8 Nr. 4, und fast beides lag in der Vorschau: 393 der 416 Ketten und 354 der 356 B1-Fälle sind V (alt §18.11 Nr. 6).

In der Schlusszählung zeigt Schicht A (Übereinstimmung mit GNU Go, alt §17.6; **nicht Richtigkeit**) eine klare Richtung:

| S, 658 betroffene Endstellungen | Wert |
|---|---:|
| Steine behoben | 10.704 |
| Steine neu abweichend | 7 (alle in einer Stellung, Fuego 50 Spiele) |
| Stellungen nur behoben / nur neu / beides | 657 / 1 / 0 |
| Sieger wie GNU Go nach Fläche, aus → an | 460 → 655 |
| Sieger wie GNU Go nach Territory, aus → an | 588 → 656 |

**Frage dieser Vorabfestlegung:** Bestätigt eine unabhängige Beurteilung der 23 S-Ketten die Richtung von Schicht A so weit, dass ein Standardwechsel nur für die Schlusszählung in Frage kommt (positive Kandidatur)? Die Vorschau, der Worker und die KI sind **nicht** Gegenstand. Ob der Standard tatsächlich wechselt, entscheidet §6 mit eigenem Go.

## 2. Punkt 1: Der aufgeteilte Schalter (in diesem PR umgesetzt)

- **Neu:** `PARAMS.diagonalAugeSchluss`, 0 oder 1, **Standard 0**. Er wirkt nur in `resolveLifeAndDeath` (Schlusszählung am Spielende: entfernte Steine, Gefangene, Endstand, SGF-Ergebnis). Dort gilt die Diagonalprüfung, wenn `diagonalAugeEnde >= 1` **oder** `diagonalAugeSchluss >= 1`.
- **Unverändert:** `diagonalAugeEnde` behält seine Bedeutung (Schlusszählung und Vorschau). So bleiben die Werkzeuge der Stufen 1 bis 3, ihre Pflichtprüfungen und die gesicherten Daten unverändert gültig.
- **Nicht berührt:** Zählvorschau (`zaehlVorschau`, Cache-Schlüssel, Neuberechnung), Worker, `passNachGegnerpassPruefung`, KI. Eine geöffnete Vorschau wird beim Ändern des neuen Felds nicht neu berechnet, weil sich an ihr nichts ändert.
- **Dashboard:** eigene Zeile „Diagonalprüfung (nur Schlusszählung)“, Bereich 0 bis 1, Tooltip ohne Anführungszeichen.
- **Bitgleich bei aus:** Bei beiden Schaltern 0 ist der Aufruf in `resolveLifeAndDeath` derselbe wie vorher (`diagAuge` = false). Sonst ändert sich am Spiel nur die neue `PARAMS`-Zeile und die Dashboard-Zeile.

**Tests (lokal grün, die CI prüft die ganze Suite):**

- `tests/diagonalauge.js`: Standard 0 in `PARAMS` und `PARAMS_DEFAULT`; der Name `diagonalAugeSchluss` kommt in `index.html` genau dreimal vor (in `PARAMS`, in `resolveLifeAndDeath`, in der Dashboard-Zeile), also nicht in Vorschau, Worker oder KI; `passNachGegnerpassPruefung` ruft die Vorschau bei `diagonalAugeSchluss` = 1 ohne Diagonalprüfung auf.
- `tests/browser-diagonalauge.js`: Dashboard-Zeile mit Wert 0; bei `diagonalAugeSchluss` = 1 und `diagonalAugeEnde` = 0 entfernt die Schlusszählung an den eingefrorenen Entwicklungsstellungen die Menge „an“, die Vorschau zeigt weiter „aus“ (Cache-Schlüssel endet auf `:0`); eine geöffnete Vorschau bleibt beim Ändern des Felds gleich (Mengen, Panel-Text, Schlüssel).
- Mutationsprobe bestanden: Schlusszählung ignoriert den neuen Schalter (Browser-Test schlägt an); Vorschau liest ihn (Test der Fundstellen schlägt an).

**Folge für alte Läufe:** Das Werkzeug der Stufe 2 prüft beim Messlauf die SHA-256 von `index.html` gegen den Stand von Stufe 1. Eine Wiederholung der Stufe 2 muss deshalb den damaligen Commit verwenden (Lauf `43274198340`: `f43fa4d65e8c90079266c2457e246fb5b0163dbb`). Auf die gesicherten Ergebnisse hat das keinen Einfluss.

## 3. Gelten die Daten der Stufen 1 und 2 für den neuen Schalter?

**Ja für die Tot-Menge der Schlusszählung, belegt am Code:** Stufe 1 hat „an“ für S mit `E.toteSteineAmEnde(brett, undefined, undefined, diag)` berechnet (`auswertung/endspiel/diagonal-pruefung.js`, Funktion zum Rechnen, Zeile 228 beim Stand dieses Docs). `resolveLifeAndDeath` ruft bei `diagonalAugeSchluss` = 1 genau diese Funktion mit `diagAuge` = true auf. Betroffenheit (658 S-Stellungen), Schicht A für S und die Auswahl der S-Ketten für Stufe 3 gelten damit unverändert. Die Wirkung auf den Endstand übernimmt §4.4 Nr. 5 wie bisher aus dem Bericht der Stufe 1.

**Nicht geprüft:** ob die Endstände der App nach dem Entfernen der Steine (Gefangene, Gebiet, Komi) in allen Fällen gleich denen der Werkzeug-Rechnung sind. Die Werkzeuge zählen mit derselben App-Zählregel, ein Unterschied ist nicht bekannt.

## 4. Punkt 2: Stufe 3 nur für S (Werkzeug in diesem PR, Lauf erst nach Go)

### 4.1 Umfang

23 Ketten aus 22 Stellungen und 22 Partien (aus `auswahl-stufe3.json` des gültigen Stufe-2-Laufs, ohne Urteile):

| Menge | Zelle | Ketten |
|---|---|---:|
| B1 (Abweichung durch den Schalter neu entstanden) | – | 2 (beide aus einer Stellung, Fuego 50 Spiele; 6 und 1 Stein) |
| B2 | behoben, GNU Go: tot | 18 |
| B2 | behoben, GNU Go: lebend | 1 |
| B2 | unverändert, GNU Go: lebend | 1 |
| B2 | unverändert, GNU Go: tot | 1 |

Die 19 behobenen Ketten stammen aus 19 verschiedenen Partien (GNU Go ohne Vorgabe 14, Fuego 50 Spiele 3, Fuego 100 Spiele 2). Die Kennungen und ihre Reihenfolge sind dieselben wie im Gesamtpaket; das Werkzeug filtert nur.

**Werkzeug:** `diagonal-pruefung-stufe3.js unterlagen … --art S` schreibt `beurteiler-paket-S/` und `geheim/aufdeckung-S.json`; der Workflow `diagonal-pruefung-stufe3.yml` hat dafür die Eingabe `art` (alle oder S) und eigene Artefakte `beurteiler-paket-S` und `stufe3-geheim-S`. `probe` zusammen mit `art` S ist abgelehnt: Es gibt keine weitere Probe, weil jede Probe Stücke verbrauchen würde.

### 4.2 Anleitung Fassung 2 (Setzung)

Das S-Paket hat Manifest-Version 2 und die Anleitung Fassung 2. Fassung 1 bleibt für die alten Pakete unverändert (die Bögen der Proben bleiben gültig). Grund: Beide Astra-Läufe haben drei der sechs Probestücke mit `nicht_entscheidbar` beantwortet, statt sie zu lesen; Fassung 1 bot diese Antwort als „besser als Raten“ an (alt §18.10, §18.11).

Was Fassung 2 anders macht:

1. **Gelesene Zugfolgen sind Pflicht** (Feld `varianten`): mindestens **eine** Zugfolge, in der Schwarz zuerst zieht, und **eine**, in der Weiß zuerst zieht; bei `nicht_entscheidbar` oder Sicherheit `unsicher` mindestens **drei** je Zugrecht. Jede Zugfolge hat `beginnt`, `zuege` (Koordinaten wie im Diagramm oder `pass`) und `ergebnis` (mindestens 10 Zeichen).
2. **Jede Zugfolge wird mechanisch nachgespielt** (`pruefen`, `zusammenfuegen` und `auswerten`): kein besetzter Punkt, kein Selbstmord, einfaches Ko durchgesetzt (am Anfang nur für die Seite, die laut Unterlage am Zug ist), Superko nicht. Die Stellung kommt aus der SGF der Unterlage, deren Prüfsumme gegen das Manifest geprüft wird.
3. **`nicht_entscheidbar` ist keine Abkürzung mehr:** Der Satz „besser als Raten“ ist gestrichen; die Antwort verlangt mehr Zugfolgen als jede andere.
4. **Zeit ist Pflicht** (`dauerSekunden`, gemessen, ohne Wartezeit auf Rückfragen). Sie wird berichtet, aber **nicht** als Schwelle benutzt: Sie ist eine Selbstangabe und nicht nachprüfbar.

**Grenzen, offen benannt:** Das Werkzeug prüft, ob eine Zugfolge möglich ist, nicht, ob sie gut gewählt ist. Eine Zugfolge aus lauter Pässen besteht die Prüfung. Die Pflicht macht das Weglassen sichtbar und die Lesung nachlesbar; erzwingen kann sie gründliches Lesen nicht. Dass eine Sitzung mit Fassung 2 so liest wie GLM 5.3 auf Max in der zweiten Probe, ist eine Hypothese; sie ist nicht in einer Probe geprüft.

Tests: `tests/diagonal-pruefung-stufe3.js` (33 Fälle, acht davon neu für Fassung 2 und S), unter anderem Rundweg der SGF, Ko-Verbot am Anfang und im Verlauf, besetzter Punkt, Selbstmord, ungültige Koordinaten, Mindestzahlen 1 und 3, veränderte SGF wird erkannt, Teilbögen werden mit Zugfolgen geprüft. Mutationsprobe bestanden für: Ko nicht durchgesetzt, drei Zugfolgen bei offen fehlen, kein S-Filter, mehrere Bögen erlaubt, Mindestumfang verlangt V auch bei S, SGF-Prüfsumme ungeprüft.

### 4.3 Beurteiler (Setzungen und offene Entscheidungen)

1. **Genau ein Bogen wird ausgewertet** (Setzung; das Werkzeug lehnt bei `--art S` mehr als einen ab). Grund: Nach alt §6.4 machen mehr Bögen „bestätigt“ seltener (alt §18.10 Nr. 5), und eine Auswahl unter mehreren Bögen nach Sicht auf ihre Urteile wäre eine Wahl nach Ergebnis.
2. **Welcher Bogen:** der erste vollständige Bogen, der `pruefen` besteht, aus der Sitzung, die Hazeberry dafür startet. Formfehler (zum Beispiel eine unmögliche Zugfolge) darf dieselbe Sitzung berichtigen, solange nichts aufgedeckt ist. Ein abgegebenes Urteil wird nicht geändert. Weitere Bögen werden, falls es welche gibt, nur abgelegt und nicht ausgewertet.
3. **Ausgeschlossen:** jede Sitzung, die eine Probe der Stufe 3, dieses Gespräch oder Dateien aus `docs/daten/diagonal-pruefung/` kennt. Der Beurteiler bekommt nur das Artefakt `beurteiler-paket-S` und den Auftragstext aus §4.5.
4. **Entscheidung offen (E-S1), Vorschlag:** eine frische Sitzung mit GLM 5.3 auf Einstellung Max (in der zweiten Probe die gründlichste Lesung: alt §18.8, §18.9). Astra kommt nach zwei abgekürzten Läufen nicht in Frage (Vorschlag).
5. **Hilfsmittel:** wie Fassung 1 (eigene mechanische Skripte ja, fremde Go-Software, automatische Suche, Internet nein).

### 4.4 Entscheidungsregel für S (Anpassung von alt §8, vor jedem Urteil festgelegt)

Ein Befund „positive Kandidatur“ verlangt alle Bedingungen:

1. Pflichtprüfungen bestanden (Eingaben gegen ihre Prüfsummen, Bogen gültig nach Fassung 2, genau ein Bogen).
2. **Bestätigter Nutzen:** mindestens 5 R+ aus mindestens 3 verschiedenen Partien (alt §10.5, unverändert). Möglich sind höchstens 19 R+ aus 19 Partien (die behobenen Ketten).
3. **R− = 0 in der Schlusszählung**, konservativ gezählt (ein entschiedenes, nicht unsicheres Urteil gleich „aus“ genügt).
4. **Beide B1-Fälle entschieden** (kein ungeklärter B1-Fall) und keine Ausfälle in betroffenen Stellungen (Stufe 2: 0).
5. Wirkung auf den Endstand berichtet, einschließlich Siegerwechsel (aus dem Bericht der Stufe 1).

**Mindestumfang** (alt §7 Nr. 7): 30 betroffene Stellungen nur in S (658, erreicht). Ungeklärte B2-Fälle verhindern die Kandidatur nicht (wie alt §18, Auslegung von alt §8 Nr. 4), sie werden einzeln berichtet. R+, R− und ungeklärt sind wie in alt §6.4 definiert; mit genau einem Bogen gibt es keinen Widerspruch zwischen Beurteilern.

Die Zahlen 5, 3 und 30 sind Setzungen ohne Sicherheitswert. Eine positive Kandidatur heißt nur: In dieser Prüfmenge wurde nichts Gegenteiliges gefunden. Sie ist kein Go.

### 4.5 Auftragstext für den Beurteiler (Setzung)

> Im Anhang ist ein Paket mit Unterlagen zu Go-Stellungen. Lies zuerst `anleitung-beurteiler.md` und halte dich genau daran, besonders an den Abschnitt „Gelesene Zugfolgen (Pflicht)“. Beurteile alle Unterlagen und gib mir einen Antwortbogen als JSON-Datei nach `bogen-schema.json` zurück. Miss die Zeit je Unterlage mit einer Uhr. Du darfst in Etappen arbeiten und Teilbögen abgeben.

### 4.6 Aufwand (Hypothese)

23 Unterlagen. Bei der Lesetiefe von GLM 5.3 auf Max in der zweiten Probe (rund 15 bis 20 Minuten je Unterlage, alt §18.9 Nr. 4) rund 6 bis 8 Stunden Arbeit der Sitzung. Die Pflicht zu Zugfolgen kostet zusätzlich Zeit. Nicht gemessen.

## 5. Ablauf und Gültigkeit

1. Merge dieses PR (Hazeberry liest vorher).
2. **Go zum Paket:** Workflow `diagonal-pruefung-stufe3.yml`, Modus `unterlagen`, `art` S. Reine Rechnung auf den gesicherten ZIPs, kein GNU Go, kein Beurteiler.
3. Hazeberry gibt `beurteiler-paket-S` mit dem Auftragstext an die Sitzung nach §4.3.
4. Der Bogen (oder die Teilbögen) wird mit `pruefen` beziehungsweise `zusammenfuegen` geprüft und per PR unter `docs/daten/diagonal-pruefung/stufe3-S/` abgelegt.
5. **Go zur Auswertung:** derselbe Workflow, Modus `auswerten`, `art` S. Ergebnis als Nachtrag in diesem Doc.

**Gültigkeit:** nur zwei Zustände. Ungültig heißt „kein Urteil“ mit Grund, und der Lauf wird rot (Eingaben falsch, Bogen ungültig, mehr als ein Bogen).

## 6. Punkt 3: Bedingungen für einen Standardwechsel (Vorabfestlegung, kein Go)

Ein Wechsel von `diagonalAugeSchluss` auf Standard 1 kommt nur in Frage, wenn **alle** folgenden Punkte erfüllt sind. Er ist ein eigener PR mit eigenem Go.

1. **Positive Kandidatur** aus §4.4.
2. **KI unverändert, gemessen:** Der Schalter wird von der KI nicht gelesen (Test der Fundstellen, §2). Pflicht ist trotzdem ein Engine-Vergleich nach CLAUDE.md (`engine-vergleich.yml`, alter Stand gegen den Stand mit Standard 1, je Stand ein eigener Prozess) mit dem Ergebnis „bitgleich“; sonst kein Wechsel. Eine Spielstärkemessung entfällt (Setzung). Begründung: Die Messungen werden von GNU Go als Schiedsrichter gezählt, nicht von der App, und die KI ändert sich nicht. Ergibt der Engine-Vergleich etwas anderes als bitgleich, ist diese Begründung hinfällig.
3. **Andere Stellen, die die App-Schlusszählung benutzen**, sind vor dem Wechsel aufgelistet (Werkzeuge unter `auswertung/`, die `resolveLifeAndDeath` oder `PARAMS_DEFAULT` lesen), und ihre Folgen sind benannt. Nicht geprüft beim Stand dieses Docs.
4. **Bedienung (Entscheidung offen, E-S4):** Mit Standard 1 nur in der Schlusszählung kann die Zählvorschau am Spielende andere Steine als tot zeigen als die Schlusszählung. In den 658 betroffenen S-Stellungen der Prüfdaten unterscheiden sich die Tot-Mengen bei aus und an; die Vorschau rechnet dort wie die Schlusszählung bei aus. Ein Unterschied ist dort also zu erwarten (an den Entwicklungsstellungen im Browser-Test gezeigt, an den 658 nicht einzeln geprüft). Vor dem Wechsel ist zu entscheiden: (a) hinnehmen und in der Hilfe erklären, (b) einen Hinweis bei der Schlusszählung zeigen, wenn die Diagonalprüfung Steine anders bewertet, oder (c) einen eigenen Vorschlag für die Vorschau mit eigener Prüfung. Eine Messung dazu gibt es nicht.
5. **Handpartien:** Die sechs Handpartien ändern ihre Tot-Menge mit dem Schalter nicht (alt §15.4). Das wird beim Wechsel erneut gezeigt, ohne Statistik.
6. **Tests:** Tests, die Standard 0 voraussetzen, setzen den Wert ausdrücklich; ein neuer Test prüft Standard 1. Die README nennt den Wechsel und seine Grenzen.
7. **Rückweg:** Der Schalter bleibt; Standard 0 lässt sich jederzeit wiederherstellen.

**Bleibt offen, auch nach einem Wechsel:** Übereinstimmung mit GNU Go und eine einzelne KI-Beurteilung sind keine Ground Truth. Die Prüfdaten sind Archivpartien gegen GNU Go und Fuego; für menschliche Partien begründen sie nichts (alt §15.6).

## 7. Offene Entscheidungen (Hazeberry) und Freigaben

| Nr. | Frage | Vorschlag |
|---|---|---|
| E-S1 | Wer beurteilt? | frische Sitzung GLM 5.3 auf Max, nicht Astra (§4.3) |
| E-S2 | Mindestzahlen der Zugfolgen | 1 je Zugrecht, 3 bei `nicht_entscheidbar` oder `unsicher` (§4.2) |
| E-S3 | Entscheidungsregel für S | wie §4.4 (alt §8 auf S beschränkt, sonst unverändert) |
| E-S4 | Unterschied Vorschau und Schlusszählung bei einem späteren Wechsel | vor dem Wechsel entscheiden (§6 Nr. 4) |

**Freigaben:** Der Merge dieses PR erteilt kein Go für einen Lauf. Reihenfolge: Merge → Go zum Paket (§5 Nr. 2) → Beurteilung → Ablage → Go zur Auswertung → Nachtrag → gegebenenfalls eigene Festlegung und Go zum Standardwechsel (§6). `diagonalAugeEnde` und `diagonalAugeSchluss` bleiben standardmäßig 0.
