// One frame loop, promise tweens that can be stopped, and the page-space helpers
// everything on the board shares. Coordinates are document pixels throughout.

export type Pt = { x: number; y: number };

/** Thrown through an await when a job is called off (someone grabbed the letter). */
export class Stop extends Error {}

type Tick = (dt: number, now: number) => void;
const ticks = new Set<Tick>();
let raf = 0;
let last = 0;

function frame(now: number) {
  const dt = Math.min(48, now - last);
  last = now;
  for (const f of [...ticks]) f(dt, now);
  raf = ticks.size ? requestAnimationFrame(frame) : 0;
}

export function onTick(f: Tick): () => void {
  ticks.add(f);
  if (!raf) {
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  return () => void ticks.delete(f);
}

/** Calls step(0..1) every frame for ms; rejects with Stop if the signal fires. */
export function run(ms: number, step: (t: number) => void, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    let elapsed = 0;
    const off = onTick((dt) => {
      if (signal?.aborted) {
        off();
        reject(new Stop());
        return;
      }
      elapsed += dt;
      const t = ms <= 0 ? 1 : Math.min(1, elapsed / ms);
      step(t);
      if (t >= 1) {
        off();
        resolve();
      }
    });
  });
}

export const wait = (ms: number, signal?: AbortSignal) => run(ms, () => {}, signal);

export const ease = {
  out: (t: number) => 1 - (1 - t) ** 3,
  out5: (t: number) => 1 - (1 - t) ** 5,
  // minimum jerk: how a hand actually moves between two points
  hand: (t: number) => t * t * t * (10 + t * (6 * t - 15)),
};

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

export function pageRect(el: Element) {
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
}

export function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text != null) node.textContent = text;
  return node;
}

export const calm = matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Provo's wall clock, the only one the page keeps. */
export const provoTime = (d = new Date()) =>
  d.toLocaleTimeString("en-US", { hour12: false, timeZone: "America/Denver" });
