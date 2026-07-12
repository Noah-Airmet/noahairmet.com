# Deploy

Deployment is intentionally not configured to production yet.

Target deployment model:

- GitHub repository: `Noah-Airmet/noahairmet.com`
- Build command: `npm run build`
- Output directory: `dist`
- Runtime: Cloudflare Workers Static Assets
- Preview URLs: enabled in `wrangler.jsonc`

The primary site should not depend on the homelab. The homelab can inform
sanitized case-study content, but it should not host this public professional
site or act as its origin.

Before a first deployment:

1. Confirm final visual/content direction.
2. Confirm redirect map against the old site.
3. Create the remote repository.
4. Connect Cloudflare Workers builds.
5. Verify preview output.
6. Cut DNS only after review.
