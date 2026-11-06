/* ==========================================================================
   lab.js: the Matching Lab (E8), a simulation for class

   Question: do our picks get people to show up, go back, and reach Kindling
   with someone more often than simpler ways of choosing?

   Each synthetic person plays an Empower user for 8 weeks. Every week one
   strategy chooses ONE session for them:
     random     any session that week
     interests  the session sharing the most of their interests
     empower    our top pick (Empower.logic.rankPicks, with their history)
   Then a simple behavior model decides whether they go and whether they
   liked it. Who else is there comes from the population's real attendance
   (Empower.people.attends), so going back to the same group is what builds
   repeat contact.

   The behavior model is an ASSUMPTION, written down here so it can be
   argued with. Results show what follows from it, not real-world proof.
     Show up:  their reliability, x0.3 if not a time they said they're free,
               x0.7 one comfort step up, x0.4 two or more steps up
     Liked it: 0.35 + 0.15 per shared interest (max 2) + 0.1 if been before
               + 0.1 if it fits their comfort step (else -0.1), max 0.95
   Every random draw comes from hash01, so the same inputs give the same
   results every time.
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.lab = (function () {
  var logic = Empower.logic || (typeof require !== "undefined" ? require("./logic.js") : null);
  var schedule = Empower.schedule || (typeof require !== "undefined" ? require("./schedule.js") : null);
  var people = Empower.people || (typeof require !== "undefined" ? require("./people.js") : null);
  var DAY = 86400000;
  var STRATEGIES = ["random", "interests", "empower"];

  /* showChance(person, session, group): the model's chance they actually go. */
  function showChance(person, session, group) {
    var p = person.reliability;
    if (person.freeSlots.indexOf(logic.slotFor(session.startsAt)) === -1) p *= 0.3;
    var gap = logic.levelGap(group, person.step);
    if (gap === 1) p *= 0.7;
    if (gap >= 2) p *= 0.4;
    return Math.round(p * 1000) / 1000;
  }

  /* likeChance(person, group, beenBefore): the model's chance they rate it Good or Great. */
  function likeChance(person, group, beenBefore) {
    var shared = group.interests.filter(function (i) { return person.interests.indexOf(i) !== -1; }).length;
    var p = 0.35 + 0.15 * Math.min(2, shared) + (beenBefore ? 0.1 : 0) +
      (logic.levelGap(group, person.step) <= 0 ? 0.1 : -0.1);
    return Math.round(Math.min(0.95, Math.max(0.05, p)) * 1000) / 1000;
  }

  function choose(strategy, person, profile, sessions, groups, commitments, reflections, now) {
    if (strategy === "random") {
      return sessions.slice().sort(function (a, b) {
        return people.hash01(person.id + "|r|" + a.id) - people.hash01(person.id + "|r|" + b.id);
      })[0];
    }
    if (strategy === "interests") {
      var byId = {};
      groups.forEach(function (g) { byId[g.id] = g; });
      var shared = function (s) {
        return byId[s.groupId].interests.filter(function (i) { return person.interests.indexOf(i) !== -1; }).length;
      };
      return sessions.slice().sort(function (a, b) {
        return shared(b) - shared(a) || (a.id < b.id ? -1 : 1);
      })[0];
    }
    var pick = logic.rankPicks(sessions, groups, profile, commitments, now, 1, { reflections: reflections })[0];
    return pick ? pick.session : null;
  }

  /*
   * simulatePerson(person, strategy, start, weeks, groups, population)
   * One person's run. Returns { commitments, reflections, kindlingByWeek[] }
   * where kindlingByWeek[w] is true once they've shared 3+ sessions with
   * someone by the end of week w (a Kindling connection, matched or not).
   */
  function simulatePerson(person, strategy, start, weeks, groups, population) {
    var byId = {};
    groups.forEach(function (g) { byId[g.id] = g; });
    var profile = { interests: person.interests, freeSlots: person.freeSlots, step: person.step, createdAt: "lab" };
    var commitments = [];
    var reflections = [];
    var together = {};
    var kindlingByWeek = [];
    var startMs = new Date(start).getTime();

    for (var w = 0; w < weeks; w++) {
      var now = new Date(startMs + w * 7 * DAY);
      var sessions = schedule.upcomingSessions(groups, now, 7);
      var session = choose(strategy, person, profile, sessions, groups, commitments, reflections, now);
      if (session) {
        var group = byId[session.groupId];
        var key = person.id + "|" + strategy + "|" + w;
        var went = people.hash01(key + "|show") < showChance(person, session, group);
        var been = commitments.some(function (c) { return c.groupId === group.id && c.status === "attended"; });
        var c = { id: "lab" + w, sessionId: session.id, groupId: group.id, startsAt: session.startsAt, status: went ? "attended" : "missed" };
        commitments.push(c);
        if (went) {
          var liked = people.hash01(key + "|like") < likeChance(person, group, been);
          reflections.push({ commitmentId: c.id, enjoyed: liked ? 3 : 1, wouldReturn: liked });
          people.attendeesOf(population, session).forEach(function (other) {
            if (other.id !== person.id) together[other.id] = (together[other.id] || 0) + 1;
          });
        }
      }
      kindlingByWeek.push(Object.keys(together).some(function (id) { return together[id] >= 3; }));
    }
    return { commitments: commitments, reflections: reflections, kindlingByWeek: kindlingByWeek };
  }

  /*
   * run(population, groups, start, weeks, limit)
   * Simulates the first `limit` people (default all) under each strategy.
   * Returns { strategy: { people, committed, showUpRate, likedRate,
   * returnRate, kindlingAt4, kindlingAt8 } } with rates from 0 to 1:
   *   showUpRate   sessions attended / sessions picked
   *   likedRate    attended sessions rated Good or Great
   *   returnRate   attended sessions followed by the same group the next week
   *   kindlingAt4  share of people with a Kindling connection after 4 weeks (the OEC)
   *   kindlingAt8  the same after all weeks
   */
  function run(population, groups, start, weeks, limit) {
    var cast = population.slice(0, limit || population.length);
    var out = {};
    STRATEGIES.forEach(function (strategy) {
      var picked = 0, attended = 0, liked = 0, returned = 0, k4 = 0, k8 = 0;
      cast.forEach(function (person) {
        var r = simulatePerson(person, strategy, start, weeks, groups, population);
        picked += r.commitments.length;
        r.commitments.forEach(function (c, i) {
          if (c.status !== "attended") return;
          attended += 1;
          var next = r.commitments[i + 1];
          if (next && next.status === "attended" && next.groupId === c.groupId) returned += 1;
        });
        liked += r.reflections.filter(function (x) { return x.wouldReturn; }).length;
        if (r.kindlingByWeek[Math.min(3, weeks - 1)]) k4 += 1;
        if (r.kindlingByWeek[weeks - 1]) k8 += 1;
      });
      var rate = function (n, d) { return d ? Math.round((n / d) * 1000) / 1000 : 0; };
      out[strategy] = {
        people: cast.length, committed: picked,
        showUpRate: rate(attended, picked), likedRate: rate(liked, attended), returnRate: rate(returned, attended),
        kindlingAt4: rate(k4, cast.length), kindlingAt8: rate(k8, cast.length)
      };
    });
    return out;
  }

  return { strategies: STRATEGIES, showChance: showChance, likeChance: likeChance, simulatePerson: simulatePerson, run: run };
})();

if (typeof module !== "undefined") { module.exports = Empower.lab; }
