/* ==========================================================================
   events.js: Flow 2, this week's picks
   Shows the top 3 sessions for the user (Empower.logic.rankPicks) and the
   rest of the week below. No profile yet sends the user to onboarding.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("events-root");
  var now = Empower.clock.now();
  var profile = store.getProfile();

  ui.renderNav("events");

  if (!profile) {
    host.innerHTML = '<h1 class="title">This week</h1><div class="empty"><p class="empty__title">Tell us about you first</p>' +
      '<p class="small">Tell us a bit about you first.</p><p class="mt-4"><a class="btn btn--inline" href="onboarding.html">Get started</a></p></div>';
    return;
  }

  var groups = store.getGroups();
  var sessions = Empower.schedule.upcomingSessions(groups, now, 8);
  var commitments = store.getCommitments();
  var familiar = Empower.people.familiarGoing(store.getPopulation(), sessions, store.getConnections(), commitments, groups, profile);
  var picks = logic.rankPicks(sessions, groups, profile, commitments, now, 3,
    { reflections: store.getReflections(), familiarBySession: familiar });
  var usedLines = [];
  var history = logic.historyFor(profile, commitments, store.getReflections(), groups, now, familiar);
  var pickIds = picks.map(function (p) { return p.session.id; });
  var committedIds = commitments.filter(function (c) { return c.status === "committed"; }).map(function (c) { return c.sessionId; });

  function card(session, group, why, badge) {
    return '<a class="card card--outline pick" href="group.html?session=' + encodeURIComponent(session.id) + '">' +
      '<div class="pick__top"><div><p class="card__title">' + group.name + "</p>" +
      '<p class="card__meta">' + ui.formatDay(session.startsAt) + " · " + ui.formatTime(session.startsAt) + " · " + group.venue + "</p></div>" +
      (badge ? '<span class="tag">' + badge + "</span>" : "") + "</div>" +
      (why ? '<p class="pick__why">' + why + "</p>" : "") + going(session) + "</a>";
  }

  function going(session) {
    var list = Empower.people.attendeesOf(store.getPopulation(), session);
    return list.length ? '<p class="pick__social">' + ui.faces(list, 3) + ui.namesText(list) + (list.length === 1 ? " is" : " are") + " going</p>" : "";
  }

  var rest = sessions.filter(function (s) {
    return new Date(s.startsAt) > now && pickIds.indexOf(s.id) === -1;
  });

  host.innerHTML =
    '<p class="eyebrow">' + ui.formatDay(now.toISOString()) + " to " + ui.formatDay(new Date(now.getTime() + 7 * 864e5).toISOString()) + "</p>" +
    '<h1 class="title">Pick one.</h1><p class="subtitle">A few we think you\'ll like. Just pick one.</p>' +
    (picks.length ? picks.map(function (p, i) {
      return card(p.session, p.group, logic.pitch(p.session, p.group, profile, history, usedLines), i === 0 ? "Top pick" : "");
    }).join("") : '<div class="empty"><p class="empty__title">Nothing left this week</p><p class="small">That\'s the week. New picks tomorrow.</p></div>') +
    '<h2 class="section-title">Everything else this week</h2>' +
    rest.map(function (s) {
      var g = store.getGroup(s.groupId);
      return card(s, g, "", committedIds.indexOf(s.id) !== -1 ? "Going" : "");
    }).join("");

  Empower.log("events.viewed", { picks: pickIds });
})();
