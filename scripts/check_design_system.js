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
    10. States. Every button, link and field written in a page or script
        must have its states styled by its component: hover and pressed for
        anything you can press, selected for anything that can be chosen
        (by the same aria attribute the markup carries), focus for a field.
        Hover and pressed come only from a shared preset
        (design_system/states.json) that a recipe names under
        "interaction"; a recipe may not write them by hand on a part, and a
        preset whose hover or pressed looks the same as rest is refused.
        A state may be waived only with a written reason ("waive"). The focus
        ring is the system's: a component may not remove it or make it
        see-through, and one state has one name. A control built where the check cannot read it
        (createElement, a role set by script) is refused.
    11. Surfaces. The panel fill and the frosted bar (under any alias, or
        inside a gradient), every shadow, drop-shadow and backdrop blur
        come only from a shared preset (design_system/surfaces.json) that a
        recipe names under "surface". This holds in every tier, in global
        rules and in keyframes, and a part may not overrule its preset.
    12. The review board. pages/components.html must be exactly what
        scripts/build_board.js writes from the recipes, and the held-still
        state classes (is-hover, is-pressed, is-focus) may appear nowhere
        else, however they are spelled.
    13. Text. A size, line spacing, letter spacing or capitals come only
        from a text role in design_system/type.json that a recipe names
        under "text". (A weight alone may be set by hand, for emphasis.)
    14. Examples. Every component recipe carries an "example": one piece
        of markup whose root wears the recipe's class. The review board is
        drawn from it, so a component with no example cannot hide.
    15. Everything shown. A class a screen uses must appear in a card on the
        review board: the board may hold more than the app needs, never
        less. (A part no screen draws is printed as a note, not a failure.)

   What it cannot prove (needs the rendered board and a person): that the
   right token of a family was chosen, that a design looks like its reference,
   and contrast over images and gradients.

   Run:  node scripts/check_design_system.js
   Node standard library only.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { build, loadFoundations, loadRecipes, loadStates, loadSurfaces, loadType, partBlock, resolveToken, cssVar, expandSelector, ROOT } = require("./build_tokens.js");

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
  [/^overflow-clip-margin$/, { tokens: ["space"] }],
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
const BOARD_PAGE = "pages/components.html";

