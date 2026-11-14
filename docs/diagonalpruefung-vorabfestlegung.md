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

**Frage dieser Vorabfestlegung:** Wie wirkt die Diagonalprüfung auf **neuen** Stellungen, getrennt für die Schlusszählung und für die Zählvorschau, und wie unterscheiden sich dort **Übereinstimmung mit GNU Go** und **unabhängige Beurteilung** (ohne Anspruch auf eine Ground Truth)? Ob der Schalter jemals Standard wird, ist **nicht** Gegenstand; das wäre eine eigene Festlegung mit eigenem Go.

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

**Stufe 3, unabhängige Beurteilung (§6):** blind; **alle** neu entstandenen Abweichungen (B1) und eine Stichprobe der übrigen betroffenen Ketten (B2). Sie beginnt erst, wenn Beurteiler benannt sind und zugesagt haben (§6.3).

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

## 6. Unabhängige Beurteilung (Schicht B), getrennt von Schicht A

Übereinstimmung mit GNU Go ist **nicht** Richtigkeit. GNU Go kann bei Seki, Ko, unausgespielten Stellungen und umstrittenen Gruppen anders urteilen, als es die Regeln verlangen; der Referenzstand ist der Maßstab der Messung und nicht die Wahrheit (`docs/passregel-vorsprung.md` §9).
Eine **Ground Truth gibt es hier nicht**; auch ein menschliches Urteil ist keine. Schicht B liefert deshalb **Beurteilungen mit Begründung und Unsicherheit**, nicht „die Richtigkeit“. Sie beurteilt Ketten **unabhängig vom Urteil von GNU Go und von der App**: die neu entstandenen Abweichungen **vollständig** und eine Stichprobe der übrigen betroffenen Ketten.

### 6.1 Auswahl der zu beurteilenden Ketten

- **B1, alle neu entstandenen Abweichungen:** jede Kette, die bei aus mit GNU Go übereinstimmt und bei an abweicht (Schicht A „neu entstanden“), in S und V. **Vollständig, ohne Deckel.** B1 wird nie gekürzt, um den Aufwand zu begrenzen. Ist der Aufwand nicht tragbar, ist das eine Entscheidung von Hazeberry
  (Prüfdaten verkleinern oder Prüfung abbrechen), kein stilles Kürzen.
- **B2, übrige Stichprobe:** Ketten aus betroffenen Stellungen, die bei an mit GNU Go übereinstimmen und bei aus abweichen („behoben“), und solche, die bei aus und an abweichen. **Nur hier gilt der Deckel von 60 Ketten** (**Setzung**; feste Ziehung nach Hash aus Seed und Schlüssel, geschichtet nach S und V, Richtung und
  behoben/unverändert abweichend); wären es weniger, werden alle beurteilt. B2 dient dazu, **bestätigte Verbesserungen (R+)** festzustellen und die Beurteilung zu kalibrieren.

### 6.2 Unterlage für die Beurteilung

Ein Brettbild allein reicht nicht, wenn Ko oder zugabhängiges Leben im Spiel ist. Je Kette liegt eine Unterlage vor mit:
- Brett (Textdiagramm mit Koordinaten), die zu beurteilende Kette markiert, und die **vollständige Zuggeschichte als SGF** (alle Züge der Partie bis zur Stellung, mit Pässen). Für Superko reichen die letzten zehn Züge nicht immer; die Beurteilung kann sich auf frühere Stellungen der Partie stützen;
- Stellungsart (S oder V), ob die Partie zu Ende ist, Zugindex;
- **Zugfarbe** (wer als Nächstes am Zug wäre) und **Vorgeschichte** als Kurzansicht: die letzten 10 Züge mit Farbe und Koordinate (die vollständige Geschichte steht im SGF), die Passfolge (wer zuletzt passte, wie viele Pässe in Folge), der aktuelle Ko-Punkt (falls vorhanden), der Gefangenenstand.

**Antwortbogen** (fester Aufbau, je Unterlage): Kategorie **lebendig**, **tot**, **Seki**, **Ko oder zugabhängig** (dann zusätzlich das Urteil bei Zug von Schwarz und bei Zug von Weiß), **nicht entscheidbar**; dazu eine **Begründung** nach allgemeinen Go-Kriterien (echte und falsche Augen, Benson, Freiheiten, Seki, Ko) und die **Sicherheit des Urteils** (sicher, eher sicher, unsicher) mit der Angabe, was offen bleibt.
Die Unterlagen werden in zufälliger Reihenfolge mit Zufalls-ID vorgelegt, **ohne Angabe, wer sie wie bewertet** (App aus, App an, GNU Go); die Zuordnung wird erst nach Abschluss aller Urteile aufgedeckt. Das Werkzeug, das Unterlagen und Antwortbogen erzeugt, gehört zu Stufe 3 (eigene Umsetzung, eigenes Go).

### 6.3 Wer beurteilt: nicht festgelegt, Voraussetzung für Stufe 3

Im Entwurf ist **niemand eingeteilt**. Stufe 3 beginnt erst, wenn Beurteiler **benannt sind und zugesagt haben**; vorher wird der Aufwand genannt (Zahl der Unterlagen in B1 und B2, geschätzte Zeit je Unterlage). Ohne benannten Beurteiler gibt es **keine Beurteilung**, nur Schicht A.
**Beurteilungen werden nach Beurteilergruppe getrennt geführt und berichtet** (KI und Mensch), jeweils mit Begründung und Unsicherheit. Dass ein Mensch beurteilt, macht das Urteil **nicht zur Ground Truth**.
**Entscheidung offen** (Empfehlung: §10.4), möglich sind (Aufwand und Aussagekraft sind verschieden):
- ein Mensch, der zugesagt hat; Hazeberry nur, wenn er das möchte;
- eine **getrennte KI-Beurteilung** in einer eigenen Sitzung, die nur die Unterlagen bekommt und die Herkunft nicht kennt; sie wird als **KI-Beurteilung** berichtet;
- beides; auf gemeinsam beurteilten Unterlagen wird die Übereinstimmung beider ausgewiesen, **Widersprüche gelten als ungeklärt**.

Ob ein zweites Programm (Fuego) als zusätzliche Meinung dient, hängt davon ab, ob dort eine Tot-Liste verfügbar ist; das ist **nicht geprüft**.

### 6.4 Kennzahlen Schicht B

Nur für die beurteilten Ketten, getrennt für B1 und B2 und von Schicht A. **Berichtet werden Beurteilungen, keine Wahrheit**, jeweils mit Begründung und Unsicherheit.
- **Je Beurteilergruppe getrennt** (KI, Mensch): Zahl der Urteile, Verteilung der Kategorien und der Sicherheit, Anteil, in dem **App an**, **App aus** und **GNU Go** mit dem Urteil übereinstimmen.
- **Zwischen den Gruppen:** Übereinstimmung von KI und Mensch auf gemeinsam beurteilten Unterlagen (Zahl, Anteil, einzelne Abweichungen).
- **Zählregeln für die Entscheidungsregel (§8):**
  - **R−** (aus richtig, an falsch) zählt **konservativ**: Schon eine **entschiedene, nicht unsichere** Beurteilung mit diesem Ergebnis genügt.
  - **R+ bestätigt** (aus falsch, an richtig) zählt nur, wenn **alle** vorliegenden Beurteilungen der Unterlage **entschieden, nicht unsicher und übereinstimmend** dieses Ergebnis haben.
  - **Ungeklärt** sind: Seki, Ko oder zugabhängig ohne einheitliches Urteil, nicht entscheidbar, unsicher, **Widerspruch zwischen Beurteilern** und ungeklärte Ausfälle der Stufe 2 (§10.3). R+ und R− werden getrennt berichtet, nie nur als Saldo.
- **Bestätigte Unbedenklichkeit** gilt nur für Fälle mit entschiedenen, nicht unsicheren und übereinstimmenden Beurteilungen, in denen App an mit ihnen übereinstimmt. **Ungeklärte Fälle zählen nicht als bestätigte Unbedenklichkeit.** Ihre Zahl wird getrennt genannt.
- Fälle, in denen GNU Go und eine Beurteilung abweichen, werden einzeln aufgeführt.

Aussagen gelten **nur für die beurteilten Ketten** und nur als Beurteilungen. B1 ist vollständig; B2 ist eine Ziehung, Hochrechnungen nur mit Intervall und Hinweis auf die Annahmen.

## 7. Gültigkeit, Kontrollen

**Gültigkeit (nur zwei Zustände):** Eine Stufe ist gültig oder ungültig. Ungültig heißt **„kein Urteil“ mit Grund**, und der Lauf wird rot. Zwei Arten von Störung sind **getrennt** zu behandeln:
- **Pflichtfehler machen die Stufe ungültig:** Datenfehler (fehlende oder unzulässige Felder), Replay-Fehler (Archivzug nicht einspielbar oder von GNU Go abgelehnt, Endbrett oder Gefangene weichen vom Archiv ab, Bretter von App und GNU Go weichen ab), Werkzeugfehler (unerwartete Ausnahme) und nicht bestandene Kontrollen (Nr. 3 und 4).
- **Ausfälle** sind nur technische Ausfälle der Referenz (Absturz von GNU Go, Timeout, protokollkonforme Antwort ohne Ergebnis wie „cannot score“). Sie werden nach der Ausfallregel (§10.3) behandelt und nie als Pflichtfehler umgedeutet oder umgekehrt.

Pflichtprüfungen:

1. **Daten (Schritt 0):** Prüfdaten vollständig im Sinn von §3.2; Schnittmenge mit den 563 Quellpartien leer; Zahl der Partien und Stellungen je Gruppe berichtet.
2. **Nachspiel-Kontrolle:** Die Archivzüge sind einspielbar und ergeben das gespeicherte Endbrett und die gespeicherten Gefangenen (soweit gespeichert); bei Stufe 2 stimmt GNU Gos Brett mit dem der App überein (`list_stones` beider Farben). Ein Verstoß ist ein **Pflichtfehler** (Stufe ungültig), **kein Ausfall**.
3. **Identitätskontrolle Schalter aus (bitgleich):** Bei Schalter aus ist die Tot-Menge in **jeder** Prüfstellung gleich der der **unveränderten Fassung** (Stand `main` vor der Umsetzung, in eigenem Prozess; „gleich“ erst nach Vorprüfung der Fallabdeckung, sonst „KEIN URTEIL“).
   Zusätzlich vor der Umsetzung festzulegen und im Test einzufrieren: Referenzwerte der unveränderten Fassung auf Zufallsbrettern und den Stellungen unter `tests/stellungen/`, erzeugt **vor** der Änderung. Engine-Vergleiche alter gegen neuer Stand laufen nur in Actions (`engine-vergleich.yml`) und nur nach Go.
4. **Konsistenzkontrolle gegen die Diagnose:** Bei Schalter an stimmt die Tot-Menge der Umsetzung auf den **563 Entwicklungsstellungen** mit der der Test-Kopie (`gegenprobe.js --variante diagonalauge`) überein; sonst weicht die Umsetzung von dem ab, was diagnostiziert wurde (kein Urteil, bis geklärt).
5. **GNU-Go-Lauf (Stufe 2):** Version protokolliert; je Stellung zwei Referenzläufe mit **demselben Seed**, deren Rohantworten Zeichen für Zeichen gleich sein müssen (§10.3); Ausfälle einzeln gezählt; die Ausfallregel (Obergrenze für Ausfälle) legt Hazeberry vor dem Lauf fest (**Entscheidung offen**; Empfehlung: §10.3).
6. **Beurteilung (Stufe 3):** Beurteiler benannt und zugesagt (§6.3); Unterlagen nach §6.2 (mit Zugfarbe und Vorgeschichte); Reihenfolge zufällig, Herkunft verdeckt, Kategorien vorab, Begründung und Sicherheit je Urteil; **B1 vollständig beurteilt**; die Zuordnung der Urteile zu App und GNU Go wird erst nach Abschluss aller Urteile aufgedeckt. Fehlt ein benannter Beurteiler oder ist B1 nicht vollständig beurteilt, ist Stufe 3 ungültig (kein Urteil).
7. **Mindestumfang betroffener Stellungen:** Für ein Urteil über die Kandidatur (§8) mindestens **30** betroffene Stellungen je Stellungsart (**Setzung**). Das ist ein Mindestumfang **für die Kandidatur**, **kein Sicherheitsnachweis**: Das Erreichen der Zahl belegt keine Unbedenklichkeit. Bei weniger Betroffenen wird **trotzdem beschrieben, was gefunden wurde** (Zahlen, Fälle, Beurteilungen); nur die **Kandidatur bleibt offen** („kein Urteil über die Kandidatur: zu wenig Betroffene“), nicht „unbedenklich“. Über eine Erweiterung der Prüfdaten entscheidet Hazeberry.

## 8. Entscheidungsregel (Vorschlag, Setzungen)

Das Ergebnis ist ein **Befund, kein Go und keine Aktivierung**. Der Schalter bleibt aus. Der Ausgang ist entweder **„positive Kandidatur“** oder **„keine positive Kandidatur“** (mit Gründen). Eine positive Kandidatur verlangt **alle** der folgenden Punkte (Zahlen sind Setzungen, **Entscheidung offen**):

1. Alle Pflichtprüfungen aus §7 bestanden (insbesondere bitgleich bei aus).
2. **Bestätigter Nutzen:** mindestens **R+ ≥ 1** im Sinn von §6.4 (die Mindestzahl ist **Entscheidung offen**; ohne bestätigte Verbesserung folgt **keine positive Kandidatur**, auch nicht bei R− = 0).
3. **R− = 0** im Sinn von §6.4 (konservativ gezählt: schon eine entschiedene, nicht unsichere Beurteilung genügt); Fälle mit R− > 0 werden einzeln besprochen und sprechen gegen eine Kandidatur, solange sie nicht als Fehler der Beurteilung geklärt sind.
4. **Alle B1-Fälle entschieden und alle betroffenen Stellungen ausgewertet:** Jede neu entstandene Abweichung gegenüber GNU Go ist beurteilt und entweder als „App an stimmt mit allen vorliegenden Beurteilungen überein (entschieden, nicht unsicher, übereinstimmend)“ eingeordnet oder im Sinn der Beurteilungen als GNU-Go-Fehler belegt.
   **Ungeklärte Fälle** (Seki, Ko oder zugabhängig ohne einheitliches Urteil, nicht entscheidbar, unsicher, Widerspruch zwischen Beurteilern) und **ungeklärte Ausfälle** der Stufe 2 in betroffenen Stellungen (§10.3) zählen **nicht** als bestätigte Unbedenklichkeit und verhindern die positive Kandidatur, **auch wenn ihr Anteil klein bleibt**; es gibt dafür keine Prozentgrenze.
5. Die Wirkung auf den **Endstand** (S) ist berichtet, einschließlich der Fälle, in denen sich der Sieger ändert.

**Mindestumfang:** Wird er nicht erreicht (§7 Nr. 7), wird der Befund trotzdem beschrieben; die Kandidatur bleibt dann offen.

**Wortlaut:** Eine positive Kandidatur heißt nur, dass in **dieser Prüfmenge** (ausgewählte Archivpartien, §3.2) nichts Gegenteiliges gefunden wurde. Sie heißt nicht „unbedenklich“. Die Zahlen 30 (§7 Nr. 7) und die Mindestzahl für R+ sind Setzungen ohne Sicherheitswert.

Ein Standardwechsel bräuchte danach eine **eigene Vorabfestlegung** (mit Umfang für Spielstärke und Bedienung, nicht nur Zählung) und ein Go. Eine Folge für das Spielgefühl ist eine Hypothese, bis sie gemessen ist. Die Restfälle der Entwicklungsdaten (große Verbände mit Benson-Kette, Rest von zwei Steinen bei `212|337`) bleiben von dieser Änderung unberührt oder nicht erklärt; die Festlegung verspricht dafür nichts.

## 9. Umsetzung (nicht Teil dieses Entwurfs)

Erst nach Freigabe dieses Docs und einem eigenen Go: Referenzwerte der unveränderten Fassung erzeugen und einfrieren; Parameter und Schalter (Standard aus); Aufrufer durchreichen; Tests (aus gleich wie vorher; an: konstruierte Stellungen mit falschem und echtem Ein-Punkt-Auge, Kante und Ecke, Verbände,
iterative Entfernung); Browser-Test für Schlusszählung und Dashboard bei aus unverändert; Doc. Danach getrennt: Stufe 1, Stufe 2, Stufe 3, je eigenes Go. Ablauf je Schritt nach CLAUDE.md: Vorabfestlegung (dieses Doc) → PR → grüne CI → Merge.

## 10. Entscheidungen, mit Empfehlung

**Status:** Empfehlungen von Claude, damit aus dem Entwurf ein ausführbarer Plan wird. **Die Entscheidung bleibt bei Hazeberry**; kein Wert gilt, bevor er bestätigt oder geändert ist. Alle Zahlen sind **Setzungen** und kein Sicherheitsnachweis.
**Regel zur Reihenfolge:** Alle Festlegungen für Stufe 3 (Auswahl, Deckel, Beurteiler, Kategorien) werden **vor Stufe 2** getroffen, damit sie nicht von Ergebnissen der Schicht A abhängen. Was erst nach Stufe 1 sinnvoll feststeht, steht mit seinem Entscheidungszeitpunkt dabei (§11).

### 10.1 Schalter: Name und Ort

- **Empfehlung:** `PARAMS.diagonalAugeEnde` (0 oder 1, Standard 0). `toteSteineAmEnde(board, augeGross, offenGross, diagAuge = false)` bekommt den Wert als vierten Parameter; die Aufrufer reichen `PARAMS.diagonalAugeEnde >= 1` durch (bei den beiden ersten Parametern `undefined`, damit deren Standardwerte gelten;
  `zaehlVorschau` über `opt.diagonalAuge`).
- **Begründung:** Die gemeinsame Spiellogik bleibt frei von `PARAMS` (sie liest dort nur die Konstanten `AUGE_GROSS` und `OFFEN_GROSS`), die Funktion bleibt direkt testbar, und jeder Aufrufer entscheidet sichtbar. Dasselbe Muster wie `passNachGegnerpass` (PARAMS, Dashboard-Zeile mit Schritt 1, Bereich 0 bis 1).
- **In der Umsetzung zu prüfen (nicht entschieden):** wie `PARAMS` an den Worker gelangen; dass gespeicherte Dashboard-Werte ohne den neuen Schlüssel auf 0 fallen; ob es außer den drei Aufrufern aus §2 weitere gibt (vollständige Suche).
- **Alternative:** Optionsobjekt statt vierten Parameters; größerer Eingriff in die Signatur, deshalb nicht empfohlen.
- **Zeitpunkt:** vor AP2 (§11).

