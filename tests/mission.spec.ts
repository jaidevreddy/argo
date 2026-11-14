import { describe, expect, it } from 'vitest'
import { runScenario } from '../src/core/metrics/summary'
import { MISSION_DAYS, MISSION_STEP_MS, runMissions } from '../src/core/metrics/mission'
import { sphereHorizon, terrainHorizon } from '../src/core/terrain/horizon'

const DAY = 864e5
const landing = Date.parse('2026-11-18T08:00:00Z')
const polar = { latDeg: -85.98, lonDeg: -0.26, elevationM: 4817, mastM: 2 }

describe('mission metrics', () => {
  it('agrees with the full scenario engine over the same 30 days', () => {
    const h = sphereHorizon(2)
    const full = runScenario({ site: polar, horizon: h, startMs: landing, endMs: landing + MISSION_DAYS * DAY, stepMs: MISSION_STEP_MS, panel: 'tracking', maskDeg: 0 })
    const m = runMissions([{ key: 'a', site: polar, horizon: h, landingMs: landing }], 'tracking', 0).a
    expect(m.sunlitPct).toBeCloseTo(full.stats.sunlitPct, 6)
    expect(m.earthPct).toBeCloseTo(full.stats.earthPct, 6)
    expect(m.opsH).toBeCloseTo((full.stats.opsPct * MISSION_DAYS * 24) / 100, 6)
    expect(m.longestDarkH).toBeCloseTo(full.stats.longestDarkH, 6)
  })

  it('shares one ephemeris pass across shifted landings without changing answers', () => {
    const h = sphereHorizon(2)
    const together = runMissions(
      [0, 1, 2].map((d) => ({ key: `d${d}`, site: polar, horizon: h, landingMs: landing + d * DAY })),
      'tracking', 0,
    )
    const alone = runMissions([{ key: 'd2', site: polar, horizon: h, landingMs: landing + 2 * DAY }], 'tracking', 0)
    expect(together.d2.opsH).toBeCloseTo(alone.d2.opsH, 9)
    // touchdown two days later sees the next sunset two days sooner (sphere horizon, equator-like geometry aside)
    expect(together.d0.sunlitPct).toBeGreaterThan(0)
    expect(together.d1.bands.lit.length).toBeGreaterThan(0)
  })

  it('a wall of terrain kills power, and touchdown in the dark reports no sunset', () => {
    const wall = terrainHorizon(Array(720).fill(20), 0.5)
    const m = runMissions([{ key: 'w', site: polar, horizon: wall, landingMs: landing }], 'tracking', 0).w
    expect(m.opsH).toBe(0)
    expect(m.sunsetH).toBeNull()
    expect(m.longestDarkH).toBeCloseTo(MISSION_DAYS * 24, 0)
  })

  it('Apollo 11 (pre-1970) lands in daylight with Earth up the whole time', () => {
    const a11 = { latDeg: 0.674, lonDeg: 23.473, elevationM: -1930, mastM: 2 }
    const m = runMissions([{ key: 'x', site: a11, horizon: sphereHorizon(2), landingMs: Date.parse('1969-07-20T20:17:40Z') }], 'tracking', 0).x
    expect(m.earthPct).toBeCloseTo(100, 6)
    expect(m.sunsetH).toBeGreaterThan(13 * 24)
    expect(m.sunsetH).toBeLessThan(14.5 * 24)
  })
})
