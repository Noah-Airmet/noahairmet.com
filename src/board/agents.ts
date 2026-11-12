// The agents that keep the page. Each is a cursor with a name; work is posted
// as jobs and the nearest free agent takes it. A job is an async script written
// against the agent (move, press, carry), and can be called off at any await.
import { Stop, clamp, ease, el, onTick, run, wait, type Pt } from "./kit";
import { layer } from "./layer";

const ARROW = "M1.5 1.2v15.3l4.2-3.9 2.9 6.6 2.6-1.2-2.9-6.4h5.9z";

export class Agent {
  x = -80;
  y = -80;
  busy = false;
  seen = false;
  readonly el: HTMLElement;
  private moving?: AbortController;
  /** Where it waits when there is nothing to do. */
  post: () => Pt = () => ({ x: this.x, y: this.y });

  constructor(
    readonly name: string,
    tone: string,
  ) {
    this.el = el("div", "ag");
    this.el.style.setProperty("--c", `var(--${tone})`);
    this.el.innerHTML = `<svg viewBox="0 0 16 20" width="16" height="20"><path d="${ARROW}"/></svg>`;
    this.el.append(el("span", "ag-tag", name));
    layer.append(this.el);
  }

  set(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  }

  show() {
    this.seen = true;
    this.el.classList.add("on");
  }

  /** Glide to a point, or chase one that moves. The path bows like a wrist's. */
  moveTo(to: Pt | (() => Pt), o: { ms?: number; tempo?: number; bow?: number; signal?: AbortSignal } = {}) {
    const from = { x: this.x, y: this.y };
    const first = typeof to === "function" ? to() : to;
    const dist = Math.hypot(first.x - from.x, first.y - from.y);
    const ms = o.ms ?? (120 + 15 * Math.sqrt(dist)) * (o.tempo ?? 1);
    const bow = (o.bow ?? (Math.random() < 0.5 ? -0.12 : 0.12)) * dist;
    // One hand, one motion: a new move takes over from the last.
    this.moving?.abort();
    const mine = (this.moving = new AbortController());
    const signal = o.signal ? AbortSignal.any([o.signal, mine.signal]) : mine.signal;
    return run(
      ms,
      (t) => {
        const s = ease.hand(t);
        const end = typeof to === "function" ? to() : to;
        const dx = end.x - from.x;
        const dy = end.y - from.y;
        const len = Math.hypot(dx, dy) || 1;
        const cx = (from.x + end.x) / 2 + (-dy / len) * bow;
        const cy = (from.y + end.y) / 2 + (dx / len) * bow;
        const u = 1 - s;
        this.set(u * u * from.x + 2 * u * s * cx + s * s * end.x, u * u * from.y + 2 * u * s * cy + s * s * end.y);
      },
      signal,
    );
  }

  async press(signal?: AbortSignal, ms = 70) {
    this.el.classList.add("down");
    await wait(ms, signal);
  }

  lift() {
    this.el.classList.remove("down");
  }

  /** Press and let go, with the ring a click leaves. */
  async click(signal?: AbortSignal) {
    const ring = el("i", "ag-ring");
    ring.style.transform = `translate(${this.x}px, ${this.y}px)`;
    ring.style.setProperty("--c", this.el.style.getPropertyValue("--c"));
    layer.append(ring);
    setTimeout(() => ring.remove(), 500);
    await this.press(signal, 90);
    this.lift();
  }
}

export interface Job {
  key: string;
  /** Lower goes first; ties go to whoever is nearest. */
  rank?: number;
  at: () => Pt;
  run(agent: Agent, signal: AbortSignal): Promise<void>;
}

interface Live extends Job {
  ctl?: AbortController;
  by?: Agent;
}

export const agents: Agent[] = [];
const queue: Live[] = [];
let pointer: Pt | null = null;

export function hire(name: string, tone: string) {
  const a = new Agent(name, tone);
  agents.push(a);
  return a;
}

export function post(job: Job) {
  if (queue.some((j) => j.key === job.key)) return;
  queue.push(job);
  dispatch();
}

/** Call a job off, whether it is waiting or under way. */
export function recall(key: string) {
  const i = queue.findIndex((j) => j.key === key);
  if (i < 0) return;
  const job = queue[i];
  if (job.ctl) job.ctl.abort();
  else queue.splice(i, 1);
}

export const working = () => queue.length;

function dispatch() {
  for (const a of agents) {
    if (a.busy) continue;
    let best: Live | undefined;
    let score = Infinity;
    for (const j of queue) {
      if (j.by) continue;
      const p = j.at();
      const s = (j.rank ?? 0) * 1e6 + Math.hypot(p.x - a.x, p.y - a.y);
      if (s < score) {
        score = s;
        best = j;
      }
    }
    if (best) void take(a, best);
  }
}

async function take(a: Agent, job: Live) {
  a.busy = true;
  a.show();
  job.by = a;
  job.ctl = new AbortController();
  try {
    await job.run(a, job.ctl.signal);
  } catch (err) {
    if (!(err instanceof Stop)) console.error(err);
  } finally {
    a.lift();
    const i = queue.indexOf(job);
    if (i >= 0) queue.splice(i, 1);
    a.busy = false;
    dispatch();
    if (!a.busy) void stand(a);
  }
}

/** With nothing to do, an agent drifts back to its post. */
async function stand(a: Agent) {
  try {
    await wait(700 + Math.random() * 600);
    if (a.busy) return;
    const p = a.post();
    if (Math.hypot(p.x - a.x, p.y - a.y) > 4) await a.moveTo(p, { tempo: 1.5 });
  } catch {
    /* called away */
  }
}

/** Idle agents keep clear of the visitor's pointer. */
export function watchPointer() {
  addEventListener("pointermove", (e) => {
    if (e.pointerType === "mouse") pointer = { x: e.pageX, y: e.pageY };
  });
  document.addEventListener("pointerleave", () => (pointer = null));
  const dodging = new WeakSet<Agent>();
  onTick(() => {
    if (!pointer) return;
    for (const a of agents) {
      if (a.busy || !a.seen || dodging.has(a)) continue;
      const dx = a.x - pointer.x;
      const dy = a.y - pointer.y;
      const d = Math.hypot(dx, dy);
      if (d > 64) continue;
      dodging.add(a);
      const k = 110 / (d || 1);
      const to = {
        x: clamp(pointer.x + dx * k + (d ? 0 : 110), 24, document.documentElement.clientWidth - 90),
        y: Math.max(scrollY + 70, pointer.y + dy * k),
      };
      a.moveTo(to, { ms: 260, bow: 0.2 })
        .catch(() => {})
        .finally(() => dodging.delete(a));
    }
  });
}
