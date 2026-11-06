# Mechanics: what the UI can call

The app's rules and data live in plain JavaScript files that any screen can call. The UI decides how things look; these decide what is true. If a screen needs something that isn't here, add a function here (with a test) instead of putting the rule in the page.

Every page loads, in this order: `data/groups.js`, `js/ui.js`, `js/store.js`, `js/schedule.js`, `js/logic.js`, then its own script.

## Time

| Call | Returns |
| --- | --- |
| `Empower.clock.now()` | The app's current `Date`. Always use this, never `new Date()`, so demo time travel works. |
| `Empower.clock.shiftHours(n)`, `.jumpTo(date)`, `.reset()` | Demo only: move the app clock in this browser. |

## Saved data: `Empower.store`

| Call | Returns |
| --- | --- |
| `getProfile()` / `saveProfile({ name, interests[], freeSlots[], step, traits, createdAt })` | The user's profile or `null`. `freeSlots` like `"thu-eve"`, `"sat-am"`. `step` is `"cozy"`, `"social"` or `"open"`; read it with `Empower.logic.stepOf(profile)`, which also handles older profiles that saved `comfort` instead. `traits` comes from `traitsFromAnswers`. |
| `getAnswers()` / `saveAnswer({ questionId, choice, at })` | Answers to "this or that" questions. `choice` is `"a"`, `"b"` or `"skip"`; `at` is an ISO time from `Empower.clock.now()`. Saving again replaces that question's answer. |
| `getGroups()` / `getGroup(id)` | Recurring groups from `data/groups.js`. |
| `getCommitments()` / `getCommitment(id)` | All commitments, or one. |
| `addCommitment({ sessionId, groupId, startsAt, leaveAt, travelMode })` | The saved commitment, `status: "committed"`. |
| `updateCommitment(id, changes)` | The updated commitment. Status moves to `"attended"`, `"cancelled"` or `"missed"`. |
| `getReflections()` / `addReflection({ commitmentId, enjoyed, talkedToSomeone, wouldReturn, note })` | Reflections. `enjoyed` is 1 to 3. |
| `resetAll()` | Erases this browser's data and the demo clock. |

## Sessions: `Empower.schedule`

| Call | Returns |
| --- | --- |
| `upcomingSessions(groups, fromDate, days)` | Dated sessions, soonest first. Session id is `groupId@YYYY-MM-DD`. |
| `sessionById(groups, id)` | One session, or `null`. |
| `dateKey(date)` | Local date as `"YYYY-MM-DD"`. |

## Rules: `Empower.logic` (pure, unit tested)

| Call | What it decides |
| --- | --- |
| `slotFor(date)` | The free-time slot a moment falls in, e.g. `"thu-eve"`, `"sat-am"`. |
| `scoreSession(session, group, profile, history)` | `{ score, reasons[] }` for one session (used by `rankPicks`). |
| `rankPicks(sessions, groups, profile, commitments, now, limit)` | Top picks, one per group: `[{ session, group, score, reasons }]`. |
| `explain(reasons)` | One sentence for "why this fits you". |
| `findConflict(commitments, session, groups)` | The overlapping commitment, or `null`. |
| `suggestLeaveTime(startsAt, travelMode)` | `"HH:MM"` (walk 25, bus 30, bike or drive 20 minutes before). |
| `cancellationOutcome(commitment, now)` | `"cancelled"` if 24h+ ahead, else `"missed"`. |
| `canCheckIn(commitment, group, now)` | From 30 minutes before the start to 12 hours after the end. |
| `effectiveStatus(commitment, group, now)` | Treats an unmarked commitment as `"missed"` once the check-in window closes. |
| `todaysCommitments(commitments, now)`, `nextCommitment(commitments, now)` | For Home. |
| `awaitingReflection(commitments, reflections)` | Attended sessions not rated yet. |
| `progressByGroup(commitments, groups)`, `totalHours(...)` | Sessions and hours per group, from attended sessions. |
| `showUpScore(commitments, groups, now)` | `{ attended, total }` over the last 10 resolved commitments. |

### Quiz, comfort step and daily question

Questions live in `data/questions.js` (`Empower.QUESTIONS`). Pages that use them load it after `js/people.js`. Option `"a"` leans to -1 and `"b"` to +1 on its dimension: `energy` (small and familiar vs big and lively), `style` (doing vs talking), `novelty` (same vs new), `rhythm` (routine vs spontaneous).

