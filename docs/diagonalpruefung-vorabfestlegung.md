# Vorabfestlegung: Diagonalprüfung bei Ein-Punkt-Augen in `toteSteineAmEnde`

Entwurf, 08.11.2026. **Status: Entwurf einer Vorabfestlegung, nicht freigegeben.** Hazeberry hat das Go ausschließlich für diesen Doc-Entwurf gegeben. **Keine Umsetzung, keine Läufe, kein Workflow, keine Änderung an `index.html`.**
Dieses Doc erteilt kein Go für die Umsetzung, einen Test, einen Engine-Vergleich, einen GNU-Go-Lauf oder eine Änderung des Standards. Hazeberry liest es vor dem Merge. Werte, die hier als **Setzung** stehen, sind keine Messergebnisse; mit **Entscheidung offen** markierte Punkte
sind Hazeberrys.

**Abgrenzung:** Die Ursache der 15 Zählabweichungen (`docs/zaehlung-mechanismus.md` §5) ist ein **getrenntes Vorhaben** und kommt hier nicht vor. Sie betrifft den Vergleich von GNU Gos `final_score` mit der App-Zählregel auf GNU Gos Tot-Liste, nicht `toteSteineAmEnde`.

## 1. Frage und Hintergrund

`toteSteineAmEnde` (shared-go-logic, `index.html` Z. 621 bis 699) zählt jede leere Region, die nur an eine Farbe und an eine Kette eines Verbands grenzt, als Auge (`V.augen++`), unabhängig von ihrer Größe. Die Diagonalregel gegen falsche Augen (`_diagIsTrueEye`) wird dort nicht
angewandt, an anderen Stellen der App schon. In den Entwicklungsdaten (§3) sind von 88 Ein-Punkt-Augen an den 71 Ketten, die GNU Go als tot führt und die Zählvorschau behält, 70 nach dieser Regel falsch
(`docs/zaehlung-mechanismus.md` §6.5). Eine Test-Kopie, in der ein Ein-Punkt-Auge nur mit `_diagIsTrueEye` zählt, führte an diesen Daten zu 0 neu entstandenen abweichenden Steinen und 394 geänderten Steinen in Richtung GNU Go
(§12.2 des Docs; nachträglicher Diagnosebefund an denselben Daten, keine Verbesserungsmessung).

**Frage dieser Vorabfestlegung:** Wie wirkt die Diagonalprüfung auf **neuen** Stellungen, getrennt für die Schlusszählung und für die Zählvorschau, und wie unterscheiden sich dort **Übereinstimmung mit GNU Go** und **tatsächliche Richtigkeit**? Ob der Schalter jemals Standard wird, ist **nicht** Gegenstand; das wäre eine eigene Festlegung mit eigenem Go.

## 2. Der Schalter

**Entscheidung offen (Vorschlag):** `PARAMS.diagonalAugeEnde`, 0 oder 1, **Standard 0 (aus)**, wie `passNachGegnerpass` (`docs/passregel-versuch.md`): Eintrag in `PARAMS`, Dashboard-Zeile, Weitergabe an Worker und Rückfall wie bei den bestehenden Parametern.
`toteSteineAmEnde` bekommt dafür einen weiteren **Parameter mit Standardwert „aus“** (wie `augeGross` und `offenGross`) und liest `PARAMS` nicht selbst; die Aufrufer reichen den Wert durch. Aufrufer nach dem Stand der Datei (in der Umsetzung vollständig zu prüfen):

| Aufrufer | Wirkung des Schalters |
|---|---|
| `resolveLifeAndDeath` (Z. 5778), aufgerufen vom Spielende (Z. 5746, 5927) | **Schlusszählung**: entfernte Steine, Gefangene, Endstand, SGF |
| `zaehlVorschau` (Z. 721, ruft `toteSteineAmEnde` in Z. 735) im Hauptthread (Z. 6511) | **Anzeige** der Zählvorschau |
| `passNachGegnerpassPruefung` (Z. 5207 ff.; sie ruft `zaehlVorschau` in Z. 5214, die Prüfung selbst wird in `getAIMove`, Z. 5232, aufgerufen) im Worker | nur wirksam, wenn `passNachGegnerpass` = 1; Standard 0, die Passregel bleibt aus |

**Bei Schalter aus bleibt das Verhalten bitgleich** (Pflicht, §7 Nr. 3). Die Umsetzung ändert sonst nichts: keine Änderung an `AUGE_GROSS`, `OFFEN_GROSS`, der Verbandsbildung, `augeTeilbar` oder der Benson-Rechnung.

