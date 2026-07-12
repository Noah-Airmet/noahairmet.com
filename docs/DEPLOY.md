# Production deployment

## Current production architecture

- Source: `https://github.com/Noah-Airmet/noahairmet.com`
- Default branch: `main`
- Worker: `noahairmet-com`
- Build: `npm run build`
- Static asset directory: `dist`
- Production domains: `noahairmet.com` and `www.noahairmet.com`
- Cloudflare configuration: `wrangler.jsonc`

The primary site is hosted by Cloudflare Workers Static Assets. GitHub stores
the source but is not the production origin. The site does not depend on the
homelab or any Restoration Commons service.

## Credentials

Cloudflare account credentials live in
`~/.config/cloudflare/credentials`. API calls use the Global API Key with
`X-Auth-Email` and `X-Auth-Key`. Wrangler 4 requires a scoped API token through
`CLOUDFLARE_API_TOKEN`; do not commit or print it. The deploy token needs
Workers Scripts Write for the account and Workers Routes Write plus DNS Write
for the `noahairmet.com` zone.

GitHub operations use the authenticated `gh` CLI account. Never place tokens in
remote URLs or repository configuration.

## Release procedure

1. Confirm the requested changes are the only working-tree changes.
2. Run:

   ```bash
   npm run check
   npm run build
   npm test
   git diff --check
   ```

3. Confirm `dist/_headers`, `dist/_redirects`, the résumé PDF, and `404.html`
   exist. Ensure `_redirects` contains no `/resume/*` wildcard.
4. Commit and push the feature branch, update its PR, and land it on `main`.
5. From an up-to-date clean `main`, export a scoped `CLOUDFLARE_API_TOKEN` and
   run `npm run deploy`.
6. Wait for Wrangler to report both custom domains and a successful deployment.
7. Verify:

   ```bash
   curl -I https://noahairmet.com/
   curl -I https://www.noahairmet.com/
   curl -I https://noahairmet.com/resume/noah-airmet-resume.pdf
   curl -I https://noahairmet.com/blog.html
   curl -I https://noahairmet.com/does-not-exist
   ```

   The homepage and PDF should return `200`; the legacy route should redirect;
   the missing route should return `404`; security headers should be present.

## DNS cutover and rollback

The Worker custom-domain configuration owns the apex and `www` DNS records and
certificates. Before the first Worker cutover, the apex used the four GitHub
Pages A records (`185.199.108.153` through `185.199.111.153`) and `www` used
`noah-airmet.github.io`. Those values are the emergency origin rollback path.

For an application rollback, prefer rolling the Worker back to its preceding
successful version. For a full hosting rollback, detach the Worker custom
domains and restore the recorded GitHub Pages DNS values. Do not change mail,
subdomain, Minecraft, tunnel, or Restoration Commons DNS records while working
on this site.
