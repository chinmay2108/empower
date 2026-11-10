/* Integration test: the rule (logic.lastNoteFor), the data layer (store.js)
   and the page (reflect.js) run together on test data. Nobody types:
   the notes are already saved, and we only check what the page shows.
   Run from the repo root:  node --test tests/browser/ */

const test = require("node:test");
const assert = require("node:assert/strict");
const { pageUrl, PROFILE, session, openWith } = require("./helpers.js");

const DATA = {
  profile: PROFILE,
  commitments: [
    session("c1", "g01", "2026-10-29T23:00:00.000Z"), // Thu Oct 29, trivia
    session("c2", "g02", "2026-11-01T15:00:00.000Z"), // a different group
    session("c3", "g01", "2026-11-05T23:00:00.000Z"), // Thu Nov 5, trivia: to rate now
    session("c4", "g02", "2026-11-08T15:00:00.000Z")  // the other group again: to rate now
  ],
  reflections: [
    { commitmentId: "c1", enjoyed: 3, talkedToSomeone: true, wouldReturn: true, note: "<b>Ask Sam</b> about the climbing gym", createdAt: "2026-10-29T23:00:00.000Z" },
    { commitmentId: "c2", enjoyed: 2, talkedToSomeone: true, wouldReturn: true, note: "Other group note", createdAt: "2026-11-01T15:00:00.000Z" }
  ]
};

test("Rating form shows last time's note from this group only, as plain text", async () => {
  const { page, errors, close } = await openWith(DATA);
  try {
    await page.goto(pageUrl("reflect.html", "?c=c3"));
    const card = page.locator(".card", { hasText: "Last time you wrote" });

    // Scenario 1: the note and its date
    assert.equal(await card.count(), 1);
    const text = await card.innerText();
    assert.match(text, /<b>Ask Sam<\/b> about the climbing gym/);
    assert.match(text, /Thu, Oct 29/);

    // Scenario 2: the other group's note is not there
    assert.doesNotMatch(await page.locator("#reflect-root").innerText(), /Other group note/);

    // Scenario 3: the tags show as text; nothing became bold
    assert.equal(await card.locator("b").count(), 0);

    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});
