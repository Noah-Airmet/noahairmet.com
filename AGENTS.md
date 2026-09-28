# noahairmet.com — Agent Guide

This is the whole operating manual. The only other docs are
`docs/BEE-APP.md` (Katie's PWA — read before touching `public/bee/`) and
`design-kit/` (context folder for design tools).

Noah Airmet's professional site: home, writing (served at `/field-notes/`
for URL permanence), résumé PDF. Astro static → Cloudflare Worker
`noahairmet-com` (noahairmet.com + www).
Design: "one ink" — everything printed in a single blue-black on cool
white, including the home page's one exhibit, a chart of Pulpit's catalog
by decade and source fidelity. Source Serif 4 + Public Sans. Tokens and
rationale live as comments in `src/styles/site.css`.

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
- **Unlisted projects stay unlisted.** King Follett and Hymn Parts are for
  friends and family; never link them (smoke-tested).

## Add a note

Create `src/content/field-notes/<slug>.md`:

```markdown
---
title: "Plain title, sentence case"
date: 2026-09-14
tag: agents          # optional, one word
description: "One honest sentence — becomes the lede and RSS summary."
pullquote: "Optional. One sentence quoted verbatim from the note."
---
```

The newest note with a `pullquote` is featured on the home page; others
list beneath it. Voice: first person, plain sentences, state
what was learned and what is unknown; disclose substantive AI assistance
in the note (see the commitments essay). Drafts are proposals — Noah reads and owns
every published word.

## Map

- `src/pages/index.astro` — home copy and links (intro stays 3 sentences)
- `src/content/field-notes/` — the writing
- `src/lib/site.ts` — metadata, URLs, date helpers
- `src/lib/pulpit.ts` — the chart's data: a dated snapshot of Pulpit's
  live `archive-data.json`, tallied by decade and fidelity. Re-tally when
  the archive grows; the test checks the chart total matches the rows.
- `src/styles/site.css` — the entire visual system
- `src/components/` — FidelityChart (SVG bars + HTML hover readouts +
  hidden data table), SiteHeader, SiteFooter
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
curl -I https://noahairmet.com/commitments.html                    # 301 → the commitments essay
curl -I https://noahairmet.com/corpus-access.html                  # 404
curl -I https://noahairmet.com/does-not-exist                      # 404
```

Security headers must be present on `/`. Rollback = redeploy the previous
Worker version from the Cloudflare dashboard. Do not touch DNS: mail,
tunnels, and the other subdomains live in the same zone and are not this
repo's business.
