/* ==========================================================================
   check_design_system.js
   The gate that keeps the UI on the design system. It fails (exit code 1)
   when any design does not build from the foundation tokens.

   It is an ALLOW-LIST: a style value passes only when every part of it is a
   token of the right family, or a keyword, number or function that this file
   names for that exact property. Anything it does not know, it rejects.

   What it rejects:
     1. Recipes: a property this file does not list; a value part that is not
        a right-family token or a listed keyword, number or function; var(),
        url(), !important, stray braces; a selector with an id, a brace or a
        semicolon; a media query that is not on the list; a state class with
        no owning component.
     2. A token that does not exist, or is used for the wrong job.
     3. A recipe that leans on a recipe from the same or a higher tier, styles
        another component without listing it in "uses", or (tier 1 globals)
        restyles a component class.
     4. A recipe with motion and no reduced-motion rule.
     5. Text on a surface, set in one block, below 4.5:1 contrast; and any
        listed contrast pair below its minimum.
     6. Foundations: a token whose value does not fit its type, a duplicate
        name, an alias across families, a value with no real source.
     7. css/design-system.css differing from what the JSON generates, any
        hand-written rule in css/styles.css, or any other stylesheet.
     8. A class used in a page or script that no recipe defines.
     9. Styling from markup or scripts: style attributes, <style> blocks,
        extra stylesheets, el.style writes (only declared runtime.* tokens
        may be set), raw colours, coloured SVG attributes.
    11. Surfaces. The panel fill, the frosted bar, every shadow token and
        every backdrop blur come from one shared preset
        (design_system/surfaces.json) that a recipe names under "surface".
        A recipe that sets one of them by hand is refused, so the look of
        every panel, tile and bar changes in one place.
    10. States. Every button, link and field written in a page or script
        must have its states styled by its component: hover and pressed for
        anything you can press, selected for anything that can be chosen,
        focus for a field. Hover and pressed come from one shared preset
        (design_system/states.json) that a recipe names under "interaction".
        A recipe may waive a state only with a written reason ("waive"). Hover must sit inside "@media (hover: hover)", a
        focus outline may not be removed without a replacement, and one
        state has one name (is-selected, not is-on or is-active).

   What it cannot prove (needs the rendered board and a person): that the
   right token of a family was chosen, that a design looks like its reference,
   and contrast over images and gradients.

   Run:  node scripts/check_design_system.js
   Node standard library only.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { build, loadFoundations, loadRecipes, loadStates, loadSurfaces, resolveToken, cssVar, expandSelector, ROOT } = require("./build_tokens.js");

const words = (text) => text.split(" ").filter(Boolean);

/* Sets of keywords shared by several properties. */
const SIZE_WORDS = words("auto none fit-content min-content max-content env safe-area-inset-top safe-area-inset-bottom safe-area-inset-left safe-area-inset-right");
const ALIGN_WORDS = words("center start end flex-start flex-end stretch baseline space-between space-around space-evenly normal");
const EDGE_WORDS = words("center top bottom left right");
const LINE_WORDS = words("solid dashed dotted none currentColor transparent");
const NEUTRAL_LENGTHS = words("0 0px 100% 50% -50% 100vh 100dvh 100vw");

/* Every property a recipe may set, and exactly what its value may contain:
     tokens    token families allowed (a prefix of the token name)
     keywords  plain words allowed
     numbers   literal numbers allowed
     pattern   a shape of number allowed (for structure, like "2" columns)
     functions CSS functions allowed
   A property that is not here cannot be used until it is added on purpose. */
