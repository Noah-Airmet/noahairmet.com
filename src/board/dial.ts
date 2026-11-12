// The solar dial under the mountain: a 24-hour face with noon at the top, the
// day above the line from sunrise to sunset, and the sun on its circle. The
// page takes its colours from the sun (public/boot.js); turning the dial holds
// another time of day, and Now lets go of it.
import { clamp, onTick } from "./kit";

declare global {
  interface Window {
    sky: {
      sun(date: Date): number;
      held: Date | null;
      show(date: Date | null): void;
    };
  }
}

const DAY = 1440;
type RGB = [number, number, number];
/** The dial's own sky, by the sun's elevation: top of the day, its middle, the horizon. */
const SKIES: { at: number; top: RGB; mid: RGB; low: RGB }[] = [
  { at: 14, top: [34, 92, 220], mid: [78, 140, 240], low: [150, 200, 255] },
  { at: 5, top: [70, 86, 216], mid: [190, 130, 200], low: [255, 190, 130] },
  { at: 0, top: [78, 62, 186], mid: [226, 98, 150], low: [255, 152, 88] },
  { at: -5, top: [44, 38, 132], mid: [120, 60, 140], low: [206, 92, 120] },
  { at: -12, top: [20, 28, 92], mid: [22, 32, 100], low: [30, 40, 112] },
];

const mix = (a: RGB, b: RGB, t: number): RGB => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const css = (c: RGB, a = 1) => `rgb(${Math.round(c[0])} ${Math.round(c[1])} ${Math.round(c[2])} / ${a})`;

function skyAt(el: number) {
  if (el >= SKIES[0].at) return SKIES[0];
  const last = SKIES[SKIES.length - 1];
  if (el <= last.at) return last;
  for (let i = 0; i + 1 < SKIES.length; i++) {
    const a = SKIES[i];
    const b = SKIES[i + 1];
    if (el <= a.at && el >= b.at) {
      const t = (a.at - el) / (a.at - b.at);
      return { at: el, top: mix(a.top, b.top, t), mid: mix(a.mid, b.mid, t), low: mix(a.low, b.low, t) };
    }
  }
  return last;
}

