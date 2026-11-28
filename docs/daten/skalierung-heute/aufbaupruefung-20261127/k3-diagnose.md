# Aufbauprüfung K3, Teil 3: beschreibende Diagnose

**Gültig.** Beschreibend, ohne Test und ohne Urteil über die Ursache.
Commit 98aa1ad586c9de23f64ca76c26af1d7b199b7b3a · Festlegung: docs/skalierung-aufbaupruefung-vorabfestlegung.md §3 · 1230 Partien

## 1. Pässe je Arm und Farbe

| Arm | Farbe | Partien | Entscheidungen | Pässe | je 100 Entscheidungen | Partien ohne eigenen Pass | erster eigener Pass: Partien, Median [Q1; Q3] |
|---|---|---:|---:|---:|---:|---:|---|
| A | Schwarz | 615 | 115483 | 6441 | 5,58 | 0 (0,0 %) | 615, Zug 339 [319; 361] |
| A | Weiß | 615 | 114130 | 6593 | 5,78 | 0 (0,0 %) | 615, Zug 334 [316; 356] |
| B | Schwarz | 615 | 114437 | 7495 | 6,55 | 0 (0,0 %) | 615, Zug 329 [313; 349] |
| B | Weiß | 615 | 115163 | 8006 | 6,95 | 0 (0,0 %) | 615, Zug 332 [314; 352] |

## 2. q je Arm, Farbe und Zugphase

Je Zelle: Partien mit eigenen Steinzügen in der Phase · Median der je Partie gemittelten q. q ist komi-blind und stammt aus verschieden tiefer Suche; Vergleiche nur innerhalb einer Farbe, keine Schwelle.

| Arm | Farbe | 1–100 | 101–200 | 201–300 | ab 301 |
|---|---|---|---|---|---|
| A | Schwarz | 615 · 0,047 | 615 · 0,006 | 615 · 0,126 | 611 · 0,247 |
| A | Weiß | 615 · -0,071 | 615 · -0,107 | 615 · -0,103 | 605 · 0,038 |
| B | Schwarz | 615 · 0,100 | 615 · 0,152 | 615 · 0,153 | 606 · 0,039 |
| B | Weiß | 615 · -0,019 | 615 · 0,030 | 615 · -0,074 | 607 · -0,123 |

## 3. Kipppunkt nach GNU Go (estimate_score, Komi 7,5)

Je Verlierer: erster Messpunkt, ab dem GNU Go ihn an jedem folgenden Messpunkt hinten sieht. „kein“: am letzten Messpunkt nicht hinten. „ohne“: Partie kürzer als 100 Züge. „fehlt“: mindestens eine Schätzung fehlt. GNU Gos Schätzung ist grob; der Wert beschreibt eine Schätzung, keine gesicherte Verluststellung.

### Nach dem Wert der Schätzung

| Verlierer | Verluste | ab Zug 100 | ab Zug 200 | ab Zug 300 | kein | ohne | fehlt |
|---|---:|---:|---:|---:|---:|---:|---:|
| A als Schwarz | 338 | 193 (57,1 %) | 62 (18,3 %) | 62 (18,3 %) | 21 (6,2 %) | 0 | 0 |
| A als Weiß | 239 | 64 (26,8 %) | 90 (37,7 %) | 72 (30,1 %) | 13 (5,4 %) | 0 | 0 |
| B als Schwarz | 376 | 224 (59,6 %) | 67 (17,8 %) | 60 (16,0 %) | 25 (6,6 %) | 0 | 0 |
| B als Weiß | 277 | 90 (32,5 %) | 70 (25,3 %) | 107 (38,6 %) | 10 (3,6 %) | 0 | 0 |
| **A gesamt** | 577 | 257 (44,5 %) | 152 (26,3 %) | 134 (23,2 %) | 34 (5,9 %) | 0 | 0 |
| **B gesamt** | 653 | 314 (48,1 %) | 137 (21,0 %) | 167 (25,6 %) | 35 (5,4 %) | 0 | 0 |

### Streng: auch die günstigste Schranke für den Verlierer unter 0

| Verlierer | Verluste | ab Zug 100 | ab Zug 200 | ab Zug 300 | kein | ohne | fehlt |
|---|---:|---:|---:|---:|---:|---:|---:|
| A als Schwarz | 338 | 112 (33,1 %) | 85 (25,1 %) | 109 (32,2 %) | 32 (9,5 %) | 0 | 0 |
| A als Weiß | 239 | 26 (10,9 %) | 84 (35,1 %) | 111 (46,4 %) | 18 (7,5 %) | 0 | 0 |
| B als Schwarz | 376 | 124 (33,0 %) | 101 (26,9 %) | 116 (30,9 %) | 35 (9,3 %) | 0 | 0 |
| B als Weiß | 277 | 41 (14,8 %) | 64 (23,1 %) | 151 (54,5 %) | 21 (7,6 %) | 0 | 0 |
| **A gesamt** | 577 | 138 (23,9 %) | 169 (29,3 %) | 220 (38,1 %) | 50 (8,7 %) | 0 | 0 |
| **B gesamt** | 653 | 165 (25,3 %) | 165 (25,3 %) | 267 (40,9 %) | 56 (8,6 %) | 0 | 0 |

Messpunkte 3686, davon ohne Schätzung 0, mit Schätzung aber ohne Schranken 0.

## 4. Baumwiederverwendung

Mit vorhandenen Dumps nicht messbar: Der Harness liest die Zähler der Engine (leseWurzelWaechter) am Messcommit nicht aus (§3).

## Daten

- Teilläufe 123, Partien 1230; Prüfsummen 123 von 123 gleich GitHub, 123 von 123 gleich laeufe.csv.
- Prüfungen aus Teil 1c ohne Befund.
