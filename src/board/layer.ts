// The overlay everything that isn't content is drawn on: the agents' cursors,
// the blue lines they line things up with, the red measurements.
import { el } from "./kit";

export const layer = el("div", "board");
layer.setAttribute("aria-hidden", "true");
document.body.append(layer);

export interface Line {
  el: HTMLElement;
  fade(after?: number): void;
}

function line(cls: string, x: number, y: number, len: number): Line {
  const node = el("i", `gl ${cls}`);
  node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  node.style.setProperty("--len", `${Math.round(len)}px`);
  layer.append(node);
  requestAnimationFrame(() => node.classList.add("on"));
  return {
    el: node,
    fade(after = 0) {
      setTimeout(() => {
        node.classList.remove("on");
        setTimeout(() => node.remove(), 520);
      }, after);
    },
  };
}

/** A blue alignment line. */
export const hline = (y: number, x0: number, x1: number) => line("h", x0, y, x1 - x0);
export const vline = (x: number, y0: number, y1: number) => line("v", x, y0, y1 - y0);

/** A small value pinned to the page: a measurement, or what was just done. */
export function chip(x: number, y: number, text: string, tone: "guide" | "mark" | "pass" = "guide") {
  const node = el("b", `chip ${tone}`, text);
  node.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  layer.append(node);
  requestAnimationFrame(() => node.classList.add("on"));
  return {
    el: node,
    set(t: string) {
      node.textContent = t;
    },
    move(nx: number, ny: number) {
      node.style.transform = `translate(${Math.round(nx)}px, ${Math.round(ny)}px)`;
    },
    fade(after = 0) {
      setTimeout(() => {
        node.classList.remove("on");
        setTimeout(() => node.remove(), 320);
      }, after);
    },
  };
}
