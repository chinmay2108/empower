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
| UI | `css/styles.css`, `pages/*.html`, `index.html`, the page scripts (`js/home.js`, `js/events.js`, `js/group.js`, `js/commit.js`, `js/prep.js`, `js/reflect.js`, `js/me.js`, `js/matches.js`, `js/person.js`, `js/chat.js`, `js/onboarding.js`, `js/lab-page.js`) | Daniel | Layout, styling, markup and wording. Page scripts call the API in `docs/mechanics.md`; they do not contain business rules. |
| Design assets | `events_flow/`, `user_connecting_flow/`, `skills/`, `_templates/` | Daniel | Design specs and validators. |
| Mockups | `prototype/` | Reference only | Superseded by Daniel's designs. Don't extend. |

**If your task is UI work and needs a new rule or new data, do not write the rule in the page.** Stop and tell the user it needs a mechanics change (a new function in `js/logic.js` or `js/people.js`, with a test and a row in `docs/mechanics.md`).

**If your task is mechanics work, do not change page markup or styles** beyond the minimum needed to call a new function.

**Exception for new features:** Chinmaya may ship basic working screens for a new feature, styled only with the existing CSS variables, so the feature can be tested end to end. Mockups for these live in the team design canvas, not in `prototype/`. Daniel owns the final look and restyles these screens; the logic they call does not change when he does.

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
- Colors, type, spacing and radius come from the CSS variables at the top of `css/styles.css`. No inline `style=""` in HTML.
- Every page loads scripts in this order: `data/groups.js`, `js/ui.js`, `js/store.js`, `js/schedule.js`, `js/logic.js`, `data/population.js`, `js/people.js`, then its own script.

## Workflow
- Never commit to `main`. One story per branch (`name/short-story`), one PR per story, small enough to review in 15 minutes.
- Before opening a PR, run both checks and make sure they pass:
  - `node --test tests/*.test.js`
  - `node scripts/check_architecture.js`
- Fill in the PR template (`.github/pull_request_template.md`), including scenarios you actually ran and what the AI got wrong.
- Pull `main` before starting. If your branch touches a file another open PR also touches, say so in the PR.
- Graded course PRs: the scenarios, results, PR description and review comments must be written by the human teammate. Draft the code; don't write those parts for them.
