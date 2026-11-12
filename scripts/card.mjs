// Takes the share card: the home page at 1200x630, caught while the agents are
// still setting the name. Run against a dev or preview server:
//   node scripts/card.mjs [http://127.0.0.1:4321/]
// then bump card.image's v in src/site.ts so chat apps fetch the new file.
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const url = process.argv[2] ?? "http://127.0.0.1:4321/";
const out = fileURLToPath(new URL("../public/og/card.png", import.meta.url));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.goto(url);
// Wait for the moment most of the name is set and a few letters are still in the air.
await page.waitForFunction(
  () => {
    const pcs = [...document.querySelectorAll(".pc")];
    const set = pcs.filter((p) => p.dataset.s === "set").length;
    return pcs.length > 0 && set >= pcs.length - 3 && set < pcs.length - 1;
  },
  null,
  { polling: 16, timeout: 8000 },
);
await page.screenshot({ path: out });
await browser.close();
console.log(out);
