import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");
const read = (file) => readFileSync(join(dist, file), "utf8");
const walk = (directory) => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});
const pages = () => walk(dist).filter((f) => f.endsWith(".html") && !f.includes("/bee/"));

test("static build emits every route, data file, and control file", () => {
  for (const file of [
    "index.html", "404.html", "pulpit/index.html", "writing/index.html",
    "writing/professional-commitments/index.html", "rss.xml", "sitemap-index.xml",
    "resume/noah-airmet-resume.pdf", "bee/index.html", "bee/sw.js", "favicon.svg",
    "_headers", "_redirects", "robots.txt", "sky.js",
    "data/timp.json", "data/pulpit-core.json", "data/pulpit-titles.json",
  ]) assert.ok(existsSync(join(dist, file)), `${file} should exist in dist`);
});

test("every page works under the CSP: no inline scripts, styles, or style attributes", () => {
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
  }
});

test("the home page leads with who Noah is and how to reach him", () => {
  const home = read("index.html");
  assert.match(home, /<h1 class="name" id="name">Noah<br>Airmet<\/h1>/);
  assert.match(home, /href="\/resume\/noah-airmet-resume\.pdf"/);
  assert.match(home, /href="mailto:noah\.airmet@icloud\.com"/);
  assert.match(home, /Mount Timpanogos/);
});

test("styles are external and honor reduced motion", () => {
  const css = walk(join(dist, "_astro")).filter((f) => f.endsWith(".css")).map((f) => readFileSync(f, "utf8")).join("\n");
  assert.ok(css.length > 0, "bundled stylesheet should exist");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /@view-transition/);
  assert.ok(walk(join(dist, "_astro")).some((f) => f.endsWith(".woff2")), "fonts are self-hosted");
});

test("private and unlisted things stay unreachable", () => {
  const files = walk(dist).filter((f) => /\.(html|css|js|xml|txt)$/.test(f) && !f.includes("/bee/"));
  for (const file of files) {
    const text = readFileSync(file, "utf8");
    assert.doesNotMatch(text, /corpus\./i, `${file} must not reference corpus`);
    // King Follett and Hymn Parts are for friends and family.
    assert.doesNotMatch(text, /kingfollett\.|hymns\.noahairmet/i, `${file} must not link unlisted projects`);
  }
  assert.doesNotMatch(read("_redirects"), /corpus/i);
});

test("redirects keep old URLs alive and cannot loop the résumé", () => {
  const redirects = read("_redirects");
  assert.doesNotMatch(redirects, /^\/resume\/\*/m);
  assert.match(redirects, /^\/resume \/resume\/noah-airmet-resume\.pdf 301$/m);
  assert.match(redirects, /^\/field-notes\/\* \/writing\/:splat 301$/m);
  assert.match(redirects, /^\/commitments\.html \/writing\/professional-commitments\/ 301$/m);
});

test("security headers survive the rebuild", () => {
  const headers = read("_headers");
  assert.match(headers, /Content-Security-Policy: default-src 'self'/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
});

test("the data files are whole", () => {
  const core = JSON.parse(read("data/pulpit-core.json"));
  const titles = JSON.parse(read("data/pulpit-titles.json"));
  const n = core.y.length;
  assert.ok(n > 12000, "every sermon is present");
  for (const key of ["f", "s"]) assert.equal(core[key].length, n, `core.${key} length`);
  assert.equal(titles.t.length, n); assert.equal(titles.id.length, n);
  assert.ok(core.s.every((s) => s < core.speakers.length));
  const timp = JSON.parse(read("data/timp.json"));
  assert.equal(timp.elev.length, timp.rows * timp.cols);
  assert.match(read("pulpit/index.html"), new RegExp(n.toLocaleString("en-US")));
});

test("rss carries the writing at its new address", () => {
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

test("every page carries the share card, and its files exist", () => {
  for (const file of pages()) {
    const html = readFileSync(file, "utf8");
    for (const prop of ["og:image", "og:video"]) {
      const m = html.match(new RegExp(`<meta property="${prop}" content="https://noahairmet\\.com(/[^"?]+)`));
      assert.ok(m, `${file}: ${prop}`);
      assert.ok(existsSync(join(dist, m[1])), `${file}: ${prop} points at missing ${m[1]}`);
    }
    assert.match(html, /<meta property="og:video:type" content="video\/mp4">/, file);
    assert.match(html, /<meta name="twitter:card" content="summary_large_image">/, file);
  }
});
