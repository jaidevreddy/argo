export type Vec3 = readonly [number, number, number]
export type Mat3 = readonly [Vec3, Vec3, Vec3]

/** A point on the lunar surface. Angles in degrees at this boundary, east-positive longitude. */
export interface Site {
  latDeg: number
  lonDeg: number
  /** Surface height above the 1737.4 km reference sphere, metres. */
  elevationM?: number
  /** Observer height above the surface (antenna, panel), metres. */
  mastM?: number
}

/** Direction to a body as seen from a site. Angles in radians. */
export interface TopoPosition {
  /** Clockwise from local north, [0, 2π). */
  az: number
  /** Above the local horizontal plane (not terrain). */
  el: number
  distanceKm: number
  /** Angular radius of the body's disc. */
  angularRadius: number
}

export interface SkyState {
  sun: TopoPosition
  earth: TopoPosition
}
