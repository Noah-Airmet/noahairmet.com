// The Catchword card: a question about the safety record, and an answer in the
// source's own words, cited to the page.
//
// Every question, answer and page is in the document from the start (the
// answers stack in one cell, so the card is as tall as its longest). With
// motion allowed the card acts each one out: fable types the question and
// sends it, opus answers, then presses the citation, and the page comes up
// beside it with the words marked. The quote is checked against the library's
// verifier when it is cited, and the verdict shown is the one that comes back.
import { asks } from "../data/asks";
import { post, recall, type Agent } from "./agents";
import { calm, onTick, pageRect, run, still, wait } from "./kit";
import { record } from "./ledger";
import { verify } from "./quote";
import { showPage, unmark } from "./sheet";

/** How long an answer stays up before the next question. */
const HOLD = 8000;
/** When an answer's first word arrives after its lead, and the gap between words (work.css keeps the same two). */
const LEAD = 260;
const WORD = 44;

const card = document.getElementById("ask") as HTMLElement | null;
const items = [...document.querySelectorAll<HTMLElement>(".ask-item")];
const out = document.getElementById("ask-verdict") as HTMLOutputElement;
const src = document.getElementById("ask-src") as HTMLAnchorElement;
const next = document.getElementById("ask-next") as HTMLButtonElement;

let idx = 0;
let stage: "blank" | "asking" | "asked" | "answering" | "answered" = "answered";
let clock = 0;
const live = !calm && !still;

const part = (sel: string) => items[idx].querySelector(sel) as HTMLElement;

function say(v: "ok" | "busy" | "miss" | "err", label: string) {
  out.dataset.v = v;
  out.querySelector("span")!.textContent = label;
}

/** Show how much of the question has been typed; the rest keeps its room. */
function typed(n: number) {
  const text = asks[idx].ask;
  part(".ask-typed").textContent = text.slice(0, n);
  part(".ask-rest").textContent = text.slice(n);
}

/** Bring a question up: whole and answered where nothing moves, blank where it is acted out. */
function load(i: number) {
  recall("ask");
  items[idx].classList.remove("on", "typing", "in");
  idx = (i + asks.length) % asks.length;
  const a = asks[idx];
  const item = items[idx];
  item.classList.add("on");
  src.textContent = a.source;
  src.href = a.href;
  clock = 0;
  next.style.setProperty("--t", "0");
  if (!live) {
    typed(a.ask.length);
    item.classList.remove("wait");
    card!.classList.remove("pending");
    showPage(a, true);
    stage = "answered";
    void cite();
    return;
  }
  typed(0);
  item.classList.add("wait");
  card!.classList.add("pending");
  unmark();
  stage = "blank";
}

/** Ask the library whether the quote is on the page it cites. */
async function cite() {
  const a = asks[idx];
  say("busy", "Checking");
  try {
    const v = await verify(a.quote, a.cite);
    if (a !== asks[idx]) return;
    say(v.passed ? "ok" : "miss", v.passed ? "On the page" : "Not what it says");
  } catch {
    if (a === asks[idx]) say("err", "Couldn’t check");
  }
}

const at = (el: Element, fx: number, fy: number) => () => {
  const r = pageRect(el);
  return { x: r.x + r.w * fx, y: r.y + r.h * fy };
};

/** fable types the question into the field and sends it. */
async function ask(a: Agent, signal: AbortSignal) {
  const item = items[idx];
  const text = asks[idx].ask;
  await a.moveTo(at(part(".ask-q"), 0.04, 0.5), { signal });
  await a.click(signal);
  item.classList.add("typing");
  // the hand keeps just under the caret as the words go in
  const caret = () => {
    const r = part(".ask-typed").getClientRects();
    const last = r[r.length - 1];
    return last ? { x: last.right + scrollX + 6, y: last.bottom + scrollY + 2 } : at(part(".ask-q"), 0.04, 0.5)();
  };
  for (let n = 1; n <= text.length; n++) {
    typed(n);
    const p = caret();
    a.set(p.x, p.y);
    await wait(text[n - 1] === " " ? 46 : 24, signal);
  }
  await wait(220, signal);
  await a.moveTo(at(part(".ask-send"), 0.5, 0.5), { signal });
  await a.click(signal);
  item.classList.remove("typing");
  // and stands clear of the key it pressed
  void a.moveTo(at(part(".ask-send"), 1.2, 1.15), { ms: 260 }).catch(() => {});
  stage = "asked";
  clock = 0;
  record(a.name, "asked", "the library");
}

/** opus answers, then presses the citation: the page comes up with the words marked. */
async function answer(a: Agent, signal: AbortSignal) {
  const item = items[idx];
  const lead = part(".ask-lead");
  const words = [...item.querySelectorAll<HTMLElement>(".w")];
  await a.moveTo(at(lead, 0, 1), { signal });
  item.classList.remove("wait");
  item.classList.add("in");
  // the hand runs along under the words as they arrive (the pace is the stylesheet's)
  const total = LEAD + words.length * WORD + 300;
  await run(
    total,
    (t) => {
      const k = Math.floor((t * total - LEAD) / WORD);
      const boxes = (k < 0 ? lead : words[Math.min(k, words.length - 1)]).getClientRects();
      const r = boxes[boxes.length - 1];
      if (!r) return;
      a.set(a.x + (r.right + scrollX + 5 - a.x) * 0.3, a.y + (r.bottom + scrollY - 1 - a.y) * 0.3);
    },
    signal,
  );
  card!.classList.remove("pending");
  await wait(260, signal);
  await a.moveTo(at(src, 0.5, 0.55), { signal });
  await a.click(signal);
  showPage(asks[idx], true);
  stage = "answered";
  clock = 0;
  record(a.name, "cited", asks[idx].source);
  void cite();
}

export function startAsk() {
  if (!card || !items.length) return;
  // each word of an answer is its own piece, so they can arrive one after another
  items.forEach((item, i) => {
    const q = item.querySelector(".ask-quote") as HTMLElement;
    const words = asks[i].quote.split(/\s+/);
    q.style.setProperty("--n", String(words.length));
    q.replaceChildren(
      ...words.flatMap((w, n) => {
        const span = document.createElement("span");
        span.className = "w";
        span.textContent = w;
        span.style.setProperty("--i", String(n));
        return n ? [" ", span] : [span];
      }),
    );
  });
  next.addEventListener("click", () => load(idx + 1));
  addEventListener("resize", () => stage === "answered" && showPage(asks[idx], true));

  let watching = false;
  let seen = false;
  new IntersectionObserver(
    (e) => {
      watching = e.some((x) => x.isIntersecting);
      if (watching && !seen) {
        seen = true;
        if (!live) void cite();
      }
    },
    { threshold: 0.4 },
  ).observe(card);

  if (!live) return showPage(asks[0], true);
  load(0);
  // One clock, running only while the card is on screen: ask, answer, hold, next.
  onTick((dt) => {
    if (!watching || document.hidden) return;
    clock += dt;
    if (stage === "blank" && clock > 700) {
      stage = "asking";
      post({ key: "ask", who: "fable", at: at(part(".ask-q"), 0.04, 0.5), run: ask });
    } else if (stage === "asked" && clock > 520) {
      stage = "answering";
      post({ key: "ask", who: "opus", at: at(part(".ask-lead"), 0, 0.5), run: answer });
    } else if (stage === "answered") {
      next.style.setProperty("--t", Math.min(1, clock / HOLD).toFixed(4));
      if (clock >= HOLD) load(idx + 1);
    }
  });
}
