# noahairmet.com

Noah Airmet's personal site, rebuilt from scratch on 2026-11-12 by Claude
Fable 5.2 (Noah has each new frontier model rebuild it; the page itself says
nothing about that, at his request). Astro static pages, served as Cloudflare
Workers static assets by the Worker `noahairmet-com` (noahairmet.com and www).
`docs/BEE-APP.md` covers Katie's workout app at `/bee`; read it before
touching `public/bee/`.

You are the owner and long-term maintainer of this codebase, and its design is up to you.

## The idea

A page an employer can be shown: who Noah is, the two things he built working
live on the page, his writing, and how to reach him. Noah, 2026-11-16, on the
edition before this one (a physics name that could be thrown apart, agent
cursors putting the page back, a status log and sound): "kinda fun right now
... but it feels a little too gimmicky. i would not want to put it in front of
an employer. there's a way to balance smooth clean web modern animations and
impressive use of the latest web technologies + taste without the gimmicks of
an exploding name and all these cursors flying around." That edition is in git
up to b3c1732 if any of it is ever wanted.

What moves, and why:

- **The name** comes up from behind its own baseline once, on arrival, and
  the sentence and the row of roles come up after it (`src/styles/home.css`).
- **Scroll** (`src/styles/base.css`, `work.css`; CSS scroll timelines, no
  script): the bar takes the name once the hero has gone by, the two windows
  of a project rise at different depths, and an essay's bar carries a line as
  long as what has been read.
  Moving between pages is a cross-document view transition with the bar held
  still. All of it is extra; a browser without these shows the page at rest.
- **CitationBench**: two windows. One is the quote check
  (`src/board/quote.ts`), the code check the benchmark scores quotations
  with: every wording is checked live against the library's verifier
  (`POST https://safetypage-api.noahairmet.com/api/verify`). Left alone it
  demonstrates itself: one word is typed over wrongly, the check strikes it
  and writes what the source says, the word is put right, and the next
  quotation comes up (the line under `Another` is the time left). Touch it
  and the demonstration stops. Beside it is the leaderboard
  (`src/board/bench.ts`): the published runs as bars with their 95%
  intervals, drawn one after another the first time they are seen. Noah,
  2026-11-12, on why the check is here and not under Catchword: "this is a
  demo that makes more sense for CitationBench, where an agent is shown
  catching an error"; the recording of a replay that used to be here was "a
  very messy screen with a lot going on. too hard to follow".
