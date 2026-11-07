# Passregel-Vergleich: kostet „Pass nach Gegnerpass“ Siege oder Punkte?

Vorabfestlegung, 06.11.2026, überarbeitet nach Durchsicht am selben Tag (Voraussetzung Gegnerpass,
Passregel im Arm „weiter“ aus, Ausfälle konservativ, Nenner, Unabhängigkeit, Territory-Kontrollen) und nach Probe 1
nachgebessert (§9 Nr. 5 und Nr. 7, §13).
Status: **Umgesetzt; Stufe A abgeschlossen, Probe 1 ungültig (§13). Probe 2 und Hauptlauf nicht freigegeben.** Das
Spiel bleibt unverändert (`passNachGegnerpass` bleibt 0). Zahlen zu den Auslösungen stehen in §13; zur Wirkung der
Regel gibt es keine Zahl. Dies ist die Ausführung von §4 in
[`passregel-versuch.md`](passregel-versuch.md); dort stehen Regel und Einzelrechnung.

## 1. Frage und Abgrenzung

Die Versuchsregel lässt die KI auf Stufe Schwer **vor der Suche** passen, wenn der Gegner gerade
gepasst hat, die Stellung ausgespielt und geklärt ist und der Vorsprung im ungünstigeren der beiden
Zählstände mindestens 20 Punkte beträgt. Zwei Pässe in Folge beenden die Partie.

**Frage:** In Stellungen, in denen die Regel auslöst: Wie oft verliert die KI dadurch eine Partie,
die sie beim Weiterspielen gewonnen hätte, und wie viele Punkte kostet das Beenden im Mittel?

Nicht Gegenstand: ob die Regel sinnvoll *eingestellt* ist (20, 2 und 0,25 bleiben Setzungen), ob sie
Handpartien angenehmer macht, und das Verhalten bei Gegnern, die nicht passen. Ob die Zählvorschau
ein Sicherheitsnachweis ist, wird hier nur an den ausgelösten Stellungen geprüft, nicht allgemein.

## 2. Aufbau

**Einheit** ist eine Quellpartie. Aus ihr zählt **eine** Stellung: die erste, in der die Regel
auslöst. Das entspricht dem Spiel: Die Regel beendet eine Partie beim ersten Auslösen. Das verhindert
nur die Mehrfachzählung derselben Partie. **Unabhängigkeit der Einheiten folgt daraus nicht** (gleiche
Läufe, gleiche Engine-Stände, gleicher Gegner, möglicherweise gleiche Zugfolgen); siehe §10.

**Stellung** = Brett direkt nach einem Gegnerpass, KI am Zug, mit Gefangenen, Ko und Zughistorie wie in
der Aufzeichnung. Gegnerpässe in der Aufzeichnung werden der Reihe nach geprüft, nicht nur der erste
nach dem letzten Gegnerstein. Eine Partie ohne Auslösung hat keine Einheit; für sie sind beide Arme
gleich. Ihr Anteil wird berichtet.

**Geprüfte Voraussetzung jeder ausgewählten Stellung:** „Sofort passen beendet die Partie“ gilt nur,
wenn der Gegner **unmittelbar davor** gepasst hat und die Partie nicht schon beendet war. Darum muss
für jede Einheit gelten und wird beim Einspielen **geprüft**, nicht angenommen:

1. Der letzte eingespielte Zug ist ein Pass der Gegnerfarbe.
2. Der Zug davor ist **kein** Pass. (Sonst wären es schon zwei Pässe in Folge gewesen.)
3. Der Pass-Zähler des Einspielens steht an dieser Stellung auf 1. Daraus bildet das Werkzeug `gegnerPasste`;
   die Engine selbst führt keinen Pass-Zähler.

Eine ausgewählte Stellung, die das nicht erfüllt, ist ein Fehler im Werkzeug und macht den Lauf
ungültig (§9). Sie wird nicht stillschweigend aussortiert und bekommt auch keinen Arm „sofort“ ohne
Fortsetzung. Stellungen, die die Voraussetzung nicht erfüllen, sind nicht Gegenstand dieser Messung.
Bräuchten wir sie, bräuchte auch der Arm „sofort“ eine Fortsetzung, und das wäre eine eigene
Vorabfestlegung.

**Auslösung** = `passNachGegnerpassPruefung` mit Standard-`PARAMS` des aktuellen `index.html`,
`passNachGegnerpass` 1, `gegnerPasste` wahr, Komi 7,5 und der Wertung, für die gerechnet wird.
Fläche und Territory lösen unabhängig aus. Ihre Stellungsmengen können abweichen, also werden sie
getrennt ausgewertet.

**Arme je ausgelöster Stellung (gepaart):**

| Arm | Was geschieht | Ergebnis |
|---|---|---|
| 1 „sofort“ | KI passt, Partie endet | GNU Gos Zählung der Stellung (siehe §5) |
| 0 „weiter“ | **Passregel aus** (`passNachGegnerpass` 0), die KI spielt gegen denselben Gegner weiter bis zu zwei Pässen in Folge | GNU Gos Zählung der Endstellung |

Arm 1 braucht keine Partie, nur eine Zählung. Das Paar ist (Sieg bei „weiter“, Sieg bei „sofort“).
**Farbwechsel entfällt:** Die Farbe ist durch die Stellung fest. Ergebnisse werden nach KI-Farbe
getrennt berichtet, damit eine einseitige Verteilung sichtbar bleibt.

