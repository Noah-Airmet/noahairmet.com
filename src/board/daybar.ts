// The day bar at the foot of the page: one strip, midnight to midnight in
// Provo, coloured as the page itself is coloured at each hour. The page takes
// its colours from the sun (public/boot.js); sliding the mark holds another
// time of day, and Now lets go of it. Sunrise and sunset are marked from the
// sun's real elevation today, so they move through the year.
import { clamp } from "./kit";
import { click } from "./sound";

declare global {
  interface Window {
    sky: {
      sun(date: Date): number;
      held: Date | null;
      show(date: Date | null): void;
      paper(date: Date): string;
    };
  }
}

const DAY = 1440;

export function startDaybar() {
  const section = document.getElementById("sky");
  const bar = document.getElementById("daybar");
  if (!section || !bar || !window.sky) return;
  const strip = bar.querySelector<HTMLElement>(".day-strip")!;
  const mark = bar.querySelector<HTMLElement>(".day-mark")!;
  const time = document.getElementById("day-time")!;
  const what = document.getElementById("day-what")!;
  const nowBtn = document.getElementById("day-now") as HTMLButtonElement;
  section.hidden = false;

  // Provo's wall clock for today, whatever the visitor's own zone is.
  const zone = /GMT([+-]\d+)(?::(\d+))?/.exec(new Date().toLocaleString("en-US", { timeZone: "America/Denver", timeZoneName: "shortOffset" }));
  const offMin = zone ? Number(zone[1]) * 60 + (zone[2] ? Number(zone[2]) : 0) : -420;
  const wall = new Date(Date.now() + offMin * 60000);
  const midnight = Date.UTC(wall.getUTCFullYear(), wall.getUTCMonth(), wall.getUTCDate()) - offMin * 60000;
  const dateAt = (m: number) => new Date(midnight + m * 60000);
  const minuteOf = (d: Date) => clamp((d.getTime() - midnight) / 60000, 0, DAY - 1);
  const elev = (m: number) => window.sky.sun(dateAt(m));

  // The strip is the page's own ground, hour by hour.
  const stops: string[] = [];
  for (let m = 0; m <= DAY; m += 6) stops.push(`${window.sky.paper(dateAt(m))} ${((m / DAY) * 100).toFixed(2)}%`);
  strip.style.backgroundImage = `linear-gradient(to right, ${stops.join(", ")})`;

  // Today's marks: where the sun crosses the horizon and civil twilight, and its highest point.
  const events: { m: number; name: string }[] = [];
  let hi = 0;
  for (let m = 1; m < DAY; m++) {
    const a = elev(m - 1);
    const b = elev(m);
    if ((a + 0.833) * (b + 0.833) < 0) events.push({ m, name: b > a ? "Sunrise" : "Sunset" });
    if ((a + 6) * (b + 6) < 0) events.push({ m, name: b > a ? "Dawn" : "Dusk" });
    if (b > elev(hi)) hi = m;
  }
  events.push({ m: hi, name: "Solar noon" });

  const clock = (m: number) => {
    const h = Math.floor(m / 60);
    return `${h % 12 || 12}:${String(Math.floor(m % 60)).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  // sunrise and sunset get a tick and their time under the strip
  for (const ev of events) {
    if (ev.name !== "Sunrise" && ev.name !== "Sunset") continue;
    const tick = document.createElement("span");
    tick.className = "day-event";
    tick.style.left = `${(ev.m / DAY) * 100}%`;
    tick.textContent = clock(ev.m).replace(/ [AP]M$/, "");
    tick.title = ev.name;
    bar.querySelector(".day-scale")!.append(tick);
  }

  let now = minuteOf(new Date());
  /** The minute being held, or null when the bar shows now. */
  let held: number | null = window.sky.held ? minuteOf(window.sky.held) : null;
  let lastEvent = "";

  const near = (m: number, within: number) => events.find((e) => Math.abs(e.m - m) <= within);
  const phase = (m: number) => {
    const ev = near(m, 3);
    if (ev) return ev.name;
    const e = elev(m);
    return e > -0.833 ? "Day" : e > -6 ? "Twilight" : "Night";
  };

  function read() {
    const m = held ?? now;
    mark.style.left = `${(m / DAY) * 100}%`;
    time.textContent = clock(m);
    what.textContent = phase(m);
    nowBtn.hidden = held == null;
    bar!.setAttribute("aria-valuenow", String(Math.round(m)));
    bar!.setAttribute("aria-valuetext", `${clock(m)}, ${phase(m).toLowerCase()}`);
  }

  function hold(m: number | null) {
    // letting go near the present is letting go
    if (m != null && Math.abs(m - now) <= 4) m = null;
    held = m;
    window.sky.show(m == null ? null : dateAt(m));
    read();
    // crossing one of the day's marks is felt: a click if sound is on, a tick on phones that can
    const ev = m == null ? "" : (near(m, 0)?.name ?? "");
    if (ev && ev !== lastEvent) {
      click();
      navigator.vibrate?.(6);
    }
    lastEvent = ev;
  }

  const minuteFrom = (ev: PointerEvent) => {
    const r = strip.getBoundingClientRect();
    const m = clamp(((ev.clientX - r.left) / r.width) * DAY, 0, DAY - 1);
    const snap = near(m, 5);
    return snap ? snap.m : Math.round(m);
  };
  let sliding = false;
  bar.addEventListener("pointerdown", (ev) => {
    sliding = true;
    bar.setPointerCapture(ev.pointerId);
    hold(minuteFrom(ev));
  });
  bar.addEventListener("pointermove", (ev) => {
    if (sliding) hold(minuteFrom(ev));
  });
  const done = () => (sliding = false);
  bar.addEventListener("pointerup", done);
  bar.addEventListener("pointercancel", done);
  bar.addEventListener("keydown", (ev) => {
    const m = held ?? now;
    const by = { ArrowRight: 5, ArrowUp: 5, ArrowLeft: -5, ArrowDown: -5, PageUp: 60, PageDown: -60 }[ev.key];
    if (by) {
      ev.preventDefault();
      hold(clamp(Math.round(m / 5) * 5 + by, 0, DAY - 1));
    } else if (ev.key === "Home" || ev.key === "Escape") {
      ev.preventDefault();
      hold(null);
    }
  });
  nowBtn.addEventListener("click", () => hold(null));

  setInterval(() => {
    now = minuteOf(new Date());
    read();
  }, 30000);
  read();
}
