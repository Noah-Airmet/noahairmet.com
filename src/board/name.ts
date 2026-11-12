// The name is set in pieces. Each letter is a rigid body the visitor can pull
// off the page and throw; the agents carry it back, hang it straight, and line
// it up on its baseline. The real <h1> text stays underneath for layout,
// search engines and screen readers.
import Matter from "matter-js";
import { post, recall, type Agent } from "./agents";
import { Stop, calm, clamp, ease, el, onTick, pageRect, rand, run, wait, type Pt } from "./kit";
import { chip, hline, vline } from "./layer";
import { flag, record } from "./ledger";

const { Bodies, Body, Composite, Constraint, Engine, Events } = Matter;

type State = "set" | "loose" | "held" | "carried" | "placing" | "askew";

interface Piece {
  id: string;
  ch: string;
  el: HTMLElement;
  /** Ink outline at home, in page pixels. */
  hull: Pt[];
  /** Centre of mass at home. */
  home: Pt;
  /** Baseline and left edge of the ink at home: what the guides show. */
  base: number;
  left: number;
  top: number;
  line: number;
  body: Matter.Body;
  state: State;
  since: number;
  angle: number;
}

const WALL = 1;
const SET = 2;
const LOOSE = 4;

const name = document.getElementById("name") as HTMLElement;
const hero = name.closest("section") as HTMLElement;
const engine = Engine.create({ enableSleeping: false });
const pieces: Piece[] = [];
let holder: HTMLElement;
let size = 100;
let floorY = 0;
let walls: Matter.Body[] = [];
let tempo = 1;
const knocked: Piece[] = [];

// ---------------------------------------------------------------- measuring

const scratch = document.createElement("canvas");
const pen = scratch.getContext("2d", { willReadFrequently: true })!;

/** The ink of one glyph as convex outlines (two for an i: stem and dot),
 *  in pixels from the glyph's origin on the baseline. */
function ink(ch: string, advance: number): Pt[][] {
  const pad = Math.ceil(size * 0.25);
  const base = Math.ceil(size * 1.05);
  scratch.width = Math.ceil(advance + pad * 2);
  scratch.height = Math.ceil(size * 1.4);
  pen.font = `1000 extra-expanded ${size}px Flex`;
  pen.textBaseline = "alphabetic";
  pen.fillStyle = "#000";
  pen.fillText(ch, pad, base);
  const kx = advance / (pen.measureText(ch).width || advance);
  const { data, width, height } = pen.getImageData(0, 0, scratch.width, scratch.height);
  const step = Math.max(1, Math.round(size / 80));
  const groups: Pt[][] = [];
  let cur: Pt[] | null = null;
  let empty = 0;
  for (let y = 0; y < height; y += step) {
    let lo = -1;
    let hi = -1;
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > 110) {
        if (lo < 0) lo = x;
        hi = x;
      }
    }
    if (lo < 0) {
      if (cur && ++empty >= 2) cur = null;
      continue;
    }
    empty = 0;
    if (!cur) groups.push((cur = []));
    cur.push({ x: (lo - pad) * kx, y: y - base }, { x: (hi + 1 - pad) * kx, y: y - base });
  }
  return groups.map((g) => thin(hullOf(g)));
}

function hullOf(pts: Pt[]): Pt[] {
  const p = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Pt, a: Pt, b: Pt) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Pt[] = [];
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], q) <= 0) lower.pop();
    lower.push(q);
  }
  const upper: Pt[] = [];
  for (const q of p.reverse()) {
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], q) <= 0) upper.pop();
    upper.push(q);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

/** Drop corners that barely turn, so a body has a dozen sides instead of sixty. */
function thin(h: Pt[]): Pt[] {
  const min = size * 0.045;
  const out: Pt[] = [];
  for (const q of h) {
    const prev = out[out.length - 1];
    if (!prev || Math.hypot(q.x - prev.x, q.y - prev.y) > min) out.push(q);
  }
  return out.length >= 3 ? out : h;
}

