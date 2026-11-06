/* Checks for the installable app (PWA): sw.js, manifest.webmanifest, icons.
   These keep the offline file list in step with the files on disk. */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const list = (dir, ext) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(ext)).map((f) => dir + "/" + f);
const appFiles = ["index.html", ...list("pages", ".html"), ...list("css", ".css"), ...list("js", ".js"),
  ...list("data", ".js"), ...list("icons", ".png"), "manifest.webmanifest"].sort();
const cached = [...read("sw.js").matchAll(/"\.\/([^"]+)"/g)].map((m) => m[1]).sort();

test("sw.js saves every app file for offline, and nothing that doesn't exist", () => {
  assert.deepEqual(cached, appFiles);
});

test("every page links the manifest and the home-screen icon", () => {
  ["index.html", ...list("pages", ".html")].forEach((f) => {
    const src = read(f);
    assert.match(src, /rel="manifest" href="(\.\.\/)?manifest\.webmanifest"/, f);
    assert.match(src, /rel="apple-touch-icon"/, f);
  });
});

test("the manifest opens the app full-screen with icons that exist", () => {
  const m = JSON.parse(read("manifest.webmanifest"));
  assert.equal(m.display, "standalone");
  assert.equal(m.start_url, "./index.html");
  m.icons.forEach((i) => assert.ok(fs.existsSync(path.join(ROOT, i.src)), i.src));
  assert.ok(m.icons.some((i) => i.sizes === "512x512"));
});
