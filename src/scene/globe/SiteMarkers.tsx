import { useMemo } from 'react'
import type { Vector3 } from 'three'
import { useScenario } from '../../state/scenarioStore'
import { latLonToThree } from '../frame'
import { markerRegistry } from './markerRegistry'
import s from './SiteMarkers.module.css'

interface Marker {
  key: string
  name: string
  pos: Vector3
  selected: boolean
  onSelect?: () => void
}

/** DOM layer of site markers (real buttons, keyboard reachable). Positioned by MarkerProjector. */
export function SiteMarkers() {
  const sites = useScenario((st) => st.sites)
  const target = useScenario((st) => st.target)
  const selectSite = useScenario((st) => st.selectSite)

  const markers = useMemo<Marker[]>(() => {
    const list: Marker[] = sites.map((site) => ({
      key: site.id,
      name: site.name,
      pos: latLonToThree(site.lat, site.lon, 1.003),
      selected: target.kind === 'site' && target.id === site.id,
      onSelect: () => selectSite(site.id),
    }))
    if (target.kind === 'custom') {
      list.push({ key: 'custom', name: 'Custom point', pos: latLonToThree(target.lat, target.lon, 1.003), selected: true })
    }
    return list
  }, [sites, target, selectSite])

  return (
    <div className={s.layer} aria-label="Site markers">
      {markers.map((m) => (
        <div
          key={m.key}
          className={s.wrap}
          style={{ opacity: 0 }}
          ref={(el) => {
            if (!el) return
            markerRegistry.set(m.key, { el, pos: m.pos })
            return () => void markerRegistry.delete(m.key)
          }}
        >
          <button type="button" className={`${s.marker} ${m.selected ? s.selected : ''}`} onClick={m.onSelect} aria-pressed={m.selected} aria-label={m.name}>
            <span className={s.dot} />
          </button>
          <span className={`${s.label} ${m.selected ? s.labelOn : ''}`}>{m.name}</span>
        </div>
      ))}
    </div>
  )
}
