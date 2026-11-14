# Data

Raw files live in `data-raw/` (gitignored, ~575 MB). Baked output goes to `public/data/` (committed, small).

| File | Source | Format | Used for |
|---|---|---|---|
| ldem_80s_40m.img/.lbl | [PDS LOLA GDR polar](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/) | 15200×15200 int16 LE, polar stereographic, 40 m/px, 80°S–pole | 3D site tiles, near-field horizon |
| ldem_75s_240m.img/.lbl | same | 3812×3812 int16 LE, polar stereographic, 240 m/px, 75°S–pole | Far-field horizon to 200 km, custom polar points |
| lroc_color_poles_8k.tif | [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | 8192×4096 RGB, equirectangular | Globe colour |
| ldem_16_uint.tif | same | 5760×2880 uint16 (I;16), equirectangular, 16 px/deg | Globe normal map (relief) |
| public/data/textures/earth_2048.jpg | NASA Blue Marble, via three.js examples | 2048×1024 | Earth in the lunar sky |
| public/data/textures/earth_clouds_1024.png | same | 1024×512 | Earth clouds |
| tests/fixtures/horizons.json | JPL Horizons API, DE441 | 110 cases | Validation |

## LOLA polar stereographic (from the .lbl files)

- height_m = DN × 0.5 (relative to 1737.4 km sphere). Planetary radius = DN × 0.5 + 1737400 m.
- Centre lat −90°, centre lon 0°, sphere R = 1737.4 km.
- 80S_40M: map scale 40 m/px, line & sample projection offset 7599.5 px.
- 75S_240M: map scale 240 m/px, line & sample projection offset 1905.5 px.
- Pixel → projected metres: x = (sample − offset) × scale, y = (offset − line) × scale. Then
  ρ = hypot(x, y), lat = −90° + 2·atan(ρ / 2R) in degrees, lon = atan2(x, y) (east-positive).
  CHECK the axis sign convention against a known feature (Shackleton centre ≈ 89.67°S, 129.8°E) before trusting it.

## Live data

Only the optional "Verify with JPL" button calls an external API (Horizons via `/api/horizons`). No keys.
If Horizons is down, only that button fails.

## Resource usage (for the References field)

JPL Horizons (validation + Verify), LOLA via PDS (terrain, horizons), LROC/CGI Moon Kit (globe),
Blue Marble (Earth), Quickmap + Moon Trek (per-site deep links, coordinate cross-checks).
