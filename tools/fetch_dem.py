"""Download small DEM crops around every site outside the 80°S polar grid, straight from PDS.

Run in your own Terminal from the repo root (needs internet, stdlib only):  python3 tools/fetch_dem.py
Writes data-raw/crops/<id>_{near,far}.f32 + .json  (float32 metres above the 1737.4 km sphere, row 0 north).

Sources (PDS Geosciences, LRO LOLA RDR v1):
  |lat| <= 60°  SLDEM2015 (LOLA + Kaguya TC merge). near: 512 ppd (~59 m). far: 256 ppd, every 4th sample (~474 m)
  60°S–80°S     LOLA LDEM_60S_60M polar stereographic. near: 60 m. far: every 8th sample (480 m)
Only the rows/columns needed are fetched with HTTP Range requests (~10–25 MB per site), not the 1.4–1.9 GB files.
"""
import http.client, json, math, os, struct, sys, threading, time
from concurrent.futures import ThreadPoolExecutor

HOST = "pds-geosciences.wustl.edu"
BASE = "/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/"
OUT = "data-raw/crops"
R_KM = 1737.4
KM_PER_DEG = R_KM * math.pi / 180
NEAR_KM, FAR_KM = 21.0, 205.0  # horizon near field to 20 km, far field to 200 km, plus a margin

SLDEM = {  # rows counted from 60°N; bands of 30° (512 ppd) or 60° (256 ppd)
    512: dict(bands=["30n_60n", "00n_30n", "30s_00s", "60s_30s"], lines=15360, width=45,
              path="sldem2015/tiles/float_img/sldem2015_512_{band}_{lo:03d}_{hi:03d}_float.img"),
    256: dict(bands=["0n_60n", "60s_0s"], lines=15360, width=120,
              path="sldem2015/tiles/float_img/sldem2015_256_{band}_{lo:03d}_{hi:03d}_float.img"),
}
POLAR60 = dict(path="lola_gdr/polar/img/ldem_60s_60m.img", n=31040, scale=60.0, offset=15519.5)


_local = threading.local()
_done = [0]


def get(url, start, end, tries=5):
    """One HTTP Range request on a kept-alive connection per thread (a fresh TLS handshake each time is ~1 s)."""
    for k in range(tries):
        try:
            if getattr(_local, "conn", None) is None:
                _local.conn = http.client.HTTPSConnection(HOST, timeout=60)
            _local.conn.request("GET", BASE + url, headers={"Range": f"bytes={start}-{end}", "User-Agent": "argo-space-apps"})
            r = _local.conn.getresponse()
            data = r.read()
            if r.status != 206 or len(data) != end - start + 1:
                raise IOError(f"bad range reply {r.status} {len(data)}")
            _done[0] += 1
            if _done[0] % 200 == 0:
                print(f"  {_done[0]} requests", flush=True)
            return data
        except Exception:  # noqa: BLE001 - reconnect and retry anything network-ish
            try:
                _local.conn.close()
            except Exception:  # noqa: BLE001
                pass
            _local.conn = None
            if k == tries - 1:
                raise
            time.sleep(1.5 * (k + 1))


