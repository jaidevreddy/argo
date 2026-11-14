import { useEffect, useMemo, useState } from 'react'
import { MeshStandardMaterial, Vector3 } from 'three'
import type { TerrainTile } from '../../data/terrain'
import { buildTerrainGeometry } from './terrainGeometry'

/** Regolith albedo ~0.12 in reality; lifted so ACES keeps shadow detail without inventing fill light. */
const REGOLITH = '#8d8a85'

const NOISE = /* glsl */ `
float hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float vnoise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash21(i), hash21(i + vec2(1, 0)), u.x), mix(hash21(i + vec2(0, 1)), hash21(i + vec2(1, 1)), u.x), u.y);
}
// Fine relief below the 40 m data spacing, in km. Each octave fades out before it would alias.
float microRelief(vec2 p) {
  float h = 0.0, amp = 0.0016, freq = 22.0;
  for (int k = 0; k < 4; k++) {
    float w = 1.0 - smoothstep(0.25, 0.6, fwidth(p.x * freq) + fwidth(p.y * freq));
    h += amp * w * (vnoise(p * freq) - 0.5);
    freq *= 2.7;
    amp *= 0.42;
  }
  return h;
}
`

/**
 * Regolith: Lommel-Seeliger reflectance (the Moon has almost no limb darkening, unlike Lambert), plus a fine
 * procedural relief that only adds texture below the LOLA spacing. Heights, slopes and shadows still come from the
 * data; the micro relief is cosmetic and is stated as such in Assumptions.
 */
function regolithMaterial(fade: number, radius: number, sun: { value: Vector3 }) {
  const m = new MeshStandardMaterial({ color: REGOLITH, roughness: 1, metalness: 0 })
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uFade = { value: fade }
    sh.uniforms.uR = { value: radius }
    sh.uniforms.uSun = sun
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vXZ;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvXZ = position.xz;')
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec2 vXZ;\nuniform float uFade;\nuniform float uR;\nuniform vec3 uSun;\n${NOISE}`)
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
        {
          vec3 dpdx = dFdx(-vViewPosition), dpdy = dFdy(-vViewPosition);
          float h = microRelief(vXZ);
          vec3 r1 = cross(dpdy, normal), r2 = cross(normal, dpdx);
          float det = dot(dpdx, r1);
          vec3 grad = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
          normal = normalize(abs(det) * normal - grad);
        }`,
      )
      .replace(
        '#include <opaque_fragment>',
        `{
          vec3 L = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
          vec3 V = normalize(vViewPosition);
          float ci = max(dot(normal, L), 0.0), ce = max(dot(normal, V), 0.05);
          outgoingLight *= min(1.0 / (ci + ce), 2.0); // Lommel-Seeliger / Lambert, ~1 for the low Sun of polar sites
        }
        #include <opaque_fragment>`,
      )
      // Orbit view: the tile fades out radially so it reads as a specimen, not a cut-off slab.
      .replace(
        '#include <dithering_fragment>',
        '#include <dithering_fragment>\ngl_FragColor.rgb *= mix(1.0, 1.0 - smoothstep(uR * 0.8, uR, length(vXZ)), uFade);',
      )
  }
  return m
}

export function Terrain({ tile, fade, sunDir }: { tile: TerrainTile; fade: boolean; sunDir: Vector3 }) {
  const geometry = useMemo(() => buildTerrainGeometry(tile), [tile])
  const [sun] = useState(() => ({ value: new Vector3(0, 1, 0) })) // shared uniform, updated without recompiling
  // A fresh material per mode is fine: the program is cached, only the uniform differs.
  const material = useMemo(() => regolithMaterial(fade ? 1 : 0, ((tile.size - 1) / 2) * tile.stepKm, sun), [fade, tile, sun])
  useEffect(() => {
    sun.value.copy(sunDir)
  }, [sun, sunDir])
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} castShadow receiveShadow />
}
