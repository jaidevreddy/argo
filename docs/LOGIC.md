# Logic

Rule: angles are radians inside `src/core`, degrees only at the UI edge. Times are UTC ms. Distances km.

## Position pipeline (built, Phase 1)

1. Time → `astronomy-engine` AstroTime (handles UT→TT and ΔT).
2. Geocentric J2000 (EQJ) vectors: Moon = `GeoMoon`, Sun = `GeoVector(Sun, aberration=true)`.
   From the Moon centre: Sun = Sun − Moon, Earth = −Moon.
3. EQJ → Moon body-fixed: M = Rz(W) · Rx(90° − δ) · Rz(90° + α), passive rotations.
   α, δ, W from `RotationAxis(Body.Moon)` (IAU WGCCRE with E1..E13 libration terms). RA arrives in HOURS: ×15.
4. Site: radius 1737.4 km + LOLA elevation + mast (default 2 m). Local east/north/up unit vectors.
5. Topocentric: d = normalize(target − site). el = asin(d·up), az = atan2(d·east, d·north) clockwise from north.
   Parallax is exact (Earth parallax ≈ 0.25°).
6. Angular radius = asin(R_body / distance): Sun ≈ 0.26–0.27°, Earth ≈ 0.9–1.0°.
7. No refraction (airless).

Frame note: Horizons and LOLA use the Mean-Earth (ME) frame; astronomy-engine uses the IAU model.
They differ by ~100 m on the surface. Measured effect on angles: ≤ 0.0033° (see Validation).

## Horizon (built, Phase 2)

Per azimuth (0.5° steps, 720 values) march outward along the great circle to 200 km, keep the max of

    θ = d / R
    ε = atan2((R + h2)·cos θ − (R + h1), (R + h2)·sin θ)

h1 = observer height (surface + mast), h2 = terrain height at the sample. Includes curvature.
Near field 200 m–20 km from LDEM_80S_40M (40 m steps), far field 20–200 km from LDEM_75S_240M (240 m steps).
Where the 40 m grid has no coverage (north of 80°S) the 240 m grid fills in.
Terrain closer than 200 m is ignored: pad scale, and the 40 m grid cannot resolve it. Baked with a 2 m mast;
the app's mast setting changes the sphere horizon only (shortcut: re-bake per mast height if a judge asks).
Bake: `tools/bake.py` (1.5 s for 7 sites). Tests: `tools/test_bake.py` (synthetic peak within 0.03°, flat sphere = −0.0869°).

| Site | Horizon | UI label |
|---|---|---|
| Curated, ≥ 80°S | Baked LOLA profile | Terrain horizon (LOLA) |
| Curated, within ±60° | Baked SLDEM2015 profile (59 m to 20 km, 474 m to 200 km) | Terrain horizon (LOLA + Kaguya) |
| Chandrayaan-3 | Baked LOLA 60 m / 480 m profile | Terrain horizon (LOLA) |
| Custom, ≥ 80°S | Computed from the 240 m grid | Terrain horizon (LOLA, coarse) |
| Custom, elsewhere | Sphere + mast dip, −acos(R/(R+h)) | Ideal sphere horizon |

## Visibility and metrics (built, Phase 2)

Disc fraction above horizon H for a disc of angular radius ρ, x = clamp((el − H)/ρ, −1, 1):

    f = (acos(−x) + x·sqrt(1 − x²)) / π

| Metric | Definition |
|---|---|
| Sunlit | f_sun > 0 |
| Power, tracking panel | f_sun |
| Power, fixed flat panel | f_sun × max(0, sin el_sun) |
| DTE link | Earth centre el − H − mask > 0 (mask default 0°, up to 5°) |
| Events | Sun: top limb vs horizon. Earth: centre vs horizon + mask. Sign change on the series, bisection to 1 s |
| Windows | Spans close at sample midpoints. A span reaching the end of the range is `openEnd`; the UI shows "more than X h" |

No opaque score. Any ranking shows its weights and lets the user edit them.

## Validation (Phase 1 results)

- 110 JPL Horizons cases (DE441, `coord@301`, MEAN_ME, airless, alt 0) at 9 sites × 6 dates × Sun/Earth,
  plus the Apollo 11 landing instant. File: `tests/fixtures/horizons.json`.
- Metric: great-circle separation (robust near zenith). Result: **max 0.0033°, mean 0.0021°**. Test fails above 0.01°.
- Apollo 11 landing 1969-07-20 20:17:40 UT: Sun az 88.805° el 10.702° (Horizons 88.805 / 10.703).
- Sanity: Sun < 1.65° at the pole all year; Earth below −70° at far-side centre; Earth near zenith at 0,0;
  one sunrise + one sunset per lunar day at the equator, refined to < 0.001°.

