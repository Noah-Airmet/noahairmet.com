# noahairmet.com Agent Guide

Read `/Users/nairmet/AGENTS.md` first, then this file.

This repository is the clean-room professional site for Noah Airmet. Keep it
separate from Pulpit, Restoration Commons, Telos, Roberts Academy, the homelab,
and the old `website` repository.

## Boundaries

- Architecture: Astro static output, strict TypeScript, content collections,
  handcrafted CSS, minimal client JavaScript, Cloudflare Workers Static Assets.
- Do not add React, Next.js, Tailwind, component libraries, animation packages,
  CMS tooling, analytics, auth, databases, forms, or Worker runtime functions
  unless Noah explicitly changes the architecture.
- Do not copy HTML or CSS from `/Users/nairmet/development/website`.
- Pulpit may be referenced as independent work, but it is not part of this
  site's operational architecture.
- Do not deploy, change DNS, create the remote GitHub repository, or touch
  Cloudflare settings from this repo without a task that explicitly asks for it.

## Checks

Run these before committing:

```bash
npm run build
npm run check
npm test
git status --short
```

The `preview` script serves the already-built `dist` directory through Wrangler.
Run `npm run build` first.
