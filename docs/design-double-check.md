# Design double-check

**Daniel reviewed:** no
**Written:** November 23, 2026

Use this when the instruction is "double check everything" about the design system. It is the full list of what to check, split so that each section can go to its own agent at the same time.

## Why this list exists

Something always gets missed: a spacing token, a motion token, a glow on hover. The checks below each catch a different kind of miss. No single one is enough.

| Check | What it catches | What it cannot catch |
|---|---|---|
| **Source** (`node scripts/check_design_system.js`) | A style value that is not a token; a state, surface or text style written by hand | Anything that was never written |
| **Name** (same command, rule 15) | A class a screen uses that has no card on the review board | A new combination of existing pieces |
| **Render** (`docs/design-double-check-render.js`) | A value on a real screen that is not a token, including browser defaults nobody set | States that need a pointer or a finger; motion while it is moving |
| **Eyes** (the review board, and a walk through the app) | The wrong token chosen; a state that was never designed; anything that looks off | Nothing, but it is slow and it is where things get skipped |

**Absence is the hard case.** A script can confirm that every value present is a token. Only the "must answer" questions below, asked of every component, find a hover glow that nobody designed.

## How to run it with several agents

1. Run the three scripts first (two minutes). Fix what they report before spending anyone's attention.
   - `node scripts/build_tokens.js`, `node scripts/build_board.js`, `node scripts/check_design_system.js`
   - `node --test tests/*.test.js`
   - The render pass, at both widths (instructions are at the top of that file).
2. Give each section A to H below to a separate agent that did not build the thing it is checking. Give it this file, the section letter, and the address of the review board (`pages/components.html`).
3. Each agent answers every "must answer" question for every component on the board. "Not applicable" is an allowed answer only with a reason.
4. Each agent reports in this form, and nothing else:
   - **Component, question, finding, evidence.** Evidence is a file and line, a computed value read from the browser, or a cropped screenshot.
   - A separate short list: anything it could not check, and why.
5. One person or agent merges the reports. A finding without evidence goes back.

## The sections

Token families named below are in `design_system/tier_00_foundations.json`. Presets are in `design_system/states.json`, `surfaces.json` and `type.json`.

### A. Colour

Token families: `color.surface`, `color.text`, `color.action`, `color.accent`, `color.border`, `color.focus`, `color.status`, `color.ember`, `color.scrim`, `color.glow`, `color.state`.

Must answer, per component:
- What fills it, what colour is its text, what colour is its border?
- Is its text readable on its fill (4.5 to 1 for body text, 3 to 1 for large text and icons)?
- If it sits over a photograph, is the text still readable on the lightest and darkest photo?
- Does it use a status colour (good, warning, bad)? Is the meaning also carried by words or a shape?

Often missed: placeholder text, disabled text, text selection, the browser's tap highlight, scrollbars, icons that take their colour from the text around them.

### B. Type

Token families: `type.family`, `type.size`, `type.weight`, `type.line_height`, `type.letter_spacing`. Roles: `design_system/type.json`.

Must answer:
- Which text role does each line of text use?
- What happens to the longest realistic text: does it wrap, cut off with dots, or push something off screen?
- What happens with the shortest text, or none?
- Are numbers that change (a timer, a count) kept from jumping sideways?

Often missed: line height on text that wraps to two lines, text inside buttons and inputs (browsers set their own), all-capitals labels without letter spacing.

### C. Space and size

Token families: `space`, `size` (touch target, field, row, icons, avatars, cards, page widths, footer clearance), `ratio`, `breakpoint`.

Must answer:
- Padding inside it; gap between its parts; space between its lines of text.
- Margin to its neighbours above and below.
- Does it line up with the page gutter on the left and right?
- Is everything you can press at least the touch target size?
- Does the last item on a screen clear the bar fixed to the bottom?

Often missed: browser default padding and margins on buttons, lists, headings and paragraphs; the gap between an icon and its label; the phone's safe areas at the top and bottom.

### D. Shape, surface and depth

Token families: `radius`, `border`, `shadow`, `blur`, `layer`, `opacity`. Presets: `design_system/surfaces.json`.

Must answer:
- Which surface preset does it name? Corner radius? Border?
- Does it cast a shadow, and is the shadow visible in full where it is used (not cut off by a parent)?
- What sits above it and below it when things overlap (bars, sheets, pop-ups, messages)?
- For images: how is the picture cropped, what shows while it loads, what shows if it fails?

Often missed: corners on the image inside a rounded card, a glow or highlight that exists only on one component, layer order between the bottom bar and a pop-up.

### E. States

Presets: `design_system/states.json`. Board cards: Default, Hover, Pressed, Focus, Selected, Disabled, then named states.

Must answer, for everything you can press or type into:
- Default, hover, pressed, focus ring, selected or current, disabled.
- Loading, empty, error: does this component ever need one? Where is it drawn?
- Does each state look different from the one before it, to the eye and not only in the code?
- Is "selected" told to screen readers (`aria-pressed`, `aria-selected`, `aria-checked`, `aria-current`)?

Often missed: hover on a part inside a card rather than the card itself, selected plus hover together, the focus ring being cut off by a parent, a disabled control that still looks pressable.

### F. Motion

Token families: `motion.duration`, `motion.easing`, `motion.scale`, `motion.distance`, `motion.angle`.

Must answer:
- How does it enter and leave (sheets, pop-ups, messages, cards thrown away)?
- How long does each state change take, and with which easing?
- What happens when the person has asked their device for less motion?
- Does anything move that should not (layout jumping when content loads)?

Often missed: the way out (things that animate in but vanish at once), a change of state with no transition next to one that has it, looping animations with no reduced-motion rule.

How to check: scripts can read durations. Whether it feels right needs a recording or a person. Say which you did.

### G. Access

Must answer:
- Can every control be reached and used with the keyboard alone, in a sensible order?
- Does every control have a name a screen reader can say (icon-only buttons especially)?
- Is the focus ring visible on every control, against every surface it sits on?
- Do images that carry meaning have a description, and decorative ones none?
- Is anything conveyed by colour alone?

Often missed: controls made from a plain `div` with a click handler, pop-ups that do not hold focus, messages that appear without being announced.

### H. Layout and coverage

Must answer:
- Does each screen work at phone width (390) and at wide width (1280) with no sideways scroll?
- Is there anything on a real screen that has no card on the board? (The name check covers classes; look for combinations and one-off arrangements.)
- Does each board card match the same component on its real screen: same position, same spacing, same state?
- Are the screens under each demo person (see the Me screen) all still right, including the empty ones?

Often missed: screens that only appear partway through a flow (after committing, after checking in, after rating), the first-run screens, and whatever was added most recently.

## Known gaps in the checks themselves

Keep this list honest. Add to it when a miss gets through.

- The render pass reads screens at rest. It does not hover, press or focus anything, and it does not see motion in progress.
- The name check works by class name. It does not notice a new arrangement of existing pieces.
- The source check still accepts: a selected style that looks the same as rest, a hover preset equal to a value the part only inherits, a click handler on a plain `div`, class names joined from pieces in script, and a link made with `createElement`.
- `prototype/` is outside every check.
- The repository's browser tests under `tests/browser/` need Playwright, which is not installed here.
