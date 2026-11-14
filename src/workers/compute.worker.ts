/// <reference lib="webworker" />
import { runMissions, type MissionCase, type MissionStats } from '../core/metrics/mission'
import type { PanelType } from '../core/metrics/power'
import { runScenario, type ScenarioInput, type ScenarioResult } from '../core/metrics/summary'

export type ComputeRequest =
  | { id: number; kind: 'scenario'; input: ScenarioInput }
  | { id: number; kind: 'missions'; cases: MissionCase[]; panel: PanelType; maskDeg: number }
export type ComputeResponse =
  | { id: number; ok: true; result: ScenarioResult | Record<string, MissionStats> }
  | { id: number; ok: false; error: string }

const post = (msg: ComputeResponse, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(msg, transfer)

// Series sampling, event bisection and mission sweeps run here so scrubbing on the main thread never stalls.
self.onmessage = (e: MessageEvent<ComputeRequest>) => {
  const req = e.data
  try {
    if (req.kind === 'missions') {
      post({ id: req.id, ok: true, result: runMissions(req.cases, req.panel, req.maskDeg) })
      return
    }
    const result = runScenario(req.input)
    const s = result.series
    post({ id: req.id, ok: true, result }, [s.t, s.sunAz, s.sunEl, s.earthAz, s.earthEl, s.sunVisible, s.power, s.earthUp].map((a) => a.buffer))
  } catch (err) {
    post({ id: req.id, ok: false, error: String(err) })
  }
}