**Inhalt bei Schalter an (Vorschlag):** Eine Region mit genau einem Punkt zählt nur dann als Auge (`V.augen++`), wenn `_diagIsTrueEye(b, punkt, farbe)` sie bestätigt (`b` ist das Brett ohne die zu diesem Zeitpunkt als tot geführten Steine, wie in der Test-Kopie der Diagnose). Regionen mit zwei oder mehr
Punkten bleiben unverändert (dort ist die Diagonalregel nicht definiert). Das entspricht der Test-Kopie `gegenprobe.js --variante diagonalauge`.

## 3. Entwicklungsdaten und Prüfdaten

### 3.1 Entwicklungsdaten (bereits benutzt)

Die **563 Anfangsstellungen der Stufe C** (`docs/daten/passregel-vergleich/stufe-c-42331033107/`) mit allen daraus entstandenen Ausgaben (`docs/daten/zaehlung-mechanismus/`, einschließlich der 18 V-Stellungen, der 15 Stellungen mit Zählabweichung und der vier Restfälle)
sind **Entwicklungsdaten**: An ihnen wurde die Auffälligkeit gefunden und die Gegenprobe gewählt. Sie dienen dem Entwurf von Tests, der Fehlersuche in der Umsetzung und der Konsistenzkontrolle (§7 Nr. 4). **Sie sind kein Nachweis der Wirkung.**
Ihre Ergebnisse (544 unverändert, 19 besser, 0 schlechter, 394 geänderte Steine) werden in der Prüfung nicht wiederverwendet oder mitgezählt.

Dass `diagonalauge-je-stellung.js` in der abgelegten Fassung nach dem Ablegen nicht erneut ausgeführt wurde (`docs/zaehlung-mechanismus.md` §12.1), ist **keine Voraussetzung** dieser Festlegung: Sie stützt sich auf die gespeicherten Ausgaben der Entwicklungsdaten und prüft die Wirkung ausschließlich an Prüfdaten.

### 3.2 Prüfdaten (bisher unbenutzt)

**Quelle:** die archivierten Partien derselben Gruppen wie in `docs/passregel-vergleich.md` §3 (GNU Go ohne Vorgabe, Fuego 100 Spiele, Fuego 50 Spiele, alte PWA; alle ohne Vorgabe, Komi 7,5), **ohne jede Partie, aus der eine der 563 Einheiten stammt** (Schlüssel Gruppe|Datei|Partienummer; die Schnittmenge muss leer sein und wird geprüft, §7 Nr. 1).
Es gelten dieselben Ausschlüsse wie dort (abgebrochene Partien, ohne `zuege` oder `wirFarbe`, mit Vorgabe oder Komi ≠ 7,5), wiederum gezählt. Handpartien (`tests/stellungen/hand-*.sgf`) gehen nicht in die Hauptauswertung ein; **Entscheidung offen:** ob sie als getrennt berichtetes Zusatzmaterial für die Schlusszählung dienen.

**Ehrliche Grenze:** Die Prüfdaten sind bei den Stellungen unbenutzt, stammen aber aus denselben Archiven (gleiche Gruppen, teils gleiche Engine-Stände und Gegner). Sie sind keine unabhängige Verteilung; der Befund gilt für diese Archivpartien und Gegner, nicht für Menschen.

**Zwei Stellungsarten, immer getrennt berichtet:**
- **S, Schlusszählung:** die **Endstellung** jeder regulär beendeten Partie (zwei Pässe; nicht Aufgabe, nicht Zuglimit; ob das Archiv das unterscheidet, klärt Schritt 0). Gemessen wird, was `resolveLifeAndDeath` bei Schalter aus und an entfernt, und der daraus folgende Endstand. Der Endstand von GNU Go (`final_score`) steht je Partie im Archiv (`endstand`).
- **V, Zählvorschau:** je Partie die Stellungen nach den Zügen mit den Indizes **250, 300 und 350**, soweit die Partie so lang ist (**Setzung**, orientiert an den Indizes 294 bis 449 der Entwicklungsstellungen der 15 Zählabweichungen und 18 V-Fälle). Gemessen wird `zaehlVorschau` (Fläche und Territory, beide Stände „mit Annahmen“ und „nur Bewiesenes“) bei Schalter aus und an.
  Die Stellungen sind nicht nach einer Auslösung der Passregel gewählt (Unbenutzte Partien sind genau die, in denen sie nie ausgelöst hat; eine Auswahl nach Auslösung wäre verzerrt).

