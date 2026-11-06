/* Unit tests for js/lab.js: the Matching Lab simulation. */

const test = require("node:test");
const assert = require("node:assert/strict");
const lab = require("../js/lab.js");
const GROUPS = require("../data/groups.js");
const POP = require("../data/population.js");

const START = new Date(2026, 10, 8, 12);
const g = (id) => GROUPS.find((x) => x.id === id);
const person = { id: "t1", reliability: 0.8, interests: ["trivia", "games"], freeSlots: ["thu-eve"], step: "social", memberships: [], joinedWeek: 0 };
const trivia = { id: "g01@2026-11-12", groupId: "g01", startsAt: new Date(2026, 10, 12, 19).toISOString() };
const openMic = { id: "g11@2026-11-13", groupId: "g11", startsAt: new Date(2026, 10, 13, 20).toISOString() };

test("showChance: reliability, cut when not a free time, cut more two steps up", () => {
  assert.equal(lab.showChance(person, trivia, g("g01")), 0.8);
  assert.equal(lab.showChance(Object.assign({}, person, { freeSlots: [] }), trivia, g("g01")), 0.24);
  assert.equal(lab.showChance(Object.assign({}, person, { step: "cozy", freeSlots: ["fri-eve"] }), openMic, g("g11")), 0.32);
});

test("likeChance: interests, a repeat visit and comfort fit raise it, capped at 0.95", () => {
  assert.equal(lab.likeChance(person, g("g01"), false), 0.75); // 0.35 + 0.30 + 0.10
  assert.equal(lab.likeChance(person, g("g01"), true), 0.85);
  assert.equal(lab.likeChance(Object.assign({}, person, { step: "cozy", interests: [] }), g("g11"), false), 0.25);
});

test("simulatePerson picks one session a week and records Kindling by week", () => {
  const r = lab.simulatePerson(POP[0], "empower", START, 8, GROUPS, POP);
  assert.equal(r.commitments.length, 8);
  assert.equal(r.kindlingByWeek.length, 8);
  r.kindlingByWeek.forEach((k, i) => { if (i && r.kindlingByWeek[i - 1]) assert.ok(k); }); // never goes back down
});

test("Given 100 synthetic people for 8 weeks, Empower picks beat random on show-ups and Kindling", () => {
  const r = lab.run(POP, GROUPS, START, 8, 100);
  assert.equal(r.random.people, 100);
  assert.ok(r.empower.showUpRate > r.random.showUpRate);
  assert.ok(r.empower.kindlingAt4 > r.random.kindlingAt4);
  assert.ok(r.empower.kindlingAt4 >= r.interests.kindlingAt4);
  assert.deepEqual(lab.run(POP, GROUPS, START, 8, 20), lab.run(POP, GROUPS, START, 8, 20)); // repeatable
});