function centre(h: Pt[]): Pt {
  return Matter.Vertices.centre(h as Matter.Vector[]);
}

// ------------------------------------------------------------------ building

/** Size the name so the longer line's ink runs margin to margin, and start
 *  each line's ink exactly on the left margin. Measured, not guessed. */
function fit() {
  const lines = [...name.querySelectorAll<HTMLElement>(".ln")];
  hero.style.removeProperty("--name");
  hero.style.removeProperty("--notch");
  for (const ln of lines) ln.style.marginLeft = "";
  build();
  const cs = getComputedStyle(hero);
  const left = pageRect(hero).x + parseFloat(cs.paddingLeft);
  const width = hero.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const span = (li: number) => {
    const row = pieces.filter((p) => p.line === li).flatMap((p) => p.hull.map((q) => q.x));
    return [Math.min(...row), Math.max(...row)];
  };
  const widest = Math.max(...lines.map((_, li) => span(li)[1] - span(li)[0]));
  const cap = parseFloat(getComputedStyle(name).getPropertyValue("--cap")) || Infinity;
  const next = Math.min((size * width) / widest, (cap * innerHeight) / 100);
  hero.style.setProperty("--name", `${next.toFixed(2)}px`);
  build();
  lines.forEach((ln, li) => {
    ln.style.marginLeft = `${(left - span(li)[0]).toFixed(2)}px`;
  });
  build();
  hero.style.setProperty("--notch", `${(span(0)[1] + size * 0.17).toFixed(1)}px`);
}