### 10.2 Prüfdaten

- **Umfang, Empfehlung:** **alle** bisher unbenutzten Partien, keine Stichprobe. Begründung: Stufe 1 ist deterministisch und billig (die Rechnung über 563 Stellungen brauchte in der Diagnose unter einer Sekunde); mehr Partien heißt mehr betroffene Stellungen. Höchstens **2197** Partien
  (2760 aus Stufe A minus 563 Quellpartien; nach Abzug unbrauchbarer Partien weniger), nach den Zahlen aus Stufe A etwa GNU Go ohne Vorgabe 958, Fuego 100 Spiele 435, Fuego 50 Spiele 643, alte PWA 161. **Schritt 0 zählt die tatsächlichen Zahlen.**
  Die Gruppen werden getrennt berichtet und nicht gewichtet. In Stufe A hat die GNU-Go-Gruppe kaum ausgelöst (2 von 960) und die V-Fälle stammten aus den Fuego-Gruppen; die Betroffenheit kann also je Gruppe stark verschieden sein.
- **Zugindizes für V, Empfehlung:** 250, 300 und 350 beibehalten, dazu die Endstellung für S. Begründung: Sie decken den Bereich 294 bis 449 der Entwicklungsstellungen ab und sind vor jeder Sicht auf Prüfergebnisse festgelegt. Schritt 0 berichtet die Längenverteilung der Partien; die Indizes werden **vor Stufe 1 festgeschrieben** und danach nicht nachjustiert.
- **Handpartien, Empfehlung:** ja, aber nur als **getrennter, illustrativer Absatz** (die sechs SGF `tests/stellungen/hand-*.sgf`, nur S, ohne Statistik). Begründung: Es sind die einzigen Partien gegen einen Menschen, und die Hauptauswertung gilt ausdrücklich nicht für Menschen; sie dienen nur als Blick auf reale Endstellungen. Bei „nein“ entfällt nichts Tragendes.
- **Unsicherheit:** Die Betroffenheit ist unbekannt. In den Entwicklungsdaten waren es 19 von 563 Stellungen (3,4 %), an Auslösestellungen; das ist **nicht** übertragbar. Stufe 1 liefert die Zahl. Liegt sie unter 30 betroffenen Stellungen je Stellungsart, wird der Befund trotzdem beschrieben (§7 Nr. 7); nur die Kandidatur bleibt offen („kein Urteil über die Kandidatur: zu wenig Betroffene“), und Hazeberry entscheidet über eine Erweiterung.
- **Zeitpunkt:** Indizes und Handpartien vor AP3; Erweiterung gegebenenfalls nach Stufe 1.

### 10.3 Kontrollstichprobe und Ausfallregel (Stufe 2)

- **Kontrollstichprobe, Empfehlung:** gleich viele unbetroffene Stellungen wie betroffene, mindestens 50 und höchstens 200 je Stellungsart, feste Ziehung nach Hash aus Seed und Schlüssel. Zweck: sichtbar machen, ob die Referenz auch dort Abweichungen zeigt, die mit dem Schalter nichts zu tun haben (z. B. Zählabweichungen der Art aus `docs/zaehlung-mechanismus.md` §5);
  sie misst nicht die Wirkung des Schalters. Die Obergrenze hält die GNU-Go-Arbeit überschaubar.
- **Pflichtfehler oder Ausfall, Empfehlung (getrennt):**
  - **Pflichtfehler → Stufe ungültig** (kein Urteil, Lauf rot): Daten-, Replay- und Werkzeugfehler nach §7, also nicht einspielbare Stellung oder abgelehnter Archivzug, abweichendes Brett, unzulässige Daten, unerwartete Ausnahme. Sie sind **kein Ausfall** und werden nicht gezählt, um sie unter eine Grenze zu bringen
    (wie in `docs/passregel-vergleich.md` §9 Nr. 5 und 6: unzulässige Daten und unerwartete Fehler im Werkzeug sind Pflichtfehler, nur technische Ausfälle sind Ausfälle).
  - **Ausfall:** Absturz von GNU Go (Signal; bei der Debian-Fassung 3.8 löst teils die **Stellung selbst** den Absturz aus, `gnugo-duell.js`), Timeout, oder eine protokollkonforme Antwort ohne Ergebnis („cannot score“).
- **Wiederholung, auf drei getrennten Ebenen:**
  1. **Automatischer Wiederholungsversuch innerhalb des Laufs:** Je Stellung zwei Referenzläufe R1 und R2, jeder in einem frischen GNU-Go-Prozess mit **demselben Seed S0** = `fortsetzungsSeed(Basis, Gruppe, Datei, Nr., Index)` aus `passregel-lib.js` (Basis wird vor AP4 festgeschrieben, Vorschlag 1 wie in der Zähldiagnose; Funktion und Seed im Test gebunden).
     **Genau ein** automatischer Wiederholungsversuch je Referenzlauf, nur nach Absturz oder Timeout, in frischem Prozess, mit **demselben Seed S0**; kein Seedwechsel, sonst wären R1 und R2 nicht vergleichbar, und ein anderer Seed hilft bei stellungsbedingten Abstürzen ohnehin nicht (`gnugo-duell.js`). Fällt der Referenzlauf auch im Versuch aus, ist die Stellung ein **ungeklärter Ausfall**.
  2. **Vergleich der beiden Referenzläufe:** Die Rohantworten von R1 und R2 (`final_status_list` je Kategorie, `final_score`, `captures`, `list_stones`) müssen **Zeichen für Zeichen gleich** sein, ungetrimmt, wie in der Zähldiagnose. Weicht eine Stellung ab, ist sie **nicht wiederholbar** und zählt als **ungeklärter Ausfall** (die Referenz ist dort unzuverlässig), nicht als Pflichtfehler;
     sie wird aufgelistet und fließt in die 5 %-Grenze ein. Viele solche Stellungen zeigen ein Problem von Referenz oder Umgebung; dann greift die 5 %-Grenze.
  3. **Fortsetzungslauf (später, nur mit Go):** wiederholt **ganze Pakete**, nie einzelne Stellungen, und nur bei **technisch bedingtem Nichtausführen** (Runner-Abbruch, Paket nicht gelaufen oder abgebrochen). Ein wiederholtes Paket **ersetzt** das erste vollständig; dessen Ergebnisse werden verworfen und der Wechsel im Bericht vermerkt. Pakete mit einzelnen Ausfällen werden **nicht** wiederholt, um Ausfälle loszuwerden.
- **Folgen von Ausfällen:** Jeder Ausfall wird einzeln mit Stellung, Gruppe, Art, Partielänge und dem Unterschied der Tot-Mengen bei aus und an aufgelistet. **Ausfälle sind nicht zufällig:** Gerade schwierige Stellungen können ausfallen, ein kleiner Anteil ist deshalb keine Entwarnung.
  1. **Jeder ungeklärte Ausfall in einer betroffenen Stellung verhindert die positive Kandidatur**, auch wenn der Anteil klein bleibt. Er zählt als ungeklärt, nie als unbedenklich (§8 Nr. 4).
  2. Für die **Berichtbarkeit** von Schicht A: Fallen mehr als **5 %** der betroffenen Stellungen einer Stellungsart aus (einschließlich nicht wiederholbarer), ist Schicht A für diese Art **ungültig** (kein Urteil, Lauf rot). Die 5 % sind eine **Setzung ohne Herleitung** und **nicht aus Stufe C übernommen**: Dort ging es um Paare für E2 und E3 und um eine konservative Zählung bei verlorenen Siegen.
     Die Grenze bestimmt nur, wann Schicht A nicht mehr berichtet wird, und **erlaubt keine positive Kandidatur**.
- **Zeitpunkt:** vor AP4.

### 10.4 Schicht B: Deckel, Beurteiler, Aufwand, zweites Programm

- **Deckel für B2, Empfehlung:** **60** beibehalten. Zweck von B2 ist, bestätigte Verbesserungen (R+) zu finden und die Beurteilung zu kalibrieren. Gesenkt wird er nur auf Wunsch der Beurteiler und nur **vor** Sicht auf Urteile.
- **Beurteiler, Empfehlung (zweigleisig, damit der Plan ohne bestimmten Menschen ausführbar ist):**
  1. **KI-Beurteilung aller Fälle (B1 und B2)** durch eine **getrennte, eigene Sitzung**, die nur Unterlage und Kategorien bekommt, **nicht** die Herkunft, **nicht** dieses Doc und **nicht** die Regel der App (die Begründungsvorgaben nennen allgemeine Go-Begriffe wie echte und falsche Augen, Seki, Freiheiten, Ko, ohne `_diagIsTrueEye`).
     Das ist **nicht unabhängig im strengen Sinn**: Engine und Diagnosen entstanden mit Claude, ein Beurteiler aus derselben Modellfamilie kann Blindstellen teilen. Das Ergebnis wird als **KI-Beurteilung** berichtet.
  2. **Menschliche Beurteilung einer Teilmenge**, **nur wenn ein Mensch zugesagt hat**: bis zu **20 Unterlagen** (Setzung): zuerst die Fälle, in denen die KI-Beurteilung ungeklärt ist oder GNU Go widerspricht, der Rest zufällig. Zweck: Vergleich mit der KI-Beurteilung und Klärung strittiger Fälle. Hazeberry übernimmt das nur, wenn er es möchte; sonst eine dritte Person.
  **Beide sind Beurteilungen, keine Ground Truth.** Sie werden **getrennt** mit Begründung und Unsicherheit berichtet, ihre Übereinstimmung auf gemeinsam beurteilten Unterlagen wird ausgewiesen, Widersprüche zählen als ungeklärt (§6.4). Ein menschliches Urteil macht ein Ergebnis nicht zu „tatsächlicher Richtigkeit“.
  Ohne Zusage eines Menschen bleibt es bei der KI-Beurteilung, und der Bericht sagt das ausdrücklich.
- **Aufwandsgrenze für B1, Empfehlung:** **keine Kürzung von B1.** Für die menschliche Teilmenge gilt die Grenze von 20; für die KI-Beurteilung gibt es keine. Vor Stufe 3 wird die Zahl der Unterlagen genannt und die Zeit je Unterlage an drei Probestücken (ohne Auswertung der Urteile) geschätzt; liegt die menschliche Teilmenge darüber, entscheidet Hazeberry.
- **Zweites Programm, Empfehlung:** **nicht Voraussetzung.** Fuego kennt `final_status_list` (`docs/fuego.md` §6), die **Antwortqualität ist nicht geprüft** (dort meldet `final_score` mitten in der Partie manchmal „cannot score“). Optional eine kurze Funktionsprobe an etwa 10 archivierten Endstellungen mit eigenem Go; nur danach könnte Fuego als zusätzliche Meinung dienen.
- **Zeitpunkt:** vor Stufe 2 (§11, E-2).

### 10.5 Mindestzahlen

- **Mindestumfang 30 betroffene Stellungen je Stellungsart:** beibehalten als **Mindestumfang für eine Kandidatur** (§7 Nr. 7). Darunter werden Befunde trotzdem berichtet, nur die Kandidatur bleibt offen. Kein Sicherheitsnachweis.
- **Mindestzahl R+, Empfehlung:** mindestens **5 bestätigte Verbesserungen aus mindestens 3 verschiedenen Partien**, mit entschiedenen Urteilen (§8 Nr. 2). Begründung: Ein einzelner Fall ist eine Anekdote; drei Partien verhindern, dass ein einzelnes Muster allein trägt. Reine Setzung ohne Sicherheitswert, sie wird mit den Intervallen berichtet.
  Der Schalter wirkt auf Schlusszählung und Vorschau zugleich; **R− = 0** gilt deshalb in **beiden** Stellungsarten.
- **Alternative:** Hazeberry setzt eine höhere Zahl oder verlangt sie je Stellungsart.
- **Zeitpunkt:** vor Stufe 2.

## 11. Arbeitspakete und Reihenfolge (nach Freigabe, je eigenes Go)

Nichts davon ist begonnen. Jedes Paket hat ein eigenes Go; vor jedem Lauf wird genannt, was läuft, wo und welches Go gilt (CLAUDE.md). Messungen und GNU Go laufen in GitHub Actions.

| AP | Inhalt | Ergebnis | Ort |
|---|---|---|---|
| AP1 | Referenzwerte der **unveränderten** Fassung einfrieren: Tot-Mengen auf Zufallsbrettern (feste Seeds) und `tests/stellungen/` | Datei mit Referenzwerten im Test, erzeugt **vor** der Änderung | lokal, kurz |
| AP2 | Schalter nach §10.1: `PARAMS`, Dashboard, vierter Parameter, Aufrufer; Tests (aus gleich Referenz, an: konstruierte Stellungen mit echtem und falschem Ein-Punkt-Auge, Rand, Ecke, Verbände, iterative Entfernung); Browser-Test | PR mit grüner CI | lokal, kurz; CI |
| AP3 | Stufe-1-Werkzeug: Prüfdaten ziehen (Ausschluss der 563 Quellpartien, Schritt 0), Einspielen, Tot-Menge aus und an, Identitäts- und Konsistenzkontrolle (§7 Nr. 3 und 4), Betroffenheit je Gruppe und Stellungsart; Test mit Attrappe; Workflow `diagonal-pruefung.yml` | Bericht „betroffene Stellungen“ | Actions |
| AP4 | Stufe-2-Werkzeug nach dem Muster der Zähldiagnose (`passregel-zaehldiagnose.js`): Archivzüge einspielen, zweimal, `final_status_list dead` und `final_score`, Ausfallregel, Kontrollstichprobe | Schicht A: behoben und neu entstanden getrennt | Actions (GNU Go) |
| AP5 | Stufe-3-Werkzeug: Unterlagen-Generator (SGF mit voller Zuggeschichte, Textdiagramm, Zugfarbe, Kurzansicht, Zufalls-ID), Antwortbogen-Schema mit Prüfung, Auswerter mit Aufdeckung (R+, R−, ungeklärt); Test | Unterlagen und Auswertung | lokal; Beurteilung durch die Beurteiler |
| AP6 | Bericht als Nachtrag mit Rohdaten und Gültigkeit | Doc-PR | lokal |

**Reihenfolge mit Entscheidungspunkten:**
1. **E-0:** Hazeberry bestätigt oder ändert §10. Danach AP1, AP2 (je Go).
2. **Stufe 1** (AP3, Go): Ergebnis ist **nur die Betroffenheit**, keine Aussage zur Beurteilung.
   **E-1:** Bei weniger als 30 betroffenen Stellungen je Stellungsart wird der Befund trotzdem beschrieben; nur die Kandidatur bleibt offen („kein Urteil über die Kandidatur: zu wenig Betroffene“); Hazeberry entscheidet über eine Erweiterung (§10.2).
3. **E-2 (vor Stufe 2, vor Sicht auf Schicht A):** Beurteiler benannt und zugesagt (§10.4), Deckel, Kategorien, Mindestzahlen bestätigt.
4. **Stufe 2** (AP4, Go): Schicht A. Danach wählt die Regel aus §6.1 die Ketten **mechanisch** aus (B1 vollständig, B2 gezogen); keine Entscheidung nach Sicht auf Urteile.
5. **Stufe 3** (AP5, Go): Zahl der Unterlagen und Aufwand werden vorher genannt. Aufdeckung erst nach allen Urteilen.
6. **AP6:** Bericht. Das Ergebnis ist ein Befund und kein Go (§8).

## 12. Freigaben

Dieses Doc enthält Vorgaben für die KI-Assistenten; Hazeberry liest es vor dem Merge. Es erteilt kein Go für die Umsetzung, Läufe, Engine-Vergleiche, Änderungen des Standards oder Merges. Die Empfehlungen in §10 sind keine Entscheidungen. Die 15 Zählabweichungen bleiben ein getrenntes Vorhaben.

## 13. Stand der Umsetzung (08.11.2026)

**E-0:** §10 gilt als **Arbeitsplan** (Empfehlungen übernommen); die **Wahl der Beurteiler bleibt bis vor Stufe 2 offen** (E-2), niemand ist eingeteilt. Das Go für **AP1 und AP2** wurde in der Sitzung erteilt (Antwort „Ja, AP1 und AP2“); es gilt nur für diese zwei Pakete. **Keine Archivmessung, kein GNU-Go-Lauf, kein Standardwechsel, Stufe 1 bis 3 nicht gestartet.**

| AP | Stand | Inhalt |
|---|---|---|
| AP1 | umgesetzt (eigener Commit, **vor** der Änderung an `index.html`) | Referenz der unveränderten Fassung (Stand `c504143`, `index.html` SHA-256 `d3bcb1cc54c56f0729cf80d36a462fd564a69ed4561fccbe2d42efba461fa69b`) in `tests/referenz/diagonalauge.json`: Tot-Menge und `zaehlVorschau` (Fläche, Territory) auf 90 festen Prüfbrettern (80 Zufallsbretter nach Seed, 10 SGF-Endbretter), dazu sieben Entwicklungsstellungen der Stufe C. Die Werte bei **an** stammen aus der Test-Kopie der Diagnose (`gegenprobe.js --variante diagonalauge`), ebenfalls vor der Änderung erzeugt. Generator: `auswertung/zaehlung-mechanismus/diagonalauge-referenz.js` (bricht ab, wenn die `index.html` nicht dem erwarteten Stand entspricht); Prüfbretter: `tests/diagonalauge-brett.js` |
| AP2 | umgesetzt | `PARAMS.diagonalAugeEnde` (Standard **0**, Dashboard-Zeile 0 bis 1); `toteSteineAmEnde(board, augeGross, offenGross, diagAuge = false)`; bei an zählt ein Ein-Punkt-Auge nur mit `_diagIsTrueEye`. Aufrufer: `resolveLifeAndDeath` (Schlusszählung), Anzeige der Zählvorschau und `passNachGegnerpassPruefung` (Worker, `PARAMS`-Snapshot) reichen `PARAMS.diagonalAugeEnde >= 1` durch; `zaehlVorschau` über `opt.diagonalAuge`. Tests: `tests/diagonalauge.js`, `tests/browser-diagonalauge.js` |

