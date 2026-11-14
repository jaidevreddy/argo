import type { Vector3 } from 'three'

/**
 * Bridge between the DOM marker layer (outside the Canvas) and the projector (inside it).
 * The layer registers each marker element with its world position; the projector moves it every frame.
 */
export const markerRegistry = new Map<string, { el: HTMLElement; pos: Vector3 }>()
