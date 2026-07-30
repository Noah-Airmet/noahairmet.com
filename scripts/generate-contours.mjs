// Generates the site's contour artwork from real USGS 10m elevation data
// (opentopodata.org, dataset ned10m). Produces src/lib/contours.ts.
//
//   node scripts/generate-contours.mjs
//
// Elevation grids are cached next to this script in terrain-cache/ so the
// API is only hit once per mountain; delete the cache to refetch. The
// marching-squares → simplify → smooth pipeline below turns each grid into
// ghosted plate art. Tune LEVELS/eps for density, not the path data.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const cacheDir = join(here, "terrain-cache");
mkdirSync(cacheDir, { recursive: true });

const GRID = 70; // 70x70 samples per mountain
const LEVELS = 9; // contour lines per mountain

const MOUNTAINS = {
  timpanogos: {
    // Mount Timpanogos, 11,749 ft — the Utah County icon
    lat: [40.355, 40.435],
    lon: [-111.695, -111.6],
    label: "MT TIMPANOGOS · 11,749 FT",
    trailStart: [0.92, 0.18], // [rowFrac, colFrac] — trailhead-ish corner
  },
  lonePeak: {
    // Lone Peak, 11,253 ft
    lat: [40.503, 40.552],
    lon: [-111.776, -111.712],
    label: "LONE PEAK · 11,253 FT",
    trailStart: [0.9, 0.12],
  },
  kingsPeak: {
    // Kings Peak, 13,528 ft — highest point in Utah
    lat: [40.748, 40.806],
    lon: [-110.412, -110.334],
    label: "KINGS PEAK · 13,528 FT",
    trailStart: [0.12, 0.15],
  },
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchGrid(name, spec) {
  const cache = join(cacheDir, `${name}.json`);
  if (existsSync(cache)) {
    console.log(`${name}: using cached grid`);
    return JSON.parse(readFileSync(cache, "utf8"));
  }
  const points = [];
  for (let r = 0; r < GRID; r++) {
    const lat = spec.lat[1] - (r / (GRID - 1)) * (spec.lat[1] - spec.lat[0]);
    for (let c = 0; c < GRID; c++) {
      const lon = spec.lon[0] + (c / (GRID - 1)) * (spec.lon[1] - spec.lon[0]);
      points.push(`${lat.toFixed(5)},${lon.toFixed(5)}`);
    }
  }
  const elev = [];
  for (let i = 0; i < points.length; i += 100) {
    const batch = points.slice(i, i + 100).join("|");
    let ok = false;
    for (let attempt = 0; attempt < 4 && !ok; attempt++) {
      try {
        const res = await fetch(
          `https://api.opentopodata.org/v1/ned10m?locations=${batch}`,
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        elev.push(...data.results.map((p) => p.elevation));
        ok = true;
      } catch (err) {
        console.log(`${name} batch ${i / 100}: retry ${attempt + 1} (${err.message})`);
        await sleep(2500 * (attempt + 1));
      }
    }
    if (!ok) throw new Error(`${name}: batch ${i / 100} failed after retries`);
    process.stdout.write(`\r${name}: ${Math.min(i + 100, points.length)}/${points.length}`);
    await sleep(1100); // public API: 1 call/sec
  }
  console.log("");
  const grid = { rows: GRID, cols: GRID, ...spec, elev };
  writeFileSync(cache, JSON.stringify(grid));
  return grid;
}

// ---- marching squares -------------------------------------------------

function segmentsForLevel(grid, level) {
  const { rows, cols, elev } = grid;
  const at = (r, c) => elev[r * cols + c];
  const lerp = (a, b) => (level - a) / (b - a);
  const segs = [];
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < cols - 1; c++) {
      const tl = at(r, c), tr = at(r, c + 1), br = at(r + 1, c + 1), bl = at(r + 1, c);
      if ([tl, tr, br, bl].some((v) => v == null)) continue;
      let idx = 0;
      if (tl >= level) idx |= 8;
      if (tr >= level) idx |= 4;
      if (br >= level) idx |= 2;
      if (bl >= level) idx |= 1;
      if (idx === 0 || idx === 15) continue;
      const top = [c + lerp(tl, tr), r];
      const right = [c + 1, r + lerp(tr, br)];
      const bottom = [c + lerp(bl, br), r + 1];
      const left = [c, r + lerp(tl, bl)];
      const table = {
        1: [[left, bottom]], 2: [[bottom, right]], 3: [[left, right]],
        4: [[top, right]], 5: [[top, left], [bottom, right]], 6: [[top, bottom]],
        7: [[top, left]], 8: [[top, left]], 9: [[top, bottom]],
        10: [[top, right], [bottom, left]], 11: [[top, right]],
        12: [[left, right]], 13: [[bottom, right]], 14: [[left, bottom]],
      };
      for (const seg of table[idx] ?? []) segs.push(seg);
    }
  }
  return segs;
}

