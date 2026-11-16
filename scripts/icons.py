#!/usr/bin/env python3
"""Draw the site's icon: n/a, Noah Airmet's initials, with the slash running
corner to corner and a letter on each side of it.

Writes public/favicon.svg from the outlines of n and a in src/fonts/geist.woff2
at weight 700. The PNG and ICO come from scripts/icons.mjs, which renders the
SVG. Run: uv run --with fonttools --with brotli python scripts/icons.py
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.join(os.path.dirname(__file__), "..")
font = instancer.instantiateVariableFont(TTFont(os.path.join(ROOT, "src/fonts/geist.woff2")), {"wght": 700})
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
SIZE = 15.5 / font["head"].unitsPerEm      # the letters are set at 15.5 of the 32 units
num = lambda v: f"{v:.2f}".rstrip("0").rstrip(".")


def letter(ch, baseline, left=None, right=None):
    """The glyph's path with its ink's left (or right) edge at the given x."""
    g = glyphs[cmap[ord(ch)]]
    b = BoundsPen(glyphs)
    g.draw(b)
    x0, _, x1, _ = b.bounds
    ox = left - x0 * SIZE if left is not None else right - x1 * SIZE
    pen = SVGPathPen(glyphs, ntos=num)
    g.draw(TransformPen(pen, (SIZE, 0, 0, -SIZE, ox, baseline)))
    return pen.getCommands()


# The slash runs from (22.5, 5) to (9.5, 27). Each letter keeps clear of it.
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- n/a: Noah Airmet. Drawn by scripts/icons.py. -->
  <rect width="32" height="32" rx="7" fill="#121311"/>
  <path d="M22.5 5 9.5 27" fill="none" stroke="#ecede8" stroke-width="2.2" stroke-linecap="round"/>
  <path fill="#ecede8" d="{letter("n", 15.3, right=13.6)}"/>
  <path fill="#ecede8" d="{letter("a", 26.7, left=17.7)}"/>
</svg>
'''
open(os.path.join(ROOT, "public/favicon.svg"), "w").write(svg)
print("public/favicon.svg", len(svg), "bytes")
