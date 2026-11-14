"""Read DEM crops written by tools/fetch_dem.py with the same interface as lola.PolarDEM."""
import json
import numpy as np
from lola import R


class CropDEM:
    def __init__(self, raw_dir, name):
        self.m = json.load(open(f"{raw_dir}/crops/{name}.json"))
        m = self.m
        self.dem = np.fromfile(f"{raw_dir}/crops/{name}.f32", "<f4").reshape(m["nrows"], m["ncols"])
        self.source = m["source"]

    def pix(self, lat, lon):
        """lat/lon radians → fractional (col, row) in the crop."""
        m = self.m
        if m["kind"] == "eqc":
            ppd = m["ppd"]
            r = (60 - np.degrees(lat)) * ppd - 0.5
            c = np.degrees(lon) * ppd - 0.5 - m["col0"]
            n = 360 * ppd
            c = (c + n / 2) % n - n / 2  # nearest copy across the 0/360 seam
            return c / m["stride"], (r - m["row0"]) / m["stride"]
        rho = 2 * R * np.tan(np.pi / 4 + lat / 2)
        s = m["offset"] + rho * np.sin(lon) / m["scale"]
        l = m["offset"] - rho * np.cos(lon) / m["scale"]
        return (s - m["col0"]) / m["stride"], (l - m["row0"]) / m["stride"]

    def height(self, lat, lon):
        """Bilinear height in metres; NaN off the crop."""
        c, r = self.pix(np.asarray(lat, float), np.asarray(lon, float))
        nr, nc = self.dem.shape
        c0, r0 = np.floor(c).astype(np.int64), np.floor(r).astype(np.int64)
        ok = (c0 >= 0) & (r0 >= 0) & (c0 < nc - 1) & (r0 < nr - 1)
        c0, r0 = np.clip(c0, 0, nc - 2), np.clip(r0, 0, nr - 2)
        fc, fr = c - c0, r - r0
        d = self.dem
        h = (d[r0, c0] * (1 - fc) * (1 - fr) + d[r0, c0 + 1] * fc * (1 - fr)
             + d[r0 + 1, c0] * (1 - fc) * fr + d[r0 + 1, c0 + 1] * fc * fr)
        return np.where(ok, h, np.nan)
