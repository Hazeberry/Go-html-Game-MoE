# Gezielte Bughunt-Browserdiagnose

Zeit: 2026-11-07T22:22:10.269Z
index.html SHA-256: a14ac4d4058072ec552ca524832095f628412224b96ff7159806e35499fcb4b6
Node: v22.23.4; Browser: 153.0.8010.12

**Diagnose, keine Spielstärkemessung.** Ein grüner Abschluss gilt nur für diese Abläufe.

| ID | Status |
|---|---|
| UI-1 | reproduziert |
| TRAIN-1.pass | reproduziert |
| TRAIN-1.resign | reproduziert |
| UI-2 | reproduziert |
| UI-3 | reproduziert |
| TRAIN-2 | reproduziert |
| NET-1 | reproduziert |

## UI-1

```json
{
  "id": "UI-1",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "before": {
      "id": 1,
      "mc": 0,
      "hash": 0
    },
    "disabled": {
      "enabled": false,
      "thinking": true,
      "id": 1
    },
    "after": {
      "enabled": false,
      "thinking": false,
      "mc": 1,
      "board": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      "delivered": true,
      "workerDead": false
    },
    "hinweis": "Kontrollierter echter Worker; fehlende Zustellung nach terminate ist erlaubte Abbruchstrategie."
  }
}
```

## TRAIN-1.pass

```json
{
  "id": "TRAIN-1.pass",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "finish": "pass",
    "before": {
      "games": 0,
      "trained": false,
      "buf": 1
    },
    "ended": {
      "games": 1,
      "trained": true
    },
    "undone": {
      "games": 1,
      "trained": true,
      "buf": 0
    },
    "changedByTraining": true,
    "unchangedByUndo": true,
    "persistedUnchangedByUndo": true
  }
}
```

## TRAIN-1.resign

```json
{
  "id": "TRAIN-1.resign",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "finish": "resign",
    "before": {
      "games": 0,
      "trained": false,
      "buf": 1
    },
    "ended": {
      "games": 1,
      "trained": true
    },
    "undone": {
      "games": 1,
      "trained": true,
      "buf": 0
    },
    "changedByTraining": true,
    "unchangedByUndo": true,
    "persistedUnchangedByUndo": true
  }
}
```

## UI-2

```json
{
  "id": "UI-2",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "before": "Schwarz +353.5",
    "displayed": "Schwarz +353.5",
    "expected": "Weiß +5.5",
    "sgf": "W+5.5",
    "area": {
      "1": 361,
      "2": 0
    },
    "territory": {
      "1": 2,
      "2": 0
    }
  }
}
```

## UI-3

```json
{
  "id": "UI-3",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "marked": {
      "count": 8,
      "changed": true
    },
    "previewNull": true,
    "panelHidden": true,
    "screenshotHash": "243c1d101d51fa6bcbd0cd432c3dd73043139d3cbcdef4374b36287a0ebc8e71",
    "cleanHash": "d54e9a280712385736b1b6dc292e4d08fc8535ee81a7482dff7eb551b6dfd8e3",
    "cachedHash": "243c1d101d51fa6bcbd0cd432c3dd73043139d3cbcdef4374b36287a0ebc8e71"
  }
}
```

## TRAIN-2

```json
{
  "id": "TRAIN-2",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "afterSwitch": 1,
    "rewards": [
      {
        "color": 2,
        "advantage": 1
      },
      {
        "color": 1,
        "advantage": 1
      }
    ],
    "hinweis": "Synthetischer Endzustand; echter trainGame/backward, Wrapper zeichnet nur Eingangsreward auf."
  }
}
```

## NET-1

```json
{
  "id": "NET-1",
  "status": "reproduziert",
  "evidence": {
    "pruefbar": true,
    "defekt": true,
    "before": {
      "games": 17,
      "trained": true,
      "healthy": false
    },
    "after": {
      "games": 17,
      "trained": true,
      "healthy": false
    },
    "sameWeights": true,
    "err": {
      "name": "SecurityError",
      "message": "Test: Storage verweigert"
    },
    "hinweis": "Storage-Verweigerung nach Seitenstart injiziert; kein fremdes Browserprofil."
  }
}
```

Testdaten und instrumentierte Antworten sind im Aufbau beschrieben. Browserzustände stammen aus frischen
Kontexten; es wird kein persönliches Profil und kein vorhandener Nutzerspeicher geöffnet.
