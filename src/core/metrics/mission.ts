import { bodySeries, type BodySeries } from '../astro/ephemeris'
import { earthTopo, siteFrame, sunTopo } from '../astro/topocentric'
import { horizonAt, type Horizon } from '../terrain/horizon'
import { discFraction } from '../terrain/visibility'
import type { Site, Vec3 } from '../types'
import { DEG } from '../units'
import { earthMargin } from './comms'
import { powerIndex, type PanelType } from './power'
import { both, longestMs, spans, totalMs, type Span } from './windows'

/** Compare and Nudge judge a landing by its first 30 days. */
export const MISSION_DAYS = 30
export const MISSION_STEP_MS = 10 * 60_000
const H = 3_600_000
const DAY = 864e5

export interface MissionStats {
  /** Hours with sunlight on the panel and Earth above horizon + mask, first 30 days. The headline number. */
  opsH: number
  /** Unbroken power + link from touchdown, hours (0 if either is missing at touchdown). */
  firstOpsH: number
  firstOpsOpen: boolean
  sunlitPct: number
  earthPct: number
  longestDarkH: number
  /** Hours from touchdown until the Sun is first lost; null = touchdown in darkness. */
  sunsetH: number | null
  sunsetOpen: boolean
  meanPower: number
  /** Spans as ms after touchdown, for the compare strips. */
  bands: { lit: Span[]; comm: Span[]; ops: Span[] }
}

const v3 = (a: Float64Array, i: number): Vec3 => [a[i * 3], a[i * 3 + 1], a[i * 3 + 2]]

/** Mission metrics over n samples of a shared body series, starting at sample i0 (= touchdown). */
export function missionStats(site: Site, horizon: Horizon, b: BodySeries, i0: number, n: number, panel: PanelType, maskDeg: number): MissionStats {
  const f = siteFrame(site)
  const mask = maskDeg * DEG
  const t = new Float64Array(n)
  const lit: boolean[] = new Array(n)
  const comm: boolean[] = new Array(n)
  let power = 0
  for (let k = 0; k < n; k++) {
    const i = i0 + k
    const sun = sunTopo(f, v3(b.sun, i))
    const earth = earthTopo(f, v3(b.earth, i))
    const hs = horizonAt(horizon, sun.az)
    t[k] = k * b.step // relative to touchdown
    lit[k] = discFraction(sun.el, hs, sun.angularRadius) > 0
    comm[k] = earthMargin(earth, horizonAt(horizon, earth.az), mask) > 0
    power += powerIndex(sun, hs, panel)
  }
  const litS = spans(t, lit)
  const commS = spans(t, comm)
  const opsS = spans(t, both(lit, comm))
  const darkS = spans(t, lit.map((v) => !v))
  const span = t[n - 1] - t[0]
  const first = (s: Span[]) => (s[0] && s[0].start === 0 ? s[0] : null)
  const fo = first(opsS)
  const fl = first(litS)
  return {
    opsH: totalMs(opsS) / H,
    firstOpsH: fo ? fo.end / H : 0,
    firstOpsOpen: !!fo?.openEnd,
    sunlitPct: (100 * totalMs(litS)) / span,
    earthPct: (100 * totalMs(commS)) / span,
    longestDarkH: longestMs(darkS) / H,
    sunsetH: fl ? fl.end / H : null,
    sunsetOpen: !!fl?.openEnd,
    meanPower: power / n,
    bands: { lit: litS, comm: commS, ops: opsS },
  }
}

export interface MissionCase {
  key: string
  site: Site
  horizon: Horizon
  landingMs: number
}

/**
 * Evaluate many landings. Cases whose touchdowns sit on the same 10-minute grid within 10 days of each other
 * share one ephemeris pass (the expensive part); each case still gets its own exact site geometry.
 */
export function runMissions(cases: MissionCase[], panel: PanelType, maskDeg: number, days = MISSION_DAYS) {
  const n = Math.round((days * DAY) / MISSION_STEP_MS) + 1
  const out: Record<string, MissionStats> = {}
  const groups: { phase: number; cases: MissionCase[] }[] = []
  for (const c of cases) {
    const phase = ((c.landingMs % MISSION_STEP_MS) + MISSION_STEP_MS) % MISSION_STEP_MS
    const g = groups.find((x) => x.phase === phase && Math.abs(x.cases[0].landingMs - c.landingMs) <= 10 * DAY)
    if (g) g.cases.push(c)
    else groups.push({ phase, cases: [c] })
  }
  for (const { cases: cs } of groups) {
    const t0 = Math.min(...cs.map((c) => c.landingMs))
    const t1 = Math.max(...cs.map((c) => c.landingMs))
    const b = bodySeries(t0, MISSION_STEP_MS, Math.round((t1 - t0) / MISSION_STEP_MS) + n)
    for (const c of cs) out[c.key] = missionStats(c.site, c.horizon, b, Math.round((c.landingMs - t0) / MISSION_STEP_MS), n, panel, maskDeg)
  }
  return out
}
