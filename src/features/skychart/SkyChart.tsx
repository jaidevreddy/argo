import { useMemo, useState, type PointerEvent } from 'react'
import { horizonAt } from '../../core/terrain/horizon'
import { DEG } from '../../core/units'
import { useCompute } from '../../state/computeStore'
import { useNow } from '../../state/useNow'
import { useTarget } from '../../state/scenarioStore'
import { Panel } from '../../ui/Panel'
import { useSize } from '../../ui/useSize'
import { elevationRange, groundPath, horizonLine, trackPaths, type Scale } from './paths'
import s from './SkyChart.module.css'

const M = { l: 44, r: 16, t: 16, b: 30 }
const COMPASS = [
  [0, 'N'], [45, 'NE'], [90, 'E'], [135, 'SE'], [180, 'S'], [225, 'SW'], [270, 'W'], [315, 'NW'], [360, 'N'],
] as const

/** Local sky: azimuth across, elevation up. Terrain horizon as ground, Sun and Earth tracks over the window. */
export function SkyChart() {
  const [ref, size] = useSize<HTMLDivElement>()
  const horizon = useCompute((st) => st.horizon)
  const result = useCompute((st) => st.result)
  const now = useNow()
  const target = useTarget()
  const [hover, setHover] = useState<{ x: number; az: number; el: number } | null>(null)

  const w = Math.max(0, size.width)
  const h = Math.max(0, size.height)
  const iw = w - M.l - M.r
  const ih = h - M.t - M.b

  const range = useMemo(
    () => (horizon ? elevationRange(horizon, result?.series.sunEl ?? null, result?.series.earthEl ?? null) : { lo: -5, hi: 10 }),
    [horizon, result],
  )
  const sc: Scale = useMemo(
    () => ({ x: (a) => M.l + (a / 360) * iw, y: (e) => M.t + ((range.hi - e) / (range.hi - range.lo)) * ih }),
    [iw, ih, range],
  )

  const paths = useMemo(() => {
    if (!horizon || iw <= 0) return null
    const every = result ? Math.max(1, Math.floor(result.series.t.length / 3000)) : 1
    return {
      ground: groundPath(horizon, sc, M.t + ih),
      line: horizonLine(horizon, sc),
      sun: result ? trackPaths(result.series.sunAz, result.series.sunEl, horizon, sc, every) : null,
      earth: result ? trackPaths(result.series.earthAz, result.series.earthEl, horizon, sc, every) : null,
    }
  }, [horizon, result, sc, iw, ih])

  const yTicks = useMemo(() => {
    const span = range.hi - range.lo
    const step = span > 60 ? 15 : span > 24 ? 5 : span > 10 ? 2 : 1
    const out: number[] = []
    for (let v = Math.ceil(range.lo / step) * step; v <= range.hi; v += step) out.push(v)
    return out
  }, [range])

  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = e.clientX - r.left
    if (x < M.l || x > M.l + iw) return setHover(null)
    const az = ((x - M.l) / iw) * 360
    setHover({ x, az, el: horizon ? horizonAt(horizon, az * DEG) / DEG : 0 })
  }

  // disc radius in px from true angular size, floored so a 0.27° Sun stays visible on a wide range
  const discR = (angDeg: number) => Math.max(5, (angDeg / (range.hi - range.lo)) * ih)
  const summary = now
    ? `Sky from ${target?.name}. Sun at azimuth ${now.sun.azDeg.toFixed(0)}°, elevation ${now.sun.elDeg.toFixed(2)}°; Earth at azimuth ${now.earth.azDeg.toFixed(0)}°, elevation ${now.earth.elDeg.toFixed(2)}°.`
    : 'Sky chart loading'

  return (
    <Panel className={s.panel} role="region" aria-label="Sky chart">
      <div className={s.head}>
        <div>
          <h2 className={s.title}>Sky from {target?.name ?? '…'}</h2>
          <p className={s.subtitle}>Azimuth across, elevation up. Tracks cover the whole window, solid where the body clears the terrain. Discs are drawn at true size.</p>
        </div>
        <ul className={s.legend}>
          <li><span className={s.keySun} />Sun</li>
          <li><span className={s.keyEarth} />Earth</li>
          <li><span className={s.keyGround} />{horizon?.label ?? 'Horizon'}</li>
        </ul>
      </div>
      <div ref={ref} className={s.plot}>
        {w > 0 && h > 0 && (
          <svg width={w} height={h} role="img" aria-label={summary} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
            <defs>
              <clipPath id="sky-plot">
                <rect x={M.l} y={M.t} width={Math.max(0, iw)} height={Math.max(0, ih)} />
              </clipPath>
            </defs>
            {yTicks.map((v) => (
              <g key={v}>
                <line x1={M.l} x2={M.l + iw} y1={sc.y(v)} y2={sc.y(v)} className={v === 0 ? s.zero : s.grid} />
                <text x={M.l - 8} y={sc.y(v)} className={s.tickY} dominantBaseline="middle" textAnchor="end">{v}°</text>
              </g>
            ))}
            {COMPASS.map(([a, l]) => (
              <g key={a}>
                <line x1={sc.x(a)} x2={sc.x(a)} y1={M.t} y2={M.t + ih} className={s.grid} />
                <text x={sc.x(a)} y={M.t + ih + 18} className={s.tickX} textAnchor="middle">{l}</text>
              </g>
            ))}
            {paths && (
              <g clipPath="url(#sky-plot)">
                {paths.sun && <path d={paths.sun.down} className={`${s.track} ${s.sunTrack} ${s.below}`} />}
                {paths.earth && <path d={paths.earth.down} className={`${s.track} ${s.earthTrack} ${s.below}`} />}
                <path d={paths.ground} className={s.ground} />
                <path d={paths.line} className={s.horizonLine} />
                {paths.sun && <path d={paths.sun.up} className={`${s.track} ${s.sunTrack}`} />}
                {paths.earth && <path d={paths.earth.up} className={`${s.track} ${s.earthTrack}`} />}
              </g>
            )}
            {now && (
              <g clipPath="url(#sky-plot)">
                <circle cx={sc.x(now.earth.azDeg)} cy={sc.y(now.earth.elDeg)} r={discR(0.95)} className={s.earthDisc} />
                <text x={sc.x(now.earth.azDeg) + discR(0.95) + 6} y={sc.y(now.earth.elDeg)} className={s.direct} dominantBaseline="middle">Earth</text>
                <circle cx={sc.x(now.sun.azDeg)} cy={sc.y(now.sun.elDeg)} r={discR(0.27)} className={s.sunDisc} />
                <text x={sc.x(now.sun.azDeg) + discR(0.27) + 6} y={sc.y(now.sun.elDeg)} className={s.direct} dominantBaseline="middle">Sun</text>
              </g>
            )}
            {hover && (
              <g pointerEvents="none">
                <line x1={hover.x} x2={hover.x} y1={M.t} y2={M.t + ih} className={s.cross} />
                <circle cx={hover.x} cy={sc.y(hover.el)} r={3.5} className={s.crossDot} />
              </g>
            )}
          </svg>
        )}
        {hover && (
          <div className={s.tip} style={{ left: Math.min(hover.x + 12, w - 170), top: M.t + 8 }} role="status">
            <div className="num">Azimuth {hover.az.toFixed(1)}°</div>
            <div className="num">Horizon {hover.el.toFixed(2)}°</div>
          </div>
        )}
      </div>
    </Panel>
  )
}
