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
      '<p class="small">Check in after you go and you can join the chat.</p>' +
      '<p class="mt-4"><a class="btn btn--inline" href="reflect.html">Check in</a></p></div>';
    Empower.log("thread.locked", { commitment: ui.param("c") });
    return;
  }
  document.getElementById("topbar").innerHTML = '<a class="chat-header__back" href="prep.html?c=' + c.id + '" aria-label="Back">&larr;</a>' +
    '<span class="chat-header__who"><span class="chat-header__group" aria-hidden="true">' + ui.initials(group.name) + "</span>" +
    '<span><span class="chat-header__name">' + group.name + '</span><span class="chat-header__sub">' + ui.formatDay(c.startsAt) + "</span></span></span>";

  var session = { groupId: c.groupId, startsAt: c.startsAt };
  var there = people.attendeesOf(store.getPopulation(), session);
  var seed = people.threadSeed(store.getPopulation(), session, group.durationMin);

  function posts() {
    var mine = store.getThreadPosts(c.sessionId).map(function (p) {
      var person = p.from === "me" ? null : store.getPerson(p.from);
      return { person: person, name: person ? person.name : "You", text: p.text, audio: p.audio, seconds: p.seconds, at: p.at, me: p.from === "me" };
    });
    return seed.map(function (p) { return { person: store.getPerson(p.personId), name: p.name, text: p.text, at: p.at, me: false }; })
      .concat(mine).sort(function (a, b) { return a.at < b.at ? -1 : 1; });
  }

  var typing = null;

  function render() {
    host.innerHTML = '<div class="chat">' +
      '<p class="chat__note">' + (state === "open" ? "You and " + there.length + " others were there. Say thanks while it\'s fresh." :
        "This one\'s wrapped up. See you at the next.") + "</p>" +
      posts().map(function (p) {
        return '<div class="bubble bubble--' + (p.me ? "me" : "them") + '">' +
          (p.me ? "" : '<span class="bubble__who">' + (p.person ? ui.avatar(p.person, "sm") : "") + "<strong>" + ui.escapeHtml(p.name.split(" ")[0]) + "</strong></span>") +
          (p.audio ? ui.voiceNote(p.audio, p.seconds) : ui.escapeHtml(p.text)) + '<span class="bubble__time">' + ui.chatTime(p.at) + "</span></div>";
      }).join("") +
      (typing ? '<div class="bubble bubble--them bubble--typing" aria-label="' + ui.escapeHtml(typing) + ' is typing"><span></span><span></span><span></span></div>' : "") +
      "</div>";
    ui.scrollToLatest();
  }

  if (state === "open") {
    ui.composer("Say something to the group", function (text) {
      store.addThreadPost({ sessionId: c.sessionId, from: "me", text: text, at: Empower.clock.now().toISOString() });
      Empower.log("thread.posted", { session: c.sessionId, length: text.length });
      var replier = there[Math.floor(people.hash01(c.sessionId + text) * there.length)];
      typing = replier ? replier.name.split(" ")[0] : null;
      render();
      if (!replier) return;
      setTimeout(function () {
        var turn = store.getThreadPosts(c.sessionId).length;
        store.addThreadPost({ sessionId: c.sessionId, from: replier.id, text: people.reply(replier, text, turn), at: Empower.clock.now().toISOString() });
        typing = null;
        render();
      }, REPLY_DELAY_MS);
    }, function (note) {
      var saved = store.addThreadPost({ sessionId: c.sessionId, from: "me", text: "Voice note", audio: note.audio, seconds: note.seconds, at: Empower.clock.now().toISOString() });
      if (!saved) { ui.toast("Couldn't save that voice note. Storage is full."); return; }
      Empower.log("thread.voice_sent", { session: c.sessionId, seconds: note.seconds });
      var replier = there[Math.floor(people.hash01(c.sessionId + note.seconds) * there.length)];
      typing = replier ? replier.name.split(" ")[0] : null;
      render();
      if (!replier) return;
      setTimeout(function () {
        var turn = store.getThreadPosts(c.sessionId).length;
        store.addThreadPost({ sessionId: c.sessionId, from: replier.id, text: people.replyToVoice(replier, turn), at: Empower.clock.now().toISOString() });
        typing = null;
        render();
      }, REPLY_DELAY_MS * 2);
    });
  }

  render();
  Empower.log("thread.viewed", { session: c.sessionId, state: state });
})();
