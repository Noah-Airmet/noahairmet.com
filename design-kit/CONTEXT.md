# Context: brief, copy, constraints

## Subject and job

Noah Airmet: cybersecurity undergrad at BYU (class of 2028), junior
developer at Simplicity Group (insurance tech), building toward technical
AI governance. Skis, hikes, and mountain-bikes the Wasatch. The site must
read as honest notes from someone early in their career — never a
thought-leader brand. Audience: security/GRC hiring managers, professors,
future colleagues, spending under a minute. Job: "real, careful, writes
clearly" → route to a note, the résumé, or GitHub.

## Direction: "alpine field notes"

Reference grammar (not assets): butterfly.so/pond — huge whitespace,
ghosted engravings cropped by the viewport, letterpress color chips, slow
tasteful motion. Translated to Utah as a survey plate.

**Tokens** (all in `src/styles/site.css`): light "high-altitude morning" —
paper `#f6f7f1` (cool, not cream), spruce ink `#232b22`, soft ink
`#596456`, hairline `#dce1d3`, chips sage `#c9d4b8` / granite `#c3cdd3` /
aspen `#ebd394`, paintbrush red `#bf4223` reserved for the peak mark and
accents. Dark "alpine night" mirrors it on `#141913`. Both via
`prefers-color-scheme`, no toggle.

**Type**: Besley (Clarendon revival — display, modest sizes), Literata
(reading), IBM Plex Mono (labels/chips/brackets). Self-hosted Fontsource.

**Signature elements**:
1. Two-tone peak mark: outlined triangle, solid snowcap over a jagged
   snowline, one currentColor (favicon, masthead, end-marks, footer stamp
   "△ 4,551 ft · Provo, Utah").
2. Real-terrain contour art from USGS 10m data: Mount Timpanogos (home
   top-right), Lone Peak (home bottom-left), Kings Peak (404). Ghosted,
   edge-masked, draw once on load. Each carries a halo'd mono label
   ("MT TIMPANOGOS · 11,749 FT") and a summit cross.
3. The trail: a faint dashed ascent line to each summit whose dashes crawl
   slowly uphill, forever — the only ongoing motion, echoing the bio line
   "I'm early on that trail."

## Copy — final, verbatim, complete

Home: masthead "Noah Airmet"; plate line "Provo, Utah · BYU cybersecurity
· class of 2028"; bio: "I'm a cybersecurity student at BYU and a junior
developer at Simplicity Group. I'm working toward technical AI governance
— threat-modeling AI systems, running evals, and writing documentation a
regulator or auditor can actually use. I'm early on that trail; these
notes are me learning in public." Sections: **Field notes** (rows:
number chip · Mon YYYY · title), links `[ résumé ] [ github ]
[ linkedin ] [ email ] [ rss ]`, **Elsewhere**: "I also build Pulpit, an
AI-assisted archive of Latter-day Saint general conference sermons with
source-linked transcription and human review. It's independent from my
professional work, but it's where I learned to run systems carefully."
Colophon: "Hand-built with Astro and plain CSS, with AI assistance. No
analytics, no tracking." + stamp.

Field-notes index lede: "Numbered in the order they happened."

Note 001 (June 4, 2026, tag `ethics`): "Professional commitments" —
"A personal code of ethics for work in cybersecurity and AI governance —
written for a class, kept because I mean it." Body in
`src/content/field-notes/professional-commitments.md`; Noah's own words,
never edited by a variant.

404: "Off the map" / "Nothing is charted at this address." / `[ back home ]`.

## Hard constraints — violating any disqualifies a variant

1. Strict same-origin CSP, no inline styles/scripts; everything
   self-hosted (fonts via Fontsource npm packages only).
2. Zero client-side JavaScript; all motion is CSS; at most ONE ongoing
   ambient motion sitewide.
3. Astro static; changes land in `src/styles/site.css` and existing
   components — no new frameworks or build tools.
4. Untouchable: `public/bee/`, the résumé PDF URL, `public/_headers`,
   `public/_redirects` semantics, all slugs.
5. No reference to `corpus.noahairmet.com` or any private subdomain.
6. Responsive to 375px; ~60–70ch prose measure; visible keyboard focus;
   WCAG AA contrast in both schemes; complete and beautiful under
   `prefers-reduced-motion: reduce`.
7. The copy above is final: no new sections, no invented projects or
   metrics, no filler. If a layout needs lorem ipsum, it fails.