| Call | What it decides |
| --- | --- |
| `traitsFromAnswers(answers, questions)` | `{ energy, style, novelty, rhythm }`, each -1 to 1: the average lean of answered pairs. Skips are ignored; no answers gives 0. |
| `startingStep(traits)` | `"cozy"` if energy is -0.5 or lower, `"open"` if 0.5 or higher, else `"social"`. |
| `personaFor(traits)` | One of six hidden personas, e.g. `"cozy-doing"`. For the algorithm and logs only; never shown. |
| `stepOf(profile)` | The comfort step. Maps old `comfort` values: anxious to cozy, nervous to social, easy to open. Default `"social"`. |
| `dailyQuestion(questions, answers, now)` | The next unanswered pair, or `null` if an answer or skip was saved today or the bank is used up. |

In `scoreSession`, Cozy and Social get +2 for high structure and lose points for open mingling (Cozy also +1 for 10 people or fewer). A `style` of -0.5 or lower adds +2 for `mode: "doing"` groups; 0.5 or higher adds +2 for `mode: "talking"` groups.

### Empower score

| Call | What it decides |
| --- | --- |
| `Empower.store.getMeetups()` / `addMeetup({ personId, at, confirmed })` | Private meetups with a match, outside sessions. |
| `empowerScore(meetups, answers)` | The public score: 10 per confirmed meetup, 1 per answered pair. Skips and unconfirmed meetups don't count. |
| `canLogMeetup(meetups, personId, now)` | `false` if a meetup with that person was already logged today. |
| `Empower.people.scoreOf(person)` | A synthetic person's fixed public score (0 to 120). |
| `Empower.people.confirmsMeetup(person, profile, together, userKey)` | Whether a synthetic person confirms a meetup: yes if they're a mutual match. A real backend (E12) replaces this with the other person tapping confirm. |
| `Empower.ui.toast(text)` | A short message at the bottom of the screen with a light vibration, for small wins. |

## Observability

`Empower.log("area.what_happened", details)` at key moments. Current events include `onboarding.completed` (with `step` and `persona`), `home.daily_answered`, `person.meetup_logged`, `ui.toast`, `commit.saved`, `commit.conflict`, `prep.checked_in`, `prep.cancelled`, `reflect.saved`.

## Tests

`node --test tests/*.test.js` runs the logic tests. GitHub runs them on every PR ("App unit tests").

## People: synthetic population and matching

`data/population.js` holds **500 synthetic people** (invented by `scripts/generate_population.py`, fixed seed). They are not real users. Each has interests, free times, a comfort step, and memberships in 1 to 3 groups with a weekly attendance probability. A few per group are regulars.

| Call | Returns |
| --- | --- |
| `Empower.store.getPopulation()` / `getPerson(id)` | The synthetic people. Read-only. |
| `Empower.store.getConnections()` / `addConnection({ personId, sessionId, groupId })` | People the user added after a session. |
| `Empower.store.getMessages(personId)` / `addMessage({ personId, from, text, sessionId? })` | Chat history. `from` is `"me"`, `"them"` or `"app"`. |
| `Empower.people.hash01(text)`, `weekIndex(date)` | Building blocks: a repeatable number in [0, 1) from text; weeks since Jan 4, 2026. |
| `Empower.people.attends(person, groupId, week)` | Whether one person goes to a group that week. |
| `Empower.people.attendeesOf(population, session)` | Who was at (or is going to) a session. Same answer every time, for any week. |
| `Empower.people.groupStats(population, groupId, now)` | `{ people, regulars, avgTurnout }` over the last 8 weeks. |
| `Empower.people.sharedInterests(person, profile)` | Interests in common. |
| `Empower.people.sessionsTogether(person, commitments)` | Sessions the user attended where this person was too. |
| `Empower.people.addBackChance(person, profile, together)` / `willAddBack(...)` | Whether a person adds the user back (0.2 base, plus shared interests, their warmth, and time together, max 0.9). Deterministic per person and user. |
| `Empower.people.suggestPlan(person, profile, groups, sessions, now, excludeSessionIds)` | A session to go to together, or `null`. |
| `Empower.people.reply(person, text, turn)` | A rule-based chat reply. Session 9 (agentic UX) could swap this for a model. |

To regenerate the population: `python3 scripts/generate_population.py`.
