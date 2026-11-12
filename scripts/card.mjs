// Records the share card from the card stage (/card/): the letters scatter and
// the agents set the name again.
//   public/media/card.mp4  the og:video that iMessage and Discord play, a loop
//                          that ends on the frame it starts on
//   public/og/card.png     the og:image everything else shows: a frame with
//                          about three letters still to set and every agent
//                          in the picture
// Run against a dev or preview server:
//   node scripts/card.mjs [--seed 7] [http://127.0.0.1:4321]
// then bump card.image's and card.video's v in src/site.ts so chat apps fetch
// the new files. Needs ffmpeg, and the Playwright in ~/development/tools/ui-check.
//
// The page runs on a clock this script drives (timers, frames and CSS motion
// alike), so every frame of the video is drawn at its exact time however long
// the screenshot takes. --seed fixes the page's dice: one seed, one take.
import { execFileSync } from "node:child_process";
import { mkdtempSync, statSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const args = process.argv.slice(2);
const seedAt = args.indexOf("--seed");
const SEED = seedAt >= 0 ? Number(args.splice(seedAt, 2)[1]) : 7;
const base = args[0] ?? "http://127.0.0.1:4321";
const W = 1200, H = 630, SCALE = 2.5, FPS = 30;
const BEFORE = 0.8, AFTER = 1.2, LIMIT = 30; // seconds at rest before and after; the most a take may run
const root = fileURLToPath(new URL("../", import.meta.url));
const frames = mkdtempSync(join(tmpdir(), "card-"));

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: { width: W / SCALE, height: H / SCALE }, deviceScaleFactor: SCALE });
const page = await ctx.newPage();
page.on("pageerror", (e) => console.error(String(e)));
await page.addInitScript((seed) => {
  let a = seed >>> 0; // mulberry32
  Math.random = () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}, SEED);
await page.clock.install({ time: new Date("2026-06-15T16:30:00Z") });
// ?at pins the sky to mid-morning, so the card is the same whenever it is taken
await page.goto(`${base}/card/?at=10:30`);
// (a dev server may reload the page once while it warms up: ask again)
const ready = () => page.evaluate(() => document.documentElement.dataset.card === "ready").catch(() => false);
for (let i = 0; i < 150 && !(await ready()); i++) await new Promise((r) => setTimeout(r, 100));
if (!(await ready())) throw new Error("the card stage never came up");
await new Promise((r) => setTimeout(r, 500));
await page.clock.pauseAt(new Date("2026-06-15T16:31:00Z"));

/** Advance the page by one frame: its timers and frames, then its CSS motion. */
const step = 1000 / FPS;
async function tick() {
  await page.clock.runFor(step);
  await page.evaluate((ms) => {
    const at = (window.__at ??= new WeakMap());
    for (const a of document.getAnimations()) {
      if (!at.has(a)) {
        a.pause();
        at.set(a, 0);
      }
      const t = at.get(a) + ms;
      at.set(a, t);
      if (t >= a.effect.getComputedTiming().endTime) a.finish();
      else a.currentTime = t;
    }
  }, step);
}
const look = () =>
  page.evaluate(() => {
    const pcs = [...document.querySelectorAll(".pc")];
    return {
      set: pcs.filter((p) => p.dataset.s === "set").length,
      of: pcs.length,
      // everything that moves or fades: where the agents are, what is drawn on the board, what is animating
      scene: [...document.querySelectorAll(".board > *")].map((n) => n.className + n.style.transform).join("|"),
      moving: document.getAnimations().length,
      // are the agents and their names wholly in the picture?
      inside: [...document.querySelectorAll(".ag, .ag-tag")].every((n) => {
        const r = n.getBoundingClientRect();
        return r.left >= 4 && r.top >= 4 && r.right <= innerWidth - 4 && r.bottom <= innerHeight - 4;
      }),
    };
  });
let n = 0;
async function shoot() {
  await page.screenshot({ path: join(frames, `f${String(n++).padStart(5, "0")}.png`) });
}

for (let i = 0; i < 30; i++) await tick(); // the agents have faded in, nothing is moving
const rest = await look();
for (let i = 0; i < BEFORE * FPS; i++) {
  await shoot();
  await tick();
}
await page.evaluate(() => document.getElementById("scatter").click());
const stills = []; // frames that could be the still, best first once sorted
let settled = 0;
while (settled < AFTER * FPS) {
  if (n > LIMIT * FPS) throw new Error("the name was never set again");
  await shoot();
  await tick();
  const now = await look();
  const left = now.of - now.set;
  if (left >= 2 && left <= 4) stills.push({ n, score: (now.inside ? 0 : 10) + Math.abs(left - 3) });
  settled = now.set === now.of && now.scene === rest.scene && !now.moving ? settled + 1 : 0;
}
await browser.close();

const still = stills.sort((x, y) => x.score - y.score || x.n - y.n)[0].n;
const video = join(root, "public/media/card.mp4");
const image = join(root, "public/og/card.png");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(FPS), "-i", join(frames, "f%05d.png"), "-an",
  "-c:v", "libx264", "-preset", "veryslow", "-crf", "24", "-tune", "animation", "-pix_fmt", "yuv420p", "-movflags", "+faststart", video]);
await sharp(join(frames, `f${String(still).padStart(5, "0")}.png`)).png({ palette: true, quality: 92, effort: 10 }).toFile(image);
const kb = (f) => `${Math.round(statSync(f).size / 1024)} KB`;
console.log(`${video} ${(n / FPS).toFixed(1)} s, ${kb(video)}\n${image} frame ${still}, ${kb(image)}\nframes in ${frames}`);
