// Mount Timpanogos as stacked ridgelines, drawn from USGS elevation.
// Drag to turn it; it drifts slowly when left alone. Colors come from the
// sky palette (public/sky.js), read from CSS each frame so they follow its
// transitions.

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

const canvas = document.querySelector<HTMLCanvasElement>("#timp");
if (canvas) start(canvas);

async function start(cv: HTMLCanvasElement) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const T: { rows: number; cols: number; elev: number[] } = await (await fetch("/data/timp.json")).json();
  const { rows: R, cols: C, elev: E } = T;
  let lo = Infinity, hi = -Infinity;
  for (const v of E) { lo = Math.min(lo, v); hi = Math.max(hi, v); }

  const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  // Height in 0..1 inside a round footprint; -1 outside it, so the mountain floats.
  const height = (u: number, v: number) => {
    const r = Math.hypot(u, v);
    if (r > 0.5) return -1;
    const x = (u + 0.5) * (C - 1), y = (v + 0.5) * (R - 1);
    const x0 = Math.max(0, Math.min(C - 2, Math.floor(x))), y0 = Math.max(0, Math.min(R - 2, Math.floor(y)));
    const fx = x - x0, fy = y - y0, i = y0 * C + x0;
    const e = E[i] * (1 - fx) * (1 - fy) + E[i + 1] * fx * (1 - fy) + E[i + C] * (1 - fx) * fy + E[i + C + 1] * fx * fy;
    return ((e - lo) / (hi - lo)) * (1 - smooth(0.3, 0.5, r));
  };

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

  // Turning: drag with inertia; slow drift when idle.
  let yaw = -0.55, vel = 0, dragX: number | null = null, lastT = 0;
  cv.addEventListener("pointerdown", (e) => { dragX = e.clientX; lastT = performance.now(); cv.setPointerCapture(e.pointerId); cv.classList.add("is-dragging"); });
  cv.addEventListener("pointermove", (e) => {
    if (dragX === null) return;
    const now = performance.now(), dx = e.clientX - dragX;
    yaw += dx * 0.006; vel = ((dx * 0.006) / Math.max(1, now - lastT)) * 16;
    dragX = e.clientX; lastT = now;
  });
  const release = () => { dragX = null; cv.classList.remove("is-dragging"); };
  cv.addEventListener("pointerup", release);
  cv.addEventListener("pointercancel", release);

  const SLICES = 60, SAMPLES = 130, t0 = performance.now() + (reduce ? -1e4 : 450);
  const frame = (now: number) => {
    if (dragX === null) { vel *= 0.95; yaw += vel + (reduce || Math.abs(vel) > 5e-4 ? 0 : 8e-4); }
    const grow = Math.min(1, Math.max(0, (now - t0) / 1500));
    const bg = color("--bg"), ink = color("--ink");
    ctx.clearRect(0, 0, W, H);

    const span = Math.min(W * 0.92, H * 1.45);
    const depth = span * 0.34, lift = span * 0.36;
    const ox = W / 2, oy = H - depth * 0.62 - 4;
    const cs = Math.cos(yaw), sn = Math.sin(yaw);

    for (let k = 0; k < SLICES; k++) {
      const d = -0.52 + (k / (SLICES - 1)) * 1.04; // far to near
      const wave = Math.min(1, Math.max(0, grow * 1.7 - (1 - k / SLICES) * 0.7));
      const ease = 1 - Math.pow(1 - wave, 3);
      const persp = 1 / (1 - d * 0.28);
      const baseY = oy + d * depth * persp;
      const runs: [number, number][][] = [];
      let run: [number, number][] = [];
      for (let j = 0; j <= SAMPLES; j++) {
        const s = -0.55 + (j / SAMPLES) * 1.1;
        const h = height(s * cs - d * sn, s * sn + d * cs);
        if (h < 0) { if (run.length) runs.push(run); run = []; continue; }
        run.push([ox + s * span * persp, baseY - h * ease * lift * persp]);
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
      ctx.strokeStyle = withAlpha(ink, 0.22 + 0.78 * (k / SLICES));
      ctx.lineWidth = 0.6 + 0.9 * (k / SLICES);
      ctx.stroke();
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
