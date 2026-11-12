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
- **CitationBench**: two floating windows. One is the quote check
  (`src/board/quote.ts`), the code check the benchmark scores quotations
  with: every wording is checked live against the library's verifier
  (`POST https://safetypage-api.noahairmet.com/api/verify`). Left alone it
  demonstrates itself: an agent gets one word wrong, the check strikes it and
  writes what the source says, another agent restores it, and the next
  quotation comes up (the line under `Another` is the time left). Touch it
  and the demonstration stops. Beside it is the leaderboard
  (`src/board/bench.ts`): the published runs as bars with their 95%
  intervals. A bar's end drags to a number it never scored; an agent drags it
  back. Noah, 2026-11-12, on why the check is here and not under Catchword:
  "this is a demo that makes more sense for CitationBench, where an agent is
  shown catching an error"; the recording of a replay that used to be here
  was "a very messy screen with a lot going on. too hard to follow".
- **Catchword** (`src/board/ask.ts`): a question typed into a field by fable
  and sent, answered by opus in the source's own words, which arrive a word
  at a time; opus then presses the citation and the cited page comes up
  beside the card (`src/board/sheet.ts`: Catchword's own scan, with the
  library's yellow on the quoted words) while the quote is checked live.
  Three questions turn. It is the demo from Noah's pitch notes ("a window
  where you ask the chatbot ... and the agent answers"), as he asked for it
  here: "a clear example of a question being asked about safety policy and
  an agent giving the answer-- it could be the fable cursor typing a
  question and the opus cursor answering. a cleaned up simplified interface
  that works on a card, with smoot animations, text fading in nicely as it
  answers". An answer is the document's name and a quotation, nothing else,
  so nothing on the card is anybody's paraphrase.
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
  AI cliche"); the control is the day bar at the foot of the page
  (`src/board/daybar.ts`): one strip, midnight to midnight in Provo, coloured
  as the page is coloured at each hour, with today's sunrise and sunset
  marked from the sun's real elevation. Sliding the blue mark holds another
  time of day; `Now` lets go. `?at=17:10` opens the page at a time, for
  looking at a sky. (A copy of the Apple Watch Solar Dial was built first and
  taken out the same day: Noah found it didn't fit the rest of the site. It
  is in git at 95bce36 if it's ever wanted.)
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
my 'resume.'" He is proud of CitationBench and SafetyPage, which he renamed
Catchword the same day ("catchword is great, go for it"); its site, API and
repo still carry the old name (`safetypage.noahairmet.com`,
`~/development/safetypage`). "i'm not
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

Noah reads and owns every published word. The lede is from the previous
edition. He asked (2026-11-12) for each project pitch to say why the thing is
needed, not only what it is, and wrote both himself the same day. Catchword's
is his as written, plus a last part he asked for later that day ("explains
why using Catchword is better than just asking the questions shown in the
demo to ChatGPT in the web"), which is a draft for him to rewrite. CitationBench's is his with one clause changed to match
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

- `public/boot.js` runs before first paint: with motion allowed it hides the
  plain name so the pieces can take its place, and brings it back if the board
  never loads.
- The Worker (`worker/index.js`) answers `/api/last-out`, and Range requests
  for `/media/*` (Workers static assets ignore them, and Safari won't play an
  MP4 without them).
- Headers (`public/_headers`): same-origin scripts and styles, Cloudflare Web
  Analytics, and `connect-src` for the Catchword API. Astro would inline
  small scripts, so `assetsInlineLimit: 0` stays in `astro.config.mjs`.
- `public/_redirects` keeps old addresses alive. A `/resume/*` wildcard loops
  the PDF, so there isn't one.
- Icon: `scripts/icons.py` then `node scripts/icons.mjs`. Share card:
  `/card/` is a small stage (480 by 252) with only the name, the page's state
  and the agents, drawn larger so they read at the size a chat app shows a
  link (`src/pages/card.astro`, `src/board/card.ts`, `src/styles/card.css`).
  `node scripts/card.mjs` against a running server scatters the letters there
  and records the agents setting them: `public/media/card.mp4`, a loop that
  ends on the frame it starts on, is the `og:video` iMessage and Discord
  play; `public/og/card.png`, a frame with about three letters to go, is the
  `og:image` for everything else. Then bump `card.image`'s and `card.video`'s
  `v` in `src/site.ts`. The video is in `/media` because the Worker answers
  Range requests there, which Safari needs to play it.

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
