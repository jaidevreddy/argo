import { MapPin } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useScenario } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import s from './SitePanel.module.css'

function parse(v: string, limit: number) {
  if (v.trim() === '') return { error: 'Required' }
  const n = Number(v.replace('−', '-'))
  if (!Number.isFinite(n)) return { error: 'Enter a number' }
  if (Math.abs(n) > limit) return { error: `Between −${limit} and ${limit}` }
  return { value: n }
}

/**
 * Any point on the Moon, typed (east-positive longitude) or dropped on the globe.
 * The parent remounts this per target, so a pin fills the fields and moving elsewhere clears old errors.
 */
export function CustomPoint({ lat0 = '', lon0 = '' }: { lat0?: string; lon0?: string }) {
  const setCustom = useScenario((st) => st.setCustom)
  const picking = useScenario((st) => st.picking)
  const setPicking = useScenario((st) => st.setPicking)
  const [lat, setLat] = useState(lat0)
  const [lon, setLon] = useState(lon0)
  const [tried, setTried] = useState(false) // errors show after a submit, until the next edit
  const pLat = parse(lat, 90)
  const pLon = parse(lon, 180)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (pLat.value !== undefined && pLon.value !== undefined) setCustom(pLat.value, pLon.value)
  }
  const edit = (set: (v: string) => void) => (e: { target: { value: string } }) => {
    set(e.target.value)
    setTried(false)
  }

  return (
    <form className={s.custom} onSubmit={submit} noValidate>
      <h3 className={s.groupTitle}>Custom point</h3>
      <div className={s.customRow}>
        <Field label="Latitude °" inputMode="decimal" placeholder="−89.45" value={lat} onChange={edit(setLat)} error={tried ? pLat.error : undefined} />
        <Field label="Longitude °E" inputMode="decimal" placeholder="−137.3" value={lon} onChange={edit(setLon)} error={tried ? pLon.error : undefined} />
      </div>
      <div className={s.customActions}>
        <Button size="sm" variant={picking ? 'plain' : 'quiet'} aria-pressed={picking} onClick={() => setPicking(!picking)}>
          <MapPin size={14} aria-hidden="true" /> {picking ? 'Picking…' : 'Pin on globe'}
        </Button>
        <Button type="submit" size="sm" variant="primary">
          Go to point
        </Button>
      </div>
    </form>
  )
}
