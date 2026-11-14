import { useMemo } from 'react'
import { useCompute } from '../../state/computeStore'
import { useScenario } from '../../state/scenarioStore'
import { fmtDuration } from '../../state/useNow'
import s from './VerdictPanel.module.css'

const H = 3_600_000
const when = new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })

/** The next rise/set of the Sun and Earth after the cursor, from the computed window. */
export function ComingUp() {
  const result = useCompute((st) => st.result)
  const utcMs = useScenario((st) => st.utcMs)
  const setTime = useScenario((st) => st.setTime)
  const events = useMemo(() => {
    if (!result) return []
    const all = [
      ...result.sunEvents.map((e) => ({ t: e.t, body: 'sun' as const, name: e.kind === 'rise' ? 'Sunrise' : 'Sunset' })),
      ...result.earthEvents.map((e) => ({ t: e.t, body: 'earth' as const, name: e.kind === 'rise' ? 'Earthrise' : 'Earthset' })),
    ]
    return all.filter((e) => e.t > utcMs).sort((a, b) => a.t - b.t).slice(0, 4)
  }, [result, utcMs])

  return (
    <section className={s.section} aria-labelledby="coming-up">
      <div className={s.head}>
        <h2 id="coming-up" className={s.title}>Coming up</h2>
        <span className={s.range}>UTC</span>
      </div>
      {!result ? (
        <p className={s.note}>Computing…</p>
      ) : events.length === 0 ? (
        <p className={s.note}>No rise or set in this window: the Sun and Earth keep their current state.</p>
      ) : (
        <ol className={s.events}>
          {events.map((e) => (
            <li key={`${e.name}${e.t}`}>
              <button type="button" className={s.event} onClick={() => setTime(Math.round(e.t / 60000) * 60000)} title="Jump to this moment">
                <span className={s.swatch} style={{ background: e.body === 'sun' ? 'var(--sun)' : 'var(--earth)' }} aria-hidden="true" />
                <span className={s.eventName}>{e.name}</span>
                <span className={`${s.eventWhen} num`}>{when.format(e.t)}</span>
                <span className={`${s.eventIn} num`}>in {fmtDuration((e.t - utcMs) / H)}</span>
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}
