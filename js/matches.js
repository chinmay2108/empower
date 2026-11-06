/* ==========================================================================
   matches.js: Flow 5, People
   Everyone the user added after a session. A person shows as a match only
   if they add the user back (Empower.people.willAddBack). People who
   haven't added back are counted, never named.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var people = Empower.people;
  var host = document.getElementById("people-root");

  ui.renderNav("people");

  var profile = store.getProfile();
  var commitments = store.getCommitments();
  var userKey = profile ? profile.createdAt : "";

  var STAGE_LABELS = { spark: "Spark", kindling: "Kindling", warm: "Warm", glow: "Glow", bonfire: "Bonfire" };
  var now = Empower.clock.now();

  function scoreBadge(person) {
    return ' <span class="score-badge score-badge--sm" title="Empower score">' + people.scoreOf(person) + "</span>";
  }

  /* People you keep seeing but haven't added: first names only, with an Add button. */
  function familiarSection() {
    var faces = people.familiarFaces(store.getPopulation(), commitments, store.getConnections(), 3);
    if (!faces.length) return "";
    return '<h2 class="section-title">Familiar faces</h2>' + faces.map(function (f) {
      return '<div class="person"><div class="avatar">' + ui.initials(f.person.name) + '</div><div class="person__body">' +
        '<p class="person__name">' + f.person.name.split(" ")[0] + scoreBadge(f.person) + '</p><p class="person__meta">You\'ve been at ' + f.sessions +
        " sessions together.</p></div>" +
        '<button type="button" class="mini-btn" data-add="' + f.person.id + '">Add</button></div>';
    }).join("");
  }

  var rows = store.getConnections().map(function (k) {
    var person = store.getPerson(k.personId);
    var together = people.sessionsTogether(person, commitments);
    return { person: person, connection: k, together: together,
      matched: people.willAddBack(person, profile, together, userKey) };
  });
  var matches = rows.filter(function (r) { return r.matched; });
  var pending = rows.length - matches.length;

  host.innerHTML =
    '<h1 class="title">Your people</h1>' +
    '<p class="subtitle">People you met who added you back.</p>' +
    (matches.length ? matches.map(function (r) {
      var g = store.getGroup(r.connection.groupId);
      var last = store.getMessages(r.person.id).slice(-1)[0];
      return '<div class="person"><div class="avatar">' + ui.initials(r.person.name) + "</div>" +
        '<div class="person__body"><p class="person__name">' + r.person.name + scoreBadge(r.person) +
        (last ? "" : ' <span class="tag">New</span>') + '</p><p class="person__meta">' +
        (people.needsNudge(r.person, commitments, now) ? "It's been 3 weeks. Go together this week?" :
          last ? ui.escapeHtml(last.text).slice(0, 48) : "Met at " + g.name) +
        " · " + STAGE_LABELS[people.warmthStage(people.timeTogether(r.person, commitments, store.getGroups()), true)] +
        "</p>" + '<div class="person__actions"><a class="mini-btn mini-btn--dark" href="chat.html?id=' + r.person.id + '">Message</a>' +
        '<a class="mini-btn" href="person.html?id=' + r.person.id + '">Profile</a></div></div></div>';
    }).join("") :
      '<div class="empty"><p class="empty__title">No matches yet</p><p class="small">After a session, check in and add the people you met. If they add you too, they show up here.</p>' +
      '<p class="mt-4"><a class="btn btn--inline" href="reflect.html">Check in</a></p></div>') +
    familiarSection() +
    (pending ? '<p class="small muted mt-4">' + pending + (pending === 1 ? " person hasn't" : " people haven't") +
      " added you back yet. Matches only show when it's mutual.</p>" : "");

  /* Add a familiar face. If they add you back you match; either way they leave Familiar faces. */
  host.addEventListener("click", function (e) {
    var btn = e.target.closest("[data-add]");
    if (!btn) return;
    var face = people.familiarFaces(store.getPopulation(), commitments, store.getConnections(), 3)
      .find(function (f) { return f.person.id === btn.getAttribute("data-add"); });
    if (!face) return;
    store.addConnection({ personId: face.person.id, sessionId: face.last.sessionId, groupId: face.last.groupId });
    var first = face.person.name.split(" ")[0];
    var matched = people.willAddBack(face.person, profile, face.sessions, userKey);
    Empower.log("people.familiar_added", { person: face.person.id, matched: matched });
    ui.toast(matched ? "You and " + first + " matched" : "Added " + first + ". If they add you back, you'll match.");
    setTimeout(function () { window.location.reload(); }, 1200);
  });

  Empower.log("people.viewed", { matches: matches.length, pending: pending });
})();
