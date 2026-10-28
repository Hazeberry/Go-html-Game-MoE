# Komponenten Stufe A: Gesamtspanne und gelernte Teile gegen beide Gegner

Vorab festgelegt am 28.10.2026, vor jedem Lauf. Hazeberry hat Stufe A an diesem
Tag beauftragt: Vorabfestlegung, Workflow und Tests. Der Messlauf startet erst
nach einem eigenen Go.

## 1. Anlass

Die bisherigen Gewinne sind eine Kette. Das Netz brachte mit λ 0,5 gegen 0
+46,9 Punkte bei neun Steinen ([`endspiel-netz.md`](endspiel-netz.md) §8), λ 0,8
gegen 0,5 dann +15,5 bei sechs Steinen ([`netz-dosis.md`](netz-dosis.md) §8).
Die Muster brachten +102,8 bei neun Steinen, bevor es das Netz gab
([`muster.md`](muster.md) §8). Jede Zahl gilt für einen anderen Default und
eine andere Vorgabe. Netz und Muster haben beide aus Zügen von GNU Go gelernt,
und gemessen wurde bisher nur gegen GNU Go. Der Verdacht: Ein Teil ihres
Gewinns kommt daher, dass die KI GNU Gos Züge vorwegnimmt (README, Grenzen).

Stufe A misst deshalb **zuerst die Gesamtwirkung, dann die Teile**: den vollen
Default gegen eine reduzierte Engine, und den Default gegen Arme, denen Netz,
Muster, beide oder RAVE fehlen. Alles gegen beide Gegner, mit demselben Seed
und denselben Bedingungen. Seit [`fuego.md`](fuego.md) §12 gibt es dafür einen
zweiten Gegner, Fuego mit 100 Spielen je Zug. Gegen ihn gewinnt der Default
53 %, er klebt also nicht am Rand.

**Stufe A wählt keinen Default und ändert `index.html` nicht.** Sie soll die
Wirkmechanismen verstehen. Ein neuer Default aus denselben Daten würde die
nächste Verzerrung erzeugen.

## 2. Arme

[`auswertung/komponenten/arme.sh`](../auswertung/komponenten/arme.sh):

| Arm | Abschaltungen (`--ki`) | Partien je Gegner |
|---|---|---:|
| D | – | 480 |
| B | `musterGewicht=0,endspielNetz=0,raveEnabled=0,mctsTreeReuse=0,wurzelFrisch=0,endTieBreak=0,mctsPriorSharp=0,bensonEval=0,bensonMoveFilter=0` | 240 |
| N0 | `endspielNetz=0` | 480 |
| M0 | `musterGewicht=0` | 480 |
| NM0 | `endspielNetz=0,musterGewicht=0` | 480 |
| R0 | `raveEnabled=0` | 240 |

- **D** ist der volle Default.
- **B ist eine reduzierte Engine**, keine reine oder unbeeinflusste Heuristik.
  Abgeschaltet sind genau neun Zusätze: Muster, Netz, RAVE, Tree-Reuse, frische
  Wurzel, Gleichstandsbrecher im Endspiel, scharfer Prior, Benson-Bewertung und
  Benson-Zugfilter. Das ist ein technischer Ausgangspunkt, keine Auswahl danach,
  was sich früher bewährt hat. Weiter an bleiben `evaluateMove` mit seinen
  Phasenbewertungen und deren gegen GNU Go abgestimmten Parametern, dazu
  `gebietZug` 80, `deathTransfer` 1, `augenSchutz` 2, `leseVerzicht` 1 und
  `passUnabwendbar` 1. Ohne Stellungsbeurteilung wäre B keine sinnvolle Engine
  mehr. `mctsPriorSharp=0` schaltet die Priors nicht ab: Es nimmt den alten
  Rang-Prior (fast flach, nach der Reihenfolge von `evaluateMove`).
