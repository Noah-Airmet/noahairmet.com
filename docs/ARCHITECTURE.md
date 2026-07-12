# Architecture

This is a portable static Astro site. A complete `dist` directory can be served
by Cloudflare Workers Static Assets or any ordinary static host.

## Decisions

- `src/pages/index.astro` is the only content page.
- `src/pages/404.astro` provides the error route.
- The résumé remains a static PDF under `public/resume`.
- Historic content routes are retired through `public/_redirects`.
- CSS is handwritten in `src/styles/reset.css` and `src/styles/site.css`.
- `src/components/DitherSignal.astro` owns the only substantial client script.
- `src/components/AmbientField.astro` provides decorative, CSS-only point and
  Braille sprites outside the content hierarchy.
- Project details use native HTML dialogs and a small inline controller.
- There is no framework runtime, CMS, database, analytics, authentication, or
  Worker function.

The dither panel's Pulpit and BLS figures are static, dated snapshots rather
than runtime API calls. Updating them is an editorial operation described in
`docs/CONTENT-GUIDE.md`. This avoids a client dependency on either source and
keeps the public page functional when those sites are unavailable.

The dither canvas intentionally adapts only the core ordered-fill idea from
dither-kit. Importing the full component package would require React, Motion,
D3, shadcn conventions, and additional CSS infrastructure that this site does
not otherwise need.

## Separation from other projects

Pulpit, Restoration Commons, Telos, Roberts Academy, the private corpus, and the
homelab are independent systems. This site may link to them, but it must not
host their operational state, progress trackers, private data, or deployment
logic.

## Hosting boundary

Astro writes the complete site to `dist`. Cloudflare Workers Static Assets
serves that directory directly using `wrangler.jsonc`; there is no Worker
`fetch` handler. `public/_headers` and `public/_redirects` are copied into the
asset directory and interpreted at the edge. The GitHub repository is source
control, not the production origin.

The prior editorial Open Graph image is intentionally not referenced because
it no longer matches the site. Social metadata currently uses a text summary;
do not restore `og:image` until a card is designed from the actual modular
dither language and visually reviewed.
