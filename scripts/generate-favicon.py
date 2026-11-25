"""Regenerate the app favicon assets from one set of geometry knobs.

Run from the repo root:

    python scripts/generate-favicon.py

Outputs:
    app/icon.svg        (modern browsers)
    app/favicon.ico     (multi-size fallback, 16-256px)
    app/apple-icon.png  (180x180 iOS home-screen icon)

All coordinates below are in the SVG's 32x32 units, so tweak them freely.
"""

from pathlib import Path

from PIL import Image, ImageDraw

# ---------------------------------------------------------------------------
# Knobs
# ---------------------------------------------------------------------------
CANVAS = 32          # SVG viewBox size
CORNER_RADIUS = 7    # rounded-square background radius
PADDING = 4          # space around the 24x24 Lucide glyph
OFFSET_X = 0         # nudge the glyph left(-) / right(+)
OFFSET_Y = 1         # nudge the glyph up(-) / down(+)
ICON_SCALE = 1.0     # 1.0 = 24 units, smaller = more breathing room
STROKE = 2           # glyph stroke width in 32-unit space
BACKGROUND = "#ffffff"
FOREGROUND = "#000000"

ROOT = Path(__file__).resolve().parent.parent
ICON_SVG = ROOT / "app" / "icon.svg"
FAVICON = ROOT / "app" / "favicon.ico"
APPLE_ICON = ROOT / "app" / "apple-icon.png"

SIZES = [16, 24, 32, 48, 64, 128, 256]
SUPERSAMPLE = 1024

# Lucide "presentation" paths (24x24 viewBox).
GLYPH_PATHS = [
    "M2 3h20",
    "M21 3v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V3",
    "m7 21 5-5 5 5",
]


def write_svg() -> None:
    tx = PADDING + OFFSET_X
    ty = PADDING + OFFSET_Y
    paths = "\n".join(f'    <path d="{d}" />' for d in GLYPH_PATHS)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}" width="{CANVAS}" height="{CANVAS}">
  <rect width="{CANVAS}" height="{CANVAS}" rx="{CORNER_RADIUS}" fill="{BACKGROUND}" />
  <g
    fill="none"
    stroke="{FOREGROUND}"
    stroke-width="{STROKE}"
    stroke-linecap="round"
    stroke-linejoin="round"
    transform="translate({tx} {ty}) scale({ICON_SCALE})"
  >
{paths}
  </g>
</svg>
"""
    ICON_SVG.write_text(svg, encoding="utf-8")


def render_icon() -> Image.Image:
    """Draw the same design with PIL so it can be rasterised into an ICO."""
    s = SUPERSAMPLE / CANVAS
    img = Image.new("RGBA", (SUPERSAMPLE, SUPERSAMPLE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [0, 0, SUPERSAMPLE - 1, SUPERSAMPLE - 1],
        radius=CORNER_RADIUS * s,
        fill=BACKGROUND,
    )

    def p(x: float, y: float) -> tuple[float, float]:
        return (
            (PADDING + OFFSET_X + x * ICON_SCALE) * s,
            (PADDING + OFFSET_Y + y * ICON_SCALE) * s,
        )

    w = max(1, round(STROKE * ICON_SCALE * s))
    r = w / 2

    def dot(x: float, y: float) -> None:
        cx, cy = p(x, y)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=FOREGROUND)

    # Board outline (top corners are covered by the bar above it).
    draw.rounded_rectangle(
        [*p(3, 3), *p(21, 16)],
        radius=2 * ICON_SCALE * s,
        outline=FOREGROUND,
        width=w,
    )
    # Mounting bar.
    draw.line([p(2, 3), p(22, 3)], fill=FOREGROUND, width=w)
    dot(2, 3)
    dot(22, 3)
    # Stand.
    draw.line([p(7, 21), p(12, 16), p(17, 21)], fill=FOREGROUND, width=w, joint="curve")
    for pt in ((7, 21), (12, 16), (17, 21)):
        dot(*pt)

    return img


def write_raster_assets() -> None:
    img = render_icon()
    frames = [img.resize((n, n), Image.LANCZOS) for n in SIZES]
    frames[-1].save(
        FAVICON,
        format="ICO",
        sizes=[(n, n) for n in SIZES],
        append_images=frames[:-1],
    )
    img.resize((180, 180), Image.LANCZOS).save(APPLE_ICON, format="PNG")


if __name__ == "__main__":
    write_svg()
    write_raster_assets()
    print(f"Wrote {ICON_SVG.name}, {FAVICON.name}, {APPLE_ICON.name}")