## 3. Material

Quellen sind die archivierten Partien der Gruppen aus `pass-stellungen.yml` (alle ohne Vorgabe,
Komi 7,5):

| Gruppe | Gegner der Fortsetzung | Datei |
|---|---|---|
| GNU Go ohne Vorgabe | GNU Go Stufe 1 | `leeres-brett/lauf1/g-D`, `muster-ohne-vorgabe/lauf1/g-D` |
| Fuego 100 Spiele | Fuego (schwache Suche) | `muster-ohne-vorgabe/lauf1/f-D` |
| Fuego 50 Spiele | Fuego (schwache Suche) | `fuego-siege/lauf1/D` |
| alte PWA | die PWA-Engine (`vergleich/pwa-index.html` über `gtp-ki.js`, Hash gegen das Archiv geprüft) | `pwa-vergleich/lauf1/m1` |

**Berichtigung (06.11.2026, beim Bau):** Der Gegner der Gruppe „alte PWA“ ist die PWA-Engine, nicht GNU Go, wie
in der ersten Fassung stand. GNU Go ist dort nur Schiedsrichter. Die Fortsetzung dieser Gruppe läuft mit derselben
Engine und denselben Archivangaben wie die Quelle (`gegner.html`, `sha256`, `ki` aus dem Datensatz).

**Kein Deckel auf Quellpartien.** In der ersten Fassung stand „je Gruppe höchstens 100 Partien“. Das passt nicht
zum Kriterium von N ≥ 183 je Wertung (§8), denn es ließe das Material schon vor der Auslösung schrumpfen. Stufe A
wertet alle brauchbaren Quellpartien aus. Ein Deckel gilt, wenn überhaupt, für die **Einheiten** je Gruppe
(`--max-einheiten`, feste Ziehung nach Hash aus Seed und Schlüssel) und wird erst nach Stufe A mit Hazeberry
festgelegt. Abgebrochene Partien, solche ohne `zuege` oder `wirFarbe` und solche mit Vorgabe oder Komi ≠ 7,5
fallen weg und werden gezählt. Handpartien
(`tests/stellungen/hand-*.sgf`) sind nur Prüfmaterial für die Werkzeuge und gehen nicht in die
Auswertung ein.

Die Archivpartien stammen von verschiedenen Engine-Ständen. Das schadet dem Vergleich nicht, weil die
Stellungen nur Ausgangspunkte sind: Beide Arme laufen danach mit dem aktuellen Stand. Es bedeutet aber,
dass die Stellungen (KI hat in der Endphase weitergespielt) nicht zufällig sind. Siehe §10.

## 4. Stufen und Freigaben

Jede Stufe läuft **ausschließlich in GitHub Actions** und braucht ein eigenes Go. Vor dem Start
wird genannt: Was läuft, wo, welches Go gilt.

1. **Stufe A, Auslösung** (reine Rechnung auf Archivdaten, kein GNU Go, keine Partie): je Quellpartie
   die erste Auslösung, getrennt nach Wertung, Gruppe und KI-Farbe; Nichtauslösung mit Grund
   (`nicht ausgespielt`, `ungeklärte Gruppen (Spanne)`, `Vorsprung zu klein`); die Werte `mit`, `nur`,
   Spanne und Anteil an der Auslösung. Ausgabe: Tabelle, die Liste der Einheiten, die Aufschlüsselung je Gruppe und KI-Farbe und die Werte `mit`, `nur`, Spanne und gemischter Anteil an der Auslösung (alle, KI Schwarz, KI Weiß). **Entscheidungshilfe
   vor Stufe C:** Reicht die Zahl der Auslösungen N für das Kriterium in §8 (mindestens 183 je
   Wertung, bei möglichen Ausfällen eher mehr)? Stufe A prüft außerdem für jede Einheit die
   Voraussetzung aus §2 und die Duplikate aus §10 und nennt die Zahl der Einheiten nach Abzug der
   Duplikate. Reicht N nicht, ist die Frage mit diesem Material nicht entscheidbar. Dann legt Hazeberry fest, ob das
   Material erweitert wird (neue Partien, eigener Messlauf mit Vorabfestlegung) oder die Aussage
   begrenzt bleibt.
2. **Stufe B, technische Probe:** wenige Stellungen je Gruppe, nur zum Prüfen der Werkzeuge und der
   Gültigkeit (§9). **Keine Wirkungsauswertung:** Die Probe berichtet keine Siegwechsel und keine Mittel
   als Ergebnis. Sie misst Dauer und Ausfälle, damit der Hauptumfang vor dem Hauptlauf festgelegt werden
   kann. **Wirkungszahlen werden im gesamten Probe-Ablauf unterdrückt**, auch in den Logs der Fortsetzung
   (`--probe`: keine Stände beider Arme, keine „weiter/sofort“-Werte, auch nicht in der Ausfallliste des Berichts).
   Zugzahlen der KI (Steinzüge, Pässe, Züge nach der Stellung) sind technische Diagnose und erlaubt. Die Rohdaten der
   Probe (Artefakte) enthalten die Stände trotzdem; sie werden in der Probe nicht ausgewertet.
