import type { ScenarioInput, ScenarioResult } from '../core/metrics/summary'
import type { ComputeRequest, ComputeResponse } from './compute.worker'

let worker: Worker | null = null
let nextId = 1
const pending = new Map<number, { resolve: (r: ScenarioResult) => void; reject: (e: Error) => void }>()

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

/** Run a scenario off the main thread. Callers drop stale answers by comparing request keys. */
export function computeScenario(input: ScenarioInput): Promise<ScenarioResult> {
  const id = nextId++
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject })
    getWorker().postMessage({ id, input } satisfies ComputeRequest)
  })
}
