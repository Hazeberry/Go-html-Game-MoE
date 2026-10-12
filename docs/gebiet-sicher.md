# Gebiet mit Sicherheit: Orakel-Probe mit GNU Gos Lebensurteil

**Status: festgelegt am 12.10.2026, vor dem Lauf.** Was danach hinzukommt,
steht als Nachtrag darunter; die Abschnitte 1–6 werden nicht mehr geändert.

---

## 1. Anlass

`gebietZug` (Default 80) bewertet jeden Kandidaten mit der Änderung der
Bouzy-Bilanz. Dabei gelten alle Steine als lebendig. Daraus ergeben sich
zwei Befunde der letzten Diagnosen:
- Auf Annäherungen antwortet die KI selten mit GNU Gos Zug. Der Abstand
  kommt vor allem aus `gebietZug` ([`annaeherung.md`](annaeherung.md)).
- Die zweite Mustertabelle spielte schlechter, weil sie Retten und Schlagen
  hoch bewertet ([`muster-ausbau.md`](muster-ausbau.md) §7).

Beides spricht dafür, dass die Bewertung ein Urteil braucht, ob eine Gruppe
lebt. Ein eigenes Urteil zu bauen ist aufwendig. Deshalb zuerst die
Obergrenze: **Spielt die KI stärker, wenn `gebietZug` GNU Gos eigenes
Lebensurteil bekommt?** Wenn nicht, lohnt sich ein eigenes Urteil für diesen
Term nicht.

## 2. Der Haken in der Engine

`PARAMS.gebietSicher` (Default 0) und `setzeLebensurteil(urteil)`. Das
Urteil gilt für die Stellung an der Wurzel und kommt von außen. Es nennt
tote Steine und kritische Gruppen, je mit Angriffs- und
Verteidigungspunkt. Es wirkt auf die Bouzy-Karte von `gebietZug`,
`endTieBreak` und `gegnerGebiet`:

| `gebietSicher` | tote Gruppen | kritische Gruppen |
|---:|---|---|
| 0 | zählen (wie bisher, bitgenau) | zählen |
| 1 | fehlen, an der Wurzel und nach jedem Kandidaten | nach dem Zug wie unten |
| 2 | zählen | nach dem Zug wie unten |

Kritisch heißt bei GNU Go: Wer zuerst zieht, entscheidet. Nach dem Zug ist
der Gegner dran. Die eigene kritische Gruppe zählt also nur, wenn der Zug
ihr Verteidigungspunkt ist. Die fremde fehlt nur, wenn der Zug ihr
Angriffspunkt ist. Hängt der neue Stein an Steinen, die so wegfallen, fällt
seine Kette mit weg.

Das Urteil liefert `gnugo-duell.js --orakel 10`: Ein zweites GNU Go auf
Stufe 10 spielt jeden Zug mit und antwortet vor jedem Zug der KI auf
`dragon_status` und `dragon_stones` (`auswertung/lebensurteil.js`). Ohne
`gebietSicher` ändert das Orakel nichts: Zwei Partien mit Orakel, aber bei
0, sind zugweise gleich wie ohne Orakel. Tests: `tests/gebiet-sicher.js`.

## 3. Probe: tote Gruppen weglassen schadet (`gebietSicher` 1)

Vier Partien (Seed 202, Nr. 1–4) gegen dieselben Partien ohne Orakel:
−124, −18, +20 und −348 Punkte Endstand. In Partie 4 verliert die KI mit
−370,5.

Verlauf von Partie 4 (GNU Gos Urteil, Stufe 10):

| Zug | Schätzung | tote Steine KI | tote Steine GNU Go | kritisch GNU Go |
|---:|---|---:|---:|---:|
| 40 | B+168 | 0 | 11 | 0 |
| 70 | B+104 | 5 | 12 | 2 |
| 100 | W+105 | 12 | 11 | 0 |
| 115 | W+183 | 16 | 0 | 12 |
| 130 | W+281 | 27 | 0 | 0 |

Elf weiße Steine galten von Zug 40 bis 100 als tot. Für die KI waren sie
damit schon gefangen, kein Zug in ihrer Nähe brachte noch Gebiet. Sie
antwortete nicht mehr, Weiß belebte die Steine wieder und tötete danach
große schwarze Gruppen. Mit eigenen „toten“ Gruppen ist es ebenso: Die KI
gibt sie auf, auch wenn GNU Go auf Stufe 1 sie nicht getötet hätte.

**Ein festes Urteil über tote Gruppen macht die Bewertung blind für die
Züge, die das Urteil ändern.** Variante 1 wird nicht weiter gemessen.

## 4. Probe: nur kritische Gruppen (`gebietSicher` 2)

Bei kritischen Gruppen hängt das Urteil vom Zug ab. Acht Partien (Seed
202, Nr. 1–8), Endstand gegen dieselben Partien ohne Orakel:

