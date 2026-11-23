# Instructions for AI coding agents (Codex, Claude Code, and others)

Empower is a team project for Coding with GPT (Darden 8633). Most code here is written by AI agents working for different teammates who don't read each other's code. These rules keep the parts consistent. Follow them on every task. If a request conflicts with them, say so before making changes.

## What the app is
A mobile web app that helps people new to a city keep going back to the same groups until they make friends. The core loop: onboarding, weekly picks, commit with a plan, day-of prep, check in and rate, meet people, matches and chat, progress. Plain-language explanation for humans: `docs/how-it-works.md`.

## Hard constraints from the course
- Languages: HTML, CSS, and plain JavaScript (Python allowed for scripts). **No frameworks** (no React, Angular, Vue, Tailwind build steps, bundlers).
- Must run by opening `index.html` or via GitHub Pages. No server, no build step.
- Teammates must be able to explain the code. Prefer plain, readable code over clever code.

## Architecture and ownership

| Layer | Files | Owner | Rule |
| --- | --- | --- | --- |
| Rules (mechanics) | `js/logic.js`, `js/people.js`, `js/schedule.js`, `js/demo.js`, `js/lab.js` | Chinmaya | Pure functions only: no DOM, no localStorage, no `new Date()` without an argument. Pass `now` in. |
| Data layer | `js/store.js` | Chinmaya | The only file that touches localStorage (except the demo clock in `js/ui.js`). |
| Data | `data/groups.js`, `data/population.js`, `scripts/` | Chinmaya | `data/population.js` is generated: change `scripts/generate_population.py` and rerun it, never hand-edit. All people are synthetic. |
| Tests | `tests/` | Chinmaya | Every rule has a test. |
| UI | `css/styles.css`, `pages/*.html`, `index.html`, the page scripts (`js/home.js`, `js/events.js`, `js/group.js`, `js/commit.js`, `js/prep.js`, `js/reflect.js`, `js/me.js`, `js/matches.js`, `js/person.js`, `js/chat.js`, `js/onboarding.js`, `js/lab-page.js`, `js/thread.js`, `js/browse.js`) | Daniel | Layout, styling, markup and wording. Page scripts call the API in `docs/mechanics.md`; they do not contain business rules. |
| Design assets | `events_flow/`, `user_connecting_flow/`, `skills/`, `_templates/` | Daniel | Design specs and validators. |
| Mockups | `prototype/` | Reference only | Superseded by Daniel's designs. Don't extend. |
| Design system | `design_system/`, `scripts/build_tokens.js`, generated `css/design-system.css` | Daniel | Token-based design system. See "Design system: tokens first" below. |

**If your task is UI work and needs a new rule or new data, do not write the rule in the page.** Stop and tell the user it needs a mechanics change (a new function in `js/logic.js` or `js/people.js`, with a test and a row in `docs/mechanics.md`).

**If your task is mechanics work, do not change page markup or styles** beyond the minimum needed to call a new function.

**Exception for new features:** Chinmaya may ship basic working screens for a new feature, styled only with the existing CSS variables, so the feature can be tested end to end. Mockups for these live in the team design canvas, not in `prototype/`. Daniel owns the final look and restyles these screens; the logic they call does not change when he does.

## Design system: tokens first

Team decision, November 8, 2026: Empower's UI is a **token-based design system**. Every style value comes from a design token, and every component is a recipe that uses only tokens. Since November 23, 2026 the whole app is on it, and a check rejects anything that is not.

