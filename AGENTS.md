# noahairmet.com

Noah Airmet's personal site, rebuilt from scratch on 2026-11-12 by Claude
Fable 5.2 (Noah has each new frontier model rebuild it; the colophon on the
home page lists the editions). Astro static pages, served as Cloudflare
Workers static assets by the Worker `noahairmet-com` (noahairmet.com and www).
`docs/BEE-APP.md` covers Katie's workout app at `/bee`; read it before
touching `public/bee/`.

## The idea

The page is kept by agents, and a visitor can test that. Everything on it can
be put out of place, an agent cursor puts it back, and the bar's state
(`Intact` / `2 out of place`) and its log say what happened.

- **The name** (`src/board/name.ts`): each letter is a rigid body (Matter.js)
  cut from the glyph's own outline. Pull one off, throw it, knock the others
  loose; double-click to send them all. On a first visit the letters start in
  a heap and the agents set the name. Now and then one slips on its own.
- **CitationBench** (`src/board/bench.ts`): the published runs as bars with
  their 95% intervals. A bar's end drags to a number it never scored; an agent
  drags it back.
- **SafetyPage** (`src/board/quote.ts`): a quotation checked live against the
  library's verifier (`POST https://safetypage-api.noahairmet.com/api/verify`).
  Edit it and the page strikes what the source doesn't say; left wrong, an
  agent restores it.
- **Text** (`src/board/guard.ts`): anything marked `data-keep` that gets
  rewritten (from the console, say) is typed back. A second check sweeps
  every few seconds for what an observer can't see, such as the whole element
  being swapped for another. The console prints one line: an example to try.
- **The mountain** (`src/board/outside.ts`): the terrain from `/api/last-out`
  (the last place Noah was out, uploaded by his Ledger app; `worker/last-out.js`)
  or Mount Timpanogos, as a round-cut stack of contour sheets. Drag to turn.

`src/board/agents.ts` is the agents themselves: work is posted as jobs, the
nearest free agent takes one, and a job is an async script that can be called
off at any await (when a visitor grabs the letter back). The first time each
exhibit scrolls into view the agents do its opening move too: they pull the
bars out to their scores, press the quote check, and lift the mountain by its
summit. `ledger.ts` is the state and the log (the tab title carries the count
of things out of place); `layer.ts` draws the blue alignment lines and the
chips; `sound.ts` is the opt-in sound (off until the bar's control is
pressed), all synthesized.

Why this and not just throwable letters: research on 2026-11-12 found that
physics letters and fake multiplayer cursors are sold as drop-in components,
while a page whose agents visibly repair it had no prior example on a
personal site. The repair, the log and the real data are the point.

The keyboard's way in is a button after the name (visible on focus) that
scatters the letters.

With `prefers-reduced-motion`, none of the board runs: the name is plain
text, the chart and the quote check still work, the mountain holds still.

## Design

- Day is a drafting board (`--paper`, ink, a blue pencil for lining things up,
  a red one for what's wrong); night is a blueprint. It follows the visitor's
  system setting. Every value is in `src/styles/tokens.css`.
- Three faces, one job each, self-hosted in `src/fonts/` with their licences:
  Roboto Flex (display at weight 1000 and width 150, and the interface),
  Newsreader (what you read), Martian Mono (values: times, measurements, ids).
  `roboto-flex.woff2` is a cut of the full font holding only the weight, width
  and optical-size axes.
- The interface doesn't explain itself: names, values, states of three words
  or fewer, controls. Sentences are for content.

## What goes on the site

Noah, 2026-11-12: "be clean and careful in what you advertise on my site as
my 'resume.'" He is proud of CitationBench and SafetyPage. "i'm not
particularly 'proud' of my clip farms and can't really advertise GSA (or even
pulpit) since they're internal research tools." MTA is "a simple 'Lead
Technical Fellow @transfigurism' (with the handle hyperlinked to their
twitter)". At Simplicity his title is junior developer, "but you can lead
with the fact that i do pentesting and write ai safety policy." And: "a
personal site is for the things youre proud of, not an official job
application or comprehensive inventory." `test/smoke.test.mjs` checks the
built site for the names that stay off it.

Also from Noah and Katie: Katie's app at `/bee` gets no analytics (their
household rule is that health data never leaves owned hardware;
`docs/BEE-APP.md`), so `public/_headers` gives `/bee/*` its own stricter CSP.
From Noah: King Follett and Hymn Parts stay unlisted.

Noah reads and owns every published word. The sentences on the home page are
his or his projects' own: the lede is from the previous edition, the two
project lines are from SafetyPage's README, the colophon line is his
description of the tradition.

## Data

- `src/data/citationbench.json`: `python3 scripts/bench-data.py` copies the
  runs committed in `~/development/safetypage/citationbench/results` (the ones
  the public leaderboard shows). Uncommitted result files are work in
  progress and are left out.
- `src/data/quotes.ts`: the quotations the check cycles through, each
  verified against the live library when added.
- `public/data/timp.json`: Timp's USGS elevation grid. `public/data/last-out.json`
  is the Worker's list of areas.

## Other pieces

- `public/boot.js` runs before first paint: with motion allowed it hides the
  plain name so the pieces can take its place, and brings it back if the board
  never loads.
- Headers (`public/_headers`): same-origin scripts and styles, Cloudflare Web
  Analytics, and `connect-src` for the SafetyPage API. Astro would inline
  small scripts, so `assetsInlineLimit: 0` stays in `astro.config.mjs`.
- `public/_redirects` keeps old addresses alive. A `/resume/*` wildcard loops
  the PDF, so there isn't one.
- Icon: `scripts/icons.py` then `node scripts/icons.mjs`. Share card:
  `node scripts/card.mjs` against a running server, then bump `card.image`'s
  `v` in `src/site.ts`.

## Add a note

Create `src/content/writing/<slug>.md` with `title`, `date`, optional `tag`,
and a one-sentence `description`.

## Check and deploy

```bash
npm run dev       # http://localhost:4321 (the mountain falls back to Timp: no Worker here)
npm run verify    # astro check, build, tests
npm run preview   # the built site under Wrangler, with the Worker and the real headers
npx wrangler versions upload   # a preview URL, without touching production
npm run deploy    # verify, then production: only with Noah's explicit authorization (carried over from the previous guide)
```

Pushing to GitHub does not deploy. `ui-check` (`ui-check.config.mjs`) runs the
geometry, axe and screenshot checks against the dev server; it opens the home
page as `/?still`, which holds the board at rest (no intro, nothing slips).
