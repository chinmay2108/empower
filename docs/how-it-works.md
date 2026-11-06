# How Empower works (plain English)

A 5-minute read so anyone on the team can explain the app in class. The examples use "Rick": he likes trivia, board games and hiking, is free Tuesday and Thursday evenings and Saturday mornings, and his "this or that" answers were mixed on big vs small groups, so he starts at the Social step. The numbers come from running the real code.

## 1. How the weekly picks are chosen

Every group meets weekly, so the app first lists every session in the next 8 days. Then it scores each one for the user and shows the top 3, with at most one per group.

| Points | When |
| --- | --- |
| +3, plus 1 per shared interest | The group matches something you like |
| +4 | It's at a time you said you're free |
| -4 | It isn't |
| +3 | You've been to this group before (going back is how friendships form) |
| +2 | You're at Cozy or Social and the group has a built-in activity |
| -2 or -4 | You're at Social or Cozy and it's open mingling |
| +1 | You're at Cozy and the group is small (10 or fewer) |
| +2 | Your answers lean "doing something together" and it's an activity group, or lean "talking" and it's a talk group |

**Rick's week** (likes trivia, games, running and board games; free Monday and Thursday evenings and Sunday afternoons; computed for the week of Nov 9, 2026):

| Session | Score | Main reasons |
| --- | --- | --- |
| Thursday Trivia at Alamo Drafthouse | 13 | Likes trivia, fits a free time, an activity to focus on, worth a first try |
| Charlottesville Chess Club | 12 | Likes games, fits a free time, an activity to focus on, worth a first try |
| Monday Game Night at Starr Hill | 11 | Likes games, fits a free time, doing something together |

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

There are no real users yet, so `data/population.js` holds **500 invented people** made by `scripts/generate_population.py`. Each one has interests, free times, a comfort step, and membership in 1 to 3 groups that suit them. Each group has a few **regulars** (they come most weeks) and a long tail of occasional visitors.

**Who goes to a session** isn't stored anywhere. For each person, the app turns "person + group + week" into a number between 0 and 1. If it's below that person's attendance rate for the group, they're there. The same inputs always give the same number, so:

- last month's sessions have a stable history,
- next week's sessions have a stable "who's going",
- and nothing has to be saved.

**Thursday Trivia at Alamo Drafthouse, example:** over the last 8 weeks, 9 different Empower people came, 5 of them regulars, with about 5.5 per session. The groups are real (see `data/groups.js`); the people are synthetic.

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

## Onboarding: "this or that"

Instead of asking how nervous someone is, onboarding asks 8 quick pairs like "Building something side by side" or "A long conversation over coffee". Both sides are meant to sound equally good, so there's no right answer to pick. The answers place you on four dimensions (social energy, doing vs talking, same vs new, routine vs spontaneous). Social energy sets where you start on the comfort ladder: Cozy, Social or Open. After signup, Home asks one more pair a day, which you can skip; the answers keep sharpening your picks. Nobody is ever shown a personality label.
