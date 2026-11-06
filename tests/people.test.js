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
const RICK = { interests: ["trivia", "games", "hiking"], freeSlots: ["tue-eve", "thu-eve", "sat-am"], step: "social", createdAt: "2026-11-05T12:00:00.000Z" };

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

test("scoreOf gives each synthetic person a fixed public score between 0 and 120", () => {
  const pop = require("../data/population.js");
  pop.slice(0, 50).forEach((p) => {
    const s = people.scoreOf(p);
    assert.equal(s, people.scoreOf(p));
    assert.ok(s >= 0 && s <= 120, p.id + " " + s);
  });
});

test("confirmsMeetup: synthetic people confirm only if they're a mutual match", () => {
  const pop = require("../data/population.js");
  pop.slice(0, 30).forEach((p) => {
    assert.equal(people.confirmsMeetup(p, RICK, 2, RICK.createdAt), people.willAddBack(p, RICK, 2, RICK.createdAt));
  });
});

/* ---------- Warmth stages and tags ---------- */

const trivia = (day, extra = {}) => Object.assign({ id: "c" + day, groupId: "g01", startsAt: at(2026, 11, day, 19).toISOString(), status: "attended" }, extra);
const nobody = { id: "zz1", memberships: [], joinedWeek: 0 }; // never at any group on their own

test("timeTogether counts plans made together as both there, with hours from session length", () => {
  const cs = [trivia(5, { withPersonId: "zz1" }), trivia(12, { withPersonId: "zz1" }), trivia(19)];
  const t = people.timeTogether(nobody, cs, GROUPS);
  assert.equal(t.sessions, 2);
  assert.equal(t.hours, 4);          // trivia is 120 minutes
  assert.equal(t.plans, 2);
  assert.deepEqual(t.byGroup, { g01: 2 });
});

test("warmthStage: Spark when matched, Kindling at 3 sessions, Warm at 10 hours plus a plan, Glow 50h, Bonfire 90h", () => {
  assert.equal(people.warmthStage({ sessions: 1, hours: 2, plans: 0 }, true), "spark");
  assert.equal(people.warmthStage({ sessions: 3, hours: 6, plans: 0 }, true), "kindling");
  assert.equal(people.warmthStage({ sessions: 5, hours: 10, plans: 0 }, true), "kindling"); // no plan yet
  assert.equal(people.warmthStage({ sessions: 5, hours: 10, plans: 1 }, true), "warm");
  assert.equal(people.warmthStage({ sessions: 25, hours: 50, plans: 0 }, true), "glow");
  assert.equal(people.warmthStage({ sessions: 45, hours: 90, plans: 0 }, true), "bonfire");
});

test("Given someone you keep seeing but haven't matched, Then they stop at Kindling", () => {
  assert.equal(people.warmthStage({ sessions: 2, hours: 4, plans: 0 }, false), "none");
  assert.equal(people.warmthStage({ sessions: 40, hours: 90, plans: 2 }, false), "kindling");
  assert.ok(people.stageRank("warm") > people.stageRank("kindling"));
});

test("pairTags: group regulars at 4 sessions, Weekend crew at 3 weekend sessions, Plan makers after a plan", () => {
  const cs = [5, 12, 19, 26].map((d) => trivia(d, { withPersonId: "zz1" }));
  assert.deepEqual(people.pairTags(nobody, cs, GROUPS), ["Thursday Trivia Crew regulars", "Plan makers"]);
  const runs = [7, 14, 21].map((d) => ({ id: "r" + d, groupId: "g02", startsAt: at(2026, 11, d, 8).toISOString(), status: "attended", withPersonId: "zz1" }));
  assert.ok(people.pairTags(nobody, runs, GROUPS).includes("Weekend crew"));
  assert.deepEqual(people.pairTags(nobody, [trivia(5)], GROUPS), []);
});

test("First-timers: they were at your first session of a group, and it was their first time too", () => {
  // Find a synthetic trivia member and the first week they went.
  const p = POP.find((x) => x.memberships.some((m) => m.groupId === "g01" && m.p > 0.3));
  let first = p.joinedWeek;
  while (!people.attends(p, "g01", first)) first += 1;
  const thursday = new Date(2026, 0, 4 + first * 7 + 4, 19);
  const c = { id: "f1", groupId: "g01", startsAt: thursday.toISOString(), status: "attended" };
  assert.ok(people.pairTags(p, [c], GROUPS).includes("First-timers"));
  // Their second time there is not a first time.
  let second = first + 1;
  while (!people.attends(p, "g01", second)) second += 1;
  const later = { id: "f2", groupId: "g01", startsAt: new Date(2026, 0, 4 + second * 7 + 4, 19).toISOString(), status: "attended" };
  assert.ok(!people.pairTags(p, [later], GROUPS).includes("First-timers"));
});

test("familiarGoing counts only people the user has met who are going to each session", () => {
  const sessions = schedule.upcomingSessions(GROUPS, NOW, 7);
  const s = sessions.find((x) => people.attendeesOf(POP, x).length >= 2);
  const going = people.attendeesOf(POP, s);
  const out = people.familiarGoing(POP, sessions, [{ personId: going[0].id }, { personId: "nobody" }], [], GROUPS, RICK);
  assert.equal(out[s.id].count, 1);
  assert.equal(out[s.id].firstName, going[0].name.split(" ")[0]);
  assert.equal(out[s.id].warm, 0); // no time together yet
  assert.deepEqual(people.familiarGoing(POP, sessions, [], [], GROUPS, RICK), {});
});
