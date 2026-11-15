import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { Panel } from '../../ui/Panel'
import { DateTimePicker } from '../../ui/DateTimePicker'
import { Segmented } from '../../ui/Segmented'
import { Timeline } from '../timeline/Timeline'
import s from './TimeDock.module.css'

const localFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' })
const H = 3_600_000
type Speed = '1' | '6' | '24'

/** Playback: advance the cursor by `speed` hours per second of real time. */
function usePlayback(playing: boolean, speedH: number) {
  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000)
      last = now
      const st = useScenario.getState()
      st.setTime(st.utcMs + dt * speedH * H)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, speedH])
}

export function TimeDock() {
  const utcMs = useScenario((st) => st.utcMs)
  const setTime = useScenario((st) => st.setTime)
  const shiftDays = useScenario((st) => st.shiftDays)
  const target = useTarget()
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<Speed>('6')
  usePlayback(playing, Number(speed))

  const landing = target?.site ? Date.parse(target.site.date) : null
  const landingLabel = target?.site?.status === 'landed' ? 'Landing time' : 'Planning date'

  return (
    <Panel className={s.dock} role="group" aria-label="Date, time and timeline" data-tour="time">
      <div className={s.bar}>
        <Button variant="quiet" size="sm" onClick={() => setPlaying((p) => !p)} aria-label={playing ? 'Pause' : 'Play'} aria-pressed={playing}>
          {playing ? <Pause size={15} /> : <Play size={15} />}
        </Button>
        <Segmented label="Playback speed" size="sm" value={speed} onChange={setSpeed} options={[{ value: '1', label: '1 h/s' }, { value: '6', label: '6 h/s' }, { value: '24', label: '1 d/s' }]} />
        <span className={s.sep} aria-hidden="true" />
        <Button variant="quiet" size="sm" onClick={() => shiftDays(-1)} aria-label="One day earlier">
          <ChevronLeft size={16} />
        </Button>
        <span title={`${localFmt.format(utcMs)} your time`}>
          <DateTimePicker value={utcMs} onChange={setTime} marks={landing !== null ? [{ ms: landing, label: landingLabel }] : []} />
        </span>
        <Button variant="quiet" size="sm" onClick={() => shiftDays(1)} aria-label="One day later">
          <ChevronRight size={16} />
        </Button>
        <span className={s.spacer} />
        {/* always rendered so the dock never shifts under the cursor */}
        <Button size="sm" onClick={() => landing !== null && setTime(landing)} disabled={landing === null || landing === utcMs}>
          <RotateCcw size={14} /> {landingLabel}
        </Button>
      </div>
      <Timeline />
    </Panel>
  )
}
