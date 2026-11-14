import { useEffect } from 'react'
import { loadSites } from '../data/sites'
import { TopBar } from '../features/header/TopBar'
import { SitePanel } from '../features/picker/SitePanel'
import { SkyChart } from '../features/skychart/SkyChart'
import { TimeDock } from '../features/time/TimeDock'
import { VerdictPanel } from '../features/verdict/VerdictPanel'
import { GlobeCanvas } from '../scene/globe/GlobeCanvas'
import { DEFAULT_SITE_ID, useScenario } from '../state/scenarioStore'
import { useScenarioCompute } from '../state/useScenarioCompute'
import { startUrlSync } from '../state/urlSync'
import { useShortcuts } from './useShortcuts'
import s from './App.module.css'

export function App() {
  useScenarioCompute()
  useShortcuts()
  const view = useScenario((st) => st.view)

  useEffect(() => {
    const stop = startUrlSync()
    let alive = true
    loadSites()
      .then((sites) => {
        if (!alive) return
        const st = useScenario.getState()
        st.setSites(sites)
        // A shared link may name a site that no longer exists: fall back to the default.
        if (st.target.kind === 'site' && !sites.some((x) => x.id === (st.target as { id: string }).id)) {
          st.selectSite(DEFAULT_SITE_ID)
        }
      })
      .catch(() => alive && useScenario.getState().setSitesError())
    return () => {
      alive = false
      stop()
    }
  }, [])

  return (
    <div className={s.app}>
      <GlobeCanvas />
      <div className={s.overlay}>
        <div className={s.top}>
          <TopBar />
        </div>
        <div className={s.left}>
          <SitePanel />
        </div>
        {view === 'sky' && (
          <div className={s.center}>
            <SkyChart />
          </div>
        )}
        <div className={s.right}>
          <VerdictPanel />
        </div>
        <div className={s.bottom}>
          <TimeDock />
        </div>
      </div>
    </div>
  )
}
