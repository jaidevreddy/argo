import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { horizonAt, sphereHorizon, terrainHorizon } from '../src/core/terrain/horizon'
import { discFraction } from '../src/core/terrain/visibility'
import { spans, longestMs } from '../src/core/metrics/windows'
import { runScenario, timeLeft } from '../src/core/metrics/summary'
import { DEG, RAD } from '../src/core/units'
import { SYNODIC_MONTH_DAYS } from '../src/core/constants'

const DAY = 864e5
const baked = (id: string) => {
  const h = JSON.parse(readFileSync(`public/data/horizon/${id}.json`, 'utf8'))
  return terrainHorizon(h.elDeg, h.azStepDeg)
}
const site = (id: string) => JSON.parse(readFileSync('public/data/sites.json', 'utf8')).find((s: { id: string }) => s.id === id)

describe('disc visibility', () => {
  const rho = 0.27 * DEG
  test('edges and centre', () => {
    expect(discFraction(-rho, 0, rho)).toBe(0)
    expect(discFraction(0, 0, rho)).toBeCloseTo(0.5, 12)
    expect(discFraction(rho, 0, rho)).toBe(1)
  })
  test('symmetric: f(x) + f(−x) = 1', () => {
    for (const x of [0.1, 0.4, 0.9]) expect(discFraction(x * rho, 0, rho) + discFraction(-x * rho, 0, rho)).toBeCloseTo(1, 12)
  })
})

describe('horizon', () => {
  test('sphere dip from 2 m is −0.087°', () => {
    expect(sphereHorizon(2).el[0] * RAD).toBeCloseTo(-0.0869, 4)
  })
  test('interpolates and wraps', () => {
    const h = terrainHorizon([0, 10, 20, 30], 90)
    expect(horizonAt(h, 45 * DEG) * RAD).toBeCloseTo(5, 6)
    expect(horizonAt(h, 315 * DEG) * RAD).toBeCloseTo(15, 6) // between 270° (30) and 360° (0)
    expect(horizonAt(h, -45 * DEG) * RAD).toBeCloseTo(15, 6)
  })
})

describe('windows', () => {
  test('spans close at sample midpoints', () => {
    const t = [0, 10, 20, 30, 40, 50]
    const s = spans(t, [false, true, true, false, true, true])
    expect(s).toEqual([{ start: 5, end: 25 }, { start: 35, end: 50, openEnd: true }])
    expect(longestMs(s)).toBe(20)
  })
})

describe('scenarios', () => {
  const lunarDay = (startIso: string) => {
    const startMs = Date.parse(startIso)
    return { startMs, endMs: startMs + SYNODIC_MONTH_DAYS * DAY, stepMs: 10 * 6e4 }
  }

  test('Apollo 11 site: ~50% sunlit, Earth always up, one sunrise and one sunset', () => {
    const r = runScenario({ site: { latDeg: 0.67416, lonDeg: 23.47314 }, horizon: sphereHorizon(), panel: 'tracking', maskDeg: 0, ...lunarDay('2026-01-01T00:00:00Z') })
    expect(r.stats.sunlitPct).toBeGreaterThan(48)
    expect(r.stats.sunlitPct).toBeLessThan(53)
    expect(r.stats.earthPct).toBe(100)
    expect(r.sunEvents.map((e) => e.kind).sort()).toEqual(['rise', 'set'])
  })

  test('time to sunset: full lunar day after sunrise, and flagged when it outlasts the range', () => {
    const startMs = Date.parse('2026-01-01T00:00:00Z')
    const inp = { site: { latDeg: 0.67416, lonDeg: 23.47314 }, horizon: sphereHorizon(), panel: 'tracking' as const, maskDeg: 0, startMs, stepMs: 10 * 6e4 }
    const r = runScenario({ ...inp, endMs: startMs + 2 * SYNODIC_MONTH_DAYS * DAY })
    const rise = r.sunEvents.find((e) => e.kind === 'rise')!.t
    const left = timeLeft(r, rise + 36e5).sunset!
    expect(left.atLeast).toBe(false)
    expect(left.hours / 24).toBeGreaterThan(14)
    expect(left.hours / 24).toBeLessThan(15.5)
    const short = runScenario({ ...inp, endMs: rise + 2 * DAY })
    expect(timeLeft(short, rise + 36e5).sunset!.atLeast).toBe(true)
  })

  test('Apollo 11 landing window (before 1970, negative epoch ms): Sun up, Earth up all window', () => {
    const startMs = Date.parse('1969-07-18T00:00:00Z')
    const r = runScenario({ site: { latDeg: 0.67416, lonDeg: 23.47314 }, horizon: sphereHorizon(), panel: 'tracking', maskDeg: 0, startMs, endMs: startMs + 32 * DAY, stepMs: 10 * 6e4 })
    expect(r.stats.sunlitPct).toBeGreaterThan(45)
    expect(r.stats.earthPct).toBe(100)
    expect(r.lit.length).toBeGreaterThan(0)
    const landing = Date.parse('1969-07-20T20:17:40Z')
    expect(timeLeft(r, landing).sunset!.hours / 24).toBeGreaterThan(10) // landed ~1 day after local sunrise
  })

  test("Chang'e 6 (far side): no direct-to-Earth link at all", () => {
    const r = runScenario({ site: { latDeg: -41.6385, lonDeg: -153.9852 }, horizon: sphereHorizon(), panel: 'tracking', maskDeg: 0, ...lunarDay('2024-06-01T00:00:00Z') })
    expect(r.stats.earthPct).toBe(0)
    expect(r.stats.sunlitPct).toBeGreaterThan(40)
  })

  test('south polar terrain sites over a year (reported, bounded)', () => {
    const startMs = Date.parse('2026-01-01T00:00:00Z')
    const rows: string[] = []
    for (const id of ['shackleton-ridge', 'connecting-ridge', 'malapert-massif', 'south-pole']) {
      const s = site(id)
      const r = runScenario({ site: { latDeg: s.lat, lonDeg: s.lon, elevationM: s.elevationM }, horizon: baked(id), panel: 'tracking', maskDeg: 0, startMs, endMs: startMs + 365 * DAY, stepMs: 36e5 })
      rows.push(`${id.padEnd(18)} sunlit ${r.stats.sunlitPct.toFixed(1)}%  earth ${r.stats.earthPct.toFixed(1)}%  ops ${r.stats.opsPct.toFixed(1)}%  longest dark ${r.stats.longestDarkH.toFixed(0)} h`)
      expect(r.stats.sunlitPct).toBeGreaterThan(0)
      expect(r.stats.sunlitPct).toBeLessThan(100)
    }
    console.info(rows.join('\n'))
  })
})
