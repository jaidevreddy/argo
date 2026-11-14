import { useMemo } from 'react'
import { Vector3 } from 'three'
import { skyAt } from '../../core/astro'
import { horizonAt, type Horizon } from '../../core/terrain/horizon'
import { discFraction } from '../../core/terrain/visibility'
import type { TerrainTile } from '../../data/terrain'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { earthBasis, earthLitFraction, sceneDirs } from './local'

export type FarProfile = { azStep: number; el: Float32Array }

/**
 * Sun and Earth in the scene frame at the cursor time, plus how much of the Sun the far terrain lets through.
 * `far` is the beyond-the-tile horizon of the point the lander stands on (the site's own, or a nudge point's).
 */
export function useSiteSky(tile: TerrainTile | null, far: FarProfile | null = tile?.far ?? null) {
  const target = useTarget()
  const utcMs = useScenario((s) => s.utcMs)
  const mastM = useScenario((s) => s.mastM)
  return useMemo(() => {
    if (!target) return null
    const point = { latDeg: target.lat, lonDeg: target.lon, elevationM: target.elevationM ?? 0, mastM }
    const s = target.site
    const base = s ? { latDeg: s.lat, lonDeg: s.lon, elevationM: s.elevationM ?? 0, mastM } : point
    const sky = skyAt(point, utcMs) // az/el in the point's own frame: labels and far-horizon lookup
    const { sunDir, earthDir, northRot } = sceneDirs(base, point, utcMs)
    const farH: Horizon | null = far ? { kind: 'terrain', label: '', azStep: far.azStep, el: far.el } : null
    const farEl = farH ? horizonAt(farH, sky.sun.az) : -Math.PI / 2
    return {
      sky,
      sunDir,
      earthDir,
      northRot,
      earthBasis: earthBasis(base, utcMs),
      earthLit: earthLitFraction(sunDir, earthDir),
      /** 0..1: Sun disc above the beyond-the-tile horizon. The tile's own geometry shadows everything nearer. */
      sunThroughFar: discFraction(sky.sun.el, farEl, sky.sun.angularRadius),
      farElAtSun: farEl,
    }
  }, [target, utcMs, mastM, far])
}

export type SiteSky = NonNullable<ReturnType<typeof useSiteSky>>
export const UP = new Vector3(0, 1, 0)
