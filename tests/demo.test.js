/* Unit tests for js/demo.js: sample users for class demos. */

const test = require("node:test");
const assert = require("node:assert/strict");
const demo = require("../js/demo.js");
const logic = require("../js/logic.js");
const people = require("../js/people.js");
const GROUPS = require("../data/groups.js");
const POP = require("../data/population.js");
const QUESTIONS = require("../data/questions.js");

const NOW = new Date(2026, 10, 6, 12);

test("there are three sample users with different starting steps", () => {
  assert.deepEqual(demo.list().map((d) => d.key), ["maya", "rick", "priya"]);
  const steps = demo.list().map((d) => demo.build(d.key, NOW, GROUPS, POP, QUESTIONS).profile.step);
  assert.deepEqual(steps, ["cozy", "social", "open"]);
});

test("Given a sample user, Then six weeks of history show stages, tags and a score", () => {
  demo.list().forEach(({ key }) => {
    const d = demo.build(key, NOW, GROUPS, POP, QUESTIONS);
    assert.ok(d.commitments.length >= 8, key + " sessions");
    assert.ok(d.commitments.every((c) => new Date(c.startsAt) < NOW), key + " all in the past");
    assert.equal(d.commitments.filter((c) => c.status === "missed").length, 1, key + " one miss");
    assert.ok(d.connections.length >= 1, key + " has a match");
    const friend = POP.find((p) => p.id === d.connections[0].personId);
    const time = people.timeTogether(friend, d.commitments, GROUPS);
    assert.ok(people.stageRank(people.warmthStage(time, true)) >= people.stageRank("kindling"), key + " stage");
    assert.ok(people.pairTags(friend, d.commitments, GROUPS).includes("Plan makers"), key + " tag");
    assert.equal(logic.empowerScore(d.meetups, d.answers), 10 + 13, key + " score"); // 1 meetup, 8 + 5 answers
  });
});

test("build is repeatable: same inputs, same history", () => {
  assert.deepEqual(demo.build("rick", NOW, GROUPS, POP, QUESTIONS), demo.build("rick", NOW, GROUPS, POP, QUESTIONS));
});
