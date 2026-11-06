/* ==========================================================================
   browse.js: everything on this week (the list after 3 passes)
   Shown when the user swipes left on all 3 picks on This week, or taps
   "See everything". The picks they passed come first, highlighted with an
   "I'm in" button so they can change their mind; then the rest of the
   week, soonest first. Before all 3 swipes are used, a link goes back.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("browse-root");
  var now = Empower.clock.now();

  ui.renderNav("events");

  var groups = store.getGroups();
  var sessions = Empower.schedule.upcomingSessions(groups, now, 8).filter(function (s) { return new Date(s.startsAt) > now; });
  var commitments = store.getCommitments();
  var committedIds = commitments.filter(function (c) { return c.status === "committed"; }).map(function (c) { return c.sessionId; });
  var passedIds = logic.passesThisWeek(store.getPasses(), now).map(function (p) { return p.sessionId; });
  var fromSwipes = ui.param("from") === "swipes";

  function goingLine(session) {
    var list = Empower.people.attendeesOf(store.getPopulation(), session);
    return list.length ? '<p class="pick__social">' + ui.faces(list, 3) + ui.namesText(list) + (list.length === 1 ? " is" : " are") + " going</p>" : "";
  }

  var profile = store.getProfile();
  var familiar = Empower.people.familiarGoing(store.getPopulation(), sessions, store.getConnections(), commitments, groups, profile);
  var history = logic.historyFor(profile, commitments, store.getReflections(), groups, now, familiar);
  var usedLines = [];

  function card(s, highlight) {
    var g = store.getGroup(s.groupId);
    var going = committedIds.indexOf(s.id) !== -1;
    var tag = going ? "Going" : highlight ? "Your pick" : "";
    return '<div class="card card--outline pick' + (highlight ? " pick--highlight" : "") + '">' +
      '<a class="pick__link" href="group.html?session=' + encodeURIComponent(s.id) + '">' +
      '<div class="pick__top"><div><p class="card__title">' + g.name + "</p>" +
      '<p class="card__meta">' + ui.formatDay(s.startsAt) + " · " + ui.formatTime(s.startsAt) + " · " + g.venue + "</p></div>" +
      (tag ? '<span class="tag">' + tag + "</span>" : "") + "</div>" +
      (highlight && profile ? '<p class="pick__why">' + logic.pitch(s, g, profile, history, usedLines) + "</p>" : "") +
      goingLine(s) + "</a>" +
      (highlight && !going ? '<p class="mt-3"><a class="btn btn--small btn--inline" href="commit.html?session=' + encodeURIComponent(s.id) + '">I\'m in</a></p>' : "") +
      "</div>";
  }

  // The picks they passed on this week, still upcoming, best first (the order they were shown).
  var picked = passedIds.map(function (id) { return sessions.find(function (s) { return s.id === id; }); }).filter(Boolean);
  var rest = sessions.filter(function (s) { return passedIds.indexOf(s.id) === -1; });
  var left = logic.swipesLeft(store.getPasses(), now);

  host.innerHTML =
    '<p class="eyebrow">' + ui.formatDay(now.toISOString()) + " to " + ui.formatDay(new Date(now.getTime() + 7 * 864e5).toISOString()) + "</p>" +
    '<h1 class="title">Everything this week</h1>' +
    '<p class="subtitle">' + (fromSwipes ? "None of those clicked? No worries. Here's the whole week." : "The whole week. Tap one to see more.") + "</p>" +
    (left > 0 ? '<p><a class="btn btn--secondary btn--small" href="events.html">Back to your picks</a></p>' : "") +
    (picked.length ? '<h2 class="section-title">Still your best fits</h2>' + picked.map(function (s) { return card(s, true); }).join("") +
      '<h2 class="section-title">Everything else</h2>' : "") +
    rest.map(function (s) { return card(s, false); }).join("");

  Empower.log("browse.viewed", { from: fromSwipes ? "swipes" : "link", sessions: sessions.length });
})();