**Ziehung und Umfang:** Alle Prüfdaten-Partien werden in Stufe 1 (§4) ausgewertet; es gibt keine Stichprobe vorab. **Schritt 0 vor jeder Rechnung:** Zahl der Partien je Gruppe, Zahl der Stellungen je Art, Vorhandensein von `zuege`, `endstand` und der Angabe über das Spielende;
fehlt etwas, ist die betroffene Auswertung „nicht auswertbar“ und wird gezählt.

## 4. Ablauf der Prüfung (nach Go, nicht jetzt)

**Stufe 1, ohne GNU Go (deterministisch, lokal oder Actions):** Je Prüfstellung Tot-Menge und Zählstände bei Schalter aus und an. Ergebnis: die Menge der **betroffenen** Stellungen (Tot-Menge bei an gleich aus: unbetroffen) und die **Betroffenheit** (Anteil je Gruppe und Stellungsart).
Auf unbetroffenen Stellungen kann der Schalter weder beheben noch verschlechtern; sie brauchen keine GNU-Referenz.

**Stufe 2, GNU Go in GitHub Actions (nur nach eigenem Go):** GNU Gos Tot-Liste (`final_status_list dead`, plus `final_score` bei S) für **alle betroffenen Stellungen**, nach dem Muster der Zähldiagnose (Einspielen der Archivzüge, zweimal in frischen Prozessen mit gleichem Seed, Version protokolliert, `docs/passregel-zaehldiagnose.md`).
Zusätzlich für eine **Kontrollstichprobe unbetroffener Stellungen** (**Setzung:** gleiche Anzahl wie betroffene, feste Ziehung nach Hash aus Seed und Schlüssel), damit die Übereinstimmung der Referenz mit der App auch dort sichtbar ist (z. B. bleibende Abweichungen unabhängig vom Schalter).

**Stufe 3, Beurteilung der Richtigkeit (§6):** blind, an einer Auswahl der betroffenen Stellungen.

Jede Stufe hat ein eigenes Go. Ein Ergebnis einer Stufe ist kein Go für die nächste.

## 5. Kennzahlen: Übereinstimmung mit GNU Go (Schicht A)

Schicht A misst nur die **Übereinstimmung mit GNU Gos Tot-Liste**. Sie sagt nichts darüber, wer recht hat. Immer getrennt nach S und V und nach Gruppe berichtet, mit den Zahlen **behoben** und **neu entstanden getrennt, nie nur als Saldo**:

| Kennzahl | Definition |
|---|---|
| behoben (Steine) | Steine, die bei aus von GNU Go abweichen und bei an übereinstimmen |
| neu entstanden (Steine) | Steine, die bei aus übereinstimmen und bei an abweichen |
| unverändert abweichend | Steine, die bei aus und an abweichen |
| Stellungsebene | Stellungen mit mindestens einem behobenen / mindestens einem neu entstandenen Stein / beides (gemischt) / ohne Änderung der Abweichung |
| Richtung | Steine „zusätzlich tot“ (bei an tot, bei aus lebend) und „wieder lebendig“, je mit behoben/neu entstanden |
| Betroffenheit | Anteil betroffener Stellungen an allen Prüfstellungen (Stufe 1) |
| Punkte (S) | Endstand bei aus und an gegen GNU Gos `final_score`: Fläche, und Territory (App-Rechnung auf GNU Gos Tot-Liste, `docs/passregel-vorsprung.md` §2) |
| Punkte (V) | Stand der Vorschau („mit Annahmen“ und „nur Bewiesenes“) bei aus und an gegen den Stand aus GNU Gos Tot-Liste |

Die Nettozahl (behoben minus neu entstanden) darf nur **zusätzlich** zu beiden Zahlen genannt werden: Steine können in beide Richtungen wechseln (`docs/zaehlung-mechanismus.md` §12.4).
Anteile mit Clopper-Pearson (95 %), wie in CLAUDE.md. Die Stellungen sind nicht unabhängig voneinander im Sinn eines Zufallsmodells; Intervalle sind Modellannahmen und stehen als solche im Bericht.

## 6. Tatsächliche Richtigkeit (Schicht B), getrennt von Schicht A

