import { X } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useScenario, type View } from '../../state/scenarioStore'
import { Button } from '../../ui/Button'
import { FEATURES } from './steps'
import s from './Tour.module.css'

const KEY = 'argo-tour-v1'
const PAD = 8
const GAP = 14
const CARD_W = 340

type Phase = 'off' | 'ask' | 'tour'
type Box = { x: number; y: number; w: number; h: number }

const seen = () => {
  try {
    return localStorage.getItem(KEY) === 'done' || new URLSearchParams(location.search).has('notour')
  } catch {
    return true
  }
}
const markSeen = () => {
  try {
    localStorage.setItem(KEY, 'done')
  } catch {
    /* private mode: ask again next time */
  }
}

/** Card to the side of the spotlight with the most room; bottom sheet on phones. */
function place(box: Box | null, cardH: number): React.CSSProperties {
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (vw < 720) return {}
  // No element (a whole view like 3D): sit low and centred so the view stays visible.
  if (!box) return { left: (vw - CARD_W) / 2, top: vh - cardH - 120 }
  const clampY = (y: number) => Math.min(Math.max(16, y), vh - cardH - 16)
  const clampX = (x: number) => Math.min(Math.max(16, x), vw - CARD_W - 16)
  const right = vw - (box.x + box.w)
  const left = box.x
  const below = vh - (box.y + box.h)
  if (right >= CARD_W + GAP * 2) return { left: box.x + box.w + GAP, top: clampY(box.y) }
  if (left >= CARD_W + GAP * 2) return { left: box.x - CARD_W - GAP, top: clampY(box.y) }
  if (below >= cardH + GAP * 2) return { left: clampX(box.x + box.w / 2 - CARD_W / 2), top: box.y + box.h + GAP }
  if (box.y >= cardH + GAP * 2) return { left: clampX(box.x + box.w / 2 - CARD_W / 2), top: box.y - cardH - GAP }
  // Target fills the screen (a whole view): sit in the lower middle, over it.
  return { left: (vw - CARD_W) / 2, top: vh - cardH - 120 }
}

function scrollers(el: HTMLElement): HTMLElement[] {
  const out: HTMLElement[] = []
  for (let p = el.parentElement; p; p = p.parentElement) {
    const o = getComputedStyle(p).overflowY
    if ((o === 'auto' || o === 'scroll') && p.scrollHeight > p.clientHeight) out.push(p)
  }
  if (!out.length && document.scrollingElement) out.push(document.scrollingElement as HTMLElement)
  return out
}

