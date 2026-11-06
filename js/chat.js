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
  document.getElementById("topbar").innerHTML = '<a class="back" href="person.html?id=' + person.id + '">&larr; ' + person.name + "</a>";

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

  function render() {
    var messages = store.getMessages(person.id);
    var theirs = messages.filter(function (m) { return m.from === "them"; }).length;
    host.innerHTML =
      '<div class="chat">' + messages.map(function (m) {
        if (m.from === "app") {
          return '<div class="bubble bubble--app">' + ui.escapeHtml(m.text) +
            (m.sessionId ? '<p class="mt-3"><a class="btn btn--small btn--inline" href="commit.html?session=' + encodeURIComponent(m.sessionId) + '">Commit to it</a></p>' : "") + "</div>";
        }
        return '<div class="bubble bubble--' + (m.from === "me" ? "me" : "them") + '">' + ui.escapeHtml(m.text) + "</div>";
      }).join("") + "</div>" +
      (theirs === 0 && !messages.some(function (m) { return m.from === "me"; }) ?
        '<p class="small muted">Say hi to ' + first + ". Replies in this demo are simulated.</p>" : "") +
      '<form class="composer mt-4" id="composer"><input class="input" id="message" autocomplete="off" placeholder="Message ' + first +
      '" maxlength="300"><button class="btn btn--inline" type="submit">Send</button></form>';
    var box = document.getElementById("message");
    if (box) box.focus();
  }

  host.addEventListener("submit", function (e) {
    e.preventDefault();
    var text = document.getElementById("message").value.trim();
    if (!text) return;
    store.addMessage({ personId: person.id, from: "me", text: text });
    Empower.log("chat.sent", { person: person.id, length: text.length });
    render();
    var turn = store.getMessages(person.id).filter(function (m) { return m.from === "them"; }).length;
    setTimeout(function () {
      store.addMessage({ personId: person.id, from: "them", text: people.reply(person, text, turn) });
      render();
    }, REPLY_DELAY_MS);
  });

  render();
  Empower.log("chat.viewed", { person: person.id });
})();
