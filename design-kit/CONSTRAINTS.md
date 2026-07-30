# Hard constraints

Violating any of these disqualifies a variant, however good it looks.

## Technical

1. **Strict same-origin CSP** (`public/_headers`): `default-src 'self'`,
   no `unsafe-inline`. Everything self-hosted — no Google Fonts links, no
   CDN scripts, no external images, no analytics beacons. Styles must be
   external files (no inline `<style>` or `style=""` requirements).
2. **Zero client-side JavaScript.** All interaction is native HTML; all
   motion is CSS. Adding JS is an architecture change only Noah approves.
3. **Astro static output.** Variants land as changes to
   `src/styles/site.css` and the existing components/templates — not as a
   new framework, build tool, or component library.
4. **Untouchables:** `public/bee/` (an unlinked family PWA at `/bee`),
   `public/resume/noah-airmet-resume.pdf` (bookmarked URL),
   `public/_headers`, `public/_redirects` semantics, and all URLs
   (slugs are permanent).
5. **No reference to `corpus.noahairmet.com`** or any private subdomain,
   anywhere, ever — page, link, comment, or redirect.

## Design floor

6. Responsive to 375px; readable measure (~60–70ch) for prose.
7. Visible keyboard focus everywhere; WCAG AA contrast in both schemes.
8. `prefers-reduced-motion: reduce` fully honored — the page must be
   complete and beautiful with zero animation.
9. Light and dark both first-class via `prefers-color-scheme`.
10. At most **one** ambient motion on the whole site.

## Voice (also a design constraint)

11. The copy in `CONTENT.md` is final. No new sections, no invented
    projects/case studies/metrics/testimonials, no filler text — if a
    layout needs lorem ipsum to look balanced, it fails.
12. The overall impression must stay modest: an early-career person's
    honest site. Any variant that reads "startup landing page" or
    "thought leader" is off-brief, whatever its craft.
