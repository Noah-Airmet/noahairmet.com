# Busy Bee — Katie's workout PWA (`/bee`)

Standalone, offline-first workout tracker for Katie Airmet, served at
`https://noahairmet.com/bee/` from `public/bee/`. It is deliberately an
exception to this site's "one page, professional" scope: a personal app that
rides along as pure static assets. It is not linked from the homepage and must
stay that way.

Built July 2026 in a Claude chat with Katie and Noah. It began as a React
artifact in Katie's Claude account, then was ported to a dependency-free
vanilla PWA for hosting here.

## Why it's built this way (decisions, in order of importance)

1. **No backend, ever.** All user data lives in `localStorage` on Katie's
   phone. The hosted files are pure code, which is why a health-adjacent app
   can live on a public domain without violating the household rule that
   health data never leaves owned hardware. Do not add sync, analytics,
   accounts, or any server component. The fitness repo on the iMac
   (`~/development/fitness`) is a deliberately separate, agent-driven system;
   the only bridge is a "Copy for Noah's trainer" button that puts markdown on
   the clipboard for manual pasting. Keep that coupling at zero.
2. **External `app.js` + `style.css`, no inline scripts or styles.** The
   site-wide CSP in `public/_headers` is `script-src 'self'; style-src 'self'`.
   Inline anything and the app breaks in production while working locally.
3. **Vanilla JS, no build step.** The site's Astro build just copies
   `public/` into `dist/`. No framework, no npm deps, no transpilation. Keep
   it that way — an agent should be able to edit `app.js` directly and ship.
4. **Offline-first.** `sw.js` is a cache-first service worker so the app works
   in the gym with zero signal. **Every time you change any file in
   `public/bee/`, bump the `CACHE` constant in `sw.js`** (`busy-bee-v1` →
   `-v2`, …) or installed phones will keep serving the stale cached version.
5. **Katie's interaction model: no agents, no typing where a tap will do.**
   She wants pre-built workouts and fast logging, not a conversational
   trainer. Preserve one-tap flows when changing UX.

## Code map (all in `public/bee/`)

- `app.js` — everything:
  - `PLAN` (top of file): the weekly program, array indexed Sun(0)–Sat(6).
    Day types: `strength` (exercises with sets), `recovery` (tappable
    checklist), `rest`. **This is the main thing that will need editing as
    Katie's pregnancy progresses** — swap exercises, trim volume, adjust notes
    per trimester. Keep everything bump-safe: no prone positions, no long
    supine work, breathing cues stay, "conversational pace" framing stays.
  - `DEMOS`: how-to guides keyed by **exact exercise name string**. Each has
    `cues` (array of strings) and optionally `frames` (two inline SVG strings,
    start/finish stick figures). If you add an exercise to `PLAN`, add a
    matching `DEMOS` entry or the how-to button silently won't render.
  - Storage layer: `localStorage` keys `bee:log:YYYY-MM-DD` (per-day state,
    created lazily from `PLAN` on first visit to a date) and `bee:history`
    (array of finished sessions, newest first).
  - Placeholder behavior (Katie requested this specifically): empty
    weight/reps inputs show her most recent logged values for that exercise
    as greyed placeholder text (`lastFor()`), and tapping the done-check on an
    untouched set adopts those values (`commitPlaceholderIfEmpty()`). "Same as
    last time" must remain a single tap.
  - Rendering: full re-render on structural changes; text input updates state
    without re-rendering (`input` listener) to avoid losing keyboard focus on
    mobile. Preserve that split or typing becomes unusable.
- `style.css` — design language: honey/cream/cocoa palette
  (`--honey #F0A93B`, `--cream #FFFBF2`, `--cocoa #4A3421`, `--leaf #8CA86B`
  for completion), bee/honeycomb motifs (hex-cell progress bar with a 🐝 that
  advances, 🍯 as the "done" mark), rounded system font stack (no webfonts —
  keeps it offline-clean and CSP-simple), 480px max-width mobile-first layout.
  The cutesy tone is intentional and Katie-approved; don't professionalize it.
- `index.html` — thin shell; iOS PWA meta tags + manifest/icon links.
- `sw.js` — cache-first app shell. See rule 4 above.
- Icons — generated programmatically (honey tile, cream hexagon, stick bee).

## Changing and shipping

Edits follow this repo's normal release procedure (`docs/DEPLOY.md`): branch,
`npm run check && npm run build && npm test`, verify `dist/bee/` exists, PR to
main, `npm run deploy`. The site tests don't cover `/bee` beyond it not
breaking the build; sanity-check the app manually with
`python3 -m http.server` from `public/bee/` before shipping. Remember the
service-worker cache bump.

## Katie's usage notes

- Install: Safari → `noahairmet.com/bee/` → Share → Add to Home Screen.
- Her data survives app/browser restarts but dies if she deletes the home
  screen icon. The "Export all data (backup)" button in the Hive Log copies a
  full JSON dump — encourage occasional backups.
- Her broader context (for anyone extending the program): back/posture focus
  during pregnancy, trains at a Student Fitness Center (equipment list is in
  her Claude chat history), 4 strength days + 2 recovery days + Sunday rest.
