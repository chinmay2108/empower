/* ==========================================================================
   reflect.js: Flow 4, check in after an event and rate it in three taps
   Without ?c: lists sessions to confirm ("did you go?") and sessions to rate.
   With ?c=commitmentId: the rating form, then "who did you meet?" (people
   from the synthetic population who were at that session), then progress.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var logic = Empower.logic;
  var host = document.getElementById("reflect-root");
  var now = Empower.clock.now();
  var groups = store.getGroups();

  ui.renderNav("reflect");

  var form = { enjoyed: null, talkedToSomeone: null, wouldReturn: null, note: "", error: "" };
  var meet = { people: [], added: [] };
  var MAX_TO_SHOW = 8;

  function footer(inner) { return '<div class="footer-action"><div class="footer-action__inner">' + inner + "</div></div>"; }
  function groupOf(c) { return store.getGroup(c.groupId); }
  function when(c) { return ui.formatDay(c.startsAt) + " · " + ui.formatTime(c.startsAt); }

  /* ---------- List ---------- */

  function renderList() {
    var commitments = store.getCommitments();
    var toConfirm = commitments.filter(function (c) { return logic.canCheckIn(c, groupOf(c), now) && new Date(c.startsAt) <= now; });
    var toRate = logic.awaitingReflection(commitments, store.getReflections());

    var html = '<h1 class="title">Check in</h1><p class="subtitle">Fifteen seconds after each session. It\'s how you see your progress.</p>';
    if (!toConfirm.length && !toRate.length) {
      html += '<div class="empty"><p class="empty__title">Nothing to check in yet</p><p class="small">After a session you committed to, it shows up here.</p>' +
        '<p class="mt-4"><a class="btn btn--inline" href="events.html">See this week</a></p></div>';
    }
    if (toConfirm.length) {
      html += '<p class="label">Did you go?</p>' + toConfirm.map(function (c) {
        return '<div class="option"><p class="option__title">' + groupOf(c).name + '</p><p class="option__meta">' + when(c) + "</p>" +
          '<div class="btn-row mt-3"><button type="button" class="btn btn--small" data-went="' + c.id + '">Yes, I went</button>' +
          '<button type="button" class="btn btn--secondary btn--small" data-missed="' + c.id + '">I didn\'t make it</button></div></div>';
      }).join("");
    }
    if (toRate.length) {
      html += '<p class="label mt-4">How was it?</p>' + toRate.map(function (c) {
        return '<a class="option" href="reflect.html?c=' + c.id + '"><p class="option__title">' + groupOf(c).name +
          '</p><p class="option__meta">' + when(c) + " · tap to rate</p></a>";
      }).join("");
    }
    host.innerHTML = html;
  }

  /* ---------- Rating form ---------- */

  function choiceRow(field, options) {
    return '<div class="choice-row' + (options.length === 2 ? " choice-row--two" : "") + '">' + options.map(function (o) {
      var on = form[field] === o[0];
      return '<button type="button" class="choice' + (on ? " is-selected" : "") + '" data-field="' + field +
        '" data-value="' + o[0] + '" aria-pressed="' + on + '">' + o[1] + "</button>";
    }).join("") + "</div>";
  }

  function renderForm(c) {
    var g = groupOf(c);
    host.innerHTML =
      '<h1 class="title">How was it?</h1><p class="subtitle">' + g.name + " · " + when(c) + "</p>" +
      (form.error ? '<div class="notice notice--error" role="alert">' + form.error + "</div>" : "") +
      '<p class="label">Overall</p>' + choiceRow("enjoyed", [["1", "Meh"], ["2", "Good"], ["3", "Great"]]) +
      '<p class="label">Did you talk to anyone new?</p>' + choiceRow("talkedToSomeone", [["yes", "Yes"], ["no", "Not really"]]) +
      '<p class="label">Would you go back?</p>' + choiceRow("wouldReturn", [["yes", "Yes"], ["no", "Probably not"]]) +
      '<div class="field"><label class="label" for="note">Anything to remember? (optional)</label>' +
      '<input class="input" id="note" maxlength="140" value="' + ui.escapeHtml(form.note) + '"></div>' +
      footer('<button type="button" class="btn" data-action="save">Save</button>');
  }

  /* Who was there: people from the population at this session, most in common first. */
  function renderMeet(c) {
    var profile = store.getProfile();
    var already = store.getConnections().map(function (k) { return k.personId; });
    meet.people = Empower.people.attendeesOf(store.getPopulation(), c)
      .filter(function (p) { return already.indexOf(p.id) === -1; })
      .sort(function (a, b) {
        return Empower.people.sharedInterests(b, profile).length - Empower.people.sharedInterests(a, profile).length || (a.id < b.id ? -1 : 1);
      }).slice(0, MAX_TO_SHOW);
    if (!meet.people.length) return renderDone(c);
    host.innerHTML =
      '<h1 class="title">Who did you meet?</h1>' +
      '<p class="subtitle">Add anyone you\'d see again. If they add you too, you\'re matched. Nobody sees who didn\'t add them.</p>' +
      meet.people.map(function (p) {
        var on = meet.added.indexOf(p.id) !== -1;
        var shared = Empower.people.sharedInterests(p, profile);
        return '<div class="person"><div class="avatar">' + ui.initials(p.name) + '</div><div class="person__body">' +
          '<p class="person__name">' + p.name + '</p><p class="person__meta">' +
          (shared.length ? "Also likes " + shared.slice(0, 2).join(", ") : p.neighborhood) + "</p></div>" +
          '<button type="button" class="mini-btn' + (on ? " is-on" : "") + '" data-add="' + p.id + '" aria-pressed="' + on + '">' +
          (on ? "Added" : "Add") + "</button></div>";
      }).join("") +
      footer('<button type="button" class="btn" data-action="meet-done">Done</button>' +
        '<button type="button" class="btn btn--secondary" data-action="meet-skip">Skip</button>');
  }

  function renderDone(c) {
    var g = groupOf(c);
    var row = logic.progressByGroup(store.getCommitments(), groups).find(function (r) { return r.group.id === g.id; });
    var next = Empower.schedule.upcomingSessions([g], new Date(c.startsAt), 15).find(function (s) { return s.startsAt > c.startsAt && new Date(s.startsAt) > now; });
    var liked = form.talkedToSomeone === "yes" ?
      '<div class="card card--accent"><p class="card__meta">People usually enjoyed your company more than you think. Most of us underestimate how much others liked us after a first conversation.</p></div>' : "";
    host.innerHTML =
      '<div class="center"><div class="big-check">&#10003;</div>' +
      '<h1 class="title">' + row.sessions + (row.sessions === 1 ? " session" : " sessions") + " with this group.</h1>" +
      '<p class="subtitle">That\'s about ' + row.hours + " hours with " + g.name + ". Friendships take repeat time, so keep going back.</p></div>" +
      liked +
      (next ? '<div class="card card--outline"><p class="eyebrow">Next session</p><p class="card__title">' + g.name +
        '</p><p class="card__meta">' + ui.formatDay(next.startsAt) + " · " + ui.formatTime(next.startsAt) + "</p></div>" : "") +
      (meet.added.length ? '<p class="small muted center">You added ' + meet.added.length + (meet.added.length === 1 ? " person" : " people") +
        '. Matches show up in <a href="people.html">People</a>.</p>' : "") +
      footer((next && form.wouldReturn === "yes" ? '<a class="btn" href="commit.html?session=' + encodeURIComponent(next.id) + '">Commit to the next one</a>' : "") +
        '<a class="btn btn--secondary" href="../index.html">Back to home</a>');
  }

  /* ---------- Events ---------- */

  host.addEventListener("click", function (e) {
    var went = e.target.closest("[data-went]");
    var missed = e.target.closest("[data-missed]");
    if (went) {
      var id = went.getAttribute("data-went");
      store.updateCommitment(id, { status: "attended", checkedInAt: now.toISOString() });
      Empower.log("reflect.confirmed_attended", { commitment: id });
      window.location.href = "reflect.html?c=" + id;
      return;
    }
    if (missed) {
      store.updateCommitment(missed.getAttribute("data-missed"), { status: "missed" });
      Empower.log("reflect.confirmed_missed", { commitment: missed.getAttribute("data-missed") });
      renderList();
      return;
    }
    var add = e.target.closest("[data-add]");
    if (add) {
      var pid = add.getAttribute("data-add");
      var i = meet.added.indexOf(pid);
      if (i === -1) meet.added.push(pid); else meet.added.splice(i, 1);
      renderMeet(current);
      return;
    }
    if (e.target.closest('[data-action="meet-done"]')) {
      meet.added.forEach(function (pid) {
        store.addConnection({ personId: pid, sessionId: current.sessionId, groupId: current.groupId });
      });
      Empower.log("reflect.people_added", { commitment: current.id, count: meet.added.length });
      renderDone(current);
      return;
    }
    if (e.target.closest('[data-action="meet-skip"]')) {
      meet.added = [];
      Empower.log("reflect.people_skipped", { commitment: current.id });
      renderDone(current);
      return;
    }
    var choice = e.target.closest("[data-field]");
    if (choice) {
      form[choice.getAttribute("data-field")] = choice.getAttribute("data-value");
      form.error = "";
      renderForm(current);
      return;
    }
    if (e.target.closest('[data-action="save"]')) {
      if (!form.enjoyed || !form.talkedToSomeone || !form.wouldReturn) {
        form.error = "Answer all three. It takes a few seconds.";
        renderForm(current);
        return;
      }
      store.addReflection({
        commitmentId: current.id, enjoyed: Number(form.enjoyed),
        talkedToSomeone: form.talkedToSomeone === "yes", wouldReturn: form.wouldReturn === "yes", note: form.note.trim()
      });
      Empower.log("reflect.saved", { commitment: current.id, enjoyed: Number(form.enjoyed), wouldReturn: form.wouldReturn === "yes" });
      renderMeet(current);
    }
  });

  host.addEventListener("input", function (e) { if (e.target.id === "note") form.note = e.target.value; });

  /* ---------- Start ---------- */

  var current = store.getCommitment(ui.param("c"));
  if (current && current.status === "attended") {
    var already = store.getReflections().some(function (r) { return r.commitmentId === current.id; });
    if (already) { renderList(); } else { renderForm(current); }
  } else {
    current = null;
    renderList();
  }
  Empower.log("reflect.viewed", { commitment: current ? current.id : null });
})();
