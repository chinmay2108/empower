/* ==========================================================================
   thread.js: a session's thread (E16), ?c=<commitment id>
   Everyone who went can post, for 7 days after the session
   (Empower.logic.threadOpen). Other people's posts are synthetic
   (Empower.people.threadSeed); a reply comes from someone who was there.
   Text only for now: photos wait for a real backend (E12).
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var people = Empower.people;
  var host = document.getElementById("thread-root");
  var now = Empower.clock.now();
  var REPLY_DELAY_MS = 900;

  ui.renderNav("reflect");
  var c = store.getCommitment(ui.param("c"));
  var group = c && store.getGroup(c.groupId);
  var state = Empower.logic.threadOpen(c, group, now);
  if (state === "locked") {
    host.innerHTML = '<div class="empty"><p class="empty__title">Threads are for people who went</p>' +
      '<p class="small">Check in after the session to join its thread.</p>' +
      '<p class="mt-4"><a class="btn btn--inline" href="reflect.html">Check in</a></p></div>';
    Empower.log("thread.locked", { commitment: ui.param("c") });
    return;
  }
  document.getElementById("topbar").innerHTML = '<a class="back" href="prep.html?c=' + c.id + '">&larr; ' + group.name + "</a>";

  var session = { groupId: c.groupId, startsAt: c.startsAt };
  var there = people.attendeesOf(store.getPopulation(), session);
  var seed = people.threadSeed(store.getPopulation(), session, group.durationMin);

  function posts() {
    var mine = store.getThreadPosts(c.sessionId).map(function (p) {
      var person = p.from === "me" ? null : store.getPerson(p.from);
      return { name: person ? person.name : "You", text: p.text, at: p.at, me: p.from === "me" };
    });
    return seed.map(function (p) { return { name: p.name, text: p.text, at: p.at, me: false }; })
      .concat(mine).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
  }

  function render() {
    host.innerHTML =
      '<p class="eyebrow">' + ui.formatDay(c.startsAt) + "</p>" +
      '<h1 class="title">' + group.name + "</h1>" +
      '<p class="subtitle">' + there.length + " people from Empower were there. " +
      (state === "open" ? "Open for a week after the session." : "This thread closed a week after the session.") + "</p>" +
      '<div class="chat">' + posts().map(function (p) {
        return '<div class="bubble bubble--' + (p.me ? "me" : "them") + '">' +
          (p.me ? "" : "<strong>" + ui.escapeHtml(p.name.split(" ")[0]) + "</strong><br>") + ui.escapeHtml(p.text) + "</div>";
      }).join("") + "</div>" +
      (state === "open" ? '<form class="composer mt-4" id="composer"><input class="input" id="post" autocomplete="off" maxlength="300" placeholder="Say something to the group">' +
        '<button class="btn btn--inline" type="submit">Post</button></form>' +
        '<p class="small muted">Text only for now. Photos come once there\'s a real backend.</p>' : "");
  }

  host.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = document.getElementById("post").value.trim();
    if (!text || state !== "open") return;
    store.addThreadPost({ sessionId: c.sessionId, from: "me", text: text, at: Empower.clock.now().toISOString() });
    Empower.log("thread.posted", { session: c.sessionId, length: text.length });
    render();
    var replier = there[Math.floor(people.hash01(c.sessionId + text) * there.length)];
    if (!replier) return;
    setTimeout(function () {
      var turn = store.getThreadPosts(c.sessionId).length;
      store.addThreadPost({ sessionId: c.sessionId, from: replier.id, text: people.reply(replier, text, turn), at: Empower.clock.now().toISOString() });
      render();
    }, REPLY_DELAY_MS);
  });

  render();
  Empower.log("thread.viewed", { session: c.sessionId, state: state });
})();