Übereinstimmung mit GNU Go ist **nicht** Richtigkeit. GNU Go kann bei Seki, Ko, unausgespielten Stellungen und umstrittenen Gruppen anders urteilen, als es die Regeln verlangen; der Referenzstand ist der Maßstab der Messung und nicht die Wahrheit (`docs/passregel-vorsprung.md` §9).
Schicht B beurteilt deshalb eine Auswahl der betroffenen Stellungen **unabhängig vom Urteil von GNU Go und von der App**.

**Auswahl (Setzung):** alle betroffenen Ketten, die in Stufe 2 bei aus oder an von GNU Go abweichen, höchstens **60 Ketten** (feste Ziehung nach Hash aus Seed und Schlüssel, geschichtet nach S und V und nach Richtung); wären es weniger, werden alle beurteilt.
**Entscheidung offen:** Zahl und Schichtung.

**Beurteilung (blind):** Jede Kette wird mit der Stellung (Brett, Kette markiert, Spielende oder Zugindex) in zufälliger Reihenfolge vorgelegt, **ohne Angabe, wer sie wie bewertet** (App aus, App an, GNU Go). Kategorien, vorab festgelegt: **lebendig**, **tot**, **Seki**, **Ko oder abhängig vom nächsten Zug**,
**nicht entscheidbar**. Pro Kette eine kurze Begründung nach Regelkriterien (zwei echte Augen nach der Diagonalregel, Benson, falsche Augen, fehlende Freiheiten). **Entscheidung offen:** wer beurteilt (Vorschlag: Hazeberry; eine zweite, getrennte Beurteilung eines Teils zur Übereinstimmung der Beurteiler)
und ob ein zweites Programm als zusätzliche Meinung dient (Fuego, ob dort eine Tot-Liste verfügbar ist, ist **nicht geprüft**).

**Kennzahlen Schicht B** (nur für die beurteilten Ketten, getrennt von Schicht A):
- Anzahl und Anteil, in denen **App an** mit dem blinden Urteil übereinstimmt, **App aus** übereinstimmt, **GNU Go** übereinstimmt.
- **R+** (aus falsch, an richtig), **R−** (aus richtig, an falsch), beide gleich richtig, beide falsch, nicht entscheidbar. R+ und R− getrennt, nie nur Saldo.
- Fälle, in denen GNU Go und das blinde Urteil abweichen, werden einzeln aufgeführt.

Aussagen zur Richtigkeit gelten **nur für die beurteilten Ketten**. Sie werden nicht auf unbeurteilte Ketten hochgerechnet, außer die Ziehung war eine Zufallsziehung (dann mit Intervall und Hinweis auf die Annahmen).

## 7. Gültigkeit, Kontrollen

**Gültigkeit (nur zwei Zustände):** Eine Stufe ist gültig oder ungültig. Ungültig heißt **„kein Urteil“ mit Grund**, und der Lauf wird rot. Pflichtprüfungen:

1. **Daten (Schritt 0):** Prüfdaten vollständig im Sinn von §3.2; Schnittmenge mit den 563 Quellpartien leer; Zahl der Partien und Stellungen je Gruppe berichtet.
2. **Nachspiel-Kontrolle:** Die Archivzüge sind einspielbar und ergeben das gespeicherte Endbrett und die gespeicherten Gefangenen (soweit gespeichert); bei Stufe 2 stimmt GNU Gos Brett mit dem der App überein (`list_stones` beider Farben).
3. **Identitätskontrolle Schalter aus (bitgleich):** Bei Schalter aus ist die Tot-Menge in **jeder** Prüfstellung gleich der der **unveränderten Fassung** (Stand `main` vor der Umsetzung, in eigenem Prozess; „gleich“ erst nach Vorprüfung der Fallabdeckung, sonst „KEIN URTEIL“).
   Zusätzlich vor der Umsetzung festzulegen und im Test einzufrieren: Referenzwerte der unveränderten Fassung auf Zufallsbrettern und den Stellungen unter `tests/stellungen/`, erzeugt **vor** der Änderung. Engine-Vergleiche alter gegen neuer Stand laufen nur in Actions (`engine-vergleich.yml`) und nur nach Go.