- **N0, M0, NM0** nehmen die beiden aus GNU-Go-Zügen gelernten Teile heraus,
  einzeln und zusammen. Beide liefern Priors an der Wurzel. Fehlt nur einer,
  kann der andere einspringen, und beide wirken kleiner, als sie sind. Deshalb
  gibt es NM0. Für die Frage nach der Spezialisierung auf GNU Go ist **NM0
  aussagekräftiger als B**: Es entfernt gezielt die gelernten Teile und lässt
  die übrigen Suchmechanismen, wie sie sind.
- **R0** ist eine Kontrolle mit einem Teil, der nicht von GNU Go gelernt hat.
  Sie ist statistisch schwach: Gegen GNU Go kostete RAVE ganz aus nichts
  Messbares, +3,6 [−4,6; +11,7] ([`parameter-reihe.md`](parameter-reihe.md)).
  R0 zeigt also eher, wie stark die Wirkungen allein durch den Gegner wandern,
  als dass es Zirkularität belegen oder ausschließen kann.

D, N0, M0 und NM0 bekommen 480 Partien je Gegner, weil an ihnen die
Hauptfragen hängen. B und R0 bekommen 240, gepaart mit den Partien 1 bis 240
von D.

## 3. Bedingungen

Für beide Gegner gleich
([`auswertung/komponenten/spielen.sh`](../auswertung/komponenten/spielen.sh),
[`komponenten.yml`](../.github/workflows/komponenten.yml)):

- **sechs Vorgabesteine** für die KI, 120 Simulationen, Aufgabe der KI aus,
  der Gegner gibt nicht auf, bis 600 Züge;
- GNU Go Stufe 1 zählt am Ende (`final_score`) und schätzt nach Zug 40, 80,
  120 und 200 (`estimate_score`);
- **Gegner g**: GNU Go Stufe 1 zieht selbst;
- **Gegner f**: Fuego aus SVN r2038 (C++14) mit 100 Spielen je Zug zieht,
  GNU Go spielt jeden Zug mit und zählt ([`fuego.md`](fuego.md) §8 und §12).

| Eingabe | Wert |
|---|---|
| `seed` | 220 |

Seed **220** ist noch nie benutzt. Derselbe Seed gibt der KI in beiden Gegnern
je Partienummer denselben Zufall. Dieselben Partien sind es trotzdem nicht: Ab
dem ersten Zug des Gegners laufen sie auseinander. Gepaart wird deshalb nur
innerhalb eines Gegners, Arm gegen D mit gleicher Partienummer.

**Kontrollen.** Zwei Jobs spielen Partien früherer Messungen mit D nach, jeweils
mit der Schätzung von damals, damit GNU Go dieselben Befehle bekommt:

- gegen GNU Go Seed 216, Partien 1 bis 15, wie Arm L8 in
  [`netz-dosis/lauf1`](daten/netz-dosis/lauf1/) (λ 0,8 ist heute der Default);
- gegen Fuego Seed 219, Partien 1 bis 10, wie Arm 6/100 in
  [`fuego-pruefstand/lauf1`](daten/fuego-pruefstand/lauf1/).

Erwartet: alle Zug für Zug gleich. Weicht eine ab, gilt die Messung trotzdem,
der Nachtrag sucht dann aber die Ursache.

**Probe der ersten 80 Züge.** Das Netz wirkt erst ab Zug 80
(`endspielNetzAb`). D und N0 müssen also in jedem Paar die ersten 80 Züge
gleich spielen, gegen beide Gegner. Der Bericht zählt das. Ein Test prüft es
vorab gegen eine Attrappe
([`tests/komponenten.js`](../tests/komponenten.js)). In den Daten der
Netz-Dosis gilt es schon: λ 0,5 und 0,8 spielen dort in 240 von 240 Paaren die
ersten 80 Züge gleich.

## 4. Auswertung, vorab festgelegt

[`auswertung/komponenten/bericht.js`](../auswertung/komponenten/bericht.js),
[`ergebnis.sh`](../auswertung/komponenten/ergebnis.sh).

