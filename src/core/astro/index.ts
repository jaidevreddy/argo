import { MakeTime } from 'astronomy-engine'
import type { Site, SkyState } from '../types'
import { bodiesFromMoon } from './ephemeris'
import { earthTopo, siteFrame, sunTopo } from './topocentric'

export { findCrossings, sampleSeries } from './events'
export type { Crossing, Sample } from './events'
export { siteFrame } from './topocentric'

/** Sun and Earth as seen from a lunar site at a UTC instant. */
export function skyAt(site: Site, utc: Date | number): SkyState {
  const time = MakeTime(new Date(utc))
  const frame = siteFrame(site)
  const { sun, earth } = bodiesFromMoon(time)
  return { sun: sunTopo(frame, sun), earth: earthTopo(frame, earth) }
}

/** Build a fast sky function bound to one site (frame computed once). */
export function skyFn(site: Site): (utcMs: number) => SkyState {
  const frame = siteFrame(site)
  return (utcMs) => {
    const { sun, earth } = bodiesFromMoon(MakeTime(new Date(utcMs)))
    return { sun: sunTopo(frame, sun), earth: earthTopo(frame, earth) }
  }
}
