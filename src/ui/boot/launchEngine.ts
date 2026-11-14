import gsap from 'gsap'
import { MotionPathPlugin } from 'gsap/MotionPathPlugin'
import { LOGO_A, LOGO_CENTER, LOGO_MOON } from '../logoPath'

gsap.registerPlugin(MotionPathPlugin)

/**
 * Binary rocket loader: a small rocket drawn in 0s and 1s with a soft glow, flying in along dashed orbits,
 * hovering while data loads, then streaming its digits into the Argo mark. Canvas 2D + GSAP; no React per frame.
 */

// Rocket silhouette, nose up, origin at its centre; 120 units tall. Porthole is a hole (even-odd).
const ROCKET =
  'M0 -60C10 -48 15 -30 15 -12L15 30L27 48L27 56L15 50L9 56L-9 56L-15 50L-27 56L-27 48L-15 30L-15 -12C-15 -30 -10 -48 0 -60Z' +
  'M5 -16A5 5 0 1 0 -5 -16A5 5 0 1 0 5 -16Z'
const ROCKET_H = 120

export interface LaunchOptions {
  mode: 'boot' | 'loop'
  rocketPx: number // rocket height on screen
  cell: number // glyph grid, px
  logoPx?: number // mark size for the boot outro
  logoDy?: number // logo centre offset from the canvas centre, px
  reducedMotion?: boolean
}

interface P {
  lx: number // rocket-local (px, rocket centre origin)
  ly: number
  tx: number // logo target (screen px)
  ty: number
  sx: number // screen pos when the morph starts
  sy: number
  m: number // morph 0..1
  ch: string
  a: number
}
interface Spark {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  ch: string
}

function sample(path: string, scale: number, cx: number, cy: number, cell: number, w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = Math.ceil(w)
  c.height = Math.ceil(h)
  const g = c.getContext('2d', { willReadFrequently: true })!
  g.translate(w / 2, h / 2)
  g.scale(scale, scale)
  g.translate(-cx, -cy)
  g.fill(new Path2D(path), 'evenodd')
  const img = g.getImageData(0, 0, c.width, c.height).data
  const pts: { x: number; y: number }[] = []
  for (let y = cell / 2; y < h; y += cell) {
    for (let x = cell / 2; x < w; x += cell) {
      if (img[(Math.floor(y) * c.width + Math.floor(x)) * 4 + 3] > 110) pts.push({ x: x - w / 2, y: y - h / 2 })
    }
  }
  return pts
}

const bit = () => (Math.random() < 0.5 ? '0' : '1')

export class LaunchEngine {
  private ctx: CanvasRenderingContext2D
  private w = 0
  private h = 0
  private dpr = 1
  private ps: P[] = []
  private sparks: Spark[] = []
  private rocket = { x: 0, y: 0, rotation: -90, scale: 1, alpha: 0 } // rotation: travel heading, deg (−90 = up)
  private scene = { orbit: 0, dash: 0, morph: 0, digits: 1, thrust: 1 }
  private tl: gsap.core.Timeline | null = null
  private hover: gsap.core.Tween[] = []
  private introDone = false
  private finishing = false
  private onTick = () => this.draw()

  private canvas: HTMLCanvasElement
  private o: LaunchOptions

  constructor(canvas: HTMLCanvasElement, o: LaunchOptions) {
    this.canvas = canvas
    this.o = o
    this.ctx = canvas.getContext('2d')!
    this.resize()
    this.build()
    gsap.ticker.add(this.onTick)
  }

  resize() {
    const r = this.canvas.getBoundingClientRect()
    this.dpr = Math.min(1.5, window.devicePixelRatio || 1) // glyphs stay crisp; 2× buys nothing but fill cost
    this.w = r.width
    this.h = r.height
    this.canvas.width = Math.round(r.width * this.dpr)
    this.canvas.height = Math.round(r.height * this.dpr)
  }

