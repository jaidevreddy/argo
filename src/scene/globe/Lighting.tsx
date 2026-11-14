import { useMemo } from 'react'
import { useScenario } from '../../state/scenarioStore'
import { bodyDirections } from '../frame'

/** One hard Sun on the true Sun vector for the chosen time, plus faint earthshine from Earth's direction. */
export function Lighting() {
  const utcMs = useScenario((s) => s.utcMs)
  const { sun, earth } = useMemo(() => bodyDirections(utcMs), [utcMs])
  return (
    <>
      <directionalLight position={sun.clone().multiplyScalar(10)} intensity={3.4} color="#fff8ef" />
      <directionalLight position={earth.clone().multiplyScalar(10)} intensity={0.05} color="#bcd7ff" />
    </>
  )
}
