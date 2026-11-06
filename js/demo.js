/* ==========================================================================
   demo.js: sample users for class demos (SYNTHETIC)

   Empower.demo.build(key, now, groups, population, questions) returns six
   weeks of made-up history for one sample user, so warmth stages, tags, the
   Empower score and the comfort ladder show up right away. It is pure: it
   only returns data. Me > Demo tools saves it through Empower.store.

   Each sample user answers the quiz differently, so their picks differ:
     maya   small groups, doing things side by side, favorites, routine
     rick   mixed crowds, doing things side by side, new things, routine
     priya  big lively crowds, talking, new things, spontaneous
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.demo = (function () {
  var logic = Empower.logic || (typeof require !== "undefined" ? require("./logic.js") : null);
  var schedule = Empower.schedule || (typeof require !== "undefined" ? require("./schedule.js") : null);
  var people = Empower.people || (typeof require !== "undefined" ? require("./people.js") : null);
  var DAY = 86400000;

  /* leans: the answer ("a" or "b") they give for each dimension, first and second question. */
  var PERSONAS = {
    maya: {
      name: "Maya", label: "Maya: small groups, hands busy",
      interests: ["dancing", "music", "volunteering", "community"], freeSlots: ["wed-eve", "sat-am"],
      groupIds: ["g04", "g09"], leans: { energy: "aa", style: "aa", novelty: "aa", rhythm: "aa" }
    },
    rick: {
      name: "Rick", label: "Rick: a bit of everything",
      interests: ["trivia", "games", "running", "board games"], freeSlots: ["thu-eve", "mon-eve", "sun-pm"],
      groupIds: ["g01", "g12"], leans: { energy: "ab", style: "aa", novelty: "bb", rhythm: "aa" }
    },
    priya: {
      name: "Priya", label: "Priya: big crowds, good talks",
      interests: ["music", "comedy", "food", "performance"], freeSlots: ["mon-eve", "wed-eve", "sat-am"],
      groupIds: ["g11", "g08", "g07"], leans: { energy: "bb", style: "bb", novelty: "bb", rhythm: "bb" }
    }
  };

  /* list(): [{ key, label }] for the Demo tools buttons. */
  function list() {
    return Object.keys(PERSONAS).map(function (k) { return { key: k, label: PERSONAS[k].label }; });
  }

  /*
   * build(key, now, groups, population, questions)
   * Returns { profile, answers[], commitments[], reflections[],
   * connections[], meetups[], messages[] } for six weeks before now:
   *   - quiz answers on day one, plus five daily answers
   *   - every session of their groups attended, except one missed
   *   - each attended session rated (the main group Great, others Good)
   *   - the two people they spent most time with added (and, if mutual,
   *     matched), one plan made together from chat, one confirmed meetup
   */
  function build(key, now, groups, population, questions) {
    var p = PERSONAS[key];
    var nowMs = new Date(now).getTime();
    var created = new Date(nowMs - 43 * DAY);
    var seen = {};

    var answers = [];
    questions.filter(function (q) { return q.onboarding; }).forEach(function (q) {
      var i = seen[q.dim] || 0;
      seen[q.dim] = i + 1;
      answers.push({ questionId: q.id, choice: p.leans[q.dim].charAt(i % 2), at: created.toISOString() });
    });
    questions.filter(function (q) { return !q.onboarding; }).slice(0, 5).forEach(function (q, i) {
      answers.push({ questionId: q.id, choice: p.leans[q.dim].charAt(0), at: new Date(created.getTime() + (i + 1) * DAY).toISOString() });
    });

    var traits = logic.traitsFromAnswers(answers, questions);
    var profile = {
      name: p.name, interests: p.interests.slice(), freeSlots: p.freeSlots.slice(),
      step: logic.startingStep(traits), traits: traits, createdAt: created.toISOString()
    };

    // Every session of their groups in the six weeks, ended at least 3 hours ago.
    var sessions = schedule.upcomingSessions(groups, created, 42).filter(function (s) {
      return p.groupIds.indexOf(s.groupId) !== -1 && new Date(s.startsAt).getTime() < nowMs - 3 * 3600000;
    });
    var missedIndex = sessions.length > 4 ? 3 : -1;
    var commitments = sessions.map(function (s, i) {
      return {
        id: "demo-c" + i, sessionId: s.id, groupId: s.groupId, startsAt: s.startsAt,
        status: i === missedIndex ? "missed" : "attended", createdAt: created.toISOString()
      };
    });
    var reflections = commitments.filter(function (c) { return c.status === "attended"; }).map(function (c) {
      return { id: "demo-r" + c.id, commitmentId: c.id, enjoyed: c.groupId === p.groupIds[0] ? 3 : 2,
        talkedToSomeone: true, wouldReturn: true, note: "", createdAt: c.startsAt };
    });

    // The two people they spent most time with, met at their main group.
    var main = p.groupIds[0];
    var candidates = population.filter(function (x) {
      return x.memberships.some(function (m) { return m.groupId === main; });
    }).map(function (x) {
      return { person: x, together: people.sessionsTogether(x, commitments) };
    }).filter(function (x) { return x.together > 0; })
      .sort(function (a, b) { return b.together - a.together || (a.person.id < b.person.id ? -1 : 1); });
    var picked = candidates.filter(function (x) {
      return people.willAddBack(x.person, profile, x.together, profile.createdAt);
    }).slice(0, 2);
    var firstSession = commitments.find(function (c) { return c.groupId === main && c.status === "attended"; });
    var connections = picked.map(function (x, i) {
      return { id: "demo-k" + i, personId: x.person.id, sessionId: firstSession.sessionId, groupId: main, addedAt: firstSession.startsAt };
    });

    var meetups = [];
    var messages = [];
    if (picked.length) {
      var friend = picked[0].person;
      // Their last two main-group sessions were planned together from chat.
      var mainOnes = commitments.filter(function (c) { return c.groupId === main && c.status === "attended"; });
      mainOnes.slice(-2).forEach(function (c) { c.withPersonId = friend.id; });
      meetups.push({ id: "demo-u0", personId: friend.id, at: new Date(nowMs - 5 * DAY).toISOString(), confirmed: true });
      var first = friend.name.split(" ")[0];
      messages = [
        { id: "demo-m0", personId: friend.id, from: "me", text: "Great seeing you last week!", at: new Date(nowMs - 9 * DAY).toISOString() },
        { id: "demo-m1", personId: friend.id, from: "them", text: "You too! Same time this week?", at: new Date(nowMs - 9 * DAY + 600000).toISOString() },
        { id: "demo-m2", personId: friend.id, from: "me", text: "Coffee before, " + first + "?", at: new Date(nowMs - 6 * DAY).toISOString() }
      ];
    }

    return { profile: profile, answers: answers, commitments: commitments, reflections: reflections,
      connections: connections, meetups: meetups, messages: messages };
  }

  return { list: list, build: build };
})();

if (typeof module !== "undefined") { module.exports = Empower.demo; }