- **Catchword** (`src/board/ask.ts`): a question typed into a field and sent,
  answered in the source's own words, which arrive a word at a time; then the
  cited page comes up beside the card (`src/board/sheet.ts`: Catchword's own
  scan, with the library's yellow on the quoted words) while the quote is
  checked live. Three questions turn. It is the demo from Noah's pitch notes
  ("a window where you ask the chatbot ... and the agent answers"): "a clear
  example of a question being asked about safety policy and an agent giving
  the answer ... a cleaned up simplified interface that works on a card, with
  smoot animations, text fading in nicely as it answers". An answer is the
  document's name and a quotation, nothing else, so nothing on the card is
  anybody's paraphrase.
- **The mountain** (`src/board/outside.ts`): Utah peaks as round-cut stacks of
  contour sheets, each with a real trail drawn from trailhead to summit, the
  figure turning to the next on its own. A fresh record from `/api/last-out`
  (the last place Noah was out, uploaded by his Ledger app;
  `worker/last-out.js`) comes first when there is one. Drag to turn.
- The windows turn a little toward the pointer (`src/board/tilt.ts`), which
  Noah suggested ("a floating rounded rec window that subtly moves as you
  move your cursor").

`src/board/main.ts` starts the figures; `kit.ts` is the one frame loop they
share. With `prefers-reduced-motion`, nothing arrives or turns on its own: the
chart and the quote check still work and the mountain holds still.

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
  AI cliche"); the control is the day bar at the foot of the page
  (`src/board/daybar.ts`): one strip, midnight to midnight in Provo, coloured
  as the page is coloured at each hour, with today's sunrise and sunset
  marked from the sun's real elevation. Sliding the blue mark holds another
  time of day; `Now` lets go. `?at=17:10` opens the page at a time, for
  looking at a sky. (A copy of the Apple Watch Solar Dial was built first and
  taken out the same day: Noah found it didn't fit the rest of the site. It
  is in git at 95bce36 if it's ever wanted.)
- Icons are one component, `src/components/Icon.astro`: brand marks for X,
  GitHub and LinkedIn, and a drawn envelope and page for email and résumé.
- One family, three cuts, self-hosted in `src/fonts/` with the licence
  (from the `geist` npm package): Geist Serif (the name, headings and what
  you read; it has one weight and no italic, so emphasis in an essay is a
  slanted roman), Geist (the interface), Geist Mono (values: times,
  measurements, ids). Noah, 2026-11-16: "replacing the gigantic bold
  stretched hero font with Geist or Geist serif would be a great immediate
  serious fix as well." The edition before set the name in Roboto Flex at
  weight 1000 and width 150, filling the first screen.
- The interface doesn't explain itself: names, values, states of three words
  or fewer, controls. Sentences are for content.

## What goes on the site

Noah, 2026-11-12: "be clean and careful in what you advertise on my site as
my 'resume.'" He is proud of CitationBench and SafetyPage, which he renamed
Catchword the same day ("catchword is great, go for it"); its site, API and
repo still carry the old name (`safetypage.noahairmet.com`,
`~/development/safetypage`). "i'm not
particularly 'proud' of my clip farms and can't really advertise GSA (or even
pulpit) since they're internal research tools." MTA is "a simple 'Lead
Technical Fellow @transfigurism' (with the handle hyperlinked to their
twitter)". At Simplicity his title is junior developer, "but you can lead
with the fact that i do pentesting and write ai safety policy." On
2026-11-13 he asked for "a little more emphasis on that than just 'pentesting
and ai policy'", naming automated internal pentesting tools and "soc2
compliance stuff"; the line under that role is the result, and it names kinds
of work only, nothing found inside the company. The same day he replaced
the role itself: 'change the overly specific "Pentesting and AI safety
policy" line on my website to "Development and AI Security"', keeping the
detail line. And: "a
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

Noah reads and owns every published word. The lede is from the previous
edition. He asked (2026-11-12) for each project pitch to say why the thing is
needed, not only what it is, and wrote both himself the same day. Catchword's
is his as written. Under it are four points he asked for later that day
(what "explains why using Catchword is better than just asking the questions
shown in the demo to ChatGPT in the web"), under a small line that names the
chatbot and answers it in the same breath: in the blurb on its own it "just
reads like an admission with no counterpoint". The line follows his wording
("documents, but Catchword is the solution for professionals ebcause....");
the points are drafts for him to rewrite. CitationBench's is his with one clause changed to match
the data: he had "they still get small, crucial wording details wrong", but
the 40 to 67% is how often an agent's supported / not supported verdict on a
real citing sentence is right, and quoted wording is where agents do well
(quote fidelity 84 to 100%). The range is computed from the published runs.
His pitch notes are in `~/development/writing/safetypage/pitch-notes.md`.

## Data

- `src/data/citationbench.json`: `python3 scripts/bench-data.py` copies the
  runs committed in `~/development/safetypage/citationbench/results` (the ones
  the public leaderboard shows). Uncommitted result files are work in
  progress and are left out.
- `src/data/quotes.json`: the quotations the check turns through, each with
  the one word its demonstration gets wrong. `src/data/asks.json`: the
  Catchword card's questions, each with the document it names and the quote
  that answers it. `node scripts/quote-pages.mjs` verifies every quote
  against the live library (and that each misquote fails), writes the links,
  and for the asks saves the page scan to `public/pages/` and where the
  library's viewer puts the highlight.
- `public/data/peaks/`: one elevation grid and trail per mountain, built by
  `scripts/peaks.py` from USGS 3DEP and OpenStreetMap. The figure credits both.
- `public/data/last-out.json` is the Worker's list of areas.

## Other pieces

- `public/boot.js` runs before first paint and sets the sky's colours.
- The Worker (`worker/index.js`) answers `/api/last-out` (and Range requests
  for `/media/*`, which holds nothing now).
- Headers (`public/_headers`): same-origin scripts and styles, Cloudflare Web
  Analytics, and `connect-src` for the Catchword API. Astro would inline
  small scripts, so `assetsInlineLimit: 0` stays in `astro.config.mjs`.
- `public/_redirects` keeps old addresses alive. A `/resume/*` wildcard loops
  the PDF, so there isn't one.
- Icon: n/a, Noah's initials, with the slash corner to corner and a letter
  on each side (Geist at weight 700). Noah, 2026-11-16, of the first sketch:
  "the n/a is hilarious and easily the best", and of this split version, "5
  rocks go for it"; a big letter N he called "super generic".
  `uv run --with fonttools --with brotli python scripts/icons.py`, then
  `node scripts/icons.mjs`. Share card:
  `/card/` is the name, one line and the three roles composed at 1200 by 630
  (`src/pages/card.astro`, `src/styles/card.css`). `node scripts/card.mjs`
  against a running server photographs it into `public/og/card.png`; then
  bump `card.image`'s `v` in `src/site.ts`.
- The résumé PDF (`public/resume/noah-airmet-resume.pdf`) is exported from
  the Word file in iCloud Drive
  (`Documents/professional/career/resume/`), which is where Noah edits it.

## Add a note

Create `src/content/writing/<slug>.md` with `title`, `date`, optional `tag`,
and a one-sentence `description`.

## Check and deploy

```bash
npm run dev       # http://localhost:4321 (the mountain falls back to Timp: no Worker here)
npm run verify    # astro check, build, tests
npm run preview   # the built site under Wrangler, with the Worker and the real headers
npx wrangler versions upload   # a preview URL, without touching production
npm run deploy    # verify, then production
```

Pushing to GitHub does not deploy. `ui-check` (`ui-check.config.mjs`) runs the
geometry, axe and screenshot checks against the dev server; it opens the home
page as `/?still`, which holds the page at rest (nothing arrives, nothing
demonstrates itself) and the sky at noon.