function chain(segs) {
  const key = (p) => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
  const byStart = new Map();
  for (const s of segs) {
    for (const [a, b] of [[s[0], s[1]], [s[1], s[0]]]) {
      const k = key(a);
      if (!byStart.has(k)) byStart.set(k, []);
      byStart.get(k).push([a, b]);
    }
  }
  const used = new Set();
  const lines = [];
  for (const s of segs) {
    const id = key(s[0]) + "|" + key(s[1]);
    if (used.has(id)) continue;
    let line = [s[0], s[1]];
    used.add(id);
    used.add(key(s[1]) + "|" + key(s[0]));
    let extended = true;
    while (extended) {
      extended = false;
      const tail = line[line.length - 1];
      for (const [a, b] of byStart.get(key(tail)) ?? []) {
        const fid = key(a) + "|" + key(b);
        if (used.has(fid)) continue;
        used.add(fid);
        used.add(key(b) + "|" + key(a));
        line.push(b);
        extended = true;
        break;
      }
    }
    lines.push(line);
  }
  return lines.filter((l) => l.length > 6);
}

function rdp(points, eps) {
  if (points.length < 3) return points;
  const [a, b] = [points[0], points[points.length - 1]];
  let maxD = 0, maxI = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i];
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1e-9;
    const d = Math.abs(dy * p[0] - dx * p[1] + b[0] * a[1] - b[1] * a[0]) / len;
    if (d > maxD) { maxD = d; maxI = i; }
  }
  if (maxD <= eps) return [a, b];
  return [...rdp(points.slice(0, maxI + 1), eps).slice(0, -1), ...rdp(points.slice(maxI), eps)];
}

function chaikin(points, iterations = 2) {
  let pts = points;
  for (let it = 0; it < iterations; it++) {
    const out = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const [p, q] = [pts[i], pts[i + 1]];
      out.push([0.75 * p[0] + 0.25 * q[0], 0.75 * p[1] + 0.25 * q[1]]);
      out.push([0.25 * p[0] + 0.75 * q[0], 0.25 * p[1] + 0.75 * q[1]]);
    }
    out.push(pts[pts.length - 1]);
    pts = out;
  }
  return pts;
}