**Endpunkt** ist der Endstand nach GNU Gos Zählung, aus Sicht der KI, gepaart
nach Partienummer. Siege laufen nur beschreibend mit. Abgebrochene Partien und
Partien am Zuglimit (ohne Endstand) fallen samt Partner heraus. Der Bericht
nennt, wie viele es sind.

**Berichtet werden Intervalle, keine Urteile.** Kein Arm wird „verworfen“ oder
„belegt“. Ein Intervall, das 0 enthält, heißt nur: Mit dieser Auflösung ist
eine Wirkung dieser Größe nicht ausgeschlossen (§5).

Vier Familien von Vergleichen, jede mit eigener Bonferroni-Korrektur, ohne
Korrektur über die Familien hinweg:

| Familie | Vergleiche | alpha je Vergleich | Intervall |
|---|---|---|---|
| Arm − D gegen GNU Go | B, N0, M0, NM0, R0 | 0,05/5 = 0,01 | 99 % (t) |
| Arm − D gegen Fuego | B, N0, M0, NM0, R0 | 0,01 | 99 % (t) |
| Unterschied der Gegner Δ_f − Δ_g | B, N0, M0, NM0, R0 | 0,01 | 99 % (Welch) |
| Wechselwirkung I | GNU Go, Fuego | 0,05/2 = 0,025 | 97,5 % (t) |

- **Arm − D:** Differenz, SD der Differenzen, Intervall, dazu standardisiert
  (Differenz geteilt durch die SD des Endstands von D bei diesem Gegner) und
  die Siege beider Arme in denselben Paaren.
- **Unterschied der Gegner:** Δ_f − Δ_g je Arm. Die Partien beider Gegner sind
  unabhängig, daher Welch. Positiv heißt: Das Abschalten kostet gegen Fuego
  weniger als gegen GNU Go. Dazu der Unterschied der standardisierten
  Wirkungen, weil ein Punkt gegen beide Gegner nicht gleich viel wiegt (gegen
  Fuego dauern Partien rund 100 Züge länger, §10 von [`fuego.md`](fuego.md)).
  Ein Quotient als „Übertragungsfaktor“ wird nicht berichtet: Bei kleinem
  Nenner ist sein Intervall nicht brauchbar.
- **Wechselwirkung von Netz und Muster:** je Partienummer
  I = NM0 − N0 − M0 + D, also Δ_NM0 − Δ_N0 − Δ_M0. So steckt die Abhängigkeit
  der vier gepaarten Werte in der Streuung von I. Nur Partienummern, die in
  allen vier Armen fertig sind. I < 0 heißt: Beide zusammen fehlen mehr als die
  Summe der einzelnen (Ersatz).
- **Phasenprofil:** dieselbe Differenz Arm − D für GNU Gos Schätzung nach Zug
  40, 80, 120 und 200 und am Ende, mit dem alpha der Familie. Beschreibend. Für
  die Frage nach der Eröffnung urteilt hier GNU Go, also gerade der Gegner,
  dessen Sicht wir prüfen, und früh ist seine Schätzung grob.
- **Probe und Kontrollen** wie in §3.

## 5. Auflösung, vorab gerechnet

Gegen GNU Go mit sechs Steinen lag die SD der gepaarten Differenzen in der
Netz-Dosis bei 58 bis 60 Punkten (A und T8 gegen L8, 240 Paare,
[`netz-dosis/lauf1`](daten/netz-dosis/lauf1/)). Gerechnet wird vorsichtig mit
65, weil der Endstand gegen Fuego stärker streut ([`fuego.md`](fuego.md) §12),
und mit 80 % Power:

