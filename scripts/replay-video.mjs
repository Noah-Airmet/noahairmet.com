// Records the CitationBench replay shown on the home page: plays one run from
// SafetyPage's own replay player and encodes it small.
//   node scripts/replay-video.mjs [/r/<replay id>]
// Needs ffmpeg, and the Playwright in ~/development/tools/ui-check. If the
// replay changes, set `replay` in src/pages/index.astro to match.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readdirSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const replay = process.argv[2] ?? "/r/cc-haiku-5-5-4e1c63-pc-4bd058594c.1";
const media = fileURLToPath(new URL("../public/media/", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "replay-"));
const size = { width: 1200, height: 750 };

const browser = await chromium.launch({ channel: "chrome" });
const ctx = await browser.newContext({ viewport: size, colorScheme: "light", recordVideo: { dir, size } });
const page = await ctx.newPage();
const t0 = Date.now();
await page.goto(`https://safetypage.noahairmet.com${replay}`, { waitUntil: "networkidle" });
const lead = (Date.now() - t0) / 1000;
// play to the last step, then hold on the result
await page.waitForFunction(
  () => {
    const m = document.body.innerText.match(/(\d+) \/ (\d+)/);
    return m && m[1] === m[2];
  },
  null,
  { timeout: 120000, polling: 250 },
);
await page.waitForTimeout(3000);
const length = (Date.now() - t0) / 1000 - lead;
await ctx.close();
await browser.close();

const raw = join(dir, readdirSync(dir).find((f) => f.endsWith(".webm")));
const out = join(media, "citationbench-replay.mp4");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-ss", String(Math.max(0, lead - 0.3)), "-t", String(length), "-i", raw, "-an",
  "-vf", `fps=15,scale=${size.width}:${size.height}:flags=lanczos`, "-c:v", "libx264", "-preset", "veryslow", "-crf", "30",
  "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
// the poster is the run's last frame: every citation checked
const still = join(dir, "last.png");
execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-sseof", "-0.5", "-i", out, "-frames:v", "1", still]);
await sharp(still).webp({ quality: 82 }).toFile(join(media, "citationbench-replay.webp"));
console.log(out, `${length.toFixed(1)} s`);
