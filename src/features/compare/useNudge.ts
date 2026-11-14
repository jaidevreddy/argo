import type { MissionCase } from '../../core/metrics/mission'
import { loadNudge } from '../../data/nudge'
import { loadHorizon } from '../../data/sites'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { useMissionRuns } from './useMissionRuns'

const DAY = 864e5
export const NUDGE_DAYS = [-3, -2, -1, 1, 2, 3]

/**
 * Same 30-day test for the listed point, its 16 baked neighbours (1 and 2 km, 8 directions) and the current
 * point landed up to 3 days earlier or later. One ephemeris pass serves all 23 cases.
 */
export function useNudge() {
  const target = useTarget()
  const utcMs = useScenario((s) => s.utcMs)
  const panel = useScenario((s) => s.panel)
  const maskDeg = useScenario((s) => s.maskDeg)
  const mastM = useScenario((s) => s.mastM)
  const site = target?.site?.nudgePoints ? target.site : null
  const landing = Math.round(utcMs / 60_000) * 60_000
  const key = site && target ? `${target.key}|${landing}|${panel}|${maskDeg}|${mastM}` : null

  const runs = useMissionRuns(
    key,
    async () => {
      if (!site || !target) return []
      const [baseH, points] = await Promise.all([loadHorizon(site, mastM), loadNudge(site.id)])
      const at = (lat: number, lon: number, elevationM: number | null) => ({ latDeg: lat, lonDeg: lon, elevationM: elevationM ?? 0, mastM })
      const cur = target.at === null ? { s: at(site.lat, site.lon, site.elevationM), h: baseH } : { s: at(target.lat, target.lon, target.elevationM), h: points[target.at].horizon }
      const cases: MissionCase[] = [
        { key: 'base', site: at(site.lat, site.lon, site.elevationM), horizon: baseH, landingMs: landing },
        ...points.map((p, i) => ({ key: `p${i}`, site: at(p.lat, p.lon, p.elevationM), horizon: p.horizon, landingMs: landing })),
        ...NUDGE_DAYS.map((d) => ({ key: `d${d}`, site: cur.s, horizon: cur.h, landingMs: landing + d * DAY })),
      ]
      return cases
    },
    panel,
    maskDeg,
  )
  const currentKey = target?.at == null ? 'base' : `p${target.at}`
  return { site, target, landing, runs, currentKey }
}
