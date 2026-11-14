import { DEFAULT_MAST_HEIGHT_M, MOON_RADIUS_KM } from '../constants'
import { DEG } from '../units'

/** Local horizon elevation (radians) as a function of azimuth, clockwise from north. */
export interface Horizon {
  kind: 'terrain' | 'sphere'
  /** Short label for the UI, e.g. "Terrain horizon (LOLA)". */
  label: string
  azStep: number // radians
  el: Float32Array // radians, one value per azStep starting at az 0
}

/** Baked LOLA profile (public/data/horizon/<id>.json) → Horizon. */
export function terrainHorizon(elDeg: readonly number[], azStepDeg: number, label = 'Terrain horizon (LOLA)'): Horizon {
  return {
    kind: 'terrain',
    label,
    azStep: azStepDeg * DEG,
    el: Float32Array.from(elDeg, (d) => d * DEG),
  }
}

/** Airless smooth sphere seen from height h: dip = −acos(R / (R + h)). */
export function sphereHorizon(mastM = DEFAULT_MAST_HEIGHT_M): Horizon {
  const r = MOON_RADIUS_KM * 1000
  return {
    kind: 'sphere',
    label: 'Ideal sphere horizon',
    azStep: 2 * Math.PI,
    el: Float32Array.of(-Math.acos(r / (r + mastM))),
  }
}

/** Horizon elevation at an azimuth, linear interpolation with wrap-around. */
export function horizonAt(h: Horizon, az: number): number {
  const n = h.el.length
  if (n === 1) return h.el[0]
  const x = (((az / h.azStep) % n) + n) % n
  const i = Math.floor(x)
  const f = x - i
  return h.el[i] * (1 - f) + h.el[(i + 1) % n] * f
}
