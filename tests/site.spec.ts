import { Vector3, OrthographicCamera } from 'three'
import { describe, expect, it } from 'vitest'
import { heightAt, parseTile } from '../src/data/terrain'
import { DEG } from '../src/core/units'
import { skyAt } from '../src/core/astro'
import { dirFromAzEl, earthBasis, earthLitFraction, headingOf } from '../src/scene/site/local'
import { buildTerrainGeometry } from '../src/scene/site/terrainGeometry'
import { fitShadowCamera } from '../src/scene/site/shadowFit'
import { bodiesFromMoon } from '../src/core/astro/ephemeris'
import { MakeTime } from 'astronomy-engine'

const meta = { size: 4, stepM: 40, unitM: 0.25, zMinM: 0, zMaxM: 3 }
// row 0 north: heights rise toward the north edge
const raw = Int16Array.from({ length: 16 }, (_, i) => (3 - Math.floor(i / 4)) * 4)
const tile = parseTile('t', meta, raw.buffer, 0.5, [1, 2], 10240)

describe('site frame', () => {
  it('maps az/el to east-up-south', () => {
    const n = dirFromAzEl(0, 0), e = dirFromAzEl(Math.PI / 2, 0)
    expect(n.z).toBeCloseTo(-1)
    expect(e.x).toBeCloseTo(1)
    expect(dirFromAzEl(0, Math.PI / 2).y).toBeCloseTo(1)
    expect(headingOf(e)).toBeCloseTo(Math.PI / 2)
  })

  it('parses tiles: row 0 is north, heights in km', () => {
    expect(tile.heightsKm[0]).toBeCloseTo(0.003)
    expect(heightAt(tile, 0, 0.06)).toBeCloseTo(0.003)
    expect(heightAt(tile, 0, -0.06)).toBeCloseTo(0)
    expect(tile.far.el[1]).toBeCloseTo(2 * DEG)
  })

  it('builds terrain with upward normals and north at −z', () => {
    const g = buildTerrainGeometry(tile)
    const p = g.getAttribute('position'), nrm = g.getAttribute('normal')
    expect(p.getZ(0)).toBeLessThan(0) // first row is north
    expect(p.getY(0)).toBeCloseTo(0.003)
    for (let i = 0; i < nrm.count; i++) expect(nrm.getY(i)).toBeGreaterThan(0)
    // slope rises to the north, so normals lean south (+z)
    expect(nrm.getZ(5)).toBeGreaterThan(0)
  })

  it('fits the shadow camera around the whole tile at a grazing Sun', () => {
    const cam = new OrthographicCamera()
    const light = dirFromAzEl(1, 1.5 * DEG).multiplyScalar(50)
    const min = new Vector3(-10, -5, -10), max = new Vector3(10, 0.5, 10)
    fitShadowCamera(cam, light, min, max)
    expect(cam.right - cam.left).toBeGreaterThan(20)
    expect(cam.top - cam.bottom).toBeLessThan(8) // thin slab, not a 28 km square
    expect(cam.far).toBeGreaterThan(cam.near)
  })

  it('orients Earth so the sub-lunar point faces the site', () => {
    const site = { latDeg: 0, lonDeg: 0, elevationM: 0 }
    const t = Date.parse('2026-11-20T00:00:00Z')
    const sky = skyAt(site, t)
    const earthDir = dirFromAzEl(sky.earth.az, sky.earth.el)
    const m = earthBasis(site, t)
    const axes = [0, 1, 2].map((i) => new Vector3().setFromMatrixColumn(m, i))
    for (const a of axes) expect(a.length()).toBeCloseTo(1, 6)
    expect(axes[0].dot(axes[1])).toBeCloseTo(0, 6)
    // From (0, 0) Earth hangs near the zenith; its north pole points toward lunar north (−z)
    expect(axes[1].z).toBeLessThan(-0.8)
    // the sub-lunar point (Earth's surface facing us) is −earthDir in Earth's frame, near the equator
    expect(Math.abs(axes[1].dot(earthDir))).toBeLessThan(0.1)
    // lit fraction is a valid phase
    const { sun } = bodiesFromMoon(MakeTime(new Date(t)))
    expect(sun.length).toBe(3)
    const f = earthLitFraction(dirFromAzEl(sky.sun.az, sky.sun.el), earthDir)
    expect(f).toBeGreaterThanOrEqual(0)
    expect(f).toBeLessThanOrEqual(1)
  })
})
