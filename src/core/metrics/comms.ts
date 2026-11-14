import type { TopoPosition } from '../types'

/**
 * Direct-to-Earth link margin in radians: Earth centre elevation above the terrain horizon
 * plus the antenna mask. Link is available when > 0.
 */
export function earthMargin(earth: TopoPosition, horizonEl: number, maskRad: number): number {
  return earth.el - horizonEl - maskRad
}
