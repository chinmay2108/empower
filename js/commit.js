/* ==========================================================================
   commit.js: Flow 2, commit to a session with a plan (?session=...)
   The user picks how they'll get there; we suggest a leave time they can
   change. Overlapping commitments are blocked with a choice to switch.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("commit-root");
  var now = Empower.clock.now();
  var groups = store.getGroups();
  var session = Empower.schedule.sessionById(groups, ui.param("session"));

  document.getElementById("topbar").innerHTML = '<a class="back" href="group.html?session=' +
    encodeURIComponent(ui.param("session") || "") + '">&larr; Back</a>';

  if (!session || new Date(session.startsAt) <= now) {
    host.innerHTML = '<div class="empty"><p class="empty__title">This session isn\'t open to commit</p><p class="mt-4"><a class="btn btn--inline" href="events.html">See this week</a></p></div>';
    Empower.log("commit.unavailable", { session: ui.param("session") });
    return;
  }

  var group = store.getGroup(session.groupId);
  var MODES = [["walk", "Walk"], ["bus", "Bus"], ["drive", "Drive"], ["bike", "Bike"]];
  var state = { travelMode: "bus", leaveAt: logic.suggestLeaveTime(session.startsAt, "bus"), conflict: null, done: null };

  function planSentence() {
    var mode = MODES.find(function (m) { return m[0] === state.travelMode; })[1].toLowerCase();
    var how = { walk: "walk", bus: "take the bus", drive: "drive", bike: "bike" }[state.travelMode] || mode;
    return "On " + ui.formatDay(session.startsAt).split(",")[0] + " at " + ui.formatHHMM(state.leaveAt) +
      ", I'll " + how + " to " + group.name + ".";
  }

  function render() {
    if (state.done) return renderDone();
    var conflictGroup = state.conflict ? store.getGroup(state.conflict.groupId) : null;
    host.innerHTML =
      '<p class="eyebrow">' + group.name + " · " + ui.formatDay(session.startsAt) + " · " + ui.formatTime(session.startsAt) + "</p>" +
      '<h1 class="title">Make it a plan.</h1>' +
      '<p class="subtitle">Deciding when and how you\'ll go makes you far more likely to show up.</p>' +
      '<div class="field"><p class="label">I\'ll get there by</p><div class="chip-row">' +
      MODES.map(function (m) {
        return '<button type="button" class="chip" data-mode="' + m[0] + '" aria-pressed="' + (state.travelMode === m[0]) + '">' + m[1] + "</button>";
      }).join("") + "</div></div>" +
      '<div class="field"><label class="label" for="leave">I\'ll leave at</label>' +
      '<input class="input" type="time" id="leave" value="' + state.leaveAt + '"></div>' +
      '<div class="card"><p class="small flush">Your plan: <strong id="plan">' + planSentence() + "</strong></p></div>" +
      (state.conflict ?
        '<div class="notice notice--error" role="alert">You\'re already going to <strong>' + conflictGroup.name + "</strong> at " +
        ui.formatTime(state.conflict.startsAt) + '. Keep that one, or switch to this?</div>' +
        '<div class="btn-row"><a class="btn btn--secondary" href="events.html">Keep that one</a>' +
        '<button type="button" class="btn" data-action="switch">Switch to this</button></div>' : "") +
      '<div class="footer-action"><div class="footer-action__inner">' +
      (state.conflict ? "" : '<button type="button" class="btn" data-action="commit">Commit</button>') +
      "</div></div>";
  }

  function renderDone() {
    host.innerHTML =
      '<div class="center"><div class="big-check">&#10003;</div><h1 class="title">You\'re going.</h1>' +
      '<p class="subtitle">' + group.name + " · " + ui.formatDay(session.startsAt) + " · " + ui.formatTime(session.startsAt) +
      "<br>Leave at " + ui.formatHHMM(state.done.leaveAt) + ".</p></div>" +
      '<div class="card"><p class="card__title">What happens next</p><p class="card__meta">On the day, your plan and a few tips are on Home. Plans change? Cancel at least a day ahead and it won\'t count against you.</p></div>' +
      '<div class="footer-action"><div class="footer-action__inner">' +
      '<button type="button" class="btn btn--secondary" data-action="ics">Add to calendar</button>' +
      '<a class="btn" href="../index.html">Done</a></div></div>';
  }

  function save() {
    var c = store.addCommitment({
      sessionId: session.id, groupId: group.id, startsAt: session.startsAt,
      leaveAt: state.leaveAt, travelMode: state.travelMode
    });
    state.done = c;
    Empower.log("commit.saved", { session: session.id, travelMode: state.travelMode, leaveAt: state.leaveAt });
    render();
  }

  /* A standard calendar file any calendar app can open. */
  function downloadIcs() {
    var stamp = function (iso) { return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, ""); };
    var ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Empower//EN", "BEGIN:VEVENT",
      "UID:" + state.done.id + "@empower", "DTSTAMP:" + stamp(new Date().toISOString()),
      "DTSTART:" + stamp(session.startsAt), "DTEND:" + stamp(session.endsAt),
      "SUMMARY:" + group.name, "LOCATION:" + group.venue,
      "DESCRIPTION:Leave at " + ui.formatHHMM(state.done.leaveAt) + " (" + state.done.travelMode + ")",
      "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    var link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([ics], { type: "text/calendar" }));
    link.download = "empower-" + group.id + ".ics";
    link.click();
    Empower.log("commit.calendar_downloaded", { session: session.id });
  }

  host.addEventListener("click", function (e) {
    var mode = e.target.closest("[data-mode]");
    if (mode) {
      state.travelMode = mode.getAttribute("data-mode");
      state.leaveAt = logic.suggestLeaveTime(session.startsAt, state.travelMode);
      render();
      return;
    }
    var action = e.target.closest("[data-action]");
    if (!action) return;
    var a = action.getAttribute("data-action");
    if (a === "commit") {
      state.conflict = logic.findConflict(store.getCommitments(), session, groups);
      if (state.conflict) {
        Empower.log("commit.conflict", { session: session.id, existing: state.conflict.sessionId });
        render();
        return;
      }
      save();
    }
    if (a === "switch") {
      store.updateCommitment(state.conflict.id, { status: logic.cancellationOutcome(state.conflict, now), cancelledAt: now.toISOString() });
      Empower.log("commit.switched", { from: state.conflict.sessionId, to: session.id });
      state.conflict = null;
      save();
    }
    if (a === "ics") downloadIcs();
  });

  host.addEventListener("input", function (e) {
    if (e.target.id !== "leave") return;
    state.leaveAt = e.target.value;
    document.getElementById("plan").textContent = planSentence();
  });

  render();
  Empower.log("commit.viewed", { session: session.id });
})();
