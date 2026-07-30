# Prompt for Claude Design

Copy everything below the line into Claude Design with this folder (or the
whole repo) attached.

---

You're exploring visual variants for my personal site, noahairmet.com. The
site is already built and shipped — a small Astro static site (home page,
"field notes" blog, 404) with its whole visual system in one stylesheet,
`src/styles/site.css`. I want design exploration on top of the existing
structure and content, not a rebuild.

Read these first, in order:

1. `design-kit/BRIEF.md` — who I am, the direction ("alpine field notes",
   a survey-plate reading of butterfly.so/pond), current tokens, type, and
   signature elements.
2. `design-kit/CONTENT.md` — the complete site copy. Use it verbatim.
   Do not write new copy, do not add sections, do not invent projects,
   metrics, or testimonials. If a layout needs more content to look good,
   the layout is wrong for this site.
3. `design-kit/CONSTRAINTS.md` — hard limits (strict same-origin CSP, no
   client-side JS, self-hosted fonts only, one ambient motion max,
   accessibility floor). Variants that break these are automatically out.

Then give me 2–3 distinct visual variants of the home page and one post
page. For each: what changed, why it still reads "honest student who
hikes", and the tradeoff versus the current design. Keep the current
information architecture and copy in all of them. The bar: someone should
be able to mistake the current site for one a tasteful human made slowly;
every variant must clear the same bar.

Things I'd genuinely like explored: the contour artwork's density and
placement, chip color usage, the balance between Besley and Literata on
the home page, and whether the links row wants a different treatment. I'm
much more interested in restraint and precision than in more decoration.
