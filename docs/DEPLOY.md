# Production deployment

## Current production architecture

- Source: `https://github.com/Noah-Airmet/noahairmet.com`
- Default branch: `main`
- Worker: `noahairmet-com`
- Build: `npm run build`
- Static asset directory: `dist`
- Production domains: `noahairmet.com` and `www.noahairmet.com`
- Cloudflare configuration: `wrangler.jsonc`

Production cutover was completed and verified on 2026-07-12. Both domains are
Cloudflare Worker custom domains for `noahairmet-com`; the former GitHub Pages
web DNS records have been removed. The GitHub Pages values below are retained
only as an emergency rollback record.

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

## Agent environment bootstrap (non-interactive shells)

Agents working over `ssh imac '<command>'` get a non-interactive shell where
the usual tooling is **not on PATH**. Bootstrap every session with:

```bash
export PATH="/usr/local/bin:$PATH"        # gh lives here
export NVM_DIR="$HOME/.nvm"
[ -s "/usr/local/opt/nvm/nvm.sh" ] && . "/usr/local/opt/nvm/nvm.sh"   # node/npm
```

For multi-step work, write a `zsh` script to `/tmp` and execute it rather
than chaining quoted one-liners — nested quoting through ssh/osascript
expands `$?` and similar on the wrong machine and produces false results.

## Deploy authentication — current state (verified 2026-07-15)

`~/.config/cloudflare/credentials` contains `CLOUDFLARE_API_KEY` (Global API
Key), `CLOUDFLARE_EMAIL`, `CLOUDFLARE_ACCOUNT_ID`, and
`CLOUDFLARE_ZONE_NOAHAIRMET` — it does **not** contain the scoped
`CLOUDFLARE_API_TOKEN` that Wrangler 4 requires, and `wrangler whoami`
reports not authenticated. Until that changes, `npm run deploy` cannot run
unattended: an agent should complete validation and the merge to `main`,
then hand the final step to Noah (`npx wrangler login` or exporting his
scoped token, then `npm run deploy`). Agents must not mint new API tokens
with the Global API Key, run `wrangler login`, or perform other credential
creation on Noah's behalf.

TODO (Noah): to enable unattended agent deploys, create a scoped token
(Workers Scripts Write; Workers Routes Write + DNS Write on the
noahairmet.com zone) and add it to `~/.config/cloudflare/credentials` as a
`CLOUDFLARE_API_TOKEN=...` line. The release scripts can then
`set -a; source` that file without printing values.
