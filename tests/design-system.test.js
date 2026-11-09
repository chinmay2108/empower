/* Checks for the design system until scripts/build_tokens.js generates the CSS:
   the CSS tokens must match the foundations JSON, and recipes may use tokens only. */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const css = fs.readFileSync(path.join(ROOT, "css/design-system.css"), "utf8");
const tokens = require(path.join(ROOT, "design_system/tier_00_foundations.json")).tokens;
const cssVar = (name) => "--" + name.replace(/\./g, "-");

test("every foundation token in the JSON has the same value in the CSS", () => {
  tokens.forEach((t) => {
    const expected = t.reference_token ? "var(" + cssVar(t.reference_token) + ")" : t.token_value + (t.unit || "");
    const found = css.match(new RegExp(cssVar(t.token_name) + ":\\s*([^;]+);"));
    assert.ok(found, t.token_name + " is missing from css/design-system.css");
    assert.equal(found[1].trim(), expected, t.token_name);
  });
});

test("recipes below :root use tokens only: no hex colors, px sizes or font names", () => {
  const recipes = css.slice(css.indexOf("}", css.indexOf(":root")) + 1);
  assert.doesNotMatch(recipes, /#[0-9a-fA-F]{3,8}\b|\d+px|DM Sans/);
});
