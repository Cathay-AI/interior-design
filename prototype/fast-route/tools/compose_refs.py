#!/usr/bin/env python3
"""Merge a noisy low-resolution path trace with a clean rasterised guide of the same camera.

    compose_refs.py <pathtrace.png> <raster.png> <out.jpg>

The path trace knows the real lighting (bounced light, soft shadows) but is noisy; the raster image is
clean but flatly lit. We take lighting = pathtrace / raster, smooth it with an edge-aware guided filter
(edges come from the clean image), and multiply it back onto the clean image.
"""
import sys
import numpy as np
from PIL import Image


def box(a, r):
    """Mean filter of radius r (edge-clamped) via cumulative sums."""
    for axis in (0, 1):
        pad = [(0, 0)] * a.ndim
        pad[axis] = (r + 1, r)
        c = np.cumsum(np.pad(a, pad, mode='edge'), axis=axis, dtype=np.float64)
        n = a.shape[axis]
        hi = np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=axis)
        lo = np.take(c, np.arange(0, n), axis=axis)
        a = (hi - lo) / (2 * r + 1)
    return a


def guided(guide, src, r, eps):
    mg, ms = box(guide, r), box(src, r)
    a = (box(guide * src, r) - mg * ms) / (box(guide * guide, r) - mg * mg + eps)
    b = ms - a * mg
    return box(a, r) * guide + box(b, r)


def main(pt_path, raster_path, out_path):
    raster_img = Image.open(raster_path).convert('RGB')
    size = (raster_img.width // 2, raster_img.height // 2)  # the guide is rendered at 2x for anti-aliasing
    raster = (np.asarray(raster_img.resize(size, Image.LANCZOS), dtype=np.float64) / 255) ** 2.2
    pt_img = Image.open(pt_path).convert('RGB')
    raster_small = (np.asarray(raster_img.resize(pt_img.size, Image.BOX), dtype=np.float64) / 255) ** 2.2
    pt = (np.asarray(pt_img, dtype=np.float64) / 255) ** 2.2

    e = 0.02
    ratio = np.clip((box(pt, 2) + e) / (box(raster_small, 2) + e), 0.15, 5.0)
    up = np.stack([np.asarray(Image.fromarray(ratio[..., c].astype(np.float32), 'F').resize(size, Image.BICUBIC)) for c in range(3)], -1).astype(np.float64)
    guide = raster @ np.array([0.2126, 0.7152, 0.0722])
    guide = guide ** (1 / 2.2)
    r = max(6, size[0] // 55)
    smooth = np.stack([guided(guide, guided(guide, up[..., c], r, 4e-3), r // 2, 2e-3) for c in range(3)], -1)
    out = np.clip(raster * np.clip(smooth, 0.15, 5.0), 0, 1) ** (1 / 2.2)
    # a little photographic finish: gentle S-curve and vignette
    out = 0.03 + 0.97 * np.clip(out, 0, 1) ** 1.15                                   # bring highlights back from the edge
    out = np.clip(out - 0.085 * np.sin(out * 2 * np.pi) / 2, 0, 1)     # S-curve: deeper shadows, cleaner whites
    grey = out @ np.array([0.2126, 0.7152, 0.0722])
    out = np.clip(grey[..., None] + (out - grey[..., None]) * 1.08, 0, 1)
    yy, xx = np.mgrid[0:size[1], 0:size[0]]
    v = 1 - 0.16 * (((xx / size[0] - 0.5) ** 2 + (yy / size[1] - 0.5) ** 2) / 0.5) ** 1.5
    out = out * v[..., None]
    Image.fromarray((np.clip(out, 0, 1) * 255 + 0.5).astype(np.uint8)).save(out_path, quality=86, optimize=True, progressive=True)


if __name__ == '__main__':
    main(*sys.argv[1:4])
