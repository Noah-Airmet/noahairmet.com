// The page window: Catchword's own scan of a cited page, moved so the quoted
// words are in view, with the library's yellow over them.
const sheet = document.getElementById("sheet") as HTMLAnchorElement | null;
const inner = document.getElementById("sheet-in") as HTMLElement | null;
const img = document.getElementById("sheet-img") as HTMLImageElement | null;

export interface Cited {
  href: string;
  title: string;
  page: { img: string; w: number; h: number; hl: number[][] };
}

/** Take the highlight off, leaving the page where it is. */
export function unmark() {
  inner?.querySelectorAll(".hl").forEach((n) => n.remove());
}

/** Bring a page up with its words in view; `found` puts the highlight on them. */
export function showPage(c: Cited, found: boolean) {
  if (!sheet || !inner || !img) return;
  sheet.href = c.href;
  const place = () => {
    unmark();
    const w = inner.clientWidth;
    const h = w * (c.page.h / c.page.w);
    const view = sheet.clientHeight;
    const boxes = c.page.hl;
    const top = Math.min(...boxes.map((b) => b[1])) * h;
    const bottom = Math.max(...boxes.map((b) => b[1] + b[3])) * h;
    const y = Math.max(0, Math.min(h - view, (top + bottom) / 2 - view * 0.42));
    inner.style.setProperty("--y", `${-y.toFixed(1)}px`);
    if (!found) return;
    for (const [bx, by, bw, bh] of boxes) {
      const mark = document.createElement("span");
      mark.className = "hl";
      mark.style.left = `${bx * 100}%`;
      mark.style.top = `${by * h}px`;
      mark.style.width = `${bw * 100}%`;
      mark.style.height = `${bh * h}px`;
      inner.append(mark);
    }
  };
  if (img.getAttribute("src") === c.page.img) return place();
  inner.classList.add("swap");
  unmark();
  setTimeout(() => {
    img.onload = () => {
      place();
      inner.classList.remove("swap");
    };
    img.alt = `${c.title}, the cited page`;
    img.width = c.page.w;
    img.height = c.page.h;
    img.src = c.page.img;
  }, 200);
}
