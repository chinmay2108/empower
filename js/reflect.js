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

  /* The event a screen is about: artwork, name, when. Held still, because it is not a link. */
  function flowEvent(group, startsAt) {
    var art = ui.eventImage(group);
    return '<div class="event-row flow-event' + (art ? "" : " event-row--plain") + '">' + art +
      '<span class="event-row__body"><span class="event-row__title">' + group.name +
      '</span><span class="event-row__meta">' + ui.formatDay(startsAt) + " · " +
      ui.formatTime(startsAt) + "</span></span></div>";
  }

  /* The tick on a done screen: a drawn line, never a text glyph. */
  function bigCheck() {
    return '<div class="big-check"><svg class="check-mark" viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M5 12.5l4.5 4.5L19 7.5"/></svg></div>';
  }

  /* ---------- List ---------- */

  function renderList() {
    var commitments = store.getCommitments();
    var toConfirm = commitments.filter(function (c) { return logic.canCheckIn(c, groupOf(c), now) && new Date(c.startsAt) <= now; });
    var toRate = logic.awaitingReflection(commitments, store.getReflections());

    var html = '<h1 class="title">Check in</h1><p class="subtitle">How did your last one go?</p>';
    if (!toConfirm.length && !toRate.length) {
      html += '<div class="empty"><p class="empty__title">Nothing to check in yet</p><p class="small">Once you\'ve been somewhere, it\'ll show up here.</p>' +
        '<p class="mt-4"><a class="btn btn--inline" href="events.html">See this week</a></p></div>';
    }
    if (toConfirm.length) {
      html += '<h2 class="section-title">Did you go?</h2>' + toConfirm.map(function (c) {
        var art = ui.eventImage(groupOf(c));
        return '<div class="confirm-row' + (art ? "" : " confirm-row--plain") + '">' + art +
          '<div class="confirm-row__body"><p class="confirm-row__title">' + groupOf(c).name + "</p>" +
          '<p class="confirm-row__meta">' + when(c) + "</p>" +
          '<div class="confirm-row__actions">' +
          '<button type="button" class="mini-btn mini-btn--dark" data-went="' + c.id + '">Yes, I went</button>' +
          '<button type="button" class="mini-btn" data-missed="' + c.id + '">I didn\'t make it</button>' +
          "</div></div></div>";
      }).join("");
    }
    if (toRate.length) {
      html += '<h2 class="section-title">How was it?</h2>' + toRate.map(function (c) {
        var art = ui.eventImage(groupOf(c));
        return '<a class="event-row' + (art ? "" : " event-row--plain") + '" href="reflect.html?c=' + c.id + '">' + art +
          '<span class="event-row__body"><span class="event-row__title">' + groupOf(c).name +
          '</span><span class="event-row__meta">' + when(c) + " · tap to rate</span></span></a>";
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
    var last = logic.lastNoteFor(store.getCommitments(), store.getReflections(), c);
    host.innerHTML =
      flowEvent(g, c.startsAt) +
      '<h1 class="title">How was it?</h1>' +
      (form.error ? '<div class="notice notice--error" role="alert">' + form.error + "</div>" : "") +
      (last ? '<div class="card"><p class="card__title">Last time you wrote</p><p class="card__meta">"' + ui.escapeHtml(last.note) +
        '" · ' + ui.formatDay(last.startsAt) + "</p></div>" : "") +
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
      '<p class="subtitle">Anyone you\'d like to see again? If they add you too, you\'ll match. No one sees who didn\'t.</p>' +
      meet.people.map(function (p) {
        var on = meet.added.indexOf(p.id) !== -1;
        var shared = Empower.people.sharedInterests(p, profile);
        return '<div class="person">' + ui.avatar(p) + '<div class="person__body">' +
          '<p class="person__name">' + p.name + '</p><p class="person__meta">' +
          (Empower.people.sessionsTogether(p, store.getCommitments()) >= 2 ? "You've been at " + Empower.people.sessionsTogether(p, store.getCommitments()) + " sessions together" :
            shared.length ? "Also likes " + shared.slice(0, 2).join(", ") : p.neighborhood) + "</p></div>" +
          '<button type="button" class="mini-btn' + (on ? " is-selected" : "") + '" data-add="' + p.id + '" aria-pressed="' + on + '">' +
          (on ? "Added" : "Add") + "</button></div>";
      }).join("") +
      footer('<button type="button" class="btn" data-action="meet-done">Done</button>' +
        '<button type="button" class="btn btn--secondary" data-action="meet-skip">Skip</button>');
  }

  var STAGE_WORDS = { kindling: "are kindling", warm: "are warm", glow: "are glowing", bonfire: "are a bonfire" };

  /*
   * Matches whose warmth stage went up because of this session: compare
   * each match's stage without this session and with it.
   */
  function stageChanges(c) {
    var all = store.getCommitments();
    var without = all.filter(function (x) { return x.id !== c.id; });
    var profile = store.getProfile();
    return store.getConnections().map(function (k) {
      var person = store.getPerson(k.personId);
      var together = Empower.people.sessionsTogether(person, all);
      if (!Empower.people.willAddBack(person, profile, together, profile.createdAt)) return null;
      var before = Empower.people.warmthStage(Empower.people.timeTogether(person, without, groups), true);
      var time = Empower.people.timeTogether(person, all, groups);
      var after = Empower.people.warmthStage(time, true);
      return Empower.people.stageRank(after) > Empower.people.stageRank(before) && STAGE_WORDS[after]
        ? { person: person, stage: after, time: time } : null;
    }).filter(Boolean);
  }

  /*
   * After 3 good sessions the comfort step goes up one. Show the moment:
   * a card that, when dismissed, shrinks toward the Me tab where the new
   * step now shows.
   */
  var STEP_NAMES = { cozy: "Cozy", social: "Social", open: "Open" };
  function stepUp() {
    var profile = store.getProfile();
    var next = logic.stepUpDue(profile, store.getCommitments(), store.getReflections());
    if (!next) return;
    store.saveProfile(Object.assign({}, profile, { step: next, stepChangedAt: now.toISOString() }));
    Empower.log("reflect.step_up", { to: next });
    var pop = document.createElement("div");
    pop.className = "ladder-pop";
    pop.innerHTML = '<div class="ladder-pop__card" role="dialog" aria-label="Ready for a little more?">' +
      '<p class="eyebrow">Three good sessions</p><p class="card__title">Ready for a little more?</p>' +
      '<p class="card__meta">We\'ll mix in some bigger groups. You\'re now at <strong>' + STEP_NAMES[next] +
      '</strong>. You can move back anytime in Me.</p>' +
      '<p class="mt-4"><button type="button" class="btn btn--small" data-action="ladder-ok">Sounds good</button></p></div>';
    document.body.appendChild(pop);
    pop.addEventListener("click", function (e) {
      if (!e.target.closest('[data-action="ladder-ok"]')) return;
      pop.classList.add("is-leaving");
      setTimeout(function () { pop.remove(); }, 700);
    });
  }

  function renderDone(c) {
    var g = groupOf(c);
    var changes = stageChanges(c);
    var row = logic.progressByGroup(store.getCommitments(), groups).find(function (r) { return r.group.id === g.id; });
    var next = Empower.schedule.upcomingSessions([g], new Date(c.startsAt), 15).find(function (s) { return s.startsAt > c.startsAt && new Date(s.startsAt) > now; });
    var liked = form.talkedToSomeone === "yes" ?
      '<div class="card card--accent"><p class="card__meta">They probably liked you more than you think. Most people do.</p></div>' : "";
    host.innerHTML =
      '<div class="center">' + bigCheck() +
      '<h1 class="title">' + row.sessions + (row.sessions === 1 ? " session" : " sessions") + " with this group.</h1>" +
      '<p class="subtitle">That\'s ' + row.hours + " hours with this crew so far. Same time next week?</p></div>" +
      liked +
      changes.map(function (ch) {
        return '<div class="card card--accent"><p class="card__title">Things with ' + ch.person.name.split(" ")[0] + " " + STAGE_WORDS[ch.stage] +
          '</p><p class="card__meta">' + ch.time.sessions + " sessions, " + ch.time.hours + " hours together.</p></div>";
      }).join("") +
      (next ? '<h2 class="section-title">Next session</h2>' + flowEvent(g, next.startsAt) : "") +
      (meet.added.length ? '<p class="small muted center">Added ' + meet.added.length +
        '. If they add you back, they\'ll be in <a class="link" href="people.html">People</a>.</p>' : "") +
      footer((next && form.wouldReturn === "yes" ? '<a class="btn" href="commit.html?session=' + encodeURIComponent(next.id) + '">Commit to the next one</a>' : "") +
        '<a class="btn btn--secondary" href="thread.html?c=' + c.id + '">Say thanks in the session thread</a>' +
        '<a class="btn btn--secondary" href="../index.html">Back to home</a>');
    stepUp();
    if (changes.length) {
      ui.toast("Things with " + changes[0].person.name.split(" ")[0] + " " + STAGE_WORDS[changes[0].stage]);
      Empower.log("reflect.stage_up", { person: changes[0].person.id, stage: changes[0].stage });
    }
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
