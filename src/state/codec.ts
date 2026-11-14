import type { Target } from './scenarioStore'

/** Compact text forms used by the URL and as identity keys: "im-1", "shackleton-ridge.3", "-89.4500,-137.3000". */
export const isoSecond = (ms: number) => new Date(Math.round(ms / 1000) * 1000).toISOString().replace('.000Z', 'Z')

export function encodeTarget(t: Target) {
  if (t.kind === 'custom') return `${t.lat.toFixed(4)},${t.lon.toFixed(4)}`
  return t.at != null ? `${t.id}.${t.at}` : t.id
}

export function decodeTarget(s: string): Target | null {
  const site = /^([a-z0-9-]{1,40})(?:\.(\d{1,2}))?$/.exec(s)
  if (site) {
    const at = site[2] === undefined ? undefined : Number(site[2])
    return at !== undefined && at > 15 ? null : { kind: 'site', id: site[1], ...(at !== undefined ? { at } : {}) }
  }
  const [lat, lon] = s.split(',').map(Number)
  if (Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { kind: 'custom', lat, lon }
  return null
}

export interface CompareItem {
  target: Target
  utcMs: number
}

export const encodeItem = (i: CompareItem) => `${encodeTarget(i.target)}@${isoSecond(i.utcMs)}`

export function decodeItem(s: string): CompareItem | null {
  const k = s.lastIndexOf('@')
  if (k < 0) return null
  const target = decodeTarget(s.slice(0, k))
  const utcMs = Date.parse(s.slice(k + 1))
  return target && Number.isFinite(utcMs) ? { target, utcMs } : null
}
