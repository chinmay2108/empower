/* ==========================================================================
   group.js: Flow 2, one session's detail page (?session=g01@2026-11-12)
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("group-root");
  var now = Empower.clock.now();

  ui.renderNav("events");
  document.getElementById("topbar").innerHTML = '<a class="back" href="events.html">&larr; This week</a>';

  var groups = store.getGroups();
  var session = Empower.schedule.sessionById(groups, ui.param("session"));
  if (!session) {
    host.innerHTML = '<div class="empty"><p class="empty__title">We couldn\'t find that session</p><p class="mt-4"><a class="btn btn--inline" href="events.html">Back to this week</a></p></div>';
    Empower.log("group.not_found", { session: ui.param("session") });
    return;
  }

  var group = store.getGroup(session.groupId);
  var profile = store.getProfile();
  var commitments = store.getCommitments();
  var mine = commitments.find(function (c) { return c.sessionId === session.id && c.status === "committed"; });
  var attendedBefore = commitments.filter(function (c) { return c.groupId === group.id && c.status === "attended"; }).length;
  var why = profile ? logic.explain(logic.scoreSession(session, group, profile, {
    attendedGroupIds: attendedBefore ? [group.id] : []
  }).reasons) : "";
  var started = new Date(session.startsAt) <= now;
  var population = store.getPopulation();
  var stats = Empower.people.groupStats(population, group.id, now);
  var goingList = Empower.people.attendeesOf(population, session);
  var structureText = { high: "High: the activity does the talking", medium: "Some structure", low: "Open mingling" }[group.structure];

  var action;
  if (mine) {
    action = '<a class="btn" href="prep.html?c=' + mine.id + '">You\'re going · see your plan</a>';
  } else if (started) {
    action = '<a class="btn btn--secondary" href="events.html">This one has started</a>';
  } else {
    action = '<a class="btn" href="commit.html?session=' + encodeURIComponent(session.id) + '">Commit to this</a>';
  }

  host.innerHTML =
    '<p class="eyebrow">' + group.category + " · weekly</p>" +
    '<h1 class="title">' + group.name + "</h1>" +
    '<p class="subtitle">' + group.description + "</p>" +
    '<ul class="facts">' +
    "<li><span>Next session</span><span>" + ui.formatDay(session.startsAt) + " · " + ui.formatTime(session.startsAt) + " to " + ui.formatTime(session.endsAt) + "</span></li>" +
    "<li><span>Where</span><span>" + group.venue + "</span></li>" +
    "<li><span>Usual size</span><span>About " + group.typicalSize + " people</span></li>" +
    "<li><span>Structure</span><span>" + structureText + "</span></li>" +
    "<li><span>Empower members, last 8 weeks</span><span>" + stats.people + " (" + stats.regulars + " regulars)</span></li>" +
    "<li><span>Going from Empower</span><span>" + (goingList.length ? ui.namesText(goingList, 3) : "Be the first") + "</span></li>" +
    (attendedBefore ? "<li><span>You've been</span><span>" + attendedBefore + (attendedBefore === 1 ? " time" : " times") + "</span></li>" : "") +
    "</ul>" +
    (why ? '<div class="card card--accent"><p class="card__title">Why it fits you</p><p class="card__meta">' + why + "</p></div>" : "") +
    '<div class="footer-action"><div class="footer-action__inner">' + action + "</div></div>";

  Empower.log("group.viewed", { session: session.id, committed: !!mine });
})();