## 3D site view (Phase 5)

Frame: three.js x = east, y = up, z = south (north = −z), km, origin at the site on its tangent plane.
Direction from topocentric az/el: (sin az · cos el, sin el, −cos az · cos el), the same az/el the sky chart uses.
Terrain: the baked tile as-is (heights above the tangent plane, curvature included), one vertex per sample.

The tile covers ±10.24 km. Terrain beyond it is handled by a second baked profile, `farElDeg` (10.24–200 km):

    Sun light intensity = I₀ · f(el_sun, H_far(az_sun), ρ_sun)     (disc fraction, see Visibility)

Inside the tile the shadow map does the work. At the site, tile shadows ∪ far horizon must equal the full
horizon. Checked offline by marching the tile per azimuth (200 m–10.24 km) and taking max(tile, far):

| Site | mean abs diff vs full horizon | max |
|---|---|---|
| Shackleton rim | 0.010° | 0.20° |
| Malapert Massif | 0.024° | 0.13° |
| Connecting Ridge | 0.020° | 0.30° |
| IM-1 | 0.011° | 0.09° |
| South pole | 0.015° | 0.25° |

The max is about one Sun radius and comes from resampling at 200–400 m range. shortcut: the far-ridge dimming is
computed at the site and applied to the whole tile (points 10 km off see a slightly different far horizon).

Earth: orientation from GAST (astronomy-engine SiderealTime) in EQJ, rotated into the site frame; precession
ignored (0.3°, invisible at 2° apparent size). Phase from the same Sun light; earthshine ∝ (1 − ŝ·ê)/2.

## Mission metrics, Compare and Nudge (Phase 6)

A landing is judged on its first 30 days after touchdown, 10-min samples:

| Metric | Definition |
|---|---|
| Power + Earth link (h) | Σ time with Sun disc fraction > 0 and Earth margin > 0 (headline) |
| First unbroken window | Length of the power+link span containing touchdown (0 if none) |
| Sunlight after touchdown | End of the lit span containing touchdown; null = lands in darkness |
| Sunlit %, Earth in view %, longest dark | As in Phase 2, over the 30 days |

No blended score: each row is one plain quantity and the best column per row is marked (ties marked together).
Tested against runScenario over the same span (identical to 1e-6).

Nudge candidates: 16 baked points at 1 and 2 km in the 8 compass directions (tools/bake.py nudge_points), each with
its own full horizon (same method as the site) and a far profile from that point's distance to the tile edge per
azimuth, so the 3D view of a nudged lander stays consistent. Plus touchdown ±1, 2, 3 days at the current point.
All 23 cases share one ephemeris pass; each keeps its own exact site frame (parallax, local vertical).

3D for a nudged point: Sun/Earth directions computed from the point, expressed in the listed site's scene frame
(`sceneDirs`); the point's own north is turned by up to ~10° near the pole and the far-ridge ring is rotated to match.

## Window model (Phase 4)

The worker samples a 32-day window starting 2 days before the cursor's UTC day, 10-minute steps (4609 samples).
It is reused while the cursor stays inside [start + 12 h, end − 3 d]; leaving that range anchors a new window.
Instant values at the cursor are computed on the main thread (skyAt + horizonAt); countdowns come from the
window's spans and events, so "more than X" appears when a span runs to the window end.

## Validation (Phase 2 results)

- Projection orientation confirmed on 5 craters (Shackleton, Shoemaker, Haworth, Faustini, de Gerlache).
- IM-1: baked elevation 2594 m vs LROC 2579 m; local slope 11.9° vs LROC "sloped at 12°".
- One year from 2026-01-01, 1 h steps, tracking panel, 0° mask:

| Site | Sunlit | Earth in view | Both | Longest dark |
|---|---|---|---|---|
| Shackleton rim at ridge | 81.7% | 46.5% | 42.3% | 203 h |
| Connecting Ridge C1 | 57.8% | 23.4% | 13.6% | 355 h |
| Malapert Massif | 43.8% | 73.8% | 32.0% | 523 h |
| South pole point | 27.9% | 25.9% | 6.3% | 651 h |

  Shackleton rim matches LROC's "illuminated up to 90% of the time" for that ridge. Malapert's high Earth
  visibility matches its reputation as a comms site (nearside-facing massif).
- Equator (Apollo 11) lunar day: 48–53% sunlit, Earth 100%, one sunrise + one sunset, ~14.8 days lit.
- Far side (Chang'e 6): Earth 0%.
