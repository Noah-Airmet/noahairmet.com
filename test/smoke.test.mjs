import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = new URL("../", import.meta.url).pathname;
const dist = join(root, "dist");

const expectedFiles = [
  "index.html",
  "work/index.html",
  "writing/index.html",
  "about/index.html",
  "resume/index.html",
  "resume/noah-airmet-resume.pdf",
  "colophon/index.html",
  "privacy/index.html",
  "404.html",
  "_headers",
  "_redirects",
  "robots.txt",
];

test("static build emits required pages and control files", () => {
  for (const file of expectedFiles) {
    assert.ok(existsSync(join(dist, file)), `${file} should exist in dist`);
  }
});

test("built pages include core accessibility and metadata markers", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.match(home, /<a class="skip-link" href="#main">Skip to content<\/a>/);
  assert.match(home, /<link rel="canonical" href="https:\/\/noahairmet.com\//);
  assert.match(home, /<meta name="description"/);
});

test("placeholder pages do not leak lorem ipsum", () => {
  const files = expectedFiles.filter((file) => file.endsWith(".html"));
  for (const file of files) {
    const html = readFileSync(join(dist, file), "utf8");
    assert.doesNotMatch(html.toLowerCase(), /lorem ipsum/);
    assert.doesNotMatch(html.toLowerCase(), /professional site foundation/);
    assert.doesNotMatch(html.toLowerCase(), /will live here/);
  }
});

test("home publishes real work and no broken legacy resume path", () => {
  const home = readFileSync(join(dist, "index.html"), "utf8");
  assert.match(home, /Build the system/);
  assert.match(home, /AI governance field guide/);
  assert.doesNotMatch(home, /href="\/assets\/resume\.pdf"/);
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
