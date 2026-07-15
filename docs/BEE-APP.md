# Busy Bee 🐝 — Katie's Workout PWA

Standalone, dependency-free, offline-first workout tracker. No backend, no build step,
no framework. All of Katie's data lives in `localStorage` **on her phone** — the hosted
files are pure static code, so serving them publicly does not expose any health data.

## Contents

```
index.html            app shell (links style.css + app.js — kept external to satisfy the site CSP)
style.css             all styles
app.js                all logic (plan, demos, storage, rendering)
manifest.webmanifest  PWA manifest (name, icons, standalone display)
sw.js                 service worker — cache-first app shell, works fully offline
icon-192.png / icon-512.png / apple-touch-icon.png
```

## Deployed at

`https://noahairmet.com/bee/` — lives in `public/bee/` of the noahairmet.com repo,
shipped with the site's normal `npm run deploy` (Cloudflare Workers Static Assets).

## Katie's install (iPhone)

1. Open `https://noahairmet.com/bee/` in **Safari**
2. Share button → **Add to Home Screen**
3. Done. It launches fullscreen with the bee icon and works with zero signal.

## Things to know

- **Data lives on-device.** Installed home-screen PWAs on iOS get durable storage
  (they're exempt from Safari's 7-day website-data eviction), but if she ever
  deletes the app icon, her logs go with it. The **"Export all data (backup)"**
  button in the Hive Log copies a full JSON dump to the clipboard — worth doing
  occasionally and pasting somewhere safe (Notes, a message to you, wherever).
- **"Copy for Noah's trainer"** on any logged session copies a small markdown
  summary shaped for the fitness-repo agents, if she ever wants a session in
  that system. One paste into a Claude session in the fitness repo and the agent
  can `fit log-workout` it. Entirely optional, zero coupling.
- **Updating the app:** bump `CACHE = "busy-bee-v1"` in `sw.js` (v2, v3, …)
  whenever you redeploy changed files, or the service worker will keep serving
  the old cached version.
- The weekly program (Sun–Sat) is defined in the `PLAN` array at the top of
  `app.js`; exercise how-tos are in `DEMOS`. Both are plain data — easy for you
  or an agent to edit as her program evolves by trimester.
