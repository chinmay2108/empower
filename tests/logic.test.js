/* Unit tests for js/logic.js and js/schedule.js.
   Run from the repo root:  node --test tests/
   Dates use local time so results match what the browser shows. */

const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../js/logic.js");
const schedule = require("../js/schedule.js");
const GROUPS = require("../data/groups.js");

const at = (y, m, d, h = 0, min = 0) => new Date(y, m - 1, d, h, min);
const WED = at(2026, 11, 4, 12); // Wednesday Nov 4, noon
const group = (id) => GROUPS.find((g) => g.id === id);
const sessionsFrom = (now, days = 7) => schedule.upcomingSessions(GROUPS, now, days);
const commitFor = (session, status = "committed", id = "c1") => ({
  id, sessionId: session.id, groupId: session.groupId, startsAt: session.startsAt, status
});

const RICK = { interests: ["trivia", "games", "hiking"], freeSlots: ["tue-eve", "thu-eve", "sat-am"], step: "social" };

test("slotFor maps times to free-time slots", () => {
  assert.equal(logic.slotFor(at(2026, 11, 5, 19)), "thu-eve");
  assert.equal(logic.slotFor(at(2026, 11, 5, 10)), "thu-day");
  assert.equal(logic.slotFor(at(2026, 11, 7, 8)), "sat-am");
  assert.equal(logic.slotFor(at(2026, 11, 8, 16)), "sun-pm");
});

test("upcomingSessions makes one session per group meeting in the window", () => {
  const s = sessionsFrom(WED, 7);
  assert.equal(s.length, 15); // every sample group meets weekly
  assert.ok(s.some((x) => x.id === "g01@2026-11-05"));
  assert.deepEqual(s.map((x) => x.startsAt), [...s.map((x) => x.startsAt)].sort());
});

test("Given Rick's profile, top pick fits his interests and free time", () => {
  const picks = logic.rankPicks(sessionsFrom(WED), GROUPS, RICK, [], WED, 3);
  assert.equal(picks.length, 3);
  assert.equal(picks[0].group.id, "g01"); // Thursday Trivia: trivia + thu-eve + high structure
  picks.forEach((p) => assert.ok(RICK.freeSlots.includes(logic.slotFor(p.session.startsAt))));
  assert.equal(new Set(picks.map((p) => p.group.id)).size, 3);
});

test("rankPicks is deterministic", () => {
  const a = logic.rankPicks(sessionsFrom(WED), GROUPS, RICK, [], WED, 3).map((p) => p.session.id);
  const b = logic.rankPicks(sessionsFrom(WED), GROUPS, RICK, [], WED, 3).map((p) => p.session.id);
  assert.deepEqual(a, b);
});

test("rankPicks skips sessions already committed to and past sessions", () => {
  const sessions = sessionsFrom(WED);
  const trivia = sessions.find((s) => s.groupId === "g01");
  const picks = logic.rankPicks(sessions, GROUPS, RICK, [commitFor(trivia)], WED, 3);
  assert.ok(!picks.some((p) => p.session.id === trivia.id));
  const afterThu = at(2026, 11, 5, 21);
  const later = logic.rankPicks(sessions, GROUPS, RICK, [], afterThu, 3);
  later.forEach((p) => assert.ok(new Date(p.session.startsAt) > afterThu));
});

test("a user starting at Cozy is not offered open mingling over structured groups", () => {
  const cozy = { interests: ["music", "games"], freeSlots: ["fri-eve", "mon-eve"], step: "cozy" };
  const picks = logic.rankPicks(sessionsFrom(WED), GROUPS, cozy, [], WED, 1);
  assert.notEqual(picks[0].group.structure, "low");
});

test("a group the user already attended gets a boost", () => {
  const board = sessionsFrom(WED).find((s) => s.groupId === "g06");
  const fresh = logic.scoreSession(board, group("g06"), RICK, { attendedGroupIds: [] });
  const returning = logic.scoreSession(board, group("g06"), RICK, { attendedGroupIds: ["g06"] });
  assert.equal(returning.score - fresh.score, 3);
  assert.match(logic.explain(returning.reasons), /been before/);
});

