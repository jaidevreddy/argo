"""LOLA south-polar stereographic DEM access (LDEM_*S_*M.IMG, PDS3).

Orientation verified on Shackleton, Shoemaker, Haworth, Faustini and de Gerlache:
    sample = offset + rho*sin(lon)/scale,  line = offset - rho*cos(lon)/scale
    rho = 2R * tan(pi/4 + lat/2)   (lat negative, radians)
Heights: DN * 0.5 m relative to the 1737.4 km sphere (see .lbl).
"""
import numpy as np

R = 1737400.0  # m

GRIDS = {
    "40m": dict(file="ldem_80s_40m.img", n=15200, scale=40.0, offset=7599.5),
    "240m": dict(file="ldem_75s_240m.img", n=3812, scale=240.0, offset=1905.5),
}


class PolarDEM:
    def __init__(self, raw_dir, key):
        g = GRIDS[key]
        self.n, self.scale, self.offset = g["n"], g["scale"], g["offset"]
        self.dem = np.memmap(f"{raw_dir}/{g['file']}", dtype="<i2", mode="r", shape=(self.n, self.n))

    def pix(self, lat, lon):
        """lat/lon in radians (arrays ok) -> fractional (sample, line)."""
        rho = 2 * R * np.tan(np.pi / 4 + lat / 2)
        return self.offset + rho * np.sin(lon) / self.scale, self.offset - rho * np.cos(lon) / self.scale

    def height(self, lat, lon):
        """Bilinear height in metres. Points off the grid return NaN."""
        s, l = self.pix(np.asarray(lat, float), np.asarray(lon, float))
        s0, l0 = np.floor(s).astype(np.int64), np.floor(l).astype(np.int64)
        ok = (s0 >= 0) & (l0 >= 0) & (s0 < self.n - 1) & (l0 < self.n - 1)
        s0c, l0c = np.clip(s0, 0, self.n - 2), np.clip(l0, 0, self.n - 2)
        fs, fl = s - s0c, l - l0c
        d = self.dem
        h = (d[l0c, s0c] * (1 - fs) * (1 - fl) + d[l0c, s0c + 1] * fs * (1 - fl)
             + d[l0c + 1, s0c] * (1 - fs) * fl + d[l0c + 1, s0c + 1] * fs * fl) * 0.5
        return np.where(ok, h, np.nan)


def destination(lat1, lon1, az, dist):
    """Great-circle destination on the reference sphere. Radians; dist in metres. Broadcasts."""
    d = dist / R
    lat2 = np.arcsin(np.sin(lat1) * np.cos(d) + np.cos(lat1) * np.sin(d) * np.cos(az))
    lon2 = lon1 + np.arctan2(np.sin(az) * np.sin(d) * np.cos(lat1), np.cos(d) - np.sin(lat1) * np.sin(lat2))
    return lat2, lon2
