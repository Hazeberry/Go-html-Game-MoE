# Baum-Übernahme: abschalten ohne Verlust?

Vorab festgelegt am 29.10.2026, vor jedem Lauf. Hazeberry hat den Versuch an
diesem Tag beauftragt. Der Messlauf startet erst nach einem eigenen Go.

## 1. Anlass und Frage

In Stufe B ([`komponenten-b.md`](komponenten-b.md) §9) kostete es auf dem
Default nichts Messbares, den Baum nicht zu übernehmen: T0 lag bei −5,0
gegen GNU Go und +2,1 gegen Fuego. Mit Übernahme, aber ohne frische Wurzel,
verlor die KI dagegen rund 30 Punkte (W0). Die Übernahme hat also einen
bekannten Fehlerfall und braucht die frische Wurzel als Schutz.

**Abschalten heißt hier: Default `mctsTreeReuse` 0.** Der Code bleibt, wie
er ist. Mit 1 lässt sich die Übernahme jederzeit wieder einschalten. Die
frische Wurzel wirkt dann nicht mehr, weil sie nur einen übernommenen Baum
betrifft.

Die Frage ist nicht, ob T0 besser ist, sondern ob es **nicht schlechter** ist
(Nichtunterlegenheit). „Nicht belegt“ wäre die falsche Antwort auf diese
Frage. Zwei Gründe sprechen gegen eine schnelle Entscheidung:

- **Die Auflösung.** Mit 480 Paaren und einer Grenze von −10 bestünde ein
  wirklich harmloses T0 die Prüfung gegen beide Gegner nur in 62 % der Läufe.
  Deshalb 960 Paare (§5).
- **Die Simulationen.** Alle Messungen laufen mit fest 120 Simulationen. Im
  Browser spielt die KI mit Zeitbudget und deutlich mehr Simulationen: bei
  1,8 s rund 4 500 je Zug in Node auf GitHub Actions
  ([`teststaerke.md`](teststaerke.md) §9). Der Nutzen der Übernahme wächst
  vermutlich mit der Zahl der Simulationen. Deshalb gibt es eine zweite
  Messung bei 600 Simulationen.

Benson bleibt, wie er ist, und wird hier nicht gemessen. In Stufe B griff
der Zugfilter fast nie ein, und eine Messung unter Flächenzählung kann einen
Schaden bei Gebietszählung nicht zeigen. Die Gebietszählung bekommt eine
eigene Diagnose.

## 2. Arme

[`auswertung/komponenten/arme-t.sh`](../auswertung/komponenten/arme-t.sh):

| Arm | Angabe (`--ki`) |
|---|---|
| D | – |
| T0 | `mctsTreeReuse=0` |

Beide Arme werden mit einem **neuen Seed** neu gespielt. Die 480 Paare von T0
aus Stufe B sind bekannt (−5,0 und +2,1). Wer sie in eine Prüfung einrechnet,
die erst danach festgelegt wurde, prüft gegen ein Ergebnis, das er schon
kennt. Sie stehen im Nachtrag nur zum Vergleich.

## 3. Bedingungen

Wie in Stufe A ([`komponenten.md`](komponenten.md) §3): sechs Vorgabesteine,
Aufgabe der KI aus, der Gegner gibt nicht auf, bis 600 Züge, Schätzung nach
Zug 40, 80, 120 und 200. Gegner g ist GNU Go Stufe 1, Gegner f Fuego (SVN
r2038, C++14) mit 100 Spielen je Zug, GNU Go zählt nach Fläche
([`baum-uebernahme.yml`](../.github/workflows/baum-uebernahme.yml),
[`spielen.sh`](../auswertung/komponenten/spielen.sh) mit
`ARME=auswertung/komponenten/arme-t.sh`, `SIMS` für die Simulationen).

| Messung | Simulationen | Paare je Gegner | Teile |
|---|---:|---:|---|
| Hauptmessung | 120 | 960 | GNU Go 32 zu 30, Fuego 16 zu 60 |
| zweite Messung | 600 | 240 | GNU Go 30 zu 8, Fuego 16 zu 15 |
| Selbstspiel T0 gegen D | 120 | 360 Partien | 12 zu 30 |

| Eingabe | Wert |
|---|---|
| `seed` | 221 |

Seed **221** für beide Messungen gegen die Gegner und **20262401** als Basis
des Selbstspiels (Teil k mit Basis + k − 1). Beide sind noch nie benutzt. Der
Workflow hat keine Eingaben.

**Selbstspiel** wie in der Muster-Eröffnung: beide Seiten 120 Simulationen,
ohne Aufgabe, bis 600 Züge, Farben im Wechsel.

**Kontrollen.** Je ein Job spielt D mit Seed 220 (Partien 1 bis 20) gegen GNU
Go und gegen Fuego nach. Erwartet: 20 von 20 Zug für Zug gleich wie in Stufe A.

