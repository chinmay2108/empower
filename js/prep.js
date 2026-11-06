/* ==========================================================================
   prep.js: Flow 3, day-of plan for one commitment (?c=commitmentId)
   Shows the plan, what to expect, two openers and a way out. "I'm here"
   checks in (only inside the check-in window). "Can't make it" cancels, and
   counts as missed if it's less than 24 hours before the start.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("prep-root");
  var now = Empower.clock.now();

  ui.renderNav("home");
  document.getElementById("topbar").innerHTML = '<a class="back" href="../index.html">&larr; Home</a>';

  var c = store.getCommitment(ui.param("c"));
  if (!c) {
    host.innerHTML = '<div class="empty"><p class="empty__title">We couldn\'t find that plan</p><p class="mt-4"><a class="btn btn--inline" href="../index.html">Home</a></p></div>';
    return;
  }
  var group = store.getGroup(c.groupId);

  var OPENERS = {
    high: ["\"First time here. How long have you been coming?\"", "\"Any tips for a newcomer?\""],
    medium: ["\"Is this your first time too?\"", "\"How did you find this group?\""],
    low: ["\"What brought you here tonight?\"", "\"Do you come to these often?\""]
  };
  var EXPECT = {
    high: "The game does the talking, so you don't have to.",
    medium: "A bit of structure, then chatting. A question is the easy way in.",
    low: "It's a mingle. Look for someone on their own and say hi."
  };
  var confirmingCancel = false;
  var going = Empower.people.attendeesOf(store.getPopulation(), { groupId: c.groupId, startsAt: c.startsAt });
  var intro = Empower.people.introFor(store.getPopulation(), { groupId: c.groupId, startsAt: c.startsAt },
    store.getProfile(), store.getConnections());
  if (intro) Empower.log("prep.intro_shown", { person: intro.person.id, commitment: c.id });
  var warm = Empower.people.warmGoing(store.getPopulation(), { groupId: c.groupId, startsAt: c.startsAt },
    store.getConnections(), store.getCommitments(), store.getGroups(), store.getProfile());

  function travelText() {
    return c.leaveAt ? ui.formatHHMM(c.leaveAt) + (c.travelMode ? " by " + c.travelMode : "") : "Your choice";
  }

  function render() {
    var status = logic.effectiveStatus(c, group, now);
    if (status !== "committed") return renderClosed(status);

    var open = logic.canCheckIn(c, group, now);
    var lateCancel = logic.cancellationOutcome(c, now) === "missed";
    var actions = confirmingCancel ?
      '<div class="notice ' + (lateCancel ? "notice--error" : "notice--success") + '">' +
      (lateCancel ? "It's less than a day away, so this counts as a miss. It happens." : "Thanks for the heads up. No harm done.") + "</div>" +
      '<div class="btn-row"><button type="button" class="btn btn--secondary" data-action="keep">Keep my plan</button>' +
      '<button type="button" class="btn" data-action="cancel">Cancel it</button></div>' :
      '<button type="button" class="btn" data-action="here"' + (open ? "" : " disabled") + '>I\'m here</button>' +
      (open ? "" : '<p class="small muted center flush">You can check in from ' + ui.formatTime(new Date(new Date(c.startsAt).getTime() - 30 * 60000).toISOString()) + ".</p>") +
      '<button type="button" class="btn btn--secondary" data-action="ask-cancel">Can\'t make it</button>';

    host.innerHTML =
      (warm.length ? '<div class="card card--accent"><p class="faces-row">' + ui.faces(warm, 3) + '</p><p class="card__title">' + ui.namesText(warm, 2) + (warm.length === 1 ? " will" : warm.length === 2 ? " will both" : " will all") +
        ' be there</p><p class="card__meta">So you won\'t walk in alone.</p></div>' : "") +
      '<p class="eyebrow">' + ui.formatDay(c.startsAt) + " · " + ui.formatTime(c.startsAt) + "</p>" +
      '<h1 class="title">' + group.name + "</h1>" +
      '<ul class="facts"><li><span>Leave</span><span>' + travelText() + "</span></li>" +
      "<li><span>Where</span><span>" + group.venue + "</span></li>" +
      "<li><span>Usual size</span><span>About " + group.typicalSize + " people</span></li>" +
      (going.length ? "<li><span>Also going</span><span>" + ui.namesText(going, 2) + "</span></li>" : "") + "</ul>" +
      (intro ? '<div class="card card--outline intro-card">' + ui.avatar(intro.person, "lg") + '<div><p class="eyebrow">Someone to look for</p><p class="card__title">' +
        intro.person.name.split(" ")[0] + " will be there. You two would get on.</p>" +
        '<p class="card__meta">They\'re a regular, and into ' + intro.shared[0] + " too." +
        " Ask what keeps them coming back.</p></div></div>" : "") +
      '<p class="label">What to expect</p><p class="small muted">' + EXPECT[group.structure] + "</p>" +
      '<p class="label mt-4">Two easy openers</p><ul class="tips small"><li>' + OPENERS[group.structure].join("</li><li>") + "</li></ul>" +
      '<p class="label">If it\'s not your night</p><p class="small muted">Give it half an hour. Still not clicking? Head home, no guilt.</p>' +
      '<div class="footer-action"><div class="footer-action__inner">' + actions + "</div></div>";
  }

  function renderClosed(status) {
    var text = {
      attended: ["You went.", "You showed up. That's the hard part done.", '<a class="btn" href="reflect.html?c=' + c.id + '">Check in on how it went</a>' +
        '<a class="btn btn--secondary" href="thread.html?c=' + c.id + '">Session thread</a>'],
      cancelled: ["Cancelled.", "All good. Plans change.", '<a class="btn" href="events.html">Pick something else</a>'],
      missed: ["Missed this one.", "It happens. Next week's a fresh start.", '<a class="btn" href="events.html">See this week</a>']
    }[status];
    host.innerHTML = '<div class="center"><div class="big-check">&#10003;</div><h1 class="title">' + text[0] +
      '</h1><p class="subtitle">' + text[1] + "</p></div>" +
      '<div class="footer-action"><div class="footer-action__inner">' + text[2] + "</div></div>";
  }

  host.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var a = el.getAttribute("data-action");
    if (a === "here") {
      c = store.updateCommitment(c.id, { status: "attended", checkedInAt: now.toISOString() });
      Empower.log("prep.checked_in", { commitment: c.id, group: group.id });
    }
    if (a === "ask-cancel") confirmingCancel = true;
    if (a === "keep") confirmingCancel = false;
    if (a === "cancel") {
      var outcome = logic.cancellationOutcome(c, now);
      c = store.updateCommitment(c.id, { status: outcome, cancelledAt: now.toISOString() });
      Empower.log("prep.cancelled", { commitment: c.id, outcome: outcome });
    }
    render();
  });

  render();
  Empower.log("prep.viewed", { commitment: c.id });
})();
