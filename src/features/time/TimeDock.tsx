import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Panel } from '../../ui/Panel'
import s from './TimeDock.module.css'

/** "YYYY-MM-DDTHH:mm" in UTC for <input type="datetime-local">. */
const toInput = (ms: number) => new Date(ms).toISOString().slice(0, 16)
const fromInput = (v: string) => Date.parse(`${v}:00Z`)

const localFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })

export function TimeDock() {
  const utcMs = useScenario((st) => st.utcMs)
  const setTime = useScenario((st) => st.setTime)
  const shiftDays = useScenario((st) => st.shiftDays)
  const target = useTarget()
  const landing = target?.site ? Date.parse(target.site.date) : null
  const landingLabel = target?.site?.status === 'landed' ? 'Landing time' : 'Planning date'

  return (
    <Panel className={s.dock} role="group" aria-label="Date and time">
      <Button variant="quiet" size="sm" onClick={() => shiftDays(-1)} aria-label="One day earlier">
        <ChevronLeft size={16} />
      </Button>
      <label className={s.when}>
        <span className="visually-hidden">Date and time, UTC</span>
        <input
          type="datetime-local"
          className={`${s.input} num`}
          value={toInput(utcMs)}
          step={60}
          onChange={(e) => {
            const t = fromInput(e.target.value)
            if (Number.isFinite(t)) setTime(t)
          }}
        />
        <span className={s.zone}>UTC</span>
      </label>
      <Button variant="quiet" size="sm" onClick={() => shiftDays(1)} aria-label="One day later">
        <ChevronRight size={16} />
      </Button>
      <span className={s.local}>{localFmt.format(utcMs)} your time</span>
      {/* always rendered so the dock never shifts under the cursor */}
      <Button size="sm" onClick={() => landing !== null && setTime(landing)} disabled={landing === null || landing === utcMs}>
        <RotateCcw size={14} /> {landingLabel}
      </Button>
    </Panel>
  )
}
