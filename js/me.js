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

  /* The Empower score, explained: what it's made of and how far to the next glow. */
  function scoreCard() {
    var total = logic.empowerScore(store.getMeetups(), store.getAnswers());
    var parts = logic.scoreParts(store.getMeetups(), store.getAnswers());
    var lvl = logic.emberLevel(total);
    return '<div class="card card--outline ember-card">' + ui.ember(total, "lg") +
      '<div><p class="card__title">Empower score</p><p class="card__meta">' +
      parts.meetups + (parts.meetups === 1 ? " meetup" : " meetups") + " · " + parts.answers + (parts.answers === 1 ? " answer" : " answers") +
      (lvl.next ? " · next glow at " + lvl.next : " · fully lit") + "</p>" +
      '<p class="small muted flush">Grows most when you meet up with your people. Others see it on your profile.</p></div></div>';
  }

  var STEP_NAMES = { cozy: "Cozy", social: "Social", open: "Open" };
  var SLOT_LABELS = { "sat-am": "Sat morning", "sat-pm": "Sat afternoon", "sun-am": "Sun morning", "sun-pm": "Sun afternoon" };
  function slotLabel(s) { return SLOT_LABELS[s] || s.slice(0, 3).replace(/^./, function (x) { return x.toUpperCase(); }) + " evening"; }

  host.innerHTML =
    '<h1 class="title">' + (profile ? ui.escapeHtml(profile.name) : "Your progress") + "</h1>" +
    '<p class="subtitle">' + (logic.totalHours(commitments, groups) ? logic.totalHours(commitments, groups) + " hours with your people so far." : "Your first hours with new people start here.") + "</p>" +
    (profile ? scoreCard() : "") +
    '<div class="stat-row">' +
    '<div class="stat"><div class="stat__value">' + logic.totalHours(commitments, groups) + '</div><div class="stat__label">hours together</div></div>' +
    '<div class="stat"><div class="stat__value">' + (score.total ? score.attended + "/" + score.total : "–") + '</div><div class="stat__label">show-up score</div></div></div>' +
    '<h2 class="section-title">Groups you go to</h2>' +
    (rows.length ? rows.map(function (r) {
      return '<div class="card"><p class="card__title">' + r.group.name + '</p><p class="card__meta">' +
        r.sessions + (r.sessions === 1 ? " session" : " sessions") + " · " + r.hours + " hours</p></div>";
    }).join("") : '<p class="small muted">Nothing yet. Your first session will land here.</p>') +
    (next ? '<p class="small muted mt-4">Next: ' + store.getGroup(next.groupId).name + ", " + ui.formatDay(next.startsAt) + "</p>" : "") +
    '<h2 class="section-title">Your setup</h2>' +
    (profile ? '<ul class="facts"><li><span>Interests</span><span>' + profile.interests.join(", ") + "</span></li>" +
      "<li><span>Free</span><span>" + profile.freeSlots.map(slotLabel).join(", ") + "</span></li>" +
      "<li><span>Comfort step</span><span><span class=\"score-badge\">" + STEP_NAMES[logic.stepOf(profile)] + "</span></span></li></ul>" +
      (logic.stepOf(profile) !== "cozy" ? '<p class="small muted">Been a lot lately? <button type="button" class="link-btn" data-action="step-down">Ease back to ' +
        STEP_NAMES[logic.stepDown(logic.stepOf(profile))] + "</button></p>" : "") +
      '<a class="btn btn--secondary" href="onboarding.html?edit=1">Edit preferences</a>' :
      '<a class="btn" href="onboarding.html">Set up your profile</a>') +
    '<div class="demo"><p class="label">Demo tools</p>' +
    '<p class="mt-3"><a class="btn btn--secondary btn--small" href="lab.html">Open the Matching Lab</a></p>' +
    '<p class="small muted">Load a sample user with six weeks of history (replaces your data in this browser):</p>' +
    '<div class="btn-row mt-3">' + Empower.demo.list().map(function (d) {
      return '<button type="button" class="btn btn--secondary btn--small" data-persona="' + d.key + '">' + d.label.split(":")[0] + "</button>";
    }).join("") + "</div>" +
    '<p class="small muted">App time: <strong>' + ui.formatDay(now.toISOString()) + " · " + ui.formatTime(now.toISOString()) + "</strong>" +
    (Empower.clock.isShifted() ? " (shifted)" : "") + "</p>" +
    (next ? '<button type="button" class="btn btn--small mt-3" data-demo="to-next">Jump to my next session</button>' : "") +
    '<div class="btn-row mt-3"><button type="button" class="btn btn--secondary btn--small" data-demo="day">+1 day</button>' +
    '<button type="button" class="btn btn--secondary btn--small" data-demo="week">+1 week</button></div>' +
    '<div class="btn-row mt-3"><button type="button" class="btn btn--secondary btn--small" data-demo="now">Back to real time</button>' +
    '<button type="button" class="btn btn--secondary btn--small" data-demo="reset">Erase my data</button></div></div>';

  /* Save a sample user through the store, then reload. */
  function loadPersona(key) {
    store.resetAll();
    var d = Empower.demo.build(key, Empower.clock.now(), store.getGroups(), store.getPopulation(), Empower.QUESTIONS);
    store.saveProfile(d.profile);
    d.answers.forEach(function (a) { store.saveAnswer(a); });
    d.commitments.forEach(function (c) { store.addCommitment(c); });
    d.reflections.forEach(function (r) { store.addReflection(r); });
    d.connections.forEach(function (k) { store.addConnection(k); });
    d.meetups.forEach(function (m) { store.addMeetup(m); });
    d.messages.forEach(function (m) { store.addMessage(m); });
    Empower.log("me.persona_loaded", { persona: key, commitments: d.commitments.length, matches: d.connections.length });
    window.location.reload();
  }

  host.addEventListener("click", function (e) {
    var persona = e.target.closest("[data-persona]");
    if (persona) { loadPersona(persona.getAttribute("data-persona")); return; }
    if (e.target.closest('[data-action="step-down"]')) {
      var down = logic.stepDown(logic.stepOf(profile));
      store.saveProfile(Object.assign({}, profile, { step: down, stepChangedAt: now.toISOString() }));
      Empower.log("me.stepped_down", { to: down });
      ui.toast("Picks are back to " + STEP_NAMES[down]);
      setTimeout(function () { window.location.reload(); }, 900);
      return;
    }
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
