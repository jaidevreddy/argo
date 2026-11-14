import type { MissionStats } from '../../core/metrics/mission'
import { MISSION_DAYS } from '../../core/metrics/mission'
import { fmtDuration } from '../../state/useNow'

export interface Row {
  id: string
  label: string
  hint: string
  /** Comparable value; null when not applicable (never "best"). */
  value: (m: MissionStats) => number | null
  better: 'high' | 'low'
  text: (m: MissionStats) => string
}

const pct = (v: number) => `${Math.round(v)}%`
const hours = (h: number) => `${Math.round(h)} h`

/** What a landing gets in its first 30 days. No blended score: each row is one plain quantity. */
export const ROWS: Row[] = [
  {
    id: 'ops', label: 'Power + Earth link', hint: `Hours with sunlight on the panel and Earth in view, first ${MISSION_DAYS} days`,
    value: (m) => m.opsH, better: 'high', text: (m) => hours(m.opsH),
  },
  {
    id: 'first', label: 'First unbroken window', hint: 'Power and link together, starting at touchdown',
    value: (m) => m.firstOpsH, better: 'high',
    text: (m) => (m.firstOpsH === 0 ? 'None at touchdown' : `${m.firstOpsOpen ? 'More than ' : ''}${fmtDuration(m.firstOpsH)}`),
  },
  {
    id: 'sunset', label: 'Sunlight after touchdown', hint: 'Until the Sun is first lost',
    value: (m) => m.sunsetH, better: 'high',
    text: (m) => (m.sunsetH === null ? 'Lands in darkness' : `${m.sunsetOpen ? 'More than ' : ''}${fmtDuration(m.sunsetH)}`),
  },
  { id: 'sunlit', label: 'Sunlit', hint: `Share of the first ${MISSION_DAYS} days`, value: (m) => m.sunlitPct, better: 'high', text: (m) => pct(m.sunlitPct) },
  { id: 'earth', label: 'Earth in view', hint: 'Earth centre above horizon + mask', value: (m) => m.earthPct, better: 'high', text: (m) => pct(m.earthPct) },
  {
    id: 'dark', label: 'Longest dark', hint: 'Battery must last this long',
    value: (m) => m.longestDarkH, better: 'low', text: (m) => (m.longestDarkH > 0 ? fmtDuration(m.longestDarkH) : 'None'),
  },
]

/** Indexes of the best value(s); empty when every column ties or fewer than two are comparable. */
export function bestOf(row: Row, stats: (MissionStats | undefined)[]) {
  const vals = stats.map((m) => (m ? row.value(m) : null))
  const ok = vals.filter((v): v is number => v !== null)
  if (ok.length < 2) return new Set<number>()
  const target = row.better === 'high' ? Math.max(...ok) : Math.min(...ok)
  if (ok.every((v) => Math.abs(v - target) < 0.05)) return new Set<number>()
  return new Set(vals.flatMap((v, i) => (v !== null && Math.abs(v - target) < 0.05 ? [i] : [])))
}
