export interface Span {
  start: number // ms UTC
  end: number
  /** True when the span runs into the end of the sampled range, so the real end is later. */
  openEnd?: boolean
}

/**
 * Contiguous spans where `on[i]` is true. A span is closed at the midpoint between samples,
 * so durations are unbiased to half a step. Spans touching the series edges are clipped to it.
 */
export function spans(t: ArrayLike<number>, on: ArrayLike<boolean>): Span[] {
  const out: Span[] = []
  const n = t.length
  // null sentinel, not -1: epoch ms are negative before 1970 (Apollo)
  let start: number | null = null
  for (let i = 0; i < n; i++) {
    if (on[i] && start === null) start = i === 0 ? t[0] : (t[i - 1] + t[i]) / 2
    if (!on[i] && start !== null) {
      out.push({ start, end: (t[i - 1] + t[i]) / 2 })
      start = null
    }
  }
  if (start !== null) out.push({ start, end: t[n - 1], openEnd: true })
  return out
}

export const totalMs = (s: Span[]) => s.reduce((a, x) => a + x.end - x.start, 0)
export const longestMs = (s: Span[]) => s.reduce((a, x) => Math.max(a, x.end - x.start), 0)

/** Element-wise AND of two boolean series. */
export const both = (a: ArrayLike<boolean>, b: ArrayLike<boolean>) => Array.from(a, (v, i) => v && b[i])

/** The span containing time t, if any. */
export const spanAt = (s: Span[], t: number) => s.find((x) => x.start <= t && t <= x.end)
