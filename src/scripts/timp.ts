// The mountain Noah was last out on (hike, ride, ski day), drawn as stacked
// ridgelines from USGS elevation with the route on it; Mount Timpanogos when
// there's nothing recent. worker/last-out.js prepares the record. Drag to
// turn it. Colors come from the sky palette (public/sky.js), read from CSS
// each frame so they follow its transitions.

type Sky = {
  offsetMinutes: number;
  at(): Date;
  apply(): void;
};
declare global {
  interface Window {
    sky: Sky;
  }
}

type Grid = { rows: number; cols: number; elev: number[] };
type Frame = Grid & { fade: number; spin: boolean; peak: [number, number] };
type Backdrop = Grid & { center: [number, number]; scale: number };
type Seg = { lift: boolean; uv: [number, number][] };
type Stats = { duration_s: number; distance_m: number; ascent_m: number; descent_m: number; runs: number | null };
type Record = {
  v: 1; title: string; kind: "hike" | "run" | "ride" | "ski"; end: string; staleAfter: string;
  stats: Stats; frame: Frame; backdrop: Backdrop | null; segs: Seg[];
};
type Scene = { frame: Frame; backdrop: Backdrop | null; segs: Seg[] };

const canvas = document.querySelector<HTMLCanvasElement>("#timp");
if (canvas) start(canvas);

async function lastOut(): Promise<Record | null> {
  try {
    const res = await fetch("/api/last-out", { signal: AbortSignal.timeout(1200) });
    if (res.status !== 200) return null;
    const r = (await res.json()) as Record;
    return r.v === 1 && Date.parse(r.staleAfter) > Date.now() ? r : null;
  } catch {
    return null;
  }
}

async function timp(): Promise<Scene> {
  const T: Grid = await (await fetch("/data/timp.json")).json();
  return { frame: { ...T, fade: 0.3, spin: true, peak: [0, 0] }, backdrop: null, segs: [] };
}

const FT = 3.28084, MI = 0.621371;
const VERB = { hike: "hiked", run: "ran", ride: "rode", ski: "skied" };

function when(iso: string) {
  const zone = { timeZone: "America/Denver" } as const;
  const day = (d: Date) => d.toLocaleDateString("en-CA", zone);
  const d = new Date(iso), ago = (Date.parse(day(new Date())) - Date.parse(day(d))) / 864e5;
  if (ago < 1) return "today";
  if (ago < 2) return "yesterday";
  if (ago < 7) return d.toLocaleDateString("en-US", { ...zone, weekday: "long" });
  return d.toLocaleDateString("en-US", { ...zone, month: "short", day: "numeric" });
}

