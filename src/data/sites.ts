import { sphereHorizon, terrainHorizon, type Horizon } from '../core/terrain/horizon'
import { loadNudge } from './nudge'

export interface SiteRecord {
  id: string
  name: string
  mission: string
  agency: string
  status: 'landed' | 'candidate' | 'reference'
  region: 'south-pole' | 'south-high-latitude' | 'nearside' | 'farside'
  lat: number
  lon: number
  date: string // ISO UTC, landing time or a default planning date
  source: string
  terrain: boolean
  /** Short DEM label for the 3D caption, e.g. "LOLA 40 m", "SLDEM2015 59 m". */
  terrainRes?: string
  /** Baked nudge points: [eKm, nKm, lat, lon, elevationM] at 1 km (0–7) and 2 km (8–15), N then clockwise. */
  nudgePoints?: [number, number, number, number, number][]
  elevationM: number | null
}

const base = `${import.meta.env.BASE_URL}data`

export async function loadSites(): Promise<SiteRecord[]> {
  const res = await fetch(`${base}/sites.json`)
  if (!res.ok) throw new Error(`Could not load sites (${res.status})`)
  return res.json()
}

/** Terrain horizon for sites with baked LOLA data, otherwise the ideal sphere. */
export async function loadHorizon(site: Pick<SiteRecord, 'id' | 'terrain'>, mastM?: number, at: number | null = null): Promise<Horizon> {
  if (!site.terrain) return sphereHorizon(mastM)
  if (at !== null) return (await loadNudge(site.id))[at].horizon
  const res = await fetch(`${base}/horizon/${site.id}.json`)
  if (!res.ok) throw new Error(`Could not load horizon for ${site.id} (${res.status})`)
  const h = (await res.json()) as { elDeg: number[]; azStepDeg: number; label?: string }
  return terrainHorizon(h.elDeg, h.azStepDeg, h.label)
}