export function Tour({ ready }: { ready: boolean }) {
  const [chosen, setPhase] = useState<Phase>('off')
  const [firstRun, setFirstRun] = useState(() => !seen())
  // First visit: offer the tour once the app is on screen. The Tour button replays it.
  const phase: Phase = chosen === 'off' && ready && firstRun ? 'ask' : chosen
  const [fi, setFi] = useState(0)
  const [si, setSi] = useState(0)
  const [box, setBox] = useState<Box | null>(null)
  const [cardH, setCardH] = useState(200)
  const card = useRef<HTMLDivElement>(null)
  const before = useRef<{ view: View; compare: ReturnType<typeof useScenario.getState>['compare'] } | null>(null)

  useEffect(() => {
    const open = () => setPhase('ask')
    window.addEventListener('argo:tour', open)
    return () => window.removeEventListener('argo:tour', open)
  }, [])

  const step = phase === 'tour' ? FEATURES[fi]?.steps[si] : undefined

  const end = useCallback(() => {
    markSeen()
    setFirstRun(false)
    document.querySelectorAll<HTMLElement>('[data-tour-pad]').forEach((n) => {
      n.style.paddingBottom = n.dataset.tourPad!.trim()
      delete n.dataset.tourPad
    })
    setPhase('off')
    setBox(null)
    const b = before.current
    if (b) useScenario.getState().patch({ view: b.view, compare: b.compare })
    before.current = null
  }, [])

  const start = () => {
    const st = useScenario.getState()
    before.current = { view: st.view, compare: st.compare }
    setFi(0)
    setSi(0)
    setPhase('tour')
  }

  const next = useCallback(() => {
    const f = FEATURES[fi]
    if (si + 1 < f.steps.length) setSi(si + 1)
    else if (fi + 1 < FEATURES.length) {
      setFi(fi + 1)
      setSi(0)
    } else end()
  }, [fi, si, end])

  const skipFeature = useCallback(() => {
    if (fi + 1 < FEATURES.length) {
      setFi(fi + 1)
      setSi(0)
    } else end()
  }, [fi, end])

  // Put the app in the right view for the step, then follow the target as layout settles.
  useEffect(() => {
    if (!step) return
    const st = useScenario.getState()
    const hasTerrain = !!st.sites.find((x) => st.target.kind === 'site' && x.id === (st.target as { id: string }).id)?.terrain
    if (step.view === 'compare' && st.compare.length === 0) st.addCompare()
    if (step.view && (!step.needsTerrain || hasTerrain) && st.view !== step.view) st.patch({ view: step.view })

    if (step.needsTerrain && !hasTerrain) {
      // No 3D for a custom point: move on rather than describe a view that isn't there.
      const t = window.setTimeout(skipFeature, 0)
      return () => window.clearTimeout(t)
    }

    let scrolled = false
    const measure = () => {
      const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null
      if (!el) return setBox(null)
      const phone = window.innerWidth < 720
      // Phones pin the header over the scrolling page; nothing above its bottom edge is visible.
      const headBottom = phone ? (document.querySelector('header')?.parentElement?.getBoundingClientRect().bottom ?? 0) : 0
      if (!scrolled) {
        scrolled = true
        if (phone && !el.closest('header')) {
          // Panels can scroll inside the scrolling page: settle each one, innermost first.
          const list = scrollers(el)
          // Room below the last panel so it can scroll up above the card sheet.
          const page = list[list.length - 1]
          if (page && !page.dataset.tourPad) {
            page.dataset.tourPad = page.style.paddingBottom || ' '
            page.style.paddingBottom = '45vh'
          }
          list.forEach((sc, k) => {
            const top = k === list.length - 1 ? headBottom + 12 : sc.getBoundingClientRect().top + 8
            const dy = el.getBoundingClientRect().top - top
            if (Math.abs(dy) > 4) sc.scrollBy({ top: dy, behavior: k === list.length - 1 ? 'smooth' : 'auto' })
          })
        } else if (!phone) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
      }
      const r = el.getBoundingClientRect()
      if (r.width === 0 && r.height === 0) return setBox(null)
      // Clip to what is actually visible: inside the nearest scrolling panel and the window.
      let top = r.top, bottom = r.bottom, left = r.left, right = r.right
      for (let p = el.parentElement; p; p = p.parentElement) {
        const o = getComputedStyle(p).overflowY
        if (o === 'auto' || o === 'scroll') {
          const pr = p.getBoundingClientRect()
          top = Math.max(top, pr.top)
          bottom = Math.min(bottom, pr.bottom)
          break
        }
      }
      if (!el.closest('header')) top = Math.max(top, headBottom)
      bottom = Math.min(bottom, window.innerHeight)
      left = Math.max(left, 0)
      right = Math.min(right, window.innerWidth)
      if (bottom - top < 8) return setBox(null)
      setBox({ x: left - PAD, y: top - PAD, w: right - left + PAD * 2, h: bottom - top + PAD * 2 })
    }
    measure()
    const id = window.setInterval(measure, 250)
    window.addEventListener('resize', measure)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('resize', measure)
    }
  }, [step, skipFeature])

  useLayoutEffect(() => {
    if (card.current) setCardH(card.current.offsetHeight)
  }, [phase, fi, si])

  useEffect(() => {
    if (phase === 'off') return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        end()
      } else if (e.key === 'Enter' && phase === 'tour') {
        e.preventDefault()
        next()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [phase, next, end])

  useEffect(() => {
    if (phase !== 'off') card.current?.focus()
  }, [phase, fi, si])

  if (phase === 'off') return null

  if (phase === 'ask') {
    return (
      <div className={s.scrim}>
        <div ref={card} className={`${s.card} ${s.ask}`} role="dialog" aria-modal="true" aria-labelledby="tour-ask" tabIndex={-1}>
          <h2 id="tour-ask" className={s.title}>
            Want a quick tour?
          </h2>
          <p className={s.body}>
            Argo works out when a spot on the Moon gets sunlight for power and has Earth in view for radio, using the real terrain around it. The tour takes about a minute and you can skip any part.
          </p>
          <div className={s.actions}>
            <Button variant="quiet" size="sm" onClick={end}>
              Skip
            </Button>
            <Button variant="primary" size="sm" onClick={start}>
              Start tour
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (!step) return null
  const f = FEATURES[fi]
  const last = fi === FEATURES.length - 1 && si === f.steps.length - 1
  const more = si + 1 < f.steps.length

  return (
    <div className={s.layer}>
      <div className={s.catch} onClick={(e) => e.stopPropagation()} />
      {box ? (
        <div className={s.spot} style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
      ) : (
        <div className={s.dim} />
      )}
      <div
        ref={card}
        className={s.card}
        style={place(box, cardH)}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-body"
        tabIndex={-1}
      >
        <div className={s.top}>
          <span className={`${s.count} num`}>
            {fi + 1} of {FEATURES.length}
            {f.steps.length > 1 && <span className={s.sub}> · {si + 1}/{f.steps.length}</span>}
          </span>
          <button type="button" className={s.close} onClick={end} aria-label="End tour">
            <X size={14} aria-hidden="true" />
          </button>
        </div>
        <h2 id="tour-title" className={s.title}>
          {step.title}
        </h2>
        <p id="tour-body" className={s.body}>
          {step.body}
        </p>
        <div className={s.actions}>
          {!last && (
            <Button variant="quiet" size="sm" onClick={skipFeature} title={`Skip ${f.name}`}>
              {more ? `Skip ${f.name.toLowerCase()}` : 'Skip'}
            </Button>
          )}
          <Button variant="primary" size="sm" onClick={next}>
            {last ? 'Done' : 'Continue'}
          </Button>
        </div>
        <div className={s.dots} aria-hidden="true">
          {FEATURES.map((_, k) => (
            <span key={k} className={k === fi ? s.dotOn : k < fi ? s.dotPast : s.dot} />
          ))}
        </div>
      </div>
    </div>
  )
}
