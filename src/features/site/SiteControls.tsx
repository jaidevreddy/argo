import { Navigation2, Sun, Earth } from 'lucide-react'
import { useEffect, useState } from 'react'
import { loadTerrain, type TerrainTile } from '../../data/terrain'
import { useTarget } from '../../state/scenarioStore'
import { siteOverlay, useSiteView, type CamMode } from '../../scene/site/siteView'
import { useSiteSky } from '../../scene/site/useSiteSky'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/Segmented'
import s from './SiteControls.module.css'

/** Camera mode, aim buttons, compass and the provenance caption for the 3D site view. */
export function SiteControls() {
  const mode = useSiteView((st) => st.mode)
  const setMode = useSiteView((st) => st.setMode)
  const face = useSiteView((st) => st.face)
  const target = useTarget()
  const [tile, setTile] = useState<TerrainTile | null>(null)
  const id = target?.site?.terrain ? target.site.id : null
  useEffect(() => {
    let alive = true
    if (id) loadTerrain(id).then((t) => alive && setTile(t), () => {})
    return () => {
      alive = false
    }
  }, [id])
  const sky = useSiteSky(tile && tile.id === id ? tile : null)

  const hidden = sky ? 1 - sky.sunThroughFar : 0

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
        {mode === 'orbit' ? 'Drag to orbit, scroll to zoom.' : 'Drag to look around. Eye at mast height.'} LOLA 40 m terrain, 20 × 20 km, true vertical
        scale. Shadows from the Sun's true position.
        {sky && hidden > 0.005 && (
          <strong className={s.warn}>
            {hidden > 0.995 ? ' Ridges 10–200 km away hide the Sun from the site.' : ` Ridges 10–200 km away hide ${Math.round(hidden * 100)}% of the Sun.`}
          </strong>
        )}
      </p>
    </div>
  )
}
