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
| `getProfile()` / `saveProfile({ name, interests[], freeSlots[], comfort })` | The user's profile or `null`. `freeSlots` like `"thu-eve"`, `"sat-am"`. `comfort` is `"easy"`, `"nervous"` or `"anxious"`. |
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

## Rules: `Empower.logic` (pure, unit tested)

| Call | What it decides |
| --- | --- |
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

## Observability

`Empower.log("area.what_happened", details)` at key moments. Current events include `onboarding.completed`, `commit.saved`, `commit.conflict`, `prep.checked_in`, `prep.cancelled`, `reflect.saved`.

## Tests

`node --test tests/*.test.js` runs the logic tests. GitHub runs them on every PR ("App unit tests").
