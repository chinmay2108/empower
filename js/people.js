/* ==========================================================================
   people.js: other users (the synthetic population) as pure functions

   The population (data/population.js) lists each person's group memberships
   with a weekly attendance probability. Whether a person attends a given
   session is decided by a deterministic hash of (person, group, week), so:
     - past weeks give a stable attendance history,
     - upcoming weeks give a stable "who's going",
     - nothing per-session needs storing, and every answer is repeatable.

   Matching: after a session, the user adds people who were there. Each
   person "adds back" or not, decided the same deterministic way from how
   much they have in common with the user. Chat replies are rule-based.
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.people = (function () {
  /* Uses logic.slotFor; in Node (tests) load it directly. */
  var logic = Empower.logic || (typeof require !== "undefined" ? require("./logic.js") : null);
  var WEEK_ZERO = new Date(2026, 0, 4); // a Sunday; week 0 starts here (local time)
  var REGULAR_MIN = 4;                  // attended 4 of the last 8 weeks

  /* hash01(text): FNV-1a hash scaled to [0, 1). Same text, same number. */
  function hash01(text) {
    var h = 2166136261;
    for (var i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619) >>> 0;
    }
    return h / 4294967296;
  }

  /* weekIndex(date): whole weeks since WEEK_ZERO, Sunday to Saturday. */
  function weekIndex(date) {
    var d = new Date(date);
    var day = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    return Math.floor(Math.round((day - WEEK_ZERO) / 864e5) / 7);
  }

  function membership(person, groupId) {
    return person.memberships.find(function (m) { return m.groupId === groupId; }) || null;
  }

  /* attends(person, groupId, week): does this person go that week? */
  function attends(person, groupId, week) {
    var m = membership(person, groupId);
    if (!m || week < person.joinedWeek) return false;
    return hash01(person.id + "|" + groupId + "|" + week) < m.p;
  }

  /* attendeesOf(population, session): people at (or going to) a session. */
  function attendeesOf(population, session) {
    var week = weekIndex(session.startsAt);
    return population.filter(function (p) { return attends(p, session.groupId, week); });
  }

  /*
   * groupStats(population, groupId, now)
   * Over the 8 weeks before now: how many different people came, how many
   * are regulars (4+ of 8), and the average Empower turnout per session.
   */
  function groupStats(population, groupId, now) {
    var thisWeek = weekIndex(now);
    var counts = {};
    var total = 0;
    for (var w = thisWeek - 8; w < thisWeek; w++) {
      population.forEach(function (p) {
        if (attends(p, groupId, w)) { counts[p.id] = (counts[p.id] || 0) + 1; total += 1; }
      });
    }
    var ids = Object.keys(counts);
    return {
      people: ids.length,
      regulars: ids.filter(function (id) { return counts[id] >= REGULAR_MIN; }).length,
      avgTurnout: Math.round(total / 8 * 10) / 10
    };
  }

  function sharedInterests(person, profile) {
    var mine = (profile && profile.interests) || [];
    return person.interests.filter(function (i) { return mine.indexOf(i) !== -1; });
  }

  /*
   * sessionsTogether(person, commitments): how many sessions the user
   * attended where this person was also there.
   */
  function sessionsTogether(person, commitments) {
    return commitments.filter(function (c) {
      return c.status === "attended" && attends(person, c.groupId, weekIndex(c.startsAt));
    }).length;
  }

  /*
   * addBackChance(person, profile, together): 0.2 base, plus shared interests
   * (up to 3), the person's warmth, and repeat sessions together. Max 0.9.
   */
  function addBackChance(person, profile, together) {
    var p = 0.2 + 0.1 * Math.min(3, sharedInterests(person, profile).length) +
      0.3 * person.warmth + 0.1 * Math.min(2, Math.max(0, together - 1));
    return Math.min(0.9, Math.round(p * 100) / 100);
  }

  /* willAddBack: deterministic per (person, user). userKey = profile.createdAt. */
  function willAddBack(person, profile, together, userKey) {
    return hash01(person.id + "|addback|" + userKey) < addBackChance(person, profile, together);
  }

  /*
   * suggestPlan(person, profile, groups, sessions, now, excludeSessionIds)
   * The best upcoming session for the two of them: one of the person's
   * groups, preferring weeks they're going and times the user is free, and
   * skipping sessions the user already committed to or attended.
   * Returns { session, group, personGoing, fitsUser } or null.
   */
  function suggestPlan(person, profile, groups, sessions, now, excludeSessionIds) {
    var skip = excludeSessionIds || [];
    var t = new Date(now).getTime();
    var mine = (profile && profile.freeSlots) || [];
    var options = sessions.filter(function (s) {
      return new Date(s.startsAt).getTime() > t && membership(person, s.groupId) && skip.indexOf(s.id) === -1;
    }).map(function (s) {
      var going = attends(person, s.groupId, weekIndex(s.startsAt));
      var fits = mine.indexOf(logic.slotFor(s.startsAt)) !== -1;
      return { session: s, group: groups.find(function (g) { return g.id === s.groupId; }),
        personGoing: going, fitsUser: fits, rank: (going ? 2 : 0) + (fits ? 1 : 0) };
    }).sort(function (a, b) {
      return b.rank - a.rank || (a.session.startsAt < b.session.startsAt ? -1 : 1);
    });
    return options[0] || null;
  }

  /*
   * reply(person, text, turn): a short rule-based reply from a synthetic
   * person. turn = how many messages they've sent so far (varies wording).
   * Session 9 (agentic UX) is where this could become a model call.
   */
  function reply(person, text, turn) {
    var t = String(text || "").toLowerCase();
    var first = person.name.split(" ")[0];
    var warm = person.warmth >= 0.55;
    var pick = function (options) { return options[(turn + Math.floor(hash01(person.id + t) * 7)) % options.length]; };

    if (/\b(yes|yeah|yep|sure|down|deal|sounds good|let'?s|i'?m in|ok(ay)?)\b/.test(t)) {
      return pick(warm ? ["Yay! See you there 🙂", "Perfect, see you there!", "Great, I'll look out for you."]
        : ["Cool, see you there.", "Sounds good.", "Great, see you then."]);
    }
    if (/\b(when|what time|where)\b/.test(t)) {
      return "Same as the usual, I'll be there a few minutes early.";
    }
    if (/\b(hi|hey|hello|yo)\b/.test(t)) {
      return pick(warm ? ["Hey! Good to see you on here", "Hi! How's your week going?"] : ["Hey!", "Hi there."]);
    }
    if (t.indexOf("?") !== -1) {
      return pick(["Good question, I'm not sure yet!", "Hmm, maybe? Let's figure it out there.", "Probably! I'll let you know."]);
    }
    return pick(warm ? ["Ha, totally.", "Love that.", "Same here!", "That's great."] : ["Nice.", "Makes sense.", "Ha, yeah."]);
  }

  /*
   * scoreOf(person): a synthetic person's public Empower score, fixed per
   * person. Warmer, more reliable people have met up more. 0 to about 120.
   */
  function scoreOf(person) {
    return Math.round(hash01(person.id + "|score") * 60 * (person.warmth + person.reliability));
  }

  /*
   * confirmsMeetup(person, profile, together, userKey)
   * Meetups count only when both people confirm. Synthetic people confirm
   * if they're a mutual match (they added the user back). With a real
   * backend (E12) the other person taps confirm themselves.
   */
  function confirmsMeetup(person, profile, together, userKey) {
    return willAddBack(person, profile, together, userKey);
  }

  return {
    scoreOf: scoreOf,
    confirmsMeetup: confirmsMeetup,
    hash01: hash01,
    weekIndex: weekIndex,
    attends: attends,
    attendeesOf: attendeesOf,
    groupStats: groupStats,
    sharedInterests: sharedInterests,
    sessionsTogether: sessionsTogether,
    addBackChance: addBackChance,
    willAddBack: willAddBack,
    suggestPlan: suggestPlan,
    reply: reply
  };
})();

if (typeof module !== "undefined") { module.exports = Empower.people; }
