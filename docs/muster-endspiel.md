# Endspiel-Muster: eine Tabelle für die Zeit ab Zug 81

**Status: festgelegt am 19.10.2026, vor der Prüfung.** Die Prüfdaten sind
beschriftet, aber noch von niemandem ausgewertet. Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–9 werden nicht mehr geändert.

---

## 1. Anlass

Die Diagnose in [`punktverlust-muster.md`](punktverlust-muster.md) zeigt,
wo die Muster-KI ihre Punkte verliert: im Endspiel an den Grenzen. Von Zug
80 bis zum Ende verliert die KI gegen GNU Go im Schnitt 51 von 154 Punkten
Gebiet, GNU Go nur 5,5 von 43. Gut die Hälfte liegt auf den Linien 1 und
2, knapp 60 % direkt an der alten Grenze. Die KI spielt dort GNU Gos besten
Zug in 18,7 % der Stellungen, GNU Go Stufe 1 in 68,7 %. Weder ein einzelner
Term noch mehr Suche ändert das.

Nachahmung war bisher der stärkste Hebel: Die Muster aus GNU Gos Zügen
brachten +102,8 Punkte ([`muster.md`](muster.md)). Die Tabelle im Spiel ist
aber aus allen Spielphasen und aus Stellungen beider Seiten gelernt, zählt
jedes Merkmal einzeln und kennt nur drei Merkmale: das 3×3-Muster, den
Abstand zum letzten Gegnerzug und die Linie. Für das Endspiel fehlt ihr
alles, was weiter als einen Punkt reicht.

Die Warnung aus [`muster-ausbau.md`](muster-ausbau.md) §7 gilt weiter:
Bessere Vorhersage ist nicht bessere Zugwahl. Eine zweite Tabelle sagte GNU
Gos Zug öfter voraus (27,7 % statt 19,3 % ab Zug 81) und spielte gegen GNU
Go schlechter (−11,0 Punkte). Deshalb ist dieser Schritt nur die
Eintrittskarte für eine Messung.

## 2. Frage und Aufbau

**Frage:** Sagt eine Tabelle, die nur aus Stellungen ab Zug 81 mit der KI am
Zug gelernt ist und mehr Merkmale kennt, GNU Gos Zug in der Kandidatenliste
der KI besser voraus als die Tabelle im Spiel?

**Schritt 1 (dieses Dokument):** offline, an GNU Gos Zügen. Entwickelt wird
an vorhandenen Lehrdaten, geprüft wird an frisch beschrifteten Stellungen,
die vorher niemand ausgewertet hat.

**Schritt 2 (nur wenn das Tor in §8 bestanden ist, eigenes Dokument):**
Schalter im Spiel, Pilot mit 30 Paaren für die Dosis, Messung wie bei den
bisherigen Mustern (240 Paare gegen GNU Go, 360 Partien im Selbstspiel).
Besteht das Tor nicht, endet es hier mit einem negativen Ergebnis.

## 3. Daten

GNU Gos Zug ist `reg_genmove` auf Stufe 10 für die Stellung vor dem Zug
(`auswertung/muster-daten.js`). Für die Prüfdaten und die Daten B gilt:
nur Stellungen mit der KI am Zug, ab Zug 81.

| Name | Partien | Stellungen, KI am Zug | Rolle |
|---|---:|---:|---|
| A: KI vor den Mustern | 120 | 4 912 | Entwicklung |
| B: Muster-KI, Seed 201 | 120 (60 mit KI-Stellungen) | 3 968 | Entwicklung, lernt in der Prüfung mit |
| Prüfdaten: heutige KI | 240 | 16 228 | Prüfung |

- **A** sind die 120 Partien aus [`punktverlust.md`](punktverlust.md) (Seed
  151 und 161), **B** die 120 Partien von Arm B der Messung in
  [`muster.md`](muster.md) §8. In beiden Sätzen ist die Beschriftung nur an
  jeder zweiten Stellung erfolgt, abwechselnd für die eine oder die andere
  Seite; deshalb haben nur 60 der Partien in B Stellungen mit der KI am Zug.
- **Die Prüfdaten** sind die 240 Partien von Arm B der Ko-Messung
  ([`code-review.md`](code-review.md) §4): heutige KI, Commit `7b05a74`,
  Seed 203, GNU Go Stufe 1, neun Vorgabesteine, 120 Simulationen.
  Beschriftet ist jeder Zug der KI ab Zug 81 bis Zug 299 mit GNU Gos Zug auf
  Stufe 10: 18 450 Stellungen. In 2 222 antwortet GNU Go mit PASS; sie bleiben
  weg. Es bleiben 16 228 Stellungen, 36 bis 110 je Partie (Mittel 67,6).

