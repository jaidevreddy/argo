import { ExternalLink, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { fmtLat, fmtLon, useScenario, useTarget, type View } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Segmented } from '../../ui/Segmented'
import { ValidationDialog } from '../validation/ValidationDialog'
import s from './TopBar.module.css'

const STATUS: Record<string, string> = { landed: 'Landed', candidate: 'Candidate region', reference: 'Reference point' }

export function TopBar() {
  const t = useTarget()
  const view = useScenario((st) => st.view)
  const patch = useScenario((st) => st.patch)
  const [validating, setValidating] = useState(false)
  return (
    <header className={s.bar}>
      <h1 className={s.mark}>Argo</h1>
      {t && (
        <div className={s.place}>
          <span className={s.name}>{t.name}</span>
          <span className={`${s.coords} num`}>
            {fmtLat(t.lat)} {fmtLon(t.lon)}
            {t.site?.elevationM != null && ` · ${Math.round(t.site.elevationM)} m`}
          </span>
          {t.site && <span className={s.tag}>{STATUS[t.site.status]}</span>}
          {t.site && (
            <a className={s.src} href={t.site.source} target="_blank" rel="noreferrer">
              Source <ExternalLink size={12} aria-hidden="true" />
            </a>
          )}
        </div>
      )}
      <div className={s.actions}>
        <Segmented<View> label="View" value={view} onChange={(v) => patch({ view: v })} options={[{ value: 'globe', label: 'Globe' }, { value: 'sky', label: 'Sky chart' }]} />
        <Button size="sm" onClick={() => setValidating(true)}>
          <ShieldCheck size={14} /> Validation
        </Button>
      </div>
      <ValidationDialog open={validating} onClose={() => setValidating(false)} />
    </header>
  )
}
