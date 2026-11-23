/* Tests for the design-system gate (scripts/check_design_system.js).
   First: the real repository passes. Then: one failing example per rule,
   to prove the gate rejects a design that does not build from the tokens.
   Last: every way around the gate that an independent reviewer found
   (tests/fixtures/design-gate-escapes.json) stays closed. */

const test = require("node:test");
const assert = require("node:assert/strict");
const { loadFoundations } = require("../scripts/build_tokens.js");
const check = require("../scripts/check_design_system.js");
const escapes = require("./fixtures/design-gate-escapes.json");

const { doc, byName } = loadFoundations();

/** A minimal valid recipe to bend out of shape in each test. */
function recipe(tier, className, extra) {
  return Object.assign({ tier, className, purpose: "A recipe used only by this test", file: "test/" + className + ".json", base: { color: "{color.text.primary}" } }, extra);
}

/** True when any reported problem mentions the given text. */
function mentions(errors, text) {
  return errors.some((e) => e.indexOf(text) !== -1);
}

/** A copy of the foundations with one change, and its by-name index. */
function foundationsWith(change) {
  const copy = JSON.parse(JSON.stringify(doc));
  change(copy);
  const index = {};
  copy.tokens.forEach((t) => { index[t.token_name] = t; });
  return [copy, index];
}

test("the repository passes the design-system check", () => {
  assert.deepEqual(check.run(), []);
});

test("rejects a raw colour in a recipe", () => {
  const errors = check.checkRecipes([recipe(2, "bad", { base: { color: "#ff0000" } })], byName);
  assert.ok(mentions(errors, "raw colour"), errors.join("\n"));
});

test("rejects a named colour and a colour function in a recipe", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { background: "white" } })], byName), "raw colour"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { background: "rgba(0, 0, 0, 0.5)" } })], byName), "raw colour"));
});

test("rejects a raw size, time and easing curve in a recipe", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { padding: "12px" } })], byName), "raw value 12px"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { transition: "opacity 0.2s {motion.easing.standard}" } })], byName), "raw value 0.2s"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { transition: "opacity {motion.duration.short} cubic-bezier(0, 0, 1, 1)" } })], byName), "raw easing"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { transition: "opacity {motion.duration.short} ease-in-out" } })], byName), "raw easing"));
});

test("rejects a raw font name in a recipe", () => {
  const errors = check.checkRecipes([recipe(1, "bad", { base: { "font-family": "Helvetica, sans-serif" } })], byName);
  assert.ok(mentions(errors, "raw font name"), errors.join("\n"));
});

test("rejects a raw value hidden in a nested selector or a media query", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { "&:hover": { opacity: "0.5" } } })], byName), "raw value 0.5"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { "@media (min-width: 600px)": { display: "none" } } })], byName), "breakpoint token"));
});

test("rejects a token that does not exist", () => {
  const errors = check.checkRecipes([recipe(2, "bad", { base: { color: "{color.text.made_up}" } })], byName);
  assert.ok(mentions(errors, "unknown token"), errors.join("\n"));
});

test("rejects a token used for the wrong job", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { color: "{space.4}" } })], byName), "is not a color token"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { "font-size": "{space.4}" } })], byName), "is not a type.size token"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { "z-index": "{space.1}" } })], byName), "is not a layer token"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { width: "{color.text.primary}" } })], byName), "which width needs"));
});

test("rejects a property or a value that is not on the allow-list", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { "clip-path": "none" } })], byName), "not on the allow-list"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { display: "table" } })], byName), "is not an allowed value for display"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "bad", { base: { position: "absolute !important" } })], byName), "!important is not allowed"));
});

test("rejects a recipe that builds on the same or a higher tier", () => {
  const low = recipe(2, "low", { uses: ["high"] });
  const high = recipe(5, "high");
  const peer = recipe(5, "peer", { uses: ["high"] });
  assert.ok(mentions(check.checkRecipes([low, high], byName), "may only build on lower tiers"));
  assert.ok(mentions(check.checkRecipes([high, peer], byName), "may only build on lower tiers"));
});

test("rejects a recipe that styles another component without declaring it", () => {
  const errors = check.checkRecipes([recipe(1, "avatar"), recipe(4, "row", { base: { "& .avatar": { margin: "0" } } })], byName);
  assert.ok(mentions(errors, "without listing it in uses"), errors.join("\n"));
});