/* Top-level keys a recipe file may hold ("tier" and "file" are added on load). */
const RECIPE_KEYS = words("className name global purpose uses waive interaction surface text example examples frame system base elements variants defaultVariants states keyframes rules tier file");

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
const WAIVE_KEY = /^(?:__([a-z][a-z0-9-]*):)?(hover|pressed|selected|focus|disabled|example|unused)$/;
const FRAMES = ["inline", "block", "phone", "page"];
/* The fills only a surface preset may lay down. An alias of one counts as the same fill. */
const OWNED_FILLS = ["color.surface.panel", "color.surface.bar"];

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
function stylesState(rules, state, className, tag, aria) {
  // The state must sit on the component itself (".chip:hover"), not on something inside it (".chip span:hover").
  const own = className ? new RegExp("\\." + className.replace(/[-]/g, "\\-") + "(?![\\w-])[^\\s>+~]*", "g") : null;
  const shape = state === "selected" && aria
    ? new RegExp("\\[aria-" + aria + (aria === "current" ? "(=\"[a-z]+\")?\\]" : "=\"true\"\\]"))
    : STATE_SHAPES[state];
  return rules.some((rule) => {
    if (state === "hover" && rule.media.indexOf(HOVER_MEDIA) === -1) return false;
    return splitSelectors(rule.selector).some((one) => {
      if (!className) return STATE_SHAPES[state].test(one) && (new RegExp("(^|[\\s>+~(])" + tag + "(?![\\w-])").test(one) || /^[:\[]/.test(one));
      // Brackets are emptied first, so the list inside ":is(a, button)" does not read as a descendant.
      const flat = one.replace(/\([^()]*\)/g, "()");
      return (flat.match(own) || []).some((compound) => shape.test(compound));
    });
  });
}

/** Splits a selector list on its top-level commas (a comma inside brackets does not split). */
function splitSelectors(selector) {
  const parts = [];
  let depth = 0;
  let from = 0;
  for (let i = 0; i < selector.length; i += 1) {
    const ch = selector.charAt(i);
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    else if (ch === "," && depth === 0) { parts.push(selector.slice(from, i).trim()); from = i + 1; }
  }
  parts.push(selector.slice(from).trim());
  return parts.filter(Boolean);
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
    // An input may be a button or a tick box in disguise: it owes the states of what it is.
    const type = m[1] === "input" ? (/type\s*=\s*\\?["']?([a-z]+)/.exec(attrs) || [])[1] : "";
    const aria = (/aria-(pressed|selected|checked|current)\b/.exec(attrs) || [])[1];
    const ticks = /^(checkbox|radio)$/.test(type || "");
    found.push({
      file: file, line: lineAt(text, m.index), tag: /^(button|submit|reset|image)$/.test(type || "") || ticks ? "button" : m[1],
      hasClass: Boolean(cls),
      classes: cls ? cls[1].split(/\s+/).filter((name) => /^[a-z][a-zA-Z0-9_-]*$/.test(name)) : [],
      selectable: Boolean(aria) || ticks,
      aria: aria || "",
    });
  }
  const role = /<([a-z][a-z0-9]*)\b([^>]*\brole\s*=\s*\\?["'](?:button|tab|link|switch|checkbox|radio|menuitem|option)[^>]*)/g;
  while ((m = role.exec(text))) {
    if (/^(button|a|input|select|textarea|summary)$/.test(m[1])) continue;
    const cls = /(?:^|\s)class\s*=\s*\\?["']([^"'<>]*)/.exec(m[2]);
    const aria = (/aria-(pressed|selected|checked|current)\b/.exec(m[2]) || [])[1];
    found.push({ file: file, line: lineAt(text, m.index), tag: "button", hasClass: Boolean(cls), classes: cls ? cls[1].split(/\s+/).filter(Boolean) : [], selectable: Boolean(aria), aria: aria || "" });
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
  // Focus belongs to the system: one global ring reaches every control, and no component may turn it off.
  const systemFocus = globalRules.some((rule) => /:focus-visible/.test(rule.selector) && rule.styles.outline !== undefined && !/^(none|0|0px)$/.test(String(rule.styles.outline).trim()));
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
      if (state === "focus" && systemFocus) return;
      const styled = owned.length
        ? owned.some((name) => stylesState(rulesOf[name.split("__")[0]], state, name, "", el.aria))
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

/** Reports every class, part, variant and state a recipe defines that the app never draws. */
function checkUnused(recipes, appText) {
  const errors = [];
  const names = {};
  (appText.match(/[a-zA-Z][a-zA-Z0-9_-]*/g) || []).forEach((name) => { names[name] = true; });
  recipes.forEach((recipe) => {
    if (recipe.global || !recipe.className || (recipe.waive && recipe.waive.unused)) return;
    const cls = recipe.className;
    const dead = [];
    if (!names[cls]) dead.push("." + cls);
    Object.keys(recipe.elements || {}).forEach((part) => { if (!names[cls + "__" + part]) dead.push("." + cls + "__" + part); });
    // A variant may be joined on in a script ("avatar--" + size): then its name must appear on its own as a quoted word.
    const joined = new RegExp(cls + "--[\"']\\s*\\+").test(appText);
    Object.keys(recipe.variants || {}).forEach((group) => Object.keys(recipe.variants[group] || {}).forEach((choice) => {
      const quoted = new RegExp("[\"']" + choice + "[\"']").test(appText);
      if (!names[cls + "--" + choice] && !(joined && quoted)) dead.push("." + cls + "--" + choice);
    }));
    Object.keys(recipe.states || {}).forEach((state) => { if (!names["is-" + state]) dead.push("." + cls + ".is-" + state); });
    dead.forEach((name) => errors.push(recipe.file + ": " + name + " is not drawn anywhere in the app; remove it, or waive \"unused\" with a reason"));
  });
  return errors;
}

/**
 * Everything the app draws has a card: a class a screen uses, which a recipe defines, must appear inside a card on the
 * review board. "boardText" is the generated page. The board may show more than the app uses; it may not show less.
 */
function checkShown(recipes, appText, boardText) {
  const errors = [];
  const names = {};
  (appText.match(/[a-zA-Z][a-zA-Z0-9_-]*/g) || []).forEach((name) => { names[name] = true; });
  const shown = {};
  (boardText.match(/<div class="board__bed[^"]*">[\s\S]*?<\/figure>/g) || []).forEach((bed) => {
    (bed.replace(/^<div class="board__bed[^"]*">/, "").match(/class="([^"]*)"/g) || []).forEach((attr) => attr.slice(7, -1).split(/\s+/).forEach((name) => { shown[name] = true; }));
  });
  recipes.forEach((recipe) => {
    const want = [];
    if (recipe.global) {
      Object.keys(recipe.rules || {}).forEach((sel) => { if (/^\.[a-z][a-z0-9-]*$/.test(sel) && sel.indexOf(".is-") !== 0) want.push(sel.slice(1)); });
    } else if (recipe.className && recipe.className !== "board") {
      const cls = recipe.className;
      want.push(cls);
      Object.keys(recipe.elements || {}).forEach((part) => {
        want.push(cls + "__" + part);
        Object.keys(recipe.elements[part] || {}).forEach((key) => { if (/^&--[a-z][a-z0-9-]*$/.test(key)) want.push(cls + "__" + part + key.slice(1)); });
      });
      Object.keys(recipe.variants || {}).forEach((group) => Object.keys(recipe.variants[group] || {}).forEach((choice) => want.push(cls + "--" + choice)));
    }
    want.forEach((name) => {
      if (names[name] && !shown[name]) errors.push(recipe.file + ": ." + name + " is drawn in the app but no card on the review board shows it; add it to the recipe's example, or give it one under \"examples\"");
    });
  });
  return errors;
}

/** Checks the shared text roles: a purpose, a size, and nothing but text properties built from tokens. */
function checkType(doc, byName) {
  const errors = checkSurfaces(doc, byName, "design_system/type.json");
  Object.keys((doc && doc.presets) || {}).forEach((name) => {
    const styles = doc.presets[name].styles || {};
    if (!styles["font-size"]) errors.push("design_system/type.json: role " + name + " must set a font-size");
    Object.keys(styles).forEach((prop) => {
      if (!/^(font-size|font-weight|line-height|letter-spacing|text-transform)$/.test(prop)) errors.push("design_system/type.json: role " + name + " may only set text properties, not " + prop);
    });
  });
  return errors;
}

/** Checks the shared surface presets: a purpose, and every value built from tokens. */
function checkSurfaces(doc, byName, fileName) {
  const errors = [];
  const file = fileName || "design_system/surfaces.json";
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
  const parts = words("purpose rest hover pressed selected_hover selected_pressed reduced reduced_hover reduced_pressed");
  const shown = (value) => String(value).replace(/\{([a-z0-9_.]+)\}/g, (whole, name) => { const t = resolveToken(name, byName); return t ? JSON.stringify(t.token_value) : whole; });
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
    if (preset.hover && preset.hover.transform && !(preset.reduced_hover && preset.reduced_hover.transform === "none")) errors.push(file + ": preset " + name + " moves on hover but has no reduced_hover rule");
    // A state nobody can see is not a state: hover and pressed must each change something from rest.
    ["hover", "pressed"].forEach((part) => {
      const state = preset[part] || {};
      const rest = preset.rest || {};
      const changes = Object.keys(state).some((prop) => rest[prop] === undefined || shown(state[prop]) !== shown(rest[prop]));
      if (preset[part] && !changes) errors.push(file + ": preset " + name + " " + part + " looks the same as rest, so nobody could see it");
    });
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
function checkRecipes(recipes, byName, presets, surfacePresets, rawRecipes, typePresets) {
  const errors = [];
  const known = presets || loadStates().presets || {};
  const surfaces = surfacePresets || loadSurfaces().presets || {};
  const roles = typePresets || loadType().presets || {};
  // Surface materials may only come from a preset. "rawRecipes" are the files as written, before presets are laid in.
  (rawRecipes || []).forEach((raw) => {
    const walk = (styles, where) => Object.keys(styles || {}).forEach((key) => {
      const value = styles[key];
      if (value !== null && typeof value === "object") { walk(value, where + " " + key); return; }
      const text = String(value);
      const fills = (text.match(/\{([a-z0-9_.]+)\}/g) || []).some((ref) => {
        const token = resolveToken(ref.slice(1, -1), byName);
        return token && OWNED_FILLS.indexOf(token.token_name) !== -1;
      });
      const owned = (/^background(-color|-image)?$/.test(key) && fills) ||
        (key === "box-shadow" && text.trim() !== "none") || (key === "filter" && /drop-shadow/.test(text)) ||
        /^(-webkit-)?backdrop-filter$/.test(key);
      if (owned) errors.push(raw.file + ": " + where + " { " + key + ": " + text + " } sets a surface by hand; name a preset from design_system/surfaces.json under \"surface\"");
    });
    const walkText = (styles, where) => Object.keys(styles || {}).forEach((key) => {
      const value = styles[key];
      if (value !== null && typeof value === "object") { walkText(value, where + " " + key); return; }
      if (/^(font-size|line-height|letter-spacing|text-transform|font)$/.test(key) && String(value).trim() !== "inherit") {
        errors.push(raw.file + ": " + where + " { " + key + ": " + value + " } sets text by hand; name a role from design_system/type.json under \"text\"");
      }
    });
    if (!raw.global) {
      walkText(raw.base, "base");
      Object.keys(raw.elements || {}).forEach((n) => walkText(raw.elements[n], "__" + n));
      Object.keys(raw.variants || {}).forEach((g) => Object.keys(raw.variants[g] || {}).forEach((c) => walkText(raw.variants[g][c], "--" + c)));
      Object.keys(raw.states || {}).forEach((n) => walkText(raw.states[n], ".is-" + n));
    }
    Object.keys(raw.rules || {}).forEach((n) => walk(raw.rules[n], n));
    Object.keys(raw.keyframes || {}).forEach((n) => walk(raw.keyframes[n], "keyframes " + n));
    walk(raw.base, "base");
    Object.keys(raw.elements || {}).forEach((n) => walk(raw.elements[n], "__" + n));
    Object.keys(raw.variants || {}).forEach((g) => Object.keys(raw.variants[g] || {}).forEach((c) => walk(raw.variants[g][c], "--" + c)));
    Object.keys(raw.states || {}).forEach((n) => walk(raw.states[n], ".is-" + n));
    // A part that names a surface or a text role may not then overrule what that preset sets.
    [["surface", surfaces], ["text", roles]].forEach((kind) => Object.keys(raw[kind[0]] || {}).forEach((part) => {
      const preset = kind[1][raw[kind[0]][part]];
      const block = typeof raw[kind[0]] === "object" && !raw.global ? partBlock(JSON.parse(JSON.stringify(raw)), part) : null;
      if (!preset || !block) return;
      Object.keys(preset.styles || {}).forEach((prop) => {
        if (prop === "font-weight" || block[prop] === undefined || typeof block[prop] === "object") return;
        errors.push(raw.file + ": " + part + " { " + prop + ": " + block[prop] + " } overrules its " + kind[0] + " preset \"" + raw[kind[0]][part] + "\"; choose another preset");
      });
    }));
    // A preset's hover or pressed must change this part: one that sets only what the part already has cannot be seen.
    Object.keys(raw.interaction !== null && typeof raw.interaction === "object" && !raw.global ? raw.interaction : {}).forEach((part) => {
      const preset = (presets || {})[raw.interaction[part]];
      const block = partBlock(JSON.parse(JSON.stringify(raw)), part);
      if (!preset || !block) return;
      const rest = Object.assign({}, preset.rest || {}, block);
      ["hover", "pressed"].forEach((state) => {
        const set = preset[state] || {};
        if (Object.keys(set).length && Object.keys(set).every((prop) => rest[prop] !== undefined && String(rest[prop]).trim() === String(set[prop]).trim())) {
          errors.push(raw.file + ": " + part + " takes preset \"" + raw.interaction[part] + "\", whose " + state + " sets only what this part already has, so nobody could see it; choose another preset");
        }
      });
    });
    // Hover and pressed on a part itself come only from "interaction". (A hover that changes something inside is fine.)
    const walkStates = (styles, where) => Object.keys(styles || {}).forEach((key) => {
      if (styles[key] === null || typeof styles[key] !== "object") return;
      if (key.charAt(0) !== "@") splitSelectors(key).forEach((one) => {
        const last = one.replace(/\([^()]*\)/g, "()").split(/[\s>+~]+/).pop();
        if (/:(hover|active)/.test(last)) errors.push(raw.file + ": " + where + " \"" + key + "\" writes hover or pressed by hand; name a preset from design_system/states.json under \"interaction\"");
      });
      walkStates(styles[key], where + " " + key);
    });
    if (!raw.global) {
      walkStates(raw.base, "base");
      Object.keys(raw.elements || {}).forEach((n) => walkStates(raw.elements[n], "__" + n));
      Object.keys(raw.variants || {}).forEach((g) => Object.keys(raw.variants[g] || {}).forEach((c) => walkStates(raw.variants[g][c], "--" + c)));
      Object.keys(raw.states || {}).forEach((n) => walkStates(raw.states[n], ".is-" + n));
      // Every component shows itself: one example, its root wearing the recipe's class first.
      const waived = raw.waive && typeof raw.waive.example === "string";
      const rootOf = (html) => /^\s*<[a-z][a-z0-9]*\b[^>]*?\bclass="([^"\s]+)/.exec(String(html));
      if (!waived) {
        const root = rootOf(raw.example);
        if (typeof raw.example !== "string" || !raw.example.trim()) errors.push(raw.file + ": the recipe has no example, so the review board cannot show it");
        else if (!root || root[1] !== raw.className) errors.push(raw.file + ": the example's root must wear ." + raw.className + " as its first class");
        if (FRAMES.indexOf(raw.frame) === -1) errors.push(raw.file + ": frame must be one of " + FRAMES.join(", "));
      }
      Object.keys(raw.examples || {}).forEach((key) => {
        const root = rootOf(raw.examples[key]);
        if (!/^(--|__|\.is-)[a-z][a-z0-9-]*$/.test(key)) errors.push(raw.file + ": examples key \"" + key + "\" must be \"--variant\", \"__part\" or \".is-state\"");
        // A part that the app draws beside its component (the deck's buttons) may stand alone as its own root.
        const alone = key.indexOf("__") === 0 && root && root[1] === raw.className + key.split("--")[0];
        if (!root || (root[1] !== raw.className && !alone)) errors.push(raw.file + ": the example for " + key + " must have a root that wears ." + raw.className + " first");
      });
    }
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
    [["surface", surfaces, "surfaces.json"], ["text", roles, "type.json"]].forEach((kind) => {
      const map = recipe[kind[0]];
      if (map === undefined) return;
      if (map === null || typeof map !== "object" || Array.isArray(map) || recipe.global) { errors.push(recipe.file + ": " + kind[0] + " must be an object of part: preset, on a component recipe"); return; }
      Object.keys(map).forEach((part) => {
        if (!/^(base|__[a-z][a-z0-9-]*|--[a-z][a-z0-9-]*)( .+)?$/.test(part)) errors.push(recipe.file + ": " + kind[0] + " key \"" + part + "\" must be \"base\", \"__part\" or \"--variant\", optionally followed by a nested selector");
        else if (!partBlock(recipe, part)) errors.push(recipe.file + ": " + kind[0] + " names " + part + ", which this recipe does not have");
        if (!(kind[1] || {})[map[part]]) errors.push(recipe.file + ": " + kind[0] + " preset \"" + map[part] + "\" is not in design_system/" + kind[2]);
      });
    });
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
      if (/:focus/.test(rule.selector) && /\btransparent\b/.test(String(rule.styles.outline || "") + " " + String(rule.styles["outline-color"] || ""))) {
        errors.push(recipe.file + ": \"" + rule.selector + "\" draws a see-through focus outline, which nobody can see");
      }
      // The focus ring belongs to the system. A component may move where it sits (a tab at the screen edge), nothing else.
      const ringProps = Object.keys(rule.styles).filter((prop) => /^outline/.test(prop) && prop !== "outline-offset");
      if (!recipe.global && ringProps.length) {
        errors.push(recipe.file + ": \"" + rule.selector + "\" sets " + ringProps.join(", ") + "; the focus ring belongs to the system and a component may not restyle or remove it");
      }
      const outline = rule.styles.outline !== undefined ? String(rule.styles.outline).trim() : (rule.styles["outline-width"] !== undefined ? String(rule.styles["outline-width"]).trim() : null);
      if (recipe.global && outline !== null && /^(none|0|0px)$/.test(outline)) {
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
  // Controls the check cannot read, and class names written so the check cannot read them.
  report(/class(?:Name)?\s*=\s*\\?["'][^"'<>]*&#?\w+;/, "a class name is written with an HTML entity; write it plainly");
  if (isScript) {
    report(/createElement\(\s*["'](button|input|select|textarea|summary)["']/, (m) => "script builds a <" + m[1] + "> the check cannot read; write it as markup");
    report(/setAttribute\(\s*["']role["']\s*,(?!\s*["'](?:status|alert|dialog|img|presentation|none|list|listitem|group|region|log)["'])/, "script sets a role the check cannot read; write it in the markup");
    report(/\\u\{?[0-9a-fA-F]{2,}|\\x[0-9a-fA-F]{2}/, "an escaped character in a script; write the character plainly");
  }

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
  const type = loadType();
  let errors = checkFoundations(doc, byName).concat(checkStates(states, byName), checkSurfaces(surfaces, byName), checkType(type, byName),
    checkRecipes(recipes, byName, states.presets, surfaces.presets, rawRecipes(), type.presets));

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
  let appText = "";
  repoFiles([".html", ".js"]).forEach((file) => {
    let text = fs.readFileSync(path.join(ROOT, file), "utf8");
    if (file !== BOARD_PAGE) appText += text + "\n";
    if (file === BOARD_PAGE) {
      // The board is generated. It must match the recipes, and the token values it prints as text are not styling.
      if (text.replace(/\r\n/g, "\n") !== require("./build_board.js").build()) errors.push(BOARD_PAGE + " is out of date or was edited by hand. Run: node scripts/build_board.js");
      text = text.replace(/(<span class="board__token-value">)[^<]*(<\/span>)/g, "$1$2");
    } else {
      // The held-still state classes exist for the board only; the app's states follow the pointer.
      (text.match(/["'\s]is-(hover|pressed|focus)(?=["'\s])/g) || []).forEach((hit) => errors.push(file + ": " + hit.trim().replace(/["']/g, "") + " is for the review board only"));
    }
    errors = errors.concat(checkSource(file, text, byName, defined));
    elements = elements.concat(interactiveElements(file, text));
  });
  const appOnly = appText.length;
  // The board's own chrome is drawn by its generator, so that one script counts as where it is used.
  appText += fs.readFileSync(path.join(__dirname, "build_board.js"), "utf8");
  errors = errors.concat(checkInteraction(elements, recipes), checkShown(rawRecipes(), appText.slice(0, appOnly), fs.readFileSync(path.join(ROOT, BOARD_PAGE), "utf8")));
  // More than the app needs is allowed for now: an unused part is a note, not a failure.
  run.notes = checkUnused(recipes, appText);

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
  if ((run.notes || []).length) {
    console.log("\nNotes (allowed for now, " + run.notes.length + "): defined but not drawn in the app.");
    run.notes.forEach((n) => console.log("  - " + n.replace(/; remove it.*$/, "")));
  }
}

module.exports = { checkUnused, checkShown, splitSelectors, checkValue, checkStates, checkSurfaces, checkType, checkRecipes, checkFoundations, checkSource, checkInteraction, interactiveElements, expandedRules, classesIn, contrast, run, EXCLUDED_FOLDERS };
