import assert from "node:assert/strict";
import test from "node:test";
import { _test } from "../worker/last-out.js";

const { splitLifts, updown, smoothAltitudes } = _test;

// A deterministic stand-in for GPS altitude noise (±3 m).
let seed = 1;
const noise = () => ((seed = (seed * 16807) % 2147483647) / 2147483647 - 0.5) * 6;

// Points every ~10 m heading east; altitude from a profile function.
function track(profile, n) {
  return Array.from({ length: n }, (_, i) => [40.58, -111.64 + i * 0.000118, profile(i) + noise()]);
}

test("a ski day splits into one lift and one run per lap", () => {
  // five laps: 150 samples up 300 m (chair), 250 samples down 300 m (run)
  const lap = (i) => { const k = i % 400; return 2600 + (k < 150 ? k * 2 : 300 - (k - 150) * 1.2); };
  const pts = track(lap, 2000);
  const segs = splitLifts(pts, smoothAltitudes(pts));
  assert.equal(segs.filter((s) => s.lift).length, 5);
  assert.equal(segs.filter((s) => !s.lift).length, 5);
  assert.deepEqual(segs.slice(0, 4).map((s) => s.lift), [true, false, true, false]);
});

test("bumps smaller than 60 m stay inside one run", () => {
  const rolling = (i) => 3000 - i * 1.5 + 25 * Math.sin(i / 20);
  const pts = track(rolling, 400);
  const segs = splitLifts(pts, smoothAltitudes(pts));
  assert.equal(segs.length, 1);
  assert.equal(segs[0].lift, false);
});

test("climb totals ignore GPS jitter but keep real climbing", () => {
  const flat = track(() => 2000, 3000);
  assert.ok(updown(smoothAltitudes(flat)).up < 15, "flat ground should not add up");
  const hill = track((i) => 2000 + Math.min(i, 500) * 0.8, 1000);
  const { up } = updown(smoothAltitudes(hill));
  assert.ok(Math.abs(up - 400) < 20, `expected ~400 m up, got ${up}`);
});
