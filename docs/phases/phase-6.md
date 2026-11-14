# Phase 6: compare and nudge

Status: done, 14 Nov 2026. Exit test passed: three Artemis ridge sites compared on one date; Nudge finds a better
spot at Malapert, Go moves there, and the verdict, sky chart, timeline and 3D view all follow. 138 tests, tsc,
eslint, build pass. Console clean.

## Built

| Area | What |
|---|---|
| Engine | core/metrics/mission.ts (first-30-day metrics, runMissions sharing one ephemeris pass), bodySeries |
| Bake | 16 nudge points per site with exact horizons + far profiles (public/data/nudge, 2.4 MB); nudgePoints in sites.json |
| State | Target can sit on a nudge point (`site.3`, URL `&at=3`); compare list in the URL (`&cmp=a@ISO~b@ISO`) |
| Worker | 'missions' job next to 'scenario' |
| UI | Compare view (table, Best marks, 30-day strips, Artemis preset), Nudge (relief map, 16 spots, best moves, ±3 days) |
| 3D | Nudged lander on the same tile: position, Sun/Earth from the point, rotated far ridges, camera flies to it |

## Results worth showing

Artemis ridges, touchdown 15 Nov 2026 00:00 UTC, first 30 days, tracking panel, 0° mask:

| | Shackleton rim | Connecting Ridge | Malapert Massif |
|---|---|---|---|
| Power + Earth link | 317 h | 60 h | 377 h (best) |
| Sunlit | 100% (best) | 68% | 75% |
| Earth in view | 44% | 28% | 78% (best) |

- Malapert, 2 km E: +109 h (486 h; Earth in view 100%). After moving, Nudge reports it as a local best.
- Shackleton rim: every spot within 2 km loses 178–317 h (off the ridge); landing 3 days later gains 61 h.

## Bugs found and fixed

- One test assumed a 2-day shift must change ops hours; at Malapert with a sphere horizon it genuinely doesn't. Test fixed.
- Grouping key for shared ephemeris passes was muddled; replaced with explicit {phase, cases} groups.
- Relief map too flat to read the ridge → ×3 relief + height tint; map key overlapped a label → moved.

## Skipped / unchecked

- Supabase saved scenarios: skipped; the URL already saves and shares compare lists and nudged spots.
- Nudge only on listed sites (custom points have no baked neighbours).
- Compare of a pre-1970 and a 2026 landing works (separate ephemeris groups) but wasn't exercised in the browser.
