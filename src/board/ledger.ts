// The page's own record of what was done to it and who put it right.
import { el, provoTime } from "./kit";

export interface Entry {
  at: string;
  who: string;
  did: string;
  what: string;
  took?: number;
}

const entries: Entry[] = [];
const listeners = new Set<() => void>();
const out = new Set<string>();
const title = document.title;

const stateBtn = document.getElementById("state") as HTMLButtonElement | null;
const stateText = stateBtn?.querySelector("span");
const last = document.getElementById("last");
const list = document.getElementById("log-list");

export function record(who: string, did: string, what: string, took?: number) {
  const e: Entry = { at: provoTime(), who, did, what, took };
  entries.push(e);
  if (entries.length > 200) entries.shift();
  if (last) {
    last.replaceChildren(row(e));
    last.classList.remove("on");
    void last.offsetWidth;
    last.classList.add("on");
  }
  if (list) {
    list.prepend(row(e));
    while (list.childElementCount > 60) list.lastElementChild?.remove();
  }
  for (const f of listeners) f();
}

function row(e: Entry) {
  const li = el("span", "log-row");
  li.append(el("time", "", e.at), el("b", e.who === "you" ? "you" : "", e.who), el("span", "", `${e.did} ${e.what}`));
  if (e.took != null) li.append(el("i", "", `${e.took.toFixed(1)} s`));
  return li;
}

/** Mark one thing as out of place, or back in it. The bar shows the count. */
export function flag(key: string, on: boolean) {
  if (on) out.add(key);
  else out.delete(key);
  document.title = out.size ? `(${out.size}) ${title}` : title;
  if (!stateBtn || !stateText) return;
  stateBtn.dataset.state = out.size ? "off" : "ok";
  stateText.textContent = out.size ? `${out.size} out of place` : "Intact";
}

// The log opens under the state, and closes on Escape or a press elsewhere.
const panel = document.getElementById("log");
if (stateBtn && panel) {
  const set = (open: boolean) => {
    panel.hidden = !open;
    stateBtn.setAttribute("aria-expanded", String(open));
  };
  stateBtn.addEventListener("click", () => set(panel.hasAttribute("hidden")));
  addEventListener("keydown", (e) => e.key === "Escape" && set(false));
  addEventListener("pointerdown", (e) => {
    if (!panel.hasAttribute("hidden") && !(e.target as Element).closest("#log, #state")) set(false);
  });
}

export const history = () => entries;
export const onRecord = (f: () => void) => void listeners.add(f);
