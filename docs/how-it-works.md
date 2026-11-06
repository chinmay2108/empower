# How Empower works (plain English)

A 5-minute read so anyone on the team can explain the app in class. The examples use "Rick": he likes trivia, board games and hiking, is free Tuesday and Thursday evenings and Saturday mornings, and says new groups make him "a bit nervous". The numbers come from running the real code.

## 1. How the weekly picks are chosen

Every group meets weekly, so the app first lists every session in the next 8 days. Then it scores each one for the user and shows the top 3, with at most one per group.

| Points | When |
| --- | --- |
| +3, plus 1 per shared interest | The group matches something you like |
| +4 | It's at a time you said you're free |
| -4 | It isn't |
| +3 | You've been to this group before (going back is how friendships form) |
| +2 | You're nervous or anxious and the group has a built-in activity |
| -2 or -4 | You're nervous or anxious and it's open mingling |
| +1 | You're anxious and the group is small (10 or fewer) |

**Rick's week:**

| Session | Score | Why it shows |
| --- | --- | --- |
| Thursday Trivia Crew | 10 | Trivia (+4), Thursday evening (+4), activity-based (+2) |
| Beginner Pottery Night | 6 | Tuesday evening (+4), activity-based (+2) |
| Spanish Language Exchange | 6 | Tuesday evening (+4), activity-based (+2) |

Ties go to the earlier session. The line "You like trivia, and it fits a time you're free" is built from the same reasons, so the explanation always matches the score.

Code: `rankPicks` and `scoreSession` in `js/logic.js`.

## 2. Committing, cancelling and showing up

- **Commit:** the app suggests a leave time (bus 30 minutes before, walking 25, driving or biking 20). The user can change it. Making a specific "when and how" plan is the strongest research-backed way to turn intentions into action.
- **Double-booking:** if two sessions overlap, the app blocks the second and offers "keep that one" or "switch".
- **Cancelling:** 24 hours or more before the start, nothing counts against you. Later than that counts as missed.
- **Check-in:** opens 30 minutes before the start and closes 12 hours after the end. If nobody checks in by then, it counts as missed.
- **Show-up score:** of your last 10 sessions that were attended or missed, how many you attended. Early cancellations don't count.

Code: `findConflict`, `suggestLeaveTime`, `cancellationOutcome`, `canCheckIn`, `effectiveStatus`, `showUpScore` in `js/logic.js`.

## 3. The other users (synthetic)

There are no real users yet, so `data/population.js` holds **500 invented people** made by `scripts/generate_population.py`. Each one has interests, free times, a comfort level, and membership in 1 to 3 groups that suit them. Each group has a few **regulars** (they come most weeks) and a long tail of occasional visitors.

**Who goes to a session** isn't stored anywhere. For each person, the app turns "person + group + week" into a number between 0 and 1. If it's below that person's attendance rate for the group, they're there. The same inputs always give the same number, so:

- last month's sessions have a stable history,
- next week's sessions have a stable "who's going",
- and nothing has to be saved.

**Thursday Trivia Crew, example:** over the last 8 weeks, 8 different Empower people came, 3 of them regulars, with about 3.4 per session. Next Thursday, 5 are going: Marco J., Emeka K., Luis J., Emeka F. and Hassan R.

Code: `attends`, `attendeesOf`, `groupStats` in `js/people.js`.

## 4. Meeting people and matching

After rating a session, the user sees who was there (most interests in common first) and adds anyone they'd see again. It's a match only if that person adds them back. The chance of that:

> 0.2 base, plus 0.1 per shared interest (up to 3), plus 0.3 × how warm the person is, plus 0.1 per extra session together (up to 2). Capped at 0.9.

The same repeatable number decides yes or no, so a person's answer never flips. People who don't add back are counted ("2 people haven't added you back yet") but never named.

**Rick at trivia:** Emeka K. (warmth 0.85, shares 1 interest) has a 56% chance and adds him back. Hassan R. (warmth 0.25, shares 2) has 48% and doesn't, this time. Going back again raises everyone's chance, because sessions together count.

Code: `addBackChance`, `willAddBack`, `sessionsTogether` in `js/people.js`.

## 5. Chat

The first time a chat opens, Empower suggests a session for the two of you. It picks one of the other person's groups, prefers a week they're going and a time you're free, and skips anything you're already going to. Replies are simple rules: a "yes" gets "see you there", a "when?" gets an answer, and so on. A natural Session 9 upgrade is replacing those rules with an AI model.

Code: `suggestPlan`, `reply` in `js/people.js`.

## 6. Demo tools

Me > Demo tools moves the app's clock in your browser only. "Jump to my next session" sets it to 10 minutes before your next commitment, so you can demo check-in on the spot. "Erase my data" starts over.

## 7. How the code is kept consistent

- `AGENTS.md` (and `CLAUDE.md`) tell Codex and Claude the rules, so every teammate's AI follows them.
- On every PR, GitHub runs the unit tests and `scripts/check_architecture.js`. That check fails if a page reads saved data directly, if rules touch the page or the clock, if a function is missing from `docs/mechanics.md`, or if scripts load in the wrong order.
