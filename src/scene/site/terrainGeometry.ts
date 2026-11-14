import { BufferAttribute, BufferGeometry } from 'three'
import type { TerrainTile } from '../../data/terrain'

/** One vertex per LOLA sample (no resampling), x = east, y = up, z = south, km. Normals from the same heights. */
export function buildTerrainGeometry(t: TerrainTile): BufferGeometry {
  const n = t.size
  const half = (n - 1) / 2
  const pos = new Float32Array(n * n * 3)
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      const i = (r * n + c) * 3
      pos[i] = (c - half) * t.stepKm
      pos[i + 1] = t.heightsKm[r * n + c]
      pos[i + 2] = (r - half) * t.stepKm // row 0 north = −z
    }
  }
  const idx = new Uint32Array((n - 1) * (n - 1) * 6)
  let k = 0
  for (let r = 0; r < n - 1; r++) {
    for (let c = 0; c < n - 1; c++) {
      const a = r * n + c, b = a + n, d = b + 1, e = a + 1
      // winding gives +y normals (verified in tests/site.spec.ts)
      idx[k++] = a; idx[k++] = b; idx[k++] = e
      idx[k++] = e; idx[k++] = b; idx[k++] = d
    }
  }
  const g = new BufferGeometry()
  g.setAttribute('position', new BufferAttribute(pos, 3))
  g.setIndex(new BufferAttribute(idx, 1))
  g.computeVertexNormals()
  g.computeBoundingBox()
  g.computeBoundingSphere()
  return g
}
