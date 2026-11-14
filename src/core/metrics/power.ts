import type { TopoPosition } from '../types'
import { discFraction } from '../terrain/visibility'

export type PanelType = 'tracking' | 'flat'

/**
 * Relative power, 0..1, of a panel at the site.
 * tracking: vertical Sun-tracking array (the usual polar design) → visible Sun fraction.
 * flat: horizontal panel → visible fraction × sin(Sun elevation).
 */
export function powerIndex(sun: TopoPosition, horizonEl: number, panel: PanelType): number {
  const f = discFraction(sun.el, horizonEl, sun.angularRadius)
  return panel === 'tracking' ? f : f * Math.max(0, Math.sin(sun.el))
}
