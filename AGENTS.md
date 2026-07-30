# noahairmet.com Agent Guide

Read `/Users/nairmet/AGENTS.md` first, then this file.

This repository is the professional site for Noah Airmet: a small Astro site —
home page, "field notes" (blog), résumé PDF — with the alpine survey-plate
design documented in `docs/DESIGN.md`. Keep it separate from Pulpit,
Restoration Commons, Telos, Roberts Academy, the homelab, and the old
`website` repository.

## Boundaries

- Architecture: Astro static output, strict TypeScript, one hand-authored
  stylesheet, a markdown content collection for field notes, self-hosted
  fonts, zero client-side JavaScript, and Cloudflare Workers Static Assets.
- Do not add React, Tailwind, component libraries, animation packages, CMS
  tooling, analytics, auth, databases, forms, or Worker runtime functions
  unless Noah explicitly changes the architecture.
- Voice ceiling: the site must never overclaim. Noah is a student and junior
  developer; copy states what is true today, in plain sentences. No
  "thought leader" framing, no case studies for work that does not exist,
  no filler. New capability claims require new shipped work.
- **Zero corpus exposure.** No page, redirect, link, or comment in this repo
  may reference `corpus.noahairmet.com` or any other private subdomain.
  The professional site and the private services share a DNS zone and
  nothing else.
- Pulpit may be linked as independent work (`https://pulpit-archive.org/`);
  it is not part of this site's architecture.
- Do not deploy, change DNS, or touch Cloudflare settings without a task
  that explicitly asks for it.

## Checks

Run before committing or deploying:

```bash
npm run verify   # astro check + build + smoke tests
git diff --check
git status --short
```

## Maintenance map

- `src/content/field-notes/*.md`: the blog. See `docs/CONTENT-GUIDE.md`
  before adding or editing a note.
- `src/pages/index.astro`: home copy and links.
- `src/lib/site.ts`: metadata, contact URLs, date/numbering helpers.
- `src/styles/site.css`: the entire visual system (tokens documented in
  `docs/DESIGN.md`).
- `src/lib/contours.ts`: generated topographic artwork data — regenerate
  with the script documented in `docs/DESIGN.md`, never hand-edit.
- `public/_redirects` / `public/_headers`: edge behavior. Never add a
  `/resume/*` wildcard redirect; it catches the PDF itself and loops.
- `wrangler.jsonc`: production Worker and custom domains.

Production is the `noahairmet-com` Cloudflare Worker on `noahairmet.com`
and `www.noahairmet.com`. Read `docs/DEPLOY.md` before release. A deploy
requires explicit authorization from Noah, a clean validated commit on
`main`, and the live checks listed there.

## Busy Bee app (`/bee`) — scoped exception

`public/bee/` contains Katie's standalone workout PWA, served unlinked at
`/bee`. It is the one sanctioned exception to this site's content ceiling.
Before touching anything in `public/bee/`, read `docs/BEE-APP.md`. The app
must stay static, backend-free, unlinked from the homepage, and decoupled
from the fitness repo.
