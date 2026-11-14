import { useEffect, useMemo } from 'react'
import { BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from 'three'
import type { FarProfile } from './useSiteSky'

const RING_KM = 40 // well past the 10 km tile edge, well inside the sky bodies at 300 km
const FOOT = (-6 * Math.PI) / 180
const SMOOTH = 8 // samples

/**
 * Terrain 10–200 km away, drawn as a silhouette band at its true elevation angle from the eye.
 * Only meaningful from the stand-here camera (it's a profile seen from the site), so the rig shows it there only.
 */
function ringGeometry(far: FarProfile, eyeY: number, rot: number) {
  const n = far.el.length
  const pos = new Float32Array((n + 1) * 2 * 3)
  const nrm = new Float32Array((n + 1) * 2 * 3)
  const nrmV = new Vector3()
  for (let i = 0; i <= n; i++) {
    const az = (i % n) * far.azStep + rot // point-frame azimuth → scene heading
    const x = Math.sin(az), z = -Math.cos(az)
    const top = eyeY + RING_KM * Math.tan(far.el[i % n])
    const foot = eyeY + RING_KM * Math.tan(FOOT)
    const k = i * 6
    pos.set([x * RING_KM, foot, z * RING_KM, x * RING_KM, top, z * RING_KM], k)
    // Faces the site, tipped up like a slope, and turned along the ring by the profile's own gradient,
    // so rising and falling ridgelines catch the Sun differently instead of reading as one flat wall.
    // gradient over ±4° (0.5° samples are too noisy: they shade as vertical stripes)
    const grad = (far.el[(i + SMOOTH) % n] - far.el[(i - SMOOTH + n) % n]) / (2 * SMOOTH * far.azStep)
    nrmV.set(-x, 0.35, -z).addScaledVector(new Vector3(Math.cos(az), 0, Math.sin(az)), Math.max(-1, Math.min(1, grad * 12))).normalize()
    nrm.set([nrmV.x, nrmV.y, nrmV.z, nrmV.x, nrmV.y, nrmV.z], k)
  }
  const idx: number[] = []
  for (let i = 0; i < n; i++) {
    const a = i * 2
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setAttribute('normal', new BufferAttribute(nrm, 3))
  g.setAttribute('aTop', new BufferAttribute(Float32Array.from({ length: (n + 1) * 2 }, (_, j) => j % 2), 1))
  g.setIndex(idx)
  return g
}

// Distant peaks keep their own sunlight even when ridges hide the Sun from the site.
const vert = /* glsl */ `
attribute float aTop;
varying vec3 vN; varying float vH;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() { vN = normalize(normal); vH = aTop; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
#include <logdepthbuf_vertex>
}`
const frag = /* glsl */ `
uniform vec3 uSun; uniform vec3 uColor;
varying vec3 vN; varying float vH;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  float lit = max(dot(normalize(vN), uSun), 0.0) * smoothstep(-0.02, 0.01, uSun.y + 0.02);
  // nearer terrain hides the foot of distant ridges; their sunlit tops carry the light
  gl_FragColor = vec4(uColor * (0.01 + lit * 1.15 * mix(0.08, 1.0, vH * vH * vH)), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function FarRidges({ far, center, eyeY, rot, sunDir }: { far: FarProfile; center: { x: number; z: number }; eyeY: number; rot: number; sunDir: Vector3 }) {
  const geometry = useMemo(() => ringGeometry(far, eyeY, rot), [far, eyeY, rot])
  const material = useMemo(
    () => new ShaderMaterial({ vertexShader: vert, fragmentShader: frag, uniforms: { uSun: { value: new Vector3() }, uColor: { value: new Vector3(0.27, 0.26, 0.245) } } }),
    [],
  )
  material.uniforms.uSun.value.copy(sunDir)
  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => material.dispose(), [material])
  return <mesh geometry={geometry} material={material} position={[center.x, 0, center.z]} />
}
