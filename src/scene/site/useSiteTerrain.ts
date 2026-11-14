import { useEffect, useMemo, useState } from 'react'
import { loadNudge, type NudgePoint } from '../../data/nudge'
import { heightAt, loadTerrain, type TerrainTile } from '../../data/terrain'
import { useScenario, useTarget } from '../../state/scenarioStore'
import type { FarProfile } from './useSiteSky'

type Load = { key: string; tile: TerrainTile; nudge: NudgePoint[] | null } | { key: string; error: string }

/**
 * The tile of the listed site, plus where on it the lander stands (the site itself or a nudge point),
 * that point's ground height and its beyond-the-tile horizon.
 */
export function useSiteTerrain() {
  const target = useTarget()
  const mastM = useScenario((s) => s.mastM)
  const id = target?.site?.terrain ? target.site.id : null
  const at = target?.at ?? null
  const key = `${id}|${at !== null}`
  const [load, setLoad] = useState<Load | null>(null)

  useEffect(() => {
    if (!id) return
    let alive = true
    Promise.all([loadTerrain(id), at !== null ? loadNudge(id) : Promise.resolve(null)]).then(
      ([tile, nudge]) => alive && setLoad({ key, tile, nudge }),
      (e: Error) => alive && setLoad({ key, error: e.message }),
    )
    return () => {
      alive = false
    }
  }, [id, at, key])

  const ready = load && load.key === key && 'tile' in load ? load : null
  const tile = ready?.tile ?? null
  const point = at !== null ? (ready?.nudge?.[at] ?? null) : null
  const e = target?.offset?.eKm ?? 0
  const n = target?.offset?.nKm ?? 0
  return useMemo(() => {
    const groundY = tile ? heightAt(tile, e, n) : 0
    const far: FarProfile | null = point ? point.far : (tile?.far ?? null)
    return {
      id,
      tile: tile && (at === null || point) ? tile : null,
      error: load && 'error' in load ? load.error : null,
      far,
      /** Scene position of the lander's foot: x east, y up, z south (km). */
      center: { x: e, y: groundY, z: -n },
      eyeY: groundY + mastM / 1000,
    }
  }, [id, tile, point, at, load, e, n, mastM])
}
