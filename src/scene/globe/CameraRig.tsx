import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import { useTarget } from '../../state/scenarioStore'
import { latLonToThree } from '../frame'

const VIEW_DIST = 4.4
const LAT_CLAMP = 62 // keep the camera off the pole axis so OrbitControls never hits its singularity

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function viewFor(lat: number, lon: number) {
  return latLonToThree(Math.max(-LAT_CLAMP, Math.min(LAT_CLAMP, lat)), lon, VIEW_DIST)
}

/** Orbit controls + the one authored motion: a great-circle flight to the selected site. */
export function CameraRig() {
  const target = useTarget()
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const size = useThree((s) => s.size)
  const first = useRef(true)

  // Centre the Moon in the space right of the site panel (desktop), not under it.
  useEffect(() => {
    if (!('setViewOffset' in camera)) return
    const shift = size.width > 768 ? Math.min(180, size.width * 0.12) : 0
    camera.setViewOffset(size.width, size.height, -shift, 0, size.width, size.height)
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  useEffect(() => {
    if (!target) return
    const end = viewFor(target.lat, target.lon)
    if (first.current) {
      first.current = false
      camera.position.copy(end)
      camera.lookAt(0, 0, 0)
      controls.current?.update()
      invalidate()
      return
    }
    const from = camera.position.clone()
    const r0 = from.length()
    const a = from.clone().normalize()
    const b = end.clone().normalize()
    const angle = a.angleTo(b)
    const axis = new Vector3().crossVectors(a, b)
    if (axis.lengthSq() < 1e-10) axis.set(0, 1, 0)
    axis.normalize()
    const p = { t: 0 }
    const tween = gsap.to(p, {
      t: 1,
      duration: reducedMotion() ? 0 : Math.min(2.2, 0.9 + angle * 0.6),
      ease: 'power3.inOut',
      onUpdate: () => {
        const dir = a.clone().applyAxisAngle(axis, angle * p.t)
        // slight pull-back mid-flight reads as travel, then settle at the viewing distance
        const r = r0 + (VIEW_DIST - r0) * p.t + Math.sin(Math.PI * p.t) * 0.35 * Math.min(1, angle)
        camera.position.copy(dir.multiplyScalar(r))
        camera.lookAt(0, 0, 0)
        controls.current?.update()
        invalidate()
      },
    })
    return () => {
      tween.kill()
    }
  }, [target?.key]) // eslint-disable-line react-hooks/exhaustive-deps -- fly only when the place changes

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.5}
      zoomSpeed={0.6}
      minDistance={1.25}
      maxDistance={9}
    />
  )
}
