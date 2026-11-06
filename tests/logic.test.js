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

const RICK = { interests: ["trivia", "games", "hiking"], freeSlots: ["tue-eve", "thu-eve", "sat-am"], comfort: "nervous" };

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

test("an anxious user is not offered open mingling over structured groups", () => {
  const anxious = { interests: ["music", "games"], freeSlots: ["fri-eve", "mon-eve"], comfort: "anxious" };
  const picks = logic.rankPicks(sessionsFrom(WED), GROUPS, anxious, [], WED, 1);
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
