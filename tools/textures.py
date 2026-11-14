"""Globe textures from the NASA SVS CGI Moon Kit.

Usage (repo root): python3 tools/textures.py
  data-raw/lroc_color_poles_8k.tif -> public/data/textures/moon_color_4k.jpg
  data-raw/ldem_16_uint.tif        -> public/data/textures/moon_normal_4k.jpg (tangent space, OpenGL +Y = north)

Both maps: equirectangular, longitude 0 at the image centre (checked on Mare Crisium / Tranquillitatis).
ldem_16_uint height scale calibrated against LOLA LDEM_75S_240M: h_m = 0.5 * v - 10000 (rms 42 m).
Relief on the globe normal map is exaggerated (RELIEF) for legibility at globe scale; the 3D site view is 1:1.
"""
import numpy as np
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
R = 1737400.0
OUT = "public/data/textures"
W, H = 4096, 2048
RELIEF = 6.0


def colour():
    Image.open("data-raw/lroc_color_poles_8k.tif").convert("RGB").resize((W, H), Image.LANCZOS) \
        .save(f"{OUT}/moon_color_4k.jpg", quality=88, optimize=True, progressive=True)


def normal():
    v = np.asarray(Image.open("data-raw/ldem_16_uint.tif"), dtype=np.float32)
    h = 0.5 * v - 10000.0
    h = np.asarray(Image.fromarray(h, mode="F").resize((W, H), Image.BILINEAR), dtype=np.float64)
    lat = np.radians(90 - (np.arange(H) + 0.5) * 180 / H)[:, None]
    step = np.radians(360 / W)  # same angular step in lat and lon
    dx = R * np.maximum(np.cos(lat), 0.02) * step   # east spacing, metres
    dy = R * step                                    # north spacing, metres
    gx = (np.roll(h, -1, axis=1) - np.roll(h, 1, axis=1)) / (2 * dx)   # dh/d(east), wraps in lon
    hn = np.vstack([h[:1], h, h[-1:]])
    gy = (hn[:-2] - hn[2:]) / (2 * dy)                                  # dh/d(north): row 0 is north
    n = np.dstack([-gx * RELIEF, -gy * RELIEF, np.ones_like(h)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    Image.fromarray(np.round((n + 1) * 127.5).astype(np.uint8), "RGB") \
        .save(f"{OUT}/moon_normal_4k.jpg", quality=92, optimize=True)


if __name__ == "__main__":
    colour()
    normal()
    print("ok")
