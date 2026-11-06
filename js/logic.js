/* ==========================================================================
   logic.js: the app's rules, as pure functions

   No saved data, no DOM, no clock. Every function gets what it needs as
   arguments (including "now"), so the same inputs always give the same
   answer. That is what makes Given-When-Then scenarios and unit tests work
   (tests/logic.test.js runs these in Node).

   Controllers (js/*.js page files) read data from Empower.store, call these
   functions, and render the result.
   ========================================================================== */

var Empower = typeof window !== "undefined" ? (window.Empower = window.Empower || {}) : {};

Empower.logic = (function () {
  var DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
  var CANCEL_NOTICE_HOURS = 24;
  var SCORE_WINDOW = 10;

  /* ---------- Time slots ---------- */

  /*
   * slotFor(date): which free-time slot a moment falls in, e.g. "thu-eve".
   * Weekdays only have an evening slot; weekends have "am" and "pm".
   * Anything from 17:00 counts as evening.
   */
  function slotFor(date) {
    var d = new Date(date);
    var day = DAY_KEYS[d.getDay()];
    var hour = d.getHours();
    if (day === "sat" || day === "sun") return day + (hour < 12 ? "-am" : "-pm");
    return hour >= 17 ? day + "-eve" : day + "-day";
  }

  /* ---------- Picking ---------- */

  /*
   * scoreSession(session, group, profile, history)
   * Returns { score, reasons[] }. Higher is better. Reasons are short
   * phrases used to explain the pick to the user.
   *   history.attendedGroupIds: groups the user has gone to before
   */
  function scoreSession(session, group, profile, history) {
    var score = 0;
    var reasons = [];
    var interests = (profile && profile.interests) || [];
    var freeSlots = (profile && profile.freeSlots) || [];
    var comfort = (profile && profile.comfort) || "nervous";

    var shared = group.interests.filter(function (i) { return interests.indexOf(i) !== -1; });
    if (shared.length) {
      score += 3 + shared.length;
      reasons.push("you like " + shared[0]);
    }

    if (freeSlots.indexOf(slotFor(session.startsAt)) !== -1) {
      score += 4;
      reasons.push("it fits a time you're free");
    } else {
      score -= 4;
    }

    if (history && history.attendedGroupIds && history.attendedGroupIds.indexOf(group.id) !== -1) {
      score += 3;
      reasons.unshift("you've been before, and going back is how it sticks");
    }

    if (comfort !== "easy") {
      if (group.structure === "high") { score += 2; reasons.push("there's an activity to focus on"); }
      if (group.structure === "low") score -= comfort === "anxious" ? 4 : 2;
      if (comfort === "anxious" && group.typicalSize <= 10) { score += 1; reasons.push("it's a small group"); }
    }

    return { score: score, reasons: reasons };
  }

  /*
   * rankPicks(sessions, groups, profile, commitments, now, limit)
   * Top sessions for the user, at most one per group, skipping sessions
   * that already started or that the user already committed to.
   * Ties break by earliest start, then session id, so order is stable.
   */
  function rankPicks(sessions, groups, profile, commitments, now, limit) {
    var byId = {};
    groups.forEach(function (g) { byId[g.id] = g; });
    var committedIds = activeCommitments(commitments).map(function (c) { return c.sessionId; });
    var history = {
      attendedGroupIds: commitments.filter(function (c) { return c.status === "attended"; })
        .map(function (c) { return c.groupId; })
    };
    var nowMs = new Date(now).getTime();

    var scored = sessions
      .filter(function (s) { return new Date(s.startsAt).getTime() > nowMs && committedIds.indexOf(s.id) === -1; })
      .map(function (s) {
        var r = scoreSession(s, byId[s.groupId], profile, history);
        return { session: s, group: byId[s.groupId], score: r.score, reasons: r.reasons };
      })
      .sort(function (a, b) {
        if (b.score !== a.score) return b.score - a.score;
        if (a.session.startsAt !== b.session.startsAt) return a.session.startsAt < b.session.startsAt ? -1 : 1;
        return a.session.id < b.session.id ? -1 : 1;
      });

    var seen = {};
    var picks = [];
    for (var i = 0; i < scored.length && picks.length < (limit || 3); i++) {
      if (seen[scored[i].group.id]) continue;
      seen[scored[i].group.id] = true;
      picks.push(scored[i]);
    }
    return picks;
  }

  /* Turn reasons into one readable sentence. */
  function explain(reasons) {
    if (!reasons.length) return "Something new to try this week.";
    var text = reasons.slice(0, 2).join(", and ");
    return text.charAt(0).toUpperCase() + text.slice(1) + ".";
  }

  /* ---------- Commitments ---------- */

  function activeCommitments(commitments) {
    return commitments.filter(function (c) { return c.status === "committed" || c.status === "attended"; });
  }

  /*
   * findConflict(commitments, session, groups)
   * Returns the existing commitment whose session overlaps the new one,
   * or null. Only "committed" commitments count.
   */
  function findConflict(commitments, session, groups) {
    var start = new Date(session.startsAt).getTime();
    var end = new Date(session.endsAt).getTime();
    return commitments.filter(function (c) { return c.status === "committed"; }).find(function (c) {
      if (c.sessionId === session.id) return true;
      var g = groups.find(function (x) { return x.id === c.groupId; });
      var cStart = new Date(c.startsAt).getTime();
      var cEnd = cStart + (g ? g.durationMin : 60) * 60000;
      return start < cEnd && cStart < end;
    }) || null;
  }

  /*
   * suggestLeaveTime(startsAt, travelMode): minutes before start, as "HH:MM".
   * Walk 25, bus 30, bike 20, drive 20.
   */
  function suggestLeaveTime(startsAt, travelMode) {
    var lead = { walk: 25, bus: 30, bike: 20, drive: 20 }[travelMode] || 25;
    var d = new Date(new Date(startsAt).getTime() - lead * 60000);
    var pad = function (n) { return (n < 10 ? "0" : "") + n; };
    return pad(d.getHours()) + ":" + pad(d.getMinutes());
  }

  /*
   * cancellationOutcome(commitment, now)
   * "cancelled" if at least 24 hours before the start (does not hurt the
   * show-up score), otherwise "missed".
   */
  function cancellationOutcome(commitment, now) {
    var hoursLeft = (new Date(commitment.startsAt).getTime() - new Date(now).getTime()) / 3600000;
    return hoursLeft >= CANCEL_NOTICE_HOURS ? "cancelled" : "missed";
  }

  /*
   * canCheckIn(commitment, group, now): from 30 minutes before the start
   * until 12 hours after the end.
   */
  function canCheckIn(commitment, group, now) {
    if (commitment.status !== "committed") return false;
    var t = new Date(now).getTime();
    var start = new Date(commitment.startsAt).getTime();
    var end = start + group.durationMin * 60000;
    return t >= start - 30 * 60000 && t <= end + 12 * 3600000;
  }

  /*
   * effectiveStatus(commitment, group, now)
   * A commitment still "committed" more than 12 hours after its end counts
   * as "missed", even if nobody marked it.
   */
  function effectiveStatus(commitment, group, now) {
    if (commitment.status !== "committed") return commitment.status;
    var end = new Date(commitment.startsAt).getTime() + group.durationMin * 60000;
    return new Date(now).getTime() > end + 12 * 3600000 ? "missed" : "committed";
  }

  /* ---------- Home ---------- */

  /* Committed sessions starting today (local date), soonest first. */
  function todaysCommitments(commitments, now) {
    var n = new Date(now);
    return commitments.filter(function (c) {
      var d = new Date(c.startsAt);
      return c.status === "committed" && d.getFullYear() === n.getFullYear() &&
        d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
    }).sort(byStart);
  }

  /* Next committed session after now. */
  function nextCommitment(commitments, now) {
    var t = new Date(now).getTime();
    return commitments.filter(function (c) {
      return c.status === "committed" && new Date(c.startsAt).getTime() > t;
    }).sort(byStart)[0] || null;
  }

  /* Attended commitments without a reflection yet, newest first. */
  function awaitingReflection(commitments, reflections) {
    var done = reflections.map(function (r) { return r.commitmentId; });
    return commitments.filter(function (c) {
      return c.status === "attended" && done.indexOf(c.id) === -1;
    }).sort(byStart).reverse();
  }

  /* ---------- Progress ---------- */

  /*
   * progressByGroup(commitments, groups)
   * [{ group, sessions, hours }] for groups attended at least once,
   * most hours first.
   */
  function progressByGroup(commitments, groups) {
    var rows = {};
    commitments.filter(function (c) { return c.status === "attended"; }).forEach(function (c) {
      var g = groups.find(function (x) { return x.id === c.groupId; });
      if (!g) return;
      rows[g.id] = rows[g.id] || { group: g, sessions: 0, minutes: 0 };
      rows[g.id].sessions += 1;
      rows[g.id].minutes += g.durationMin;
    });
    return Object.keys(rows).map(function (k) {
      var r = rows[k];
      return { group: r.group, sessions: r.sessions, hours: Math.round(r.minutes / 6) / 10 };
    }).sort(function (a, b) { return b.hours - a.hours || (a.group.id < b.group.id ? -1 : 1); });
  }

  function totalHours(commitments, groups) {
    return Math.round(progressByGroup(commitments, groups)
      .reduce(function (sum, r) { return sum + r.hours; }, 0) * 10) / 10;
  }

  /*
   * showUpScore(commitments, groups, now)
   * Of the last 10 commitments that resolved (attended or missed), how many
   * were attended. Cancellations made in time do not count.
   * Returns { attended, total } (total 0 means no history yet).
   */
  function showUpScore(commitments, groups, now) {
    var resolved = commitments.map(function (c) {
      var g = groups.find(function (x) { return x.id === c.groupId; }) || { durationMin: 60 };
      return { c: c, status: effectiveStatus(c, g, now) };
    }).filter(function (x) { return x.status === "attended" || x.status === "missed"; })
      .sort(function (a, b) { return byStart(b.c, a.c); })
      .slice(0, SCORE_WINDOW);
    return {
      attended: resolved.filter(function (x) { return x.status === "attended"; }).length,
      total: resolved.length
    };
  }

  function byStart(a, b) { return a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0; }

  return {
    slotFor: slotFor,
    scoreSession: scoreSession,
    rankPicks: rankPicks,
    explain: explain,
    findConflict: findConflict,
    suggestLeaveTime: suggestLeaveTime,
    cancellationOutcome: cancellationOutcome,
    canCheckIn: canCheckIn,
    effectiveStatus: effectiveStatus,
    todaysCommitments: todaysCommitments,
    nextCommitment: nextCommitment,
    awaitingReflection: awaitingReflection,
    progressByGroup: progressByGroup,
    totalHours: totalHours,
    showUpScore: showUpScore
  };
})();

if (typeof module !== "undefined") { module.exports = Empower.logic; }
