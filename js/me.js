/* ==========================================================================
   me.js: Flow 6, progress and preferences, plus demo tools
   Demo tools move the app clock so a demo can show check-in and progress
   without waiting days. They only affect this browser.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("me-root");
  var now = Empower.clock.now();
  var groups = store.getGroups();

  ui.renderNav("me");

  var profile = store.getProfile();
  var commitments = store.getCommitments();
  var rows = logic.progressByGroup(commitments, groups);
  var score = logic.showUpScore(commitments, groups, now);
  var next = logic.nextCommitment(commitments, now);

  var SLOT_LABELS = { "sat-am": "Sat morning", "sat-pm": "Sat afternoon", "sun-am": "Sun morning", "sun-pm": "Sun afternoon" };
  function slotLabel(s) { return SLOT_LABELS[s] || s.slice(0, 3).replace(/^./, function (x) { return x.toUpperCase(); }) + " evening"; }

  host.innerHTML =
    '<h1 class="title">' + (profile ? ui.escapeHtml(profile.name) : "Your progress") + "</h1>" +
    '<p class="subtitle">Friendships take repeat time with the same people. Here\'s yours.</p>' +
    '<div class="stat-row">' +
    '<div class="stat"><div class="stat__value">' + logic.totalHours(commitments, groups) + '</div><div class="stat__label">hours together</div></div>' +
    '<div class="stat"><div class="stat__value">' + (score.total ? score.attended + "/" + score.total : "–") + '</div><div class="stat__label">show-up score</div></div></div>' +
    '<h2 class="section-title">Groups you go to</h2>' +
    (rows.length ? rows.map(function (r) {
      return '<div class="card"><p class="card__title">' + r.group.name + '</p><p class="card__meta">' +
        r.sessions + (r.sessions === 1 ? " session" : " sessions") + " · " + r.hours + " hours</p></div>";
    }).join("") : '<p class="small muted">None yet. Your first check-in will show up here.</p>') +
    (next ? '<p class="small muted mt-4">Next: ' + store.getGroup(next.groupId).name + ", " + ui.formatDay(next.startsAt) + "</p>" : "") +
    '<h2 class="section-title">Your setup</h2>' +
    (profile ? '<ul class="facts"><li><span>Interests</span><span>' + profile.interests.join(", ") + "</span></li>" +
      "<li><span>Free</span><span>" + profile.freeSlots.map(slotLabel).join(", ") + "</span></li>" +
      "<li><span>Comfort</span><span>" + { easy: "Easy", nervous: "A bit nervous", anxious: "Pretty anxious" }[profile.comfort] + "</span></li></ul>" +
      '<a class="btn btn--secondary" href="onboarding.html?edit=1">Edit preferences</a>' :
      '<a class="btn" href="onboarding.html">Set up your profile</a>') +
    '<div class="demo"><p class="label">Demo tools</p>' +
    '<p class="small muted">App time: <strong>' + ui.formatDay(now.toISOString()) + " · " + ui.formatTime(now.toISOString()) + "</strong>" +
    (Empower.clock.isShifted() ? " (shifted)" : "") + "</p>" +
    (next ? '<button type="button" class="btn btn--small mt-3" data-demo="to-next">Jump to my next session</button>' : "") +
    '<div class="btn-row mt-3"><button type="button" class="btn btn--secondary btn--small" data-demo="day">+1 day</button>' +
    '<button type="button" class="btn btn--secondary btn--small" data-demo="week">+1 week</button></div>' +
    '<div class="btn-row mt-3"><button type="button" class="btn btn--secondary btn--small" data-demo="now">Back to real time</button>' +
    '<button type="button" class="btn btn--secondary btn--small" data-demo="reset">Erase my data</button></div></div>';

  host.addEventListener("click", function (e) {
    var el = e.target.closest("[data-demo]");
    if (!el) return;
    var a = el.getAttribute("data-demo");
    if (a === "to-next") Empower.clock.jumpTo(new Date(new Date(next.startsAt).getTime() - 10 * 60000));
    if (a === "day") Empower.clock.shiftHours(24);
    if (a === "week") Empower.clock.shiftHours(24 * 7);
    if (a === "now") Empower.clock.reset();
    if (a === "reset") store.resetAll();
    window.location.reload();
  });

  Empower.log("me.viewed", { hours: logic.totalHours(commitments, groups), score: score });
})();
