# Redirects

`public/_redirects` ships to `dist/` and is honored by Workers Static
Assets at the edge. Current policy:

## Live rules

- Old multi-page routes (`/work`, `/about`, `/colophon`, `/privacy`) → `/`.
- `/writing` and `/blog.html` → `/field-notes/` (the section was renamed,
  the idea survived).
- `/commitments.html` → `/field-notes/professional-commitments/` — the
  cyber-ethics code from the 2026 personal site lives on as note 001.
- `/resume` and `/resume/` (exact) → the PDF. **Never add `/resume/*`**:
  a wildcard catches the PDF itself and creates an infinite loop. The
  smoke tests enforce this.
- `/pulpit.html`, `/pulpit-progress.html` → `https://pulpit-archive.org/`.
- `/assets/resume.pdf` → the current PDF path.

## Deliberate removals

- `/corpus-access.html` → **gone, 404.** It used to 302 to
  `corpus.noahairmet.com`. Policy: the professional site exposes no path,
  link, or redirect to private subdomains. Do not restore it. The smoke
  tests fail on any `corpus` reference in `dist/`.
- `/posts/template.html` → gone; it redirected to the 404 page anyway.

## When retiring a URL

Map it to the nearest live equivalent if one exists; otherwise let it
404. Update the smoke test expectations and this file in the same commit.
