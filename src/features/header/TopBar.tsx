import { ExternalLink } from 'lucide-react'
import { fmtLat, fmtLon, useTarget } from '../../state/scenarioStore'
import s from './TopBar.module.css'

const STATUS: Record<string, string> = { landed: 'Landed', candidate: 'Candidate region', reference: 'Reference point' }

export function TopBar() {
  const t = useTarget()
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
    </header>
  )
}
