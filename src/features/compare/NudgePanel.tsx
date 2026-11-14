import { ArrowUpRight, Plus } from 'lucide-react'
import type { MissionStats } from '../../core/metrics/mission'
import { nudgeLabel } from '../../data/nudge'
import { useSiteTerrain } from '../../scene/site/useSiteTerrain'
import { useScenario } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { MAP_KM, NudgeMap } from './NudgeMap'
import { NUDGE_DAYS, useNudge } from './useNudge'
import s from './CompareView.module.css'

const DAY = 864e5
const signed = (h: number) => `${h > 0.5 ? '+' : h < -0.5 ? '−' : '±'}${Math.abs(Math.round(h))} h`
const dayLabel = (d: number) => `${Math.abs(d)} day${Math.abs(d) > 1 ? 's' : ''} ${d < 0 ? 'earlier' : 'later'}`

interface Move {
  key: string
  label: string
  delta: number
  m: MissionStats
  go: () => void
  add: () => void
}

/** Would a short move or a short wait buy more power + link hours? */
export function NudgePanel() {
  const { site, target, landing, runs, currentKey } = useNudge()
  const { tile } = useSiteTerrain()
  const nudgeTo = useScenario((x) => x.nudgeTo)
  const setTime = useScenario((x) => x.setTime)
  const addCompare = useScenario((x) => x.addCompare)

  if (!site || !target) {
    return (
      <section className={s.nudge}>
        <h3 className={s.nudgeTitle}>Nudge</h3>
        <p className={s.nudgeNote}>Nudge works on the listed sites, where terrain around the spot is baked. Custom points get the ideal sphere.</p>
      </section>
    )
  }

  const stats = runs?.stats ?? {}
  const cur = stats[currentKey]
  const base = { kind: 'site' as const, id: site.id }
  const moves: Move[] = cur
    ? [
        ...(currentKey !== 'base' && stats.base
          ? [{ key: 'base', label: 'The listed spot', delta: stats.base.opsH - cur.opsH, m: stats.base, go: () => nudgeTo(null), add: () => addCompare({ target: base, utcMs: landing }) }]
          : []),
        ...site.nudgePoints!.flatMap((_, i) => {
          const m = stats[`p${i}`]
          if (!m || `p${i}` === currentKey) return []
          return [{ key: `p${i}`, label: nudgeLabel(i), delta: m.opsH - cur.opsH, m, go: () => nudgeTo(i), add: () => addCompare({ target: { ...base, at: i }, utcMs: landing }) }]
        }),
        ...NUDGE_DAYS.flatMap((d) => {
          const m = stats[`d${d}`]
          if (!m) return []
          return [{ key: `d${d}`, label: dayLabel(d), delta: m.opsH - cur.opsH, m, go: () => setTime(landing + d * DAY), add: () => addCompare({ target: target.at === null ? base : { ...base, at: target.at }, utcMs: landing + d * DAY }) }]
        }),
      ]
    : []
  const better = moves.filter((m) => m.delta > 0.5).sort((a, b) => b.delta - a.delta).slice(0, 3)
  const bestPlace = moves.filter((m) => m.key.startsWith('p') || m.key === 'base').sort((a, b) => b.delta - a.delta)[0]
  const pos = (e: number, n: number) => ({ left: `${((e / MAP_KM + 1) / 2) * 100}%`, top: `${((1 - n / MAP_KM) / 2) * 100}%` })
  const points = [{ key: 'base', e: 0, n: 0, label: 'Listed spot' }, ...site.nudgePoints!.map((p, i) => ({ key: `p${i}`, e: p[0], n: p[1], label: nudgeLabel(i) }))]

  return (
    <section className={s.nudge} aria-label="Nudge">
      <div className={s.nudgeHead}>
        <h3 className={s.nudgeTitle}>Nudge</h3>
        <p className={s.nudgeNote}>
          Same {30}-day test for 16 spots within 2 km and for landing up to 3 days earlier or later. Change in power + link hours vs where you are now
          {cur && <> (<span className="num">{Math.round(cur.opsH)} h</span>)</>}.
          {runs?.status === 'computing' && ' Computing…'}
        </p>
      </div>
      <div className={s.nudgeBody}>
        <div className={s.map}>
          {tile && tile.id === site.id && <NudgeMap tile={tile} />}
          <span className={s.north} aria-hidden="true">N</span>
          {points.map((p) => {
            const m = stats[p.key]
            const d = m && cur ? m.opsH - cur.opsH : null
            const isCur = p.key === currentKey
            const isBest = bestPlace && bestPlace.key === p.key && bestPlace.delta > 0.5
            const tone = isCur ? s.dotCur : d === null ? '' : d > 0.5 ? s.dotUp : d < -0.5 ? s.dotDown : s.dotSame
            return (
              <button
                key={p.key}
                type="button"
                className={`${s.dot} ${tone} ${isBest ? s.dotBest : ''}`}
                style={pos(p.e, p.n)}
                onClick={() => (p.key === 'base' ? nudgeTo(null) : nudgeTo(Number(p.key.slice(1))))}
                aria-label={`${p.label}${m ? `: ${Math.round(m.opsH)} hours of power and link${d !== null && !isCur ? `, ${signed(d)} vs now` : ''}` : ''}${isCur ? ' (you are here)' : ''}`}
                aria-current={isCur ? 'location' : undefined}
              >
                <i aria-hidden="true" />
                <span className="num">{isCur ? 'Here' : d === null ? '' : signed(d)}</span>
              </button>
            )
          })}
          <span className={s.mapKey} aria-hidden="true">Relief ×3, lighter is higher</span>
          <span className={`${s.scale} num`} style={{ width: `${100 / (2 * MAP_KM)}%` }} aria-hidden="true">1 km</span>
        </div>
        <div className={s.moves}>
          <h4 className={s.movesTitle}>Best moves</h4>
          {!cur ? (
            <p className={s.nudgeNote}>Computing…</p>
          ) : better.length === 0 ? (
            <p className={s.nudgeNote}>Nothing within 2 km or 3 days beats this spot. It's a local best for power + link.</p>
          ) : (
            <ol className={s.moveList}>
              {better.map((m) => (
                <li key={m.key} className={s.move}>
                  <span className={s.moveLabel}>{m.label}</span>
                  <span className={`${s.moveDelta} num`}>{signed(m.delta)}</span>
                  <span className={s.moveMeta}>
                    <span className="num">{Math.round(m.m.sunlitPct)}%</span> sunlit · <span className="num">{Math.round(m.m.earthPct)}%</span> Earth
                  </span>
                  <span className={s.moveActions}>
                    <Button size="sm" variant="quiet" onClick={m.go}>
                      <ArrowUpRight size={14} aria-hidden="true" /> Go
                    </Button>
                    <Button size="sm" variant="quiet" onClick={m.add} aria-label={`Add ${m.label} to compare`}>
                      <Plus size={14} aria-hidden="true" /> Compare
                    </Button>
                  </span>
                </li>
              ))}
            </ol>
          )}
          <h4 className={s.movesTitle}>Land on a different day</h4>
          <div className={s.days}>
            {NUDGE_DAYS.map((d) => {
              const m = stats[`d${d}`]
              const delta = m && cur ? m.opsH - cur.opsH : null
              return (
                <button key={d} type="button" className={s.day} onClick={() => setTime(landing + d * DAY)} aria-label={`${dayLabel(d)}${delta !== null ? `: ${signed(delta)}` : ''}`}>
                  <span className="num">{d > 0 ? `+${d}` : `−${-d}`} d</span>
                  <strong className={`num ${delta === null ? '' : delta > 0.5 ? s.up : delta < -0.5 ? s.down : ''}`}>{delta === null ? '…' : signed(delta)}</strong>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
