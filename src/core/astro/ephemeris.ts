import { Body, GeoMoon, GeoVector, type AstroTime } from 'astronomy-engine'
import { AU_KM } from '../constants'
import type { Vec3 } from '../types'
import { eqjToMoonFixed } from './frames'
import { mulMV, scale, sub } from './vec'

const toKm = (v: { x: number; y: number; z: number }): Vec3 => scale([v.x, v.y, v.z], AU_KM)

/**
 * Sun and Earth centres relative to the Moon's centre, in the Moon body-fixed frame, km.
 * Sun includes light-time and annual aberration as seen from Earth; the Earth–Moon
 * difference in either is under 0.001°, far below the terrain and DEM error.
 */
export function bodiesFromMoon(time: AstroTime): { sun: Vec3; earth: Vec3 } {
  const m = eqjToMoonFixed(time)
  const moon = toKm(GeoMoon(time))
  const sun = toKm(GeoVector(Body.Sun, time, true))
  return {
    sun: mulMV(m, sub(sun, moon)),
    earth: mulMV(m, scale(moon, -1)),
  }
}
