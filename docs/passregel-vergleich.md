# Passregel-Vergleich: kostet „Pass nach Gegnerpass“ Siege oder Punkte?

Vorabfestlegung, 06.11.2026, überarbeitet nach Durchsicht am selben Tag (Voraussetzung Gegnerpass,
Passregel im Arm „weiter“ aus, Ausfälle konservativ, Nenner, Unabhängigkeit, Territory-Kontrollen).
Status: **festgelegt, nicht gestartet, kein Go, keine Freigabe für Umsetzung oder Lauf.** Das Spiel bleibt
unverändert (`passNachGegnerpass` bleibt 0). Es gibt noch keine Messung und keine Zahl zu
Auslösungen oder Wirkung. Dies ist die Ausführung von §4 in
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
3. Die Engine führt an dieser Stellung `consecutivePasses` = 1 und übergibt `gegnerPasste`.

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
| alte PWA | GNU Go Stufe 1 | `pwa-vergleich/lauf1/m1` |

Je Gruppe höchstens 100 Partien, gezogen mit festem Seed 1 wie in `pass-stellungen.js`. Abgebrochene
Partien und solche ohne `zuege` oder `wirFarbe` fallen weg und werden gezählt. Handpartien
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
   Spanne und Anteil an der Auslösung. Ausgabe: Tabelle und die Liste der Einheiten. **Entscheidungshilfe
   vor Stufe C:** Reicht die Zahl der Auslösungen N für das Kriterium in §8 (mindestens 183 je
   Wertung, bei möglichen Ausfällen eher mehr)? Stufe A prüft außerdem für jede Einheit die
   Voraussetzung aus §2 und die Duplikate aus §10 und nennt die Zahl der Einheiten nach Abzug der
   Duplikate. Reicht N nicht, ist die Frage mit diesem Material nicht entscheidbar. Dann legt Hazeberry fest, ob das
   Material erweitert wird (neue Partien, eigener Messlauf mit Vorabfestlegung) oder die Aussage
   begrenzt bleibt.
2. **Stufe B, technische Probe:** wenige Stellungen je Gruppe, nur zum Prüfen der Werkzeuge und der
   Gültigkeit (§9). **Keine Wirkungsauswertung:** Die Probe berichtet keine Siegwechsel und keine Mittel
   als Ergebnis. Sie misst Dauer und Ausfälle, damit der Hauptumfang vor dem Hauptlauf festgelegt werden
   kann.
3. **Stufe C, Hauptlauf:** alle Einheiten aus Stufe A (je Gruppe höchstens 100). Eigenes Go.

## 5. Zählung

Maßgeblich ist **GNU Go Stufe 1 als Schiedsrichter**, chinesische Regeln, Komi 7,5, wie in den
Standardbedingungen. Die Zählvorschau der App ist nicht der Schiedsrichter, sondern wird mit ihm
verglichen (§7, Nebenkennzahl).

- **Fläche:** `final_score` auf der Stellung.
- **Territory:** `final_status_list dead` auf der Stellung, danach die **Territory-Rechnung der App**
  (derselbe Code wie `finalTerritoryScore`, keine Nachbildung): Gefangene aus dem Einspielen, tote
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

Wie in `passregel-versuch.md` §4: **Die Regel wird nicht Standard, solange verlorene Siege nicht
ausgeschlossen werden können.** Konkret:

- „Verlorene Siege ausgeschlossen“ gilt nur, wenn **in beiden Wertungen** die obere Grenze des
  Clopper-Pearson-Intervalls für **K/N** (§7, K = L + A, N = alle Auslösungen) höchstens **2,0 %**
  beträgt. Die 2,0 % sind eine Setzung. Ungeklärte Ausfälle zählen also konservativ als mögliche
  Schadensfälle. Sie werden nicht ausgeschlossen. Ein Ausfall mit ungeklärtem Ergebnis kann das Urteil
  verhindern, auch wenn kein Schaden beobachtet wurde.
- Höchstens zulässiges K bei oberer Grenze ≤ 2,0 % (Formelrechnung, keine Messung):

  | N (Auslösungen je Wertung) | 182 | 183 | 200 | 250 | 300 | 400 | 600 |
  |---|---:|---:|---:|---:|---:|---:|---:|
  | höchstes K | nicht möglich | 0 | 0 | 0 | 1 | 2 | 5 |

  Bei N = 183 und K = 0 liegt die obere Grenze bei 1,996 %; bei N = 182 bei 2,006 %. Bei N = 100
  und K = 0 bliebe sie bei 3,6 %. Jeder Ausfall mit möglichem Schaden verbraucht also einen Teil
  dieser Reserve; bei N = 183 darf es gar keinen geben.