const PROPERTIES = [
  // Colour
  [/^(color|background-color|border(-top|-right|-bottom|-left)?-color|outline-color|fill|stroke|caret-color|accent-color|text-decoration-color|-webkit-tap-highlight-color|scrollbar-color)$/,
    { tokens: ["color"], keywords: words("transparent currentColor none") }],
  [/^(background|background-image)$/,
    { tokens: ["color", "size", "space"], keywords: words("none transparent currentColor to at circle ellipse closest-side farthest-side closest-corner farthest-corner no-repeat").concat(EDGE_WORDS),
      numbers: words("0 50% 100%"), functions: words("linear-gradient radial-gradient") }],
  [/^background-(attachment|repeat|clip|size|position)$/, { keywords: words("fixed scroll local no-repeat repeat border-box padding-box text cover contain auto").concat(EDGE_WORDS), numbers: words("0 50% 100%") }],

  // Size and position
  [/^((min-|max-)?(width|height)|top|right|bottom|left|inset|flex-basis)$/,
    { tokens: ["size", "space", "border.width", "runtime"], keywords: SIZE_WORDS, numbers: NEUTRAL_LENGTHS, functions: words("calc min max env") }],
  [/^(padding|margin)(-top|-right|-bottom|-left|-inline|-block)?$/,
    { tokens: ["space", "size"], keywords: words("auto env safe-area-inset-top safe-area-inset-bottom safe-area-inset-left safe-area-inset-right"), numbers: words("0 0px"), functions: words("calc max env") }],
  [/^(gap|row-gap|column-gap)$/, { tokens: ["space"], numbers: words("0") }],
  [/^z-index$/, { tokens: ["layer"], keywords: words("auto") }],
  [/^aspect-ratio$/, { tokens: ["ratio"], keywords: words("auto") }],
  [/^(transform-origin|object-position)$/, { keywords: EDGE_WORDS, numbers: words("0 50% 100%") }],

  // Borders and surface treatment
  [/^(border|border-top|border-right|border-bottom|border-left|outline)$/, { tokens: ["border.width", "color"], keywords: LINE_WORDS, numbers: words("0") }],
  [/^(border-width|stroke-width)$/, { tokens: ["border.width"], numbers: words("0") }],
  [/^(outline-offset|text-underline-offset|text-decoration-thickness)$/, { tokens: ["space", "border.width"], numbers: words("0"), functions: words("calc") }],
  [/^border(-top|-bottom)?(-left|-right)?-radius$/, { tokens: ["radius"], numbers: words("0") }],
  [/^(box-shadow|text-shadow)$/, { tokens: ["shadow", "color", "border.width", "space"], keywords: words("inset none"), numbers: words("0") }],
  [/^opacity$/, { tokens: ["opacity"] }],
  [/^(filter|backdrop-filter|-webkit-backdrop-filter)$/, { tokens: ["blur", "color", "space"], keywords: words("none"), numbers: words("0"), functions: words("blur drop-shadow") }],

  // Type
  [/^font-size$/, { tokens: ["type.size"] }],
  [/^font-weight$/, { tokens: ["type.weight"] }],
  [/^font-family$/, { tokens: ["type.family"] }],
  [/^font$/, { keywords: [] }],
  [/^line-height$/, { tokens: ["type.line_height"] }],
  [/^letter-spacing$/, { tokens: ["type.letter_spacing"] }],
  [/^text-decoration$/, { tokens: ["color", "border.width"], keywords: words("underline none line-through") }],
  [/^-webkit-text-size-adjust$/, { numbers: words("100%") }],
  [/^content$/, { keywords: words("none") }],

  // Motion
  [/^transition$/, { tokens: ["motion.duration", "motion.easing"], keywords: words("none"), propertyNames: true }],
  [/^animation$/, { tokens: ["motion.duration", "motion.easing"], keywords: words("none infinite both forwards backwards alternate"), pattern: /^[1-9]$/, keyframeNames: true }],
  [/^(animation|transition)-delay$/, { tokens: ["motion.duration"], numbers: words("0"), functions: words("calc") }],
  [/^transform$/, { tokens: ["motion.scale", "motion.distance", "motion.angle", "space", "size", "runtime"], keywords: words("none"),
    numbers: words("0 50% -50% 100% -100%"), functions: words("translate translateX translateY translateZ scale rotate calc") }],

  // A runtime token given a fixed value by a recipe (the board uses this to show a filled bar)
  [/^--runtime-[a-z_]+$/, { numbers: words("0 50% 100%"), functions: words("calc"), runtimeToken: true }],

  // Layout structure: small whole numbers only
  [/^grid-template-(columns|rows)$/, { tokens: ["size", "space"], keywords: words("auto none min-content max-content auto-fill auto-fit"), numbers: words("0 100%"), pattern: /^([1-9]fr|[1-9]|1[0-2])$/, functions: words("repeat minmax min") }],
  [/^flex$/, { tokens: ["size"], keywords: words("auto none"), numbers: words("0 100%"), pattern: /^[0-9]$/ }],
  [/^(flex-grow|flex-shrink|order|-webkit-line-clamp)$/, { pattern: /^-?[0-9]$/ }],
  [/^(grid-area|grid-column|grid-row)$/, { keywords: words("auto span"), pattern: /^-?[0-9]$/ }],

  // Keyword-only properties: each lists the values it may take
  [/^display$/, { keywords: words("none block inline inline-block flex inline-flex grid inline-grid contents -webkit-box") }],
  [/^position$/, { keywords: words("static relative absolute fixed sticky") }],
  [/^overflow(-x|-y)?$/, { keywords: words("hidden auto visible scroll clip") }],
  [/^cursor$/, { keywords: words("pointer grab grabbing default not-allowed text") }],
  [/^pointer-events$/, { keywords: words("none auto") }],
  [/^box-sizing$/, { keywords: words("border-box") }],
  [/^(align|justify|place)-(items|content|self)$/, { keywords: ALIGN_WORDS }],
  [/^flex-direction$/, { keywords: words("row column row-reverse column-reverse") }],
  [/^flex-wrap$/, { keywords: words("wrap nowrap") }],
  [/^grid-auto-flow$/, { keywords: words("row column dense") }],
  [/^float$/, { keywords: words("left right none") }],
  [/^text-align$/, { keywords: words("left right center start end") }],
  [/^text-transform$/, { keywords: words("uppercase lowercase capitalize none") }],
  [/^text-overflow$/, { keywords: words("ellipsis clip") }],
  [/^white-space$/, { keywords: words("nowrap normal pre-wrap pre-line") }],
  [/^overflow-wrap$/, { keywords: words("anywhere break-word normal") }],
  [/^text-wrap$/, { keywords: words("balance pretty wrap nowrap") }],
  [/^user-select$/, { keywords: words("none auto text") }],
  [/^touch-action$/, { keywords: words("pan-y pan-x none manipulation auto") }],
  [/^isolation$/, { keywords: words("isolate auto") }],
  [/^object-fit$/, { keywords: words("cover contain") }],
  [/^vertical-align$/, { keywords: words("middle top bottom baseline") }],
  [/^font-variant-numeric$/, { keywords: words("tabular-nums") }],
  [/^text-rendering$/, { keywords: words("optimizeLegibility") }],
  [/^-webkit-font-smoothing$/, { keywords: words("antialiased") }],
  [/^-webkit-box-orient$/, { keywords: words("vertical") }],
  [/^stroke-line(cap|join)$/, { keywords: words("round") }],
  [/^scroll-behavior$/, { keywords: words("auto smooth") }],
  [/^scroll-snap-type$/, { keywords: words("x y mandatory proximity none") }],
  [/^scroll-snap-align$/, { keywords: words("start center end none") }],
  [/^scrollbar-width$/, { keywords: words("none thin auto") }],
  [/^overscroll-behavior(-x|-y)?$/, { keywords: words("contain none auto") }],
  [/^list-style$/, { keywords: words("none") }],
  [/^visibility$/, { keywords: words("hidden visible") }],
  [/^appearance$/, { keywords: words("none") }],
  [/^resize$/, { keywords: words("none vertical") }],
  [/^will-change$/, { keywords: words("transform opacity") }],
];

/* Words any property may take. */
const UNIVERSAL_WORDS = ["inherit"];

/* The only at-rules a recipe may open. */
const MEDIA_ALLOWED = [
  /^@media \(prefers-reduced-motion: reduce\)$/,
  /^@media \(prefers-reduced-motion: no-preference\)$/,
  /^@media \(hover: hover\)$/,
  /^@media \((min|max)-width: \{breakpoint\.[a-z_]+\}\)$/,
];
const REDUCED_MOTION = "@media (prefers-reduced-motion: reduce)";

/* Top-level keys a recipe file may hold ("tier" and "file" are added on load). */
const RECIPE_KEYS = words("className name global purpose uses waive interaction surface system base elements variants defaultVariants states keyframes rules tier file");

/* How each state is recognised in a selector. Hover must also sit inside the hover media query. */
const HOVER_MEDIA = "@media (hover: hover)";
const STATE_SHAPES = {
  hover: /:hover/,
  pressed: /:active/,
  selected: /\[aria-(pressed|selected|checked)="true"\]|\[aria-current(="[a-z]+")?\]|\.is-selected(?![\w-])/,
  focus: /:focus(-visible|-within)?(?![\w-])/,
  disabled: /:disabled|\[aria-disabled="true"\]/,
};
/* One state, one name: these would all mean "selected". */
const STATE_SYNONYMS = { on: "selected", active: "selected", current: "selected", checked: "selected", chosen: "selected", picked: "selected" };
const WAIVE_KEY = /^(?:__([a-z][a-z0-9-]*):)?(hover|pressed|selected|focus|disabled)$/;

/* Folders the check does not read, each for a stated reason. Everything else
   in the repository is covered. */
const EXCLUDED_FOLDERS = {
  ".git": "version control", ".github": "workflow files, no UI", "node_modules": "not part of the app",
  "prototype": "old mockups, reference only (AGENTS.md)", "events_flow": "design specs, not shipped",
  "user_connecting_flow": "design specs, not shipped", "skills": "design tooling, not shipped",
  "_templates": "design templates, not shipped", "docs": "documentation", "tests": "test code",
  "scripts": "build and check scripts, no UI", "design_system": "checked as recipes and foundations",
  "data": "generated data, no markup", "img": "images", "fonts": "font files", ".impeccable": "local design notes",
};
const STYLESHEETS_ALLOWED = ["css/design-system.css", "css/styles.css"];

function specFor(property) {
  const entry = PROPERTIES.find((e) => e[0].test(property));
  return entry ? entry[1] : null;
}

/** Checks one CSS value against its property's allow-list. Returns a list of problems.
    context: { keyframes: {name: true}, allowImportant: bool } */
