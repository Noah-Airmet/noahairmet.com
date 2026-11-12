// The mountain Noah was last out on, as a stack of cut contours: each level of
// the USGS elevation grid is one sheet, drawn bottom to top so the high ground
// hides what is behind it. /api/last-out supplies the terrain and the route
// when there is a recent activity; otherwise it is Mount Timpanogos.
import { free, post } from "./agents";
import { calm, clamp, onTick, run, still } from "./kit";

type Grid = { rows: number; cols: number; elev: number[] };
type Frame = Grid & { fade: number; peak: [number, number] };
type Seg = { lift: boolean; uv: [number, number][] };
type Stats = { duration_s: number; distance_m: number; ascent_m: number; descent_m: number; runs: number | null };
type Kind = "hike" | "run" | "ride" | "ski";
interface Out {
  v: 1;
  title: string;
  kind: Kind;
  end: string;
  staleAfter: string;
  stats: Stats;
  frame: Frame;
  segs: Seg[];
}

const LEVELS = 34;
const FT = 3.28084;
const MI = 0.621371;
const VERB = { hike: "Hiked", run: "Ran", ride: "Rode", ski: "Skied" };

async function lastOut(): Promise<Out | null> {
  try {
    const res = await fetch("/api/last-out", { signal: AbortSignal.timeout(1500) });
    if (res.status !== 200) return null;
    const r = (await res.json()) as Out;
    return r.v === 1 && Date.parse(r.staleAfter) > Date.now() ? r : null;
  } catch {
    return null;
  }
}

function when(iso: string) {
  const zone = { timeZone: "America/Denver" } as const;
  const day = (d: Date) => d.toLocaleDateString("en-CA", zone);
  const d = new Date(iso);
  const ago = (Date.parse(day(new Date())) - Date.parse(day(d))) / 864e5;
  if (ago < 1) return "today";
  if (ago < 2) return "yesterday";
  if (ago < 7) return d.toLocaleDateString("en-US", { ...zone, weekday: "long" });
  return d.toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" });
}

