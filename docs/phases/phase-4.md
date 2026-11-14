# Phase 4: planner views

Status: done, 14 Nov 2026. Exit test passed: playback across a lunar day at median 16.0 ms/frame
(p95 24.4 ms, dev build) with correct numbers. 129 tests, tsc, eslint, build pass. Console clean.

## Built

| Area | What |
|---|---|
| Worker | src/workers/* — runScenario off the main thread (55 KB chunk) |
| State | computeStore, useScenarioCompute (horizon + windowed series), useNow (instant values, countdowns) |
| Verdict | Status badge (icon + label), Sun / Earth / Power rows, countdowns, window stats, panel type + Earth mask, horizon label, Assumptions |
| Sky chart | Terrain silhouette, Sun and Earth tracks (solid above terrain, dashed below), true-size discs, crosshair tooltip |
| Timeline | Clearance curves, Sunlit / Earth / Both bands, drag scrub, keyboard slider, play 1 h/s · 6 h/s · 1 d/s |
| Validation | Dialog: 110 Horizons cases recomputed in the browser + live "Verify with JPL" |
| Layout | Left sites · centre globe or sky chart · right verdict · bottom dock; view in URL (?view=sky) |

## Verified in the browser

- Shackleton rim, Nov 2026: Sun circles at 1–2°, sunlit 100%; Earth libration loop −4°…+6°; Earth 41% → verdict flips to "Power and Earth link" when scrubbed to 23 Nov.
- Malapert Massif: Sun 0.52° above the geometric horizon but 2.75° below a ridge → 0% power. Terrain decides.
- Apollo 11 landing: Sunset in 13 d 22 h, Earth 100%, sunlit 48%.
- Live JPL check at Shackleton 23 Nov 14:08 UTC: Sun 0.0030°, Earth 0.0022°.

## Bugs found and fixed

- Pre-1970 times: span finder used −1 as "no span", but Apollo-era epoch ms are negative → all spans dropped. Null sentinel + regression test.
- "Longest dark 1 min" when never dark → "None".
- Globe bled through the sky chart → opaque panel. Tracks overflowed the plot → clipPath.
- Local time truncated in the dock → moved to the date field tooltip.
- URL written every frame during playback (hitch) → throttled to 4/s, rounded to the second.

## Skipped / unchecked

- Mast height control not exposed (URL only); terrain horizons are baked for 2 m.
- Sky chart has no table view yet (Phase 7 a11y pass).
- Production FPS not measured yet (dev build only).
