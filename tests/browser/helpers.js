/* Shared setup for the browser tests (integration and system).
   They serve the repo on localhost (Node's own http module, no packages),
   open the real pages in Chromium with Playwright, and seed test data into
   localStorage first. Never real user data. (Served, not opened as files,
   because headless Chromium doesn't keep localStorage between file:// pages.)
   Not run by GitHub Actions: run them locally with  node --test tests/browser/ */

const fs = require("fs");
const http = require("http");
const path = require("path");
const { chromium } = require("playwright");

const ROOT = path.resolve(__dirname, "..", "..");
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".webmanifest": "application/manifest+json" };
let base = "";

/* A tiny static file server for the repo, so pages load like on GitHub Pages. */
function startServer() {
  const server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(new URL(req.url, "http://x").pathname));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => {
    base = "http://127.0.0.1:" + server.address().port;
    resolve(server);
  }));
}

const pageUrl = (page, query = "") => base + "/pages/" + page + query;

// Rick-like profile, plus sessions at Thursday Trivia (g01) and one other group (g02).
const PROFILE = {
  name: "Rick", interests: ["trivia", "games"], freeSlots: ["thu-eve"], step: "social",
  createdAt: "2026-09-01T12:00:00.000Z", stepChangedAt: "2026-09-01T12:00:00.000Z"
};
const session = (id, groupId, startsAt) => ({
  id, sessionId: groupId + "@" + startsAt.slice(0, 10), groupId, startsAt, status: "attended",
  checkedInAt: startsAt, createdAt: startsAt
});

/* Opens a fresh browser page with this data already in localStorage. */
async function openWith(data) {
  const server = await startServer();
  const browser = await chromium.launch();
  const context = await browser.newContext({ timezoneId: "America/New_York", locale: "en-US", serviceWorkers: "block" });
  await context.addInitScript((d) => {
    if (localStorage.getItem("test.seeded")) return; // seed once per test, not on every page load
    localStorage.clear();
    Object.keys(d).forEach((k) => localStorage.setItem("empower." + k, JSON.stringify(d[k])));
    localStorage.setItem("test.seeded", "1");
  }, data);
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const close = async () => { await browser.close(); server.close(); };
  return { page, errors, close };
}

module.exports = { pageUrl, PROFILE, session, openWith };
