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

  /* One card on Home, under a heading. The first one is the lead: big artwork, a title and the screen's one button. */
  var hasLead = false;
  function card(cls, href, title, meta, heading, group, action) {
    var art = group ? ui.eventImage(group) : "";
    var head = heading ? '<h2 class="section-title">' + heading + "</h2>" : "";
    if (!hasLead && art) {
      hasLead = true;
      return head + '<a class="featured" href="' + href + '"><div class="featured__art featured__art--single">' + art + "</div>" +
        '<div class="featured__body"><p class="featured__title">' + title + '</p><p class="featured__meta">' + meta +
        '</p><span class="btn">' + action + "</span></div></a>";
    }
    return head +
      '<a class="event-row ' + cls + (art ? "" : " event-row--plain") + '" href="' + href + '">' + art +
      '<span class="event-row__body"><span class="event-row__title">' + title +
      '</span><span class="event-row__meta">' + meta + "</span></span></a>";
  }

  var html = "";
  if (!profile) {
    html = '<div class="card card--accent"><p class="card__title">Start in two minutes</p>' +
      '<p class="card__meta">Two minutes and we\'ll find your first spot.</p>' +
      '<p class="mt-4"><a class="btn" href="pages/onboarding.html">Get started</a></p></div>';
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
      html += card("event-row--today", "pages/prep.html?c=" + c.id, g.name + " · " + ui.formatTime(c.startsAt),
        (c.leaveAt ? "Head out at " + ui.formatHHMM(c.leaveAt) + ". " : "") + "Everything you need is in here.", "Today", g, "Get ready");
    });
    if (toCheck.length || toRate.length) {
      var first = toCheck[0] || toRate[0];
      html += card("", "pages/reflect.html", "How was " + store.getGroup(first.groupId).name + "?",
        "How'd it go? Tell us in a tap.", "After your last session", store.getGroup(first.groupId), "Tell us");
    }
    if (next && !today.some(function (c) { return c.id === next.id; })) {
      html += card("", "pages/prep.html?c=" + next.id, store.getGroup(next.groupId).name,
        ui.formatDay(next.startsAt) + " · " + ui.formatTime(next.startsAt), "Next up", store.getGroup(next.groupId), "See the plan");
    }
    if (!html) {
      /* Three different pieces of event artwork, so the invitation shows what is on offer. */
      var art = [];
      groups.forEach(function (g) {
        var img = ui.eventImage(g);
        if (img && art.indexOf(img) === -1 && art.length < 3) art.push(img);
      });
      html = '<div class="featured"><div class="featured__art">' + art.join("") + "</div>" +
        '<div class="featured__body"><p class="featured__title">Your weekly picks</p>' +
        '<p class="featured__meta">Just one thing. We\'ve lined up a few.</p>' +
        '<a class="btn" href="pages/events.html">See my picks</a></div></div>';
    }
  }
  var DAY_NAMES = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };
  var PART_NAMES = { eve: "evenings", day: "daytimes", am: "mornings", pm: "afternoons" };
  host.innerHTML = slotCard() + html + dailyCard();

  /* ---------- "Still free Thursday evenings?" ---------- */

  function slotName(slot) {
    var bits = slot.split("-");
    return DAY_NAMES[bits[0]] + " " + PART_NAMES[bits[1]];
  }

  function slotCard() {
    if (!profile) return "";
    var slot = logic.slotsToCheck(profile, commitments, groups, now)[0];
    if (!slot) return "";
    return '<div class="card card--accent" data-slot-card><p class="card__title">Still free ' + slotName(slot) + "?</p>" +
      '<p class="card__meta">' + slotName(slot) + " haven't worked out lately, totally fine. Keep them?</p>" +
      '<div class="btn-row mt-3"><button type="button" class="btn btn--small" data-slot="' + slot + '" data-free="yes">Yes, keep it</button>' +
      '<button type="button" class="btn btn--secondary btn--small" data-slot="' + slot + '" data-free="no">Not anymore</button></div></div>';
  }

  host.addEventListener("click", function (e) {
    var el = e.target.closest("[data-slot]");
    if (!el) return;
    var slot = el.getAttribute("data-slot");
    var yes = el.getAttribute("data-free") === "yes";
    profile = logic.answerSlotCheck(profile, slot, yes, now);
    store.saveProfile(profile);
    Empower.log("home.slot_checked", { slot: slot, stillFree: yes });
    el.closest("[data-slot-card]").remove();
    ui.toast(yes ? "Got it, keeping " + slotName(slot) : "Removed " + slotName(slot));
  });

  /* ---------- Daily "this or that" question ---------- */

  function dailyCard() {
    if (!profile) return "";
    var q = logic.dailyQuestion(Empower.QUESTIONS, store.getAnswers(), now);
    if (!q) return "";
    return '<h2 class="section-title">Today\'s this or that</h2><div class="daily">' +
      ["a", "b"].map(function (side) {
        return '<button type="button" class="option" data-daily="' + side + '" data-q="' + q.id + '"><p class="option__title">' +
          ui.escapeHtml(q[side]) + "</p></button>";
      }).join("") +
      '<p class="center flush"><button type="button" class="link-btn" data-daily="skip" data-q="' + q.id + '">Skip today</button></p></div>';
  }

  host.addEventListener("click", function (e) {
    var el = e.target.closest("[data-daily]");
    if (!el) return;
    var choice = el.getAttribute("data-daily");
    var questionId = el.getAttribute("data-q");
    store.saveAnswer({ questionId: questionId, choice: choice, at: now.toISOString() });
    if (choice !== "skip") {
      profile.traits = logic.traitsFromAnswers(store.getAnswers(), Empower.QUESTIONS);
      store.saveProfile(profile);
    }
    Empower.log("home.daily_answered", { questionId: questionId, choice: choice });
    if (choice !== "skip") ui.toast("+1 Empower score");
    var card = el.closest(".daily");
    card.className = "card";
    card.innerHTML = '<p class="card__title">' + (choice === "skip" ? "No problem. See you tomorrow." : "Got it. Your picks just got sharper.") + "</p>";
  });

  var score = logic.showUpScore(commitments, groups, now);
  document.getElementById("home-stats").innerHTML =
    '<div class="stat"><div class="stat__value">' + logic.totalHours(commitments, groups) + '</div><div class="stat__label">hours together</div></div>' +
    '<div class="stat"><div class="stat__value">' + (score.total ? score.attended + "/" + score.total : logic.progressByGroup(commitments, groups).length) +
    '</div><div class="stat__label">' + (score.total ? "show-up score" : "groups you return to") + "</div></div>";

  if (profile) {
    var upcoming = logic.nextCommitment(commitments, now);
    document.getElementById("home-sub").textContent = upcoming
      ? store.getGroup(upcoming.groupId).name + " on " + new Date(upcoming.startsAt).toLocaleDateString("en-US", { weekday: "long" }) + ". Nice."
      : "Got a free evening this week?";
  }
  document.getElementById("home-date").textContent = ui.formatDay(now.toISOString());
  if (profile) document.getElementById("home-greeting").textContent = "Hi, " + profile.name + ".";
  ui.renderNav("home");
  Empower.log("home.viewed", { hasProfile: !!profile, commitments: commitments.length });
})();
