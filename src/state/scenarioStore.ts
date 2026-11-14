import { useMemo } from 'react'
import { create } from 'zustand'
import { DEFAULT_MAST_HEIGHT_M } from '../core/constants'
import type { PanelType } from '../core/metrics/power'
import type { SiteRecord } from '../data/sites'

export type View = 'globe' | 'sky'

export type Target = { kind: 'site'; id: string } | { kind: 'custom'; lat: number; lon: number }

/** What every view needs to know about the chosen place. */
export interface ResolvedTarget {
  key: string // stable id for caching: site id or "lat,lon"
  name: string
  lat: number
  lon: number
  site: SiteRecord | null
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
  setSites: (sites: SiteRecord[]) => void
  setSitesError: () => void
  selectSite: (id: string, opts?: { keepTime?: boolean }) => void
  setCustom: (lat: number, lon: number) => void
  setTime: (utcMs: number) => void
  shiftDays: (days: number) => void
  patch: (p: Partial<Pick<ScenarioState, 'target' | 'utcMs' | 'mastM' | 'panel' | 'maskDeg' | 'view'>>) => void
}

export const useScenario = create<ScenarioState>()((set, get) => ({
  sites: [],
  sitesStatus: 'loading',
  target: { kind: 'site', id: DEFAULT_SITE_ID },
  utcMs: Date.parse('2026-11-15T00:00:00Z'),
  mastM: DEFAULT_MAST_HEIGHT_M,
  panel: 'tracking',
  maskDeg: 0,
  view: 'globe',
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
}))

export function resolveTarget(target: Target, sites: SiteRecord[]): ResolvedTarget | null {
  if (target.kind === 'custom') {
    return { key: `${target.lat.toFixed(4)},${target.lon.toFixed(4)}`, name: 'Custom point', lat: target.lat, lon: target.lon, site: null }
  }
  const site = sites.find((s) => s.id === target.id)
  return site ? { key: site.id, name: site.name, lat: site.lat, lon: site.lon, site } : null
}

/** Selected place. Selects stable store slices, then derives, so the hook never returns a fresh object per read. */
export function useTarget() {
  const target = useScenario((s) => s.target)
  const sites = useScenario((s) => s.sites)
  return useMemo(() => resolveTarget(target, sites), [target, sites])
}

export const fmtLat = (lat: number) => `${Math.abs(lat).toFixed(3)}°${lat < 0 ? 'S' : 'N'}`
export const fmtLon = (lon: number) => `${Math.abs(lon).toFixed(3)}°${lon < 0 ? 'W' : 'E'}`
