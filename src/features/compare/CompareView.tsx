import { ArrowUpRight, Check, Plus, RefreshCw, X } from 'lucide-react'
import { MISSION_DAYS } from '../../core/metrics/mission'
import { encodeItem } from '../../state/codec'
import { MAX_COMPARE, useScenario } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Panel } from '../../ui/Panel'
import { MissionStrip } from './MissionStrip'
import { NudgePanel } from './NudgePanel'
import { ROWS, bestOf } from './rows'
import { useCompare } from './useCompare'
import s from './CompareView.module.css'

const when = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })
const ARTEMIS = ['shackleton-ridge', 'connecting-ridge', 'malapert-massif']

/** Up to three landings on the same 30-day test, then Nudge for the one being viewed. */
export function CompareView() {
  const { items, runs } = useCompare()
  const target = useScenario((x) => x.target)
  const utcMs = useScenario((x) => x.utcMs)
  const addCompare = useScenario((x) => x.addCompare)
  const removeCompare = useScenario((x) => x.removeCompare)
  const openCompare = useScenario((x) => x.openCompare)
  const patch = useScenario((x) => x.patch)
  const patchCompare = (compare: []) => patch({ compare })
  const panel = useScenario((x) => x.panel)
  const maskDeg = useScenario((x) => x.maskDeg)
  const current = { target, utcMs }
  const inList = items.some((i) => i.key === encodeItem(current))
  const stats = items.map((i) => runs?.stats[i.key])
  const best = ROWS.map((r) => bestOf(r, stats))

  const addArtemis = () => {
    for (const id of ARTEMIS) addCompare({ target: { kind: 'site', id }, utcMs })
  }

  return (
    <Panel className={s.panel} role="region" aria-label="Compare landings">
      <header className={s.head}>
        <div>
          <h2 className={s.title}>Compare landings</h2>
          <p className={s.subtitle}>
            First {MISSION_DAYS} days after each touchdown · {panel === 'tracking' ? 'tracking' : 'flat'} panel · {maskDeg}° Earth mask · terrain horizon at each spot
          </p>
        </div>
        <span className={s.headActions}>
          {items.length > 0 && (
            <Button size="sm" variant="quiet" onClick={() => patchCompare([])}>
              Clear all
            </Button>
          )}
          <Button size="sm" onClick={() => addCompare()} disabled={inList} title={inList ? 'Already in the list' : items.length >= MAX_COMPARE ? 'The list holds three: this replaces the oldest' : undefined}>
            {items.length >= MAX_COMPARE ? <RefreshCw size={14} aria-hidden="true" /> : <Plus size={14} aria-hidden="true" />}
            {inList ? 'Added' : items.length >= MAX_COMPARE ? 'Replace oldest' : 'Add current'}
          </Button>
        </span>
      </header>

      <div className={s.body}>
        {items.length === 0 ? (
          <div className={s.empty}>
            <p className={s.emptyTitle}>Put up to three landings side by side</p>
            <p className={s.emptyText}>Different sites on one date, or one site on different dates. Each gets the same test: what the first {MISSION_DAYS} days give you in power and Earth link.</p>
            <div className={s.emptyActions}>
              <Button onClick={() => addCompare()}>
                <Plus size={14} aria-hidden="true" /> Add current scenario
              </Button>
              <Button variant="quiet" onClick={addArtemis}>Try the three Artemis ridge sites</Button>
            </div>
          </div>
        ) : (
          <div className={s.table} role="table" aria-label="Landing comparison" style={{ gridTemplateColumns: `minmax(140px, 0.9fr) repeat(${items.length}, minmax(0, 1fr))` }}>
            <div role="row" className={s.rowContents}>
              <span role="columnheader" className={s.corner} />
              {items.map((it, i) => (
                <div role="columnheader" key={it.key} className={s.colHead}>
                  <span className={s.colName}>{it.target?.name ?? 'Unknown site'}</span>
                  <span className={`${s.colDate} num`}>{when.format(it.utcMs)} UTC</span>
                  <span className={s.colActions}>
                    <Button size="sm" variant="quiet" onClick={() => openCompare(i)} aria-label={`Open ${it.target?.name ?? 'scenario'}`}>
                      <ArrowUpRight size={14} aria-hidden="true" /> Open
                    </Button>
                    <Button size="sm" variant="quiet" onClick={() => removeCompare(i)} aria-label={`Remove ${it.target?.name ?? 'scenario'}`}>
                      <X size={14} aria-hidden="true" /> Remove
                    </Button>
                  </span>
                </div>
              ))}
            </div>
            {ROWS.map((r, ri) => (
              <div role="row" key={r.id} className={s.rowContents}>
                <div role="rowheader" className={s.rowHead}>
                  <span className={r.id === 'ops' ? s.rowLabelMain : s.rowLabel}>{r.label}</span>
                  <span className={s.rowHint}>{r.hint}</span>
                </div>
                {items.map((it, i) => {
                  const m = stats[i]
                  const isBest = best[ri].has(i)
                  return (
                    <div role="cell" key={it.key} className={`${s.cell} ${r.id === 'ops' ? s.cellMain : ''} ${isBest ? s.best : ''}`}>
                      {m ? (
                        <>
                          <span className="num">{r.text(m)}</span>
                          {isBest && (
                            <span className={s.bestTag}>
                              <Check size={12} aria-hidden="true" /> Best
                            </span>
                          )}
                        </>
                      ) : (
                        <span className={s.pending}>{runs?.status === 'error' ? 'Failed' : 'Computing…'}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            ))}
            <div role="row" className={s.rowContents}>
              <div role="rowheader" className={s.rowHead}>
                <span className={s.rowLabel}>First {MISSION_DAYS} days</span>
                <span className={s.legend}>
                  <i className={s.laneSun} /> Sunlit <i className={s.laneEarth} /> Earth <i className={s.laneBoth} /> Both
                </span>
              </div>
              {items.map((it, i) => (
                <div role="cell" key={it.key} className={s.cell}>
                  {stats[i] ? <MissionStrip m={stats[i]!} ticks /> : <span className={s.pending}>Computing…</span>}
                </div>
              ))}
            </div>
          </div>
        )}
        {runs?.error && <p className={s.error}>Could not compute: {runs.error}</p>}
        <NudgePanel />
      </div>
    </Panel>
  )
}
