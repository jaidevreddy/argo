export interface Sample {
  t: number // ms since epoch, UTC
  v: number
}

export interface Crossing {
  t: number
  /** 'rise' when v goes from ≤0 to >0. */
  kind: 'rise' | 'set'
}

/** Sample f over [start, end] inclusive at a fixed step (ms). */
export function sampleSeries(f: (t: number) => number, start: number, end: number, stepMs: number): Sample[] {
  const out: Sample[] = []
  for (let t = start; t < end; t += stepMs) out.push({ t, v: f(t) })
  out.push({ t: end, v: f(end) })
  return out
}

/**
 * Sign changes in a sampled series, each refined by bisection on f to `toleranceMs`.
 * shortcut: misses a rise+set pair inside one step; 10-minute steps are far finer than
 * any lunar rise/set cycle, so this only matters for terrain grazes under ~10 min.
 */
export function findCrossings(
  f: (t: number) => number,
  series: Sample[],
  toleranceMs = 1000,
): Crossing[] {
  const out: Crossing[] = []
  for (let i = 1; i < series.length; i++) {
    const a = series[i - 1], b = series[i]
    const rising = a.v <= 0 && b.v > 0
    if (!rising && !(a.v > 0 && b.v <= 0)) continue
    let lo = a.t, hi = b.t
    while (hi - lo > toleranceMs) {
      const mid = (lo + hi) / 2
      if ((f(mid) > 0) === rising) hi = mid
      else lo = mid
    }
    out.push({ t: (lo + hi) / 2, kind: rising ? 'rise' : 'set' })
  }
  return out
}
