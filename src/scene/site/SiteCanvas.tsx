import { Canvas } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { ACESFilmicToneMapping } from 'three'
import { heightAt, loadTerrain, type TerrainTile } from '../../data/terrain'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { FarRidges } from './FarRidges'
import { Lander } from './Lander'
import { OverlayProjector } from './OverlayProjector'
import { SiteRig } from './SiteRig'
import { SkyBodies } from './SkyBodies'
import { SunLight } from './SunLight'
import { Terrain } from './Terrain'
import { siteOverlay, useSiteView } from './siteView'
import { useSiteSky } from './useSiteSky'
import s from './SiteCanvas.module.css'

type Load = { id: string; tile: TerrainTile } | { id: string; error: string }

/** 3D site view: the baked DEM tile around the landing site, the true Sun with shadows, Earth at its true size and phase. */
export function SiteCanvas() {
  const target = useTarget()
  const id = target?.site?.terrain ? target.site.id : null
  const [load, setLoad] = useState<Load | null>(null)
  const mode = useSiteView((st) => st.mode)
  const mastM = useScenario((st) => st.mastM)

  useEffect(() => {
    if (!id) return
    let alive = true
    loadTerrain(id).then(
      (tile) => alive && setLoad({ id, tile }),
      (e: Error) => alive && setLoad({ id, error: e.message }),
    )
    return () => {
      alive = false
    }
  }, [id])

  const tile = load && load.id === id && 'tile' in load ? load.tile : null
  const sky = useSiteSky(tile)
  const groundY = useMemo(() => (tile ? heightAt(tile, 0, 0) : 0), [tile])
  const eyeY = groundY + mastM / 1000
  const stand = mode === 'stand'

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
        {tile && sky && (
          <>
            <Terrain tile={tile} fade={!stand} />
            <SunLight sky={sky} tile={tile} />
            {!stand && <Lander groundY={groundY} sunDir={sky.sunDir} earthDir={sky.earthDir} />}
            {stand && <FarRidges tile={tile} eyeY={eyeY} sunDir={sky.sunDir} />}
            <Suspense fallback={null}>
              <SkyBodies sky={sky} />
            </Suspense>
            <SiteRig sky={sky} eyeY={eyeY} tileKey={tile.id} />
            <OverlayProjector sky={sky} siteY={groundY + 0.004} showSite={!stand} />
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
      {!tile && (
        <p className={s.note} role="status">
          {load && 'error' in load ? `Terrain could not load: ${load.error}` : 'Loading terrain'}
        </p>
      )}
    </div>
  )
}
