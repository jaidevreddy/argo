import { useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect } from 'react'
import { MapPin } from 'lucide-react'
import { useScenario } from '../../state/scenarioStore'
import { ACESFilmicToneMapping } from 'three'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { MoonGlobe } from './MoonGlobe'
import { MarkerProjector } from './MarkerProjector'
import { SiteMarkers } from './SiteMarkers'
import { AreaLoader } from '../../ui/Loaders'
import s from './GlobeCanvas.module.css'

function LoadingNote() {
  const { active, progress } = useProgress()
  if (!active) return null
  return <AreaLoader label="Loading Moon imagery" progress={progress} />
}

function PickHint() {
  const picking = useScenario((st) => st.picking)
  const setPicking = useScenario((st) => st.setPicking)
  useEffect(() => {
    if (!picking) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPicking(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [picking, setPicking])
  if (!picking) return null
  return (
    <div className={s.hint} role="status">
      <MapPin size={14} aria-hidden="true" /> Tap the Moon to drop a point
      <button type="button" className={s.cancel} onClick={() => setPicking(false)}>
        Cancel
      </button>
    </div>
  )
}

export function GlobeCanvas() {
  const picking = useScenario((st) => st.picking)
  return (
    <div className={`${s.stage} ${picking ? s.picking : ''}`}>
      <Canvas
        frameloop="demand"
        dpr={[1, 2]}
        camera={{ fov: 32, near: 0.01, far: 50, position: [0, -2, 4] }}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
        aria-label="Interactive Moon globe. Drag to rotate, scroll to zoom, select a site marker."
      >
        <color attach="background" args={['#050506']} />
        <Lighting />
        <Suspense fallback={null}>
          <MoonGlobe />
        </Suspense>
        <MarkerProjector />
        <CameraRig />
      </Canvas>
      <SiteMarkers />
      <PickHint />
      <LoadingNote />
    </div>
  )
}
