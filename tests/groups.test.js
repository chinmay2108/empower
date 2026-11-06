/* groups.test.js: every seed group is a real, checkable weekly group with valid fields. */
const test = require("node:test");
const assert = require("node:assert");
const GROUPS = require("../data/groups.js");

test("Given the seed groups, Then ids are unique and every field the rules read is valid", () => {
  const ids = new Set();
  GROUPS.forEach((g) => {
    assert.ok(!ids.has(g.id), "duplicate id " + g.id);
    ids.add(g.id);
    assert.ok(Number.isInteger(g.weekday) && g.weekday >= 0 && g.weekday <= 6, g.id + " weekday");
    assert.match(g.time, /^([01]\d|2[0-3]):[0-5]\d$/, g.id + " time");
    assert.ok(g.durationMin > 0, g.id + " durationMin");
    assert.ok(["high", "medium", "low"].includes(g.structure), g.id + " structure");
    assert.ok(["doing", "talking"].includes(g.mode), g.id + " mode");
    assert.ok(g.typicalSize > 0, g.id + " typicalSize");
    assert.ok(Array.isArray(g.interests) && g.interests.length > 0, g.id + " interests");
    ["name", "category", "venue", "description"].forEach((k) => assert.ok(g[k], g.id + " " + k));
  });
});

test("Given the seed groups, Then each one is real: a public https source and the date someone checked it", () => {
  GROUPS.forEach((g) => {
    assert.match(g.source, /^https:\/\//, g.id + " source");
    assert.match(g.checked, /^\d{4}-\d{2}-\d{2}$/, g.id + " checked");
    assert.equal(typeof g.verify, "string", g.id + " verify");
    assert.ok(!/sample/i.test(g.venue), g.id + " still has a sample venue");
  });
});
