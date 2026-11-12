// The solar dial under the mountain, after the Apple Watch face of that name.
//
// A 24-hour face, noon at the top and midnight at the foot. The sun rides a
// circle once a day. The day is a wedge out of the centre between sunrise and
// sunset; beside it, narrowing bands for civil, nautical and astronomical
// twilight (the sun 6, 12 and 18 degrees under the horizon), then night: five
// shades in all. Every one of those crossings is a dot on the sun's circle,
// with solar noon and solar midnight. All of it is worked out from the sun's
// real elevation over Provo today, so the wedge widens and narrows through the
// year. The clock in the middle sits opposite the sun.
//
// The page takes its colours from the same sun (public/boot.js). Turning the
// dial holds another time of day; Now lets go of it.
import { clamp, onTick } from "./kit";
import { click } from "./sound";

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
/** The day wedge's sky, by the sun's elevation: its top, its middle, and down by the horizon. */
const SKIES: { at: number; top: RGB; mid: RGB; low: RGB }[] = [
  { at: 14, top: [38, 98, 226], mid: [70, 132, 240], low: [128, 184, 255] },
  { at: 5, top: [72, 88, 220], mid: [176, 124, 206], low: [255, 186, 128] },
  { at: 0, top: [80, 64, 190], mid: [224, 98, 152], low: [255, 150, 86] },
  { at: -6, top: [52, 46, 150], mid: [128, 66, 150], low: [214, 96, 124] },
  // with the sun well down the wedge is still the lightest of the five shades
  { at: -12, top: [56, 72, 176], mid: [66, 78, 180], low: [98, 84, 176] },
  { at: -18, top: [54, 72, 174], mid: [58, 76, 178], low: [62, 80, 182] },
];
/** The darker shades, lightest first: civil, nautical, astronomical, night. */
const BANDS: RGB[] = [
  [38, 52, 150],
  [28, 40, 124],
  [20, 30, 100],
  [12, 20, 72],
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

/** The crossings, outermost first: [degrees under the horizon, morning name, evening name]. */
const LINES: [number, string, string][] = [
  [-18, "Astronomical dawn", "Astronomical dusk"],
  [-12, "Nautical dawn", "Nautical dusk"],
  [-6, "Civil dawn", "Civil dusk"],
  [-0.833, "Sunrise", "Sunset"],
];

export function startDial() {
  const root = document.getElementById("dial");
  const section = document.getElementById("sky");
  if (!root || !section || !window.sky) return;
  const cv = root.querySelector("canvas")!;
  const ctx = cv.getContext("2d")!;
  const readout = root.querySelector<HTMLElement>(".dial-read")!;
  const what = document.getElementById("dial-what")!;
  const time = document.getElementById("dial-time")!;
  const off = document.getElementById("dial-off")!;
  const nowBtn = document.getElementById("dial-now") as HTMLButtonElement;
  const dayEl = document.getElementById("dial-day");
  section.hidden = false;

  // Provo's wall clock for today, whatever the visitor's own zone is.
  const zone = /GMT([+-]\d+)(?::(\d+))?/.exec(new Date().toLocaleString("en-US", { timeZone: "America/Denver", timeZoneName: "shortOffset" }));
  const offMin = zone ? Number(zone[1]) * 60 + (zone[2] ? Number(zone[2]) : 0) : -420;
  const wall = new Date(Date.now() + offMin * 60000);
  const midnight = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - offMin * 60000;
  const dateAt = (m: number) => new Date(midnight + m * 60000);
  const minuteOf = (d: Date) => (((d.getTime() - midnight) / 60000) % DAY + DAY) % DAY;
  const elev = (m: number) => window.sky.sun(dateAt(m));

  // Today's crossings, read off the sun's own elevation minute by minute.
  const events: { m: number; name: string }[] = [];
  /** For each line, the minute it is crossed in the morning and in the evening (or null: it never is today). */
  const cross: { dawn: number | null; dusk: number | null }[] = LINES.map(() => ({ dawn: null, dusk: null }));
  let hi = 0;
  let lo = 0;
  for (let m = 1; m < DAY; m++) {
    const a = elev(m - 1);
    const b = elev(m);
    LINES.forEach(([deg, dawn, dusk], i) => {
      if ((a - deg) * (b - deg) >= 0) return;
      if (b > a) {
        cross[i].dawn = m;
        events.push({ m, name: dawn });
      } else {
        cross[i].dusk = m;
        events.push({ m, name: dusk });
      }
    });
    if (b > elev(hi)) hi = m;
    if (b < elev(lo)) lo = m;
  }
  events.push({ m: hi, name: "Solar noon" }, { m: lo, name: "Solar midnight" });
  const sunUp = cross[3];
  if (dayEl && sunUp.dawn != null && sunUp.dusk != null) {
    const len = sunUp.dusk - sunUp.dawn;
    dayEl.textContent = `Daylight ${Math.floor(len / 60)}h ${String(len % 60).padStart(2, "0")}m`;
  }

  let now = minuteOf(new Date());
  /** The minute the dial is held at, or null when it shows now. */
  let held: number | null = window.sky.held ? minuteOf(window.sky.held) : null;
  let dirty = true;
  let lastEvent = "";

  const clock = (m: number, ampm = false) => {
    const h = Math.floor(m / 60);
    const mm = String(Math.floor(m % 60)).padStart(2, "0");
    return ampm ? `${h % 12 || 12}:${mm} ${h < 12 ? "AM" : "PM"}` : `${h % 12 || 12}:${mm}`;
  };
  const near = (m: number, within: number) => events.find((e) => Math.abs(e.m - m) <= within);
  const phase = (m: number) => {
    const ev = near(m, 3);
    if (ev) return ev.name;
    const e = elev(m);
    return e > -0.833 ? "Day" : e > -6 ? "Civil twilight" : e > -12 ? "Nautical twilight" : e > -18 ? "Astronomical twilight" : "Night";
  };

  function read() {
    const m = held ?? now;
    what.textContent = phase(m);
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
    // crossing one of the day's marks is felt: a click if sound is on, a tick on phones that can
    const ev = m == null ? "" : (near(m, 0)?.name ?? "");
    if (ev && ev !== lastEvent) {
      click();
      navigator.vibrate?.(6);
    }
    lastEvent = ev;
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
    /** The wedge out of the centre from one minute round through noon to another. */
    const wedge = (from: number, to: number) => {
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, R * 1.02, angle(from), angle(to));
      ctx.closePath();
    };
    ctx.clearRect(0, 0, cv.width, cv.height);
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, Math.PI * 2);
    ctx.clip();

    // night, the darkest of the five shades, over the whole face
    ctx.fillStyle = css(BANDS[3]);
    ctx.fillRect(0, 0, R * 2, R * 2);
    // then each twilight inside the last: astronomical, nautical, civil
    for (let i = 0; i < 3; i++) {
      const { dawn, dusk } = cross[i];
      if (dawn == null || dusk == null) continue;
      wedge(dawn, dusk);
      ctx.fillStyle = css(BANDS[2 - i]);
      ctx.fill();
    }
    // and the day, lit by wherever the sun is
    const dawn = sunUp.dawn ?? 360;
    const dusk = sunUp.dusk ?? 1080;
    wedge(dawn, dusk);
    const day = ctx.createLinearGradient(0, c - R, 0, c + R * 0.12);
    day.addColorStop(0, css(sky.top));
    day.addColorStop(0.55, css(sky.mid));
    day.addColorStop(1, css(sky.low));
    ctx.fillStyle = day;
    ctx.fill();
    // the glow, when the sun is near the horizon: over the day and the first of the twilight
    const closeness = clamp(1 - Math.abs(e + 1) / 10, 0, 1);
    if (closeness > 0) {
      const [gx, gy] = at(m, R * 0.655);
      ctx.save();
      const civil = cross[2];
      wedge(civil.dawn ?? dawn, civil.dusk ?? dusk);
      ctx.clip();
      const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.95);
      glow.addColorStop(0, css([255, 216, 150], 0.9 * closeness));
      glow.addColorStop(0.3, css([255, 142, 108], 0.46 * closeness));
      glow.addColorStop(1, css([255, 110, 150], 0));
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, R * 2, R * 2);
      ctx.restore();
    }
    // the lines themselves, straight out of the centre: the horizon's bright, the twilights' faint
    cross.forEach(({ dawn: a, dusk: b }, i) => {
      ctx.strokeStyle = `rgb(255 255 255 / ${i === 3 ? 0.62 : 0.2})`;
      ctx.lineWidth = dpr * (i === 3 ? 1.2 : 1);
      for (const mm of [a, b]) {
        if (mm == null) continue;
        const [x, y] = at(mm, R);
        ctx.beginPath();
        ctx.moveTo(c, c);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
    });

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
      const [x, y] = at((h % 24) * 60, R * 0.79);
      ctx.fillText(String(h).padStart(2, "0"), x, y);
    }

    // the sun's circle, and a dot for each of the day's crossings
    const track = R * 0.655;
    ctx.strokeStyle = "rgb(255 255 255 / 0.62)";
    ctx.lineWidth = dpr * 1.25;
    ctx.beginPath();
    ctx.arc(c, c, track, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "rgb(255 255 255 / 0.9)";
    for (const ev of events) {
      const [x, y] = at(ev.m, track);
      ctx.beginPath();
      ctx.arc(x, y, dpr * 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // the clock's own dial, opposite the sun
    const [ux, uy] = [Math.cos(angle(m)), Math.sin(angle(m))];
    const ix = c - ux * R * 0.18;
    const iy = c - uy * R * 0.18;
    const ir = R * 0.5;
    // nearly solid, in the sky's own colours: the lines behind it don't show through
    const face = ctx.createLinearGradient(0, iy - ir, 0, iy + ir);
    face.addColorStop(0, css(mix(sky.mid, [255, 255, 255], 0.1), 0.94));
    face.addColorStop(1, css(mix(sky.top, BANDS[1], 0.5), 0.94));
    ctx.beginPath();
    ctx.arc(ix, iy, ir, 0, Math.PI * 2);
    ctx.fillStyle = face;
    ctx.fill();
    ctx.strokeStyle = "rgb(255 255 255 / 0.72)";
    ctx.lineWidth = dpr * 1.2;
    for (let i = 0; i < 60; i++) {
      const a = (i / 60) * Math.PI * 2;
      const r0 = ir * (i % 5 === 0 ? 0.86 : 0.9);
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0);
      ctx.lineTo(ix + Math.cos(a) * ir * 0.96, iy + Math.sin(a) * ir * 0.96);
      ctx.stroke();
    }
    readout.style.setProperty("--ix", `${((ix - c) / dpr).toFixed(1)}px`);
    readout.style.setProperty("--iy", `${((iy - c) / dpr).toFixed(1)}px`);

    // the sun: lit above the horizon, dark below it, and half of each as it crosses
    const sx = c + ux * track;
    const sy = c + uy * track;
    const sr = R * 0.058;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = css(BANDS[3]);
    ctx.fill();
    ctx.save();
    wedge(dawn, dusk);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "rgb(255 240 200 / 0.9)";
    ctx.shadowBlur = R * 0.12;
    ctx.fill();
    ctx.restore();
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = dpr * 1.6;
    ctx.stroke();

    // where now is, when the dial is somewhere else
    if (held != null) {
      const [nx0, ny0] = at(now, R * 0.86);
      const [nx1, ny1] = at(now, R);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = dpr * 2.4;
      ctx.beginPath();
      ctx.moveTo(nx0, ny0);
      ctx.lineTo(nx1, ny1);
      ctx.stroke();
    }
    ctx.restore();
  }

  // ---- turning it
  const minuteFrom = (ev: PointerEvent) => {
    const r = root.getBoundingClientRect();
    const a = Math.atan2(ev.clientY - (r.top + r.height / 2), ev.clientX - (r.left + r.width / 2));
    let m = ((a + Math.PI / 2) / (Math.PI * 2)) * DAY + 720;
    m = ((m % DAY) + DAY) % DAY;
    const snap = near(m, 4);
    return snap ? snap.m : Math.round(m);
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
