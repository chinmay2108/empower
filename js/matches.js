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
      return '<a class="person" href="person.html?id=' + r.person.id + '"><div class="avatar">' + ui.initials(r.person.name) + "</div>" +
        '<div class="person__body"><p class="person__name">' + r.person.name + '</p><p class="person__meta">' +
        (last ? ui.escapeHtml(last.text).slice(0, 48) : "Met at " + g.name) +
        " · " + STAGE_LABELS[people.warmthStage(people.timeTogether(r.person, commitments, store.getGroups()), true)] +
        "</p></div>" + (last ? "" : '<span class="tag">New</span>') + "</a>";
    }).join("") :
      '<div class="empty"><p class="empty__title">No matches yet</p><p class="small">After a session, check in and add the people you met. If they add you too, they show up here.</p>' +
      '<p class="mt-4"><a class="btn btn--inline" href="reflect.html">Check in</a></p></div>') +
    (pending ? '<p class="small muted mt-4">' + pending + (pending === 1 ? " person hasn't" : " people haven't") +
      " added you back yet. Matches only show when it's mutual.</p>" : "");

  Empower.log("people.viewed", { matches: matches.length, pending: pending });
})();