def eqc_crop(lat, lon, half_km, ppd, stride, pool):
    g = SLDEM[ppd]
    samples, n_cols = g["width"] * ppd, 360 * ppd
    dlat = half_km / KM_PER_DEG
    dlon = dlat / math.cos(math.radians(min(89.0, abs(lat) + dlat)))
    row = lambda la: (60 - la) * ppd - 0.5
    col = lambda lo: lo * ppd - 0.5
    r0 = math.floor(row(lat + dlat)); r1 = math.ceil(row(lat - dlat))
    c0 = math.floor(col(lon - dlon)); c1 = math.ceil(col(lon + dlon))
    rows = list(range(r0, r1 + 1, stride))
    if rows[0] < 0 or rows[-1] >= len(g["bands"]) * g["lines"]:
        raise ValueError("crop leaves SLDEM2015 coverage (60°S–60°N)")

    def fetch_row(r):
        band, line = g["bands"][r // g["lines"]], r % g["lines"]
        vals, c = [], c0
        while c <= c1:  # split at tile edges and the 0/360 seam
            cw = c % n_cols
            t = cw // samples
            s0 = cw - t * samples
            take = min(c1 - c + 1, samples - s0)
            url = g["path"].format(band=band, lo=t * g["width"], hi=(t + 1) * g["width"])
            off = (line * samples + s0) * 4
            vals.extend(struct.unpack(f"<{take}f", get(url, off, off + take * 4 - 1)))
            c += take
        return [v * 1000 for v in vals[::stride]]  # km → m

    grid = list(pool.map(fetch_row, rows))
    meta = dict(kind="eqc", ppd=ppd, stride=stride, row0=r0, col0=c0, nrows=len(grid), ncols=len(grid[0]),
                source=f"SLDEM2015 {ppd} ppd" + (f" every {stride}th sample" if stride > 1 else ""))
    return grid, meta


def polar_crop(lat, lon, half_km, stride, pool):
    p = POLAR60
    la, lo = math.radians(lat), math.radians(lon)
    rho = 2 * R_KM * 1000 * math.tan(math.pi / 4 + la / 2)
    s = p["offset"] + rho * math.sin(lo) / p["scale"]
    l = p["offset"] - rho * math.cos(lo) / p["scale"]
    h = half_km * 1000 / p["scale"]
    r0, r1, c0, c1 = math.floor(l - h), math.ceil(l + h), math.floor(s - h), math.ceil(s + h)
    if r0 < 0 or c0 < 0 or r1 >= p["n"] or c1 >= p["n"]:
        raise ValueError("crop leaves LDEM_60S_60M")
    rows = list(range(r0, r1 + 1, stride))

    def fetch_row(r):
        off = (r * p["n"] + c0) * 2
        n = c1 - c0 + 1
        return [v * 0.5 for v in struct.unpack(f"<{n}h", get(p["path"], off, off + n * 2 - 1))[::stride]]

    grid = list(pool.map(fetch_row, rows))
    meta = dict(kind="polar", scale=p["scale"], offset=p["offset"], stride=stride, row0=r0, col0=c0,
                nrows=len(grid), ncols=len(grid[0]), source="LOLA LDEM_60S_60M" + (f" every {stride}th sample" if stride > 1 else ""))
    return grid, meta


def save(grid, meta, name):
    with open(f"{OUT}/{name}.f32", "wb") as f:
        for row in grid:
            f.write(struct.pack(f"<{len(row)}f", *row))
    json.dump(meta, open(f"{OUT}/{name}.json", "w"))


def main():
    os.makedirs(OUT, exist_ok=True)
    sites = [s for s in json.load(open("tools/sites.src.json")) if s["lat"] > -80]
    print(f"{len(sites)} sites, ~1,600 small requests each. Progress every 200 requests.", flush=True)
    only = set(sys.argv[1:])
    with ThreadPoolExecutor(max_workers=24) as pool:
        for s in sites:
            if only and s["id"] not in only:
                continue
            if os.path.exists(f"{OUT}/{s['id']}_far.json"):
                print(f"{s['id']:16s} already fetched")
                continue
            t = time.time()
            print(f"{s['id']:16s} fetching…", flush=True)
            lat, lon = s["lat"], s["lon"] % 360
            if abs(lat) <= 60 - FAR_KM / KM_PER_DEG:
                near = eqc_crop(lat, lon, NEAR_KM, 512, 1, pool)
                far = eqc_crop(lat, lon, FAR_KM, 256, 4, pool)
            else:
                near = polar_crop(lat, lon, NEAR_KM, 1, pool)
                far = polar_crop(lat, lon, FAR_KM, 8, pool)
            save(*near, f"{s['id']}_near")
            save(*far, f"{s['id']}_far")
            print(f"{s['id']:16s} near {near[1]['nrows']}x{near[1]['ncols']}  far {far[1]['nrows']}x{far[1]['ncols']}  {time.time() - t:5.1f} s", flush=True)
    print("done")


if __name__ == "__main__":
    sys.exit(main())