3. **Stufe C, Hauptlauf:** alle Einheiten aus Stufe A, mit einem Deckel je Gruppe nur, wenn er nach Stufe A
   festgelegt wurde. Eigenes Go.

## 5. Zählung

Maßgeblich ist **GNU Go Stufe 1 als Schiedsrichter**, chinesische Regeln, Komi 7,5, wie in den
Standardbedingungen. Die Zählvorschau der App ist nicht der Schiedsrichter, sondern wird mit ihm
verglichen (§7, Nebenkennzahl).

- **Fläche:** `final_score` auf der Stellung.
- **Territory:** `final_status_list dead` auf der Stellung, danach die **Territory-Rechnung der App**
  (dieselbe Rechenregel wie `finalTerritoryScore`; der Code selbst steckt im Hauptskript und ist von außen nicht
  aufrufbar, darum ist es eine Nachbildung, die ein Test an den aus `index.html` geschnittenen App-Code bindet,
  siehe §9 Nr. 5): Gefangene aus dem Einspielen, tote
  Steine der Tot-Liste als Gefangene gutgeschrieben, umschlossene freie Punkte, Komi 7,5. GNU Go spielt
  dabei nicht in japanischen Regeln. Die Engine kennt den Wertungsmodus nicht, die Fortsetzung ist
  also in beiden Wertungen dieselbe Partie; nur Auslösung und Zählung unterscheiden sich. **Das ist
  ein begrenzter Vergleich mit einer Zählvariante, keine Territory-Partie.** Wie Menschen im
  Territory-Modus weiterspielen, etwa durch Auffüllen eigener Gebiete, ist damit nicht abgebildet.
- Der Territory-Weg ist nur gültig, wenn die Kontrollen in §9 Nr. 5 bestehen: Gefangene, tote Steine
  und Komi müssen zur App passen.

## 6. Fortsetzung (Arm 0)

Aufbau: Die Zugfolge bis zur Stellung wird in GNU Go (bzw. Fuego) per GTP eingespielt und in der
Engine nachgebaut. Danach zieht die KI aus der Stellung weiter.

- KI: aktuelles `index.html`, Stufe Schwer, `mctsFixedSims` 120, Aufgabe aus, kein adaptives Zeitbudget,
  Zufall je Stellung aus festem Seed (Ableitung im Werkzeug und im Test).
- **Die untersuchte Passregel ist in diesem Arm aus.** Sonst könnte sie in der Fortsetzung wieder
  auslösen, und der Vergleich misst nicht die Folgen des Weiterspielens. Das wird nicht angenommen,
  sondern je Fortsetzung protokolliert und geprüft (§9 Nr. 9). Stufe A rechnet die Auslösung in einem
  **eigenen Prozess** mit Schalter 1. Fortsetzungen laufen in Prozessen, die mit den Standardwerten
  (Schalter 0) geladen sind; die Engine-Instanzen werden nie gemischt. Die übrigen
  Pass-Regeln der Engine (`passMinMc…`, Atari- und Unabwendbarkeitsprüfung) bleiben wie im
  Standard; sie sind das, was „weiter“ bedeutet.
- Gegner: wie in §3, Fuego mit schwacher Suche. Die Fortsetzung endet bei zwei Pässen in Folge, bei
  Aufgabe oder bei 600 Zügen insgesamt; Letzteres ist ein Ausfall.
- Das Werkzeug dafür gibt es noch nicht. `gnugo-duell.js` startet bisher nur vom leeren Brett. Es wird
  nach Freigabe dieser Festlegung gebaut (§11).

## 7. Kennzahlen

Alle getrennt nach Wertung (Fläche, Territory), Gruppe und KI-Farbe; die Gesamtzahl über Gruppen ist
der Endpunkt. Stand aus Sicht der KI, positiv = KI gewinnt.

- **E1 verlorene Siege (Endpunkt).** Der Nenner steht vorab fest:
  **N = alle ausgelösten Einheiten der Wertung**, einschließlich solcher mit Ausfall (§9 Nr. 6). Der
  Anteil sagt: *Wie viele der Auslösungen kosten eine Partie, die beim Weiterspielen gewonnen worden
  wäre?* Zähler:
  - **L (beobachtet)** = Einheiten, in denen „weiter“ gewinnt und „sofort“ verliert.
  - **A (ungeklärt möglich)** = Einheiten mit Ausfall des Arms „weiter“, in denen „sofort“ verliert
    **oder nicht gezählt werden konnte**. Nur dort kann ein verlorener Sieg liegen: Gewinnt „sofort“,
    ist ein verlorener Sieg ausgeschlossen, gleich wie die Fortsetzung ausgegangen wäre.
  - **Urteilsgröße K = L + A.** Intervall: exaktes zweiseitiges Clopper-Pearson 95 % für K/N.
  - Die Anteile **L/N** (nur Beobachtetes) und **K/N** werden beide berichtet. Entschieden wird nach
    K/N.
  - **Nicht der Endpunkt:** der Anteil L/W₀ mit W₀ = Einheiten, in denen „weiter“ gewinnt. Das ist eine
    andere Aussage (*Wie oft schadet Beenden, wenn Weiterspielen gewonnen hätte?*). Er wird beschreibend
    berichtet, entscheidet aber nichts.
  - Gegenstück G = „weiter“ verliert, „sofort“ gewinnt (nur beobachtete Einheiten). Der Vorzeichentest
    auf L gegen G (exakt McNemar, zweiseitig, α 0,05) ist beschreibend, kein zweiter Endpunkt.