  private build() {
    const { rocketPx, cell } = this.o
    const s = rocketPx / ROCKET_H
    const rocket = sample(ROCKET, s, 0, 0, cell, 60 * s + cell * 2, ROCKET_H * s + cell * 2)
    let logo: { x: number; y: number }[] = []
    if (this.o.mode === 'boot' && this.o.logoPx) {
      const ls = this.o.logoPx / 24
      logo = sample(LOGO_A + LOGO_MOON, ls, LOGO_CENTER.x, LOGO_CENTER.y, cell, this.o.logoPx + cell * 2, this.o.logoPx + cell * 2)
    }
    const n = Math.max(rocket.length, logo.length)
    const cx = this.w / 2
    const cy = this.h / 2 + (this.o.logoDy ?? 0)
    // shuffle logo targets so digits cross paths instead of sliding in rows
    logo.sort(() => Math.random() - 0.5)
    this.ps = Array.from({ length: n }, (_, i) => {
      const r = rocket[i % rocket.length]
      const t = logo[i % Math.max(1, logo.length)] ?? r
      return { lx: r.x, ly: r.y, tx: cx + t.x, ty: cy + t.y, sx: 0, sy: 0, m: 0, ch: bit(), a: 0.55 + Math.random() * 0.45 }
    })

    const W = this.w
    const H = this.h
    const home = { x: W / 2, y: H / 2 - (this.o.mode === 'boot' ? 18 : 0) }
    this.rocket.x = home.x
    this.rocket.y = home.y
    if (this.o.reducedMotion) {
      this.rocket.alpha = 1
      this.rocket.rotation = -90
      this.scene.orbit = 1
      this.introDone = true
      return
    }

    const tl = gsap.timeline({ onComplete: () => this.startHover(home) })
    tl.to(this.scene, { orbit: 1, duration: 1.1, ease: 'power2.out' }, 0)
    tl.fromTo(this.rocket, { alpha: 0 }, { alpha: 1, duration: 0.35 }, 0.15)
    // fly in from the lower left along a sweeping curve, nose following the path
    tl.fromTo(
      this.rocket,
      { x: W * 0.12, y: H * 1.05, rotation: -60 },
      {
        duration: this.o.mode === 'boot' ? 1.5 : 1.1,
        ease: 'power3.out',
        motionPath: {
          path: [
            { x: W * 0.12, y: H * 1.05 },
            { x: W * 0.3, y: H * 0.72 },
            { x: W * 0.46, y: home.y + H * 0.06 },
            { x: home.x, y: home.y },
          ],
          curviness: 1.4,
          autoRotate: true,
        },
      },
      0.1,
    )
    tl.to(this.rocket, { rotation: -90, duration: 0.6, ease: 'power2.inOut' }, '-=0.45')
    this.tl = tl
  }

