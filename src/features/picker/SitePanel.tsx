import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { SiteRecord } from '../../data/sites'
import { useScenario } from '../../state/scenarioStore'
import { Panel } from '../../ui/Panel'
import { Field } from '../../ui/Field'
import { CustomPoint } from './CustomPoint'
import s from './SitePanel.module.css'

const GROUPS: { region: SiteRecord['region'][]; title: string }[] = [
  { region: ['south-pole'], title: 'South pole' },
  { region: ['south-high-latitude', 'nearside'], title: 'Near side' },
  { region: ['farside'], title: 'Far side' },
]

const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(2)}°${v < 0 ? neg : pos}`

export function SitePanel() {
  const sites = useScenario((st) => st.sites)
  const sitesStatus = useScenario((st) => st.sitesStatus)
  const target = useScenario((st) => st.target)
  const selectSite = useScenario((st) => st.selectSite)
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? sites.filter((x) => `${x.name} ${x.mission} ${x.agency}`.toLowerCase().includes(q)) : sites
  }, [sites, query])

  return (
    <Panel className={s.panel} role="region" aria-label="Landing sites">
      <div className={s.head}>
        <h2 className={s.title}>Landing sites</h2>
        <Field
          label="Search sites"
          hideLabel
          placeholder="Search missions, agencies"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          icon={<Search size={14} strokeWidth={2} />}
        />
      </div>

      <div className={s.list}>
        {sitesStatus === 'loading' && <p className={s.note}>Loading sites…</p>}
        {sitesStatus === 'error' && <p className={s.note}>Sites could not be loaded. Check your connection and reload.</p>}
        {sitesStatus === 'ready' && filtered.length === 0 && <p className={s.note}>No site matches “{query}”.</p>}
        {GROUPS.map((g) => {
          const items = filtered.filter((x) => g.region.includes(x.region))
          if (!items.length) return null
          return (
            <section key={g.title} className={s.group}>
              <h3 className={s.groupTitle}>{g.title}</h3>
              <ul className={s.items}>
                {items.map((site) => {
                  const on = target.kind === 'site' && target.id === site.id
                  return (
                    <li key={site.id}>
                      <button type="button" className={`${s.row} ${on ? s.on : ''}`} aria-current={on || undefined} onClick={() => selectSite(site.id)}>
                        <span className={s.name}>{site.name}</span>
                        <span className={s.meta}>
                          <span>{site.status === 'candidate' ? 'Candidate region' : site.agency}</span>
                          <span className="num">{coord(site.lat, 'N', 'S')} {coord(site.lon, 'E', 'W')}</span>
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          )
        })}
      </div>

      <CustomPoint />
    </Panel>
  )
}
