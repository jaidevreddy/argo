# Code

Stack: Vite 8, React 19, TypeScript 6 (strict), three.js 0.187 via @react-three/fiber + drei + postprocessing,
GSAP (+ @gsap/react), Zustand, astronomy-engine, Supabase (Phase 6, cuttable), Vitest, ESLint.
Styling: plain CSS. Tokens as CSS variables in `src/styles/tokens.css`, one `.module.css` per component. No Tailwind.
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
    src/workers/                compute.worker.ts                   (Phase 4)
    src/state/                  scenarioStore, uiStore, urlSync     (Phase 3)
    src/scene/                  three.js only: globe/, site/, camera/, materials/ (Phase 3, 5)
    src/features/               one folder per view                 (Phase 3+)
    src/ui/                     primitives                          (Phase 3)
    src/styles/                 tokens.css, reset.css, typography.css (Phase 3)
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
