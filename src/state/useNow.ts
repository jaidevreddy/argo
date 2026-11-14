import { useMemo } from 'react'
import { skyAt } from '../core/astro'
import { earthMargin } from '../core/metrics/comms'
import { powerIndex } from '../core/metrics/power'
import { nextEvent, timeLeft } from '../core/metrics/summary'
import { horizonAt } from '../core/terrain/horizon'
import { discFraction } from '../core/terrain/visibility'
import { DEG, RAD } from '../core/units'
import { useCompute } from './computeStore'
import { useScenario, useTarget } from './scenarioStore'

const H = 3_600_000

/** Instantaneous Sun/Earth state at the cursor, plus countdowns from the computed window. */
export function useNow() {
  const target = useTarget()
  const utcMs = useScenario((s) => s.utcMs)
  const mastM = useScenario((s) => s.mastM)
  const panel = useScenario((s) => s.panel)
  const maskDeg = useScenario((s) => s.maskDeg)
  const horizon = useCompute((s) => s.horizon)
  const result = useCompute((s) => s.result)

  return useMemo(() => {
    if (!target || !horizon) return null
    const sky = skyAt({ latDeg: target.lat, lonDeg: target.lon, elevationM: target.elevationM ?? 0, mastM }, utcMs)
    const hs = horizonAt(horizon, sky.sun.az)
    const he = horizonAt(horizon, sky.earth.az)
    const sunVisible = discFraction(sky.sun.el, hs, sky.sun.angularRadius)
    const earthM = earthMargin(sky.earth, he, maskDeg * DEG)
    const inRange = result && utcMs >= result.series.t[0] && utcMs <= result.series.t[result.series.t.length - 1]
    const left = inRange ? timeLeft(result, utcMs) : null
    const hoursTo = (ms: number | null) => (ms === null ? null : (ms - utcMs) / H)
    return {
      sun: {
        azDeg: sky.sun.az * RAD,
        elDeg: sky.sun.el * RAD,
        clearanceDeg: (sky.sun.el - hs) * RAD,
        horizonDeg: hs * RAD,
        visible: sunVisible,
        power: powerIndex(sky.sun, hs, panel),
        sunset: left?.sunset ?? null,
        sunriseH: inRange && sunVisible === 0 ? hoursTo(nextEvent(result.sunEvents, 'rise', utcMs)) : null,
      },
      earth: {
        azDeg: sky.earth.az * RAD,
        elDeg: sky.earth.el * RAD,
        clearanceDeg: earthM * RAD,
        horizonDeg: he * RAD,
        up: earthM > 0,
        earthset: left?.earthset ?? null,
        earthriseH: inRange && earthM <= 0 ? hoursTo(nextEvent(result.earthEvents, 'rise', utcMs)) : null,
      },
      ready: !!inRange,
    }
  }, [target, horizon, result, utcMs, mastM, panel, maskDeg])
}

/** "2 d 7 h" from 48 h up, "7 h 12 min" below, "12 min" under an hour. */
export function fmtDuration(hours: number) {
  if (hours >= 48) return `${Math.floor(hours / 24)} d ${Math.round(hours % 24)} h`
  if (hours >= 1) return `${Math.floor(hours)} h ${Math.round((hours % 1) * 60)} min`
  return `${Math.max(1, Math.round(hours * 60))} min`
}
