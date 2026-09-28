# Context: brief, copy, constraints

## Subject and job

Noah Airmet: cybersecurity undergrad at BYU (graduating 2028), junior
developer at Simplicity Group (insurance distribution tech), working
toward technical AI governance. Audience: security/GRC hiring managers,
professors, future colleagues, spending under a minute. Job, in order:
who he is → proof he builds careful systems → what he believes → how to
reach him. Every link routes to the résumé, a project, the writing, or
email.

## Direction: "one ink"

Everything is printed in a single blue-black on cool white — text, rules,
links, and the chart. The chart steps that same hue from pale (least
certain source) to full strength (verbatim), so the page's one exhibit is
drawn in the page's own ink. No second hue anywhere.

**Tokens** (all in `src/styles/site.css`): paper `#f9fafc`, ink
`#0f1e47`, soft ink `#4e5a77`, rule `#d8deec`, link `#2347c5`. Chart
ramp (OKLCH hue 266, validated monotone, light end >= 2:1): `#16295f`
`#1f40b6` `#4b6ecc` `#7290d6` `#93aade`. Dark mode is its own set on
`#0b1120`, ramp flipped so full strength is lightest. Both via
`prefers-color-scheme`, no toggle.

**Type**: Source Serif 4 (optical sizes: display cuts for the name and the
quote, text cuts for reading); Public Sans (the U.S. Web Design System's
face) for small structural text — actions, dates, chart labels. Sentence
case everywhere; no all-caps labels, no monospace.

**Signature element**: the Pulpit chart — 12,162 sermons by decade, stacked
by fidelity grade, real data from the live archive. It shows three eras of
record-keeping at a glance (shorthand reports, printed Conference Reports,
verbatim transcripts). HTML hover readouts per column; a hidden table for
screen readers. On wide screens the columns rise once on load; that is
the site's only motion.

## Copy

Home intro (three sentences): "I study cybersecurity at BYU and graduate
in 2028. I'm also a junior developer at Simplicity Group, where I build
features for a regulated insurance platform. I'm working toward a career
in technical AI governance." Actions: Résumé (PDF), Email, GitHub,
LinkedIn.

Projects: **Pulpit** (links pulpit-archive.org) and **agent-bus** (links
the public GitHub repo). No other projects: King Follett and Hymn Parts
are deliberately unlisted.

Writing: the newest note with a `pullquote` is featured as a large quote
(currently "When a system isn't ready or oversight is weak, I will say so
clearly." from "Professional commitments"). Note bodies are Noah's own
words; never edited by a design variant.

404: "Page not found" plus directions to the home page and Writing.

## Hard constraints — violating any disqualifies a variant

1. Strict same-origin CSP: no inline styles (including `style=`
   attributes) or scripts; everything self-hosted via Fontsource.
2. Zero client-side JavaScript; all motion is CSS; nothing loops.
3. Astro static; changes land in `src/styles/site.css` and existing
   components — no new frameworks or build tools.
4. Untouchable: `public/bee/`, the résumé PDF URL, `public/_headers`,
   `public/_redirects` semantics, all slugs.
5. No reference to `corpus.noahairmet.com` or any private subdomain.
6. Responsive to 375px with no horizontal scroll; ~60–70ch prose measure;
   visible keyboard focus; WCAG AA contrast in both schemes; complete
   under `prefers-reduced-motion: reduce`.
7. No invented projects, metrics, or claims; no filler.
