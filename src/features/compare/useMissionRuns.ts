import { useEffect, useState } from 'react'
import type { MissionCase, MissionStats } from '../../core/metrics/mission'
import type { PanelType } from '../../core/metrics/power'
import { computeMissions } from '../../workers/computeClient'

export type MissionRuns = { key: string; status: 'computing' | 'ready' | 'error'; stats: Record<string, MissionStats>; error: string | null }

/**
 * Debounced mission sweep: builds the cases (loading horizons) and runs them in the worker.
 * Answers for an older key are dropped, so scrubbing time never shows a stale nudge.
 */
export function useMissionRuns(key: string | null, build: () => Promise<MissionCase[]>, panel: PanelType, maskDeg: number, delayMs = 300) {
  const [runs, setRuns] = useState<MissionRuns | null>(null)
  useEffect(() => {
    if (!key) return
    let alive = true
    const timer = setTimeout(() => {
      setRuns((r) => ({ key, status: 'computing', stats: r?.stats ?? {}, error: null }))
      build()
        .then((cases) => computeMissions(cases, panel, maskDeg))
        .then((stats) => alive && setRuns({ key, status: 'ready', stats, error: null }))
        .catch((e) => alive && setRuns({ key, status: 'error', stats: {}, error: String(e) }))
    }, delayMs)
    return () => {
      alive = false
      clearTimeout(timer)
    }
  }, [key]) // eslint-disable-line react-hooks/exhaustive-deps -- key captures every input
  return runs && runs.key === key ? runs : runs ? { ...runs, status: 'computing' as const } : null
}
