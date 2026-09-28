# noahairmet.com

Personal site: home, writing, résumé. Astro static, one hand-written
stylesheet, zero client-side JavaScript, served as Cloudflare Workers
static assets under a strict same-origin CSP.

Everything you need to know is in [AGENTS.md](AGENTS.md) — rules, how to
add a post, the file map, and the deploy procedure.

```bash
npm install
npm run dev
npm run verify    # check + build + smoke tests
```
