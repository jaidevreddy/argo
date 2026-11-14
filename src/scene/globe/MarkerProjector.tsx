import { useFrame, useThree } from '@react-three/fiber'
import { useEffect } from 'react'
import { Vector3 } from 'three'
import { useScenario } from '../../state/scenarioStore'
import { markerRegistry } from './markerRegistry'

const v = new Vector3()
const toCam = new Vector3()
const n = new Vector3()

/** Projects registered DOM markers onto the canvas and fades them out behind the limb. */
export function MarkerProjector() {
  const invalidate = useThree((s) => s.invalidate)
  const sites = useScenario((s) => s.sites)
  const target = useScenario((s) => s.target)
  useEffect(() => invalidate(), [sites, target, invalidate]) // markers changed: draw a frame to place them

  useFrame(({ camera, size }) => {
    for (const { el, pos } of markerRegistry.values()) {
      n.copy(pos).normalize()
      const facing = toCam.copy(camera.position).sub(pos).normalize().dot(n)
      const visible = facing > 0.08
      v.copy(pos).project(camera)
      const x = ((v.x + 1) / 2) * size.width
      const y = ((1 - v.y) / 2) * size.height
      el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      el.style.opacity = visible ? String(Math.min(1, (facing - 0.08) * 6)) : '0'
      el.inert = !visible
    }
  })
  return null
}
