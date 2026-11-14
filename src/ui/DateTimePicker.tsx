import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import s from './DateTimePicker.module.css'

const DAY = 864e5
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEK = ['M', 'T', 'W', 'T', 'F', 'S', 'S']
const short = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
const pad = (n: number) => String(n).padStart(2, '0')
const ymd = (ms: number) => {
  const d = new Date(ms)
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() }
}
const startOfDay = (ms: number) => Math.floor(ms / DAY) * DAY

interface Props {
  value: number // UTC ms
  onChange: (ms: number) => void
  /** Days to mark with a dot, e.g. the site's landing date. */
  marks?: { ms: number; label: string }[]
}

/** Date + time in UTC. A calm popover in place of the browser's native picker. */
export function DateTimePicker({ value, onChange, marks = [] }: Props) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()

  const close = (focusTrigger = true) => {
    setClosing(true)
    setTimeout(() => {
      setOpen(false)
      setClosing(false)
      if (focusTrigger) trigger.current?.focus()
    }, 140)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [open])

  const d = new Date(value)
  return (
    <div ref={root} className={s.root}>
      <button
        ref={trigger}
        type="button"
        className={s.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <CalendarDays size={14} aria-hidden="true" className={s.icon} />
        <span className="num">{short.format(value)}</span>
        <span className={`${s.time} num`}>
          {pad(d.getUTCHours())}:{pad(d.getUTCMinutes())}
        </span>
        <span className={s.zone}>UTC</span>
      </button>
      {open && <Popover id={id} value={value} onChange={onChange} marks={marks} closing={closing} onClose={() => close()} />}
    </div>
  )
}

