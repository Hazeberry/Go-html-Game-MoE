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

**Stufe 3, Beurteilung der Richtigkeit (§6):** blind; **alle** neu entstandenen Abweichungen (B1) und eine Stichprobe der übrigen betroffenen Ketten (B2). Sie beginnt erst, wenn Beurteiler benannt sind und zugesagt haben (§6.3).

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
Schicht B beurteilt deshalb Ketten **unabhängig vom Urteil von GNU Go und von der App**: die neu entstandenen Abweichungen **vollständig** und eine Stichprobe der übrigen betroffenen Ketten.

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

**Antwortbogen** (fester Aufbau, je Unterlage): Kategorie **lebendig**, **tot**, **Seki**, **Ko oder zugabhängig** (dann zusätzlich das Urteil bei Zug von Schwarz und bei Zug von Weiß), **nicht entscheidbar**; dazu eine kurze Begründung nach Regelkriterien (echte Augen nach der Diagonalregel, Benson, falsche Augen, Freiheiten).
Die Unterlagen werden in zufälliger Reihenfolge mit Zufalls-ID vorgelegt, **ohne Angabe, wer sie wie bewertet** (App aus, App an, GNU Go); die Zuordnung wird erst nach Abschluss aller Urteile aufgedeckt. Das Werkzeug, das Unterlagen und Antwortbogen erzeugt, gehört zu Stufe 3 (eigene Umsetzung, eigenes Go).

### 6.3 Wer beurteilt: nicht festgelegt, Voraussetzung für Stufe 3

Im Entwurf ist **niemand eingeteilt**. Stufe 3 beginnt erst, wenn Beurteiler **benannt sind und zugesagt haben**; vorher wird der Aufwand genannt (Zahl der Unterlagen in B1 und B2, geschätzte Zeit je Unterlage). Ohne benannten Beurteiler gibt es **keine Aussage zur tatsächlichen Richtigkeit**, nur Schicht A.
**Entscheidung offen** (Empfehlung: §10.4), möglich sind (Aufwand und Aussagekraft sind verschieden):
- ein Mensch, der zugesagt hat; Hazeberry nur, wenn er das möchte;
- eine **getrennte KI-Beurteilung** in einer eigenen Sitzung, die nur die Unterlagen bekommt und die Herkunft nicht kennt; sie wird als **KI-Beurteilung** berichtet und ist nicht dasselbe wie die Beurteilung durch einen Menschen;
- beides, mit Vergleich beider Urteile auf einer Teilmenge.

Ob ein zweites Programm (Fuego) als zusätzliche Meinung dient, hängt davon ab, ob dort eine Tot-Liste verfügbar ist; das ist **nicht geprüft**.

### 6.4 Kennzahlen Schicht B

Nur für die beurteilten Ketten, getrennt für B1 und B2 und von Schicht A:
- Anzahl und Anteil, in denen **App an** mit dem Urteil übereinstimmt, **App aus** übereinstimmt, **GNU Go** übereinstimmt.
- **R+** (aus falsch, an richtig), **R−** (aus richtig, an falsch), beide richtig, beide falsch und **ungeklärt** (Seki, Ko oder zugabhängig ohne einheitliches Urteil, nicht entscheidbar). R+ und R− getrennt, nie nur Saldo.
- **Bestätigte Unbedenklichkeit** gilt nur für Fälle mit einem **entschiedenen** Urteil, in denen App an mit dem Urteil übereinstimmt. **Ungeklärte Fälle zählen nicht als bestätigte Unbedenklichkeit.** Ihre Zahl wird getrennt genannt.
- Fälle, in denen GNU Go und das Urteil abweichen, werden einzeln aufgeführt.

Aussagen zur Richtigkeit gelten **nur für die beurteilten Ketten**. B1 ist vollständig; B2 ist eine Ziehung, Hochrechnungen nur mit Intervall und Hinweis auf die Annahmen.

## 7. Gültigkeit, Kontrollen

