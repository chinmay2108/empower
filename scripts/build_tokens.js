/* ==========================================================================
   build_tokens.js
   Turns the design system's JSON into the one stylesheet the app loads.

   Reads:  design_system/tier_00_foundations.json   (every raw value lives here)
           design_system/states.json                (how pressable things answer)
           design_system/surfaces.json              (what each kind of surface is made of)
           design_system/type.json                  (how each kind of text is set)
           design_system/recipes/tier_0N_*\/*.json  (components, tokens only)
   Writes: css/design-system.css                    (committed, plain CSS)

   Run:    node scripts/build_tokens.js           writes the file
           node scripts/build_tokens.js --check   fails if the file is stale

   Node standard library only. No packages, no build step for the app itself:
   the browser loads the committed CSS file.
   ========================================================================== */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const FOUNDATIONS = path.join(ROOT, "design_system/tier_00_foundations.json");
const RECIPES = path.join(ROOT, "design_system/recipes");
const STATES = path.join(ROOT, "design_system/states.json");
const SURFACES = path.join(ROOT, "design_system/surfaces.json");
const TYPE = path.join(ROOT, "design_system/type.json");
const OUTPUT = path.join(ROOT, "css/design-system.css");
const HOVER_MEDIA = "@media (hover: hover)";
const REDUCED_MEDIA = "@media (prefers-reduced-motion: reduce)";
/* State rules reach only things you can really press, never a look-alike that is plain text. */
const LIVE = ":is(a, button, summary, [role=\"button\"]):not(:disabled):not([aria-disabled=\"true\"])";

/** "color.text.primary" -> "--color-text-primary" */
function cssVar(tokenName) {
  return "--" + tokenName.replace(/\./g, "-");
}

/** The literal CSS value of one foundation token (an alias becomes var(--other)). */
function tokenCss(token) {
  if (token.reference_token) return "var(" + cssVar(token.reference_token) + ")";
  return token.token_value + (token.unit || "");
}

/** Follows aliases until it reaches a token that holds a real value. */
function resolveToken(name, byName) {
  let token = byName[name];
  const seen = [];
  while (token && token.reference_token) {
    if (seen.indexOf(token.token_name) !== -1) return null;
    seen.push(token.token_name);
    token = byName[token.reference_token];
  }
  return token || null;
}

/** Loads the foundations file and indexes its tokens by name. */
function loadFoundations() {
  const doc = JSON.parse(fs.readFileSync(FOUNDATIONS, "utf8"));
  const byName = {};
  doc.tokens.forEach((t) => { byName[t.token_name] = t; });
  return { doc, byName };
}

/** Loads the shared state presets (hover, pressed, reduced motion). */
function loadStates() {
  return fs.existsSync(STATES) ? JSON.parse(fs.readFileSync(STATES, "utf8")) : { presets: {} };
}

/** Loads the shared surface presets (fill, corner, edge, shadow). */
function loadSurfaces() {
  return fs.existsSync(SURFACES) ? JSON.parse(fs.readFileSync(SURFACES, "utf8")) : { presets: {} };
}

/** Loads the shared text roles (size, weight, line spacing, letter spacing). */
function loadType() {
  return fs.existsSync(TYPE) ? JSON.parse(fs.readFileSync(TYPE, "utf8")) : { presets: {} };
}

/** The style block a part key names: "base", "__part" or "--variant", optionally followed by a space and a
    nested selector written exactly as in the recipe ("__media & .avatar"). Null when there is no such block. */
function partBlock(recipe, key) {
  const space = key.indexOf(" ");
  const part = space === -1 ? key : key.slice(0, space);
  const nested = space === -1 ? "" : key.slice(space + 1);
  let block = null;
  if (part === "base") { recipe.base = recipe.base || {}; block = recipe.base; }
  else if (part.indexOf("__") === 0) block = (recipe.elements || {})[part.slice(2)] || null;
  else {
    const group = Object.keys(recipe.variants || {}).filter((g) => recipe.variants[g][part.slice(2)])[0];
    block = group ? recipe.variants[group][part.slice(2)] : null;
  }
  if (!block || !nested) return block;
  return block[nested] !== null && typeof block[nested] === "object" ? block[nested] : null;
}

/** Lays a part's preset under the recipe's own styles (the recipe's own keys win). "key" is "surface" or "text". */
function applySurface(recipe, presets, key) {
  const map = recipe[key || "surface"];
  if (!map || typeof map !== "object" || !recipe.className) return recipe;
  Object.keys(map).forEach((part) => {
    const preset = presets[map[part]];
    const block = partBlock(recipe, part);
    if (!preset || !block) return;
    const merged = Object.assign({}, preset.styles, block);
    Object.keys(block).forEach((key) => { delete block[key]; });
    Object.assign(block, merged);
  });
  return recipe;
}

/** Turns a recipe's "interaction" map into system-owned state rules.
    Keys are "base", "__part" or "--variant"; values name a preset. The preset's
    resting styles sit under the recipe's own; its state rules are written last. */