function Popover({ id, value, onChange, marks, closing, onClose }: Props & { id: string; closing: boolean; onClose: () => void; marks: { ms: number; label: string }[] }) {
  const cur = ymd(value)
  const [view, setView] = useState<'days' | 'months'>('days')
  const [month, setMonth] = useState({ y: cur.y, m: cur.m })
  const [dir, setDir] = useState<1 | -1>(1)
  const [focusMs, setFocusMs] = useState(startOfDay(value))
  const [today] = useState(() => startOfDay(Date.now())) // fixed for the popover's lifetime
  const grid = useRef<HTMLDivElement>(null)
  const timeOfDay = value - startOfDay(value)

  useEffect(() => {
    grid.current?.querySelector<HTMLButtonElement>('[tabindex="0"]')?.focus()
  }, [focusMs, view])

  const shift = (k: number) => {
    setDir(k > 0 ? 1 : -1)
    setMonth(({ y, m }) => {
      const t = y * 12 + m + k
      return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 }
    })
  }
  const pick = (dayMs: number) => onChange(dayMs + timeOfDay)

  // 6 weeks, Monday first
  const first = Date.UTC(month.y, month.m, 1)
  const lead = (new Date(first).getUTCDay() + 6) % 7
  const cells = Array.from({ length: 42 }, (_, i) => first + (i - lead) * DAY)
  const selected = startOfDay(value)

  const onGridKey = (e: KeyboardEvent) => {
    const step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key]
    if (step) {
      e.preventDefault()
      const next = focusMs + step * DAY
      const n = ymd(next)
      if (n.m !== month.m || n.y !== month.y) shift(n.y * 12 + n.m - (month.y * 12 + month.m))
      setFocusMs(next)
    } else if (e.key === 'Escape') onClose()
  }

  return (
    <div id={id} role="dialog" aria-label="Choose date and time, UTC" className={`${s.pop} ${closing ? s.closing : ''}`} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
      <div className={s.head}>
        <button type="button" className={s.title} onClick={() => setView(view === 'days' ? 'months' : 'days')} aria-expanded={view === 'months'}>
          {view === 'days' ? `${MONTHS[month.m]} ${month.y}` : month.y}
          <ChevronRight size={14} aria-hidden="true" className={`${s.caret} ${view === 'months' ? s.caretOpen : ''}`} />
        </button>
        <span className={s.nav}>
          <button type="button" className={s.navBtn} onClick={() => (view === 'days' ? shift(-1) : setMonth((x) => ({ ...x, y: x.y - 1 })))} aria-label={view === 'days' ? 'Previous month' : 'Previous year'}>
            <ChevronLeft size={16} />
          </button>
          <button type="button" className={s.navBtn} onClick={() => (view === 'days' ? shift(1) : setMonth((x) => ({ ...x, y: x.y + 1 })))} aria-label={view === 'days' ? 'Next month' : 'Next year'}>
            <ChevronRight size={16} />
          </button>
        </span>
      </div>

      {view === 'days' ? (
        <div className={s.daysWrap}>
          <div className={s.week} aria-hidden="true">
            {WEEK.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div ref={grid} key={`${month.y}-${month.m}`} role="grid" aria-label={`${MONTHS[month.m]} ${month.y}`} className={`${s.days} ${dir > 0 ? s.fromRight : s.fromLeft}`} onKeyDown={onGridKey}>
            {cells.map((c) => {
              const dd = ymd(c)
              const mark = marks.find((k) => startOfDay(k.ms) === c)
              return (
                <button
                  key={c}
                  type="button"
                  role="gridcell"
                  tabIndex={c === focusMs ? 0 : -1}
                  aria-selected={c === selected}
                  aria-label={`${short.format(c)}${mark ? `, ${mark.label}` : ''}`}
                  className={`${s.day} ${dd.m !== month.m ? s.out : ''} ${c === selected ? s.sel : ''} ${c === today ? s.today : ''}`}
                  onClick={() => {
                    setFocusMs(c)
                    pick(c)
                  }}
                >
                  <span className="num">{dd.d}</span>
                  {mark && <i className={s.mark} title={mark.label} />}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className={s.months}>
          {MONTHS.map((name, i) => (
            <button
              key={name}
              type="button"
              className={`${s.month} ${i === cur.m && month.y === cur.y ? s.sel : ''}`}
              onClick={() => {
                setMonth((x) => ({ y: x.y, m: i }))
                setView('days')
              }}
            >
              {name.slice(0, 3)}
            </button>
          ))}
          <label className={s.year}>
            <span>Year</span>
            <input
              className="num"
              inputMode="numeric"
              value={month.y}
              onChange={(e) => {
                const y = Number(e.target.value.replace(/\D/g, '').slice(0, 4))
                if (y > 0) setMonth((x) => ({ ...x, y }))
              }}
              aria-label="Year"
            />
          </label>
        </div>
      )}

      <div className={s.timeRow}>
        <span className={s.timeLabel}>Time</span>
        <TimeField value={value} onChange={onChange} />
        <span className={s.zone}>UTC</span>
        <span className={s.grow} />
        <button type="button" className={s.chip} onClick={() => onChange(Math.round(Date.now() / 60000) * 60000)}>
          Now
        </button>
        <button type="button" className={`${s.chip} ${s.done}`} onClick={onClose}>
          Done
        </button>
      </div>
    </div>
  )
}

/** HH:MM with arrow keys stepping the focused part (↑↓ 1, Shift 10), typing two digits jumps on. */
function TimeField({ value, onChange }: { value: number; onChange: (ms: number) => void }) {
  const d = new Date(value)
  const day = startOfDay(value)
  const set = (h: number, m: number) => onChange(day + ((((h * 60 + m) % 1440) + 1440) % 1440) * 60000)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const part = (v: number, max: number, apply: (n: number) => void, label: string) => (
    <input
      className={`${s.part} num`}
      inputMode="numeric"
      aria-label={label}
      value={pad(v)}
      onFocus={(e) => e.target.select()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
          e.preventDefault()
          apply(v + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? 10 : 1))
        }
      }}
      onChange={(e) => {
        const n = Number(e.target.value.replace(/\D/g, '').slice(-2))
        if (n <= max) apply(n)
      }}
    />
  )
  return (
    <span className={s.timeField}>
      {part(h, 23, (n) => set(n, m), 'Hours, UTC')}
      <span aria-hidden="true">:</span>
      {part(m, 59, (n) => set(h, n), 'Minutes')}
    </span>
  )
}
