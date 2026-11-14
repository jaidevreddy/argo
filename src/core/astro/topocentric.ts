import { EARTH_RADIUS_KM, MOON_RADIUS_KM, SUN_RADIUS_KM, DEFAULT_MAST_HEIGHT_M } from '../constants'
import type { Site, TopoPosition, Vec3 } from '../types'
import { toRad, wrap2Pi } from '../units'
import { dot, norm, scale, sub } from './vec'

interface SiteFrame {
  position: Vec3 // km, Moon body-fixed
  east: Vec3
  north: Vec3
  up: Vec3
}

/** Observer position and local east/north/up unit vectors in the Moon body-fixed frame. */
export function siteFrame(site: Site): SiteFrame {
  const lat = toRad(site.latDeg)
  const lon = toRad(site.lonDeg)
  const heightKm = ((site.elevationM ?? 0) + (site.mastM ?? DEFAULT_MAST_HEIGHT_M)) / 1000
  const cl = Math.cos(lat), sl = Math.sin(lat), co = Math.cos(lon), so = Math.sin(lon)
  const up: Vec3 = [cl * co, cl * so, sl]
  return {
    position: scale(up, MOON_RADIUS_KM + heightKm),
    east: [-so, co, 0],
    north: [-sl * co, -sl * so, cl],
    up,
  }
}

/** Topocentric direction to a target given in Moon body-fixed km. Parallax is exact. */
export function topocentric(frame: SiteFrame, target: Vec3, bodyRadiusKm: number): TopoPosition {
  const rel = sub(target, frame.position)
  const distanceKm = norm(rel)
  const d = scale(rel, 1 / distanceKm)
  return {
    az: wrap2Pi(Math.atan2(dot(d, frame.east), dot(d, frame.north))),
    el: Math.asin(dot(d, frame.up)),
    distanceKm,
    angularRadius: Math.asin(bodyRadiusKm / distanceKm),
  }
}

export const sunTopo = (f: SiteFrame, sun: Vec3) => topocentric(f, sun, SUN_RADIUS_KM)
export const earthTopo = (f: SiteFrame, earth: Vec3) => topocentric(f, earth, EARTH_RADIUS_KM)
