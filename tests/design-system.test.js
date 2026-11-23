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

/* ---------- States: every pressable thing answers, from one shared preset ---------- */

const { applyInteraction, applySurface, loadStates, loadSurfaces } = require("../scripts/build_tokens.js");
const presets = loadStates().presets;
const surfaces = loadSurfaces().presets;

/** The elements the gate would find in one script's markup. */
function found(text) {
  return check.interactiveElements("js/x.js", text);
}

test("rejects a button whose component styles no hover or pressed state", () => {
  const plainBtn = recipe(2, "plain-btn", { base: { color: "{color.text.primary}" } });
  const errors = check.checkInteraction(found("'<button class=\"plain-btn\">Go</button>'"), [plainBtn]);
  assert.ok(mentions(errors, "has no hover state"), errors.join("\n"));
  assert.ok(mentions(errors, "has no pressed state"), errors.join("\n"));
});

test("accepts a button whose recipe names a state preset", () => {
  const good = applyInteraction(recipe(2, "good-btn", { interaction: { base: "on-dark" } }), presets);
  assert.deepEqual(check.checkInteraction(found("'<button class=\"good-btn\">Go</button>'"), [good]), []);
  assert.deepEqual(check.checkRecipes([good], byName, presets, surfaces), []);
});

test("rejects a control that can be switched on but styles no selected state", () => {
  const toggle = applyInteraction(recipe(2, "flip", { interaction: { base: "on-dark" } }), presets);
  const errors = check.checkInteraction(found("'<button class=\"flip\" aria-pressed=\"false\">A</button>'"), [toggle]);
  assert.ok(mentions(errors, "has no selected state"), errors.join("\n"));
});

test("rejects a field with no focus style, a bare link, and a class the check cannot read", () => {
  const field = recipe(2, "box");
  assert.ok(mentions(check.checkInteraction(found("'<input class=\"box\">'"), [field]), "has no focus state"));
  assert.ok(mentions(check.checkInteraction(found("'<a href=\"x.html\">more</a>'"), [field]), "give it a component class"));
  assert.ok(mentions(check.checkInteraction(found("'<button class=\"' + name + '\">'"), [field]), "no component class the check can read"));
});

test("accepts a waived state only with a written reason", () => {
  const els = found("'<a class=\"quiet\" href=\"#\">x</a>'");
  const waived = recipe(1, "quiet", { waive: { hover: "It is already full white, so there is nothing to brighten.", pressed: "A press leaves the page at once, so no feedback is seen." } });
  assert.deepEqual(check.checkInteraction(els, [waived]), []);
  assert.ok(mentions(check.checkRecipes([recipe(1, "quiet", { waive: { hover: "no" } })], byName, presets, surfaces), "needs a written reason"));
  assert.ok(mentions(check.checkRecipes([recipe(1, "quiet", { waive: { sparkle: "This is not a state the check knows about." } })], byName, presets, surfaces), "must be a state"));
});

test("rejects hover outside the hover media query, a removed focus outline, and a second name for selected", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "sticky", { base: { "&:hover": { color: "{color.text.primary}" } } })], byName, presets, surfaces), "sets hover outside"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "ringless", { base: { "&:focus-visible": { outline: "none" } } })], byName, presets, surfaces), "may not restyle or remove it"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "named", { states: { on: { color: "{color.text.primary}" } } })], byName, presets, surfaces), "must be named \"selected\""));
  assert.ok(mentions(check.checkRecipes([recipe(2, "named", { base: { "&.is-active": { color: "{color.text.primary}" } } })], byName, presets, surfaces), "use .is-selected"));
});

test("rejects an interaction or surface that names an unknown preset or part", () => {
  assert.ok(mentions(check.checkRecipes([recipe(2, "odd", { interaction: { base: "sparkly" } })], byName, presets, surfaces), "is not in design_system/states.json"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "odd", { interaction: { "__ghost": "on-dark" } })], byName, presets, surfaces), "does not have"));
  assert.ok(mentions(check.checkRecipes([recipe(2, "odd", { surface: { base: "velvet" } })], byName, presets, surfaces), "is not in design_system/surfaces.json"));
});

