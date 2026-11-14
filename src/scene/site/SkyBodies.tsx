import { useTexture } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import { AdditiveBlending, CanvasTexture, Color, Group, Quaternion, ShaderMaterial, SRGBColorSpace, Vector3 } from 'three'
import type { SiteSky } from './useSiteSky'

/** Bodies ride with the camera (like a skybox) so their direction is exact from any viewpoint. */
const SKY_KM = 300
const tex = `${import.meta.env.BASE_URL}data/textures`

function glowTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 128
  const g = c.getContext('2d')!
  const grd = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  grd.addColorStop(0, 'rgba(255,244,226,0.9)')
  grd.addColorStop(0.12, 'rgba(255,236,206,0.35)')
  grd.addColorStop(0.4, 'rgba(255,226,190,0.06)')
  grd.addColorStop(1, 'rgba(255,220,180,0)')
  g.fillStyle = grd
  g.fillRect(0, 0, 128, 128)
  const t = new CanvasTexture(c)
  t.colorSpace = SRGBColorSpace
  return t
}

const earthVert = /* glsl */ `
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_vertex>
void main() {
  vUv = uv;
  vN = normalize(mat3(modelMatrix) * normal);
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
  #include <logdepthbuf_vertex>
}`

// Lambert day side from the true Sun (Earth's phase), clouds from the texture alpha, a thin Rayleigh-blue rim.
const earthFrag = /* glsl */ `
uniform sampler2D uDay; uniform sampler2D uClouds; uniform vec3 uSun;
varying vec2 vUv; varying vec3 vN; varying vec3 vW;
#include <common>
#include <logdepthbuf_pars_fragment>
void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize(vN);
  vec3 v = normalize(cameraPosition - vW);
  float sun = dot(n, uSun);
  float lit = smoothstep(-0.04, 0.18, sun);
  vec3 day = texture2D(uDay, vUv).rgb;
  float cloud = texture2D(uClouds, vUv).a;
  day = mix(day, vec3(0.95), cloud * 0.85);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
  vec3 col = day * lit * 1.5 + vec3(0.30, 0.55, 1.0) * rim * smoothstep(-0.25, 0.35, sun) * 0.9;
  gl_FragColor = vec4(col, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}`

export function SkyBodies({ sky }: { sky: SiteSky }) {
  const rig = useRef<Group>(null)
  const [day, clouds] = useTexture([`${tex}/earth_2048.jpg`, `${tex}/earth_clouds_1024.png`], (ts) => {
    for (const t of ts) {
      t.colorSpace = SRGBColorSpace
      t.anisotropy = 4
    }
  })
  const glow = useMemo(() => glowTexture(), [])
  const earthMat = useMemo(
    () => new ShaderMaterial({ vertexShader: earthVert, fragmentShader: earthFrag, uniforms: { uDay: { value: day }, uClouds: { value: clouds }, uSun: { value: new Vector3() } } }),
    [day, clouds],
  )
  earthMat.uniforms.uSun.value.copy(sky.sunDir)

  const sunR = SKY_KM * Math.tan(sky.sky.sun.angularRadius)
  const earthR = SKY_KM * Math.sin(sky.sky.earth.angularRadius)
  const sunPos = sky.sunDir.clone().multiplyScalar(SKY_KM)
  const earthPos = sky.earthDir.clone().multiplyScalar(SKY_KM)
  const earthQuat = useMemo(() => new Quaternion().setFromRotationMatrix(sky.earthBasis), [sky.earthBasis])

  useFrame(({ camera }) => {
    rig.current?.position.copy(camera.position)
    // the Sun disc and glow face the camera
    rig.current?.children[0]?.quaternion.copy(camera.quaternion)
  })

  return (
    <group ref={rig}>
      <group position={sunPos}>
        <mesh renderOrder={-1}>
          <circleGeometry args={[sunR, 48]} />
          <meshBasicMaterial color={new Color(1.0, 0.97, 0.92).multiplyScalar(6)} toneMapped />
        </mesh>
        <sprite scale={[sunR * 14, sunR * 14, 1]} renderOrder={-1}>
          <spriteMaterial map={glow} blending={AdditiveBlending} transparent depthWrite={false} opacity={0.75} />
        </sprite>
      </group>
      <mesh position={earthPos} quaternion={earthQuat} material={earthMat}>
        <sphereGeometry args={[earthR, 64, 32]} />
      </mesh>
    </group>
  )
}
