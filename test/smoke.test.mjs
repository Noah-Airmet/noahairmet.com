import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");
const read = (file) => readFileSync(join(dist, file), "utf8");
const walk = (directory) =>
  readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
const pages = () => walk(dist).filter((f) => f.endsWith(".html") && !f.includes("/bee/"));

test("the build emits every route, data file and control file", () => {
  for (const file of [
    "index.html", "404.html", "writing/index.html", "writing/professional-commitments/index.html",
    "rss.xml", "sitemap-index.xml", "resume/noah-airmet-resume.pdf", "bee/index.html", "bee/sw.js",
    "favicon.svg", "favicon.ico", "apple-touch-icon.png", "og/card.png", "boot.js",
    "_headers", "_redirects", "robots.txt", "data/timp.json", "data/last-out.json",
    "media/citationbench-replay.mp4", "media/citationbench-replay.webp",
  ]) assert.ok(existsSync(join(dist, file)), `${file} should exist in dist`);
});

test("every page works under the CSP: no inline scripts, styles or style attributes", () => {
  for (const file of pages()) {
    const html = readFileSync(file, "utf8");
    assert.doesNotMatch(html, /<style/, `${file}: inline <style>`);
    assert.doesNotMatch(html, /\sstyle="/, `${file}: style attribute`);
    for (const [tag] of html.matchAll(/<script\b[^>]*>/g)) {
      assert.match(tag, /\ssrc="\//, `${file}: inline or third-party script ${tag}`);
    }
    assert.doesNotMatch(html, /fonts\.googleapis|fonts\.gstatic|cdn\.|unpkg|jsdelivr/, `${file}: external asset`);
  }
});

test("pages carry the accessibility and metadata basics", () => {
  for (const file of pages()) {
    const html = readFileSync(file, "utf8");
    assert.match(html, /<a class="skip" href="#main">Skip to content<\/a>/, file);
    assert.match(html, /id="main"/, file);
    assert.match(html, /<meta name="description"/, file);
    assert.match(html, /<link rel="canonical" href="https:\/\/noahairmet\.com\//, file);
    const m = html.match(/<meta property="og:image" content="https:\/\/noahairmet\.com(\/[^"?]+)/);
    assert.ok(m && existsSync(join(dist, m[1])), `${file}: og:image exists`);
  }
});

test("the home page says who Noah is in real text, and how to reach him", () => {
  const home = read("index.html");
  assert.match(home, /<h1 class="name" id="name" aria-label="Noah Airmet">/);
  assert.match(home, /<span class="ln">Noah<\/span>\s*<span class="ln">Airmet<\/span>/);
  assert.match(home, /Lead Technical Fellow/);
  assert.match(home, /href="https:\/\/x\.com\/transfigurism"[^>]*>@transfigurism/);
  assert.match(home, /href="\/resume\/noah-airmet-resume\.pdf"/);
  assert.match(home, /href="mailto:noah\.airmet@icloud\.com"/);
});

test("the home page shows CitationBench's published runs and a SafetyPage quotation", () => {
  const home = read("index.html");
  const bench = JSON.parse(readFileSync(join(root, "src/data/citationbench.json"), "utf8"));
  assert.ok(bench.runs.length >= 1);
  for (const run of bench.runs) {
    assert.ok(home.includes(`data-id="${run.model}"`), `${run.model} row`);
    assert.ok(run.correct[1] <= run.correct[0] && run.correct[0] <= run.correct[2], `${run.model} interval brackets its mean`);
  }
  assert.match(home, /id="q"[^>]*>AI risk management is a key component/);
  assert.match(home, /safetypage\.noahairmet\.com\/d\/nist\//);
  // every quotation has its page scan and at least one highlight on it
  const { quotes } = JSON.parse(readFileSync(join(root, "src/data/quotes.json"), "utf8"));
  assert.ok(quotes.length >= 3);
  for (const q of quotes) {
    assert.ok(existsSync(join(dist, q.page.img)), `${q.key}: ${q.page.img}`);
    assert.ok(q.page.hl.length >= 1, `${q.key}: a highlight`);
    assert.ok(q.text.match(new RegExp(`\\b${q.slip[0]}\\b`)), `${q.key}: the slipped word is in the text`);
  }
});

// Noah, 2026-11-12: GSA and Pulpit are internal research tools and the clip
// farms aren't for the site. King Follett and Hymn Parts are for friends.
// The same day: no line about models rebuilding the site ("way too much
// explaining the design").
test("only what Noah wants advertised is on the site", () => {
  const files = walk(dist).filter((f) => /\.(html|css|js|xml|txt)$/.test(f) && !f.includes("/bee/"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /corpus\./i, `${file} must not reference corpus`);
    assert.doesNotMatch(text, /kingfollett\.|hymns\.noahairmet/i, `${file} must not link unlisted projects`);
    assert.doesNotMatch(text, /pulpit-archive|Gospel Scholar|clipfarm|gleaner/i, `${file} must not advertise internal tools`);
    assert.doesNotMatch(text, /frontier model|Claude Fable|Claude Opus/i, `${file} must not explain how the site was made`);
  }
});

test("redirects keep old URLs alive and cannot loop the résumé", () => {
  const redirects = read("_redirects");
  assert.doesNotMatch(redirects, /^\/resume\/\*/m);
  assert.match(redirects, /^\/resume \/resume\/noah-airmet-resume\.pdf 301$/m);
  assert.match(redirects, /^\/field-notes\/\* \/writing\/:splat 301$/m);
  assert.match(redirects, /^\/commitments\.html \/writing\/professional-commitments\/ 301$/m);
  assert.match(redirects, /^\/pulpit \/ 301$/m);
  assert.match(redirects, /^\/safetypage https:\/\/safetypage\.noahairmet\.com\/ 302$/m);
});

test("security headers allow exactly what the page calls", () => {
  const headers = read("_headers");
  assert.match(headers, /Content-Security-Policy: default-src 'self'/);
  assert.match(headers, /connect-src 'self' https:\/\/cloudflareinsights\.com https:\/\/safetypage-api\.noahairmet\.com;/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
  // Katie's app keeps its stricter policy.
  assert.match(headers, /\/bee\/\*\n\s+Content-Security-Policy: script-src 'self'; connect-src 'self'/);
});

test("styles are external, fonts self-hosted, reduced motion honored", () => {
  const assets = walk(join(dist, "_astro"));
  const css = assets.filter((f) => f.endsWith(".css")).map((f) => readFileSync(f, "utf8")).join("\n");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /prefers-color-scheme:\s*dark/);
  assert.ok(assets.filter((f) => f.endsWith(".woff2")).length >= 4, "four font files are self-hosted");
  assert.match(read("boot.js"), /prefers-reduced-motion/);
});

test("the terrain file is whole", () => {
  const timp = JSON.parse(read("data/timp.json"));
  assert.equal(timp.elev.length, timp.rows * timp.cols);
});

test("rss carries the writing", () => {
  const feed = read("rss.xml");
  assert.match(feed, /Professional commitments/);
  assert.match(feed, /\/writing\/professional-commitments\//);
});

test("built pages do not contain broken internal links", () => {
  for (const file of pages()) {
    const html = readFileSync(file, "utf8");
    for (const [, href] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const pathname = href.split(/[?#]/)[0];
      const target = pathname.endsWith("/") ? join(dist, pathname, "index.html") : join(dist, pathname);
      assert.ok(existsSync(target), `${file} links to missing ${pathname}`);
    }
  }
});
