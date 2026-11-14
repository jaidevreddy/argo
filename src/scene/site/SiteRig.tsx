import { OrbitControls } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { dirFromAzEl } from './local'
import { useSiteView } from './siteView'
import type { SiteSky } from './useSiteSky'

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const ORBIT_DIST = 7.5 // km
const ORBIT_EL = 0.5 // rad above the horizontal
const LOOK = 1e-5 // km: target sits a hair in front of the eye, so orbiting it = looking around

/** Orbit pose: the camera sits 50° off the anti-Sun side, so lit slopes face it and shadows run across the frame. */
type Pt = { x: number; y: number; z: number }

function orbitPose(sky: SiteSky, c: Pt) {
  const az = sky.sky.sun.az + sky.northRot + Math.PI - 0.87
  const target = new Vector3(c.x, c.y - 0.4, c.z)
  return { pos: dirFromAzEl(az, ORBIT_EL).multiplyScalar(ORBIT_DIST).add(target), target }
}

function standPose(sky: SiteSky, c: Pt, eyeY: number, facing: 'sun' | 'earth') {
  const dir = facing === 'sun' ? sky.sunDir : sky.earthDir
  // look a little above the body so the horizon sits in the lower third
  const el = Math.min(Math.PI / 2 - 0.2, Math.asin(dir.y) + 0.06)
  const h = Math.hypot(dir.x, dir.z) || 1
  const d = new Vector3((dir.x / h) * Math.cos(el), Math.sin(el), (dir.z / h) * Math.cos(el))
  const pos = new Vector3(c.x, eyeY, c.z)
  return { pos, target: pos.clone().addScaledVector(d, LOOK) }
}

export function SiteRig({ sky, center, eyeY, tileKey }: { sky: SiteSky; center: Pt; eyeY: number; tileKey: string }) {
  const controls = useRef<OrbitControlsImpl>(null)
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const mode = useSiteView((s) => s.mode)
  const facing = useSiteView((s) => s.facing)
  const aimSeq = useSiteView((s) => s.aimSeq)
  const skyRef = useRef(sky)
  useEffect(() => {
    skyRef.current = sky
  }, [sky])

  function fly(to: { pos: Vector3; target: Vector3 }, from: { pos: Vector3; target: Vector3 } | null, duration: number) {
    const c = controls.current
    if (!c) return () => {}
    const p0 = from?.pos ?? camera.position.clone()
    const t0 = from?.target ?? c.target.clone()
    const p = { t: 0 }
    c.minDistance = 0
    c.maxDistance = Infinity
    const apply = () => {
      camera.position.lerpVectors(p0, to.pos, p.t)
      c.target.lerpVectors(t0, to.target, p.t)
      c.update()
      invalidate()
    }
    const tween = gsap.to(p, {
      t: 1,
      duration: reducedMotion() ? 0 : duration,
      ease: 'power3.inOut',
      onUpdate: apply,
      onComplete: () => {
        apply()
        configure(c)
      },
    })
    if (duration === 0 || reducedMotion()) apply()
    return () => tween.kill()
  }

  function configure(c: OrbitControlsImpl) {
    const stand = useSiteView.getState().mode === 'stand'
    c.enableZoom = !stand
    c.enablePan = false
    c.rotateSpeed = stand ? -0.28 : 0.5
    c.minDistance = stand ? 0 : 0.03
    c.maxDistance = stand ? Infinity : 22
    c.minPolarAngle = stand ? 0.15 : 0
    c.maxPolarAngle = stand ? Math.PI - 0.15 : Math.PI / 2 - 0.03
    c.update()
  }

  // Arrival: drop in from high above the site (the hand-off from the globe), then settle into orbit.
  // No run-once guard: StrictMode runs this twice and the first tween is killed by its cleanup,
  // so the second run must start it again.
  useEffect(() => {
    const end = orbitPose(skyRef.current, center)
    if (mode === 'stand') return fly(standPose(skyRef.current, center, eyeY, facing), null, 0)
    const start = { pos: end.pos.clone().sub(end.target).setLength(70).setY(65).add(end.target), target: end.target.clone() }
    return fly(end, start, 2.4)
  }, [tileKey]) // eslint-disable-line react-hooks/exhaustive-deps -- arrival runs once per tile

  // Mode switches and "face Sun / Earth" fly between poses. Time changes don't move the camera.
  const seen = useRef({ mode, aimSeq })
  useEffect(() => {
    if (seen.current.mode === mode && seen.current.aimSeq === aimSeq) return
    seen.current = { mode, aimSeq }
    const to = mode === 'stand' ? standPose(skyRef.current, center, eyeY, facing) : orbitPose(skyRef.current, center)
    return fly(to, null, mode === 'stand' ? 1.8 : 1.6)
  }, [mode, aimSeq]) // eslint-disable-line react-hooks/exhaustive-deps -- only user intent moves the camera

  // Nudged to another point on the same tile: fly there, keeping the current mode.
  const placeKey = `${center.x.toFixed(4)},${center.z.toFixed(4)}`
  const seenPlace = useRef(placeKey)
  useEffect(() => {
    if (seenPlace.current === placeKey) return
    seenPlace.current = placeKey
    const to = useSiteView.getState().mode === 'stand' ? standPose(skyRef.current, center, eyeY, facing) : orbitPose(skyRef.current, center)
    return fly(to, null, 1.4)
  }, [placeKey]) // eslint-disable-line react-hooks/exhaustive-deps -- only a new place moves the camera

  return <OrbitControls ref={controls} makeDefault enableDamping dampingFactor={0.08} zoomSpeed={0.7} onChange={() => invalidate()} />
}
