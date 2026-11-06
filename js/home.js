/* ==========================================================================
   home.js: Home page
   Priority order: set up profile > today's plan > sessions to check in >
   next commitment > nudge to pick something. Then progress stats.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var now = Empower.clock.now();
  var groups = store.getGroups();
  var profile = store.getProfile();
  var commitments = store.getCommitments();
  var host = document.getElementById("home-next");

  function card(cls, href, title, meta, eyebrow) {
    return (eyebrow ? '<p class="eyebrow mt-4">' + eyebrow + "</p>" : "") +
      '<a class="card ' + cls + ' pick" href="' + href + '"><p class="card__title">' + title +
      '</p><p class="card__meta">' + meta + "</p></a>";
  }

  var html = "";
  if (!profile) {
    html = '<div class="card card--accent"><p class="card__title">Start in two minutes</p>' +
      '<p class="card__meta">Tell us what you like and when you are free.</p>' +
      '<p class="mt-4"><a class="btn btn--accent" href="pages/onboarding.html">Get started</a></p></div>';
  } else {
    var today = logic.todaysCommitments(commitments, now).filter(function (c) {
      return logic.effectiveStatus(c, store.getGroup(c.groupId), now) === "committed";
    });
    var toCheck = commitments.filter(function (c) {
      return new Date(c.startsAt) <= now && logic.canCheckIn(c, store.getGroup(c.groupId), now);
    });
    var toRate = logic.awaitingReflection(commitments, store.getReflections());
    var next = logic.nextCommitment(commitments, now);

    today.forEach(function (c) {
      var g = store.getGroup(c.groupId);
      html += card("card--accent", "pages/prep.html?c=" + c.id, g.name + " · " + ui.formatTime(c.startsAt),
        (c.leaveAt ? "Leave at " + ui.formatHHMM(c.leaveAt) + ". " : "") + "Tap for your plan and tips.", "Today");
    });
    if (toCheck.length || toRate.length) {
      var first = toCheck[0] || toRate[0];
      html += card("card--outline", "pages/reflect.html", "How was " + store.getGroup(first.groupId).name + "?",
        "Check in, it takes 15 seconds.", "After your last session");
    }
    if (next && !today.some(function (c) { return c.id === next.id; })) {
      html += card("card--outline", "pages/prep.html?c=" + next.id, store.getGroup(next.groupId).name,
        ui.formatDay(next.startsAt) + " · " + ui.formatTime(next.startsAt), "Next up");
    }
    if (!html) {
      html = '<div class="empty"><p class="empty__title">No plans yet</p><p class="small">Pick one thing this week.</p>' +
        '<p class="mt-4"><a class="btn btn--inline" href="pages/events.html">See this week</a></p></div>';
    }
  }
  host.innerHTML = html;

  var score = logic.showUpScore(commitments, groups, now);
  document.getElementById("home-stats").innerHTML =
    '<div class="stat"><div class="stat__value">' + logic.totalHours(commitments, groups) + '</div><div class="stat__label">hours together</div></div>' +
    '<div class="stat"><div class="stat__value">' + (score.total ? score.attended + "/" + score.total : logic.progressByGroup(commitments, groups).length) +
    '</div><div class="stat__label">' + (score.total ? "show-up score" : "groups you return to") + "</div></div>";

  document.getElementById("home-date").textContent = ui.formatDay(now.toISOString());
  if (profile) document.getElementById("home-greeting").textContent = "Hi, " + profile.name + ".";
  ui.renderNav("home");
  Empower.log("home.viewed", { hasProfile: !!profile, commitments: commitments.length });
})();
