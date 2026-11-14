import { useProgress } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { CameraRig } from './CameraRig'
import { Lighting } from './Lighting'
import { MoonGlobe } from './MoonGlobe'
import { MarkerProjector } from './MarkerProjector'
import { SiteMarkers } from './SiteMarkers'
import s from './GlobeCanvas.module.css'

function LoadingNote() {
  const { active, progress } = useProgress()
  if (!active) return null
  return (
    <p className={s.loading} role="status">
      Loading Moon imagery <span className="num">{Math.round(progress)}%</span>
    </p>
  )
}

export function GlobeCanvas() {
  return (
    <div className={s.stage}>
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
      <LoadingNote />
    </div>
  )
}
