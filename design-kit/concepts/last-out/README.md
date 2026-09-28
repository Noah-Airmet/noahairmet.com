# Last out — prototype

The About page's mountain becomes the one Noah was last out on (hike, ride,
ski day), with the route drawn on the terrain and a one-line stats caption.
Data will come from his Ledger iOS app (HealthKit workouts + routes → Worker
→ KV). Routes here are fake, routed over real OSM trails, lifts and pistes;
stats are fake too (the Watch supplies real ones).

## Decisions (Noah, 2026-09-28)

- Mountains swap; the list is Timp (hikes), Sundance, Alta, Brighton,
  Corner Canyon.
- **Corner Canyon and Sundance use variant B**: the frame zooms to fit the
  activity, and the named peak (Lone Peak / Timp) stands behind as a faint
  backdrop layer. Variant A (one big frame) stays here for reference only.
- Brighton looks uphill from the base, not at Clayton (Millicent blocks
  that view).
- The camera aims from the route toward the peak, so the route is in front.

Consequence for the real build: B's frame depends on each activity, so the
Worker should fetch that activity's terrain grid from USGS 3DEP when Ledger
posts it (one request, see `dem.py`) and store it next to the activity.

## Run

```bash
./fetch-osm.sh      # once: OSM inputs into cache/ (gitignored)
python3 build.py    # terrain + routes -> data.js
```

Serve the repo root over http (the page loads `../../../public/sky.js`) and
open `design-kit/concepts/last-out/index.html`. Query flags: `?still`
(finished state), `?only=timp,alta`, `?at=21:30` (sky time).

`dem.py` gotcha: ArcGIS `exportImage` pads the bbox to the image's aspect
ratio, so it fetches at the box's true aspect and resamples.