**Was die Tests belegen und was nicht:**
- **Bei aus ist das Verhalten bitgleich** zur Referenz auf den 90 Brettern und den sieben Entwicklungsstellungen (Tot-Menge und Vorschau). Das ist **keine** Aussage über alle Stellungen; der Engine-Vergleich alter gegen neuer Stand an Archivstellungen (§7 Nr. 3) läuft nur in Actions (`engine-vergleich.yml`) und nur nach Go und ist **nicht** gelaufen.
- Bei an stimmt die Umsetzung auf diesen Brettern mit der Test-Kopie der Diagnose überein (bei 11 der 90 Bretter ändert sich die Tot-Menge; bei fünf der sieben Entwicklungsstellungen). Die Konsistenzkontrolle auf allen 563 Entwicklungsstellungen (§7 Nr. 4) gehört zu Stufe 1 und ist **nicht** gelaufen.
- Dass der Schalter an eine **Verbesserung** bringt, ist nicht gezeigt; das ist Gegenstand der Stufen 1 bis 3.
- Lokal gelaufen sind nur die betroffenen Tests (`diagonalauge.js`, `browser-diagonalauge.js`, `zaehlvorschau.js`, `zaehlung.js`, `passregel-versuch.js`, `lizenz.js`, `browser-zaehlvorschau.js`, `browser-passregel.js`, `browser-ui.js`); die gesamte Suite prüft die reguläre CI.
- **Nachbesserung nach Hinweis von Luna (Lesung von #295):** Eine bereits geöffnete Zählvorschau blieb nach Änderung des Schalters im Dashboard veraltet (Zahlen und Markierungen gehörten zur alten Einstellung); der Cache-Schlüssel kannte den Schalter nicht. Behoben: Der Schlüssel enthält den Schalter, und `vorschauNeuBerechnen()` berechnet eine **offene** Vorschau bei Änderung des Feldes (`dashUpdate`), beim Reset (`dashReset`, auch über das Preset „Std“) und beim Anwenden eines Presets neu und zeichnet sie neu; eine geschlossene bleibt geschlossen.
  `tests/browser-diagonalauge.js` deckt den tatsächlichen Dashboard-Wechsel bei geöffneter Vorschau ab (Mengen und Panel-Text gleich einer frisch geöffneten Vorschau; Reset; Preset „Std“; geschlossene Vorschau bleibt zu). Der Test schlägt auf dem Stand vor der Korrektur (`a644ea7`) fehl und besteht danach.
- Nicht geprüft: ob die Einstellung `diagonalAugeEnde` in einem echten Browserprofil mit gespeicherten Dashboard-Werten auf 0 fällt. Gespeichert werden nur Abweichungen von `PARAMS_DEFAULT` (`dashLoadSaved`), der neue Schlüssel steht in `PARAMS_DEFAULT` und hat dort 0; das ist gelesen, nicht im Browser nachgespielt.

## 14. Stand der Umsetzung AP3 (08.11.2026)

Das Go für **AP3 bauen** wurde in der Sitzung erteilt („Go für AP3 bauen, Handpartien dabei, Indizes wie vorgeschlagen“). Es gilt nur für das Bauen. **Kein Lauf auf den Prüfdaten, kein GNU Go, kein Workflow gestartet, Stufe 1 (als Lauf) nicht gestartet.** Ein Lauf braucht ein eigenes Go.

| AP | Stand | Inhalt |
|---|---|---|
| AP3 | gebaut, nicht gelaufen | `auswertung/endspiel/diagonal-pruefung.js` (Teilschritte `ziehen`, `rechnen`, `vergleichen`, je Stand ein eigener Prozess), Workflow `.github/workflows/diagonal-pruefung.yml` (nur `workflow_dispatch`, kein GNU Go), Test `tests/diagonal-pruefung.js` (Attrappe, 12 Fälle, lokal grün) |

**Ablauf des Laufs (im Workflow, nach Go):** Stufe-C-ZIP gegen `SHA256SUMS` prüfen und in ein leeres Verzeichnis entpacken; `ziehen` (Schritt 0, Nachspiel-Kontrolle, Stellungen); `rechnen --stand alt` (unveränderte Fassung aus Commit `c504143`, `index.html` SHA-256 `d3bcb1cc…fa69b` im Workflow und im Werkzeug geprüft); `rechnen --stand testkopie` (Test-Kopie der Diagnose aus derselben unveränderten Fassung, Verfahren wie `gegenprobe.js --variante diagonalauge`); `rechnen --stand neu` (aus und an); `vergleichen`. Das Werkzeug verweigert die falsche Fassung (`neu` mit einer Datei ohne Schalter, `alt` mit einer, die ihn kennt) und prüft, dass die drei Ergebnisdateien aus drei verschiedenen Prozessen stammen.

**Ausgabe:** `schritt0.json/.md`, `stellungen.jsonl`, `alt.jsonl`, `testkopie.jsonl`, `neu.jsonl`, `bericht.json/.md`, `betroffen.jsonl` (die betroffenen Prüfstellungen mit zusätzlich toten und wieder lebenden Steinen; Eingabe für Stufe 2, die Kontrollstichprobe käme dort aus `stellungen.jsonl` ohne diese).

### 14.1 Konkretisierungen und Setzungen (Entscheidung bei Hazeberry, Änderung ohne Aufwand)

Das sind Festlegungen, die der Entwurf offen ließ und die ich beim Bau treffen musste. Sie stehen hier, damit sie vor einem Lauf gelesen und geändert werden können.

1. **V-Stellung:** das Brett **nach** dem Zug mit dem nullbasierten Index 250, 300 oder 350 (wie der Index der Einheiten der Stufe C: `anfang.brett` ist das Brett nach Zug `index`). Die Partie muss mehr als `index` Einträge haben (Länge 250 ergibt kein V250, Länge 251 schon; im Test gebunden). Die Stellung kann hinter einem Pass liegen; nach einer Auslösung wird nicht gewählt (§3.2).
2. **S-Stellung:** nur **reguläres Ende**: die Zugfolge endet mit zwei Pässen, `aufgabe` ist leer und `endstand` ist eine Zahl. Zuglimit und andere Enden sind im Archiv nicht getrennt erkennbar; sie fallen unter „Ende nicht mit zwei Pässen“ und werden je Gruppe gezählt. Nach dem Spielende bleibt das Brett vor dem Entfernen toter Steine; der Endstand wird wie `resolveLifeAndDeath` plus `finalAreaScore` und `finalTerritoryScore` gerechnet (`zaehleMitTotListe`, dieselbe Funktion wie in der Zähldiagnose; Komi 7,5).
3. **Ausschluss der Quellpartien:** Schlüssel ist Gruppe, Dateipfad ab `docs/daten/` und Partienummer, entnommen aus `stufe-a/einheiten.jsonl` des Stufe-C-ZIP. Der bisherige Schlüssel der Ergebniszeilen nennt nur den Dateinamen; die Gruppe „GNU Go ohne Vorgabe“ hat zwei Dateien mit dem Namen `g-D.jsonl.gz`, dort wäre er nicht eindeutig. Jede Quellpartie muss in den angegebenen Archivdateien gefunden werden, sonst ist die Stufe ungültig; die Schnittmenge wird eigens geprüft (§7 Nr. 1). Außerdem müssen die Einheiten der Stufe A und die 563 Ergebniszeilen dieselbe Schlüsselmenge sein.
4. **Berichtigung zu §10.2:** Dort steht „563 Quellpartien“ und eine Obergrenze von 2197 Partien. Die 563 sind **Einheiten**; verschiedene Partien (Gruppe, Datei, Nummer) sind es nach `einheiten.jsonl` **562** (eine Partie liefert zwei Einheiten). Die Obergrenze der Prüfpartien ist damit 2760 − 562 = 2198, nicht 2197 (nach Abzug unbrauchbarer Partien weniger). Maßgeblich ist Schritt 0 im Lauf.
5. **Duplikate:** ursprünglich nur gezählt, nicht entfernt. **Ersetzt durch §14.4** (Go in der Sitzung nach Hinweis von Luna): Duplikate werden aus der Hauptprüfung ausgeschlossen.
6. **Nachspiel-Kontrolle (§7 Nr. 2) in Stufe 1:** jeder Zug auf freiem Punkt, kein Selbstmord (Schlagen zuerst), die geschlagenen Steine je Seite gleich `gefangen` des Archivs (soweit gespeichert; an drei Partien eines Archivs vorab gelesen, siehe unten). **Nicht geprüft:** Ko und Superko; ein Endbrett ist im Archiv nicht gespeichert, ein Vergleich mit GNU Gos Brett gehört zu Stufe 2. Jeder Verstoß macht die Stufe ungültig.
7. **Zusätzliche Kontrolle (Setzung, über §7 Nr. 4 hinaus):** Bei an muss die Umsetzung auch auf **allen Prüfstellungen und Handpartien** gleich der Test-Kopie der Diagnose sein (Tot-Menge, Zählstand, Vorschau). Weicht sie ab, ist die Stufe ungültig, weil die Umsetzung dann etwas anderes tut, als diagnostiziert wurde. Streichbar, wenn Hazeberry nur die 563 Stellungen verlangt.
8. **Fallabdeckung („gleich“ erst nach Vorprüfung):** Die Identitätskontrolle gilt nur, wenn je Stellungsart (S, V, E) mindestens eine Stellung eine nicht leere Tot-Menge hat und der Schalter in mindestens einer Entwicklungsstellung die Tot-Menge ändert; sonst **KEIN URTEIL**. Zusätzlich muss bei gleicher Tot-Menge der Zählstand gleich sein, und „nur Bewiesenes“ der Vorschau darf sich nie ändern (es hängt von der Tot-Menge nicht ab).
9. **Mindestumfang (§7 Nr. 7):** gezählt werden betroffene **Stellungen** je Stellungsart (S, V), nicht Partien; die Zahl betroffener Partien steht daneben, weil V250, V300, V350 und S derselben Partie nicht unabhängig sind. Die Summenzeile addiert die Gruppen ungewichtet, die Gruppen bleiben einzeln ausgewiesen. Unter 30: Befund wird beschrieben, „kein Urteil über die Kandidatur: zu wenig Betroffene“.
10. **Handpartien:** die sechs `tests/stellungen/hand-*.sgf`, nur Endstellung (S), **ohne Statistik** und **nicht** im Mindestumfang; je Datei steht, ob das Ende regulär ist (zwei Pässe, keine Aufgabe laut `RE`), Tot-Menge aus und an, Stände. SGF mit Setzsteinen werden abgelehnt.
11. **Wirkung auf Stand und Vorschau:** nur für betroffene Stellungen, `an` minus `aus` (Schwarz − Weiß − Komi), mit der Zahl der Stände, die sich ändern, und der Siegerwechsel (§8 Nr. 5). Ohne GNU Go gibt es **keinen Maßstab**: Das ist die Wirkung des Schalters, keine Verbesserung. Die Entwicklungsstellungen (E) dienen nur den Kontrollen und werden nicht in die Auswertung gezählt.

### 14.2 Was die Tests belegen und was nicht

- `tests/diagonal-pruefung.js` läuft das ganze Werkzeug als eigene Prozesse an einer **Attrappe** (Zufallspartien mit festen Seeds, darunter Sonderfälle: abgebrochen, Komi 6,5, Aufgabe, ohne Schlusspässe, Länge 250 und 251; zwei Quellpartien mit drei Einheiten; die echten Handpartien). Die betroffenen Stellungen der Attrappe sind gleich einer unabhängigen Rechnung mit der Engine; Summen stimmen; in jedem der geprüften Ungültigkeitsfälle endet der Lauf mit Exit 1, „KEIN URTEIL“ und leerer Betroffenenliste.
- Der Stand „alt“ der Attrappe ist **aus der aktuellen `index.html` gebaut** (Schalter und seine Zeile entfernt), weil ein Checkout ohne Historie die unveränderte Fassung nicht hat. Dass der echte `c504143`-Stand dieselbe Kontrolle besteht, zeigt erst der Lauf; **der Engine-Vergleich über `engine-vergleich.yml` und die Konsistenzkontrolle auf den 563 Entwicklungsstellungen sind nicht gelaufen**.
- **Nicht geprüft:** der Workflow selbst (nicht in Actions gestartet; die YAML-Syntax habe ich lokal geladen, mehr nicht), Schritt 0 auf den echten Archiven, die SHA-Prüfung des ZIP im Lauf, die Laufzeit (nicht gemessen; Schätzung: Sekunden bis Minuten, da keine Suche läuft).
- **Offenlegung:** Vor dem Bau habe ich die Archivdateien einmal ausgezählt (Felder, Pässe am Ende, Aufgabe, Längen, Duplikate, Zahl der Quellpartien), um das Format zu verstehen, und an drei Partien einer Datei das Einspielen gegen `gefangen` verglichen (gleich, mit `wir` als Farbe der KI). Das war eine Rechnung auf Archivdaten **ohne ausdrückliches Go für sie**. Die Zahl 562 (Nr. 4) stammt daraus; sonst fließt davon nichts in dieses Doc. Befund ist allein Schritt 0 im Lauf.
- Lokal gelaufen sind nur `tests/diagonal-pruefung.js` und `tests/lizenz.js`; die gesamte Suite prüft die reguläre CI.

### 14.4 Duplikate: Ausschluss aus der Hauptprüfung (Nachbesserung nach Hinweis von Luna, 08.11.2026)

**Anlass:** Die erste Fassung (Kopf `3cf07ef`) zählte Partien mit gleicher Zugfolge nur und ließ sie in der Prüfmenge. Eine Partie mit der Zugfolge einer Quellpartie, aber anderer Farbe der KI, hätte so bereits benutzte Stellungen als „bisher unbenutzte Prüfdaten“ geliefert (§3.2); die Erkennung hing außerdem von der Farbe der KI ab, und meine Zählung behielt je Zugfolge nur die erste Partie. Das Go für die Korrektur (Punkte 1 bis 4 samt Ausschluss der Prüfsatz-Duplikate und Brettvergleich) wurde in der Sitzung erteilt. **Keine Läufe, kein Merge.**

**Festlegung (Setzung, Entscheidung bei Hazeberry):**
1. **Brettvergleich:** Für diese Stufe zählt das Brett (361 Zeichen), weil die untersuchte Tot-Menge nur vom Brett abhängt. Farbe der KI, Gefangene, Zugfarbe und Vorgeschichte gehen in den Vergleich nicht ein. Für Ko- und Superko-Beurteilungen (Stufe 3) bleibt die jeweilige Vorgeschichte erhalten; Stufe 3 (AP5, nicht gebaut) soll sie aus der Partie des behaltenen Vertreters nehmen.
2. **Ausgeschlossen werden:** (a) **Partien** mit gleicher Zugfolge wie eine Quellpartie (Schlüssel `beginnt|Zugfolge`, **ohne** Farbe der KI); sie werden nicht eingespielt und nicht gerechnet; (b) **Stellungen**, deren Brett dem Brett einer der 563 Entwicklungsstellungen gleicht; (c) **Stellungen**, deren Brett in **derselben Stellungsart** (S oder V) schon vorkam, auch aus anderer Zugfolge und über Gruppen hinweg. S und V werden nicht gegeneinander abgeglichen (verschiedene Verfahren; die Mindestzahl gilt je Stellungsart).
3. **Vertreter:** der **erste** in der Reihenfolge Gruppe (Reihenfolge des Aufrufs), Datei, Zeile, dann S vor V, V aufsteigend nach Index. Die Wahl ist deterministisch, aber willkürlich im Sinn der Dateireihenfolge; sie ändert die Zählung, nicht die Tot-Menge des Bretts. Partien mit gleicher Zugfolge **im Prüfsatz** werden als Partien nur gezählt; ihre Stellungen entfallen durch (c).
4. **Ausgeschlossene werden nicht gerechnet**, nur gezählt: je Gruppe in Schritt 0, gesamt im Bericht (`ausgeschlossen`). Sie gehen weder in die Betroffenheit noch in den Mindestumfang ein und bekommen keine eigene Statistik.
5. **Pflichtkontrolle §14.4** in `vergleichen`, unabhängig von `ziehen` aus `stellungen.jsonl`: kein Prüfbrett gleicht einem Entwicklungsbrett, und in S und in V kommt kein Brett doppelt vor; sonst ungültig (KEIN URTEIL). Die Schnittmenge mit den Quellpartien (§7 Nr. 1) wird jetzt aus den tatsächlich gebildeten Stellungen gebildet. Ein Entwicklungsbrett muss aus 361 Zeichen `.`, `X`, `O` bestehen, sonst ist die Stufe ungültig (sonst würde der Vergleich stillschweigend nichts finden).

**Grenzen:** Der Brettvergleich erkennt nur **gleiche** Bretter, nicht ähnliche (zwei Partien mit gemeinsamem Anfang bilden ab dem Auseinandergehen verschiedene Bretter und zählen dann beide). Gleiche Bretter mit verschiedenen Gefangenen haben dieselbe Tot-Menge, aber unter Umständen einen anderen Territory-Stand; dieser bleibt beim Vertreter. Wie viele Duplikate die echten Daten enthalten, ist **nicht gezählt**; das zeigt erst Schritt 0 im Lauf.

**Test:** `tests/diagonal-pruefung.js`, Fall „Duplikate“: Quell-Duplikat mit anderer Farbe, ganze Partie doppelt im Prüfsatz, andere Zugfolge mit gleichen Brettern (zwei Schwarzzüge vertauscht), Entwicklungsbrett; erster Vertreter bleibt, Zählung geht auf (möglich minus ausgeschlossen gleich behalten), zweiter Lauf byte-gleich; dazu die Kontrolle in `vergleichen`. Dabei fiel auf: Die Attrappe selbst enthielt Partien gleichen Anfangs über beide Gruppen (gleicher Seed), die der neue Ausschluss richtig fand; die Attrappe nutzt jetzt getrennte Seeds.

### 14.5 Freigaben

Dieser Abschnitt (14.5) erteilt kein Go für einen Lauf, Stufe 2 oder 3, einen Engine-Vergleich, einen Standardwechsel oder einen Merge. Das Doc enthält Vorgaben; Hazeberry liest es vor dem Merge. Offen bleiben die Beurteilerwahl (E-2) und alles aus „Offen ohne Go“.

## 15. Ergebnisnachtrag Stufe 1 (08.11.2026, korrigiert 11.11.2026)

Die von Hazeberry bereitgestellte `diagonal-pruefung-stufe1.zip` ist unter
[`docs/daten/diagonal-pruefung/stufe1/`](daten/diagonal-pruefung/stufe1/README.md)
unverändert gesichert. [Bericht](daten/diagonal-pruefung/stufe1/bericht.md),
[Schritt 0](daten/diagonal-pruefung/stufe1/schritt0.md), JSON-Fassungen,
Manifest und Prüfsummen liegen daneben. Die Aussagen „nicht gelaufen“ in §13–14
beschreiben den damaligen Vorbereitungsstand; dieser Nachtrag dokumentiert das
nun gelieferte Ergebnis. Der Originalbericht im ZIP und seine Kopien bleiben
unverändert; Korrekturen stehen nur hier (15.5).

### 15.1 Herkunft (Zuordnung zu Lauf und Commit)

Das ZIP ist das Artefakt `diagonal-pruefung-stufe1` (ID `13606944528`) des
Actions-Laufs **`42456406985`** (Workflow `diagonal-pruefung.yml`, `workflow_dispatch`
auf `main`, Run 1, 08.11.2026) auf Commit **`0887732170090390ce9aa28f08d954b550225830`**
(Merge von #296). Die SHA-256 des ZIP `8c835dfb…c133740` ist gleich dem von Actions
gemeldeten Artefakt-Digest. Quellen: Actions-Metadaten und Job-Log, am 08.11.2026 gelesen.
Das Job-Log nennt die Prüfsumme des Stufe-C-ZIP (gleich der erwarteten), die
unveränderte Fassung aus `c504143` (`index.html` SHA-256 `d3bcb1cc…fa69b`, wie gebunden) und
je 7.881 Stellungen für die Stände `alt`, `testkopie` und `neu`. Die `index.html` des Standes
`neu` hat die SHA-256 `3570ca10…1fc72`; sie ist gleich der `index.html` auf `main` (am
08.11.2026 gegengerechnet). README und Manifest dieser Ablage nennen dieselbe Zuordnung
(Korrektur vom 11.11.2026; die erste Fassung der Ablage sagte dort „nicht zugeordnet“).

### 15.2 Befund laut Bericht

Gültig, alle neun Kontrollen bestanden (`bericht.json`). Die Identitätskontrolle bei aus
umfasst 7.881 Stellungen einschließlich 563 Entwicklungsstellungen und sechs Handpartien;
die Konsistenzkontrolle bei an stimmt mit der Test-Kopie überein. Auf den 563
Entwicklungsstellungen sind 19 betroffen, wie in der Diagnose (§12.2 in `zaehlung-mechanismus.md`).
Die Kontrollen und die Wirkung auf Stand und Vorschau wurden bei der Übernahme nicht
neu gerechnet. Gegengezählt wurden an den Rohdateien (am 08.11.2026): `betroffen.jsonl` hat
1.718 eindeutige Zeilen (658 plus 1.060), jede steht in `stellungen.jsonl`, und Steinzahlen je
Gruppe stimmen mit dem Bericht überein.

### 15.3 Schritt 0 und Ausschlüsse (`schritt0.md`)

| Gruppe | Prüfpartien | S behalten | V behalten (250/300/350) | S doppeltes Brett | V doppeltes Brett |
|---|---:|---:|---|---:|---:|
| GNU Go ohne Vorgabe | 958 | 953 | 928/652/229 | 5 | 11 |
| Fuego 100 Spiele | 435 | 434 | 435/426/287 | 0 | 0 |
| Fuego 50 Spiele | 643 | 643 | 643/637/424 | 0 | 0 |
| alte PWA | 162 | 162 | 162/162/135 | 0 | 0 |

- Quellpartien der Entwicklungsdaten: 562 verschiedene Partien in 563 Einheiten (§14.1 Nr. 4).
- Ausgeschlossen: Partien mit gleicher Zugfolge wie eine Quellpartie 0; Stellungen mit dem Brett
  einer Entwicklungsstellung 0; doppelte Bretter S 5 und V 11, alle in der GNU-Go-Gruppe.
  Eine Partie im Prüfsatz hat dieselbe Zugfolge wie eine andere (GNU Go, nur gezählt; ihre
  Stellungen entfallen über den Brettvergleich).
- S enthält nur Endstellungen mit zwei abschließenden Pässen ohne Aufgabe. Eine Partie der Gruppe
  Fuego 100 Spiele erfüllt das nicht und fehlt in S.
- Gefangene gegen das Archiv: 2.198 von 2.198 gleich. Behalten: S 2.192, V 5.120 (Summe der Gruppen).

### 15.4 Betroffenheit und Wirkung

| Hauptprüfung | Stellungen | betroffen | Anteil | Partien (betroffen) |
|---|---:|---:|---:|---|
| S (Schlusszählung) | 2.192 | 658 | 30,0 % | 2.192 (658) |
| V (Vorschau) | 5.120 | 1.060 | 20,7 % | 2.169 (730) |

Nach Gruppe (S, V; Clopper-Pearson 95 % im Bericht, Modellannahmen, Stellungen derselben Partie
sind nicht unabhängig): GNU Go ohne Vorgabe 45,1 % und 40,6 %; Fuego 100 Spiele 21,9 % und 11,4 %;
Fuego 50 Spiele 20,7 % und 10,2 %; alte PWA 0,0 % (0 von 162) und 4,6 %. **Sicher ist zunächst nur:
In diesen Daten unterscheiden sich die Anteile nach Gruppe und Stellungsart.** Ein Zusammenhang
mit der Partielänge ist **nicht belegt**: Die verglichenen Teilmengen sind verschieden (V350 enthält
nur lange Partien), und der Verlauf über V250, V300 und V350 geht nicht in eine Richtung (Fuego und
GNU Go steigen, alte PWA fällt von 8,0 % auf 0,0 %). Warum die Anteile sich unterscheiden, ist nicht untersucht.

Die Mindestzahl von 30 betroffenen Stellungen je Art ist erreicht (S 658, V 1.060), aber kein
Sicherheitsnachweis. Wirkung auf die betroffenen Stellungen (`an` minus `aus`, laut Bericht): Der Stand
ändert sich in allen 658 (S) und in allen 1.060 Vorschau-Stellungen mit Annahmen. Der Sieger wechselt in S
bei 195 (Fläche) und 68 (Territory), in V bei 263 und 186. Der Median der Standänderung liegt bei −19
(S) und +14 (V), die Spanne bei −150 bis +204 (S) und −394 bis +315 (V). „Nur Bewiesenes“ bleibt unverändert.
Die sechs Handpartien bleiben bei der Tot-Menge unverändert und werden getrennt, ohne Statistik geführt.
**Der Schalter verändert die Zählung häufig und teils stark; ob er sie verbessert, ist offen.**

### 15.5 Korrekturen

- **Veralteter Satz im Originalbericht (und im Werkzeug):** Der Abschnitt „Grenzen“ in `bericht.md`
  sagt „Duplikate (gleiche Zugfolge) zählen mehrfach (Schritt 0 nennt ihre Zahl)“. Das stimmt seit
  §14.4 nicht mehr: Duplikate werden aus der Hauptprüfung ausgeschlossen und nur gezählt (15.3).
  Die Zahlen des Berichts sind davon nicht berührt. Der gesicherte Originalbericht des Laufs
  `42456406985` bleibt unverändert und trägt den alten Satz, weil der Lauf mit dem damaligen
  Werkzeugtext entstand. Der Text im Werkzeug (`auswertung/endspiel/diagonal-pruefung.js`) ist
  berichtigt (Test: `tests/diagonal-pruefung.js`); ein künftiger Lauf erzeugt den berichtigten Satz.
  Berechnung und Zahlen sind davon nicht berührt.
- **Aussagen in der Berichterstattung der Sitzung:** „S gibt es nur ohne ein Ende mit zwei Pässen“ war
  falsch formuliert (richtig: 15.3), und „die Betroffenheit steigt mit der Partielänge“ war zu allgemein
  (richtig: 15.4). Beides stand nicht in den gesicherten Dateien.

### 15.6 Grenzen, Folgerung, Freigaben

Betroffenheit sagt nicht, ob die Zählung richtiger wird. Mehrere Stellungen derselben Partie sind
abhängig. Ko und Superko wurden bei der Nachspiel-Kontrolle nicht geprüft. Die Prüfdaten stammen aus
denselben Archiven wie die Entwicklungsdaten und begründen keine Aussage für menschliche Partien.
**Plan für Stufe 2 unverändert:** alle betroffenen Stellungen (hier 1.718) werden geprüft; eine
Verkleinerung wäre eine ausdrückliche Planänderung. Vollständig beurteilt wird in Stufe 3 nur B1; B2
bleibt auf 60 begrenzt (§6.1). Die Beurteilerwahl (E-2) ist offen. Dieser Nachtrag erteilt kein Go für
weitere Läufe, Stufe 2 oder 3, einen Standardwechsel oder einen Merge; `diagonalAugeEnde` bleibt standardmäßig 0.

## 16. Vorabfestlegung AP4: Stufe-2-Werkzeug (Entwurf, 12.11.2026)

**Status: Entwurf, nicht freigegeben.** Das Go von Hazeberry gilt ausschließlich für diesen Doc-PR („Go für die AP4-Vorabfestlegung als Doc-PR“). **Kein Bau, kein Workflow, kein Lauf, kein GNU Go, keine Rechnung auf Archivdaten.**
Alle Zahlen sind **Setzungen oder Annahmen** und kein Messergebnis; mit **Vorschlag** markierte Werte sind von Hazeberry noch nicht bestätigt (insbesondere die Ausfallgrenze in 16.7). **E-2 (Beurteilerwahl, §10.4, §11) ist offen und muss geklärt sein, bevor Stufe 2 gestartet wird;** dieser Entwurf hängt davon nicht ab, weil Schicht A und die mechanische Auswahl nach 16.8 keine Urteile kennen.
Muster: Zähldiagnose (`docs/passregel-zaehldiagnose.md`, `passregel-zaehldiagnose.js`) und Stufe C (`passregel-vergleich.yml`, Pakete). Gelesen, nicht nachgerechnet.

### 16.1 Zweck und Umfang

Stufe 2 liefert **Schicht A** (§5): GNU Gos Tot-Liste für **alle betroffenen Stellungen aus Stufe 1 (S 658, V 1.060, zusammen 1.718; `betroffen.jsonl`)** und für eine **Kontrollstichprobe unbetroffener Stellungen** (16.4). Eine Verkleinerung der betroffenen Menge wäre eine ausdrückliche Planänderung (§15.6). Stufe 2 sagt nur etwas über die **Übereinstimmung mit GNU Go**, nicht über Richtigkeit (§5, §6).
Die Entwicklungsstellungen (E) und Handpartien (H) gehen **nicht** in Stufe 2 ein.

### 16.2 Eingabe

- Das in Git gesicherte Stufe-1-ZIP (`docs/daten/diagonal-pruefung/stufe1/diagonal-pruefung-stufe1.zip`; SHA-256 `8c835dfb5b6ed7cb5af951de92351de2fd67643151025ab56fad51a89c133740`) wird im Lauf gegen `SHA256SUMS` und `manifest.json` geprüft und in ein leeres Verzeichnis entpackt; daraus `stellungen.jsonl`, `betroffen.jsonl` und `neu.jsonl`. **Pflicht:** die Menge der betroffenen Kennungen ist gleich der Menge in `neu.jsonl` mit Tot-Menge an ≠ aus (S und V); sonst ungültig.
- Die Archivzüge kommen aus den Archivdateien (`quelle` der Stellung, Pfad ab `docs/daten/`), nicht aus dem ZIP. **Pflicht:** das Einspielen ergibt je Stellung **dasselbe Brett** wie in `stellungen.jsonl` (361 Zeichen) und die Gefangenen von dort; sonst ist die Stufe ungültig (Pflichtfehler, §7 Nr. 2).
- Die Tot-Mengen der App bei aus und an werden im Lauf **neu gerechnet** (Stand `neu`, ein Prozess, `toteSteineAmEnde` mit und ohne Diagonalprüfung) und müssen **gleich `neu.jsonl`** sein; sonst ungültig. Das schließt aus, dass Stufe 2 an einer anderen Fassung der Engine misst als Stufe 1 (SHA-256 der `index.html` im Kopf wie in Stufe 1, Stand `neu`: `3570ca10…1fc72`, im Lauf geprüft).

### 16.3 Ablauf je Stellung (nach dem Muster der Zähldiagnose)

1. GNU Go (`gnugoArgumente(seed)`: `--mode gtp --level 1 --chinese-rules --komi 7.5 --seed S --never-resign`) in **frischem Prozess**: Kopfbefehle, `clear_board`, `komi 7.5`, jeder Archivzug als `play` bis zum Index der Stellung; jeder Befehl muss mit „=“ beantwortet werden, bei der ersten Fehlerantwort endet dieser Referenzlauf als Pflichtfehler, nichts wird weiter gesendet (wie Zähldiagnose §4 Nr. 4).
2. Abfragen am Ende: `list_stones` und `captures` (beide Farben), `final_status_list` mit `dead`, `alive` und `seki`; **`final_score` nur bei S** (§4). Bei V wird `final_score` **nicht** abgefragt: Mitten in der Partie kann es „cannot score“ melden, und das würde sonst Ausfälle erzeugen, die mit der Frage nichts zu tun haben. Der Vorschau-Stand bei V wird aus GNU Gos `dead`-Liste mit der App-Rechnung gebildet (§5, Zeile „Punkte (V)“).
3. **Zwei Referenzläufe R1 und R2** mit demselben Seed S0; Rohantworten **ungetrimmt, Zeichen für Zeichen gleich**; sonst „nicht wiederholbar“ = ungeklärter Ausfall (§10.3). Genau ein automatischer Wiederholungsversuch je Referenzlauf nur nach Absturz oder Timeout, frischer Prozess, derselbe Seed (§10.3).
4. **Pflichtkontrollen je Stellung:** Steinlisten von GNU Go und App gleich; Gefangene gleich der kalibrierten `captures`-Konvention (`kalibriereCaptures`); Koordinaten in Punktlisten gültig (kein `pass`, nichts außerhalb); `final_score` (S) lesbar und endlich.
5. Zur S-Stellung steht im Archiv der `endstand`. **Hinweis, keine Pflicht:** Gleichheit von `final_score` mit `endstand` wird je Gruppe gezählt und berichtet; die GNU-Go-Fassung des Archivlaufs ist nicht protokolliert, ein Unterschied wäre also nicht zwingend ein Fehler (**Vorschlag**).
6. **Version und Umgebung** werden protokolliert (`gnugo --version`, GTP `name`/`version` roh, `dpkg-query`, `apt-cache policy`, Runner-Image, Node). Die Version muss in allen Paketen **gleich** sein (Pflicht); sie wird nicht auf einen bestimmten Wert festgelegt.
7. **Zeitgrenzen (Setzung ohne Messung, beim Bau mit den vorhandenen Funktionen abgleichen):** 120 s je Abfragebefehl, 600 s je Referenzlauf. Ein Überschreiten ist ein **Timeout** und damit ein Ausfall, kein Pflichtfehler. Eine Messung der GNU-Go-Dauer für Einspielen und `final_status_list` liegt mir nicht vor.

### 16.4 Kontrollstichprobe (je Stellungsart konkret)

**Vorschlag:** Je Stellungsart **200** unbetroffene Stellungen, **S 200 und V 200, zusammen 400**. Begründung: Die Regel aus §10.3 („gleich viele wie betroffene, mindestens 50, höchstens 200“) ergibt bei S 658 und V 1.060 Betroffenen beide Male die Obergrenze 200; die Zahl steht damit schon fest und hängt von keinem Ergebnis ab.
- **Grundgesamtheit:** unbetroffene S- bzw. V-Stellungen der Hauptprüfung aus `stellungen.jsonl` (Duplikate nach §14.4 sind schon ausgeschlossen); **nicht** E und H. Unbetroffen heißt: Tot-Menge bei an gleich aus (Stufe 1).
- **Ziehung:** feste Ziehung nach Hash aus Seed und Kennung, **ohne Schichtung**: aufsteigend nach `fnv32("diagonal-pruefung-v1|kontrolle|" + Basis + "|" + id)`, bei Gleichstand nach `id`; die ersten 200 je Art. **Basis = 1.** Die Gruppenanteile der Ziehung werden im Bericht genannt; die Ziehung stellt nicht sicher, dass kleine Gruppen vertreten sind (Alternative: Schichtung nach Gruppe, größerer Aufwand, hier nicht vorgeschlagen).
- **Zweck und Grenze:** Sie zeigt, ob GNU Go auch dort von der App abweicht, wo der Schalter nichts ändert (z. B. die Zählabweichungen aus `zaehlung-mechanismus.md` §5). Sie misst **nicht** die Wirkung des Schalters und geht in keine Kennzahl der betroffenen Stellungen ein.
- Die Kontrolle wird mit **demselben Ablauf und denselben Pflichtkontrollen** wie die betroffenen Stellungen behandelt (16.3), in **denselben Paketen** (16.6).

### 16.5 Basis für `fortsetzungsSeed`

**Vorschlag: Basis 1**, wie in der Zähldiagnose und im Plan von §10.3. Der Seed je Stellung ist `fortsetzungsSeed(1, gruppe, quelle, nr, index)` aus `passregel-lib.js` (Funktion **unverändert**, ihr Festwert im Test `tests/passregel-vergleich.js` bleibt gültig).
- **Abweichung von der Zähldiagnose, mit Grund:** statt des Dateinamens (`path.basename`) geht der **volle `quelle`-Pfad ab `docs/daten/`** ein, weil die Gruppe „GNU Go ohne Vorgabe“ zwei Dateien `g-D.jsonl.gz` hat und der Basisname dort nicht eindeutig wäre (§14.1 Nr. 3).
- `index` ist der Zugindex der Stellung (bei S der letzte Eintrag, bei V 250, 300 oder 350). Gleicher Index in derselben Partie heißt gleiches Brett; ein gleicher Seed ist dort kein Nachteil. Die beiden Referenzläufe R1 und R2 einer Stellung haben **denselben** Seed, es gibt **keinen Seedwechsel** (§10.3).
- Ein Seed aus Zeit, Paketnummer oder Reihenfolge ist ausgeschlossen: Eine Stellung bekommt in jedem Paket und bei jeder Wiederholung denselben Seed. **Im Test festzuhalten:** Festwerte, die das Werkzeug beim Bau selbst erzeugt, plus der Nachweis, dass Paketzuteilung und Reihenfolge den Seed nicht ändern. Die Festwerte stehen noch nicht fest; ich habe keine berechnet.
- Basis 1 teilt mit Stufe C und Zähldiagnose nur die Ableitungsfunktion; die Schlüsselmengen sind disjunkt (Prüfdaten gegen Entwicklungsdaten, §3.2), also entstehen keine gleichen Seeds für gleiche Stellungen.

### 16.6 Paketgröße

**Vorschlag: 50 Stellungen je Paket, 43 Pakete** (1.718 + 400 = 2.118 Stellungen; 2.118 / 50 aufgerundet = 43; Workflow-Grenze wie in Stufe C: höchstens 60 Pakete).
- **Zuteilung:** Alle 2.118 Stellungen (betroffene und Kontrolle gemischt) werden nach `fnv32("diagonal-pruefung-v1|paket|1|" + id)` (bei Gleichstand nach `id`) sortiert und in Blöcke der nach der Probe festgelegten Paketgröße geteilt (Vorschlag vor der Probe: 50); die Paketgröße ist ein Parameter des Werkzeugs, nicht im Code festgeschrieben. So fehlt bei einem ausgefallenen Paket keine Art ganz, und die Zuteilung hängt nicht von Gruppe oder Dateireihenfolge ab.
- **Zeitbudget (Annahme, nicht gemessen):** Bei 10 s je Stellung für zwei Referenzläufe wären das etwa 8 Minuten je Paket und rund 6 Stunden Rechenzeit insgesamt (2.118 × 10 s), auf Pakete verteilt; mit dem Sicherheitsfaktor 10 bliebe ein Paket bei rund 83 Minuten, unter einer Job-Grenze von 340 Minuten (wie Stufe C). Die 10 s sind eine Setzung; Messwerte gibt es nicht. Deshalb vor dem Hauptlauf eine **Probe** (nächster Punkt). Vor dem Hauptlauf wird die Schätzung genannt; zeigt ein Paket weit mehr, berichtet die KI das und fragt, ob der Lauf abgebrochen wird (wie Stufe C, §14 Nr. 2).
- **Probe in Actions vor dem Hauptlauf (Vorschlag, eigenes Go, eigener Workflow-Lauf; keine Bedingung von E-2):** Sie misst die **Dauer** und prüft, dass der Ablauf aus 16.3 mit echtem GNU Go funktioniert. **Umfang:** 20 betroffene Stellungen, **die 10 mit dem höchsten Zugindex in S** (längste Partien) und **10 aus V350** (Kennung nach Hash, Basis 1); dazu 4 Kontrollstellungen aus der Ziehung von 16.4 (2 S, 2 V; die ersten der Hash-Reihenfolge). Auswahl rein nach Index und Hash aus Stufe 1, nicht nach Ergebnis. **Auswertung nur technisch:** Dauer je Stellung und je Referenzlauf (Median, Maximum), Status, Pflichtkontrollen, Wiederholbarkeit R1 gleich R2; **keine** Schicht-A-Zahlen und keine Tot-Listen im Log (wie `--probe` in Stufe C), die Probe geht in keine Kennzahl ein und ersetzt keine Stellung des Hauptlaufs, alle 2.118 Stellungen laufen im Hauptlauf neu. Eine Probe, die einen Pflichtfehler zeigt, ist ein Befund über Werkzeug oder Umgebung; die Fehler werden behoben, bevor ein Hauptlauf ein Go bekommt.
- **Paketgröße nach der Probe (Setzung):** Die Größe bleibt 50, wenn **Maximum je Stellung × 50 ≤ 60 Minuten** (Rechenzeit eines Pakets, ohne Installation). Sonst ist die größte ganze Zahl **G = ⌊3.600 s / Maximum je Stellung⌋** die Obergrenze für das Budget. Die Zahl der Pakete ist dann ⌈2.118 / G⌉.
  - **Ist G ≥ 36** (also höchstens 60 Pakete), gilt G, höchstens 50.
  - **Ist G < 36** (Beispiel: 120 s je Stellung ergeben G = 30 und 71 Pakete), lassen sich Budget und Paketgrenze nicht zugleich einhalten. **Die 36 ist dann keine Untergrenze und wird nicht automatisch eingesetzt.** Die Grenze von 60 Paketen stammt aus dem vorgesehenen Workflow (wie in Stufe C), nicht aus einer Vorgabe von GitHub; sie wird **neu entschieden**: Hazeberry entscheidet vor dem Go zum Hauptlauf, ob die Paketgrenze erhöht, das Budget je Paket (60 Minuten, Setzung; die Job-Grenze von 340 Minuten bliebe) gelockert oder der Plan geändert wird. Bis dahin gibt es keinen Hauptlauf.
  - Die Entscheidung und die gewählte Paketgröße stehen vor dem Go zum Hauptlauf im Doc.
- **Fortsetzungslauf (später, nur mit Go):** ganze Pakete, nie einzelne Stellungen, nur bei technisch bedingtem Nichtausführen; ein wiederholtes Paket **ersetzt** das erste vollständig (§10.3 Ebene 3). Pakete mit einzelnen Ausfällen werden nicht wiederholt.
- **Alternative:** 25 je Paket (85 Pakete, über der Grenze von 60 ohne Änderung des Workflows) oder 100 je Paket (22 Pakete, längere Einzeljobs, größerer Verlust bei einem Abbruch). 50 ist ein Mittelweg ohne Herleitung.

### 16.7 Ausfallgrenze (Vorschlag, nicht bestätigt)

**Vorschlag: die 5 % aus §10.3**, jetzt mit Zahlen. Sie bleibt ein **Vorschlag**, bis Hazeberry sie bestätigt oder ändert; sie ist eine Setzung ohne Herleitung und **nicht** aus Stufe C übernommen.
- **Betroffene Stellungen, je Stellungsart:** Schicht A ist für diese Art **ungültig** (KEIN URTEIL, Lauf rot), wenn **mehr als 5 %** der betroffenen Stellungen ausfallen (einschließlich nicht wiederholbarer). Mit den Zahlen aus Stufe 1: **S: ab 33 Ausfällen** (5 % von 658 sind 32,9) und **V: ab 54 Ausfällen** (5 % von 1.060 sind 53).
- **Kontrollstichprobe, je Art (Vorschlag):** mehr als 5 % der 200 Kontrollstellungen, also **ab 11 Ausfällen je Art**, macht die **Kontrolle** dieser Art ungültig; da die Kontrolle Pflichtbestandteil von Stufe 2 ist, ist dann die Stufe ungültig und der Lauf rot.
- **Wirkung kleiner Anteile:** Die Grenze bestimmt nur, wann Schicht A **nicht mehr berichtet** wird. **Jeder** ungeklärte Ausfall in einer betroffenen Stellung verhindert die positive Kandidatur (§10.3, §8 Nr. 4), auch unter der Grenze. Ausfälle sind nicht zufällig (schwierige Stellungen, Absturz durch die Stellung selbst); sie werden einzeln mit Stellung, Gruppe, Art, Partielänge, Ursache und dem Unterschied der Tot-Mengen aus und an aufgelistet.
- **Pflichtfehler** (Datenfehler, Replay-Fehler, abweichendes Brett, unerwartete Ausnahme, Versionsunterschied zwischen Paketen, nicht bestandene Kontrollen aus 16.2) werden **nicht** als Ausfall gezählt und machen die Stufe ungültig, unabhängig von der Grenze.
- **Fehlende Pakete:** Fehlt ein Paket oder bricht es ab, ist der Lauf ungültig (KEIN URTEIL); der Auswertungsjob nennt die fehlenden Pakete (16.10). Über die Wiederholung ganzer Pakete entscheidet Hazeberry.

### 16.8 Ausgabe und mechanische Auswahl für Stufe 3

- **Je Stellung** (JSONL): Kennung, Art, Gruppe, Seed, Rohantworten von R1 und R2, `dead`/`alive`/`seki`, `final_score` (S), Tot-Mengen der App bei aus und an, Zuordnung zu betroffen oder Kontrolle, Status (gültig, Ausfall mit Ursache, Pflichtfehler). Dazu Bericht (`bericht.json/.md`), Protokoll von Version und Umgebung, Paketliste.
- **Kennzahlen:** nach §5, **behoben und neu entstanden getrennt**, nie nur als Saldo, je Art und Gruppe, mit Clopper-Pearson (95 %, Modellannahmen). Kontrolle und betroffene Stellungen getrennt.
- **Mechanische Auswahl der Ketten (§6.1, §11 Nr. 4), im selben Lauf und ohne Sicht auf Urteile:**
  - **B1:** **alle** neu entstandenen Abweichungen (Kette bei aus gleich GNU Go, bei an abweichend), S und V, **ohne Deckel**.
  - **B2:** Ketten aus betroffenen Stellungen, die nicht in B1 liegen und mindestens einen von GNU Go abweichenden Stein haben. **Deckel 60** (§10.4). Ziehung nach Hash (`fnv32("diagonal-pruefung-v1|b2|" + Basis + "|" + Kettenschlüssel)`, Basis 1) aus den **Zellen** Art (S, V) × Klasse × Richtung nach der Definition unten. Verteilung der 60 Plätze **proportional zur Zellgröße** (größter Rest, bei Gleichstand nach Zellname), **mindestens 1 je nicht leerer Zelle**; sind es insgesamt höchstens 60 Ketten, werden alle genommen (**Vorschlag**, §6.1 verlangt „geschichtet“, nennt die Verteilung nicht).
  - **Eindeutige Zuordnung einer Kette** (jede Kette bekommt genau eine Zuordnung, geprüft in dieser Reihenfolge):
    1. **B1**, wenn mindestens ein Stein der Kette neu entstanden ist (bei aus gleich GNU Go, bei an abweichend). B1 hat Vorrang, damit B1 vollständig bleibt; eine solche Kette liegt nie zugleich in B2.
    2. Sonst **B2-Klasse „behoben“**, wenn mindestens ein Stein der Kette behoben ist (bei aus abweichend, bei an gleich GNU Go); sonst **Klasse „unverändert abweichend“** (mindestens ein Stein weicht bei aus und bei an ab). Eine Kette ohne abweichenden Stein ist weder in B1 noch in B2.
    3. **Richtung** (für beide Klassen gleich definiert, **aus der Abweichung bei aus gegenüber GNU Gos Tot-Liste**, nicht aus einem Wechsel zwischen aus und an, der bei „unverändert abweichend“ nicht stattfindet): **„GNU tot“**: GNU Go führt die abweichenden Steine als tot, die App bei aus nicht (hier kann der Schalter mit „zusätzlich tot“ helfen). **„GNU lebend“**: GNU Go führt sie als lebend, die App bei aus als tot (hier kann der Schalter mit „wieder lebendig“ helfen). **„gemischt“**: die abweichenden Steine einer Kette liegen in beiden Richtungen (GNU Go listet Steine einzeln, daher möglich). Zellen: 2 Arten × 2 Klassen × 3 Richtungen, höchstens 12.
    4. Jede B2-Kette weicht **bei aus** ab: Weicht sie bei aus nicht ab und bei an doch, ist sie neu entstanden (Nr. 1); weicht sie bei aus ab und ändert die App bei an den Status, ist sie behoben, es sei denn, ein Stein ist neu entstanden (Nr. 1). Damit ist die Richtung für jede B2-Kette definiert.
    5. Bei „behoben“ ist die Richtung gleich der Richtung des Wechsels in Schicht A (§5: „zusätzlich tot“ = „GNU tot“, „wieder lebendig“ = „GNU lebend“); die Schicht-A-Begriffe bleiben für Ketten mit Wechsel, die Zellbegriffe gelten nur für die Ziehung.
    6. **Nicht geprüft:** dass eine Kette bei der App immer ganz tot oder ganz lebend ist (gelesen: `toteSteineAmEnde` entfernt Verbände aus ganzen Ketten, nicht am Code nachgespielt); der Test deckt den Fall einer Kette mit teilweise abweichenden Steinen ab.
  - **Kettenschlüssel:** Stellungskennung plus kleinster Punkt der Kette (Koordinate); eine Kette ist ein Zusammenhang gleichfarbiger Steine (§6 von `zaehlung-mechanismus.md`).
- **Klarstellung zu §10.4:** Bei der KI-Beurteilung heißt „alle Fälle“ **alle B1-Fälle plus höchstens 60 B2-Fälle**; B2 wird nicht vollständig beurteilt, B1 nie gekürzt. Der Satz „KI-Beurteilung aller Fälle (B1 und B2)“ in §10.4 ist in diesem Sinn zu lesen.
- Ausfälle in betroffenen Stellungen haben **keine** GNU-Go-Liste und gehen deshalb weder in B1 noch in B2 ein; sie stehen als ungeklärt im Bericht (§8 Nr. 4).

### 16.9 Gültigkeit

Nur zwei Zustände. **Ungültig = KEIN URTEIL mit Grund, Lauf rot** bei: nicht bestandener Eingabeprüfung (16.2), Pflichtfehler (16.3, 16.7), Überschreiten der Ausfallgrenze (16.7), fehlenden Paketen, unterschiedlichen GNU-Go-Versionen oder -Argumenten, Paketergebnissen aus unterschiedlichen Ständen der Engine oder des Werkzeugs, fehlender Vollständigkeit (jede der 2.118 Kennungen genau einmal im Ergebnis, mit Status). Die Fallabdeckung („gleich“ erst nach Vorprüfung, CLAUDE.md) gilt für die Wiederholbarkeit von R1 und R2 sinngemäß: Ein Befund „R1 gleich R2“ zählt nur, wenn mindestens eine Stellung je Art eine nicht leere `dead`-Liste hat; sonst KEIN URTEIL.

### 16.10 Umsetzung (nach Freigabe und eigenem Go, nicht jetzt)

Werkzeug `auswertung/endspiel/diagonal-pruefung-stufe2.js` (Name **Vorschlag**), Workflow `.github/workflows/diagonal-pruefung-stufe2.yml` (nur `workflow_dispatch`, GNU Go auf `ubuntu-24.04`, Matrix über Pakete mit `fail-fast: false`, Auswertungsjob mit Gültigkeit), Test `tests/diagonal-pruefung-stufe2.js` mit Attrappe statt GNU Go (in `tests/run.js`, `tests/README.md` und `tests.yml` eintragen; Lizenzzeilen nach `tests/lizenz.js`). Der Test soll abdecken: Seed-Festwerte und Unabhängigkeit von Paketzuteilung, Ziehung und Zuteilung bytegleich bei Wiederholung, Ausfallgrenze an der Schwelle (32/33 und 53/54, 10/11), Pflichtfehler gegen Ausfall, nicht wiederholbare Stellung, Vollständigkeit, B1 vollständig, B2-Zellverteilung **für alle drei Richtungen und beide Klassen**: je ein Fall „unverändert abweichend“ mit Richtung „GNU tot“ und mit „GNU lebend“, ein Fall „behoben“ je Richtung, eine Kette mit gemischten Richtungen, eine Kette mit neu entstandenem und behobenem Stein (muss B1 sein, nie B2), und eine Kette ohne Abweichung (in keiner Menge). **Den echten Ablauf mit GNU Go kann der lokale Test nicht prüfen.**
**Workflow, Isolation der Pakete:** Die Matrix läuft mit `fail-fast: false`, damit ein fehlgeschlagenes Paket die übrigen nicht abbricht. Jedes Paket lädt sein Ergebnis mit `if: always()` hoch. Der Auswertungsjob hängt von allen Paketen ab und läuft mit `if: always()`; er vergleicht die erwartete Paketliste (aus der Planung) mit den vorhandenen Ergebnissen, **nennt die fehlenden Pakete mit Nummer und Kennungen** und schließt den Lauf **rot** ab, wenn Pakete fehlen oder die Gültigkeit nach 16.9 nicht besteht (Muster: Stufe C, `passregel-vergleich.yml`, Auswertungsjob). Ein Paketfehler wird nie im Auswertungsjob verdeckt. Der Test der Auswertung deckt „Paket fehlt“ und „Paket ohne Ergebnisdatei“ ab. Der Workflow selbst lässt sich nur in Actions prüfen.
Reihenfolge: dieser Doc-PR → Merge (Hazeberry liest vorher) → **Go zum Bauen** → PR → CI → Merge → **Go zur Probe** (16.6) → Ergebnis der Probe, Paketgröße bestätigt → **E-2 geklärt** → **Go zum Hauptlauf** (vorher: was läuft, wo, welches Go).

### 16.11 Offene Entscheidungen (Hazeberry)

1. Ausfallgrenze 5 % in der Form von 16.7 (Betroffene und Kontrolle) bestätigen oder ändern.
2. Kontrollstichprobe 200 je Art ohne Schichtung (16.4).
3. Seed-Basis 1 und voller Quellpfad im Seed (16.5).
4. Paketgröße 50, 43 Pakete, die Annahme von 10 s je Stellung, die Probe mit 24 Stellungen und die Regel „Maximum × 50 ≤ 60 Minuten“ mit der Neuentscheidung der Paketgrenze bei G < 36 (16.6); Zeitgrenzen 16.3 Nr. 7.
5. Zellen und Verteilung der 60 B2-Plätze (16.8, Richtung aus der Abweichung bei aus, höchstens 12 Zellen) und Hinweis-Vergleich `final_score` gegen `endstand` (16.3 Nr. 5).
6. **E-2** bleibt offen (§10.4) und ist Voraussetzung für das Go zu Stufe 2.

### 16.12 Freigaben

Dieser Abschnitt erteilt kein Go für den Bau, einen Lauf, Stufe 2 oder 3, einen Engine-Vergleich, einen Standardwechsel oder einen Merge. Das Doc enthält Vorgaben; Hazeberry liest es vor dem Merge. `diagonalAugeEnde` bleibt standardmäßig 0, `passNachGegnerpass` bleibt aus.

## 17. Stand der Umsetzung AP4 (12.11.2026)

Hazeberry hat die Vorschläge aus §16.11 als Grundlage für den Bau bestätigt und das Go zum **Bauen** des Stufe-2-Werkzeugs, des Workflows und der Tests nach §16.10 erteilt („Go zum Bauen des Stufe-2-Werkzeugs“). Es gilt nur für das Bauen. **Kein Lauf, kein GNU Go, kein Workflow gestartet, keine Rechnung auf den Archiven.** Die Probe, die Entscheidung über die Paketgröße, E-2 und der Hauptlauf brauchen je ein eigenes Go bzw. eine eigene Entscheidung.

| AP | Stand | Inhalt |
|---|---|---|
| AP4 | gebaut, nicht gelaufen | `auswertung/endspiel/diagonal-pruefung-stufe2.js` (`plan`, `paket`, `auswerten`), Workflow `.github/workflows/diagonal-pruefung-stufe2.yml` (nur `workflow_dispatch`, Modus `probe` oder `haupt`), Test `tests/diagonal-pruefung-stufe2.js` (Attrappe, 28 Fälle, lokal grün). Am Werkzeug von Stufe 1 ist nur die Exportzeile erweitert (`rechneStellung`, `indizesVon`); dessen 12 Fälle laufen unverändert grün. |

### 17.1 Konkretisierungen beim Bau (Setzungen, Entscheidung bei Hazeberry)

§16 ließ einiges offen oder nannte es nicht; das habe ich beim Bau so festgelegt. Jeder Punkt ist ohne Aufwand änderbar.

1. **Eingabe:** Das Werkzeug liest ein entpacktes Stufe-1-Verzeichnis. Die Prüfung des ZIP (SHA-256 gegen den gebundenen Wert `8c835dfb…c133740` und `SHA256SUMS`) macht der Workflow; die Hashes der drei Dateien stehen im Plan und werden in jedem Paket neu geprüft. Die SHA-256 der `index.html` kommt aus dem Kopf von `neu.jsonl` (kein fester Wert im Werkzeug); weicht die `index.html` des Laufs ab, ist das ein Pflichtfehler des Pakets.
2. **Ausfall oder Pflichtfehler (§10.3):** Absturz oder Ende des Prozesses und Timeout sind Ausfälle und bekommen genau einen Wiederholungsversuch (gleicher Seed, frischer Prozess). Eine Fehlerantwort „?“ auf `final_score` oder `final_status_list` („cannot score“) ist ein Ausfall **ohne** Wiederholung. Eine Fehlerantwort auf Kopfbefehl, Zug (abgelehnter Archivzug), `list_stones` oder `captures` ist ein Pflichtfehler. Ein Brett von GNU Go, das von Stufe 1 abweicht, abweichende Gefangene, ungültige Koordinaten oder Zahlen und ein App-Ergebnis, das von `neu.jsonl` abweicht, sind Pflichtfehler.
3. **Zeitgrenzen (§16.3 Nr. 7):** 120 s je Befehl, 600 s je Referenzlauf, als Optionen des Werkzeugs; die Werte sind Setzungen ohne Messung.
4. **Kontrolle:** Gibt es von einer Stellungsart keine Stellung, entfällt ihre Kontrolle (in den echten Daten nicht der Fall). `--kontrolle N` überschreibt die Regel „gleich viele wie betroffene, 50 bis 200“ und ist für Tests und die Probe gedacht.
5. **Probe-Auswahl (§16.6):** betroffene S nach höchstem Zugindex, bei Gleichstand nach Hash; betroffene V nur V350, nach Hash `fnv32("diagonal-pruefung-v1|probe|1|" + id)`; Kontrolle: die ersten 2 S und 2 V der Kontroll-Reihenfolge. In der Probe stehen weder Tot-Mengen noch Tot-Listen im Ergebnis, und der Bericht enthält keine Zahlen der Schicht A.
6. **Speicherung (Hauptlauf):** Von R1 und R2 werden die Rohantworten von `final_status_list dead/alive/seki`, `captures` und `final_score` abgelegt; `list_stones` nur als SHA-256 und als Ergebnis des Brettabgleichs; die Antworten auf die Züge nur in der SHA-256 des ganzen Protokolls, die beide Läufe zeichengleich haben müssen. §16.8 sagt „Rohantworten von R1 und R2“; das ist damit enger gefasst.
7. **Kalibrierung von `captures`:** je Paket einmal wie in der Zähldiagnose, mit einem aus `fortsetzungsSeed(Basis, "kalibrierung", "kalibrierung", 0, 0)` abgeleiteten Seed. Scheitert sie, ist das ein Paketfehler (Pflichtfehler).
8. **Kennzahlen „Punkte“ (§5):** Abstand des Standes zum Referenzstand aus GNU Gos Tot-Liste, je Art, Kategorie und Gruppe: gleich bei aus, gleich bei an, bei an näher, bei an weiter, Abstand gleich, Sieger wie die Referenz. Referenz bei S und Fläche ist `final_score`, sonst die App-Rechnung auf GNU Gos Tot-Liste; bei V steht kein `final_score` zur Verfügung (§16.3 Nr. 2) und gemessen wird „mit Annahmen“.
9. **Verteilung der B2-Plätze (§16.8):** Mindestens 1 je nicht leerer Zelle, danach geht jeder weitere Platz an die Zelle mit der größten Lücke zum proportionalen Anteil (Gleichstand: Zellname), nie mehr als die Zellgröße. Das setzt die Formulierung „proportional, größter Rest“ als schrittweise Vergabe um. Bei höchstens 12 Zellen und Deckel 60 geht das Minimum nie über den Deckel; bei einem kleineren Deckel (nur im Test) hat das Minimum Vorrang.
10. **Kettenschlüssel:** Stellungskennung und der **kleinste Brettindex** der Kette (Zeile für Zeile von oben links), als Koordinate geschrieben.
11. **Auswertung:** Die Fallabdeckung (§16.9) gilt je Stellungsart für gültige Stellungen mit nicht leerer `dead`-Liste; die Ausfallgrenze wird je Art und je Kategorie (betroffen, Kontrolle) geprüft (ganzzahlig: Ausfälle · 100 > 5 · n). Der Auswertungsjob läuft mit `always()` und nennt fehlende Pakete mit Nummer und den ersten Kennungen.
12. **Workflow-Sperre:** Im Modus `haupt` verlangt der Plan-Job die Eingabe `e2_entschieden` (E-2 und die Paketgröße nach der Probe entschieden). Das ist eine Sperre gegen Versehen und **ersetzt kein Go**.

### 17.2 Was die Tests belegen und was nicht

- `tests/diagonal-pruefung-stufe2.js` läuft das ganze Werkzeug als eigene Prozesse an einer **Attrappe** (16 Zufallspartien, Stufe-1-Dateien vom Werkzeug von Stufe 1 gerechnet, GNU Go als ausführbares Programm, das mit den Engine-Funktionen spielt). Geprüft sind: Plan (Hash-Ziehung, Zuteilung, Reihenfolgeunabhängigkeit), Ausfallgrenze an den Schwellen, Zuordnung der Ketten und Verteilung der Plätze, Betroffene gleich einer unabhängigen Rechnung, Ausfall gegen Pflichtfehler, Wiederholungsversuch, fehlende Pakete, abweichende Version, falscher Seed, Probe und Workflow-Datei. Ein Test weist einen aktivierten Schalter `diagonalAugeEnde` und eine vom Plan abweichende `index.html` zurück und prüft jeden der beiden Gründe einzeln (der Plan wird so gebaut, dass nur dieser eine Grund zutrifft); es wird keine Stellung gerechnet, die Auswertung ist ungültig. Ein Prüfsummentest zeigt, dass `index.html`, die Eingaben der Stufe 1 und das Archiv vor und nach Plan, Paket und Auswertung gleich sind. Der frühere Quelltext-Regex dazu entfällt (fragil bei Umformatierung). Beides hat Hazeberry nach dem Merge von #302 gefordert.
- **Mutationsprobe bestanden:** Entfernen des B1-Vorrangs, Ausfallgrenze 10 statt 5, vertauschte Richtung, kein Wiederholungsversuch, Wiederholbarkeit nicht geprüft und entfernter Brettvergleich lassen je mindestens einen Test fehlschlagen (der Brettvergleich erst nach einem Zusatzfall im Test).
- **Nicht geprüft:** das **echte GNU Go** (Antwortformat von `final_status_list` und `list_stones` bei langen Listen, Dauer, Absturzverhalten bei der Debian-Fassung 3.8); der **Workflow in Actions** (nur die YAML-Datei geladen und im Test auf ihre Bestandteile geprüft); die Dauer je Stellung (die 10 s aus §16.6 sind unverändert eine Annahme); die Archive und die Daten aus Stufe 1 (der Test nutzt eine Attrappe).
- Lokal gelaufen sind nur `tests/diagonal-pruefung-stufe2.js`, `tests/diagonal-pruefung.js` und `tests/lizenz.js`; die gesamte Suite prüft die reguläre CI.

### 17.4 Korrekturen nach der Durchsicht von #302 (12.11.2026)

Hazeberry hat am Stand `513075a` drei Fehler gefunden (aus Code, Workflow und Tests gelesen). Alle drei sind berichtigt; sie hätten die Auswertung der Probe verfälscht oder Datenfehler durchgelassen.

1. **Langsame R1-Ausfälle fehlten in der Laufzeitstatistik.** `dauerMs.gesamt` wurde erst nach R2 gesetzt; bei einem Ausfall oder Pflichtfehler in R1 kehrte die Stellung vorher zurück, und der Probebericht (der nur Zeilen mit diesem Wert zählt) ließ gerade die langsamsten Fälle aus dem Maximum, was eine zu große Paketgröße nahegelegt hätte. Jetzt gilt `gesamt` schon nach R1 und wird nach R2 fortgeschrieben. Test: R1 zweimal Timeout steht mit mindestens 2 × der Zeitgrenze im Bericht, die Statistik zählt alle Stellungen, und das Maximum ist gleich dem größten Wert der Ergebniszeilen.
2. **Doppelte Kennungen innerhalb eines Pakets wurden übersehen.** Die Prüfung sah nur Kennungen aus früheren Paketen. Jetzt wird auch innerhalb jedes Pakets auf Duplikate geprüft (Grund „mehrfach im Paket n“). Test: eine zusätzliche Kopie einer Zeile bei sonst vollständigem Paket, und eine Kennung doppelt statt der fehlenden.
3. **Zeilen ohne gültigen Status konnten unbemerkt verschwinden.** Jede Ergebniszeile braucht jetzt einen der Werte `gueltig`, `ausfall`, `pflichtfehler` mit den zugehörigen Feldern (Dauer bei gültig und Ausfall; Ursache bei Ausfall; Grund bei Pflichtfehler; bei gültig wiederholbar, im Hauptlauf auch GNU-Go-Liste und App-Tot-Mengen); sonst ist der Lauf ungültig (KEIN URTEIL, Exit 1). Test: sieben Varianten (unbekannter Status, fehlender Status, fehlende Dauer, nicht wiederholbar, fehlende Liste, Ausfall ohne Ursache, Pflichtfehler ohne Grund).
4. **Folgefehler, beim Test gefunden:** Fehlte bei einer „gültigen“ Zeile die GNU-Go-Liste, stürzte die Fallabdeckung mit Exit 2 ab, bevor die Statusprüfung greifen konnte. Die Fallabdeckung überspringt jetzt solche Zeilen; die Statusprüfung meldet sie.

**Mutationsprobe:** Wird jede der drei Korrekturen einzeln zurückgenommen, schlägt genau der zugehörige Test fehl.

### 17.3 Reihenfolge und Freigaben

Nächste Schritte, je eigenes Go: Merge dieses PR (Hazeberry liest vorher) → **Go zur Probe** (`diagonal-pruefung-stufe2.yml`, Modus `probe`) → Auswertung der Dauer, Entscheidung über die Paketgröße (bei G < 36 Neuentscheidung der Paketgrenze, §16.6) → **E-2 entschieden** → **Go zum Hauptlauf** (Modus `haupt`, `e2_entschieden` gesetzt). Dieser Abschnitt erteilt kein Go für einen Lauf, Stufe 3, einen Engine-Vergleich, einen Standardwechsel oder einen Merge. `diagonalAugeEnde` bleibt standardmäßig 0, `passNachGegnerpass` bleibt aus.

### 17.5 Probe, erster Hauptlauf und Korrektur des Image-Vergleichs (12.11.2026)

Die Aussagen „nicht gelaufen“ in 17.2 und die Reihenfolge in 17.3 beschreiben den Stand beim Bau; dieser Abschnitt hält fest, was danach geschah. Quellen: Job-Logs und Berichte der Läufe (gelesen), das gesicherte ZIP der Probe (am 12.11.2026 aus dem Branch von #303 geholt und selbst geprüft).

**17.5.1 Probe (Lauf `43193672197`, Run 1, `main` bei `a4102db`, Modus `probe`, Go von Hazeberry)**
- Gültig (technisch), alle Kontrollen bestanden, 24 Stellungen gültig (betroffen S 10 und V 10, Kontrolle S 2 und V 2), 0 Ausfälle, kein Wiederholungsversuch; R1 und R2 mit demselben Seed zeichengleich; Brett, Gefangene und App-Ergebnis gleich Stufe 1.
- Dauer je Stellung (beide Referenzläufe): Median 0,46 s, 95 %-Quantil 0,81 s, Maximum 1,47 s (S höchstens 0,6 s, V höchstens 1,5 s). Regel aus §16.6: Maximum × 50 ≤ 60 Minuten, Paketgröße 50 bleibt. Die Annahme von 10 s je Stellung war rund 20-mal zu hoch.
- Umgebung laut Paketkopf: GNU Go 3.8, Paket `gnugo 3.8-11build2`, Runner-Image `20261101.360.1`, `captures`-Konvention „gefangen-von“.
- Grenzen: nur 24 Stellungen (die längsten betroffenen S-Stellungen und V350); ein Absturz, ein Timeout und „cannot score“ traten nicht auf, diese Pfade sind mit dem echten GNU Go weiter nur mit der Attrappe geprüft. Es gibt keine Tot-Listen und keine Zahlen der Schicht A.
- Rohdaten: Artefakt `diagonal-pruefung-stufe2` (ID `13931074517`, 5.466 Bytes, SHA-256 `6fb25e46395912ca14f1a65f23e1b8249f2ee9a0296e5420d633e6f091043435`, gleich dem Actions-Digest). Die Git-Kopie liegt in PR #303 unter `docs/daten/diagonal-pruefung/stufe2-probe-43193672197/` (zum Zeitpunkt dieses Textes noch nicht gemergt); das GitHub-Artefakt läuft am 10.02.2027 ab.

**17.5.2 Entscheidungen von Hazeberry (12.11.2026)**
E-2 bestätigt: getrennte KI-Beurteilung für alle B1-Fälle und höchstens 60 B2-Fälle, ohne menschliche Teilmenge und ohne optionale Fuego-Probe (§10.4). Paketgröße 50 bestätigt. Beurteilungen sind weiterhin keine Ground Truth.

**17.5.3 Erster Hauptlauf (Lauf `43197546660`, Run 2, `main` bei `a4102db`, Modus `haupt`, Paketgröße 50, `e2_entschieden` an, Go von Hazeberry): ungültig, KEIN URTEIL**
- 43 Pakete mit 2.118 Stellungen (betroffen S 658 und V 1.060, Kontrolle S 200 und V 200). Gesamtdauer des Laufs etwa vier Minuten.
- Bestanden laut Bericht: Pakete vollständig, Vollständigkeit (jede Kennung genau einmal), Seeds, Status jeder Zeile, Pflichtfehler (keine), Ausfallgrenze (keine Ausfälle), Fallabdeckung der Wiederholbarkeit.
- **Nicht bestanden:** die Kontrolle „Köpfe“. Die Pakete 19 und 22 liefen auf dem Runner-Image `20261111.370.1`, die übrigen auf `20261101.360.1`; GitHub hat das Image während des Laufs offenbar gewechselt. GNU-Go-Version, Paketversion, Argumente, Plan und `index.html` waren dabei in allen Paketen gleich (sonst stünden sie in der Fehlerliste).
- **Wegen der Ungültigkeit gibt es keine Zahlen der Schicht A und keine Auswahl B1 und B2.** Aus den Paketdateien wurde nichts gerechnet.
- Rohdaten: Artefakt `diagonal-pruefung-stufe2` (ID `13933992030`, 1.580.039 Bytes, Actions-Digest SHA-256 `b916b83e0f4e34502754dbdf1361b2783b3fd3dc175773760899f9f6444f0000`) und 43 Einzelartefakte `ergebnisse-teil-<n>`; nicht in Git gesichert, Ablauf am 10.02.2027. Eine Sicherung ist nach Angabe von Hazeberry bei Luna vorbereitet; ein PR dazu war beim Schreiben nicht gesehen.

**17.5.4 Ursache und Korrektur (Fehler im Bau, offen berichtigt)**
- **Ursache:** Der Kopfvergleich der Auswertung machte auch die Runner-Image-Version zur Pflicht. §16.3 Nr. 6 und §16.9 verlangen dagegen gleiche GNU-Go-Version und gleiche Argumente; das Image wird nur protokolliert. Das Werkzeug war damit strenger als die Vorabfestlegung. Das stand nicht in 17.1 und fiel in der Attrappe nicht auf.
- **Korrektur:** `imageVersion` wird nur noch protokolliert; der Bericht nennt die Images der Pakete mit Anzahl. Weiter verglichen und bei Abweichung ungültig: GNU-Go-Version, Paketversion, Argumente, `index.html`, Plan, Modus, jeder Paketfehler. Test: zwei Pakete auf verschiedenen Images sind gültig und der Bericht nennt beide; abweichende GNU-Go-Version, Paketversion oder Argumente bleiben ungültig. Mutationsprobe: Wird der Image-Vergleich wieder zur Pflicht oder der Vergleich der Paketversion entfernt, schlägt dieser Test fehl.
- **Einordnung:** Das ist eine Änderung einer Gültigkeitsregel nach einem roten Lauf. Sie hängt nicht von Ergebnissen ab (es gibt keine) und stellt den in §16.3 und §16.9 vorab festgelegten Wortlaut wieder her. Der erste Hauptlauf bleibt als ungültig dokumentiert und wird **nicht** verrechnet; ein neuer Hauptlauf rechnet alle 2.118 Stellungen neu.

**17.5.5 Freigaben**
Dieser Abschnitt erteilt kein Go für einen neuen Hauptlauf, Stufe 3, einen Engine-Vergleich, einen Standardwechsel oder einen Merge. Ein neuer Hauptlauf braucht nach dem Merge der Korrektur ein eigenes Go (Modus `haupt`, `e2_entschieden` an). `diagonalAugeEnde` bleibt standardmäßig 0, `passNachGegnerpass` bleibt aus.

### 17.6 Zweiter Hauptlauf (12.11.2026)

[Lauf 43274198340, Auswertungsjob](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/43274198340/job/131380168385), Run 3, `main` bei `f43fa4d65e8c90079266c2457e246fb5b0163dbb`, Modus `haupt`, Paketgröße 50, `e2_entschieden` gesetzt, mit Go von Hazeberry. Quelle ist der Bericht im Job-Log. Die Paketdateien wurden für diesen Nachtrag nicht geprüft.

- **Gültig:** alle acht Pflichtkontrollen bestanden. 2.118 Stellungen in 43 Paketen (betroffen S 658, V 1.060, Kontrolle je 200), 0 Ausfälle und 0 Pflichtfehler.
- **Runner-Images:** `20261101.360.1` in 27 Paketen, `20261111.370.1` in 12 und `20261111.127.1` in 4. GNU-Go-Version, Paketversion und Argumente waren gleich. Ohne die Korrektur aus #304 hätte der frühere Image-Vergleich den Lauf wegen der unterschiedlichen Images als ungültig gewertet.

| Art | Betroffene Stellungen | Steine behoben | Steine neu entstanden | Steine unverändert abweichend | Nur behoben (Stellungen) | Nur neu (Stellungen) | Beides | Ohne Änderung |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| S | 658 | 10.704 | 7 | 319 | 657 | 1 | 0 | 0 |
| V | 1.060 | 18.460 | 1.602 | 3.218 | 981 | 52 | 27 | 0 |

Der Auswerter ordnet jede Stellung genau einer der vier Kategorien zu. In V summieren sie sich zu 981 + 52 + 27 + 0 = 1.060. Die sieben neu entstandenen Abweichungen in S waren alle „zusätzlich tot“ und lagen in einer Stellung aus Fuego 50 Spiele. In V waren es 1.390 „zusätzlich tot“ und 212 „wieder lebendig“.

| Art | Wertung | Sieger wie Referenz, aus | Sieger wie Referenz, an | Bei an näher | Bei an weiter |
|---|---|---:|---:|---:|---:|
| S | Fläche | 460 | 655 | 653 | 5 |
| S | Territory | 588 | 656 | 653 | 5 |
| V | Fläche | 784 | 1.011 | 976 | 84 |
| V | Territory | 867 | 1.015 | 976 | 84 |

„Sieger wie Referenz“ zählt gleiche Vorzeichen des Stands. In der Kontrollstichprobe änderte der Schalter keine Steinbewertung. Unverändert von der Referenz abweichend waren 175 Steine in S und 1.493 in V. In V wich der Stand bei beiden Wertungen in 74 von 200 Kontrollstellungen von der Referenz ab.

- **Auswahl für Stufe 3:** B1 umfasst 356 Ketten. Für B2 wurden 60 aus 6.820 Kandidaten in acht Zellen gezogen. Die größten Zuteilungen entfallen auf „behoben, GNU tot“ (V 30, S 18). Zwei Stellungen haben einen Seki-Eintrag bei GNU Go. Für die 416 Unterlagen sieht §10.4 vorab eine Zeitschätzung an drei Probestücken vor.
- **Rohdaten:** [Actions-Artefakt `diagonal-pruefung-stufe2`](https://github.com/Hazeberry/Go-html-Game-MoE/actions/runs/43274198340/artifacts/13970480435), ID `13970480435`, 1.593.388 Bytes, SHA-256 laut Upload-Log `d3f92b964891a176aedf128e834138816cb92399b0edfa6fe2d1c4c263f49d95`, verfügbar bis 10.02.2027. Enthält unter anderem `bericht.md`, `bericht.json`, 43 Paketdateien und `auswahl-stufe3.json`.

Die Ergebnisse beschreiben Schicht A, die Übereinstimmung mit der Referenz aus GNU Gos Tot-Liste. Die Beurteilung der Steinbewertungen in Stufe 3 steht aus.


## 18. Stand der Umsetzung AP5: Stufe-3-Werkzeug (12.11.2026)

Hazeberry hat das Go zum **Bauen** von AP5 erteilt („Und bau von AP5“). Es gilt nur für das Bauen. **Kein Lauf, kein Paket erzeugt, kein Beurteiler gestartet, keine Rechnung auf den Archiven.** Paket, Probe, Beurteilung und Auswertung brauchen je ein eigenes Go. Die Beurteilung macht eine getrennte KI-Sitzung (E-2, §17.5.2) außerhalb dieses Werkzeugs; die Sitzung, die das Werkzeug gebaut hat, beurteilt nicht.

| AP | Stand | Inhalt |
|---|---|---|
| AP5 | gebaut, nicht gelaufen | `auswertung/endspiel/diagonal-pruefung-stufe3.js` (`unterlagen`, `pruefen`, `auswerten`), Workflow `.github/workflows/diagonal-pruefung-stufe3.yml` (nur `workflow_dispatch`, Modi `probe`, `unterlagen`, `auswerten`, kein GNU Go), Test `tests/diagonal-pruefung-stufe3.js` (Attrappe, 19 Fälle, lokal grün) |

### 18.1 Ablauf

1. **Paket bauen** (Modus `unterlagen`): aus dem gesicherten Stufe-1-ZIP und dem gültigen Stufe-2-ZIP (`stufe2-hauptlauf-43274198340`, je gegen ihre SHA-256 geprüft). Das Werkzeug prüft vorher, dass `auswahl-stufe3.json` gleich der Auswahl ist, die sich aus den Paketdaten ergibt, und dass der Bericht der Stufe 2 gültig ist und den Modus `haupt` hat; sonst KEIN URTEIL. Ergebnis: Artefakt `beurteiler-paket` (das bekommt der Beurteiler) und Artefakt `stufe3-geheim` (Zuordnung; **nicht** an den Beurteiler geben).
2. **Probe** (Modus `probe`, §10.4): 3 Unterlagen für die Zeitschätzung. Die Urteile dazu werden **nicht** ausgewertet; ein Bogen zum Probe-Paket wird von `auswerten` abgelehnt (anderes Manifest).
3. **Beurteilung:** Die getrennte Sitzung bekommt nur `beurteiler-paket` (Unterlagen, Anleitung, Schema, Vorlage, Manifest) und liefert eine JSON-Datei nach `bogen-schema.json`. Die Datei wird in einem PR unter `docs/daten/diagonal-pruefung/stufe3/` abgelegt.
4. **Auswertung** (Modus `auswerten`, Eingabe `bogen`): Das Paket wird aus denselben Eingaben neu gebaut, der Bogen muss zum Manifest passen (`manifestSha256`), jede Kennung genau einmal beantwortet sein. Erst dann wird aufgedeckt.

### 18.2 Konkretisierungen beim Bau (Setzungen, Entscheidung bei Hazeberry)

1. **Keine Herkunft im Paket (§6.2):** Kennung `U-xxxxxx` und Reihenfolge sind Hash-Zufall (nicht sortiert nach Menge, Art oder Partie). Die Unterlagen nennen weder Programm, Gruppe, Datei, B1 oder B2, noch Urteile von App oder GNU Go, noch die Regel der App. Ein Test prüft jede Datei des Pakets auf diese Begriffe und auf Schlüssel und Stellungskennungen. B1 und B2 sind Brettkoordinaten und werden deshalb in den Unterlagen nicht als Wort gesucht.
2. **Inhalt einer Unterlage (§6.2):** markierte Kette (`@`, Farbe, Zahl der Steine, Koordinaten), Textdiagramm mit Koordinaten (A bis T ohne I), Zugnummer (ab 1, Pässe eingerechnet), ob die Partie beendet ist (nur die Endstellung S, zwei Pässe in Folge), Zugfarbe (wer als Nächstes am Zug wäre), Regeln (chinesisch, Komi 7,5), Gefangene, Pässe am Ende, Ko-Punkt, letzte zehn Züge, vollständige Zuggeschichte als SGF (eingebettet und als Datei).
3. **Ko-Punkt:** einfaches Ko (genau ein Stein geschlagen, schlagender Einzelstein mit genau einer Freiheit am geschlagenen Punkt). Superko wird nicht erkannt; dafür dient die vollständige Zuggeschichte.
4. **Antwortbogen:** Felder `id`, `kategorie` (lebendig, tot, seki, ko_zugabhaengig, nicht_entscheidbar), bei Ko zusätzlich `urteilSchwarzAmZug` und `urteilWeissAmZug`, `begruendung` (mindestens 20 Zeichen, Setzung), `sicherheit` (sicher, eher_sicher, unsicher), `offen` (Pflicht bei eher_sicher, unsicher und nicht_entscheidbar). Teilurteile bei anderen Kategorien sind nicht erlaubt.
5. **Bewertung einer Kette (§6.4):** Ein Urteil zählt, wenn es entschieden (lebendig oder tot) und nicht unsicher ist; ein Ko-Urteil mit gleichem Teilurteil für beide Seiten gilt als dieses Urteil, sonst ungeklärt; Seki und nicht entscheidbar sind ungeklärt. **R+** (aus falsch, an richtig): alle Urteile zählen und stimmen mit „an“ überein. **R−** (aus richtig, an falsch): schon ein zählendes Urteil gleich „aus“ (konservativ), auch bei Widerspruch zwischen Beurteilern; der Widerspruch wird zusätzlich vermerkt. Bleibt die App bei aus und an gleich, sind die Ergebnisse „gleich richtig“ und „gleich falsch“. Ist die Kette bei der App teils tot, teils lebend (nicht erwartet), ist sie ungeklärt und wird genannt.
6. **Entscheidungsregel (§8) mit der Nummerierung von §8:** (1) Pflichtprüfungen (Stufe 2 gültig, Bögen geprüft), (2) mindestens 5 R+ aus mindestens 3 verschiedenen Partien (§10.5), (3) R− = 0 in beiden Stellungsarten, (4) kein ungeklärter B1-Fall und keine Ausfälle in betroffenen Stellungen, (5) **die Wirkung auf den Endstand (S), einschließlich der Siegerwechsel, ist berichtet**. Nr. 5 ist durch den Bericht der Stufe 1 erfüllt (§15.4: Stand ändert sich in allen 658 S-Stellungen, Sieger wechselt bei 195 nach Fläche und 68 nach Territory; in V bei 263 und 186). Das Werkzeug **übernimmt** diese Zahlen aus `bericht.json` der Stufe 1 (nicht neu gerechnet), zeigt sie in einem eigenen Abschnitt des Stufe-3-Berichts, ergänzt um die Zahl der Stände, deren Sieger mit der Referenz übereinstimmt (Stufe 2, §17.6), und wertet Nr. 5 als **nicht erfüllt**, wenn sie im Bericht der Stufe 1 fehlt oder unvollständig ist: Je Wertung müssen `n`, `aendert` und `siegerwechsel` Zahlen sein, es muss 0 ≤ `siegerwechsel` ≤ `aendert` ≤ `n` gelten, und `n` muss gleich der Zahl betroffener S-Stellungen der Stufe 2 sein (sonst gehört der Bericht nicht zu diesem Lauf). Der Bericht nennt dann den Grund, nie `undefined`. Der **Mindestumfang** (§7 Nr. 7, mindestens 30 betroffene Stellungen je Stellungsart) ist eine **eigene Bedingung** ohne Nummer aus §8: Nicht erreicht heißt „Kandidatur offen (kein Urteil über die Kandidatur, zu wenig Betroffene)“, nicht „keine positive Kandidatur“. Der Befund lautet „positive Kandidatur“, „keine positive Kandidatur“ oder „Kandidatur offen“ mit den einzelnen Bedingungen; er ist kein Go und heißt nie „unbedenklich“. (Die erste Fassung des Werkzeugs führte unter Nr. 5 fälschlich den Mindestumfang; Hazeberry hat das vor dem Merge gefunden.)
7. **Auslegung, offen zur Bestätigung:** §8 Nr. 4 nennt „alle B1-Fälle“; **ungeklärte B2-Fälle verhindern die Kandidatur daher nicht**, werden aber einzeln und gezählt berichtet. Wer sie auch verhindern lassen will, ändert Bedingung 4 vor der Auswertung. Hazeberry hat die Auslegung als plausibel bestätigt.
8. **Gültigkeit:** Stufe 3 ist ungültig (KEIN URTEIL, Exit 1), wenn ein Bogen nicht zum Paket passt oder eine Kennung fehlt, doppelt oder ungültig beantwortet ist. Das schließt §7 Nr. 6 ein: B1 ist vollständig beurteilt oder der Lauf ungültig.
9. **Bericht der Stufe 2:** Die Spaltenüberschriften „Stellungen mit behoben / mit neu“ sind zu „nur behoben / nur neu“ berichtigt (die Zählung war schon ausschließlich; §17.6).

### 18.3 Was die Tests belegen und was nicht

- `tests/diagonal-pruefung-stufe3.js` prüft das Werkzeug an einer **Attrappe** (12 Zufallspartien, Stufe-1-Dateien vom Werkzeug von Stufe 1 gerechnet, Stufe-2-Ergebnisse synthetisch) und mit selbst geschriebenen Antworten. Geprüft sind: Einspielen mit Ko, Pässen und Gefangenen, SGF-Rundreise, Diagramm, Nachprüfung der Auswahl, Inhalt der Unterlagen, Determinismus, Zufälligkeit, **keine Herkunft in irgendeiner Datei des Pakets**, Antwortbögen, Bewertung nach §6.4 einschließlich zweier Beurteilergruppen, der ganze Ablauf in eigenen Prozessen mit allen fünf Bedingungen von §8 und dem Mindestumfang (auch: Endstandwirkung fehlt im Bericht der Stufe 1), ungültige Bögen, Probe-Paket und Workflow-Datei.
- **Mutationsprobe bestanden:** R− nicht mehr konservativ, R+ ohne „alle Urteile zählen“, Ko-Erkennung entfernt, Reihenfolge nach Menge statt zufällig, Menge in der Unterlage, Bedingung R− = 0 entfernt, ungeklärter B1-Fall ohne Wirkung, Seki als lebendig, §8 Nr. 5 immer erfüllt, der Mindestumfang ohne Sonderbefund, `aendert` nicht geprüft, Plausibilität entfernt und der Abgleich von `n` mit der Stufe 2 entfernt lassen je mindestens einen Test fehlschlagen. Der Positivtest für Nr. 5 liest die **tatsächliche Ausgabe von Stufe 1** (`docs/daten/diagonal-pruefung/stufe1/bericht.json`, Lauf 42456406985) statt einer von Hand geschriebenen Datei; die Regressionstests ändern diese Datei an einzelnen Stellen (`aendert` fehlt nur bei einer Wertung, keine Zahl, `n` fehlt, Wertung fehlt, Block fehlt, unplausibel, `n` ungleich). Die erste Fassung des Tests prüfte nur den vollständigen und den ganz fehlenden Block; ein teilweise vorhandener Bericht (fehlendes `aendert`) hätte Nr. 5 erfüllt und `undefined` im Bericht gezeigt. Hazeberry hat das vor dem Merge gefunden. Die Mutation „Menge in der Unterlage“ blieb zuerst unbemerkt (B1 und B2 sind Brettkoordinaten); der Test sucht jetzt auch nach Menge, Zelle, Klasse und Richtung. Die Grenzwerte 5 R+ aus 3 Partien (§10.5) und 30 betroffene Stellungen je Art (§7 Nr. 7) stehen in eigenen Grenztests als Zahlen (4 und 5 R+, 2 und 3 Partien, 29 und 30 Stellungen), nicht aus den Konstanten des Werkzeugs gelesen: Eine Änderung der Konstanten lässt diese Tests fehlschlagen (Mutationsprobe bestanden). Statt eines Quelltext-Regex prüft ein Test mit Prüfsummen vor und nach Paket und Auswertung, dass weder `index.html` noch Stufe 1, Stufe 2 oder das Archiv verändert werden. Beides hat Hazeberry nach dem Merge von #308 gefordert.
- **Nicht geprüft:** der Workflow in Actions; die echten Archive und die echten 416 Ketten (Dauer, Größe der Unterlagen, Ko-Fälle); ob die Anleitung für die getrennte Sitzung verständlich genug ist (erst die Probe zeigt es); die Qualität irgendeiner Beurteilung.
- Lokal gelaufen sind nur die betroffenen Tests (`diagonal-pruefung-stufe3.js`, `diagonal-pruefung-stufe2.js`, `diagonal-pruefung.js`, `lizenz.js`); die gesamte Suite prüft die reguläre CI.

### 18.4 Freigaben

Dieser Abschnitt erteilt kein Go für ein Paket, die Probe, die Beurteilung, die Auswertung, einen Engine-Vergleich, einen Standardwechsel oder einen Merge. Reihenfolge: Merge dieses PR (Hazeberry liest vorher) → **Go zur Probe** (Modus `probe`) → Zeitschätzung an drei Probestücken, Zahl der Unterlagen (416) nennen → **Go zum Paket** (Modus `unterlagen`) → Beurteilung durch die getrennte Sitzung → Ablage des Bogens im Repo (PR) → **Go zur Auswertung** (Modus `auswerten`). `diagonalAugeEnde` bleibt standardmäßig 0, `passNachGegnerpass` bleibt aus.

### 18.5 Probe (13.11.2026)

Lauf `43338204874` (Run 1, `main` bei `86d9150`, Modus `probe`, Go von Hazeberry). Rohdaten: `docs/daten/diagonal-pruefung/stufe3-probe-43338204874/` (Probe-Paket, drei Bögen, Zeiten, Prüfsummen). **Die Urteile sind nicht ausgewertet (§18.1 Nr. 2), und dieser Abschnitt erteilt kein Go für das Paket.**

1. **Paket:** drei Unterlagen (U-6d01cf, U-f56b4d, U-8300dc), Hash-Ziehung aus allen 416 Ketten; die Ziehung ist aus `auswahl-stufe3.json` nachgerechnet. Keine Herkunftsbegriffe im Paket. Zwei der drei sind Endstellungen (S), obwohl nur 23 der 416 Unterlagen S sind (Wahrscheinlichkeit rund 0,9 %); 393 der 416 sind Stellungen mitten in der Partie (V), in der Probe ist es eine. Eine der drei gehört zu B1, zwei zu B2.
2. **Bögen formal gültig:** Drei Bögen bestehen `pruefen` gegen das Probe-Manifest: erste getrennte KI-Sitzung, zweite frische KI-Sitzung (nur das Paket, eigenes Skript zum Nachspielen, keine Engine) und Lunas Nachprüfung (nach Sicht auf den ersten Bogen, nach eigener Angabe unvollständig). Die in den Begründungen genannten Freiheiten stimmen, soweit maschinell geprüft, mit den Diagrammen; Paket und Format werden also gelesen. Die fachliche Richtigkeit ist nicht geprüft.
3. **Ko-Urteile gehen auseinander:** Bei U-f56b4d und U-8300dc (je ein Auge und ein Randpunkt neben einem schwarzen Einzelstein im Atari) tragen die erste Sitzung und Luna `ko_zugabhaengig` mit `nicht_entscheidbar` für beide Zugrechte ein, die zweite Sitzung `tot` mit ausdrücklichem Hinweis auf das Ko. Bei U-6d01cf: erste Sitzung und Luna `nicht_entscheidbar`, zweite Sitzung `ko_zugabhaengig` (Weiß am Zug lebendig, Schwarz am Zug tot). Nach §18.2 Nr. 5 würden von der ersten Sitzung und von Luna 0 der 3 Antworten zählen, von der zweiten 2 (beide B2). Die Anleitung lässt bei einseitigem Ko beide Einträge zu; ob ein Urteil zählt, hängt damit von der Lesart ab. Eine Präzisierung ist offen (Entscheidung bei Hazeberry, mit eigener Vorabfestlegung und neuer Probe).
4. **Zeit, auf drei Fällen:** erste Sitzung 60,2 / 29,4 / 25,8 s (Selbstangabe), zweite 422 / 98 / 126 s (Wanduhrzeit inkl. Skript). Hochgerechnet auf 416 Unterlagen: erste Sitzung rund 3 bis 7 h, zweite rund 11 bis 49 h (nach Art gewichtet 6,7 h bzw. 46,8 h). **Die Schätzung beruht auf drei Fällen, davon nur einer der Art V, die 94 % des Pakets ausmacht; sie ist nicht belastbar** und gilt nur für die jeweilige Lesetiefe. Ko-Drohungen auf dem ganzen Brett und Superko hat keine Sitzung zu Ende gelesen.
5. **Offen:** Präzisierung der Anleitung (einseitiges Ko, Urteil für das angegebene Zugrecht, Hilfsmittel, Lesetiefe), damit verbunden §8 Nr. 4; ein Werkzeugschritt zum Vereinen von Teilbögen; danach Go zum Paket. Für die Hauptbeurteilung ist eine Sitzung vorgesehen, die die Probe nicht gesehen hat: Die drei Unterlagen liegen mit gleicher Kennung auch im Hauptpaket.

### 18.6 Präzisierte Anleitung, Teilbögen und zweite Probe (Vorabfestlegung, 13.11.2026)

Hazeberry hat die offenen Entscheidungen aus §18.5 Nr. 5 abgegeben („mach du das bitte“, 13.11.2026). Die Setzungen dieses Abschnitts stammen deshalb von Claude, **nicht** von Hazeberry; sie gelten erst mit dem Merge dieses PR, den Hazeberry vorher liest (CLAUDE.md). Festgelegt, bevor ein Hauptpaket gebaut und bevor irgendein Urteil aufgedeckt ist. Die Aufdeckung der Probe (`aufdeckung-probe.json`) hat die Sitzung, die diesen Abschnitt schreibt, nicht geöffnet; sie kennt zu den drei Probestücken nur, was in §18.5 steht (eine B1, zwei B2), nicht, was App oder GNU Go dazu sagen.

**Setzungen zur Anleitung** (Wortlaut in `anleitung-beurteiler.md`, im Werkzeug `ANLEITUNG`):

1. **Urteil für beide Zugrechte (E-a).** Der Beurteiler liest jede Stellung mit Schwarz und mit Weiß am Zug. Gleiches Ergebnis: direkt als Kategorie eintragen. Verschiedenes Ergebnis: `ko_zugabhaengig` mit beiden Teilurteilen. `pruefen` lehnt `ko_zugabhaengig` mit zwei gleichen Teilurteilen ab; damit gibt es für jeden Befund genau einen Eintrag. Das in der Unterlage genannte Zugrecht dient nur dem Ko-Verbot.
2. **Zählt das Urteil für das angegebene Zugrecht? Nein (E-b).** Die Zählregel aus §6.4 und §18.2 Nr. 5 bleibt: Ein zugabhängiges Urteil mit verschiedenen Teilurteilen ist ungeklärt. Gründe: (a) `toteSteineAmEnde` bekommt kein Zugrecht (Signatur `board, augeGross, offenGross, diagAuge`) und liefert einen vom Zugrecht unabhängigen Status; eine Kette, deren Schicksal am ersten Zug hängt, ist damit weder als „tot“ noch als „lebend“ bestätigt. (b) Die Regel nach der Probe zu lockern, in der 0 von 3 und 2 von 3 Urteilen gezählt hätten, wäre eine Änderung in Richtung „mehr zählende Urteile“ nach Sicht auf Daten.
3. **Ko: keine Drohungen von außen (E-c).** Feste Annahme: Keine Seite hat Ko-Drohungen außerhalb des Kampfes um die markierte Kette. Folge: Ein Ko, das nur eine Seite beenden kann, hat für beide Zugrechte dasselbe Ergebnis und wird direkt als `tot` oder `lebendig` eingetragen (Ko in der Begründung genannt). Ein Ko, das beide beenden können, gewinnt, wer zuerst schlagen darf; das ist in der Regel `ko_zugabhaengig` und damit ungeklärt. Superko wird nicht gegen die Zuggeschichte geprüft; ein Kreislauf, den nur ein Wiederholungsverbot auflöst, ist `nicht_entscheidbar`. **Das ist eine Konvention, keine Go-Wahrheit:** Sie macht die Einträge eindeutig und die Lesearbeit endlich. Ein so als „tot“ eingetragenes einseitiges Ko kann in einer echten Partie mit vielen Drohungen der schwächeren Seite lange stehen bleiben; aufgelöst wird es nie zu ihren Gunsten. Die beiden Probestücke U-f56b4d und U-8300dc wären nach dieser Regel `tot` (so die zweite Sitzung), nicht `ko_zugabhaengig`. In welche Richtung das für App aus, App an oder GNU Go wirkt, ist nicht bekannt.
4. **Lesetiefe (E-d).** Verlangt ist der Kampf um die markierte Kette bis zum Ergebnis (geschlagen, zwei echte Augen oder untrennbare Verbindung dazu, Seki, Ko). Nicht verlangt: Ko-Drohungen auf dem Brett, Superko, Punktestand, Sieger. Was nicht verlangt ist, mindert die Sicherheit nicht und gehört nicht unter `offen`. Keine Zeitvorgabe je Unterlage; ohne Ergebnis `nicht_entscheidbar`. Damit entfällt der Teil der Lesearbeit, den keine Sitzung der Probe zu Ende gebracht hat (§18.5 Nr. 4).
5. **Hilfsmittel (E-e).** Erlaubt: selbst geschriebene, rein mechanische Skripte (nachspielen, Freiheiten zählen, Legalität, eine gewählte Zugfolge durchspielen). Nicht erlaubt: fremde Go-Software jeder Art, eine selbst geschriebene automatische Suche nach dem Ergebnis, Internet, Datenbanken, andere befragen. Grund: Die Beurteilung soll von GNU Go und der App unabhängig bleiben (§6) und nach allgemeinen Go-Kriterien begründet sein; Zählfehler bei Freiheiten sind dagegen vermeidbar. Der Bogen nennt die Hilfsmittel im neuen Feld `hilfsmittel` (optional im Schema). `dauerSekunden` je Antwort ist optional und nur für gemessene Zeit gedacht.
6. **Etappen (E-f).** Der Beurteiler darf Teilbögen abgeben: gleiches Format, gleiches `manifestSha256`, jede Kennung in genau einem Teilbogen, kein nachträgliches Ändern.

**§8 Nr. 4 bleibt unverändert (E-g).** Jeder ungeklärte B1-Fall verhindert weiter die positive Kandidatur, ohne Prozentgrenze. Gründe: Die Regel ist von Hazeberry ausdrücklich so gesetzt; sie nach der Probe zu lockern, wäre eine Lockerung nach Sicht auf Daten; und der Befund ist kein Go, sondern nur eine Kandidatur. **Folge, offen benannt:** B1 hat 356 Ketten (354 V, 2 S), B2 60. Ein einziges Urteil `seki`, `ko_zugabhaengig`, `nicht_entscheidbar` oder `unsicher` unter 356 genügt für „keine positive Kandidatur“. Dass alle 356 entschieden und nicht unsicher ausfallen, ist nach der Probe unwahrscheinlich (Hypothese, drei Fälle). Die Beurteilung liefert dann trotzdem R+, R− und die ungeklärten Fälle mit Grund, einzeln und gezählt; ob das den Aufwand rechtfertigt, entscheidet Hazeberry mit dem Go zum Paket. Wer Nr. 4 ändern will, tut es vor der Auswertung in einem eigenen Abschnitt.

**Werkzeug (gebaut, nicht auf den echten Daten gelaufen):**

- `pruefen --teil ja` prüft einen Teilbogen (fehlende Kennungen sind dann kein Fehler).
- `zusammenfuegen --manifest … --teil … [--teil …] --aus bogen.json` vereint Teilbögen rein mechanisch: Jeder Teilbogen muss für sich gültig sein und zum Manifest passen, keine Kennung darf in zwei Teilbögen stehen (auch nicht gleichlautend), `beurteiler` muss überall gleich sein. Geschrieben wird nur ein vollständiger Bogen in der Reihenfolge des Manifests; sonst Exit 1 ohne Datei. Kein Urteil wird verändert.
- `unterlagen --probe N --probe-ziehung Z`: Ziehung 0 ist die bisherige (die drei Stücke aus §18.5), jede andere Zahl zieht unabhängig davon neu. Der Workflow hat dafür die Eingaben `probe_anzahl` (Vorgabe 3) und `probe_ziehung` (Vorgabe 0).
- Die Bögen der ersten Probe gehören zum alten Manifest und bleiben, wie sie sind. `bogen-sitzung1.json` und `bogen-luna.json` enthalten Ko-Einträge mit gleichen Teilurteilen und wären nach der neuen Prüfung ungültig; das ist gewollt und ändert nichts an §18.5.

**Tests:** `tests/diagonal-pruefung-stufe3.js`, 25 Fälle (vier neu), lokal grün. Mutationsprobe bestanden für: gleiche Teilurteile erlaubt, doppelte Kennung überschreibt, `--teil` ohne Wirkung, Ziehung ohne Wirkung, gemischte Beurteiler erlaubt, Reihenfolge der Teilbögen statt des Manifests. Der Herkunftstest läuft auch über die neue Anleitung. **Nicht geprüft:** ob die neue Anleitung von einer frischen Sitzung so verstanden wird, wie sie gemeint ist; das zeigt erst die zweite Probe. Die gesamte Suite prüft die CI.

**Zweite Probe (Vorschlag, braucht ein Go):** Modus `probe`, `probe_anzahl` 6, `probe_ziehung` 1, beurteilt von einer frischen Sitzung, die die erste Probe nicht gesehen hat. Sechs statt drei, weil die erste Probe nur eine Stellung der Art V enthielt und V 94 % des Pakets ausmacht; die Zeitschätzung bleibt auch mit sechs Fällen grob. Die Urteile werden nicht ausgewertet. Die Sitzung der zweiten Probe beurteilt danach nicht das Hauptpaket (die Stücke liegen mit gleicher Kennung auch dort).

**Freigaben:** Dieser Abschnitt erteilt kein Go für die zweite Probe, das Paket, die Beurteilung, die Auswertung, einen Standardwechsel oder einen Merge. Reihenfolge: Merge dieses PR (Hazeberry liest vorher) → **Go zur zweiten Probe** → Beurteilung der Probe durch eine frische Sitzung, Zeit und Lesbarkeit berichten → **Go zum Paket** → Beurteilung durch eine weitere frische Sitzung, in Etappen → `zusammenfuegen`, Ablage des Bogens (PR) → **Go zur Auswertung**. `diagonalAugeEnde` bleibt standardmäßig 0.

### 18.7 Zweite Probe (13./14.11.2026)

Lauf `43366514213` (`main` bei `e2a5d11`, Modus `probe`, 6 Unterlagen, Ziehung 1, Go von Hazeberry). Rohdaten: `docs/daten/diagonal-pruefung/stufe3-probe2-43366514213/`. **Die Urteile sind nicht ausgewertet, die Aufdeckung ist nicht geöffnet, und dieser Abschnitt erteilt kein Go für das Paket.**

1. **Paket:** sechs Unterlagen, alle aus B1 (Ausgabe des Laufs: „B1 6, B2 0“), alle Art V. Keine hat einen Ko-Punkt.
2. **Bogen formal gültig:** Eine frische KI-Sitzung (laut Dateiname GLM 5.3) hat einen Bogen abgegeben, der `pruefen` gegen das Probe-Manifest besteht. Sie nennt ihre Hilfsmittel wie verlangt und keine Go-Software.
3. **Was die Anleitung erreicht hat:** Kein Eintrag `ko_zugabhaengig`. Bei U-351c82 nennt die Begründung ein Ko, das der verteidigenden Seite nicht hilft, und trägt nach der Annahme „keine Drohungen von außen“ direkt `tot` ein (§18.6 Nr. 3). Die Ko-Regel wurde also so angewendet, wie sie gemeint ist; eine Stichprobe von einem Fall.
4. **Was sie nicht erreicht hat:** Drei der sechs Antworten sind `nicht_entscheidbar` und `unsicher`, die übrigen drei `eher_sicher`, keine `sicher`. Die Begründungen der drei nicht entschiedenen Fälle sagen selbst, dass der Kampf nicht zu Ende gelesen wurde; die Lesezeiten liegen bei 18 bis 39 Sekunden. §18.6 Nr. 4 verlangt das Lesen bis zum Ergebnis ohne Zeitvorgabe. Die Anleitung allein hat das nicht bewirkt.
5. **Zeit:** gemessen 17,0 bis 44,6 s je Unterlage, Mittel 28,1 s, nur Lesen und Urteilen. Hochgerechnet auf 416 Unterlagen rund 3,3 h (mit der Spanne der Einzelwerte 2,0 bis 5,2 h). Sechs Fälle, alle V; die Zahl gilt nur für diese Lesetiefe und ist nicht belastbar.
6. **Folge für §8 Nr. 4 (Hypothese aus sechs Fällen):** Alle sechs Stücke sind B1. Bei drei ungeklärten von sechs wären unter den 356 B1-Ketten weit mehr als ein ungeklärter Fall zu erwarten; schon einer genügt für „keine positive Kandidatur“.
7. **Eine weitere Sitzung (Grok) hat nicht beurteilt.** Ihr wurde statt des Probe-Pakets das Stufe-2-ZIP gegeben (SHA-256 `d3f92b96…`, gleich dem gültigen Hauptlauf). Sie hat Stufe 2 nachgerechnet und meldet keinen Widerspruch zu den nachrechenbaren Zahlen; nicht nachgerechnet hat sie unter anderem die Ziehung der 60 B2-Ketten und `fortsetzungsSeed` (beides steht im Werkzeug, das sie nicht hatte). Diese Datei ist kein Antwortbogen und wird nicht abgelegt. **Diese Sitzung kennt die Auswahl und die Urteile von App und GNU Go und scheidet als Beurteiler aus.**
8. **Offen (Entscheidung bei Hazeberry):** (a) Anleitung verschärfen (`nicht_entscheidbar` nur mit den gelesenen Varianten, mechanisches Nachspielen ausdrücklich empfohlen) und mit neuer Ziehung erneut proben; (b) das Hauptpaket mit dieser Anleitung beurteilen lassen; (c) Stufe 3 hier beenden, Schalter bleibt aus. Die Sitzung der zweiten Probe beurteilt das Hauptpaket nicht (die Stücke liegen mit gleicher Kennung auch dort).

### 18.8 Zweite Probe, zweiter Bogen (14.11.2026)

Eine weitere frische KI-Sitzung hat dasselbe Probe-Paket (Lauf `43366514213`) mit demselben Auftrag beurteilt (`bogen-sitzung4.json`, Verlauf in `protokoll-sitzung4.txt`). **Nicht ausgewertet, Aufdeckung nicht geöffnet, kein Go.** Ob ein Urteil richtig ist, ist nicht geprüft; die Sitzung, die diesen Abschnitt schreibt, beurteilt die Stellungen nicht.

1. **Formal gültig:** `pruefen` gegen das Probe-Manifest Exit 0. Hilfsmittel nach §18.6 Nr. 5 (eigenes Skript zum Nachspielen und Durchspielen gewählter Zugfolgen, keine Suche, keine Go-Software); das Skript hat nach dem Verlauf alle sechs Bretter aus dem SGF richtig nachgespielt.
2. **Lesetiefe:** Diese Sitzung hat die Kämpfe ausgelesen: vier Urteile `sicher`, zwei `eher_sicher`, kein `nicht_entscheidbar`. Damit ist belegt, dass die Anleitung tiefes Lesen zulässt; dass sie es erzwingt, ist nicht belegt (Sitzung 3, §18.7, las flach).
3. **Zeit:** 176 bis 1065 s je Unterlage, Summe 3460 s, Mittel 577 s. Hochgerechnet auf 416 Unterlagen rund 67 h (mit der Spanne der Einzelwerte 20 bis 123 h). Sechs Fälle, alle V; nicht belastbar, aber rund das Zwanzigfache von Sitzung 3.
4. **Vergleich mit Sitzung 3 auf denselben sechs Stücken:**

| Kennung | Sitzung 3 | Sitzung 4 |
|---|---|---|
| U-2173a8 | nicht_entscheidbar, unsicher | lebendig, sicher |
| U-15d04c | lebendig, eher_sicher | lebendig, sicher |
| U-351c82 | tot, eher_sicher | ko_zugabhaengig (Schwarz am Zug tot, Weiß am Zug lebendig), sicher |
| U-49f79f | lebendig, eher_sicher | lebendig, sicher |
| U-dea5f6 | nicht_entscheidbar, unsicher | lebendig, eher_sicher |
| U-f4bb91 | nicht_entscheidbar, unsicher | lebendig, eher_sicher |

   Gleich in 2 von 6 (beide `lebendig`). Bei U-351c82 widersprechen sich die entschiedenen Lesarten: Sitzung 3 hält das Ko für eines, das Weiß nicht rettet, Sitzung 4 liest, dass Weiß am Zug mit Q19 schlägt und danach verbindet, Schwarz am Zug dagegen zuerst S18 schlägt. Unter der Ko-Annahme von §18.6 Nr. 3 sind beide Einträge formal zulässig; welche Lesart stimmt, ist nicht geprüft.
5. **Folgen (Hypothesen aus sechs Fällen):** (a) Mit einer tief lesenden Sitzung wären nach §6.4 vier dieser sechs B1-Fälle entschieden und nicht unsicher; die anderen zwei sind `eher_sicher` und zählen damit ebenfalls (nur `unsicher` zählt nicht). U-351c82 wäre als `ko_zugabhaengig` mit verschiedenen Teilurteilen ungeklärt und verhinderte nach §8 Nr. 4 die positive Kandidatur. (b) Würden zwei Sitzungen dasselbe Paket beurteilen, wären Widersprüche wie bei U-351c82 nach §6.4 ungeklärt. (c) Der Aufwand für 416 Unterlagen bei dieser Lesetiefe liegt eher bei Tagen als bei Stunden und verlangt Etappen (`zusammenfuegen`).
6. **Offen (Entscheidung bei Hazeberry):** wie §18.7 Nr. 8. Zusätzlich: ob eine Sitzung mit der Arbeitsweise von Sitzung 4 das Hauptpaket in Etappen beurteilt. Beide Sitzungen der zweiten Probe beurteilen das Hauptpaket nicht.
