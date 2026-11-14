import type { PanelType } from '../core/metrics/power'
import { DEFAULT_MAST_HEIGHT_M } from '../core/constants'
import { decodeItem, decodeTarget, encodeItem, encodeTarget, isoSecond, type CompareItem } from './codec'
import { useScenario, type Target, type View } from './scenarioStore'

/**
 * The URL is the share link: ?site=im-1&t=2024-02-22T23:23:53Z  or  ?lat=-89.4&lon=-136.2&t=...
 * Hardware settings appear only when they differ from the defaults.
 */
export function readUrl(search = window.location.search) {
  const q = new URLSearchParams(search)
  const out: Partial<{ target: Target; utcMs: number; mastM: number; panel: PanelType; maskDeg: number; view: View; compare: CompareItem[] }> = {}
  const site = q.get('site')
  const lat = Number(q.get('lat'))
  const lon = Number(q.get('lon'))
  const at = q.get('at')
  if (site) out.target = decodeTarget(at ? `${site}.${at}` : site) ?? undefined
  else if (q.has('lat') && q.has('lon') && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) out.target = { kind: 'custom', lat, lon }
  const t = Date.parse(q.get('t') ?? '')
  if (Number.isFinite(t)) out.utcMs = t
  const mast = Number(q.get('mast'))
  if (q.has('mast') && mast >= 0 && mast <= 50) out.mastM = mast
  const panel = q.get('panel')
  if (panel === 'tracking' || panel === 'flat') out.panel = panel
  const mask = Number(q.get('mask'))
  if (q.has('mask') && mask >= 0 && mask <= 10) out.maskDeg = mask
  const view = q.get('view')
  if (view === 'globe' || view === 'sky' || view === 'site' || view === 'compare') out.view = view
  const cmp = q.get('cmp')
  if (cmp) out.compare = cmp.split('~').map(decodeItem).filter((x): x is CompareItem => x !== null).slice(0, 3)
  if (!out.target) delete out.target
  return out
}

export function writeUrl(s: { target: Target; utcMs: number; mastM: number; panel: PanelType; maskDeg: number; view: View; compare?: CompareItem[] }) {
  const q = new URLSearchParams()
  if (s.target.kind === 'site') {
    q.set('site', s.target.id)
    if (s.target.at != null) q.set('at', String(s.target.at))
  } else {
    const [lat, lon] = encodeTarget(s.target).split(',')
    q.set('lat', lat)
    q.set('lon', lon)
  }
  q.set('t', isoSecond(s.utcMs))
  if (s.mastM !== DEFAULT_MAST_HEIGHT_M) q.set('mast', String(s.mastM))
  if (s.panel !== 'tracking') q.set('panel', s.panel)
  if (s.maskDeg !== 0) q.set('mask', String(s.maskDeg))
  if (s.view !== 'globe') q.set('view', s.view)
  if (s.compare?.length) q.set('cmp', s.compare.map(encodeItem).join('~'))
  const next = `${window.location.pathname}?${q.toString().replace(/%3A/g, ':').replace(/%40/g, '@').replace(/%2C/g, ',').replace(/%7E/g, '~')}`
  if (next !== `${window.location.pathname}${window.location.search}`) window.history.replaceState(null, '', next)
}

/** Apply the URL once, then mirror state into it (at most 4 writes a second, so playback stays smooth). */
export function startUrlSync() {
  useScenario.getState().patch(readUrl())
  let timer: ReturnType<typeof setTimeout> | null = null
  const unsub = useScenario.subscribe(() => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      writeUrl(useScenario.getState())
    }, 250)
  })
  return () => {
    unsub()
    if (timer) clearTimeout(timer)
  }
}
