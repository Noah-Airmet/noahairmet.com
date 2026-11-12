// Renders public/favicon.svg to the PNG and ICO browsers still ask for.
// Run: node scripts/icons.mjs   (uses the Playwright in ~/development/tools/ui-check)
import { writeFileSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const svg = readFileSync(new URL("../public/favicon.svg", import.meta.url), "utf8");
const browser = await chromium.launch({ channel: "chrome" });
const shot = async (px, full) => {
  const page = await browser.newPage({ viewport: { width: px, height: px }, deviceScaleFactor: 1 });
  // iOS rounds the corners itself, so its icon runs to the edges
  const art = full ? svg.replace('rx="7"', 'rx="0"') : svg;
  await page.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${px}px;height:${px}px}</style>${art}`);
  const png = await page.screenshot({ omitBackground: true });
  await page.close();
  return png;
};
writeFileSync(new URL("../public/apple-touch-icon.png", import.meta.url), await shot(180, true));
const png32 = await shot(32, false);
// An ICO that wraps one 32px PNG.
const head = Buffer.alloc(22);
head.writeUInt16LE(0, 0); head.writeUInt16LE(1, 2); head.writeUInt16LE(1, 4);
head.writeUInt8(32, 6); head.writeUInt8(32, 7); head.writeUInt8(0, 8); head.writeUInt8(0, 9);
head.writeUInt16LE(1, 10); head.writeUInt16LE(32, 12); head.writeUInt32LE(png32.length, 14); head.writeUInt32LE(22, 18);
writeFileSync(new URL("../public/favicon.ico", import.meta.url), Buffer.concat([head, png32]));
await browser.close();
console.log("apple-touch-icon.png, favicon.ico");