**Gültigkeit (nur zwei Zustände):** Eine Stufe ist gültig oder ungültig. Ungültig heißt **„kein Urteil“ mit Grund**, und der Lauf wird rot. Pflichtprüfungen:

1. **Daten (Schritt 0):** Prüfdaten vollständig im Sinn von §3.2; Schnittmenge mit den 563 Quellpartien leer; Zahl der Partien und Stellungen je Gruppe berichtet.
2. **Nachspiel-Kontrolle:** Die Archivzüge sind einspielbar und ergeben das gespeicherte Endbrett und die gespeicherten Gefangenen (soweit gespeichert); bei Stufe 2 stimmt GNU Gos Brett mit dem der App überein (`list_stones` beider Farben).
3. **Identitätskontrolle Schalter aus (bitgleich):** Bei Schalter aus ist die Tot-Menge in **jeder** Prüfstellung gleich der der **unveränderten Fassung** (Stand `main` vor der Umsetzung, in eigenem Prozess; „gleich“ erst nach Vorprüfung der Fallabdeckung, sonst „KEIN URTEIL“).
   Zusätzlich vor der Umsetzung festzulegen und im Test einzufrieren: Referenzwerte der unveränderten Fassung auf Zufallsbrettern und den Stellungen unter `tests/stellungen/`, erzeugt **vor** der Änderung. Engine-Vergleiche alter gegen neuer Stand laufen nur in Actions (`engine-vergleich.yml`) und nur nach Go.
4. **Konsistenzkontrolle gegen die Diagnose:** Bei Schalter an stimmt die Tot-Menge der Umsetzung auf den **563 Entwicklungsstellungen** mit der der Test-Kopie (`gegenprobe.js --variante diagonalauge`) überein; sonst weicht die Umsetzung von dem ab, was diagnostiziert wurde (kein Urteil, bis geklärt).
5. **GNU-Go-Lauf (Stufe 2):** Version protokolliert, Rohantworten zweier Läufe gleich, Ausfälle gezählt; die Ausfallregel (Obergrenze für Ausfälle) legt Hazeberry vor dem Lauf fest (**Entscheidung offen**; Empfehlung: §10.3, wie in Stufe C).
6. **Beurteilung (Stufe 3):** Beurteiler benannt und zugesagt (§6.3); Unterlagen nach §6.2 (mit Zugfarbe und Vorgeschichte); Reihenfolge zufällig, Herkunft verdeckt, Kategorien vorab, Begründung je Kette; **B1 vollständig beurteilt**; die Zuordnung der Urteile zu App und GNU Go wird erst nach Abschluss aller Urteile aufgedeckt. Fehlt ein benannter Beurteiler oder ist B1 nicht vollständig beurteilt, ist Stufe 3 ungültig (kein Urteil).
7. **Mindestumfang betroffener Stellungen:** Für ein Urteil über die Kandidatur (§8) mindestens **30** betroffene Stellungen je Stellungsart (**Setzung**). Das ist ein Mindestumfang, damit überhaupt berichtet werden kann, **kein Sicherheitsnachweis**: Das Erreichen der Zahl belegt keine Unbedenklichkeit. Weniger heißt „kein Urteil: zu wenig Betroffene“, nicht „unbedenklich“; über eine Erweiterung der Prüfdaten entscheidet Hazeberry.

## 8. Entscheidungsregel (Vorschlag, Setzungen)

Das Ergebnis ist ein **Befund, kein Go und keine Aktivierung**. Der Schalter bleibt aus. Der Ausgang ist entweder **„positive Kandidatur“** oder **„keine positive Kandidatur“** (mit Gründen). Eine positive Kandidatur verlangt **alle** der folgenden Punkte (Zahlen sind Setzungen, **Entscheidung offen**):

