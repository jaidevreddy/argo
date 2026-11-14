import type { PanelType } from '../core/metrics/power'
import { DEFAULT_MAST_HEIGHT_M } from '../core/constants'
import { useScenario, type Target } from './scenarioStore'

/**
 * The URL is the share link: ?site=im-1&t=2024-02-22T23:23:53Z  or  ?lat=-89.4&lon=-136.2&t=...
 * Hardware settings appear only when they differ from the defaults.
 */
export function readUrl(search = window.location.search) {
  const q = new URLSearchParams(search)
  const out: Partial<{ target: Target; utcMs: number; mastM: number; panel: PanelType; maskDeg: number }> = {}
  const site = q.get('site')
  const lat = Number(q.get('lat'))
  const lon = Number(q.get('lon'))
  if (site && /^[a-z0-9-]{1,40}$/.test(site)) out.target = { kind: 'site', id: site }
  else if (q.has('lat') && q.has('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) out.target = { kind: 'custom', lat, lon }
  const t = Date.parse(q.get('t') ?? '')
  if (Number.isFinite(t)) out.utcMs = t
  const mast = Number(q.get('mast'))
  if (q.has('mast') && mast >= 0 && mast <= 50) out.mastM = mast
  const panel = q.get('panel')
  if (panel === 'tracking' || panel === 'flat') out.panel = panel
  const mask = Number(q.get('mask'))
  if (q.has('mask') && mask >= 0 && mask <= 10) out.maskDeg = mask
  return out
}

export function writeUrl(s: { target: Target; utcMs: number; mastM: number; panel: PanelType; maskDeg: number }) {
  const q = new URLSearchParams()
  if (s.target.kind === 'site') q.set('site', s.target.id)
  else {
    q.set('lat', s.target.lat.toFixed(4))
    q.set('lon', s.target.lon.toFixed(4))
  }
  q.set('t', new Date(s.utcMs).toISOString().replace('.000Z', 'Z'))
  if (s.mastM !== DEFAULT_MAST_HEIGHT_M) q.set('mast', String(s.mastM))
  if (s.panel !== 'tracking') q.set('panel', s.panel)
  if (s.maskDeg !== 0) q.set('mask', String(s.maskDeg))
  const next = `${window.location.pathname}?${q.toString().replace(/%3A/g, ':')}`
  if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next)
}

/** Apply the URL once, then mirror state into it (coalesced to one write per frame). */
export function startUrlSync() {
  useScenario.getState().patch(readUrl())
  let queued = false
  return useScenario.subscribe(() => {
    if (queued) return
    queued = true
    requestAnimationFrame(() => {
      queued = false
      writeUrl(useScenario.getState())
    })
  })
}
