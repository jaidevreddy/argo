import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { useMemo } from 'react'
import { MeshStandardMaterial, SRGBColorSpace, type Texture } from 'three'

const base = `${import.meta.env.BASE_URL}data/textures`
const URLS = [
  `${base}/moon_color_4k.jpg`,
  `${base}/moon_normal_4k.jpg`,
  `${base}/moon_cap_s_color.jpg`,
  `${base}/moon_cap_s_normal.jpg`,
  `${base}/moon_cap_n_color.jpg`,
  `${base}/moon_cap_n_normal.jpg`,
]
const CAP_T = Math.tan((35 * Math.PI) / 180 / 2) // caps reach 55°; see tools/polar_caps.py

/**
 * Polar caps: an equirectangular map squeezes every column into the pole (radial streaks).
 * Above 58° the shader blends in polar stereographic colour + object-space relief (tools/polar_caps.py),
 * fully from 62°. The mapping has no seam and no singularity at the pole.
 */
function withPolarCaps(m: MeshStandardMaterial, caps: Texture[]) {
  m.onBeforeCompile = (sh) => {
    const [sc, sn, nc, nn] = caps
    Object.assign(sh.uniforms, {
      uCapSC: { value: sc }, uCapSN: { value: sn }, uCapNC: { value: nc }, uCapNN: { value: nn },
      uCapT: { value: CAP_T },
    })
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvObj = position;')
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vObj;
uniform sampler2D uCapSC; uniform sampler2D uCapSN; uniform sampler2D uCapNC; uniform sampler2D uCapNN;
uniform float uCapT;
vec3 capP; float capW; vec2 capUv; float capSouth;`,
      )
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
capP = normalize(vObj);
capSouth = step(capP.y, 0.0);
capW = smoothstep(0.848, 0.883, abs(capP.y)); // sin 58° .. sin 62°
// body-fixed (x, y, z) = (obj.x, -obj.z, obj.y): X = y_bf / ((1+|z|) T), Y = x_bf / ((1+|z|) T)
capUv = vec2(-capP.z, capP.x) / ((1.0 + abs(capP.y)) * uCapT) * 0.5 + 0.5;
vec4 capC = mix(texture2D(uCapNC, capUv), texture2D(uCapSC, capUv), capSouth);
diffuseColor.rgb = mix(diffuseColor.rgb, capC.rgb, capW);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
vec3 capN = mix(texture2D(uCapNN, capUv).xyz, texture2D(uCapSN, capUv).xyz, capSouth) * 2.0 - 1.0;
// object-space normal; the globe mesh has an identity model matrix
normal = normalize(mix(normal, normalize(mat3(viewMatrix) * capN), capW));`,
      )
  }
  m.customProgramCacheKey = () => 'moon-polar-caps'
  return m
}

/** LROC colour + LOLA-derived relief, longitude 0 at texture centre, with polar caps. */
export function MoonGlobe() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const tex = useTexture(URLS, (loaded: Texture | Texture[]) => {
    const t = loaded as Texture[]
    for (const i of [0, 2, 4]) t[i].colorSpace = SRGBColorSpace
    for (const x of t) x.anisotropy = maxAniso
  })
  const material = useMemo(
    () => withPolarCaps(new MeshStandardMaterial({ map: tex[0], normalMap: tex[1], roughness: 1, metalness: 0 }), tex.slice(2)),
    [tex],
  )

  return (
    <mesh material={material}>
      <sphereGeometry args={[1, 256, 128]} />
    </mesh>
  )
}
