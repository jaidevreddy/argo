import { CheckCircle2, CircleSlash, GitCompareArrows, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'
import { useCompute } from '../../state/computeStore'
import { fmtDuration, useNow } from '../../state/useNow'
import { useScenario } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Panel } from '../../ui/Panel'
import { Segmented } from '../../ui/Segmented'
import { Assumptions } from './Assumptions'
import s from './VerdictPanel.module.css'

const deg = (v: number) => `${v >= 0 ? '' : '−'}${Math.abs(v).toFixed(2)}°`
const pct = (v: number) => `${Math.round(v)}%`
const dateFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })

function countdown(label: string, left: { hours: number; atLeast: boolean } | null, nextH: number | null, risingLabel: string, noneLabel: string) {
  if (left) return `${label} ${left.atLeast ? 'in more than' : 'in'} ${fmtDuration(left.hours)}`
  if (nextH !== null) return `${risingLabel} in ${fmtDuration(nextH)}`
  return noneLabel
}

function Row({ name, value, swatch, children }: { name: string; value: ReactNode; swatch?: string; children: ReactNode }) {
  return (
    <div className={s.row}>
      <div className={s.rowHead}>
        <span className={s.rowName}>
          {swatch && <span className={s.swatch} style={{ background: swatch }} aria-hidden="true" />}
          {name}
        </span>
        <span className={`${s.value} num`}>{value}</span>
      </div>
      <div className={s.sub}>{children}</div>
    </div>
  )
}

export function VerdictPanel() {
  const now = useNow()
  const result = useCompute((st) => st.result)
  const status = useCompute((st) => st.status)
  const horizon = useCompute((st) => st.horizon)
  const panel = useScenario((st) => st.panel)
  const maskDeg = useScenario((st) => st.maskDeg)
  const patch = useScenario((st) => st.patch)
  const addCompare = useScenario((st) => st.addCompare)

  const power = now ? now.sun.visible > 0 : false
  const link = now ? now.earth.up : false
  const verdict = power && link ? { icon: <CheckCircle2 size={15} />, text: 'Power and Earth link', tone: s.ok }
    : power ? { icon: <TriangleAlert size={15} />, text: 'Power, no Earth link', tone: s.warn }
    : link ? { icon: <TriangleAlert size={15} />, text: 'Earth link, no sunlight', tone: s.warn }
    : { icon: <CircleSlash size={15} />, text: 'Dark and no Earth link', tone: s.bad }

  const t = result?.series.t
  const range = t ? `${dateFmt.format(t[0])} – ${dateFmt.format(t[t.length - 1])}` : ''

  return (
    <Panel className={s.panel} role="region" aria-label="Power and communication verdict">
      <section className={s.section} aria-live="polite">
        <div className={`${s.head} ${s.sticky}`}>
          <h2 className={s.title}>At this moment</h2>
          {now && <span className={`${s.badge} ${verdict.tone}`}>{verdict.icon}{verdict.text}</span>}
        </div>
        {!now ? (
          <p className={s.note}>Loading horizon…</p>
        ) : (
          <div className={s.rows}>
            <Row name="Sun" swatch="var(--sun)" value={deg(now.sun.elDeg)}>
              <span className="num">{deg(now.sun.clearanceDeg)}</span> vs horizon · <span className="num">{pct(now.sun.visible * 100)}</span> of disc visible
              <strong className={s.count}>
                {now.ready ? countdown('Sunset', now.sun.sunset, now.sun.sunriseH, 'Sunrise', 'No sunrise in this window') : 'Computing…'}
              </strong>
            </Row>
            <Row name="Earth" swatch="var(--earth)" value={deg(now.earth.elDeg)}>
              <span className="num">{deg(now.earth.clearanceDeg)}</span> vs horizon{maskDeg > 0 && ` + ${maskDeg}° mask`}
              <strong className={s.count}>
                {now.ready ? countdown('Earthset', now.earth.earthset, now.earth.earthriseH, 'Earthrise', 'Earth never rises in this window') : 'Computing…'}
              </strong>
            </Row>
            <Row name="Power" value={pct(now.sun.power * 100)}>
              <span className={s.meter} aria-hidden="true"><span style={{ width: `${now.sun.power * 100}%` }} /></span>
              {panel === 'tracking' ? 'Sun-tracking panel' : 'Flat panel (scales with sin of Sun elevation)'}
            </Row>
          </div>
        )}
      </section>

      <section className={s.section}>
        <div className={s.head}>
          <h2 className={s.title}>Over the window</h2>
          <span className={`${s.range} num`}>{status === 'computing' ? 'Computing…' : range}</span>
        </div>
        {result && (
          <dl className={s.stats}>
            <div><dt>Sunlit</dt><dd className="num">{pct(result.stats.sunlitPct)}</dd></div>
            <div><dt>Earth in view</dt><dd className="num">{pct(result.stats.earthPct)}</dd></div>
            <div><dt>Power + link</dt><dd className="num">{pct(result.stats.opsPct)}</dd></div>
            <div><dt>Longest dark</dt><dd className="num">{result.stats.longestDarkH > 0 ? fmtDuration(result.stats.longestDarkH) : 'None'}</dd></div>
          </dl>
        )}
      </section>

      <section className={`${s.section} ${s.controls}`}>
        <Segmented label="Panel type" size="sm" value={panel} onChange={(v) => patch({ panel: v })} options={[{ value: 'tracking', label: 'Tracking' }, { value: 'flat', label: 'Flat' }]} />
        <Segmented
          label="Earth elevation mask"
          size="sm"
          value={String(maskDeg) as '0' | '2' | '5'}
          onChange={(v) => patch({ maskDeg: Number(v) })}
          options={[{ value: '0', label: '0° mask' }, { value: '2', label: '2°' }, { value: '5', label: '5°' }]}
        />
        <Button
          size="sm"
          variant="quiet"
          onClick={() => {
            addCompare()
            patch({ view: 'compare' })
          }}
        >
          <GitCompareArrows size={14} aria-hidden="true" /> Compare and nudge
        </Button>
      </section>

      <footer className={s.foot}>
        <span className={s.horizon}>{horizon?.label ?? '…'}</span>
        <Assumptions />
      </footer>
    </Panel>
  )
}
