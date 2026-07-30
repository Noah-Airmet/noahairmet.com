# noahairmet.com

Noah Airmet's professional site: a home page, a field-notes blog, and a
résumé PDF, in a quiet alpine survey-plate design. Deliberately small and
honest about where Noah is in his career.

## Read first

1. `/Users/nairmet/AGENTS.md`
2. This repository's `AGENTS.md`
3. `docs/ARCHITECTURE.md` and `docs/DESIGN.md`
4. `docs/CONTENT-GUIDE.md` before writing or editing field notes
5. `docs/DEPLOY.md` before publishing or changing Cloudflare

## Stack

- Astro static output with strict TypeScript and content collections
- One hand-authored stylesheet (`src/styles/site.css`); no frameworks
- Self-hosted fonts (Besley, Literata, IBM Plex Mono via Fontsource)
- Generated topographic contour artwork (inline SVG, CSS-only animation)
- Zero client-side JavaScript
- Cloudflare Workers Static Assets serving `dist`

There is no React, Tailwind, CMS, database, analytics, authentication, or
server runtime. The strict CSP in `public/_headers` requires everything —
styles, fonts, images — to be same-origin.

## Where to change things

- Add a blog post: `src/content/field-notes/` (see `docs/CONTENT-GUIDE.md`)
- Home copy and links: `src/pages/index.astro`
- Site metadata and contact URLs: `src/lib/site.ts`
- Design tokens and all styling: `src/styles/site.css`
- Résumé file: `public/resume/noah-airmet-resume.pdf`
- Legacy URL behavior: `public/_redirects`
- Security and caching headers: `public/_headers`
- Production domains and asset routing: `wrangler.jsonc`

## Commands

```bash
npm install
npm run dev
npm run verify    # check + build + smoke tests
npm run preview   # serves the built dist through Wrangler
npm run deploy    # requires explicit deployment authorization
```
