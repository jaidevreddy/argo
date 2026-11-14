import type { MissionStats } from '../../core/metrics/mission'
import { MISSION_DAYS } from '../../core/metrics/mission'
import s from './CompareView.module.css'

const DAY = 864e5
const LANES = [
  { key: 'lit', label: 'Sunlit', cls: s.laneSun },
  { key: 'comm', label: 'Earth', cls: s.laneEarth },
  { key: 'ops', label: 'Both', cls: s.laneBoth },
] as const

/** 30 days after touchdown: when there is sunlight, Earth, and both. Same scale in every column. */
export function MissionStrip({ m, ticks }: { m: MissionStats; ticks?: boolean }) {
  const x = (ms: number) => `${(100 * ms) / (MISSION_DAYS * DAY)}%`
  return (
    <div className={s.strip}>
      {LANES.map((l) => (
        <div key={l.key} className={s.lane} title={l.label}>
          <span className="visually-hidden">{l.label}</span>
          {m.bands[l.key].map((b, i) => (
            <i key={i} className={l.cls} style={{ left: x(b.start), width: x(b.end - b.start) }} />
          ))}
        </div>
      ))}
      {ticks && (
        <div className={`${s.ticks} num`} aria-hidden="true">
          {[0, 10, 20, 30].map((d) => (
            <span key={d} style={{ left: `${(100 * d) / MISSION_DAYS}%` }}>{d === 0 ? 'Touchdown' : `${d} d`}</span>
          ))}
        </div>
      )}
    </div>
  )
}