1. Alle Pflichtprüfungen aus §7 bestanden (insbesondere bitgleich bei aus).
2. **Bestätigter Nutzen:** mindestens **R+ ≥ 1** unter den entschieden beurteilten Ketten (die Mindestzahl ist **Entscheidung offen**; ohne bestätigte Verbesserung folgt **keine positive Kandidatur**, auch nicht bei R− = 0).
3. **R− = 0** unter den entschieden beurteilten Ketten (B1 und B2); Fälle mit R− > 0 werden einzeln besprochen und sprechen gegen eine Kandidatur, solange sie nicht als Fehler der Beurteilung geklärt sind.
4. **Alle B1-Fälle entschieden:** Jede neu entstandene Abweichung gegenüber GNU Go ist beurteilt und entweder als richtig im Sinn von Schicht B eingeordnet (App an stimmt mit dem entschiedenen Urteil überein) oder als GNU-Go-Fehler belegt.
   **Ungeklärte Fälle** (Seki, Ko oder zugabhängig ohne einheitliches Urteil, nicht entscheidbar) zählen **nicht** als bestätigte Unbedenklichkeit und verhindern die positive Kandidatur, solange sie offen sind.
5. Die Wirkung auf den **Endstand** (S) ist berichtet, einschließlich der Fälle, in denen sich der Sieger ändert.

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
- **Unsicherheit:** Die Betroffenheit ist unbekannt. In den Entwicklungsdaten waren es 19 von 563 Stellungen (3,4 %), an Auslösestellungen; das ist **nicht** übertragbar. Stufe 1 liefert die Zahl. Liegt sie unter 30 betroffenen Stellungen je Stellungsart, heißt das „kein Urteil: zu wenig Betroffene“ (§7 Nr. 7) und Hazeberry entscheidet über eine Erweiterung.
- **Zeitpunkt:** Indizes und Handpartien vor AP3; Erweiterung gegebenenfalls nach Stufe 1.

### 10.3 Kontrollstichprobe und Ausfallregel (Stufe 2)

- **Kontrollstichprobe, Empfehlung:** gleich viele unbetroffene Stellungen wie betroffene, mindestens 50 und höchstens 200 je Stellungsart, feste Ziehung nach Hash aus Seed und Schlüssel. Zweck: sichtbar machen, ob die Referenz auch dort Abweichungen zeigt, die mit dem Schalter nichts zu tun haben (z. B. Zählabweichungen der Art aus `docs/zaehlung-mechanismus.md` §5);
  sie misst nicht die Wirkung des Schalters. Die Obergrenze hält die GNU-Go-Arbeit überschaubar.
- **Ausfallregel, Empfehlung:** wie `docs/passregel-vergleich.md` §9 Nr. 6. Ausfall = Absturz von GNU Go (bei der Debian-Fassung 3.8 an manchen Stellungen bekannt, `gnugo-duell.js`; dort ein Neustart mit nächstem Seed), Timeout, nicht einspielbare oder nicht zählbare Stellung. Jeder Ausfall wird einzeln mit Stellung, Gruppe und Grund aufgelistet. Folgen:
  1. Fallen mehr als **5 %** der betroffenen Stellungen einer Stellungsart aus, ist Schicht A für diese Art **ungültig** (kein Urteil, Lauf rot).
  2. Eine betroffene Stellung mit Ausfall zählt **konservativ als „ungeklärt“**, nicht als unbedenklich (§8 Nr. 4).
  3. Wiederholt werden ganze Pakete, nie einzelne Stellungen.
- **Begründung:** Dieselbe Logik wie in Stufe C (ein Ausfall darf nicht „einfach weggelassen“ werden); die 5 % sind dort die Grenze für die Paare und hier übernommen (Setzung).
- **Zeitpunkt:** vor AP4.

### 10.4 Schicht B: Deckel, Beurteiler, Aufwand, zweites Programm

