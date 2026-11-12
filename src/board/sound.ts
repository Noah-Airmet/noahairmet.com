// Sound is off until asked for (the bar's Sound control). Everything is
// synthesized: a thud when letters land, scaled by how hard; a small click when
// something is set back in place.
let ctx: AudioContext | null = null;
let on = false;
let lastThud = 0;

try {
  on = localStorage.getItem("sound") === "1";
} catch {
  /* private mode */
}

const btn = document.getElementById("sound") as HTMLButtonElement | null;

function show() {
  if (!btn) return;
  btn.setAttribute("aria-pressed", String(on));
  btn.textContent = on ? "Sound on" : "Sound off";
}

function audio() {
  if (!on) return null;
  ctx ??= new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

export function startSound() {
  show();
  btn?.addEventListener("click", () => {
    on = !on;
    try {
      localStorage.setItem("sound", on ? "1" : "0");
    } catch {
      /* private mode */
    }
    show();
    if (on) click();
  });
}

/** Something heavy landed. force is 0..1. */
export function thud(force: number) {
  const now = performance.now();
  if (force < 0.08 || now - lastThud < 45) return;
  const a = audio();
  if (!a) return;
  lastThud = now;
  const t = a.currentTime;
  const f = Math.min(1, force);
  // the body: a low sine that drops
  const osc = a.createOscillator();
  const og = a.createGain();
  osc.frequency.setValueAtTime(120 + 60 * f, t);
  osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
  og.gain.setValueAtTime(0.5 * f, t);
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
  osc.connect(og).connect(a.destination);
  osc.start(t);
  osc.stop(t + 0.17);
  // the surface: a short burst of filtered noise
  const len = Math.floor(a.sampleRate * 0.05);
  const buf = a.createBuffer(1, len, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = a.createBufferSource();
  src.buffer = buf;
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 500 + 1800 * f;
  const ng = a.createGain();
  ng.gain.value = 0.22 * f;
  src.connect(lp).connect(ng).connect(a.destination);
  src.start(t);
}

/** Something was set exactly in place. */
export function click() {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  for (const [freq, at, vol] of [
    [2100, 0, 0.07],
    [1350, 0.018, 0.05],
  ] as const) {
    const osc = a.createOscillator();
    const g = a.createGain();
    osc.type = "triangle";
    // never quite the same click twice
    osc.frequency.value = freq * (0.97 + Math.random() * 0.06);
    g.gain.setValueAtTime(vol, t + at);
    g.gain.exponentialRampToValueAtTime(0.0005, t + at + 0.03);
    osc.connect(g).connect(a.destination);
    osc.start(t + at);
    osc.stop(t + at + 0.04);
  }
}