test("Given a commitment, When committing to an overlapping session, Then a conflict is found", () => {
  const sessions = sessionsFrom(WED);
  const climbing = sessions.find((s) => s.groupId === "g10"); // Thu 18:00-20:00
  const trivia = sessions.find((s) => s.groupId === "g01");   // Thu 19:00-21:00
  const hike = sessions.find((s) => s.groupId === "g12");
  const existing = [commitFor(climbing)];
  assert.equal(logic.findConflict(existing, trivia, GROUPS).sessionId, climbing.id);
  assert.equal(logic.findConflict(existing, hike, GROUPS), null);
  assert.equal(logic.findConflict([commitFor(climbing, "cancelled")], trivia, GROUPS), null);
});

test("suggestLeaveTime subtracts travel time", () => {
  assert.equal(logic.suggestLeaveTime(at(2026, 11, 5, 19).toISOString(), "bus"), "18:30");
  assert.equal(logic.suggestLeaveTime(at(2026, 11, 5, 19).toISOString(), "drive"), "18:40");
});

test("cancelling 24h or more ahead is free; later counts as missed", () => {
  const c = { startsAt: at(2026, 11, 5, 19).toISOString() };
  assert.equal(logic.cancellationOutcome(c, at(2026, 11, 4, 18)), "cancelled");
  assert.equal(logic.cancellationOutcome(c, at(2026, 11, 5, 9)), "missed");
});

test("check-in opens 30 minutes before and closes 12 hours after the end", () => {
  const c = { status: "committed", startsAt: at(2026, 11, 5, 19).toISOString() };
  const g = group("g01");
  assert.equal(logic.canCheckIn(c, g, at(2026, 11, 5, 18, 0)), false);
  assert.equal(logic.canCheckIn(c, g, at(2026, 11, 5, 18, 30)), true);
  assert.equal(logic.canCheckIn(c, g, at(2026, 11, 6, 8)), true);
  assert.equal(logic.canCheckIn(c, g, at(2026, 11, 6, 10)), false);
});

test("an unmarked commitment becomes missed after the check-in window", () => {
  const c = { status: "committed", startsAt: at(2026, 11, 5, 19).toISOString() };
  assert.equal(logic.effectiveStatus(c, group("g01"), at(2026, 11, 5, 22)), "committed");
  assert.equal(logic.effectiveStatus(c, group("g01"), at(2026, 11, 6, 10)), "missed");
});

test("show-up score counts attended over attended plus missed, ignoring timely cancels", () => {
  const now = at(2026, 11, 20, 12);
  const mk = (id, day, status) => ({ id, groupId: "g01", startsAt: at(2026, 11, day, 19).toISOString(), status });
  const list = [mk("a", 5, "attended"), mk("b", 12, "attended"), mk("c", 13, "cancelled"), mk("d", 19, "committed")];
  assert.deepEqual(logic.showUpScore(list, GROUPS, now), { attended: 2, total: 3 });
  assert.deepEqual(logic.showUpScore([], GROUPS, now), { attended: 0, total: 0 });
});

test("progress sums hours per group from attended sessions only", () => {
  const list = [
    { id: "a", groupId: "g06", startsAt: "x", status: "attended" },
    { id: "b", groupId: "g06", startsAt: "y", status: "attended" },
    { id: "c", groupId: "g01", startsAt: "z", status: "missed" }
  ];
  const rows = logic.progressByGroup(list, GROUPS);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].sessions, 2);
  assert.equal(rows[0].hours, 5); // 2 x 150 minutes
  assert.equal(logic.totalHours(list, GROUPS), 5);
});

test("awaitingReflection lists attended sessions without a reflection", () => {
  const list = [
    { id: "a", startsAt: "2026-11-01", status: "attended" },
    { id: "b", startsAt: "2026-11-03", status: "attended" },
    { id: "c", startsAt: "2026-11-04", status: "committed" }
  ];
  const out = logic.awaitingReflection(list, [{ commitmentId: "a" }]);
  assert.deepEqual(out.map((c) => c.id), ["b"]);
});

