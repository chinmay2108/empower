/* ==========================================================================
   chat.js: Flow 5, chat with a match (?id=u123)
   The first time a chat opens, Empower suggests a session for the two of
   you (Empower.people.suggestPlan). Replies come from the synthetic person
   (Empower.people.reply). Messages are saved in this browser.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var people = Empower.people;
  var host = document.getElementById("chat-root");
  var now = Empower.clock.now();
  var REPLY_DELAY_MS = 900;

  ui.renderNav("people");

  var profile = store.getProfile();
  var person = store.getPerson(ui.param("id"));
  var together = person ? people.sessionsTogether(person, store.getCommitments()) : 0;
  var connected = person && store.getConnections().some(function (k) { return k.personId === person.id; });
  if (!person || !connected || !people.willAddBack(person, profile, together, profile && profile.createdAt)) {
    host.innerHTML = '<div class="empty"><p class="empty__title">You can only message matches</p><p class="mt-4"><a class="btn btn--inline" href="people.html">Back to People</a></p></div>';
    return;
  }

  var first = person.name.split(" ")[0];
  document.getElementById("topbar").innerHTML = '<a class="chat-header__back" href="people.html" aria-label="Back to People">&larr;</a>' +
    '<a class="chat-header__who" href="person.html?id=' + person.id + '">' + ui.avatar(person) +
    '<span><span class="chat-header__name">' + person.name + '</span><span class="chat-header__sub">Tap for profile</span></span></a>';

  /* Seed the conversation with a plan suggestion the first time. */
  if (!store.getMessages(person.id).length) {
    var plan = people.suggestPlan(person, profile, store.getGroups(),
      Empower.schedule.upcomingSessions(store.getGroups(), now, 14), now,
      store.getCommitments().filter(function (c) { return c.status !== "cancelled"; }).map(function (c) { return c.sessionId; }));
    if (plan) {
      store.addMessage({ personId: person.id, from: "app", sessionId: plan.session.id,
        text: first + " goes to " + plan.group.name + "." + (plan.personGoing ? " They're going " : " Next one is ") +
          ui.formatDay(plan.session.startsAt) + " at " + ui.formatTime(plan.session.startsAt) + ". Want to go together?" });
      Empower.log("chat.plan_suggested", { person: person.id, session: plan.session.id, personGoing: plan.personGoing });
    }
  }

  var typing = false;

  function bubble(m) {
    if (m.from === "app") {
      return '<div class="bubble bubble--app">' + ui.escapeHtml(m.text) +
        (m.sessionId ? '<p class="mt-3"><a class="btn btn--small btn--inline" href="commit.html?session=' + encodeURIComponent(m.sessionId) + "&with=" + person.id + '">Commit to it</a></p>' : "") + "</div>";
    }
    return '<div class="bubble bubble--' + (m.from === "me" ? "me" : "them") + '">' + (m.audio ? ui.voiceNote(m.audio, m.seconds) : ui.escapeHtml(m.text)) +
      '<span class="bubble__time">' + ui.chatTime(m.at) + "</span></div>";
  }

  function render() {
    var messages = store.getMessages(person.id);
    var lastDay = "";
    host.innerHTML = '<div class="chat">' +
      (messages.some(function (m) { return m.from !== "app"; }) ? "" :
        '<p class="chat__note">Say hi to ' + ui.escapeHtml(first) + ". (Replies are simulated in this demo.)</p>") +
      messages.map(function (m) {
        var day = ui.formatDay(m.at);
        var sep = day !== lastDay ? '<p class="chat__day">' + day + "</p>" : "";
        lastDay = day;
        return sep + bubble(m);
      }).join("") +
      (typing ? '<div class="bubble bubble--them bubble--typing" aria-label="' + ui.escapeHtml(first) + ' is typing"><span></span><span></span><span></span></div>' : "") +
      "</div>";
    ui.scrollToLatest();
  }

  ui.composer("Message " + first, function (text) {
    store.addMessage({ personId: person.id, from: "me", text: text, at: Empower.clock.now().toISOString() });
    Empower.log("chat.sent", { person: person.id, length: text.length });
    typing = true;
    render();
    var turn = store.getMessages(person.id).filter(function (m) { return m.from === "them"; }).length;
    setTimeout(function () {
      store.addMessage({ personId: person.id, from: "them", text: people.reply(person, text, turn), at: Empower.clock.now().toISOString() });
      typing = false;
      render();
    }, REPLY_DELAY_MS);
  }, function (note) {
    var saved = store.addMessage({ personId: person.id, from: "me", text: "Voice note", audio: note.audio, seconds: note.seconds, at: Empower.clock.now().toISOString() });
    if (!saved) { ui.toast("Couldn't save that voice note. Storage is full."); return; }
    Empower.log("chat.voice_sent", { person: person.id, seconds: note.seconds });
    typing = true;
    render();
    var turn = store.getMessages(person.id).filter(function (m) { return m.from === "them"; }).length;
    setTimeout(function () {
      store.addMessage({ personId: person.id, from: "them", text: people.replyToVoice(person, turn), at: Empower.clock.now().toISOString() });
      typing = false;
      render();
    }, REPLY_DELAY_MS * 2);
  });

  render();
  Empower.log("chat.viewed", { person: person.id });
})();
