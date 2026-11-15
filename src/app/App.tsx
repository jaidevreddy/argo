import { lazy, Suspense, useEffect } from 'react'
import { loadSites } from '../data/sites'
import { TopBar } from '../features/header/TopBar'
import { SitePanel } from '../features/picker/SitePanel'
import { TimeDock } from '../features/time/TimeDock'
import { VerdictPanel } from '../features/verdict/VerdictPanel'
import { GlobeCanvas } from '../scene/globe/GlobeCanvas'
import { DEFAULT_SITE_ID, useScenario, useTarget } from '../state/scenarioStore'
import { useScenarioCompute } from '../state/useScenarioCompute'
import { startUrlSync } from '../state/urlSync'
import { useShortcuts } from './useShortcuts'
import { useBoot } from './useBoot'
import { AreaLoader, BootLoader } from '../ui/Loaders'
import { Tour } from '../features/tour/Tour'
import s from './App.module.css'

// Views behind a tab load on first use; the globe, panels and dock ship in the first bundle.
const SkyChart = lazy(() => import('../features/skychart/SkyChart').then((m) => ({ default: m.SkyChart })))
const SiteCanvas = lazy(() => import('../scene/site/SiteCanvas').then((m) => ({ default: m.SiteCanvas })))
const SiteControls = lazy(() => import('../features/site/SiteControls').then((m) => ({ default: m.SiteControls })))
const CompareView = lazy(() => import('../features/compare/CompareView').then((m) => ({ default: m.CompareView })))

export function App() {
  useScenarioCompute()
  useShortcuts()
  const view = useScenario((st) => st.view)
  const target = useTarget()
  const sitesReady = useScenario((st) => st.sitesStatus === 'ready')
  const hasTerrain = !!target?.site?.terrain
  const site3d = view === 'site' && hasTerrain
  const boot = useBoot(view === 'globe' || view === 'site')

  // 3D terrain exists only for the baked polar sites; picking any other place falls back to the globe.
  useEffect(() => {
    if (view === 'site' && sitesReady && !hasTerrain) useScenario.getState().patch({ view: 'globe' })
  }, [view, sitesReady, hasTerrain])

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
      <div className={s.stage}>
        {site3d ? (
          <Suspense fallback={<AreaLoader label="Loading 3D terrain" />}>
            <SiteCanvas />
          </Suspense>
        ) : (
          <GlobeCanvas />
        )}
      </div>
      <div className={s.overlay}>
        <div className={s.top}>
          <TopBar />
        </div>
        <div className={s.left}>
          <SitePanel />
        </div>
        {view === 'sky' && (
          <div className={s.center} data-tour="view-sky">
            <Suspense fallback={null}>
              <SkyChart />
            </Suspense>
          </div>
        )}
        {site3d && (
          <div className={s.center}>
            <Suspense fallback={null}>
              <SiteControls />
            </Suspense>
          </div>
        )}
        {view === 'compare' && (
          <div className={s.center} data-tour="view-compare">
            <Suspense fallback={null}>
              <CompareView />
            </Suspense>
          </div>
        )}
        <div className={s.right}>
          <VerdictPanel />
        </div>
        <div className={s.bottom}>
          <TimeDock />
        </div>
      </div>
      <Tour ready={boot.done && sitesReady} />
      {!boot.done && <BootLoader ready={boot.ready} label={boot.label} progress={boot.progress} onDone={boot.onDone} />}
    </div>
  )
}
