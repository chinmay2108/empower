# Design brief: the Warm Evenings palette

**Status:** Proposal, for the design owner (Daniel) to accept, change or reject. Nothing in the app or in `design_system/` changes until a later PR does that on purpose.
**Proposed by:** Saumya, November 10, 2026.
**Mockup:** the "Empower Warm Evenings Palette" design canvas (Saumya can share the link). It shows the palette and three phone screens: This week, Check in and People.

## The idea in one line

Empower should feel like a warm evening out, not a productivity app. **Ember** (orange) means *go*: commit, show up, check in. **Pine** (deep green-teal) means *belong*: people, matches, progress. Warm neutrals hold it together.

## Why change the current colors

The current colors were placeholders, and the foundations file (`design_system/tier_00_foundations.json`) is still filling in, so this is the cheapest moment to choose a direction.

1. **They don't say anything about the product.** White, cool grey and one purple look like most tech apps. Empower helps people new to a city keep going back to the same groups until they make friends. That's a warm, social, slightly brave act, and the colors should feel that way.
2. **The app already has a warmth idea.** The Empower score is an ember that warms, and friendships move through warmth stages (spark to bonfire). Right now that's one feature. This palette makes it the whole brand.
3. **Two purples are live at once.** `css/styles.css` uses indigo `#4338ca` and the token system uses `#713ad5`. While pages migrate one by one, buttons change color from page to page. Choosing the final palette now means each page migrates once.
4. **Some current tokens are hard to read.** The success green `#4cb943` and warning yellow `#ca951f` reach only about 2.5:1 on white. Body text needs 4.5:1.

## The palette

### Core colors

| Role | Name | Hex | Use it for |
| --- | --- | --- | --- |
| Page background | Cream | `#FBF7F2` | Every page, instead of pure white |
| Surface | Sand | `#F3ECE3` | Quiet panels, such as the "Last time you wrote" card |
| Card | White | `#FFFFFF` | Cards that sit on cream and need to stand out |
| Divider | Line | `#E6DCCF` | Lines between things. Decorative only (see the input border below). |
| Input border | Stone | `#938373` | Borders of text inputs and unselected choice buttons |
| Main text | Ink | `#1F1A17` | Headings and body text |
| Secondary text | Muted | `#6B6058` | Dates, hints, captions |
| Primary action | Ember | `#C2410C` | The main button on a screen ("I'm in", "Save"), with white text |
| Primary text | Deep ember | `#9A3412` | Links, orange text, a selected choice's label, pressed buttons |
| Primary soft | Ember soft | `#FBE7DA` | Background of a selected choice or highlight tag |
| Secondary | Pine | `#1F5F5B` | Matches, the People tab, progress, "you're on track" |
| Secondary soft | Pine soft | `#E3EFEC` | Background of pine cards and "who's going" strips |

### Status colors

Each comes with a soft background for pills and notices. Status is always shown with words or an icon too, never by color alone.

| Status | Text | Soft background |
| --- | --- | --- |
| Success | `#276B43` | `#E7F3EC` |
| Warning | `#9A5B07` | `#FBF0DD` |
| Error | `#B42318` | `#FCE9E7` |

### Warmth stages

Used for the Empower score ember and the warmth bar next to each person. **Fills only, never text**: the middle three are too light to read on cream.

| Stage | Hex |
| --- | --- |
| Spark | `#B8AEA4` |
| Kindling | `#F2B66D` |
| Warm | `#E8853A` |
| Glow | `#D9541E` |
| Bonfire | `#B3261E` |

The stage's name always appears as text next to the fill (for example "Glowing"), so the meaning doesn't depend on telling the oranges apart.

### Dark mode (for later)

The same idea, flipped: background warm charcoal `#1A1614`, surface `#26201D`, text `#F5EEE7`, muted text `#B5A99F`, ember `#F07A3E` (with dark text `#1A1614` on ember buttons), pine `#6FB8AE`. All pass 4.5:1 in the pairs listed. Dark mode isn't on the backlog, so this is only so the light palette doesn't box it in.

## Decisions and the reasons for them

