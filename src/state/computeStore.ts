import { create } from 'zustand'
import type { ScenarioResult } from '../core/metrics/summary'
import type { Horizon } from '../core/terrain/horizon'

/** Derived data for the current scenario: the horizon in use and the sampled window around the cursor. */
interface ComputeState {
  horizon: Horizon | null
  horizonKey: string
  result: ScenarioResult | null
  resultKey: string
  window: { start: number; end: number } | null
  status: 'idle' | 'computing' | 'ready' | 'error'
  error: string | null
}

export const useCompute = create<ComputeState>()(() => ({
  horizon: null,
  horizonKey: '',
  result: null,
  resultKey: '',
  window: null,
  status: 'idle',
  error: null,
}))
