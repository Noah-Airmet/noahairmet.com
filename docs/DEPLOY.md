# Production deployment

## Current production architecture

- Source: `https://github.com/Noah-Airmet/noahairmet.com`
- Default branch: `main`
- Cloudflare Worker: `noahairmet-com`
- Build output: `dist`
- Production: <https://noahairmet.com/> and <https://www.noahairmet.com/>
- Configuration: `wrangler.jsonc`

Cloudflare Workers Static Assets is the production origin. GitHub stores the
source but does not deploy it automatically. The site does not depend on the
homelab or any Restoration Commons service.

## Release procedure

1. Confirm the requested changes are the only changes being committed.
2. Run:

   ```bash
   npm run verify
   git diff --check
   ```

3. Confirm `dist/_headers`, `dist/_redirects`, the resume PDF, and `404.html`
   exist. Ensure `_redirects` contains no `/resume/*` wildcard.
4. Commit and push to `main`.
5. From an up-to-date `main`, run `npm run deploy:production`.
6. Verify:

   ```bash
   curl -I https://noahairmet.com/
   curl -I https://www.noahairmet.com/
   curl -I https://noahairmet.com/resume/noah-airmet-resume.pdf
   curl -I https://noahairmet.com/pulpit-progress.html
   curl -I https://noahairmet.com/does-not-exist
   ```

The homepage and PDF should return `200`; the old Pulpit tracker path should
redirect to the current Pulpit Workboard; the missing route should return
`404`; and security headers should be present.

## Authentication

Wrangler was verified authenticated through its local OAuth session on
2026-07-18. Check with `npx wrangler whoami` before a release. Global
Cloudflare credentials in `~/.config/cloudflare/credentials` are reserved for
direct API operations and must never be printed or committed.

GitHub operations use the authenticated `gh` CLI account. Never put tokens in
remote URLs or repository configuration.

## Rollback

Prefer rolling the Worker back to its preceding successful version. The apex
formerly used GitHub Pages A records (`185.199.108.153` through
`185.199.111.153`) and `www` used `noah-airmet.github.io`; retain those only as
an emergency origin rollback record. Do not change mail, unrelated subdomains,
Minecraft, tunnels, or Restoration Commons DNS records.
