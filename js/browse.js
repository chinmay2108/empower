/* ==========================================================================
   browse.js: everything on this week (the list after 3 passes)
   Shown when the user swipes left on all 3 picks on This week, or taps
   "See everything". Every upcoming session for the next 8 days, soonest
   first; passed and committed ones are marked.
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

  function going(session) {
    var list = Empower.people.attendeesOf(store.getPopulation(), session);
    return list.length ? '<p class="pick__social">' + ui.faces(list, 3) + ui.namesText(list) + (list.length === 1 ? " is" : " are") + " going</p>" : "";
  }

  function card(s) {
    var g = store.getGroup(s.groupId);
    var tag = committedIds.indexOf(s.id) !== -1 ? "Going" : passedIds.indexOf(s.id) !== -1 ? "Passed" : "";
    return '<a class="card card--outline pick" href="group.html?session=' + encodeURIComponent(s.id) + '">' +
      '<div class="pick__top"><div><p class="card__title">' + g.name + "</p>" +
      '<p class="card__meta">' + ui.formatDay(s.startsAt) + " · " + ui.formatTime(s.startsAt) + " · " + g.venue + "</p></div>" +
      (tag ? '<span class="tag">' + tag + "</span>" : "") + "</div>" + going(s) + "</a>";
  }

  host.innerHTML =
    '<p class="eyebrow">' + ui.formatDay(now.toISOString()) + " to " + ui.formatDay(new Date(now.getTime() + 7 * 864e5).toISOString()) + "</p>" +
    '<h1 class="title">Everything this week</h1>' +
    '<p class="subtitle">' + (fromSwipes ? "None of those clicked? No worries. Here's the whole week. Tap one to see more."
      : "The whole week. Tap one to see more.") + "</p>" +
    sessions.map(card).join("");

  Empower.log("browse.viewed", { from: fromSwipes ? "swipes" : "link", sessions: sessions.length });
})();