| Decision | Why |
| --- | --- |
| Orange as the primary action color, not purple | Orange reads as warm and inviting, and it ties to the ember score. It's also rare among social and calendar apps, so Empower looks like itself. |
| A second color, pine, just for people and belonging | Connection shouldn't feel like another call to action. A calm color separates "do this" (ember) from "you belong here" (pine). Orange and green-teal also differ in lightness, so they stay distinct for color-blind users. |
| Warm neutrals (cream, sand, ink) instead of white, grey and black | They make every screen feel softer at no cost. Ink on cream is 16:1, so readability doesn't suffer. |
| Two oranges: one for buttons, a deeper one for text | Button orange is 4.85:1 on cream but only 4.42:1 on sand, just under the 4.5:1 text rule. Deep ember passes everywhere (6.1:1 or more). |
| One ember button per screen | If everything is orange, nothing stands out. Secondary actions use white or outlined buttons. |
| A darker border (stone) for inputs and choice buttons | WCAG asks for 3:1 on the edges of controls. Line `#E6DCCF` is only 1.35:1, so a text box would be hard to find. Stone is 3.4:1 on cream and 3.7:1 on white. Line stays for decorative dividers. |
| Success green `#276B43` instead of `#2F7D4F` | `#2F7D4F` fails on its own soft pill (4.42:1). `#276B43` passes on cream, sand and its pill (5.5:1 or more). |
| Warmth colors as fills only | Kindling is 1.7:1 and Warm 2.5:1 on cream. They're fine as bars and icons, but the stage name always appears as text beside them. |

## Contrast check

WCAG AA asks for 4.5:1 for normal text and 3:1 for large text and control edges. Every text pair below passes. Ratios were calculated with the standard WCAG formula.

| Foreground | Background | Ratio | Use |
| --- | --- | --- | --- |
| Ink `#1F1A17` | Cream `#FBF7F2` | 16.2 | Body text |
| Ink | Sand `#F3ECE3` | 14.7 | Text on panels |
| Muted `#6B6058` | Cream | 5.7 | Secondary text |
| Muted | Sand | 5.2 | Secondary text on panels |
| White | Ember `#C2410C` | 5.2 | Main button label |
| Ember `#C2410C` | Cream | 4.85 | Large text only |
| Deep ember `#9A3412` | Cream | 6.9 | Links, orange text |
| Deep ember | Ember soft `#FBE7DA` | 6.1 | Selected choice label |
| White | Pine `#1F5F5B` | 7.4 | Text on pine cards |
| Pine | Cream | 6.9 | Pine text |
| Pine | Pine soft `#E3EFEC` | 6.3 | "Who's going" strip |
| Success `#276B43` | Its pill `#E7F3EC` | 5.6 | Status pill |
| Warning `#9A5B07` | Its pill `#FBF0DD` | 4.8 | Status pill |
| Error `#B42318` | Its pill `#FCE9E7` | 5.6 | Status pill |
| Stone `#938373` | Cream | 3.4 | Input borders (needs 3:1) |

## How it maps to our tokens

If accepted, these values replace the current ones in `design_system/tier_00_foundations.json`. The token names stay the same, so the recipes and `css/design-system.css` don't need restructuring.

| Token | Now | Proposed |
| --- | --- | --- |
| `color.surface.canvas` | `#ffffff` | `#FBF7F2` |
| `color.surface.panel` | `#f5f5f7` | `#F3ECE3` |
| `color.text.primary` | `#161616` | `#1F1A17` |
| `color.text.secondary` | `#686868` | `#6B6058` |
| `color.text.inverse` | `#ffffff` | `#FFFFFF` (no change) |
| `color.action.primary` | `#713ad5` | `#C2410C` |
| `color.action.secondary` | `#eee5fc` | `#FBE7DA` |
| `color.border.default` | `#eeeeee` | `#E6DCCF` |
| `color.status.success` | `#4cb943` | `#276B43` |
| `color.status.warning` | `#ca951f` | `#9A5B07` |
| `color.status.error` | `#b4401a` | `#B42318` |

New tokens this palette needs:

| New token | Value |
| --- | --- |
| `color.surface.card` | `#FFFFFF` |
| `color.border.control` | `#938373` |
| `color.action.primary-text` | `#9A3412` |
| `color.brand.belong` | `#1F5F5B` |
| `color.brand.belong-soft` | `#E3EFEC` |
| `color.status.success-soft`, `color.status.warning-soft`, `color.status.error-soft` | `#E7F3EC`, `#FBF0DD`, `#FCE9E7` |
| `color.warmth.spark` through `color.warmth.bonfire` | the five warmth values above |

## What's not decided

- **Typeface.** The mockup uses DM Sans to show the colors. The font is a separate decision.
- **Pine on the Home screen.** The mockup uses pine only on People. Whether Home's progress section uses pine or ember is open.
- **The ember icon.** The current ember drawing may need its colors retuned to the new warmth scale.

## If the team accepts it

1. Daniel updates `design_system/tier_00_foundations.json` with the values above and regenerates `css/design-system.css`, in one PR.
2. The old variables at the top of `css/styles.css` get the same values, so pages not yet migrated match.
3. Pages keep migrating to the token system one PR at a time, as AGENTS.md already says.

_This brief was drafted with Claude from Saumya's direction. The contrast ratios were calculated, not estimated._