function describe(r: Record) {
  const s = r.stats, n = (x: number) => Math.round(x).toLocaleString("en-US");
  const h = Math.floor(s.duration_s / 3600), m = Math.round((s.duration_s % 3600) / 60);
  const parts = [`${VERB[r.kind]} ${when(r.end)}`];
  if (r.kind === "ski") {
    if (s.runs) parts.push(`${s.runs} ${s.runs === 1 ? "run" : "runs"}`);
    parts.push(`${n(s.descent_m * FT)} ft down`);
  } else {
    parts.push(`${(s.distance_m / 1000 * MI).toFixed(1)} mi`, `${n(s.ascent_m * FT)} ft up`);
  }
  parts.push(h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m} min`);
  return parts.join(" · ");
}

async function start(cv: HTMLCanvasElement) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const fallback = timp(); // in parallel, so a slow API never delays Timp
  const record = await lastOut();
  const scene: Scene = record ?? (await fallback);
  if (record) {
    const title = document.querySelector(".caption-title"), meta = document.querySelector(".caption-meta");
    if (title) title.textContent = record.title;
    if (meta) meta.textContent = describe(record);
    cv.setAttribute("aria-label", `${record.title}, with the route Noah ${VERB[record.kind]}, drawn from USGS elevation data`);
  }
  const F = scene.frame, B = scene.backdrop;

  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const sampler = (G: Grid) => (x: number, y: number) => {
    const C = G.cols, R = G.rows, E = G.elev;
    x = Math.max(0, Math.min(C - 1.001, x)); y = Math.max(0, Math.min(R - 1.001, y));
    const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, i = y0 * C + x0;
    return E[i] * (1 - fx) * (1 - fy) + E[i + 1] * fx * (1 - fy) + E[i + C] * (1 - fx) * fy + E[i + C + 1] * fx * fy;
  };
  // Normalize on the round footprint that's drawn, not the square grid.
  const range = (G: Grid, rMax: number) => {
    let lo = Infinity, hi = -Infinity;
    for (let r = 0; r < G.rows; r++) for (let c = 0; c < G.cols; c++) {
      if (Math.hypot(c / (G.cols - 1) - 0.5, r / (G.rows - 1) - 0.5) > rMax) continue;
      const v = G.elev[r * G.cols + c]; lo = Math.min(lo, v); hi = Math.max(hi, v);
    }
    return [lo, hi];
  };
  // Height in 0..1 inside a round footprint; -1 outside it, so the mountain floats.
  const fs = sampler(F), [lo, hi] = range(F, record ? 0.47 : 1); // default Timp: unchanged
  const height = (u: number, v: number) => {
    const r = Math.hypot(u, v);
    if (r > 0.5) return -1;
    const e = fs((u + 0.5) * (F.cols - 1), (v + 0.5) * (F.rows - 1));
    return Math.max(0, (e - lo) / (hi - lo)) * (1 - smooth(F.fade, 0.5, r));
  };
  // The named peak behind a zoomed-in frame: a fainter, sparser layer.
  let backHeight: ((u: number, v: number) => number) | null = null, bNear = 0, bFar = 0;
  if (B) {
    const bs = sampler(B), [blo, bhi] = range(B, 0.5);
    backHeight = (u, v) => {
      if (height(u, v) >= 0) return -1;
      const lu = (u - B.center[0]) / B.scale, lv = (v - B.center[1]) / B.scale, r = Math.hypot(lu, lv);
      if (r > 0.5) return -1;
      const e = bs((lu + 0.5) * (B.cols - 1), (lv + 0.5) * (B.rows - 1));
      return Math.max(0, (e - blo) / (bhi - blo)) * (1 - smooth(0.3, 0.5, r));
    };
    const dist = Math.hypot(B.center[0], B.center[1]);
    bNear = Math.max(0.55, dist - B.scale * 0.5); bFar = dist + B.scale * 0.5;
  }

  const ctx = cv.getContext("2d")!;
  let W = 0, H = 0;
  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), box = cv.getBoundingClientRect();
    W = box.width; H = box.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  new ResizeObserver(resize).observe(cv);
  resize();

  const rootStyle = getComputedStyle(document.documentElement);
  const color = (name: string) => rootStyle.getPropertyValue(name).trim() || "rgb(18 28 44)";
  const withAlpha = (c: string, a: number) => c.replace(/^rgba?\(([^)]+)\)$/, (_m, body: string) => `rgb(${body.replace(/,/g, " ").replace(/\s*\/.*$/, "")} / ${a})`);

  // Aim from the route toward the peak, so the route faces the viewer.
  let cu = 0, cv2 = 0, cn = 0;
  for (const s of scene.segs) for (const [u, v] of s.uv) if (Math.hypot(u, v) < 0.5) { cu += u; cv2 += v; cn++; }
  const baseYaw = cn ? Math.atan2(F.peak[0] - cu / cn, -(F.peak[1] - cv2 / cn)) : -0.55;
  const spin = F.spin;

  // Turning: drag with inertia. Spinning frames drift; the rest sway and
  // spring back so the peak stays behind.
  let off = 0, vel = 0, dragX: number | null = null, lastT = 0;
  cv.addEventListener("pointerdown", (e) => { dragX = e.clientX; lastT = performance.now(); cv.setPointerCapture(e.pointerId); cv.classList.add("is-dragging"); });
  cv.addEventListener("pointermove", (e) => {
    if (dragX === null) return;
    const now = performance.now(), dx = (e.clientX - dragX) * 0.006;
    off += dx; vel = (dx / Math.max(1, now - lastT)) * 16;
    dragX = e.clientX; lastT = now;
    if (!spin) off = Math.max(-0.75, Math.min(0.75, off));
  });
  const release = () => { dragX = null; cv.classList.remove("is-dragging"); };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", release);

  // Route pieces short enough to sit between two slices; lifts are straight cables.
  type Piece = { u0: number; v0: number; h0: number; u1: number; v1: number; h1: number; lift: boolean; n: number };
  const pieces: Piece[] = [];
  const STEP = 0.004;
  for (const seg of scene.segs) {
    const P = seg.uv;
    if (seg.lift) {
      const a = P[0], b = P[P.length - 1], ha = height(a[0], a[1]), hb = height(b[0], b[1]);
      if (ha < 0 || hb < 0) continue;
      const n = Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP) + 1, sag = (t: number) => 0.02 - 0.035 * t * (1 - t);
      for (let i = 0; i < n; i++) {
        const t0 = i / n, t1 = (i + 1) / n;
        pieces.push({ u0: a[0] + (b[0] - a[0]) * t0, v0: a[1] + (b[1] - a[1]) * t0, h0: ha + (hb - ha) * t0 + sag(t0),
          u1: a[0] + (b[0] - a[0]) * t1, v1: a[1] + (b[1] - a[1]) * t1, h1: ha + (hb - ha) * t1 + sag(t1), lift: true, n: pieces.length });
      }
      continue;
    }
    for (let i = 0; i + 1 < P.length; i++) {
      const a = P[i], b = P[i + 1], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / STEP));
      for (let j = 0; j < n; j++) {
        const u0 = a[0] + (b[0] - a[0]) * (j / n), v0 = a[1] + (b[1] - a[1]) * (j / n);
        const u1 = a[0] + (b[0] - a[0]) * ((j + 1) / n), v1 = a[1] + (b[1] - a[1]) * ((j + 1) / n);
        const h0 = height(u0, v0), h1 = height(u1, v1);
        if (h0 >= 0 && h1 >= 0) pieces.push({ u0, v0, h0: h0 + 0.006, u1, v1, h1: h1 + 0.006, lift: false, n: pieces.length });
      }
    }
  }

  const SLICES = 60, SAMPLES = 130, BSLICES = 26, t0 = performance.now() + (reduce ? -1e4 : 450);
  const frame = (now: number) => {
    if (dragX === null) {
      vel *= 0.95; off += vel;
      if (spin) { if (!reduce && Math.abs(vel) < 5e-4) off += 8e-4; }
      else { off += (Math.max(-0.6, Math.min(0.6, off)) - off) * 0.2; off *= 0.985; if (!reduce) off += Math.sin(now / 4200) * 0.0006; }
    }
    const grow = Math.min(1, Math.max(0, (now - t0) / 1500));
    const reveal = reduce ? 1 : Math.min(1, Math.max(0, (now - t0 - 1500) / 2600));
    const bg = color("--bg"), ink = color("--ink"), accent = color("--accent");
    ctx.clearRect(0, 0, W, H);

    const span = Math.min(W * 0.92, H * 1.45) * (B ? 0.86 : 1);
    const depth = span * 0.34, lift = span * 0.36;
    const ox = W / 2, oy = H - depth * 0.62 - 4;
    const yaw = baseYaw + off, cs = Math.cos(yaw), sn = Math.sin(yaw);
    const persp = (d: number) => 1 / (1 - d * 0.28);

    // One ridgeline: fill below it with the sky so it hides what's behind, then stroke it.
    const ridge = (h: (u: number, v: number) => number, d: number, baseY: number, p: number, sMax: number, yLift: number, alpha: number, width: number) => {
      const runs: [number, number][][] = [];
      let run: [number, number][] = [];
      for (let j = 0; j <= SAMPLES; j++) {
        const s = -sMax + (j / SAMPLES) * 2 * sMax;
        const y = h(s * cs - d * sn, s * sn + d * cs);
        if (y < 0) { if (run.length) runs.push(run); run = []; continue; }
        run.push([ox + s * span * p, baseY - y * yLift]);
      }
      if (run.length) runs.push(run);
      ctx.fillStyle = bg;
      for (const r of runs) {
        ctx.beginPath(); ctx.moveTo(r[0][0], baseY + 2);
        for (const [x, y] of r) ctx.lineTo(x, y);
        ctx.lineTo(r[r.length - 1][0], baseY + 2); ctx.closePath(); ctx.fill();
      }
      ctx.beginPath();
      for (const r of runs) { ctx.moveTo(r[0][0], r[0][1]); for (const [x, y] of r) ctx.lineTo(x, y); }
      ctx.strokeStyle = withAlpha(ink, alpha);
      ctx.lineWidth = width;
      ctx.stroke();
    };

    if (backHeight) {
      const horizon = oy - 0.52 * depth * persp(-0.52);
      const wave = Math.min(1, Math.max(0, grow * 1.4 - 0.2)), ease = 1 - Math.pow(1 - wave, 3);
      for (let k = 0; k < BSLICES; k++) {
        const t = k / (BSLICES - 1), d = -bFar + t * (bFar - bNear), p = 0.62 + 0.16 * t;
        ridge(backHeight, d, horizon - (1 - t) * depth * 0.22, p, Math.min(0.5 * B!.scale + 0.2, (W * 0.47) / (span * p)),
          ease * lift * 1.7 * p, 0.14 + 0.24 * t, 0.7);
      }
    }

    // Each route piece is drawn right after the slice just in front of it.
    const buckets = new Map<number, Piece[]>();
    for (const q of pieces) {
      if (q.n > reveal * pieces.length) break;
      const d = Math.max(-q.u0 * sn + q.v0 * cs, -q.u1 * sn + q.v1 * cs);
      const k = Math.min(SLICES - 1, Math.max(0, Math.ceil(((d + 0.52) / 1.04) * (SLICES - 1))));
      const b = buckets.get(k);
      if (b) b.push(q); else buckets.set(k, [q]);
    }
    const proj = (u: number, v: number, h: number) => {
      const s = u * cs + v * sn, d = -u * sn + v * cs, p = persp(d);
      return [ox + s * span * p, oy + d * depth * p - h * lift * p];
    };

    for (let k = 0; k < SLICES; k++) {
      const d = -0.52 + (k / (SLICES - 1)) * 1.04;
      const wave = Math.min(1, Math.max(0, grow * 1.7 - (1 - k / SLICES) * 0.7));
      const ease = 1 - Math.pow(1 - wave, 3);
      const p = persp(d), kk = k / SLICES;
      ridge(height, d, oy + d * depth * p, p, 0.55, ease * lift * p, 0.22 + 0.78 * kk, 0.6 + 0.9 * kk);

      const bucket = grow >= 1 && buckets.get(k);
      if (!bucket) continue;
      ctx.lineCap = "round";
      for (const cable of [true, false]) {
        ctx.beginPath();
        for (const q of bucket) {
          if (q.lift !== cable) continue;
          const [ax, ay] = proj(q.u0, q.v0, q.h0), [bx, by] = proj(q.u1, q.v1, q.h1);
          ctx.moveTo(ax, ay); ctx.lineTo(bx, by);
        }
        ctx.strokeStyle = cable ? withAlpha(accent, 0.5) : accent;
        ctx.lineWidth = cable ? 0.9 : 1.9 + 0.8 * kk;
        ctx.stroke();
      }
    }

    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);

  // Clock and day scrubber.
  const clock = document.querySelector<HTMLElement>("#clock");
  const bar = document.querySelector<HTMLElement>("#daybar");
  const sun = bar?.querySelector<HTMLElement>(".sun");
  const provoMinutes = (d: Date) => {
    const [h, m] = d.toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", timeZone: "America/Denver" }).split(":").map(Number);
    return (h % 24) * 60 + m;
  };
  const render = () => {
    const d = window.sky.at(), mins = provoMinutes(d);
    if (clock) clock.textContent = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/Denver" });
    if (sun) sun.style.left = `${(mins / 1440) * 100}%`;
    bar?.setAttribute("aria-valuenow", String(mins));
    bar?.setAttribute("aria-valuetext", clock?.textContent ?? "");
  };
  const setMinutes = (target: number) => {
    const now = provoMinutes(new Date());
    window.sky.offsetMinutes = ((target % 1440) + 1440) % 1440 - now;
    window.sky.apply(); render();
  };
  document.addEventListener("skychange", render);
  render();
  if (bar) {
    let scrubbing = false;
    const scrub = (e: PointerEvent) => {
      const r = bar.getBoundingClientRect();
      setMinutes(Math.round((Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)) * 1440) / 5) * 5);
    };
    bar.addEventListener("pointerdown", (e) => { scrubbing = true; bar.setPointerCapture(e.pointerId); scrub(e); });
    bar.addEventListener("pointermove", (e) => { if (scrubbing) scrub(e); });
    bar.addEventListener("pointerup", () => { scrubbing = false; });
    bar.addEventListener("dblclick", () => { window.sky.offsetMinutes = 0; window.sky.apply(); render(); });
    bar.addEventListener("keydown", (e) => {
      const cur = provoMinutes(window.sky.at());
      if (e.key === "ArrowRight" || e.key === "ArrowUp") setMinutes(cur + 15);
      else if (e.key === "ArrowLeft" || e.key === "ArrowDown") setMinutes(cur - 15);
      else if (e.key === "Home" || e.key === "Escape") { window.sky.offsetMinutes = 0; window.sky.apply(); render(); }
      else return;
      e.preventDefault();
    });
  }
}

export {};
