# Design — "alpine field notes"

The reference the direction answers to: Butterfly Interaction's Pond page
(butterfly.so/pond) — huge whitespace, ghosted botanical engravings cropped
by the viewport, words in letterpress color chips, one slow ambient motion.
This site translates that grammar into the Wasatch: a **survey plate**
rather than a pond specimen sheet. Nothing here copies Pond's assets or
layout; it borrows the discipline.

## Palette (tokens in `src/styles/site.css`)

Light — high-altitude morning:

- `--paper #f6f7f1` cool green-white (deliberately not warm cream)
- `--ink #232b22` spruce black
- `--ink-soft #596456`, `--hairline #dce1d3`
- Chips: sage `#c9d4b8`, granite `#c3cdd3`, aspen gold `#ebd394`
- `--paintbrush #bf4223` — reserved exclusively for the benchmark mark
  and focus/hover accents. If paintbrush starts appearing in more places,
  the design is drifting.

Dark — alpine night: same relationships on `#141913`, chips desaturated,
paintbrush brightened to `#e06a48`. Both schemes ride
`prefers-color-scheme`; there is no toggle.

## Type

- **Besley** (variable) — display. A Clarendon revival: survey plates,
  national-park signage. Used small and confident; never poster-sized.
- **Literata** (variable, + italic) — all reading text.
- **IBM Plex Mono** 400/500 — dates, labels, chips, the plate line,
  bracketed links.

All self-hosted via Fontsource imports in `BaseLayout.astro`. Do not add
weights or families casually; every file ships to every visitor.

## Signature elements

1. **The benchmark** (`src/components/Benchmark.astro`) — a USGS
   triangulation-station mark (triangle + dot in a circle). Favicon,
   masthead, post end-mark, footer stamp ("△ 4,551 ft · Provo, Utah").
2. **Topographic contours** (`src/components/ContourField.astro`) —
   two generated contour sets (`ridge`, `knoll`) ghosted at viewport
   edges, `position: fixed`, `z-index: -1`. They draw themselves once on
   load (~2.3s, staggered) via CSS `stroke-dashoffset`; with
   `prefers-reduced-motion: reduce` they render pre-drawn. This is the
   site's **only** motion. Resist adding more.
3. **Chips and brackets** — mono metadata chips (note number, tag) and
   `[ bracketed ]` mono links, the letterpress nod to Pond.

## Artwork regeneration

`scripts/generate-contours.mjs` builds the contour paths from seeded
randomness (ridge seed 11749 = Timpanogos ft; knoll seed 4551 = Provo ft).
It writes `contours.json` + a preview HTML next to itself. To change the
terrain: edit the parameters, run the script, and re-embed its JSON into
`src/lib/contours.ts` (keep the header comment and `ContourSet` type; the
file is otherwise a literal paste of the two path arrays).

Keep `peakDrift` gentle (≤70 ridge / ≤45 knoll); large drift makes inner
rings overshoot into scratch-like artifacts.

## Voice

Copy rules live in `CONTENT-GUIDE.md`, but they are design rules too: the
page's honesty is the aesthetic. Plain sentences, true claims, no filler.
The design frames modest content; it must never compensate for it.
