import { OrthographicCamera, Vector3 } from 'three'

const tmp = new OrthographicCamera()
const v = new Vector3()

/**
 * Tight orthographic shadow frustum around a box for a directional light along `toLight`.
 * At grazing Sun angles (1–2° at the pole) a square fit would waste most of the shadow map;
 * fitting in light space keeps texels ~5 m across a 20 km tile.
 */
export function fitShadowCamera(cam: OrthographicCamera, lightPos: Vector3, min: Vector3, max: Vector3, pad = 0.05) {
  tmp.position.copy(lightPos)
  tmp.up.set(0, 1, 0)
  if (Math.abs(lightPos.clone().normalize().y) > 0.98) tmp.up.set(0, 0, -1)
  tmp.lookAt(0, 0, 0)
  tmp.updateMatrixWorld()
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity, z0 = Infinity, z1 = -Infinity
  for (let i = 0; i < 8; i++) {
    v.set(i & 1 ? max.x : min.x, i & 2 ? max.y : min.y, i & 4 ? max.z : min.z).applyMatrix4(tmp.matrixWorldInverse)
    x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x)
    y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y)
    z0 = Math.min(z0, v.z); z1 = Math.max(z1, v.z)
  }
  cam.left = x0 - pad
  cam.right = x1 + pad
  cam.bottom = y0 - pad
  cam.top = y1 + pad
  cam.near = Math.max(0.001, -z1 - pad)
  cam.far = -z0 + pad
  cam.updateProjectionMatrix()
}
