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
| `addCommitment({ sessionId, groupId, startsAt, leaveAt, travelMode, withPersonId? })` | The saved commitment, `status: "committed"`. `withPersonId` is set when it was made together from chat (`commit.html?session=...&with=u123`). |
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
| `scoreSession(session, group, profile, history)` | Picks v2 ("Glad you went", PRD section 4): `{ score, reasons[] }`, reasons sorted by points. Free time +4/-4, still-free check -3, been before +3, would go back +2 / probably not -4, people you've met going +1 each (+2 at Kindling or warmer, max +5), interests +2 plus 1 per shared (max +4), one step up -3, comfort-step structure points, first try +1 while under 2 regular groups, quiz style +2, novelty +1, rhythm +1. |
| `pitch(session, group, profile, history, used)` | `used` (optional array) collects phrasings already on the page so three picks never repeat one.  The line under a pick on This week, in a friend's voice: a personal hook (who's going, "last time you said you'd be back", how often they've been, or new to them) plus why it's worth it (habit forming, or the group's description). Several phrasings per situation, picked by a hash of the user and session, so lines vary week to week but not on refresh. |
| `historyFor(profile, commitments, reflections, groups, now, familiarBySession)` | The `history` scoreSession needs: attended groups and slots, visits per group (`visitsByGroup`), regular group count, latest "would go back" per group, hidden groups ("probably not" twice), slots to check, familiar faces. |
| `rankPicks(sessions, groups, profile, commitments, now, limit, extras)` | Top picks, one per group: `[{ session, group, score, reasons }]`. Skips hidden groups and groups 2+ steps above the user. `extras`: `{ reflections, familiarBySession }`. |
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

### Say vs do: "Still free Thursday evenings?"

| Call | What it decides |
| --- | --- |
| `slotsToCheck(profile, commitments, groups, now)` | Free slots with 2 or more misses in the last 4 weeks since the user last said "still free" (`profile.slotConfirmedAt`). Early cancellations don't count. Asked every time it happens again. Until answered, `rankPicks` takes 3 points off sessions in those slots. |
| `answerSlotCheck(profile, slot, stillFree, now)` | A new profile: yes restarts the count for that slot; no removes the slot from `freeSlots`. |

### Comfort ladder

| Call | What it decides |
| --- | --- |
| `groupLevel(group)` | `"cozy"` (high structure, 10 or fewer), `"social"` (not open mingling, 15 or fewer) or `"open"`. |
| `levelGap(group, step)` | Steps a group sits above the user's step. `rankPicks` drops groups 2 or more above; `scoreSession` takes 3 points off groups 1 above. |
| `stepUpDue(profile, commitments, reflections)` | The next step once there are 3 attended sessions rated Good or Great since `profile.stepChangedAt`; else `null`. The app never moves anyone down. |
| `stepDown(step)` | One step down (the user's choice in Me), stopping at `"cozy"`. |

### Empower score

| Call | What it decides |
| --- | --- |
| `Empower.store.getMeetups()` / `addMeetup({ personId, at, confirmed })` | Private meetups with a match, outside sessions. |
| `empowerScore(meetups, answers)` | The public score: 10 per confirmed meetup, 1 per answered pair. Skips and unconfirmed meetups don't count. |
| `emberLevel(score)` | How the score's ember looks: `{ level, name, next }`; spark 0-9, warm 10-29, glow 30-59, blaze 60+. |
| `scoreParts(meetups, answers)` | `{ meetups, answers }` counted in the score, for "3 meetups · 9 answers". |
| `Empower.ui.ember(score, size)` | The score as a flame plus the number; the flame warms with the level. |
| `Empower.ui.avatar(person, size)` | The person's photo from `data/photos.js` (`Empower.PHOTOS`, id to file in `img/people/`), or their initials. |
| `canLogMeetup(meetups, personId, now)` | `false` if a meetup with that person was already logged today. |
| `Empower.people.scoreOf(person)` | A synthetic person's fixed public score (0 to 120). |
| `Empower.people.confirmsMeetup(person, profile, together, userKey)` | Whether a synthetic person confirms a meetup: yes if they're a mutual match. A real backend (E12) replaces this with the other person tapping confirm. |
| `Empower.ui.toast(text)` | A short message at the bottom of the screen with a light vibration, for small wins. |

## Observability

`Empower.log("area.what_happened", details)` at key moments. Current events include `onboarding.completed` (with `step` and `persona`), `home.daily_answered`, `person.meetup_logged`, `reflect.stage_up`, `reflect.step_up`, `me.stepped_down`, `home.slot_checked`, `me.persona_loaded`, `events.swiped_right`, `events.swiped_left`, `browse.viewed`, `lab.ran`, `prep.intro_shown`, `thread.viewed`, `thread.posted`, `chat.voice_sent`, `chat.voice_played`, `ui.toast`, `commit.saved`, `commit.conflict`, `prep.checked_in`, `prep.cancelled`, `reflect.saved`.

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
| `Empower.people.replyToVoice(person, turn)` | What a synthetic person says back to a voice note; warmer people sound warmer. |
| `Empower.people.introFor(population, session, profile, connections)` | At most one intro per session (E9): a regular there (4+ of the last 8 weeks) who's going, shares an interest, and isn't added yet. `{ person, shared[] }` or `null`. Shown on the day-of plan. |
| `Empower.people.familiarFaces(population, commitments, connections, minSessions)` | People you keep seeing but haven't added: `[{ person, sessions, last }]` (`last` = latest commitment together, to add them from), 3+ sessions together by default, top 5. Shown on People as "Familiar faces". |
| `Empower.people.lastSeenTogether(person, commitments)` / `needsNudge(person, commitments, now)` | Latest session together; `true` once it's been 3 weeks. Stages never cool down; People shows a nudge instead. |
| `Empower.people.warmGoing(population, session, connections, commitments, groups, profile)` | Matches at Kindling or warmer going to a session, for prep ("Emeka will be there"). |
| `Empower.people.familiarGoing(population, sessions, connections, commitments, groups, profile)` | `{ sessionId: { count, warm, firstName } }`: people the user has met who are going; `warm` = matches at Kindling or warmer. |
| `Empower.people.timeTogether(person, commitments, groups)` | `{ sessions, hours, plans, weekendSessions, byGroup }` with one person. Sessions you both attended count; a commitment made together from chat (`withPersonId`) counts as both there. |
| `Empower.people.warmthStage(time, matched)` | `"spark"` (matched), `"kindling"` (3 sessions), `"warm"` (10 hours and a plan made together), `"glow"` (50 hours), `"bonfire"` (90 hours), or `"none"`. Unmatched people stop at kindling. |
| `Empower.people.stageRank(stage)` | Position of a stage, to check whether it went up. |
| `Empower.people.pairTags(person, commitments, groups)` | Shared-history tags: `"<Group> regulars"`, `"First-timers"`, `"Weekend crew"`, `"Plan makers"`. Shown only to the pair. |

To regenerate the population: `python3 scripts/generate_population.py`.

## Demo: sample users

`js/demo.js` (pure, unit tested) builds six weeks of made-up history so a class demo shows stages, tags, the score and the ladder right away. Me loads it after `data/questions.js`.

| Call | Returns |
| --- | --- |
| `Empower.demo.list()` | `[{ key, label }]`: `maya` (Cozy, hands busy), `rick` (Social, a bit of everything), `priya` (Open, big crowds and good talks). |
| `Empower.demo.build(key, now, groups, population, questions)` | `{ profile, answers, commitments, reflections, connections, meetups, messages }` for six weeks before `now`. Me > Demo tools erases this browser's data and saves these through `Empower.store`. |

## Matching Lab (E8)

`js/lab.js` (pure, unit tested) simulates the synthetic population for a number of weeks under three strategies: `random`, `interests` (most shared interests) and `empower` (`rankPicks`). Each week one session is picked per person; a behavior model written at the top of `js/lab.js` decides if they go and if they liked it. The page is `pages/lab.html` (linked from Me > Demo tools).

| Call | Returns |
| --- | --- |
| `Empower.lab.strategies` | `["random", "interests", "empower"]`. |
| `Empower.lab.showChance(person, session, group)` | The model's chance they go: reliability, x0.3 outside their free times, x0.7 one comfort step up, x0.4 two or more. |
| `Empower.lab.likeChance(person, group, beenBefore)` | The model's chance they rate it Good or Great (0.05 to 0.95). |
| `Empower.lab.simulatePerson(person, strategy, start, weeks, groups, population)` | `{ commitments, reflections, kindlingByWeek[] }` for one person. |
| `Empower.lab.run(population, groups, start, weeks, limit)` | Per strategy: `{ people, committed, showUpRate, likedRate, returnRate, kindlingAt4, kindlingAt8 }`. Deterministic. |

## Session threads (E16)

A thread per session for everyone who went, open for 7 days after it ends. Text only; photos wait for a real backend (E12). Page: `pages/thread.html?c=<commitment id>`, linked from check-in and from a past session's plan.

| Call | Returns |
| --- | --- |
| `Empower.logic.threadOpen(commitment, group, now)` | `"open"` from check-in until 7 days after the session ends, then `"closed"`; `"locked"` if not checked in. |
| `Empower.people.threadSeed(population, session, groupDurationMin)` | Synthetic posts from 2 or 3 people who were there: `[{ personId, name, text, at }]`. Same session, same posts. |
| `Empower.store.getThreadPosts(sessionId)` / `addThreadPost({ sessionId, from, text, at })` | The user's posts and replies. `from` is `"me"` or a person id. |

## Chat screens and voice notes

| Call | Returns |
| --- | --- |
| `Empower.ui.composer(placeholder, onSend, onVoice)` | The message box pinned to the bottom of chat and thread screens. `onSend(text)`. With `onVoice`, an empty box shows a mic: tap to record up to 60 seconds, then Send or Cancel; `onVoice({ audio, seconds })` gets the note as a `data:audio/...` URL. Needs https or localhost and microphone permission. |
| `Empower.ui.canRecord()` | Whether this browser can record voice notes here. |
| `Empower.ui.voiceNote(src, seconds)` | A playable voice-note bubble (play, progress, length). Only `data:audio/` URLs are accepted. |
| `Empower.ui.chatTime(iso)`, `Empower.ui.scrollToLatest()` | "6:31 PM" for bubbles; keep the newest message in view. |

Voice notes are saved in this browser with the message (`audio`, `seconds`). `addMessage` and `addThreadPost` return `null` when storage is full, so the page can say so. A minute is roughly 100 KB.

### This week: swipe to decide

This week shows one pick at a time as a card: swipe right (or tap the check) to commit, left (or the cross) for the next best. Up to 3 a week; after 3 passes the user lands on `pages/browse.html`, the full list.

| Call | What it decides |
| --- | --- |
| `passesThisWeek(passes, now)` | Passes from the last 7 days. |
| `swipesLeft(passes, now)` | Picks left to see this week: 3 minus passes this week, never below 0. |
| `Empower.store.getPasses()` / `addPass({ sessionId, groupId, at })` | Picks swiped left. `rankPicks` skips their groups via `extras.passedGroupIds`. |

