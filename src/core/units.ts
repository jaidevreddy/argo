export const DEG = Math.PI / 180
export const RAD = 180 / Math.PI

export const toRad = (deg: number) => deg * DEG
export const toDeg = (rad: number) => rad * RAD

/** Wrap an angle in radians to [0, 2π). */
export const wrap2Pi = (a: number) => {
  const t = a % (2 * Math.PI)
  return t < 0 ? t + 2 * Math.PI : t
}
