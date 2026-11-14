# Phase 2: terrain data and metrics

Status: done, 14 Nov 2026. Exit test passed: 125 Vitest tests + Python bake tests.

## Built

| File | Purpose |
|---|---|
| tools/lola.py | Memory-mapped LOLA polar grids, verified projection, bilinear heights, great-circle destination |
| tools/bake.py | Per terrain site: 720-pt horizon to 200 km + 512² terrain tile; writes public/data/sites.json |
| tools/test_bake.py | Synthetic peak (5.29° vs 5.31° expected) and flat sphere (−0.0869°) checks |
| tools/sites.src.json | 20 sourced sites (7 south-polar with terrain) |
| src/core/terrain/horizon.ts, visibility.ts | Horizon model + interpolation; partial-disc visibility |
| src/core/metrics/power.ts, comms.ts, windows.ts, summary.ts | Power index, DTE margin, spans, `runScenario`, `timeLeft` |
| src/data/sites.ts | `loadSites`, `loadHorizon` |
| tests/metrics.spec.ts | Disc, horizon, windows, equator/far-side/polar scenarios |

## Decisions

- Ignore terrain within 200 m (pad scale). Without it, local 9–12° slopes produced 6–11° near-field horizons.
- `openEnd` spans so "time to sunset" never silently counts down to the end of the computed range.

## Results

See LOGIC.md › Validation (Phase 2). Headline: Shackleton rim 81.7% sunlit over 2026; IM-1 slope 11.9° vs LROC 12°.

## Skipped / unchecked

- Custom polar points get the sphere horizon until Phase 6 (in-browser march on a downsampled grid).
- Horizon is baked for a 2 m mast; other mast heights only change the sphere horizon.
- `npm test` on the Mac not yet confirmed.