- **Deckel für B2, Empfehlung:** **60** beibehalten. Zweck von B2 ist, bestätigte Verbesserungen (R+) zu finden und die Beurteilung zu kalibrieren. Gesenkt wird er nur auf Wunsch der Beurteiler und nur **vor** Sicht auf Urteile.
- **Beurteiler, Empfehlung (zweigleisig, damit der Plan ohne bestimmten Menschen ausführbar ist):**
  1. **KI-Beurteilung aller Fälle (B1 und B2)** durch eine **getrennte, eigene Sitzung**, die nur Unterlage und Kategorien bekommt, **nicht** die Herkunft, **nicht** dieses Doc und **nicht** die Regel der App (die Begründungsvorgaben nennen allgemeine Go-Begriffe wie echte und falsche Augen, Seki, Freiheiten, Ko, ohne `_diagIsTrueEye`).
     Das ist **nicht unabhängig im strengen Sinn**: Engine und Diagnosen entstanden mit Claude, ein Beurteiler aus derselben Modellfamilie kann Blindstellen teilen. Das Ergebnis heißt deshalb **„KI-Beurteilung“**, nicht „tatsächliche Richtigkeit“.
  2. **Menschliche Beurteilung einer Teilmenge**, **nur wenn ein Mensch zugesagt hat**: bis zu **20 Unterlagen** (Setzung): zuerst die Fälle, in denen die KI-Beurteilung ungeklärt ist oder GNU Go widerspricht, der Rest zufällig. Zweck: Kalibrierung der KI-Beurteilung und Entscheidung strittiger Fälle. Hazeberry übernimmt das nur, wenn er es möchte; sonst eine dritte Person.
  Aussagen zur „tatsächlichen Richtigkeit“ gibt es **nur für Fälle, die ein Mensch beurteilt hat**; für den Rest gilt „KI-Beurteilung“. Ohne Zusage eines Menschen bleibt es bei der KI-Beurteilung, und der Bericht sagt das ausdrücklich.
- **Aufwandsgrenze für B1, Empfehlung:** **keine Kürzung von B1.** Für die menschliche Teilmenge gilt die Grenze von 20; für die KI-Beurteilung gibt es keine. Vor Stufe 3 wird die Zahl der Unterlagen genannt und die Zeit je Unterlage an drei Probestücken (ohne Auswertung der Urteile) geschätzt; liegt die menschliche Teilmenge darüber, entscheidet Hazeberry.
- **Zweites Programm, Empfehlung:** **nicht Voraussetzung.** Fuego kennt `final_status_list` (`docs/fuego.md` §6), die **Antwortqualität ist nicht geprüft** (dort meldet `final_score` mitten in der Partie manchmal „cannot score“). Optional eine kurze Funktionsprobe an etwa 10 archivierten Endstellungen mit eigenem Go; nur danach könnte Fuego als zusätzliche Meinung dienen.
- **Zeitpunkt:** vor Stufe 2 (§11, E-2).

### 10.5 Mindestzahlen

- **Mindestumfang 30 betroffene Stellungen je Stellungsart:** beibehalten, **nur Berichtbarkeit** (§7 Nr. 7), kein Sicherheitsnachweis.
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
2. **Stufe 1** (AP3, Go): Ergebnis ist **nur die Betroffenheit**, keine Aussage zu Richtigkeit.
   **E-1:** Bei weniger als 30 betroffenen Stellungen je Stellungsart: „kein Urteil: zu wenig Betroffene“; Hazeberry entscheidet über Erweiterung (§10.2).
3. **E-2 (vor Stufe 2, vor Sicht auf Schicht A):** Beurteiler benannt und zugesagt (§10.4), Deckel, Kategorien, Mindestzahlen bestätigt.
4. **Stufe 2** (AP4, Go): Schicht A. Danach wählt die Regel aus §6.1 die Ketten **mechanisch** aus (B1 vollständig, B2 gezogen); keine Entscheidung nach Sicht auf Urteile.
5. **Stufe 3** (AP5, Go): Zahl der Unterlagen und Aufwand werden vorher genannt. Aufdeckung erst nach allen Urteilen.
6. **AP6:** Bericht. Das Ergebnis ist ein Befund und kein Go (§8).

## 12. Freigaben

Dieses Doc enthält Vorgaben für die KI-Assistenten; Hazeberry liest es vor dem Merge. Es erteilt kein Go für die Umsetzung, Läufe, Engine-Vergleiche, Änderungen des Standards oder Merges. Die Empfehlungen in §10 sind keine Entscheidungen. Die 15 Zählabweichungen bleiben ein getrenntes Vorhaben.
