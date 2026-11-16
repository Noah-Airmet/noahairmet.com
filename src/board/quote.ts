// The quote check, live: the code check CitationBench scores agents with.
//
// The quotation is editable; every change goes to the library's own verifier
// (POST /api/verify, the one its MCP tool calls) and the verdict shown is the
// one it returns. Left alone, the figure demonstrates itself: one word goes
// wrong the way a careless quoter would get it wrong, the check catches it and
// marks what the source says, the word is put right, and the next quotation
// comes up. Touch it and the demonstration stops; it is yours.
import { quotes, type Quote } from "../data/quotes";
import { calm, onTick, still, wait } from "./kit";

const API = "https://safetypage-api.noahairmet.com/api/verify";
/** How long a quotation stays up when nobody is touching it. */
const TURN = 12500;

export interface Verdict {
  verdict: "exact" | "normalized" | "elsewhere" | "near_miss" | "not_found";
  passed: boolean;
  reason: string;
  locations: { cite: string; url: string }[];
}

type Op = { kind: "same" | "wrong" | "extra"; at: [number, number]; want?: string } | { kind: "missing"; at: [number, number]; want: string };

const q = document.getElementById("q") as HTMLElement | null;
const marks = document.getElementById("q-marks") as HTMLElement;
const out = document.getElementById("verdict") as HTMLOutputElement;
const src = document.getElementById("q-src") as HTMLAnchorElement;
const why = document.getElementById("q-why") as HTMLElement;
const next = document.getElementById("q-next") as HTMLButtonElement;

let cur: Quote = quotes[0];
let idx = 0;
let seq = 0;
let timer = 0;
/** The demonstration's current move, so a visitor (or the next quotation) can call it off. */
let act: AbortController | null = null;
const recall = () => {
  act?.abort();
  act = null;
};
function perform(move: (signal: AbortSignal) => Promise<void>) {
  recall();
  const mine = (act = new AbortController());
  move(mine.signal).catch(() => {});
}
/** The visitor has taken over: no more demonstration until they ask for another. */
let theirs = false;
let seen = false;
let clock = 0;
let stage: "fresh" | "slipped" | "mended" = "fresh";

const text = () => (q!.textContent ?? "").replace(/\s+/g, " ").trim();
const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

// Each distinct wording is asked of the library once; the loop costs nothing after its first pass.
const asked = new Map<string, Promise<Verdict>>();
export function verify(quote: string, cite?: string): Promise<Verdict> {
  const id = `${cite ?? ""}|${quote}`;
  let hit = asked.get(id);
  if (!hit) {
    hit = fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cite ? { quote, cite } : { quote }) }).then((res) => {
      if (!res.ok) throw new Error(String(res.status));
      return res.json() as Promise<Verdict>;
    });
    hit.catch(() => asked.delete(id));
    asked.set(id, hit);
  }
  return hit;
}

function say(v: "ok" | "busy" | "miss" | "none" | "err", label: string, reason = "") {
  out.dataset.v = v;
  out.querySelector("span")!.textContent = label;
  why.textContent = reason;
}

function cite(loc?: { cite: string; url: string }) {
  if (!loc || loc.cite === cur.cite) {
    src.textContent = cur.source;
    src.href = cur.href;
    src.classList.remove("raw");
  } else {
    src.textContent = loc.cite;
    src.href = loc.url;
    src.classList.add("raw");
  }
}

// ---- what differs from the source, word by word (longest common subsequence)

function words(s: string) {
  const list: { w: string; at: [number, number] }[] = [];
  for (const m of s.matchAll(/\S+/g)) list.push({ w: m[0], at: [m.index, m.index + m[0].length] });
  return list;
}

