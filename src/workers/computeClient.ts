import type { MissionCase, MissionStats } from '../core/metrics/mission'
import type { PanelType } from '../core/metrics/power'
import type { ScenarioInput, ScenarioResult } from '../core/metrics/summary'
import type { ComputeRequest, ComputeResponse } from './compute.worker'

type Req = ComputeRequest extends infer R ? (R extends { id: number } ? Omit<R, 'id'> : never) : never

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (r: unknown) => void; reject: (e: Error) => void }>()

function getWorker() {
  if (worker) return worker
  worker = new Worker(new URL('./compute.worker.ts', import.meta.url), { type: 'module' })
  worker.onmessage = (e: MessageEvent<ComputeResponse>) => {
    const p = pending.get(e.data.id)
    if (!p) return
    pending.delete(e.data.id)
    if (e.data.ok) p.resolve(e.data.result)
    else p.reject(new Error(e.data.error))
  }
  return worker
}

function send<T>(req: Req): Promise<T> {
  const id = nextId++
  return new Promise<T>((resolve, reject) => {
    pending.set(id, { resolve: resolve as (r: unknown) => void, reject })
    getWorker().postMessage({ ...req, id } as ComputeRequest)
  })
}

/** Run a scenario off the main thread. Callers drop stale answers by comparing request keys. */
export const computeScenario = (input: ScenarioInput) => send<ScenarioResult>({ kind: 'scenario', input })

/** First-30-day mission metrics for many landings (Compare, Nudge). */
export const computeMissions = (cases: MissionCase[], panel: PanelType, maskDeg: number) =>
  send<Record<string, MissionStats>>({ kind: 'missions', cases, panel, maskDeg })