4. **Konsistenzkontrolle gegen die Diagnose:** Bei Schalter an stimmt die Tot-Menge der Umsetzung auf den **563 Entwicklungsstellungen** mit der der Test-Kopie (`gegenprobe.js --variante diagonalauge`) überein; sonst weicht die Umsetzung von dem ab, was diagnostiziert wurde (kein Urteil, bis geklärt).
5. **GNU-Go-Lauf (Stufe 2):** Version protokolliert, Rohantworten zweier Läufe gleich, Ausfälle gezählt; die Ausfallregel (Obergrenze für Ausfälle) legt Hazeberry vor dem Lauf fest (**Entscheidung offen**; Vorschlag wie bei den Fuego-Messungen).
6. **Beurteilung (Stufe 3):** Reihenfolge zufällig, Herkunft verdeckt, Kategorien vorab, Begründung je Kette; die Zuordnung der Urteile zu App und GNU Go wird erst nach Abschluss aller Urteile aufgedeckt.
7. **Mindestzahl betroffener Stellungen:** Für ein Urteil über die Kandidatur (§8) mindestens **30** betroffene Stellungen je Stellungsart (**Setzung**). Weniger heißt „kein Urteil: zu wenig Betroffene“, nicht „unbedenklich“; über eine Erweiterung der Prüfdaten entscheidet Hazeberry.

## 8. Entscheidungsregel (Vorschlag, Setzungen)

Das Ergebnis ist ein **Befund, kein Go und keine Aktivierung**. Der Schalter bleibt aus. Er wird als Kandidat für einen Standardwechsel nur dann weiterverfolgt, wenn **alle** gelten (die Zahlen sind Setzungen, **Entscheidung offen**):

1. Alle Pflichtprüfungen aus §7 bestanden (insbesondere bitgleich bei aus).
2. **R− = 0** unter den blind beurteilten Ketten (mindestens 20 beurteilte, **Setzung**); Fälle mit R− > 0 werden einzeln besprochen und entscheiden gegen eine Kandidatur, solange sie nicht als Fehler der Beurteilung geklärt sind.
3. **Neu entstandene Abweichungen gegenüber GNU Go** (Schicht A) werden **einzeln angesehen** (Stufe 3 bezieht sie ein); solange ein neu entstandener Fall nicht als richtig im Sinn von Schicht B eingeordnet oder als GNU-Go-Fehler belegt ist, bleibt es bei „nicht ausgeschlossen“.
4. Die Wirkung auf den **Endstand** (S) ist berichtet, einschließlich der Fälle, in denen sich der Sieger ändert.

Ein Standardwechsel bräuchte danach eine **eigene Vorabfestlegung** (mit Umfang für Spielstärke und Bedienung, nicht nur Zählung) und ein Go. Eine Folge für das Spielgefühl ist eine Hypothese, bis sie gemessen ist. Die Restfälle der Entwicklungsdaten (große Verbände mit Benson-Kette, Rest von zwei Steinen bei `212|337`) bleiben von dieser Änderung unberührt oder nicht erklärt; die Festlegung verspricht dafür nichts.

## 9. Umsetzung (nicht Teil dieses Entwurfs)

Erst nach Freigabe dieses Docs und einem eigenen Go: Referenzwerte der unveränderten Fassung erzeugen und einfrieren; Parameter und Schalter (Standard aus); Aufrufer durchreichen; Tests (aus gleich wie vorher; an: konstruierte Stellungen mit falschem und echtem Ein-Punkt-Auge, Kante und Ecke, Verbände,
iterative Entfernung); Browser-Test für Schlusszählung und Dashboard bei aus unverändert; Doc. Danach getrennt: Stufe 1, Stufe 2, Stufe 3, je eigenes Go. Ablauf je Schritt nach CLAUDE.md: Vorabfestlegung (dieses Doc) → PR → grüne CI → Merge.

## 10. Offene Entscheidungen für Hazeberry

1. Schalter: Name `diagonalAugeEnde`, Ort (Parameter von `toteSteineAmEnde` mit Durchreichen durch die Aufrufer, wie vorgeschlagen).
2. Prüfdaten: Zugindizes 250, 300, 350 für V; Umfang; Handpartien als Zusatzmaterial ja oder nein.
3. Kontrollstichprobe der unbetroffenen Stellungen (Größe), Ausfallregel für Stufe 2.
4. Schicht B: Zahl der beurteilten Ketten (60), Beurteiler, zweite Beurteilung, ob ein zweites Programm als Meinung dient.
5. Schwellen in §7 Nr. 7 und §8 (30, 20, R− = 0).

## 11. Freigaben

Dieses Doc enthält Vorgaben für die KI-Assistenten; Hazeberry liest es vor dem Merge. Es erteilt kein Go für die Umsetzung, Läufe, Engine-Vergleiche, Änderungen des Standards oder Merges. Die 15 Zählabweichungen bleiben ein getrenntes Vorhaben.