function diff(mine: string, source: string): Op[] {
  const a = words(mine);
  const b = words(source);
  const n = a.length;
  const m = b.length;
  const lcs = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      lcs[i][j] = key(a[i].w) === key(b[j].w) ? lcs[i + 1][j + 1] + 1 : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
  const ops: Op[] = [];
  let i = 0;
  let j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && key(a[i].w) === key(b[j].w)) {
      ops.push({ kind: "same", at: a[i].at });
      i++;
      j++;
    } else if (i < n && j < m && lcs[i + 1][j + 1] >= lcs[i + 1][j] && lcs[i + 1][j + 1] >= lcs[i][j + 1]) {
      ops.push({ kind: "wrong", at: a[i].at, want: b[j].w });
      i++;
      j++;
    } else if (j < m && (i >= n || lcs[i][j + 1] >= lcs[i + 1][j])) {
      const at = i < n ? a[i].at[0] : mine.length;
      ops.push({ kind: "missing", at: [at, at], want: b[j].w });
      j++;
    } else {
      ops.push({ kind: "extra", at: a[i].at });
      i++;
    }
  }
  return ops;
}

const close = (ops: Op[]) => ops.filter((o) => o.kind === "same").length >= ops.length * 0.5;

/** A DOM range over [start, end) of the quotation's text, however it is split into nodes. */
function rangeAt(start: number, end: number) {
  const r = document.createRange();
  const walker = document.createTreeWalker(q!, NodeFilter.SHOW_TEXT);
  let passed = 0;
  let set = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const len = node.length;
    if (!set && start <= passed + len) {
      r.setStart(node, start - passed);
      set = true;
    }
    if (set && end <= passed + len) {
      r.setEnd(node, end - passed);
      return r;
    }
    passed += len;
  }
  return r;
}

/** Boxes for a stretch of the quotation, in the marks layer's own coordinates
 *  (offsets, so a tilted window measures the same as a flat one). */
function boxes(start: number, end: number) {
  const base = marks.getBoundingClientRect();
  const sx = marks.offsetWidth / base.width || 1;
  const sy = marks.offsetHeight / base.height || 1;
  return [...rangeAt(start, end).getClientRects()].map((r) => ({
    x: (r.left - base.left) * sx,
    y: (r.top - base.top) * sy,
    w: r.width * sx,
    h: r.height * sy,
  }));
}

/** Strike what the source doesn't say; write what it does say above. */
function draw(ops: Op[]) {
  marks.replaceChildren();
  for (const o of ops) {
    if (o.kind === "same") continue;
    const rects = boxes(o.at[0], Math.max(o.at[1], o.at[0] + 1));
    const r = rects[0];
    if (!r) continue;
    if (o.kind !== "missing") {
      for (const rr of rects) {
        const s = document.createElement("i");
        s.style.left = `${rr.x}px`;
        s.style.top = `${rr.y + rr.h * 0.56}px`;
        s.style.width = `${rr.w}px`;
        marks.append(s);
      }
    }
    if (o.want) {
      const w = document.createElement("b");
      w.textContent = o.kind === "missing" ? `‸${o.want}` : o.want;
      w.style.left = `${r.x}px`;
      w.style.top = `${r.y + 2}px`;
      marks.append(w);
    }
  }
}

async function check() {
  const id = ++seq;
  const mine = text();
  if (!mine) {
    marks.replaceChildren();
    return say("none", "Empty");
  }
  say("busy", "Checking");
  try {
    let v = await verify(mine);
    if (id !== seq) return;
    if (!v.passed) {
      const pinned = await verify(mine, cur.cite);
      if (id !== seq) return;
      if (pinned.passed || pinned.verdict === "near_miss") v = pinned;
    }
    if (v.passed) {
      marks.replaceChildren();
      cite(v.locations[0]);
      return say("ok", v.verdict === "elsewhere" ? "Found elsewhere" : "On the page", v.reason);
    }
    cite();
    const ops = diff(mine, cur.text);
    if (v.verdict === "near_miss" && close(ops)) {
      draw(ops);
      say("miss", "Not what it says", v.reason);
    } else {
      marks.replaceChildren();
      say("none", "Not found", v.reason);
    }
  } catch {
    if (id === seq) say("err", "Couldn’t check");
  }
}

