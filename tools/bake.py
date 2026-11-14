"""Bake per-site horizon profiles and terrain tiles from LOLA.

Usage (from repo root):  python3 tools/bake.py
Reads   data-raw/ldem_80s_40m.img, data-raw/ldem_75s_240m.img (sites at or below 80°S),
        data-raw/crops/<id>_{near,far} from tools/fetch_dem.py (every other site), tools/sites.src.json
Writes  public/data/sites.json, public/data/horizon/<id>.json, public/data/terrain/<id>.bin (+ .json),
        public/data/nudge/<id>.json (exact horizons at 1 and 2 km in 8 directions)
Math: docs/LOGIC.md (Horizon).
"""
import json, math, os, sys
import numpy as np
from crops import CropDEM
from lola import R, PolarDEM, destination

RAW, OUT = "data-raw", "public/data"
MAST_M = 2.0
AZ_STEP_DEG = 0.5
NEAR_MIN_M = 200.0                          # pad scale: the 40 m grid cannot resolve terrain closer than this
NEAR_MAX_M, NEAR_STEP_M = 20_000, 40.0      # 40 m grid
FAR_MAX_M, FAR_STEP_M = 200_000, 240.0      # 240 m grid
TILE_N, TILE_STEP_M, TILE_UNIT_M = 512, 40.0, 0.25
FAR_HORIZON_MIN_M = 10_240.0               # beyond the tile's half-width: the 3D view's tile casts the nearer shadows
TERRAIN_LAT_LIMIT = -80.0                   # 40 m grid coverage
POLE_EPS = 1e-6                             # rad; avoids the azimuth singularity exactly at the pole


def site_rad(s):
    lat = max(math.radians(s["lat"]), -math.pi / 2 + POLE_EPS)
    return lat, math.radians(s["lon"])


def height_any(primary, fallback, lat, lon):
    """Primary grid, falling back to the coarser grid where the primary has no coverage (north of 80°S)."""
    h = primary.height(lat, lon)
    return h if primary is fallback else np.where(np.isnan(h), fallback.height(lat, lon), h)


def horizon_profile(near, far, lat, lon, h_obs, min_m=NEAR_MIN_M):
    """Max elevation angle per azimuth. min_m: scalar, or one minimum range per azimuth (metres)."""
    az = np.radians(np.arange(0, 360, AZ_STEP_DEG))[:, None]
    min_az = np.broadcast_to(np.asarray(min_m, float), (az.shape[0],))[:, None]
    best = np.full(az.shape[0], -np.pi / 2)
    for dem, d in ((near, np.arange(min_az.min(), NEAR_MAX_M, NEAR_STEP_M)),
                   (far, np.arange(NEAR_MAX_M, FAR_MAX_M + 1, FAR_STEP_M))):
        la, lo = destination(lat, lon, az, d[None, :])
        h2 = height_any(dem, far, la, lo)
        th = d[None, :] / R
        eps = np.arctan2((R + h2) * np.cos(th) - (R + h_obs), (R + h2) * np.sin(th))
        eps = np.where(np.isnan(eps) | (d[None, :] < min_az), -np.pi / 2, eps)
        best = np.maximum(best, eps.max(axis=1))
    return np.degrees(best)


TILE_HALF_M = (TILE_N - 1) / 2 * TILE_STEP_M


def tile_exit_m(e0, n0):
    """Per azimuth: distance from (e0, n0) to the tile edge. Beyond it the 3D view needs the far profile."""
    az = np.radians(np.arange(0, 360, AZ_STEP_DEG))
    de, dn = np.sin(az), np.cos(az)
    with np.errstate(divide="ignore"):
        te = np.where(np.abs(de) > 1e-12, (np.sign(de) * TILE_HALF_M - e0) / de, np.inf)
        tn = np.where(np.abs(dn) > 1e-12, (np.sign(dn) * TILE_HALF_M - n0) / dn, np.inf)
    return np.minimum(te, tn)


NUDGE_RINGS_M = (1000.0, 2000.0)


def nudge_points(near, far, lat, lon):
    """Exact horizons at 1 and 2 km in the 8 compass directions (the Nudge view's candidates)."""
    pts = []
    for ring in NUDGE_RINGS_M:
        for k in range(8):
            a = math.radians(45 * k)
            plat, plon = destination(lat, lon, a, ring)
            plat, plon = float(plat), float(plon)
            e0, n0 = ring * math.sin(a), ring * math.cos(a)
            h = float(near.height(plat, plon))
            full = horizon_profile(near, far, plat, plon, h + MAST_M)
            farp = horizon_profile(near, far, plat, plon, h + MAST_M, tile_exit_m(e0, n0))
            pts.append({"eKm": round(e0 / 1000, 4), "nKm": round(n0 / 1000, 4),
                        "lat": round(math.degrees(plat), 6), "lon": round((math.degrees(plon) + 180) % 360 - 180, 6),
                        "elevationM": round(h, 1),
                        "elDeg": [round(float(v), 2) for v in full], "farElDeg": [round(float(v), 2) for v in farp]})
    return pts


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


