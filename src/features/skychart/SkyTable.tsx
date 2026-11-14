import { horizonAt } from '../../core/terrain/horizon'
import { DEG } from '../../core/units'
import { useCompute } from '../../state/computeStore'
import s from './SkyChart.module.css'

const H = 3_600_000
const when = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false })
const deg = (rad: number) => `${rad < 0 ? '−' : ''}${Math.abs(rad / DEG).toFixed(1)}°`

/** The sky chart's data as a table (one row every 12 h), for screen readers and anyone who prefers numbers. */
export function SkyTable() {
  const result = useCompute((st) => st.result)
  const horizon = useCompute((st) => st.horizon)
  if (!result || !horizon) return <p className={s.tableNote}>Computing…</p>
  const { t, sunAz, sunEl, earthAz, earthEl } = result.series
  const rows: number[] = []
  for (let i = 0, next = t[0]; i < t.length; i++) {
    if (t[i] >= next) {
      rows.push(i)
      next = t[i] + 12 * H
    }
  }
  const clears = (az: number, el: number) => el > horizonAt(horizon, az)
  return (
    <div className={s.tableWrap}>
      <table className={s.table}>
        <caption className={s.tableNote}>Every 12 hours, UTC. “Clear” means the body’s centre is above the terrain horizon.</caption>
        <thead>
          <tr>
            <th scope="col">Time</th>
            <th scope="col">Sun azimuth</th>
            <th scope="col">Sun elevation</th>
            <th scope="col">Sun</th>
            <th scope="col">Earth azimuth</th>
            <th scope="col">Earth elevation</th>
            <th scope="col">Earth</th>
          </tr>
        </thead>
        <tbody className="num">
          {rows.map((i) => (
            <tr key={i}>
              <th scope="row">{when.format(t[i])}</th>
              <td>{deg(sunAz[i])}</td>
              <td>{deg(sunEl[i])}</td>
              <td>{clears(sunAz[i], sunEl[i]) ? 'Clear' : 'Hidden'}</td>
              <td>{deg(earthAz[i])}</td>
              <td>{deg(earthEl[i])}</td>
              <td>{clears(earthAz[i], earthEl[i]) ? 'Clear' : 'Hidden'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