test("accepts a recipe that builds upward on lower tiers with tokens only", () => {
  const errors = check.checkRecipes([
    recipe(1, "avatar"),
    recipe(4, "row", { uses: ["avatar"], base: { padding: "{space.3} 0", "& .avatar": { margin: "0 {space.2} 0 0" } } }),
  ], byName);
  assert.deepEqual(errors, []);
});

test("rejects two recipes that claim the same class, and a recipe with no purpose", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "same"), recipe(3, "same")], byName), "already defined"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "quiet", { purpose: "" })], byName), "needs a purpose"));
});

test("rejects motion with no reduced-motion rule", () => {
  const moving = recipe(2, "moving", { base: { transition: "opacity {motion.duration.short} {motion.easing.standard}" } });
  assert.ok(mentions(check.checkRecipes([moving], byName), "prefers-reduced-motion"));
});

test("rejects styling written from a page or a script", () => {
  assert.ok(mentions(check.checkSource("pages/x.html", "<p style=\"color: red\">hi</p>", byName), "inline style attribute"));
  assert.ok(mentions(check.checkSource("js/x.js", "el.style.width = \"40px\";", byName), "script sets .style.width"));
  assert.ok(mentions(check.checkSource("js/x.js", "el.style.setProperty(\"--anything\", \"4px\");", byName), "not a declared runtime token"));
  assert.ok(mentions(check.checkSource("js/x.js", "var c = \"#ff8800\";", byName), "raw colour in a page or script"));
});

test("accepts a script that sets a declared runtime token", () => {
  assert.deepEqual(check.checkSource("js/x.js", "el.style.setProperty(\"--runtime-fill\", pct + \"%\");", byName), []);
});

test("rejects a class that no recipe defines", () => {
  const errors = check.checkSource("js/x.js", "host.innerHTML = '<div class=\"btn mystery-box\"></div>';", byName, { btn: true });
  assert.ok(mentions(errors, "\"mystery-box\" is not defined"), errors.join("\n"));
});

test("rejects a browser theme colour that is not the canvas token", () => {
  const errors = check.checkSource("pages/x.html", "<meta name=\"theme-color\" content=\"#123456\">", byName);
  assert.ok(mentions(errors, "is not the canvas token"), errors.join("\n"));
});

test("rejects a text and surface pair below its contrast minimum", () => {
  const [weak, weakByName] = foundationsWith((copy) => { copy.contrast_pairs = [["color.text.tertiary", "color.surface.inverse", 4.5]]; });
  assert.ok(mentions(check.checkFoundations(weak, weakByName), "below 4.5:1"));
});

test("rejects a foundation value with no registered source", () => {
  const [loose, looseByName] = foundationsWith((copy) => { copy.tokens[0].evidence.reference_id = "somewhere_unlisted"; });
  assert.ok(mentions(check.checkFoundations(loose, looseByName), "no registered source"));
});

test("contrast maths matches WCAG: black on white is 21 to 1", () => {
  assert.equal(Math.round(check.contrast("#000000", "#ffffff")), 21);
});

/* ---------- Every escape an independent reviewer found stays closed ---------- */

function runEscape(c) {
  if (c.kind === "recipe") return check.checkRecipes([Object.assign({ tier: 2, className: "probe", purpose: "A recipe used only by this test", file: "test/probe.json" }, c.recipe)], byName);
  if (c.kind === "recipes") return check.checkRecipes(c.recipes.map((r, i) => Object.assign({ purpose: "A recipe used only by this test", file: "test/probe-" + i + ".json" }, r)), byName);
  if (c.kind === "source") {
    const defined = c.classes ? c.classes.reduce((all, name) => { all[name] = true; return all; }, {}) : undefined;
    return check.checkSource(c.file, c.text, byName, defined);
  }
  const [copy, index] = foundationsWith((draft) => {
    if (c.change.duplicate) draft.tokens.push(JSON.parse(JSON.stringify(draft.tokens.find((t) => t.token_name === c.change.duplicate))));
    if (c.change.contrast_pair) draft.contrast_pairs = [c.change.contrast_pair];
    if (c.change.token) {
      const token = draft.tokens.find((t) => t.token_name === c.change.token);
      if (c.change.set.reference_token) token.token_value = null;
      Object.assign(token, c.change.set);
    }
  });
  return check.checkFoundations(copy, index);
}

escapes.cases.forEach((c) => {
  test("escape fixture " + c.id + ": the gate must " + c.expect, () => {
    const errors = runEscape(c);
    if (c.expect === "refuse") assert.ok(errors.length > 0, "the gate accepted it");
    else assert.deepEqual(errors, []);
  });
});
