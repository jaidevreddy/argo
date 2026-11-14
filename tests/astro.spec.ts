import { describe, expect, test } from 'vitest'
import fixtures from './fixtures/horizons.json'
import { findCrossings, sampleSeries, skyAt, skyFn } from '../src/core/astro'
import { DEG, RAD } from '../src/core/units'

/** Great-circle angle between two az/el directions, degrees. Robust near zenith, unlike raw az diff. */
function separationDeg(az1: number, el1: number, az2: number, el2: number) {
  const c = Math.sin(el1) * Math.sin(el2) + Math.cos(el1) * Math.cos(el2) * Math.cos(az1 - az2)
  return Math.acos(Math.min(1, Math.max(-1, c))) * RAD
}

describe('matches JPL Horizons (DE441)', () => {
  const errors: number[] = []
  test.each(fixtures.cases)('$site $body $utc', (c) => {
    const sky = skyAt({ latDeg: c.latDeg, lonDeg: c.lonDeg, mastM: 0 }, Date.parse(c.utc))
    const p = c.body === 'sun' ? sky.sun : sky.earth
    const sep = separationDeg(p.az, p.el, c.azDeg * DEG, c.elDeg * DEG)
    errors.push(sep)
    expect(sep).toBeLessThan(0.01)
    expect(Math.abs(p.el * RAD - c.elDeg)).toBeLessThan(0.01)
  })
  test('report', () => {
    const max = Math.max(...errors)
    const mean = errors.reduce((a, b) => a + b, 0) / errors.length
    console.info(`Horizons residuals over ${errors.length} cases: max ${max.toFixed(4)}°, mean ${mean.toFixed(4)}°`)
  })
})

describe('physical sanity', () => {
  test('Sun never exceeds ~1.6° at the south pole over a year', () => {
    const f = skyFn({ latDeg: -90, lonDeg: 0, mastM: 0 })
    const start = Date.parse('2026-01-01T00:00:00Z')
    for (let t = start; t < start + 365 * 864e5; t += 6 * 36e5) {
      expect(f(t).sun.el * RAD).toBeLessThan(1.65)
    }
  })

  test('Earth never rises at the far-side centre', () => {
    const f = skyFn({ latDeg: 0, lonDeg: 180, mastM: 0 })
    const start = Date.parse('2026-01-01T00:00:00Z')
    for (let t = start; t < start + 60 * 864e5; t += 36e5) {
      expect(f(t).earth.el * RAD).toBeLessThan(-70)
    }
  })

  test('Earth is near zenith at 0°, 0°', () => {
    expect(skyAt({ latDeg: 0, lonDeg: 0 }, Date.parse('2026-06-01T00:00:00Z')).earth.el * RAD).toBeGreaterThan(80)
  })

  test('disc sizes: Sun ≈ 0.27°, Earth ≈ 0.95° angular radius', () => {
    const s = skyAt({ latDeg: 0, lonDeg: 0 }, Date.parse('2026-06-01T00:00:00Z'))
    expect(s.sun.angularRadius * RAD).toBeCloseTo(0.26, 1)
    expect(s.earth.angularRadius * RAD).toBeGreaterThan(0.89)
    expect(s.earth.angularRadius * RAD).toBeLessThan(1.0)
  })
})

describe('events', () => {
  test('one sunrise and one sunset per lunar day at the equator, refined to 1 s', () => {
    const f = skyFn({ latDeg: 0, lonDeg: 0, mastM: 0 })
    const el = (t: number) => f(t).sun.el
    const start = Date.parse('2026-01-01T00:00:00Z')
    const series = sampleSeries(el, start, start + 29.53 * 864e5, 10 * 6e4)
    const events = findCrossings(el, series)
    expect(events.filter((e) => e.kind === 'rise')).toHaveLength(1)
    expect(events.filter((e) => e.kind === 'set')).toHaveLength(1)
    for (const e of events) expect(Math.abs(el(e.t) * RAD)).toBeLessThan(0.001)
  })
})
