// CitationBench's published results as bars. The numbers are in the markup
// (data-* on each row, from src/data/citationbench.json); this sizes the bars,
// switches measures, and lets a visitor drag a bar to a number it never
// scored, which an agent then drags back.
import { free, post, recall, type Agent } from "./agents";
import { Stop, calm, clamp, ease, pageRect, run, still } from "./kit";
import { chip, vline } from "./layer";
import { flag, record } from "./ledger";

const fig = document.getElementById("bench");

interface Row {
  el: HTMLElement;
  track: HTMLElement;
  id: string;
  shown: number;
}

export function startBench() {
  if (!fig) return;
  const rows: Row[] = [...fig.querySelectorAll<HTMLElement>(".row")].map((el) => ({
    el,
    track: el.querySelector<HTMLElement>(".track")!,
    id: el.dataset.id!,
    shown: 0,
  }));
  let measure = "correct";
  const truth = (r: Row) => (r.el.dataset[measure] ?? "0 0 0").split(" ").map(Number) as [number, number, number];

  const paint = (r: Row, v: number) => {
    r.shown = v;
    r.track.style.setProperty("--v", v.toFixed(2));
    r.el.querySelector(".val b")!.textContent = String(Math.round(v));
  };
  const settle = (r: Row) => {
    const [mean, lo, hi] = truth(r);
    paint(r, mean);
    r.track.style.setProperty("--lo", String(lo));
    r.track.style.setProperty("--hi", String(hi));
    const half = Math.round((hi - lo) / 2);
    r.el.querySelector(".val i")!.textContent = half ? `±${half}` : "";
    r.el.classList.remove("off");
    r.el.classList.add("set");
    flag(`bar:${r.id}`, false);
  };

  // The first time the figure comes into view, the agents pull each bar out to
  // its score (which is also how a visitor learns the ends can be dragged). If
  // nobody is free, the bars grow on their own.
  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      const hands = !calm && !still && free();
      rows.forEach((r, i) => {
        if (!hands) return void setTimeout(() => settle(r), calm || still ? 0 : i * 70);
        const key = `draw:${r.id}`;
        let begun = false;
        post({
          key,
          rank: i,
          at: () => end(r),
          async run(a, signal) {
            begun = true;
            const [mean] = truth(r);
            r.el.classList.add("drag");
            try {
              await a.moveTo(() => end(r), { signal, tempo: 0.8 });
              await a.press(signal, 60);
              await run(
                300 + mean * 3,
                (k) => {
                  paint(r, mean * ease.hand(k));
                  const p = end(r);
                  a.set(p.x, p.y);
                },
                signal,
              );
            } finally {
              r.el.classList.remove("drag");
              settle(r);
              a.lift();
            }
          },
        });
        // not picked up soon enough: draw it without them
        setTimeout(() => {
          if (begun) return;
          recall(key);
          settle(r);
        }, 1800 + i * 500);
      });
    },
    { threshold: 0.35 },
  );
  io.observe(fig);

  const says = document.getElementById("bench-says");
  fig.querySelectorAll<HTMLButtonElement>(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      measure = b.dataset.m!;
      fig.querySelectorAll(".seg button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      if (says) says.textContent = b.dataset.says ?? "";
      for (const r of rows) {
        recall(`bar:${r.id}`);
        settle(r);
      }
    }),
  );

  if (calm) return;
  for (const r of rows) {
    const grip = r.el.querySelector<HTMLElement>(".grip")!;
    const at = (e: PointerEvent) => {
      const t = r.track.getBoundingClientRect();
      return clamp(((e.clientX - t.left) / t.width) * 100, 0, 100);
    };
    grip.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      recall(`bar:${r.id}`);
      grip.setPointerCapture(e.pointerId);
      r.el.classList.add("drag");
    });
    grip.addEventListener("pointermove", (e) => {
      if (!grip.hasPointerCapture(e.pointerId)) return;
      paint(r, at(e));
      const wrong = Math.round(r.shown) !== Math.round(truth(r)[0]);
      r.el.classList.toggle("off", wrong);
    });
    const up = (e: PointerEvent) => {
      if (!r.el.classList.contains("drag")) return;
      r.el.classList.remove("drag");
      void e;
      const [mean] = truth(r);
      if (Math.round(r.shown) === Math.round(mean)) return settle(r);
      flag(`bar:${r.id}`, true);
      record("you", "changed", `${r.id} to ${Math.round(r.shown)}`);
      const since = performance.now();
      setTimeout(() => {
        if (!r.el.classList.contains("off") || r.el.classList.contains("drag")) return;
        post({
          key: `bar:${r.id}`,
          at: () => end(r),
          run: (a, signal) => restore(r, a, signal, since),
        });
      }, 650);
    };
    grip.addEventListener("pointerup", up);
    grip.addEventListener("pointercancel", up);
  }

  const end = (r: Row) => {
    const t = pageRect(r.track);
    return { x: t.x + (t.w * r.shown) / 100, y: t.y + t.h / 2 };
  };

  async function restore(r: Row, a: Agent, signal: AbortSignal, since: number) {
    await a.moveTo(() => end(r), { signal });
    if (!r.el.classList.contains("off")) throw new Stop();
    await a.press(signal, 90);
    const [mean] = truth(r);
    const t = pageRect(r.track);
    const x = t.x + (t.w * mean) / 100;
    const guide = vline(x, t.y - 6, t.y + t.h + 6);
    const tag = chip(x + 6, t.y - 4, String(Math.round(mean)));
    const from = r.shown;
    r.el.classList.add("drag");
    try {
      await run(
        260 + Math.abs(from - mean) * 7,
        (k) => {
          paint(r, from + (mean - from) * ease.hand(k));
          const p = end(r);
          a.set(p.x, p.y);
        },
        signal,
      );
    } finally {
      r.el.classList.remove("drag");
      guide.fade(360);
      tag.fade(360);
    }
    settle(r);
    a.lift();
    record(a.name, "restored", r.id, (performance.now() - since) / 1000);
  }
}
