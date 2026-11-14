import { useMemo } from 'react'
import { Vector3 } from 'three'
import { skyAt } from '../../core/astro'
import { horizonAt, type Horizon } from '../../core/terrain/horizon'
import { discFraction } from '../../core/terrain/visibility'
import type { TerrainTile } from '../../data/terrain'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { dirFromAzEl, earthBasis, earthLitFraction } from './local'

/** Sun and Earth in the site frame at the cursor time, plus how much of the Sun the far terrain lets through. */
export function useSiteSky(tile: TerrainTile | null) {
  const target = useTarget()
  const utcMs = useScenario((s) => s.utcMs)
  const mastM = useScenario((s) => s.mastM)
  return useMemo(() => {
    if (!target) return null
    const site = { latDeg: target.lat, lonDeg: target.lon, elevationM: target.site?.elevationM ?? 0, mastM }
    const sky = skyAt(site, utcMs)
    const sunDir = dirFromAzEl(sky.sun.az, sky.sun.el)
    const earthDir = dirFromAzEl(sky.earth.az, sky.earth.el)
    const far: Horizon | null = tile ? { kind: 'terrain', label: '', azStep: tile.far.azStep, el: tile.far.el } : null
    const farEl = far ? horizonAt(far, sky.sun.az) : -Math.PI / 2
    return {
      sky,
      sunDir,
      earthDir,
      earthBasis: earthBasis(site, utcMs),
      earthLit: earthLitFraction(sunDir, earthDir),
      /** 0..1: Sun disc above the 10–200 km horizon. The tile's own geometry shadows everything nearer. */
      sunThroughFar: discFraction(sky.sun.el, farEl, sky.sun.angularRadius),
      farElAtSun: farEl,
    }
  }, [target, utcMs, mastM, tile])
}

export type SiteSky = NonNullable<ReturnType<typeof useSiteSky>>
export const UP = new Vector3(0, 1, 0)
