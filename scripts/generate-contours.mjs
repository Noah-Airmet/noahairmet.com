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

const GRID = 80; // 80x80 samples per mountain
const LEVELS = 9; // contour lines per mountain

// Ridge-corridor boxes: framed tight on the ridgeline that makes each
// mountain recognizable, the way a climber's map crops it. Contours
// start high (see `lo`) so valley noise never enters the figure, and
// secondary summits get elevation-tagged crosses as recognition anchors.
const MOUNTAINS = {
  timpanogos: {
    // The Timp horseshoe exactly as hiked: Bomber Peak (NW), the summit,
    // the west ridge down to South Timpanogos, and The Shoulder across
    // the basin. Peak coordinates from OpenStreetMap.
    lat: [40.372, 40.417],
    lon: [-111.678, -111.614],
    label: "MT TIMPANOGOS · 11,749 FT",
    trailStart: [0.75, 0.97], // Aspen Grove side, up through the basin
    namedMarks: [
      [40.40417, -111.65756], // Bomber Peak
      [40.38437, -111.63648], // South Timpanogos
      [40.39134, -111.63736], // The Shoulder
    ],
    field: { r: 300, wobble: 0.34 },
  },
  lonePeak: {
    // The ridge from his Mapbox screenshot: Rocky Mouth Canyon Peak (NNW)
    // → Lone Peak cirque → Big Horn Peak (SE), west spurs to the valley.
    lat: [40.505, 40.552],
    lon: [-111.8, -111.712],
    label: "LONE PEAK · 11,253 FT",
    trailStart: [0.65, 0.03], // out of the Draper foothills
    namedMarks: [
      [40.5383, -111.76077], // Rocky Mouth Canyon Peak
      [40.52241, -111.74365], // Big Horn Peak
    ],
    field: { r: 315, wobble: 0.38 },
  },
  kingsPeak: {
    // The Kings crest with the Henrys Fork approach.
    lat: [40.745, 40.808],
    lon: [-110.415, -110.33],
    label: "KINGS PEAK · 13,528 FT",
    trailStart: [0.05, 0.42], // the real approach: in from the north
    namedMarks: [[40.76591, -110.37783]], // South Kings Peak
    axisExtra: [[40.792, -110.373]], // capsule reaches up the Henrys Fork approach
    field: { r: 330, wobble: 0.3 },
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

// A decorative ascent: continuous gradient climb with momentum, blending
// "uphill" with "toward the summit". Momentum keeps it flowing — it
// cannot switchback onto itself. Not a real route; a plausible one.
function ascentTrail(grid, startFrac) {
  const { rows, cols, elev } = grid;
  const at = (r, c) =>
    elev[Math.min(rows - 1, Math.max(0, r)) * cols + Math.min(cols - 1, Math.max(0, c))] ?? 0;
  const sample = (x, y) => {
    const c0 = Math.floor(x), r0 = Math.floor(y);
    const fx = x - c0, fy = y - r0;
    return (
      at(r0, c0) * (1 - fx) * (1 - fy) +
      at(r0, c0 + 1) * fx * (1 - fy) +
      at(r0 + 1, c0) * (1 - fx) * fy +
      at(r0 + 1, c0 + 1) * fx * fy
    );
  };
  let best = 0;
  for (let i = 1; i < elev.length; i++) if ((elev[i] ?? -1e9) > (elev[best] ?? -1e9)) best = i;
  const summit = [best % cols, Math.floor(best / cols)]; // [x, y]

  let p = [startFrac[1] * (cols - 1), startFrac[0] * (rows - 1)];
  let v = [summit[0] - p[0], summit[1] - p[1]];
  const norm = (u) => {
    const m = Math.hypot(u[0], u[1]) || 1;
    return [u[0] / m, u[1] / m];
  };
  v = norm(v);
  const path = [[...p]];
  const h = 0.75, step = 1.15;
  for (let i = 0; i < 500; i++) {
    const dSummit = Math.hypot(summit[0] - p[0], summit[1] - p[1]);
    if (dSummit < 1.4) break;
    const grad = norm([
      sample(p[0] + h, p[1]) - sample(p[0] - h, p[1]),
      sample(p[0], p[1] + h) - sample(p[0], p[1] - h),
    ]);
    const toward = norm([summit[0] - p[0], summit[1] - p[1]]);
    // near the summit, "toward" dominates so the trail actually tops out
    const pull = Math.min(1, 8 / dSummit);
    const dir = norm([
      0.5 * grad[0] + (0.55 + pull) * toward[0] + 0.85 * v[0],
      0.5 * grad[1] + (0.55 + pull) * toward[1] + 0.85 * v[1],
    ]);
    p = [
      Math.min(cols - 2, Math.max(1, p[0] + dir[0] * step)),
      Math.min(rows - 2, Math.max(1, p[1] + dir[1] * step)),
    ];
    v = dir;
    path.push([...p]);
  }
  path.push(summit);
  return path; // [x, y] grid coords
}

// Deterministic PRNG for the boundary wobble.
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Distance from a point to a polyline (min over its segments).
function distToPolyline(p, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [a, b] = [pts[i], pts[i + 1]];
    const abx = b[0] - a[0], aby = b[1] - a[1];
    const len2 = abx * abx + aby * aby || 1e-9;
    const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * abx + (p[1] - a[1]) * aby) / len2));
    best = Math.min(best, Math.hypot(p[0] - (a[0] + t * abx), p[1] - (a[1] + t * aby)));
  }
  return best;
}

