// For each quotation in src/data/quotes.json: verify it against the live
// library, open SafetyPage's own viewer with the quote highlighted, and keep
// what the viewer shows: the page image (public/pages/<key>.webp) and where
// on it the highlight falls (written back into quotes.json as `page`).
// Run: node scripts/quote-pages.mjs   (Playwright from ~/development/tools/ui-check)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const SITE = "https://safetypage.noahairmet.com";
const API = "https://safetypage-api.noahairmet.com/api/verify";
const file = fileURLToPath(new URL("../src/data/quotes.json", import.meta.url));
const outDir = fileURLToPath(new URL("../public/pages/", import.meta.url));
mkdirSync(outDir, { recursive: true });
const data = JSON.parse(readFileSync(file, "utf8"));

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, colorScheme: "light" });
for (const q of data.quotes) {
  const res = await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quote: q.text, cite: q.cite }) });
  const v = await res.json();
  if (!v.passed) throw new Error(`${q.key}: the library says ${v.verdict}`);
  // and the slipped version must fail, or the demonstration shows nothing
  const [from, to] = q.slip;
  const wrong = q.text.replace(new RegExp(`\\b${from}\\b`), to);
  const w = await (await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quote: wrong, cite: q.cite }) })).json();
  if (wrong === q.text || w.passed) throw new Error(`${q.key}: the slip "${from}" -> "${to}" does not fail`);

  const path = q.cite.replace(":", "/");
  q.href = `${SITE}/d/${path}?q=${encodeURIComponent(q.text.replace(/\.$/, ""))}`;
  await page.goto(q.href, { waitUntil: "networkidle" });
  await page.waitForSelector(".hl", { timeout: 15000 });
  const found = await page.evaluate(() => {
    const first = document.querySelector(".hl");
    const sheet = first.parentElement;
    const box = sheet.getBoundingClientRect();
    const img = sheet.querySelector("img");
    const hl = [...sheet.querySelectorAll(".hl")].map((e) => {
      const r = e.getBoundingClientRect();
      return [(r.left - box.left) / box.width, (r.top - box.top) / box.height, r.width / box.width, r.height / box.height].map((n) => +n.toFixed(4));
    });
    return { src: img.currentSrc || img.src, hl };
  });
  const buf = Buffer.from(await (await fetch(found.src)).arrayBuffer());
  const out = await sharp(buf).resize({ width: 1100 }).webp({ quality: 80 }).toFile(`${outDir}${q.key}.webp`);
  q.page = { img: `/pages/${q.key}.webp`, w: out.width, h: out.height, hl: found.hl };
  console.log(q.key, v.verdict, `slip fails as ${w.verdict}`, `${out.width}x${out.height}`, `${Math.round(out.size / 1024)} KB`, found.hl.length, "highlights");
}
await browser.close();
writeFileSync(file, JSON.stringify(data, null, 2) + "\n");