  private startHover(home: { x: number; y: number }) {
    this.introDone = true
    if (this.finishing) {
      // loading finished during the fly-in: go straight to the outro
      this.onIntro?.()
      return
    }
    this.hover = [
      gsap.to(this.rocket, { y: home.y - 5, duration: 1.4, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
      gsap.fromTo(this.rocket, { rotation: -92.5 }, { rotation: -87.5, duration: 2.1, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    ]
  }

  private onIntro: (() => void) | null = null

  /** Loading finished: wait for the fly-in if needed, then stream into the mark (boot) and resolve. */
  finish(): Promise<void> {
    if (this.finishing) return Promise.resolve()
    this.finishing = true
    return new Promise((resolve) => {
      const go = () => {
        this.hover.forEach((t) => t.kill())
        if (this.o.reducedMotion || this.o.mode !== 'boot') {
          gsap.to(this.rocket, { alpha: 0, duration: this.o.reducedMotion ? 0 : 0.3, onComplete: () => resolve() })
          return
        }
        // freeze every digit's current screen position, then fly each to its place in the mark
        for (const p of this.ps) {
          const q = this.toScreen(p.lx, p.ly)
          p.sx = q.x
          p.sy = q.y
        }
        const tl = gsap.timeline({ onComplete: () => resolve() })
        tl.to(this.rocket, { y: this.rocket.y - 14, duration: 0.35, ease: 'power2.in' }, 0)
        tl.to(this.scene, { thrust: 0, duration: 0.5 }, 0.2)
        tl.to(this.ps, { m: 1, duration: 0.95, ease: 'expo.inOut', stagger: { each: 0.0025, from: 'random' } }, 0.25)
        tl.to(this.scene, { morph: 1, duration: 0.01 }, 0.25)
        tl.to(this.scene, { orbit: 0, duration: 0.8, ease: 'power2.in' }, 0.4)
        tl.to(this.scene, { digits: 0, duration: 0.45, ease: 'power1.in' }, '-=0.1')
      }
      if (this.introDone) go()
      else this.onIntro = go
    })
  }

  private toScreen(lx: number, ly: number) {
    const a = ((this.rocket.rotation + 90) * Math.PI) / 180 // nose points along the heading
    const c = Math.cos(a)
    const s = Math.sin(a)
    return { x: this.rocket.x + lx * c - ly * s, y: this.rocket.y + lx * s + ly * c }
  }

  private draw() {
    const { ctx, dpr, w, h } = this
    const cell = this.o.cell
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)
    this.drawOrbits(ctx)

    // exhaust: digits shed from both nozzles, drifting back along the heading
    if (this.rocket.alpha > 0.5 && this.scene.thrust > 0.05 && !this.scene.morph) {
      const k = this.o.rocketPx / ROCKET_H
      for (let i = 0; i < 3; i++) {
        const side = i % 2 ? 1 : -1
        const p = this.toScreen(side * (4 + Math.random() * 5) * k, 60 * k)
        const a = ((this.rocket.rotation + 90) * Math.PI) / 180
        const sp = (1.2 + Math.random() * 1.6) * this.scene.thrust
        this.sparks.push({ x: p.x, y: p.y, vx: -Math.sin(a) * sp + (Math.random() - 0.5) * 0.6, vy: Math.cos(a) * sp + (Math.random() - 0.5) * 0.4, life: 1, ch: bit() })
      }
    }
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const font = `600 ${Math.round(cell * 1.15)}px "JetBrains Mono Variable", ui-monospace, monospace`
    ctx.font = font
    for (const sp of this.sparks) {
      sp.x += sp.vx
      sp.y += sp.vy
      sp.life -= 0.022
      if (sp.life <= 0) continue
      // fresh exhaust is warm, cooling to white as it fades
      ctx.fillStyle = sp.life > 0.7 ? `rgba(245,177,66,${sp.life})` : `rgba(255,255,255,${sp.life * 0.55})`
      ctx.fillText(sp.ch, sp.x, sp.y)
    }
    this.sparks = this.sparks.filter((s) => s.life > 0)

    // the rocket / the mark
    const alpha = this.rocket.alpha * this.scene.digits
    if (alpha > 0.01) {
      for (const p of this.ps) {
        if (Math.random() < 0.035) p.ch = bit()
        let x: number
        let y: number
        if (this.scene.morph) {
          const t = p.m
          x = p.sx + (p.tx - p.sx) * t
          y = p.sy + (p.ty - p.sy) * t
        } else {
          const q = this.toScreen(p.lx, p.ly)
          x = q.x
          y = q.y
        }
        ctx.fillStyle = `rgba(255,255,255,${p.a * alpha})`
        ctx.fillText(p.ch, x, y)
      }
    }

    // glow: a CSS drop-shadow on the canvas element (GPU); a per-frame canvas blur stalls the main thread
  }

  private drawOrbits(ctx: CanvasRenderingContext2D) {
    const o = this.scene.orbit
    if (o <= 0.01) return
    const { w, h } = this
    this.scene.dash -= 0.35
    ctx.save()
    ctx.lineWidth = 1
    ctx.setLineDash([5, 6])
    ctx.lineDashOffset = this.scene.dash
    const arcs: [number, number, number, number, number, number][] = [
      // cx, cy, rx, ry, rotation, share of the full ellipse to draw
      [w * 0.62, h * 0.86, w * 0.62, h * 0.5, -0.32, 0.55],
      [w * 0.6, h * 0.9, w * 0.66, h * 0.58, -0.28, 0.5],
      [w * 0.28, h * 0.2, w * 0.4, h * 0.62, 0.5, 0.35],
    ]
    arcs.forEach(([cx, cy, rx, ry, rot, share], i) => {
      ctx.strokeStyle = `rgba(255,255,255,${(i === 1 ? 0.16 : 0.24) * o})`
      ctx.beginPath()
      const start = Math.PI * (1.02 + i * 0.1)
      ctx.ellipse(cx, cy, rx, ry, rot, start, start + Math.PI * 2 * share * o)
      ctx.stroke()
    })
    ctx.restore()
  }

  destroy() {
    gsap.ticker.remove(this.onTick)
    this.tl?.kill()
    this.hover.forEach((t) => t.kill())
    gsap.killTweensOf(this.rocket)
    gsap.killTweensOf(this.scene)
    gsap.killTweensOf(this.ps)
  }
}
