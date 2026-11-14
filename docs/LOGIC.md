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

## Horizon (Phase 2)

Per azimuth (0.5° steps, 720 values) march outward along the great circle to 200 km, keep the max of

    θ = d / R
    ε = atan2((R + h2)·cos θ − (R + h1), (R + h2)·sin θ)

h1 = observer height (surface + mast), h2 = terrain height at the sample. Includes curvature.
Near field from LDEM_80S_40M, far field from LDEM_75S_240M.

| Site | Horizon | UI label |
|---|---|---|
| Curated, ≥ 80°S | Baked LOLA profile | Terrain horizon (LOLA) |
| Custom, ≥ 80°S | Computed from the 240 m grid | Terrain horizon (LOLA, coarse) |
| Elsewhere | Sphere + mast dip, −acos(R/(R+h)) | Ideal sphere horizon |

## Visibility and metrics (Phase 2)

Disc fraction above horizon H for a disc of angular radius ρ, x = clamp((el − H)/ρ, −1, 1):

    f = (acos(−x) + x·sqrt(1 − x²)) / π

| Metric | Definition |
|---|---|
| Sunlit | f_sun > 0 |
| Power, tracking panel | f_sun |
| Power, fixed flat panel | f_sun × max(0, sin el_sun) |
| DTE link | Earth centre el − H − mask > 0 (mask default 0°, up to 5°) |
| Events | Sign change on a 10-min series, bisection to 1 s (`events.ts`) |
| Windows | Longest sunlit span, longest dark span, ops window = sunlit ∧ Earth visible |

No opaque score. Any ranking shows its weights and lets the user edit them.

## Validation (Phase 1 results)

- 110 JPL Horizons cases (DE441, `coord@301`, MEAN_ME, airless, alt 0) at 9 sites × 6 dates × Sun/Earth,
  plus the Apollo 11 landing instant. File: `tests/fixtures/horizons.json`.
- Metric: great-circle separation (robust near zenith). Result: **max 0.0033°, mean 0.0021°**. Test fails above 0.01°.
- Apollo 11 landing 1969-07-20 20:17:40 UT: Sun az 88.805° el 10.702° (Horizons 88.805 / 10.703).
- Sanity: Sun < 1.65° at the pole all year; Earth below −70° at far-side centre; Earth near zenith at 0,0;
  one sunrise + one sunset per lunar day at the equator, refined to < 0.001°.
