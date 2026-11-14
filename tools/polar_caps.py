"""Polar cap textures for the globe, so the poles don't pinch.

Usage (repo root): python3 tools/polar_caps.py
Writes public/data/textures/moon_cap_{s,n}_color.jpg and moon_cap_{s,n}_normal.jpg (2048², 55°–90°).

An equirectangular map wrapped on a sphere squeezes every column into the pole: colour and relief smear into
radial streaks. These caps are polar stereographic instead, and the globe shader blends them in from 58° to 62°.

Mapping (shared with src/scene/globe/MoonGlobe.tsx), body-fixed x = lon 0, y = lon 90°E, z = north:
    X = y_bf / ((1 + |z_bf|) · T),  Y = x_bf / ((1 + |z_bf|) · T),  T = tan(35° / 2)
    u = (X + 1) / 2,  v = (Y + 1) / 2   (three.js v = 0 at the image bottom)
i.e. X = ρ·sin(lon), Y = ρ·cos(lon), ρ = tan(colat / 2) / T, the stereographic radius normalised to 1 at 55°.
Normals are object-space (three.js axes: x = bf x, y = bf z, z = −bf y), relief ×6 like the equirectangular map.
South relief uses LOLA LDEM_75S_240M from 75°S (blended over 75–77°), ldem_16 elsewhere.
"""
import math
import sys
import numpy as np
from PIL import Image
from lola import PolarDEM

Image.MAX_IMAGE_PIXELS = None
R = 1737400.0
OUT = "public/data/textures"
N = 2048
CAP_COLAT = math.radians(35.0)
T = math.tan(CAP_COLAT / 2)
RELIEF = 6.0


def cap_grid(n, south):
    """lat, lon (radians) at pixel centres of an n×n cap image (row 0 = top = v 1)."""
    u = (np.arange(n) + 0.5) / n
    X = 2 * u[None, :] - 1
    Y = 2 * (1 - u[:, None]) - 1
    rho = np.hypot(X, Y)
    colat = 2 * np.arctan(rho * T)
    lat = (np.pi / 2 - colat) * (-1 if south else 1)
    lon = np.arctan2(X, Y)
    return lat, lon, rho


def bilinear(img, x, y):
    """img[H, W(,C)] sampled at fractional (x, y) pixel coords; x wraps (longitude), y clamps."""
    h, w = img.shape[:2]
    x0 = np.floor(x).astype(np.int64)
    y0 = np.clip(np.floor(y).astype(np.int64), 0, h - 2)
    fx = (x - x0)[..., None] if img.ndim == 3 else x - x0
    fy = (np.clip(y, 0, h - 1) - y0)[..., None] if img.ndim == 3 else np.clip(y, 0, h - 1) - y0
    x0 %= w
    x1 = (x0 + 1) % w
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy)
            + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x1] * fx * fy)


def eq_xy(lat, lon, w, h):
    """Equirectangular pixel coords, longitude 0 at the image centre, row 0 = 90°N."""
    return (np.degrees(lon) / 360 + 0.5) * w - 0.5, (90 - np.degrees(lat)) / 180 * h - 0.5


def colour(south):
    src = np.asarray(Image.open("data-raw/lroc_color_poles_8k.tif").convert("RGB"), dtype=np.float32)
    lat, lon, _ = cap_grid(N, south)
    x, y = eq_xy(lat, lon, src.shape[1], src.shape[0])
    out = bilinear(src, x, y)
    Image.fromarray(np.clip(np.round(out), 0, 255).astype(np.uint8), "RGB") \
        .save(f"{OUT}/moon_cap_{'s' if south else 'n'}_color.jpg", quality=88, optimize=True, progressive=True)


def heights(south, n):
    v = np.asarray(Image.open("data-raw/ldem_16_uint.tif"), dtype=np.float32)
    h16 = 0.5 * v - 10000.0
    lat, lon, _ = cap_grid(n, south)
    x, y = eq_xy(lat, lon, h16.shape[1], h16.shape[0])
    h = bilinear(h16, x, y)
    if south:
        lola = PolarDEM("data-raw", "240m").height(lat, lon)
        w = np.clip((np.degrees(-lat) - 75.0) / 2.0, 0, 1)
        h = np.where(np.isnan(lola), h, h * (1 - w) + np.nan_to_num(lola) * w)
    return h, lat, lon


def normal(south):
    # 2× supersample, then average, so 240 m LOLA doesn't alias at ~1 km cap pixels
    h, lat, lon = heights(south, 2 * N)
    r = R + RELIEF * h
    cl = np.cos(lat)
    P = np.stack([r * cl * np.cos(lon), r * np.sin(lat), -r * cl * np.sin(lon)], -1).astype(np.float32)  # three.js object space
    Pp = np.pad(P, ((1, 1), (1, 1), (0, 0)), mode="edge")
    du = Pp[1:-1, 2:] - Pp[1:-1, :-2]   # +x in the image
    dv = Pp[:-2, 1:-1] - Pp[2:, 1:-1]   # +v (up in the image)
    n = np.cross(du, dv)
    up = P / np.linalg.norm(P, axis=-1, keepdims=True)
    n *= np.sign(np.sum(n * up, -1, keepdims=True))  # outward
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    n = n.reshape(N, 2, N, 2, 3).mean(axis=(1, 3))
    n /= np.linalg.norm(n, axis=-1, keepdims=True)
    Image.fromarray(np.round((n + 1) * 127.5).astype(np.uint8), "RGB") \
        .save(f"{OUT}/moon_cap_{'s' if south else 'n'}_normal.jpg", quality=92, optimize=True)


def check():
    """Round trip of the shared mapping: cap pixel → lat/lon → shader formula → same uv."""
    lat, lon, _ = cap_grid(64, True)
    bf = np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], -1)
    X = bf[..., 1] / ((1 + np.abs(bf[..., 2])) * T)
    Y = bf[..., 0] / ((1 + np.abs(bf[..., 2])) * T)
    u = (np.arange(64) + 0.5) / 64
    assert np.allclose((X + 1) / 2, u[None, :]) and np.allclose((Y + 1) / 2, 1 - u[:, None]), "mapping mismatch"


if __name__ == "__main__":
    check()
    for s in (True, False):
        colour(s)
        normal(s)
        print("cap", "south" if s else "north", "done", flush=True)
    sys.exit(0)
