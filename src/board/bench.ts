// CitationBench's published results as bars. The numbers are in the markup
// (data-* on each row, from src/data/citationbench.json); this sizes the bars
// the first time the figure is seen, one after another, and switches measures.
import { calm, still } from "./kit";

const fig = document.getElementById("bench");

export function startBench() {
  if (!fig) return;
  const rows = [...fig.querySelectorAll<HTMLElement>(".row")];
  let measure = "correct";

  const settle = (row: HTMLElement) => {
    const [mean, lo, hi] = (row.dataset[measure] ?? "0 0 0").split(" ").map(Number);
    const track = row.querySelector<HTMLElement>(".track")!;
    track.style.setProperty("--v", mean.toFixed(2));
    track.style.setProperty("--lo", String(lo));
    track.style.setProperty("--hi", String(hi));
    row.querySelector(".val b")!.textContent = String(Math.round(mean));
    const half = Math.round((hi - lo) / 2);
    row.querySelector(".val i")!.textContent = half ? `±${half}` : "";
    row.classList.add("set");
  };

  const io = new IntersectionObserver(
    (entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      rows.forEach((row, i) => {
        row.style.setProperty("--i", String(i));
        settle(row);
      });
      // once drawn, a change of measure moves every bar together
      setTimeout(() => fig.classList.add("drawn"), calm || still ? 0 : 900 + rows.length * 70);
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
      rows.forEach(settle);
    }),
  );
}
