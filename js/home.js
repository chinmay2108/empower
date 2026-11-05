/* ==========================================================================
   home.js: Home page (the "Controller" for index.html)
   Reads saved data and shows: what's next, and progress with your groups.
   Writes nothing.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;

  function nextCommitment(commitments, now) {
    return commitments
      .filter(function (c) { return c.status === "committed" && new Date(c.startsAt) > now; })
      .sort(function (a, b) { return a.startsAt < b.startsAt ? -1 : 1; })[0] || null;
  }

  /* Hours and distinct groups from attended commitments. */
  function progress(commitments) {
    var attended = commitments.filter(function (c) { return c.status === "attended"; });
    var minutes = 0;
    var groupIds = {};
    attended.forEach(function (c) {
      var g = store.getGroup(c.groupId);
      if (g) { minutes += g.durationMin; groupIds[g.id] = true; }
    });
    return { hours: Math.round(minutes / 6) / 10, groups: Object.keys(groupIds).length };
  }

  function renderNext(profile, next) {
    var host = document.getElementById("home-next");

    if (!profile) {
      host.innerHTML =
        '<div class="card card--accent">' +
        '<p class="card__title">Start in two minutes</p>' +
        '<p class="card__meta">Tell us what you like and when you are free.</p>' +
        '<p class="mt-4"><a class="btn btn--accent" href="pages/onboarding.html">Get started</a></p>' +
        "</div>";
      return;
    }

    if (!next) {
      host.innerHTML =
        '<div class="empty">' +
        '<p class="empty__title">No plans yet</p>' +
        '<p class="small">Pick one thing this week.</p>' +
        '<p class="mt-4"><a class="btn btn--inline" href="pages/events.html">See this week</a></p>' +
        "</div>";
      return;
    }

    var group = store.getGroup(next.groupId);
    host.innerHTML =
      '<p class="eyebrow">Next up</p>' +
      '<div class="card card--outline">' +
      '<p class="card__title">' + ui.escapeHtml(group ? group.name : "Event") + "</p>" +
      '<p class="card__meta">' + ui.formatDay(next.startsAt) + " · " + ui.formatTime(next.startsAt) +
      (group ? " · " + ui.escapeHtml(group.venue) : "") + "</p>" +
      (next.leaveAt ? '<p class="small mt-3">Leave at <strong>' +
        ui.escapeHtml(next.leaveAt) + "</strong></p>" : "") +
      "</div>";
  }

  function renderStats(p) {
    document.getElementById("home-stats").innerHTML =
      '<div class="stat"><div class="stat__value">' + p.hours + '</div><div class="stat__label">hours together</div></div>' +
      '<div class="stat"><div class="stat__value">' + p.groups + '</div><div class="stat__label">groups you return to</div></div>';
  }

  function init() {
    var now = new Date();
    var profile = store.getProfile();
    var commitments = store.getCommitments();

    document.getElementById("home-date").textContent = ui.formatDay(now.toISOString());
    if (profile && profile.name) {
      document.getElementById("home-greeting").textContent = "Hi, " + profile.name + ".";
    }

    renderNext(profile, nextCommitment(commitments, now));
    renderStats(progress(commitments));
    ui.renderNav("home");
    Empower.log("home.viewed", { hasProfile: !!profile, commitments: commitments.length });
  }

  init();
})();
