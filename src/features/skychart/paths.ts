import type { Horizon } from '../../core/terrain/horizon'
import { horizonAt } from '../../core/terrain/horizon'
import { RAD } from '../../core/units'

export interface Scale {
  x: (azDeg: number) => number
  y: (elDeg: number) => number
}

/** Closed path of the terrain silhouette (ground below the horizon line). */
export function groundPath(h: Horizon, sc: Scale, yBottom: number) {
  const pts: string[] = []
  for (let a = 0; a <= 360; a += 0.5) pts.push(`${sc.x(a).toFixed(1)},${sc.y(horizonAt(h, a / RAD) * RAD).toFixed(1)}`)
  return `M${sc.x(0).toFixed(1)},${yBottom} L${pts.join(' L')} L${sc.x(360).toFixed(1)},${yBottom} Z`
}

export function horizonLine(h: Horizon, sc: Scale) {
  const pts: string[] = []
  for (let a = 0; a <= 360; a += 0.5) pts.push(`${sc.x(a).toFixed(1)},${sc.y(horizonAt(h, a / RAD) * RAD).toFixed(1)}`)
  return `M${pts.join(' L')}`
}

/**
 * Track of a body over the window as two path strings: above and below the local horizon.
 * Segments break where azimuth wraps through north (0/360) so lines never cross the chart.
 */
export function trackPaths(az: Float32Array, el: Float32Array, h: Horizon, sc: Scale, every = 1) {
  let up = ''
  let down = ''
  let prevAz = -1
  let prevSide: boolean | null = null
  for (let i = 0; i < az.length; i += every) {
    const a = az[i] * RAD
    const e = el[i] * RAD
    const above = el[i] > horizonAt(h, az[i])
    const p = `${sc.x(a).toFixed(1)},${sc.y(e).toFixed(1)}`
    const wrap = prevAz >= 0 && Math.abs(a - prevAz) > 180
    if (above) up += (prevSide === true && !wrap ? ' L' : ' M') + p
    else down += (prevSide === false && !wrap ? ' L' : ' M') + p
    prevAz = a
    prevSide = above
  }
  return { up: up.trim(), down: down.trim() }
}

/** Elevation range that frames the horizon and both tracks with a little air. */
export function elevationRange(h: Horizon, sunEl: Float32Array | null, earthEl: Float32Array | null) {
  let lo = Infinity
  let hi = -Infinity
  for (const v of h.el) {
    lo = Math.min(lo, v)
    hi = Math.max(hi, v)
  }
  for (const arr of [sunEl, earthEl]) {
    if (!arr) continue
    for (let i = 0; i < arr.length; i += 6) hi = Math.max(hi, arr[i])
  }
  lo = lo * RAD
  hi = hi * RAD
  const pad = Math.max(1, (hi - lo) * 0.08)
  return { lo: Math.max(-90, Math.floor(lo - pad)), hi: Math.min(90, Math.ceil(hi + pad)) }
}