- **E2 Punktverlust** (nur Einheiten mit gültigem Paar, ohne Ausfälle): D = Stand „weiter“ − Stand „sofort“. Mittel mit 95-%-t-Intervall, Median,
  exakter Vorzeichentest (Nullen entfallen). 5 Punkte sind eine Setzung für „spürbar“ und entscheiden
  nichts.
- **E3 eingesparte Züge:** KI-Steinzüge und KI-Pässe in „weiter“, Mittel und Median.
- **Nebenkennzahlen (beschreibend):** (a) Auslösung bei verlorener Stellung: „sofort“ verliert,
  unabhängig vom Ergebnis „weiter“. (b) Abweichung der Zählvorschau (`mit`, `nur`) vom GNU-Go-Stand
  an der Auslösung, Verteilung und größte Abweichung. (c) Anteil der Partien ohne Auslösung und ihre
  Gründe.

## 8. Entscheidungsregel (vorab)

`passregel-versuch.md` §4 sagt: Die Regel wird nicht Standard, solange verlorene Siege nicht
ausgeschlossen werden können. Das wird hier so operationalisiert, und zwar **ohne absolutes
Ausschließen**:

- **Das Urteil betrifft ausschließlich den Anteil verlorener Siege pro Auslösung** (E1). Punktverluste
  bei weiterhin gewonnenen Partien (E2), eingesparte Züge (E3) und andere Verschlechterungen erfasst es
  nicht. Sie werden getrennt berichtet.
- **Wortlaut des Befunds**, wenn in **beiden Wertungen** die obere Grenze des Clopper-Pearson-Intervalls
  für **K/N** (§7, K = L + A, N = alle Auslösungen) höchstens **2,0 %** beträgt: *„Die obere
  Konfidenzgrenze für den Anteil verlorener Siege liegt unter den Modellannahmen (§10) bei höchstens
  2 %.“* Das ist keine Aussage, dass verlorene Siege nicht vorkommen. Die 2,0 % sind eine Setzung.
- Ungeklärte Ausfälle zählen konservativ als mögliche Verluste (K), sie werden nicht weggelassen. Ein
  Ausfall mit ungeklärtem Ergebnis kann den Befund verhindern, auch wenn kein Verlust beobachtet wurde.
- Höchstens zulässiges K bei oberer Grenze ≤ 2,0 % (Formelrechnung, keine Messung):

  | N (Auslösungen je Wertung) | 182 | 183 | 200 | 250 | 300 | 400 | 600 |
  |---|---:|---:|---:|---:|---:|---:|---:|
  | höchstes K | nicht möglich | 0 | 0 | 0 | 1 | 2 | 5 |

  Bei N = 183 und K = 0 liegt die obere Grenze bei 1,996 %; bei N = 182 bei 2,006 %. Bei N = 100
  und K = 0 bliebe sie bei 3,6 %. Jeder Ausfall mit möglichem Schaden verbraucht also einen Teil
  dieser Reserve; bei N = 183 darf es gar keinen geben.
- Ist die Grenze nicht erfüllt, bleibt der Schalter AUS und der Befund lautet „Grenze von 2 % nicht
  gezeigt“ mit L, A, N und Intervall. Das ist **kein** Nachweis, dass die Regel Siege kostet.
- Auch bei erfüllter Grenze folgt daraus **keine** automatische Aktivierung. Ein Standardwechsel
  braucht eine eigene Festlegung und ein Go, E2 und E3 fließen dort ein. Diese Messung gilt für die
  Archivstellungen und Gegner aus §3, nicht für Menschen.

## 9. Gültigkeit

Nur zwei Zustände je Wertung, gültig oder ungültig. Ungültig heißt „kein Urteil“ mit Grund, und der
Lauf wird rot. Ein gültiges Ergebnis kann trotzdem „Grenze von 2 % nicht gezeigt“ lauten.

Pflichtprüfungen:

1. **Schalter 0 bitgleich:** Bei `passNachGegnerpass` 0 liefert die Prüfung für alle Stellungen null
   (kein `versuch`), und `tests/passregel-versuch.js` besteht.
2. **Vollständigkeit der Auslösung:** Die Zahl der Quellpartien je Datei stimmt mit den gelesenen
   Zeilen überein, und die Gründe summieren sich auf die Zahl der geprüften Stellungen. Kein stilles
   Weglassen.
3. **Einspielen:** Jeder Zug bis zur Stellung wird von GNU Go bzw. Fuego akzeptiert, und die
   Steinlisten von Engine und Gegner sind an jeder Stellung gleich. Pflicht für 100 % der Einheiten.
4. **Nachspiel-Kontrolle am Archiv** (eigener Job `nachspiel`, `passregel-nachspiel-kontrolle.js`; fehlt sie oder besteht
   sie nicht, ist der Lauf ungültig): Je Gruppe werden mindestens 10 Partien vollständig in GNU Go eingespielt.
   - **Sie bestätigt:** (a) Die archivierten Züge sind in GNU Go regelkonform einspielbar. (b) GNU Gos `final_score`
     der Schlussstellung ist gleich dem archivierten Endstand: Schiedsrichter und Aufzeichnung stimmen überein.
   - **Sie bestätigt nicht:** dass die heutige Engine dieselben Züge wählen würde (die Archive stammen von älteren
     Ständen; das ist eine eigene Prüfung, die hier nicht verlangt wird) und Brett und Gefangene **der Engine**
     (das prüft die Fortsetzung je Einheit gegen `list_stones` und `captures`, Nr. 3). Das eine gilt nicht als
     Nachweis für das andere; der Bericht nennt beides getrennt.
