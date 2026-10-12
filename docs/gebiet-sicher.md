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
