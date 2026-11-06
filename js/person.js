/* ==========================================================================
   person.js: Flow 5, a match's profile (?id=u123)
   Only matched people can be viewed; anyone else sends you back to People.
   ========================================================================== */

(function () {
  var store = Empower.store;
  var ui = Empower.ui;
  var people = Empower.people;
  var host = document.getElementById("person-root");
  var now = Empower.clock.now();

  ui.renderNav("people");
  document.getElementById("topbar").innerHTML = '<a class="back" href="people.html">&larr; People</a>';

  var profile = store.getProfile();
  var person = store.getPerson(ui.param("id"));
  var connection = person && store.getConnections().find(function (k) { return k.personId === person.id; });
  var together = person ? people.sessionsTogether(person, store.getCommitments()) : 0;
  if (!person || !connection || !people.willAddBack(person, profile, together, profile && profile.createdAt)) {
    host.innerHTML = '<div class="empty"><p class="empty__title">Not a match yet</p><p class="mt-4"><a class="btn btn--inline" href="people.html">Back to People</a></p></div>';
    Empower.log("person.not_matched", { id: ui.param("id") });
    return;
  }

  var shared = people.sharedInterests(person, profile);
  var groupsInCommon = person.memberships.map(function (m) { return store.getGroup(m.groupId); })
    .filter(function (g) { return store.getCommitments().some(function (c) { return c.groupId === g.id; }); });
  var reliability = person.reliability >= 0.8 ? "Almost always" : person.reliability >= 0.65 ? "Usually" : "Sometimes";

  host.innerHTML =
    '<div class="center"><div class="avatar avatar--lg avatar--center">' + ui.initials(person.name) + "</div>" +
    '<h1 class="title">' + person.name + '</h1><p class="subtitle">' + person.bio + " Lives in " + person.neighborhood + ".</p></div>" +
    '<ul class="facts">' +
    "<li><span>Met at</span><span>" + store.getGroup(connection.groupId).name + "</span></li>" +
    "<li><span>Sessions together</span><span>" + together + "</span></li>" +
    "<li><span>You both like</span><span>" + (shared.length ? shared.join(", ") : "Still finding out") + "</span></li>" +
    (groupsInCommon.length ? "<li><span>Groups in common</span><span>" + groupsInCommon.map(function (g) { return g.name; }).join(", ") + "</span></li>" : "") +
    "<li><span>Shows up</span><span>" + reliability + "</span></li></ul>" +
    '<p class="small muted">Synthetic demo profile.</p>' +
    '<div class="footer-action"><div class="footer-action__inner"><a class="btn" href="chat.html?id=' + person.id + '">Message ' +
    person.name.split(" ")[0] + "</a></div></div>";

  Empower.log("person.viewed", { id: person.id, together: together, at: now.toISOString() });
})();