5. **Zählung (Kontrollregel am 07.11.2026 begründet geändert, nach der Zähldiagnose; Probe 1 bleibt ungültig):**

   **Pflichtprüfungen** (verletzt: ungültig):
   - **Brett:** die Steinlisten von Engine und GNU Go sind an jeder Stellung gleich.
   - **Gefangene:** die Gefangenen aus dem Einspielen sind gleich GNU Gos `captures` je Farbe, mit **einer** festen
     Zuordnung. Welche Konvention GNU Go meint (von dieser Farbe gefangen oder an sie verloren), wird in jedem
     Fortsetzungs-Prozess **vor der ersten Einheit** an einer Kalibrierstellung mit ungleichen Zahlen bestimmt: Schwarz
     schlägt zwei Steine (A1, T1), Weiß einen (A19). `captures black` 2 und `captures white` 1 heißt „gefangen von“, 1 und 2
     heißt „verloren an“, alles andere bricht ab. Danach gilt nur diese Zuordnung; ein vertauschter Zähler fällt bei
     ungleichen Zahlen auf. Der Bericht nennt die angewandte Konvention und die Zahl der Stellungen mit ungleichen
     Gefangenenzahlen.
   - **Tot-Liste:** `final_status_list dead` ist lesbar, jedes Wort eine gültige Brettkoordinate (kein `pass`).
   - **Komi 7,5** und **Übereinstimmung mit dem App-Code:** Die Territory-Rechnung folgt der Regel der App
     (`finalTerritoryScore`, tote Steine als Gefangene des Gegners, Komi 7,5). Das prüfen Tests gegen die aus `index.html`
     geschnittenen Funktionen `finalAreaScore` und `finalTerritoryScore` (Stellungen mit toten Steinen und ungleichen
     Gefangenenzahlen, 300 Zufallsbretter, und die feste Stellung aus der Zähldiagnose). Die Partie vom 31.10. ergibt
     W+200,5 (`tests/zaehlvorschau.js`).

   **Vergleich zweier Zählverfahren (kein Gültigkeitskriterium):** die Fläche aus der Tot-Liste (App-Regel, Flood-Fill:
   eine leere Region zählt nur mit genau einer Randfarbe, `index.html` `finalAreaScore` und `finalTerritoryScore`,
   `borders.size === 1`) gegen GNU Gos `final_score`. Abweichungen werden **mit Koordinaten und Bestandteilen** berichtet
   (Steine, Gebiet, neutrale Punkte, tote Steine, die Punkte mit abweichender Zuordnung und GNU Gos Klassen dazu), **ohne
   pauschale Toleranz**: jeder Unterschied steht mit seinem genauen Wert da. Ein gleicher Wert ist **kein allgemeiner
   Nachweis korrekter Implementierung**, ein ungleicher **kein Nachweis eines Fehlers** in einem der beiden Verfahren.

   **Fläche** verwendet weiterhin direkt GNU Gos `final_score`. **Territory** bleibt ausdrücklich „App-Rechnung mit
   GNU-Go-Tot-Liste“; das war das festgelegte Messziel. Ein Wechsel auf GNU Gos Gebietslisten würde dieses Ziel ändern und
   ist **nicht** Teil dieser Änderung.

   **Begründung der Änderung:** Die Zähldiagnose (Lauf 42317041690, §13 und `passregel-zaehldiagnose.md` §8) zeigt an der
   Ausgangsstellung von Probe 1 (alte PWA, `m1`, Partie 206, Index 341), dass beide Verfahren drei Punkte (G19, H19, J19)
   unterschiedlich zuordnen (GNU Go: Schwarz-Gebiet; App-Regel: neutral). Warum GNU Go sie so zuordnet, ist offen. Die
   frühere Regel „Gleichheit mit `final_score` ist Pflicht, sonst ist der Territory-Teil ungültig“ hätte damit die
   App-Rechnung selbst als fehlerhaft behandelt, obwohl nichts einen Fehler zeigt, oder das Messziel auf GNU Gos Zählung
   verschoben. Die Änderung gilt **ab Probe 2** und nicht rückwirkend: Probe 1 bleibt nach der damals geltenden Regel
   ungültig.

   **Diagnose zur Zählung:** Für jede gezählte Stellung (Anfang, Ende, jede Wiederholung) speichert die Fortsetzung in
   `diagnose` das Brett als Text, die Gefangenen, die toten Koordinaten, den `final_score`-Text, die Fläche aus
   `final_score` und aus der Tot-Liste und die Territory-Zählung aus der Tot-Liste. Bei einer Abweichung holt sie
   zusätzlich GNU Gos Listen (`alive`, `seki`, `white_territory`, `black_territory`, `dame`) und weist die Punkte mit
   abweichender Zuordnung und die Bestandteile aus; das Log schreibt Ort (Anfang, Ende oder Wiederholung k), beide
   Zählwerte, Bestandteile, Koordinaten und das Brett.

