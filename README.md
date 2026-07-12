# noahairmet.com

Noah Airmet's deliberately small professional website: one responsive page,
one résumé PDF, and no operational coupling to other projects.

## Read first

1. `/Users/nairmet/AGENTS.md`
2. This repository's `AGENTS.md`
3. `docs/ARCHITECTURE.md` and `docs/DESIGN.md`
4. `docs/CONTENT-GUIDE.md` for copy or project updates
5. `docs/DEPLOY.md` before publishing or changing Cloudflare

## Stack

- Astro 7 static output with strict TypeScript
- Hand-authored CSS and self-hosted fonts
- A framework-free ordered-dither canvas renderer
- Native HTML dialogs with a small inline controller
- Cloudflare Workers Static Assets serving `dist`

There is no React, Tailwind, CMS, database, analytics, authentication, server
runtime, or dependency on the homelab. The dither renderer is a lightweight
interpretation of the MIT-licensed
[dither-kit](https://github.com/Boring-Software-Inc/dither-kit) technique; the
published React/shadcn package is not bundled.

## Where to change things

- Homepage copy, links, project dialogs: `src/pages/index.astro`
- Site metadata and contact URLs: `src/lib/site.ts`
- Pulpit and BLS figures, chart labels, and canvas behavior:
  `src/components/DitherSignal.astro`
- Ambient Braille/point decoration: `src/components/AmbientField.astro`
- Layout, responsive behavior, interaction, and design tokens:
  `src/styles/site.css`
- Résumé file: `public/resume/noah-airmet-resume.pdf`
- Legacy URL behavior: `public/_redirects`
- Security and caching headers: `public/_headers`
- Production domains and asset routing: `wrangler.jsonc`

The homepage is the product. Work details open in native dialogs, and retired
content routes redirect to the homepage or résumé PDF. Pulpit is linked only as
an independent project; it is not part of this site's deployment.

## Commands

```bash
npm install
npm run dev
npm run check
npm run build
npm test
npm run preview
npm run deploy
```

`npm run preview` expects `dist` to exist. `npm run deploy` builds and publishes
the Worker configured in `wrangler.jsonc`; use it only after reading
`docs/DEPLOY.md` and receiving explicit deployment authorization.
