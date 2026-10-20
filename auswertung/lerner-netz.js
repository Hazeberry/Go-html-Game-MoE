// Required Notice: Copyright (c) 2026 Hazeberry (https://github.com/Hazeberry/Go-html-Game-MoE)
// SPDX-License-Identifier: PolyForm-Noncommercial-1.0.0
/* Vorwärtsrechnung des Endspiel-Lerners in JavaScript (docs/endspiel-lerner.md),
   für die Gewichte aus lerner-training.py: 5×5-Faltung, (Schichten − 1)
   3×3-Faltungen mit Restverbindung, ReLU, 1×1-Faltung auf einen Wert je Punkt;
   nicht legale Punkte (Ebene 14) bekommen −1e9. Dieselbe Rechnung wie in
   PyTorch, in Float64. */
'use strict';
const N = 361, G = 19, LEGAL = 14;

/* Gewichte aus dem JSON in flache Float64Arrays */
function netzAus(json) {
  const flach = w => Float64Array.from(w.flat(Infinity));
  return {ebenen: json.ebenen, kanaele: json.kanaele,
          ein: {w: flach(json.ein.w), b: Float64Array.from(json.ein.b), k: 5},
          mitte: json.mitte.map(s => ({w: flach(s.w), b: Float64Array.from(s.b), k: 3})),
          aus: {w: flach(json.aus.w), b: Float64Array.from(json.aus.b)}};
}

/* Faltung mit Null-Auffüllung: ein (cin × 361) → aus (cout × 361), Gewichte cout × cin × k × k */
function falte(ein, cin, s, cout) {
  const k = s.k, r = k >> 1, aus = new Float64Array(cout * N);
  for (let o = 0; o < cout; o++) {
    const ao = o * N;
    aus.fill(s.b[o], ao, ao + N);
    for (let c = 0; c < cin; c++) {
      const ec = c * N, wb = (o * cin + c) * k * k;
      for (let dy = 0; dy < k; dy++) for (let dx = 0; dx < k; dx++) {
        const w = s.w[wb + dy * k + dx];
        if (w === 0) continue;
        const oy = dy - r, ox = dx - r;
        const y0 = Math.max(0, -oy), y1 = Math.min(G, G - oy), x0 = Math.max(0, -ox), x1 = Math.min(G, G - ox);
        for (let y = y0; y < y1; y++) {
          const zeile = ao + y * G, quelle = ec + (y + oy) * G + ox;
          for (let x = x0; x < x1; x++) aus[zeile + x] += w * ein[quelle + x];
        }
      }
    }
  }
  return aus;
}

/* Werte je Punkt (361) für die Ebenen x (Uint8 oder Float, ebenen × 361) */
function vorwaerts(netz, x) {
  const C = netz.kanaele;
  let h = falte(x, netz.ebenen, netz.ein, C);
  for (let i = 0; i < h.length; i++) if (h[i] < 0) h[i] = 0;
  for (const s of netz.mitte) {
    const n = falte(h, C, s, C);
    for (let i = 0; i < n.length; i++) { const v = n[i] + h[i]; n[i] = v > 0 ? v : 0; }
    h = n;
  }
  const aus = new Float64Array(N).fill(netz.aus.b[0]);
  for (let c = 0; c < C; c++) { const w = netz.aus.w[c]; for (let i = 0; i < N; i++) aus[i] += w * h[c * N + i]; }
  for (let i = 0; i < N; i++) if (!x[LEGAL * N + i]) aus[i] = -1e9;
  return aus;
}

/* Wahrscheinlichkeiten über die legalen Punkte */
function softmax(werte) {
  let m = -Infinity;
  for (const v of werte) if (v > m) m = v;
  const p = new Float64Array(werte.length);
  let z = 0;
  for (let i = 0; i < werte.length; i++) { p[i] = werte[i] <= -1e8 ? 0 : Math.exp(werte[i] - m); z += p[i]; }
  for (let i = 0; i < p.length; i++) p[i] /= z;
  return p;
}

module.exports = {netzAus, falte, vorwaerts, softmax};