6. **Fortsetzungen und Ausfälle:** Jeder Ausfall (Absturz von GNU Go oder Fuego, Timeout,
   600-Züge-Grenze, Abbruch, nicht zählbare Endstellung) wird einzeln mit Stellung, Gruppe, Arm-1-Ergebnis
   und Grund aufgelistet. Es gibt zwei getrennte Folgen:
   - **Für E1 (das Urteil über verlorene Siege)** ist ein Ausfall kein Ausschlussgrund. Er zählt in N,
     und wenn „sofort“ verliert oder nicht zählbar war, zählt er konservativ in A und damit in K (§7).
     So kann man ihn nicht „einfach weglassen“. 95 % reguläre Fortsetzungen sind **keine**
     Sicherheitsgrenze für die 2 % und werden dafür nicht verwendet.
   - **Für E2, E3 und G** fehlen die Paare. Sind es mehr als 5 % der ausgelösten Einheiten der
     Wertung, sind diese Kennzahlen **ungültig** (kein Urteil, Lauf rot), weil die Auswahl verzerrt
     sein kann. E1 bleibt davon unberührt und bekommt über A die Konsequenz.
   - Ein technisch bedingtes Nichtausführen (Runner-Abbruch, Paket nicht gelaufen) ist kein Ausfall im
     obigen Sinn: Das ganze Paket wird wiederholt, nie einzelne Stellungen.
7. **Wiederholbarkeit (nur Probe), neu festgelegt am 06.11.2026 nach Probe 1:** Je Gegnerart (GNU Go, Fuego,
   Gegner-KI) werden Fortsetzungen mit **identischem Seed** wiederholt und mit dem ersten Durchlauf verglichen
   (Workflow: `--wiederhole 3`, Plan in `wiederholungsPlan`):
   - **Ab 3 Einheiten der Gegnerart:** die ersten drei Einheiten (nach Schlüssel) laufen je ein zweites Mal.
   - **Weniger als 3 Einheiten der Gegnerart** (in Probe 1 hatte GNU Go nur 2): **jede vorhandene Einheit läuft
     insgesamt dreimal**, also mit zwei Wiederholungsläufen. Das prüft die Wiederholbarkeit an den vorhandenen
     Stellungen. Weitere Durchläufe schaffen keine dritte Stellung; die Prüfung ist damit schwächer als bei 3
     verschiedenen Stellungen, und der Bericht nennt Zahl der Einheiten und der Läufe.

   Ein Wiederholungslauf zählt nur als **vollständig**, wenn beide Durchläufe fehlerfrei und regulär (zwei Pässe in
   Folge, kein Ausfall) endeten und endliche Endstände in beiden Wertungen haben; die Auswertung prüft das aus den
   Rohfeldern. Zwei abgebrochene Fortsetzungen mit gleicher Teilfolge sind nie „gleich“. „Gleich“ heißt vollständig,
   gleiche Zugfolge und gleicher Endstand. Bei **GNU Go** und **Gegner-KI** müssen alle vollständigen Läufe gleich
   sein, sonst ist die Probe ungültig; die Gegner-KI gehört dazu, weil sie wie unsere Engine mit festem Seed läuft. Bei
   **Fuego** wird die Gleichheit nur berichtet. Verlangt wird je Gegnerart: bei mindestens 3 Einheiten drei Einheiten
   mit je einem vollständigen Wiederholungslauf, bei weniger Einheiten jede mit zwei vollständigen Läufen; sonst ist
   die Probe ungültig und liefert „KEIN URTEIL“. Im Hauptlauf wird die Wiederholung nicht verlangt. **Probe 1 wird
   dadurch nicht nachträglich gültig** (siehe Nachtrag §13).
8. **Voraussetzung „Gegner hat unmittelbar davor gepasst“** (§2): Für 100 % der Einheiten sind die drei
   Prüfungen im Protokoll vermerkt und bestanden. Eine einzige Verletzung macht den Lauf ungültig.
9. **Passregel im Arm „weiter“ aus:** Das Protokoll jeder Fortsetzung enthält `passNachGegnerpass` = 0
   und in keiner KI-Antwort steht `versuch`. Eine Abweichung in einer Fortsetzung macht den Lauf
   ungültig. Stufe A und die Fortsetzungen laufen in getrennten Prozessen.

Wenige ausgelöste Stellungen machen den Lauf nicht ungültig. Sie begrenzen die Aussage (§8).

## 10. Grenzen

- **Auswahl:** Die Stellungen stammen aus Partien, in denen der Gegner passte. Die Ergebnisse gelten
  für diesen Fall, nicht für beliebige Partien.
- **Gegner = Schiedsrichter:** GNU Go beurteilt Stellungen, in denen auch GNU Go der Gegner ist. Für
  GNU-Go-Partien stützt das GNU Gos eigene Sicht; Fuego-Partien sind davon weniger betroffen. Die
  Gruppen werden deshalb getrennt berichtet.
- **Schwacher Gegner:** Fuego läuft mit schwacher Suche, GNU Go auf Stufe 1. Gegen stärkere Gegner
  oder Menschen kann das Weiterspielen mehr oder weniger bringen.
