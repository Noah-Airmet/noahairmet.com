#!/usr/bin/env python3
"""Draw the site's icon: the name's N, slipped a few degrees off its blue baseline.

Writes public/favicon.svg from the glyph outline in src/fonts/roboto-flex.woff2
(weight 1000, width 151, optical size 144: the hero's setting). The PNG and ICO
come from scripts/icons.mjs, which renders the SVG. Needs: pip install fonttools brotli
"""
import os
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen

ROOT = os.path.join(os.path.dirname(__file__), "..")
font = instancer.instantiateVariableFont(TTFont(os.path.join(ROOT, "src/fonts/roboto-flex.woff2")), {"wght": 1000, "wdth": 151, "opsz": 144})
glyphs = font.getGlyphSet()
g = glyphs[font.getBestCmap()[ord("N")]]
b = BoundsPen(glyphs); g.draw(b)
x0, y0, x1, y1 = b.bounds
w, h = x1 - x0, y1 - y0
scale = 21.5 / w                      # the N spans 21.5 of the 32 units
ox = (32 - w * scale) / 2 - x0 * scale
base = 24.5                           # baseline, in icon units
pen = SVGPathPen(glyphs, ntos=lambda v: f"{v:.2f}".rstrip("0").rstrip("."))
g.draw(TransformPen(pen, (scale, 0, 0, -scale, ox, base)))
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <!-- The name's N, a few degrees off its baseline. Drawn by scripts/icons.py. -->
  <style>.bg{{fill:#ecede8}}.ink{{fill:#121311}}.guide{{fill:#1e9bd6}}@media (prefers-color-scheme:dark){{.bg{{fill:#0b1a3c}}.ink{{fill:#eef2fa}}.guide{{fill:#63cdf7}}}}</style>
  <rect class="bg" width="32" height="32" rx="7"/>
  <rect class="guide" x="0" y="{base - 0.75}" width="32" height="1.5"/>
  <path class="ink" transform="rotate(-9 16 {base - h * scale / 2:.2f}) translate(0 -1.2)" d="{pen.getCommands()}"/>
</svg>
'''
open(os.path.join(ROOT, "public/favicon.svg"), "w").write(svg)
print("public/favicon.svg", len(svg), "bytes")
