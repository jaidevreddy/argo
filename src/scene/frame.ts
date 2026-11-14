import { MakeTime } from 'astronomy-engine'
import { Vector3 } from 'three'
import { bodiesFromMoon } from '../core/astro/ephemeris'
import type { Vec3 } from '../core/types'
import { toRad } from '../core/units'

/**
 * Moon body-fixed (x = lon 0, y = lon 90°E, z = north) → three.js world (y up).
 * Matches SphereGeometry's equirectangular UVs with longitude 0 at the texture centre.
 */
export const bfToThree = ([x, y, z]: Vec3) => new Vector3(x, z, -y)

export function latLonToThree(latDeg: number, lonDeg: number, r = 1) {
  const la = toRad(latDeg)
  const lo = toRad(lonDeg)
  return new Vector3(r * Math.cos(la) * Math.cos(lo), r * Math.sin(la), -r * Math.cos(la) * Math.sin(lo))
}

/** Unit vectors from the Moon's centre to the Sun and the Earth, three.js world frame. */
export function bodyDirections(utcMs: number) {
  const { sun, earth } = bodiesFromMoon(MakeTime(new Date(utcMs)))
  return { sun: bfToThree(sun).normalize(), earth: bfToThree(earth).normalize() }
}
