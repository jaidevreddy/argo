import { useId, useLayoutEffect, useRef } from 'react'
import s from './Segmented.module.css'

interface Props<T extends string> {
  label: string
  value: T
  options: { value: T; label: string; disabled?: boolean; title?: string }[]
  onChange: (v: T) => void
  size?: 'sm' | 'md'
}

/**
 * Pill segmented control (a radio group: arrow keys move between options natively).
 * The selected pill slides between options instead of jumping.
 */
export function Segmented<T extends string>({ label, value, options, onChange, size = 'md' }: Props<T>) {
  const name = useId()
  const group = useRef<HTMLDivElement>(null)
  const thumb = useRef<HTMLSpanElement>(null)
  const first = useRef(true)

  useLayoutEffect(() => {
    const g = group.current
    const t = thumb.current
    if (!g || !t) return
    const place = () => {
      const on = g.querySelector<HTMLElement>(`[data-value="${CSS.escape(value)}"]`)
      if (!on) return
      t.style.width = `${on.offsetWidth}px`
      t.style.transform = `translateX(${on.offsetLeft}px)`
    }
    // first placement without animation, then every change slides
    if (first.current) {
      t.style.transition = 'none'
      place()
      void t.offsetWidth
      t.style.transition = ''
      first.current = false
    } else place()
    const ro = new ResizeObserver(place)
    ro.observe(g)
    return () => ro.disconnect()
  }, [value, options])

  return (
    <div ref={group} role="radiogroup" aria-label={label} className={`${s.group} ${s[size]}`}>
      <span ref={thumb} className={s.thumb} aria-hidden="true" />
      {options.map((o) => (
        <label key={o.value} data-value={o.value} className={`${s.opt} ${o.value === value ? s.on : ''} ${o.disabled ? s.off : ''}`} title={o.title}>
          <input type="radio" name={name} value={o.value} checked={o.value === value} disabled={o.disabled} onChange={() => onChange(o.value)} className={s.input} />
          {o.label}
        </label>
      ))}
    </div>
  )
}