## 4. Endpunkt und Entscheidung, vorab festgelegt

[`bericht.js`](../auswertung/komponenten/bericht.js) mit `--stufe T` und
`--stufe T6`, [`ergebnis-t.sh`](../auswertung/komponenten/ergebnis-t.sh),
[`selbstspiel-bericht.js`](../auswertung/selbstspiel-bericht.js).

Endpunkt ist der Endstand T0 − D nach GNU Gos Zählung, gepaart nach
Partienummer, je Gegner, mit einem 95-%-Intervall (t). Es gibt nur einen Arm.
Weil T0 gegen **beide** Gegner bestehen muss, braucht es keine weitere
Korrektur.

1. **Hauptmessung (120 Simulationen): nicht unterlegen**, wenn die
   Untergrenze gegen GNU Go **und** gegen Fuego über **−10** liegt.
2. **Zweite Messung (600 Simulationen): kein Trend zum Schaden**, wenn gegen
   beide Gegner die Untergrenze über **−20** liegt **und** die Differenz selbst
   über **−5**. Die Grenze ist weiter, weil 240 Paare eine engere nicht
   tragen. Dafür muss der Mittelwert selbst nahe 0 bleiben.
3. **Selbstspiel: Veto** nur, wenn die Obergrenze des 95-%-Intervalls der
   Siegrate von T0 **unter 45 %** liegt. Sonst wird es nur berichtet.

| Hauptmessung | zweite Messung | Selbstspiel | Folge |
|---|---|---|---|
| nicht unterlegen | kein Trend zum Schaden | kein Veto | **Default `mctsTreeReuse` 0** |
| nicht unterlegen | kein Trend zum Schaden | Veto | Default bleibt 1; untersuchen |
| nicht unterlegen | Trend zum Schaden | — | Default bleibt 1; die Übernahme hilft mit mehr Simulationen |
| nicht gezeigt | — | — | Default bleibt 1 |

**Beschreibend, ohne Anspruch:** Phasenprofil, Siege, erste Abweichung,
Unterschied der Gegner, die Kontrollen und der Vergleich mit den 480 Paaren
aus Stufe B. Die Laufzeit im Browser misst dieser Versuch nicht. Die
Übernahme spart dort möglicherweise Rechenzeit, und das gehört zu einer
späteren Entscheidung dazu.

## 5. Auflösung, vorab gerechnet

SD der Differenzen aus Stufe A: 73 gegen GNU Go, 85 gegen Fuego. Chance, die
Hauptmessung gegen beide Gegner zu bestehen:

| wahre Wirkung | 480 Paare | 960 Paare |
|---:|---:|---:|
| 0 | 62 % | **94 %** |
| −3 | 24 % | **61 %** |
| −5 | 8 % | 25 % |

Die halbe Breite des Intervalls ist bei 960 Paaren etwa 4,6 (GNU Go) bzw. 5,4
(Fuego). Die zweite Messung bei 600 Simulationen sieht mit 240 Paaren nur
große Verluste. Sie ist ein Warnsignal, keine Feinmessung.

## 6. Erwartung vorab

- **Hauptmessung:** T0 liegt nahe 0, gegen GNU Go eher leicht darunter (Stufe
  B: −5,0), gegen Fuego nahe 0 (+2,1). Wenn die −5 gegen GNU Go echt sind,
  scheitert die Prüfung schon gegen GNU Go in 44 % der Läufe (§5).
- **Zweite Messung:** Bei 600 Simulationen kostet T0 mehr als bei 120, weil
  mehr übernommen wird. Wie viel, ist offen.
- **Selbstspiel:** nahe 50 %.
- Am wahrscheinlichsten ist also: **Default bleibt 1**. Entweder reicht die
  Hauptmessung gegen GNU Go nicht, oder die zweite Messung zeigt einen Trend.

## 7. Ablauf und Dauer

[`baum-uebernahme.yml`](../.github/workflows/baum-uebernahme.yml), manuell auf
`main`, ohne Eingaben: Fuego einmal bauen; 64 und 32 Jobs bei 120
Simulationen, 60 und 32 Jobs bei 600, 12 Jobs Selbstspiel, zwei Kontrollen
und der Bericht auf `ergebnisse/baum-uebernahme-lauf<N>` unter
`docs/daten/baum-uebernahme/lauf<N>/`. Nur der letzte Job darf ins Repo
schreiben.

Zusammen 3 840 Partien bei 120 und 960 bei 600 Simulationen, 360 im
Selbstspiel und 40 in den Kontrollen. Eine Partie mit 600 Simulationen dauert
etwa fünfmal so lang. Erwartet werden **3 bis 4 Stunden**.

## 8. Danach

Der Nachtrag wendet die Regel aus §4 an. Wird T0 Default, ändert sich nur
`mctsTreeReuse` in `index.html` auf 0, samt Kommentar und README. Bleibt es
bei 1, steht das Ergebnis beim Schalter.