| Vergleich | Paare | alpha | kleinste sichtbare Wirkung |
|---|---:|---:|---:|
| Arm − D | 480 | 0,01 | rund 10 Punkte |
| Arm − D | 240 | 0,01 | rund 14 Punkte |
| Δ_f − Δ_g | 480 je Gegner | 0,01 | rund 14 Punkte |
| Δ_f − Δ_g | 240 je Gegner | 0,01 | rund 20 Punkte |
| Wechselwirkung (SD von I bis doppelt so groß) | 480 | 0,025 | rund 18 Punkte |

Gegen Fuego ist die SD der Differenzen noch unbekannt, Stufe A liefert sie. Eine
kleine Komponente fällt mit dieser Auflösung nicht auf, ohne dass daraus folgt,
dass sie nichts trägt. Der Unterschied der Gegner ist nur für große
Komponenten auflösbar, also für Netz und Muster.

## 6. Erwartung vorab

- **B** liegt gegen beide Gegner weit unter D, Größenordnung −100 Punkte oder
  mehr, mit fast keinen Siegen. B kann Partien bis zum Zuglimit verlängern, weil
  der Benson-Zugfilter fehlt. Solche Partien zählt der Bericht.
- **N0 gegen GNU Go** liegt deutlich unter D, Größenordnung −40 bis −60. Das
  ist aus der Kette in §1 grob geschätzt, die Glieder addieren sich nicht
  genau.
- **M0 gegen GNU Go** liegt unter D, aber weniger als die +102,8 von damals,
  weil das Netz einspringt.
- **NM0** liegt unter N0 und unter M0. Die Wechselwirkung ist negativ (Ersatz).
- **R0** liegt gegen beide Gegner nahe 0.
- **Phasen:** N0 ist bis Zug 80 gleich D (Differenz nach Zug 40 und 80 genau 0).
  M0 und NM0 weichen schon früher ab.
- **Die Hypothese zur Zirkularität:** Netz und Muster helfen gegen Fuego weniger
  als gegen GNU Go. Für N0, M0 und NM0 ist Δ_f − Δ_g also positiv, auch
  standardisiert, für R0 nahe 0. Tritt das ein, stützt es den Verdacht. Die
  Ursache beweist es nicht: Fuego spielt anders als GNU Go, und das kann auch
  aus anderen Gründen ändern, was Netz und Muster bringen. Tritt es nicht ein,
  spricht das gegen einen großen Anteil von Zirkularität, soweit die Auflösung
  (§5) reicht.

## 7. Ablauf und Dauer

[`komponenten.yml`](../.github/workflows/komponenten.yml), manuell auf `main`:

- `pruefen`: Eingaben prüfen;
- `fuego-bauen`: Fuego einmal bauen, alle Fuego-Jobs nehmen dasselbe Programm;
- `gnugo-gross`, `gnugo-klein`: 96 und 24 Jobs zu je 20 Partien gegen GNU Go;
- `fuego-gross`, `fuego-klein`: 48 und 12 Jobs zu je 40 Partien gegen Fuego;
- `kontrolle-g`, `kontrolle-f`: die Kontrollen aus §3;
- `ergebnis`: Bericht, Rohdaten gepackt, Branch
  `ergebnisse/komponenten-lauf<N>` unter `docs/daten/komponenten/lauf<N>/`.
  Nur dieser Job darf ins Repo schreiben. Fehlende Teile brechen den Bericht
  nicht ab, `fehlende-teile.txt` nennt sie.

Zusammen 4 800 Partien. Eine Partie gegen GNU Go dauerte bisher rund eine
Minute, gegen Fuego mit 100 Spielen eine halbe. Erwartet werden **2 bis 4
Stunden**, je nachdem, wie viele Jobs GitHub gleichzeitig laufen lässt.

## 8. Danach

Der Nachtrag ordnet die Intervalle ein, ohne Urteil über Defaults. Stufe B
bekommt eine eigene Vorabfestlegung: die übrigen Komponenten einzeln
abschalten, nur gegen Fuego, nur mit Intervallen. Den Unterschied der Gegner
messen wir danach nur für die drei bis vier größten Komponenten, weil er für
kleine nicht auflösbar ist (§5).
