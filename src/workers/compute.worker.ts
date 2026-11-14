/// <reference lib="webworker" />
import { runScenario, type ScenarioInput, type ScenarioResult } from '../core/metrics/summary'

export interface ComputeRequest {
  id: number
  input: ScenarioInput
}
export type ComputeResponse = { id: number; ok: true; result: ScenarioResult } | { id: number; ok: false; error: string }

// Series sampling + event bisection runs here so scrubbing on the main thread never stalls.
self.onmessage = (e: MessageEvent<ComputeRequest>) => {
  const { id, input } = e.data
  try {
    const result = runScenario(input)
    const s = result.series
    const transfer = [s.t, s.sunAz, s.sunEl, s.earthAz, s.earthEl, s.sunVisible, s.power, s.earthUp].map((a) => a.buffer)
    ;(self as unknown as Worker).postMessage({ id, ok: true, result } satisfies ComputeResponse, transfer)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, ok: false, error: String(err) } satisfies ComputeResponse)
  }
}
