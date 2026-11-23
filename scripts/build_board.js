/* ==========================================================================
   build_board.js
   Writes the review board, pages/components.html, from the design system's
   own files. Nothing on the board is typed by hand: every card is a recipe's
   "example" with a state or a variant switched on by this script, and every
   token readout is read from the recipe or the preset that sets it.

   Reads:  design_system/tier_00_foundations.json, states.json, surfaces.json
           design_system/recipes/tier_0N_*\/*.json   (each holds an "example")
   Writes: pages/components.html                      (committed, plain HTML)

   Run:    node scripts/build_board.js           writes the page
           node scripts/build_board.js --check   fails if the page is stale

   The order of the cards in a row never changes, so a difference between two
   rows is a real difference: Default, Hover, Pressed, Focus, Selected,
   Disabled, then the recipe's own states, then its variants.

   Node standard library only.
   ========================================================================== */

const fs = require("fs");
const path = require("path");
const { loadFoundations, loadRecipes, loadStates, loadSurfaces, tokenCss, sampleProperty, sampleClass, ROOT } = require("./build_tokens.js");

const OUTPUT = path.join(ROOT, "pages/components.html");
const TIER_NAMES = { 1: "Primitives", 2: "Controls", 3: "Overlays and feedback", 4: "Patterns", 5: "Product components", 6: "Regions", 7: "Screens" };

/** Makes text safe to place inside HTML. */
function escapeHtml(text) {
  return String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/** Adds a class to every element in the fragment that carries the target class. */
function addClassTo(html, target, extra) {
  return html.replace(/class="([^"]*)"/g, (whole, list) => {
    return list.split(/\s+/).indexOf(target) === -1 ? whole : "class=\"" + list + " " + extra + "\"";
  });
}

/** Changes the fragment's first (root) tag with the given function. */
function editRoot(html, change) {
  return html.replace(/<[a-zA-Z][^>]*>/, (tag) => change(tag));
}

