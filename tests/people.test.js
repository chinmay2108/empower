/* Unit tests for js/people.js against the synthetic population.
   Run from the repo root:  node --test tests/*.test.js */

const test = require("node:test");
const assert = require("node:assert/strict");
const people = require("../js/people.js");
const schedule = require("../js/schedule.js");
const GROUPS = require("../data/groups.js");
const POP = require("../data/population.js");

const at = (y, m, d, h = 0) => new Date(y, m - 1, d, h);
const NOW = at(2026, 11, 8, 12);
const RICK = { interests: ["trivia", "games", "hiking"], freeSlots: ["tue-eve", "thu-eve", "sat-am"], comfort: "nervous", createdAt: "2026-11-05T12:00:00.000Z" };

test("population is synthetic, sized, and every membership points at a real group", () => {
  assert.equal(POP.length, 500);
  const ids = new Set(GROUPS.map((g) => g.id));
  POP.forEach((p) => p.memberships.forEach((m) => assert.ok(ids.has(m.groupId))));
});

test("weekIndex counts Sunday-to-Saturday weeks from Jan 4, 2026", () => {
  assert.equal(people.weekIndex(at(2026, 1, 4)), 0);
  assert.equal(people.weekIndex(at(2026, 1, 10, 23)), 0);
  assert.equal(people.weekIndex(at(2026, 1, 11)), 1);
  assert.equal(people.weekIndex(at(2026, 11, 8)), 44);
});

test("attendance is deterministic and never before someone joined", () => {
  const p = POP.find((x) => x.memberships.length);
  const g = p.memberships[0].groupId;
  assert.equal(people.attends(p, g, 50), people.attends(p, g, 50));
  assert.equal(people.attends(p, g, p.joinedWeek - 1), false);
  assert.equal(people.attends(p, "not-a-group", 50), false);
});

test("Given a typical week, turnout per session is near 60% of the group's usual size", () => {
  GROUPS.forEach((g) => {
    let total = 0;
    for (let w = 40; w < 60; w++) {
      const day = new Date(2026, 0, 4 + w * 7 + g.weekday, 12);
      const s = schedule.upcomingSessions([g], day, 1)[0];
      total += people.attendeesOf(POP, s).length;
    }
    const avg = total / 20;
    const target = Math.max(3, Math.round(g.typicalSize * 0.6));
    assert.ok(avg > target * 0.5 && avg < target * 1.6, `${g.id} avg ${avg} vs target ${target}`);
  });
});

test("every group has regulars over the last 8 weeks", () => {
  GROUPS.forEach((g) => {
    const s = people.groupStats(POP, g.id, NOW);
    assert.ok(s.regulars >= 1, `${g.id} has no regulars`);
    assert.ok(s.people >= s.regulars);
  });
});

test("add-back chance rises with shared interests, warmth and time together, capped at 0.9", () => {
  const cold = { interests: ["x"], warmth: 0 };
  const warm = { interests: ["trivia", "games", "hiking"], warmth: 1 };
  assert.equal(people.addBackChance(cold, RICK, 1), 0.2);
  assert.ok(people.addBackChance(warm, RICK, 1) > people.addBackChance(cold, RICK, 1));
  assert.ok(people.addBackChance(warm, RICK, 3) <= 0.9);
});

test("willAddBack is stable per person and user, and differs across people", () => {
  const sample = POP.slice(0, 200);
  const a = sample.map((p) => people.willAddBack(p, RICK, 1, RICK.createdAt));
  const b = sample.map((p) => people.willAddBack(p, RICK, 1, RICK.createdAt));
  assert.deepEqual(a, b);
  const yes = a.filter(Boolean).length;
  assert.ok(yes > 20 && yes < 180, `add-back rate ${yes}/200 looks wrong`);
});

test("suggestPlan picks a future session in one of the person's groups", () => {
  const sessions = schedule.upcomingSessions(GROUPS, NOW, 14);
  const p = POP.find((x) => x.memberships.length);
  const plan = people.suggestPlan(p, RICK, GROUPS, sessions, NOW);
  assert.ok(plan);
  assert.ok(new Date(plan.session.startsAt) > NOW);
  assert.ok(p.memberships.some((m) => m.groupId === plan.group.id));
  const again = people.suggestPlan(p, RICK, GROUPS, sessions, NOW, [plan.session.id]);
  assert.notEqual(again && again.session.id, plan.session.id);
});

test("chat replies answer yes, questions and greetings, deterministically", () => {
  const p = POP[0];
  assert.match(people.reply(p, "Yes let's do it", 0), /see you|sounds good/i);
  assert.match(people.reply(p, "What time?", 0), /usual/i);
  assert.equal(people.reply(p, "hello", 1), people.reply(p, "hello", 1));
  assert.ok(people.reply(p, "random words", 2).length > 0);
});
