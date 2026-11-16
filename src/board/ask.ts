// The Catchword card: a question about the safety record, and an answer in the
// source's own words, cited to the page.
//
// Every question, answer and page is in the document from the start (the
// answers stack in one cell, so the card is as tall as its longest). With
// motion allowed the card acts each one out: the question is typed and sent,
// the answer arrives a word at a time, and the cited page comes up beside it
// with the words marked. The quote is checked against the library's
// verifier when it is cited, and the verdict shown is the one that comes back.
import { asks } from "../data/asks";
import { calm, onTick, still, wait } from "./kit";
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
/** The move being acted out, so the next question can call it off. */
let act: AbortController | null = null;
function perform(move: (signal: AbortSignal) => Promise<void>) {
  act?.abort();
  const mine = (act = new AbortController());
  move(mine.signal).catch(() => {});
}

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
  act?.abort();
  items[idx].classList.remove("on", "typing", "in", "sent");
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

/** The question is typed into the field and sent. */
async function ask(signal: AbortSignal) {
  const item = items[idx];
  const text = asks[idx].ask;
  item.classList.add("typing");
  for (let n = 1; n <= text.length; n++) {
    typed(n);
    await wait(text[n - 1] === " " ? 46 : 24, signal);
  }
  await wait(320, signal);
  item.classList.remove("typing");
  item.classList.add("sent");
  stage = "asked";
  clock = 0;
}

/** The answer arrives (the pace is the stylesheet's), then the page it cites comes up with the words marked. */
async function answer(signal: AbortSignal) {
  const item = items[idx];
  const words = item.querySelectorAll(".w").length;
  item.classList.remove("wait");
  item.classList.add("in");
  await wait(LEAD + words * WORD + 300, signal);
  card!.classList.remove("pending");
  await wait(260, signal);
  showPage(asks[idx], true);
  stage = "answered";
  clock = 0;
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
      perform(ask);
    } else if (stage === "asked" && clock > 520) {
      stage = "answering";
      perform(answer);
    } else if (stage === "answered") {
      next.style.setProperty("--t", Math.min(1, clock / HOLD).toFixed(4));
      if (clock >= HOLD) load(idx + 1);
    }
  });
}
