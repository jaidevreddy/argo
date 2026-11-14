import { useThree } from '@react-three/fiber'
import { useLayoutEffect, useRef } from 'react'
import type { DirectionalLight } from 'three'
import { Vector3 } from 'three'
import type { TerrainTile } from '../../data/terrain'
import { fitShadowCamera } from './shadowFit'
import type { SiteSky } from './useSiteSky'

const SUN_INTENSITY = 3.2
const EARTHSHINE = 0.06 // full Earth; scaled by Earth's lit fraction

/**
 * The Sun as one shadow-casting directional light on the true topocentric vector.
 * Terrain inside the tile shadows itself; ridges 10–200 km away dim the light by the disc fraction they hide
 * (shortcut: that dimming is computed at the site and applied to the whole tile. Points 10 km away see a
 * slightly different far horizon. Upgrade: per-vertex far-horizon visibility baked as an attribute).
 */
export function SunLight({ sky, tile }: { sky: SiteSky; tile: TerrainTile }) {
  const sun = useRef<DirectionalLight>(null)
  const invalidate = useThree((s) => s.invalidate)
  const half = ((tile.size - 1) / 2) * tile.stepKm

  useLayoutEffect(() => {
    const l = sun.current
    if (!l) return
    l.position.copy(sky.sunDir).multiplyScalar(60)
    l.target.position.set(0, 0, 0)
    l.target.updateMatrixWorld()
    fitShadowCamera(l.shadow.camera, l.position, new Vector3(-half, tile.zMinKm, -half), new Vector3(half, tile.zMaxKm + 0.01, half))
    l.shadow.needsUpdate = true
    invalidate()
  }, [sky, tile, half, invalidate])

  return (
    <>
      <directionalLight
        ref={sun}
        intensity={SUN_INTENSITY * sky.sunThroughFar}
        color="#fff6ea"
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={-0.0002}
        shadow-normalBias={0.012}
      />
      <directionalLight position={sky.earthDir.clone().multiplyScalar(60)} intensity={EARTHSHINE * sky.earthLit} color="#bcd4ff" />
    </>
  )
}
