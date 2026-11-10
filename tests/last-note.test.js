/* Unit test for logic.lastNoteFor (Saumya's story: "Last time you wrote").
   Only the rule runs: no page, no browser, no localStorage.
   Run from the repo root:  node --test tests/ */

const test = require("node:test");
const assert = require("node:assert/strict");
const logic = require("../js/logic.js");

// Two Thursday Trivia sessions (g01) and one at another group (g02).
const triviaOct22 = { id: "c1", groupId: "g01", startsAt: "2026-10-22T23:00:00.000Z", status: "attended" };
const triviaOct29 = { id: "c2", groupId: "g01", startsAt: "2026-10-29T23:00:00.000Z", status: "attended" };
const otherGroup = { id: "c3", groupId: "g02", startsAt: "2026-11-01T15:00:00.000Z", status: "attended" };
const triviaNov5 = { id: "c4", groupId: "g01", startsAt: "2026-11-05T23:00:00.000Z", status: "attended" };
const commitments = [triviaOct22, triviaOct29, otherGroup, triviaNov5];
const note = (commitmentId, text) => ({ commitmentId, enjoyed: 3, talkedToSomeone: true, wouldReturn: true, note: text });

test("Given notes at this group, When I rate the next session, Then I get the most recent one with its date", () => {
  const reflections = [note("c1", "Older note"), note("c2", "Ask Sam about the climbing gym")];
  assert.deepEqual(logic.lastNoteFor(commitments, reflections, triviaNov5), {
    note: "Ask Sam about the climbing gym", startsAt: "2026-10-29T23:00:00.000Z"
  });
});

test("Given my only note is at a different group, When I rate this group, Then there is no note", () => {
  const reflections = [note("c3", "Note from the other group")];
  assert.equal(logic.lastNoteFor(commitments, reflections, triviaNov5), null);
});

test("Given the newest session at this group has an empty note, Then the last real note is used", () => {
  const reflections = [note("c1", "Older note"), note("c2", "")];
  assert.equal(logic.lastNoteFor(commitments, reflections, triviaNov5).note, "Older note");
});

test("Given a note on this same session, Then it is not shown as 'last time'", () => {
  const reflections = [note("c4", "This session's own note")];
  assert.equal(logic.lastNoteFor(commitments, reflections, triviaNov5), null);
});