```bash
node auswertung/muster-daten.js <Rohdump der Partien> --ab 80 --bis 300 --stufe 10 --seite ki --aus lehr.jsonl
```

**Warum nur die Stellungen mit der KI am Zug.** In den Vorgabepartien führt
die KI, GNU Go (Weiß) liegt zurück und spielt Einbrüche und Angriffe. Die
Liste der KI stellt GNU Gos Zug für die KI-Seite in 20,0 % der Stellungen
nach vorn (Rang 1), für die Seite von GNU Go in 2,1 % (B) und 3,7 % (A);
unter die ersten 16 kommt er in 63,0 % gegen 6,9 % (B). Das sind zwei
verschiedene Spiele, und im Spiel braucht die KI nur das erste. Die Daten
und Daten-Dateien liegen in [`daten/`](daten/): `muster-endspiel-entw-a.jsonl.gz`,
`muster-endspiel-entw-b.jsonl.gz`, `muster-endspiel-pruef.jsonl.gz`,
`muster-endspiel-ergebnisse.json` (Endstand der KI je Partie).

## 4. Kandidatenliste und Merkmale

`auswertung/muster-endspiel-daten.js` stellt jede beschriftete Stellung nach
und ruft `getAIMove` bis kurz vor die Suche auf. Die Kandidatenliste ist die,
die `mctsPUCT` bekäme (Benson-Filter, Augenschutz und Lese-Verzicht
eingerechnet, Zufall auf 0, die Pass-Schwellen abgeschaltet, damit auch
Stellungen kurz vor dem Passen eine Liste haben). Je Kandidat:

- **e:** die Bewertung ohne Muster (Wurzelwert minus `musterGewicht` ×
  `musterWert`), also alles, was neben den Mustern in die Reihenfolge eingeht,
- **ein Merkmalswert je Gruppe:**

| Gruppe | Merkmal des Zugs | Werte in A und B |
|:---:|---|---:|
| m | 3×3-Muster der acht Nachbarn (leer, eigen, fremd, Rand; direkte Nachbarn mit 1 oder 2 Freiheiten markiert), auf Drehung und Spiegelung normiert; wie in `index.html` | 3 686 |
| l | Abstand zum letzten Gegnerzug: 1, 2, 3, 4–6, weiter, keiner; wie in `index.html` | 6 |
| z | Linie 1–4, 5 und höher; wie in `index.html` | 5 |
| **d** | Abstand zum nächsten eigenen und zum nächsten fremden Stein (Chebyshev, 1–6 und weiter) | 27 |
| **u** | die acht Punkte im Abstand 2 auf Achsen und Diagonalen (leer, eigen, fremd, Rand), normiert | 1 106 |
| **k** | die acht Springerpunkte (1, 2), ebenso | 1 357 |
| y | Bouzy-Zone des Punkts (eigen, umstritten, fremd) und wie viele der acht Nachbarn zu eigener und fremder Zone gehören | 29 |
| r | eigene und fremde Steine im äußeren Ring des 5×5-Felds, je 0–3+ | 16 |
| g | Größe der leeren Region, in der der Punkt liegt | 8 |
| p | Linie × Spielabschnitt (Zug 81–120, 121–160, 161–200, ab 201) | 20 |
| n | umstrittene leere Punkte (Bouzy-Wert 0) im 5×5-Feld | 5 |
| b | Stärke der Bouzy-Zone am Punkt, in eigener Sicht | 7 |
| q | Linie 1–4 × Abstand zur nächsten Ecke | 8 |
| e | Linie 1–4 × Abstand zum nächsten eigenen × zum nächsten fremden Stein | 108 |
| x | Linie 1–5 × Abstand zum letzten Gegnerzug | 30 |

Die Werte der Gruppen m, l, z in der Liste sind dieselben wie in
`index.html` (`tests/muster-endspiel.js` prüft, dass die Tabellenwerte der
drei Schlüssel genau `musterWert` ergeben).

## 5. Tabellen und Dosis

