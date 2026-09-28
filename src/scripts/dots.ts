// Every Pulpit sermon as one dot, shaded by source fidelity. The cursor is a
// lens: dots under it swell and part, and the nearest one names itself.

type Core = { grades: string[]; speakers: string[]; y: number[]; f: number[]; s: number[] };
type Titles = { t: string[]; id: string[] };

const GRADES = ["Verbatim", "Authoritative print", "Contemporaneous report", "Reconstructed", "Fragmentary"];
// Ramp per grade, most to least faithful; matches .g0–.g4 in site.css.
const ramp = (bg: number[], ink: number[], accent: number[]) => {
  const mix = (a: number[], b: number[], t: number) => a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return [mix(accent, ink, 0.55), accent, mix(bg, accent, 0.76), mix(bg, accent, 0.6), mix(bg, accent, 0.46)]
    .map((c) => `rgb(${c.join(" ")})`);
};
const TALK_URL = "https://pulpit.restorationcommons.org/talks/";

const canvas = document.querySelector<HTMLCanvasElement>("#dots");
if (canvas) start(canvas);

async function start(cv: HTMLCanvasElement) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const D: Core = await (await fetch("/data/pulpit-core.json")).json();
  let titles: Titles | null = null;
  const loadTitles = () => fetch("/data/pulpit-titles.json").then((r) => r.json()).then((t) => { titles = t; });
  if ("requestIdleCallback" in window) requestIdleCallback(() => loadTitles());
  else setTimeout(loadTitles, 1200);

  const N = D.y.length;
  const x = new Float32Array(N), y = new Float32Array(N), vx = new Float32Array(N), vy = new Float32Array(N);
  const tx = new Float32Array(N), ty = new Float32Array(N), wait = new Float32Array(N);
  let layout: "decade" | "grade" = "decade";
  let size = 2, W = 0, H = 0;
  let axis: { x: number; lines: string[] }[] = [];
  let axisY = 0;

  const ctx = cv.getContext("2d")!;
  const plot = cv.parentElement!;

  const place = () => {
    const narrow = W < 520, padB = 34;
    const groups = new Map<number, number[]>();
    for (let i = 0; i < N; i++) {
      const k = layout === "decade" ? Math.floor(D.y[i] / 10) * 10 : D.f[i];
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k)!.push(i);
    }
    const keys = [...groups.keys()].sort((a, b) => a - b);
    const G = keys.length, gap = layout === "decade" ? (narrow ? 3 : 7) : narrow ? 10 : 22;
    const M = Math.max(...keys.map((k) => groups.get(k)!.length));
    const ah = H - padB - 8;
    let best = { p: 0, k: 1 };
    for (let k = 2; k <= 80; k++) {
      const p = Math.min((W - gap * (G - 1)) / (G * k), ah / Math.ceil(M / k));
      if (p > best.p) best = { p, k };
    }
    const { p, k } = best;
    size = Math.max(1.2, p * 0.78);
    const colW = k * p, total = G * colW + (G - 1) * gap, x0 = (W - total) / 2 + p / 2, base = H - padB;
    axis = []; axisY = base + 20;
    keys.forEach((key, c) => {
      const list = groups.get(key)!;
      if (layout === "grade") list.sort((a, b) => D.y[a] - D.y[b]);
      list.forEach((i, n) => { tx[i] = x0 + c * (colW + gap) + (n % k) * p; ty[i] = base - (Math.floor(n / k) + 0.5) * p; });
      const cx = x0 + c * (colW + gap) + colW / 2 - p / 2;
      if (layout === "decade") {
        const every = narrow ? key % 50 === 0 : key % 50 === 0 || key === 1830 || key === 2020;
        if (every) axis.push({ x: cx, lines: [`${key}s`] });
      } else {
        axis.push({ x: cx, lines: GRADES[key].split(" ") });
      }
    });
  };

  const resize = () => {
    const dpr = Math.min(devicePixelRatio || 1, 2), box = cv.getBoundingClientRect();
    W = box.width; H = box.height; cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    place(); dirty = true;
  };

  let dirty = true;
  new ResizeObserver(resize).observe(cv);
  resize();
  for (let i = 0; i < N; i++) {
    if (reduce) { x[i] = tx[i]; y[i] = ty[i]; continue; }
    x[i] = tx[i] + (Math.random() - 0.5) * 30;
    y[i] = -10 - Math.random() * H * 0.7;
    wait[i] = 18 + ((H - ty[i]) / H) * 40 + Math.random() * 22;
  }

  // Controls.
  document.querySelectorAll<HTMLButtonElement>(".seg button").forEach((b) =>
    b.addEventListener("click", () => {
      layout = b.dataset.layout as typeof layout;
      document.querySelectorAll(".seg button").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
      place();
      for (let i = 0; i < N; i++) wait[i] = frameNo + (reduce ? 0 : Math.random() * 14);
      if (reduce) for (let i = 0; i < N; i++) { x[i] = tx[i]; y[i] = ty[i]; }
      dirty = true;
    }),
  );

  let match: Uint8Array | null = null;
  const find = document.querySelector<HTMLInputElement>("#find"), found = document.querySelector<HTMLOutputElement>("#found");
  find?.addEventListener("input", () => {
    const q = find.value.trim().toLowerCase();
    dirty = true;
    if (q.length < 3) { match = null; if (found) found.textContent = ""; return; }
    const ok = new Set<number>();
    D.speakers.forEach((n, k) => { if (n.toLowerCase().includes(q)) ok.add(k); });
    match = new Uint8Array(N);
    let count = 0; const names = new Set<number>();
    for (let i = 0; i < N; i++) if (ok.has(D.s[i])) { match[i] = 1; count++; names.add(D.s[i]); }
    if (found) found.textContent = !count ? "No speaker matches" : names.size === 1
      ? `${D.speakers[[...names][0]]}: ${count.toLocaleString()} sermons`
      : `${names.size} speakers, ${count.toLocaleString()} sermons`;
  });

  // Lens: real pointer, or a short demo pass until the reader moves.
  let px = -1e4, py = -1e4, demo = !reduce, hover = -1, pinned = false;
  const tip = document.querySelector<HTMLElement>("#tip")!;
  const local = (e: PointerEvent) => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
  cv.addEventListener("pointermove", (e) => { demo = false; pinned = false; [px, py] = local(e); dirty = true; });
  cv.addEventListener("pointerleave", () => { if (!pinned) { px = py = -1e4; dirty = true; } });
  cv.addEventListener("pointerdown", (e) => {
    demo = false; [px, py] = local(e); dirty = true;
    if (e.pointerType !== "mouse") pinned = true; // touch: tap shows it, the tip holds the link
  });
  cv.addEventListener("click", () => {
    if (hover >= 0 && titles && !pinned) window.open(TALK_URL + titles.id[hover] + "/", "_blank", "noopener");
  });

  const rootStyle = getComputedStyle(document.documentElement);
  const rgb = (name: string) => (rootStyle.getPropertyValue(name).match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
  let lastColors = "";

  let frameNo = 0;
  const demoStart = 150, demoEnd = 420;
  const frame = () => {
    frameNo++;
    let moving = false;
    for (let i = 0; i < N; i++) {
      if (frameNo < wait[i]) { moving = true; continue; }
      const ax = (tx[i] - x[i]) * 0.07, ay = (ty[i] - y[i]) * 0.07;
      vx[i] = (vx[i] + ax) * 0.8; vy[i] = (vy[i] + ay) * 0.8;
      x[i] += vx[i]; y[i] += vy[i];
      if (Math.abs(vx[i]) + Math.abs(vy[i]) > 0.02) moving = true;
    }
    if (demo && frameNo > demoStart) {
      if (frameNo > demoEnd) { demo = false; px = py = -1e4; }
      else {
        const t = (frameNo - demoStart) / (demoEnd - demoStart);
        px = W * (0.18 + 0.64 * t); py = H - 34 - (H - 60) * (0.28 + 0.1 * Math.sin(t * Math.PI * 2));
      }
      dirty = true;
    }
    const bg = rgb("--bg"), ink = rgb("--ink"), accent = rgb("--accent"), colorKey = [bg, ink, accent].join();
    if (colorKey !== lastColors) { lastColors = colorKey; dirty = true; }
    if (moving || dirty) draw(ramp(bg, ink, accent));
    dirty = false;
    requestAnimationFrame(frame);
  };

  const draw = (colors: string[]) => {
    ctx.clearRect(0, 0, W, H);
    const R = Math.max(46, Math.min(80, W * 0.07));
    let best = -1, bd = 16 * 16;
    for (let g = 0; g < 5; g++) {
      for (let pass = 0; pass < 2; pass++) {
        ctx.fillStyle = colors[g];
        ctx.globalAlpha = pass === 0 && match ? 0.14 : 1;
        for (let i = 0; i < N; i++) {
          if (D.f[i] !== g) continue;
          const hit = match ? match[i] === 1 : false;
          if ((pass === 1) !== hit) continue;
          let dx = x[i] - px, dy = y[i] - py, s = size, qx = x[i], qy = y[i];
          const d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            const f = 1 - Math.sqrt(d2) / R;
            qx += dx * f * 0.9; qy += dy * f * 0.9; s = size * (1 + f * 2.3);
            if (d2 < bd) { bd = d2; best = i; }
          }
          ctx.fillRect(qx - s / 2, qy - s / 2, s, s);
        }
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgb(${rootStyle.getPropertyValue("--soft").match(/[\d.]+/g)?.slice(0, 3).join(" ")})`;
    ctx.font = '500 11px "JetBrains Mono Variable", monospace';
    ctx.textAlign = "center";
    for (const a of axis) a.lines.forEach((line, n) => ctx.fillText(line, a.x, axisY + n * 13));

    hover = best;
    cv.style.cursor = best >= 0 ? "pointer" : "default";
    if (best < 0) { tip.hidden = true; return; }
    const title = titles ? titles.t[best] : "";
    tip.replaceChildren();
    if (title) { const b = document.createElement("strong"); b.textContent = title; tip.append(b); }
    const meta = document.createElement("span");
    meta.textContent = `${D.speakers[D.s[best]]}, ${D.y[best]}`;
    const grade = document.createElement("span");
    grade.className = "tip-grade"; grade.textContent = GRADES[D.f[best]];
    tip.append(meta, grade);
    if (pinned && titles) {
      const a = document.createElement("a");
      a.href = TALK_URL + titles.id[best] + "/"; a.textContent = "Read it on Pulpit"; a.target = "_blank"; a.rel = "noopener";
      tip.append(a);
    }
    tip.hidden = false;
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    const left = Math.min(W - tw, Math.max(0, px + 18)), topPos = py - th - 18 < 0 ? py + 22 : py - th - 18;
    tip.style.transform = `translate(${Math.round(left)}px, ${Math.round(topPos)}px)`;
  };

  document.addEventListener("pointerdown", (e) => {
    if (pinned && !plot.contains(e.target as Node)) { pinned = false; px = py = -1e4; dirty = true; }
  });
  requestAnimationFrame(frame);
}

export {};
