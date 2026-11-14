// Cloudflare Pages Function: same-origin proxy to the JPL Horizons API (which sends no CORS headers).
// Forwards only an allow-listed set of query keys, and only for observers on the Moon.

const UPSTREAM = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const ALLOWED = new Set([
  'COMMAND', 'OBJ_DATA', 'MAKE_EPHEM', 'EPHEM_TYPE', 'CENTER', 'COORD_TYPE', 'SITE_COORD',
  'START_TIME', 'STOP_TIME', 'STEP_SIZE', 'TLIST', 'QUANTITIES', 'ANG_FORMAT', 'CSV_FORMAT',
  'TIME_TYPE', 'EXTRA_PREC',
])

interface Ctx {
  request: Request
  waitUntil(p: Promise<unknown>): void
}

export async function onRequestGet({ request, waitUntil }: Ctx): Promise<Response> {
  const incoming = new URL(request.url).searchParams
  const out = new URLSearchParams({ format: 'json' })
  for (const [k, v] of incoming) {
    if (!ALLOWED.has(k) || v.length > 200) return new Response(`Parameter not allowed: ${k}`, { status: 400 })
    out.set(k, v)
  }
  if (out.get('CENTER') !== "'coord@301'") return new Response('Only lunar surface observers are supported', { status: 400 })

  const upstream = `${UPSTREAM}?${out}`
  const cache = (caches as unknown as { default: Cache }).default
  const key = new Request(upstream)
  const hit = await cache.match(key)
  if (hit) return hit

  const res = await fetch(upstream)
  if (!res.ok) return new Response(`Horizons returned ${res.status}`, { status: 502 })
  const body = new Response(res.body, {
    headers: { 'content-type': 'application/json', 'cache-control': 'public, max-age=86400' },
  })
  waitUntil(cache.put(key, body.clone()))
  return body
}