| Nr. | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| B − A | −240 | −30 | +118 | +84 | +24 | +74 | +84 | 0 |

Im Schnitt +14,3, bei dieser Streuung ohne Aussage. Die Messung unten
entscheidet.

## 5. Messung, vorab festgelegt

Eine Diagnose, kein Kandidat für einen Default: Das Orakel braucht GNU Go.

**Arme:**

| Arm | Parameter |
|---|---|
| A | Default, ohne Orakel |
| B | `gebietSicher` 2, `--orakel 10` |

**M1, gegen GNU Go:** Stufe 1, neun Vorgabesteine, 120 Simulationen,
Aufgabe der KI aus, GNU Go gibt nicht auf, bis 600 Züge, Seed 202, 240
Partien in 16 Teilläufen zu 15.

Arm A sind die Partien von Arm A aus
[`muster-ausbau.md`](muster-ausbau.md) §7 (`daten/ausbau-gnugo.json`).
Seitdem ist an der Engine nur Tabelle 2 entfernt worden und der Haken
dazugekommen, beides ohne Wirkung auf Arm A. Neu gespielt ergeben die
Partien 1 und 2 dieselben Züge. Zur Kontrolle wird Teillauf 1 (Partien
1–15) von Arm A neu gespielt; weicht eine Partie ab, wird Arm A ganz neu
gespielt.

```bash
for v in 1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226; do
  node gnugo-duell.js --partien 15 --von $v --seed 202 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 --orakel 10 \
    --ki mctsFixedSims=120,resignEnabled=0,gebietSicher=2 --roh sicher-gnugo-B-$v.jsonl
done
node auswertung/gnugo-vergleich.js --A ausbau-gnugo-A-*.jsonl --B sicher-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt: gepaarte Differenz B − A des Endstands, zweiseitig, α = 0,05,
mit 95-%-Intervall. Erkennbar sind rund 12 Punkte
([`teststaerke.md`](teststaerke.md)).

Ein Selbstspiel (M2) gibt es nicht: `ab-harness.js` hat kein GNU Go als
Orakel.

**Entscheidung, vorab festgelegt:**

| M1 | Folge |
|---|---|
| B signifikant besser | Stufe 2: ein eigenes Urteil über kritische Gruppen bauen, zuerst offline gegen GNU Gos Urteil prüfen |
| sonst | Das Lebensurteil in `gebietZug` ist nicht der Hebel. Der Haken wird wieder entfernt. |

**Sekundär, ohne Anspruch:** M1 nach Zug 120 und 200, Siege, wie oft die
KI den Verteidigungs- oder Angriffspunkt einer kritischen Gruppe spielt
(`orakel` in den Rohdaten).

## 6. Grenzen

- Das Orakel ist GNU Go auf Stufe 10, der Gegner GNU Go auf Stufe 1:
  dasselbe Programm. Die Obergrenze gilt für dieses Urteil, nicht für ein
  perfektes.
- GNU Go nennt je kritischer Gruppe nur einen Angriffs- und einen
  Verteidigungspunkt. Andere Züge, die ebenso halten oder töten, zählen als
  verfehlt.
- Das Urteil gilt an der Wurzel. In der Suche werden tiefere Stellungen mit
  demselben Urteil bewertet.

---

## 7. Nachtrag: erste Messung ungültig, zwei Fehler behoben (12.10.2026)

Gelaufen auf dem Merge-Commit `d1981a0`. Daten: `daten/sicher-gnugo.json`
(Arm B). Die Kontrolle von Arm A, Teillauf 1, ergab 15 von 15 Partien
zugweise gleich. Eine Partie von Arm B brach ab, weil GNU Go abstürzte (Nr.
176).

**Ergebnis nach §5:** Endstand B − A **−48,8** (SD 130,1, 239 Paare), 95 %:
[−65,4; −32,2], p = 2·10⁻⁸. Siege: A 154, B 122. B war in 92 Paaren
besser und in 144 schlechter, 15 von 16 Teilläufen negativ. Nach Zug 120
−26,6 (p = 10⁻¹⁶).

**Das misst aber vor allem einen Fehler.** Die KI passt in Arm B 931-mal
vor dem Ende der Partie, in Arm A 39-mal. Jeder solche Pass schenkt GNU Go
einen Zug.

- **Ursache 1, Bezug:** Die Bilanzänderung wurde gegen die Wurzel
  gerechnet, mit der eigenen kritischen Gruppe darin. Nach jedem Zug außer
  dem Verteidigungspunkt fehlte die Gruppe. Damit sackte jeder Zug um den
  ganzen Wert der Gruppe ab, oft um Tausende. Die Pass-Prüfung sah nur
  noch schlechte Züge und passte.
  **Behoben:** Bezug ist jetzt die Wurzel, als hätte die KI gepasst: eigene
  kritische Gruppen weg, fremde da (`lsBasis`).
- **Ursache 2, Vakuum:** Was wegfiel, wurde vom Brett genommen. In der
  Bouzy-Karte entstand dort leerer Raum, in dem jeder eigene Stein
  scheinbar Gebiet gewann. **Behoben:** Tote und verlorene Steine zählen
  jetzt als Steine des Gegners, denn im Go gehört ihre Fläche ihm.
- Ein neuer Test (`tests/gebiet-sicher.js`, Fall 4) prüft, dass mit einer
  eigenen kritischen Gruppe kein Zug absackt. Der Code von `d1981a0`
  fällt dabei durch.

Probe mit dem behobenen Code, Seed 202, Nr. 1–8: ein vorzeitiger Pass
statt rund 30. Endstand B − A: −78, +86, +126, +158, +32, +86, +48, −32;
im Schnitt +53. Das ist eine Probe, keine Aussage.

Die Entscheidung aus §5 („sonst: Haken entfernen“) wird auf diese Messung
nicht angewandt: Sie hat die Frage aus §1 nicht beantwortet. Die Frage wird
**einmal** neu gemessen, vorab festgelegt in §8. Deren Ergebnis
entscheidet.

## 8. Wiederholung, vorab festgelegt (12.10.2026)

Wie §5, mit diesen Änderungen:
- behobener Code (§7), `gebietSicher` 2 wie bisher,
- **neuer Seed 203**, weil die Probe in §7 Partien von Seed 202 benutzt,
- **beide Arme neu gespielt**, 240 Partien je Arm in 16 Teilläufen zu 15.

```bash
for v in 1 16 31 46 61 76 91 106 121 136 151 166 181 196 211 226; do
  node gnugo-duell.js --partien 15 --von $v --seed 203 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 \
    --ki mctsFixedSims=120,resignEnabled=0 --roh sicher2-gnugo-A-$v.jsonl
  node gnugo-duell.js --partien 15 --von $v --seed 203 --stufe 1 --vorgabe 9 \
    --maxzuege 600 --schaetzung 120,200 --gnugo-aufgabe 0 --orakel 10 \
    --ki mctsFixedSims=120,resignEnabled=0,gebietSicher=2 --roh sicher2-gnugo-B-$v.jsonl