/** Mark a stretch of the quotation as selected. */
function select(start: number, end: number) {
  marks.replaceChildren();
  for (const r of boxes(start, end)) {
    const sel = document.createElement("u");
    sel.style.left = `${r.x - 2}px`;
    sel.style.top = `${r.y + r.h * 0.12}px`;
    sel.style.width = `${r.w + 4}px`;
    sel.style.height = `${r.h * 0.8}px`;
    marks.append(sel);
  }
}

/** Replace [at, at + from) with `to`, the way it would be typed over. */
async function retype(at: number, from: number, to: string, signal: AbortSignal) {
  const now = text();
  const head = now.slice(0, at);
  const tail = now.slice(at + from);
  select(at, at + from);
  await wait(420, signal);
  marks.replaceChildren();
  for (let i = 1; i <= to.length; i++) {
    q!.textContent = head + to.slice(0, i) + tail;
    await wait(46, signal);
  }
}

/** The demonstration's misquote: the one word is taken and another typed. */
async function slip(signal: AbortSignal) {
  const [from, to] = cur.slip;
  const at = cur.text.search(new RegExp(`\\b${from}\\b`));
  if (at < 0 || text() !== cur.text) return;
  await retype(at, from.length, to, signal);
  await check();
}

/** And its correction: what the source says goes back in. */
async function repair(signal: AbortSignal) {
  const [from, to] = cur.slip;
  const at = cur.text.search(new RegExp(`\\b${from}\\b`));
  if (at < 0 || text() === cur.text) return;
  await retype(at, to.length, from, signal);
  q!.textContent = cur.text;
  await check();
}

function load(i: number) {
  idx = (i + quotes.length) % quotes.length;
  cur = quotes[idx];
  recall();
  q!.textContent = cur.text;
  marks.replaceChildren();
  cite();
  stage = "fresh";
  clock = 0;
  void check();
}

/** Somebody is using it: the demonstration stands down. */
function take() {
  if (theirs) return;
  theirs = true;
  recall();
  next.style.setProperty("--t", "0");
  // whatever the demonstration left half-typed is theirs now, and gets checked
  if (text() !== cur.text) void check();
}

export function startQuote() {
  if (!q) return;
  // plaintext-only keeps pasted markup out; older browsers fall back to true and a paste handler
  q.setAttribute("contenteditable", "plaintext-only");
  if (q.contentEditable !== "plaintext-only") {
    q.setAttribute("contenteditable", "true");
    q.addEventListener("paste", (e) => {
      e.preventDefault();
      document.execCommand("insertText", false, e.clipboardData?.getData("text/plain") ?? "");
    });
  }
  q.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.isComposing) {
      e.preventDefault();
      q.blur();
    }
  });
  q.addEventListener("focus", take);
  q.addEventListener("input", () => {
    take();
    clearTimeout(timer);
    marks.replaceChildren();
    say("busy", "Checking");
    timer = window.setTimeout(check, 450);
  });
  next.addEventListener("click", () => {
    theirs = false;
    load(idx + 1);
  });
  addEventListener("resize", () => {
    if (out.dataset.v === "miss") draw(diff(text(), cur.text));
  });

  const live = !calm && !still;
  let watching = false;
  new IntersectionObserver(
    (e) => {
      const now = e.some((x) => x.isIntersecting);
      if (now && !seen) void check();
      seen = seen || now;
      watching = now;
    },
    { threshold: 0.5 },
  ).observe(q);

  // The demonstration, paced by one clock that only runs while the figure is
  // on screen: misquote, let the check catch it, put it right, move on.
  if (!live) return;
  onTick((dt) => {
    if (!watching || theirs || document.hidden) return;
    clock += dt;
    next.style.setProperty("--t", Math.min(1, clock / TURN).toFixed(4));
    if (stage === "fresh" && clock > 2600 && out.dataset.v === "ok") {
      stage = "slipped";
      perform(slip);
    } else if (stage === "slipped" && clock > 7200 && out.dataset.v === "miss") {
      stage = "mended";
      perform(repair);
    } else if (clock >= TURN) {
      load(idx + 1);
    }
  });
}
