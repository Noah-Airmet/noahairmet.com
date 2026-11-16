// Photographs the share card (/card/) into public/og/card.png, the og:image.
// Run against a dev or preview server:
//   node scripts/card.mjs [http://127.0.0.1:4321]
// then bump card.image's v in src/site.ts so chat apps fetch the new file.
// Uses the Playwright in ~/development/tools/ui-check.
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const base = process.argv[2] ?? "http://127.0.0.1:4321";
const out = fileURLToPath(new URL("../public/og/card.png", import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
// ?still holds the sky at noon, so the card is always the day's colours
await page.goto(`${base}/card/?still`, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