- Ist das nicht erfüllt, bleibt der Schalter AUS und der Befund lautet „nicht ausgeschlossen“ mit L, A,
  N und Intervall. Das ist **kein** Nachweis, dass die Regel schadet.
- Auch bei erfüllter Grenze folgt daraus **keine** automatische Aktivierung. Ein Standardwechsel
  braucht eine eigene Festlegung und ein Go, E2 und E3 fließen dort ein. Diese Messung gilt für die
  Archivstellungen und Gegner aus §3, nicht für Menschen.

## 9. Gültigkeit

Nur zwei Zustände je Wertung, gültig oder ungültig. Ungültig heißt „kein Urteil“ mit Grund, und der
Lauf wird rot. Ein gültiges Ergebnis kann trotzdem „nicht ausgeschlossen“ lauten.

Pflichtprüfungen:

1. **Schalter 0 bitgleich:** Bei `passNachGegnerpass` 0 liefert die Prüfung für alle Stellungen null
   (kein `versuch`), und `tests/passregel-versuch.js` besteht.
2. **Vollständigkeit der Auslösung:** Die Zahl der Quellpartien je Datei stimmt mit den gelesenen
   Zeilen überein, und die Gründe summieren sich auf die Zahl der geprüften Stellungen. Kein stilles
   Weglassen.
3. **Einspielen:** Jeder Zug bis zur Stellung wird von GNU Go bzw. Fuego akzeptiert, und die
   Steinlisten von Engine und Gegner sind an jeder Stellung gleich. Pflicht für 100 % der Einheiten.
4. **Nachspiel-Kontrolle am Archiv:** Je Gruppe mindestens 10 Partien werden vollständig eingespielt;
   GNU Gos `final_score` der Schlussstellung ergibt den aufgezeichneten Endstand (Verfahren wie in
   `orakel-nachspiel.js`).
5. **Zählung:** Auf den Kontrollstellungen ist die aus der Tot-Liste gerechnete Fläche gleich
   `final_score`. Für Territory gilt zusätzlich:
   - Die Gefangenen aus dem Einspielen in der Engine sind gleich GNU Gos `captures` je Farbe.
   - Die Territory-Rechnung ist der Code der App (`finalTerritoryScore`), mit Komi 7,5, und schreibt die
     toten Steine der Tot-Liste als Gefangene gut. Das prüft ein Test an einer bekannten Stellung.
   - Die Partie vom 31.10. ergibt W+200,5 (`tests/zaehlvorschau.js`).

   Verfehlt eine dieser Kontrollen, ist der Territory-Teil ungültig; der Flächenteil bleibt davon
   unberührt.
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
7. **Wiederholbarkeit (nur Probe):** Mindestens 3 Fortsetzungen je Gegnerart werden mit gleichem Seed
   wiederholt und müssen bei Engine und GNU Go gleiche Zugfolgen liefern. Bei Fuego wird das Ergebnis
   nur berichtet; die Paare brauchen keine Wiederholbarkeit.
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

## 11. Umsetzung (noch nicht gebaut, erst nach Freigabe dieser Festlegung)

- `auswertung/endspiel/passregel-stellungen.js`: Stufe A (Auslösung, Einheiten, Gründe).
- Fortsetzen aus einer Stellung in `gnugo-duell.js` (Option mit Zugfolge) samt Zählung (Fläche und
  Tot-Liste) und Ausfallprotokoll.
- `auswertung/endspiel/passregel-vergleich.js`: Auswertung (L, G, D, Intervalle, Tests, Nebenkennzahlen).
- Workflow `passregel-vergleich.yml` (manuell, Eingabe Stufe A/B/C, Pakete je Gruppe und Wertung),
  Runner `ubuntu-24.04`.
- Tests: Ausgangsstellung und Einspielen an einer Handpartie, Schalter 0 ohne `versuch`, Seed-Ableitung,
  Clopper-Pearson und Vorzeichentest an bekannten Werten, Gültigkeitsregeln. Eintrag in `tests/run.js`,
  `tests/README.md` und `.github/workflows/tests.yml`, falls ein Browser nötig ist (nicht vorgesehen).
- Neue interne Funktionen, die ein Test braucht, kommen in `tests/rahmen.js`.

## 12. Offen vor einem Go

- Zahl der Auslösungen je Wertung (Stufe A). Ohne sie ist offen, ob das Kriterium in §8 erreichbar ist.
- Hauptumfang, Zeitbudget und Pakete: nach der Probe (Dauer je Fortsetzung noch nicht gemessen).
- Ob Fuego im Workflow gebaut wird (vorhandene Fuego-Workflows zeigen, wie).