function build() {
  for (const p of pieces) {
    Composite.remove(engine.world, p.body);
    flag(p.id, false);
  }
  pieces.length = 0;
  holder?.remove();
  holder = el("span", "pieces");
  holder.setAttribute("aria-hidden", "true");
  name.append(holder);

  size = parseFloat(getComputedStyle(name).fontSize);
  const origin = pageRect(name);
  const range = document.createRange();
  const lines = [...name.querySelectorAll<HTMLElement>(".ln")];

  lines.forEach((ln, li) => {
    const text = ln.firstChild as Text;
    const probe = el("span", "probe");
    ln.append(probe);
    const base = probe.getBoundingClientRect().bottom + scrollY;
    probe.remove();
    for (let i = 0; i < text.length; i++) {
      const ch = text.data[i];
      if (!ch.trim()) continue;
      range.setStart(text, i);
      range.setEnd(text, i + 1);
      const r = range.getBoundingClientRect();
      const slot = { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
      const parts = ink(ch, slot.w);
      parts.forEach((part, pi) => {
        const hull = part.map((q) => ({ x: slot.x + q.x, y: base + q.y }));
        const home = centre(hull);
        const node = el("span", "pc");
        const glyph = el("span", "pc-g", ch);
        node.append(glyph);
        node.style.left = `${slot.x - origin.x}px`;
        node.style.top = `${slot.y - origin.y}px`;
        node.style.width = `${slot.w}px`;
        node.style.height = node.style.lineHeight = `${slot.h}px`;
        node.style.transformOrigin = `${home.x - slot.x}px ${home.y - slot.y}px`;
        if (parts.length > 1) {
          // An i is two pieces of the same glyph: clip one to the dot, one to the stem.
          const ys = parts.map((h) => [Math.min(...h.map((q) => q.y)), Math.max(...h.map((q) => q.y))]);
          const cut = (ys[0][1] + ys[1][0]) / 2 + (base - slot.y);
          glyph.style.clipPath = pi === 0 ? `inset(-50% -50% ${slot.h - cut}px -50%)` : `inset(${cut}px -50% -50% -50%)`;
        }
        holder.append(node);
        const piece: Piece = {
          id: `${ch}${li}${i}${pi}`,
          ch: parts.length > 1 && pi === 0 ? "the dot" : ch,
          el: node,
          hull,
          home,
          base,
          left: Math.min(...hull.map((q) => q.x)),
          top: Math.min(...hull.map((q) => q.y)),
          line: li,
          body: null as unknown as Matter.Body,
          state: "set",
          since: 0,
          angle: 0,
        };
        piece.body = bodyFor(piece, true);
        Composite.add(engine.world, piece.body);
        pieces.push(piece);
      });
    }
  });

  // The floor is the foot of the hero; the walls are the edges of the page.
  for (const w of walls) Composite.remove(engine.world, w);
  const hr = pageRect(hero);
  floorY = hr.y + hr.h - 6;
  const W = document.documentElement.clientWidth;
  const wall = { isStatic: true, collisionFilter: { category: WALL, mask: LOOSE }, friction: 0.9 };
  walls = [
    Bodies.rectangle(W / 2, floorY + 400, W * 3, 800, wall),
    Bodies.rectangle(-400, floorY - 4000, 800, 9000, wall),
    Bodies.rectangle(W + 400, floorY - 4000, 800, 9000, wall),
  ];
  Composite.add(engine.world, walls);
  engine.gravity.scale = 0.0011 * clamp(size / 110, 0.8, 2.6);
}

function bodyFor(p: Piece, fixed: boolean, at: Pt = p.home, angle = 0): Matter.Body {
  const body = Body.create({
    position: { ...p.home },
    vertices: Matter.Vertices.clockwiseSort(p.hull.map((q) => ({ ...q })) as Matter.Vector[]),
    isStatic: fixed,
    restitution: 0.22,
    friction: 0.55,
    frictionAir: 0.012,
    density: 0.002,
    collisionFilter: fixed ? { category: SET, mask: LOOSE } : { category: LOOSE, mask: WALL | SET | LOOSE },
  });
  Body.setPosition(body, at);
  Body.setAngle(body, angle);
  (body as Matter.Body & { piece?: Piece }).piece = p;
  return body;
}

function swap(p: Piece, fixed: boolean, at?: Pt, angle?: number) {
  const old = p.body;
  const v = { ...old.velocity };
  const w = old.angularVelocity;
  Composite.remove(engine.world, old);
  p.body = bodyFor(p, fixed, at ?? old.position, angle ?? old.angle);
  if (!fixed) {
    Body.setVelocity(p.body, v);
    Body.setAngularVelocity(p.body, w);
  }
  Composite.add(engine.world, p.body);
}

function draw(p: Piece) {
  const b = p.body;
  p.el.style.transform =
    p.state === "set" ? "" : `translate(${(b.position.x - p.home.x).toFixed(2)}px, ${(b.position.y - p.home.y).toFixed(2)}px) rotate(${b.angle.toFixed(4)}rad)`;
}

function mark(p: Piece, s: State) {
  p.state = s;
  p.el.dataset.s = s;
  flag(p.id, s !== "set");
}

// ------------------------------------------------------------- coming loose

function loosen(p: Piece) {
  if (p.state !== "set" && p.state !== "askew") return;
  swap(p, false);
  p.since = performance.now();
  mark(p, "loose");
}

function callFor(p: Piece, delay = 420) {
  setTimeout(() => {
    if (p.state === "loose") post(repair(p));
  }, delay * tempo);
}

Events.on(engine, "collisionStart", (ev) => {
  for (const pair of ev.pairs) {
    const a = (pair.bodyA as Matter.Body & { piece?: Piece }).piece;
    const b = (pair.bodyB as Matter.Body & { piece?: Piece }).piece;
    if (!a || !b) continue;
    const [still, mover] = a.state === "set" ? [a, b] : b.state === "set" ? [b, a] : [null, null];
    if (!still || !mover || mover.state === "set") continue;
    if (mover.body.speed > size * 0.055) knocked.push(still);
  }
});

// ------------------------------------------------------------------ the hand

interface Grip {
  to(x: number, y: number): void;
  drop(): void;
}

function grip(p: Piece, at: Pt, stiffness: number): Grip {
  const b = p.body;
  const c = Constraint.create({
    pointA: { x: at.x, y: at.y },
    bodyB: b,
    pointB: { x: at.x - b.position.x, y: at.y - b.position.y },
    length: 0,
    stiffness,
    damping: 0.12,
  });
  (c as Matter.Constraint & { angleB: number }).angleB = b.angle;
  Composite.add(engine.world, c);
  return {
    to(x, y) {
      c.pointA.x = x;
      c.pointA.y = y;
    },
    drop() {
      Composite.remove(engine.world, c);
    },
  };
}

let held: { p: Piece; g: Grip; id: number } | null = null;

function grab(e: PointerEvent) {
  const node = (e.target as Element).closest<HTMLElement>(".pc");
  const p = pieces.find((q) => q.el === node);
  if (!p || held || p.state === "placing") return;
  e.preventDefault();
  if (p.state === "carried") recall(p.id);
  if (p.state === "set" || p.state === "askew") {
    loosen(p);
    record("you", "pulled", p.ch);
  }
  recall(p.id);
  swapFilter(p, true);
  mark(p, "held");
  held = { p, g: grip(p, { x: e.pageX, y: e.pageY }, 0.5), id: e.pointerId };
  node!.setPointerCapture(e.pointerId);
  wake();
}

function swapFilter(p: Piece, solid: boolean) {
  p.body.collisionFilter = solid ? { category: LOOSE, mask: WALL | SET | LOOSE, group: 0 } : { category: LOOSE, mask: 0, group: 0 };
}

function move(e: PointerEvent) {
  if (held && e.pointerId === held.id) held.g.to(e.pageX, e.pageY);
}

function release(e: PointerEvent) {
  if (!held || e.pointerId !== held.id) return;
  const { p, g } = held;
  held = null;
  g.drop();
  mark(p, "loose");
  const b = p.body;
  const near = Math.hypot(b.position.x - p.home.x, b.position.y - p.home.y) < size * 0.16;
  const upright = Math.abs(norm(b.angle)) < 0.5;
  if (near && upright) void place(p, "you").catch(() => {});
  else callFor(p);
}

const norm = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

// ------------------------------------------------------------ putting it back

/** Ease a piece from wherever it is onto its slot, with the lines that prove it. */
async function place(p: Piece, who: string, signal?: AbortSignal, agent?: Agent, hand?: Pt) {
  const from = { x: p.body.position.x, y: p.body.position.y, a: norm(p.body.angle) };
  swap(p, true, from, from.a);
  mark(p, "placing");
  const W = document.documentElement.clientWidth;
  const row = pieces.filter((q) => q.line === p.line);
  const x0 = Math.min(...row.map((q) => q.left));
  const base = hline(p.base, Math.max(0, x0 - size * 0.5), W);
  const side = vline(p.left, p.top - size * 0.12, p.base + size * 0.12);
  const off = Math.hypot(from.x - p.home.x, from.y - p.home.y);
  const tag = chip(p.left + 6, p.base + 8, `${off.toFixed(0)}`);
  try {
    await run(
      (190 + Math.min(160, off * 0.5)) * Math.max(0.7, tempo),
      (t) => {
        const s = ease.out5(t);
        Body.setPosition(p.body, { x: from.x + (p.home.x - from.x) * s, y: from.y + (p.home.y - from.y) * s });
        Body.setAngle(p.body, from.a * (1 - s));
        draw(p);
        tag.set(`${(off * (1 - s)).toFixed(off * (1 - s) < 10 ? 1 : 0)}`);
        if (agent && hand) {
          const c = Math.cos(p.body.angle);
          const n = Math.sin(p.body.angle);
          agent.set(p.body.position.x + hand.x * c - hand.y * n, p.body.position.y + hand.x * n + hand.y * c);
        }
      },
      signal,
    );
  } finally {
    Body.setPosition(p.body, p.home);
    Body.setAngle(p.body, 0);
    mark(p, "set");
    draw(p);
    p.el.classList.remove("tick");
    void p.el.offsetWidth;
    p.el.classList.add("tick");
    tag.set("0");
    tag.fade(380);
    base.fade(420);
    side.fade(420);
    record(who, "set", p.ch, p.since ? (performance.now() - p.since) / 1000 : undefined);
    p.since = 0;
  }
}

/** The job an agent runs for a loose letter: go to it, pick it up by its head
 *  so it hangs straight, carry it over, and set it. */
function repair(p: Piece) {
  return {
    key: p.id,
    rank: tempo < 1 ? pieces.indexOf(p) : 0,
    at: () => p.body.position,
    async run(a: Agent, signal: AbortSignal) {
      // Its head: a point above the centre of mass, in the letter's own frame.
      const up = Math.min(p.home.y - p.top, size * 0.22);
      const head = () => {
        const b = p.body;
        return { x: b.position.x + up * Math.sin(b.angle), y: b.position.y - up * Math.cos(b.angle) };
      };
      await a.moveTo(head, { signal, tempo });
      if (p.state !== "loose") throw new Stop();
      await a.press(signal, 50 * tempo);
      swapFilter(p, false);
      mark(p, "carried");
      const g = grip(p, { x: a.x, y: a.y }, 0.9);
      const follow = onTick(() => g.to(a.x, a.y));
      const air = p.body.frictionAir;
      p.body.frictionAir = 0.06;
      try {
        const dest = { x: p.home.x, y: p.home.y - up };
        const rise = dest.x > a.x ? -0.22 : 0.22;
        await a.moveTo(dest, { signal, tempo: tempo * 1.15, bow: rise });
      } catch (err) {
        swapFilter(p, true);
        if ((p.state as State) === "carried") mark(p, "loose");
        throw err;
      } finally {
        follow();
        g.drop();
        p.body.frictionAir = air;
      }
      if (tempo < 1) void place(p, a.name).catch(() => {});
      else await place(p, a.name, signal, a, { x: 0, y: -up });
      a.lift();
    },
  };
}

// ------------------------------------------------------------------- running

let running = false;
function wake() {
  if (running) return;
  running = true;
  let acc = 0;
  const STEP = 1000 / 120;
  const off = onTick((dt) => {
    acc += dt;
    while (acc >= STEP) {
      Engine.update(engine, STEP);
      acc -= STEP;
    }
    while (knocked.length) {
      const p = knocked.pop()!;
      if (p.state !== "set") continue;
      loosen(p);
      record("you", "knocked", p.ch);
      callFor(p, 700);
    }
    let live = false;
    for (const p of pieces) {
      if (p.state === "set" || p.state === "placing" || p.state === "askew") continue;
      live = true;
      // Anything that gets out comes back in.
      const b = p.body;
      if (b.position.y > floorY + 600 || b.position.y < -6000) {
        Body.setPosition(b, { x: clamp(b.position.x, 100, document.documentElement.clientWidth - 100), y: floorY - size });
        Body.setVelocity(b, { x: 0, y: 0 });
      }
      draw(p);
    }
    if (!live && !held) {
      running = false;
      off();
    }
  });
}

/** Start with the letters in a heap on the floor, already at rest. */
function spill() {
  const W = document.documentElement.clientWidth;
  const lanes = pieces.length;
  const order = pieces.map((_, i) => i).sort(() => Math.random() - 0.5);
  pieces.forEach((p, i) => {
    const x = clamp(((order[i] + 0.5) / lanes) * W + rand(-20, 20), size * 0.4, W - size * 0.4);
    swap(p, false, { x, y: floorY - size * (0.6 + order[i] * 0.75) }, rand(-1.5, 1.5));
    p.since = performance.now();
    mark(p, "loose");
  });
  for (let i = 0; i < 1600; i++) {
    Engine.update(engine, 1000 / 120);
    if (i > 500 && i % 40 === 0 && pieces.every((p) => p.body.speed < 0.08 && Math.abs(p.body.angularSpeed) < 0.002)) break;
  }
  for (const p of pieces) {
    Body.setVelocity(p.body, { x: 0, y: 0 });
    Body.setAngularVelocity(p.body, 0);
    draw(p);
  }
}

/** Now and then something slips on its own, and gets straightened. */
function slip() {
  const ok = pieces.filter((p) => p.state === "set");
  if (!ok.length || document.hidden || held) return;
  const r = hero.getBoundingClientRect();
  if (r.bottom < 200) return;
  const p = ok[Math.floor(Math.random() * ok.length)];
  const a = rand(0.05, 0.11) * (Math.random() < 0.5 ? -1 : 1);
  const dy = size * rand(0.02, 0.05);
  mark(p, "askew");
  p.since = performance.now();
  void run(520, (t) => {
    const s = 1 - Math.cos(t * Math.PI * 2.5) * (1 - t) ** 2;
    Body.setPosition(p.body, { x: p.home.x, y: p.home.y + dy * s });
    Body.setAngle(p.body, a * s);
    if (p.state === "askew") p.el.style.transform = `translate(0, ${(dy * s).toFixed(2)}px) rotate(${(a * s).toFixed(4)}rad)`;
  });
  record("page", "slipped", p.ch);
  setTimeout(() => {
    if (p.state !== "askew") return;
    post({
      key: p.id,
      at: () => p.home,
      async run(ag, signal) {
        const head = { x: p.home.x, y: p.top + size * 0.1 };
        await ag.moveTo(head, { signal });
        if (p.state !== "askew") throw new Stop();
        await ag.press(signal, 80);
        await place(p, ag.name, signal);
        ag.lift();
      },
    });
  }, 900);
}

export function startName(opts: { intro: boolean }) {
  if (calm) return { ready: Promise.resolve() };
  fit();
  document.documentElement.classList.add("set");
  rebinding();

  let done: () => void = () => {};
  const ready = new Promise<void>((r) => (done = r));
  if (opts.intro) {
    tempo = 0.42;
    spill();
    wake();
    pieces.forEach((p, i) => setTimeout(() => p.state === "loose" && post(repair(p)), 140 + i * 30));
    const check = setInterval(() => {
      if (pieces.every((p) => p.state === "set")) {
        clearInterval(check);
        tempo = 1;
        done();
      }
    }, 100);
    setTimeout(() => {
      tempo = 1;
      done();
    }, 6000);
  } else {
    done();
  }

  void ready.then(async () => {
    await wait(5200);
    slip();
    setInterval(() => Math.random() < 0.5 && slip(), 38000);
  });

  let timer = 0;
  let width = document.documentElement.clientWidth;
  addEventListener("resize", () => {
    if (document.documentElement.clientWidth === width) return;
    width = document.documentElement.clientWidth;
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      for (const p of pieces) recall(p.id);
      held = null;
      fit();
      rebinding();
    }, 160);
  });
  return { ready };
}

function rebinding() {
  holder.addEventListener("pointerdown", grab);
  holder.addEventListener("dblclick", scatter);
  holder.addEventListener("pointermove", move);
  holder.addEventListener("pointerup", release);
  holder.addEventListener("pointercancel", release);
}

/** Everything off the page at once. */
export function scatter() {
  for (const p of pieces) {
    if (p.state !== "set") continue;
    loosen(p);
    Body.setVelocity(p.body, { x: rand(-9, 9), y: rand(-14, -4) });
    Body.setAngularVelocity(p.body, rand(-0.2, 0.2));
    callFor(p, 900 + Math.random() * 500);
  }
  wake();
}