test("sessionById rebuilds a session from its id", () => {
  const s = schedule.sessionById(GROUPS, "g01@2026-11-05");
  assert.equal(s.groupId, "g01");
  assert.equal(new Date(s.startsAt).getHours(), 19);
  assert.equal(schedule.sessionById(GROUPS, "nope"), null);
  assert.equal(schedule.sessionById(GROUPS, "g01@2026-11-06"), null); // trivia is Thursdays only
});

/* ---------- Quiz, comfort step and daily question ---------- */

const QUESTIONS = require("../data/questions.js");
const answer = (questionId, choice, at = WED.toISOString()) => ({ questionId, choice, at });

test("the question bank has 8 onboarding pairs, 2 per dimension, and unique ids", () => {
  const onboarding = QUESTIONS.filter((q) => q.onboarding);
  assert.equal(onboarding.length, 8);
  ["energy", "style", "novelty", "rhythm"].forEach((d) => {
    assert.equal(onboarding.filter((q) => q.dim === d).length, 2, d);
  });
  assert.equal(new Set(QUESTIONS.map((q) => q.id)).size, QUESTIONS.length);
  QUESTIONS.forEach((q) => assert.ok(q.a && q.b, q.id));
});

test("Given answers, traitsFromAnswers averages each dimension from -1 to 1 and ignores skips", () => {
  const t = logic.traitsFromAnswers([
    answer("q01", "a"), answer("q05", "a"),   // energy: both small and familiar
    answer("q02", "b"), answer("q06", "a"),   // style: one each way
    answer("q03", "skip"),                    // novelty: skipped
    answer("nope", "b")                       // unknown question
  ], QUESTIONS);
  assert.deepEqual(t, { energy: -1, style: 0, novelty: 0, rhythm: 0 });
});

test("startingStep comes from social energy: small leans Cozy, mixed Social, big Open", () => {
  assert.equal(logic.startingStep({ energy: -1 }), "cozy");
  assert.equal(logic.startingStep({ energy: 0 }), "social");
  assert.equal(logic.startingStep({ energy: 1 }), "open");
  assert.equal(logic.startingStep(null), "social");
});

test("personaFor gives one of six hidden personas", () => {
  assert.equal(logic.personaFor({ energy: -1, style: -1 }), "cozy-doing");
  assert.equal(logic.personaFor({ energy: 1, style: 1 }), "open-talking");
  assert.equal(logic.personaFor({ energy: 0, style: 0 }), "social-doing");
});

test("stepOf reads the new step and maps profiles saved before the quiz", () => {
  assert.equal(logic.stepOf({ step: "open" }), "open");
  assert.equal(logic.stepOf({ comfort: "anxious" }), "cozy");
  assert.equal(logic.stepOf({ comfort: "nervous" }), "social");
  assert.equal(logic.stepOf({ comfort: "easy" }), "open");
  assert.equal(logic.stepOf(null), "social");
});

test("Given someone who likes doing things together, Then activity groups score higher than talk groups", () => {
  const sessions = sessionsFrom(WED);
  const doer = { interests: [], freeSlots: [], step: "open", traits: { style: -1 } };
  const talker = { interests: [], freeSlots: [], step: "open", traits: { style: 1 } };
  const trivia = sessions.find((s) => s.groupId === "g01");   // doing
  const potluck = sessions.find((s) => s.groupId === "g14");  // talking
  const none = { attendedGroupIds: [] };
  assert.equal(logic.scoreSession(trivia, group("g01"), doer, none).score - logic.scoreSession(trivia, group("g01"), talker, none).score, 2);
  assert.equal(logic.scoreSession(potluck, group("g14"), talker, none).score - logic.scoreSession(potluck, group("g14"), doer, none).score, 2);
});

