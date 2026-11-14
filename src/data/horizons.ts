// Live cross-check against JPL Horizons via /api/horizons (Cloudflare function in prod, Vite proxy in dev).

export interface HorizonsPoint {
  azDeg: number
  elDeg: number
}

const quote = (v: string) => `'${v}'`
const fmt = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ')

/** Apparent azimuth/elevation of the Sun or Earth from a lunar site, per JPL Horizons (DE441). */
export async function horizonsAzEl(
  body: 'sun' | 'earth',
  latDeg: number,
  lonDeg: number,
  utc: Date,
  altKm = 0,
): Promise<HorizonsPoint> {
  const params = new URLSearchParams({
    COMMAND: quote(body === 'sun' ? '10' : '399'),
    OBJ_DATA: quote('NO'),
    MAKE_EPHEM: quote('YES'),
    EPHEM_TYPE: quote('OBSERVER'),
    CENTER: quote('coord@301'),
    COORD_TYPE: quote('GEODETIC'),
    SITE_COORD: quote(`${lonDeg},${latDeg},${altKm}`),
    START_TIME: quote(fmt(utc)),
    STOP_TIME: quote(fmt(new Date(utc.getTime() + 60_000))),
    STEP_SIZE: quote('1m'),
    QUANTITIES: quote('4'),
    ANG_FORMAT: quote('DEG'),
    CSV_FORMAT: quote('YES'),
    TIME_TYPE: quote('UT'),
    EXTRA_PREC: quote('YES'),
  })
  const res = await fetch(`/api/horizons?${params}`)
  if (!res.ok) throw new Error(`Horizons check failed (${res.status})`)
  const { result } = (await res.json()) as { result: string }
  const start = result.indexOf('$$SOE')
  if (start < 0) throw new Error('Horizons returned no ephemeris rows')
  const cols = result.slice(start + 5).trim().split('\n')[0].split(',').map((s) => s.trim())
  return { azDeg: Number(cols[3]), elDeg: Number(cols[4]) }
}
