/* Architecture check: enforces the rules in AGENTS.md so no one has to
   remember them. Run from the repo root:  node scripts/check_architecture.js
   Exits 1 with a list of problems if any rule is broken. GitHub runs it on
   every PR. */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const list = (dir, ext) => fs.readdirSync(path.join(ROOT, dir)).filter((f) => f.endsWith(ext)).map((f) => path.join(dir, f));
const problems = [];

const RULE_FILES = ["js/logic.js", "js/people.js", "js/schedule.js"];
const STORAGE_ALLOWED = ["js/store.js", "js/ui.js"]; // ui.js: demo clock only
const SCRIPT_ORDER = ["data/groups.js", "js/ui.js", "js/store.js", "js/schedule.js", "js/logic.js", "data/population.js", "js/people.js"];
const appScripts = list("js", ".js");
const pageScripts = appScripts.filter((f) => !RULE_FILES.includes(f) && !["js/store.js", "js/ui.js"].includes(f));

// 1. Only the data layer touches localStorage.
appScripts.filter((f) => !STORAGE_ALLOWED.includes(f)).forEach((f) => {
  if (/localStorage/.test(read(f))) problems.push(`${f}: uses localStorage. Go through Empower.store instead.`);
});

// 2. Rule files stay pure: no DOM, no hidden clock.
RULE_FILES.forEach((f) => {
  const src = read(f);
  if (/\bdocument\./.test(src)) problems.push(`${f}: touches the DOM. Rules must be pure; move this to a page script.`);
  if (/new Date\(\s*\)/.test(src)) problems.push(`${f}: reads the clock with new Date(). Pass "now" in as an argument.`);
});

// 3. Page scripts use the app clock so demo time travel works.
pageScripts.forEach((f) => {
  if (/new Date\(\s*\)/.test(read(f))) problems.push(`${f}: uses new Date() for "now". Use Empower.clock.now().`);
});

// 4. Every function pages can call is documented in the contract.
const doc = read("docs/mechanics.md");
const exported = {
  "js/logic.js": Object.keys(require(path.join(ROOT, "js/logic.js"))),
  "js/people.js": Object.keys(require(path.join(ROOT, "js/people.js"))),
  "js/schedule.js": Object.keys(require(path.join(ROOT, "js/schedule.js")))
};
Object.entries(exported).forEach(([file, names]) => names.forEach((name) => {
  if (!doc.includes(name)) problems.push(`${file}: ${name}() is not documented in docs/mechanics.md.`);
}));

// 5. HTML: no inline styles, and shared scripts load in the agreed order.
const htmlFiles = ["index.html", ...list("pages", ".html")];
htmlFiles.forEach((f) => {
  const src = read(f);
  if (/\sstyle="/.test(src)) problems.push(`${f}: inline style="". Use a class in css/styles.css.`);
  const prefix = f.startsWith("pages/") ? "../" : "";
  const found = [...src.matchAll(/<script src="([^"]+)"/g)].map((m) => m[1].replace(prefix, ""));
  const shared = found.filter((s) => SCRIPT_ORDER.includes(s));
  if (shared.join() !== SCRIPT_ORDER.join()) {
    problems.push(`${f}: shared scripts must load in this order: ${SCRIPT_ORDER.join(", ")}.`);
  }
});

if (problems.length) {
  console.error(`Architecture check failed (${problems.length}):\n- ` + problems.join("\n- "));
  console.error("\nSee AGENTS.md for the rules.");
  process.exit(1);
}
console.log(`Architecture check passed: ${appScripts.length} scripts, ${htmlFiles.length} pages.`);