test("Given onboarding is done, dailyQuestion asks the next pair once a day until the bank runs out", () => {
  const onboarding = QUESTIONS.filter((q) => q.onboarding).map((q) => answer(q.id, "a"));
  // Same day as onboarding: nothing more today.
  assert.equal(logic.dailyQuestion(QUESTIONS, onboarding, at(2026, 11, 4, 20)), null);
  // Next day: the first daily pair.
  const thu = at(2026, 11, 5, 9);
  assert.equal(logic.dailyQuestion(QUESTIONS, onboarding, thu).id, "q09");
  // Skipping counts for today and moves on to the next pair tomorrow.
  const skipped = onboarding.concat([answer("q09", "skip", thu.toISOString())]);
  assert.equal(logic.dailyQuestion(QUESTIONS, skipped, at(2026, 11, 5, 21)), null);
  assert.equal(logic.dailyQuestion(QUESTIONS, skipped, at(2026, 11, 6, 9)).id, "q10");
  // Bank used up: no more questions.
  const all = QUESTIONS.map((q) => answer(q.id, "b"));
  assert.equal(logic.dailyQuestion(QUESTIONS, all, at(2026, 11, 9, 9)), null);
});

/* ---------- Empower score ---------- */

test("empowerScore: 10 per confirmed meetup, 1 per answered pair, skips and unconfirmed meetups don't count", () => {
  const meetups = [{ personId: "u001", at: WED.toISOString(), confirmed: true },
    { personId: "u002", at: WED.toISOString(), confirmed: false }];
  const answers = [answer("q01", "a"), answer("q02", "b"), answer("q09", "skip")];
  assert.equal(logic.empowerScore(meetups, answers), 12);
  assert.equal(logic.empowerScore([], []), 0);
});

test("Given a meetup logged today with someone, canLogMeetup blocks a second one until tomorrow", () => {
  const meetups = [{ personId: "u001", at: at(2026, 11, 4, 10).toISOString(), confirmed: true }];
  assert.equal(logic.canLogMeetup(meetups, "u001", at(2026, 11, 4, 22)), false);
  assert.equal(logic.canLogMeetup(meetups, "u002", at(2026, 11, 4, 22)), true);
  assert.equal(logic.canLogMeetup(meetups, "u001", at(2026, 11, 5, 9)), true);
});

/* ---------- Comfort ladder ---------- */

test("groupLevel: Cozy is small and structured, Open is open mingling or big groups", () => {
  assert.equal(logic.groupLevel(group("g01")), "cozy");    // trivia: high, 8
  assert.equal(logic.groupLevel(group("g06")), "social");  // board games: high, 14
  assert.equal(logic.groupLevel(group("g02")), "social");  // run club: medium, 15
  assert.equal(logic.groupLevel(group("g11")), "open");    // open mic: low, 25
});

test("Given a user at Cozy, Then picks skip groups two steps up and mark down groups one step up", () => {
  const cozy = { interests: ["music", "games", "trivia"], freeSlots: ["mon-eve", "thu-eve", "fri-eve"], step: "cozy" };
  const picks = logic.rankPicks(sessionsFrom(WED), GROUPS, cozy, [], WED, 15);
  assert.ok(!picks.some((p) => logic.groupLevel(p.group) === "open"));
  const board = sessionsFrom(WED).find((s) => s.groupId === "g06");
  const atCozy = logic.scoreSession(board, group("g06"), cozy, { attendedGroupIds: [] }).score;
  const atSocial = logic.scoreSession(board, group("g06"), Object.assign({}, cozy, { step: "social" }), { attendedGroupIds: [] }).score;
  assert.equal(atSocial - atCozy, 3);
});

test("Given 3 attended sessions rated Good or Great since the last change, stepUpDue moves up one step", () => {
  const cs = [1, 2, 3, 4].map((i) => ({ id: "c" + i, status: "attended", startsAt: at(2026, 10, i * 7, 19).toISOString() }));
  const rated = (ids, enjoyed) => ids.map((id) => ({ commitmentId: id, enjoyed }));
  assert.equal(logic.stepUpDue({ step: "cozy" }, cs, rated(["c1", "c2"], 3)), null);
  assert.equal(logic.stepUpDue({ step: "cozy" }, cs, rated(["c1", "c2", "c3"], 2)), "social");
  assert.equal(logic.stepUpDue({ step: "cozy" }, cs, rated(["c1", "c2", "c3"], 1)), null); // "Meh" doesn't count
  // Only sessions after the step last changed count.
  const changed = { step: "social", stepChangedAt: at(2026, 10, 15).toISOString() };
  assert.equal(logic.stepUpDue(changed, cs, rated(["c1", "c2", "c3", "c4"], 3)), null);
  assert.equal(logic.stepUpDue({ step: "open" }, cs, rated(["c1", "c2", "c3"], 3)), null);
});

