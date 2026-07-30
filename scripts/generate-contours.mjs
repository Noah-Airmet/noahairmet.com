// Generates nested topo-style contour loops as SVG path data.
// Deterministic (seeded) so output is reproducible and tunable.

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Radius modulation: sum of low-frequency sinusoids -> organic closed blob
function makeProfile(rand, lobes = 4) {
  const terms = [];
  for (let k = 2; k <= lobes + 1; k++) {
    terms.push({ freq: k, amp: (rand() * 0.5 + 0.15) / k, phase: rand() * Math.PI * 2 });
  }
  return (theta) => {
    let r = 1;
    for (const t of terms) r += t.amp * Math.sin(t.freq * theta + t.phase);
    return r;
  };
}

// Catmull-Rom -> cubic bezier, closed
function toPath(pts, dp = 0) {
  const n = pts.length;
  const f = (v) => v.toFixed(dp);
  let d = `M ${f(pts[0][0])} ${f(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i - 1 + n) % n];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % n];
    const p3 = pts[(i + 2) % n];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${f(c1[0])} ${f(c1[1])}, ${f(c2[0])} ${f(c2[1])}, ${f(p2[0])} ${f(p2[1])}`;
  }
  return d + " Z";
}

function contourSet({ seed, rings, cx, cy, rx, ry, rot, peakDrift, steps = 44, lobes = 4, jitter = 0.02 }) {
  const rand = mulberry32(seed);
  const profile = makeProfile(rand, lobes);
  const driftAngle = rand() * Math.PI * 2;
  const cos = Math.cos(rot), sin = Math.sin(rot);
  const paths = [];
  for (let ring = 0; ring < rings; ring++) {
    const t = ring / (rings - 1); // 0 outermost -> 1 innermost
    // ease so inner rings crowd toward the peak side (steep face)
    const shrink = 1 - Math.pow(t, 1.35) * 0.82;
    const dx = Math.cos(driftAngle) * peakDrift * Math.pow(t, 1.2);
    const dy = Math.sin(driftAngle) * peakDrift * Math.pow(t, 1.2);
    const ringRand = mulberry32(seed * 31 + ring * 7);
    const pts = [];
    for (let i = 0; i < steps; i++) {
      const th = (i / steps) * Math.PI * 2;
      const r = profile(th) * shrink * (1 + (ringRand() - 0.5) * jitter);
      let x = Math.cos(th) * rx * r;
      let y = Math.sin(th) * ry * r;
      const xr = x * cos - y * sin;
      const yr = x * sin + y * cos;
      pts.push([cx + dx + xr, cy + dy + yr]);
    }
    paths.push(toPath(pts));
  }
  // peak spot: final drift position
  const px = cx + Math.cos(driftAngle) * peakDrift;
  const py = cy + Math.sin(driftAngle) * peakDrift;
  return { paths, peak: [px.toFixed(1), py.toFixed(1)] };
}

const ridge = contourSet({
  seed: 11749, // Timpanogos ft
  rings: 9,
  cx: 520, cy: 300,
  rx: 430, ry: 210,
  rot: -0.38,
  peakDrift: 68,
  lobes: 5,
});

const knoll = contourSet({
  seed: 4551, // Provo ft
  rings: 6,
  cx: 260, cy: 240,
  rx: 230, ry: 160,
  rot: 0.5,
  peakDrift: 42,
  lobes: 3,
});

const out = { ridge, knoll };
for (const [name, set] of Object.entries(out)) {
  console.log(`=== ${name} (peak ${set.peak.join(",")}) ===`);
  set.paths.forEach((p, i) => console.log(`<!-- ring ${i} len=${p.length} -->`));
  console.log(`total chars: ${set.paths.join("").length}`);
}

// emit a preview html for eyeballing
import { writeFileSync } from "node:fs";
const svg = (set, w, h) =>
  `<svg viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" fill="none" stroke="#1c2420" stroke-opacity="0.5">` +
  set.paths.map((d, i) => `<path d="${d}" stroke-width="${i % 4 === 0 ? 1.6 : 0.8}"/>`).join("") +
  `<path d="M ${set.peak[0]-4} ${set.peak[1]} h8 M ${set.peak[0]} ${set.peak[1]-4} v8" stroke-width="1.2"/>` +
  `</svg>`;
writeFileSync(new URL("./contours-preview.html", import.meta.url).pathname,
  `<body style="background:#f6f8f2">${svg(ridge, 1040, 620)}<hr>${svg(knoll, 520, 480)}</body>`);
writeFileSync(new URL("./contours.json", import.meta.url).pathname, JSON.stringify(out, null, 1));
console.log("wrote contours-preview.html + contours.json");
