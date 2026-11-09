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

Team decision, November 8, 2026: Empower's UI is moving to a **token-based design system**. Every style value comes from a design token, and components are built from recipes that use only tokens.

- **Source of truth:** the foundation tokens in `design_system/tier_00_foundations.json`. This file is filled in from `_templates/components_system_template/tier_00_foundations.json`, with values traced to the team Figma library and `events_flow/`.
- **Recipes in PandaCSS's shape, without installing Panda.** Recipes are JSON files in `design_system/recipes/`, shaped like Panda recipes: `{ className, base, variants, defaultVariants }`, where every value is a token name. Do not install `@pandacss/dev` or any npm package. The course allows no frameworks, bundlers or build step. If the team adopts Panda later, the recipes and tokens can move into `panda.config`.
- **Generated plain CSS, committed.** `node scripts/build_tokens.js` (Node standard library only) writes `css/design-system.css`. It has one CSS variable per token, named from the token path (`color.action.primary` becomes `--color-action-primary`), and one class per recipe and variant (`.button`, `.button--variant_secondary`). The file is committed and never edited by hand, like `data/population.js`, so the app still runs with no build step.
- **Recipes use tokens only.** No hex codes, pixel values or font names inside a recipe. To change a value, edit the foundations file and rerun the script. A test checks that the committed CSS matches the script output.
- **Markup helpers.** A component that needs HTML gets a small helper in `js/ui.js` that outputs its recipe classes, the way `Empower.ui.avatar` does. Changing `js/ui.js` is a shared-file PR.
- **Transition.** Existing pages keep using the variables at the top of `css/styles.css` until they are migrated. Each migration is its own PR. New components use the token system.

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
- Colors, type, spacing and radius come from design tokens: `css/design-system.css` for the token system, or the variables at the top of `css/styles.css` on pages not yet migrated. Never hard-code them. No inline `style=""` in HTML.
- Every page loads scripts in this order: `data/groups.js`, `js/ui.js`, `js/store.js`, `js/schedule.js`, `js/logic.js`, `data/population.js`, `js/people.js`, then its own script.

## Workflow
- Never commit to `main`. One story per branch (`name/short-story`), one PR per story, small enough to review in 15 minutes.
- Before opening a PR, run both checks and make sure they pass:
  - `node --test tests/*.test.js`
  - `node scripts/check_architecture.js`
- Fill in the PR template (`.github/pull_request_template.md`), including scenarios you actually ran and what the AI got wrong.
- Pull `main` before starting. If your branch touches a file another open PR also touches, say so in the PR.
- Graded course PRs: AI may draft the scenarios, results, PR description and review comments, from the teammate's direction and from scenarios actually run. The teammate reviews and owns them, and the PR says they were AI-drafted. Never report a result that wasn't actually run.