test("stepDown moves one step down and stops at Cozy", () => {
  assert.equal(logic.stepDown("open"), "social");
  assert.equal(logic.stepDown("social"), "cozy");
  assert.equal(logic.stepDown("cozy"), "cozy");
});

/* ---------- Say vs do: "Still free?" ---------- */

const missedThu = (day, extra = {}) => Object.assign({ id: "m" + day, groupId: "g01", startsAt: at(2026, 10, day, 19).toISOString(), status: "missed" }, extra);
const SAT = at(2026, 10, 31, 12);
const THU_FAN = { freeSlots: ["thu-eve", "sat-am"] };

test("Given 2 missed Thursday sessions in 4 weeks, Then we ask about Thursday evenings", () => {
  assert.deepEqual(logic.slotsToCheck(THU_FAN, [missedThu(22)], GROUPS, SAT), []);
  assert.deepEqual(logic.slotsToCheck(THU_FAN, [missedThu(22), missedThu(29)], GROUPS, SAT), ["thu-eve"]);
});

test("Early cancellations and misses older than 4 weeks don't count; unmarked past sessions do", () => {
  assert.deepEqual(logic.slotsToCheck(THU_FAN, [missedThu(22), missedThu(29, { status: "cancelled" })], GROUPS, SAT), []);
  assert.deepEqual(logic.slotsToCheck(THU_FAN, [missedThu(1), missedThu(29)], GROUPS, SAT), []);
  assert.deepEqual(logic.slotsToCheck(THU_FAN, [missedThu(22), missedThu(29, { status: "committed" })], GROUPS, SAT), ["thu-eve"]);
});

test("Yes keeps the slot and restarts the count; No removes it; we ask again after 2 new misses", () => {
  const twoMisses = [missedThu(22), missedThu(29)];
  const yes = logic.answerSlotCheck(THU_FAN, "thu-eve", true, SAT);
  assert.deepEqual(yes.freeSlots, ["thu-eve", "sat-am"]);
  assert.deepEqual(logic.slotsToCheck(yes, twoMisses, GROUPS, SAT), []);
  const later = twoMisses.concat([{ id: "n1", groupId: "g01", startsAt: at(2026, 11, 5, 19).toISOString(), status: "missed" },
    { id: "n2", groupId: "g01", startsAt: at(2026, 11, 12, 19).toISOString(), status: "missed" }]);
  assert.deepEqual(logic.slotsToCheck(yes, later, GROUPS, at(2026, 11, 14, 12)), ["thu-eve"]);
  const no = logic.answerSlotCheck(THU_FAN, "thu-eve", false, SAT);
  assert.deepEqual(no.freeSlots, ["sat-am"]);
  assert.deepEqual(THU_FAN.freeSlots, ["thu-eve", "sat-am"]); // original not changed
});

test("Until they answer, sessions in a slot we're asking about score 3 lower", () => {
  const rick = Object.assign({}, RICK);
  const thu = at(2026, 11, 2, 12); // Monday; misses on Oct 22 and 29
  const sessions = schedule.upcomingSessions(GROUPS, thu, 7);
  const triviaWith = logic.rankPicks(sessions, GROUPS, rick, [missedThu(22), missedThu(29)], thu, 15).find((p) => p.group.id === "g01");
  const triviaWithout = logic.rankPicks(sessions, GROUPS, rick, [], thu, 15).find((p) => p.group.id === "g01");
  assert.equal(triviaWithout.score - triviaWith.score, 3);
});