/** Adds a class to the root element only. */
function addRootClass(html, extra) {
  return editRoot(html, (tag) => /class="/.test(tag) ? tag.replace(/class="([^"]*)"/, "class=\"$1 " + extra + "\"") : tag.replace(/>$/, " class=\"" + extra + "\">"));
}

/** The tag name of the fragment's root element. */
function rootTag(html) {
  const m = /<([a-zA-Z][a-zA-Z0-9]*)/.exec(html);
  return m ? m[1].toLowerCase() : "";
}

/** "{color.text.primary}" -> "color.text.primary", for the readout under a card. */
function plain(value) {
  return String(value).replace(/\{([a-z0-9_.]+)\}/g, "$1");
}

/** The declarations a style block sets itself (not its nested selectors), as readable text. */
function readout(styles) {
  return Object.keys(styles || {}).filter((key) => styles[key] === null || typeof styles[key] !== "object")
    .map((key) => key + ": " + plain(styles[key])).join(" · ");
}

/** One card: a label, the live component on its bed, and what differs from the default. */
function card(label, html, delta, frame) {
  return "        <figure class=\"board__card\">\n" +
    "          <figcaption class=\"board__label\">" + escapeHtml(label) + "</figcaption>\n" +
    "          <div class=\"board__bed" + (frame === "phone" ? " board__bed--phone" : frame === "page" ? " board__bed--phone board__bed--page" : frame === "inline" ? " board__bed--inline" : "") + "\">" + html + "</div>\n" +
    (delta ? "          <p class=\"board__delta\">" + escapeHtml(delta) + "</p>\n" : "") +
    "        </figure>\n";
}

/** Every card for one recipe, in the fixed order. */
function cardsFor(recipe, raw, states, globalRules) {
  const cls = recipe.className;
  const example = raw.example;
  const frame = raw.frame || "block";
  const out = [card("Default", example, "", frame)];
  const interaction = raw.interaction || {};
  // A recipe may give a fuller example for one variant, part or state, where swapping a class would not show it truly.
  const special = raw.examples || {};
  const pressable = Object.keys(interaction).filter((part) => part.indexOf("--") !== 0);

  // Hover and Pressed come from the shared state presets, one pair per pressable part.
  [["Hover", "is-hover", "hover"], ["Pressed", "is-pressed", "pressed"]].forEach((state) => {
    pressable.forEach((part) => {
      const preset = states[interaction[part]];
      if (!preset) return;
      const target = part === "base" ? cls : cls + part;
      const label = state[0] + (pressable.length > 1 || part !== "base" ? " (" + (part === "base" ? "itself" : part) + ")" : "");
      out.push(card(label, addClassTo(special[part] || example, target, state[1]), "preset " + interaction[part] + " · " + readout(preset[state[2]]), frame));
    });
  });

  const tag = rootTag(example);
  const rootPressable = /^(a|button|summary|input|select|textarea)$/.test(tag);
  if (rootPressable) out.push(card("Focus", addRootClass(example, "is-focus"), readout(globalRules[":focus-visible, .is-focus"]), frame));

  // Selected: by the aria attribute the example's own root carries, else by the recipe's "selected" state.
  const aria = (/^<[^>]*\baria-(pressed|selected|checked)="false"/.exec(example) || [])[1];
  const selectedStyles = (raw.base || {})["&[aria-" + (aria || "pressed") + "=\"true\"]"] || (raw.states || {}).selected;
  if (aria) {
    const chosen = editRoot(example, (t) => t.replace("aria-" + aria + "=\"false\"", "aria-" + aria + "=\"true\""));
    out.push(card("Selected", chosen, readout(selectedStyles), frame));
    if (interaction.base && states[interaction.base] && states[interaction.base].selected_hover) {
      out.push(card("Selected + hover", addClassTo(chosen, cls, "is-hover"), "preset " + interaction.base + " · " + readout(states[interaction.base].selected_hover), frame));
    }
  } else if ((raw.states || {}).selected) {
    out.push(card("Selected", addRootClass(example, "is-selected"), readout(selectedStyles), frame));
  }

  if (tag === "button") {
    out.push(card("Disabled", editRoot(example, (t) => t.replace(/>$/, " disabled>")), readout(globalRules["button:disabled, [aria-disabled=\"true\"]"]), frame));
  }

  Object.keys(raw.states || {}).filter((name) => name !== "selected").forEach((name) => {
    out.push(card("State: " + name, special[".is-" + name] || addRootClass(example, "is-" + name), readout(raw.states[name]), frame));
  });
  Object.keys(raw.variants || {}).forEach((group) => Object.keys(raw.variants[group]).forEach((choice) => {
    const shown = special["--" + choice] || addRootClass(example, cls + "--" + choice);
    const surface = (raw.surface || {})["--" + choice];
    out.push(card("Variant: " + choice, shown, (surface ? "surface " + surface + " · " : "") + readout(raw.variants[group][choice]), frame));
    const preset = states[interaction["--" + choice]];
    if (preset) {
      out.push(card("Variant: " + choice + " + hover", addRootClass(shown, "is-hover"), "preset " + interaction["--" + choice] + " · " + readout(preset.hover), frame));
      out.push(card("Variant: " + choice + " + pressed", addRootClass(shown, "is-pressed"), "preset " + interaction["--" + choice] + " · " + readout(preset.pressed), frame));
    }
  }));
  // Any further example shows a piece the cards above cannot reach: a part's own variant, or a part drawn beside the component.
  const reached = {};
  pressable.forEach((part) => { reached[part] = true; });
  Object.keys(raw.states || {}).forEach((name) => { reached[".is-" + name] = true; });
  Object.keys(raw.variants || {}).forEach((group) => Object.keys(raw.variants[group]).forEach((choice) => { reached["--" + choice] = true; }));
  Object.keys(special).filter((key) => !reached[key]).forEach((key) => { out.push(card("Shows: " + key, special[key], "", frame)); });
  return out;
}

/** One recipe's family: what it is, what it builds on, then its row of cards. */
function family(recipe, raw, states, globalRules) {
  const facts = ["tier " + recipe.tier];
  if ((raw.uses || []).length) facts.push("builds on " + raw.uses.map((name) => "." + name).join(", "));
  Object.keys(raw.surface || {}).forEach((part) => facts.push("surface " + raw.surface[part] + (part === "base" ? "" : " on " + part)));
  Object.keys(raw.interaction || {}).forEach((part) => facts.push("states " + raw.interaction[part] + (part === "base" ? "" : " on " + part)));
  Object.keys(raw.waive || {}).forEach((key) => facts.push("waives " + key + ": " + raw.waive[key]));
  let html = "      <section class=\"board__family\">\n" +
    "        <h3 class=\"board__name\">." + escapeHtml(recipe.className) + "</h3>\n" +
    "        <p class=\"board__purpose\">" + escapeHtml(raw.purpose || "") + "</p>\n" +
    "        <p class=\"board__meta\">" + escapeHtml(facts.join(" · ")) + "</p>\n";
  if (!raw.example) return html + "        <p class=\"board__delta\">No example in the recipe yet.</p>\n      </section>\n";
  html += "        <div class=\"board__grid\">\n" +
    cardsFor(recipe, raw, states, globalRules).join("") + "        </div>\n      </section>\n";
  return html;
}

/** One row of the token table: the name, a live sample at the token's value, and the value. */
function tokenRow(token) {
  const property = sampleProperty(token.token_name);
  const sample = sampleClass(token.token_name);
  let shown = "<span></span>";
  if (property === "background") shown = "<span class=\"board__chip " + sample + "\"></span>";
  else if (property === "width") shown = "<span class=\"board__bar " + sample + "\"></span>";
  else if (property === "height") shown = "<span class=\"board__line " + sample + "\"></span>";
  else if (property === "border-radius" || property === "box-shadow" || property === "opacity") shown = "<span class=\"board__box " + sample + "\"></span>";
  else if (property === "aspect-ratio") shown = "<span class=\"board__frame " + sample + "\"></span>";
  else if (property) shown = "<p class=\"board__text " + sample + "\">Thursday Trivia</p>";
  return "        <div class=\"board__token\"><span class=\"board__token-name\">" + escapeHtml(token.token_name) + "</span>" + shown +
    "<span class=\"board__token-value\">" + escapeHtml(token.reference_token ? "same as " + token.reference_token : tokenCss(token)) + "</span></div>\n";
}

/** The raw recipe files (as written), by class name: presets are not laid in, so readouts show what the author wrote. */
function rawByClass() {
  const dir = path.join(ROOT, "design_system/recipes");
  const found = {};
  fs.readdirSync(dir).sort().forEach((folder) => {
    if (!fs.statSync(path.join(dir, folder)).isDirectory()) return;
    fs.readdirSync(path.join(dir, folder)).filter((f) => f.endsWith(".json")).forEach((f) => {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, folder, f), "utf8"));
      found[raw.className || raw.name] = raw;
    });
  });
  return found;
}

