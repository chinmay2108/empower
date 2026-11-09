/* ==========================================================================
   browse.js: everything on this week (the list after 3 passes)
   Shown when the user swipes left on all 3 picks on This week, or taps
   "See everything". Picks you passed on are gone for the week: they don't
   come back here. To take a pass back, use Undo on This week right after
   passing. Sessions are soonest first. Before all 3 swipes are used, a
   link goes back.
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

  function card(s) {
    var g = store.getGroup(s.groupId);
    var going = committedIds.indexOf(s.id) !== -1;
    var tag = going ? "Going" : "";
    return '<div class="card card--outline pick">' +
      '<a class="pick__link" href="group.html?session=' + encodeURIComponent(s.id) + '">' +
      '<div class="pick__top"><div><p class="card__title">' + g.name + "</p>" +
      '<p class="card__meta">' + ui.formatDay(s.startsAt) + " · " + ui.formatTime(s.startsAt) + " · " + g.venue + "</p></div>" +
      (tag ? '<span class="tag">' + tag + "</span>" : "") + "</div>" +
      goingLine(s) + "</a>" +
      "</div>";
  }

  // Passed picks are left out: once you pass, that session is gone for the week.
  var rest = sessions.filter(function (s) { return passedIds.indexOf(s.id) === -1; });
  var left = logic.swipesLeft(store.getPasses(), now);

  host.innerHTML =
    '<p class="eyebrow">' + ui.formatDay(now.toISOString()) + " to " + ui.formatDay(new Date(now.getTime() + 7 * 864e5).toISOString()) + "</p>" +
    '<h1 class="title">Everything this week</h1>' +
    '<p class="subtitle">' + (fromSwipes ? "None of those clicked? No worries. Here's the whole week." : "The whole week. Tap one to see more.") + "</p>" +
    (left > 0 ? '<p><a class="btn btn--secondary btn--small" href="events.html">Back to your picks</a></p>' : "") +
    rest.map(card).join("");

  Empower.log("browse.viewed", { from: fromSwipes ? "swipes" : "link", sessions: sessions.length });
})();
