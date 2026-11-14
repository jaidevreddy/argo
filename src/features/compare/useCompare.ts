import { useMemo } from 'react'
import type { MissionCase } from '../../core/metrics/mission'
import { sphereHorizon } from '../../core/terrain/horizon'
import { loadHorizon } from '../../data/sites'
import { encodeItem } from '../../state/codec'
import { resolveTarget, useScenario } from '../../state/scenarioStore'
import { useMissionRuns } from './useMissionRuns'

/** The compare list, resolved, with first-30-day metrics for each landing. */
export function useCompare() {
  const compare = useScenario((s) => s.compare)
  const sites = useScenario((s) => s.sites)
  const panel = useScenario((s) => s.panel)
  const maskDeg = useScenario((s) => s.maskDeg)
  const mastM = useScenario((s) => s.mastM)

  const items = useMemo(
    () => compare.map((c) => ({ key: encodeItem(c), utcMs: c.utcMs, target: resolveTarget(c.target, sites) })),
    [compare, sites],
  )
  const key = items.length && sites.length ? `${items.map((i) => i.key).join('~')}|${panel}|${maskDeg}|${mastM}` : null
  const runs = useMissionRuns(
    key,
    () =>
      Promise.all(
        items.map(async (it): Promise<MissionCase | null> => {
          const t = it.target
          if (!t) return null
          const horizon = t.site ? await loadHorizon(t.site, mastM, t.at) : sphereHorizon(mastM)
          return { key: it.key, site: { latDeg: t.lat, lonDeg: t.lon, elevationM: t.elevationM ?? 0, mastM }, horizon, landingMs: it.utcMs }
        }),
      ).then((cs) => cs.filter((c): c is MissionCase => c !== null)),
    panel,
    maskDeg,
    0,
  )
  return { items, runs }
}
