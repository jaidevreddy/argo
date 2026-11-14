import { DEG } from '../core/units'

/** Baked LOLA tile around a site (tools/bake.py terrain_tile) plus its far-horizon profile. */
export interface TerrainTile {
  id: string
  size: number // vertices per side (512)
  stepKm: number // 0.04
  /** Height above the site's tangent plane in km, row 0 north, col 0 west. Curvature included. */
  heightsKm: Float32Array
  zMinKm: number
  zMaxKm: number
  /** Horizon from terrain 10.24–200 km away (radians, per azStep from north): what the tile cannot shadow. */
  far: { azStep: number; el: Float32Array; minRangeKm: number }
}

interface TileMeta {
  size: number
  stepM: number
  unitM: number
  zMinM: number
  zMaxM: number
}

const base = `${import.meta.env.BASE_URL}data`
const cache = new Map<string, Promise<TerrainTile>>()

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`)
  return res.json() as Promise<T>
}

async function fetchTile(id: string): Promise<TerrainTile> {
  const [meta, bin, hz] = await Promise.all([
    getJson<TileMeta>(`${base}/terrain/${id}.json`),
    fetch(`${base}/terrain/${id}.bin`).then((r) => {
      if (!r.ok) throw new Error(`Could not load terrain for ${id} (${r.status})`)
      return r.arrayBuffer()
    }),
    getJson<{ azStepDeg: number; farElDeg?: number[]; farMinRangeM?: number }>(`${base}/horizon/${id}.json`),
  ])
  if (!hz.farElDeg) throw new Error(`Horizon for ${id} has no far profile: re-run tools/bake.py`)
  return parseTile(id, meta, bin, hz.azStepDeg, hz.farElDeg, hz.farMinRangeM ?? 10240)
}

export function parseTile(id: string, meta: TileMeta, bin: ArrayBuffer, azStepDeg: number, farElDeg: number[], farMinM: number): TerrainTile {
  const raw = new Int16Array(bin) // little-endian on every platform a browser runs on
  if (raw.length !== meta.size * meta.size) throw new Error(`Terrain tile ${id} has ${raw.length} samples, expected ${meta.size ** 2}`)
  const k = meta.unitM / 1000
  return {
    id,
    size: meta.size,
    stepKm: meta.stepM / 1000,
    heightsKm: Float32Array.from(raw, (v) => v * k),
    zMinKm: meta.zMinM / 1000,
    zMaxKm: meta.zMaxM / 1000,
    far: { azStep: azStepDeg * DEG, el: Float32Array.from(farElDeg, (d) => d * DEG), minRangeKm: farMinM / 1000 },
  }
}

export function loadTerrain(id: string): Promise<TerrainTile> {
  let p = cache.get(id)
  if (!p) {
    p = fetchTile(id)
    p.catch(() => cache.delete(id)) // let a later visit retry
    cache.set(id, p)
  }
  return p
}

/** Bilinear height (km) at local east/north offsets (km) from the site. */
export function heightAt(t: TerrainTile, eastKm: number, northKm: number): number {
  const half = (t.size - 1) / 2
  const c = Math.min(t.size - 1.0001, Math.max(0, eastKm / t.stepKm + half))
  const r = Math.min(t.size - 1.0001, Math.max(0, half - northKm / t.stepKm))
  const c0 = Math.floor(c), r0 = Math.floor(r), fc = c - c0, fr = r - r0
  const h = t.heightsKm, n = t.size, i = r0 * n + c0
  return h[i] * (1 - fc) * (1 - fr) + h[i + 1] * fc * (1 - fr) + h[i + n] * (1 - fc) * fr + h[i + n + 1] * fc * fr
}