function applyInteraction(recipe, presets) {
  recipe.system = [];
  const map = recipe.interaction;
  if (!map || typeof map !== "object" || !recipe.className) return recipe;
  Object.keys(map).forEach((part) => {
    const preset = presets[map[part]];
    if (!preset) return;
    const target = "." + recipe.className + (part === "base" ? "" : part);
    if (preset.rest && part === "base") recipe.base = Object.assign({}, preset.rest, recipe.base || {});
    if (preset.rest && part.indexOf("__") === 0 && recipe.elements && recipe.elements[part.slice(2)]) {
      recipe.elements[part.slice(2)] = Object.assign({}, preset.rest, recipe.elements[part.slice(2)]);
    }
    const on = [target + "[aria-pressed=\"true\"]", target + "[aria-current]", target + ".is-selected"];
    const rule = (selector, media, styles) => { if (styles) recipe.system.push({ selector: selector, media: media, styles: styles }); };
    // Each state rule has a twin class (.is-hover, .is-pressed) so the review board can hold a state still.
    rule(target + ":hover" + LIVE, [HOVER_MEDIA], preset.hover);
    rule(target + ".is-hover", [], preset.hover);
    rule(on.map((sel) => sel + ":hover" + LIVE).join(", "), [HOVER_MEDIA], preset.selected_hover);
    rule(on.map((sel) => sel + ".is-hover").join(", "), [], preset.selected_hover);
    rule(target + ":active" + LIVE + ", " + target + ".is-pressed", [], preset.pressed);
    rule(on.map((sel) => sel + ":active" + LIVE).concat(on.map((sel) => sel + ".is-pressed")).join(", "), [], preset.selected_pressed);
    rule(target, [REDUCED_MEDIA], preset.reduced);
    rule(target + ":hover" + LIVE, [REDUCED_MEDIA], preset.reduced_hover);
    rule(target + ":active" + LIVE, [REDUCED_MEDIA], preset.reduced_pressed);
  });
  return recipe;
}

/** Loads every recipe, in tier order then file-name order, with its tier attached. */
function loadRecipes() {
  if (!fs.existsSync(RECIPES)) return [];
  const recipes = [];
  const presets = loadStates().presets || {};
  const surfaces = loadSurfaces().presets || {};
  const roles = loadType().presets || {};
  fs.readdirSync(RECIPES).sort().forEach((folder) => {
    const match = /^tier_0(\d)_/.exec(folder);
    const dir = path.join(RECIPES, folder);
    if (!match || !fs.statSync(dir).isDirectory()) return;
    fs.readdirSync(dir).filter((f) => f.endsWith(".json")).sort().forEach((file) => {
      const recipe = JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
      recipe.tier = Number(match[1]);
      recipe.file = "design_system/recipes/" + folder + "/" + file;
      recipes.push(applyInteraction(applySurface(applySurface(recipe, surfaces, "surface"), roles, "text"), presets));
    });
  });
  return recipes;
}

/** Replaces {token.name} with var(--token-name), or with the raw value when literal is true. */
function resolveValue(value, byName, literal) {
  return String(value).replace(/\{([a-z0-9_.]+)\}/g, (whole, name) => {
    if (!literal) return "var(" + cssVar(name) + ")";
    const token = resolveToken(name, byName);
    return token ? tokenCss(token) : whole;
  });
}

/** Expands "&" (this selector) and "$part" (this recipe's element) inside a nested selector. */
function expandSelector(key, self, className) {
  return key.split(",").map((part) => {
    let out = part.trim().replace(/\$([a-z][a-z0-9-]*)/g, "." + className + "__$1");
    out = out.indexOf("&") === -1 ? self + " " + out : out.replace(/&/g, self);
    return out;
  }).join(", ");
}

/** Writes one style object as CSS rules. Nested objects are nested selectors or @media blocks. */
function emitRules(selector, styles, className, byName, indent) {
  const pad = indent || "";
  const own = [];
  const nested = [];
  Object.keys(styles).forEach((key) => {
    const value = styles[key];
    if (value !== null && typeof value === "object") nested.push(key);
    else own.push(pad + "  " + key + ": " + resolveValue(value, byName, false) + ";");
  });
  let css = own.length ? pad + selector + " {\n" + own.join("\n") + "\n" + pad + "}\n" : "";
  nested.forEach((key) => {
    if (key.charAt(0) === "@") {
      css += pad + resolveValue(key, byName, true) + " {\n" + emitRules(selector, styles[key], className, byName, pad + "  ") + pad + "}\n";
    } else {
      css += emitRules(expandSelector(key, selector, className), styles[key], className, byName, pad);
    }
  });
  return css;
}

