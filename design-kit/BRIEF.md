# Design brief — noahairmet.com

## Subject

Noah Airmet: cybersecurity undergrad at BYU (class of 2028), junior
developer at Simplicity Group (insurance technology), building toward
technical AI governance — threat modeling, evals, and audit-grade
documentation for AI systems. Skis, hikes, and mountain-bikes the Wasatch.
Early-career on purpose: the site must read as honest notes from someone
learning, not a thought-leader brand.

## Audience and job

Security/GRC hiring managers, professors, future colleagues. They spend
under a minute. The page's one job: "this person is real, careful, and
writes clearly" — then route to a field note, the résumé, or GitHub.

## Direction: "alpine field notes"

Reference grammar (not assets): butterfly.so/pond — huge whitespace,
ghosted engravings cropped by the viewport, words as letterpress color
chips, one slow ambient motion. Translated to the Wasatch as a **survey
plate**: USGS benchmark medallion, topographic contours, plate-label
typography.

## Current tokens

Light ("high-altitude morning"): paper `#f6f7f1` (cool green-white — not
warm cream), ink `#232b22` (spruce), soft ink `#596456`, hairline
`#dce1d3`; chips sage `#c9d4b8` / granite `#c3cdd3` / aspen `#ebd394`;
paintbrush red `#bf4223` reserved for the benchmark mark and accents only.
Dark ("alpine night"): same relationships on `#141913`; paintbrush
brightens to `#e06a48`. Schemes follow `prefers-color-scheme`; no toggle.

## Type

- Besley (variable) — display; Clarendon revival, survey-plate/park-signage
  lineage. Modest sizes; it must never go wanted-poster.
- Literata (variable + italic) — all reading text.
- IBM Plex Mono 400/500 — dates, labels, chips, bracketed links.

## Signature elements

1. Benchmark medallion (triangle + dot in circle): favicon, masthead,
   post end-mark, footer stamp "△ 4,551 ft · Provo, Utah".
2. Generated topo contours ghosted at viewport edges; they draw themselves
   once on load (CSS stroke animation, ~2.3s; pre-drawn under reduced
   motion). The site's only motion.
3. Mono chips (note number 001…, tags) and `[ bracketed ]` links — the
   letterpress nod.

## Structure

Home: masthead → plate line → 3-sentence bio → Field notes list →
bracketed links → Elsewhere (Pulpit one-liner) → colophon. Posts: crumb →
meta chips → title → italic lede → pure prose → benchmark end-mark.
Note numbering is chronological and real; posts are nearly undecorated.
