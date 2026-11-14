import gsap from 'gsap'
import { useCallback, useEffect, useRef, useState } from 'react'
import { LaunchEngine } from './boot/launchEngine'
import { Logo } from './Logo'
import s from './Loaders.module.css'

const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const LOGO_PX = 112
const LOGO_DY = -28 // the mark sits a little above centre, the wordmark below it
const SEEN = 'argo-boot-seen'

/**
 * First load: a binary rocket flies in on dashed orbits, hovers while data loads, then streams into the mark.
 * Shown in full once per tab session; later reloads get a short fade.
 */
export function BootLoader({ ready, label, progress, onDone }: { ready: boolean; label: string; progress: number | null; onDone: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const engine = useRef<LaunchEngine | null>(null)
  // Read once; marked seen only when the sequence completes (StrictMode runs effects twice).
  const [quick] = useState(() => {
    try {
      return sessionStorage.getItem(SEEN) === '1'
    } catch {
      return false // storage unavailable (private mode): always play
    }
  })
  const finish = useCallback(() => {
    try {
      sessionStorage.setItem(SEEN, '1')
    } catch {
      // ignore
    }
    onDone()
  }, [onDone])

  useEffect(() => {
    if (quick || !canvas.current) return
    const e = new LaunchEngine(canvas.current, { mode: 'boot', rocketPx: 92, cell: 6, logoPx: LOGO_PX, logoDy: LOGO_DY, reducedMotion: reduced() })
    engine.current = e
    const onResize = () => e.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      e.destroy()
      engine.current = null
    }
  }, [quick])

  useEffect(() => {
    if (!ready) return
    const el = root.current!
    const q = gsap.utils.selector(el)
    const fadeOut = () => gsap.to(el, { autoAlpha: 0, duration: 0.5, ease: 'power2.out', onComplete: finish })
    if (quick || !engine.current) {
      fadeOut()
      return
    }
    let tl: gsap.core.Timeline | null = null
    gsap.to(q('[data-status]'), { autoAlpha: 0, y: 6, duration: 0.3, ease: 'power2.in' }) // clear the stage for the mark
    engine.current.finish().then(() => {
      tl = gsap.timeline({ onComplete: fadeOut })
      tl.fromTo(q('[data-mark]'), { autoAlpha: 0, scale: 0.94 }, { autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power3.out' }, 0)
      tl.fromTo(q('[data-word] span'), { autoAlpha: 0, y: 8 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power3.out', stagger: 0.05 }, 0.15)
      tl.to({}, { duration: 0.45 })
    })
    return () => {
      tl?.kill()
    }
  }, [ready, quick, finish])

  return (
    <div ref={root} className={s.boot} role="status" aria-live="polite" aria-label={ready ? 'Ready' : label}>
      <canvas ref={canvas} className={s.canvas} aria-hidden="true" />
      <div className={s.mark} data-mark style={{ marginTop: LOGO_DY - (0.4 * LOGO_PX) / 24 }}>
        <Logo size={LOGO_PX} />
      </div>
      <div className={s.word} data-word aria-hidden="true">
        {'Argo'.split('').map((c, i) => (
          <span key={i}>{c}</span>
        ))}
      </div>
      <div className={s.status} data-status>
        <span className={s.label}>
          {label}
          {progress !== null && <span className="num"> {Math.round(progress)}%</span>}
        </span>
        <span className={s.track} aria-hidden="true">
          <i style={{ transform: `scaleX(${(progress ?? 0) / 100})` }} />
        </span>
      </div>
    </div>
  )
}

/** The same rocket, small, looping where something is loading (globe imagery, a terrain tile). */
export function AreaLoader({ label, progress = null }: { label: string; progress?: number | null }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    if (!canvas.current) return
    const e = new LaunchEngine(canvas.current, { mode: 'loop', rocketPx: 54, cell: 4, reducedMotion: reduced() })
    return () => e.destroy()
  }, [])
  return (
    <div className={s.area} role="status">
      <canvas ref={canvas} className={s.areaCanvas} aria-hidden="true" />
      <p className={s.areaLabel}>
        {label}
        {progress !== null && <span className="num"> {Math.round(progress)}%</span>}
      </p>
    </div>
  )
}
