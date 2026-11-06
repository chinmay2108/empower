/* Checks for people's photos (data/photos.js, img/people/). */

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const PHOTOS = require("../data/photos.js");
const POP = require("../data/population.js");

test("every synthetic person has a photo, and every photo file exists", () => {
  POP.forEach((p) => {
    assert.ok(PHOTOS[p.id], p.id + " has no photo");
    assert.ok(fs.existsSync(path.join(__dirname, "..", "img", "people", PHOTOS[p.id])), PHOTOS[p.id]);
  });
});

test("no face is used twice", () => {
  const files = fs.readdirSync(path.join(__dirname, "..", "img", "people"));
  assert.equal(files.length, POP.length);
});
