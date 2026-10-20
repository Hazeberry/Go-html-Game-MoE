# Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
# SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
"""Training des Endspiel-Lerners (docs/endspiel-lerner.md).

Ein kleines Faltungsnetz sagt GNU Gos Zug (Stufe 10) aus den Eingabeebenen von
lerner-merkmale.js voraus: eine 5x5-Faltung, dann (Schichten - 1) 3x3-Faltungen
mit Restverbindung, ReLU, zum Schluss eine 1x1-Faltung auf einen Wert je Punkt.
Nicht legale Punkte (Ebene 14) bekommen -1e9. Stellungen, in denen GNU Go
passt, gehen nicht ins Training.

Gelernt wird mit Adam und Kreuzentropie, je Stapel in einer zufälligen der acht
Drehungen und Spiegelungen. Am Ende stehen die Gewichte als JSON für die
Vorwärtsrechnung in JavaScript (lerner-netz.js).

Aufruf:
  python3 auswertung/lerner-training.py --train P1 [P2 ...] --dev D --aus netz.json
         [--kanaele 48] [--schichten 6] [--epochen 8] [--stapel 256] [--lr 1e-3]
         [--threads 2] [--seed 1]
P ist ein Präfix von lerner-daten.js (P.x, P.json).
"""
import argparse
import json
import math
import time

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

N, G, PASS, LEGAL = 361, 19, 361, 14


def lade(praefix):
    kopf = json.load(open(praefix + '.json'))
    e = kopf['ebenen']
    st = np.array(kopf['stellungen'], dtype=np.int64)
    x = np.fromfile(praefix + '.x', dtype=np.uint8).reshape(len(st), e, G, G)
    return x, st


class Netz(nn.Module):
    def __init__(self, ebenen, kanaele, schichten):
        super().__init__()
        self.ein = nn.Conv2d(ebenen, kanaele, 5, padding=2)
        self.mitte = nn.ModuleList([nn.Conv2d(kanaele, kanaele, 3, padding=1) for _ in range(schichten - 1)])
        self.aus = nn.Conv2d(kanaele, 1, 1)

    def forward(self, x):
        h = F.relu(self.ein(x))
        for c in self.mitte:
            h = F.relu(c(h) + h)
        logits = self.aus(h).flatten(1)
        legal = x[:, LEGAL].flatten(1)
        return logits + (legal - 1) * 1e9


def symmetrie(x, y, s):
    """Drehung/Spiegelung s (0..7) auf Ebenen x (B,E,19,19) und Zielpunkte y (B,)"""
    yy, yx = y // G, y % G
    if s & 4:
        x = x.transpose(2, 3)
        yy, yx = yx, yy
    if s & 1:
        x = x.flip(3)
        yx = G - 1 - yx
    if s & 2:
        x = x.flip(2)
        yy = G - 1 - yy
    return x, yy * G + yx


def bewerte(netz, x, st, stapel=1024):
    netz.eval()
    treffer = {1: 0, 3: 0, 16: 0}
    ki = 0
    n_ohne_pass = 0
    with torch.no_grad():
        for a in range(0, len(st), stapel):
            xb = torch.from_numpy(x[a:a + stapel].astype(np.float32))
            y = torch.from_numpy(st[a:a + stapel, 4])
            z = st[a:a + stapel, 5]
            logits = netz(xb)
            top = logits.topk(16, dim=1).indices
            ok = y < PASS
            n_ohne_pass += int(ok.sum())
            for k in treffer:
                treffer[k] += int(((top[:, :k] == y[:, None]).any(1) & ok).sum())
            ki += int((z == st[a:a + stapel, 4]).sum())
    n = len(st)
    return {'n': n, 'ohne_pass': n_ohne_pass, 'top1': treffer[1] / n, 'top3': treffer[3] / n, 'top16': treffer[16] / n,
            'ki_gleich': ki / n}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--train', nargs='+', required=True)
    ap.add_argument('--dev', required=True)
    ap.add_argument('--aus', required=True)
    ap.add_argument('--kanaele', type=int, default=48)
    ap.add_argument('--schichten', type=int, default=6)
    ap.add_argument('--epochen', type=int, default=8)
    ap.add_argument('--stapel', type=int, default=256)
    ap.add_argument('--lr', type=float, default=1e-3)
    ap.add_argument('--threads', type=int, default=2)
    ap.add_argument('--seed', type=int, default=1)
    o = ap.parse_args()
    torch.set_num_threads(o.threads)
    torch.manual_seed(o.seed)
    rng = np.random.default_rng(o.seed)

    teile = [lade(p) for p in o.train]
    x = np.concatenate([t[0] for t in teile])
    st = np.concatenate([t[1] for t in teile])
    nutz = np.nonzero(st[:, 4] < PASS)[0]
    xd, std = lade(o.dev)
    ebenen = x.shape[1]
    print(f'Training {len(st)} Stellungen ({len(nutz)} ohne Pass), Entwicklung {len(std)}', flush=True)

    netz = Netz(ebenen, o.kanaele, o.schichten)
    opt = torch.optim.Adam(netz.parameters(), lr=o.lr, weight_decay=1e-5)
    schritte = o.epochen * math.ceil(len(nutz) / o.stapel)
    plan = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=o.lr, total_steps=schritte, pct_start=0.1)
    t0 = time.time()
    for ep in range(o.epochen):
        netz.train()
        reihe = rng.permutation(nutz)
        summe, zahl = 0.0, 0
        for a in range(0, len(reihe), o.stapel):
            j = np.sort(reihe[a:a + o.stapel])
            xb = torch.from_numpy(x[j].astype(np.float32))
            yb = torch.from_numpy(st[j, 4])
            xb, yb = symmetrie(xb, yb, int(rng.integers(8)))
            verlust = F.cross_entropy(netz(xb), yb)
            opt.zero_grad()
            verlust.backward()
            opt.step()
            plan.step()
            summe += float(verlust) * len(j)
            zahl += len(j)
        d = bewerte(netz, xd, std)
        print(f'Epoche {ep + 1}: Verlust {summe / zahl:.3f} · Entwicklung top1 {d["top1"]:.3f} top3 {d["top3"]:.3f} '
              f'top16 {d["top16"]:.3f} (KI = GNU Go {d["ki_gleich"]:.3f}) · {time.time() - t0:.0f} s', flush=True)

    gewichte = {'ebenen': ebenen, 'kanaele': o.kanaele, 'schichten': o.schichten,
                'ein': {'w': netz.ein.weight.detach().numpy().round(6).tolist(), 'b': netz.ein.bias.detach().numpy().round(6).tolist()},
                'mitte': [{'w': c.weight.detach().numpy().round(6).tolist(), 'b': c.bias.detach().numpy().round(6).tolist()} for c in netz.mitte],
                'aus': {'w': netz.aus.weight.detach().numpy().round(6).tolist(), 'b': netz.aus.bias.detach().numpy().round(6).tolist()},
                'entwicklung': bewerte(netz, xd, std)}
    json.dump(gewichte, open(o.aus, 'w'))
    print('Gewichte →', o.aus)


if __name__ == '__main__':
    main()
