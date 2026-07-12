# Architecture

This site is a small static Astro project. The output must stay portable: a
complete `dist` directory that can be served by Cloudflare Workers Static Assets
or another static host.

## Decisions

- Astro owns routing, layouts, metadata, and content collections.
- TypeScript stays strict through Astro's strict preset.
- CSS is handwritten in `src/styles` and split into reset, tokens, and base
  layers. These files are intentionally neutral foundation, not final art
  direction.
- Client JavaScript should be absent by default and added only when it explains
  structure or evidence.
- Cloudflare Workers Static Assets serves `dist` through the `assets` block in
  `wrangler.jsonc`. There is no Worker script in this foundation.

## Separation From Other Projects

Pulpit, Restoration Commons, Telos, Roberts Academy, the private corpus, and the
homelab are independent systems. This site may link to selected public artifacts
or discuss sanitized methods, but it must not host their operational state,
progress trackers, private data, or deployment logic.
