// Checks the site's quotations against the live library and fetches what the
// page slab shows.
//
// src/data/quotes.json (the quote check): each quotation must pass the
// library's verifier and its slipped wording must fail; `href` is written back.
//
// src/data/asks.json (the Catchword card): each answer's quote must pass; then
// Catchword's own viewer is opened with the quote highlighted, and what it
// shows is kept: the page image (public/pages/<key>.webp) and where on it the
// highlight falls (written back as `page`).
//
// Run: node scripts/quote-pages.mjs   (Playwright from ~/development/tools/ui-check)
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
const { chromium } = await import(`${homedir()}/development/tools/ui-check/node_modules/playwright/index.mjs`);

const SITE = "https://safetypage.noahairmet.com";
const API = "https://safetypage-api.noahairmet.com/api/verify";
const at = (p) => fileURLToPath(new URL(p, import.meta.url));
const outDir = at("../public/pages/");
mkdirSync(outDir, { recursive: true });
const verify = async (quote, cite) =>
  (await fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ quote, cite }) })).json();
const link = (cite, quote) => `${SITE}/d/${cite.replace(":", "/")}?q=${encodeURIComponent(quote.replace(/\.$/, ""))}`;

const quotes = JSON.parse(readFileSync(at("../src/data/quotes.json"), "utf8"));
for (const q of quotes.quotes) {
  const v = await verify(q.text, q.cite);
  if (!v.passed) throw new Error(`${q.key}: the library says ${v.verdict}`);
  // and the slipped version must fail, or the demonstration shows nothing
  const [from, to] = q.slip;
  const wrong = q.text.replace(new RegExp(`\\b${from}\\b`), to);
  const w = await verify(wrong, q.cite);
  if (wrong === q.text || w.passed) throw new Error(`${q.key}: the slip "${from}" -> "${to}" does not fail`);
  q.href = link(q.cite, q.text);
  delete q.page;
  console.log(q.key, v.verdict, `slip fails as ${w.verdict}`);
}
writeFileSync(at("../src/data/quotes.json"), JSON.stringify(quotes, null, 2) + "\n");

const asks = JSON.parse(readFileSync(at("../src/data/asks.json"), "utf8"));
const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 1200, height: 1400 }, colorScheme: "light" });
for (const a of asks.asks) {
  const v = await verify(a.quote, a.cite);
  if (!v.passed) throw new Error(`${a.key}: the library says ${v.verdict}`);
  a.href = link(a.cite, a.quote);
  await page.goto(a.href, { waitUntil: "networkidle" });
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
  const out = await sharp(buf).resize({ width: 1100 }).webp({ quality: 80 }).toFile(`${outDir}${a.key}.webp`);
  a.page = { img: `/pages/${a.key}.webp`, w: out.width, h: out.height, hl: found.hl };
  console.log(a.key, v.verdict, `${out.width}x${out.height}`, `${Math.round(out.size / 1024)} KB`, found.hl.length, "highlights");
}
await browser.close();
writeFileSync(at("../src/data/asks.json"), JSON.stringify(asks, null, 2) + "\n");
