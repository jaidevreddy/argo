import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { TerrainTile } from '../../data/terrain'
import { buildTerrainGeometry } from './terrainGeometry'

/** Regolith albedo ~0.12 in reality; lifted so ACES keeps shadow detail without inventing fill light. */
const REGOLITH = '#8d8a85'

function regolithMaterial(fade: number, radius: number) {
  const m = new MeshStandardMaterial({ color: REGOLITH, roughness: 1, metalness: 0 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = { value: fade }
    sh.uniforms.uR = { value: radius }
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = position.xz;')
    // Orbit view: the tile fades out radially so it reads as a specimen, not a cut-off slab.
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vXZ;\nuniform float uFade;\nuniform float uR;')
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.rgb *= mix(1.0, 1.0 - smoothstep(uR * 0.8, uR, length(vXZ)), uFade);',
      )
  }
  return m
}

export function Terrain({ tile, fade }: { tile: TerrainTile; fade: boolean }) {
  const geometry = useMemo(() => buildTerrainGeometry(tile), [tile])
  // A fresh material per mode is fine: the program is cached, only the uniform differs.
  const material = useMemo(() => regolithMaterial(fade ? 1 : 0, ((tile.size - 1) / 2) * tile.stepKm), [fade, tile])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}
