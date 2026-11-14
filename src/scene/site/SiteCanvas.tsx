import { Canvas } from '@react-three/fiber'
import { Suspense, useMemo } from 'react'
import { ACESFilmicToneMapping, Vector3 } from 'three'
import { FarRidges } from './FarRidges'
import { Lander } from './Lander'
import { OverlayProjector } from './OverlayProjector'
import { SiteRig } from './SiteRig'
import { SkyBodies } from './SkyBodies'
import { SunLight } from './SunLight'
import { Terrain } from './Terrain'
import { siteOverlay, useSiteView } from './siteView'
import { useSiteSky } from './useSiteSky'
import { useSiteTerrain } from './useSiteTerrain'
import { AreaLoader } from '../../ui/Loaders'
import s from './SiteCanvas.module.css'

/** 3D site view: the baked DEM tile around the landing site, the true Sun with shadows, Earth at its true size and phase. */
export function SiteCanvas() {
  const { id, tile, error, far, center, eyeY } = useSiteTerrain()
  const mode = useSiteView((st) => st.mode)
  const sky = useSiteSky(tile, far)
  const stand = mode === 'stand'
  const pin = useMemo(() => new Vector3(center.x, center.y + 0.004, center.z), [center.x, center.y, center.z])

  return (
    <div className={s.stage}>
      <Canvas
        key={id ?? 'none'}
        frameloop="demand"
        shadows="percentage"
        dpr={[1, 2]}
        camera={{ fov: 45, near: 0.0005, far: 2000, position: [0, 60, 60] }}
        gl={{ antialias: true, logarithmicDepthBuffer: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1 }}
        aria-label="3D terrain around the landing site. Drag to orbit or look around, scroll to zoom."
      >
        <color attach="background" args={['#050506']} />
        {tile && sky && far && (
          <>
            <Terrain tile={tile} fade={!stand} sunDir={sky.sunDir} />
            <SunLight sky={sky} tile={tile} />
            {!stand && <Lander at={center} sunDir={sky.sunDir} earthDir={sky.earthDir} />}
            {stand && <FarRidges far={far} center={center} eyeY={eyeY} rot={sky.northRot} sunDir={sky.sunDir} />}
            <Suspense fallback={null}>
              <SkyBodies sky={sky} />
            </Suspense>
            <SiteRig sky={sky} center={center} eyeY={eyeY} tileKey={tile.id} />
            <OverlayProjector sky={sky} site={pin} showSite={!stand} />
          </>
        )}
      </Canvas>
      <div className={s.pins} aria-hidden="true">
        <span ref={(el) => void (siteOverlay.pins.site = el)} className={s.pin}>
          <i className={s.siteDot} />
          Landing site
        </span>
        <span ref={(el) => void (siteOverlay.pins.sun = el)} className={`${s.pin} ${s.body}`}>
          {sky && `Sun ${((sky.sky.sun.el * 180) / Math.PI).toFixed(1)}°`}
        </span>
        <span ref={(el) => void (siteOverlay.pins.earth = el)} className={`${s.pin} ${s.body}`}>
          {sky && `Earth ${((sky.sky.earth.el * 180) / Math.PI).toFixed(1)}°`}
        </span>
      </div>
      {!tile && error && (
        <p className={s.note} role="alert">
          Terrain could not load: {error}
        </p>
      )}
      {!tile && !error && <AreaLoader label="Loading terrain" />}
    </div>
  )
}