- **One file holds raw values:** `design_system/tier_00_foundations.json`. Each token records where its value came from (`evidence.reference_id`, listed under `references`). Round 1 values are measured from the Disney+ iOS app; chat, the onboarding quiz, the Empower score and the swipe stamps are outside that reference and use the shared tokens until a second reference is chosen.
- **Recipes build upward in tiers.** Recipes are JSON files in `design_system/recipes/tier_0N_*/`, shaped like PandaCSS recipes: `{ className, purpose, uses, base, elements, variants, states, keyframes }`. Values are written as `{token.name}`. A recipe may only build on recipes in lower tiers, and must list them in `uses`. Tiers: 1 primitives, 2 controls, 3 overlays and feedback, 4 patterns, 5 product components, 6 regions, 7 screens. Do not install `@pandacss/dev` or any npm package.
- **Generated plain CSS, committed.** `node scripts/build_tokens.js` (Node standard library only) writes `css/design-system.css`: one CSS variable per token (`color.action.primary` becomes `--color-action-primary`) and one class per recipe, element (`.card__title`), variant (`.btn--secondary`) and state (`.chip.is-selected`). Never edit that file by hand. `css/styles.css` only imports it and holds no rules.
- **The gate.** `node scripts/check_design_system.js` fails on: a raw colour, size, time, easing curve or font name in a recipe; a token that does not exist or is used for the wrong job (a spacing token as a colour); a recipe that builds on its own or a higher tier; a class used in a page or script that no recipe defines; inline `style=""` or `.style.x =` in a page or script; a text and surface pair below its contrast minimum; and a stale `css/design-system.css`. The header of the script lists every rule, and `tests/design-system.test.js` has one failing example per rule.
- **Values that change while the app runs** (the swipe position, a progress bar's width) are `runtime.*` tokens. A script may set only those: `el.style.setProperty("--runtime-fill", "40%")`.
- **Markup helpers.** A component that needs HTML gets a small helper in `js/ui.js` that outputs its recipe classes, the way `Empower.ui.avatar` does. Changing `js/ui.js` is a shared-file PR.
- **Three things are owned by the system, not by a recipe.** A recipe names a preset; it may not set these by hand, and the check refuses it if it does.
  - *States:* `design_system/states.json`. Hover, pressed and their reduced-motion versions. A recipe writes `"interaction": { "base": "on-light" }` (keys are `base`, `__part` or `--variant`).
  - *Surfaces:* `design_system/surfaces.json`. The panel fill, the frosted bar, every shadow and blur. A recipe writes `"surface": { "base": "panel" }`.
  - *Text:* `design_system/type.json`. Size, weight, line spacing, letter spacing and capitals together, as a named role. A recipe writes `"text": { "__title": "heading" }`. A weight alone may still be set by hand.
  To change how every button answers a press, how every panel looks, or how every row title is set, edit the preset once.
- **Every recipe shows itself.** A recipe carries an `example` (one piece of markup whose root wears its class) and a `frame` (`inline`, `block` or `phone`). `examples` can give a fuller example for one variant, part or state. A part, variant or state that no screen draws is refused unless the recipe waives `unused` with a reason.
- **The review board is generated.** `node scripts/build_board.js` writes `pages/components.html` from the recipes: every component, in every state and variant, in one fixed order, with what each card changes from its default. Never edit that page by hand; the check compares it to the generator. Anything a screen draws must have a card there: if the check says a class is drawn in the app but not shown, add it to the recipe's `example` or give it one under `examples`. The board may hold more than the app uses.
- **"Double check everything"** means `docs/design-double-check.md`: the scripts to run first, then eight sections (colour, type, space, surface, states, motion, access, layout) that each go to a separate reviewer.
- **To change a look:** edit a token, a preset or a recipe, then run `node scripts/build_tokens.js`, `node scripts/build_board.js` and the check, in that order.

## The contract
`docs/mechanics.md` lists every function pages may call. When you add or change one:
1. Update the function, keeping it pure.
2. Add or update its test in `tests/`.
3. Update its row in `docs/mechanics.md`.
`node scripts/check_architecture.js` fails if an exported function is missing from `docs/mechanics.md`.

## Rules for every change
- Use `Empower.clock.now()` for the current time, never `new Date()` with no argument in app code.
- Escape user-typed text with `Empower.ui.escapeHtml` before putting it in HTML.
- Log key moments with `Empower.log("area.what_happened", {...})`.
- Colors, type, spacing, radius and motion come from design tokens, through a recipe in `design_system/recipes/`. Never hard-code them. No inline `style=""` in HTML.
- Every page loads scripts in this order: `data/groups.js`, `js/ui.js`, `js/store.js`, `js/schedule.js`, `js/logic.js`, `data/population.js`, `js/people.js`, then its own script.

## Workflow
- Never commit to `main`. One story per branch (`name/short-story`), one PR per story, small enough to review in 15 minutes.
- Before opening a PR, run these checks and make sure they pass:
  - `node --test tests/*.test.js`
  - `node scripts/check_architecture.js`
  - `node scripts/check_design_system.js`
- Fill in the PR template (`.github/pull_request_template.md`), including scenarios you actually ran and what the AI got wrong.
- Pull `main` before starting. If your branch touches a file another open PR also touches, say so in the PR.
- Graded course PRs: AI may draft the scenarios, results, PR description and review comments, from the teammate's direction and from scenarios actually run. The teammate reviews and owns them, and the PR says they were AI-drafted. Never report a result that wasn't actually run.