def dems_for(s, polar):
    """(near, far, horizon source, short resolution label, UI horizon label) or None if no data yet."""
    if s["lat"] <= TERRAIN_LAT_LIMIT:
        return (*polar, "LOLA LDEM_80S_40M (0-20 km) + LDEM_75S_240M (20-200 km)", "LOLA 40 m", "Terrain horizon (LOLA)")
    if not os.path.exists(f"{RAW}/crops/{s['id']}_far.json"):
        return None
    near, far = CropDEM(RAW, f"{s['id']}_near"), CropDEM(RAW, f"{s['id']}_far")
    sldem = near.m["kind"] == "eqc"
    return (near, far, f"{near.source} (0-20 km) + {far.source} (20-200 km)",
            "SLDEM2015 59 m" if sldem else "LOLA 60 m",
            "Terrain horizon (LOLA + Kaguya)" if sldem else "Terrain horizon (LOLA)")


def main():
    polar = (PolarDEM(RAW, "40m"), PolarDEM(RAW, "240m"))
    sites = json.load(open("tools/sites.src.json"))
    for sub in ("horizon", "terrain", "nudge"):
        os.makedirs(f"{OUT}/{sub}", exist_ok=True)
    for s in sites:
        d = dems_for(s, polar)
        s["terrain"] = d is not None
        if d is None:
            s["elevationM"] = None
            print(f"{s['id']:18s} no DEM crop yet (run tools/fetch_dem.py): ideal sphere horizon")
            continue
        near, far, source, s["terrainRes"], label = d
        lat, lon = site_rad(s)
        h_site = float(near.height(lat, lon))
        s["elevationM"] = round(h_site, 1)
        prof = horizon_profile(near, far, lat, lon, h_site + MAST_M)
        far_prof = horizon_profile(near, far, lat, lon, h_site + MAST_M, FAR_HORIZON_MIN_M)
        json.dump({"id": s["id"], "azStepDeg": AZ_STEP_DEG, "mastM": MAST_M, "minRangeM": NEAR_MIN_M, "maxRangeKm": FAR_MAX_M / 1000,
                   "source": source, "label": label,
                   "elDeg": [round(float(v), 3) for v in prof],
                   "farMinRangeM": FAR_HORIZON_MIN_M,
                   "farElDeg": [round(float(v), 3) for v in far_prof]},
                  open(f"{OUT}/horizon/{s['id']}.json", "w"), separators=(",", ":"))
        tile, zmin, zmax = terrain_tile(near, far, lat, lon, h_site)
        tile.tofile(f"{OUT}/terrain/{s['id']}.bin")
        json.dump({"id": s["id"], "size": TILE_N, "stepM": TILE_STEP_M, "unitM": TILE_UNIT_M,
                   "format": "int16 LE, row 0 north, col 0 west, height above site tangent plane",
                   "zMinM": round(zmin, 1), "zMaxM": round(zmax, 1)},
                  open(f"{OUT}/terrain/{s['id']}.json", "w"))
        pts = nudge_points(near, far, lat, lon)
        json.dump({"id": s["id"], "azStepDeg": AZ_STEP_DEG, "mastM": MAST_M, "ringsKm": [r / 1000 for r in NUDGE_RINGS_M], "points": pts},
                  open(f"{OUT}/nudge/{s['id']}.json", "w"), separators=(",", ":"))
        # compact copy for the app to resolve a nudged target without loading profiles: [eKm, nKm, lat, lon, elevationM]
        s["nudgePoints"] = [[p["eKm"], p["nKm"], p["lat"], p["lon"], p["elevationM"]] for p in pts]
        print(f"{s['id']:18s} elev {h_site:8.1f} m  horizon max {prof.max():5.2f}° min {prof.min():6.2f}°  tile z {zmin:7.0f}..{zmax:6.0f} m", flush=True)
    json.dump(sites, open(f"{OUT}/sites.json", "w"), indent=1)
    print(f"wrote {len(sites)} sites")


if __name__ == "__main__":
    sys.exit(main())
