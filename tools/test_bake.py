"""Synthetic checks for the horizon march. Run: python3 tools/test_bake.py"""
import math
import numpy as np
from lola import R, destination
import bake


class FlatWithPeak:
    """Flat sphere with one 3 km-high, 1 km-wide plateau at a known spot."""

    def __init__(self, lat, lon):
        self.lat, self.lon = lat, lon

    def height(self, lat, lon):
        # angular distance to the peak, in metres along the surface
        c = np.sin(lat) * np.sin(self.lat) + np.cos(lat) * np.cos(self.lat) * np.cos(lon - self.lon)
        d = np.arccos(np.clip(c, -1, 1)) * R
        return np.where(d < 500, 3000.0, 0.0)


def test_peak_angle():
    site_lat, site_lon = math.radians(-88.0), math.radians(20.0)
    peak_d, peak_az = 30_000.0, math.radians(135.0)
    plat, plon = destination(site_lat, site_lon, peak_az, peak_d)
    dem = FlatWithPeak(plat, plon)
    prof = bake.horizon_profile(dem, dem, site_lat, site_lon, 2.0)
    i = round(135.0 / bake.AZ_STEP_DEG)
    # expected: nearest plateau edge at ~29.5 km, height 3000 m, curvature included
    d = peak_d - 500
    th = d / R
    expected = math.degrees(math.atan2((R + 3000) * math.cos(th) - (R + 2.0), (R + 3000) * math.sin(th)))
    assert abs(prof[i] - expected) < 0.1, (prof[i], expected)
    # opposite direction sees only the curved flat surface: the dip is ~ -sqrt(2h/R) at the grid edge
    j = round(315.0 / bake.AZ_STEP_DEG)
    assert prof[j] < 0, prof[j]
    print(f"peak az 135: {prof[i]:.3f} deg (expected {expected:.3f}); az 315: {prof[j]:.3f} deg")


def test_flat_sphere_dip():
    class Flat:
        def height(self, lat, lon):
            return np.zeros(np.broadcast(lat, lon).shape)
    prof = bake.horizon_profile(Flat(), Flat(), math.radians(-85.0), 0.0, 2.0)
    # the highest ray grazes the sphere at the tangent point: dip = -acos(R / (R + h))
    expected = -math.degrees(math.acos(R / (R + 2.0)))
    assert np.allclose(prof, expected, atol=1e-3), (prof.min(), prof.max(), expected)
    print(f"flat sphere horizon: {prof[0]:.4f} deg (expected {expected:.4f})")


if __name__ == "__main__":
    test_peak_angle()
    test_flat_sphere_dip()
    print("ok")