- **Keine gesicherte Unabhängigkeit:** Die Intervalle behandeln die Einheiten als unabhängige
  Bernoulli-Versuche. Das ist eine **Modellannahme**, die das Material nicht belegt. Die Partien einer
  Gruppe stammen aus demselben Lauf, demselben Engine-Stand und demselben Gegner. Gleiche
  Eröffnungen sind möglich, und GNU Go Stufe 1 kann dieselben Zugfolgen liefern. Dagegen und zur
  Sichtbarkeit: (a) Einheiten mit **gleicher Zugfolge bis zur Stellung** werden erkannt, aufgelistet und
  nur einmal gezählt (ein Duplikat aus dem Seed-Rand). (b) E1 wird je Gruppe mit angegeben; ein
  deutlicher Unterschied zwischen den Gruppen wird benannt und ist ein Grund, den gepoolten Satz nicht
  als allgemeine Aussage zu lesen. (c) Die Intervalle beschreiben nur die Unsicherheit dieses Materials,
  keine Aussage über Menschen oder andere Gegner.
- **Eine Fortsetzung je Stellung:** Arm 0 ist eine Stichprobe aus einer Verteilung. Das Paar ist
  verrauscht, die Zahl der Einheiten und nicht die Zahl der Züge zählt für die Intervalle.
- **GNU-Go-Absturz:** Laut `HANDOFF.md` im Repo `Hazeberry/codex` stürzt GNU Go in einer dort
  untersuchten Fuego-Partie nach identischer Zugfolge bei `genmove` ab. Ich habe das nicht
  nachgeprüft; ein solcher Absturz zählt hier als Ausfall (§9 Nr. 6).
- **Territory** ist nur eine Zählvariante (§5).
- Eine **Hypothese** wie „verschenkte Punkte beim Beenden“ bleibt eine, bis E2 sie belegt.

## 11. Umsetzung (06.11.2026)

Gebaut und lokal getestet mit Handdaten und einer Attrappe statt GNU Go (`tests/passregel-vergleich.js`, in
`tests/run.js` und `tests/README.md` eingetragen). Gelaufen sind danach Stufe A und Probe 1 (§13). Der Spielcode ist
unverändert.

- `auswertung/endspiel/passregel-lib.js`: Koordinaten, Statistik, Seed, Voraussetzung, Zählung aus der Tot-Liste,
  Auswertung (`bewerte`) mit Gültigkeit und Wortlaut des Befunds.
- `auswertung/endspiel/passregel-stellungen.js`: Stufe A (Auslösung, Einheiten, Gründe, Duplikate), Schalter 1 nur in
  diesem Prozess.
- `auswertung/endspiel/passregel-fortsetzung.js`: Einspielen, Kontrollen, Arm „sofort“ und Arm „weiter“, Gegner GNU Go,
  Fuego oder Gegner-KI; Fortsetzungen im Prozess mit Schalter 0.
- `auswertung/endspiel/passregel-nachspiel-kontrolle.js`: §9 Nr. 4.
- `auswertung/endspiel/passregel-vergleich.js`: Auswertung und Bericht; `--probe` ohne Wirkungszahlen.
- `.github/workflows/passregel-vergleich.yml`: manuell, Eingabe Stufe A, B oder C. Gelaufen: Stufe A, Probe 1 (§13).

Nicht durch Tests abgedeckt, weil es GNU Go, Fuego und die Gegner-KI braucht: der echte Ablauf mit den drei Gegnern,
die echte Antwort von `captures` auf die Kalibrierstellung (lokal nur Attrappe, beide Konventionen), der Abgleich der
Tot-Liste mit `final_score` an echten Stellungen und die Dauer je Einheit. Das ist Aufgabe der Probe (Stufe B).
Die Tests bestehen eine Mutationsprobe: Gutschrift der toten Steine an die falsche Farbe, falsches Komi-Vorzeichen,
Territory mit Steinen und beidseitig akzeptierte `captures`-Zuordnung werden jeweils erkannt.

## 12. Offen vor einem Go

- **Zählabweichung:** Die Zähldiagnose (Lauf 42317041690, §13) hat die Differenz eingegrenzt (drei Punkte: G19, H19, J19).
  Warum GNU Go sie anders zuordnet als die App-Regel, ist offen. Die Kontrollregel ist dafür geändert (§9 Nr. 5, ab Probe 2).
  Diese Änderung ist eine Vorgabe für die KI-Assistenten; Hazeberry liest sie vor dem Merge.
- **Stufe B wiederholen** (Probe 2) braucht ein eigenes Go, nach Durchsicht dieser Festlegung einschließlich der geänderten
  Kontrollregel (§9 Nr. 5). Ob die Probe vor einer Klärung der offenen Frage läuft, warum GNU Go G19, H19 und J19 anders
  zuordnet, entscheidet Hazeberry; die Kontrolle berichtet diese Abweichung nur noch. Probe 1 ist für Stufe C keine
  ausreichende Grundlage.
- **Hauptumfang, Zeitbudget, Einheiten je Paket:** Probe 1 maß je Einheit im Mittel 4 s, höchstens 8 s (§13); das ist
  ein Hinweis, kein festgelegter Umfang. Der Hauptumfang wird nach Probe 2 festgelegt.
- **Stufe C** hat kein Go. Die GNU-Go-Gruppe hat nur 2 Einheiten (§13); die Auswertung berichtet die Gruppen getrennt (§10).
- Fuego wird im Workflow gebaut (`auswertung/fuego/bauen.sh`, wie in `fuego-siege.yml`).

