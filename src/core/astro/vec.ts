import type { Mat3, Vec3 } from '../types'

export const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
export const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
export const norm = (a: Vec3) => Math.hypot(a[0], a[1], a[2])

export const mulMV = (m: Mat3, v: Vec3): Vec3 => [dot(m[0], v), dot(m[1], v), dot(m[2], v)]

export const mulMM = (a: Mat3, b: Mat3): Mat3 => {
  const col = (j: number): Vec3 => [b[0][j], b[1][j], b[2][j]]
  const row = (i: number): Vec3 => [dot(a[i], col(0)), dot(a[i], col(1)), dot(a[i], col(2))]
  return [row(0), row(1), row(2)]
}

/** Passive (frame) rotation about z by angle a. */
export const rotZ = (a: number): Mat3 => {
  const c = Math.cos(a), s = Math.sin(a)
  return [[c, s, 0], [-s, c, 0], [0, 0, 1]]
}

/** Passive (frame) rotation about x by angle a. */
export const rotX = (a: number): Mat3 => {
  const c = Math.cos(a), s = Math.sin(a)
  return [[1, 0, 0], [0, c, s], [0, -s, c]]
}
