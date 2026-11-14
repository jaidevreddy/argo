import { sphereHorizon, terrainHorizon, type Horizon } from '../core/terrain/horizon'

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
  elevationM: number | null
}

const base = `${import.meta.env.BASE_URL}data`

export async function loadSites(): Promise<SiteRecord[]> {
  const res = await fetch(`${base}/sites.json`)
  if (!res.ok) throw new Error(`Could not load sites (${res.status})`)
  return res.json()
}

/** Terrain horizon for sites with baked LOLA data, otherwise the ideal sphere. */
export async function loadHorizon(site: Pick<SiteRecord, 'id' | 'terrain'>, mastM?: number): Promise<Horizon> {
  if (!site.terrain) return sphereHorizon(mastM)
  const res = await fetch(`${base}/horizon/${site.id}.json`)
  if (!res.ok) throw new Error(`Could not load horizon for ${site.id} (${res.status})`)
  const h = (await res.json()) as { elDeg: number[]; azStepDeg: number }
  return terrainHorizon(h.elDeg, h.azStepDeg)
}
