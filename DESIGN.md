# Empower visual design

**Daniel reviewed:** no

Empower is a quiet, dark room where the events and the people are the brightest things in it. The app's own surfaces stay near-black and flat so photographs carry the colour.

## Reference, and where it stops

Round 1 transcribes the craft of the Disney+ iOS app: how it presents cards, how deep its polish goes. We are not copying the Disney+ app. In Empower the cards are **events** and **people**.

Taken from the reference (values measured from its screens, recorded per token in `design_system/tier_00_foundations.json`):

- Midnight canvas (`#0e101c`), one indigo panel colour (`#1b1e33`) for cards, fields and rows, a brighter indigo (`#2b3162`) for anything selected. The mood is a city at night: dark indigo with warm lights.
- Image-led cards: artwork fills the card, a fade at the bottom carries a bold white title.
- One candle-gold (`#ffb85c`), rounded, uppercase primary button per screen, flat with a soft warm glow under it. Secondary buttons are a lighter indigo; small actions on cards write their label in candle gold on that fill. Nothing draws a coloured outline or a lip: a selected choice fills with the brighter indigo and shows a tick. Corners follow the Caelos scale (10, 13.5 and 18.23 pixels).
- White badges on artwork ("Your pick this week"), quiet grey badges for categories.
- Settings-style rows: label left, value right, a hairline between rows.
- A frosted bottom bar with five destinations; the current one is white.
- 20-point side gutters, 4-point corners, 56-point fields and rows.

Changed on purpose:

- Buttons are 44 points tall, not Disney's 40, to meet the touch-target minimum.
- The typeface is Nunito Sans (open licence, stored in `fonts/`). Disney's own typeface is private.
- One signature of our own: a faint aqua glow behind the top of each screen.

Outside the reference. These use the shared tokens and stay plain until a second reference is chosen (round 2):

- Chat, group threads, the message box, voice notes and the typing indicator.
- The onboarding quiz tiles and the check-in rating.
- The Empower score, warmth stages and progress numbers.
- The "I'm in" and "Pass" stamps on a swiped card.

## Rules for every screen

- The event's artwork follows it through the flow: weekly pick, browse, detail, commit, prep, check in.
- A person is shown by their portrait first, then their name, then what you share.
- No card inside a card. No small label above a screen title. No emoji as icons.
- Every control has pressed, focus, disabled and selected states, and is at least 44 points tall.
- Motion is short and can be turned off: every animation has a reduced-motion rule.
- Text meets 4.5:1 contrast on its surface. The check script measures the pairs listed in the foundations file.

## How it is built

Tokens, then recipes in seven tiers, then generated CSS. See "Design system: tokens first" in `AGENTS.md`. `pages/components.html` shows every component in every state.

The event artwork is AI-generated and illustrates activities; it does not show real attendees.
