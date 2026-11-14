import { useProgress } from '@react-three/drei'
import { useCallback, useEffect, useState } from 'react'
import { useScenario } from '../state/scenarioStore'

const MAX_MS = 15_000 // never trap the user behind a stuck download

/** First-load gate: site list, plus the first scene's imagery when the view has a 3D scene. */
export function useBoot(hasScene: boolean) {
  const sitesStatus = useScenario((s) => s.sitesStatus)
  const { active, progress, total } = useProgress()
  const [timedOut, setTimedOut] = useState(false)
  const [done, setDone] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setTimedOut(true), MAX_MS)
    return () => clearTimeout(t)
  }, [])

  const imageryDone = !hasScene || (total > 0 && !active)
  return {
    ready: (sitesStatus !== 'loading' && imageryDone) || timedOut,
    done,
    onDone: useCallback(() => setDone(true), []),
    label: sitesStatus === 'loading' ? 'Loading landing sites' : hasScene ? 'Loading Moon imagery' : 'Getting ready',
    progress: hasScene && total > 0 ? progress : null,
  }
}
