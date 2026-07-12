# Content Guide

The site intentionally does not use content collections. All visible homepage
copy and both project dialogs live in `src/pages/index.astro` so the entire
public story can be reviewed in one place.

## Content ceiling

The homepage contains:

- one short introduction;
- two selected projects;
- four primary links;
- two sourced data points in one instrument panel;
- one clearly separate reference to Pulpit.

New material should replace or consolidate existing material before adding a
route, section, card, or longer scroll. Do not recreate a blog, skills grid,
principles section, services language, or institution-sized case-study system
without an explicit change in strategy.

## Updating work

Edit the project row and its matching `<dialog>` together in
`src/pages/index.astro`. Keep each dialog to a short explanation of the problem,
method, current status, and one honest outbound link. Do not imply that a study
project is a finished product or that early-career work has institutional
authority it does not have.

Pulpit remains independent religious work. It may demonstrate archival method,
OCR, provenance, and AI-assisted scale, but it should not become the career
site's operational dependency or default professional identity.

## Updating data

`src/components/DitherSignal.astro` contains a dated snapshot, visible values,
canvas `data-*` values, explanatory labels, and source links. Update all five
together. Never change a graph shape without changing the visible numbers, and
never label broader information-security projections as AI GRC job growth.

## Voice

Be direct, specific, and comfortable with the fact that Noah is a college
student. Prefer a short true sentence to abstract strategy language. Avoid
seniority theater, consultancy jargon, fake metrics, and generic calls to
"build the future."
