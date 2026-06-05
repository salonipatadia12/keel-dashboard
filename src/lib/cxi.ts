// CXI = Customer Experience Index = 100 − Friction Score.
//
// Centralized so every consumer (KPI tile, Rankings page, Parent
// landing, Parent overview, Pitch sentence) reads the same value and
// applies the same NaN guard. A missing/garbage friction value would
// otherwise propagate as NaN → NaN% widths and broken displays.
export function cxi(frictionScore: number): number {
  if (!Number.isFinite(frictionScore)) return 0;
  return Math.max(0, Math.min(100, 100 - frictionScore));
}
