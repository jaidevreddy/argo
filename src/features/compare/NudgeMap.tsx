import { useEffect, useRef } from 'react'
import type { TerrainTile } from '../../data/terrain'
import s from './CompareView.module.css'

export const MAP_KM = 2.6 // half-width of the map around the listed site
const Z_EXAG = 3 // relief exaggeration for the map only (stated in the caption)

/**
 * Shaded relief of the ±2.6 km around the listed site, from the same LOLA/SLDEM tile the 3D view uses.
 * Classic cartographic light from the north-west, relief ×3, lighter = higher (a map: the 3D view shows the real light).
 */
export function NudgeMap({ tile }: { tile: TerrainTile }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const c = ref.current
    if (!c) return
    const half = (tile.size - 1) / 2
    const r = Math.round(MAP_KM / tile.stepKm)
    const n = 2 * r + 1
    c.width = c.height = n
    const ctx = c.getContext('2d')!
    const img = ctx.createImageData(n, n)
    const h = tile.heightsKm
    const at = (row: number, col: number) => h[Math.min(tile.size - 1, Math.max(0, row)) * tile.size + Math.min(tile.size - 1, Math.max(0, col))]
    let lo = Infinity, hi = -Infinity
    for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) {
      const z = at(Math.round(half) + i, Math.round(half) + j)
      lo = Math.min(lo, z)
      hi = Math.max(hi, z)
    }
    const sun = { x: -Math.SQRT1_2 * Math.cos(Math.PI / 4), y: Math.sin(Math.PI / 4), z: -Math.SQRT1_2 * Math.cos(Math.PI / 4) } // NW, 45° up
    const k = (2 * tile.stepKm) / Z_EXAG
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const row = Math.round(half) - r + i
        const col = Math.round(half) - r + j
        const dzx = (at(row, col + 1) - at(row, col - 1)) / k // east slope
        const dzz = (at(row + 1, col) - at(row - 1, col)) / k // south slope
        const len = Math.hypot(dzx, 1, dzz)
        const shade = Math.max(0, (-dzx * sun.x + sun.y - dzz * sun.z) / len)
        // height tint: ridges lighter, hollows darker, so "on the rim" reads at a glance
        const t = (at(row, col) - lo) / (hi - lo || 1)
        const v = 10 + 175 * Math.pow(shade, 1.4) * (0.55 + 0.45 * t)
        const p = (i * n + j) * 4
        img.data[p] = v
        img.data[p + 1] = v * 0.99
        img.data[p + 2] = v * 0.97
        img.data[p + 3] = 255
      }
    }
    ctx.putImageData(img, 0, 0)
  }, [tile])
  return <canvas ref={ref} className={s.relief} aria-hidden="true" />
}