// A decorative ascent: greedy climb from a start corner toward the summit,
// biased uphill and summit-ward. Not a real route — a plausible one.
function ascentTrail(grid, startFrac) {
  const { rows, cols, elev } = grid;
  const at = (r, c) => elev[r * cols + c] ?? -1e9;
  let best = 0;
  for (let i = 1; i < elev.length; i++) if ((elev[i] ?? -1e9) > (elev[best] ?? -1e9)) best = i;
  const summit = [Math.floor(best / cols), best % cols];
  let p = [Math.round(startFrac[0] * (rows - 1)), Math.round(startFrac[1] * (cols - 1))];
  const path = [p];
  const seen = new Set([p.join(",")]);
  for (let step = 0; step < rows * cols; step++) {
    if (Math.hypot(p[0] - summit[0], p[1] - summit[1]) < 1.2) break;
    let bestScore = -Infinity;
    let next = null;
    for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
      const q = [p[0] + dr, p[1] + dc];
      if (q[0] < 0 || q[1] < 0 || q[0] >= rows || q[1] >= cols || seen.has(q.join(","))) continue;
      const toward =
        ((summit[0] - p[0]) * dr + (summit[1] - p[1]) * dc) /
        (Math.hypot(summit[0] - p[0], summit[1] - p[1]) * Math.hypot(dr, dc) || 1);
      const score = (at(q[0], q[1]) - at(p[0], p[1])) + 26 * toward;
      if (score > bestScore) {
        bestScore = score;
        next = q;
      }
    }
    if (!next) break;
    p = next;
    seen.add(p.join(","));
    path.push(p);
  }
  return path.map(([r, c]) => [c, r]); // → [x, y] grid coords
}

function toSet(grid, targetW, spec) {
  const { rows, cols, elev } = grid;
  const values = elev.filter((v) => v != null);
  const min = Math.min(...values), max = Math.max(...values);
  const lo = min + 0.32 * (max - min);
  const hi = max - 0.05 * (max - min);
  const levels = Array.from({ length: LEVELS }, (_, i) => lo + (i / (LEVELS - 1)) * (hi - lo));

  // aspect-true projection: km east-west shrinks with cos(latitude)
  const latMid = (grid.lat[0] + grid.lat[1]) / 2;
  const kmX = (grid.lon[1] - grid.lon[0]) * 111.32 * Math.cos((latMid * Math.PI) / 180);
  const kmY = (grid.lat[1] - grid.lat[0]) * 111.32;
  const scale = targetW / kmX;
  const H = Math.round(kmY * scale);
  const sx = (c) => (c / (cols - 1)) * targetW;
  const sy = (r) => (r / (rows - 1)) * H;

  const paths = [];
  levels.forEach((level) => {
    for (const line of chain(segmentsForLevel(grid, level))) {
      const closed =
        Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]) < 0.01;
      const smooth = chaikin(rdp(line, 0.28));
      let d = "";
      smooth.forEach((p, i) => {
        d += `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`;
      });
      if (closed) d += "Z";
      paths.push(d);
    }
  });

  // summit = grid argmax
  let best = 0;
  for (let i = 1; i < elev.length; i++) if ((elev[i] ?? -1) > (elev[best] ?? -1)) best = i;
  const peak = [sx(best % cols).toFixed(1), sy(Math.floor(best / cols)).toFixed(1)];

  const trailPts = chaikin(rdp(ascentTrail(grid, spec.trailStart ?? [0.9, 0.1]), 0.9), 3);
  const trail = trailPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`)
    .join("");

  return { paths, peak, trail, viewBox: `0 0 ${targetW} ${H}` };
}

const out = {};
for (const [name, spec] of Object.entries(MOUNTAINS)) {
  const grid = await fetchGrid(name, spec);
  out[name] = { ...toSet(grid, 1000, spec), label: spec.label };
  console.log(`${name}: ${out[name].paths.length} lines, ${JSON.stringify(out[name]).length} chars`);
}

const ts =
  "// Real-terrain contour data, generated by scripts/generate-contours.mjs\n" +
  "// from USGS 10m elevation (opentopodata.org ned10m). Do not hand-edit.\n" +
  "export type ContourSet = { paths: string[]; peak: [string, string]; trail: string; viewBox: string; label: string };\n" +
  Object.entries(out)
    .map(([k, v]) => `export const ${k}: ContourSet = ${JSON.stringify(v)};`)
    .join("\n") +
  "\n";
writeFileSync(join(here, "../src/lib/contours.ts"), ts);
console.log(`wrote src/lib/contours.ts (${ts.length} chars)`);
