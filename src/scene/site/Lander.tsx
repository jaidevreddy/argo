import { useMemo } from 'react'
import { Quaternion, Vector3 } from 'three'
import { UP } from './useSiteSky'

const M = 0.001 // metres → km
const FOIL = { color: '#b9924c', metalness: 0.65, roughness: 0.38 }
const FRAME = { color: '#9a9a9e', metalness: 0.5, roughness: 0.5 }

/**
 * Generic low-poly lander, 2 m mast. The tracking panel faces the Sun and the dish faces Earth,
 * so the 3D view shows the same pointing the power and link numbers assume.
 */
export function Lander({ groundY, sunDir, earthDir }: { groundY: number; sunDir: Vector3; earthDir: Vector3 }) {
  const panelQ = useMemo(() => new Quaternion().setFromUnitVectors(new Vector3(0, 0, 1), sunDir), [sunDir])
  const dishQ = useMemo(() => new Quaternion().setFromUnitVectors(UP, earthDir), [earthDir])
  const legs = [0, 1, 2, 3].map((i) => (i * Math.PI) / 2 + Math.PI / 4)
  return (
    <group position={[0, groundY, 0]} scale={M}>
      <mesh position={[0, 1.15, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.05, 1.15, 0.9, 8]} />
        <meshStandardMaterial {...FOIL} />
      </mesh>
      {legs.map((a) => (
        <group key={a} rotation={[0, a, 0]}>
          <mesh position={[1.35, 0.55, 0]} rotation={[0, 0, 0.55]} castShadow>
            <cylinderGeometry args={[0.05, 0.05, 1.25, 6]} />
            <meshStandardMaterial {...FRAME} />
          </mesh>
          <mesh position={[1.7, 0.03, 0]} castShadow>
            <cylinderGeometry args={[0.22, 0.22, 0.06, 12]} />
            <meshStandardMaterial {...FRAME} />
          </mesh>
        </group>
      ))}
      <mesh position={[0, 1.95, 0]} castShadow>
        <cylinderGeometry args={[0.04, 0.04, 0.7, 6]} />
        <meshStandardMaterial {...FRAME} />
      </mesh>
      <group position={[0, 2.35, 0]} quaternion={panelQ}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.6, 1.3, 0.04]} />
          <meshStandardMaterial color="#1c2944" metalness={0.35} roughness={0.35} />
        </mesh>
      </group>
      <group position={[0.6, 1.75, 0.6]} quaternion={dishQ}>
        <mesh castShadow>
          <sphereGeometry args={[0.32, 20, 10, 0, Math.PI * 2, Math.PI - Math.PI / 2.6, Math.PI / 2.6]} />
          <meshStandardMaterial color="#e7e7e9" roughness={0.6} side={2} />
        </mesh>
      </group>
    </group>
  )
}
