# Empower backlog

Format follows the course (Session 1): each story has a test prompt (for usability testing), an OEC (how we will know it works for the business), and Given-When-Then scenarios. For the PR stories, each owner owns the scenarios in their PR (AI may draft them from the owner's direction; the PR says so). That part is graded individual work.

## Positioning

For young professionals new to a city who want a social life but don't follow through, Empower is a social follow-through app that gets you back to the same group often enough to make friends. Unlike Timeleft or 222, which seat you with new strangers each time, Empower builds repeat contact and uses proven planning and reflection techniques to get you there.

## Persona

**Rick the Relocator.** 27, moved to Charlottesville for work six months ago. Has gone to a few one-off events, enjoyed them, never saw anyone again. Often decides not to go an hour before an event.

## Epic

As Rick the Relocator, I want to keep showing up to the same few groups, so that acquaintances turn into friends.

---

## Now: first PR stories (one per teammate, no shared files)

### Story 1: Tell Empower about me
**Files:** `pages/onboarding.html`, `js/onboarding.js`
**Owner:** TBD

> As Rick the Relocator, I want to tell Empower my interests and free evenings, so that I only see events that fit me.

| Test prompt | OEC |
| --- | --- |
| "You just moved here and like games and running. You're free Tuesday and Thursday evenings. Set up Empower so it knows that." Observe: can they finish without help? How long does it take? | Onboarding completion rate (started vs saved profile). Target: 80%+ finish in under 2 minutes. |

**Scenarios:** written by the owner in their PR (2 to 4, at least one failure case).

### Story 2: Commit to one event this week
**Files:** `pages/events.html`, `js/events.js`
**Owner:** TBD

> As Rick the Relocator, I want to see this week's top picks and commit to one with a leave time, so that going feels decided.

| Test prompt | OEC |
| --- | --- |
| "Pick one thing to do this week and set yourself up to actually go." Observe: do they pick from the top picks? Do they set a leave time without being asked twice? | Commit rate (users who commit to at least one session per week). Show-up rate on committed sessions. |

**Scenarios:** written by the owner in their PR.

### Story 3: Check in after going
**Files:** `pages/reflect.html`, `js/reflect.js`
**Owner:** TBD

> As Rick the Relocator, I want to log that I went and rate it in three taps, so that I can see my progress with that group.

| Test prompt | OEC |
| --- | --- |
| "You went to trivia last night. Tell Empower how it went." Observe: can they find the right event? Do they finish all three taps? | Reflection completion rate after attended sessions. Share answering "would go back" = yes. Return rate to the same group within 14 days. |

**Scenarios:** written by the owner in their PR.

---

## Next (after the PR assignment)

| Story | Why it matters | Notes |
| --- | --- | --- |
| As Rick, I want to add people I met at an event, and if they add me too we get matched, so that I see them again | Turns one good conversation into a repeat contact | Needs a shared backend (Python) so two users can see each other |
| As Rick, I want a chat with my matches where the app suggests events for us, so that we have an easy reason to meet again | Repetition with specific people | Depends on matching |
| As Rick, I want to see my show-up score, so that hosts and buddies trust I will come | Reduces flaking for everyone | Score = attended / (attended + missed), last 10; early cancels don't count |
| As Rick, I want a reminder at my leave time with my plan, so that I don't talk myself out of it | Day-of drop-off is the biggest gap | Email first; SMS later |
| As Rick, I want to know if anyone else from Empower is going, so that walking in alone feels easier | Fear of walking in alone | Needs shared backend |
| As Rick, I want a "why this fits you" line on each pick, so that I trust the pick | Builds trust in recommendations | First AI feature; candidate for Session 9 evals |

## Later / parked

- Swipe-style matching before events
- Native widget or watch app
- Refundable deposit to commit
