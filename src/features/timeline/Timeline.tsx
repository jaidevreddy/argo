import { useMemo, useRef, type KeyboardEvent, type PointerEvent } from 'react'
import { horizonAt } from '../../core/terrain/horizon'
import { RAD } from '../../core/units'
import { useCompute } from '../../state/computeStore'
import { useScenario } from '../../state/scenarioStore'
import { useSize } from '../../ui/useSize'
import s from './Timeline.module.css'

const H = 3_600_000
const DAY = 24 * H
const G = 52 // left gutter for row labels
const CURVE_H = 44
const BAND_H = 7
const dayFmt = new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short', timeZone: 'UTC' })
const fullFmt = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short', timeZone: 'UTC' })

/** Window timeline: clearance above the terrain horizon, lit / Earth / both bands, draggable cursor. */
export function Timeline() {
  const [ref, size] = useSize<HTMLDivElement>()
  const result = useCompute((st) => st.result)
  const horizon = useCompute((st) => st.horizon)
  const utcMs = useScenario((st) => st.utcMs)
  const setTime = useScenario((st) => st.setTime)
  const dragging = useRef(false)

  const w = size.width
  const iw = Math.max(0, w - G - 8)
  const t0 = result?.series.t[0] ?? 0
  const t1 = result ? result.series.t[result.series.t.length - 1] : 1
  const x = (t: number) => G + ((t - t0) / (t1 - t0)) * iw
  const tAt = (px: number) => t0 + ((px - G) / iw) * (t1 - t0)

  const curves = useMemo(() => {
    if (!result || !horizon || iw <= 0) return null
    const { t, sunAz, sunEl, earthAz, earthEl } = result.series
    const n = t.length
    const sc = new Float32Array(n)
    const ec = new Float32Array(n)
    let maxAbs = 2
    for (let i = 0; i < n; i++) {
      sc[i] = (sunEl[i] - horizonAt(horizon, sunAz[i])) * RAD
      ec[i] = (earthEl[i] - horizonAt(horizon, earthAz[i])) * RAD
      maxAbs = Math.max(maxAbs, Math.abs(sc[i]), Math.abs(ec[i]))
    }
    const R = Math.min(20, maxAbs)
    const y = (v: number) => 4 + ((R - Math.max(-R, Math.min(R, v))) / (2 * R)) * (CURVE_H - 8)
    const every = Math.max(1, Math.floor(n / (iw * 1.5)))
    const path = (arr: Float32Array) => {
      let d = ''
      for (let i = 0; i < n; i += every) d += `${i ? ' L' : 'M'}${(G + ((t[i] - t[0]) / (t[n - 1] - t[0])) * iw).toFixed(1)},${y(arr[i]).toFixed(1)}`
      return d
    }
    return { sun: path(sc), earth: path(ec), zeroY: y(0), R }
  }, [result, horizon, iw])

  const bands = useMemo(() => {
    if (!result || iw <= 0) return null
    const rect = (sp: { start: number; end: number }[]) => sp.map((v) => [x(v.start), Math.max(1, x(v.end) - x(v.start))] as const)
    return { lit: rect(result.lit), comm: rect(result.comm), ops: rect(result.ops) }
  }, [result, iw, t0, t1]) // eslint-disable-line react-hooks/exhaustive-deps -- x derives from these

  const ticks = useMemo(() => {
    if (!result || iw <= 0) return []
    const span = (t1 - t0) / DAY
    const every = iw / span > 60 ? 2 : iw / span > 30 ? 4 : 7
    const out: number[] = []
    for (let t = Math.ceil(t0 / DAY) * DAY; t <= t1; t += every * DAY) out.push(t)
    return out
  }, [result, iw, t0, t1])

  const scrub = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = Math.max(G, Math.min(G + iw, e.clientX - r.left))
    setTime(Math.round(tAt(px) / 60_000) * 60_000)
  }

  const onKey = (e: KeyboardEvent) => {
    const step = e.key === 'ArrowRight' ? H : e.key === 'ArrowLeft' ? -H : e.key === 'PageUp' ? DAY : e.key === 'PageDown' ? -DAY : 0
    if (step) {
      e.preventDefault()
      setTime(utcMs + step)
    }
  }

  const bandsTop = CURVE_H + 6
  const height = bandsTop + 3 * (BAND_H + 3) + 20
  const cx = result ? x(Math.max(t0, Math.min(t1, utcMs))) : G

  return (
    <div ref={ref} className={s.wrap}>
      {w > 0 && (
        <svg
          width={w}
          height={height}
          className={s.svg}
          onPointerDown={(e) => {
            dragging.current = true
            e.currentTarget.setPointerCapture(e.pointerId)
            scrub(e)
          }}
          onPointerMove={(e) => dragging.current && scrub(e)}
          onPointerUp={() => (dragging.current = false)}
          role="slider"
          tabIndex={0}
          aria-label="Time in the window"
          aria-valuemin={t0}
          aria-valuemax={t1}
          aria-valuenow={utcMs}
          aria-valuetext={`${fullFmt.format(utcMs)} UTC`}
          onKeyDown={onKey}
        >
          <text x={G - 8} y={CURVE_H / 2} className={s.label} textAnchor="end" dominantBaseline="middle">Height</text>
          {curves && (
            <>
              <line x1={G} x2={G + iw} y1={curves.zeroY} y2={curves.zeroY} className={s.zero} />
              <path d={curves.earth} className={s.earthCurve} />
              <path d={curves.sun} className={s.sunCurve} />
            </>
          )}
          {(['lit', 'comm', 'ops'] as const).map((k, i) => {
            const y = bandsTop + i * (BAND_H + 3)
            return (
              <g key={k}>
                <text x={G - 8} y={y + BAND_H / 2} className={s.label} textAnchor="end" dominantBaseline="middle">
                  {k === 'lit' ? 'Sunlit' : k === 'comm' ? 'Earth' : 'Both'}
                </text>
                <rect x={G} y={y} width={iw} height={BAND_H} rx={2} className={s.track} />
                {bands?.[k].map(([bx, bw], j) => <rect key={j} x={bx} y={y} width={bw} height={BAND_H} rx={2} className={s[k]} />)}
              </g>
            )
          })}
          {ticks.map((t) => (
            <text key={t} x={x(t)} y={height - 4} className={s.tick} textAnchor="middle">{dayFmt.format(t)}</text>
          ))}
          <line x1={cx} x2={cx} y1={0} y2={height - 16} className={s.cursor} />
          <circle cx={cx} cy={bandsTop - 3} r={5} className={s.handle} />
        </svg>
      )}
      {!result && <p className={s.empty}>Computing the window…</p>}
    </div>
  )
}
