# noahairmet.com Agent Guide

Read `/Users/nairmet/AGENTS.md` first, then this file.

This repository is the clean-room professional site for Noah Airmet. Keep it
separate from Pulpit, Restoration Commons, Telos, Roberts Academy, the homelab,
and the old `website` repository.

## Boundaries

- Architecture: a single-page Astro static output, strict TypeScript,
  handcrafted CSS, one framework-free dither canvas component, native dialogs,
  and Cloudflare Workers Static Assets.
- Do not add React, Next.js, Tailwind, component libraries, animation packages,
  CMS tooling, analytics, auth, databases, forms, or Worker runtime functions
  unless Noah explicitly changes the architecture.
- Do not copy HTML or CSS from `/Users/nairmet/development/website`.
- Keep the homepage content ceiling small. New work should replace or
  consolidate existing modules before adding routes or vertical sections.
- Pulpit may be referenced as independent work, but it is not part of this
  site's operational architecture.
- Do not deploy, change DNS, create the remote GitHub repository, or touch
  Cloudflare settings from this repo without a task that explicitly asks for it.

## Checks

Run these before committing or deploying:

```bash
npm run build
npm run check
npm test
git diff --check
git status --short
```

The `preview` script serves the already-built `dist` directory through Wrangler.
Run `npm run build` first.

## Maintenance map

- `src/pages/index.astro`: visible copy, links, project dialogs.
- `src/components/DitherSignal.astro`: sourced figures and dither renderer.
- `src/components/AmbientField.astro`: decorative motion only.
- `src/styles/site.css`: the entire responsive visual system.
- `src/lib/site.ts`: metadata and canonical contact URLs.
- `public/_redirects` and `public/_headers`: edge behavior.
- `wrangler.jsonc`: production Worker and custom domains.

Keep visible chart values, canvas `data-*` values, snapshot date, explanatory
copy, and source links synchronized. Never use a `/resume/*` wildcard redirect;
it catches the PDF itself and loops.

Production is the `noahairmet-com` Cloudflare Worker on `noahairmet.com` and
`www.noahairmet.com`. Read `docs/DEPLOY.md` before release. A deploy requires
explicit authorization, a clean validated commit on `main`, and live checks of
the homepage, résumé, one legacy redirect, security headers, and 404 behavior.
