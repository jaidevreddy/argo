/**
 * Fraction of a disc of angular radius rho whose area is above a horizon at elevation H,
 * treating the horizon as straight across the disc (it is, to < 0.01° over 0.5°).
 * x = (el − H) / rho;  f = (acos(−x) + x·sqrt(1 − x²)) / π
 */
export function discFraction(el: number, horizonEl: number, rho: number): number {
  const x = Math.min(1, Math.max(-1, (el - horizonEl) / rho))
  return (Math.acos(-x) + x * Math.sqrt(1 - x * x)) / Math.PI
}
