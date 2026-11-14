import { terrainHorizon, type Horizon } from '../core/terrain/horizon'
import { DEG } from '../core/units'

export interface NudgePoint {
  eKm: number
  nKm: number
  lat: number
  lon: number
  elevationM: number
  horizon: Horizon
  /** Horizon beyond the 3D tile edge as seen from this point (azimuths in the point's own frame). */
  far: { azStep: number; el: Float32Array }
}

interface Raw {
  azStepDeg: number
  points: { eKm: number; nKm: number; lat: number; lon: number; elevationM: number; elDeg: number[]; farElDeg: number[] }[]
}

const base = `${import.meta.env.BASE_URL}data`
const cache = new Map<string, Promise<NudgePoint[]>>()

/** Baked candidates at 1 and 2 km in the 8 compass directions (tools/bake.py nudge_points). */
export function loadNudge(id: string): Promise<NudgePoint[]> {
  let p = cache.get(id)
  if (!p) {
    p = fetch(`${base}/nudge/${id}.json`)
      .then((r) => {
        if (!r.ok) throw new Error(`Could not load nudge points for ${id} (${r.status})`)
        return r.json() as Promise<Raw>
      })
      .then((raw) =>
        raw.points.map((q) => ({
          eKm: q.eKm, nKm: q.nKm, lat: q.lat, lon: q.lon, elevationM: q.elevationM,
          horizon: terrainHorizon(q.elDeg, raw.azStepDeg, 'Terrain horizon at the nudged point'),
          far: { azStep: raw.azStepDeg * DEG, el: Float32Array.from(q.farElDeg, (d) => d * DEG) },
        })),
      )
    p.catch(() => cache.delete(id))
    cache.set(id, p)
  }
  return p
}

const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']
/** "1 km NE" for nudge index 0..15 (ring 1 km: 0–7, ring 2 km: 8–15). */
export const nudgeLabel = (at: number) => `${at < 8 ? 1 : 2} km ${DIRS[at % 8]}`
