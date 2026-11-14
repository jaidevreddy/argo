import { Body, RotationAxis, type AstroTime } from 'astronomy-engine'
import type { Mat3 } from '../types'
import { toRad } from '../units'
import { mulMM, rotX, rotZ } from './vec'

/**
 * Rotation from J2000 equatorial (EQJ) to the Moon's body-fixed frame.
 * Uses the IAU WGCCRE lunar orientation (pole RA/Dec + prime meridian W,
 * with the E1..E13 libration terms) as implemented by astronomy-engine.
 * M = Rz(W) · Rx(90° − δ) · Rz(90° + α)
 */
export function eqjToMoonFixed(time: AstroTime): Mat3 {
  const axis = RotationAxis(Body.Moon, time)
  const ra = toRad(axis.ra * 15) // astronomy-engine returns RA in hours
  const dec = toRad(axis.dec)
  const w = toRad(axis.spin)
  return mulMM(rotZ(w), mulMM(rotX(Math.PI / 2 - dec), rotZ(Math.PI / 2 + ra)))
}
