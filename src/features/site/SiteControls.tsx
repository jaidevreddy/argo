import { Navigation2, Sun, Earth } from 'lucide-react'
import { useTarget } from '../../state/scenarioStore'
import { siteOverlay, useSiteView, type CamMode } from '../../scene/site/siteView'
import { useSiteSky } from '../../scene/site/useSiteSky'
import { useSiteTerrain } from '../../scene/site/useSiteTerrain'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/Segmented'
import s from './SiteControls.module.css'

/** Camera mode, aim buttons, compass and the provenance caption for the 3D site view. */
export function SiteControls() {
  const mode = useSiteView((st) => st.mode)
  const setMode = useSiteView((st) => st.setMode)
  const face = useSiteView((st) => st.face)
  const target = useTarget()
  const { tile, far } = useSiteTerrain()
  const sky = useSiteSky(tile, far)

  const hidden = sky ? 1 - sky.sunThroughFar : 0
  const sunElDeg = sky ? (sky.sky.sun.el * 180) / Math.PI : 0
  // Well below the local horizontal it's simply night, not ridges in the way.
  const night = sunElDeg < -2

  return (
    <div className={s.root}>
      <div className={s.bar}>
        <Segmented<CamMode>
          label="Camera"
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'orbit', label: 'Orbit' },
            { value: 'stand', label: 'Stand here' },
          ]}
        />
        <Button size="sm" variant="quiet" onClick={() => face('sun')} aria-label="Stand at the site and face the Sun">
          <Sun size={14} aria-hidden="true" /> Face Sun
        </Button>
        <Button size="sm" variant="quiet" onClick={() => face('earth')} aria-label="Stand at the site and face Earth">
          <Earth size={14} aria-hidden="true" /> Face Earth
        </Button>
        <span className={s.compass} title="North">
          <span ref={(el) => void (siteOverlay.compass = el)} className={s.needle}>
            <Navigation2 size={14} aria-hidden="true" />
          </span>
          <span className="visually-hidden">Compass</span>
        </span>
      </div>
      <p className={s.caption}>
        {mode === 'orbit' ? 'Drag to orbit, scroll to zoom.' : 'Drag to look around. Eye at mast height.'} {target?.site?.terrainRes ?? 'LOLA 40 m'} terrain, 20 × 20 km, true
        vertical scale. Shadows from the Sun's true position.
        {sky && night && <strong className={s.night}> Night: the Sun is {Math.abs(sunElDeg).toFixed(1)}° below the horizon. Earthshine only.</strong>}
        {sky && !night && hidden > 0.005 && (
          <strong className={s.warn}>
            {hidden > 0.995 ? ' Ridges 10–200 km away hide the Sun from the site.' : ` Ridges 10–200 km away hide ${Math.round(hidden * 100)}% of the Sun.`}
          </strong>
        )}
      </p>
    </div>
  )
}
