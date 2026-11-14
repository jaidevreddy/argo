import { useEffect } from 'react'
import { useScenario } from '../state/scenarioStore'

const H = 3_600_000

/** ← → step one hour, [ ] step one day. Ignored while typing in a field. */
export function useShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || el.closest('input, textarea, select, [role="slider"], dialog')) return
      const step = e.key === 'ArrowRight' ? H : e.key === 'ArrowLeft' ? -H : e.key === ']' ? 24 * H : e.key === '[' ? -24 * H : 0
      if (!step) return
      e.preventDefault()
      const st = useScenario.getState()
      st.setTime(st.utcMs + step)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