/** Builds the whole page as a string. */
function build() {
  const { doc } = loadFoundations();
  const states = loadStates().presets || {};
  const surfaces = loadSurfaces().presets || {};
  const recipes = loadRecipes();
  const raws = rawByClass();
  const globalRules = (recipes.filter((r) => r.global)[0] || {}).rules || {};
  const canvas = doc.tokens.filter((t) => t.token_name === "color.surface.canvas")[0].token_value;

  let html = "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"utf-8\">\n" +
    "  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1, viewport-fit=cover\">\n" +
    "  <title>Components · Empower</title>\n  <link rel=\"stylesheet\" href=\"../css/styles.css\">\n" +
    "  <link rel=\"manifest\" href=\"../manifest.webmanifest\">\n  <link rel=\"apple-touch-icon\" href=\"../icons/apple-touch-icon.png\">\n" +
    "  <meta name=\"theme-color\" content=\"" + canvas + "\">\n  <meta name=\"apple-mobile-web-app-capable\" content=\"yes\">\n" +
    "  <meta name=\"apple-mobile-web-app-title\" content=\"Empower\">\n</head>\n" +
    "<!--\n  GENERATED FILE: do not edit by hand. Written by scripts/build_board.js from the\n" +
    "  recipes, presets and tokens in design_system/. To change a card, change the\n" +
    "  recipe's \"example\", then run: node scripts/build_board.js\n-->\n" +
    "<body data-root=\"../\">\n  <main class=\"board\">\n" +
    "    <p class=\"eyebrow\">Empower design system</p>\n    <h1 class=\"title\">Review board.</h1>\n" +
    "    <p class=\"board__lead\">Every component the app is built from, in every state and variant its recipe defines. " +
    "Read across a row to compare states: the order never changes. The line under a card lists only what that card changes from Default.</p>\n" +
    "    <p class=\"board__proof\"><strong>What this board proves:</strong> each component, state and variant draws from the recipes on this branch, " +
    "and each readout is read from the recipe or preset that sets it.</p>\n" +
    "    <p class=\"board__proof\"><strong>What it does not prove:</strong> how a component sits in its real screen, motion and timing, " +
    "behaviour with real data, or contrast over photographs. Hover and Pressed are held still here by a twin class; in the app they follow the pointer.</p>\n";

  html += "\n    <section class=\"board__part\">\n      <h2 class=\"board__part-title\">Surfaces</h2>\n" +
    "      <p class=\"board__part-note\">What each kind of surface is made of. Set once in design_system/surfaces.json; a recipe names one.</p>\n" +
    "      <div class=\"board__grid\">\n";
  Object.keys(surfaces).forEach((name) => {
    const users = Object.keys(raws).filter((cls) => Object.keys(raws[cls].surface || {}).some((part) => raws[cls].surface[part] === name));
    html += card(name, "<div class=\"board__surface " + sampleClass("surface." + name) + "\">" + escapeHtml(surfaces[name].purpose) + "</div>",
      readout(surfaces[name].styles) + " · used by " + (users.length ? users.map((cls) => "." + cls).join(", ") : "nothing yet"), "block");
  });
  html += "      </div>\n    </section>\n";

  html += "\n    <section class=\"board__part\">\n      <h2 class=\"board__part-title\">State presets</h2>\n" +
    "      <p class=\"board__part-note\">How anything you can press answers. Set once in design_system/states.json; the cards below show each preset on the components that name it.</p>\n";
  Object.keys(states).forEach((name) => {
    const users = [];
    Object.keys(raws).forEach((cls) => Object.keys(raws[cls].interaction || {}).forEach((part) => {
      if (raws[cls].interaction[part] === name) users.push("." + cls + (part === "base" ? "" : part));
    }));
    html += "      <div class=\"board__family\">\n        <h3 class=\"board__name\">" + escapeHtml(name) + "</h3>\n" +
      "        <p class=\"board__purpose\">" + escapeHtml(states[name].purpose) + "</p>\n" +
      "        <p class=\"board__meta\">" + escapeHtml("hover " + readout(states[name].hover) + " · pressed " + readout(states[name].pressed) +
        " · used by " + (users.length ? users.join(", ") : "nothing yet")) + "</p>\n      </div>\n";
  });
  html += "    </section>\n";

  html += "\n    <section class=\"board__part\">\n      <h2 class=\"board__part-title\">Shared helpers</h2>\n" +
    "      <p class=\"board__part-note\">Small classes any screen may add to a line of text or a block.</p>\n      <div class=\"board__grid\">\n";
  recipes.filter((r) => r.global).forEach((recipe) => Object.keys(recipe.rules || {}).filter((sel) => /^\.[a-z][a-z0-9-]*$/.test(sel) && sel.indexOf(".is-") !== 0).forEach((sel) => {
    html += card(sel, "<p class=\"" + sel.slice(1) + "\">Thursday Trivia at Alamo Drafthouse</p>", readout(recipe.rules[sel]), "block");
  }));
  html += "      </div>\n    </section>\n";

  let tier = 0;
  recipes.filter((r) => r.className).forEach((recipe) => {
    if (recipe.tier !== tier) {
      if (tier) html += "    </section>\n";
      tier = recipe.tier;
      html += "\n    <section class=\"board__part\">\n      <h2 class=\"board__part-title\">Tier " + tier + ": " + TIER_NAMES[tier] + "</h2>\n";
    }
    html += family(recipe, raws[recipe.className], states, globalRules);
  });
  if (tier) html += "    </section>\n";

  html += "\n    <section class=\"board__part\">\n      <h2 class=\"board__part-title\">Tokens</h2>\n" +
    "      <p class=\"board__part-note\">Every raw value in the system, from design_system/tier_00_foundations.json. Each sample is drawn at the token's own value.</p>\n";
  let category = "";
  doc.tokens.forEach((token) => {
    if (token.category !== category) {
      if (category) html += "      </div>\n";
      category = token.category;
      html += "      <div class=\"board__family\">\n        <h3 class=\"board__name\">" + escapeHtml(category) + "</h3>\n";
    }
    html += tokenRow(token);
  });
  if (category) html += "      </div>\n";
  html += "    </section>\n  </main>\n\n" +
    "  <!-- Shared scripts every page loads (checked by scripts/check_architecture.js). -->\n" +
    ["data/groups.js", "js/ui.js", "js/store.js", "js/schedule.js", "js/logic.js", "data/population.js", "js/people.js"]
      .map((src) => "  <script src=\"../" + src + "\"></script>\n").join("") +
    "</body>\n</html>\n";
  return html;
}

if (require.main === module) {
  const html = build();
  if (process.argv.indexOf("--check") !== -1) {
    const current = fs.existsSync(OUTPUT) ? fs.readFileSync(OUTPUT, "utf8").replace(/\r\n/g, "\n") : "";
    if (current !== html) {
      console.error("pages/components.html is out of date. Run: node scripts/build_board.js");
      process.exit(1);
    }
    console.log("pages/components.html matches the recipes.");
  } else {
    fs.writeFileSync(OUTPUT, html);
    console.log("Wrote pages/components.html");
  }
}

module.exports = { build, cardsFor, addClassTo, addRootClass };