Gelernt werden Tabellen mit dem Verfahren aus
[`muster-ausbau.md`](muster-ausbau.md) §2 (verallgemeinertes Bradley-Terry-
Modell, MM-Verfahren nach Coulom 2007, 25 Durchläufe, Merkmalswerte erst ab
fünf möglichen Fällen): Jeder Merkmalswert hat eine Stärke, ein Zug die
Stärke des Produkts seiner Merkmale, und GNU Gos Zug soll unter allen
Kandidaten möglichst wahrscheinlich werden. Tabellenwert = ln Stärke.

Varianten (Buchstaben = Gruppen aus §4):

| Name | Tabelle |
|---|---|
| heute | `MUSTER_TABELLE` in `index.html`, aus allen Phasen und beiden Seiten gelernt (Referenz) |
| naiv-mlz | m, l, z, einzeln gezählt wie heute, aber aus den Stellungen dieser Studie |
| mlz | m, l, z, gemeinsam gelernt |
| mlzd | m, l, z, d |
| **mlzduk** | m, l, z, d, u, k (der Kandidat, §7) |
| alle15 | alle fünfzehn Gruppen (Obergrenze) |

**Dosis.** Im Spiel gilt Wurzelwert = Bewertung ohne Muster + 200 × Musterwert.
Eine gemeinsam gelernte Tabelle streut anders als die heutige. Damit ein
Vergleich bei „derselben Dosis“ möglich ist, wird jede Tabelle so skaliert,
dass die mittlere Streuung ihrer Musterwerte über die Kandidaten einer
Stellung gleich der von „heute“ ist (Faktor etwa 0,6–0,9). „Dosis 200“
heißt: dieser Maßstab, mal 200. Höhere Dosen sind ebenfalls ausgewertet, die
Entscheidung steht aber auf Dosis 200, der heutigen Stärke des Musterterms.
Welche Dosis im Spiel trägt, entscheidet erst der Pilot in Schritt 2.

## 6. Messgrößen

An GNU Gos Zug je Stellung, über alle Prüfstellungen:

- **Rang 1:** Der Zug steht an der Spitze der Liste. Die Suche folgt mit 120
  Simulationen fast immer ihrem Favoriten
  ([`punktverlust-muster.md`](punktverlust-muster.md) §6).
- **Rang ≤ 16:** Der Zug steht unter den Kandidaten, die die Suche überhaupt
  ansieht.

Beide Quoten einmal **statisch** (nur Musterwert) und **kombiniert** (Bewertung
ohne Muster + Dosis × Musterwert, wie an der Wurzel). Gleiche Werte zählen mit
der Wahrscheinlichkeit, die bei zufälliger Wahl unter den Gleichen herauskäme.
Teilmengen: GNU Gos Zug auf Linie 1–2 (dort verliert die KI die Hälfte ihrer
Punkte) und weiter innen; Stellungen aus gewonnenen und aus verlorenen
Partien der KI. Die Unsicherheit ist ein Bootstrap über Partien (1000
Ziehungen, 95 %), die Unterschiede zu „heute“ sind gepaart.

## 7. Entwicklung

Auf den Daten A und B, als Kreuzprüfung in vier Falten nach Partien: Die
Tabelle lernt aus den KI-Stellungen der anderen Falten und prüft in der
vierten. Geprüft wird nur an B (3 968 Stellungen, 60 Partien), weil „heute“
auf A gelernt wurde und dort im Vorteil wäre. Rund 40 Varianten wurden dabei
angesehen; die Zahlen unten sind deshalb für den Kandidaten optimistisch und
nicht belegend. Das tut erst §8.

Was sich zeigte:

1. **Neu lernen allein bringt nichts.** `naiv-mlz` und `mlz` (dieselben drei
   Merkmale, nur aus den Endspiel-Stellungen der KI) liegen bei Rang 1 auf
   dem Stand von „heute“ (+0,1 und +0,2 Punkte kombiniert).
2. **Der Gewinn kommt aus dem Abstand zu den Steinen.** Die Gruppe d (Abstand
   zum nächsten eigenen und fremden Stein) bringt Rang 1 statisch von 22 auf
   38 %. Sie wirkt zusammen mit dem 3×3-Muster: In der ersten Runde (Lernen
   aus A und B, elf Gruppen) fiel die Variante mit allen Gruppen ohne m von
   38 auf 26 %, ohne d auf 30 %. Die Bouzy-Gruppen (y, n, b), Regionsgröße,
   Ecke und Spielabschnitt (g, q, p) brachten zu m, l, z hinzu nichts
   (statisch Rang 1 zwischen 22,4 und 23,5 % gegen 22,7 %).