## 13. Nachtrag: Stufe A und Probe 1 (06.11.2026)

Quelle: Job-Logs der Actions-Läufe auf `main` am Merge-Commit `df557efabebfe0012248f59588a4b803dad9e185`. Die
Rohdaten-Artefakte (`stufe-a` Lauf 42302248358; `ergebnisse-teil-1` und `bericht` Lauf 42302924212) liegen im
Actions-Lauf, **nicht** unter `docs/daten/`, weil der Download aus der Arbeitsumgebung gesperrt war.

**Stufe A** (Lauf 42302248358, Go von Hazeberry, gültig, Pflichtprüfungen bestanden): 2760 Zeilen gelesen und
ausgewertet, 56345 Stellungen geprüft, 563 Einheiten (Fläche 561, Territory 520), keine Duplikate unter den Einheiten.
Das Kriterium N ≥ 183 ist gepoolt in beiden Wertungen erreicht. Verteilung der Auslösungen (Fläche/Territory):
GNU Go ohne Vorgabe 2/2 (960 Partien), Fuego 100 Spiele 44/43 (480), Fuego 50 Spiele 317/301 (960), alte PWA 198/174
(360). Fläche nach KI-Farbe: Schwarz 206, Weiß 355. An der Auslösung (Fläche, alle Einheiten): `mit` = `nur` im Mittel
68,6 (Median 61,5; 20,5 bis 230,5), Spanne im Mittel 0,098 (höchstens 2,0), gemischter Anteil im Mittel 0,010
(höchstens 0,243). Gründe ohne Auslösung (Fläche): „ungeklärte Gruppen (Spanne)“ 32270, „nicht ausgespielt“ 20090,
„Vorsprung zu klein“ 2850. Das ist keine Aussage über die Wirkung der Regel.

**Probe 1** (Lauf 42302924212, Go von Hazeberry für Stufe B, **ungültig: „KEIN URTEIL“**, Lauf endete in „Auswertung“
mit Fehler, alle anderen Jobs erfolgreich, Dauer gut fünf Minuten):
- 11 Einheiten (GNU Go 2, Fuego 6, Gegner-KI 3), 0 Pflichtfehler, 0 Ausfälle, je Einheit im Mittel 4 s, höchstens 8 s.
- Nachspiel-Kontrolle bestanden, 10 von 10 in jeder der vier Gruppen. Sie bestätigt nur die Einspielbarkeit der
  Archivzüge in GNU Go und die Übereinstimmung von `final_score` mit dem archivierten Endstand (§9 Nr. 4).
- `captures`: Kalibrierung ergab „gefangen von“, in allen 11 Stellungen angewandt, 10 davon mit ungleichen
  Gefangenenzahlen, keine Abweichung.
- Wiederholbarkeit: Fuego 3 von 3, GNU Go 2 von 2, Gegner-KI 3 von 3 vollständig und gleich in Zugfolge und Stand.
- **Ungültig aus zwei Gründen:** (1) Wiederholung bei GNU Go nur 2 vollständige von mindestens 3, weil es nur 2
  Einheiten gab; (2) Territory-Kontrolle: bei einer Stellung (alte PWA, `m1`, Partie 206, Zug 341) war die Fläche aus
  der Tot-Liste ungleich `final_score`. Ursache offen. Laut Durchsicht von Hazeberry an den Rohdaten: `final_score`
  B+139,5 gegenüber +136,5 aus der Tot-Liste (von mir nicht nachgeprüft, weil der Download gesperrt war).
- Laut Durchsicht von Hazeberry enthalten alle elf Fortsetzungen KI-Steinzüge, 3 bis 77 (von mir nicht nachgeprüft).
  Die Fortsetzung spielt also tatsächlich weiter.
- **Fehler im Werkzeug:** Das Log der Fortsetzung druckte je Einheit die Stände beider Arme („weiter F … / sofort F …“),
  obwohl die Probe keine Wirkungszahlen zeigen soll. Die Zeilen wurden gelesen; daraus wird keine Wirkungsaussage
  abgeleitet. Behoben durch `--probe` (§4). Meine erste Schätzung „die Probe dauert Stunden“ war falsch.

Probe 1 wird nicht nachträglich für gültig erklärt und ist keine Grundlage für Stufe C.

**Zähldiagnose** (Lauf 42317041690, 07.11.2026, Go von Hazeberry, gültig; ausführlich `passregel-zaehldiagnose.md` §8 und
`docs/daten/passregel-zaehldiagnose/lauf1/zaehldiagnose.md`): An der Ausgangsstellung von Probe 1 (alte PWA, `m1`, Partie 206,
Index 341) ist `final_score` B+139,5 und die Fläche aus der Tot-Liste 136,5, Unterschied −3. Die Differenz entspricht genau den
Punkten G19, H19 und J19, die GNU Go als Schwarz-Gebiet und die App-Regel als neutral zuordnet. Warum GNU Go so zuordnet, ist
offen. Beide Verfahren sind verglichen; ein Fehler eines Verfahrens ist damit nicht gezeigt. Daraufhin ist die Kontrollregel
geändert (§9 Nr. 5, ab Probe 2). Probe 1 bleibt ungültig.
