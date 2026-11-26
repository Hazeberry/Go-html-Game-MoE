# Aufbauprüfung zu K3 nach §5.3

Festlegung nach Kenntnis des K3-Ergebnisses, vor einer neuen Partie und vor der Auswertung der Zugverläufe. Gegenstand ist der Messaufbau des Commits 98aa1ad586c9de23f64ca76c26af1d7b199b7b3a. Der beobachtete K3-Effekt bleibt bis zum Abschluss offen.

## 1. Übergabe und Zuordnung

In Actions am Messcommit den Weg beider Parameter vom Workflow über die Armwahl bis zum Worker sowie die Rückübersetzung der Siegerfarbe prüfen. Für jede Farbe und jeden Arm Sollwert und tatsächlich übernommenen Wert protokollieren. Die K3-Steinzüge nach Arm auf ihre gemeldeten Simulationen prüfen, Pässe getrennt zählen. Abweichungen anhand der Zählerdefinition klären. Bei falscher Zuordnung, abweichendem Engine-Stand oder ungeklärter Parameterübergabe stoppen, betroffene Partien benennen und vor einem Wiederholungslauf neu festlegen.

## 2. A/A-Kontrolle

Nur nach bestandener Übergabeprüfung. K3-Konfiguration unverändert übernehmen, allein A von 2600 auf 5200 setzen. Seeds 11260001 bis 11260123, zehn Partien je Seed in derselben Reihenfolge und Farbzuordnung, insgesamt 1230. Keine Zwischenentscheidung, keine Ersetzung nach Ergebnis. Fehlgeschlagene Jobs mit identischer Konfiguration wiederholen und beide Run-IDs dokumentieren. Je Seed genau einen vollständigen Datensatz auswerten.

Primärgröße ist der Anteil der Siege von B, erwartet werden 50 %. Wie bei K3 zweiseitiger exakter Binomialtest gegen 0,5 mit α = 0,05 und 95-%-Intervall wie im Hauptbericht. Zusätzlich die 123 Siegzahlen je Seed und nach Farbe berichten. Eine Auffälligkeit löst die Prüfung von Armreihenfolge, Zufallsstrom und Ergebniszuordnung aus. Auch ein korrektes System kann die Schwelle zufällig überschreiten. Ein unauffälliger Befund allein schließt einen Fehler bei ungleichen Budgets nicht aus.

## 3. Beschreibende Diagnose der bestehenden K3-Dumps in Actions

Alle 1230 Partien einschließen. Passzahl je 100 Entscheidungen, erster Pass und Anteil der Partien ohne eigenen Pass getrennt nach Arm und Farbe berichten. Für den ersten Pass nur Partien mit eigenem Pass verwenden und den Nenner angeben.

Zugphasen vorab auf 1–100, 101–200, 201–300 und ab 301 festlegen. Je Arm und Phase Anzahl beobachteter Partien sowie Median der je Partie gemittelten q-Werte eigener Steinzüge angeben. Zuvor Perspektive und Skala von q im Harness prüfen. Als beschreibenden Kipppunkt den ersten Phasenanfang ausweisen, ab dem der spätere Verlierer in jeder verbleibenden beobachteten Phase auf seinen Steinzügen im Mittel unter der neutralen q-Schwelle liegt. Partien ohne bestimmbaren Kipppunkt gesondert zählen. Der Wert beschreibt die Suchbewertung, keine gesicherte Verluststellung.

Baumwiederverwendung nur aus einem im Harness belegten direkten Zähler für übernommene Besuche oder erfolgreiche Wiederverwendung auswerten. Zählerdefinition, Nenner und Abdeckung angeben. Fehlt er, lautet der Befund „mit vorhandenen Dumps nicht messbar“. Eine instrumentierte Neumessung braucht eine eigene Festlegung.

## 4. Abschluss

Konfigurationen, Kommando, Auswertungscode, Job-IDs, Daten je Partie und Prüfsummen veröffentlichen. K3 nur bei belegtem Fehler im Aufbau als fehlerhaft kennzeichnen. Bei unauffälliger Kontrolle den Umfang der geprüften Fehlerquellen nennen. Die Phasenanalyse dient der Hypothesenbildung. Änderungen an der Spiel-Engine sind kein Bestandteil dieser Prüfung.
