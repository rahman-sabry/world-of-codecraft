"""A look's haze over a map's composite (theme.py 'voile'; the oasis's sandstorm): the contrast pulled towards the
mean, a dust colour mixed in, thicker in slow drifting bands stretched along the wind, with long streaks of blown
sand; posterised and dithered like the rest of the art, so it stays pixel art."""
import numpy as np
from engine import vnoise2, BAYER, hx


def voiler(img, nuit, voile, X0, N):
    """img: the canvas (H x W x 3 uint8, row 0 = map v -N, column 0 = map u X0); returns it hazed."""
    H, W = img.shape[:2]
    v, u = np.mgrid[-N:H - N, X0:X0 + W].astype(np.float32)
    rgb = img.astype(np.float32)
    m = rgb.mean((0, 1))
    rgb = m + (rgb - m) * (1 - (1 - voile["contraste"]) * (0.5 if nuit else 1.0))
    band = vnoise2(u * 0.25, v, 60, 171) * 0.7 + vnoise2(u * 0.2, v, 18, 172) * 0.3
    k = voile["force"] * (0.6 if nuit else 1.0) * (0.65 + 0.7 * band)
    streak = vnoise2(u * 0.04, v * 1.0, 3.0, 173) * vnoise2(u, v, 140, 174)
    k = k + (streak > 0.42) * 0.1 + (streak > 0.55) * 0.08
    k = np.floor(k * 8 + BAYER[(v.astype(int)) % 4, (u.astype(int)) % 4] * 0.9) / 8
    dust = np.array(hx(voile["nuit" if nuit else "jour"]), np.float32)
    out = rgb * (1 - k[..., None]) + dust * k[..., None]
    return np.clip(out, 0, 255).astype(np.uint8)
