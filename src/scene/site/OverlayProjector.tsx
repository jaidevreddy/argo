import { useFrame } from '@react-three/fiber'
import { Vector3 } from 'three'
import { headingOf } from './local'
import { siteOverlay } from './siteView'
import type { SiteSky } from './useSiteSky'

const v = new Vector3()
const fwd = new Vector3()

function place(el: HTMLElement | null, world: Vector3 | null, w: number, h: number, camera: Parameters<Parameters<typeof useFrame>[0]>[0]['camera']) {
  if (!el) return
  if (!world) {
    el.style.visibility = 'hidden'
    return
  }
  v.copy(world).project(camera)
  const on = v.z < 1 && Math.abs(v.x) < 1.05 && Math.abs(v.y) < 1.05
  el.style.visibility = on ? 'visible' : 'hidden'
  if (on) el.style.transform = `translate3d(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px, 0)`
}

/** Writes compass heading and label positions straight to the DOM each frame. */
export function OverlayProjector({ sky, site, showSite }: { sky: SiteSky; site: Vector3; showSite: boolean }) {
  useFrame(({ camera, size }) => {
    camera.getWorldDirection(fwd)
    if (siteOverlay.compass) siteOverlay.compass.style.transform = `rotate(${(-headingOf(fwd) * 180) / Math.PI}deg)`
    place(siteOverlay.pins.site, showSite ? site : null, size.width, size.height, camera)
    place(siteOverlay.pins.sun, camera.position.clone().addScaledVector(sky.sunDir, 300), size.width, size.height, camera)
    place(siteOverlay.pins.earth, camera.position.clone().addScaledVector(sky.earthDir, 300), size.width, size.height, camera)
  })
  return null
}
