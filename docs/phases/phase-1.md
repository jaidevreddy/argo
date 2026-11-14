# Phase 1: astro engine

Status: done, 14 Nov 2026. Exit test passed (target 0.05°, achieved max 0.0033°).

## Built

| File | Purpose |
|---|---|
| src/core/constants.ts, units.ts, types.ts | Radii, AU, mast default, synodic month; deg/rad; Site, TopoPosition, SkyState |
| src/core/astro/vec.ts | 3-vector and passive rotation helpers |
| src/core/astro/frames.ts | EQJ → Moon body-fixed matrix |
| src/core/astro/ephemeris.ts | Sun and Earth from the Moon centre in body-fixed km |
| src/core/astro/topocentric.ts | Site frame, az/el/distance/angular radius |
| src/core/astro/events.ts | sampleSeries + findCrossings (bisection to 1 s) |
| src/core/astro/index.ts | `skyAt(site, utc)`, `skyFn(site)` |
| src/data/horizons.ts | Client for the live Verify button |
| functions/api/horizons.ts | Cloudflare proxy (allow-listed keys, Moon observers only, 1-day cache) |
| tests/astro.spec.ts + fixtures/horizons.json | 116 tests |
| Config | tsconfig strict, `npm test`, Vite dev proxy for /api/horizons |

## Results

Horizons residuals over 110 cases: max 0.0033°, mean 0.0021°. All sanity tests pass.

## Skipped / unchecked

- `npm run build` and `npm test` not yet confirmed on the Mac (user to run).
- Cloudflare function not yet exercised in production (deploys on next push).
