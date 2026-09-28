# noahairmet.com — Agent Guide

Noah Airmet's personal site, rebuilt from scratch on 2026-09-28. Three tabs,
each one screen: **About** (`/`, Mount Timpanogos), **Pulpit** (`/pulpit/`,
every sermon as a dot), **Writing** (`/writing/`). Astro static → Cloudflare
Worker `noahairmet-com` (noahairmet.com + www). `docs/BEE-APP.md` covers
Katie's workout PWA at `/bee` — read it before touching `public/bee/`.

## How it works

- **The sky.** `public/sky.js` loads synchronously in `<head>` and sets
  `--bg`, `--ink`, `--soft`, `--accent` from the sun's real elevation over
  Provo. Light skies and dark skies never blend into each other (the
  midpoint is unreadable); they crossfade. `?at=21:30` previews a time.
- **Timp** (`src/scripts/timp.ts`): ridgelines from USGS elevation in
  `public/data/timp.json`. Drag to turn; the day bar scrubs the sky.
- **Dots** (`src/scripts/dots.ts`): `public/data/pulpit-core.json` draws
  the dots; `pulpit-titles.json` loads after first paint. The dot ramp
  (accent → sky) is validated in all four skies; if you change a sky's
  colors, re-run the dataviz ordinal validator on it.
- **Tabs** are real pages joined by cross-document view transitions: the
  big name morphs into the wordmark, the tab pill slides.
- **Attention order** is the design system (see the header of
  `src/styles/site.css`): headline → lede → actions (the only filled
  shapes) → the exhibit and its label → meta. Load animations run in that
  same order. Label every exhibit where it sits, never in a far corner.

## Rules, and where each came from

Noah asked (2026-09-28) to drop every inherited rule. What remains is here
with its source, so nobody mistakes an agent's preference for his.

- **From Noah and Katie — Katie's app at `/bee` gets no analytics.** Their
  household rule is that health data never leaves owned hardware
  (`docs/BEE-APP.md`). `public/_headers` gives `/bee/*` its own stricter
  CSP, so Cloudflare's auto-injected analytics beacon is blocked there.
- **From Noah — King Follett and Hymn Parts stay unlisted** (one is for
  friends; the other carries copyrighted hymns). Smoke-tested.
- **Agent default, safety — never link private services** (`corpus.` and
  other internal subdomains). Smoke-tested.
- **Agent default, craft — keep old URLs alive** via `public/_redirects`
  (`/field-notes/*` → `/writing/*`). Never add a `/resume/*` wildcard; it
  loops the PDF.
- **Agent default, craft — security headers.** Same-origin scripts and
  styles plus Cloudflare Web Analytics (enabled on the zone since
  2026-03-13; cookieless). Astro would inline small scripts, so
  `assetsInlineLimit: 0` stays in `astro.config.mjs`. Noah has no
  preference here; loosen it whenever a feature needs to.

## Add a note

Create `src/content/writing/<slug>.md` with `title`, `date`, optional
`tag`, and a one-sentence `description`. Noah reads and owns every
published word; disclose substantive AI assistance in the note.

## Refresh data

```bash
python3 scripts/build-data.py   # re-tallies Pulpit from the live archive; rebuilds timp.json
```

## Verify, deploy

```bash
npm run verify              # astro check + build + smoke tests
npm run deploy:production   # ONLY with Noah's explicit authorization
```

Deploy = Wrangler (`npx wrangler whoami`). Pushing to GitHub does not
deploy. After deploying, check `/`, `/pulpit/`, `/writing/`,
`/resume/noah-airmet-resume.pdf`, `/bee/` return 200 and
`/field-notes/professional-commitments/` 301s. Don't touch DNS.