function toSet(grid, targetW, spec) {
  const { rows, cols, elev } = grid;
  const values = elev.filter((v) => v != null);
  const min = Math.min(...values), max = Math.max(...values);
  const lo = min + 0.42 * (max - min);
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
  const lonlatToVB = ([mlat, mlon]) => [
    ((mlon - grid.lon[0]) / (grid.lon[1] - grid.lon[0])) * targetW,
    ((grid.lat[1] - mlat) / (grid.lat[1] - grid.lat[0])) * H,
  ];

  // summit = grid argmax
  let best = 0;
  for (let i = 1; i < elev.length; i++) if ((elev[i] ?? -1) > (elev[best] ?? -1)) best = i;
  const peakVB = [sx(best % cols), sy(Math.floor(best / cols))];
  const peak = [peakVB[0].toFixed(1), peakVB[1].toFixed(1)];

  // Secondary summits: the named peaks that make the ridge recognizable,
  // pinned by coordinate and snapped to the DEM's local max so the
  // elevation tag is ground truth (reads slightly low at grid resolution).
  const at = (r, c) => elev[r * cols + c] ?? -1e9;
  const marks = (spec.namedMarks ?? []).map(([mlat, mlon]) => {
    let r0 = Math.round(((grid.lat[1] - mlat) / (grid.lat[1] - grid.lat[0])) * (rows - 1));
    let c0 = Math.round(((mlon - grid.lon[0]) / (grid.lon[1] - grid.lon[0])) * (cols - 1));
    let bestRC = [r0, c0];
    for (let dr = -3; dr <= 3; dr++)
      for (let dc = -3; dc <= 3; dc++) {
        const rr = r0 + dr, cc = c0 + dc;
        if (rr < 1 || cc < 1 || rr >= rows - 1 || cc >= cols - 1) continue;
        if (at(rr, cc) > at(bestRC[0], bestRC[1])) bestRC = [rr, cc];
      }
    return {
      vb: [sx(bestRC[1]), sy(bestRC[0])],
      x: sx(bestRC[1]).toFixed(1),
      y: sy(bestRC[0]).toFixed(1),
      ft: Math.round(at(bestRC[0], bestRC[1]) * 3.28084).toLocaleString("en-US") + " FT",
    };
  });

  // The organic boundary: every contour is trimmed to a noise-wobbled
  // capsule around the ridge axis (the named peaks through the summit),
  // so lines end at varied natural positions instead of a box edge.
  const axis = [
    ...(marks.length ? [marks[0].vb] : []),
    peakVB,
    ...marks.slice(1).map((m) => m.vb),
    ...(spec.axisExtra ?? []).map(lonlatToVB),
  ];
  const cx = axis.reduce((s, p) => s + p[0], 0) / axis.length;
  const cy = axis.reduce((s, p) => s + p[1], 0) / axis.length;
  const rand = mulberry32(Math.round(Math.abs(grid.lat[0]) * 1e4));
  const [ph1, ph2, ph3] = [rand() * 6.28, rand() * 6.28, rand() * 6.28];
  const fieldR = spec.field?.r ?? 280;
  const wobble = spec.field?.wobble ?? 0.32;
  const inField = (p) => {
    const a = Math.atan2(p[1] - cy, p[0] - cx);
    const n =
      1 +
      (wobble * (0.55 * Math.sin(2 * a + ph1) + 0.45 * Math.sin(3 * a + ph2) + 0.3 * Math.sin(5 * a + ph3))) / 1.3;
    return distToPolyline(p, axis) < fieldR * n;
  };

  const paths = [];
  levels.forEach((level) => {
    for (const line of chain(segmentsForLevel(grid, level))) {
      if (line.length < 12) continue; // drop gravel
      const closed =
        Math.hypot(line[0][0] - line[line.length - 1][0], line[0][1] - line[line.length - 1][1]) < 0.01;
      const smooth = chaikin(rdp(line, 0.28));
      const xs = smooth.map((p) => p[0]), ys = smooth.map((p) => p[1]);
      const span =
        (Math.max(...xs) - Math.min(...xs)) + (Math.max(...ys) - Math.min(...ys));
      if (span < 5) continue; // drop pebble rings
      const vb = smooth.map((p) => [sx(p[0]), sy(p[1])]);
      // split into runs of in-field points; each run becomes its own line
      const runs = [];
      let run = [];
      for (const p of vb) {
        if (inField(p)) run.push(p);
        else if (run.length) {
          runs.push(run);
          run = [];
        }
      }
      if (run.length) runs.push(run);
      const untouched = runs.length === 1 && runs[0].length === vb.length;
      for (const piece of runs) {
        if (piece.length < 6) continue;
        let d = "";
        piece.forEach((p, i) => {
          d += `${i === 0 ? "M" : "L"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
        });
        if (closed && untouched) d += "Z";
        paths.push(d);
      }
    }
  });

  const trailPts = chaikin(rdp(ascentTrail(grid, spec.trailStart ?? [0.9, 0.1]), 0.9), 3);
  const trail = trailPts
    .map((p, i) => `${i === 0 ? "M" : "L"}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`)
    .join("");

  return {
    paths,
    peak,
    trail,
    marks: marks.map(({ x, y, ft }) => ({ x, y, ft })),
    viewBox: `0 0 ${targetW} ${H}`,
  };
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
  "export type ContourSet = { paths: string[]; peak: [string, string]; trail: string; marks: { x: string; y: string; ft: string }[]; viewBox: string; label: string };\n" +
  Object.entries(out)
    .map(([k, v]) => `export const ${k}: ContourSet = ${JSON.stringify(v)};`)
    .join("\n") +
  "\n";
writeFileSync(join(here, "../src/lib/contours.ts"), ts);
console.log(`wrote src/lib/contours.ts (${ts.length} chars)`);
