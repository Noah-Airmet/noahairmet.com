# noahairmet.com — Agent Guide

This is the whole operating manual. The only other docs are
`docs/BEE-APP.md` (Katie's PWA — read before touching `public/bee/`) and
`design-kit/` (context folder for design tools).

Noah Airmet's professional site: home, "field notes" blog, résumé PDF.
Astro static → Cloudflare Worker `noahairmet-com` (noahairmet.com + www).
Design: "alpine field notes" — real USGS contour art of Timpanogos, Lone
Peak, and Kings Peak, a two-tone peak mark, mono chips, Besley/Literata/
IBM Plex Mono. Tokens and rationale live as comments in
`src/styles/site.css`.

## Hard rules

- **No overclaiming.** Noah is a student and junior developer; copy states
  what is true today, plainly. No case studies for unfinished work, no
  filler, no "thought leader" voice. New claims require shipped, linkable
  work.
- **No new architecture.** No React/Tailwind/CMS/analytics/auth/forms/
  Worker runtime code, and no client-side JavaScript at all, unless Noah
  explicitly changes the architecture. All motion is CSS.
- **CSP is strict** (`public/_headers`, `default-src 'self'`, no inline).
  Everything self-hosted; `inlineStylesheets: "never"` stays in
  `astro.config.mjs`.
- **Zero private-subdomain exposure.** No page, link, comment, or redirect
  may reference `corpus.noahairmet.com` or other private services. Smoke
  tests fail the build on any `corpus` reference in `dist/`.
- **Never add a `/resume/*` wildcard redirect** — it catches the PDF and
  loops (tested). `/resume` + `/resume/` exact-match to the PDF.
- **URLs are permanent**: note slugs, `/resume/noah-airmet-resume.pdf`,
  `/bee`. Retired URLs get a redirect to the nearest equivalent in
  `public/_redirects`, or a 404 — never silent breakage.
- **`public/bee/` is untouchable** without reading `docs/BEE-APP.md`.

## Add a field note

Create `src/content/field-notes/<slug>.md`:

```markdown
---
title: "Plain title, sentence case"
date: 2026-09-14
tag: agents          # optional, one word
description: "One honest sentence — becomes the lede and RSS summary."
---
```

Numbering (001, 002…) is computed from date order at build time; never put
numbers in titles or slugs. Voice: first person, plain sentences, state
what was learned and what is unknown; disclose substantive AI assistance
in the note (see note 001). Drafts are proposals — Noah reads and owns
every published word.

## Map

- `src/pages/index.astro` — home copy and links (bio stays 3 sentences)
- `src/content/field-notes/` — the blog
- `src/lib/site.ts` — metadata, URLs, date/number helpers
- `src/styles/site.css` — the entire visual system
- `src/components/` — PeakMark (logo), ContourField (terrain art)
- `src/lib/contours.ts` — generated terrain data; regenerate via
  `node scripts/generate-contours.mjs` (cached grids in
  `scripts/terrain-cache/`), never hand-edit
- `public/_redirects`, `public/_headers` — edge behavior
- `test/smoke.test.mjs` — the site's contract; update with any change

## Verify, deploy

```bash
npm run verify        # astro check + build + smoke tests — before every commit
npm run deploy:production   # ONLY with Noah's explicit authorization
```

Deploy = Wrangler (local OAuth session; check `npx wrangler whoami`).
GitHub (`Noah-Airmet/noahairmet.com`, branch `main`) stores source only —
pushing does not deploy. After deploying, verify live:

```bash
curl -I https://noahairmet.com/                                    # 200
curl -I https://noahairmet.com/resume/noah-airmet-resume.pdf       # 200
curl -I https://noahairmet.com/bee/                                # 200
curl -I https://noahairmet.com/commitments.html                    # 301 → note 001
curl -I https://noahairmet.com/corpus-access.html                  # 404
curl -I https://noahairmet.com/does-not-exist                      # 404
```

Security headers must be present on `/`. Rollback = redeploy the previous
Worker version from the Cloudflare dashboard. Do not touch DNS: mail,
tunnels, and the other subdomains live in the same zone and are not this
repo's business.