test("rejects a state preset or a surface preset that is not built from tokens", () => {
  assert.ok(check.checkStates({ presets: { loud: { purpose: "A preset used only by this test", hover: { color: "#ff0000" }, pressed: { opacity: "0.5" } } } }, byName).length >= 2);
  assert.ok(mentions(check.checkStates({ presets: { half: { purpose: "A preset used only by this test", hover: { color: "{color.text.primary}" } } } }, byName), "must style both hover and pressed"));
  assert.ok(mentions(check.checkStates({ presets: { jumpy: { purpose: "A preset used only by this test", rest: { transition: "opacity {motion.duration.short} {motion.easing.standard}" }, hover: { opacity: "{opacity.hover}" }, pressed: { opacity: "{opacity.pressed}" } } } }, byName), "no reduced rule"));
  assert.ok(check.checkSurfaces({ presets: { slab: { purpose: "A preset used only by this test", styles: { background: "white" } } } }, byName).length >= 1);
});

/* ---------- Surfaces: materials come from one shared preset ---------- */

test("rejects a recipe that sets a panel fill, a shadow token or a blur by hand", () => {
  const byHand = (base) => check.checkRecipes([], byName, presets, surfaces, [{ className: "slab", file: "design_system/recipes/tier_04_patterns/slab.json", example: "<div class=\"slab\"></div>", frame: "block", base: base }]);
  assert.ok(mentions(byHand({ background: "{color.surface.panel}" }), "sets a surface by hand"));
  assert.ok(mentions(byHand({ "box-shadow": "{shadow.raised}" }), "sets a surface by hand"));
  assert.ok(mentions(byHand({ "&:hover": { "backdrop-filter": "blur({blur.overlay})" } }), "sets a surface by hand"));
  assert.deepEqual(byHand({ background: "{color.surface.canvas}" }), []);
});

test("a surface preset lays its styles under the recipe's own, and a state preset writes its rules", () => {
  const made = applyInteraction(applySurface(recipe(4, "slab", { surface: { base: "panel" }, interaction: { base: "surface" }, base: { "border-radius": "{radius.large}" } }), surfaces), presets);
  assert.equal(made.base.background, "{color.surface.panel}");
  assert.equal(made.base["border-radius"], "{radius.large}");
  assert.ok(made.system.some((rule) => /\.slab:hover/.test(rule.selector) && rule.media[0] === "@media (hover: hover)"));
  assert.ok(made.system.some((rule) => rule.media[0] === "@media (prefers-reduced-motion: reduce)"));
});

test("reports a part, a variant and a state that no screen draws, and accepts a variant joined on in a script", () => {
  const made = recipe(2, "badge", { elements: { dot: { margin: "0" } }, variants: { size: { sm: { margin: "0" }, xl: { margin: "0" } } }, states: { ghost: { margin: "0" } } });
  const errors = check.checkUnused([made], "<span class=\"badge\"></span> var c = \"badge--\" + size; pick(\"sm\");");
  assert.ok(mentions(errors, ".badge__dot is not drawn"));
  assert.ok(mentions(errors, ".badge--xl is not drawn"));
  assert.ok(mentions(errors, ".badge.is-ghost is not drawn"));
  assert.ok(!mentions(errors, ".badge--sm"));
  assert.deepEqual(check.checkUnused([Object.assign(made, { waive: { unused: "Kept for a screen that is being drawn next week." } })], ""), []);
});

