/* System test: drives the app in a browser the way Rick would.
   Start: two Thursday Trivia sessions and one other session he went to,
   none rated yet. He rates the first one with a note (typed with HTML),
   then opens the next trivia session and the other group's session.
   Run from the repo root:  node --test tests/browser/ */

const test = require("node:test");
const assert = require("node:assert/strict");
const { pageUrl, PROFILE, session, openWith } = require("./helpers.js");

const DATA = {
  profile: PROFILE,
  commitments: [
    session("c1", "g01", "2026-10-29T23:00:00.000Z"), // Thu Oct 29, trivia
    session("c2", "g01", "2026-11-05T23:00:00.000Z"), // Thu Nov 5, trivia
    session("c3", "g02", "2026-11-08T15:00:00.000Z")  // a different group
  ],
  reflections: []
};

async function rate(page, commitmentId, note) {
  await page.goto(pageUrl("reflect.html"));
  await page.click(`a[href="reflect.html?c=${commitmentId}"]`);
  await page.click('[data-field="enjoyed"][data-value="3"]');
  await page.click('[data-field="talkedToSomeone"][data-value="yes"]');
  await page.click('[data-field="wouldReturn"][data-value="yes"]');
  await page.fill("#note", note);
  await page.click('[data-action="save"]');
  await page.waitForSelector('[data-action="meet-skip"], .big-check');
}

test("Rick rates trivia with a note, then sees it next time at trivia but not at another group", async () => {
  const { page, errors, close } = await openWith(DATA);
  try {
    await rate(page, "c1", "<b>Ask Sam</b> about the climbing gym");

    // Next trivia session: the note is there, with its date, as plain text
    await page.goto(pageUrl("reflect.html"));
    await page.click('a[href="reflect.html?c=c2"]');
    const card = page.locator(".card", { hasText: "Last time you wrote" });
    await card.waitFor();
    const text = await card.innerText();
    assert.match(text, /<b>Ask Sam<\/b> about the climbing gym/);
    assert.match(text, /Thu, Oct 29/);
    assert.equal(await card.locator("b").count(), 0);

    // A different group: no "Last time" card
    await page.goto(pageUrl("reflect.html"));
    await page.click('a[href="reflect.html?c=c3"]');
    await page.waitForSelector('[data-action="save"]');
    assert.equal(await page.locator(".card", { hasText: "Last time you wrote" }).count(), 0);

    assert.deepEqual(errors, []);
  } finally {
    await close();
  }
});
