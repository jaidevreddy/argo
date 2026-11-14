import { useState, type FormEvent } from 'react'
import { useScenario } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Field } from '../../ui/Field'
import s from './SitePanel.module.css'

function parse(v: string, limit: number) {
  if (v.trim() === '') return { error: 'Required' }
  const n = Number(v)
  if (!Number.isFinite(n)) return { error: 'Enter a number' }
  if (Math.abs(n) > limit) return { error: `Between −${limit} and ${limit}` }
  return { value: n }
}

/** Any point on the Moon by selenographic coordinates (east-positive longitude). */
export function CustomPoint() {
  const setCustom = useScenario((st) => st.setCustom)
  const [lat, setLat] = useState('')
  const [lon, setLon] = useState('')
  const [tried, setTried] = useState(false)
  const pLat = parse(lat, 90)
  const pLon = parse(lon, 180)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTried(true)
    if (pLat.value !== undefined && pLon.value !== undefined) setCustom(pLat.value, pLon.value)
  }

  return (
    <form className={s.custom} onSubmit={submit} noValidate>
      <h3 className={s.groupTitle}>Custom point</h3>
      <div className={s.customRow}>
        <Field label="Latitude °" inputMode="decimal" placeholder="−89.45" value={lat} onChange={(e) => setLat(e.target.value)} error={tried ? pLat.error : undefined} />
        <Field label="Longitude °E" inputMode="decimal" placeholder="−137.3" value={lon} onChange={(e) => setLon(e.target.value)} error={tried ? pLon.error : undefined} />
      </div>
      <Button type="submit" size="sm">Go to point</Button>
    </form>
  )
}