test("a class the app draws must have a card on the review board", () => {
  const made = { className: "badge", file: "test/badge.json", elements: { dot: { "&--live": { margin: "0" } }, count: {} }, variants: { size: { sm: {} } } };
  const app = "<span class=\"badge badge--sm\"><i class=\"badge__dot badge__dot--live\"></i><b class=\"badge__count\">3</b></span>";
  const bed = (inner) => "<figure><div class=\"board__bed\">" + inner + "</div></figure>";
  const errors = check.checkShown([made], app, bed("<span class=\"badge\"><i class=\"badge__dot\"></i></span>"));
  assert.ok(mentions(errors, ".badge--sm is drawn in the app"));
  assert.ok(mentions(errors, ".badge__dot--live is drawn in the app"));
  assert.ok(mentions(errors, ".badge__count is drawn in the app"));
  assert.ok(!mentions(errors, ".badge is drawn") && !mentions(errors, ".badge__dot is drawn"));
  assert.deepEqual(check.checkShown([made], app, bed(app)), []);
  // More on the board than in the app is fine.
  assert.deepEqual(check.checkShown([made], "<span class=\"badge\"></span>", bed(app)), []);
  // A shared helper counts too.
  assert.ok(mentions(check.checkShown([{ global: true, file: "test/text.json", rules: { ".center": { "text-align": "center" } } }], "<p class=\"center\">x</p>", bed("<p>x</p>")), ".center is drawn in the app"));
});

test("the board shows a variant with the recipe's own fuller example where one is given", () => {
  const cards = require("../scripts/build_board.js").cardsFor({ className: "dotty" }, { className: "dotty", example: "<div class=\"dotty\">Hi</div>",
    examples: { "--busy": "<div class=\"dotty dotty--busy\"><span></span></div>" }, variants: { kind: { busy: { margin: "0" } } } }, presets, {}).join("");
  assert.ok(cards.indexOf("<div class=\"dotty dotty--busy\"><span></span></div>") !== -1);
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

/** Runs one case from the second audit (state, surface, text and board rules). */
function runEscape2(c) {
  const shown = (r) => (r.global ? r : Object.assign({ example: "<div class=\"" + r.className + "\"></div>", frame: "block" }, r));
  if (c.kind === "raw-recipe") return check.checkRecipes([], byName, presets, surfaces, [shown(c.recipe)]);
  if (c.kind === "recipe-plain") return check.checkRecipes([c.recipe], byName, presets, surfaces);
  if (c.kind === "states") return check.checkStates(c.states, byName);
  if (c.kind === "type") return check.checkType(c.type, byName);
  if (c.kind === "app-source") return check.checkSource(c.file, c.text, byName, (c.classes || []).reduce((all, name) => { all[name] = true; return all; }, {}));
  if (c.kind === "board-cards") {
    const cards = require("../scripts/build_board.js").cardsFor(c.recipe, c.recipe, presets, {}).join("");
    return c.requiredLabels.filter((label) => cards.indexOf(">" + label + "<") === -1).map((label) => "the board has no " + label + " card");
  }
  // "interaction": the recipe as a whole, the file as written, and the page that uses it.
  const built = applyInteraction(JSON.parse(JSON.stringify(c.recipe)), presets);
  return check.checkRecipes([built], byName, presets, surfaces, [shown(c.recipe)])
    .concat(check.checkSource(c.file, c.text, byName), check.checkInteraction(check.interactiveElements(c.file, c.text), [built]));
}

require("./fixtures/design-gate-escapes-2.json").cases.forEach((c) => {
  test("second audit " + c.id + ": the gate must " + c.expect, () => {
    const errors = runEscape2(c);
    if (c.expect === "refuse") assert.ok(errors.length > 0, "the gate accepted it");
    else assert.deepEqual(errors, []);
  });
});

escapes.cases.forEach((c) => {
  test("escape fixture " + c.id + ": the gate must " + c.expect, () => {
    const errors = runEscape(c);
    if (c.expect === "refuse") assert.ok(errors.length > 0, "the gate accepted it");
    else assert.deepEqual(errors, []);
  });
});
