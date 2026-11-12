// Utah mountains as stacks of cut contours: each level of the USGS elevation
// grid is one sheet, drawn bottom to top so the high ground hides what is
// behind it, with a real trail traced from trailhead to summit. The figure
// turns through a few peaks on its own; when Ledger has uploaded a recent
// day out (/api/last-out), that mountain and that route come first.
import { free, post, recall, type Agent } from "./agents";
import { calm, clamp, onTick, run, still } from "./kit";

type Grid = { rows: number; cols: number; elev: number[] };
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
  frame: Grid & { peak: [number, number] };
  segs: Seg[];
}
interface Peak extends Grid {
  key: string;
  name: string;
  elevation_ft: number;
  trail: string;
  trail_mi: number;
  peak: [number, number];
  route: [number, number][];
}
interface Entry {
  key: string;
  name: string;
}
/** One thing the figure can show. */
interface Scene {
  name: string;
  meta: string;
  label: string;
  model: ReturnType<typeof sheets>;
  peak: { u: number; v: number };
  route: { lift: boolean; pts: { u: number; v: number; z: number }[] }[];
  /** Route length in points, for tracing it from the start. */
  steps: number;
}

const LEVELS = 34;
const FT = 3.28084;
const MI = 0.621371;
const VERB = { hike: "Hiked", run: "Ran", ride: "Rode", ski: "Skied" };
/** How long a mountain stays up before the next. */
const TURN = 16000;

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
      let strip = -1;
      for (let c = 0; c < C; c++) {
        const v = c < C - 1 ? [at(r, c), at(r, c + 1), at(r + 1, c + 1), at(r + 1, c)] : [-1, -1, -1, -1];
        const inside = v.map((x) => x >= t);
        const n = +inside[0] + +inside[1] + +inside[2] + +inside[3];
        const x = c - (C - 1) / 2;
        // whole cells go down as one strip per run
        if (n === 4) {
          if (strip < 0) strip = c;
          continue;
        }
        if (strip >= 0) {
          fill.rect(strip - (C - 1) / 2 - 0.02, y - 0.02, c - strip + 0.04, 1.04);
          strip = -1;
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

function sceneOf(g: Grid, name: string, meta: string, peak: [number, number], label: string | null, segs: Seg[]): Scene {
  const model = sheets(g);
  const route = segs.map((s) => ({ lift: s.lift, pts: s.uv.map(([u, v]) => ({ u, v, z: model.sample(u, v) })) }));
  const feet = Math.round((model.lo + model.sample(peak[0], peak[1]) * (model.hi - model.lo)) * FT);
  return {
    name,
    meta,
    label: label ?? `${feet.toLocaleString("en-US")} ft`,
    model,
    peak: { u: peak[0], v: peak[1] },
    route,
    steps: route.reduce((n, s) => n + s.pts.length, 0),
  };
}

export async function startOutside() {
  const found = document.getElementById("peak") as HTMLCanvasElement | null;
  if (!found) return;
  const cv = found;
  const ctx = cv.getContext("2d")!;
  const nameEl = document.getElementById("peak-name")!;
  const metaEl = document.getElementById("peak-meta")!;
  const tabs = document.getElementById("peaks") as HTMLElement | null;

  // What there is to show: a recent day out first, then the peaks the page lists.
  const rec = await lastOut();
  const index: { peaks: Entry[] } = {
    peaks: [...(tabs?.querySelectorAll<HTMLButtonElement>("button[data-key]") ?? [])].map((b) => ({ key: b.dataset.key!, name: b.dataset.name! })),
  };
  const loaders: (() => Promise<Scene>)[] = [];
  const names: string[] = [];
  if (rec) {
    names.push(rec.title);
    loaders.push(async () => sceneOf(rec.frame, rec.title, describe(rec), rec.frame.peak, null, rec.segs));
  }
  for (const p of index.peaks) {
    names.push(p.name);
    loaders.push(async () => {
      const d = (await (await fetch(`/data/peaks/${p.key}.json`)).json()) as Peak;
      const miles = `${d.trail_mi.toFixed(1)} mi`;
      return sceneOf(d, d.name, `${d.trail}, ${miles}`, d.peak, `${d.elevation_ft.toLocaleString("en-US")} ft`, [{ lift: false, uv: d.route }]);
    });
  }
  if (!loaders.length) return;
  const cache = new Map<number, Promise<Scene>>();
  const load = (i: number) => {
    let s = cache.get(i);
    if (!s) cache.set(i, (s = loaders[i]()));
    return s;
  };

  /** The turn that puts the trail on the near side of its summit. */
  const facing = (sc: Scene) => {
    const pts = sc.route.flatMap((r) => r.pts);
    if (!pts.length) return -Math.PI / 2 + 0.3;
    const cu = pts.reduce((n, q) => n + q.u, 0) / pts.length - sc.peak.u;
    const cv = pts.reduce((n, q) => n + q.v, 0) / pts.length - sc.peak.v;
    return Math.atan2(cu, cv) + 0.3;
  };

  let at = 0;
  let scene = await load(0);
  let yaw = facing(scene);
  let spin = calm || still ? 0 : 0.00006;
  let vel = 0;
  /** 0 flat, 1 standing. */
  let rise = calm || still ? 1 : 0;
  let lifting = calm || still;
  /** How much of the trail has been walked, 0..1. */
  let trace = calm || still ? 1 : 0;
  let asked = calm || still;
  let swapping = false;
  let clock = 0;
  let theirs = false;
  let seen = false;
  let dirty = true;
  let dragging = false;
  let W = 0;
  let H = 0;
  let dpr = 1;
  /** Where the summit, and the walker on the trail, are on the page right now. */
  const summit = { x: 0, y: 0 };
  const walker = { x: 0, y: 0 };

  const caption = () => {
    nameEl.textContent = scene.name;
    metaEl.textContent = scene.meta;
    cv.setAttribute("aria-label", `${scene.name} as stacked contour lines, with the trail drawn on it`);
    tabs?.querySelectorAll("button").forEach((b, i) => b.setAttribute("aria-pressed", String(i === at)));
  };

  if (tabs) {
    if (rec) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = rec.title;
      tabs.prepend(b);
    }
    tabs.querySelectorAll("button").forEach((b, i) =>
      b.addEventListener("click", () => {
        theirs = true;
        tabs.style.setProperty("--t", "0");
        void show(i);
      }),
    );
    tabs.hidden = names.length < 2;
  }
  caption();

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

  const tone = (name: string) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  let paper = tone("--paper");
  let ink = tone("--ink");
  let guide = tone("--guide");
  let markC = tone("--mark");
  document.addEventListener("themechange", () => {
    paper = tone("--paper");
    ink = tone("--ink");
    guide = tone("--guide");
    markC = tone("--mark");
    dirty = true;
  });

  const ease = (t: number) => 1 - (1 - t) ** 3;

  function draw() {
    const { model } = scene;
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
    const box = cv.getBoundingClientRect();
    const toPage = (p: number[], into: { x: number; y: number }) => {
      into.x = box.left + scrollX + p[0] / dpr;
      into.y = box.top + scrollY + p[1] / dpr;
    };
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    const walked = Math.floor(trace * scene.steps);
    let tip: number[] | null = null;
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
      // the trail's pieces that stand on this sheet, as far as it has been walked
      let n = 0;
      for (const seg of scene.route) {
        ctx.strokeStyle = seg.lift ? guide : markC;
        ctx.lineWidth = dpr * (seg.lift ? 1 : 2.2);
        ctx.beginPath();
        let pen = false;
        for (let i = 0; i + 1 < seg.pts.length; i++, n++) {
          if (n >= walked) break;
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
          if (n === walked - 1) tip = q2;
        }
        ctx.stroke();
        n++;
      }
    });
    // whoever is walking the trail is at its tip
    if (tip) {
      toPage(tip, walker);
      if (trace < 1) {
        ctx.fillStyle = markC;
        ctx.beginPath();
        ctx.arc(tip[0], tip[1], 3.2 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (scene.route[0]?.pts[0]) {
      const p0 = scene.route[0].pts[0];
      toPage(project(p0.u, p0.v, p0.z), walker);
    }
    // the summit, measured
    const top = project(scene.peak.u, scene.peak.v, model.sample(scene.peak.u, scene.peak.v));
    toPage(top, summit);
    const up = 56 * dpr * ease(rise);
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
    ctx.strokeText(scene.label, top[0] + 7 * dpr, top[1] - up);
    ctx.fillStyle = guide;
    ctx.fillText(scene.label, top[0] + 7 * dpr, top[1] - up);
    ctx.globalAlpha = 1;
  }

  /** Lay the stack flat, change mountains, stand it up again. */
  async function show(i: number) {
    if (swapping || i === at) return;
    swapping = true;
    recall("lift");
    recall("walk");
    const next = load(i);
    try {
      if (!calm && !still) {
        const from = rise;
        await run(420, (t) => {
          rise = from * (1 - ease(t));
          dirty = true;
        });
      }
      scene = await next;
      at = i;
      yaw = facing(scene);
      vel = 0;
      caption();
      trace = calm || still ? 1 : 0;
      clock = 0;
      if (calm || still) {
        rise = 1;
      } else {
        rise = 0;
        lifting = true;
      }
      dirty = true;
    } finally {
      swapping = false;
    }
    // have the next one ready
    void load((i + 1) % loaders.length);
  }

  // The stack starts flat. An agent takes it by the summit and lifts it, and
  // one walks the trail as it is drawn; with nobody free both happen anyway.
  const lift = () => {
    if (asked) return;
    asked = true;
    if (!free()) return void (lifting = true);
    post({
      key: "lift",
      at: () => summit,
      async run(a: Agent, signal: AbortSignal) {
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
  let walking = false;
  const walk = () => {
    if (walking || !scene.steps || !free()) return;
    walking = true;
    post({
      key: "walk",
      at: () => walker,
      async run(a: Agent, signal: AbortSignal) {
        try {
          await a.moveTo(() => walker, { signal, tempo: 0.7 });
          while (trace < 1 && !signal.aborted) await run(60, () => a.set(walker.x, walker.y), signal);
        } finally {
          walking = false;
        }
      },
    });
  };

  new IntersectionObserver(
    (e) => {
      seen = e.some((x) => x.isIntersecting);
    },
    { threshold: 0.4 },
  ).observe(cv);

  onTick((dt) => {
    if (!seen) return;
    if (!asked) {
      draw();
      lift();
    }
    if (rise < 1 && lifting && !swapping) {
      rise = Math.min(1, rise + dt / 1400);
      dirty = true;
    }
    // once it stands, the trail is walked from the trailhead up
    if (rise >= 0.6 && trace < 1 && !swapping && scene.steps) {
      if (trace === 0) walk();
      trace = Math.min(1, trace + dt / 3600);
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
    // turning to the next mountain, unless the visitor has taken over
    if (loaders.length > 1 && !theirs && !dragging && !swapping && !calm && !still && !document.hidden) {
      clock += dt;
      tabs?.style.setProperty("--t", Math.min(1, clock / TURN).toFixed(4));
      if (clock >= TURN) void show((at + 1) % loaders.length);
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