function checkValue(property, value, byName, context) {
  const ctx = context || {};
  const problems = [];
  if (!/^-?-?[a-z][a-z_-]*$/.test(property)) return ["\"" + property + "\" is not a plain property name"];
  const spec = specFor(property);
  if (spec && spec.runtimeToken && !Object.keys(byName).some((name) => name.indexOf("runtime.") === 0 && cssVar(name) === property)) {
    return [property + " is not a declared runtime token"];
  }
  if (!spec) return ["property " + property + " is not on the allow-list in scripts/check_design_system.js"];

  let text = String(value);
  if (/!important/.test(text)) {
    if (ctx.allowImportant && property === "display" && /^none\s*!important$/.test(text.trim())) text = "none";
    else problems.push("!important is not allowed");
    text = text.replace(/!important/g, " ");
  }
  if (property === "content") {
    return /^(none|"[^"\\<>{};]*")$/.test(text.trim()) ? problems : problems.concat("content must be none or one plain quoted string");
  }

  const refs = [];
  let bare = text.replace(/\{([a-z0-9_.]+)\}/g, (whole, name) => { refs.push(name); return " "; });
  refs.forEach((name) => {
    if (!byName[name]) { problems.push("unknown token {" + name + "}"); return; }
    const families = spec.tokens || [];
    if (!families.some((prefix) => name === prefix || name.indexOf(prefix + ".") === 0)) {
      problems.push("{" + name + "} is not a " + (families.join(" or ") || "token this property takes") + " token, which " + property + " needs");
    }
  });

  if (/[{}]/.test(bare)) problems.push("stray brace; a token is written {family.name} in lower case");
  if (/[;]|\/\*|["'\\<>]/.test(bare)) problems.push("quoted text or punctuation that does not belong in a style value");
  if (/#[0-9a-fA-F]{3,8}\b/.test(bare)) problems.push("raw colour");
  bare = bare.replace(/#[0-9a-fA-F]{3,8}\b/g, " ");

  const functions = [];
  bare = bare.replace(/(-?[a-zA-Z][a-zA-Z0-9-]*)\s*\(/g, (whole, name) => { functions.push(name); return " ( "; });
  functions.forEach((name) => {
    if ((spec.functions || []).indexOf(name) === -1) {
      if (/^(rgba?|hsla?|hwb|lab|lch|oklab|oklch|color|color-mix)$/.test(name)) problems.push("raw colour");
      else if (/^(cubic-bezier|steps|linear)$/.test(name)) problems.push("raw easing curve");
      else if (name === "var") problems.push("var() is not allowed; write the token as {family.name}");
      else problems.push("function " + name + "() is not allowed in " + property);
    }
  });
  const inCalc = functions.indexOf("calc") !== -1;

  const parts = bare.split(/[\s,()\/*+]+/).filter((part) => part && part !== "-");
  parts.forEach((part) => {
    if (/^-?(?:\d*\.)?\d+[a-zA-Z%]*$/.test(part)) {
      if ((spec.numbers || []).indexOf(part) !== -1) return;
      if (spec.pattern && spec.pattern.test(part)) return;
      if (inCalc && /^-?(?:1|2|0\.5)$/.test(part)) return;
      problems.push("raw value " + part);
      return;
    }
    if (UNIVERSAL_WORDS.indexOf(part) !== -1 || (spec.keywords || []).indexOf(part) !== -1) return;
    if (spec.propertyNames && specFor(part)) return;
    if (spec.keyframeNames && ctx.keyframes && ctx.keyframes[part]) return;
    if (property === "font-family") problems.push("raw font name");
    else if (/^(ease|ease-in|ease-out|ease-in-out|linear|step-start|step-end)$/.test(part)) problems.push("raw easing " + part + "; use a motion.easing token");
    else if (specFor("color") && isColourWord(part)) problems.push("raw colour");
    else problems.push("\"" + part + "\" is not an allowed value for " + property);
  });
  return problems.filter((p, i) => problems.indexOf(p) === i);
}

/* A short list is enough here: the allow-list already rejects unknown words.
   This only makes the message say "raw colour" for the common ones. */
function isColourWord(word) {
  return /^(white|black|red|green|blue|gray|grey|orange|yellow|purple|pink|silver|navy|teal|aqua|cyan|magenta|maroon|olive|lime|gold|rebeccapurple|tomato|coral|salmon|crimson|indigo|violet|beige|ivory|tan|brown)$/i.test(word);
}

/** Problems with a nested selector key (not an at-rule). */
function selectorProblems(key) {
  const problems = [];
  if (/[{};]|\/\*|\\/.test(key)) problems.push("selector holds a brace, semicolon or comment");
  if (/#/.test(key)) problems.push("selector uses an id or a raw colour; style by class");
  if (!/^[-a-zA-Z0-9_ .,:&$>+~*()\[\]="'^|]+$/.test(key)) problems.push("selector holds characters that are not allowed");
  return problems;
}

/** Walks a style object (with nested selectors) and reports every bad key and value. */
function checkStyles(styles, where, byName, errors, file, context) {
  Object.keys(styles || {}).forEach((key) => {
    const value = styles[key];
    if (value !== null && typeof value === "object") {
      if (key.charAt(0) === "@") {
        if (!MEDIA_ALLOWED.some((allowed) => allowed.test(key))) {
          errors.push(file + ": " + where + " " + key + ": this at-rule is not on the allow-list (a width query must use a breakpoint token)");
        }
      } else {
        selectorProblems(key).forEach((problem) => errors.push(file + ": " + where + " \"" + key + "\": " + problem));
      }
      checkStyles(value, where + " " + key, byName, errors, file, context);
      return;
    }
    checkValue(key, value, byName, context).forEach((problem) => {
      errors.push(file + ": " + where + " { " + key + ": " + value + " } " + problem);
    });
  });
}

/** Every nested selector key in a style object, however deep. */
function selectorKeys(styles, found) {
  Object.keys(styles || {}).forEach((key) => {
    if (styles[key] !== null && typeof styles[key] === "object") {
      if (key.charAt(0) !== "@") found.push(key);
      selectorKeys(styles[key], found);
    }
  });
  return found;
}

/** Every style object a recipe holds, with a label for error messages. */
function recipeBlocks(recipe) {
  const blocks = [];
  if (recipe.global) {
    Object.keys(recipe.rules || {}).forEach((s) => {
      if (s.charAt(0) === "@") Object.keys(recipe.rules[s]).forEach((inner) => blocks.push([s + " " + inner, recipe.rules[s][inner], inner, s]));
      else blocks.push([s, recipe.rules[s], s]);
    });
  }
  if (recipe.base) blocks.push(["base", recipe.base]);
  Object.keys(recipe.elements || {}).forEach((n) => blocks.push(["__" + n, recipe.elements[n]]));
  Object.keys(recipe.variants || {}).forEach((g) => Object.keys(recipe.variants[g] || {}).forEach((c) => blocks.push(["--" + c, recipe.variants[g][c]])));
  Object.keys(recipe.states || {}).forEach((s) => blocks.push([".is-" + s, recipe.states[s]]));
  Object.keys(recipe.keyframes || {}).forEach((k) => Object.keys(recipe.keyframes[k] || {}).forEach((step) => blocks.push(["@keyframes " + k + " " + step, recipe.keyframes[k][step]])));
  return blocks;
}

/** Every rule a recipe writes, flattened: its full selector, the at-rules around it, its own declarations. */
function expandedRules(recipe) {
  const rules = [];
  const cls = recipe.className || "";
  const walk = (selector, styles, media) => {
    const own = {};
    Object.keys(styles || {}).forEach((key) => {
      const value = styles[key];
      if (value !== null && typeof value === "object") {
        if (key.charAt(0) === "@") walk(selector, value, media.concat(key));
        else walk(cls ? expandSelector(key, selector, cls) : key, value, media);
      } else own[key] = value;
    });
    if (Object.keys(own).length) rules.push({ selector: selector, media: media, styles: own });
  };
  if (recipe.global) {
    Object.keys(recipe.rules || {}).forEach((key) => {
      if (key.charAt(0) === "@") Object.keys(recipe.rules[key] || {}).forEach((inner) => walk(inner, recipe.rules[key][inner], [key]));
      else walk(key, recipe.rules[key], []);
    });
    return rules;
  }
  const self = "." + cls;
  if (recipe.base) walk(self, recipe.base, []);
  Object.keys(recipe.elements || {}).forEach((n) => walk(self + "__" + n, recipe.elements[n], []));
  Object.keys(recipe.variants || {}).forEach((g) => Object.keys(recipe.variants[g] || {}).forEach((c) => walk(self + "--" + c, recipe.variants[g][c], [])));
  Object.keys(recipe.states || {}).forEach((n) => walk(self + ".is-" + n, recipe.states[n], []));
  return rules.concat(recipe.system || []);
}

/** True when the rules style the given state for a class (or, with no class, for a bare tag). */
function stylesState(rules, state, className, tag) {
  const target = className
    ? new RegExp("\\." + className.replace(/[-]/g, "\\-") + "(?![\\w-])")
    : new RegExp("(^|[\\s>+~(])" + tag + "(?![\\w-])|^[^a-z.]*[:\\[]");
  return rules.some((rule) => {
    if (state === "hover" && rule.media.indexOf(HOVER_MEDIA) === -1) return false;
    return rule.selector.split(",").some((part) => {
      const one = part.trim();
      if (!STATE_SHAPES[state].test(one)) return false;
      return className ? target.test(one) : (new RegExp("(^|[\\s>+~(])" + tag + "(?![\\w-])").test(one) || /^[:\[]/.test(one));
    });
  });
}

/** Every button, link and field written in a page or a script, with its literal classes. */
function interactiveElements(file, text) {
  const found = [];
  const tag = /<(button|a|input|select|textarea|summary)\b([^>]*)/g;
  let m;
  while ((m = tag.exec(text))) {
    const attrs = m[2];
    const cls = /(?:^|\s)class\s*=\s*\\?["']([^"'<>]*)/.exec(attrs);
    if (m[1] === "input" && /type\s*=\s*\\?["']hidden/.test(attrs)) continue;
    found.push({
      file: file, line: lineAt(text, m.index), tag: m[1],
      hasClass: Boolean(cls),
      classes: cls ? cls[1].split(/\s+/).filter((name) => /^[a-z][a-zA-Z0-9_-]*$/.test(name)) : [],
      selectable: /aria-(pressed|selected|checked|current)\b/.test(attrs),
    });
  }
  const role = /<(div|span|li|p|article|section)\b([^>]*\brole\s*=\s*\\?["'](?:button|tab|link|switch|checkbox|radio)[^>]*)/g;
  while ((m = role.exec(text))) {
    const cls = /(?:^|\s)class\s*=\s*\\?["']([^"'<>]*)/.exec(m[2]);
    found.push({ file: file, line: lineAt(text, m.index), tag: "button", hasClass: Boolean(cls), classes: cls ? cls[1].split(/\s+/).filter(Boolean) : [], selectable: /aria-(pressed|selected|checked|current)\b/.test(m[2]) });
  }
  return found;
}

/** Checks that every interactive element's states are styled by its component, or waived with a reason. */
function checkInteraction(elements, recipes) {
  const errors = [];
  const byClass = {};
  const rulesOf = {};
  let globalRules = [];
  recipes.forEach((recipe) => {
    if (recipe.global) globalRules = globalRules.concat(expandedRules(recipe));
    else if (recipe.className) { byClass[recipe.className] = recipe; rulesOf[recipe.className] = expandedRules(recipe); }
  });
  const seen = {};
  elements.forEach((el) => {
    const needs = [];
    if (/^(button|a|summary)$/.test(el.tag)) needs.push("hover", "pressed");
    if (/^(input|select|textarea)$/.test(el.tag)) needs.push("focus");
    if (el.selectable) needs.push("selected");
    // The classes that name a component or one of its parts (a variant rides on its component).
    const owned = el.classes.filter((name) => name.indexOf("--") === -1 && byClass[name.split("__")[0]]);
    const where = el.file + ":" + el.line + ": <" + el.tag + (el.classes.length ? " class=\"" + el.classes.join(" ") + "\"" : "") + ">";
    if (el.hasClass && !owned.length) {
      const key = el.file + "|" + el.tag + "|" + el.classes.join(" ");
      if (!seen[key]) errors.push(where + " is interactive but starts with no component class the check can read");
      seen[key] = true;
      return;
    }
    needs.forEach((state) => {
      const styled = owned.length
        ? owned.some((name) => stylesState(rulesOf[name.split("__")[0]], state, name))
        : stylesState(globalRules, state, "", el.tag);
      if (styled) return;
      const waived = owned.some((name) => {
        const parts = name.split("__");
        const waive = byClass[parts[0]].waive || {};
        return waive[(parts[1] ? "__" + parts[1] + ":" : "") + state] || waive[state];
      });
      if (waived) return;
      const key = el.tag + "|" + el.classes.join(" ") + "|" + state;
      if (seen[key]) return;
      seen[key] = true;
      errors.push(where + " has no " + state + " state" + (owned.length ? ": style it in the ." + owned[0].split("__")[0] + " recipe" + (state === "hover" ? " inside \"" + HOVER_MEDIA + "\"" : "") + ", or waive it with a reason" : ": give it a component class"));
    });
  });
  return errors;
}

/** Checks the shared surface presets: a purpose, and every value built from tokens. */
function checkSurfaces(doc, byName) {
  const errors = [];
  const file = "design_system/surfaces.json";
  Object.keys((doc && doc.presets) || {}).forEach((name) => {
    const preset = doc.presets[name];
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) errors.push(file + ": preset name \"" + name + "\" must be lower-case words joined by hyphens");
    if (!preset.purpose || String(preset.purpose).trim().length < 12) errors.push(file + ": preset " + name + " needs a purpose");
    Object.keys(preset).forEach((part) => { if (part !== "purpose" && part !== "styles") errors.push(file + ": preset " + name + " has an unknown part \"" + part + "\""); });
    if (!preset.styles || !Object.keys(preset.styles).length) errors.push(file + ": preset " + name + " sets no styles");
    Object.keys(preset.styles || {}).forEach((prop) => {
      if (preset.styles[prop] !== null && typeof preset.styles[prop] === "object") errors.push(file + ": preset " + name + " may not nest selectors");
    });
    checkStyles(preset.styles || {}, name, byName, errors, file, { keyframes: {}, allowImportant: false });
    contrastInBlocks(preset.styles || {}, name, byName, errors, file);
  });
  return errors;
}

/** Checks the shared state presets: only known parts, and every value built from tokens. */
function checkStates(doc, byName) {
  const errors = [];
  const file = "design_system/states.json";
  const parts = words("purpose rest hover pressed selected_hover selected_pressed reduced reduced_pressed");
  Object.keys((doc && doc.presets) || {}).forEach((name) => {
    const preset = doc.presets[name];
    if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) errors.push(file + ": preset name \"" + name + "\" must be lower-case words joined by hyphens");
    if (!preset.purpose || String(preset.purpose).trim().length < 12) errors.push(file + ": preset " + name + " needs a purpose");
    if (!preset.hover || !preset.pressed) errors.push(file + ": preset " + name + " must style both hover and pressed");
    Object.keys(preset).forEach((part) => {
      if (parts.indexOf(part) === -1) { errors.push(file + ": preset " + name + " has an unknown part \"" + part + "\""); return; }
      if (part === "purpose") return;
      Object.keys(preset[part]).forEach((prop) => {
        if (preset[part][prop] !== null && typeof preset[part][prop] === "object") errors.push(file + ": preset " + name + " " + part + " may not nest selectors");
      });
      checkStyles(preset[part], name + " " + part, byName, errors, file, { keyframes: {}, allowImportant: false });
    });
    const moves = preset.rest && preset.rest.transition && String(preset.rest.transition).trim() !== "none";
    if (moves && !(preset.reduced && String(preset.reduced.transition).trim() === "none")) errors.push(file + ": preset " + name + " has a transition but no reduced rule that turns it off");
    if (preset.pressed && preset.pressed.transform && !(preset.reduced_pressed && preset.reduced_pressed.transform === "none")) errors.push(file + ": preset " + name + " moves when pressed but has no reduced_pressed rule");
  });
  return errors;
}

/** True when a style object, at any depth, sets motion that is not "none". */
function hasMotion(styles, insideReduced) {
  return Object.keys(styles || {}).some((key) => {
    const value = styles[key];
    if (value !== null && typeof value === "object") return key === REDUCED_MOTION ? false : hasMotion(value, insideReduced);
    return /^(transition|animation)$/.test(key) && String(value).trim() !== "none";
  });
}

/** True when a style object, at any depth, holds a reduced-motion block. */
function hasReducedMotion(styles) {
  return Object.keys(styles || {}).some((key) => {
    const value = styles[key];
    if (value === null || typeof value !== "object") return false;
    return key === REDUCED_MOTION || hasReducedMotion(value);
  });
}

/** Text colour and surface colour set together in one block must be readable. */
function contrastInBlocks(styles, where, byName, errors, file) {
  const single = (value) => { const m = /^\s*\{([a-z0-9_.]+)\}\s*$/.exec(String(value === undefined ? "" : value)); return m ? resolveToken(m[1], byName) : null; };
  const text = single(styles.color);
  const surface = single(styles["background-color"] !== undefined ? styles["background-color"] : styles.background);
  const solid = (t) => t && /^#[0-9a-fA-F]{6}$/.test(String(t.token_value));
  if (solid(text) && solid(surface)) {
    const ratio = contrast(text.token_value, surface.token_value);
    if (ratio < 4.5) errors.push(file + ": " + where + " text " + styles.color + " on " + (styles["background-color"] || styles.background) + " is " + ratio.toFixed(2) + ":1, below 4.5:1");
  }
  Object.keys(styles || {}).forEach((key) => {
    if (styles[key] !== null && typeof styles[key] === "object") contrastInBlocks(styles[key], where + " " + key, byName, errors, file);
  });
}

/** Checks all recipes: shape, values, token use, tier order, motion and contrast. */
function checkRecipes(recipes, byName, presets, surfacePresets, rawRecipes) {
  const errors = [];
  const known = presets || loadStates().presets || {};
  const surfaces = surfacePresets || loadSurfaces().presets || {};
  // Surface materials may only come from a preset. "rawRecipes" are the files as written, before presets are laid in.
  (rawRecipes || []).forEach((raw) => {
    const walk = (styles, where) => Object.keys(styles || {}).forEach((key) => {
      const value = styles[key];
      if (value !== null && typeof value === "object") { walk(value, where + " " + key); return; }
      const text = String(value);
      const owned = (/^background(-color)?$/.test(key) && /^\s*\{color\.surface\.(panel|bar)\}\s*$/.test(text)) ||
        (key === "box-shadow" && /\{shadow\./.test(text)) || /^(-webkit-)?backdrop-filter$/.test(key);
      if (owned) errors.push(raw.file + ": " + where + " { " + key + ": " + text + " } sets a surface by hand; name a preset from design_system/surfaces.json under \"surface\"");
    });
    // Tier 7 holds the specimen screens that display the materials themselves (swatches, shadow samples).
    if (raw.global || /\/tier_07_/.test(raw.file)) return;
    walk(raw.base, "base");
    Object.keys(raw.elements || {}).forEach((n) => walk(raw.elements[n], "__" + n));
    Object.keys(raw.variants || {}).forEach((g) => Object.keys(raw.variants[g] || {}).forEach((c) => walk(raw.variants[g][c], "--" + c)));
    Object.keys(raw.states || {}).forEach((n) => walk(raw.states[n], ".is-" + n));
  });
  const byClass = {};
  const keyframes = {};
  recipes.forEach((recipe) => {
    const id = recipe.className || recipe.name;
    Object.keys(recipe).forEach((key) => {
      if (RECIPE_KEYS.indexOf(key) === -1) errors.push(recipe.file + ": \"" + key + "\" is not a recipe key");
    });
    if (!id) errors.push(recipe.file + ": a recipe needs a className (or a name when global)");
    if (recipe.className && !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(recipe.className)) errors.push(recipe.file + ": className \"" + recipe.className + "\" must be lower-case words joined by single hyphens");
    if (recipe.global && recipe.tier !== 1) errors.push(recipe.file + ": only a tier 1 recipe may set global rules");
    if (recipe.global && recipe.className) errors.push(recipe.file + ": a global recipe has a name, not a className");
    if (!recipe.global && recipe.rules) errors.push(recipe.file + ": only a global recipe may hold rules");
    if (!recipe.purpose || String(recipe.purpose).trim().length < 12) errors.push(recipe.file + ": a recipe needs a purpose, so teammates know what it is for");
    if (recipe.className) {
      if (byClass[recipe.className]) errors.push(recipe.file + ": class ." + recipe.className + " is already defined in " + byClass[recipe.className].file);
      byClass[recipe.className] = recipe;
    }
    Object.keys(recipe.keyframes || {}).forEach((name) => {
      if (keyframes[name]) errors.push(recipe.file + ": keyframes \"" + name + "\" are already defined in " + keyframes[name]);
      keyframes[name] = recipe.file;
    });
    const seenChoice = {};
    Object.keys(recipe.variants || {}).forEach((group) => Object.keys(recipe.variants[group] || {}).forEach((choice) => {
      if (seenChoice[choice]) errors.push(recipe.file + ": variant choice \"" + choice + "\" appears in two groups, so both would write ." + id + "--" + choice);
      seenChoice[choice] = true;
    }));
    ["elements", "states"].forEach((part) => Object.keys(recipe[part] || {}).forEach((name) => {
      if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name)) errors.push(recipe.file + ": " + part + " name \"" + name + "\" must be lower-case words joined by hyphens");
    }));
    Object.keys(recipe.states || {}).forEach((name) => {
      if (STATE_SYNONYMS[name]) errors.push(recipe.file + ": state \"" + name + "\" must be named \"" + STATE_SYNONYMS[name] + "\"; one state has one name");
    });
    if (recipe.interaction !== undefined) {
      if (recipe.interaction === null || typeof recipe.interaction !== "object" || Array.isArray(recipe.interaction) || recipe.global) errors.push(recipe.file + ": interaction must be an object of part: preset, on a component recipe");
      else Object.keys(recipe.interaction).forEach((part) => {
        const m = /^(base|__([a-z][a-z0-9-]*)|--([a-z][a-z0-9-]*))$/.exec(part);
        if (!m) errors.push(recipe.file + ": interaction key \"" + part + "\" must be \"base\", \"__part\" or \"--variant\"");
        else if (m[2] && !(recipe.elements || {})[m[2]]) errors.push(recipe.file + ": interaction names the part " + part + ", which this recipe does not have");
        else if (m[3] && !Object.keys(recipe.variants || {}).some((group) => recipe.variants[group][m[3]])) errors.push(recipe.file + ": interaction names the variant " + part + ", which this recipe does not have");
        if (!known[recipe.interaction[part]]) errors.push(recipe.file + ": interaction preset \"" + recipe.interaction[part] + "\" is not in design_system/states.json");
      });
    }
    if (recipe.surface !== undefined) {
      if (recipe.surface === null || typeof recipe.surface !== "object" || Array.isArray(recipe.surface) || recipe.global) errors.push(recipe.file + ": surface must be an object of part: preset, on a component recipe");
      else Object.keys(recipe.surface).forEach((part) => {
        const m = /^(base|__([a-z][a-z0-9-]*)|--([a-z][a-z0-9-]*))$/.exec(part);
        if (!m) errors.push(recipe.file + ": surface key \"" + part + "\" must be \"base\", \"__part\" or \"--variant\"");
        else if (m[2] && !(recipe.elements || {})[m[2]]) errors.push(recipe.file + ": surface names the part " + part + ", which this recipe does not have");
        else if (m[3] && !Object.keys(recipe.variants || {}).some((group) => recipe.variants[group][m[3]])) errors.push(recipe.file + ": surface names the variant " + part + ", which this recipe does not have");
        if (!(surfaces || {})[recipe.surface[part]]) errors.push(recipe.file + ": surface preset \"" + recipe.surface[part] + "\" is not in design_system/surfaces.json");
      });
    }
    if (recipe.waive !== undefined) {
      if (recipe.waive === null || typeof recipe.waive !== "object" || Array.isArray(recipe.waive)) errors.push(recipe.file + ": waive must be an object of state: reason");
      else Object.keys(recipe.waive).forEach((key) => {
        const m = WAIVE_KEY.exec(key);
        if (!m) errors.push(recipe.file + ": waive key \"" + key + "\" must be a state (hover, pressed, selected, focus, disabled), or \"__part:state\"");
        else if (m[1] && !(recipe.elements || {})[m[1]]) errors.push(recipe.file + ": waive key \"" + key + "\" names a part this recipe does not have");
        if (typeof recipe.waive[key] !== "string" || recipe.waive[key].trim().length < 20) errors.push(recipe.file + ": waive \"" + key + "\" needs a written reason (20 characters or more)");
      });
    }
  });

  recipes.forEach((recipe) => {
    const blocks = recipeBlocks(recipe);
    if (!blocks.length) errors.push(recipe.file + ": the recipe sets no styles");
    const context = { keyframes: keyframes, allowImportant: Boolean(recipe.global) };
    blocks.forEach((block) => {
      if (recipe.global) {
        if (block[3] && !MEDIA_ALLOWED.some((allowed) => allowed.test(block[3]))) errors.push(recipe.file + ": " + block[3] + ": this at-rule is not on the allow-list");
        selectorProblems(block[2]).forEach((problem) => errors.push(recipe.file + ": \"" + block[2] + "\": " + problem));
        (block[2].match(/\.[a-z][a-zA-Z0-9_-]*/g) || []).forEach((cls) => {
          const root = cls.slice(1).split(/__|--/)[0];
          if (byClass[root]) errors.push(recipe.file + ": global rule \"" + block[2] + "\" restyles the component ." + root + "; change that component's recipe");
        });
      }
      checkStyles(block[1], block[0], byName, errors, recipe.file, context);
      contrastInBlocks(block[1], block[0], byName, errors, recipe.file);
    });

    const systemReduced = (recipe.system || []).some((rule) => rule.media.indexOf(REDUCED_MOTION) !== -1);
    if (blocks.some((block) => hasMotion(block[1])) && !systemReduced && !blocks.some((block) => hasReducedMotion(block[1]) || block[3] === REDUCED_MOTION)) {
      errors.push(recipe.file + ": the recipe has a transition or animation but no \"" + REDUCED_MOTION + "\" rule");
    }

    const flat = expandedRules(recipe);
    flat.forEach((rule) => {
      if (/:hover/.test(rule.selector) && rule.media.indexOf(HOVER_MEDIA) === -1 && rule.media.indexOf(REDUCED_MOTION) === -1) {
        errors.push(recipe.file + ": \"" + rule.selector + "\" sets hover outside \"" + HOVER_MEDIA + "\", so it sticks after a tap on a phone");
      }
      if (/\.is-(on|active|current|checked|chosen|picked)(?![\w-])/.test(rule.selector)) {
        errors.push(recipe.file + ": \"" + rule.selector + "\" uses a second name for the selected state; use .is-selected");
      }
      const outline = rule.styles.outline !== undefined ? String(rule.styles.outline).trim() : (rule.styles["outline-width"] !== undefined ? String(rule.styles["outline-width"]).trim() : null);
      if (outline !== null && /^(none|0|0px)$/.test(outline)) {
        const replaced = flat.some((other) => (other === rule ? /:focus/.test(rule.selector) : /:focus-visible/.test(other.selector)) &&
          ["outline", "box-shadow", "border-color", "border"].filter((prop) => other !== rule || prop !== "outline").some((prop) => other.styles[prop] !== undefined && !/^(none|0|0px)$/.test(String(other.styles[prop]).trim())));
        if (!replaced) errors.push(recipe.file + ": \"" + rule.selector + "\" removes the focus outline and the recipe draws no :focus-visible replacement");
      }
    });

    (recipe.uses || []).forEach((name) => {
      const other = byClass[name];
      if (!other) errors.push(recipe.file + ": uses ." + name + ", which no recipe defines");
      else if (other.tier >= recipe.tier) {
        errors.push(recipe.file + ": tier " + recipe.tier + " recipe uses ." + name + " from tier " + other.tier + "; a recipe may only build on lower tiers");
      }
    });
    if (recipe.className) {
      const own = recipe.className;
      blocks.forEach((block) => selectorKeys(block[1], []).forEach((key) => {
        const expanded = expandSelector(key, "." + own, own);
        (expanded.match(/\.[a-z][a-zA-Z0-9_-]*/g) || []).forEach((cls) => {
          const root = cls.slice(1).split(/__|--/)[0];
          if (root === own || root.indexOf("is-") === 0 || root.indexOf("has-") === 0) return;
          if ((recipe.uses || []).indexOf(root) === -1) {
            errors.push(recipe.file + ": selector \"" + key + "\" styles ." + root + " without listing it in uses");
          }
        });
        // A state class must sit on a component (".chip.is-selected"), never float on its own.
        if (/(^|[\s>+~,(])\.(is|has)-[a-z]/.test(expanded.replace(new RegExp("\\." + own + "(?![a-zA-Z0-9_-])", "g"), "OWN"))) {
          errors.push(recipe.file + ": selector \"" + key + "\" uses a state class with no owning component");
        }
      }));
    }
    Object.keys(recipe.defaultVariants || {}).forEach((group) => {
      const choice = recipe.defaultVariants[group];
      const choices = (recipe.variants || {})[group];
      if (!choices) errors.push(recipe.file + ": defaultVariants names an unknown variant group " + group);
      else if (choice !== "default" && !choices[choice]) errors.push(recipe.file + ": defaultVariants." + group + " is not one of its choices");
    });
  });
  return errors;
}

/* What a foundation value must look like, by value_type. */
const VALUE_SHAPES = {
  color: (t) => /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(String(t.token_value)) && !t.unit,
  dimension: (t) => typeof t.token_value === "number" && isFinite(t.token_value) && ["px", "%", "em", "deg"].indexOf(t.unit) !== -1,
  duration: (t) => typeof t.token_value === "number" && t.token_value >= 0 && t.unit === "ms",
  number: (t) => typeof t.token_value === "number" && isFinite(t.token_value) && !t.unit,
  easing: (t) => /^cubic-bezier\(\s*-?[\d.]+(\s*,\s*-?[\d.]+){3}\s*\)$/.test(String(t.token_value)) && !t.unit,
  shadow: (t) => /^(inset )?(-?\d+(px)? ){2,4}#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/.test(String(t.token_value)) && !t.unit,
  ratio: (t) => /^\d+( \/ \d+)?$/.test(String(t.token_value)) && !t.unit,
  font_family: (t) => typeof t.token_value === "string" && /^[A-Za-z0-9 ,"'-]+$/.test(t.token_value) && !t.unit,
  runtime: (t) => typeof t.token_value === "number" && ["px", "%", "deg"].indexOf(t.unit) !== -1,
};

/* Which value types each token family may hold. The longest matching prefix wins. */
const FAMILY_TYPES = {
  "color": ["color"], "type.family": ["font_family"], "type.size": ["dimension:px"], "type.weight": ["number"],
  "type.line_height": ["number"], "type.letter_spacing": ["dimension:em", "number"], "space": ["dimension:px"],
  "radius": ["dimension:px", "dimension:%"], "border.width": ["dimension:px"], "shadow": ["shadow"], "blur": ["dimension:px"],
  "motion.duration": ["duration"], "motion.easing": ["easing"], "motion.scale": ["number"], "motion.distance": ["dimension:px", "dimension:%"],
  "motion.angle": ["dimension:deg"], "layer": ["number"], "opacity": ["number"], "size": ["dimension:px", "dimension:%"],
  "ratio": ["ratio"], "breakpoint": ["dimension:px"], "runtime": ["runtime"],
};

function familyOf(name) {
  return Object.keys(FAMILY_TYPES).filter((prefix) => name === prefix || name.indexOf(prefix + ".") === 0).sort((a, b) => b.length - a.length)[0] || null;
}

/** Checks the foundations file itself: shape, sources, aliases and contrast. */
function checkFoundations(doc, byName) {
  const errors = [];
  const sources = {};
  (doc.references || []).forEach((r) => {
    if (sources[r.reference_id]) errors.push("foundations: reference " + r.reference_id + " is listed twice");
    sources[r.reference_id] = r;
    const real = /^https?:\/\/\S+\.\S+/.test(String(r.url || "")) || String(r.notes || "").trim().length >= 12;
    if (!real) errors.push("foundations: reference " + r.reference_id + " needs a web address or a note saying what it is");
  });
  const seen = {};
  doc.tokens.forEach((t) => {
    const name = String(t.token_name);
    if (!/^[a-z][a-z0-9_]*(\.[a-z0-9_]+)+$/.test(name)) errors.push("foundations: \"" + name + "\" is not a token name (lower-case parts joined by dots)");
    if (seen[name]) errors.push("foundations: " + name + " is defined twice");
    seen[name] = true;
    if (t.category !== name.split(".")[0]) errors.push("foundations: " + name + " is filed under category \"" + t.category + "\"");
    const family = familyOf(name);
    if (!family) errors.push("foundations: " + name + " belongs to no known token family");

    const hasValue = t.token_value !== null && t.token_value !== undefined;
    if (hasValue === Boolean(t.reference_token)) { errors.push("foundations: " + name + " needs exactly one of a value or an alias"); return; }
    if (t.reference_token) {
      const target = resolveToken(name, byName);
      if (!target) errors.push("foundations: " + name + " is an alias that does not resolve");
      else if (familyOf(target.token_name) !== family && familyOf(t.reference_token) !== family) errors.push("foundations: " + name + " is an alias of " + t.reference_token + ", which is a different kind of token");
      return;
    }
    const shape = VALUE_SHAPES[t.value_type];
    if (!shape) errors.push("foundations: " + name + " has an unknown value_type \"" + t.value_type + "\"");
    else if (!shape(t)) errors.push("foundations: " + name + " = " + JSON.stringify(t.token_value) + (t.unit || "") + " is not a valid " + t.value_type);
    else if (family) {
      const kind = t.value_type + (t.value_type === "dimension" ? ":" + t.unit : "");
      if (FAMILY_TYPES[family].indexOf(kind) === -1) errors.push("foundations: " + name + " holds a " + kind + ", but " + family + " tokens hold " + FAMILY_TYPES[family].join(" or "));
    }
    if (!sources[t.evidence && t.evidence.reference_id]) errors.push("foundations: " + name + " has no registered source for its value");
    if (!(t.evidence && String(t.evidence.measurement_method || "").trim().length >= 12)) errors.push("foundations: " + name + " does not say how its value was found");
  });
  (doc.contrast_pairs || []).forEach((pair) => {
    const text = resolveToken(pair[0], byName);
    const surface = resolveToken(pair[1], byName);
    if (!text || !surface) { errors.push("foundations: contrast pair names an unknown token: " + pair[0] + " / " + pair[1]); return; }
    const solid = (t) => /^#[0-9a-fA-F]{6}$/.test(String(t.token_value));
    if (!solid(text) || !solid(surface)) { errors.push("foundations: contrast pair " + pair[0] + " / " + pair[1] + " must be two solid colours"); return; }
    if (typeof pair[2] !== "number" || pair[2] < 3) { errors.push("foundations: contrast pair " + pair[0] + " / " + pair[1] + " needs a minimum of 3 or more"); return; }
    const ratio = contrast(text.token_value, surface.token_value);
    if (!(ratio >= pair[2])) errors.push("foundations: " + pair[0] + " on " + pair[1] + " is " + ratio.toFixed(2) + ":1, below " + pair[2] + ":1");
  });
  return errors;
}

/** Relative luminance of a #rrggbb colour (WCAG 2). */
function luminance(hex) {
  const channel = (i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

/** WCAG contrast ratio between two #rrggbb colours. */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/** The line number of a position in a text, for error messages. */
function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** Checks one page or script for styling that bypasses the system. */
function checkSource(file, text, byName, definedClasses) {
  const errors = [];
  const isScript = /\.js$/.test(file);
  const report = (regex, message) => {
    let m;
    const global = new RegExp(regex.source, regex.flags.indexOf("g") === -1 ? regex.flags + "g" : regex.flags);
    while ((m = global.exec(text))) errors.push(file + ":" + lineAt(text, m.index) + ": " + (typeof message === "function" ? message(m) : message));
  };

  // Any style attribute, however it is quoted or split across lines.
  report(/(^|[\s"'<])style\s*=\s*(?!=)/, "inline style attribute");
  report(/<style[\s>]/i, "<style> block; every style belongs in a recipe");
  report(/setAttribute\(\s*\\?["']style\\?["']/, "script writes a style attribute");
  report(/\[\s*["']style["']\s*\]|\.cssText\b|\.style\s*\[/, "script reaches styles by a side door");
  report(/<link\b[^>]*rel\s*=\s*\\?["']?stylesheet[^>]*>/i, (m) => {
    const href = /href\s*=\s*\\?["']?([^"'\s>]+)/i.exec(m[0]);
    return href && /(^|\/)css\/styles\.css$/.test(href[1]) ? null : "stylesheet other than css/styles.css";
  });
  report(/@import\b/, isScript ? "script imports a stylesheet" : "@import in a page");

  if (isScript) {
    report(/\.style\.(\w+)/, (m) => (m[1] === "setProperty" || m[1] === "removeProperty") ? null
      : "script sets .style." + m[1] + "; add or remove a class, or set a runtime token");
    report(/\.style\.(?:setProperty|removeProperty)\(\s*([^,)]*)/, (m) => {
      const named = /^["'](--[a-z0-9_-]+)["']$/.exec(m[1].trim());
      if (!named) return "setProperty may only set a declared runtime token, named as a plain string";
      const known = Object.keys(byName).some((name) => name.indexOf("runtime.") === 0 && cssVar(name) === named[1]);
      return known ? null : named[1] + " is not a declared runtime token";
    });
  }

  // Colours. Link fragments, HTML entities and SVG url(#id) references are not colours.
  const canvas = resolveToken("color.surface.canvas", byName);
  const cleaned = text
    .replace(/<meta name="theme-color" content="(#[0-9a-fA-F]{6})"/g, (whole, hex) => {
      if (canvas && hex.toLowerCase() !== String(canvas.token_value).toLowerCase()) errors.push(file + ": theme-color " + hex + " is not the canvas token " + canvas.token_value);
      return "";
    })
    .replace(/href=\\?["']#[^"'\\]*/g, "href=").replace(/&#x?[0-9a-fA-F]+;/g, "").replace(/url\(#[^)]*\)/g, "");
  const colour = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix)\s*\(/g;
  let c;
  while ((c = colour.exec(cleaned))) errors.push(file + ":" + lineAt(cleaned, c.index) + ": raw colour in a page or script");
  const paint = /\b(fill|stroke|color|bgcolor|stop-color|flood-color)\s*=\s*\\?["']([^"'\\]*)/g;
  while ((c = paint.exec(cleaned))) {
    if (!/^(none|currentColor|inherit|)$/.test(c[2].trim())) errors.push(file + ":" + lineAt(cleaned, c.index) + ": " + c[1] + "=\"" + c[2] + "\" paints a colour from markup; use none or currentColor");
  }

  if (definedClasses) {
    const used = [];
    const collect = (list) => list.split(/\s+/).forEach((name) => { if (/^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(name)) used.push(name); });
    let m;
    const attr = /class(?:Name)?\s*=\s*\\?["']([^"'<>]*)/g;
    while ((m = attr.exec(text))) collect(m[1]);
    const list = /classList\.(?:add|remove|toggle|contains|replace)\(([^)]*)\)/g;
    while ((m = list.exec(text))) (m[1].replace(/[!=]==?\s*["'][^"']*["']/g, "").match(/["']([^"']+)["']/g) || []).forEach((quoted) => collect(quoted.slice(1, -1)));
    const set = /setAttribute\(\s*["']class["']\s*,\s*["']([^"']*)/g;
    while ((m = set.exec(text))) collect(m[1]);
    if (isScript) {
      // Class names passed around as strings: anything shaped like a component part or a state.
      const shaped = /["'\s]((?:[a-z][a-z0-9]*(?:-[a-z0-9]+)*(?:__|--)[a-z0-9]+(?:-[a-z0-9]+)*)|(?:is|has)-[a-z][a-z0-9-]*)(?=["'\s])/g;
      while ((m = shaped.exec(text))) used.push(m[1]);
    }
    used.filter((name, i) => used.indexOf(name) === i).forEach((name) => {
      if (!definedClasses[name]) errors.push(file + ": class \"" + name + "\" is not defined by any recipe");
    });
  }
  return errors.filter((e) => e.slice(-6) !== ": null");
}

/** Every class name the generated stylesheet defines. */
function classesIn(css) {
  const found = {};
  (css.replace(/\/\*[\s\S]*?\*\//g, "").match(/\.[a-zA-Z][a-zA-Z0-9_-]*/g) || []).forEach((cls) => { found[cls.slice(1)] = true; });
  return found;
}

/** Every file under the repository with one of the given endings, skipping the excluded folders. */
function repoFiles(endings) {
  const found = [];
  const walk = (dir, rel) => {
    fs.readdirSync(dir, { withFileTypes: true }).forEach((entry) => {
      const relPath = rel ? rel + "/" + entry.name : entry.name;
      if (entry.isDirectory()) { if (!rel && EXCLUDED_FOLDERS[entry.name]) return; walk(path.join(dir, entry.name), relPath); }
      else if (endings.some((ending) => entry.name.endsWith(ending))) found.push(relPath);
    });
  };
  walk(ROOT, "");
  return found.sort();
}

/** Every recipe file exactly as written, before any preset is laid in. */
function rawRecipes() {
  const dir = path.join(ROOT, "design_system/recipes");
  const found = [];
  fs.readdirSync(dir).sort().forEach((folder) => {
    if (!fs.statSync(path.join(dir, folder)).isDirectory()) return;
    fs.readdirSync(path.join(dir, folder)).filter((f) => f.endsWith(".json")).sort().forEach((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, folder, f), "utf8"));
      raw.file = "design_system/recipes/" + folder + "/" + f;
      found.push(raw);
    });
  });
  return found;
}

/** Runs every check against the real repository. Returns the list of problems. */
function run() {
  const { doc, byName } = loadFoundations();
  const recipes = loadRecipes();
  const states = loadStates();
  const surfaces = loadSurfaces();
  let errors = checkFoundations(doc, byName).concat(checkStates(states, byName), checkSurfaces(surfaces, byName),
    checkRecipes(recipes, byName, states.presets, surfaces.presets, rawRecipes()));

  const css = build();
  const committed = fs.readFileSync(path.join(ROOT, "css/design-system.css"), "utf8").replace(/\r\n/g, "\n");
  if (committed !== css) errors.push("css/design-system.css is out of date or was edited by hand. Run: node scripts/build_tokens.js");

  const legacy = fs.readFileSync(path.join(ROOT, "css/styles.css"), "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/@import url\("design-system\.css"\);/, "").trim();
  if (legacy) errors.push("css/styles.css holds hand-written rules; every style belongs in a recipe");
  repoFiles([".css"]).forEach((file) => {
    if (STYLESHEETS_ALLOWED.indexOf(file) === -1) errors.push(file + ": a stylesheet outside the design system; every style belongs in a recipe");
  });

  const defined = classesIn(css);
  recipes.forEach((recipe) => {
    if (!recipe.className) return;
    Object.keys(recipe.elements || {}).forEach((name) => { defined[recipe.className + "__" + name] = true; });
    Object.keys(recipe.states || {}).forEach((name) => { defined["is-" + name] = true; });
  });
  let elements = [];
  repoFiles([".html", ".js"]).forEach((file) => {
    const text = fs.readFileSync(path.join(ROOT, file), "utf8");
    errors = errors.concat(checkSource(file, text, byName, defined));
    elements = elements.concat(interactiveElements(file, text));
  });
  errors = errors.concat(checkInteraction(elements, recipes));

  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, "manifest.webmanifest"), "utf8"));
  const canvas = resolveToken("color.surface.canvas", byName).token_value;
  ["theme_color", "background_color"].forEach((key) => {
    if (manifest[key] && manifest[key].toLowerCase() !== canvas.toLowerCase()) errors.push("manifest.webmanifest: " + key + " " + manifest[key] + " is not the canvas token " + canvas);
  });
  return errors;
}

if (require.main === module) {
  const errors = run();
  if (errors.length) {
    console.error("Design system check FAILED (" + errors.length + "):\n");
    errors.forEach((e) => console.error("  - " + e));
    process.exit(1);
  }
  console.log("Design system check passed: every style builds from the foundation tokens.");
}

module.exports = { checkValue, checkStates, checkSurfaces, checkRecipes, checkFoundations, checkSource, checkInteraction, interactiveElements, expandedRules, classesIn, contrast, run, EXCLUDED_FOLDERS };
