// SafetyPage's quote check, live. The quotation is editable; every change is
// sent to the library's own verifier (POST /api/verify, the same one its MCP
// tool calls) and the verdict shown is the one it returns. Change a word and
// the page marks what the source says instead; leave it wrong and an agent
// puts the source's words back.
import { quotes, type Quote } from "../data/quotes";
import { free, post, recall, type Agent } from "./agents";
import { calm, pageRect, still, wait } from "./kit";
import { flag, record } from "./ledger";

const API = "https://safetypage-api.noahairmet.com/api/verify";

interface Verdict {
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
let mend = 0;

const text = () => (q!.textContent ?? "").replace(/\s+/g, " ").trim();
const key = (w: string) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

async function verify(body: { quote: string; cite?: string }): Promise<Verdict> {
  const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error(String(res.status));
  return res.json();
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
  let seen = 0;
  let set = false;
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const len = node.length;
    if (!set && start <= seen + len) {
      r.setStart(node, start - seen);
      set = true;
    }
    if (set && end <= seen + len) {
      r.setEnd(node, end - seen);
      return r;
    }
    seen += len;
  }
  return r;
}

/** Strike what the source doesn't say; write what it does say above. */
function draw(ops: Op[]) {
  marks.replaceChildren();
  const raw = q!.textContent ?? "";
  // ops were computed on collapsed text; map through leading whitespace if any
  const lead = raw.length - raw.trimStart().length;
  const base = marks.getBoundingClientRect();
  for (const o of ops) {
    if (o.kind === "same") continue;
    const rects = [...rangeAt(o.at[0] + lead, Math.max(o.at[1], o.at[0] + 1) + lead).getClientRects()];
    const r = rects[0];
    if (!r) continue;
    if (o.kind !== "missing") {
      for (const rr of rects) {
        const s = document.createElement("i");
        s.style.left = `${rr.left - base.left}px`;
        s.style.top = `${rr.top - base.top + rr.height * 0.56}px`;
        s.style.width = `${rr.width}px`;
        marks.append(s);
      }
    }
    if (o.want) {
      const w = document.createElement("b");
      w.textContent = o.kind === "missing" ? `‸${o.want}` : o.want;
      w.style.left = `${r.left - base.left}px`;
      w.style.top = `${r.top - base.top + 2}px`;
      marks.append(w);
    }
  }
}

async function check() {
  const id = ++seq;
  const mine = text();
  clearTimeout(mend);
  if (!mine) {
    marks.replaceChildren();
    return say("none", "Empty");
  }
  say("busy", "Checking");
  try {
    let v = await verify({ quote: mine });
    if (id !== seq) return;
    if (!v.passed) {
      const pinned = await verify({ quote: mine, cite: cur.cite });
      if (id !== seq) return;
      if (pinned.passed || pinned.verdict === "near_miss") v = pinned;
    }
    if (v.passed) {
      marks.replaceChildren();
      cite(v.locations[0]);
      flag("quote", false);
      return say("ok", v.verdict === "elsewhere" ? "Found elsewhere" : "On the page", v.reason);
    }
    cite();
    const ops = diff(mine, cur.text);
    if (v.verdict === "near_miss" && close(ops)) {
      draw(ops);
      flag("quote", true);
      say("miss", "Not what it says", v.reason);
      if (!calm) mend = window.setTimeout(() => post({ key: "quote", at: () => spot(), run: repair }), 4200);
    } else {
      marks.replaceChildren();
      flag("quote", false);
      say("none", "Not found", v.reason);
    }
  } catch {
    if (id === seq) say("err", "Couldn’t check");
  }
}

const spot = () => {
  const r = pageRect(q!);
  return { x: r.x + 20, y: r.y + 20 };
};

/** The agent goes to each wrong word and puts back what the source says. */
async function repair(a: Agent, signal: AbortSignal) {
  const since = performance.now();
  const mine = q!.textContent ?? "";
  const ops = diff(mine.replace(/\s+/g, " ").trim(), cur.text).filter((o) => o.kind !== "same");
  for (const o of ops) {
    const r = rangeAt(o.at[0], Math.max(o.at[1], o.at[0] + 1)).getBoundingClientRect();
    await a.moveTo({ x: r.left + scrollX + Math.min(r.width, 60) / 2, y: r.top + scrollY + r.height * 0.55 }, { signal });
    await a.click(signal);
    await wait(120, signal);
  }
  marks.replaceChildren();
  q!.textContent = cur.text;
  record(a.name, "restored", "the quotation", (performance.now() - since) / 1000);
  void check();
}

function load(i: number) {
  idx = (i + quotes.length) % quotes.length;
  cur = quotes[idx];
  recall("quote");
  q!.textContent = cur.text;
  marks.replaceChildren();
  cite();
  flag("quote", false);
  void check();
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
    if (e.key === "Enter") {
      e.preventDefault();
      q.blur();
    }
  });
  let was = text();
  q.addEventListener("input", () => {
    recall("quote");
    clearTimeout(timer);
    clearTimeout(mend);
    marks.replaceChildren();
    if (text() !== cur.text && was === cur.text) record("you", "changed", "the quotation");
    was = text();
    say("busy", "Checking");
    timer = window.setTimeout(check, 450);
  });
  next.addEventListener("click", () => load(idx + 1));
  addEventListener("resize", () => out.dataset.v === "miss" && draw(diff(text(), cur.text)));

  // The first verdict is live too, once the figure is on screen.
  // An agent presses the check itself, if one is free.
  const io = new IntersectionObserver(
    (e) => {
      if (!e.some((x) => x.isIntersecting)) return;
      io.disconnect();
      if (calm || still || !free()) return void check();
      say("busy", "Checking");
      let begun = false;
      post({
        key: "check",
        at: () => spot(),
        async run(a, signal) {
          begun = true;
          try {
            const dot = out.querySelector("i")!.getBoundingClientRect();
            await a.moveTo({ x: dot.left + scrollX + dot.width / 2, y: dot.top + scrollY + dot.height / 2 }, { signal, tempo: 0.8 });
            await a.click(signal);
          } finally {
            void check();
          }
        },
      });
      setTimeout(() => {
        if (begun) return;
        recall("check");
        void check();
      }, 1500);
    },
    { threshold: 0.6 },
  );
  io.observe(q);
}