/** Writes one recipe: base, elements, variants, states and keyframes. */
function emitRecipe(recipe, byName) {
  let css = "\n/* " + (recipe.className || recipe.name) + " (tier " + recipe.tier + "): " + (recipe.purpose || "") + " */\n";
  if (recipe.global) {
    Object.keys(recipe.rules).forEach((selector) => {
      if (selector.charAt(0) === "@") {
        css += resolveValue(selector, byName, true) + " {\n";
        Object.keys(recipe.rules[selector]).forEach((inner) => { css += emitRules(inner, recipe.rules[selector][inner], "", byName, "  "); });
        css += "}\n";
      } else {
        css += emitRules(selector, recipe.rules[selector], "", byName);
      }
    });
  } else {
    const cls = recipe.className;
    const self = "." + cls;
    if (recipe.base) css += emitRules(self, recipe.base, cls, byName);
    Object.keys(recipe.elements || {}).forEach((name) => {
      css += emitRules(self + "__" + name, recipe.elements[name], cls, byName);
    });
    Object.keys(recipe.variants || {}).forEach((group) => {
      Object.keys(recipe.variants[group]).forEach((choice) => {
        css += emitRules(self + "--" + choice, recipe.variants[group][choice], cls, byName);
      });
    });
    Object.keys(recipe.states || {}).forEach((state) => {
      css += emitRules(self + ".is-" + state, recipe.states[state], cls, byName);
    });
  }
  (recipe.system || []).forEach((rule) => {
    const pad = rule.media.length ? "  " : "";
    if (rule.media.length) css += rule.media[0] + " {\n";
    css += emitRules(rule.selector, rule.styles, "", byName, pad);
    if (rule.media.length) css += "}\n";
  });
  Object.keys(recipe.keyframes || {}).forEach((name) => {
    css += "@keyframes " + name + " {\n";
    Object.keys(recipe.keyframes[name]).forEach((step) => {
      css += emitRules(step, recipe.keyframes[name][step], "", byName, "  ");
    });
    css += "}\n";
  });
  return css;
}

/* Which CSS property shows a token of each family on the review board. Families not listed are shown as a value only. */
const SAMPLE_PROPERTY = [
  ["color.", "background"], ["space.", "width"], ["size.", "width"], ["radius.", "border-radius"], ["border.width.", "height"],
  ["shadow.", "box-shadow"], ["type.size.", "font-size"], ["type.weight.", "font-weight"], ["type.line_height.", "line-height"],
  ["type.letter_spacing.", "letter-spacing"], ["type.family.", "font-family"], ["opacity.", "opacity"], ["ratio.", "aspect-ratio"],
];

/** The property that shows a token on the board, or null. */
function sampleProperty(tokenName) {
  const hit = SAMPLE_PROPERTY.filter((pair) => tokenName.indexOf(pair[0]) === 0)[0];
  return hit ? hit[1] : null;
}

/** "color.text.primary" -> "sample--color-text-primary" */
function sampleClass(name) {
  return "sample--" + name.replace(/[._]/g, "-");
}

/** One class per token and per surface preset, so the review board can show each at its real value. */
function emitSamples(doc, surfaces, byName) {
  let css = "\n/* Samples for the review board (pages/components.html): one class per token and per surface preset. */\n";
  doc.tokens.forEach((t) => {
    const property = sampleProperty(t.token_name);
    if (property) css += "." + sampleClass(t.token_name) + " { " + property + ": var(" + cssVar(t.token_name) + "); }\n";
  });
  Object.keys(surfaces || {}).forEach((name) => {
    css += emitRules("." + sampleClass("surface." + name), surfaces[name].styles || {}, "", byName);
  });
  return css;
}

/** Builds the whole stylesheet as a string. */
function build() {
  const { doc, byName } = loadFoundations();
  let css = "/* ==========================================================================\n" +
    "   Empower design system. GENERATED FILE: do not edit by hand.\n" +
    "   Change design_system/tier_00_foundations.json or a recipe in\n" +
    "   design_system/recipes/, then run: node scripts/build_tokens.js\n" +
    "   ========================================================================== */\n\n";
  (doc.font_faces || []).forEach((face) => {
    css += "@font-face {\n  font-family: \"" + face.family + "\";\n  src: url(\"../" + face.file + "\") format(\"woff2\");\n" +
      "  font-weight: " + face.weight + ";\n  font-style: " + face.style + ";\n  font-display: swap;\n}\n\n";
  });
  css += ":root {\n  color-scheme: dark;\n";
  let category = "";
  doc.tokens.forEach((t) => {
    if (t.category !== category) { category = t.category; css += "\n  /* " + category + " */\n"; }
    css += "  " + cssVar(t.token_name) + ": " + tokenCss(t) + ";\n";
  });
  css += "}\n";
  loadRecipes().forEach((recipe) => { css += emitRecipe(recipe, byName); });
  css += emitSamples(doc, loadSurfaces().presets || {}, byName);
  return css;
}

if (require.main === module) {
  const css = build();
  if (process.argv.indexOf("--check") !== -1) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== css) {
      console.error("css/design-system.css is out of date. Run: node scripts/build_tokens.js");
      process.exit(1);
    }
    console.log("css/design-system.css matches the tokens and recipes.");
  } else {
    fs.writeFileSync(OUTPUT, css);
    console.log("Wrote css/design-system.css");
  }
}

module.exports = { build, loadFoundations, loadRecipes, loadStates, loadSurfaces, loadType, partBlock, applyInteraction, applySurface, sampleProperty, sampleClass, resolveToken, tokenCss, cssVar, expandSelector, ROOT };
