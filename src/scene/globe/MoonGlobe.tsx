import { useTexture } from '@react-three/drei'
import { useThree } from '@react-three/fiber'
import { SRGBColorSpace, type Texture } from 'three'

const base = `${import.meta.env.BASE_URL}data/textures`
const URLS = [`${base}/moon_color_4k.jpg`, `${base}/moon_normal_4k.jpg`]

/** LROC colour + LOLA-derived relief (normal map), longitude 0 at texture centre. */
export function MoonGlobe() {
  const maxAniso = useThree((s) => s.gl.capabilities.getMaxAnisotropy())
  const [color, normal] = useTexture(URLS, (loaded: Texture | Texture[]) => {
    const [c, n] = loaded as Texture[]
    c.colorSpace = SRGBColorSpace
    c.anisotropy = n.anisotropy = maxAniso
  })

  return (
    <mesh>
      <sphereGeometry args={[1, 256, 128]} />
      <meshStandardMaterial map={color} normalMap={normal} roughness={1} metalness={0} />
    </mesh>
  )
}
