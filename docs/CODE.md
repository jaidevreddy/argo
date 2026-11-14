# Code

Stack: Vite 8, React 19, TypeScript 6 (strict), three.js 0.187 via @react-three/fiber + drei + postprocessing,
GSAP (+ @gsap/react), Zustand, astronomy-engine, Supabase (Phase 6, cuttable), Vitest, ESLint.
Icons: lucide-react. Styling: plain CSS. Tokens as CSS variables in `src/styles/tokens.css`, one `.module.css` per component. No Tailwind.
Hosting: Cloudflare Pages (dashboard-configured), `functions/` for server functions.

## Folder map

    functions/api/horizons.ts   Cloudflare Pages Function: allow-listed proxy to JPL Horizons, cached 1 day
    tools/                      offline Python: lola.py (DEM access), bake.py, test_bake.py, sites.src.json
    data-raw/                   big NASA downloads, GITIGNORED (see DATA.md)
    public/data/                small baked output the app loads (committed)
    src/core/                   pure TS, no React or three.js imports
      constants.ts units.ts types.ts
      astro/                    vec, frames, ephemeris, topocentric, events, index (skyAt, skyFn)
      terrain/                  horizon (Horizon, terrainHorizon, sphereHorizon, horizonAt), visibility (discFraction)
      metrics/                  power, comms, windows (spans), summary (runScenario, timeLeft)
    src/data/                   sites.ts (loadSites, loadHorizon), horizons.ts (live Verify call)
    src/workers/                compute.worker.ts (runScenario off-thread, transfers typed arrays), computeClient.ts
    src/app/                    App.tsx (layout, loads sites, starts URL sync), App.module.css
    src/state/                  scenarioStore (target, utcMs, mast, panel, mask; useTarget), urlSync (readUrl/writeUrl)
    src/scene/frame.ts          Moon body-fixed → three (x, z, −y); latLonToThree; bodyDirections(utc)
    src/data/terrain.ts         loadTerrain (tile .bin + far horizon, cached), parseTile, heightAt (bilinear)
    src/scene/site/             3D site view. local.ts (az/el → x east, y up, z south; Earth orientation from GAST),
                                terrainGeometry (1 vertex per LOLA sample), shadowFit (light-space ortho fit),
                                Terrain (regolith + radial fade), SunLight (shadowed Sun dimmed by far ridges,
                                earthshine × Earth phase), SkyBodies (Sun disc + Earth shader, ride with camera),
                                FarRidges (10–200 km silhouette band, stand view), Lander, SiteRig (orbit / stand,
                                GSAP arrival + mode flights), OverlayProjector (compass + pins), siteView store, SiteCanvas
    src/features/site/          SiteControls (Orbit / Stand here, Face Sun / Earth, compass, provenance caption)
    src/scene/globe/            GlobeCanvas, MoonGlobe, Lighting (true Sun + earthshine), CameraRig (orbit + GSAP
                                great-circle flight, view offset right of the panel), SiteMarkers (DOM layer),
                                MarkerProjector (positions DOM markers each frame), markerRegistry
    src/state/                  + computeStore (horizon, result, window, status), useScenarioCompute (loads horizon,
                                32-day window anchored to the cursor day − 2 d, recompute near edges), useNow (instant values + countdowns)
    src/features/               header/TopBar (view switch, Validation), picker/*, time/TimeDock (play 1/6/24 h/s),
                                timeline/Timeline (clearance curves, Sunlit/Earth/Both bands, drag + keyboard slider),
                                skychart/SkyChart + paths (terrain ground, tracks split at horizon and at az wrap),
                                verdict/VerdictPanel + Assumptions, validation/ValidationDialog (110 cases + live JPL)
    src/app/useShortcuts.ts     ← → 1 h, [ ] 1 day
    src/ui/                     Panel, Button, Field, Segmented (radio group), useSize (ResizeObserver)
    src/styles/                 tokens.css (all design tokens), base.css (reset, type, themed browser surfaces)
    tests/                      *.spec.ts + fixtures/
    docs/                       these docs

## Conventions

- No file over ~250 lines. No `any`. Every constant in `constants.ts` with its source.
- `src/core` angles in radians; degrees only in UI. UTC everywhere internally.
- Shortcuts carry `// shortcut: <limit>, <when to upgrade>` (ponytail rule).
- One small test for any branchy/numeric logic. Never cut validation, accessibility or the LOGIC tests.

## How the build works (environment)

- Claude writes and tests code in its cloud workspace mirror at `/home/claude/argo`, runs Vitest there,
  then copies files to the Mac with `device_commit_files` (stage under `/mnt/user-data/outputs/argo/...`).
- The Mac's Linux sandbox (`device_bash`, folder at `$HOME/mnt/argo`) has python3 + numpy + Pillow,
  4 cores, 3 GB RAM. It CANNOT run the project's node_modules (macOS binaries) and cannot delete files.
- Neither sandbox can reach JPL or PDS. Horizons data comes through Claude in Chrome (same-origin fetch on
  ssd.jpl.nasa.gov). Big downloads: the user runs curl in his own Terminal.
- The user runs `npm test`, `npm run build`, git commit and push on the Mac. Cloudflare deploys on push.
- Dev: `vite.config.ts` proxies `/api/horizons` to JPL so the Verify button works in `npm run dev`.
