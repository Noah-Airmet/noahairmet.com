import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");

const expectedFiles = [
  "index.html",
  "404.html",
  "field-notes/index.html",
  "field-notes/professional-commitments/index.html",
  "rss.xml",
  "sitemap-index.xml",
  "resume/noah-airmet-resume.pdf",
  "bee/index.html",
  "bee/sw.js",
  "favicon.svg",
  "_headers",
  "_redirects",
  "robots.txt",
];

const walk = (directory) => readdirSync(directory).flatMap((name) => {
  const path = join(directory, name);
  return statSync(path).isDirectory() ? walk(path) : [path];
});

test("static build emits every route and control file", () => {
  for (const file of expectedFiles) {
    assert.ok(existsSync(join(dist, file)), `${file} should exist in dist`);
  }
});

test("home includes accessibility and metadata markers", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.match(home, /<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(home, /<link rel="canonical" href="https:\/\/noahairmet\.com\//);
  assert.match(home, /<meta name="description"/);
  assert.match(home, /application\/rss\+xml/);
  assert.match(home, /contour-field/);
});

test("home tells the truth about who Noah is right now", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.match(home, /Noah Airmet/);
  assert.match(home, /class of 2028/);
  assert.match(home, /Field notes/);
  assert.match(home, /learning in public/);
  assert.match(home, /pulpit-archive\.org/);
  // The old site's inflation and chrome must stay gone.
  assert.doesNotMatch(home, /dither|Selected work|field guide|Governing agent systems/i);
});

test("styles stay external and honor reduced motion (CSP: style-src 'self')", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.doesNotMatch(home, /<style/, "no inline <style> allowed under the CSP");
  const cssFiles = walk(join(dist, "_astro")).filter((f) => f.endsWith(".css"));
  assert.ok(cssFiles.length > 0, "bundled stylesheet should exist");
  const css = cssFiles.map((f) => readFileSync(f, "utf8")).join("\n");
  assert.match(css, /prefers-reduced-motion/);
  assert.match(css, /Besley/);
  assert.match(css, /Literata/);
  assert.match(css, /IBM Plex Mono/);
});

test("fonts are self-hosted", () => {
  const fonts = walk(join(dist, "_astro")).filter((f) => f.endsWith(".woff2"));
  assert.ok(fonts.length >= 3, "woff2 files should be bundled locally");
  const html = walk(dist).filter((f) => f.endsWith(".html"));
  for (const file of html) {
    const body = readFileSync(file, "utf8");
    assert.doesNotMatch(body, /fonts\.googleapis|fonts\.gstatic|cdn\./, `${file} must not reference external assets`);
  }
});

test("corpus and other unrelated services are unreachable from this site", () => {
  const textFiles = walk(dist).filter((f) => /\.(html|css|js|xml|txt)$/.test(f) && !f.includes("/bee/"));
  for (const file of textFiles) {
    assert.doesNotMatch(readFileSync(file, "utf8"), /corpus\./i, `${file} must not reference corpus`);
  }
  assert.doesNotMatch(readFileSync(join(dist, "_redirects"), "utf8"), /corpus/i);
});

test("redirect map cannot loop the resume PDF", () => {
  const redirects = readFileSync(join(dist, "_redirects"), "utf8");
  assert.doesNotMatch(redirects, /^\/resume\/\*/m);
  assert.match(redirects, /^\/resume \/resume\/noah-airmet-resume\.pdf 301$/m);
  assert.match(redirects, /^\/resume\/ \/resume\/noah-airmet-resume\.pdf 301$/m);
  assert.match(redirects, /^\/commitments\.html \/field-notes\/professional-commitments\/ 301$/m);
});

test("security headers survive the rebuild", () => {
  const headers = readFileSync(join(dist, "_headers"), "utf8");
  assert.match(headers, /Content-Security-Policy: default-src 'self'/);
  assert.match(headers, /X-Content-Type-Options: nosniff/);
});

test("rss carries the field notes", () => {
  const feed = readFileSync(join(dist, "rss.xml"), "utf8");
  assert.match(feed, /Professional commitments/);
  assert.match(feed, /field-notes\/professional-commitments/);
});

test("built pages do not contain broken internal links", () => {
  const htmlFiles = walk(dist).filter((file) => file.endsWith(".html"));
  for (const file of htmlFiles) {
    const html = readFileSync(file, "utf8");
    for (const [, href] of html.matchAll(/href="([^"]+)"/g)) {
      if (!href.startsWith("/") || href.startsWith("//")) continue;
      const pathname = href.split(/[?#]/)[0];
      if (!pathname) continue;
      const target = pathname.endsWith("/")
        ? join(dist, pathname, "index.html")
        : join(dist, pathname);
      assert.ok(existsSync(target), `${file} links to missing ${pathname}`);
    }
  }
});
