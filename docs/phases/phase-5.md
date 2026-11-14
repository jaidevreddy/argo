# Phase 5: 3D site view

Status: done, 14 Nov 2026. Exit test passed: shadows agree with the sky chart at 3 checks (below).
134 tests, tsc, eslint, production build pass. Console clean. Playback in 3D: median 8.4 ms/frame
(120 Hz screen), p95 16.8 ms, on an M3 MacBook Pro, dev build.

## Built

| Area | What |
|---|---|
| Data | Far-horizon profile (10.24–200 km) added to every horizon/<id>.json by tools/bake.py. Tiles unchanged (md5) |
| Loader | src/data/terrain.ts: tile + far profile, cached, bilinear heightAt |
| Scene | src/scene/site/*: LOLA terrain (262k vertices), shadowed true Sun, Earth with true phase and spin, Sun disc, far-ridge band, lander |
| Cameras | Orbit (7.5 km, 50° off the anti-Sun side) and Stand here (eye at mast height). Face Sun / Face Earth. GSAP arrival from 95 km up |
| UI | "3D site" tab (disabled with a reason for non-terrain places), SiteControls bar, compass, pins with elevations, provenance caption, far-ridge warning |

## Exit test: 3D vs sky chart

1. Shackleton rim, 23 Nov 14:00 UTC: Sun 1.21°, 3.24° above the horizon. Stand view shows the disc well clear of the ridgeline. Earth near "new" (full Moon 24 Nov), drawn as a dark disc: correct phase.
2. Malapert Massif, 18 Nov 02:00: panel says 0% of the disc visible, sunrise in 1 h 20 min. Stand view: disc behind the ridge, only its glare above.
3. Malapert Massif, 18 Nov 08:00: panel says 0.21° clear, 94% visible. Stand view: disc sitting on the ridgeline, foreground lit.

Offline: tile shadows + far profile reproduce the full baked horizon to 0.01–0.02° mean (LOGIC.md).

## Bugs found and fixed

- Far ridges first drawn as one flat white wall, then as vertical stripes (0.5° gradient noise). Now shaded from a ±4° smoothed slope, foot fading to black.
- My own unit test expected Earth's pole "up" from (0, 0); from there Earth is overhead and its pole points lunar north. Test fixed, code was right.
- Lint: hook-value mutation (fade uniform, sky ref) → material per mode, ref synced in an effect.

## Addendum: 3D and terrain horizons for all 20 sites

The user found the 3D tab disabled for 13 of 20 sites. Fixed the same day:

- tools/fetch_dem.py pulls only the needed rows from PDS (HTTP Range, kept-alive connections): SLDEM2015 for the 12 sites
  within ±60°, LOLA LDEM_60S_60M for Chandrayaan-3. 21,000 requests, ~11 min, 75 MB saved. tools/crops.py reads them.
- bake.py builds tiles + horizons for every site; horizon JSON now carries its own label and source. Polar tiles unchanged (md5).
- Landmark checks: Apollo 15 has Hadley Delta to the south (horizon 13.5°) and Hadley Rille 311 m deep to the west;
  Apollo 17 North Massif +1.5 km to the north; Apollo 15 landing Sun 12.03° (crew landed at ~12°).
- The non-polar sky charts now use real terrain instead of the ideal sphere (Apollo 15 east horizon 7.4°).
- Also fixed: night caption said "ridges hide the Sun" when it was just night; earthshine raised to a readable exposure;
  arrival flight skipped under React StrictMode (run-once guard) → guard removed.
- Rejected: the SVS 14959 Moon GLB the user suggested. Same colour map as our globe, 78–300 MB, km-scale relief, pinched poles.

## Skipped / unchecked

- No vertical exaggeration toggle (true scale only).
- No 3D for custom points (no tile baked on the fly). Tab is disabled with a reason.
- Far-ridge dimming applied uniformly across the tile (shortcut noted in SunLight.tsx).
- Production-build FPS and integrated-GPU FPS not measured yet. Bundle still one chunk (Phase 7).
