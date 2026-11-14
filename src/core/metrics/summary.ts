import { findCrossings, sampleSeries, skyFn } from '../astro'
import type { Crossing } from '../astro'
import type { Site } from '../types'
import { DEG } from '../units'
import { horizonAt, type Horizon } from '../terrain/horizon'
import { discFraction } from '../terrain/visibility'
import { earthMargin } from './comms'
import { powerIndex, type PanelType } from './power'
import { both, longestMs, spanAt, spans, totalMs, type Span } from './windows'

export interface ScenarioInput {
  site: Site
  horizon: Horizon
  startMs: number
  endMs: number
  stepMs: number
  panel: PanelType
  maskDeg: number
}

export interface ScenarioSeries {
  t: Float64Array
  sunAz: Float32Array
  sunEl: Float32Array
  earthAz: Float32Array
  earthEl: Float32Array
  sunVisible: Float32Array // disc fraction 0..1
  power: Float32Array // 0..1
  earthUp: Uint8Array // 1 when link margin > 0
}

export interface ScenarioResult {
  series: ScenarioSeries
  sunEvents: Crossing[] // rise = first limb clears the horizon
  earthEvents: Crossing[] // rise = Earth centre clears horizon + mask
  lit: Span[]
  comm: Span[]
  ops: Span[] // lit and Earth in view
  stats: {
    sunlitPct: number
    earthPct: number
    opsPct: number
    longestLitH: number
    longestDarkH: number
    longestCommH: number
    longestOpsH: number
    meanPower: number
  }
}

const H = 3_600_000

/** Sample a scenario, find rise/set events to 1 s, and summarise power and comms windows. */
export function runScenario(inp: ScenarioInput): ScenarioResult {
  const sky = skyFn(inp.site)
  const mask = inp.maskDeg * DEG
  // Continuous margins so events refine by bisection (sign change = event).
  const sunMargin = (t: number) => {
    const s = sky(t).sun
    return s.el - horizonAt(inp.horizon, s.az) + s.angularRadius
  }
  const earthM = (t: number) => {
    const e = sky(t).earth
    return earthMargin(e, horizonAt(inp.horizon, e.az), mask)
  }

  const raw = sampleSeries((t) => t, inp.startMs, inp.endMs, inp.stepMs)
  const n = raw.length
  const s: ScenarioSeries = {
    t: new Float64Array(n), sunAz: new Float32Array(n), sunEl: new Float32Array(n),
    earthAz: new Float32Array(n), earthEl: new Float32Array(n), sunVisible: new Float32Array(n),
    power: new Float32Array(n), earthUp: new Uint8Array(n),
  }
  const sunSamples = new Array(n)
  const earthSamples = new Array(n)
  for (let i = 0; i < n; i++) {
    const t = raw[i].t
    const { sun, earth } = sky(t)
    const hs = horizonAt(inp.horizon, sun.az)
    const he = horizonAt(inp.horizon, earth.az)
    s.t[i] = t
    s.sunAz[i] = sun.az
    s.sunEl[i] = sun.el
    s.earthAz[i] = earth.az
    s.earthEl[i] = earth.el
    s.sunVisible[i] = discFraction(sun.el, hs, sun.angularRadius)
    s.power[i] = powerIndex(sun, hs, inp.panel)
    const em = earthMargin(earth, he, mask)
    s.earthUp[i] = em > 0 ? 1 : 0
    sunSamples[i] = { t, v: sun.el - hs + sun.angularRadius }
    earthSamples[i] = { t, v: em }
  }

  const litOn = Array.from(s.sunVisible, (v) => v > 0)
  const commOn = Array.from(s.earthUp, (v) => v === 1)
  const lit = spans(s.t, litOn)
  const comm = spans(s.t, commOn)
  const ops = spans(s.t, both(litOn, commOn))
  const dark = spans(s.t, litOn.map((v) => !v))
  const span = inp.endMs - inp.startMs

  return {
    series: s,
    sunEvents: findCrossings(sunMargin, sunSamples),
    earthEvents: findCrossings(earthM, earthSamples),
    lit, comm, ops,
    stats: {
      sunlitPct: (100 * totalMs(lit)) / span,
      earthPct: (100 * totalMs(comm)) / span,
      opsPct: (100 * totalMs(ops)) / span,
      longestLitH: longestMs(lit) / H,
      longestDarkH: longestMs(dark) / H,
      longestCommH: longestMs(comm) / H,
      longestOpsH: longestMs(ops) / H,
      meanPower: s.power.reduce((a, v) => a + v, 0) / n,
    },
  }
}

export interface TimeLeft {
  hours: number
  /** The window outlasts the computed range: show "more than {hours} h". */
  atLeast: boolean
}

/** Time from t until the current lit / comm window ends; null when not in one. */
export function timeLeft(r: ScenarioResult, t: number): { sunset: TimeLeft | null; earthset: TimeLeft | null } {
  const left = (sp: Span[]): TimeLeft | null => {
    const x = spanAt(sp, t)
    return x ? { hours: (x.end - t) / H, atLeast: x.openEnd === true } : null
  }
  return { sunset: left(r.lit), earthset: left(r.comm) }
}

/** Next rise or set strictly after t, from events found in the window (null if none in range). */
export function nextEvent(events: Crossing[], kind: Crossing['kind'], t: number): number | null {
  let best: number | null = null
  for (const e of events) if (e.kind === kind && e.t > t && (best === null || e.t < best)) best = e.t
  return best
}