function describe(r: Out) {
  const s = r.stats;
  const n = (x: number) => Math.round(x).toLocaleString("en-US");
  const h = Math.floor(s.duration_s / 3600);
  const m = Math.round((s.duration_s % 3600) / 60);
  const parts = [`${VERB[r.kind]} ${when(r.end)}`];
  if (r.kind === "ski") {
    if (s.runs) parts.push(`${s.runs} ${s.runs === 1 ? "run" : "runs"}`);
    parts.push(`${n(s.descent_m * FT)} ft down`);
  } else {
    parts.push(`${((s.distance_m / 1000) * MI).toFixed(1)} mi`, `${n(s.ascent_m * FT)} ft up`);
  }
  parts.push(h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`);
  return parts.join(", ");
}

/** One sheet per level: where the ground is at least that high, and its edge.
 *  Paths are in grid cells from the centre; the round cut is made when drawing. */
function sheets(g: Grid) {
  const { rows: R, cols: C } = g;
  let lo = Infinity;
  let hi = -Infinity;
  for (const e of g.elev) {
    if (e < lo) lo = e;
    if (e > hi) hi = e;
  }
  const h = Float32Array.from(g.elev, (e) => (e - lo) / (hi - lo));
  const at = (r: number, c: number) => h[r * C + c];
  const out: { fill: Path2D; edge: Path2D; z: number }[] = [];
  for (let l = 0; l < LEVELS; l++) {
    const t = l / LEVELS;
    const fill = new Path2D();
    const edge = new Path2D();
    for (let r = 0; r < R - 1; r++) {
      const y = r - (R - 1) / 2;
      let run = -1;
      for (let c = 0; c < C; c++) {
        const v = c < C - 1 ? [at(r, c), at(r, c + 1), at(r + 1, c + 1), at(r + 1, c)] : [-1, -1, -1, -1];
        const inside = v.map((x) => x >= t);
        const n = +inside[0] + +inside[1] + +inside[2] + +inside[3];
        const x = c - (C - 1) / 2;
        // whole cells go down as one strip per run
        if (n === 4) {
          if (run < 0) run = c;
          continue;
        }
        if (run >= 0) {
          fill.rect(run - (C - 1) / 2 - 0.02, y - 0.02, c - run + 0.04, 1.04);
          run = -1;
        }
        if (!n) continue;
        // Walk the cell's corners; where the level crosses a side, cut there.
        const corner = [
          [x, y],
          [x + 1, y],
          [x + 1, y + 1],
          [x, y + 1],
        ];
        const poly: number[][] = [];
        const cuts: number[][] = [];
        for (let i = 0; i < 4; i++) {
          const j = (i + 1) % 4;
          if (inside[i]) poly.push(corner[i]);
          if (inside[i] !== inside[j]) {
            const k = (t - v[i]) / (v[j] - v[i]);
            const p = [corner[i][0] + (corner[j][0] - corner[i][0]) * k, corner[i][1] + (corner[j][1] - corner[i][1]) * k];
            poly.push(p);
            cuts.push(p);
          }
        }
        fill.moveTo(poly[0][0], poly[0][1]);
        for (let i = 1; i < poly.length; i++) fill.lineTo(poly[i][0], poly[i][1]);
        fill.closePath();
        for (let i = 0; i + 1 < cuts.length; i += 2) {
          edge.moveTo(cuts[i][0], cuts[i][1]);
          edge.lineTo(cuts[i + 1][0], cuts[i + 1][1]);
        }
      }
    }
    out.push({ fill, edge, z: t });
  }
  const sample = (u: number, v: number) => {
    const c = clamp((u + 0.5) * (C - 1), 0, C - 1.001);
    const r = clamp((v + 0.5) * (R - 1), 0, R - 1.001);
    const c0 = Math.floor(c);
    const r0 = Math.floor(r);
    const fc = c - c0;
    const fr = r - r0;
    return at(r0, c0) * (1 - fc) * (1 - fr) + at(r0, c0 + 1) * fc * (1 - fr) + at(r0 + 1, c0) * (1 - fc) * fr + at(r0 + 1, c0 + 1) * fc * fr;
  };
  return { out, sample, lo, hi, span: Math.min(R, C) - 1 };
}

export async function startOutside() {
  const found = document.getElementById("peak") as HTMLCanvasElement | null;
  if (!found) return;
  const cv = found;
  const ctx = cv.getContext("2d")!;
  const fallback = fetch("/data/timp.json").then((r) => r.json() as Promise<Grid>);
  const rec = await lastOut();
  const frame: Frame = rec ? rec.frame : { ...(await fallback), fade: 0, peak: [0, 0] };
  const segs = rec?.segs ?? [];
  if (rec) {
    document.getElementById("peak-name")!.textContent = rec.title;
    document.getElementById("peak-meta")!.textContent = describe(rec);
    cv.setAttribute("aria-label", `${rec.title} as stacked contour lines, with the route Noah ${VERB[rec.kind].toLowerCase()}`);
  }
  const model = sheets(frame);

  // The summit: the record's named peak, or the highest point of the grid.
  let peak = { u: frame.peak[0], v: frame.peak[1] };
  if (!rec) {
    const i = frame.elev.indexOf(Math.max(...frame.elev));
    peak = { u: (i % frame.cols) / (frame.cols - 1) - 0.5, v: Math.floor(i / frame.cols) / (frame.rows - 1) - 0.5 };
  }
  // A 10 m grid shaves a summit; Timp's surveyed height is 11,749 ft.
  const peakFt = rec ? Math.round((model.lo + model.sample(peak.u, peak.v) * (model.hi - model.lo)) * FT) : 11749;

  // Route points, each filed under the level it stands on so higher sheets cover it.
  const route = segs.map((s) => ({
    lift: s.lift,
    pts: s.uv.map(([u, v]) => ({ u, v, z: model.sample(u, v) })),
  }));

  let yaw = -Math.PI / 2 + 0.3;
  let spin = calm || still ? 0 : 0.00006;
  let vel = 0;
  let rise = calm || still ? 1 : 0;
  let lifting = calm || still;
  let asked = false;
  /** Where the summit is on the page right now. */
  const summit = { x: 0, y: 0 };
  let seen = false;
  let dirty = true;
  let dragging = false;
  let W = 0;
  let H = 0;
  let dpr = 1;

  const size = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    W = cv.clientWidth;
    H = cv.clientHeight;
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    dirty = true;
  };
  size();
  new ResizeObserver(size).observe(cv);

  const css = getComputedStyle(document.documentElement);
  const tone = (name: string) => css.getPropertyValue(name).trim();
  let paper = tone("--paper");
  let ink = tone("--ink");
  let guide = tone("--guide");
  let markC = tone("--mark");
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    paper = tone("--paper");
    ink = tone("--ink");
    guide = tone("--guide");
    markC = tone("--mark");
    dirty = true;
  });

  function draw() {
    const tilt = 0.46;
    const D = Math.min(W * 0.94, H * 1.19) * dpr; // the model's width on screen
    const s = D / model.span;
    const lift = D * 0.33 * ease(rise);
    const cx = (W / 2) * dpr;
    const cy = H * 0.97 * dpr - (tilt * D) / 2;
    const cos = Math.cos(yaw);
    const sin = Math.sin(yaw);
    const project = (u: number, v: number, z: number) => {
      const x = u * model.span;
      const y = v * model.span;
      return [cx + s * (x * cos - y * sin), cy + s * tilt * (x * sin + y * cos) - z * lift];
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    model.out.forEach((sheet, l) => {
      const oy = cy - sheet.z * lift;
      const m = new DOMMatrix([s * cos, s * tilt * sin, -s * sin, s * tilt * cos, cx, oy]);
      const fill = new Path2D();
      fill.addPath(sheet.fill, m);
      const edge = new Path2D();
      edge.addPath(sheet.edge, m);
      // every sheet is cut round: a circle on the ground is an ellipse from here
      const rim = new Path2D();
      rim.ellipse(cx, oy, D / 2, (tilt * D) / 2, 0, 0, Math.PI * 2);
      const index = l % 5 === 0;
      ctx.strokeStyle = ink;
      ctx.lineWidth = dpr * (index ? 1.5 : 0.9);
      ctx.globalAlpha = 1;
      ctx.save();
      ctx.clip(rim);
      ctx.fillStyle = paper;
      ctx.fill(fill);
      ctx.globalAlpha = index ? 1 : 0.72;
      ctx.stroke(edge);
      ctx.restore();
      // the cut edge of this sheet, where the ground reaches the rim
      ctx.save();
      ctx.clip(fill);
      ctx.globalAlpha = index ? 1 : 0.72;
      ctx.stroke(rim);
      ctx.restore();
      ctx.globalAlpha = 1;
      // the route's pieces that stand on this sheet
      for (const seg of route) {
        ctx.strokeStyle = seg.lift ? guide : markC;
        ctx.lineWidth = dpr * (seg.lift ? 1 : 2);
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i + 1 < seg.pts.length; i++) {
          const a = seg.pts[i];
          const b = seg.pts[i + 1];
          if (Math.hypot(a.u, a.v) > 0.5 || Math.min(LEVELS - 1, Math.floor(Math.max(a.z, b.z) * LEVELS)) !== l) {
            pen = false;
            continue;
          }
          const p = project(a.u, a.v, a.z + 0.004);
          const q2 = project(b.u, b.v, b.z + 0.004);
          if (!pen) ctx.moveTo(p[0], p[1]);
          ctx.lineTo(q2[0], q2[1]);
          pen = true;
        }
        ctx.stroke();
      }
    });
    // the summit, measured
    const top = project(peak.u, peak.v, model.sample(peak.u, peak.v));
    const box = cv.getBoundingClientRect();
    summit.x = box.left + scrollX + top[0] / dpr;
    summit.y = box.top + scrollY + top[1] / dpr;
    const up = 56 * dpr * ease(rise);
    const label = `${peakFt.toLocaleString("en-US")} ft`;
    ctx.globalAlpha = ease(rise);
    ctx.strokeStyle = guide;
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(top[0], top[1] - up);
    ctx.stroke();
    ctx.font = `500 ${11 * dpr}px Martian, monospace`;
    ctx.textBaseline = "middle";
    ctx.lineWidth = 5 * dpr;
    ctx.strokeStyle = paper;
    ctx.strokeText(label, top[0] + 7 * dpr, top[1] - up);
    ctx.fillStyle = guide;
    ctx.fillText(label, top[0] + 7 * dpr, top[1] - up);
    ctx.globalAlpha = 1;
  }

  const ease = (t: number) => 1 - (1 - t) ** 3;

  new IntersectionObserver(
    (e) => {
      seen = e.some((x) => x.isIntersecting);
    },
    { threshold: 0.4 },
  ).observe(cv);

  // The stack starts flat. An agent takes it by the summit and lifts it; with
  // nobody free it rises on its own.
  const lift = () => {
    if (asked) return;
    asked = true;
    if (!free()) return void (lifting = true);
    post({
      key: "lift",
      at: () => summit,
      async run(a, signal) {
        try {
          await a.moveTo(() => summit, { signal, tempo: 0.8 });
          await a.press(signal, 80);
          lifting = true;
          await run(1450, () => a.set(summit.x, summit.y), signal);
        } finally {
          lifting = true;
          a.lift();
        }
      },
    });
    setTimeout(() => (lifting = true), 1600);
  };

  onTick((dt) => {
    if (!seen) return;
    if (!asked) {
      draw();
      lift();
    }
    if (rise < 1 && lifting) {
      rise = Math.min(1, rise + dt / 1400);
      dirty = true;
    }
    if (!dragging) {
      if (Math.abs(vel) > 0.00002) {
        yaw += vel * dt;
        vel *= Math.exp(-dt / 320);
        dirty = true;
      } else if (spin) {
        yaw += spin * dt;
        dirty = true;
      }
    }
    if (dirty) {
      dirty = false;
      draw();
    }
  });

  let lastX = 0;
  let lastT = 0;
  cv.addEventListener("pointerdown", (e) => {
    dragging = true;
    spin = 0;
    vel = 0;
    lastX = e.clientX;
    lastT = e.timeStamp;
    cv.setPointerCapture(e.pointerId);
  });
  cv.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dt = Math.max(1, e.timeStamp - lastT);
    yaw -= (dx / Math.max(320, W)) * 3.2;
    vel = clamp((-(dx / Math.max(320, W)) * 3.2) / dt, -0.012, 0.012);
    lastX = e.clientX;
    lastT = e.timeStamp;
    dirty = true;
  });
  const end = () => {
    dragging = false;
    if (calm) vel = 0;
  };
  cv.addEventListener("pointerup", end);
  cv.addEventListener("pointercancel", end);
}
