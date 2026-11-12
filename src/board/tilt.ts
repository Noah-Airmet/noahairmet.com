// Windows on a stage turn a little toward the pointer and slide by their depth,
// so the nearer one moves more. Eased every frame; still under reduced motion
// and on touch.
import { calm, onTick, still } from "./kit";

export function startTilt() {
  if (calm || still || !matchMedia("(hover: hover) and (pointer: fine)").matches) return;
  const stages = [...document.querySelectorAll<HTMLElement>("[data-tilt]")].map((el) => ({
    el,
    slabs: [...el.querySelectorAll<HTMLElement>(".slab")].map((s) => ({ el: s, depth: Number(s.dataset.depth ?? 1) })),
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    seen: false,
  }));
  if (!stages.length) return;

  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const s = stages.find((st) => st.el === e.target);
      if (s) s.seen = e.isIntersecting;
    }
  });
  for (const s of stages) io.observe(s.el);

  addEventListener(
    "pointermove",
    (e) => {
      if (e.pointerType !== "mouse") return;
      for (const s of stages) {
        if (!s.seen) continue;
        const r = s.el.getBoundingClientRect();
        s.tx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
        s.ty = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)));
      }
    },
    { passive: true },
  );

  onTick((dt) => {
    const k = 1 - Math.exp(-dt / 140);
    for (const s of stages) {
      if (!s.seen) continue;
      if (Math.abs(s.tx - s.x) < 0.0005 && Math.abs(s.ty - s.y) < 0.0005) continue;
      s.x += (s.tx - s.x) * k;
      s.y += (s.ty - s.y) * k;
      for (const { el, depth } of s.slabs) {
        el.style.setProperty("--ry", `${(s.x * 3.2).toFixed(3)}deg`);
        el.style.setProperty("--rx", `${(-s.y * 2.4).toFixed(3)}deg`);
        el.style.setProperty("--tx", `${(s.x * depth * 7).toFixed(2)}px`);
        el.style.setProperty("--ty", `${(s.y * depth * 5).toFixed(2)}px`);
      }
    }
  });
}