done
node auswertung/gnugo-vergleich.js --A sicher2-gnugo-A-*.jsonl --B sicher2-gnugo-B-*.jsonl --zug 120,200,ende
```

Endpunkt und Entscheidung wie in §5:

| M1 | Folge |
|---|---|
| B signifikant besser | Stufe 2: ein eigenes Urteil über kritische Gruppen bauen, zuerst offline gegen GNU Gos Urteil prüfen |
| sonst | Das Lebensurteil in `gebietZug` ist nicht der Hebel. Der Haken wird wieder entfernt. |

**Sekundär, ohne Anspruch:** wie §5, dazu vorzeitige Pässe je Arm.

---

## 9. Nachtrag: Ergebnis der Wiederholung, Stufe 2 folgt (12.10.2026)

Gelaufen auf dem Merge-Commit `2816458`, Seed 203, beide Arme neu, keine
Partie abgebrochen. Daten: `daten/sicher2-gnugo.json`.

| | A (ohne Orakel) | B (Orakel, `gebietSicher` 2) | B − A |
|---|---:|---:|---|
| **Endstand** | +21,6 | +35,2 | **+13,6** (SD 77,5), 95 %: [+3,7; +23,4], p = 0,007 |
| nach Zug 120 | +72,0 | +61,4 | −10,6, p = 3·10⁻⁵ |
| nach Zug 200 | +25,0 | +47,9 | +22,9, p = 3·10⁻⁷ (176 Paare) |

- B ist in 134 Paaren besser, in 103 schlechter. Von den 16 Teilläufen
  sind 12 positiv.
- Siege der KI: A 149 von 240, B 156 von 240.
- Vorzeitige Pässe: A 31, B 33. Der Fehler aus §7 ist behoben.
- Partielänge: Ø 239 Züge (A) gegen 256 (B).
- Arm B spielt in 28,1 % seiner Züge den Verteidigungs- oder
  Angriffspunkt einer kritischen Gruppe (5964 Verteidigungen, 2666
  Angriffe in 30 668 Zügen).

**Entscheidung nach §8: B ist signifikant besser, es folgt Stufe 2.** Ein
eigenes Urteil über kritische Gruppen wird gebaut und zuerst offline gegen
GNU Gos Urteil geprüft. Der Haken `gebietSicher` bleibt dafür in
`index.html`, mit Default 0.

**Einordnung:**
- **Die Obergrenze ist bescheiden.** +13,6 Punkte mit dem Urteil von GNU Go
  auf Stufe 10 sind wenig gegen die Muster (+102,8). Ein eigenes Urteil
  wird schlechter sein als GNU Gos. Es lohnt sich nur, wenn es einen großen
  Teil dieser 13,6 Punkte erreicht, und genau das prüft Stufe 2 zuerst
  offline.
- **Nach Zug 120 liegt B hinten, am Ende vorn.** Das Urteil kostet im
  Mittelspiel Gebiet, wohl durch Verteidigungszüge, die nichts einbringen.
  Später gewinnt es mehr zurück: Gruppen überleben, fremde sterben.
- **Die erste Messung zeigt, wie empfindlich der Term ist.** Ein Fehler im
  Bezugspunkt machte aus einem Gewinn einen Verlust von fast 50 Punkten.
  Ein eigenes Urteil muss gegen dieselben Tests laufen
  (`tests/gebiet-sicher.js`).

---

## 10. Nachtrag: Stufe 2 offline, das taktische Urteil reicht nicht (12.10.2026)

**Daten:** Stellungen aus den Partien von Arm A der Wiederholung (§9),
jeweils vor jedem vierten Zug der KI. Dazu GNU Gos Urteil auf Stufe 10
(`auswertung/lebensurteil-daten.js`). Gesammelt wurden 2099 Stellungen aus
71 Partien, danach wurde abgebrochen: Das Ergebnis war schon eindeutig.
Auswertung: `auswertung/lebensurteil-vergleich.js`, Zahlen in
`daten/lebensurteil-vergleich.json`.

**Eigenes Urteil „taktisch“:** Eine Kette mit höchstens drei Freiheiten
ist kritisch, wenn der taktische Leser sagt: Der Angreifer am Zug fängt
sie, der Verteidiger am Zug rettet sie. Angriffs- und Verteidigungspunkt
sind der erste Zug, nach dem das Gegenteil nicht mehr gelingt. Das kostet
rund 4 ms je Stellung.

**Prüfung auf der Ebene der Zugwahl:** Bestimmt wird der beste Kandidat an
der Wurzel von `getAIMove`, ohne Suche und ohne Zufall, jeweils mit
`gebietSicher` 2: ohne Urteil, mit GNU Gos Urteil und mit dem eigenen.

| | alle Ketten | Ketten ab 2 Steinen |
|---|---:|---:|
| GNU Gos Urteil ändert den Zug | 473 von 2099 (22,5 %) | 473 (22,5 %) |
| eigenes Urteil trifft dieselbe Änderung | **16 (3,4 %)** | 5 (1,1 %) |
| eigenes ändert, wo GNU Go nicht ändert | **232 (11,1 % der Stellungen)** | 107 (5,1 %) |
| Steine: Trefferquote / Genauigkeit | 25,0 % / 16,9 % | 7,4 % / 9,0 % |

Auf jede getroffene Änderung kommen über zehn Fehlalarme.

**Warum:** GNU Go hielt in diesen Stellungen 2199 Drachen für kritisch, 71 %
davon einzelne Steine.
- 514 haben keine Kette mit höchstens drei Freiheiten.
- Bei 756 hat der Drache eine solche Kette, aber der Leser fängt sie nicht.
- 43 fängt der Leser, hält sie dann aber für verloren.
- 886 (40 %) erkennt er. Das sind meist einzelne Steine, deren Rettung
  wenig Gebiet bewegt.

Bei 395 der 457 Änderungen, die das eigene Urteil verfehlt, hat es die
Gruppe gar nicht erkannt. Umgekehrt sind 2694 der 3680 Gruppen, die es
kritisch nennt, für GNU Go längst tot. Der Leser ist ein Leiter- und
Atari-Leser: Eine Kette mit drei Freiheiten gilt ihm als entkommen, Augen
kennt er nicht.

**Folgerung:** Ein taktisches Urteil trifft nicht, was GNU Gos Urteil in
der Zugwahl bewirkt. Die kritischen Gruppen, auf die es ankommt, entscheiden
sich über Augen und Augenraum. Dafür bräuchte es einen Leser für Leben und
Tod ganzer Gruppen, wie GNU Gos „owl“. Das ist ein eigenes, großes Projekt.
Sein Nutzen ist begrenzt: höchstens die +13,6 Punkte des Orakels, und ein
eigener Leser bleibt darunter. Unterhalb von rund 12 Punkten ist ein Effekt
mit 240 Paaren kaum nachweisbar ([`teststaerke.md`](teststaerke.md)).

**Stand:** Es wird kein Urteil eingebaut. Der Haken `gebietSicher` bleibt
mit Default 0 in `index.html`, damit ein späterer Leser für Leben und Tod
ihn nutzen kann. Seine Tests bleiben ebenfalls.
