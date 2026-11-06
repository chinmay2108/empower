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
   * Picks v2, "Glad you went": points for how likely this person is to go,
   * enjoy it, and want to go back (PRD section 4). Returns
   * { score, reasons[] }; reasons are sorted by how many points they added,
   * so explain() can show the two biggest.
   *   history comes from historyFor() (all fields optional).
   */
  function scoreSession(session, group, profile, history) {
    var h = history || {};
    var score = 0;
    var why = [];
    // rank decides the order reasons are shown in (default: the points).
    function add(points, text, rank) {
      score += points;
      if (text && points > 0) why.push({ points: rank === undefined ? points : rank, text: text });
    }
    var interests = (profile && profile.interests) || [];
    var freeSlots = (profile && profile.freeSlots) || [];
    var step = stepOf(profile);
    var traits = (profile && profile.traits) || {};
    var slot = slotFor(session.startsAt);
    var been = (h.attendedGroupIds || []).indexOf(group.id) !== -1;

    // Lower the friction: a time they said they're free.
    // Shown last: nearly every pick fits a free time, so it explains little.
    if (freeSlots.indexOf(slot) !== -1) add(4, "it fits a time you're free", 0); else add(-4);
    // Watch, then ask: missed this slot twice and haven't answered "still free?".
    if ((h.slotsToCheck || []).indexOf(slot) !== -1) add(-3);

    // Repetition and feedback.
    if (been) add(3, "you've been before, and going back is how it sticks");
    var last = (h.lastWouldReturn || {})[group.id];
    if (last === true) add(2, "you said you'd go back");
    if (last === false) add(-4);

    // Familiar faces: +1 per person you've met who's going, +2 at Kindling or warmer (max +5).
    var f = (h.familiarBySession || {})[session.id];
    if (f && f.count) {
      var pts = Math.min(5, f.count + f.warm);
      add(pts, f.count === 1 ? f.firstName + "'s going" : f.count + " people you've met are going");
    }

    // Motivation: interests.
    var shared = group.interests.filter(function (i) { return interests.indexOf(i) !== -1; });
    if (shared.length) add(Math.min(4, 2 + shared.length), "you like " + shared[0]);

    // Step up gradually.
    if (levelGap(group, step) === 1) add(-3);
    if (step !== "open") {
      if (group.structure === "high") add(2, "there's an activity to focus on");
      if (group.structure === "low") add(step === "cozy" ? -4 : -2);
      if (step === "cozy" && group.typicalSize <= 10) add(1, "it's a small group");
    }

    // Explore early, exploit later.
    if (!been && (h.regularGroupCount || 0) < 2) add(1, "it's worth a first try");

    // Quiz answers: connection style, novelty, rhythm.
    if (traits.style <= -0.5 && group.mode === "doing") add(2, "you'd be doing something together");
    if (traits.style >= 0.5 && group.mode === "talking") add(2, "there's room to really talk");
    if (traits.novelty >= 0.5 && !been) add(1, "it's something new");
    if (traits.novelty <= -0.5 && been) add(1, "it's a favorite");
    if (traits.rhythm <= -0.5 && (h.attendedSlots || []).indexOf(slot) !== -1) add(1, "it keeps your weekly routine");

    why.sort(function (a, b) { return b.points - a.points; });
    return { score: score, reasons: why.map(function (r) { return r.text; }) };
  }

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  /*
   * choose(options, key, used): one option, picked by a hash of key, so the
   * same key gives the same pick. Skips options already in used (when any
   * are left), so a page doesn't repeat itself.
   */
  function choose(options, key, used) {
    var left = options.filter(function (o) { return !used || used.indexOf(o) === -1; });
    var pool = left.length ? left : options;
    var h = 2166136261;
    for (var i = 0; i < key.length; i++) { h ^= key.charCodeAt(i); h = Math.imul(h, 16777619); }
    return pool[(h >>> 0) % pool.length];
  }

  /*
   * pitch(session, group, profile, history, used)
   * The line under a pick on This week, in the voice of a friend who
   * remembers: one or two short sentences built from the user's own
   * history. First a personal hook (who's going, what they said last
   * time, how often they've been, or that it's new to them), then why
   * it's worth it (the habit forming, or what makes it easy to walk in,
   * from the group's description). Each situation has a few phrasings,
   * picked per user and session, so lines vary week to week but stay the
   * same on a refresh. used (optional): an array of phrasings already on
   * the page; pitch skips those and adds the ones it picks, so three picks
   * never repeat a line.
   */
  function pitch(session, group, profile, history, used) {
    var h = history || {};
    var interests = (profile && profile.interests) || [];
    var visits = (h.visitsByGroup || {})[group.id] || 0;
    var saidBack = (h.lastWouldReturn || {})[group.id] === true;
    var f = (h.familiarBySession || {})[session.id];
    var shared = group.interests.filter(function (i) { return interests.indexOf(i) !== -1; });
    var day = DAY_NAMES[new Date(session.startsAt).getDay()];
    var key = ((profile && profile.createdAt) || "") + "|" + session.id;
    var say = function (options, part) {
      var picked = choose(options, key + "|" + part, used);
      if (used) used.push(picked);
      return picked;
    };

    var who = "";
    if (f && f.count === 1) who = f.firstName + "'s going";
    if (f && f.count > 1) who = f.firstName + " and " + (f.count - 1) + (f.count === 2 ? " other person" : " others") + " you've met are going";

    var hook;
    if (who && f.warm >= 1 && f.count === 1 && !saidBack) {
      hook = say([who + ", and you two have been warming up.", who + ". Good chance to pick up where you left off.",
        who + ". Things have been getting easier with " + f.firstName + "."], "hook");
    } else if (who && saidBack) {
      hook = say([who + ", and last time you said you'd be back.", who + ", and you said you'd come back.",
        "You wanted to go back, and " + who + " too."], "hook");
    } else if (who && visits) {
      hook = say([who + ", and you know the room by now.", who + ". You already know how the night goes."], "hook");
    } else if (who) {
      hook = say([who + ", so you'll see a familiar face.", who + ", so you won't walk in alone."], "hook");
    } else if (saidBack) {
      hook = say(["Last time you said you'd be back.", "You left saying you'd come again.", "You wanted another " + day + " here.",
        "You said this one was worth a repeat."], "hook");
    } else if (visits) {
      hook = say(["You've been " + (visits === 1 ? "once" : visits + " times") + " and it went well.",
        (visits === 1 ? "One visit in" : visits + " visits in") + ", and you already know the drill."], "hook");
    } else if (shared.length) {
      hook = say(["You haven't tried this one yet, and it's " + shared[0] + ", right up your street.",
        "New for you, and it's built around " + shared[0] + ".",
        "A " + day + " of " + shared[0] + ", and you haven't been yet."], "hook");
    } else {
      hook = say(["Something new this week.", "A fresh one for your " + day + "."], "hook");
    }

    var why;
    if (visits === 1) why = say(["A second visit is when faces start to look familiar.", "Going twice is when people start to remember you.",
      "The second time is always easier than the first."], "why");
    else if (visits === 2) why = say(["A third time would make it a habit.", "One more and it's your " + day + " thing."], "why");
    else if (visits >= 3) why = say(["You're becoming a regular here.", "People there know you by now.",
      "Your " + day + " crew will be expecting you.", "This is turning into your place."], "why");
    else why = group.description;

    return hook + " " + why;
  }

  /*
   * historyFor(profile, commitments, reflections, groups, now, familiarBySession)
   * Everything scoreSession needs to know about the user's past:
   *   attendedGroupIds, visitsByGroup { groupId: n }, attendedSlots, regularGroupCount (groups attended 2+
   *   times), lastWouldReturn { groupId: true | false } from their latest
   *   rating there, hiddenGroupIds (rated "probably not" twice),
   *   slotsToCheck, and familiarBySession as passed in
   *   ({ sessionId: { count, warm, firstName } }, from Empower.people.familiarGoing).
   */
  function historyFor(profile, commitments, reflections, groups, now, familiarBySession) {
    var cs = commitments || [];
    var attended = cs.filter(function (c) { return c.status === "attended"; });
    var perGroup = {};
    attended.forEach(function (c) { perGroup[c.groupId] = (perGroup[c.groupId] || 0) + 1; });
    var byCommitment = {};
    cs.forEach(function (c) { byCommitment[c.id] = c; });
    var rated = (reflections || []).filter(function (r) { return byCommitment[r.commitmentId]; })
      .sort(function (a, b) { return byCommitment[a.commitmentId].startsAt < byCommitment[b.commitmentId].startsAt ? -1 : 1; });
    var lastWouldReturn = {};
    var noCount = {};
    rated.forEach(function (r) {
      var gid = byCommitment[r.commitmentId].groupId;
      lastWouldReturn[gid] = !!r.wouldReturn;
      if (!r.wouldReturn) noCount[gid] = (noCount[gid] || 0) + 1;
    });
    return {
      attendedGroupIds: Object.keys(perGroup),
      visitsByGroup: perGroup,
      attendedSlots: attended.map(function (c) { return slotFor(c.startsAt); }),
      regularGroupCount: Object.keys(perGroup).filter(function (g) { return perGroup[g] >= 2; }).length,
      lastWouldReturn: lastWouldReturn,
      hiddenGroupIds: Object.keys(noCount).filter(function (g) { return noCount[g] >= 2; }),
      slotsToCheck: slotsToCheck(profile, cs, groups, now),
      familiarBySession: familiarBySession || {}
    };
  }

  /* ---------- Quiz, comfort step and daily question ---------- */

  var DIMENSIONS = ["energy", "style", "novelty", "rhythm"];
  var LEGACY_STEPS = { anxious: "cozy", nervous: "social", easy: "open" };

  /*
   * traitsFromAnswers(answers, questions)
   * answers: [{ questionId, choice: "a" | "b" | "skip", at }]
   * Returns { energy, style, novelty, rhythm }, each from -1 to 1:
   * the average lean of the answered pairs for that dimension
   * ("a" = -1, "b" = +1). Skips and unknown questions are ignored;
   * a dimension with no answers is 0.
   */
  function traitsFromAnswers(answers, questions) {
    var byId = {};
    questions.forEach(function (q) { byId[q.id] = q; });
    var sum = {};
    var count = {};
    DIMENSIONS.forEach(function (d) { sum[d] = 0; count[d] = 0; });
    (answers || []).forEach(function (a) {
      var q = byId[a.questionId];
      if (!q || (a.choice !== "a" && a.choice !== "b")) return;
      sum[q.dim] += a.choice === "a" ? -1 : 1;
      count[q.dim] += 1;
    });
    var traits = {};
    DIMENSIONS.forEach(function (d) {
      traits[d] = count[d] ? Math.round((sum[d] / count[d]) * 100) / 100 : 0;
    });
    return traits;
  }

  /*
   * startingStep(traits)
   * Where someone starts on the comfort ladder, from their social energy.
   * Leans small and familiar -> "cozy"; leans big and lively -> "open";
   * mixed -> "social".
   */
  function startingStep(traits) {
    var energy = (traits && traits.energy) || 0;
    if (energy <= -0.5) return "cozy";
    if (energy >= 0.5) return "open";
    return "social";
  }

  /*
   * personaFor(traits)
   * One of six hidden personas: starting step x connection style, e.g.
   * "cozy-doing" or "open-talking". Used inside the algorithm and in logs;
   * never shown to the user.
   */
  function personaFor(traits) {
    return startingStep(traits) + "-" + ((traits && traits.style) > 0 ? "talking" : "doing");
  }

  /*
   * stepOf(profile)
   * The user's comfort step: "cozy", "social" or "open". Profiles saved
   * before the quiz have comfort "anxious" | "nervous" | "easy" instead;
   * those map to cozy, social and open.
   */
  function stepOf(profile) {
    if (profile && profile.step) return profile.step;
    return (profile && LEGACY_STEPS[profile.comfort]) || "social";
  }

  function localDay(date) {
    var d = new Date(date);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  /* ---------- Say vs do: "Still free Thursday evenings?" ---------- */

  var MISSES_TO_ASK = 2;
  var MISS_WINDOW_DAYS = 28;

  /*
   * slotsToCheck(profile, commitments, groups, now)
   * Free-time slots the user said they're free but missed 2+ sessions in
   * within the last 4 weeks, counting only misses after they last said
   * "yes, still free" (profile.slotConfirmedAt[slot]). Early cancellations
   * don't count; late cancellations and no-shows do. Asked every time it
   * happens again. In bank order of profile.freeSlots.
   */
  function slotsToCheck(profile, commitments, groups, now) {
    if (!profile) return [];
    var byId = {};
    groups.forEach(function (g) { byId[g.id] = g; });
    var nowMs = new Date(now).getTime();
    var confirmed = profile.slotConfirmedAt || {};
    var misses = {};
    (commitments || []).forEach(function (c) {
      var g = byId[c.groupId];
      if (!g || effectiveStatus(c, g, now) !== "missed") return;
      var t = new Date(c.startsAt).getTime();
      var slot = slotFor(c.startsAt);
      if (t > nowMs || nowMs - t > MISS_WINDOW_DAYS * 86400000) return;
      if (confirmed[slot] && t <= new Date(confirmed[slot]).getTime()) return;
      misses[slot] = (misses[slot] || 0) + 1;
    });
    return (profile.freeSlots || []).filter(function (s) { return (misses[s] || 0) >= MISSES_TO_ASK; });
  }

  /*
   * answerSlotCheck(profile, slot, stillFree, now)
   * A new profile after the user answers. Yes: the slot stays and the miss
   * count starts over. No: the slot is removed from their free times.
   */
  function answerSlotCheck(profile, slot, stillFree, now) {
    var next = Object.assign({}, profile);
    if (stillFree) {
      next.slotConfirmedAt = Object.assign({}, profile.slotConfirmedAt);
      next.slotConfirmedAt[slot] = new Date(now).toISOString();
    } else {
      next.freeSlots = profile.freeSlots.filter(function (s) { return s !== slot; });
    }
    return next;
  }

  /* ---------- Session threads (E16) ---------- */

  var THREAD_DAYS = 7;

  /*
   * threadOpen(commitment, group, now)
   * A session's thread is for people who went: it opens once the user has
   * checked in (status "attended") and closes 7 days after the session ends,
   * so it stays about that night.
   * Returns "open", "closed" or "locked" (not checked in).
   */
  function threadOpen(commitment, group, now) {
    if (!commitment || commitment.status !== "attended") return "locked";
    var end = new Date(commitment.startsAt).getTime() + group.durationMin * 60000;
    return new Date(now).getTime() < end + THREAD_DAYS * 86400000 ? "open" : "closed";
  }

  /* ---------- Comfort ladder ---------- */

  var STEPS = ["cozy", "social", "open"];
  var GOOD_SESSIONS_TO_STEP_UP = 3;

  /*
   * groupLevel(group): the lowest comfort step a group fits.
   *   cozy   high structure and 10 people or fewer
   *   social not open mingling, and 15 people or fewer
   *   open   anything else
   */
  function groupLevel(group) {
    if (group.structure === "high" && group.typicalSize <= 10) return "cozy";
    if (group.structure !== "low" && group.typicalSize <= 15) return "social";
    return "open";
  }

  /* levelGap(group, step): how many steps above the user's step a group is (0 or less = fits). */
  function levelGap(group, step) {
    return STEPS.indexOf(groupLevel(group)) - STEPS.indexOf(step);
  }

  /*
   * stepUpDue(profile, commitments, reflections)
   * The next step up ("social" or "open") once the user has 3 attended
   * sessions rated Good or Great since their step last changed; otherwise
   * null. Already at "open" -> null. The app only ever moves people up;
   * moving down is the user's choice (stepDown).
   */
  function stepUpDue(profile, commitments, reflections) {
    var i = STEPS.indexOf(stepOf(profile));
    if (i === STEPS.length - 1) return null;
    var since = profile && profile.stepChangedAt ? new Date(profile.stepChangedAt).getTime() : -Infinity;
    var good = (reflections || []).filter(function (r) { return r.enjoyed >= 2; }).map(function (r) { return r.commitmentId; });
    var count = (commitments || []).filter(function (c) {
      return c.status === "attended" && good.indexOf(c.id) !== -1 && new Date(c.startsAt).getTime() > since;
    }).length;
    return count >= GOOD_SESSIONS_TO_STEP_UP ? STEPS[i + 1] : null;
  }

  /* stepDown(step): one step down, or the same step at "cozy". */
  function stepDown(step) {
    return STEPS[Math.max(0, STEPS.indexOf(step) - 1)];
  }

  /* ---------- Empower score ---------- */

  var MEETUP_POINTS = 10;
  var ANSWER_POINTS = 1;

  /*
   * empowerScore(meetups, answers)
   * The public number on a profile: 10 per confirmed meetup with a match,
   * plus 1 per daily or onboarding answer (skips don't count). Meetups are
   * worth much more so the score mostly reflects meeting people in person.
   */
  function empowerScore(meetups, answers) {
    var met = (meetups || []).filter(function (m) { return m.confirmed; }).length;
    var answered = (answers || []).filter(function (a) { return a.choice === "a" || a.choice === "b"; }).length;
    return met * MEETUP_POINTS + answered * ANSWER_POINTS;
  }

  /*
   * canLogMeetup(meetups, personId, now)
   * One meetup per person per day, so tapping twice can't double count.
   */
  function canLogMeetup(meetups, personId, now) {
    var today = localDay(now);
    return !(meetups || []).some(function (m) { return m.personId === personId && localDay(m.at) === today; });
  }

  /*
   * dailyQuestion(questions, answers, now)
   * The next pair to ask on Home, or null. At most one a day: null if any
   * answer (or skip) was saved on now's local day. Otherwise the first
   * pair in bank order that hasn't been answered or skipped. Null once the
   * bank runs out.
   */
  function dailyQuestion(questions, answers, now) {
    var list = answers || [];
    var today = localDay(now);
    if (list.some(function (a) { return localDay(a.at) === today; })) return null;
    var done = {};
    list.forEach(function (a) { done[a.questionId] = true; });
    for (var i = 0; i < questions.length; i++) {
      if (!done[questions[i].id]) return questions[i];
    }
    return null;
  }

  /*
   * rankPicks(sessions, groups, profile, commitments, now, limit, extras)
   * Top sessions for the user, at most one per group. Skips sessions that
   * already started, ones they're going to, groups they've hidden (rated
   * "probably not" twice) and groups two or more steps above their comfort
   * step. extras (optional): { reflections, familiarBySession }.
   * Ties break by earliest start, then session id, so order is stable.
   */
  function rankPicks(sessions, groups, profile, commitments, now, limit, extras) {
    var x = extras || {};
    var byId = {};
    groups.forEach(function (g) { byId[g.id] = g; });
    var committedIds = activeCommitments(commitments).map(function (c) { return c.sessionId; });
    var history = historyFor(profile, commitments, x.reflections, groups, now, x.familiarBySession);
    var nowMs = new Date(now).getTime();

    var scored = sessions
      .filter(function (s) {
        return new Date(s.startsAt).getTime() > nowMs && committedIds.indexOf(s.id) === -1 &&
          levelGap(byId[s.groupId], stepOf(profile)) < 2 &&
          history.hiddenGroupIds.indexOf(s.groupId) === -1;
      })
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
    historyFor: historyFor,
    pitch: pitch,
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
    showUpScore: showUpScore,
    traitsFromAnswers: traitsFromAnswers,
    startingStep: startingStep,
    personaFor: personaFor,
    stepOf: stepOf,
    dailyQuestion: dailyQuestion,
    empowerScore: empowerScore,
    canLogMeetup: canLogMeetup,
    groupLevel: groupLevel,
    levelGap: levelGap,
    stepUpDue: stepUpDue,
    stepDown: stepDown,
    threadOpen: threadOpen,
    slotsToCheck: slotsToCheck,
    answerSlotCheck: answerSlotCheck
  };
})();

if (typeof module !== "undefined") { module.exports = Empower.logic; }
