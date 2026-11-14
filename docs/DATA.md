# Data

Raw files live in `data-raw/` (gitignored, ~575 MB). Baked output goes to `public/data/` (committed, small).

| File | Source | Format | Used for |
|---|---|---|---|
| ldem_80s_40m.img/.lbl | [PDS LOLA GDR polar](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/) | 15200×15200 int16 LE, polar stereographic, 40 m/px, 80°S–pole | 3D site tiles, near-field horizon |
| ldem_75s_240m.img/.lbl | same | 3812×3812 int16 LE, polar stereographic, 240 m/px, 75°S–pole | Far-field horizon to 200 km, custom polar points |
| lroc_color_poles_8k.tif | [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) | 8192×4096 RGB, equirectangular | Globe colour |
| ldem_16_uint.tif | same | 5760×2880 uint16 (I;16), equirectangular, 16 px/deg | Globe normal map (relief) |
| public/data/textures/moon_color_4k.jpg | from lroc_color_poles_8k (tools/textures.py) | 4096×2048 sRGB | Globe colour |
| public/data/textures/moon_normal_4k.jpg | from ldem_16_uint (tools/textures.py) | 4096×2048 tangent-space normals, OpenGL +Y north, relief ×6 | Globe relief |
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

## Baked output (public/data, committed)

| Path | Content |
|---|---|
| sites.json | 20 curated sites: id, name, mission, agency, status, region, lat, lon (east +), date (UTC), source URL, terrain flag, elevationM |
| horizon/<id>.json | `elDeg`: 720 horizon elevations (deg) at 0.5° azimuth steps, 200 m–200 km, 2 m mast. `farElDeg`: same from 10.24 km out (3D view) |
| terrain/<id>.bin + .json | 512×512 int16 LE, 0.25 m units, 40 m spacing (20.4 km square), row 0 = north, col 0 = west, height above the site's tangent plane (curvature included) |

Terrain sites (≥ 80°S): south-pole, shackleton-ridge, connecting-ridge, de-gerlache-rim, malapert-massif, im-2, im-1.
Everything else uses the ideal sphere horizon. Site list source of truth: `tools/sites.src.json` (each with a source link:
LROC featured images, NSSDC tables, JAXA, an Icarus 2024 ridge-site study).

## CGI Moon Kit conventions (checked)

- Equirectangular, longitude 0 at the image CENTRE (Mare Crisium / Tranquillitatis dark where expected).
- ldem_16_uint: height_m = 0.5 × value − 10000, fitted against LOLA LDEM_75S_240M, rms 42 m.

## Live data

Only the optional "Verify with JPL" button calls an external API (Horizons via `/api/horizons`). No keys.
If Horizons is down, only that button fails.

## Resource usage (for the References field)

JPL Horizons (validation + Verify), LOLA via PDS (terrain, horizons), LROC/CGI Moon Kit (globe),
Blue Marble (Earth), Quickmap + Moon Trek (per-site deep links, coordinate cross-checks).