export function startDial() {
  const root = document.getElementById("dial");
  const section = document.getElementById("sky");
  if (!root || !section || !window.sky) return;
  const cv = root.querySelector("canvas")!;
  const ctx = cv.getContext("2d")!;
  const what = document.getElementById("dial-what")!;
  const time = document.getElementById("dial-time")!;
  const off = document.getElementById("dial-off")!;
  const nowBtn = document.getElementById("dial-now") as HTMLButtonElement;
  section.hidden = false;

  // Provo's wall clock for today, whatever the visitor's own zone is.
  const zone = /GMT([+-]\d+)(?::(\d+))?/.exec(new Date().toLocaleString("en-US", { timeZone: "America/Denver", timeZoneName: "shortOffset" }));
  const offMin = zone ? Number(zone[1]) * 60 + (zone[2] ? Number(zone[2]) : 0) : -420;
  const wall = new Date(Date.now() + offMin * 60000);
  const midnight = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - offMin * 60000;
  const dateAt = (m: number) => new Date(midnight + m * 60000);
  const minuteOf = (d: Date) => (((d.getTime() - midnight) / 60000) % DAY + DAY) % DAY;
  const elev = (m: number) => window.sky.sun(dateAt(m));

  // The day's events: where the sun crosses the horizon and civil twilight, its highest and lowest.
  const events: { m: number; name: string }[] = [];
  let hi = 0;
  let lo = 0;
  for (let m = 1; m < DAY; m++) {
    const a = elev(m - 1);
    const b = elev(m);
    if ((a + 0.833) * (b + 0.833) < 0) events.push({ m, name: b > a ? "Sunrise" : "Sunset" });
    if ((a + 6) * (b + 6) < 0) events.push({ m, name: b > a ? "Dawn" : "Dusk" });
    if (b > elev(hi)) hi = m;
    if (b < elev(lo)) lo = m;
  }
  events.push({ m: hi, name: "Solar noon" }, { m: lo, name: "Midnight" });
  const rise = events.find((e) => e.name === "Sunrise")?.m ?? 360;
  const set = events.find((e) => e.name === "Sunset")?.m ?? 1080;

  let now = minuteOf(new Date());
  /** The minute the dial is held at, or null when it shows now. */
  let held: number | null = window.sky.held ? minuteOf(window.sky.held) : null;
  let dirty = true;

  const clock = (m: number, ampm = false) => {
    const h = Math.floor(m / 60);
    const mm = String(Math.floor(m % 60)).padStart(2, "0");
    return ampm ? `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}` : `${h % 12 || 12}:${mm}`;
  };
  const phase = (m: number) => {
    const near = events.find((e) => Math.abs(e.m - m) <= 4);
    if (near) return near.name;
    const e = elev(m);
    return e > -0.833 ? "Day" : e > -6 ? "Twilight" : "Night";
  };

  function read() {
    const m = held ?? now;
    what.textContent = held == null ? "Now" : phase(m);
    time.textContent = clock(m);
    if (held == null) off.textContent = "";
    else {
      const d = Math.round(m - now);
      const a = Math.abs(d);
      off.textContent = `${d < 0 ? "−" : "+"}${String(Math.floor(a / 60)).padStart(2, "0")}:${String(a % 60).padStart(2, "0")}`;
    }
    nowBtn.textContent = `Now ${clock(now, true)}`;
    nowBtn.disabled = held == null;
    root!.setAttribute("aria-valuenow", String(Math.round(m)));
    root!.setAttribute("aria-valuetext", `${clock(m, true)}, ${phase(m).toLowerCase()}`);
  }

  function hold(m: number | null) {
    // letting go near the present is letting go
    if (m != null && Math.abs(m - now) <= 4) m = null;
    held = m;
    window.sky.show(m == null ? null : dateAt(m));
    dirty = true;
    read();
  }

  const angle = (m: number) => -Math.PI / 2 + ((m - 720) / DAY) * Math.PI * 2;

  function draw() {
    const dpr = Math.min(2, devicePixelRatio || 1);
    const S = root!.clientWidth;
    if (cv.width !== Math.round(S * dpr)) cv.width = cv.height = Math.round(S * dpr);
    const R = (S / 2) * dpr;
    const c = R;
    const m = held ?? now;
    const e = elev(m);
    const sky = skyAt(e);
    const at = (mm: number, r: number) => [c + Math.cos(angle(mm)) * r, c + Math.sin(angle(mm)) * r];
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.clip();

    // night: the whole face, deepest at the foot
    const night = ctx.createLinearGradient(0, 0, 0, R * 2);
    night.addColorStop(0, "#1b2670");
    night.addColorStop(1, "#0a1238");
    ctx.fillStyle = night;
    ctx.fillRect(0, 0, R * 2, R * 2);

    // day: everything above the line from sunrise to sunset
    const [rx, ry] = at(rise, R);
    const [sx, sy] = at(set, R);
    const horizon = (ry + sy) / 2;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.arc(c, c, R, angle(rise), angle(set));
    ctx.closePath();
    const day = ctx.createLinearGradient(0, 0, 0, horizon);
    day.addColorStop(0, css(sky.top));
    day.addColorStop(0.62, css(sky.mid));
    day.addColorStop(1, css(sky.low));
    ctx.fillStyle = day;
    ctx.fill();
    // the glow where the sun meets the horizon
    const closeness = clamp(1 - Math.abs(e) / 9, 0, 1);
    if (closeness > 0) {
      const [gx, gy] = at(m, R * 0.66);
      ctx.save();
      ctx.clip();
      const glow = ctx.createRadialGradient(gx, horizon, 0, gx, horizon, R * 0.9);
      glow.addColorStop(0, css([255, 214, 150], 0.85 * closeness));
      glow.addColorStop(0.35, css([255, 140, 110], 0.4 * closeness));
      glow.addColorStop(1, css([255, 120, 140], 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, R * 2, R * 2);
      ctx.restore();
    }
    ctx.strokeStyle = "rgb(255 255 255 / 0.5)";
    ctx.lineWidth = dpr;
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.lineTo(sx, sy);
    ctx.stroke();

    // the hours: a tick every quarter, a numeral every other hour
    for (let i = 0; i < 96; i++) {
      const hour = i % 4 === 0;
      const [x0, y0] = at(i * 15, R * (hour ? 0.875 : 0.905));
      const [x1, y1] = at(i * 15, R * 0.965);
      ctx.strokeStyle = `rgb(255 255 255 / ${hour ? 0.85 : 0.4})`;
      ctx.lineWidth = dpr * (hour ? 1.4 : 1);
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();
    }
    ctx.fillStyle = "rgb(255 255 255 / 0.82)";
    ctx.font = `500 ${Math.max(9, S * 0.036) * dpr}px Martian, monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    for (let h = 2; h <= 24; h += 2) {
      const [x, y] = at((h % 24) * 60, R * 0.775);
      ctx.fillText(String(h).padStart(2, "0"), x, y);
    }

    // the sun's circle, the day's events on it, and the sun
    const path = R * 0.6;
    ctx.strokeStyle = "rgb(255 255 255 / 0.6)";
    ctx.lineWidth = dpr * 1.25;
    ctx.beginPath();
    ctx.arc(c, c, path, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgb(255 255 255 / 0.85)";
    for (const ev of events) {
      const [x, y] = at(ev.m, path);
      ctx.beginPath();
      ctx.arc(x, y, dpr * 2, 0, Math.PI * 2);
      ctx.fill();
    }
    const [ux, uy] = at(m, path);
    const up = e > -0.833;
    ctx.beginPath();
    ctx.arc(ux, uy, R * 0.055, 0, Math.PI * 2);
    ctx.fillStyle = up ? "#fff" : "#0a1238";
    ctx.shadowColor = up ? "rgb(255 240 200 / 0.9)" : "transparent";
    ctx.shadowBlur = up ? R * 0.12 : 0;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = dpr * 1.6;
    ctx.stroke();

    // where now is, when the dial is somewhere else
    if (held != null) {
      const [nx0, ny0] = at(now, R * 0.84);
      const [nx1, ny1] = at(now, R);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = dpr * 2.4;
      ctx.beginPath();
      ctx.moveTo(nx0, ny0);
      ctx.lineTo(nx1, ny1);
      ctx.stroke();
    }

    // the reading's own disc
    ctx.beginPath();
    ctx.arc(c, c, R * 0.4, 0, Math.PI * 2);
    ctx.fillStyle = "rgb(255 255 255 / 0.16)";
    ctx.fill();
    ctx.restore();
  }

  // ---- turning it
  const minuteFrom = (ev: PointerEvent) => {
    const r = root.getBoundingClientRect();
    const a = Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2));
    let m = ((a + Math.PI / 2) / (Math.PI * 2)) * DAY + 720;
    m = ((m % DAY) + DAY) % DAY;
    const near = events.find((e) => Math.abs(e.m - m) <= 5);
    return near ? near.m : Math.round(m);
  };
  let turning = false;
  root.addEventListener("pointerdown", (ev) => {
    turning = true;
    root.setPointerCapture(ev.pointerId);
    hold(minuteFrom(ev));
  });
  root.addEventListener("pointermove", (ev) => {
    if (turning) hold(minuteFrom(ev));
  });
  const done = () => (turning = false);
  root.addEventListener("pointerup", done);
  root.addEventListener("pointercancel", done);
  root.addEventListener("keydown", (ev) => {
    const m = held ?? now;
    const by = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 60, PageDown: -60 }[ev.key];
    if (by) {
      ev.preventDefault();
      hold((((Math.round(m / 5) * 5 + by) % DAY) + DAY) % DAY);
    } else if (ev.key === "Home" || ev.key === "Escape") {
      ev.preventDefault();
      hold(null);
    }
  });
  nowBtn.addEventListener("click", () => hold(null));

  let seen = false;
  new IntersectionObserver((e) => {
    seen = e.some((x) => x.isIntersecting);
    if (seen) dirty = true;
  }).observe(root);
  new ResizeObserver(() => (dirty = true)).observe(root);
  setInterval(() => {
    now = minuteOf(new Date());
    dirty = true;
    read();
  }, 30000);
  read();
  onTick(() => {
    if (!seen || !dirty) return;
    dirty = false;
    draw();
  });
  void document.fonts.ready.then(() => (dirty = true));
}
