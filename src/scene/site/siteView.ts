import { create } from 'zustand'

export type CamMode = 'orbit' | 'stand'
export type Facing = 'sun' | 'earth'

interface SiteViewState {
  mode: CamMode
  facing: Facing
  /** Bumps when the user asks to face a body again, so the rig re-aims even if `facing` didn't change. */
  aimSeq: number
  setMode: (m: CamMode) => void
  face: (f: Facing) => void
}

/** Camera state for the 3D site view. Not in the URL: it's a way of looking, not part of the scenario. */
export const useSiteView = create<SiteViewState>()((set) => ({
  mode: 'orbit',
  facing: 'sun',
  aimSeq: 0,
  setMode: (mode) => set({ mode }),
  face: (facing) => set((s) => ({ facing, aimSeq: s.aimSeq + 1, mode: 'stand' })),
}))

/** DOM elements the in-canvas projector writes to each frame (no React re-render per frame). */
export const siteOverlay: {
  compass: HTMLElement | null
  pins: Record<'site' | 'sun' | 'earth', HTMLElement | null>
} = { compass: null, pins: { site: null, sun: null, earth: null } }