3. **Auf Linie 1–2 helfen erst die Ringe u und k.** Mit m, l, z, d allein
   steigt Rang 1 auf Randzügen nicht (kombiniert −2,4); mit den Gruppen u
   (Abstand 2) und k (Springerpunkte) steigt er um +7,1. Beide sind 8-Punkte-
   Muster, auf Drehung und Spiegelung normiert.
4. **Die Partien vor den Mustern (A) schaden beim Lernen.** Lernt die Tabelle
   aus A und B zusammen statt nur aus B, sinkt der Gewinn des Kandidaten auf
   Linie 1–2 von +7,1 auf +1,8 (Dosis 200). In A liegt die KI zurück, GNU Go
   spielt dort ein anderes Endspiel. Die Prüfung lernt deshalb nur aus B und
   den Prüfpartien.

Kreuzprüfung, Lernen nur aus B, KI am Zug, Rang 1 und Rang ≤ 16 von GNU Gos
Zug in der Liste in %, in Klammern der Unterschied zu „heute“ bei Rang 1:

| Variante | statisch Rang 1 | Dosis 200 Rang 1 | Dosis 200 Rang ≤ 16 | Linie 1–2, Dosis 200, Rang 1 | Linie 1–2, Dosis 400, Rang 1 |
|---|---:|---:|---:|---:|---:|
| heute | 20,1 | 20,0 | 61,9 | 24,7 | 27,5 |
| naiv-mlz | 19,7 (−0,4) | 20,0 (−0,1) | 76,6 | 24,5 (−0,2) | 24,0 (−3,5) |
| mlz | 22,4 (+2,3) | 20,2 (+0,1) | 79,2 | 23,7 (−1,0) | 26,2 (−1,4) |
| mlzd | 38,1 (+18,0) | 29,6 (+9,6) | 84,1 | 22,3 (−2,4) | 25,0 (−2,5) |
| **mlzduk** | **44,3 (+24,2)** | **33,5 (+13,5)** | **85,6** | **31,8 (+7,1)** | **38,5 (+11,0)** |
| alle15 | 46,3 (+26,2) | 35,7 (+15,7) | 87,2 | 33,1 (+8,4) | 38,5 (+11,0) |

**Gewählt wird `mlzduk`**, die kleinste Variante, die auf Linie 1–2 etwas
bringt: Von den Varianten mit höchstens sechs Gruppen hatte sie dort den
größten Zuwachs bei Dosis 400. Alle fünfzehn Gruppen (`alle15`) kommen nur
rund zwei Punkte weiter und brauchen im Spiel Karten, die nicht gebaut sind.

Dasselbe gilt für die Dosis: Der Gewinn bei Rang 1 steigt mit ihr (mlzduk,
alle Stellungen: +5,0 bei 100, +13,5 bei 200, +18,7 bei 400, +22,3 bei 800),
bis er sich der statischen Quote nähert. Das heißt nur, dass bei hoher Dosis
die Muster die übrige Bewertung überstimmen. Bei der ersten Tabelle brach der
Effekt im Spiel ab Gewicht 800 ein ([`muster.md`](muster.md) §5); wie hoch die
Dosis hier gehen darf, klärt der Pilot.

## 8. Prüfung und Tor (vorab festgelegt)

**Prüfung:** Kreuzprüfung in vier Falten nach Partien über die 240
Prüfpartien (Falte = Nummer der Partie, sortiert, modulo 4). In jeder Falte
lernen die Tabellen aus den KI-Stellungen der Daten B und der drei anderen
Falten der Prüfpartien (die Daten A lernen nicht mit, §7) und werden an der
vierten geprüft. Varianten: heute, naiv-mlz, mlz, mlzduk,
alle15. Alle KI-Stellungen ab Zug 81 der Prüfpartien zählen, auch die aus
verlorenen Partien.

