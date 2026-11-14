"""Bake per-site horizon profiles and terrain tiles from LOLA.

Usage (from repo root):  python3 tools/bake.py
Reads   data-raw/ldem_80s_40m.img, data-raw/ldem_75s_240m.img, tools/sites.src.json
Writes  public/data/sites.json, public/data/horizon/<id>.json, public/data/terrain/<id>.bin (+ .json)
Math: docs/LOGIC.md (Horizon).
"""
import json, math, os, sys
import numpy as np
from lola import R, PolarDEM, destination

RAW, OUT = "data-raw", "public/data"
MAST_M = 2.0
AZ_STEP_DEG = 0.5
NEAR_MIN_M = 200.0                          # pad scale: the 40 m grid cannot resolve terrain closer than this
NEAR_MAX_M, NEAR_STEP_M = 20_000, 40.0      # 40 m grid
FAR_MAX_M, FAR_STEP_M = 200_000, 240.0      # 240 m grid
TILE_N, TILE_STEP_M, TILE_UNIT_M = 512, 40.0, 0.25
TERRAIN_LAT_LIMIT = -80.0                   # 40 m grid coverage
POLE_EPS = 1e-6                             # rad; avoids the azimuth singularity exactly at the pole


def site_rad(s):
    lat = max(math.radians(s["lat"]), -math.pi / 2 + POLE_EPS)
    return lat, math.radians(s["lon"])


def height_any(primary, fallback, lat, lon):
    """Primary grid, falling back to the coarser grid where the primary has no coverage (north of 80°S)."""
    h = primary.height(lat, lon)
    return h if primary is fallback else np.where(np.isnan(h), fallback.height(lat, lon), h)


def horizon_profile(near, far, lat, lon, h_obs):
    az = np.radians(np.arange(0, 360, AZ_STEP_DEG))[:, None]
    best = np.full(az.shape[0], -np.pi / 2)
    for dem, d in ((near, np.arange(NEAR_MIN_M, NEAR_MAX_M, NEAR_STEP_M)),
                   (far, np.arange(NEAR_MAX_M, FAR_MAX_M + 1, FAR_STEP_M))):
        la, lo = destination(lat, lon, az, d[None, :])
        h2 = height_any(dem, far, la, lo)
        th = d[None, :] / R
        eps = np.arctan2((R + h2) * np.cos(th) - (R + h_obs), (R + h2) * np.sin(th))
        best = np.maximum(best, np.nanmax(np.where(np.isnan(eps), -np.pi / 2, eps), axis=1))
    return np.degrees(best)


def terrain_tile(near, far, lat, lon, h_site):
    """512x512 heights above the site's tangent plane, row 0 = north edge, col 0 = west edge."""
    half = (TILE_N - 1) / 2
    idx = (np.arange(TILE_N) - half) * TILE_STEP_M
    e, n = np.meshgrid(idx, -idx)  # rows go north -> south
    d = np.hypot(e, n)
    la, lo = destination(lat, lon, np.arctan2(e, n), d)
    h = height_any(near, far, la, lo)
    z = (R + h) * np.cos(d / R) - (R + h_site)  # curvature included
    q = np.round(z / TILE_UNIT_M)
    if np.isnan(q).any() or q.min() < -32768 or q.max() > 32767:
        raise ValueError("tile out of range or off-grid")
    return q.astype("<i2"), float(np.nanmin(z)), float(np.nanmax(z))


def main():
    near, far = PolarDEM(RAW, "40m"), PolarDEM(RAW, "240m")
    sites = json.load(open("tools/sites.src.json"))
    for sub in ("horizon", "terrain"):
        os.makedirs(f"{OUT}/{sub}", exist_ok=True)
    for s in sites:
        s["terrain"] = s["lat"] <= TERRAIN_LAT_LIMIT
        if not s["terrain"]:
            s["elevationM"] = None
            continue
        lat, lon = site_rad(s)
        h_site = float(near.height(lat, lon))
        s["elevationM"] = round(h_site, 1)
        prof = horizon_profile(near, far, lat, lon, h_site + MAST_M)
        json.dump({"id": s["id"], "azStepDeg": AZ_STEP_DEG, "mastM": MAST_M, "minRangeM": NEAR_MIN_M, "maxRangeKm": FAR_MAX_M / 1000,
                   "source": "LOLA LDEM_80S_40M (0-20 km) + LDEM_75S_240M (20-200 km)",
                   "elDeg": [round(float(v), 3) for v in prof]},
                  open(f"{OUT}/horizon/{s['id']}.json", "w"), separators=(",", ":"))
        tile, zmin, zmax = terrain_tile(near, far, lat, lon, h_site)
        tile.tofile(f"{OUT}/terrain/{s['id']}.bin")
        json.dump({"id": s["id"], "size": TILE_N, "stepM": TILE_STEP_M, "unitM": TILE_UNIT_M,
                   "format": "int16 LE, row 0 north, col 0 west, height above site tangent plane",
                   "zMinM": round(zmin, 1), "zMaxM": round(zmax, 1)},
                  open(f"{OUT}/terrain/{s['id']}.json", "w"))
        print(f"{s['id']:18s} elev {h_site:8.1f} m  horizon max {prof.max():5.2f}° min {prof.min():6.2f}°  tile z {zmin:7.0f}..{zmax:6.0f} m", flush=True)
    json.dump(sites, open(f"{OUT}/sites.json", "w"), indent=1)
    print(f"wrote {len(sites)} sites")


if __name__ == "__main__":
    sys.exit(main())
