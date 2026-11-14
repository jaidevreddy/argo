import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { skyAt } from '../../core/astro'
import { DEG, RAD } from '../../core/units'
import { horizonsAzEl } from '../../data/horizons'
import { useScenario, useTarget } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import s from './ValidationDialog.module.css'

interface Case { site: string; latDeg: number; lonDeg: number; body: 'sun' | 'earth'; utc: string; azDeg: number; elDeg: number }
interface Row extends Case { sep: number }

/** Great-circle angle between two az/el directions, degrees. */
function sepDeg(az1: number, el1: number, az2: number, el2: number) {
  const c = Math.sin(el1) * Math.sin(el2) + Math.cos(el1) * Math.cos(el2) * Math.cos(az1 - az2)
  return Math.acos(Math.min(1, Math.max(-1, c))) * RAD
}

function useFixtureRows(open: boolean) {
  const [rows, setRows] = useState<Row[] | null>(null)
  useEffect(() => {
    if (!open || rows) return
    fetch(`${import.meta.env.BASE_URL}data/validation/horizons.json`)
      .then((r) => r.json() as Promise<{ cases: Case[] }>)
      .then(({ cases }) =>
        setRows(cases.map((c) => {
          const sky = skyAt({ latDeg: c.latDeg, lonDeg: c.lonDeg, mastM: 0 }, Date.parse(c.utc))
          const p = c.body === 'sun' ? sky.sun : sky.earth
          return { ...c, sep: sepDeg(p.az, p.el, c.azDeg * DEG, c.elDeg * DEG) }
        })),
      )
      .catch(() => setRows([]))
  }, [open, rows])
  return rows
}

type Live = { state: 'idle' } | { state: 'busy' } | { state: 'error'; msg: string } | { state: 'done'; sun: number; earth: number; at: string }

/** Proof the math is right: committed JPL Horizons cases, plus a live check of the current scenario. */
export function ValidationDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const rows = useFixtureRows(open)
  const target = useTarget()
  const utcMs = useScenario((st) => st.utcMs)
  const mastM = useScenario((st) => st.mastM)
  const [live, setLive] = useState<Live>({ state: 'idle' })

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  const verify = async () => {
    if (!target) return
    setLive({ state: 'busy' })
    try {
      const elevationM = target.elevationM ?? 0
      const when = new Date(Math.round(utcMs / 60_000) * 60_000)
      const altKm = (elevationM + mastM) / 1000
      const [jSun, jEarth] = await Promise.all([
        horizonsAzEl('sun', target.lat, target.lon, when, altKm),
        horizonsAzEl('earth', target.lat, target.lon, when, altKm),
      ])
      const sky = skyAt({ latDeg: target.lat, lonDeg: target.lon, elevationM, mastM }, when.getTime())
      setLive({
        state: 'done',
        sun: sepDeg(sky.sun.az, sky.sun.el, jSun.azDeg * DEG, jSun.elDeg * DEG),
        earth: sepDeg(sky.earth.az, sky.earth.el, jEarth.azDeg * DEG, jEarth.elDeg * DEG),
        at: when.toISOString().slice(0, 16).replace('T', ' '),
      })
    } catch (e) {
      setLive({ state: 'error', msg: e instanceof Error ? e.message : String(e) })
    }
  }

  const max = rows?.length ? Math.max(...rows.map((r) => r.sep)) : null
  const mean = rows?.length ? rows.reduce((a, r) => a + r.sep, 0) / rows.length : null

  return (
    <dialog ref={ref} className={s.dialog} onClose={onClose} aria-labelledby="val-title">
      <div className={s.head}>
        <h2 id="val-title">Validation against JPL Horizons</h2>
        <Button variant="quiet" size="sm" onClick={onClose} aria-label="Close"><X size={16} /></Button>
      </div>
      <p className={s.lead}>
        Argo computes Sun and Earth positions in your browser. These are compared with NASA JPL Horizons (DE441 ephemeris,
        observer on the lunar surface, no atmosphere). Error is the angle between the two directions on the sky.
      </p>

      <section className={s.live}>
        <div>
          <h3>This scenario</h3>
          {live.state === 'done' && (
            <p className="num">Sun {live.sun.toFixed(4)}° · Earth {live.earth.toFixed(4)}° at {live.at} UTC</p>
          )}
          {live.state === 'error' && <p className={s.err}>Horizons could not be reached ({live.msg}). The committed checks below still stand.</p>}
          {live.state === 'idle' && <p>Ask JPL Horizons for this site and time and compare.</p>}
          {live.state === 'busy' && <p>Asking JPL Horizons…</p>}
        </div>
        <Button variant="primary" onClick={verify} disabled={live.state === 'busy' || !target}>Verify with JPL</Button>
      </section>

      <section>
        <h3>Reference cases</h3>
        {rows === null ? (
          <p>Loading…</p>
        ) : (
          <>
            <p className="num">{rows.length} cases · worst {max?.toFixed(4)}° · mean {mean?.toFixed(4)}°</p>
            <div className={s.tableWrap}>
              <table className={s.table}>
                <thead>
                  <tr><th>Site</th><th>Body</th><th>UTC</th><th className={s.n}>JPL az</th><th className={s.n}>JPL el</th><th className={s.n}>Error</th></tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i}>
                      <td>{r.site}</td>
                      <td>{r.body === 'sun' ? 'Sun' : 'Earth'}</td>
                      <td className="num">{r.utc.slice(0, 16).replace('T', ' ')}</td>
                      <td className={`${s.n} num`}>{r.azDeg.toFixed(3)}°</td>
                      <td className={`${s.n} num`}>{r.elDeg.toFixed(3)}°</td>
                      <td className={`${s.n} num`}>{r.sep.toFixed(4)}°</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>
    </dialog>
  )
}
