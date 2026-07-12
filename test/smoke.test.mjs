import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");

const expectedFiles = [
  "index.html",
  "resume/noah-airmet-resume.pdf",
  "404.html",
  "_headers",
  "_redirects",
  "robots.txt",
];

test("static build emits the single-page site and control files", () => {
  for (const file of expectedFiles) {
    assert.ok(existsSync(join(dist, file)), `${file} should exist in dist`);
  }
});

test("home includes core accessibility and metadata markers", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.match(home, /<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(home, /<link rel="canonical" href="https:\/\/noahairmet.com\//);
  assert.match(home, /<meta name="description"/);
  assert.match(home, /prefers-reduced-motion/);
  assert.match(home, /data-dither-chart="matrix"/);
  assert.match(home, /data-active="30" data-total="351"/);
  assert.match(home, /data-values="182\.8,234\.9"/);
});

test("home communicates the real portfolio directly", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.match(home, /I build software and study how AI should be governed/);
  assert.match(home, /AI governance field guide/);
  assert.match(home, /Governing agent systems/);
  assert.match(home, /Elsewhere \/ independent/);
  assert.doesNotMatch(home.toLowerCase(), /working thesis|operating principles|areas of inquiry/);
  assert.doesNotMatch(home, /href="\/assets\/resume\.pdf"/);
});

test("retired multi-page routes are not emitted as content pages", () => {
  for (const route of ["work/index.html", "about/index.html", "writing/index.html", "privacy/index.html"]) {
    assert.ok(!existsSync(join(dist, route)), `${route} should not be emitted`);
  }
});

test("redirect map cannot loop the resume PDF", () => {
  const redirects = readFileSync(join(dist, "_redirects"), "utf8");
  assert.doesNotMatch(redirects, /^\/resume\/\*/m);
  assert.match(redirects, /^\/resume \/resume\/noah-airmet-resume\.pdf 301$/m);
  assert.match(redirects, /^\/resume\/ \/resume\/noah-airmet-resume\.pdf 301$/m);
});

test("built pages do not contain broken internal links", () => {
  const walk = (directory) => readdirSync(directory).flatMap((name) => {
    const path = join(directory, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

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
