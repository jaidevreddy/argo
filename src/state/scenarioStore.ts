import { useMemo } from 'react'
import { create } from 'zustand'
import { DEFAULT_MAST_HEIGHT_M } from '../core/constants'
import type { PanelType } from '../core/metrics/power'
import type { SiteRecord } from '../data/sites'
import { nudgeLabel } from '../data/nudge'
import { encodeItem, encodeTarget, type CompareItem } from './codec'

export type View = 'globe' | 'sky' | 'site' | 'compare'

/** A listed site, optionally moved to one of its baked nudge points (`at` 0–15), or a free lat/lon. */
export type Target = { kind: 'site'; id: string; at?: number } | { kind: 'custom'; lat: number; lon: number }

/** What every view needs to know about the chosen place. */
export interface ResolvedTarget {
  key: string // stable id for caching: "site", "site.3" or "lat,lon"
  name: string
  lat: number
  lon: number
  /** Terrain height of the actual point (the nudged point when moved), metres; null when unknown. */
  elevationM: number | null
  site: SiteRecord | null
  /** Nudge index and offset from the listed site, when moved. */
  at: number | null
  offset: { eKm: number; nKm: number } | null
}

export const DEFAULT_SITE_ID = 'shackleton-ridge'
const DAY = 864e5

interface ScenarioState {
  sites: SiteRecord[]
  sitesStatus: 'loading' | 'ready' | 'error'
  target: Target
  utcMs: number
  mastM: number
  panel: PanelType
  maskDeg: number
  view: View
  /** Up to three landings side by side (Compare view). */
  compare: CompareItem[]
  setSites: (sites: SiteRecord[]) => void
  setSitesError: () => void
  selectSite: (id: string, opts?: { keepTime?: boolean }) => void
  setCustom: (lat: number, lon: number) => void
  setTime: (utcMs: number) => void
  shiftDays: (days: number) => void
  patch: (p: Partial<Pick<ScenarioState, 'target' | 'utcMs' | 'mastM' | 'panel' | 'maskDeg' | 'view' | 'compare'>>) => void
  /** Move to a nudge point of the current listed site (null = back to the listed point). Keeps the time. */
  nudgeTo: (at: number | null) => void
  addCompare: (item?: CompareItem) => void
  removeCompare: (i: number) => void
  openCompare: (i: number) => void
}

export const MAX_COMPARE = 3

export const useScenario = create<ScenarioState>()((set, get) => ({
  sites: [],
  sitesStatus: 'loading',
  target: { kind: 'site', id: DEFAULT_SITE_ID },
  utcMs: Date.parse('2026-11-15T00:00:00Z'),
  mastM: DEFAULT_MAST_HEIGHT_M,
  panel: 'tracking',
  maskDeg: 0,
  view: 'globe',
  compare: [],
  setSites: (sites) => set({ sites, sitesStatus: 'ready' }),
  setSitesError: () => set({ sitesStatus: 'error' }),
  selectSite: (id, opts) => {
    const site = get().sites.find((s) => s.id === id)
    set({ target: { kind: 'site', id }, ...(site && !opts?.keepTime ? { utcMs: Date.parse(site.date) } : {}) })
  },
  setCustom: (lat, lon) => set({ target: { kind: 'custom', lat, lon } }),
  setTime: (utcMs) => set({ utcMs }),
  shiftDays: (days) => set((s) => ({ utcMs: s.utcMs + days * DAY })),
  patch: (p) => set(p),
  nudgeTo: (at) => {
    const t = get().target
    if (t.kind !== 'site') return
    set({ target: at === null ? { kind: 'site', id: t.id } : { kind: 'site', id: t.id, at } })
  },
  addCompare: (item) => {
    const s = get()
    const it = item ?? { target: s.target, utcMs: s.utcMs }
    if (s.compare.some((c) => encodeItem(c) === encodeItem(it))) return
    set({ compare: [...s.compare, it].slice(-MAX_COMPARE) })
  },
  removeCompare: (i) => set((s) => ({ compare: s.compare.filter((_, k) => k !== i) })),
  openCompare: (i) => {
    const c = get().compare[i]
    if (c) set({ target: c.target, utcMs: c.utcMs })
  },
}))

export function resolveTarget(target: Target, sites: SiteRecord[]): ResolvedTarget | null {
  if (target.kind === 'custom') {
    return { key: encodeTarget(target), name: 'Custom point', lat: target.lat, lon: target.lon, elevationM: null, site: null, at: null, offset: null }
  }
  const site = sites.find((s) => s.id === target.id)
  if (!site) return null
  const p = target.at != null ? site.nudgePoints?.[target.at] : undefined
  if (p) {
    const [eKm, nKm, lat, lon, elevationM] = p
    return { key: encodeTarget(target), name: `${site.name}, ${nudgeLabel(target.at!)}`, lat, lon, elevationM, site, at: target.at!, offset: { eKm, nKm } }
  }
  return { key: site.id, name: site.name, lat: site.lat, lon: site.lon, elevationM: site.elevationM, site, at: null, offset: null }
}

/** Selected place. Selects stable store slices, then derives, so the hook never returns a fresh object per read. */
export function useTarget() {
  const target = useScenario((s) => s.target)
  const sites = useScenario((s) => s.sites)
  return useMemo(() => resolveTarget(target, sites), [target, sites])
}

export const fmtLat = (lat: number) => `${Math.abs(lat).toFixed(3)}°${lat < 0 ? 'S' : 'N'}`
export const fmtLon = (lon: number) => `${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'W' : 'E'}`
