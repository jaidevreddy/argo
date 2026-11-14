import { MakeTime, SiderealTime } from 'astronomy-engine'
import { Matrix4, Vector3 } from 'three'
import { eqjToMoonFixed } from '../../core/astro/frames'
import { siteFrame } from '../../core/astro/topocentric'
import { dot, mulMV } from '../../core/astro/vec'
import type { Site, Vec3 } from '../../core/types'
import { DEG } from '../../core/units'

/**
 * Site scene frame: three.js world with x = east, y = up, z = south (north is −z). Units: km.
 * Matches the terrain tile (row 0 north, col 0 west) and the topocentric az/el used by the sky chart.
 */
export function dirFromAzEl(az: number, el: number, out = new Vector3()) {
  const c = Math.cos(el)
  return out.set(Math.sin(az) * c, Math.sin(el), -Math.cos(az) * c)
}

/** Compass heading (radians clockwise from north) of a horizontal-ish direction in the site frame. */
export const headingOf = (d: Vector3) => Math.atan2(d.x, -d.z)

/**
 * Orientation of the Earth globe as seen from the site, as a rotation matrix for a three.js SphereGeometry
 * (its local +x = longitude 0, −z = 90°E, +y = north, same as the equirectangular texture).
 * Earth's prime meridian from Greenwich apparent sidereal time.
 * shortcut: ignores precession/nutation between J2000 and date (~0.3° of Earth rotation); invisible at Earth's
 * 2° apparent size. Upgrade: Rotation_EQJ_EQD if someone zooms in on Earth.
 */
export function earthBasis(site: Site, utcMs: number): Matrix4 {
  const time = MakeTime(new Date(utcMs))
  const m = eqjToMoonFixed(time)
  const g = SiderealTime(time) * 15 * DEG
  const f = siteFrame(site)
  const toLocal = (v: Vec3) => {
    const b = mulMV(m, v)
    return new Vector3(dot(b, f.east), dot(b, f.up), -dot(b, f.north))
  }
  const x = toLocal([Math.cos(g), Math.sin(g), 0]) // lon 0
  const y = toLocal([0, 0, 1]) // north pole
  const lon90 = toLocal([-Math.sin(g), Math.cos(g), 0])
  return new Matrix4().makeBasis(x, y, lon90.negate())
}

/** Fraction of Earth's disc lit by the Sun, as seen from the Moon (sun at infinity). */
export const earthLitFraction = (sunDir: Vector3, earthDir: Vector3) => (1 - sunDir.dot(earthDir)) / 2
