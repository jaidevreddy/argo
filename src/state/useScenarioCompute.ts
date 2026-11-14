import { useEffect } from 'react'
import { loadHorizon } from '../data/sites'
import { sphereHorizon } from '../core/terrain/horizon'
import { computeScenario } from '../workers/computeClient'
import { useCompute } from './computeStore'
import { useScenario, useTarget } from './scenarioStore'

const DAY = 864e5
export const WINDOW_BEFORE_DAYS = 2
export const WINDOW_DAYS = 32 // more than one synodic month, so every rise has its set
const STEP_MS = 10 * 60_000
let latestKey = ''

/** Window anchored to the UTC day of the cursor; kept while the cursor stays well inside it. */
function windowFor(utcMs: number) {
  const start = Math.floor(utcMs / DAY) * DAY - WINDOW_BEFORE_DAYS * DAY
  return { start, end: start + WINDOW_DAYS * DAY }
}

/** Mount once. Loads the horizon for the place and (re)computes the window when it must. */
export function useScenarioCompute() {
  const target = useTarget()
  const utcMs = useScenario((s) => s.utcMs)
  const mastM = useScenario((s) => s.mastM)
  const panel = useScenario((s) => s.panel)
  const maskDeg = useScenario((s) => s.maskDeg)

  // 1. horizon: baked LOLA profile for terrain sites, ideal sphere elsewhere
  const site = target?.site ?? null
  const horizonKey = target ? `${target.key}|${site?.terrain ? 'lola' : `sphere:${mastM}`}` : ''
  useEffect(() => {
    if (!target) return
    let alive = true
    const p = site ? loadHorizon(site, mastM, target.at) : Promise.resolve(sphereHorizon(mastM))
    p.then((h) => alive && useCompute.setState({ horizon: h, horizonKey }))
      .catch((e) => alive && useCompute.setState({ status: 'error', error: String(e) }))
    return () => {
      alive = false
    }
  }, [horizonKey]) // eslint-disable-line react-hooks/exhaustive-deps -- key captures every input

  // 2. series: recompute when inputs change or the cursor nears the window edges
  const horizon = useCompute((s) => (s.horizonKey === horizonKey ? s.horizon : null))
  const win = useCompute((s) => s.window)
  const needNewWindow = !win || utcMs < win.start + DAY / 2 || utcMs > win.end - 3 * DAY
  const anchor = needNewWindow ? windowFor(utcMs) : win
  const resultKey = target && horizon ? `${horizonKey}|${anchor.start}|${panel}|${maskDeg}|${mastM}` : ''

  useEffect(() => {
    if (!target || !horizon || !resultKey) return
    if (useCompute.getState().resultKey === resultKey) return
    latestKey = resultKey
    useCompute.setState({ status: 'computing', window: anchor })
    computeScenario({
      site: { latDeg: target.lat, lonDeg: target.lon, elevationM: target.elevationM ?? 0, mastM },
      horizon,
      startMs: anchor.start,
      endMs: anchor.end,
      stepMs: STEP_MS,
      panel,
      maskDeg,
    })
      .then((result) => {
        if (latestKey !== resultKey) return // a newer request superseded this one
        useCompute.setState({ result, resultKey, status: 'ready', error: null })
      })
      .catch((e) => latestKey === resultKey && useCompute.setState({ status: 'error', error: String(e) }))
  }, [resultKey]) // eslint-disable-line react-hooks/exhaustive-deps -- key captures every input
}
