# noahairmet.com

Noah Airmet's personal site, rebuilt from scratch on 2026-11-12 by Claude
Fable 5.2 (Noah has each new frontier model rebuild it; the page itself says
nothing about that, at his request). Astro static pages, served as Cloudflare
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
- **CitationBench**: two floating windows. One is a recording of a real run
  from SafetyPage's replay player (`public/media/citationbench-replay.mp4`,
  made by `scripts/replay-video.mjs`; it links to the live replay). Over its
  corner is the leaderboard (`src/board/bench.ts`): the published runs as bars
  with their 95% intervals. A bar's end drags to a number it never scored; an
  agent drags it back. The one sentence above them is the pitch's finding,
  with its numbers computed from the published runs.
- **SafetyPage** (`src/board/quote.ts`): the check in a card, beside
  SafetyPage's own scan of the cited page with the library's yellow highlight
  on the words. Every wording is checked live against the library's verifier
  (`POST https://safetypage-api.noahairmet.com/api/verify`). Left alone it
  demonstrates itself: an agent gets one word wrong, the check strikes it and
  writes what the source says, another agent restores it, and the next
  quotation comes up (the line under `Another` is the time left). Touch it
  and the demonstration stops.
- **Text** (`src/board/guard.ts`): anything marked `data-keep` that gets
  rewritten (from the console, say) is typed back. A second check sweeps
  every few seconds for what an observer can't see, such as the whole element
  being swapped for another. The console prints one line: an example to try.
- **The mountain** (`src/board/outside.ts`): Utah peaks as round-cut stacks of
  contour sheets, each with a real trail walked from trailhead to summit, the
  figure turning to the next on its own. A fresh record from `/api/last-out`
  (the last place Noah was out, uploaded by his Ledger app;
  `worker/last-out.js`) comes first when there is one. Drag to turn.
- The windows turn a little toward the pointer (`src/board/tilt.ts`).

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
text, the chart and the quote check still work, the recording waits on its
last frame, the mountain holds still.

## Design

- The page takes its colours from the sun over Provo (`public/boot.js`, run
  before first paint on every page): a drafting board by day (`--paper`, ink,
  a blue pencil for lining things up, a red one for what's wrong), warming
  through gold to a peach glow at sunset, then purple dusk, blue hour, and a
  blueprint at night. Each stop is a whole token set at one sun elevation;
  stops of the same family are mixed, and light changes over to dark at one
  elevation, because a ground halfway between can't be read with either ink.
  `src/styles/tokens.css` holds the day's values and everything that isn't a
  colour. There is no day/night button (Noah, 2026-11-12: "it has become an
  AI cliche"); the control is the solar dial under the mountain
  (`src/board/dial.ts`), after the Apple Watch face he's worn for years: a
  24-hour face, the day above the line from sunrise to sunset, the sun on its
  circle. Turning it holds another time of day; `Now` lets go. `?at=17:10`
  opens the page at a time, for looking at a sky.
- Sound is a word in the bar that says its state (`Sound off` / `Sound on`),
  not an icon: Noah's preference.
- Icons are one component, `src/components/Icon.astro`: brand marks for X,
  GitHub and LinkedIn, and a drawn envelope and page for email and résumé.
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

After seeing the rebuild the same day: the project sections had "a lot of
text" and needed "more screenshots and stuff in action" (he suggested "a
floating rounded rec window that subtly moves as you move your cursor"); the
quotation "just looks like hero text, not something built in to safety
page"; and of a colophon line about models rebuilding the site, "way too
much explaining the design for me."

Also from Noah and Katie: Katie's app at `/bee` gets no analytics (their
household rule is that health data never leaves owned hardware;
`docs/BEE-APP.md`), so `public/_headers` gives `/bee/*` its own stricter CSP.
From Noah: King Follett and Hymn Parts stay unlisted.

Noah reads and owns every published word. The sentences on the home page are
his or his projects' own: the lede is from the previous edition, SafetyPage's
line is from its README, and CitationBench's is a draft line from his pitch
notes (`~/development/writing/safetypage/pitch-notes.md`, "lines to say out
loud"), with the numbers taken from the published runs.

## Data

- `src/data/citationbench.json`: `python3 scripts/bench-data.py` copies the
  runs committed in `~/development/safetypage/citationbench/results` (the ones
  the public leaderboard shows). Uncommitted result files are work in
  progress and are left out.
- `src/data/quotes.json`: the quotations the check turns through. `node
  scripts/quote-pages.mjs` verifies each against the live library (and that
  its misquote fails), then saves the page scan to `public/pages/` and where
  SafetyPage's viewer puts the highlight.
- `public/data/peaks/`: one elevation grid and trail per mountain, built by
  `scripts/peaks.py` from USGS 3DEP and OpenStreetMap. The figure credits both.
- `public/data/last-out.json` is the Worker's list of areas.

## Other pieces

- `public/boot.js` runs before first paint: with motion allowed it hides the
  plain name so the pieces can take its place, and brings it back if the board
  never loads.
- The Worker (`worker/index.js`) answers `/api/last-out`, and Range requests
  for `/media/*` (Workers static assets ignore them, and Safari won't play an
  MP4 without them).
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
page as `/?still`, which holds the board at rest (no intro, nothing slips)
and the sky at noon.