```bash
mkdir -p zw    # Zwischendateien, über 100 MB, stehen in .gitignore
node auswertung/muster-endspiel-daten.js docs/daten/muster-endspiel-entw-b.jsonl.gz --aus zw/entw-b
node auswertung/muster-endspiel-daten.js docs/daten/muster-endspiel-pruef.jsonl.gz --aus zw/pruef
node auswertung/muster-endspiel.js --lehr zw/entw-b,zw/pruef --kreuz 4 \
  --test-quelle muster-endspiel-pruef --test-farbe S --lern-farbe S \
  --varianten naiv-mlz --var mlz=mlz,mlzduk=mlzduk,alle15=mlzyrdgpnbqexuk \
  --iter 25 --boot 1000 --dosen 100,200,400,800 \
  --zeige alle,linie12,linie3+,Partie-gewonnen,Partie-verloren \
  --ergebnis docs/daten/muster-endspiel-ergebnisse.json --tor mlzduk \
  --json zw/pruefung.json
```

**Tor.** `mlzduk` besteht, wenn alle vier Bedingungen gelten (Dosis 200,
Maßstab von „heute“, Unterschied zu „heute“ in Prozentpunkten,
95-%-Intervall über Partien); `--tor` wertet sie aus:

| | Bedingung | Entwicklung |
|---|---|---|
| G1 | Rang 1, alle Stellungen: Unterschied ≥ +5,0 und untere Grenze > 0 | +13,5 |
| G2 | Rang ≤ 16, alle Stellungen: Unterschied ≥ +5,0 und untere Grenze > 0 | +23,7 |
| G3 | Rang 1, GNU Gos Zug auf Linie 1–2: untere Grenze > 0 | +7,1 |
| G4 | Rang 1, Stellungen aus verlorenen Partien: Unterschied ≥ −3,0 | +1,3 |

Die Schwellen sind so gewählt: G1 und G2 liegen deutlich unter den
Entwicklungswerten, aber weit über dem Rauschen (die Intervalle sind dort
rund ±4 Punkte breit). G3 prüft die Seite, auf der die KI ihre Punkte
verliert; dort hat die Gruppe d allein nichts gebracht. G4 sagt, dass die
Tabelle in Partien, die die KI am Ende verliert (rund ein Drittel), nicht
spürbar schlechter ordnet.

**Entscheidung.**
- **Alle vier bestanden:** Schritt 2 (Schalter `musterEndspiel`, Pilot für die
  Dosis, Messung nach der Hausregel).
- **G1 oder G2 nicht bestanden:** Die Entwicklung hat sich nicht bestätigt.
  Kein Schritt 2, das Ergebnis steht als Nachtrag.
- **G1 und G2 bestanden, G3 oder G4 nicht:** Kein Schritt 2. Eine
  Tabelle, die nur innen ordnet oder in verlorenen Partien schlechter ordnet,
  trifft die Diagnose nicht. Das Ergebnis steht als Nachtrag; weitere
  Merkmale bräuchten eine neue Vorabfestlegung.
- `alle15`, `mlz` und `naiv-mlz` gehen nicht ins Tor. Sie zeigen, ob der
  Gewinn von den neuen Merkmalen kommt (`mlz` gegen `mlzduk`) und wie viel
  fehlt (`alle15`).

## 9. Grenzen

- **Lehrer und Gegner sind dasselbe Programm** (GNU Go Stufe 10 und Stufe 1),
  wie in [`muster.md`](muster.md) §7.
- **Gelernt wird aus Stellungen, in denen die KI führt.** Die Daten stammen
  aus Vorgabepartien gegen GNU Go; wie die Tabelle in Partien ohne Vorgabe
  oder gegen Menschen ordnet, ist offen. Auch wenn die KI zurückliegt, sieht
  die Tabelle andere Stellungen (G4 prüft nur grob).
- **Der Abstand zu den Steinen kann die Eigenheiten dieser KI mitlernen.** Die
  Prüfpartien stammen von fast derselben KI wie B, aber aus anderen Partien:
  B wurde vor der Ko-Korrektur gespielt, die Prüfpartien danach (die Ko-
  Korrektur änderte 235 von 240 Partien, den Endstand aber nicht,
  [`code-review.md`](code-review.md) §4). Dass sich die Tabelle bei einer
  veränderten KI verschieben könnte, zeigen die Daten A: Dort schadet das
  Lernen.
- **Rang 1 und Rang ≤ 16 sind nicht der Endstand.** Eine bessere Ordnung der
  Kandidatenliste kann im Spiel ohne Wirkung bleiben oder schaden
  ([`muster-ausbau.md`](muster-ausbau.md) §7). Das klärt nur Schritt 2.
- **Rund 40 Varianten** wurden in der Entwicklung angesehen. Der Kandidat ist
  deshalb ausgewählt; die Prüfdaten sind es nicht.
